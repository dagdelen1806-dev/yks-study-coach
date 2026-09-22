import { normalizeForComparison, slugify } from "./turkishText";

export type NormalizedPublisher = {
  canonicalName: string;
  slug: string;
  normalizedName: string;
};

/**
 * Known short-form / alternate-spelling aliases that do NOT collapse to the
 * same string under plain normalization (e.g. "3D" vs "3D Yayınları"). Keyed
 * by `normalizeForComparison(alias)`, valued by the canonical display name.
 *
 * This is intentionally a small, explicit, auditable table rather than fuzzy
 * matching — publisher identity drives which catalog a student sees, so a
 * wrong merge is worse than an extra publisher row waiting for an admin to
 * add an alias.
 */
const PUBLISHER_ALIASES: Record<string, string> = {
  "3d": "3D Yayınları",
  "3d yayinlari": "3D Yayınları",
  "ucdortbes": "ÜçDörtBeş",
  "345": "ÜçDörtBeş",
  "uc dort bes": "ÜçDörtBeş",
  "bilgi sarmal": "Bilgi Sarmal",
  "bilgi sarmal yayincilik": "Bilgi Sarmal",
  "pegem": "Pegem Akademi",
  "pegem akademi": "Pegem Akademi",
  "pegem yayincilik": "Pegem Akademi",
  "karekok": "Karekök",
  "karekok yayincilik": "Karekök",
  "paraf": "Paraf Yayınları",
  "paraf yayinlari": "Paraf Yayınları",
  "rasyonel": "Rasyonel Yayınları",
  "rasyonel yayinlari": "Rasyonel Yayınları",
  "aydin": "Aydın Yayınları",
  "aydin yayinlari": "Aydın Yayınları",
  "orijinal": "Orijinal Yayınları",
  "orijinal yayinlari": "Orijinal Yayınları",
  "hiz ve renk": "Hız ve Renk Yayınları",
  "hiz ve renk yayinlari": "Hız ve Renk Yayınları",
};

const suffixTitleCase = (value: string): string =>
  value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toLocaleUpperCase("tr-TR") + word.slice(1).toLocaleLowerCase("tr-TR"))
    .join(" ");

/**
 * Deterministic publisher identity resolution:
 * 1. Check the explicit alias table (handles short forms / known spellings).
 * 2. Otherwise fall back to a title-cased version of the normalized input —
 *    two raw strings that normalize identically (e.g. "3D YAYINLARI" and
 *    "3D Yayinlari") always resolve to the same canonical name, so they map
 *    to the same `publishers` row via the `normalizedName` index without
 *    ever needing an alias entry.
 */
export function normalizePublisherName(rawName: string): NormalizedPublisher {
  const trimmed = rawName.trim();
  const comparisonKey = normalizeForComparison(trimmed);
  const canonicalName = PUBLISHER_ALIASES[comparisonKey] ?? suffixTitleCase(trimmed);
  const normalizedName = normalizeForComparison(canonicalName);
  return {
    canonicalName,
    slug: slugify(canonicalName),
    normalizedName,
  };
}
