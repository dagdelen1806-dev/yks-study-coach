import type { RawExternalProduct } from "../types";

export type FetchPageResult = { products: RawExternalProduct[]; hasMore: boolean };

/**
 * Source-agnostic importer contract (spec §4/§49). Any future source
 * (a publisher feed, another bookstore, a manual CSV/JSON upload, an
 * affiliate feed, an official API) implements this same interface and the
 * pipeline never changes.
 */
export interface BookSourceAdapter {
  readonly name: string;
  /** Yields raw pages of products until the source is exhausted or `maxPages`/`maxProducts` is hit. */
  fetchPage(page: number): Promise<FetchPageResult>;
}
