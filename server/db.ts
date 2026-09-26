import { and, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { bookInventory, bookStudyLogs, bookTopicMappings, coachAlerts, InsertUser, planAdherenceReports, sourceSwitches, studentProfiles, studyPlanSessions, studyPlans, topicProgress, topicStudyLogs, userMockExams, userResourceBooks, users, yksTopics } from "../drizzle/schema";
import type { CoachingStyle, GradeLevel, TargetScoreType } from "../shared/onboarding";
import { calculatePlanAdherence, dedupeAlerts, type AdherenceSession } from "../shared/planAdherence";
import { rescheduleOverdueSessions, buildSessionCompletion } from "../shared/calendarLogic";
import { normalizeIsbn } from "../shared/bookIdentity";
import { CURRICULUM, isCurriculumOnlySlug } from "../shared/curriculum";
import { deriveTopicStatus } from "../shared/topicStatus";
import { topicSeeds, type ExamType, type TopicStatus } from "../shared/yksData";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    // Yeni hesap (INSERT dalı) her zaman "pending" ile başlar — sütun
    // varsayılanı "approved" olsa da (bkz. drizzle/schema.ts yorumu, mevcut
    // hesapları migration'da kilitlememek için) burada BİLEREK override
    // ediyoruz. `updateSet`'e KONULMUYOR — yani var olan bir hesabın
    // approvalStatus'u sonraki girişlerde asla bu fonksiyon tarafından
    // geri değiştirilmez (yalnızca approveUser/rejectUser değiştirir).
    const values: InsertUser = {
      openId: user.openId,
      approvalStatus: "pending",
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ---------------------------------------------------------------------------
// Student onboarding / coaching profile
// ---------------------------------------------------------------------------

export type StudentProfileView = {
  onboardingCompleted: boolean;
  onboardingStep: number;
  preferredName: string | null;
  gradeLevel: GradeLevel | null;
  examYear: number | null;
  targetScoreType: TargetScoreType | null;
  currentTytNet: string | null;
  currentAytNet: string | null;
  mockExamFrequency: string | null;
  strongSubjects: string[];
  weakSubjects: string[];
  hasPriorStudyPlan: boolean | null;
  targetUniversity: string | null;
  targetDepartment: string | null;
  targetRanking: string | null;
  mainGoal: string | null;
  shortTermGoal: string | null;
  longTermGoal: string | null;
  dailyStudyDuration: number | null;
  /** "HH:mm" — genelde ders çalışmaya başlanan saat; Pusula Odak günlük planının gerçek saat dilimlerini buradan türetir. */
  preferredStudyStartTime: string | null;
  availableStudyDays: string[];
  preferredStudyTimes: string[];
  preferredStudyMethods: string[];
  studyObstacles: string | null;
  coachingExpectations: string[];
  notificationPreference: string | null;
  coachingStyle: CoachingStyle | null;
  additionalNotes: string | null;
  updatedAt: Date | null;
};

export type StudentProfilePatch = Partial<{
  preferredName: string | null;
  gradeLevel: GradeLevel | null;
  examYear: number | null;
  targetScoreType: TargetScoreType | null;
  currentTytNet: string | null;
  currentAytNet: string | null;
  mockExamFrequency: string | null;
  strongSubjects: string[];
  weakSubjects: string[];
  hasPriorStudyPlan: boolean | null;
  targetUniversity: string | null;
  targetDepartment: string | null;
  targetRanking: string | null;
  mainGoal: string | null;
  shortTermGoal: string | null;
  longTermGoal: string | null;
  dailyStudyDuration: number | null;
  preferredStudyStartTime: string | null;
  availableStudyDays: string[];
  preferredStudyTimes: string[];
  preferredStudyMethods: string[];
  studyObstacles: string | null;
  coachingExpectations: string[];
  notificationPreference: string | null;
  coachingStyle: CoachingStyle | null;
  additionalNotes: string | null;
}>;

const parseJsonArray = (value: string | null): string[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
};

const defaultStudentProfileView: StudentProfileView = {
  onboardingCompleted: false,
  onboardingStep: 0,
  preferredName: null,
  gradeLevel: null,
  examYear: null,
  targetScoreType: null,
  currentTytNet: null,
  currentAytNet: null,
  mockExamFrequency: null,
  strongSubjects: [],
  weakSubjects: [],
  hasPriorStudyPlan: null,
  targetUniversity: null,
  targetDepartment: null,
  targetRanking: null,
  mainGoal: null,
  shortTermGoal: null,
  longTermGoal: null,
  dailyStudyDuration: null,
  preferredStudyStartTime: null,
  availableStudyDays: [],
  preferredStudyTimes: [],
  preferredStudyMethods: [],
  studyObstacles: null,
  coachingExpectations: [],
  notificationPreference: null,
  coachingStyle: null,
  additionalNotes: null,
  updatedAt: null,
};

const toStudentProfileView = (row: typeof studentProfiles.$inferSelect): StudentProfileView => ({
  onboardingCompleted: row.onboardingCompleted === 1,
  onboardingStep: row.onboardingStep,
  preferredName: row.preferredName,
  gradeLevel: row.gradeLevel,
  examYear: row.examYear,
  targetScoreType: row.targetScoreType,
  currentTytNet: row.currentTytNet,
  currentAytNet: row.currentAytNet,
  mockExamFrequency: row.mockExamFrequency,
  strongSubjects: parseJsonArray(row.strongSubjectsJson),
  weakSubjects: parseJsonArray(row.weakSubjectsJson),
  hasPriorStudyPlan: row.hasPriorStudyPlan === null ? null : row.hasPriorStudyPlan === 1,
  targetUniversity: row.targetUniversity,
  targetDepartment: row.targetDepartment,
  targetRanking: row.targetRanking,
  mainGoal: row.mainGoal,
  shortTermGoal: row.shortTermGoal,
  longTermGoal: row.longTermGoal,
  dailyStudyDuration: row.dailyStudyDuration,
  preferredStudyStartTime: row.preferredStudyStartTime,
  availableStudyDays: parseJsonArray(row.availableStudyDaysJson),
  preferredStudyTimes: parseJsonArray(row.preferredStudyTimesJson),
  preferredStudyMethods: parseJsonArray(row.preferredStudyMethodsJson),
  studyObstacles: row.studyObstacles,
  coachingExpectations: parseJsonArray(row.coachingExpectationsJson),
  notificationPreference: row.notificationPreference,
  coachingStyle: row.coachingStyle,
  additionalNotes: row.additionalNotes,
  updatedAt: row.updatedAt,
});

/** Every student has at most one profile row. Returns sane onboarding-not-started
 * defaults (never `undefined`) so callers never need a separate "no profile yet" branch. */
export async function getStudentProfile(userId: number): Promise<StudentProfileView> {
  const db = await getDb();
  if (!db) return defaultStudentProfileView;
  const rows = await db.select().from(studentProfiles).where(eq(studentProfiles.userId, userId)).limit(1);
  return rows[0] ? toStudentProfileView(rows[0]) : defaultStudentProfileView;
}

const patchToRowValues = (patch: StudentProfilePatch) => {
  const values: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    if (key === "strongSubjects") values.strongSubjectsJson = JSON.stringify(value);
    else if (key === "weakSubjects") values.weakSubjectsJson = JSON.stringify(value);
    else if (key === "availableStudyDays") values.availableStudyDaysJson = JSON.stringify(value);
    else if (key === "preferredStudyTimes") values.preferredStudyTimesJson = JSON.stringify(value);
    else if (key === "preferredStudyMethods") values.preferredStudyMethodsJson = JSON.stringify(value);
    else if (key === "coachingExpectations") values.coachingExpectationsJson = JSON.stringify(value);
    else if (key === "hasPriorStudyPlan") values.hasPriorStudyPlan = value === null ? null : (value ? 1 : 0);
    else values[key] = value;
  }
  return values;
};

/** Upserts the given step's fields (never overwrites fields the caller didn't
 * include) and advances `onboardingStep` to at least `step + 1`, so a resume
 * always continues from the furthest step actually saved — including a
 * duplicate "Devam et" click, which just upserts the same row again. */
export async function upsertStudentProfileStep(userId: number, step: number, patch: StudentProfilePatch): Promise<StudentProfileView> {
  const db = await getDb();
  if (!db) return { ...defaultStudentProfileView, onboardingStep: step };

  const existing = await db.select().from(studentProfiles).where(eq(studentProfiles.userId, userId)).limit(1);
  const rowValues = patchToRowValues(patch);
  const nextStep = Math.max(step + 1, existing[0]?.onboardingStep ?? 0);

  if (existing[0]) {
    await db.update(studentProfiles).set({ ...rowValues, onboardingStep: nextStep }).where(eq(studentProfiles.id, existing[0].id));
  } else {
    await db.insert(studentProfiles).values({ userId, onboardingStep: nextStep, ...rowValues });
  }

  return getStudentProfile(userId);
}

export async function completeOnboarding(userId: number): Promise<StudentProfileView> {
  const db = await getDb();
  if (!db) return { ...defaultStudentProfileView, onboardingCompleted: true };

  const existing = await db.select().from(studentProfiles).where(eq(studentProfiles.userId, userId)).limit(1);
  if (existing[0]) {
    await db.update(studentProfiles).set({ onboardingCompleted: 1 }).where(eq(studentProfiles.id, existing[0].id));
  } else {
    await db.insert(studentProfiles).values({ userId, onboardingCompleted: 1 });
  }
  return getStudentProfile(userId);
}

export async function getBookInventory(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(bookInventory).where(and(eq(bookInventory.userId, userId), isNull(bookInventory.removedAt))).orderBy(desc(bookInventory.addedAt));
}

export async function addBookToInventory(userId: number, bookId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const existing = await db.select().from(bookInventory).where(and(eq(bookInventory.userId, userId), eq(bookInventory.bookId, bookId), isNull(bookInventory.removedAt))).limit(1);
  if (existing[0]) return existing[0];
  const result = await db.insert(bookInventory).values({ userId, bookId });
  return { id: Number(result[0].insertId), userId, bookId, addedAt: new Date(), removedAt: null };
}

export async function removeBookFromInventory(userId: number, bookId: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(bookInventory).set({ removedAt: new Date() }).where(and(eq(bookInventory.userId, userId), eq(bookInventory.bookId, bookId), isNull(bookInventory.removedAt)));
}

export async function getBookStudyLogs(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(bookStudyLogs).where(eq(bookStudyLogs.userId, userId)).orderBy(desc(bookStudyLogs.sessionDate));
}

export async function addBookStudyLog(userId: number, input: Omit<typeof bookStudyLogs.$inferInsert, "id" | "userId" | "createdAt">) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(bookStudyLogs).values({ ...input, userId });
  return { id: Number(result[0].insertId), ...input, userId, createdAt: new Date() };
}

