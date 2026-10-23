import { and, desc, eq, gte, inArray, isNull, lt, sql } from "drizzle-orm";
import { academicCases, bookCurriculumTopics, bookInventory, caseActions, caseEvaluations, caseEvidence, catalogBooks, classStudents, coachAlerts, counselingNotes, organizationClasses, organizations, studyPlanSessions, teacherAssignments, topicStudyLogs, userBookContents, userMockExams, userResourceBooks, users, yksTopics } from "../../drizzle/schema";
import { comparabilityKey, describeTrend, trendDecline, trendSignals, type ComparableExam, type TrendResult } from "../../shared/academicCase";
import type { ClassBlock } from "../../shared/classSchedule";
import type { ExamKind } from "../../shared/exams";
import { busyOn, placePlanItems, type Placement } from "../../shared/planPlacement";
import type { AcademicDigest } from "../../shared/teacherDigest";
import { getDb, getUserTopicProgress } from "../db";
import { pushConfigured, sendToUser } from "../push/push";
import { getClassSchedule, getCourseBlocks } from "../schedule/classScheduleDb";
import { insertAssignedTask } from "./orgDb";

/**
 * Novara Rehber — akademik takip dosyası veri katmanı. Tüm sorgular `orgId` ile kapsamlıdır;
 * kimin hangi öğrenciyi görebileceği router'da `assertCanViewStudent` ile denetlenir.
 * Dosya notları mahremdir: yalnızca yazanı ve öğrencinin sorumlu öğretmenleri görür (bkz. `canReadNotes`).
 */

export class CaseError extends Error {
  constructor(message: string, readonly code: "NOT_FOUND" | "BAD_REQUEST" | "CONFLICT" | "FORBIDDEN" = "BAD_REQUEST") { super(message); }
}

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;
async function requireDb(): Promise<Db> {
  const db = await getDb();
  if (!db) throw new CaseError("Veritabanı bağlantısı yok.");
  return db;
}

const DAY = 24 * 60 * 60 * 1000;
export type CaseRuleKey = "trend_decline" | "manual";
export type CaseRow = typeof academicCases.$inferSelect;

export async function isCasesEnabled(orgId: number): Promise<boolean> {
  const db = await requireDb();
  const [row] = await db.select({ enabled: organizations.academicCasesEnabled }).from(organizations).where(eq(organizations.id, orgId)).limit(1);
  return row?.enabled === 1;
}

export async function setCasesEnabled(orgId: number, enabled: boolean): Promise<void> {
  const db = await requireDb();
  await db.update(organizations).set({ academicCasesEnabled: enabled ? 1 : 0 }).where(eq(organizations.id, orgId));
}

/** Öğrencinin sorumlu öğretmenleri: sınıflarının sorumlusu + doğrudan atanan öğretmenler. */
export async function responsibleTeacherIds(orgId: number, studentUserId: number): Promise<number[]> {
  const db = await requireDb();
  const [advisors, assigned] = await Promise.all([
    db.select({ userId: organizationClasses.advisorUserId }).from(classStudents)
      .innerJoin(organizationClasses, eq(organizationClasses.id, classStudents.classId))
      .where(and(eq(organizationClasses.orgId, orgId), eq(classStudents.studentUserId, studentUserId))),
    db.select({ userId: teacherAssignments.teacherUserId }).from(teacherAssignments)
      .where(and(eq(teacherAssignments.orgId, orgId), eq(teacherAssignments.studentUserId, studentUserId), eq(teacherAssignments.active, 1))),
  ]);
  return Array.from(new Set([...advisors, ...assigned].map((row) => row.userId).filter((id): id is number => typeof id === "number")));
}

/** Mahrem notları okuyabilir mi: öğrencinin sorumlu öğretmeni ise. (Not yazarı kendi notunu her zaman görür.) */
export async function canReadNotes(orgId: number, viewerUserId: number, studentUserId: number): Promise<boolean> {
  return (await responsibleTeacherIds(orgId, studentUserId)).includes(viewerUserId);
}

/** Notları görünürlük kuralıyla süzer: yazanı ya da sorumlu öğretmen. */
export function filterPrivateNotes<T extends { authorUserId: number }>(notes: T[], viewerUserId: number, viewerIsResponsible: boolean): T[] {
  return viewerIsResponsible ? notes : notes.filter((note) => note.authorUserId === viewerUserId);
}

