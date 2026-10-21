import { and, asc, desc, eq, gte, isNotNull, isNull, lt, lte, ne, sql, type SQL } from "drizzle-orm";
import { notebookQuestions, notes, questionAttempts, studyPlanSessions, yksTopics } from "../../drizzle/schema";
import {
  HINT_LEVELS,
  MAX_QUESTIONS_PER_REVIEW,
  NOTEBOOK_REVIEW_TASK_KIND,
  QUESTION_TEMPLATE_KEY,
  buildErrorMap,
  buildQuestionDoc,
  describeErrorMapForPlan,
  firstReviewAt,
  parseAiSolution,
  questionTitle,
  reviewTaskMinutes,
  scheduleAfterAttempt,
  type AiSolution,
  type AttemptResult,
  type Difficulty,
  type ErrorType,
  type QuestionStatus,
} from "../../shared/questionNotebook";
import type { NoteDoc, NoteNode } from "../../shared/noteContent";
import { getDb } from "../db";
import { insertPlanTask, pickDayForTask } from "../studyPlan/planTasks";
import { getAttachmentStorage } from "./attachmentStorage";
import { NoteError, deleteNote, saveNote } from "./notesDb";

// Soru Defterim veri katmanı. Her sorgu userId ile kapsamlıdır.

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;
async function requireDb(): Promise<Db> {
  const db = await getDb();
  if (!db) throw new NoteError("Veritabanı bağlantısı yok.");
  return db;
}

const startOfToday = () => { const date = new Date(); date.setHours(0, 0, 0, 0); return date; };
const endOfToday = () => { const date = new Date(); date.setHours(23, 59, 59, 999); return date; };
const clean = (value: string | null | undefined, max: number) => (value?.trim() ? value.trim().slice(0, max) : null);

export type QuestionFields = {
  subject?: string | null;
  topicId?: number | null;
  stuckPoint?: string | null;
  solutionText?: string | null;
  solutionImageId?: number | null;
  errorType?: ErrorType | null;
  errorTypeSource?: "student" | "ai" | null;
  difficulty?: Difficulty | null;
};

export type CreateQuestionInput = QuestionFields & {
  clientId: string;
  questionImageId?: number | null;
  questionOcrText?: string | null;
  voiceAttachmentId?: number | null;
  voiceDuration?: number | null;
  aiTopicId?: number | null;
  bookId?: string | null;
  studySessionId?: number | null;
};

/** Ek o öğrencinin mi ve beklenen türde mi? (Başka öğrencinin fotoğrafı karta bağlanamaz.) */
async function assertAttachment(userId: number, id: number | null | undefined, kind: "image" | "audio") {
  if (!id) return;
  const attachment = await getAttachmentStorage().get(userId, id);
  if (!attachment || attachment.kind !== kind) throw new NoteError(kind === "image" ? "Fotoğraf bulunamadı." : "Ses kaydı bulunamadı.");
}

async function resolveTopic(db: Db, topicId: number | null | undefined) {
  if (!topicId) return null;
  const [topic] = await db.select({ id: yksTopics.id, subject: yksTopics.subject, topic: yksTopics.topic }).from(yksTopics).where(eq(yksTopics.id, topicId)).limit(1);
  if (!topic) throw new NoteError("Seçilen konu bulunamadı.");
  return topic;
}

/** Nottaki soru fotoğrafının OCR metnini korur (kart güncellenince belge yeniden üretilir). */
function ocrTextOf(content: string, attachmentId: number | null): string | null {
  if (!attachmentId) return null;
  try {
    const doc = JSON.parse(content) as NoteDoc;
    const image = doc.content.find((node: NoteNode) => node.type === "noteImage" && Number(node.attrs?.attachmentId) === attachmentId);
    return typeof image?.attrs?.ocrText === "string" ? image.attrs.ocrText : null;
  } catch {
    return null;
  }
}

/**
 * Yeni soru kartı: önce not (ekler nota bağlanır, yetim temizliği silmez),
 * sonra kart. Aynı clientId ile yeniden gönderilirse ikinci kart oluşmaz.
 */
