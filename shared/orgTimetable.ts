import { DAY_LABELS, isValidTime, toMinutes } from "./classSchedule";

// Kurum (dershane) ders programı: her sınıfın haftalık dersleri, dersi veren öğretmen ve derslik.
// Kural: bir sınıfın iki dersi ve bir öğretmenin (farklı sınıflarda bile) iki dersi aynı saate
// düşemez; aynı derslik de aynı saatte iki sınıfa verilemez. Branş uyuşmazlığı hata değil uyarıdır
// (ör. Matematik öğretmeni Geometri dersine girebilir).

export const MAX_TIMETABLE_SLOTS_PER_CLASS = 80;

export type TimetableSlot = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subject: string;
  teacherUserId: number | null;
  room: string | null;
};
/** Çakışma denetiminde kaydın hangi sınıfa ait olduğu da bilinir. */
export type PlacedSlot = TimetableSlot & { classId: number };

/** Dershanelerde sık kullanılan ders saati şablonları (hafta içi akşam, hafta sonu gündüz). */
export const TIMETABLE_PERIOD_PRESETS: Array<{ label: string; periods: Array<{ start: string; end: string }> }> = [
  { label: "Hafta içi akşam (4 ders)", periods: [{ start: "16:30", end: "17:10" }, { start: "17:20", end: "18:00" }, { start: "18:10", end: "18:50" }, { start: "19:00", end: "19:40" }] },
  { label: "Hafta sonu gündüz (6 ders)", periods: [{ start: "09:00", end: "09:40" }, { start: "09:50", end: "10:30" }, { start: "10:40", end: "11:20" }, { start: "11:30", end: "12:10" }, { start: "13:00", end: "13:40" }, { start: "13:50", end: "14:30" }] },
];

const overlaps = (a: Pick<TimetableSlot, "dayOfWeek" | "startTime" | "endTime">, b: Pick<TimetableSlot, "dayOfWeek" | "startTime" | "endTime">) =>
  a.dayOfWeek === b.dayOfWeek && toMinutes(a.startTime) < toMinutes(b.endTime) && toMinutes(b.startTime) < toMinutes(a.endTime);

const when = (slot: Pick<TimetableSlot, "dayOfWeek" | "startTime" | "endTime">) => `${DAY_LABELS[slot.dayOfWeek - 1]} ${slot.startTime}–${slot.endTime}`;

/** Tek sınıfın programındaki biçim ve iç çakışma hataları; sorun yoksa null. */
export function validateClassTimetable(slots: TimetableSlot[]): string | null {
  if (slots.length > MAX_TIMETABLE_SLOTS_PER_CLASS) return `Bir sınıfa en fazla ${MAX_TIMETABLE_SLOTS_PER_CLASS} ders eklenebilir.`;
  for (const slot of slots) {
    if (!Number.isInteger(slot.dayOfWeek) || slot.dayOfWeek < 1 || slot.dayOfWeek > 7) return "Geçersiz gün.";
    if (!isValidTime(slot.startTime) || !isValidTime(slot.endTime)) return "Saatler SS:DD biçiminde olmalı.";
    if (toMinutes(slot.endTime) <= toMinutes(slot.startTime)) return `${when(slot)}: bitiş saati başlangıçtan sonra olmalı.`;
    if (!slot.subject.trim()) return `${when(slot)}: ders adı boş olamaz.`;
  }
  for (let i = 0; i < slots.length; i += 1) {
    for (let j = i + 1; j < slots.length; j += 1) {
      if (overlaps(slots[i], slots[j])) return `${when(slots[i])} saatinde sınıfın iki dersi çakışıyor (${slots[i].subject}, ${slots[j].subject}).`;
    }
  }
  return null;
}

export type TimetableConflict = { kind: "teacher" | "room"; slot: TimetableSlot; other: PlacedSlot };

/** Sınıfın yeni programının kurumdaki diğer sınıflarla öğretmen/derslik çakışmaları. */
export function findCrossClassConflicts(classId: number, slots: TimetableSlot[], others: PlacedSlot[]): TimetableConflict[] {
  const conflicts: TimetableConflict[] = [];
  for (const slot of slots) {
    for (const other of others) {
      if (other.classId === classId || !overlaps(slot, other)) continue;
      if (slot.teacherUserId && slot.teacherUserId === other.teacherUserId) conflicts.push({ kind: "teacher", slot, other });
      else if (slot.room && other.room && slot.room.trim().toLocaleLowerCase("tr") === other.room.trim().toLocaleLowerCase("tr")) conflicts.push({ kind: "room", slot, other });
    }
  }
  return conflicts;
}

export function describeConflict(conflict: TimetableConflict, names: { teacher: (userId: number) => string; className: (classId: number) => string }): string {
  const target = conflict.kind === "teacher" ? `${names.teacher(conflict.slot.teacherUserId!)} aynı saatte ${names.className(conflict.other.classId)} sınıfında ${conflict.other.subject} dersinde` : `${conflict.slot.room} dersliği aynı saatte ${names.className(conflict.other.classId)} sınıfına verilmiş`;
  return `${when(conflict.slot)}: ${target}.`;
}

/** Branşı dersle uyuşmayan öğretmen (uyarı). Branşı boş öğretmen ve "Rehberlik" uyarı vermez. */
export const branchMismatch = (subject: string, teacherBranch: string | null) =>
  Boolean(teacherBranch && teacherBranch !== "Rehberlik" && !sameBranch(subject, teacherBranch));

// Yakın branşlar: aynı öğretmenin girmesi olağan derslerin eşleşmesi.
const BRANCH_FAMILIES = [["Matematik", "Geometri", "Sayısal Yetenek", "Sayısal"], ["Türkçe", "Edebiyat", "Sözel Yetenek", "Sözel"], ["Fen Bilimleri", "Fizik", "Kimya", "Biyoloji", "Fen"], ["Tarih", "İnkılap Tarihi"], ["Coğrafya", "Türkiye Coğrafyası"], ["Vatandaşlık", "Mevzuat"]];
function sameBranch(subject: string, branch: string) {
  if (subject === branch) return true;
  return BRANCH_FAMILIES.some((family) => family.includes(subject) && family.includes(branch));
}

/** Haftalık ders saati özetleri: sınıfın ders başına, öğretmenin toplam ders sayısı. */
export function weeklyHours(slots: TimetableSlot[]): Array<{ subject: string; count: number; minutes: number }> {
  const bySubject = new Map<string, { count: number; minutes: number }>();
  for (const slot of slots) {
    const entry = bySubject.get(slot.subject) ?? { count: 0, minutes: 0 };
    entry.count += 1;
    entry.minutes += toMinutes(slot.endTime) - toMinutes(slot.startTime);
    bySubject.set(slot.subject, entry);
  }
  return Array.from(bySubject, ([subject, value]) => ({ subject, ...value })).sort((a, b) => b.count - a.count);
}

export const sortSlots = <T extends Pick<TimetableSlot, "dayOfWeek" | "startTime">>(slots: T[]) => slots.slice().sort((a, b) => a.dayOfWeek - b.dayOfWeek || toMinutes(a.startTime) - toMinutes(b.startTime));
