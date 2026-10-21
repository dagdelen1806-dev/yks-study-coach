import { describe, expect, it } from "vitest";
import { CURRICULUM } from "../shared/curriculum";
import { estimateLgsScore, kindsOf, netFor, optionCountOf, subjectTotalsOf, trackSubjects } from "../shared/exams";
import { buildLgsTemplateTopicDetails } from "../shared/lgsExamTemplate";
import { parseSimilarQuestion } from "../shared/questionNotebook";
import { calculateTopicResult } from "../shared/yksData";
import { nextExamEnd, planPeriodEnd } from "../shared/yksCalendar";
import { classifyLesson } from "./schedule/scheduleImport";

describe("sınav tanımları", () => {
  it("YKS iki oturum (TYT, AYT), LGS tek oturum", () => {
    expect(kindsOf("YKS")).toEqual(["TYT", "AYT"]);
    expect(kindsOf("LGS")).toEqual(["LGS"]);
  });

  it("LGS 90 soru: sözel 50 + sayısal 40", () => {
    const totals = subjectTotalsOf("LGS");
    expect(Object.values(totals).reduce((sum, value) => sum + value, 0)).toBe(90);
    expect(totals["Türkçe"]).toBe(20);
    expect(totals["İngilizce"]).toBe(10);
    expect(trackSubjects("LGS")).toHaveLength(6);
  });

  it("YKS dersleri değişmedi (TYT 40/40/20/20)", () => {
    expect(subjectTotalsOf("TYT")).toEqual({ Türkçe: 40, Matematik: 40, Fen: 20, Sosyal: 20 });
    expect(trackSubjects("YKS")).toEqual(["Türkçe", "Matematik", "Fen", "Sosyal"]);
  });

  it("şık sayısı: YKS 5, LGS 4", () => {
    expect(optionCountOf("YKS")).toBe(5);
    expect(optionCountOf("LGS")).toBe(4);
  });
});

describe("net hesabı", () => {
  it("LGS'de 3 yanlış 1 doğruyu götürür", () => {
    expect(netFor("LGS", 15, 3)).toBe(14);
    expect(calculateTopicResult({ subject: "Matematik", topic: "Üslü İfadeler", questionCount: 10, correct: 7, wrong: 3, blank: 0 }, "LGS").net).toBe(6);
  });

  it("YKS'de (ve sınav verilmezse) 4 yanlış 1 doğruyu götürür", () => {
    expect(netFor("TYT", 15, 4)).toBe(14);
    expect(netFor(undefined, 15, 4)).toBe(14);
    expect(calculateTopicResult({ subject: "Matematik", topic: "Problemler", questionCount: 10, correct: 7, wrong: 3, blank: 0 }).net).toBe(6.25);
  });
});

describe("tahmini LGS puanı", () => {
  it("hiç net yoksa 100, tam netle 500", () => {
    expect(estimateLgsScore({})).toBe(100);
    expect(estimateLgsScore(subjectTotalsOf("LGS"))).toBe(500);
  });

  it("Türkçe/Mat/Fen 4 kat ağırlıklı; ders üst sınırı ve eksi net kırpılır", () => {
    const turkce = estimateLgsScore({ Türkçe: 10 });
    const ingilizce = estimateLgsScore({ İngilizce: 10 });
    // Puanlar 2 haneye yuvarlanır: ingilizce farkının 4 katı ±0,04 içinde olmalı.
    expect(Math.abs(turkce - 100 - (ingilizce - 100) * 4)).toBeLessThan(0.05);
    expect(estimateLgsScore({ Türkçe: 99 })).toBe(estimateLgsScore({ Türkçe: 20 }));
    expect(estimateLgsScore({ Türkçe: -5 })).toBe(100);
  });
});

describe("LGS müfredatı", () => {
  const lgs = CURRICULUM.filter((def) => def.exam === "LGS");

  it("6 dersin hepsinde konu var ve slug'lar tekil", () => {
    expect(new Set(lgs.map((def) => def.subject))).toEqual(new Set(trackSubjects("LGS")));
    const slugs = CURRICULUM.map((def) => def.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(lgs.every((def) => def.slug.startsWith("cur-lgs-"))).toBe(true);
  });

  it("deneme şablonu müfredatın tüm LGS konularını S=0 ile, oturum sırasıyla verir", () => {
    const rows = buildLgsTemplateTopicDetails();
    expect(rows).toHaveLength(lgs.length);
    expect(rows.every((row) => row.questionCount === 0 && row.correct === 0)).toBe(true);
    expect(rows[0].subject).toBe("Türkçe");
    expect(rows[rows.length - 1].subject).toBe("Fen Bilimleri");
  });
});

describe("LGS takvimi ve yıllık plan", () => {
  it("yıllık plan LGS öğrencisinde LGS gününde biter", () => {
    const now = new Date("2026-10-21T10:00:00+03:00");
    const end = nextExamEnd(now, 2027, "LGS");
    expect(end.year).toBe(2027);
    expect(end.estimated).toBe(true);
    expect(end.endsAt.toISOString()).toBe(new Date("2027-06-13T23:59:59.999+03:00").toISOString());
    expect(planPeriodEnd("yearly", now, 2027, "LGS").getTime()).toBe(end.endsAt.getTime());
    expect(planPeriodEnd("yearly", now, 2027, "YKS").getTime()).toBeGreaterThan(end.endsAt.getTime());
  });
});

describe("benzer soru: LGS 4 şıklı", () => {
  const base = { question: "Soru", steps: [], hint: "" };
  it("LGS'de tam 4 şık ve A–D cevabı kabul edilir", () => {
    expect(parseSimilarQuestion({ ...base, options: ["1", "2", "3", "4"], answer: "D" }, 4)?.options).toHaveLength(4);
    expect(parseSimilarQuestion({ ...base, options: ["1", "2", "3", "4"], answer: "E" }, 4)).toBeNull();
    expect(parseSimilarQuestion({ ...base, options: ["1", "2", "3"], answer: "A" }, 4)).toBeNull();
  });
  it("YKS'de hâlâ 5 şık istenir", () => {
    expect(parseSimilarQuestion({ ...base, options: ["1", "2", "3", "4"], answer: "A" })).toBeNull();
  });
});

describe("ders programı: LGS dersleri", () => {
  it("8. sınıf ders adlarını LGS derslerine eşler", () => {
    expect(classifyLesson("DİN KÜLTÜRÜ VE AHLAK BİLGİSİ", "LGS")).toEqual({ known: true, subject: "Din Kültürü" });
    expect(classifyLesson("İNGİLİZCE", "LGS")).toEqual({ known: true, subject: "İngilizce" });
    expect(classifyLesson("T.C. İNKILAP TARİHİ VE ATATÜRKÇÜLÜK", "LGS")).toEqual({ known: true, subject: "İnkılap Tarihi" });
    expect(classifyLesson("FEN BİLİMLERİ", "LGS")).toEqual({ known: true, subject: "Fen Bilimleri" });
    expect(classifyLesson("TEKNOLOJİ VE TASARIM", "LGS")).toEqual({ known: true, subject: null });
  });
  it("YKS'de din kültürü hâlâ plan dışı", () => {
    expect(classifyLesson("DİN KÜLTÜRÜ VE AHLAK BİLGİSİ")).toEqual({ known: true, subject: null });
  });
});
