import { describe, expect, it } from "vitest";
import { ACADEMIC_REVIEW_TEXT, comparabilityKey, describeTrend, seasonOf, trendDecline, trendSignals, type ComparableExam } from "../shared/academicCase";
import type { ClassBlock } from "../shared/classSchedule";
import { busyOn, findTaskConflict, placePlanItems, suggestStart } from "../shared/planPlacement";

// G0: Novara akademik takip kuralları ve plan yerleşimi — veritabanı ve ekran yok.
let nextId = 1;
const exam = (date: string, net: number, extra: Partial<ComparableExam> = {}): ComparableExam => ({ id: nextId++, examKind: "TYT", date: new Date(`${date}T10:00:00`), net, source: "student", ...extra });

describe("akademik inceleme önerisi (düşüş eğilimi)", () => {
  it("Öğrenci 024: 82 → 76 → 69 öneri doğurur; öğrenci girişi olduğu için güven orta", () => {
    const result = trendDecline([exam("2026-09-14", 82), exam("2026-09-28", 76), exam("2026-10-12", 69)], "TYT");
    expect(result).toMatchObject({ status: "signal", confidence: "medium", totalChange: -13, steps: [-6, -7] });
    expect(describeTrend(result)).toBe("TYT: 82 → 76 → 69 (−13 net)");
    expect(ACADEMIC_REVIEW_TEXT).toMatch(/^Öğrencinin son üç karşılaştırılabilir denemesinde/);
  });

  it("kurumdan aktarılan, aynı yayınevine ait denemelerde güven yüksek", () => {
    const org = { source: "org" as const, publisher: "Karekök Yayınları" };
    expect(trendDecline([exam("2026-09-14", 82, org), exam("2026-09-28", 76, { ...org, publisher: "karekök" }), exam("2026-10-12", 69, org)], "TYT")).toMatchObject({ status: "signal", confidence: "high" });
  });

  it("her adım düşmüyorsa ya da toplam düşüş eşiğin altındaysa öneri yok", () => {
    expect(trendDecline([exam("2026-09-14", 82), exam("2026-09-28", 85), exam("2026-10-12", 69)], "TYT").status).toBe("no_signal");
    expect(trendDecline([exam("2026-09-14", 82), exam("2026-09-28", 80), exam("2026-10-12", 78)], "TYT")).toMatchObject({ status: "no_signal", totalChange: -4 });
  });

  it("LGS eşiği 3 net; TYT ve LGS asla aynı karşılaştırmaya girmez", () => {
    const lgs = { examKind: "LGS" as const };
    expect(trendDecline([exam("2026-09-14", 70, lgs), exam("2026-09-28", 69, lgs), exam("2026-10-12", 66.5, lgs)], "LGS")).toMatchObject({ status: "signal", totalChange: -3.5 });
    // İki TYT + bir LGS: TYT için yalnızca iki deneme var → yetersiz; LGS için tek deneme → yetersiz.
    const mixed = [exam("2026-09-14", 82), exam("2026-09-28", 76), exam("2026-10-12", 50, lgs)];
    expect(trendSignals(mixed).map((result) => [result.examKind, result.status])).toEqual([["TYT", "insufficient"], ["LGS", "insufficient"]]);
  });

  it("yetersiz veri: iki deneme, farklı yayınevi, farklı dönem, çok yayılmış tarih; branş denemesi sayılmaz", () => {
    expect(trendDecline([exam("2026-09-28", 76), exam("2026-10-12", 69)], "TYT")).toMatchObject({ status: "insufficient", reason: "not_enough_exams" });
    expect(trendDecline([exam("2026-09-14", 82, { publisher: "A Yayınları" }), exam("2026-09-28", 76, { publisher: "B Yayınları" }), exam("2026-10-12", 69)], "TYT")).toMatchObject({ status: "insufficient", reason: "mixed_publishers" });
    expect(trendDecline([exam("2026-07-01", 82), exam("2026-07-20", 76), exam("2026-08-10", 69)], "TYT")).toMatchObject({ status: "insufficient", reason: "different_season" });
    expect(trendDecline([exam("2026-08-05", 82), exam("2026-09-28", 76), exam("2026-12-12", 69)], "TYT")).toMatchObject({ status: "insufficient", reason: "too_spread_out" });
    expect(trendDecline([exam("2026-09-14", 82), exam("2026-09-28", 76), exam("2026-10-12", 40, { scope: "branch" })], "TYT")).toMatchObject({ status: "insufficient", reason: "not_enough_exams" });
    expect(describeTrend(trendDecline([exam("2026-10-12", 69)], "TYT"))).toMatch(/inceleme için yetersiz veri/);
  });

  it("yalnızca son üç deneme kullanılır; eski yüksek deneme sonucu etkilemez", () => {
    const result = trendDecline([exam("2026-08-20", 95), exam("2026-09-14", 70), exam("2026-09-28", 72), exam("2026-10-12", 71)], "TYT");
    expect(result).toMatchObject({ status: "no_signal", evidence: [{ net: 70 }, { net: 72 }, { net: 71 }] });
  });

  it("karşılaştırma anahtarı ve hazırlık dönemi", () => {
    expect(comparabilityKey({ examKind: "TYT", scope: null, publisher: "Karekök Yayınları" })).toBe(comparabilityKey({ examKind: "TYT", scope: "full", publisher: "karekök" }));
    expect(comparabilityKey({ examKind: "TYT", scope: "branch", publisher: null })).not.toBe(comparabilityKey({ examKind: "TYT", scope: "full", publisher: null }));
    expect(seasonOf(new Date("2026-08-01T12:00:00"))).toBe(2026);
    expect(seasonOf(new Date("2027-06-20T12:00:00"))).toBe(2026);
  });
});

