import { and, eq, gte } from "drizzle-orm";
import { getDb, getPlanAdherenceInputs } from "../db";
import { topicProgress, topicStudyLogs, userMockExams, users } from "../../drizzle/schema";
import { calculatePlanAdherence } from "../../shared/planAdherence";
import { calculateProgressScore, type ProgressScoreResult } from "../../shared/progressScore";
import { targetNet } from "../../shared/yksData";

const CONSISTENCY_WINDOW_DAYS = 7;
const ADHERENCE_WINDOW_DAYS = 30;

/**
 * "Study Progress Score" — subscription'dan TAMAMEN bağımsız (spec §17/§49:
 * "Premium kullanıcı otomatik olarak yüksek skor almamalı"). Yalnızca
 * gerçek çalışma verisinden (topic_study_logs, topic_progress,
 * user_mock_exams) ve mevcut, zaten test edilmiş Plan Uyum Merkezi
 * algoritmasından (shared/planAdherence.ts — burada YENİDEN YAZILMADI,
 * doğrudan çağrıldı) türetilir.
 */
export async function getStudyProgressScore(userId: number): Promise<ProgressScoreResult & { generatedAt: string }> {
  const db = await getDb();
  const generatedAt = new Date().toISOString();
  if (!db) return { overallScore: null, insufficientData: true, components: emptyComponents(), generatedAt };

  const [userRow] = await db.select({ createdAt: users.createdAt }).from(users).where(eq(users.id, userId)).limit(1);
  const accountAgeDays = userRow ? Math.max(0, Math.floor((Date.now() - userRow.createdAt.getTime()) / 86_400_000)) : 0;

  const windowStart = new Date(Date.now() - CONSISTENCY_WINDOW_DAYS * 86_400_000);
  const [recentLogs, allLogs, topicRows, examRows] = await Promise.all([
    db.select({ studyDate: topicStudyLogs.studyDate }).from(topicStudyLogs).where(and(eq(topicStudyLogs.userId, userId), gte(topicStudyLogs.studyDate, windowStart))),
    db.select({ questions: topicStudyLogs.questions, correct: topicStudyLogs.correct }).from(topicStudyLogs).where(eq(topicStudyLogs.userId, userId)),
    db.select({ progress: topicProgress.progress }).from(topicProgress).where(eq(topicProgress.userId, userId)),
    db.select({ net: userMockExams.net }).from(userMockExams).where(eq(userMockExams.userId, userId)),
  ]);

  const activeDaysInWindow = new Set(recentLogs.map((row) => row.studyDate.toISOString().slice(0, 10))).size;
  const totalQuestions = allLogs.reduce((sum, row) => sum + row.questions, 0);
  const correctQuestions = allLogs.reduce((sum, row) => sum + row.correct, 0);
  const studiedTopicCount = topicRows.length;
  const topicCoveragePercent = topicRows.length ? Math.round(topicRows.reduce((sum, row) => sum + row.progress, 0) / topicRows.length) : 0;
  const examCount = examRows.length;
  const averageExamNet = examCount ? examRows.reduce((sum, row) => sum + Number(row.net), 0) / examCount : null;

  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - ADHERENCE_WINDOW_DAYS * 86_400_000);
  const { sessions, averageAccuracy } = await getPlanAdherenceInputs(userId, periodStart, periodEnd);
  const adherence = calculatePlanAdherence(sessions, averageAccuracy);

  const result = calculateProgressScore({
    accountAgeDays,
    activeDaysInWindow,
    windowDays: CONSISTENCY_WINDOW_DAYS,
    totalQuestions,
    correctQuestions,
    topicCoveragePercent,
    studiedTopicCount,
    examCount,
    averageExamNet,
    referenceNetCeiling: targetNet,
    planAdherenceScore: adherence.plannedSessions > 0 ? adherence.overallScore : null,
    plannedSessionsCount: adherence.plannedSessions,
  });

  return { ...result, generatedAt };
}

function emptyComponents(): ProgressScoreResult["components"] {
  const insufficient = { score: null, insufficientData: true } as const;
  return {
    studyConsistency: { ...insufficient, label: "Çalışma Düzeni" },
    questionPerformance: { ...insufficient, label: "Soru Performansı" },
    topicProgress: { ...insufficient, label: "Konu İlerlemesi" },
    mockExam: { ...insufficient, label: "Deneme Performansı" },
    planAdherence: { ...insufficient, label: "Plan Uyumu" },
  };
}
