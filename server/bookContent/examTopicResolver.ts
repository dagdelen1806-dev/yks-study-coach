import { CURRICULUM } from "../../shared/curriculum";
import { EXAM_TOPIC_LINKS, curriculumSubjectsFor, examTopicKey } from "../../shared/examTopicLinks";
import { bookContentConfig } from "./config";
import { matchTopic, type MatchableTopic } from "./curriculumMatcher";
import type { WeakTopicInput } from "./bookStudyAllocation";

const CURRICULUM_SLUGS = new Set(CURRICULUM.map((def) => def.slug));

export type ResolvableTopic = MatchableTopic & { slug: string };

/**
 * Bir konu kaydını (deneme satırı, Konu Haritası girişi ya da doğrudan müfredat
 * konusu) müfredat konusu ID'lerine çevirir:
 *  1. Kaydın kendisi müfredat konusuysa → kendisi.
 *  2. Elle hazırlanmış deneme konusu bağlantısı varsa → bağlı konular (birden fazla olabilir).
 *  3. Yoksa birleşik adı parçalara ayırıp her parçayı eşleştiricide dener;
 *     YALNIZCA yüksek güvenli ("auto") eşleşmeler alınır — belirsiz bir deneme
 *     satırı yanlış konuya zayıflık sinyali taşımasın.
 */
export function resolveToCurriculumTopicIds(
  row: { slug: string; exam: "TYT" | "AYT"; subject: string; topic: string; category?: string | null },
  topics: ResolvableTopic[]
): number[] {
  const idBySlug = new Map(topics.map((topic) => [topic.slug, topic.id]));
  if (CURRICULUM_SLUGS.has(row.slug)) {
    const id = idBySlug.get(row.slug);
    return id === undefined ? [] : [id];
  }

  const linked = EXAM_TOPIC_LINKS.get(examTopicKey(row.topic));
  if (linked) return Array.from(new Set(linked.map((def) => idBySlug.get(def.slug)).filter((id): id is number => id !== undefined)));

  const curriculumTopics = topics.filter((topic) => CURRICULUM_SLUGS.has(topic.slug));
  const subjects = curriculumSubjectsFor(row.subject, row.category);
  // "A (B-C), D" → ["A (B-C), D", "A", "B-C", "D"]: önce bütün, sonra parçalar.
  const parts = [row.topic, ...row.topic.split(/[,()]/).map((part) => part.trim()).filter((part) => part.length >= 4)];
  const ids = new Set<number>();
  for (const part of Array.from(new Set(parts))) {
    for (const subject of subjects) {
      const result = matchTopic(part, curriculumTopics, { subject, exam: row.exam });
      if (result.best && result.tier === "auto") ids.add(result.best.topicId);
    }
    if (part === row.topic && ids.size > 0) break; // Bütün ad net eşleştiyse parçalara gerek yok.
  }
  return Array.from(ids);
}

export type ProgressSignal = { slug: string; exam: "TYT" | "AYT"; subject: string; topic: string; progress: number; insufficientData: boolean; lastReviewedAt: Date | string | null };

const DAY_MS = 86_400_000;

/**
 * Konu kayıtlarından müfredat konusu başına zayıflık (çalışılacak ve tekrar edilecek konular). Aynı müfredat konusuna
 * işaret eden sinyallerden EN GÜNCEL günün ortalaması esas alınır — mevcut
 * sistemdeki gibi (topic_progress son sonucu tutar) yeni performans eskisinin
 * yerine geçer. Böylece kitaptan çalışıp iyi sonuç alan öğrenci, eski deneme
 * sonucu yüzünden aynı konuda öneri almaya devam etmez (geri besleme döngüsü).
 */
export function deriveCurriculumWeakTopics(rows: ProgressSignal[], topics: ResolvableTopic[]): WeakTopicInput[] {
  const topicById = new Map(topics.map((topic) => [topic.id, topic]));
  const signals = new Map<number, { accuracy: number; at: number }[]>();
  for (const row of rows) {
    if (row.insufficientData) continue;
    const at = row.lastReviewedAt ? new Date(row.lastReviewedAt).getTime() : 0;
    for (const id of resolveToCurriculumTopicIds(row, topics)) signals.set(id, [...(signals.get(id) ?? []), { accuracy: row.progress, at }]);
  }

  const weak: WeakTopicInput[] = [];
  for (const [id, list] of Array.from(signals)) {
    const latestDay = Math.floor(Math.max(...list.map((signal) => signal.at)) / DAY_MS);
    const latest = list.filter((signal) => Math.floor(signal.at / DAY_MS) === latestDay);
    const accuracy = Math.round(latest.reduce((sum, signal) => sum + signal.accuracy, 0) / latest.length);
    const topic = topicById.get(id);
    // Zayıf (< %55) konular çalışma, "Orta"nın alt kısmı (< %70) tekrar önerisine girer.
    if (!topic || accuracy >= bookContentConfig.allocation.reviewMaxAccuracy) continue;
    weak.push({ topicId: id, topic: topic.topic, subject: topic.subject, exam: topic.exam, accuracy });
  }
  return weak;
}
