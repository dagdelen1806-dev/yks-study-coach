import { describe, expect, it } from "vitest";
import { normalizePublisherName } from "./normalizers/publisherNormalizer";

describe("PublisherNormalizer", () => {
  it("bilinen kısaltma ve yazım varyasyonlarını aynı canonical yayıncıya eşler", () => {
    const variants = ["3D YAYINLARI", "3D Yayınları", "3D", "3D Yayinlari"];
    const results = variants.map((v) => normalizePublisherName(v));
    const uniqueNormalized = new Set(results.map((r) => r.normalizedName));
    const uniqueCanonical = new Set(results.map((r) => r.canonicalName));
    expect(uniqueNormalized.size).toBe(1);
    expect(uniqueCanonical.size).toBe(1);
    expect(results[0].canonicalName).toBe("3D Yayınları");
  });

  it("alias tablosunda olmayan yayıncılar için deterministik title-case üretir", () => {
    const a = normalizePublisherName("bilinmeyen yayinevi");
    const b = normalizePublisherName("Bilinmeyen Yayinevi");
    expect(a.normalizedName).toBe(b.normalizedName);
    expect(a.slug).toBe(b.slug);
  });

  it("slug URL güvenlidir", () => {
    const result = normalizePublisherName("ÜçDörtBeş");
    expect(result.slug).toMatch(/^[a-z0-9-]+$/);
  });
});
