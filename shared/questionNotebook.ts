// Soru Defterim — sunucu ve istemci ortak mantık.
//
// Öğrencinin çözemediği soru bir "soru kartı"dır: fotoğraf + takıldığı yer +
// (isteğe bağlı) çözüm notu + ders/konu + hata türü + zorluk. Kart bir notun
// içinde yaşar (ekler, takvim, arama not altyapısından gelir) ama tekrar
// takvimi ve sonuçları kendi tablosundadır (notebook_questions /
// question_attempts). Tekrar aralıkları basamaklıdır: 1 → 3 → 7 → 14 → 30 gün.

import type { NoteDoc, NoteNode } from "./noteContent";

/** Not altyapısında soru kartlarını ayıran şablon anahtarı. */
export const QUESTION_TEMPLATE_KEY = "question";

/** Hata türleri sabit bir listedir: serbest metin olsaydı hata haritası çıkarılamazdı. */
export const ERROR_TYPES = {
  concept: { label: "Kavram eksiği", icon: "🧩" },
  method: { label: "Formül / yöntem seçimi", icon: "🧭" },
  calculation: { label: "İşlem hatası", icon: "✏️" },
  reading: { label: "Soruyu yanlış okuma", icon: "👀" },
  time: { label: "Süre baskısı", icon: "⏱️" },
  forgot: { label: "Bilgiyi unutma", icon: "💭" },
} as const;
export type ErrorType = keyof typeof ERROR_TYPES;
export const ERROR_TYPE_KEYS = Object.keys(ERROR_TYPES) as [ErrorType, ...ErrorType[]];

export const DIFFICULTIES = { easy: "Kolay", medium: "Orta", hard: "Zor" } as const;
export type Difficulty = keyof typeof DIFFICULTIES;
export const DIFFICULTY_KEYS = Object.keys(DIFFICULTIES) as [Difficulty, ...Difficulty[]];

export type QuestionStatus = "unsolved" | "learning" | "mastered";
export const QUESTION_STATUS_LABELS: Record<QuestionStatus, string> = { unsolved: "Çözülemedi", learning: "Öğreniliyor", mastered: "Öğrenildi" };

export type AttemptResult = "solved" | "partial" | "failed";
export const ATTEMPT_RESULT_KEYS = ["solved", "partial", "failed"] as const;

/** Tekrar basamakları (gün). Son basamak da çözülünce soru "öğrenildi" olur. */
export const REVIEW_INTERVALS_DAYS = [1, 3, 7, 14, 30] as const;

/** Plan görevi türü: tamamlanınca konu haritasına "Defterim" diye sahte konu yazılmasın diye ayrı tutulur. */
export const NOTEBOOK_REVIEW_TASK_KIND = "Defter Tekrarı";

const DAY_MS = 86_400_000;

/** Tekrar günleri gün başına sabitlenir (sabah 06:00, yerel saat): aynı gün içinde "erken/geç" farkı olmaz. */
export function reviewDateAfter(days: number, now: Date): Date {
  const date = new Date(now);
  date.setHours(6, 0, 0, 0);
  return new Date(date.getTime() + days * DAY_MS);
}

/** Yeni kart: ilk tekrar ertesi gün. */
export const firstReviewAt = (now: Date) => reviewDateAfter(REVIEW_INTERVALS_DAYS[0], now);

/** Bugünün sonuna kadar zamanı gelen kart "tekrar bekliyor"dur. */
export function isReviewDue(nextReviewAt: Date | null, now: Date): boolean {
  if (!nextReviewAt) return false;
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  return nextReviewAt.getTime() <= endOfDay.getTime();
}

export type ReviewState = { reviewStage: number; status: QuestionStatus; nextReviewAt: Date | null };

/**
 * Tekrarda kademeli yardım: önce ipucu, sonra ilk adım, en son tam çözüm.
 * Yalnızca ipucuyla çözmek basamak ilerletir; ilk adımı ya da çözümü gördükten
 * sonra çözmek "kısmen" sayılır.
 */
export const HINT_LEVELS = { none: 0, hint: 1, firstStep: 2, solution: 3 } as const;
export type HintLevel = (typeof HINT_LEVELS)[keyof typeof HINT_LEVELS];
export const HINT_LEVEL_LABELS: Record<number, string> = { 1: "ipucuyla", 2: "ilk adımı görerek", 3: "çözüme bakarak" };

