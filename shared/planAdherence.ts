export type AdherenceSession = {
  status?: "planned" | "completed" | "skipped";
  plannedMinutes: number;
  actualMinutes?: number | null;
  targetQuestions?: number | null;
  actualQuestions?: number | null;
  sessionDate: string | Date;
  rescheduledFrom?: string | Date | null;
};

export type AdherenceDecision = "planı_küçült" | "yöntemi_değiştir" | "seviyeyi_artır" | "ritmi_koru" | "veri_topla";

export type AdherenceResult = {
  overallScore: number;
  sessionScore: number;
  timeScore: number;
  questionScore: number;
  punctualityScore: number;
  plannedSessions: number;
  completedSessions: number;
  plannedMinutes: number;
  actualMinutes: number;
  targetQuestions: number;
  actualQuestions: number;
  rescheduledSessions: number;
  decision: AdherenceDecision;
  summary: string;
  alerts: Array<{ level: "info" | "success" | "warning" | "action"; ruleKey: string; title: string; message: string; actionLabel: string }>;
};

const cap = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

/** Aynı kural için (ruleKey) daha önce üretilmiş bir uyarı varsa, tekrar oluşturma. */
export function dedupeAlerts<T extends { ruleKey: string }>(alerts: T[], existingRuleKeys: Iterable<string>): T[] {
  const known = new Set(existingRuleKeys);
  return alerts.filter((alert) => !known.has(alert.ruleKey));
}

export function calculatePlanAdherence(sessions: AdherenceSession[], averageAccuracy = 0): AdherenceResult {
  const plannedSessions = sessions.length;
  const completed = sessions.filter((session) => session.status === "completed");
  const completedSessions = completed.length;
  const plannedMinutes = sessions.reduce((sum, session) => sum + Math.max(0, session.plannedMinutes || 0), 0);
  const actualMinutes = completed.reduce((sum, session) => sum + Math.max(0, session.actualMinutes ?? 0), 0);
  const targetQuestions = sessions.reduce((sum, session) => sum + Math.max(0, session.targetQuestions ?? 0), 0);
  const actualQuestions = completed.reduce((sum, session) => sum + Math.max(0, session.actualQuestions ?? 0), 0);
  const rescheduledSessions = sessions.filter((session) => Boolean(session.rescheduledFrom)).length;
  const sessionScore = plannedSessions ? cap((completedSessions / plannedSessions) * 100) : 0;
  const timeScore = plannedMinutes ? cap((actualMinutes / plannedMinutes) * 100) : 0;
  const questionScore = targetQuestions ? cap((actualQuestions / targetQuestions) * 100) : 0;
  const punctualityScore = plannedSessions ? cap(((plannedSessions - rescheduledSessions) / plannedSessions) * 100) : 0;
  const overallScore = plannedSessions ? cap(sessionScore * 0.35 + timeScore * 0.25 + questionScore * 0.25 + punctualityScore * 0.15) : 0;

  let decision: AdherenceDecision = "veri_topla";
  if (plannedSessions < 2) decision = "veri_topla";
  else if (overallScore < 55) decision = "planı_küçült";
  else if (overallScore >= 80 && averageAccuracy >= 85) decision = "seviyeyi_artır";
  else if (timeScore >= 75 && averageAccuracy < 55) decision = "yöntemi_değiştir";
  else decision = "ritmi_koru";

  const alerts: AdherenceResult["alerts"] = [];
  if (plannedSessions < 2) alerts.push({ level: "info", ruleKey: "no_plan_data", title: "Önce ritmini kaydedelim", message: "Bu dönem için yeterli plan verisi yok. En az iki oturum tamamla; koçun daha güvenilir öneriler versin.", actionLabel: "İlk oturumu başlat" });
  if (overallScore < 55 && plannedSessions >= 2) alerts.push({ level: "warning", ruleKey: "low_adherence", title: "Planı küçültelim", message: `Plan uyumun %${overallScore}. Önümüzdeki üç gün için oturumları %25 kısaltıp tek ana konuya odaklanalım.`, actionLabel: "Planı hafiflet" });
  if (rescheduledSessions >= 2) alerts.push({ level: "action", ruleKey: "repeated_reschedule", title: "Erteleme paterni oluşuyor", message: `${rescheduledSessions} oturum ertelendi. Günlük oturum sayısını azaltıp ilk oturumu günün daha erken saatine taşıyalım.`, actionLabel: "Takvimi düzenle" });
  if (timeScore >= 75 && averageAccuracy < 55 && plannedSessions >= 2) alerts.push({ level: "warning", ruleKey: "low_accuracy_high_time", title: "Çalışma yöntemini değiştirelim", message: "Süreyi koruyorsun; ancak doğruluk düşük. Bir sonraki oturuma kısa konu tekrarı ve daha kolay test ekleyelim.", actionLabel: "Tekrar oturumu ekle" });
  if (overallScore >= 80 && averageAccuracy >= 85) alerts.push({ level: "success", ruleKey: "ready_for_next_level", title: "Bir üst seviyeye hazırsın", message: "Plan uyumun ve doğruluğun güçlü. En iyi giden konularda bir üst seviye kaynağa geçebiliriz.", actionLabel: "Kaynak önerilerini aç" });
  if (!alerts.length) alerts.push({ level: "success", ruleKey: "keep_rhythm", title: "Ritmini koru", message: `Plan uyumun %${overallScore}. Küçük ama düzenli oturumlarla aynı çizgiyi sürdür.`, actionLabel: "Bugünkü plana devam et" });

  const summary = decision === "planı_küçült" ? "Uygulanabilirliği artırmak için planı hafiflet." : decision === "yöntemi_değiştir" ? "Süre korunuyor; konu çalışma yöntemini değiştir." : decision === "seviyeyi_artır" ? "Uyum ve doğruluk güçlü; uygun konularda seviyeyi artır." : decision === "ritmi_koru" ? "Planı büyük değişiklik yapmadan sürdür." : "Daha güvenilir karar için birkaç oturum daha kaydet.";
  return { overallScore, sessionScore, timeScore, questionScore, punctualityScore, plannedSessions, completedSessions, plannedMinutes, actualMinutes, targetQuestions, actualQuestions, rescheduledSessions, decision, summary, alerts };
}