export async function createQuestion(userId: number, input: CreateQuestionInput) {
  const db = await requireDb();
  // Yeniden gönderim (ağ hatası sonrası "Kaydet"e tekrar basmak): mevcut kart olduğu gibi döner, üzerine yazılmaz.
  const [existing] = await db.select({ id: notebookQuestions.id }).from(notebookQuestions).innerJoin(notes, eq(notes.id, notebookQuestions.noteId)).where(and(eq(notebookQuestions.userId, userId), eq(notes.userId, userId), eq(notes.clientId, input.clientId))).limit(1);
  if (existing) return (await getQuestion(userId, existing.id))!;
  const stuckPoint = clean(input.stuckPoint, 4000);
  if (!input.questionImageId && !stuckPoint) throw new NoteError("Sorunun fotoğrafını ekle ya da nerede takıldığını yaz.");
  await assertAttachment(userId, input.questionImageId, "image");
  await assertAttachment(userId, input.solutionImageId, "image");
  await assertAttachment(userId, input.voiceAttachmentId, "audio");
  const topic = await resolveTopic(db, input.topicId);
  const subject = clean(input.subject, 80) ?? topic?.subject ?? null;
  const now = new Date();
  const fields = {
    subject,
    topicId: topic?.id ?? null,
    questionImageId: input.questionImageId ?? null,
    solutionImageId: input.solutionImageId ?? null,
    voiceAttachmentId: input.voiceAttachmentId ?? null,
    voiceDuration: input.voiceAttachmentId ? Math.round(input.voiceDuration ?? 0) : null,
    stuckPoint,
    solutionText: clean(input.solutionText, 4000),
    errorType: input.errorType ?? null,
    errorTypeSource: input.errorType ? input.errorTypeSource ?? "student" : null,
    difficulty: input.difficulty ?? null,
  };
  const saved = await saveNote(userId, {
    clientId: input.clientId,
    title: questionTitle(subject, topic?.topic ?? null, now),
    content: buildQuestionDoc({ ...fields, questionOcrText: clean(input.questionOcrText, 5000) }),
    noteDate: now,
    tags: ["soru"],
    templateKey: QUESTION_TEMPLATE_KEY,
    subject,
    topicId: topic?.id ?? null,
    bookId: input.bookId ?? null,
    studySessionId: input.studySessionId ?? null,
  });
  await db
    .insert(notebookQuestions)
    .values({ userId, noteId: saved.id, ...fields, aiTopicId: input.aiTopicId ?? null, nextReviewAt: firstReviewAt(now) })
    .onConflictDoUpdate({ target: notebookQuestions.noteId, set: fields });
  const [row] = await db.select({ id: notebookQuestions.id }).from(notebookQuestions).where(and(eq(notebookQuestions.userId, userId), eq(notebookQuestions.noteId, saved.id))).limit(1);
  if (!row) throw new NoteError("Soru kaydedilemedi.");
  return (await getQuestion(userId, row.id))!;
}