/**
 * Bir "Tekrar çöz" denemesinden sonraki durum.
 * - Çözdüm (çözüme bakmadan, en fazla ipucuyla): bir sonraki basamak; son basamaktaysa öğrenildi.
 * - İlk adımı / çözümü görüp çözdüm ya da kısmen: aynı basamakta kalır, o basamağın aralığı kadar sonra.
 * - Çözemedim: başa döner, ertesi gün.
 */
export function scheduleAfterAttempt(current: { reviewStage: number }, result: AttemptResult, sawSolution: boolean, now: Date, hintLevel = 0): ReviewState {
  const stage = Math.min(Math.max(current.reviewStage, 0), REVIEW_INTERVALS_DAYS.length - 1);
  const helped = sawSolution || hintLevel >= HINT_LEVELS.firstStep;
  const effective: AttemptResult = result === "solved" && helped ? "partial" : result;
  if (effective === "failed") return { reviewStage: 0, status: "unsolved", nextReviewAt: reviewDateAfter(REVIEW_INTERVALS_DAYS[0], now) };
  if (effective === "partial") return { reviewStage: stage, status: "learning", nextReviewAt: reviewDateAfter(REVIEW_INTERVALS_DAYS[stage], now) };
  const next = stage + 1;
  if (next >= REVIEW_INTERVALS_DAYS.length) return { reviewStage: REVIEW_INTERVALS_DAYS.length, status: "mastered", nextReviewAt: null };
  return { reviewStage: next, status: "learning", nextReviewAt: reviewDateAfter(REVIEW_INTERVALS_DAYS[next], now) };
}

/** Tekrar görevi süresi: soru başına ~5 dk, 10–60 dk arası. */
export const reviewTaskMinutes = (questionCount: number) => Math.min(60, Math.max(10, questionCount * 5));

/** Bir tekrar görevine en fazla bu kadar soru konur (görev uygulanabilir kalsın). */
export const MAX_QUESTIONS_PER_REVIEW = 8;

// ---------------------------------------------------------------------------
// Hata haritası
// ---------------------------------------------------------------------------

export type ErrorMapRow = { subject: string | null; topic: string | null; topicId: number | null; errorType: string | null; status: QuestionStatus };
export type ErrorMap = {
  total: number;
  open: number;
  topics: Array<{ key: string; subject: string; topic: string | null; topicId: number | null; count: number; open: number; topErrorType: ErrorType | null }>;
  errorTypes: Array<{ type: ErrorType; count: number }>;
};

const isErrorType = (value: string | null): value is ErrorType => value !== null && value in ERROR_TYPES;

/**
 * Konulara ve hata türlerine göre sayım. "Açık" = henüz öğrenilmemiş soru;
 * sıralama açık soru sayısına göre (öğrenilenler haritayı şişirmesin).
 */
export function buildErrorMap(rows: ErrorMapRow[]): ErrorMap {
  const topics = new Map<string, { subject: string; topic: string | null; topicId: number | null; count: number; open: number; errors: Map<ErrorType, number> }>();
  const errorTypes = new Map<ErrorType, number>();
  for (const row of rows) {
    const subject = row.subject ?? "Genel";
    const key = row.topicId !== null ? `t${row.topicId}` : `s${subject}`;
    const entry = topics.get(key) ?? { subject, topic: row.topicId !== null ? row.topic : null, topicId: row.topicId, count: 0, open: 0, errors: new Map() };
    entry.count += 1;
    if (row.status !== "mastered") entry.open += 1;
    if (isErrorType(row.errorType)) {
      entry.errors.set(row.errorType, (entry.errors.get(row.errorType) ?? 0) + 1);
      errorTypes.set(row.errorType, (errorTypes.get(row.errorType) ?? 0) + 1);
    }
    topics.set(key, entry);
  }
  return {
    total: rows.length,
    open: rows.filter((row) => row.status !== "mastered").length,
    topics: Array.from(topics.entries())
      .map(([key, entry]) => ({ key, subject: entry.subject, topic: entry.topic, topicId: entry.topicId, count: entry.count, open: entry.open, topErrorType: Array.from(entry.errors.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null }))
      .sort((a, b) => b.open - a.open || b.count - a.count),
    errorTypes: Array.from(errorTypes.entries()).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count),
  };
}

/**
 * Plan motoruna giden kısa özet: en çok açık sorusu olan konular. Zayıflık
 * hesabının yerine geçmez; AI plan isteminde ek bir sinyal olarak kullanılır.
 * Davranışı tarif eder, öğrenciyi etiketlemez.
 */
