import { describe, expect, it } from "vitest";
import { detectDuplicate, type ExistingBookForDedupe } from "./duplicateDetector";

const existing: ExistingBookForDedupe[] = [
  { id: 1, isbn: "9789750000001", publisherId: 10, name: "TYT Matematik Soru Bankası", editionYear: 2025 },
  { id: 2, isbn: null, publisherId: 10, name: "TYT Matematik Soru Bankası", editionYear: 2026 },
  { id: 3, isbn: null, publisherId: 10, name: "TYT Matematik Soru Bankası Ekstra Set", editionYear: null },
  { id: 4, isbn: null, publisherId: 20, name: "TYT Matematik Soru Bankası", editionYear: null },
];

describe("DuplicateDetector", () => {
  it("ISBN eşleşmesini en yüksek güvenle (tier 1) bulur", () => {
    const match = detectDuplicate({ isbn: "978-975-0000-00-1", name: "Farklı ad", publisherId: 999, editionYear: null }, existing);
    expect(match).toMatchObject({ bookId: 1, tier: "isbn", confidence: 1 });
  });

  it("aynı yayıncı + ad + baskı yılı eşleşiyorsa normalized_identity ile yüksek güven döner", () => {
    const match = detectDuplicate({ isbn: null, name: "tyt matematik soru bankası", publisherId: 10, editionYear: 2025 }, existing);
    expect(match).toMatchObject({ bookId: 1, tier: "normalized_identity" });
    expect(match!.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it("aynı yayıncı + ad ama FARKLI baskı yılı: düşük güvenle işaretler, otomatik birleştirmeye izin vermez", () => {
    const match = detectDuplicate({ isbn: null, name: "TYT Matematik Soru Bankası", publisherId: 10, editionYear: 2027 }, existing);
    expect(match).not.toBeNull();
    expect(match!.confidence).toBeLessThan(0.75);
  });

  it("farklı yayıncıda aynı ad varsa eşleşme yayıncıya göre ayrı değerlendirilir", () => {
    const match = detectDuplicate({ isbn: null, name: "TYT Matematik Soru Bankası", publisherId: 20, editionYear: null }, existing);
    expect(match).toMatchObject({ bookId: 4, tier: "normalized_identity" });
  });

  it("bulanık eşleşme yalnızca aynı yayıncı içinde ve yüksek benzerlikte tetiklenir (küçük yazım farkı)", () => {
    // Tek karakterlik fark ("Ekstraa" vs "Ekstra") -> tam eşleşme tier'larına girmez, fuzzy'ye düşer.
    const match = detectDuplicate({ isbn: null, name: "TYT Matematik Soru Bankası Ekstraa Set", publisherId: 10, editionYear: null }, existing);
    expect(match).not.toBeNull();
    expect(match!.tier).toBe("fuzzy");
    expect(match!.confidence).toBeGreaterThanOrEqual(0.88);
  });

  it("hiçbir sinyal yoksa null döner (yeni kitap olarak kabul edilir)", () => {
    const match = detectDuplicate({ isbn: null, name: "Tamamen Farklı Bir Kitap", publisherId: 30, editionYear: null }, existing);
    expect(match).toBeNull();
  });
});