/** Öğrencinin denemeleri karşılaştırma girdisine (şimdilik tamamı öğrenci girişi; Connect gelince "org"). */
export async function comparableExamsOf(studentUserId: number): Promise<ComparableExam[]> {
  const db = await requireDb();
  const rows = await db.select({ id: userMockExams.id, exam: userMockExams.exam, examDate: userMockExams.examDate, net: userMockExams.net, publisher: userMockExams.publisher, scope: userMockExams.scope }).from(userMockExams).where(eq(userMockExams.userId, studentUserId));
  return rows.map((row) => ({ id: row.id, examKind: row.exam, date: new Date(row.examDate), net: Number(row.net), source: "student" as const, publisher: row.publisher, scope: row.scope }));
}

const keyOfTrend = (exams: ComparableExam[], result: TrendResult) => {
  const latest = exams.filter((exam) => result.evidence.some((item) => item.id === exam.id)).at(-1);
  return latest ? comparabilityKey(latest) : comparabilityKey({ examKind: result.examKind, scope: null, publisher: null });
};

/** Kural önerileri: her öğrenci için sınav türü başına eğilim; açık dosyası olanlar işaretli. */
export async function listSignals(orgId: number, studentUserIds: number[]) {
  if (!studentUserIds.length) return [];
  const db = await requireDb();
  const open = await db.select({ studentUserId: academicCases.studentUserId, ruleKey: academicCases.ruleKey, comparabilityKey: academicCases.comparabilityKey, id: academicCases.id }).from(academicCases)
    .where(and(eq(academicCases.orgId, orgId), inArray(academicCases.studentUserId, studentUserIds), sql`${academicCases.status} <> 'closed'`));
  const result: Array<{ studentUserId: number; examKind: ExamKind; status: TrendResult["status"]; confidence: string | null; description: string; openCaseId: number | null }> = [];
  for (const studentUserId of studentUserIds) {
    const exams = await comparableExamsOf(studentUserId);
    for (const trend of trendSignals(exams)) {
      if (trend.status === "no_signal") continue;
      const key = keyOfTrend(exams, trend);
      const existing = open.find((row) => row.studentUserId === studentUserId && row.ruleKey === "trend_decline" && row.comparabilityKey === key);
      result.push({ studentUserId, examKind: trend.examKind, status: trend.status, confidence: trend.status === "signal" ? trend.confidence : null, description: describeTrend(trend), openCaseId: existing?.id ?? null });
    }
  }
  return result.sort((a, b) => Number(b.status === "signal") - Number(a.status === "signal"));
}

const isUniqueViolation = (error: unknown) => {
  const value = error as { code?: string; cause?: { code?: string } };
  return value?.code === "23505" || value?.cause?.code === "23505";
};

/**
 * Dosya açar. `trend_decline` için eğilim sunucuda yeniden hesaplanır (istemciye güvenilmez); yetersiz
 * veri ya da sinyal yoksa açılmaz. Aynı öğrenci + kural + karşılaştırma anahtarı için açık dosya varsa
 * yenisi açılmaz, mevcut dosya döner (`created: false`). Açılışta kanıt anlık görüntüsü yazılır.
 */
export async function openCase(input: { orgId: number; studentUserId: number; ruleKey: CaseRuleKey; examKind: ExamKind | null; actorUserId: number }): Promise<{ caseId: number; created: boolean }> {
  const db = await requireDb();
  const exams = await comparableExamsOf(input.studentUserId);
  let trend: TrendResult | null = null;
  let key = "";
  let confidence: "high" | "medium" | "low" = "medium";
  if (input.ruleKey === "trend_decline") {
    if (!input.examKind) throw new CaseError("Sınav türü gerekli.");
    trend = trendDecline(exams, input.examKind);
    if (trend.status !== "signal") throw new CaseError(trend.status === "insufficient" ? describeTrend(trend) : "Bu sınav türünde düşüş eğilimi görülmüyor; inceleme önerisi yok.");
    key = keyOfTrend(exams, trend);
    confidence = trend.confidence;
  } else {
    key = `manual|${input.examKind ?? "*"}`;
  }
  const owners = await responsibleTeacherIds(input.orgId, input.studentUserId);
  const ownerUserId = owners.includes(input.actorUserId) ? input.actorUserId : owners[0] ?? input.actorUserId;
  let created: CaseRow;
  try {
    [created] = await db.insert(academicCases).values({ orgId: input.orgId, studentUserId: input.studentUserId, ownerUserId, examKind: input.examKind, ruleKey: input.ruleKey, comparabilityKey: key, confidence, openedByUserId: input.actorUserId }).returning();
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const [existing] = await db.select({ id: academicCases.id }).from(academicCases)
      .where(and(eq(academicCases.orgId, input.orgId), eq(academicCases.studentUserId, input.studentUserId), eq(academicCases.ruleKey, input.ruleKey), eq(academicCases.comparabilityKey, key), sql`${academicCases.status} <> 'closed'`)).limit(1);
    return { caseId: existing.id, created: false };
  }
  await captureEvidence(db, created, exams, trend);
  return { caseId: created.id, created: true };
}

