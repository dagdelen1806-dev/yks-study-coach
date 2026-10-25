import { CURRICULUM } from "./curriculum";
import { subjectNamesOf, type ExamKind } from "./exams";
import type { ExamTopicResult } from "./yksData";

/**
 * Müfredat tabanlı deneme şablonu (formRows: "curriculum" olan oturumlar; bugün LGS): o oturumun
 * müfredat konuları, ders sırası shared/exams.ts'teki sırayla. Konu başına soru sayısı (S)
 * yayınevine göre değiştiği için uydurulmaz — 0 başlar, öğrenci kendi denemesinden girer;
 * S'si 0 kalan satır kaydedilmez.
 */
export type CurriculumRow = { exam: ExamKind; subject: string; unit: string; topic: string };

/** `rows`: sunucudaki canlı liste (topics.curriculum — Yönetim Paneli düzenlemeleriyle); yoksa koddaki müfredat. */
export function buildCurriculumTemplateTopicDetails(kind: ExamKind, rows: readonly CurriculumRow[] = CURRICULUM): ExamTopicResult[] {
  const order = subjectNamesOf(kind);
  return rows.filter((def) => def.exam === kind)
    .sort((a, b) => order.indexOf(a.subject) - order.indexOf(b.subject))
    .map((def) => ({ subject: def.subject, category: def.unit, topic: def.topic, questionCount: 0, correct: 0, wrong: 0, blank: 0, accuracy: 0, net: 0 }));
}

/** LGS denemesi şablonu (bkz. buildCurriculumTemplateTopicDetails). */
export const buildLgsTemplateTopicDetails = (): ExamTopicResult[] => buildCurriculumTemplateTopicDetails("LGS");