describe("plan yerleşimi ve görev çakışması", () => {
  const tuesday = new Date("2026-10-27T12:00:00");
  const block = (dayOfWeek: number, startTime: string, endTime: string, label: string): ClassBlock => ({ source: "school", dayOfWeek, startTime, endTime, subject: null, label });
  const school = [block(2, "08:30", "15:20", "Okul")];
  const course = [{ ...block(2, "16:30", "18:00", "12-A · Matematik"), source: "course" as const }];
  const sessions = [
    { sessionDate: new Date("2026-10-27T19:00:00"), plannedMinutes: 40, status: "planned", title: "Paragraf" },
    { sessionDate: new Date("2026-10-27T21:00:00"), plannedMinutes: 40, status: "completed", title: "Bitti" },
    { sessionDate: new Date("2026-10-28T19:00:00"), plannedMinutes: 40, status: "planned", title: "Ertesi gün" },
  ];

  it("dolu saatler: okul, kurum ders programı ve o günün planlı oturumu; tamamlanan ve başka gün sayılmaz", () => {
    expect(busyOn(tuesday, { blocks: school, courseBlocks: course, sessions }).map((item) => [item.kind, item.start, item.end])).toEqual([["class", 510, 920], ["course", 990, 1080], ["session", 1140, 1180]]);
  });

  it("kurum dersiyle ve planlı oturumla çakışma bulunur; bitişik saat çakışma değildir", () => {
    const busy = busyOn(tuesday, { blocks: school, courseBlocks: course, sessions });
    expect(findTaskConflict(busy, 17 * 60, 40)?.label).toBe("12-A · Matematik");
    expect(findTaskConflict(busy, 18 * 60 + 40, 40)?.label).toBe("Paragraf");
    expect(findTaskConflict(busy, 18 * 60, 60)).toBeNull();
  });

  it("uygun ilk saat önerilir; gün doluysa null", () => {
    const busy = busyOn(tuesday, { blocks: school, courseBlocks: course, sessions });
    expect(suggestStart(busy, 40, { from: 16 * 60 })).toBe(18 * 60 + 10);
    expect(suggestStart(busy, 60, { from: 16 * 60 })).toBe(19 * 60 + 50);
    expect(suggestStart([{ start: 8 * 60, end: 23 * 60 + 20, label: "Kamp", kind: "class" }], 40)).toBeNull();
  });

  it("plan önizlemesi günlere yayılır; yer olmayan gün atlanır, hiç yer yoksa no_slot", () => {
    const busyFor = (date: Date) => (date.getDate() === 28 ? [{ start: 8 * 60, end: 23 * 60 + 30, label: "Dolu", kind: "class" as const }] : busyOn(date, { blocks: school, courseBlocks: course, sessions }));
    const placements = placePlanItems([{ minutes: 40 }, { minutes: 40 }, { minutes: 40 }], tuesday, 3, busyFor, { earliest: "16:00" });
    // 27: dershane 16:30–18:00 sonrası 18:10; 28 tamamen dolu; 29: 16:00. Günde bir görev: üçüncüye yer yok.
    expect(placements.map((item) => (item.date ? `${item.date.getDate()} ${item.start}` : "yok"))).toEqual(["27 1090", "29 960", "yok"]);
    expect(placePlanItems([{ minutes: 40 }], tuesday, 1, () => [{ start: 0, end: 24 * 60, label: "Dolu", kind: "class" }])).toEqual([{ index: 0, date: null, reason: "no_slot" }]);
  });
});