export async function getBookTopicMappings(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(bookTopicMappings).where(eq(bookTopicMappings.userId, userId)).orderBy(desc(bookTopicMappings.updatedAt));
}

export async function upsertBookTopicMapping(userId: number, input: Omit<typeof bookTopicMappings.$inferInsert, "id" | "userId" | "updatedAt">) {
  const db = await getDb();
  if (!db) return undefined;
  const existing = await db.select().from(bookTopicMappings).where(and(eq(bookTopicMappings.userId, userId), eq(bookTopicMappings.bookId, input.bookId), eq(bookTopicMappings.topic, input.topic))).limit(1);
  if (existing[0]) {
    await db.update(bookTopicMappings).set({ ...input, updatedAt: new Date() }).where(eq(bookTopicMappings.id, existing[0].id));
    return { ...existing[0], ...input, updatedAt: new Date() };
  }
  const result = await db.insert(bookTopicMappings).values({ ...input, userId });
  return { id: Number(result[0].insertId), ...input, userId, updatedAt: new Date() };
}

export async function getSourceSwitches(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sourceSwitches).where(eq(sourceSwitches.userId, userId)).orderBy(desc(sourceSwitches.switchedAt));
}

export async function addSourceSwitch(userId: number, input: Omit<typeof sourceSwitches.$inferInsert, "id" | "userId">) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(sourceSwitches).values({ ...input, userId });
  return { id: Number(result[0].insertId), ...input, userId };
}

