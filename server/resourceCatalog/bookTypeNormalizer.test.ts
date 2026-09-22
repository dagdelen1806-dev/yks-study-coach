import { describe, expect, it } from "vitest";
import { normalizeBookType, normalizeExamScope } from "./normalizers/bookTypeNormalizer";

describe("BookTypeNormalizer", () => {
  it("soru bankası kategorisini question_bank olarak eşler", () => {
    expect(normalizeBookType("Soru Bankası / video çözümlü")).toBe("question_bank");
  });

  it("konu anlatımlı soru bankasını bileşik türe eşler (öncelik sırası doğru)", () => {
    expect(normalizeBookType("Konu Anlatımlı Soru Bankası")).toBe("topic_explanation_question_bank");
  });

  it("deneme setlerini mock_exam olarak eşler", () => {
    expect(normalizeBookType("Branş denemesi seti")).toBe("mock_exam");
  });

  it("tanınmayan kategori için other döner, uydurmaz", () => {
    expect(normalizeBookType("Kırtasiye Ürünü")).toBe("other");
    expect(normalizeBookType(undefined)).toBe("other");
  });
});

describe("ExamScopeNormalizer", () => {
  it("TYT ve AYT birlikte geçiyorsa TYT_AYT döner", () => {
    expect(normalizeExamScope("TYT-AYT Matematik")).toBe("TYT_AYT");
  });

  it("yalnızca TYT geçiyorsa TYT döner", () => {
    expect(normalizeExamScope("TYT Türkçe · Konu anlatımı / föy")).toBe("TYT");
  });

  it("yalnızca AYT geçiyorsa AYT döner", () => {
    expect(normalizeExamScope("AYT Biyoloji Soru Bankası")).toBe("AYT");
  });

  it("bilinmeyen/boş girişte GENEL döner", () => {
    expect(normalizeExamScope(undefined)).toBe("GENEL");
    expect(normalizeExamScope("Kırtasiye")).toBe("GENEL");
  });
});
