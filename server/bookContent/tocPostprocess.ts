import { normalizeForComparison } from "../resourceCatalog/normalizers/turkishText";
import { parsePageNumber, splitTrailingPage } from "./ocrText";
import type { TocRawItem, TocRawPage } from "./tocParser";

/**
 * OCR satırlarının yapıya girmeden önceki temizliği. Ham okuma (rawText)
 * ayrıca saklanır; burada yalnızca YAPILANDIRILMIŞ içeriğe ne gireceğine karar verilir.
 */

export type BookContext = { title?: string | null; publisher?: string | null };
export type RemovedLine = { text: string; reason: "isbn" | "barcode" | "url" | "copyright" | "heading" | "publisher" | "book_title" | "repeated_header" | "decorative" };

const HEADING_WORDS = new Set(["icindekiler", "icerik", "icerikler", "kitap bitirme plani", "konular", "konu listesi", "konu takip cizelgesi", "sayfa", "test", "unite"]);

function noiseReason(item: TocRawItem, context: BookContext): RemovedLine["reason"] | null {
  const text = `${item.label ?? ""} ${item.title}`.trim();
  const normalized = normalizeForComparison(text);
  if (!normalized) return "decorative";
  if (/\bisbn\b/.test(normalized) || /\b97[89][\d\s-]{10,}/.test(text)) return "isbn";
  if (/\d{8,}/.test(text.replace(/[\s-]/g, "")) && !/[a-zçğıöşü]{3,}/i.test(text)) return "barcode";
  if (/(www\.|https?:\/\/|\.com\b|\.com\.tr\b|@)/i.test(text)) return "url";
  if (/©|\bcopyright\b|tum haklari|yayin hakki|baski\s*:|matbaa/.test(`${text} ${normalized}`.toLowerCase())) return "copyright";
  // Sayfanın kendi başlığı yapıya girmez (sayfa numarası olsa bile değil).
  if (HEADING_WORDS.has(normalized)) return "heading";
  if (context.publisher && normalizeForComparison(context.publisher) === normalized) return "publisher";
  if (context.title && item.type !== "unit" && normalizeForComparison(context.title) === normalized) return "book_title";
  if (!/[a-zçğıöşü]/i.test(text) && item.page === null) return "decorative";
  return null;
}

/**
 * Sayfa numarası: sağlayıcının ham metni deterministik olarak çözülür. OCR
 * karışıklığıyla düzeltilen ("I2" → 12) ya da okunamayan numara işaretlenir;
 * başlığın sonunda kalmış "...... 12" ayrılır. Hiçbir durumda numara uydurulmaz.
 */
export function repairPageNumbers(items: TocRawItem[]): TocRawItem[] {
  return items.map((item) => {
    if (item.type !== "entry") return item;
    let title = item.title;
    let pageText = item.pageText ?? null;
    if (!pageText && item.page === null) {
      const split = splitTrailingPage(title);
      if (split.pageText) { title = split.title; pageText = split.pageText; }
    }
    if (pageText === null || pageText === undefined) return { ...item, title, review: { ...item.review, page: item.review?.page || item.page === null } };
    const parsed = parsePageNumber(pageText);
    // Sağlayıcının tam sayısı ile ham metin çelişiyorsa ham metin esas alınır ve kontrol istenir.
    const conflict = item.page !== null && parsed.value !== null && parsed.value !== item.page;
    return { ...item, title, pageText, page: parsed.value ?? (parsed.raw ? null : item.page), review: { ...item.review, page: Boolean(item.review?.page) || parsed.corrected || parsed.value === null || conflict } };
  });
}

/**
 * Yanlış pozitif ve tekrar eden üst/alt bilgi temizliği. Birden çok sayfada
 * aynı (sayfa numarasız) satır tekrar ediyorsa (ör. "PARAGRAF SORU BANKASI")
 * bu bir üst/alt bilgidir; yapıya girmez.
 */
export function filterTocNoise(pages: TocRawPage[], context: BookContext = {}): { pages: TocRawPage[]; removed: RemovedLine[] } {
  const removed: RemovedLine[] = [];
  const repeated = new Set<string>();
  if (pages.length > 1) {
    const seen = new Map<string, number>();
    for (const page of pages) {
      const onPage = new Set(page.items.filter((item) => item.page === null && item.type !== "unit").map((item) => normalizeForComparison(`${item.label ?? ""} ${item.title}`)).filter(Boolean));
      for (const key of Array.from(onPage)) seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    for (const [key, count] of Array.from(seen.entries())) if (count >= 2) repeated.add(key);
  }
  const cleaned = pages.map((page) => ({
    ...page,
    items: page.items.filter((item) => {
      const reason = noiseReason(item, context) ?? (item.page === null && item.type !== "unit" && repeated.has(normalizeForComparison(`${item.label ?? ""} ${item.title}`)) ? "repeated_header" : null);
      if (reason) removed.push({ text: `${item.label ?? ""} ${item.title}`.trim(), reason });
      return !reason;
    }),
  }));
  return { pages: cleaned, removed };
}

/** Kullanıcıya/denetime gösterilecek ham satırlar (seçilen okumanın birebir metni). */
export function rawTextOf(page: TocRawPage): string {
  return page.items.map((item) => [item.type === "unit" && item.unitNumber !== null && !/ünite|unite/i.test(item.title) ? `${item.unitNumber}. ÜNİTE` : "", item.label ?? "", item.title, item.pageText ?? (item.page !== null ? String(item.page) : "")].filter(Boolean).join(" ")).join("\n");
}
