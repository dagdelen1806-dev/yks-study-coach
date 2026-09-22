import { normalizeBookType, normalizeExamScope } from "../normalizers/bookTypeNormalizer";
import { normalizePublisherName } from "../normalizers/publisherNormalizer";
import { slugify } from "../normalizers/turkishText";
import type { NormalizedProduct, RawExternalProduct } from "../types";

/** VALIDATE having passed, turn a raw product into normalized (but not yet
 * persisted) canonical field values. Never writes to `catalog_books`. */
export function normalizeProduct(product: RawExternalProduct): NormalizedProduct {
  const publisher = product.rawPublisher ? normalizePublisherName(product.rawPublisher) : null;
  const metadata = product.rawMetadata ?? {};
  const subject = typeof metadata.subjectLabel === "string" ? metadata.subjectLabel : null;
  const examLabelSource = typeof metadata.examLabel === "string" ? metadata.examLabel : product.rawCategory;

  return {
    raw: product,
    name: product.rawName.trim().replace(/\s+/g, " "),
    publisherName: publisher?.canonicalName ?? null,
    publisherSlug: publisher?.slug ?? null,
    publisherNormalizedName: publisher?.normalizedName ?? null,
    isbn: product.rawIsbn ? product.rawIsbn.replace(/[^0-9Xx]/g, "").toUpperCase() || null : null,
    editionYear: typeof metadata.editionYear === "number" ? metadata.editionYear : null,
    description: product.rawDescription?.trim() || null,
    imageUrl: product.rawImageUrl ?? null,
    bookType: normalizeBookType(product.rawCategory),
    examScope: normalizeExamScope(examLabelSource ?? null),
    subject,
    price: typeof product.rawPrice === "number" ? product.rawPrice : null,
    currency: product.rawCurrency ?? "TRY",
  };
}

export function slugForBook(name: string, publisherName: string | null): string {
  const base = publisherName ? `${name} ${publisherName}` : name;
  return slugify(base);
}
