import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { RawExternalProduct } from "../types";
import type { BookSourceAdapter, FetchPageResult } from "./types";

type FixtureProduct = {
  id: string;
  title: string;
  publisher: string;
  subject: string;
  exam: "TYT" | "AYT";
  level: "Kolay" | "Orta" | "Zor";
  format: string;
  pageCount?: number;
  sourceUrl: string;
};

const DEFAULT_FIXTURE_PATH = fileURLToPath(new URL("../__fixtures__/kitapisler/sample-products.json", import.meta.url));

/**
 * Deterministic, offline source used by tests, `--dry-run` demos and local
 * development — never touches the network (spec §50: tests must not depend
 * on the live site). Seeded from the project's own pre-existing curated
 * `resourceBookCatalog` (real Kitapİşler/Kitapsec/publisher URLs already in
 * the repo), converted 1:1 into raw external-product shape.
 */
export class FixtureBookSource implements BookSourceAdapter {
  readonly name = "kitapisler-fixture";
  private products: RawExternalProduct[] | null = null;

  constructor(private readonly fixturePath: string = DEFAULT_FIXTURE_PATH) {}

  private load(): RawExternalProduct[] {
    if (this.products) return this.products;
    const raw = JSON.parse(readFileSync(this.fixturePath, "utf-8")) as FixtureProduct[];
    this.products = raw.map((item) => ({
      source: "kitapisler",
      sourceProductId: item.id,
      sourceUrl: item.sourceUrl,
      rawName: item.title,
      rawPublisher: item.publisher,
      rawCategory: `${item.format} · ${item.exam}`,
      rawIsbn: undefined,
      rawImageUrl: undefined,
      rawMetadata: { legacyLevel: item.level, subjectLabel: item.subject, examLabel: item.exam, pageCount: item.pageCount },
    }));
    return this.products;
  }

  async fetchPage(page: number): Promise<FetchPageResult> {
    const pageSize = 10;
    const all = this.load();
    const start = page * pageSize;
    const products = all.slice(start, start + pageSize);
    return { products, hasMore: start + pageSize < all.length };
  }
}
