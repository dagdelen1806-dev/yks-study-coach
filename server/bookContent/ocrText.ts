import { normalizeForComparison } from "../resourceCatalog/normalizers/turkishText";

/**
 * OCR metin yardımcıları. Ham OCR metni HİÇBİR ZAMAN değiştirilmez; karşılaştırma
 * ve eşleştirme `normalizeForComparison` ile ayrı bir normalize kopya üzerinden
 * yapılır (ç→c, ğ→g … yalnızca karşılaştırma için; kullanıcıya gösterilen metinde asla).
 */

export type PageNumberParse = { value: number | null; corrected: boolean; raw: string };

// Sayfa numarası bağlamında sık OCR karışıklıkları. Yalnızca kısa, rakam gibi
// görünen bir parçada uygulanır; harf içeren başlık metnine dokunulmaz.
const DIGIT_LOOKALIKES: Record<string, string> = { I: "1", l: "1", "|": "1", i: "1", "!": "1", O: "0", o: "0", D: "0", Z: "2", z: "2", S: "5", s: "5", B: "8", G: "6", b: "6", q: "9", g: "9" };

/**
 * "12" → 12; "I2", "l2", "1Z" → 12 (düzeltildi, doğrulama ister); "Sayfa (143)" → 143.
 * Emin olunamayan (harf yoğun, 4 haneden uzun, 0 veya 2000+) değerlerde null —
 * sayı uydurulmaz.
 */
export function parsePageNumber(raw: string | number | null | undefined): PageNumberParse {
  if (raw === null || raw === undefined) return { value: null, corrected: false, raw: "" };
  if (typeof raw === "number") return { value: Number.isInteger(raw) && raw > 0 && raw < 2000 ? raw : null, corrected: false, raw: String(raw) };
  const text = raw.trim();
  const inParens = /\(\s*([^)]{1,6})\s*\)/.exec(text)?.[1];
  const token = (inParens ?? text.split(/[\s.…·_-]+/).filter(Boolean).pop() ?? "").trim();
  if (!token || token.length > 4) return { value: null, corrected: false, raw: text };
  if (/^\d+$/.test(token)) { const value = Number(token); return { value: value > 0 && value < 2000 ? value : null, corrected: false, raw: text }; }
  const letters = token.replace(/\d/g, "");
  // En az bir gerçek rakam olsun ve harf sayısı rakamları geçmesin (ör. "IO" tek başına sayılmaz).
  if (!/\d/.test(token) || letters.length > token.length - letters.length) return { value: null, corrected: false, raw: text };
  const mapped = token.split("").map((char) => (/\d/.test(char) ? char : DIGIT_LOOKALIKES[char] ?? "?")).join("");
  if (!/^\d+$/.test(mapped)) return { value: null, corrected: false, raw: text };
  const value = Number(mapped);
  return { value: value > 0 && value < 2000 ? value : null, corrected: true, raw: text };
}

/** Başlığın sonunda noktalı lider + sayfa numarası kalmışsa ayırır: "Paragrafta Anlatım ...... 12". */
export function splitTrailingPage(title: string): { title: string; pageText: string | null } {
  const match = /^(.*?)[\s.…·_]{3,}\s*\(?\s*([0-9IlOoZS|]{1,4})\s*\)?\s*$/.exec(title);
  if (!match || !/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(match[1])) return { title, pageText: null };
  return { title: match[1].trim(), pageText: match[2] };
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    previous = current;
  }
  return previous[b.length];
}

/** 0–1 benzerlik (normalize edilmiş metin üzerinde; Türkçe karakter farkı eşleşmeyi bozmaz). */
export function textSimilarity(a: string, b: string): number {
  const left = normalizeForComparison(a), right = normalizeForComparison(b);
  if (!left && !right) return 1;
  return 1 - levenshtein(left, right) / Math.max(left.length, right.length, 1);
}

const TURKISH_LETTERS = /[A-Za-zÇĞİÖŞÜçğıöşüÂâÎîÛû]/;
const TURKISH_SPECIFIC = /[ÇĞİÖŞÜçğıöşü]/g;
const VOWELS = /[AEIİOÖUÜaeıioöuüâîû]/;

/**
 * Türkçe metin olarak makullük (0–1): harf oranı, kelimelerde ünlü bulunması,
 * anlamsız sembol yokluğu. OCR çöpünü ("P@r@gr|ft@", "lll11") düşük puanlar.
 */
export function turkishPlausibility(text: string): number {
  const compact = text.replace(/\s+/g, "");
  if (!compact) return 0;
  const letters = compact.split("").filter((char) => TURKISH_LETTERS.test(char)).length;
  const digits = compact.split("").filter((char) => /\d/.test(char)).length;
  const symbols = compact.length - letters - digits - (compact.match(/[.,;:()'’\-–—/&]/g)?.length ?? 0);
  const words = text.split(/\s+/).filter((word) => word.replace(/[^A-Za-zÇĞİÖŞÜçğıöşü]/g, "").length >= 2);
  const wordsWithVowel = words.filter((word) => VOWELS.test(word)).length;
  const letterRatio = letters / Math.max(1, compact.length - digits);
  const vowelRatio = words.length ? wordsWithVowel / words.length : 0.5;
  return Math.max(0, Math.min(1, 0.6 * letterRatio + 0.4 * vowelRatio - 0.15 * Math.max(0, symbols)));
}

/** Aynı kelimenin iki okunuşu arasında Türkçe karakterli olanı tercih etmek için. */
export const turkishCharCount = (text: string) => text.match(TURKISH_SPECIFIC)?.length ?? 0;

/** Karakter hata oranı (CER) ve kelime hata oranı (WER) — benchmark için. Normalize edilmemiş metin üzerinde. */
export function characterErrorRate(reference: string, hypothesis: string): number {
  return levenshtein(reference, hypothesis) / Math.max(1, reference.length);
}

export function wordErrorRate(reference: string, hypothesis: string): number {
  const ref = reference.split(/\s+/).filter(Boolean), hyp = hypothesis.split(/\s+/).filter(Boolean);
  let previous = Array.from({ length: hyp.length + 1 }, (_, index) => index);
  for (let i = 1; i <= ref.length; i++) {
    const current = [i];
    for (let j = 1; j <= hyp.length; j++) current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (ref[i - 1] === hyp[j - 1] ? 0 : 1));
    previous = current;
  }
  return previous[hyp.length] / Math.max(1, ref.length);
}