/** Açılış anının kanıtı: denemeler (ders kırılımıyla), son 4 haftanın çalışma süresi, zayıf konular. */
async function captureEvidence(db: Db, row: CaseRow, exams: ComparableExam[], trend: TrendResult | null) {
  const examIds = trend ? trend.evidence.map((item) => item.id) : exams.filter((exam) => !row.examKind || exam.examKind === row.examKind).sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 3).map((exam) => exam.id);
  const examRows = examIds.length ? await db.select({ id: userMockExams.id, title: userMockExams.title, exam: userMockExams.exam, examDate: userMockExams.examDate, net: userMockExams.net, subjectsJson: userMockExams.subjectsJson }).from(userMockExams).where(and(eq(userMockExams.userId, row.studentUserId), inArray(userMockExams.id, examIds))) : [];
  const since = new Date(Date.now() - 28 * DAY);
  const logs = await db.select({ studyDate: topicStudyLogs.studyDate, minutes: topicStudyLogs.minutes, questions: topicStudyLogs.questions }).from(topicStudyLogs).where(and(eq(topicStudyLogs.userId, row.studentUserId), gte(topicStudyLogs.studyDate, since)));
  const weeks = [0, 1, 2, 3].map((index) => {
    const end = Date.now() - index * 7 * DAY;
    const inWeek = logs.filter((log) => { const at = new Date(log.studyDate).getTime(); return at <= end && at > end - 7 * DAY; });
    return { weeksAgo: index, minutes: inWeek.reduce((sum, log) => sum + log.minutes, 0), questions: inWeek.reduce((sum, log) => sum + log.questions, 0) };
  }).reverse();
  const topics = (await getUserTopicProgress(row.studentUserId)).filter((topic) => !topic.insufficientData && topic.status === "Zayıf" && (!row.examKind || topic.exam === row.examKind));
  const values: Array<typeof caseEvidence.$inferInsert> = [
    ...examRows.sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime()).map((exam) => ({ caseId: row.id, orgId: row.orgId, kind: "exam" as const, refId: exam.id, snapshotJson: JSON.stringify({ title: exam.title, exam: exam.exam, date: exam.examDate, net: Number(exam.net), subjects: safeJson(exam.subjectsJson) }) })),
    { caseId: row.id, orgId: row.orgId, kind: "study" as const, refId: null, snapshotJson: JSON.stringify({ weeks }) },
    { caseId: row.id, orgId: row.orgId, kind: "topic" as const, refId: null, snapshotJson: JSON.stringify({ weak: topics.slice(0, 12).map((topic) => ({ topicId: (topic as unknown as { id: number }).id, subject: topic.subject, topic: topic.topic, progress: topic.progress })) }) },
  ];
  if (trend) values.unshift({ caseId: row.id, orgId: row.orgId, kind: "exam" as const, refId: null, snapshotJson: JSON.stringify({ summary: describeTrend(trend), totalChange: trend.status !== "insufficient" ? trend.totalChange : null, confidence: row.confidence }) });
  await db.insert(caseEvidence).values(values);
}

const safeJson = (value: string) => { try { return JSON.parse(value); } catch { return null; } };

async function requireCase(db: Db, orgId: number, caseId: number): Promise<CaseRow> {
  const [row] = await db.select().from(academicCases).where(and(eq(academicCases.id, caseId), eq(academicCases.orgId, orgId))).limit(1);
  if (!row) throw new CaseError("Takip dosyası bulunamadı.", "NOT_FOUND");
  return row;
}
export async function getCaseRow(orgId: number, caseId: number): Promise<CaseRow> { return requireCase(await requireDb(), orgId, caseId); }

