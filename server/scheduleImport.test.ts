import { describe, expect, it, vi } from "vitest";
import { classifyLesson, parseScheduleImport, readScheduleFromImage } from "./schedule/scheduleImport";
import { validateSchedule } from "../shared/classSchedule";

// Örnek: bir fen lisesi 12-A haftalık programı (ders saatleri + kısaltma → ders adı listesi).
const periods = [
  { start: "08:30", end: "09:10" }, { start: "09:20", end: "10:00" }, { start: "10:10", end: "10:50" }, { start: "11:00", end: "11:40" },
  { start: "13:00", end: "13:40" }, { start: "13:50", end: "14:30" }, { start: "14:40", end: "15:20" }, { start: "15:30", end: "16:10" },
];
const monday = [
  ["FİZF4", "FİZİK", "Fizik"], ["FİZF4", "FİZİK", "Fizik"], ["BYSF2", "HTDE_BİYOLOJİ (SEÇMELİ-2)", "Biyoloji"], ["BİYF4", "BİYOLOJİ", "Biyoloji"],
  ["BİYF4", "BİYOLOJİ", "Biyoloji"], ["HTDE-K", "HTDE-KİMYA", "Kimya"], ["MATF4", "MATEMATİK", "Matematik"], ["MATF4", "MATEMATİK", "Matematik"],
].map(([code, name, subject], index) => ({ day: 1, period: index + 1, code, name, subject }));

describe("ders adı → YKS dersi", () => {
  it.each([
    ["FİZİK", "Fizik"], ["HTDE_BİYOLOJİ (SEÇMELİ-2)", "Biyoloji"], ["HTDE_MATEMATİK (SEÇMELİ)", "Matematik"], ["T.C. İNKILAP TARİHİ VE ATATÜRKÇÜLÜK", "Tarih"],
    ["TÜRK DİLİ VE EDEBİYATI", "Edebiyat"], ["KİMYA", "Kimya"],
  ])("%s → %s", (name, subject) => expect(classifyLesson(name)).toEqual({ known: true, subject }));

  it.each(["DİN KÜLTÜRÜ VE AHLAK BİLGİSİ", "BİRİNCİ YABANCI DİL", "İKİNCİ YABANCI DİL (SEÇMELİ-2)", "REHBERLİK VE YÖNLENDİRME", "KLASİK AHLAK METİNLERİ"])("%s → YKS dışı", (name) => {
    expect(classifyLesson(name)).toEqual({ known: true, subject: null });
  });

  it("tanınmayan ad modelin seçimine bırakılır", () => expect(classifyLesson("XYZ4")).toEqual({ known: false, subject: null }));
});

describe("parseScheduleImport", () => {
  it("programı geçerli okul bloklarına çevirir ve doğrulamadan geçer", () => {
    const result = parseScheduleImport({ periods, lessons: [...monday, { day: 2, period: 1, code: "MATF4", name: "MATEMATİK", subject: "Matematik" }, { day: 3, period: 1, code: "BYDF4", name: "BİRİNCİ YABANCI DİL", subject: "YKS dışı" }] });
    expect(result.periods).toHaveLength(8);
    expect(result.blocks).toHaveLength(10);
    expect(result.blocks[0]).toEqual({ source: "school", dayOfWeek: 1, startTime: "08:30", endTime: "09:10", subject: "Fizik", label: "Fizik" });
    expect(result.blocks[2]).toMatchObject({ subject: "Biyoloji", label: "Htde Biyoloji (Seçmeli-2)" });
    expect(result.blocks.at(-1)).toMatchObject({ dayOfWeek: 3, subject: null, label: "Birinci Yabancı Dil" });
    expect(validateSchedule(result)).toBeNull();
  });

  it("ders adı ile modelin seçimi çelişirse ad kazanır; YKS dışını modelden YKS dersi yapmaz", () => {
    const result = parseScheduleImport({ periods, lessons: [{ day: 4, period: 1, code: "DİNF4", name: "DİN KÜLTÜRÜ VE AHLAK BİLGİSİ", subject: "Felsefe" }, { day: 4, period: 2, code: "XYZ", name: "XYZ", subject: "Kimya" }] });
    expect(result.blocks.map((block) => block.subject)).toEqual([null, "Kimya"]);
  });

  it("geçersiz saatleri, olmayan ders saatini, aynı hücreyi ve boş dersi atlar", () => {
    const result = parseScheduleImport({
      periods: [{ start: "8.30", end: "9:10" }, { start: "10:00", end: "09:00" }, { start: "25:00", end: "26:00" }],
      lessons: [
        { day: 1, period: 1, code: "FİZF4", name: "FİZİK", subject: "Fizik" },
        { day: 1, period: 1, code: "KİMF4", name: "KİMYA", subject: "Kimya" },
        { day: 1, period: 5, code: "FİZF4", name: "FİZİK", subject: "Fizik" },
        { day: 9, period: 1, code: "FİZF4", name: "FİZİK", subject: "Fizik" },
        { day: 2, period: 1, code: "", name: "", subject: "" },
      ],
    });
    expect(result.periods).toEqual([{ start: "08:30", end: "09:10" }]);
    expect(result.blocks).toHaveLength(1);
    expect(result.skipped).toBe(4);
  });
});

describe("readScheduleFromImage", () => {
  it("sends the photo to the model and returns the parsed schedule", async () => {
    const invoke = vi.fn(async () => ({ choices: [{ message: { content: "```json\n" + JSON.stringify({ periods, lessons: monday }) + "\n```" } }] }));
    const result = await readScheduleFromImage("data:image/jpeg;base64,AAAA", invoke as never);
    expect(result.blocks).toHaveLength(8);
    const call = (invoke.mock.calls[0] as unknown as [{ messages: Array<{ content: unknown }> }])[0];
    expect(JSON.stringify(call.messages[1].content)).toContain("data:image/jpeg;base64,AAAA");
  });

  it("fails clearly when nothing could be read", async () => {
    const invoke = vi.fn(async () => ({ choices: [{ message: { content: JSON.stringify({ periods: [], lessons: [] }) } }] }));
    await expect(readScheduleFromImage("data:image/jpeg;base64,AAAA", invoke as never)).rejects.toThrow(/okunamadı/);
  });
});
