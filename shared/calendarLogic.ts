export type OverdueSession = { id: number; sessionDate: Date };

export type RescheduleInstruction = {
  id: number;
  sessionDate: Date;
  rescheduledFrom: Date;
  rescheduledAt: Date;
};

/**
 * "planned" durumundaki, tarihi bugünden önce olan oturumları yarına taşımak için
 * gereken güncelleme listesini üretir. Aynı çağrıda her oturum yalnızca bir kez taşınır
 * (kopyalanmaz); zaten bugün veya sonrasına ait oturumlara dokunulmaz. Taşınan oturum
 * günün aynı saatini korur (16:40'taki oturum yarın 16:40'a; gece yarısına değil).
 */
export function rescheduleOverdueSessions(sessions: OverdueSession[], today: Date, tomorrow: Date, now: Date): RescheduleInstruction[] {
  return sessions
    .filter((session) => session.sessionDate < today)
    .map((session) => {
      const sessionDate = new Date(tomorrow);
      sessionDate.setHours(session.sessionDate.getHours(), session.sessionDate.getMinutes(), 0, 0);
      return { id: session.id, sessionDate, rescheduledFrom: session.sessionDate, rescheduledAt: now };
    });
}

export type CompletionInput = {
  actualMinutes: number;
  actualQuestions: number;
  correct: number;
  wrong: number;
  blank: number;
  // Yalnızca "Kitap Okuma" türündeki gece okuma oturumlarında dolu — diğer
  // oturum türlerinde undefined kalır.
  actualPages?: number;
  note?: string;
};

export type ExistingSession = {
  id: number;
  subject: string;
  topic: string;
};

export type SessionCompletionPlan = {
  sessionUpdate: { status: "completed"; completedAt: Date } & CompletionInput;
  topicLog: { sessionId: number; subject: string; topic: string; studyDate: Date } & CompletionInput;
};

/** Bir oturum tamamlandığında hem oturum güncellemesini hem de konu gelişim günlüğü kaydını üretir. */
export function buildSessionCompletion(session: ExistingSession, input: CompletionInput, completedAt: Date): SessionCompletionPlan {
  return {
    sessionUpdate: { status: "completed", completedAt, ...input },
    topicLog: { sessionId: session.id, subject: session.subject, topic: session.topic, studyDate: completedAt, ...input },
  };
}