type UserMockExamInput = {
  title: string;
  exam: "TYT" | "AYT";
  examDate: Date;
  net: number;
  delta: number;
  subjects: Record<string, number>;
  timeSpent: Record<string, number>;
  topicNets: Record<string, number>;
  topicDetails: unknown[];
  importedFrom: "manual" | "ocr" | "pdf" | "csv" | "xlsx";
  notes?: string;
};

const parseJson = <T>(value: string, fallback: T): T => {
  try { return JSON.parse(value) as T; } catch { return fallback; }
};

const serializeUserMockExam = (row: typeof userMockExams.$inferSelect) => ({
  id: String(row.id),
  title: row.title,
  date: row.examDate.toISOString().slice(0, 10),
  exam: row.exam,
  net: Number(row.net),
  delta: Number(row.delta),
  subjects: parseJson<Record<string, number>>(row.subjectsJson, {}),
  timeSpent: parseJson<Record<string, number>>(row.timeSpentJson, {}),
  topicNets: parseJson<Record<string, number>>(row.topicNetsJson, {}),
  topicDetails: parseJson<unknown[]>(row.topicDetailsJson, []),
  importedFrom: row.importedFrom,
});

export async function getUserMockExams(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(userMockExams).where(eq(userMockExams.userId, userId)).orderBy(desc(userMockExams.examDate));
  return rows.map(serializeUserMockExam);
}

