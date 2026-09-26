// Tek, merkezi özellik-erişim matrisi (spec §9: "Bu özellik matrisi tek bir
// yerde config-driven olsun. Component içine `if (plan === "premium")` gibi
// dağınık kontroller yazma."). Hem server (entitlementService/entitlementProcedure)
// hem client (useEntitlement/PremiumGate) buradan okur — tek kaynak.

export const FEATURE_KEYS = [
  "AI_STUDY_PLAN",
  "OCR_EXAM_IMPORT",
  "OCR_BOOK_IMPORT",
  "ADVANCED_ANALYTICS",
  "PLAN_ADHERENCE",
  "RESOURCE_RECOMMENDATIONS",
  "ADVANCED_REPORTS",
  "FOCUS_AURA_PREMIUM",
  "MOCK_EXAM_ANALYTICS",
  // Akıllı Defter: ses → metin, fotoğraftan metin, AI araçları (özet/flashcard...).
  "NOTE_VOICE",
  "NOTE_OCR",
  "NOTE_AI",
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

export type PlanTier = "free" | "premium" | "premium_plus";

/** tier -> bu tier'ın erişebildiği özellik anahtarları. Üst tier'lar alt tier'ların tüm özelliklerini kapsar (aşağıda otomatik birleştirilir). */
const TIER_FEATURES: Record<PlanTier, FeatureKey[]> = {
  free: [],
  premium: ["AI_STUDY_PLAN", "OCR_EXAM_IMPORT", "OCR_BOOK_IMPORT", "ADVANCED_ANALYTICS", "PLAN_ADHERENCE", "RESOURCE_RECOMMENDATIONS", "ADVANCED_REPORTS", "FOCUS_AURA_PREMIUM", "MOCK_EXAM_ANALYTICS", "NOTE_VOICE", "NOTE_OCR", "NOTE_AI"],
  premium_plus: ["AI_STUDY_PLAN", "OCR_EXAM_IMPORT", "OCR_BOOK_IMPORT", "ADVANCED_ANALYTICS", "PLAN_ADHERENCE", "RESOURCE_RECOMMENDATIONS", "ADVANCED_REPORTS", "FOCUS_AURA_PREMIUM", "MOCK_EXAM_ANALYTICS", "NOTE_VOICE", "NOTE_OCR", "NOTE_AI"],
};

export function featuresForTier(tier: PlanTier): FeatureKey[] {
  return TIER_FEATURES[tier] ?? [];
}

export function tierHasFeature(tier: PlanTier, feature: FeatureKey): boolean {
  return featuresForTier(tier).includes(feature);
}

/**
 * Maliyetli özellikler için rolling-window kullanım limitleri (spec §32).
 * `null` = sınırsız. Free kullanıcılar bu özelliklere sahip DEĞİL zaten
 * (yukarıdaki matriste yok), ama premium için de mantıksız/abuse'a açık
 * sınırsız kullanım istenmiyorsa buradan bir üst sınır konur.
 */
export const FEATURE_USAGE_LIMITS: Partial<Record<FeatureKey, { windowDays: number; maxUses: number }>> = {
  AI_STUDY_PLAN: { windowDays: 30, maxUses: 60 },
  OCR_EXAM_IMPORT: { windowDays: 30, maxUses: 40 },
  OCR_BOOK_IMPORT: { windowDays: 30, maxUses: 40 },
  NOTE_VOICE: { windowDays: 30, maxUses: 300 },
  NOTE_OCR: { windowDays: 30, maxUses: 150 },
  NOTE_AI: { windowDays: 30, maxUses: 100 },
};

/** FREE kullanıcıların kısıtlı biçimde erişebildiği (ama tam premium olmayan) uçlar için ayrı, daha düşük bir günlük/aylık limit — spec §10: "sınırlı study sessions, sınırlı exam entry". */
export const FREE_TIER_LIMITS: Partial<Record<FeatureKey, { windowDays: number; maxUses: number }>> = {
  AI_STUDY_PLAN: { windowDays: 30, maxUses: 3 },
  OCR_EXAM_IMPORT: { windowDays: 30, maxUses: 2 },
  OCR_BOOK_IMPORT: { windowDays: 30, maxUses: 3 },
  // Defter herkesin temel aracı: ses → metin ücretsizde de makul ölçüde açık.
  NOTE_VOICE: { windowDays: 30, maxUses: 30 },
  NOTE_OCR: { windowDays: 30, maxUses: 10 },
  NOTE_AI: { windowDays: 30, maxUses: 5 },
};
