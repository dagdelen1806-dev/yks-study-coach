export type WeakTopicInput = { subject: string; topic: string; progress: number };
export type LibraryBookInput = { subject: string; title: string };

export type GeneratedFocusSession = {
  title: string;
  subject: string;
  topic: string;
  kind: "Odak";
  plannedMinutes: number;
  /** ISO datetime — yalnızca `generateDailyFocusPlan`'a bir `scheduleStart` verildiyse dolu olur. */
  startsAt?: string;
  endsAt?: string;
};

export const FOCUS_SESSION_MINUTES = 40;
/** İki odak bloğu arasındaki mola süresi — gerçek saat dilimleri buna göre ilerler (16:00–16:40, 16:50–17:30...). */
export const FOCUS_BREAK_MINUTES = 10;

/**
 * Bugünün Pusula Odak planını üretir: günlük çalışma süresini (örn. 320 dk)
 * `FOCUS_SESSION_MINUTES` dakikalık bloklara böler ve her bloğa öğrencinin en
 * zayıf konusundan başlayarak (progress artan sırayla) bir konu atar; konular
 * tükenirse baştan döner. Hiç zayıf/orta konu kaydı yoksa (yeni kullanıcı),
 * elindeki kitapların derslerinden aynı şekilde döngüyle üretir. İkisi de
 * boşsa (hiçbir veri yok) boş dizi döner — sahte konu UYDURULMAZ.
 *
 * `scheduleStart` verilirse (öğrencinin onboarding'de belirttiği "genelde
 * saat kaçta başlarsın" tercihi), her blok gerçek bir saat dilimi alır —
 * `FOCUS_BREAK_MINUTES` aralarla art arda dizilir — ki Takvim ve Pusula Odak
 * "şu an hangi konu hazır" bilgisini gerçek saatten türetebilsin.
 */
export function generateDailyFocusPlan(
  dailyStudyMinutes: number,
  weakTopics: WeakTopicInput[],
  libraryBooks: LibraryBookInput[],
  scheduleStart?: { date: Date; startTime: string }
): GeneratedFocusSession[] {
  const sessionCount = Math.max(1, Math.round(dailyStudyMinutes / FOCUS_SESSION_MINUTES));
  const sortedWeakTopics = [...weakTopics].sort((a, b) => a.progress - b.progress);
  const pool: Array<{ subject: string; topic: string }> =
    sortedWeakTopics.length > 0
      ? sortedWeakTopics.map((item) => ({ subject: item.subject, topic: item.topic }))
      : libraryBooks.map((book) => ({ subject: book.subject, topic: book.title }));
  if (pool.length === 0) return [];

  const dayStart = (() => {
    if (!scheduleStart) return null;
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(scheduleStart.startTime);
    if (!match) return null;
    const start = new Date(scheduleStart.date);
    start.setHours(Number(match[1]), Number(match[2]), 0, 0);
    return start;
  })();

  return Array.from({ length: sessionCount }, (_, index) => {
    const item = pool[index % pool.length];
    const session: GeneratedFocusSession = { title: `${item.subject} · ${item.topic}`, subject: item.subject, topic: item.topic, kind: "Odak", plannedMinutes: FOCUS_SESSION_MINUTES };
    if (dayStart) {
      const offsetMinutes = index * (FOCUS_SESSION_MINUTES + FOCUS_BREAK_MINUTES);
      const startsAt = new Date(dayStart.getTime() + offsetMinutes * 60000);
      const endsAt = new Date(startsAt.getTime() + FOCUS_SESSION_MINUTES * 60000);
      session.startsAt = startsAt.toISOString();
      session.endsAt = endsAt.toISOString();
    }
    return session;
  });
}

export type TimedSession = { id: number | string; sessionDate: string | Date; plannedMinutes: number; status?: string };

/**
 * Bugünün planlı (tamamlanmamış) oturumları arasından, saat penceresi
 * (sessionDate → sessionDate+plannedMinutes) şu anı kapsayan oturumu "şu an"
 * ve ondan sonraki en yakın oturumu "sırada" olarak döner — Takvim ve Pusula
 * Odak'ın "hangi konu öğrenciye hazır sunulmalı" göstergesi buradan gelir.
 */
export function findCurrentAndNextSession<T extends TimedSession>(sessions: T[], now: Date): { current: T | null; next: T | null } {
  const nowMs = now.getTime();
  const windows = sessions
    .filter((session) => session.status !== "completed" && session.status !== "skipped")
    .map((session) => {
      const start = new Date(session.sessionDate).getTime();
      return { session, start, end: start + session.plannedMinutes * 60000 };
    })
    .sort((a, b) => a.start - b.start);
  const current = windows.find((item) => nowMs >= item.start && nowMs < item.end)?.session ?? null;
  const next = windows.find((item) => item.start > nowMs)?.session ?? null;
  return { current, next };
}

export type SubjectTopicMap = Record<string, string[]>;

/**
 * `{subject, topic}` çiftlerinden ders → konu listesi haritası kurar.
 * Pusula Odak'taki Ders/Konu açılır listelerinin birbirine eşlenmiş kalması
 * (örn. "Matematik" seçiliyken "Hücre bölünmeleri" gibi başka derse ait bir
 * konunun listede görünmemesi) buradaki tek bir yapıya bağlı — iki bağımsız
 * düz liste tutulursa iki listenin çakışması garanti edilemez.
 */
export function buildSubjectTopicMap(entries: Array<{ subject: string; topic: string }>): SubjectTopicMap {
  const map: SubjectTopicMap = {};
  for (const entry of entries) {
    if (!entry.subject || !entry.topic) continue;
    const topics = map[entry.subject] ?? (map[entry.subject] = []);
    if (!topics.includes(entry.topic)) topics.push(entry.topic);
  }
  return map;
}