/** Dosya kuyruğu: verilen öğrencilerin dosyaları (öğretmen için kendi öğrencileri, koordinatör+ için tümü). */
export async function listCases(orgId: number, options: { studentUserIds?: number[]; status?: CaseRow["status"] } = {}) {
  const db = await requireDb();
  if (options.studentUserIds && !options.studentUserIds.length) return [];
  const conditions = [eq(academicCases.orgId, orgId)];
  if (options.studentUserIds) conditions.push(inArray(academicCases.studentUserId, options.studentUserIds));
  if (options.status) conditions.push(eq(academicCases.status, options.status));
  const rows = await db.select({ case: academicCases, studentName: users.name }).from(academicCases).innerJoin(users, eq(users.id, academicCases.studentUserId)).where(and(...conditions)).orderBy(desc(academicCases.openedAt)).limit(200);
  const ids = rows.map((row) => row.case.id);
  const lastActions = ids.length ? await db.select({ caseId: caseActions.caseId, at: sql<Date>`max(${caseActions.createdAt})` }).from(caseActions).where(inArray(caseActions.caseId, ids)).groupBy(caseActions.caseId) : [];
  return rows.map((row) => ({ ...row.case, studentName: row.studentName, lastActionAt: lastActions.find((item) => item.caseId === row.case.id)?.at ?? null }));
}

/** Dosya ayrıntısı. Notlar burada süzülmez; router görünürlük kuralını uygular. */
export async function getCaseDetail(orgId: number, caseId: number) {
  const db = await requireDb();
  const row = await requireCase(db, orgId, caseId);
  const [evidence, actions, evaluations, notes] = await Promise.all([
    db.select().from(caseEvidence).where(eq(caseEvidence.caseId, caseId)).orderBy(caseEvidence.id),
    db.select().from(caseActions).where(eq(caseActions.caseId, caseId)).orderBy(caseActions.createdAt),
    db.select().from(caseEvaluations).where(eq(caseEvaluations.caseId, caseId)).orderBy(caseEvaluations.evaluatedAt),
    db.select({ id: counselingNotes.id, body: counselingNotes.body, visibility: counselingNotes.visibility, authorUserId: counselingNotes.authorUserId, authorName: users.name, createdAt: counselingNotes.createdAt }).from(counselingNotes).innerJoin(users, eq(users.id, counselingNotes.authorUserId))
      .where(and(eq(counselingNotes.orgId, orgId), eq(counselingNotes.caseId, caseId))).orderBy(desc(counselingNotes.createdAt)),
  ]);
  const actionIds = actions.map((action) => action.id);
  const tasks = actionIds.length ? await db.select({ id: studyPlanSessions.id, caseActionId: studyPlanSessions.caseActionId, sessionDate: studyPlanSessions.sessionDate, title: studyPlanSessions.title, plannedMinutes: studyPlanSessions.plannedMinutes, status: studyPlanSessions.status, studentFeedback: studyPlanSessions.studentFeedback, actualQuestions: studyPlanSessions.actualQuestions, correct: studyPlanSessions.correct, wrong: studyPlanSessions.wrong })
    .from(studyPlanSessions).where(and(eq(studyPlanSessions.userId, row.studentUserId), inArray(studyPlanSessions.caseActionId, actionIds))).orderBy(studyPlanSessions.sessionDate) : [];
  return {
    case: row,
    evidence: evidence.map((item) => ({ ...item, snapshot: safeJson(item.snapshotJson) })),
    actions: actions.map((item) => ({ ...item, payload: safeJson(item.payloadJson) })),
    evaluations: evaluations.map((item) => ({ ...item, netChange: item.netChange === null ? null : Number(item.netChange), studentSignals: safeJson(item.studentSignalsJson) })),
    notes,
    tasks,
  };
}

/** Eylem (inceleme, görüşme, kaynak, not). Aynı `idempotencyKey` ikinci kez yazılmaz. Açık dosya "devam ediyor"a geçer. */
export async function addCaseAction(input: { orgId: number; caseId: number; type: "review" | "meeting" | "resource" | "plan" | "note"; payload: Record<string, unknown>; actorUserId: number; idempotencyKey: string; bookId?: string | null; bookContentId?: number | null; status?: "planned" | "done" }): Promise<{ actionId: number; created: boolean }> {
  const db = await requireDb();
  const row = await requireCase(db, input.orgId, input.caseId);
  if (row.status === "closed") throw new CaseError("Dosya kapalı. Önce yeniden aç.");
  const [inserted] = await db.insert(caseActions).values({ caseId: row.id, orgId: row.orgId, type: input.type, payloadJson: JSON.stringify(input.payload), bookId: input.bookId ?? null, bookContentId: input.bookContentId ?? null, status: input.status ?? "done", createdByUserId: input.actorUserId, idempotencyKey: input.idempotencyKey })
    .onConflictDoNothing({ target: [caseActions.caseId, caseActions.idempotencyKey] }).returning({ id: caseActions.id });
  if (!inserted) {
    const [existing] = await db.select({ id: caseActions.id }).from(caseActions).where(and(eq(caseActions.caseId, row.id), eq(caseActions.idempotencyKey, input.idempotencyKey))).limit(1);
    return { actionId: existing.id, created: false };
  }
  if (row.status === "open") await db.update(academicCases).set({ status: "in_progress" }).where(eq(academicCases.id, row.id));
  return { actionId: inserted.id, created: true };
}