/** Kart alanlarını günceller ve not içeriğini bu alanlardan yeniden üretir. */
export async function updateQuestion(userId: number, id: number, patch: QuestionFields) {
  const db = await requireDb();
  const [row] = await db.select().from(notebookQuestions).where(and(eq(notebookQuestions.id, id), eq(notebookQuestions.userId, userId))).limit(1);
  if (!row) throw new NoteError("Soru bulunamadı.");
  const [note] = await db.select({ clientId: notes.clientId, content: notes.content, noteDate: notes.noteDate, bookId: notes.bookId, studySessionId: notes.studySessionId, isFavorite: notes.isFavorite, isPinned: notes.isPinned }).from(notes).where(and(eq(notes.id, row.noteId), eq(notes.userId, userId))).limit(1);
  if (!note) throw new NoteError("Soru bulunamadı.");
  if (patch.solutionImageId !== undefined) await assertAttachment(userId, patch.solutionImageId, "image");
  const topicChanged = patch.topicId !== undefined;
  const topic = await resolveTopic(db, topicChanged ? patch.topicId : row.topicId);
  const subject = patch.subject !== undefined ? clean(patch.subject, 80) ?? topic?.subject ?? null : topicChanged && topic ? topic.subject : row.subject;
  const errorType = patch.errorType !== undefined ? patch.errorType : (row.errorType as ErrorType | null);
  const next = {
    subject,
    topicId: topic?.id ?? null,
    stuckPoint: patch.stuckPoint !== undefined ? clean(patch.stuckPoint, 4000) : row.stuckPoint,
    solutionText: patch.solutionText !== undefined ? clean(patch.solutionText, 4000) : row.solutionText,
    solutionImageId: patch.solutionImageId !== undefined ? patch.solutionImageId : row.solutionImageId,
    errorType,
    errorTypeSource: errorType ? (patch.errorType !== undefined ? patch.errorTypeSource ?? "student" : row.errorTypeSource) : null,
    difficulty: patch.difficulty !== undefined ? patch.difficulty : row.difficulty,
  };
  if (!row.questionImageId && !next.stuckPoint) throw new NoteError("Fotoğrafsız bir soruda takıldığın yer boş bırakılamaz.");
  await saveNote(userId, {
    clientId: note.clientId,
    title: questionTitle(next.subject, topic?.topic ?? null, row.createdAt),
    content: buildQuestionDoc({ ...row, ...next, questionOcrText: ocrTextOf(note.content, row.questionImageId) }),
    noteDate: note.noteDate,
    tags: ["soru"],
    templateKey: QUESTION_TEMPLATE_KEY,
    subject: next.subject,
    topicId: next.topicId,
    bookId: note.bookId,
    studySessionId: note.studySessionId,
    isFavorite: note.isFavorite === 1,
    isPinned: note.isPinned === 1,
  });
  await db.update(notebookQuestions).set(next).where(eq(notebookQuestions.id, id));
  return (await getQuestion(userId, id))!;
}

const questionColumns = {
  id: notebookQuestions.id,
  noteId: notebookQuestions.noteId,
  subject: notebookQuestions.subject,
  topicId: notebookQuestions.topicId,
  topic: yksTopics.topic,
  questionImageId: notebookQuestions.questionImageId,
  solutionImageId: notebookQuestions.solutionImageId,
  voiceAttachmentId: notebookQuestions.voiceAttachmentId,
  voiceDuration: notebookQuestions.voiceDuration,
  stuckPoint: notebookQuestions.stuckPoint,
  solutionText: notebookQuestions.solutionText,
  errorType: notebookQuestions.errorType,
  errorTypeSource: notebookQuestions.errorTypeSource,
  difficulty: notebookQuestions.difficulty,
  status: notebookQuestions.status,
  reviewStage: notebookQuestions.reviewStage,
  nextReviewAt: notebookQuestions.nextReviewAt,
  attemptCount: notebookQuestions.attemptCount,
  lastResult: notebookQuestions.lastResult,
  lastAttemptAt: notebookQuestions.lastAttemptAt,
  aiSolution: notebookQuestions.aiSolution,
  aiSolutionAt: notebookQuestions.aiSolutionAt,
  aiSolutionModel: notebookQuestions.aiSolutionModel,
  createdAt: notebookQuestions.createdAt,
};

type QuestionRow = { errorType: string | null; aiSolution: string | null } & Record<string, unknown>;
const shape = <T extends QuestionRow>(row: T): Omit<T, "errorType" | "aiSolution"> & { errorType: ErrorType | null; aiSolution: AiSolution | null } => ({ ...row, errorType: row.errorType as ErrorType | null, aiSolution: row.aiSolution ? parseAiSolution(row.aiSolution) : null });

