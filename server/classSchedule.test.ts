import { describe, expect, it } from "vitest";
import { computeFreeSlots, describeWeekForPlan, findClassConflict, freeMinutes, fromMinutes, placeSessions, placeVariableSessions, validateSchedule, weekdayOf, type ClassBlock } from "../shared/classSchedule";
import { generateDailyFocusPlan } from "../shared/focusPlan";

// 2026-10-19 bir Pazartesi.
const monday = new Date(2026, 9, 19, 12);
const school = (day: number, startTime: string, endTime: string, subject: string | null, label = subject ?? "Din Kültürü"): ClassBlock => ({ source: "school", dayOfWeek: day, startTime, endTime, subject, label });
const mondaySchool = [school(1, "08:30", "09:10", "Fizik"), school(1, "09:20", "10:00", "Fizik"), school(1, "13:00", "13:40", "Matematik"), school(1, "15:30", "16:10", null, "Rehberlik")];
const slotsText = (slots: Array<{ start: number; end: number }>) => slots.map((slot) => `${fromMinutes(slot.start)}-${fromMinutes(slot.end)}`);

describe("ders programı — boş zaman", () => {
  it("Pazartesi = 1, Pazar = 7", () => {
    expect(weekdayOf(monday)).toBe(1);
    expect(weekdayOf(new Date(2026, 9, 25, 12))).toBe(7);
  });

  it("okul çıkışından sonra 30 dk pay bırakır ve 23:30'da keser", () => {
    expect(slotsText(computeFreeSlots(mondaySchool, monday, { from: "16:00" }))).toEqual(["16:40-23:30"]);
  });

  it("YKS dışı ders de meşgul zaman sayılır", () => {
    const onlyRehberlik = [school(1, "17:00", "18:00", null, "Rehberlik")];
    expect(slotsText(computeFreeSlots(onlyRehberlik, monday, { from: "16:00" }))).toEqual(["16:00-17:00", "18:30-23:30"]);
  });

  it("dershane akşam bloğu boş zamanı ikiye böler; başka günü etkilemez", () => {
    const course: ClassBlock = { source: "course", dayOfWeek: 1, startTime: "18:00", endTime: "20:00", subject: "Matematik", label: "Matematik" };
    expect(slotsText(computeFreeSlots([...mondaySchool, course], monday, { from: "16:00" }))).toEqual(["16:40-18:00", "20:30-23:30"]);
    const tuesday = new Date(2026, 9, 20, 12);
    expect(slotsText(computeFreeSlots([course], tuesday, { from: "16:00" }))).toEqual(["16:00-23:30"]);
  });

  it("23:30'dan sonra plan yok", () => {
    expect(computeFreeSlots([], monday, { from: "23:30" })).toEqual([]);
    expect(freeMinutes(computeFreeSlots([], monday, { from: "22:00" }))).toBe(90);
  });

  it("oturumları aralıklara molayla yerleştirir, sığmayanı atlar", () => {
    expect(placeSessions([{ start: 600, end: 700 }, { start: 800, end: 840 }], 4, 40, 10).map(fromMinutes)).toEqual(["10:00", "10:50", "13:20"]);
  });

  it("AI planının farklı uzunluktaki oturumlarını sırayla boş zamana koyar, okul saatine asla", () => {
    // Pazartesi okul 16:10'da biter (+30 dk), dershane 18:00–20:00 (+30 dk).
    const course: ClassBlock = { source: "course", dayOfWeek: 1, startTime: "18:00", endTime: "20:00", subject: "Matematik", label: "Dershane" };
    const slots = computeFreeSlots([...mondaySchool, course], monday, { from: "16:00" });
    const starts = placeVariableSessions(slots, [60, 45, 30, 200], 10);
    expect(starts.map((start) => (start === null ? null : fromMinutes(start)))).toEqual(["16:40", "20:30", "21:25", null]);
    for (const [index, start] of starts.entries()) if (start !== null) expect(findClassConflict([...mondaySchool, course], monday, start, [60, 45, 30][index])).toBeNull();
  });

  it("çakışmayı bulur", () => {
    expect(findClassConflict(mondaySchool, monday, 13 * 60 + 20, 40)?.label).toBe("Matematik");
    expect(findClassConflict(mondaySchool, monday, 17 * 60, 40)).toBeNull();
  });
});

describe("ders programı — doğrulama", () => {
  it("geçerli programı kabul eder", () => {
    expect(validateSchedule({ periods: [{ start: "08:30", end: "09:10" }], blocks: mondaySchool })).toBeNull();
  });

  it("aynı günde çakışan blokları ve ters saatleri reddeder", () => {
    expect(validateSchedule({ periods: [], blocks: [school(1, "08:30", "09:30", "Fizik"), school(1, "09:00", "09:40", "Kimya")] })).toMatch(/çakışıyor/);
    expect(validateSchedule({ periods: [], blocks: [school(2, "10:00", "09:00", "Fizik")] })).toMatch(/geçersiz/);
    expect(validateSchedule({ periods: [{ start: "09:00", end: "08:00" }], blocks: [] })).toMatch(/Ders saati/);
  });
});

describe("Pusula Odak planı ders programıyla", () => {
  const topics = [{ subject: "Matematik", topic: "Türev", progress: 20 }];

  it("oturumları yalnızca boş aralıklara koyar", () => {
    const freeSlots = computeFreeSlots([...mondaySchool, { source: "course", dayOfWeek: 1, startTime: "18:00", endTime: "20:00", subject: "Matematik", label: "Dershane" }], monday, { from: "16:00" });
    const plan = generateDailyFocusPlan(200, topics, [], { date: monday, startTime: "16:00", freeSlots });
    const starts = plan.map((session) => { const date = new Date(session.startsAt!); return fromMinutes(date.getHours() * 60 + date.getMinutes()); });
    // Hedef 5 oturum; 16:40–18:00'e 1, 20:30–23:30'a 3 tane sığar.
    expect(starts).toEqual(["16:40", "20:30", "21:20", "22:10"]);
  });

  it("boş zaman yetmezse daha az oturum üretir, hiç yoksa boş döner", () => {
    expect(generateDailyFocusPlan(320, topics, [], { date: monday, startTime: "22:30", freeSlots: computeFreeSlots([], monday, { from: "22:30" }) })).toHaveLength(1);
    expect(generateDailyFocusPlan(320, topics, [], { date: monday, startTime: "23:30", freeSlots: [] })).toEqual([]);
  });
});

describe("AI haftalık plan bağlamı", () => {
  it("programı olmayan öğrenci için null", () => {
    expect(describeWeekForPlan([], monday, "16:00")).toBeNull();
  });

  it("gün gün boş dakikayı ve yalnızca YKS derslerini yazar", () => {
    const text = describeWeekForPlan(mondaySchool, monday, "16:00")!;
    const [mondayLine, tuesdayLine] = text.split("\n");
    expect(mondayLine).toBe("Pazartesi: boş zaman 410 dk (16:40–23:30); okulda/dershanede işlenen dersler: Fizik, Matematik");
    expect(mondayLine).not.toContain("Rehberlik");
    expect(tuesdayLine).toBe("Salı: boş zaman 450 dk (16:00–23:30)");
  });
});
