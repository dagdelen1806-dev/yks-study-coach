// Kitap kimliği: mükerrer tespiti ve OCR'dan gelen ISBN'in doğrulanması.
// ISBN varsa en güçlü kimliktir; yoksa yayınevi + normalize edilmiş ad (+ yazar).

/** OCR çıktısındaki ISBN'i temizler ve sağlama toplamıyla doğrular; geçersizse null.
 * (OCR tek bir rakamı yanlış okuyabilir — doğrulanmamış ISBN kimlik olarak kullanılmaz.) */
export function normalizeIsbn(value: string | null | undefined): string | null {
  const compact = (value ?? "").toUpperCase().replace(/ISBN(-1[03])?:?/g, "").replace(/[^0-9X]/g, "");
  if (compact.length === 13 && /^\d{13}$/.test(compact)) {
    const sum = compact.split("").reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);
    return sum % 10 === 0 ? compact : null;
  }
  if (compact.length === 10 && /^\d{9}[\dX]$/.test(compact)) {
    const sum = compact.split("").reduce((total, char, index) => total + (char === "X" ? 10 : Number(char)) * (10 - index), 0);
    if (sum % 11 !== 0) return null;
    // ISBN-10 → ISBN-13 (978 önekiyle), tek biçimde karşılaştırmak için.
    const body = `978${compact.slice(0, 9)}`;
    const check = (10 - (body.split("").reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3), 0) % 10)) % 10;
    return `${body}${check}`;
  }
  return null;
}

/** Büyük/küçük harf, Türkçe karakter ve noktalama farkını yok sayan karşılaştırma metni. */
export const normalizeBookText = (value: string) =>
  value
    .replace(/İ/g, "i").replace(/I/g, "ı").toLowerCase()
    .replace(/[çğıöşüâîû]/g, (char) => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u" })[char] ?? char)
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export type BookIdentity = { title: string; publisher: string; authors?: string | null; isbn?: string | null };

/**
 * İki kitap aynı mı? ISBN ikisinde de geçerliyse yalnızca ona bakılır.
 * Değilse yayınevi + ad; ikisinde de yazar bilgisi varsa yazarlar da tutmalı.
 */
export function isSameBook(a: BookIdentity, b: BookIdentity): boolean {
  const isbnA = normalizeIsbn(a.isbn);
  const isbnB = normalizeIsbn(b.isbn);
  if (isbnA && isbnB) return isbnA === isbnB;
  if (normalizeBookText(a.title) !== normalizeBookText(b.title) || normalizeBookText(a.publisher) !== normalizeBookText(b.publisher)) return false;
  const authorsA = normalizeBookText(a.authors ?? "");
  const authorsB = normalizeBookText(b.authors ?? "");
  return !authorsA || !authorsB || authorsA === authorsB;
}