export async function getQuestion(userId: number, id: number) {
  const db = await requireDb();
  const [row] = await db.select(questionColumns).from(notebookQuestions).leftJoin(yksTopics, eq(yksTopics.id, notebookQuestions.topicId)).where(and(eq(notebookQuestions.id, id), eq(notebookQuestions.userId, userId))).limit(1);
  if (!row) return null;
  const attempts = await db.select({ result: questionAttempts.result, sawSolution: questionAttempts.sawSolution, hintLevel: questionAttempts.hintLevel, attemptedAt: questionAttempts.attemptedAt }).from(questionAttempts).where(and(eq(questionAttempts.userId, userId), eq(questionAttempts.questionId, id))).orderBy(desc(questionAttempts.attemptedAt), desc(questionAttempts.id)).limit(20);
  return { ...shape(row), attempts: attempts.map((attempt) => ({ ...attempt, sawSolution: attempt.sawSolution === 1 })) };
}

/** ✨ Adım adım çöz için kartın sorusu: fotoğraf, OCR metni, takıldığı yer, ders/konu. */
export async function getSolveContext(userId: number, id: number) {
  const db = await requireDb();
  const [row] = await db
    .select({ questionImageId: notebookQuestions.questionImageId, stuckPoint: notebookQuestions.stuckPoint, subject: notebookQuestions.subject, topic: yksTopics.topic, exam: yksTopics.exam, content: notes.content, aiSolution: notebookQuestions.aiSolution, aiSolutionModel: notebookQuestions.aiSolutionModel, difficulty: notebookQuestions.difficulty, lastResult: notebookQuestions.lastResult })
    .from(notebookQuestions)
    .innerJoin(notes, eq(notes.id, notebookQuestions.noteId))
    .leftJoin(yksTopics, eq(yksTopics.id, notebookQuestions.topicId))
    .where(and(eq(notebookQuestions.id, id), eq(notebookQuestions.userId, userId)))
    .limit(1);
  if (!row) throw new NoteError("Soru bulunamadı.");
  return { questionImageId: row.questionImageId, ocrText: ocrTextOf(row.content, row.questionImageId), stuckPoint: row.stuckPoint, subject: row.subject, topic: row.topic, aiSolution: parseAiSolution(row.aiSolution), aiSolutionModel: row.aiSolutionModel, exam: row.exam, difficulty: row.difficulty, lastResult: row.lastResult };
}

/** AI çözümünü karta yazar: kart yeniden açıldığında çözüm için yeniden ücret ödenmez. */
export async function saveAiSolution(userId: number, id: number, solution: AiSolution, aiSolutionModel: string | null = null) {
  const db = await requireDb();
  const aiSolutionAt = new Date();
  await db.update(notebookQuestions).set({ aiSolution: JSON.stringify(solution), aiSolutionAt, aiSolutionModel }).where(and(eq(notebookQuestions.id, id), eq(notebookQuestions.userId, userId)));
  return { aiSolution: solution, aiSolutionAt, aiSolutionModel };
}

export async function getQuestionIdByNote(userId: number, noteId: number) {
  const db = await requireDb();
  const [row] = await db.select({ id: notebookQuestions.id }).from(notebookQuestions).where(and(eq(notebookQuestions.userId, userId), eq(notebookQuestions.noteId, noteId))).limit(1);
  return row?.id ?? null;
}

export type QuestionListFilters = { status?: "open" | "mastered" | "all"; due?: boolean; subject?: string | null; topicId?: number | null; cursor?: number | null; limit?: number };

