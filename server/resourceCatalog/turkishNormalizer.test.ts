import { describe, expect, it } from "vitest";
import { normalizeForComparison, normalizeKeepingTurkish, slugify, tokenize } from "./normalizers/turkishText";

describe("TurkishNormalizer", () => {
  it("İ/I harflerini Türkçe kurallarına göre küçültür", () => {
    expect(normalizeForComparison("İSTANBUL")).toBe("istanbul");
    expect(normalizeForComparison("IŞIK")).toBe("isik");
  });

  it("noktalama ve fazla boşlukları temizler", () => {
    expect(normalizeForComparison("3D  Yayınları!!!")).toBe("3d yayinlari");
  });

  it("Türkçe karakterleri korurken küçük harfe çevirir (normalizeKeepingTurkish)", () => {
    expect(normalizeKeepingTurkish("ZORUNLU Din Kültürü")).toBe("zorunlu din kültürü");
  });

  it("aynı normalize edilmiş anahtarı üretir: farklı yazımlar aynı sonuca gider", () => {
    const variants = ["3D YAYINLARI", "3D Yayınları", "3D Yayinlari"];
    const normalized = variants.map(normalizeForComparison);
    expect(new Set(normalized).size).toBe(1);
  });

  it("slugify deterministiktir ve URL güvenli çıktı üretir", () => {
    expect(slugify("TYT Matematik Soru Bankası!")).toBe("tyt-matematik-soru-bankasi");
    expect(slugify("TYT Matematik Soru Bankası!")).toBe(slugify("tyt matematik soru bankasi"));
  });

  it("tokenize kelime sınırlarına göre ayırır", () => {
    expect(tokenize("Zorunlu Din Kültürü")).toEqual(["zorunlu", "din", "kültürü"]);
  });
});
