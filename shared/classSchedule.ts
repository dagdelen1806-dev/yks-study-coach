// Ders programım: okul/dershane/özel ders blokları (tek haftalık, her hafta tekrar eder)
// ve bunlardan türeyen "gerçek boş zaman". Saatler "HH:mm" (yerel saat), günler 1=Pzt … 7=Paz.
// YKS dışı dersler (subject = null) takvimde gri görünür ve meşgul zaman sayılır, ama plana
// ve analizlere ders olarak girmez.

export const SCHEDULE_SOURCES = ["school", "course", "tutor", "other"] as const;
export type ScheduleSource = (typeof SCHEDULE_SOURCES)[number];
export const SCHEDULE_SOURCE_LABELS: Record<ScheduleSource, string> = { school: "Okul", course: "Dershane", tutor: "Özel ders", other: "Diğer" };

export const DAY_LABELS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"] as const;
export const DAY_SHORT_LABELS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"] as const;

/** Takvimde ve planda ders olarak sayılan YKS dersleri (müfredattaki dersler). */
export const YKS_SUBJECTS = ["Türkçe", "Matematik", "Geometri", "Fizik", "Kimya", "Biyoloji", "Edebiyat", "Tarih", "Coğrafya", "Felsefe"] as const;
/** Okul programında sık geçen, YKS planına girmeyen dersler. */
export const NON_YKS_PRESETS = ["Din Kültürü", "Yabancı Dil", "Rehberlik", "Beden Eğitimi", "Sanat / Müzik", "Diğer ders"] as const;

/** Okul çıkışı (ve her ders bloğu sonrası) yol/dinlenme payı. */
export const AFTER_CLASS_BUFFER_MINUTES = 30;
/** Bu saatten sonra plan yapılmaz. */
export const PLAN_DAY_END = "23:30";
export const MAX_SCHEDULE_BLOCKS = 120;
export const MAX_SCHOOL_PERIODS = 12;

export type ClassPeriod = { start: string; end: string };
export type ClassBlock = {
  source: ScheduleSource;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  /** YKS dersi; null = YKS dışı (gri, plana girmez). */
  subject: string | null;
  /** Hücrede görünen ad (ör. "Fizik", "Din Kültürü"). */
  label: string;
};
export type ClassSchedule = { periods: ClassPeriod[]; blocks: ClassBlock[] };
export type FreeSlot = { start: number; end: number };

/** Türk liselerinde yaygın 8 ders saati; öğrenci kendi saatlerine göre düzenler. */
export const DEFAULT_SCHOOL_PERIODS: ClassPeriod[] = [
  { start: "08:30", end: "09:10" },
  { start: "09:20", end: "10:00" },
  { start: "10:10", end: "10:50" },
  { start: "11:00", end: "11:40" },
  { start: "13:00", end: "13:40" },
  { start: "13:50", end: "14:30" },
  { start: "14:40", end: "15:20" },
  { start: "15:30", end: "16:10" },
];

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
export const isValidTime = (value: string) => TIME_PATTERN.test(value);
export const toMinutes = (value: string) => { const match = TIME_PATTERN.exec(value); return match ? Number(match[1]) * 60 + Number(match[2]) : NaN; };
export const fromMinutes = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
/** 1=Pazartesi … 7=Pazar. */
export const weekdayOf = (date: Date) => ((date.getDay() + 6) % 7) + 1;
export const isYksBlock = (block: Pick<ClassBlock, "subject">) => block.subject !== null;

export function blocksOn<T extends Pick<ClassBlock, "dayOfWeek" | "startTime">>(blocks: T[], date: Date): T[] {
  const day = weekdayOf(date);
  return blocks.filter((block) => block.dayOfWeek === day).sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
}

/** Kaydetmeden önce: saat biçimi, başlangıç < bitiş ve aynı günde çakışma. Sorun yoksa null. */
export function validateSchedule(schedule: ClassSchedule): string | null {
  for (const period of schedule.periods) {
    if (!isValidTime(period.start) || !isValidTime(period.end) || toMinutes(period.start) >= toMinutes(period.end)) return `Ders saati ${period.start}–${period.end} geçersiz: başlangıç bitişten önce olmalı.`;
  }
  for (const block of schedule.blocks) {
    if (!isValidTime(block.startTime) || !isValidTime(block.endTime) || toMinutes(block.startTime) >= toMinutes(block.endTime)) return `${block.label} (${block.startTime}–${block.endTime}) geçersiz: başlangıç bitişten önce olmalı.`;
  }
  for (let day = 1; day <= 7; day++) {
    const sorted = schedule.blocks.filter((block) => block.dayOfWeek === day).sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
    for (let index = 1; index < sorted.length; index++) {
      const previous = sorted[index - 1];
      const current = sorted[index];
      if (toMinutes(current.startTime) < toMinutes(previous.endTime)) return `${DAY_LABELS[day - 1]}: ${previous.label} (${previous.startTime}–${previous.endTime}) ile ${current.label} (${current.startTime}–${current.endTime}) çakışıyor.`;
    }
  }
  return null;
}

