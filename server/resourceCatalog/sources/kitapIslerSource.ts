import { resourceCatalogConfig } from "../config";
import type { RawExternalProduct } from "../types";
import type { BookSourceAdapter, FetchPageResult } from "./types";

const BASE_URL = "https://www.kitapisler.com";
const DEFAULT_SEED_URL = `${BASE_URL}/YKS-Yuksekogretim-Kurum-Sinavi-1196`;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const decodeEntities = (value: string): string =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&uuml;/g, "ü")
    .replace(/&Uuml;/g, "Ü")
    .replace(/&ouml;/g, "ö")
    .replace(/&Ouml;/g, "Ö")
    .replace(/&ccedil;/g, "ç")
    .replace(/&Ccedil;/g, "Ç")
    .replace(/&scedil;|&#351;/g, "ş")
    .replace(/&#350;/g, "Ş")
    .replace(/&#287;/g, "ğ")
    .replace(/&#286;/g, "Ğ")
    .replace(/&#305;/g, "ı")
    .replace(/&#304;/g, "İ");

const parseTurkishPrice = (raw: string): number | undefined => {
  const normalized = raw.trim().replace(/\./g, "").replace(",", ".");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : undefined;
};

/**
 * Pluggable HTML -> product/category extraction, kept separate from the
 * HTTP/rate-limiting concerns below so it can be unit tested against saved
 * HTML fixtures without any network access.
 */
export interface ProductExtractor {
  extractProducts(html: string, categoryUrl: string, categoryTitle: string): RawExternalProduct[];
  extractCategoryLinks(html: string): Array<{ url: string; title: string }>;
}

// Selectors verified 2026-09-19 by fetching the real, unauthenticated server
// response for https://www.kitapisler.com/YKS-Yuksekogretim-Kurum-Sinavi-1196
// (no JavaScript execution needed — the product grid and the full category
// tree are both present in the plain HTML, contrary to an earlier session's
// assumption). See docs/resource-catalog/IMPORTER.md for the exact markup
// this was built against; re-verify these strings if the site's theme changes.
const PRODUCT_TITLE_PATTERN = /href="([^"]+_(\d+)\.html)"\s+title="([^"]+)"/;
const PUBLISHER_PATTERN = /class="dmarka"><a href="[^"]+" title="([^"]+)"/;
const IMAGE_PATTERN = /<img src="([^"]+)"/;
const CATEGORY_LINK_PATTERN = /class="top_cat(\d+)"><a href="(https:\/\/www\.kitapisler\.com\/[^"]+)" title="([^"]+)"/g;

// The sidebar category tree embedded on every page covers the *entire*
// site (KPSS/ALES/LGS/DGS/etc, not just YKS) — this keeps the crawl scoped
// to what the catalog is actually for.
const YKS_CATEGORY_KEYWORDS = ["tyt", "ayt", "yks"];
const isYksCategory = (title: string, url: string): boolean => {
  const haystack = `${title} ${url}`.toLocaleLowerCase("tr");
  return YKS_CATEGORY_KEYWORDS.some((keyword) => haystack.includes(keyword));
};

const SUBJECT_KEYWORDS: Array<{ subject: string; patterns: string[] }> = [
  { subject: "Türkçe", patterns: ["türkçe", "turkce"] },
  { subject: "Matematik", patterns: ["matematik"] },
  { subject: "Fizik", patterns: ["fizik"] },
  { subject: "Kimya", patterns: ["kimya"] },
  { subject: "Biyoloji", patterns: ["biyoloji"] },
  { subject: "Tarih", patterns: ["tarih"] },
  { subject: "Coğrafya", patterns: ["coğrafya", "cografya"] },
  { subject: "Felsefe", patterns: ["felsefe"] },
  { subject: "Din Kültürü", patterns: ["din kültür", "din kultur"] },
  { subject: "Edebiyat", patterns: ["edebiyat"] },
  { subject: "Sosyal", patterns: ["sosyal bilim"] },
  { subject: "Fen", patterns: ["fen bilim"] },
];
const inferSubjectFromTitle = (title: string): string | undefined => {
  const normalized = title.toLocaleLowerCase("tr");
  return SUBJECT_KEYWORDS.find((entry) => entry.patterns.some((pattern) => normalized.includes(pattern)))?.subject;
};

export class HeuristicHtmlExtractor implements ProductExtractor {
  extractProducts(html: string, categoryUrl: string, categoryTitle: string): RawExternalProduct[] {
    const products: RawExternalProduct[] = [];
    const chunks = html.split('<div class="listingProduct">').slice(1);
    const subjectLabel = inferSubjectFromTitle(categoryTitle);
    const seen = new Set<string>();

    for (const chunk of chunks) {
      const titleMatch = chunk.match(PRODUCT_TITLE_PATTERN);
      if (!titleMatch) continue;
      const [, hrefRaw, productId, rawTitle] = titleMatch;
      if (seen.has(productId)) continue;
      seen.add(productId);

      const publisherMatch = chunk.match(PUBLISHER_PATTERN);
      const imageMatch = chunk.match(IMAGE_PATTERN);
      const discountPriceMatch = chunk.match(new RegExp(`id="divdiscountprice${productId}"[^>]*>\\s*<span id="pric">([\\d.,]+)</span>`));
      const basePriceMatch = chunk.match(new RegExp(`id="divprice${productId}"><span id="pric">([\\d.,]+)</span>`));
      const priceMatch = discountPriceMatch ?? basePriceMatch;

      const url = hrefRaw.startsWith("http") ? hrefRaw : `${BASE_URL}/${hrefRaw}`;

      products.push({
        source: "kitapisler",
        sourceProductId: productId,
        sourceUrl: url,
        rawName: decodeEntities(rawTitle).trim(),
        rawPublisher: publisherMatch ? decodeEntities(publisherMatch[1]).trim() : undefined,
        rawCategory: categoryTitle || categoryUrl,
        rawImageUrl: imageMatch ? (imageMatch[1].startsWith("http") ? imageMatch[1] : `${BASE_URL}/${imageMatch[1].replace(/^\//, "")}`) : undefined,
        rawPrice: priceMatch ? parseTurkishPrice(priceMatch[1]) : undefined,
        rawCurrency: "TRY",
        rawMetadata: subjectLabel ? { subjectLabel, examLabel: categoryTitle } : { examLabel: categoryTitle },
      });
    }
    return products;
  }

  extractCategoryLinks(html: string): Array<{ url: string; title: string }> {
    const links: Array<{ url: string; title: string }> = [];
    const seen = new Set<string>();
    const pattern = new RegExp(CATEGORY_LINK_PATTERN.source, "g");
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(html))) {
      const [, id, url, rawTitle] = match;
      if (seen.has(id)) continue;
      seen.add(id);
      const title = decodeEntities(rawTitle).trim();
      if (isYksCategory(title, url)) links.push({ url, title });
    }
    return links;
  }
}

async function isCrawlingAllowed(): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/robots.txt`);
    if (!response.ok) return true; // No robots.txt -> default allow.
    const text = await response.text();
    const blanketDisallow = /User-agent:\s*\*[\s\S]*?Disallow:\s*\/\s*$/im.test(text);
    return !blanketDisallow;
  } catch {
    return true;
  }
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal, headers: { "User-Agent": "PusulaYKS-ResourceCatalogBot/1.0 (+https://github.com/)" } });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Kitapİşler adapter (spec §5/§29/§49). `robots.txt` allows unrestricted
 * crawling (checked 2026-09-19: `Allow: /`, no `Crawl-delay`). Breadth-first
 * crawls the site's own category tree starting from `seedUrls`, following
 * only TYT/AYT/YKS-labeled subcategories it discovers along the way — one
 * page fetch per category (no attempt to reverse-engineer the site's
 * infinite-scroll "load more" endpoint, so each category contributes its
 * first ~40 products; see OPERATIONS.md), with a fixed delay between
 * requests, a per-request timeout, retry with backoff, and hard
 * `maxPages`/`maxProducts` ceilings so a bug can't turn into an unbounded crawl.
 */
export class KitapIslerSource implements BookSourceAdapter {
  readonly name = "kitapisler";
  private queue: Array<{ url: string; title: string }>;
  private visited = new Set<string>();
  private productsSeen = 0;
  private robotsChecked = false;
  private robotsAllowed = true;

  constructor(
    seedUrls: string[] = [DEFAULT_SEED_URL],
    private readonly extractor: ProductExtractor = new HeuristicHtmlExtractor(),
    private readonly config = resourceCatalogConfig.importer
  ) {
    this.queue = seedUrls.map((url) => ({ url, title: "" }));
  }

  async fetchPage(page: number): Promise<FetchPageResult> {
    if (!this.robotsChecked) {
      this.robotsAllowed = await isCrawlingAllowed();
      this.robotsChecked = true;
    }
    if (!this.robotsAllowed) {
      console.warn("[ResourceCatalog] kitapisler.com robots.txt disallows crawling — aborting.");
      return { products: [], hasMore: false };
    }
    if (page >= this.config.maxPages || this.productsSeen >= this.config.maxProducts || this.queue.length === 0) {
      return { products: [], hasMore: false };
    }

    const next = this.queue.shift()!;
    if (this.visited.has(next.url)) return { products: [], hasMore: this.queue.length > 0 };
    this.visited.add(next.url);
    if (page > 0) await sleep(this.config.delayMs);

    let lastError: unknown;
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const response = await fetchWithTimeout(next.url, this.config.timeoutMs);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const html = await response.text();

        const products = this.extractor.extractProducts(html, next.url, next.title).slice(0, Math.max(0, this.config.maxProducts - this.productsSeen));
        this.productsSeen += products.length;

        for (const category of this.extractor.extractCategoryLinks(html)) {
          if (!this.visited.has(category.url) && !this.queue.some((entry) => entry.url === category.url)) {
            this.queue.push(category);
          }
        }

        return { products, hasMore: this.queue.length > 0 && this.productsSeen < this.config.maxProducts };
      } catch (error) {
        lastError = error;
        if (attempt < this.config.maxRetries) await sleep(this.config.delayMs * 2 ** attempt);
      }
    }
    console.warn(`[ResourceCatalog] kitapisler fetch failed for ${next.url}:`, lastError);
    return { products: [], hasMore: this.queue.length > 0 };
  }
}