/** Dosyaya mahrem not (counseling_notes.caseId). */
export async function addCaseNote(input: { orgId: number; caseId: number; authorUserId: number; body: string; visibility: "staff" | "student" }) {
  const db = await requireDb();
  const row = await requireCase(db, input.orgId, input.caseId);
  const [note] = await db.insert(counselingNotes).values({ orgId: row.orgId, studentUserId: row.studentUserId, authorUserId: input.authorUserId, body: input.body, visibility: input.visibility, caseId: row.id }).returning({ id: counselingNotes.id });
  return note.id;
}

/**
 * Eldeki kitaplardan öneri: öğrencinin rafındaki (aktif) kitapların içindekilerinde bu konulara bağlı
 * bölüm/testler. Rafta karşılığı olmayan konular `missingTopicIds`; yalnızca onlar için katalogdan en
 * fazla 3 "yeni kaynak" önerilir (satın alma önce gelmez).
 */
export async function suggestOwnedResources(studentUserId: number, topicIds: number[]) {
  const db = await requireDb();
  if (!topicIds.length) return { owned: [], missingTopicIds: [], catalog: [] };
  const rows = await db.select({ bookId: userBookContents.bookId, contentId: userBookContents.id, topicId: userBookContents.topicId, label: userBookContents.label, title: userBookContents.title, unitTitle: userBookContents.unitTitle, testNumber: userBookContents.testNumber, pageStart: userBookContents.pageStart, pageEnd: userBookContents.pageEnd, bookTitle: userResourceBooks.title })
    .from(userBookContents)
    .innerJoin(bookInventory, and(eq(bookInventory.userId, userBookContents.userId), eq(bookInventory.bookId, userBookContents.bookId), isNull(bookInventory.removedAt)))
    .leftJoin(userResourceBooks, and(eq(userResourceBooks.userId, userBookContents.userId), eq(userResourceBooks.bookId, userBookContents.bookId)))
    .where(and(eq(userBookContents.userId, studentUserId), inArray(userBookContents.topicId, topicIds)))
    .orderBy(userBookContents.bookId, userBookContents.sortOrder);
  const byBook = new Map<string, { bookId: string; title: string; items: Array<{ bookContentId: number; topicId: number; label: string; title: string; pageStart: number | null; pageEnd: number | null }> }>();
  for (const row of rows) {
    const entry = byBook.get(row.bookId) ?? { bookId: row.bookId, title: row.bookTitle ?? "Kitabım", items: [] };
    entry.items.push({ bookContentId: row.contentId, topicId: row.topicId!, label: row.label, title: row.title || row.unitTitle, pageStart: row.pageStart, pageEnd: row.pageEnd });
    byBook.set(row.bookId, entry);
  }
  const covered = new Set(rows.map((row) => row.topicId));
  const missingTopicIds = topicIds.filter((id) => !covered.has(id));
  const catalog = missingTopicIds.length ? await db.selectDistinct({ catalogBookId: catalogBooks.id, title: catalogBooks.name, topicId: bookCurriculumTopics.topicId }).from(bookCurriculumTopics)
    .innerJoin(catalogBooks, eq(catalogBooks.id, bookCurriculumTopics.bookId))
    .where(and(inArray(bookCurriculumTopics.topicId, missingTopicIds), eq(catalogBooks.active, 1))).limit(3) : [];
  return { owned: Array.from(byBook.values()), missingTopicIds, catalog };
}

export type PlanDraftItem = { subject: string; topicId: number | null; topic: string; minutes: number; targetQuestions?: number; bookId?: string; bookContentId?: number; pages?: string };

/** Planlı oturumlar + okul/dershane + kurum ders programı: plan önizlemesinin dolu saatleri. */
async function busyProvider(studentUserId: number, from: Date, days: number) {
  const db = await requireDb();
  const start = new Date(from); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(end.getDate() + days + 1);
  const [schedule, courseBlocks, sessions] = await Promise.all([
    getClassSchedule(studentUserId),
    getCourseBlocks(studentUserId).catch(() => [] as ClassBlock[]),
    db.select({ sessionDate: studyPlanSessions.sessionDate, plannedMinutes: studyPlanSessions.plannedMinutes, status: studyPlanSessions.status, title: studyPlanSessions.title }).from(studyPlanSessions)
      .where(and(eq(studyPlanSessions.userId, studentUserId), eq(studyPlanSessions.status, "planned"), gte(studyPlanSessions.sessionDate, start), lt(studyPlanSessions.sessionDate, end))),
  ]);
  return (date: Date) => busyOn(date, { blocks: schedule.blocks, courseBlocks, sessions });
}

