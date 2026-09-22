import type { BookType, ExamScope } from "../types";
import { normalizeKeepingTurkish } from "./turkishText";

type Rule = { type: BookType; anyOf: string[] };

// Order matters: combined types (konu anlatımlı + soru bankası) are checked
// before their component types so "TYT Matematik Konu Anlatımlı Soru Bankası"
// doesn't get short-circuited into plain `topic_explanation`.
// Written in natural Turkish spelling and run through the same
// `normalizeKeepingTurkish` the input goes through (see `RULES` below) —
// comparing two differently-normalized strings was a real bug caught by
// this module's own tests (ı/i mismatch: "bankası" vs a hand-typed "bankasi").
const RAW_RULES: Rule[] = [
  { type: "topic_explanation_question_bank", anyOf: ["konu anlatımlı soru bankası", "konu anlatımlı ve soru bankası"] },
  { type: "mock_exam", anyOf: ["deneme", "deneme sınavı", "branş denemesi", "simülasyon"] },
  { type: "past_questions", anyOf: ["çıkmış sorular", "çıkmış soru", "ösym çıkmış"] },
  { type: "camp", anyOf: ["kamp kitabı", "yaz kampı", "kamp"] },
  { type: "fasikul", anyOf: ["fasikül", "fasiküller"] },
  { type: "test_book", anyOf: ["yaprak test", "test kitabı", "test kitapları"] },
  { type: "topic_explanation", anyOf: ["konu anlatımı", "konu anlatımlı", "ders işleme föyü", "özet konu"] },
  { type: "question_bank", anyOf: ["soru bankası", "soru bankaları"] },
  { type: "reference", anyOf: ["başvuru kaynağı", "sözlük", "formüler"] },
];
const RULES: Rule[] = RAW_RULES.map((rule) => ({ type: rule.type, anyOf: rule.anyOf.map(normalizeKeepingTurkish) }));

/** Maps a source's free-text category/format string to the canonical `BookType`
 * enum. Unknown categories fall back to `"other"` instead of guessing. */
export function normalizeBookType(rawCategory: string | undefined | null): BookType {
  if (!rawCategory) return "other";
  const normalized = normalizeKeepingTurkish(rawCategory);
  for (const rule of RULES) {
    if (rule.anyOf.some((phrase) => normalized.includes(phrase))) return rule.type;
  }
  return "other";
}

/** Maps free-text exam labels ("TYT", "AYT", "TYT-AYT", "TYT ve AYT", "YKS")
 * to the canonical `ExamScope` enum. */
export function normalizeExamScope(rawExam: string | undefined | null): ExamScope {
  if (!rawExam) return "GENEL";
  const normalized = normalizeKeepingTurkish(rawExam);
  const hasTyt = /\btyt\b/.test(normalized);
  const hasAyt = /\bayt\b/.test(normalized);
  if (hasTyt && hasAyt) return "TYT_AYT";
  if (hasTyt) return "TYT";
  if (hasAyt) return "AYT";
  if (normalized.includes("yks")) return "YKS";
  return "GENEL";
}
