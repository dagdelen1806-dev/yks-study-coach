import { describe, expect, it } from "vitest";
import { buildSubjectTopicMap, findCurrentAndNextSession, FOCUS_SESSION_MINUTES, generateDailyFocusPlan } from "../shared/focusPlan";

describe("generateDailyFocusPlan", () => {
  it("320 dk için 40 dk'lık 8 oturum üretir", () => {
    const plan = generateDailyFocusPlan(320, [{ subject: "Matematik", topic: "Problemler", progress: 30 }], []);
    expect(plan).toHaveLength(8);
    expect(plan.every((session) => session.plannedMinutes === FOCUS_SESSION_MINUTES)).toBe(true);
  });

  it("konuları en zayıftan başlayarak sıralar", () => {
    const plan = generateDailyFocusPlan(80, [
      { subject: "Türkçe", topic: "Paragraf", progress: 70 },
      { subject: "Matematik", topic: "İntegral", progress: 20 },
    ], []);
    expect(plan[0].topic).toBe("İntegral");
    expect(plan[1].topic).toBe("Paragraf");
  });

  it("konu sayısı oturum sayısından azsa baştan döner", () => {
    const plan = generateDailyFocusPlan(120, [{ subject: "Fizik", topic: "Elektrik", progress: 10 }], []);
    expect(plan).toHaveLength(3);
    expect(plan.every((session) => session.topic === "Elektrik")).toBe(true);
  });

  it("zayıf konu yoksa kütüphane kitaplarının derslerinden üretir", () => {
    const plan = generateDailyFocusPlan(40, [], [{ subject: "Kimya", title: "Kimya Soru Bankası" }]);
    expect(plan).toEqual([{ title: "Kimya · Kimya Soru Bankası", subject: "Kimya", topic: "Kimya Soru Bankası", kind: "Odak", plannedMinutes: 40 }]);
  });

  it("hiç veri yoksa boş dizi döner, sahte konu uydurmaz", () => {
    expect(generateDailyFocusPlan(320, [], [])).toEqual([]);
  });

  it("günlük süre 0 veya negatifse en az 1 oturum üretir", () => {
    expect(generateDailyFocusPlan(0, [{ subject: "Türkçe", topic: "Paragraf", progress: 50 }], [])).toHaveLength(1);
  });

  it("scheduleStart verilirse blokları gerçek saatlere, aralarında mola ile diziler", () => {
    const date = new Date("2026-09-22T00:00:00");
    const plan = generateDailyFocusPlan(120, [{ subject: "Matematik", topic: "Problemler", progress: 30 }], [], { date, startTime: "16:00" });
    expect(plan).toHaveLength(3);
    expect(plan[0].startsAt).toBe(new Date("2026-09-22T16:00:00").toISOString());
    expect(plan[0].endsAt).toBe(new Date("2026-09-22T16:40:00").toISOString());
    // 40 dk oturum + 10 dk mola = bir sonraki blok 50 dk sonra başlar.
    expect(plan[1].startsAt).toBe(new Date("2026-09-22T16:50:00").toISOString());
    expect(plan[2].startsAt).toBe(new Date("2026-09-22T17:40:00").toISOString());
  });

  it("scheduleStart geçersiz saat biçimindeyse startsAt/endsAt eklenmez", () => {
    const plan = generateDailyFocusPlan(40, [{ subject: "Matematik", topic: "Problemler", progress: 30 }], [], { date: new Date(), startTime: "25:99" });
    expect(plan[0].startsAt).toBeUndefined();
  });

  it("scheduleStart verilmezse startsAt/endsAt hiç eklenmez", () => {
    const plan = generateDailyFocusPlan(40, [{ subject: "Matematik", topic: "Problemler", progress: 30 }], []);
    expect(plan[0].startsAt).toBeUndefined();
    expect(plan[0].endsAt).toBeUndefined();
  });
});

describe("findCurrentAndNextSession", () => {
  const base = { id: 1, plannedMinutes: 40, status: "planned" as const };
  it("şu anki saat penceresine denk gelen oturumu 'current' olarak döner", () => {
    const now = new Date("2026-09-22T16:20:00");
    const sessions = [
      { ...base, id: 1, sessionDate: "2026-09-22T16:00:00" },
      { ...base, id: 2, sessionDate: "2026-09-22T16:50:00" },
    ];
    const { current, next } = findCurrentAndNextSession(sessions, now);
    expect(current?.id).toBe(1);
    expect(next?.id).toBe(2);
  });

  it("hiçbir pencere şu anı kapsamıyorsa current null, en yakın gelecek next olur", () => {
    const now = new Date("2026-09-22T16:45:00");
    const sessions = [
      { ...base, id: 1, sessionDate: "2026-09-22T16:00:00" },
      { ...base, id: 2, sessionDate: "2026-09-22T16:50:00" },
    ];
    const { current, next } = findCurrentAndNextSession(sessions, now);
    expect(current).toBeNull();
    expect(next?.id).toBe(2);
  });

  it("tamamlanmış veya atlanmış oturumları yok sayar", () => {
    const now = new Date("2026-09-22T16:20:00");
    const sessions = [
      { ...base, id: 1, sessionDate: "2026-09-22T16:00:00", status: "completed" as const },
      { ...base, id: 2, sessionDate: "2026-09-22T16:00:00", status: "skipped" as const },
    ];
    const { current, next } = findCurrentAndNextSession(sessions, now);
    expect(current).toBeNull();
    expect(next).toBeNull();
  });

  it("geçmişte kalmış ama tamamlanmamış (gecikmiş) bir oturum varsa ne current ne next olur", () => {
    const now = new Date("2026-09-22T17:30:00");
    const sessions = [{ ...base, id: 1, sessionDate: "2026-09-22T16:00:00" }];
    const { current, next } = findCurrentAndNextSession(sessions, now);
    expect(current).toBeNull();
    expect(next).toBeNull();
  });
});

describe("buildSubjectTopicMap", () => {
  it("her dersi yalnızca kendi konularıyla eşler, başka derse sızdırmaz", () => {
    const map = buildSubjectTopicMap([
      { subject: "Matematik", topic: "Problemler" },
      { subject: "Biyoloji", topic: "Hücre bölünmeleri" },
    ]);
    expect(map.Matematik).toEqual(["Problemler"]);
    expect(map.Biyoloji).toEqual(["Hücre bölünmeleri"]);
    expect(map.Matematik).not.toContain("Hücre bölünmeleri");
  });

  it("aynı ders için tekrarlanan konuyu tek kez tutar", () => {
    const map = buildSubjectTopicMap([
      { subject: "Türkçe", topic: "Paragraf" },
      { subject: "Türkçe", topic: "Paragraf" },
      { subject: "Türkçe", topic: "Dil bilgisi" },
    ]);
    expect(map.Türkçe).toEqual(["Paragraf", "Dil bilgisi"]);
  });

  it("boş subject veya topic içeren girişleri yok sayar", () => {
    expect(buildSubjectTopicMap([{ subject: "", topic: "Problemler" }, { subject: "Matematik", topic: "" }])).toEqual({});
  });

  it("boş giriş listesi için boş harita döner", () => {
    expect(buildSubjectTopicMap([])).toEqual({});
  });
});