export async function addUserMockExams(userId: number, inputs: UserMockExamInput[]) {
  const db = await getDb();
  if (!db || inputs.length === 0) return [];
  await db.insert(userMockExams).values(inputs.map((input) => ({
    userId,
    title: input.title,
    exam: input.exam,
    examDate: input.examDate,
    net: input.net.toFixed(2),
    delta: input.delta.toFixed(2),
    subjectsJson: JSON.stringify(input.subjects),
    timeSpentJson: JSON.stringify(input.timeSpent),
    topicNetsJson: JSON.stringify(input.topicNets),
    topicDetailsJson: JSON.stringify(input.topicDetails),
    importedFrom: input.importedFrom,
    notes: input.notes ?? null,
  })));
  return getUserMockExams(userId);
}

type UserResourceBookInput = {
  id: string;
  title: string;
  publisher: string;
  subject: string;
  exam: "TYT" | "AYT";
  level: "Kolay" | "Orta" | "Zor";
  format: string;
  reason: string;
  sourceUrl?: string;
  pageCount?: number;
  tone: string;
  authors?: string;
  isbn?: string;
};

export async function getUserResourceBooks(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(userResourceBooks).where(eq(userResourceBooks.userId, userId)).orderBy(desc(userResourceBooks.createdAt));
  return rows.map((row) => ({ id: row.bookId, title: row.title, publisher: row.publisher, subject: row.subject, exam: row.exam, level: row.level, format: row.format, reason: row.reason, sourceUrl: row.sourceUrl || "", pageCount: row.pageCount ?? undefined, tone: row.tone as "blue" | "coral" | "lilac" | "mint" | "yellow", authors: row.authors ?? undefined, isbn: row.isbn ?? undefined }));
}

export async function addUserResourceBooks(userId: number, inputs: UserResourceBookInput[]) {
  const db = await getDb();
  if (!db || inputs.length === 0) return [];
  await db.insert(userResourceBooks).values(inputs.map((book) => ({ userId, bookId: book.id, title: book.title, publisher: book.publisher, subject: book.subject, exam: book.exam, level: book.level, format: book.format, reason: book.reason, sourceUrl: book.sourceUrl ?? null, pageCount: book.pageCount ?? null, tone: book.tone, authors: book.authors?.trim() || null, isbn: normalizeIsbn(book.isbn) })));
  return getUserResourceBooks(userId);
}

export async function getStudyCalendar(userId: number) {
  const db = await getDb();
  if (!db) return { plans: [], sessions: [], logs: [] };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const overdue = await db.select({ id: studyPlanSessions.id, sessionDate: studyPlanSessions.sessionDate }).from(studyPlanSessions).where(and(eq(studyPlanSessions.userId, userId), eq(studyPlanSessions.status, "planned"), lt(studyPlanSessions.sessionDate, today)));
  const reschedules = rescheduleOverdueSessions(overdue, today, tomorrow, new Date());
  for (const instruction of reschedules) {
    await db.update(studyPlanSessions).set({ sessionDate: instruction.sessionDate, rescheduledFrom: instruction.rescheduledFrom, rescheduledAt: instruction.rescheduledAt, rescheduleCount: sql`${studyPlanSessions.rescheduleCount} + 1` }).where(eq(studyPlanSessions.id, instruction.id));
  }
  const [plans, sessions, logs] = await Promise.all([
    db.select().from(studyPlans).where(eq(studyPlans.userId, userId)).orderBy(desc(studyPlans.weekStart)),
    db.select().from(studyPlanSessions).where(eq(studyPlanSessions.userId, userId)).orderBy(studyPlanSessions.sessionDate),
    db.select().from(topicStudyLogs).where(eq(topicStudyLogs.userId, userId)).orderBy(desc(topicStudyLogs.studyDate)),
  ]);
  return { plans, sessions, logs };
}