/** Önizleme: hiçbir şey yazılmaz. Günde en fazla bir görev, 16:00'dan sonra (okul çıkışı). */
export async function previewCasePlan(studentUserId: number, items: PlanDraftItem[], from: Date, days: number): Promise<Placement[]> {
  const busyFor = await busyProvider(studentUserId, from, days);
  return placePlanItems(items.map((item) => ({ minutes: item.minutes })), from, days, busyFor, { earliest: "16:00" });
}

/**
 * Planı öğrencinin takvimine yazar. Önce `plan` eylemi idempotencyKey ile açılır: aynı anahtar ikinci
 * kez gelirse yeni görev yazılmaz, mevcut görevler döner. Yerleşemeyen madde yazılmaz, `skipped` döner.
 */
export async function assignCasePlan(input: { orgId: number; caseId: number; actorUserId: number; items: PlanDraftItem[]; from: Date; days: number; idempotencyKey: string }) {
  const db = await requireDb();
  const row = await requireCase(db, input.orgId, input.caseId);
  const placements = await previewCasePlan(row.studentUserId, input.items, input.from, input.days);
  const { actionId, created } = await addCaseAction({ orgId: input.orgId, caseId: input.caseId, type: "plan", payload: { items: input.items, from: input.from, days: input.days }, actorUserId: input.actorUserId, idempotencyKey: input.idempotencyKey, status: "planned" });
  if (!created) {
    const existing = await db.select({ id: studyPlanSessions.id }).from(studyPlanSessions).where(and(eq(studyPlanSessions.userId, row.studentUserId), eq(studyPlanSessions.caseActionId, actionId)));
    return { actionId, sessionIds: existing.map((session) => session.id), skipped: [] as Array<{ itemIndex: number; reason: "no_slot" }>, duplicate: true };
  }
  const sessionIds: number[] = [];
  const skipped: Array<{ itemIndex: number; reason: "no_slot" }> = [];
  const placedDates: Date[] = [];
  for (const placement of placements) {
    const item = input.items[placement.index];
    if (!placement.date) { skipped.push({ itemIndex: placement.index, reason: "no_slot" }); continue; }
    const at = new Date(placement.date);
    at.setHours(Math.floor(placement.start / 60), placement.start % 60, 0, 0);
    sessionIds.push(await insertAssignedTask({ orgId: input.orgId, studentUserId: row.studentUserId, teacherUserId: input.actorUserId, sessionDate: at, title: `${item.subject} · ${item.topic}`, subject: item.subject, topic: item.topic, kind: "Konu tekrarı", plannedMinutes: item.minutes, targetQuestions: item.targetQuestions ?? null, summary: "Akademik takip dosyasından öğretmenin önerdiği çalışma.", caseActionId: actionId, targetPages: item.pages ?? null, sourceBookId: item.bookId ?? null }));
    placedDates.push(at);
  }
  const [teacher] = await db.select({ name: users.name }).from(users).where(eq(users.id, input.actorUserId)).limit(1);
  await notifyStudentOfTasks({ studentUserId: row.studentUserId, teacherName: teacher?.name ?? null, sessionDates: placedDates }).catch((error) => console.warn("[cases] notify failed:", error instanceof Error ? error.message : error));
  return { actionId, sessionIds, skipped, duplicate: false };
}

/**
 * Değerlendirme: açılıştaki son denemeye göre aynı sınav türündeki ilk sonraki deneme (varsa) ve
 * görev tamamlama + öğrenci geri bildirimi. Yeni deneme yoksa sınırlı kanıt olarak işaretlenir.
 * Sonucu öğretmen seçer: tamamlandı → dosya kapanır; devam ediyor / yeniden değerlendir → açık kalır.
 */
