import { MIN_RELIABLE_QUESTION_COUNT } from "./topicStatus";

// "Study Progress Score" (spec PHASE 3 §17-20) — bu bir tıbbi/psikolojik
// değerlendirme DEĞİL, öğrencinin uygulamadaki çalışma davranışından
// türetilen bir gösterge. Subscription/plan bilgisinden TAMAMEN bağımsız —
// yalnızca gerçek çalışma verisi girilir, premium olmak otomatik yüksek
// skor getirmez (bu fonksiyon subscription'ı hiç parametre olarak almaz).
export const PROGRESS_SCORE_CONFIG = {
  weights: { studyConsistency: 0.25, questionPerformance: 0.25, topicProgress: 0.2, mockExam: 0.2, planAdherence: 0.1 },
  // Her alt skorun "yeterli veri" sayılması için asgari örneklem — eşiğin
  // altında sahte/erken bir sayı üretmek yerine "Not enough data" dönülür.
  minAccountAgeDaysForConsistency: 3,
  minQuestionsForPerformance: MIN_RELIABLE_QUESTION_COUNT, // shared/topicStatus.ts ile aynı eşik — tek kaynak
  minTopicsForTopicProgress: 3,
  minExamsForMockExamScore: 1,
  minPlannedSessionsForAdherence: 2, // shared/planAdherence.ts'in kendi "veri_topla" eşiğiyle aynı
} as const;

export type ProgressScoreConfig = typeof PROGRESS_SCORE_CONFIG;
export type ScoreComponentKey = keyof ProgressScoreConfig["weights"];

export type ScoreComponent = { score: number | null; insufficientData: boolean; label: string };

export type ProgressScoreInputs = {
  accountAgeDays: number;
  activeDaysInWindow: number;
  windowDays: number;
  totalQuestions: number;
  correctQuestions: number;
  topicCoveragePercent: number;
  studiedTopicCount: number;
  examCount: number;
  averageExamNet: number | null;
  /** Net'i 0-100 skalasına normalize etmek için kullanılan referans tavan (ör. hedef net) — uydurma aktivite verisi değil, yalnızca ölçek sabiti. */
  referenceNetCeiling: number;
  planAdherenceScore: number | null;
  plannedSessionsCount: number;
};

export type ProgressScoreResult = {
  overallScore: number | null;
  insufficientData: boolean;
  components: Record<ScoreComponentKey, ScoreComponent>;
};

const cap = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export function calculateProgressScore(inputs: ProgressScoreInputs, config: ProgressScoreConfig = PROGRESS_SCORE_CONFIG): ProgressScoreResult {
  const components: Record<ScoreComponentKey, ScoreComponent> = {
    studyConsistency:
      inputs.accountAgeDays < config.minAccountAgeDaysForConsistency
        ? { score: null, insufficientData: true, label: "Çalışma Düzeni" }
        : { score: cap((inputs.activeDaysInWindow / Math.max(1, inputs.windowDays)) * 100), insufficientData: false, label: "Çalışma Düzeni" },
    questionPerformance:
      inputs.totalQuestions < config.minQuestionsForPerformance
        ? { score: null, insufficientData: true, label: "Soru Performansı" }
        : { score: cap((inputs.correctQuestions / inputs.totalQuestions) * 100), insufficientData: false, label: "Soru Performansı" },
    topicProgress:
      inputs.studiedTopicCount < config.minTopicsForTopicProgress
        ? { score: null, insufficientData: true, label: "Konu İlerlemesi" }
        : { score: cap(inputs.topicCoveragePercent), insufficientData: false, label: "Konu İlerlemesi" },
    mockExam:
      inputs.examCount < config.minExamsForMockExamScore || inputs.averageExamNet === null
        ? { score: null, insufficientData: true, label: "Deneme Performansı" }
        : { score: cap((inputs.averageExamNet / Math.max(1, inputs.referenceNetCeiling)) * 100), insufficientData: false, label: "Deneme Performansı" },
    planAdherence:
      inputs.plannedSessionsCount < config.minPlannedSessionsForAdherence || inputs.planAdherenceScore === null
        ? { score: null, insufficientData: true, label: "Plan Uyumu" }
        : { score: cap(inputs.planAdherenceScore), insufficientData: false, label: "Plan Uyumu" },
  };

  const available = (Object.keys(components) as ScoreComponentKey[]).filter((key) => components[key].score !== null);
  if (available.length === 0) return { overallScore: null, insufficientData: true, components };

  const totalWeight = available.reduce((sum, key) => sum + config.weights[key], 0);
  const weightedSum = available.reduce((sum, key) => sum + (components[key].score as number) * config.weights[key], 0);
  const overallScore = totalWeight > 0 ? cap(weightedSum / totalWeight) : null;

  return { overallScore, insufficientData: overallScore === null, components };
}