export async function saveStudyPlan(userId: number, input: { title: string; weekStart: Date; weekEnd: Date; summary: string; source?: "ai" | "manual"; sessions: Array<{ sessionDate: Date; title: string; subject: string; topic: string; kind: string; plannedMinutes: number; targetQuestions?: number; targetPages?: string | null; targetTests?: string | null }> }) {
  const db = await getDb();
  if (!db) return undefined;
  const planResult = await db.insert(studyPlans).values({ userId, title: input.title, weekStart: input.weekStart, weekEnd: input.weekEnd, summary: input.summary, source: input.source ?? "ai" });
  const planId = Number(planResult[0].insertId);
  if (input.sessions.length) await db.insert(studyPlanSessions).values(input.sessions.map((session) => ({ ...session, userId, planId, targetPages: session.targetPages ?? null, targetTests: session.targetTests ?? null })));
  return getStudyCalendar(userId);
}

// Bir konunun gerçek yksTopics kaydı yoksa (nadir — genellikle mevcut konu
// haritasıyla eşleşir) yeni satır oluşturulurken kullanılacak varsayılan
// sınav türü. `findOrCreateTopic` önce subject+topic ile mevcut kaydı aradığı
// için bu değer yalnızca hiç görülmemiş bir konu/ders çiftinde devreye girer.
const FALLBACK_EXAM: ExamType = "TYT";

export async function completeStudySession(userId: number, input: { sessionId: number; actualMinutes: number; actualQuestions: number; correct: number; wrong: number; blank: number; actualPages?: number; note?: string }) {
  const db = await getDb();
  if (!db) return undefined;
  const existing = await db.select().from(studyPlanSessions).where(and(eq(studyPlanSessions.id, input.sessionId), eq(studyPlanSessions.userId, userId))).limit(1);
  if (!existing[0]) throw new Error("Çalışma oturumu bulunamadı");
  const completedAt = new Date();
  const { actualMinutes, actualQuestions, correct, wrong, blank, actualPages, note } = input;
  const plan = buildSessionCompletion(existing[0], { actualMinutes, actualQuestions, correct, wrong, blank, actualPages, note }, completedAt);
  await db.update(studyPlanSessions).set({ ...plan.sessionUpdate, actualPages: plan.sessionUpdate.actualPages ?? null, note: plan.sessionUpdate.note ?? null }).where(eq(studyPlanSessions.id, input.sessionId));
  // topic_study_logs sayfa sütunu tutmaz (yalnızca soru/dakika bazlı konu
  // gelişimi için var) — actualPages'i buraya taşımıyoruz.
  const { actualPages: _actualPages, ...topicLogInput } = plan.topicLog;
  await db.insert(topicStudyLogs).values({ userId, ...topicLogInput, note: topicLogInput.note ?? null });
  // Kitaptan üretilmiş görev: aynı performans kitabın çözüm kaydına da düşer
  // (kitap istatistikleri + "bu testler çözüldü" bilgisi). Konu takibi
  // yukarıdaki topic_study_logs / aşağıdaki upsertTopicProgress'te kalır.
  if (existing[0].sourceBookId) {
    const pages = existing[0].targetPages?.match(/(\d+)\s*[-–]\s*(\d+)/);
    const tests = existing[0].targetTests?.match(/(\d+)(?:\s*[-–]\s*(\d+))?/);
    await db.insert(bookStudyLogs).values({
      userId,
      bookId: existing[0].sourceBookId,
      topic: existing[0].topic,
      sessionDate: completedAt,
      minutes: actualMinutes,
      questions: actualQuestions,
      correct,
      wrong,
      blank,
      pageStart: pages ? Number(pages[1]) : null,
      pageEnd: pages ? Number(pages[2]) : null,
      testStart: tests ? Number(tests[1]) : null,
      testEnd: tests ? Number(tests[2] ?? tests[1]) : null,
    });
  }
  // Takvim/Pusula Odak oturumundan gelen gerçek performans, konu haritasındaki
  // durumu (Zayıf/Orta/İyi) da günceller — bu sayede AI Planım, yalnızca Konu
  // Haritası'na elle girilen verileri değil, fiilen çalışılan oturumları da görür.
  if (actualQuestions > 0) {
    await upsertTopicProgress(userId, { exam: FALLBACK_EXAM, subject: plan.topicLog.subject, topic: plan.topicLog.topic, accuracy: (correct / actualQuestions) * 100, questionCount: actualQuestions, studyDate: completedAt });
  }
  return getStudyCalendar(userId);
}