/**
 * Bir günün çalışmaya uygun boş aralıkları (dakika cinsinden, gece yarısından itibaren).
 * Her ders bloğundan sonra `buffer` dakika yol/dinlenme payı eklenir; `from` ile `to`
 * (varsayılan 23:30) dışında plan yapılmaz.
 */
export function computeFreeSlots(blocks: ClassBlock[], date: Date, options: { from: string; to?: string; buffer?: number }): FreeSlot[] {
  const from = toMinutes(options.from);
  const to = toMinutes(options.to ?? PLAN_DAY_END);
  const buffer = options.buffer ?? AFTER_CLASS_BUFFER_MINUTES;
  if (!Number.isFinite(from) || !Number.isFinite(to) || from >= to) return [];
  const busy = blocksOn(blocks, date).map((block) => ({ start: toMinutes(block.startTime), end: toMinutes(block.endTime) + buffer }));
  const slots: FreeSlot[] = [];
  let cursor = from;
  for (const interval of busy) {
    if (interval.end <= cursor) continue;
    if (interval.start > cursor) slots.push({ start: cursor, end: Math.min(interval.start, to) });
    cursor = Math.max(cursor, interval.end);
    if (cursor >= to) break;
  }
  if (cursor < to) slots.push({ start: cursor, end: to });
  return slots.filter((slot) => slot.end > slot.start);
}

export const freeMinutes = (slots: FreeSlot[]) => slots.reduce((sum, slot) => sum + slot.end - slot.start, 0);

/** Boş aralıklara `count` adet `sessionMinutes` dakikalık oturumu, aralarında `breakMinutes` mola ile yerleştirir; sığanların başlangıç dakikaları. */
export function placeSessions(slots: FreeSlot[], count: number, sessionMinutes: number, breakMinutes: number): number[] {
  const starts: number[] = [];
  for (const slot of slots) {
    let cursor = slot.start;
    while (starts.length < count && cursor + sessionMinutes <= slot.end) {
      starts.push(cursor);
      cursor += sessionMinutes + breakMinutes;
    }
    if (starts.length >= count) break;
  }
  return starts;
}

/**
 * Farklı uzunluktaki oturumları (ör. AI planının bir günü) sırasıyla boş aralıklara, aralarında
 * `breakMinutes` mola ile yerleştirir. Sığmayan oturum için null (takvime saatsiz/çakışan
 * eklenmez; öğrenciye söylenir).
 */
export function placeVariableSessions(slots: FreeSlot[], durations: number[], breakMinutes: number): Array<number | null> {
  let slotIndex = 0;
  let cursor = slots[0]?.start ?? 0;
  return durations.map((duration) => {
    for (let index = slotIndex; index < slots.length; index++) {
      const start = index === slotIndex ? Math.max(cursor, slots[index].start) : slots[index].start;
      if (start + duration <= slots[index].end) {
        slotIndex = index;
        cursor = start + duration + breakMinutes;
        return start;
      }
    }
    return null;
  });
}

/** Verilen saat aralığı o günün bir ders bloğuyla çakışıyorsa o blok (oturum eklerken uyarı için). */
export function findClassConflict(blocks: ClassBlock[], date: Date, startMinutes: number, durationMinutes: number): ClassBlock | null {
  const end = startMinutes + durationMinutes;
  return blocksOn(blocks, date).find((block) => startMinutes < toMinutes(block.endTime) && end > toMinutes(block.startTime)) ?? null;
}

/** AI haftalık plan için: her günün boş dakikası ve o gün okulda/dershanede işlenen YKS dersleri. */
export function describeWeekForPlan(blocks: ClassBlock[], weekStart: Date, from: string): string | null {
  if (blocks.length === 0) return null;
  const lines: string[] = [];
  for (let offset = 0; offset < 7; offset++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + offset);
    const slots = computeFreeSlots(blocks, date, { from });
    const subjects = Array.from(new Set(blocksOn(blocks, date).filter(isYksBlock).map((block) => block.subject as string)));
    const slotText = slots.filter((slot) => slot.end - slot.start >= 30).map((slot) => `${fromMinutes(slot.start)}–${fromMinutes(slot.end)}`).join(", ") || "yok";
    const isoDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    lines.push(`${DAY_LABELS[weekdayOf(date) - 1]} (${isoDate}): boş zaman ${freeMinutes(slots)} dk (${slotText})${subjects.length ? `; okulda/dershanede işlenen dersler: ${subjects.join(", ")}` : ""}`);
  }
  return lines.join("\n");
}