export async function listQuestions(userId: number, filters: QuestionListFilters) {
  const db = await requireDb();
  const limit = Math.min(Math.max(filters.limit ?? 30, 1), 100);
  const conditions: SQL[] = [eq(notebookQuestions.userId, userId)];
  if (filters.status === "open" || filters.due) conditions.push(ne(notebookQuestions.status, "mastered"));
  if (filters.status === "mastered") conditions.push(eq(notebookQuestions.status, "mastered"));
  if (filters.due) conditions.push(and(isNotNull(notebookQuestions.nextReviewAt), lte(notebookQuestions.nextReviewAt, endOfToday()))!);
  conditions.push(...questionSubject(filters.subject));
  if (filters.topicId) conditions.push(eq(notebookQuestions.topicId, filters.topicId));
  // Tekrar listesi: en çok gecikenden başlar. Genel liste: en yeniden.
  if (!filters.due && filters.cursor) conditions.push(lt(notebookQuestions.id, filters.cursor));
  const rows = await db
    .select(questionColumns)
    .from(notebookQuestions)
    .leftJoin(yksTopics, eq(yksTopics.id, notebookQuestions.topicId))
    .where(and(...conditions))
    .orderBy(...(filters.due ? [asc(notebookQuestions.nextReviewAt), asc(notebookQuestions.id)] : [desc(notebookQuestions.id)]))
    .limit(limit + 1);
  const page = rows.slice(0, limit).map(shape);
  return { items: page, nextCursor: !filters.due && rows.length > limit ? page[page.length - 1]?.id ?? null : null };
}

export async function deleteQuestion(userId: number, id: number) {
  const db = await requireDb();
  const [row] = await db.select({ noteId: notebookQuestions.noteId }).from(notebookQuestions).where(and(eq(notebookQuestions.id, id), eq(notebookQuestions.userId, userId))).limit(1);
  if (!row) throw new NoteError("Soru bulunamadı.");
  // Kart, denemeler ve ekler notla birlikte silinir (bkz. deleteNote).
  await deleteNote(userId, row.noteId);
}

/** "Tekrar çöz" sonucu: deneme kaydedilir, kartın basamağı ve sonraki tekrar günü güncellenir. */
export async function recordAttempt(userId: number, id: number, input: { result: AttemptResult; sawSolution: boolean; hintLevel?: number | null; seconds?: number | null }) {
  const db = await requireDb();
  const [row] = await db.select({ reviewStage: notebookQuestions.reviewStage }).from(notebookQuestions).where(and(eq(notebookQuestions.id, id), eq(notebookQuestions.userId, userId))).limit(1);
  if (!row) throw new NoteError("Soru bulunamadı.");
  const now = new Date();
  const hintLevel = Math.min(Math.max(Math.round(input.hintLevel ?? 0), 0), HINT_LEVELS.solution);
  const next = scheduleAfterAttempt(row, input.result, input.sawSolution, now, hintLevel);
  await db.insert(questionAttempts).values({ userId, questionId: id, result: input.result, sawSolution: input.sawSolution ? 1 : 0, hintLevel, seconds: input.seconds ? Math.min(Math.round(input.seconds), 7200) : null, stageBefore: row.reviewStage, attemptedAt: now });
  await db.update(notebookQuestions).set({ ...next, attemptCount: sql`${notebookQuestions.attemptCount} + 1`, lastResult: input.result, lastAttemptAt: now }).where(eq(notebookQuestions.id, id));
  return next;
}

/** Ders defteri kapsamı: undefined = tüm dersler, null = derssiz ("Genel"), metin = o dersin defteri. */
export type SubjectScope = string | null | undefined;
const questionSubject = (subject: SubjectScope): SQL[] => (subject === undefined ? [] : [subject === null ? isNull(notebookQuestions.subject) : eq(notebookQuestions.subject, subject)]);

/** Son N günde eklenen kartların hata haritası (null = tümü). */
export async function getErrorMap(userId: number, days: number | null, subject?: SubjectScope) {
  const db = await requireDb();
  const conditions: SQL[] = [eq(notebookQuestions.userId, userId), ...questionSubject(subject)];
  if (days) conditions.push(gte(notebookQuestions.createdAt, new Date(Date.now() - days * 86_400_000)));
  const rows = await db
    .select({ subject: notebookQuestions.subject, topicId: notebookQuestions.topicId, topic: yksTopics.topic, errorType: notebookQuestions.errorType, status: notebookQuestions.status })
    .from(notebookQuestions)
    .leftJoin(yksTopics, eq(yksTopics.id, notebookQuestions.topicId))
    .where(and(...conditions));
  return buildErrorMap(rows.map((row) => ({ ...row, status: row.status as QuestionStatus })));
}

