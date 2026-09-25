import { describe, expect, it } from "vitest";
import { isSameBook, normalizeIsbn } from "../shared/bookIdentity";

describe("normalizeIsbn", () => {
  it("accepts valid ISBN-13 in any common spelling", () => {
    expect(normalizeIsbn("ISBN: 978-605-9118-68-2")).toBe("9786059118682");
    expect(normalizeIsbn("978 605 9118 68 2")).toBe("9786059118682");
  });

  it("converts a valid ISBN-10 to ISBN-13 so both spellings compare equal", () => {
    expect(normalizeIsbn("0-306-40615-2")).toBe("9780306406157");
  });

  it("rejects a digit misread by OCR (checksum fails) instead of trusting it", () => {
    expect(normalizeIsbn("978-605-9118-68-7")).toBeNull();
    expect(normalizeIsbn("")).toBeNull();
    expect(normalizeIsbn("THG 0684046 VPP")).toBeNull();
  });
});

describe("isSameBook", () => {
  const base = { title: "Paragraf Soru Bankası", publisher: "Bilgi Sarmal" };

  it("matches OCR spelling variants of the same book", () => {
    expect(isSameBook(base, { title: "PARAGRAF SORU BANKASI", publisher: "BİLGİ SARMAL" })).toBe(true);
    expect(isSameBook(base, { title: "Paragraf Soru Bankasi", publisher: "Bilgi Sarmal" })).toBe(true);
  });

  it("treats ISBN as the strongest identity when both books have one", () => {
    expect(isSameBook({ ...base, isbn: "9786059118682" }, { title: "Farklı okunmuş ad", publisher: "?", isbn: "978-605-9118-68-2" })).toBe(true);
    expect(isSameBook({ ...base, isbn: "9786059118682" }, { ...base, isbn: "9780306406157" })).toBe(false);
  });

  it("uses authors only when both sides have them", () => {
    expect(isSameBook({ ...base, authors: "Mehmet Durmaz" }, { ...base, authors: "Başka Yazar" })).toBe(false);
    expect(isSameBook({ ...base, authors: "Mehmet Durmaz" }, base)).toBe(true);
    expect(isSameBook(base, { title: "Paragraf Soru Bankası", publisher: "Başka Yayınevi" })).toBe(false);
  });
});
