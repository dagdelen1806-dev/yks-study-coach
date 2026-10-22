import { PLAN_DAY_END, blocksOn, fromMinutes, toMinutes, type ClassBlock } from "./classSchedule";

/**
 * Öğrencinin bir günündeki dolu saatler ve öğretmen görevlerinin yerleşimi. Dolu sayılanlar:
 * öğrencinin okul/dershane/özel ders blokları, kurumun ders programı (sınıfının dersleri) ve
 * takvimindeki planlı oturumlar. Kural: çakışan saate görev ASLA yazılmaz; yer yoksa söylenir.
 */

export type BusyInterval = { start: number; end: number; label: string; kind: "class" | "course" | "session" };
export type PlannedSessionLike = { sessionDate: Date | string; plannedMinutes: number; status?: string | null; title?: string | null };

/** Planlanabilir en erken saat (okul saatleri dışında kalan akşam ve hafta sonu). */
export const TASK_EARLIEST = "08:00";
/** İki iş arasında bırakılan en az boşluk (dk). */
export const TASK_GAP_MINUTES = 10;

const sameLocalDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** O günün dolu aralıkları (başlangıca göre sıralı). Tamamlanmış/atlanmış oturum yer tutmaz. */
export function busyOn(date: Date, input: { blocks: ClassBlock[]; courseBlocks?: ClassBlock[]; sessions?: PlannedSessionLike[] }): BusyInterval[] {
  const fromBlocks = (blocks: ClassBlock[], kind: "class" | "course") => blocksOn(blocks, date).map((block) => ({ start: toMinutes(block.startTime), end: toMinutes(block.endTime), label: block.label, kind }));
  const sessions = (input.sessions ?? [])
    .filter((session) => (session.status ?? "planned") === "planned")
    .map((session) => ({ session, at: new Date(session.sessionDate) }))
    .filter(({ at }) => sameLocalDay(at, date))
    .map(({ session, at }) => {
      const start = at.getHours() * 60 + at.getMinutes();
      return { start, end: start + Math.max(0, session.plannedMinutes), label: session.title?.trim() || "Planlı çalışma", kind: "session" as const };
    });
  return [...fromBlocks(input.blocks, "class"), ...fromBlocks(input.courseBlocks ?? [], "course"), ...sessions].sort((a, b) => a.start - b.start || a.end - b.end);
}

/** [start, start+minutes) aralığıyla çakışan ilk dolu aralık; yoksa null. Bitişik (bitiş = başlangıç) çakışma değildir. */
export function findTaskConflict(busy: BusyInterval[], start: number, minutes: number): BusyInterval | null {
  const end = start + minutes;
  return busy.find((interval) => start < interval.end && end > interval.start) ?? null;
}

/** O gün `minutes` süreli işin sığdığı ilk başlangıç (dolu aralıkların ardından `gap` dakika boşlukla); yoksa null. */
export function suggestStart(busy: BusyInterval[], minutes: number, options: { from?: number; to?: number; gap?: number } = {}): number | null {
  const gap = options.gap ?? TASK_GAP_MINUTES;
  const to = options.to ?? toMinutes(PLAN_DAY_END);
  let cursor = options.from ?? toMinutes(TASK_EARLIEST);
  for (const interval of busy) {
    // Bu aralıktan önce (boşluk payıyla) sığıyorsa yer bulundu; değilse aralığın sonrasına geç.
    if (cursor + minutes + gap <= interval.start) break;
    cursor = Math.max(cursor, interval.end + gap);
  }
  return cursor + minutes <= to ? cursor : null;
}

export type PlanItem = { minutes: number };
export type Placement = { index: number; date: Date; start: number } | { index: number; date: null; reason: "no_slot" };

/**
 * Plan önizlemesi: maddeler sırayla, `from` gününden başlayarak `days` gün içinde, günde en fazla
 * `perDay` madde olacak şekilde ilk uygun saate yerleşir. Yerleşen madde sonraki maddeler için dolu
 * sayılır. Hiçbir günde yer yoksa "no_slot" döner (görev yazılmaz).
 */
export function placePlanItems(items: PlanItem[], from: Date, days: number, busyFor: (date: Date) => BusyInterval[], options: { perDay?: number; earliest?: string; latest?: string; gap?: number } = {}): Placement[] {
  const perDay = options.perDay ?? 1;
  const earliest = toMinutes(options.earliest ?? TASK_EARLIEST);
  const latest = toMinutes(options.latest ?? PLAN_DAY_END);
  const dates = Array.from({ length: Math.max(1, days) }, (_, offset) => { const date = new Date(from); date.setHours(12, 0, 0, 0); date.setDate(date.getDate() + offset); return date; });
  const placedByDay = dates.map(() => [] as BusyInterval[]);
  let dayCursor = 0;
  return items.map((item, index) => {
    for (let attempt = 0; attempt < dates.length; attempt += 1) {
      const dayIndex = (dayCursor + attempt) % dates.length;
      if (placedByDay[dayIndex].length >= perDay) continue;
      const busy = [...busyFor(dates[dayIndex]), ...placedByDay[dayIndex]].sort((a, b) => a.start - b.start);
      const start = suggestStart(busy, item.minutes, { from: earliest, to: latest, gap: options.gap });
      if (start === null) continue;
      placedByDay[dayIndex].push({ start, end: start + item.minutes, label: "Yeni görev", kind: "session" });
      dayCursor = dayIndex + 1;
      return { index, date: dates[dayIndex], start };
    }
    return { index, date: null, reason: "no_slot" as const };
  });
}

export const describeInterval = (interval: BusyInterval) => `${interval.label} (${fromMinutes(interval.start)}–${fromMinutes(interval.end)})`;