/** AI plan istemine eklenecek defter özeti (son 60 gün); veri yoksa null. */
export async function getNotebookPlanSignal(userId: number): Promise<string | null> {
  return describeErrorMapForPlan(await getErrorMap(userId, 60));
}

async function todaysReviewTask(db: Db, userId: number) {
  const [task] = await db
    .select({ id: studyPlanSessions.id, status: studyPlanSessions.status, plannedMinutes: studyPlanSessions.plannedMinutes, title: studyPlanSessions.title })
    .from(studyPlanSessions)
    .where(and(eq(studyPlanSessions.userId, userId), eq(studyPlanSessions.kind, NOTEBOOK_REVIEW_TASK_KIND), gte(studyPlanSessions.sessionDate, startOfToday()), lte(studyPlanSessions.sessionDate, endOfToday())))
    .orderBy(desc(studyPlanSessions.id))
    .limit(1);
  return task ?? null;
}

const dueCondition = () => and(ne(notebookQuestions.status, "mastered"), isNotNull(notebookQuestions.nextReviewAt), lte(notebookQuestions.nextReviewAt, endOfToday()))!;

async function countDue(db: Db, userId: number, subject?: SubjectScope) {
  const [row] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(notebookQuestions).where(and(eq(notebookQuestions.userId, userId), dueCondition(), ...questionSubject(subject)));
  return Number(row?.count ?? 0);
}

/** Genel Bakış ve defter başlığı için: tekrar bekleyen soru sayısı + bugünkü defter görevi (görev her zaman tüm dersler için). */
export async function getReviewSummary(userId: number, subject?: SubjectScope) {
  const db = await requireDb();
  const [due, task, totals] = await Promise.all([
    countDue(db, userId, subject),
    todaysReviewTask(db, userId),
    db.select({ status: notebookQuestions.status, count: sql<number>`COUNT(*)::int` }).from(notebookQuestions).where(and(eq(notebookQuestions.userId, userId), ...questionSubject(subject))).groupBy(notebookQuestions.status),
  ]);
  const byStatus = Object.fromEntries(totals.map((row) => [row.status, Number(row.count)])) as Partial<Record<QuestionStatus, number>>;
  const reviewCount = Math.min(due, MAX_QUESTIONS_PER_REVIEW);
  return {
    due,
    reviewCount,
    minutes: reviewTaskMinutes(reviewCount),
    task,
    totals: { unsolved: byStatus.unsolved ?? 0, learning: byStatus.learning ?? 0, mastered: byStatus.mastered ?? 0 },
  };
}

/**
 * Bugünün planına tek bir "Defter Tekrarı" görevi ekler (günde bir; zaten
 * varsa onu döndürür). Görev mevcut planı ezmez — plan motorunun ortak yolu kullanılır.
 */
export async function addReviewTask(userId: number) {
  const db = await requireDb();
  const existing = await todaysReviewTask(db, userId);
  if (existing) return { created: false, task: existing };
  const due = Math.min(await countDue(db, userId), MAX_QUESTIONS_PER_REVIEW);
  if (due === 0) throw new NoteError("Bugün tekrar bekleyen soru yok.");
  const minutes = reviewTaskMinutes(due);
  const date = await pickDayForTask(userId, minutes, "today");
  await insertPlanTask(userId, { date, title: `📓 Defterim · ${due} soru tekrarı`, subject: "Defterim", topic: "Soru tekrarı", kind: NOTEBOOK_REVIEW_TASK_KIND, minutes, planTitle: "Defter görevleri", planSummary: "Akıllı Defter'deki notlardan ve sorulardan oluşturulan çalışma görevleri." });
  return { created: true, task: await todaysReviewTask(db, userId) };
}

/**
 * Tekrar oturumu bitti: bugünün planlanmış "Defter Tekrarı" görevi varsa
 * sonuçlarla tamamlanır (çözdüm = doğru, kısmen = boş, çözemedim = yanlış).
 * Konu haritasına yazılmaz: sorular farklı konulardan gelir.
 */
