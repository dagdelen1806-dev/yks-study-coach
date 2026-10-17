// AI haftalık planının yanıtı istemciye gitmeden önce şekle sokulur. Sağlayıcı katı JSON şemasını
// uygulamadığında (ör. Gemini json_object moduna düştüğünde) alanlar eksik/yanlış tipte gelebilir;
// istemci ve takvime kayıt (calendar.savePlan: summary zorunlu) bunlara güvenir.

type Fallback = { summary: string; focus: unknown[]; days: unknown[]; coachNote: string };
const KINDS = ["Öğrenme", "Soru", "Tekrar", "Deneme analizi"] as const;

const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");
const optionalText = (value: unknown, max: number) => text(value, max) || null;
const positiveInt = (value: unknown, min: number, max: number) => {
  const number = Math.round(Number(value));
  return Number.isFinite(number) && number > 0 ? Math.min(max, Math.max(min, number)) : null;
};

/** Ham AI yanıtını geçerli plana çevirir; kullanılabilir gün/oturum yoksa yedek planı döner. */
export function normalizeAiPlan<T extends Fallback>(raw: unknown, fallback: T): T {
  if (!raw || typeof raw !== "object") return fallback;
  const plan = raw as Record<string, unknown>;
  const days = (Array.isArray(plan.days) ? plan.days : []).slice(0, 7).flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const day = value as Record<string, unknown>;
    const sessions = (Array.isArray(day.sessions) ? day.sessions : []).slice(0, 6).flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const session = item as Record<string, unknown>;
      const subject = text(session.subject, 80);
      const topic = text(session.topic, 180);
      const minutes = positiveInt(session.minutes, 10, 240);
      if (!subject || !topic || !minutes) return [];
      const kind = KINDS.includes(session.kind as (typeof KINDS)[number]) ? (session.kind as string) : "Soru";
      return [{
        title: text(session.title, 180) || `${subject} · ${topic}`,
        subject,
        topic,
        minutes,
        kind,
        rationale: text(session.rationale, 600),
        ...(text(session.bookId, 120) ? { bookId: text(session.bookId, 120) } : {}),
        ...(text(session.bookTitle, 180) ? { bookTitle: text(session.bookTitle, 180) } : {}),
        ...(positiveInt(session.targetQuestions, 1, 500) ? { targetQuestions: positiveInt(session.targetQuestions, 1, 500)! } : {}),
        targetPages: optionalText(session.targetPages, 80),
        targetTests: optionalText(session.targetTests, 80),
      }];
    });
    if (!sessions.length) return [];
    return [{ day: text(day.day, 20), date: text(day.date, 10), totalMinutes: sessions.reduce((sum, session) => sum + session.minutes, 0), sessions }];
  });
  if (!days.length) return fallback;
  const focus = (Array.isArray(plan.focus) ? plan.focus : []).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const entry = item as Record<string, unknown>;
    return text(entry.topic, 180) && text(entry.subject, 80) ? [{ topic: text(entry.topic, 180), subject: text(entry.subject, 80), reason: text(entry.reason, 400) }] : [];
  });
  return {
    ...fallback,
    summary: text(plan.summary, 2000) || fallback.summary,
    focus,
    days,
    coachNote: text(plan.coachNote, 1000) || fallback.coachNote,
  };
}
