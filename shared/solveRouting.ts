import type { Difficulty } from "./questionNotebook";
import type { ExamKind } from "./exams";

/**
 * Soru çözümünde model kademesi: kolay sözel soruyu hafif model, zor sayısal soruyu güçlü
 * model çözer. Ayrı bir "zorluk tahmini" AI çağrısı yapılmaz; kartta zaten olan sinyaller
 * (✨ Öner'in doldurduğu / öğrencinin seçtiği zorluk, ders, TYT/AYT, son deneme) kullanılır.
 */
export const MODEL_TIERS = ["light", "medium", "strong"] as const;
export type ModelTier = (typeof MODEL_TIERS)[number];

export type SolveSignals = {
  difficulty: Difficulty | null;
  subject: string | null;
  exam: ExamKind | null;
  lastResult: "solved" | "partial" | "failed" | null;
  /** Öğrenci "daha güçlü modelle çöz" dedi. */
  escalate?: boolean;
};

const NUMERIC_SUBJECT = /matematik|geometri|fizik|kimya/;
export const isNumericSubject = (subject: string | null) => NUMERIC_SUBJECT.test((subject ?? "").toLocaleLowerCase("tr-TR"));

export function chooseSolveTier(signals: SolveSignals): ModelTier {
  if (signals.escalate) return "strong";
  const numeric = isNumericSubject(signals.subject);
  let score = signals.difficulty === "easy" ? 0 : signals.difficulty === "hard" ? 2 : 1;
  if (numeric) score += 1;
  if (numeric && signals.exam === "AYT") score += 1;
  if (signals.lastResult === "failed") score += 1;
  if (score >= 3) return "strong";
  // Sayısal soruda hafif modelin hesap hatası güveni sarsar: sayısal ders hiçbir zaman hafif kademeye düşmez.
  if (score === 0 && !numeric) return "light";
  return "medium";
}

export const nextTier = (tier: ModelTier): ModelTier | null => (tier === "light" ? "medium" : tier === "medium" ? "strong" : null);

/** Benzer soruda cevap anahtarı doğru olmalı: en az orta kademe. */
export const atLeastMedium = (tier: ModelTier): ModelTier => (tier === "light" ? "medium" : tier);

/** Kartta saklanan etiket ("strong:gemini-…") → kademe; eski kayıtlarda null. */
export function tierOfTag(tag: string | null | undefined): ModelTier | null {
  const tier = tag?.split(":")[0];
  return MODEL_TIERS.includes(tier as ModelTier) ? (tier as ModelTier) : null;
}
