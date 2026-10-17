// AI haftalık planının yanıtı istemciye gitmeden önce şekle sokulur. Sağlayıcı katı JSON şemasını
// uygulamadığında (ör. Gemini json_object moduna düştüğünde) alanlar eksik, yanlış tipte ya da farklı
// adlarla (activities/duration/coachNotes...) gelebilir; istemci ve takvime kayıt (calendar.savePlan:
// summary zorunlu) bunlara güvenir.

type Fallback = { summary: string; focus: unknown[]; days: unknown[]; coachNote: string };
type Obj = Record<string, unknown>;
const KINDS = ["Öğrenme", "Soru", "Tekrar", "Deneme analizi"] as const;

const isObj = (value: unknown): value is Obj => Boolean(value) && typeof value === "object" && !Array.isArray(value);
/** İlk dolu alan: modelin şemadaki adı yerine kullandığı yaygın eş anlamlılar da kabul edilir. */
const pick = (source: Obj, keys: string[]) => { for (const key of keys) if (source[key] !== undefined && source[key] !== null && source[key] !== "") return source[key]; return undefined; };
const text = (value: unknown, max: number): string => {
  if (typeof value === "string") return value.trim().slice(0, max);
  if (Array.isArray(value)) return value.filter((item) => typeof item === "string").join(" ").trim().slice(0, max);
  return "";
};
const optionalText = (value: unknown, max: number) => text(value, max) || null;
const positiveInt = (value: unknown, min: number, max: number) => {
  const number = Math.round(typeof value === "string" ? Number.parseInt(value, 10) : Number(value));
  return Number.isFinite(number) && number > 0 ? Math.min(max, Math.max(min, number)) : null;
};
const kindOf = (value: unknown) => {
  const raw = text(value, 40).toLocaleLowerCase("tr-TR");
  if (KINDS.includes(text(value, 40) as (typeof KINDS)[number])) return text(value, 40);
  if (raw.includes("öğren") || raw.includes("konu anlat")) return "Öğrenme";
  if (raw.includes("tekrar")) return "Tekrar";
  if (raw.includes("deneme")) return "Deneme analizi";
  return "Soru";
};

const SESSION_LIST_KEYS = ["sessions", "activities", "tasks", "items", "blocks", "oturumlar"];
const DAY_LIST_KEYS = ["days", "weeklyPlan", "plan", "schedule", "gunler"];

/** Ham AI yanıtını geçerli plana çevirir; kullanılabilir gün/oturum yoksa yedek planı döner. */
export function normalizeAiPlan<T extends Fallback>(raw: unknown, fallback: T): T {
  if (!isObj(raw)) return fallback;
  const dayList = pick(raw, DAY_LIST_KEYS);
  const days = (Array.isArray(dayList) ? dayList : []).slice(0, 7).flatMap((value) => {
    if (!isObj(value)) return [];
    const sessionList = pick(value, SESSION_LIST_KEYS);
    const sessions = (Array.isArray(sessionList) ? sessionList : []).slice(0, 6).flatMap((item) => {
      if (!isObj(item)) return [];
      const subject = text(pick(item, ["subject", "ders", "lesson", "course"]), 80);
      const topic = text(pick(item, ["topic", "konu", "unit"]), 180) || text(pick(item, ["title", "name"]), 180);
      const minutes = positiveInt(pick(item, ["minutes", "duration", "durationMinutes", "plannedMinutes", "dakika", "sure"]), 10, 240);
      if (!subject || !topic || !minutes) return [];
      const targetQuestions = positiveInt(pick(item, ["targetQuestions", "questionCount", "questions"]), 1, 500);
      return [{
        title: text(pick(item, ["title", "name", "activity", "task"]), 180) || `${subject} · ${topic}`,
        subject,
        topic,
        minutes,
        kind: kindOf(pick(item, ["kind", "type", "tur", "category"])),
        rationale: text(pick(item, ["rationale", "reason", "description", "note", "aciklama"]), 600),
        ...(text(item.bookId, 120) ? { bookId: text(item.bookId, 120) } : {}),
        ...(text(item.bookTitle, 180) ? { bookTitle: text(item.bookTitle, 180) } : {}),
        ...(targetQuestions ? { targetQuestions } : {}),
        targetPages: optionalText(item.targetPages, 80),
        targetTests: optionalText(item.targetTests, 80),
      }];
    });
    if (!sessions.length) return [];
    return [{ day: text(pick(value, ["day", "dayName", "gun", "name"]), 20), date: text(pick(value, ["date", "tarih"]), 10), totalMinutes: sessions.reduce((sum, session) => sum + session.minutes, 0), sessions }];
  });
  if (!days.length) return fallback;
  const focusList = pick(raw, ["focus", "priorities", "focusTopics"]);
  const focus = (Array.isArray(focusList) ? focusList : []).flatMap((item) => {
    if (!isObj(item)) return [];
    const topic = text(pick(item, ["topic", "konu"]), 180);
    const subject = text(pick(item, ["subject", "ders"]), 80);
    return topic && subject ? [{ topic, subject, reason: text(pick(item, ["reason", "rationale", "neden"]), 400) }] : [];
  });
  return {
    ...fallback,
    summary: text(pick(raw, ["summary", "weeklyGoal", "overview", "ozet"]), 2000) || fallback.summary,
    focus,
    days,
    coachNote: text(pick(raw, ["coachNote", "coachNotes", "notes", "tips"]), 1000) || fallback.coachNote,
  };
}