export async function finishReviewSession(userId: number, input: { minutes: number; solved: number; partial: number; failed: number }) {
  const db = await requireDb();
  const task = await todaysReviewTask(db, userId);
  if (!task || task.status !== "planned") return { taskCompleted: false };
  const total = input.solved + input.partial + input.failed;
  await db.update(studyPlanSessions).set({ status: "completed", completedAt: new Date(), actualMinutes: Math.max(1, Math.round(input.minutes)), actualQuestions: total, correct: input.solved, wrong: input.failed, blank: input.partial }).where(and(eq(studyPlanSessions.id, task.id), eq(studyPlanSessions.userId, userId)));
  return { taskCompleted: true };
}

// ---------------------------------------------------------------------------
// Ders defterleri: Defterim'de her ders bir sekmedir. Bir not ya da soru kartı,
// `subject` alanıyla o dersin defterindedir; derssiz olanlar "Genel"dedir.
// ---------------------------------------------------------------------------

/** Ders başına not, soru ve bugün tekrar bekleyen soru sayısı (sekme rozetleri). subject = null → "Genel". */
export async function getSubjectSummary(userId: number) {
  const db = await requireDb();
  // Sabit metin parametre değil düz yazılır: PG, SELECT ve GROUP BY'daki ifadeyi ayrı parametrelerle aynı saymaz.
  const isQuestion = sql<number>`(${notes.templateKey} IS NOT DISTINCT FROM ${sql.raw(`'${QUESTION_TEMPLATE_KEY}'`)})::int`;
  const [noteRows, dueRows] = await Promise.all([
    db.select({ subject: notes.subject, isQuestion, count: sql<number>`COUNT(*)::int` }).from(notes).where(and(eq(notes.userId, userId), eq(notes.status, "active"))).groupBy(notes.subject, isQuestion),
    db.select({ subject: notebookQuestions.subject, count: sql<number>`COUNT(*)::int` }).from(notebookQuestions).where(and(eq(notebookQuestions.userId, userId), dueCondition())).groupBy(notebookQuestions.subject),
  ]);
  const bySubject = new Map<string | null, { subject: string | null; notes: number; questions: number; due: number }>();
  const entry = (subject: string | null) => { const key = subject?.trim() || null; const found = bySubject.get(key) ?? { subject: key, notes: 0, questions: 0, due: 0 }; bySubject.set(key, found); return found; };
  for (const row of noteRows) { const item = entry(row.subject); if (Number(row.isQuestion) === 1) item.questions += Number(row.count); else item.notes += Number(row.count); }
  for (const row of dueRows) entry(row.subject).due += Number(row.count);
  return Array.from(bySubject.values());
}

/**
 * Bir notu ya da soru kartını bir ders defterine koyar (null = defterden çıkar,
 * "Genel"e döner). Bağlı konu başka derse aitse konu bağlantısı kaldırılır;
 * soru kartında başlık ve not içeriği yeniden üretilir.
 */
export async function moveNoteToSubject(userId: number, noteId: number, subject: string | null) {
  const db = await requireDb();
  const target = clean(subject, 80);
  const [note] = await db.select({ id: notes.id, topicId: notes.topicId, templateKey: notes.templateKey }).from(notes).where(and(eq(notes.id, noteId), eq(notes.userId, userId))).limit(1);
  if (!note) throw new NoteError("Not bulunamadı.");
  const topic = note.topicId ? await resolveTopic(db, note.topicId).catch(() => null) : null;
  const keepTopic = Boolean(topic && target && topic.subject === target);
  if (note.templateKey === QUESTION_TEMPLATE_KEY) {
    const questionId = await getQuestionIdByNote(userId, noteId);
    if (questionId) {
      await updateQuestion(userId, questionId, { subject: target, topicId: keepTopic ? topic!.id : null });
      return { subject: target };
    }
  }
  await db.update(notes).set({ subject: target, ...(keepTopic ? {} : { topicId: null }) }).where(and(eq(notes.id, noteId), eq(notes.userId, userId)));
  return { subject: target };
}

