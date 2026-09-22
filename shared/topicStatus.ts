import type { TopicStatus } from "./yksData";

/** Başlangıç karar eşikleri: %55 altı Zayıf, %55–84 Orta, %85+ İyi. */
export const TOPIC_STATUS_THRESHOLDS = { weak: 55, good: 85 } as const;

/** Bu sayının altında soru hacmi olan konularda kesin durum kararı güvenilmez sayılır. */
export const MIN_RELIABLE_QUESTION_COUNT = 8;

export type TopicStatusResult = {
  status: TopicStatus;
  /** Soru hacmi eşiğin altındaysa true; arayüz "veri yetersiz" rozeti göstermeli. */
  insufficientData: boolean;
};

export function deriveTopicStatus(accuracy: number, questionCount: number): TopicStatusResult {
  const clamped = Math.max(0, Math.min(100, accuracy));
  const status: TopicStatus =
    clamped < TOPIC_STATUS_THRESHOLDS.weak ? "Zayıf" : clamped < TOPIC_STATUS_THRESHOLDS.good ? "Orta" : "İyi";
  return { status, insufficientData: questionCount < MIN_RELIABLE_QUESTION_COUNT };
}