// "Şimdi yaptım" tarzı alışkanlık kayıtları (günlük paragraf pratiği, gece
// kitap okuması) için — plan/oturum önce oluşturulup sonra tamamlanmaz,
// tek adımda doğrudan tamamlanmış olarak kaydedilir. Yine de studyPlanSessions
// satırı olarak yaşadığı için Plan Uyum Merkezi'nin (calculatePlanAdherence)
// süre/oturum skorlarına aynı şekilde dahil olur.
export async function logCompletedRoutineSession(userId: number, input: { title: string; subject: string; topic: string; kind: string; plannedMinutes: number; actualMinutes: number; actualPages?: number; note?: string }) {
  const db = await getDb();
  if (!db) return undefined;
  const sessionDate = new Date();
  const dayStart = new Date(sessionDate); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
  const planResult = await db.insert(studyPlans).values({ userId, title: input.title, weekStart: dayStart, weekEnd: dayEnd, summary: input.title, source: "manual" });
  const planId = Number(planResult[0].insertId);
  const completedAt = new Date();
  const sessionValues = {
    userId, planId, sessionDate, title: input.title, subject: input.subject, topic: input.topic, kind: input.kind,
    plannedMinutes: input.plannedMinutes, status: "completed" as const, completedAt,
    actualMinutes: input.actualMinutes, actualQuestions: 0, correct: 0, wrong: 0, blank: 0,
    actualPages: input.actualPages ?? null, note: input.note ?? null,
  };
  const sessionResult = await db.insert(studyPlanSessions).values(sessionValues);
  const sessionId = Number(sessionResult[0].insertId);
  await db.insert(topicStudyLogs).values({ userId, sessionId, subject: input.subject, topic: input.topic, studyDate: completedAt, minutes: input.actualMinutes, questions: 0, correct: 0, wrong: 0, blank: 0, note: input.note ?? null });
  return getStudyCalendar(userId);
}

export async function addTopicStudyLog(userId: number, input: Omit<typeof topicStudyLogs.$inferInsert, "id" | "userId" | "createdAt">) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(topicStudyLogs).values({ ...input, userId });
  // Pusula Odak'ta öğrencinin serbestçe seçtiği (takvim oturumuna bağlı
  // olmayan) bir konu için de aynı şekilde konu durumunu günceller.
  const questionCount = input.questions ?? 0;
  if (questionCount > 0) {
    await upsertTopicProgress(userId, { exam: FALLBACK_EXAM, subject: input.subject, topic: input.topic, accuracy: ((input.correct ?? 0) / questionCount) * 100, questionCount, studyDate: input.studyDate });
  }
  return { id: Number(result[0].insertId), ...input, userId, createdAt: new Date() };
}

export async function getPlanAdherenceInputs(userId: number, periodStart: Date, periodEnd: Date) {
  const db = await getDb();
  if (!db) return { sessions: [] as AdherenceSession[], averageAccuracy: 0 };
  const sessions = await db.select().from(studyPlanSessions).where(and(eq(studyPlanSessions.userId, userId), gte(studyPlanSessions.sessionDate, periodStart), lt(studyPlanSessions.sessionDate, periodEnd)));
  const logs = await db.select().from(topicStudyLogs).where(and(eq(topicStudyLogs.userId, userId), gte(topicStudyLogs.studyDate, periodStart), lt(topicStudyLogs.studyDate, periodEnd)));
  const questions = logs.reduce((sum, log) => sum + log.questions, 0);
  const correct = logs.reduce((sum, log) => sum + log.correct, 0);
  return { sessions: sessions as AdherenceSession[], averageAccuracy: questions ? Math.round(correct / questions * 100) : 0 };
}