export async function evaluateCase(input: { orgId: number; caseId: number; actorUserId: number; outcome: "completed" | "ongoing" | "reassess"; note?: string | null }) {
  const db = await requireDb();
  const detail = await getCaseDetail(input.orgId, input.caseId);
  const row = detail.case;
  if (row.status === "closed") throw new CaseError("Dosya kapalı. Önce yeniden aç.");
  const examEvidence = detail.evidence.filter((item) => item.kind === "exam" && item.refId !== null);
  const baseline = examEvidence.at(-1) ?? null;
  const baselineDate = baseline ? new Date((baseline.snapshot as { date: string }).date) : row.openedAt;
  const exams = (await comparableExamsOf(row.studentUserId)).filter((exam) => (!row.examKind || exam.examKind === row.examKind) && exam.scope !== "branch" && exam.date.getTime() > Math.max(baselineDate.getTime(), new Date(row.openedAt).getTime() - DAY));
  const followup = exams.sort((a, b) => a.date.getTime() - b.date.getTime())[0] ?? null;
  const baselineNet = baseline ? Number((baseline.snapshot as { net: number }).net) : null;
  const netChange = followup && baselineNet !== null ? Math.round((followup.net - baselineNet) * 100) / 100 : null;
  const signals = { done: 0, struggled: 0, needs_review: 0 };
  for (const task of detail.tasks) if (task.studentFeedback) signals[task.studentFeedback] += 1;
  const tasksDone = detail.tasks.filter((task) => task.status === "completed" || task.studentFeedback === "done").length;
  const limited = !followup;
  const uncertaintyNote = limited
    ? "Karşılaştırılabilir yeni deneme yok; değerlendirme yalnızca görev tamamlama ve öğrencinin geri bildirimine dayanıyor."
    : "Net değişimi tek başına müdahalenin etkisini göstermez; deneme zorluğu ve başka etkenler de rol oynar.";
  const [evaluation] = await db.insert(caseEvaluations).values({ caseId: row.id, orgId: row.orgId, baselineExamId: baseline?.refId ?? null, followupExamId: followup?.id ?? null, netChange: netChange === null ? null : netChange.toFixed(2), tasksDone, tasksTotal: detail.tasks.length, studentSignalsJson: JSON.stringify(signals), limitedEvidence: limited ? 1 : 0, uncertaintyNote, teacherOutcome: input.outcome, evaluatedByUserId: input.actorUserId }).returning({ id: caseEvaluations.id });
  await db.update(academicCases).set(input.outcome === "completed" ? { status: "closed", outcome: "completed", closedAt: new Date() } : { status: "in_progress", outcome: input.outcome }).where(eq(academicCases.id, row.id));
  if (input.note?.trim()) await addCaseNote({ orgId: input.orgId, caseId: row.id, authorUserId: input.actorUserId, body: input.note.trim(), visibility: "staff" });
  return { evaluationId: evaluation.id, limitedEvidence: limited, netChange, tasksDone, tasksTotal: detail.tasks.length };
}

/** Kapalı dosyayı yeniden açar (geçmiş korunur). Aynı konuda başka açık dosya varsa açılmaz. */
export async function reopenCase(input: { orgId: number; caseId: number; actorUserId: number; reason: string }) {
  const db = await requireDb();
  const row = await requireCase(db, input.orgId, input.caseId);
  if (row.status !== "closed") throw new CaseError("Dosya zaten açık.");
  try {
    await db.update(academicCases).set({ status: "in_progress", outcome: null, closedAt: null }).where(eq(academicCases.id, row.id));
  } catch (error) {
    if (isUniqueViolation(error)) throw new CaseError("Bu öğrenci için aynı konuda açık bir dosya var.", "CONFLICT");
    throw error;
  }
  await addCaseAction({ orgId: input.orgId, caseId: row.id, type: "review", payload: { reopened: true, reason: input.reason }, actorUserId: input.actorUserId, idempotencyKey: `reopen-${Date.now()}` });
}

/** Yönetici özeti: yalnızca sayılar (not içeriği yok). Geciken: 7 günden uzun süredir eylemsiz açık dosya. */
export async function caseSummary(orgId: number, now = new Date()) {
  const cases = await listCases(orgId);
  const stale = (row: (typeof cases)[number]) => row.status !== "closed" && now.getTime() - new Date(row.lastActionAt ?? row.openedAt).getTime() > 7 * DAY;
  return {
    open: cases.filter((row) => row.status === "open").length,
    inProgress: cases.filter((row) => row.status === "in_progress").length,
    evaluating: cases.filter((row) => row.status === "evaluating").length,
    closedLast30: cases.filter((row) => row.status === "closed" && row.closedAt && now.getTime() - new Date(row.closedAt).getTime() <= 30 * DAY).length,
    overdue: cases.filter(stale).length,
  };
}

