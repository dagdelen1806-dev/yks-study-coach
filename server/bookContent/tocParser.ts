import { normalizeForComparison } from "../resourceCatalog/normalizers/turkishText";

/**
 * OCR sağlayıcısının bir içindekiler sayfasından döndürdüğü satırlar. Sağlayıcı
 * yalnızca OKUR (metin + sayfa numarası); yapı çıkarma, içerik türü, sayfa
 * aralığı ve tutarlılık kontrolü burada, deterministik olarak yapılır.
 *  - unit:    "1. ÜNİTE — PARAGRAFTA ANLATIM" gibi numaralı ünite başlığı
 *  - section: numarasız grup başlığı ("SİMÜLASYON PARAGRAF DENEMELERİ") ya da
 *             ünite numarasının altındaki ayrı satırdaki ünite adı
 *  - entry:   sayfa numaralı bir satır ("Test 1  Paragrafta Anlatım ..... 9")
 */
export type TocRawItem = { type: "unit" | "section" | "entry"; unitNumber: number | null; title: string; label: string | null; page: number | null };
export type TocRawPage = { items: TocRawItem[] };

export type ContentType = "topic_test" | "osym_type" | "review" | "simulation" | "topic";

export type TocEntry = {
  order: number;
  unitNumber: number | null;
  unitTitle: string;
  contentType: ContentType;
  label: string;
  testNumber: number | null;
  title: string;
  pageStart: number | null;
  pageEnd: number | null;
  /** Müfredat eşleştirmesinde kullanılacak metin; karma içerikte (sarmal/simülasyon) null. */
  matchText: string | null;
};

export type TocParseResult = { entries: TocEntry[]; warnings: string[] };

const UNIT_ONLY = /^\d+\s*\.?\s*unite$/;

function classify(label: string | null, title: string): { contentType: ContentType; testNumber: number | null } {
  const text = normalizeForComparison(`${label ?? ""} ${label ? "" : title}`);
  const lastNumber = (() => { const all = text.match(/\d+/g); return all ? Number(all[all.length - 1]) : null; })();
  const testMatch = text.match(/^test\s*(\d+)/);
  if (testMatch) return { contentType: "topic_test", testNumber: Number(testMatch[1]) };
  if (text.includes("egitim kontrol") || text.startsWith("osym")) return { contentType: "osym_type", testNumber: lastNumber };
  if (text.includes("sarmal") || text.includes("karma") || text.includes("genel tekrar")) return { contentType: "review", testNumber: lastNumber };
  if (text.includes("simulasyon") || text.includes("deneme")) return { contentType: "simulation", testNumber: lastNumber };
  return { contentType: label ? "topic_test" : "topic", testNumber: lastNumber };
}

const cleanTitle = (value: string) => value.replace(/\s+/g, " ").replace(/^[\s\-–—:.]+|[\s\-–—:.]+$/g, "").trim();

/**
 * Sayfa sayfa okunan satırları tek bir içindekiler yapısına çevirir. Ünite bir
 * sayfada başlayıp sonrakinde devam edebilir (yeni başlık gelene kadar geçerli
 * ünite taşınır). Bitiş sayfası, bir sonraki içeriğin başlangıcından türetilir.
 */
export function parseTableOfContents(pages: TocRawPage[]): TocParseResult {
  const warnings: string[] = [];
  const entries: TocEntry[] = [];
  let unitNumber: number | null = null;
  let unitTitle = "";
  let awaitingUnitTitle = false;

  for (const page of pages) {
    for (const item of page.items) {
      const title = cleanTitle(item.title ?? "");
      if (item.type === "unit") {
        unitNumber = item.unitNumber;
        const normalized = normalizeForComparison(title);
        // "1. ÜNİTE" tek başına geldiyse ad bir sonraki "section" satırındadır.
        awaitingUnitTitle = !title || UNIT_ONLY.test(normalized);
        unitTitle = awaitingUnitTitle ? "" : title;
        continue;
      }
      if (item.type === "section") {
        const unitHasEntries = entries.some((entry) => entry.unitNumber === unitNumber && entry.unitTitle === unitTitle);
        if (awaitingUnitTitle) {
          unitTitle = title;
          awaitingUnitTitle = false;
        } else if (unitNumber !== null && !unitHasEntries) {
          // İki satıra bölünmüş ünite adı ("... ANLAMA -" / "YENİ NESİL ANLAM TESTLERİ").
          unitTitle = unitTitle ? `${unitTitle} ${title}` : title;
        } else {
          // İçerik başladıktan sonra gelen numarasız başlık = yeni bölüm (ör. simülasyonlar).
          unitNumber = null;
          unitTitle = title;
        }
        continue;
      }

      awaitingUnitTitle = false;
      const label = cleanTitle(item.label ?? "");
      const { contentType, testNumber } = classify(label || null, title);
      const isMixed = contentType === "review" || contentType === "simulation";
      entries.push({
        order: entries.length + 1,
        unitNumber,
        unitTitle,
        contentType,
        label: label || title,
        testNumber,
        title,
        pageStart: item.page ?? null,
        pageEnd: null,
        // Konu testi kendi başlığıyla, ÖSYM tipi/başlıksız satır ünite adıyla eşlenir.
        matchText: isMixed ? null : (contentType === "topic_test" && title ? title : unitTitle || title || null),
      });
    }
  }

  // Bitiş sayfası: sıradaki, daha büyük başlangıçlı içeriğin bir öncesi.
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index];
    if (entry.pageStart === null) {
      warnings.push(`"${entry.unitTitle} — ${entry.label}" satırında sayfa numarası okunamadı.`);
      continue;
    }
    const next = entries.slice(index + 1).find((candidate) => candidate.pageStart !== null);
    if (!next) continue;
    if (next.pageStart! < entry.pageStart) {
      warnings.push(`Sayfa sırası tutarsız: "${entry.label}" (${entry.pageStart}) sonrasında "${next.label}" (${next.pageStart}) geliyor. Fotoğrafı düz ve net çekip tekrar dener misin?`);
      continue;
    }
    entry.pageEnd = Math.max(entry.pageStart, next.pageStart! - 1);
  }

  return { entries, warnings };
}