export async function savePlanAdherence(userId: number, periodStart: Date, periodEnd: Date) {
  const db = await getDb();
  if (!db) return undefined;
  const { sessions, averageAccuracy } = await getPlanAdherenceInputs(userId, periodStart, periodEnd);
  const result = calculatePlanAdherence(sessions, averageAccuracy);
  const inserted = await db.insert(planAdherenceReports).values({ userId, periodType: "week", periodStart, periodEnd, overallScore: result.overallScore, sessionScore: result.sessionScore, timeScore: result.timeScore, questionScore: result.questionScore, punctualityScore: result.punctualityScore, plannedSessions: result.plannedSessions, completedSessions: result.completedSessions, plannedMinutes: result.plannedMinutes, actualMinutes: result.actualMinutes, targetQuestions: result.targetQuestions, actualQuestions: result.actualQuestions, rescheduledSessions: result.rescheduledSessions, summary: result.summary, decision: result.decision, snapshotJson: JSON.stringify({ averageAccuracy, alerts: result.alerts }) });
  const reportId = Number(inserted[0].insertId);
  const existingAlerts = await db.select({ ruleKey: coachAlerts.ruleKey }).from(coachAlerts).where(eq(coachAlerts.userId, userId));
  const newAlerts = dedupeAlerts(result.alerts, existingAlerts.map((alert) => alert.ruleKey));
  if (newAlerts.length) await db.insert(coachAlerts).values(newAlerts.map((alert) => ({ userId, reportId, level: alert.level, ruleKey: alert.ruleKey, title: alert.title, message: alert.message, actionLabel: alert.actionLabel, actionJson: JSON.stringify({ decision: result.decision }) })));
  return { ...result, averageAccuracy, reportId };
}

export async function getCoachAlerts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(coachAlerts).where(and(eq(coachAlerts.userId, userId), eq(coachAlerts.isRead, 0))).orderBy(desc(coachAlerts.createdAt)).limit(10);
}

export async function markCoachAlertRead(userId: number, alertId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(coachAlerts).set({ isRead: 1 }).where(and(eq(coachAlerts.id, alertId), eq(coachAlerts.userId, userId)));
}

const statusToDb: Record<TopicStatus, "weak" | "medium" | "good"> = { Zayıf: "weak", Orta: "medium", İyi: "good" };
const statusFromDb: Record<"weak" | "medium" | "good", TopicStatus> = { weak: "Zayıf", medium: "Orta", good: "İyi" };

const slugify = (value: string) =>
  value.toLocaleLowerCase("tr").replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

let topicCatalogSeeded = false;

/** ÖSYM kapsamındaki başlangıç konu kataloğunu (topicSeeds) yks_topics tablosuna bir kez aktarır. */
export async function ensureTopicCatalogSeeded() {
  if (topicCatalogSeeded) return;
  const db = await getDb();
  if (!db) return;
  const existing = await db.select({ id: yksTopics.id }).from(yksTopics).limit(1);
  if (existing.length === 0 && topicSeeds.length > 0) {
    await db.insert(yksTopics).values(topicSeeds.map((seed) => ({ slug: seed.id, exam: seed.exam, subject: seed.subject, topic: seed.topic, unit: seed.unit }))).onDuplicateKeyUpdate({ set: { subject: sql`subject` } });
  }
  await ensureCurriculumSeeded(db);
  topicCatalogSeeded = true;
}

/**
 * Müfredatı (shared/curriculum.ts) `yks_topics`'e ekler — yalnızca EKSİK
 * slug'lar yazılır, var olan satırlar (eski konular, `legacySlug` ile yeniden
 * kullanılanlar, kullanıcı verisinden oluşmuş konular) hiç değişmez; bu yüzden
 * her soğuk başlangıçta çalışması güvenli. Tek sorguda eksikler bulunur.
 */
async function ensureCurriculumSeeded(db: NonNullable<Awaited<ReturnType<typeof getDb>>>) {
  const present = new Set((await db.select({ slug: yksTopics.slug }).from(yksTopics)).map((row) => row.slug));
  const missing = CURRICULUM.filter((def) => !present.has(def.slug));
  if (missing.length === 0) return;
  await db
    .insert(yksTopics)
    .values(missing.map((def) => ({ slug: def.slug, exam: def.exam, subject: def.subject, topic: def.topic, unit: def.unit })))
    .onDuplicateKeyUpdate({ set: { slug: sql`slug` } });
}

async function findOrCreateTopic(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, exam: ExamType, subject: string, topic: string) {
  // Aynı ad iki sınavda olabilir (müfredatta TYT ve AYT "Olasılık"): önce aynı sınavın kaydı.
  const existing = await db.select().from(yksTopics).where(and(eq(yksTopics.subject, subject), eq(yksTopics.topic, topic))).orderBy(sql`${yksTopics.exam} = ${exam} DESC`, yksTopics.id).limit(1);
  if (existing[0]) return existing[0];
  const slug = `${exam}-${slugify(subject)}-${slugify(topic)}` || `topic-${Date.now()}`;
  const result = await db.insert(yksTopics).values({ slug, exam, subject, topic, unit: subject }).onDuplicateKeyUpdate({ set: { subject } });
  const inserted = await db.select().from(yksTopics).where(eq(yksTopics.slug, slug)).limit(1);
  return inserted[0] ?? { id: Number(result[0].insertId), slug, exam, subject, topic, unit: subject, sourceUrl: null, createdAt: new Date() };
}