/** Öğrenci: bu haftaki öğretmen görevleri (dosyanın kendisi görünmez). */
export async function listStudentAssignedTasks(studentUserId: number, now = new Date()) {
  const db = await requireDb();
  const start = new Date(now); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const end = new Date(start); end.setDate(end.getDate() + 7);
  return db.select({ id: studyPlanSessions.id, sessionDate: studyPlanSessions.sessionDate, title: studyPlanSessions.title, subject: studyPlanSessions.subject, topic: studyPlanSessions.topic, plannedMinutes: studyPlanSessions.plannedMinutes, targetPages: studyPlanSessions.targetPages, status: studyPlanSessions.status, studentFeedback: studyPlanSessions.studentFeedback, assignedBy: users.name })
    .from(studyPlanSessions).leftJoin(users, eq(users.id, studyPlanSessions.assignedByUserId))
    .where(and(eq(studyPlanSessions.userId, studentUserId), sql`${studyPlanSessions.assignedByUserId} IS NOT NULL`, gte(studyPlanSessions.sessionDate, start), lt(studyPlanSessions.sessionDate, end)))
    .orderBy(studyPlanSessions.sessionDate);
}

/** Öğrenci geri bildirimi: yalnızca kendi görevine. "done" görevi tamamlandı sayar. */
export async function setStudentFeedback(studentUserId: number, sessionId: number, feedback: "done" | "struggled" | "needs_review"): Promise<boolean> {
  const db = await requireDb();
  const now = new Date();
  const rows = await db.update(studyPlanSessions).set({ studentFeedback: feedback, studentFeedbackAt: now, ...(feedback === "done" ? { status: "completed" as const, completedAt: now } : {}) })
    .where(and(eq(studyPlanSessions.id, sessionId), eq(studyPlanSessions.userId, studentUserId), sql`${studyPlanSessions.assignedByUserId} IS NOT NULL`)).returning({ id: studyPlanSessions.id });
  return rows.length > 0;
}

/**
 * Öğretmenin haftalık özeti için akademik takip bölümü (kurumda kapalıysa null): dosyası açılmamış
 * inceleme önerileri ve verilen öğrencilerin açık / 7 günden uzun süredir işlemsiz dosyaları.
 */
export async function academicDigestFor(orgId: number, students: Array<{ userId: number; name: string }>, now = new Date()): Promise<AcademicDigest | null> {
  if (!students.length || !(await isCasesEnabled(orgId))) return null;
  const ids = students.map((student) => student.userId);
  const names = new Map(students.map((student) => [student.userId, student.name]));
  const signals = await listSignals(orgId, ids);
  const cases = (await listCases(orgId, { studentUserIds: ids })).filter((row) => row.status !== "closed");
  return {
    suggestions: signals.filter((signal) => signal.status === "signal" && !signal.openCaseId).map((signal) => ({ name: names.get(signal.studentUserId) ?? "Öğrenci", description: signal.description })),
    openCases: cases.length,
    staleCases: cases.filter((row) => now.getTime() - new Date(row.lastActionAt ?? row.openedAt).getTime() > 7 * DAY).length,
  };
}

/**
 * Öğretmen görev verdiğinde öğrenciye bildirim: uygulama içi (zil) ve, öğrenci açtıysa, telefon
 * bildirimi. Bildirim dilinde risk ya da dosya geçmez; yalnızca görevin kendisi.
 */
export async function notifyStudentOfTasks(input: { studentUserId: number; teacherName: string | null; sessionDates: Date[] }): Promise<void> {
  if (!input.sessionDates.length) return;
  const db = await requireDb();
  const first = [...input.sessionDates].sort((a, b) => a.getTime() - b.getTime())[0];
  // Sunucu UTC'de çalışabilir (Vercel): saat her zaman Türkiye saatiyle yazılır.
  const when = first.toLocaleString("tr-TR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });
  const who = input.teacherName?.trim() || "Öğretmenin";
  const count = input.sessionDates.length;
  const title = count > 1 ? `${who} ${count} çalışma önerdi` : `${who} bir çalışma önerdi`;
  const message = `Takvimine eklendi; ilki ${when}. Genel Bakış'taki "Bu haftaki çalışmalar"dan durumunu bildirebilirsin.`;
  await db.insert(coachAlerts).values({ userId: input.studentUserId, level: "action", ruleKey: "teacher_tasks", title, message });
  // Telefon bildirimi isteğe bağlı: anahtar yoksa ya da abonelik yoksa sessizce geçilir.
  if (pushConfigured()) await sendToUser(input.studentUserId, { title, body: message, url: "/", tag: "teacher-tasks" }).catch(() => undefined);
}

/** Konu adı → kimlik (plan maddeleri için). */
export async function topicsByIds(ids: number[]) {
  if (!ids.length) return [];
  const db = await requireDb();
  return db.select({ id: yksTopics.id, subject: yksTopics.subject, topic: yksTopics.topic }).from(yksTopics).where(inArray(yksTopics.id, ids));
}