export function describeErrorMapForPlan(map: ErrorMap, limit = 5): string | null {
  const focus = map.topics.filter((item) => item.open > 0).slice(0, limit);
  if (!focus.length) return null;
  return focus
    .map((item) => `${item.subject}${item.topic ? ` / ${item.topic}` : ""}: ${item.open} çözülemeyen soru${item.topErrorType ? ` (en sık işaretlenen hata türü: ${ERROR_TYPES[item.topErrorType].label})` : ""}`)
    .join("\n");
}

// ---------------------------------------------------------------------------
// Kartın not içeriği (arama, liste önizlemesi ve eklerin sahipliği için)
// ---------------------------------------------------------------------------

export type QuestionContent = {
  questionImageId: number | null;
  questionOcrText?: string | null;
  stuckPoint: string | null;
  voiceAttachmentId?: number | null;
  voiceDuration?: number | null;
  solutionImageId: number | null;
  solutionText: string | null;
};

const paragraph = (text: string | null | undefined): NoteNode => (text?.trim() ? { type: "paragraph", content: [{ type: "text", text: text.trim() }] } : { type: "paragraph" });
const heading = (text: string): NoteNode => ({ type: "heading", attrs: { level: 3 }, content: [{ type: "text", text }] });

/** Kart alanlarından not belgesi üretir. Kartın asıl kaynağı tablodaki alanlardır; belge her güncellemede yeniden üretilir. */
export function buildQuestionDoc(input: QuestionContent): NoteDoc {
  const content: NoteNode[] = [];
  if (input.questionImageId) content.push({ type: "noteImage", attrs: { attachmentId: input.questionImageId, ...(input.questionOcrText ? { ocrText: input.questionOcrText } : {}) } });
  content.push(heading("❓ Takıldığım yer"));
  if (input.voiceAttachmentId) content.push({ type: "voiceClip", attrs: { attachmentId: input.voiceAttachmentId, duration: input.voiceDuration ?? 0 } });
  content.push(paragraph(input.stuckPoint));
  content.push(heading("🗣️ Çözüm notum"));
  if (input.solutionImageId) content.push({ type: "noteImage", attrs: { attachmentId: input.solutionImageId } });
  content.push(paragraph(input.solutionText));
  return { type: "doc", content };
}

/** Kart başlığı: "❓ Matematik · Problemler" */
export function questionTitle(subject: string | null, topic: string | null, createdAt: Date): string {
  if (subject || topic) return `❓ ${[subject, topic].filter(Boolean).join(" · ")}`.slice(0, 200);
  return `❓ Soru · ${createdAt.toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}`;
}

// ---------------------------------------------------------------------------
// ✨ Adım adım çöz (AI çözümü)
// ---------------------------------------------------------------------------

/** AI çözümü: her adımda işlem + neden; sonunda sağlama. Cevabı değil yöntemi öğretmek için. */
export type AiSolution = {
  method: string;
  steps: Array<{ work: string; why: string }>;
  answer: string;
  check: string;
  hint: string;
};

const clip = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

/** Kayıtlı ya da AI'dan gelen JSON'u güvenli biçimde AiSolution'a çevirir; adım yoksa null. */
export function parseAiSolution(raw: unknown): AiSolution | null {
  let value = raw;
  if (typeof value === "string") {
    try { value = JSON.parse(value); } catch { return null; }
  }
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const steps = (Array.isArray(input.steps) ? input.steps : [])
    .map((step) => (step && typeof step === "object" ? { work: clip((step as Record<string, unknown>).work, 600), why: clip((step as Record<string, unknown>).why, 600) } : null))
    .filter((step): step is { work: string; why: string } => Boolean(step && (step.work || step.why)))
    .slice(0, 12);
  if (!steps.length) return null;
  return { method: clip(input.method, 400), steps, answer: clip(input.answer, 400), check: clip(input.check, 600), hint: clip(input.hint, 400) };
}

/** "Çözüm notuma ekle": AI çözümünü öğrencinin düzenleyebileceği düz metne çevirir. */
export function aiSolutionToText(solution: AiSolution): string {
  return [
    solution.method && `Yöntem: ${solution.method}`,
    ...solution.steps.map((step, index) => `${index + 1}) ${step.work}${step.why ? ` (${step.why})` : ""}`),
    solution.answer && `Sonuç: ${solution.answer}`,
    solution.check && `Kontrol: ${solution.check}`,
  ].filter(Boolean).join("\n");
}