export async function getTopicCatalog() {
  await ensureTopicCatalogSeeded();
  const db = await getDb();
  if (!db) return topicSeeds.map((seed, index) => ({ id: -1 - index, slug: seed.id, exam: seed.exam, subject: seed.subject, topic: seed.topic, unit: seed.unit, sourceUrl: null as string | null, createdAt: new Date() }));
  return db.select().from(yksTopics);
}

export type UserTopicProgress = {
  slug: string;
  exam: ExamType;
  subject: string;
  topic: string;
  unit: string;
  progress: number;
  status: TopicStatus;
  insufficientData: boolean;
  lastReviewedAt: Date | null;
};

/** Kullanıcının konu ilerleme kaydı; katalogla birleştirilir, hiç çalışılmamış konular %0/veri yetersiz döner. */
export async function getUserTopicProgress(userId: number): Promise<UserTopicProgress[]> {
  const catalog = await getTopicCatalog();
  const db = await getDb();
  if (!db) return catalog.map((topic) => ({ ...topic, progress: 0, status: "Zayıf" as TopicStatus, insufficientData: true, lastReviewedAt: null }));
  const rows = await db.select().from(topicProgress).where(eq(topicProgress.userId, userId));
  const byTopicId = new Map(rows.map((row) => [row.topicId, row]));
  // Müfredattan gelen ~250 konu, öğrenci onlarda hiç veri üretmeden listeye
  // girerse hepsi "Zayıf / veri yetersiz" görünür (aşağıdaki varsayılan) —
  // Konu Haritası, zayıf konu listeleri ve AI planı bununla dolardı. Bu yüzden
  // yalnızca öğrencinin gerçekten verisi olan müfredat konuları dahil edilir;
  // eski davranış (eski tohum konular + kullanıcı verisinden doğan konular) aynen korunur.
  return catalog.filter((topic) => !isCurriculumOnlySlug(topic.slug) || byTopicId.has(topic.id)).map((topic) => {
    const row = byTopicId.get(topic.id);
    if (!row) return { ...topic, progress: 0, status: "Zayıf" as TopicStatus, insufficientData: true, lastReviewedAt: null };
    return { ...topic, progress: row.progress, status: statusFromDb[row.status], insufficientData: false, lastReviewedAt: row.lastReviewedAt };
  });
}

/**
 * Bir deneme/odak oturumundan gelen gerçek doğruluk ve soru sayısı verisiyle konu durumunu günceller.
 * Kullanıcı verileri userId ile izole edilir; soru hacmi düşükse durum yine hesaplanır ama
 * `insufficientData` bayrağıyla güvenilirliği işaretlenir.
 */
export async function upsertTopicProgress(userId: number, input: { exam: ExamType; subject: string; topic: string; accuracy: number; questionCount: number; studyDate: Date }) {
  await ensureTopicCatalogSeeded();
  const db = await getDb();
  if (!db) return undefined;
  const topicRow = await findOrCreateTopic(db, input.exam, input.subject, input.topic);
  const { status, insufficientData } = deriveTopicStatus(input.accuracy, input.questionCount);
  const existing = await db.select().from(topicProgress).where(and(eq(topicProgress.userId, userId), eq(topicProgress.topicId, topicRow.id))).limit(1);
  const dbStatus = statusToDb[status];
  if (existing[0]) {
    await db.update(topicProgress).set({ progress: Math.round(input.accuracy), status: dbStatus, lastReviewedAt: input.studyDate, updatedAt: new Date() }).where(eq(topicProgress.id, existing[0].id));
  } else {
    await db.insert(topicProgress).values({ userId, topicId: topicRow.id, progress: Math.round(input.accuracy), status: dbStatus, lastReviewedAt: input.studyDate });
  }
  return { slug: topicRow.slug, exam: topicRow.exam, subject: topicRow.subject, topic: topicRow.topic, unit: topicRow.unit, progress: Math.round(input.accuracy), status, insufficientData, lastReviewedAt: input.studyDate };
}
