import { CURRICULUM } from "./curriculum";
import { subjectNamesOf } from "./exams";
import type { ExamTopicResult } from "./yksData";

/**
 * LGS denemesi konu şablonu: 8. sınıf müfredatındaki konular, ders sırası LGS oturum
 * sırasıyla (shared/exams.ts). Konu başına soru sayısı (S) yayınevine göre değiştiği için
 * uydurulmaz — 0 başlar, öğrenci kendi denemesinden girer; S'si 0 kalan satır kaydedilmez.
 */
export function buildLgsTemplateTopicDetails(): ExamTopicResult[] {
  const order = subjectNamesOf("LGS");
  return CURRICULUM.filter((def) => def.exam === "LGS")
    .sort((a, b) => order.indexOf(a.subject) - order.indexOf(b.subject))
    .map((def) => ({ subject: def.subject, category: def.unit, topic: def.topic, questionCount: 0, correct: 0, wrong: 0, blank: 0, accuracy: 0, net: 0 }));
}
