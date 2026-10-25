import type { ExamTrack } from "./exams";

/**
 * Emek Bahçem: öğrencinin gerçek akademik emeğinin görseli. Veri yeniden girilmez; mevcut kayıtlardan gelir
 * (gece okuması → sayfa, paragraf pratiği ve paragraf soruları, konu çalışma kayıtlarındaki günlük süre).
 * Kitap okudukça ağaç yapraklanır, paragraf çözdükçe çiçek açar, düzenli çalıştıkça bahçe büyür. Ulaşılan
 * aşama geri gitmez (sunucu en yüksek aşamayı saklar). Niyet Kavanozum'dan ayrıdır: kavanoz verilen sözleri,
 * bahçe yapılan çalışmayı gösterir.
 */

export const GARDEN_STAGES = [
  { stage: 1, label: "Küçük filiz" },
  { stage: 2, label: "İlk yapraklar" },
  { stage: 3, label: "Genç fidan" },
  { stage: 4, label: "Büyüyen ağaç" },
  { stage: 5, label: "Çiçek açan ağaç" },
  { stage: 6, label: "Gelişmiş bahçe" },
] as const;
export type GardenStage = (typeof GARDEN_STAGES)[number]["stage"];

export type GardenInputs = {
  readingPages: number;
  readingSessions: number;
  finishedBooks: number;
  paragraphSessions: number;
  paragraphQuestions: number;
  /** Gün başına toplam çalışma dakikası (yalnızca çalışılan günler). */
  dailyMinutes: number[];
  /** Son 7 günde çalışılan gün sayısı (yalnızca bilgi; aşamayı düşürmez). */
  activeDaysLast7: number;
};

export type GardenProfile = { examTrack: ExamTrack; dailyStudyDuration: number | null };

/** Görsel ton: LGS (13–14 yaş) oyunsu, YKS genç, yetişkin sınavları sade. */
export type GardenTheme = "playful" | "youth" | "calm";
export const gardenThemeFor = (track: ExamTrack): GardenTheme => (track === "LGS" ? "playful" : track === "YKS" ? "youth" : "calm");

const BASE_THRESHOLDS = [0, 40, 150, 400, 800, 1500];
const DEFAULT_GOAL_MINUTES = 120;

/**
 * Aşama eşikleri yaşa göre uyarlanır (LGS'de %25 daha kısa yol). Günlük hedef ise puanı ölçekler: hedefini
 * tutturduğun gün tam puan; böylece günde 1 saat hedefleyen öğrenci 4 saat hedefleyenle aynı hızda büyür.
 */
export const stageThresholds = (profile: GardenProfile) => BASE_THRESHOLDS.map((value) => Math.round(value * (profile.examTrack === "LGS" ? 0.75 : 1)));

export function gardenPoints(inputs: GardenInputs, profile: GardenProfile) {
  const goal = Math.max(20, profile.dailyStudyDuration || DEFAULT_GOAL_MINUTES);
  const study = inputs.dailyMinutes.reduce((sum, minutes) => sum + Math.min(1, Math.max(0, minutes) / goal) * 10, 0);
  const reading = inputs.readingPages / 5 + inputs.finishedBooks * 10;
  const paragraph = inputs.paragraphSessions * 2 + inputs.paragraphQuestions / 5;
  return { study: Math.floor(study), reading: Math.floor(reading), paragraph: Math.floor(paragraph), total: Math.floor(study + reading + paragraph) };
}

export function computeGarden(inputs: GardenInputs, profile: GardenProfile, storedHighestStage = 1) {
  const points = gardenPoints(inputs, profile);
  const thresholds = stageThresholds(profile);
  const earned = thresholds.reduce((stage, threshold, index) => (points.total >= threshold ? index + 1 : stage), 1);
  const stage = Math.min(6, Math.max(earned, storedHighestStage)) as GardenStage;
  const nextThreshold = stage < 6 ? thresholds[stage] : null;
  const previous = thresholds[stage - 1];
  return {
    stage,
    label: GARDEN_STAGES[stage - 1].label,
    points,
    nextThreshold,
    nextLabel: stage < 6 ? (GARDEN_STAGES as readonly { label: string }[])[stage].label : null,
    progressToNext: nextThreshold === null ? 1 : Math.min(1, Math.max(0, (points.total - previous) / (nextThreshold - previous))),
    /** Yaprak: her 10 sayfa okuma bir yaprak (görselde en çok 90). */
    leaves: Math.min(90, Math.floor(inputs.readingPages / 10)),
    /** Çiçek: her paragraf pratiği ve her 10 paragraf sorusu bir çiçek (görselde en çok 40). */
    flowers: Math.min(40, inputs.paragraphSessions + Math.floor(inputs.paragraphQuestions / 10)),
    /** Bitirilen kitap: ağaçta meyve (en çok 12). */
    fruits: Math.min(12, inputs.finishedBooks),
    theme: gardenThemeFor(profile.examTrack),
    activeDaysLast7: inputs.activeDaysLast7,
    studyDays: inputs.dailyMinutes.length,
  };
}

export type GardenView = ReturnType<typeof computeGarden>;
