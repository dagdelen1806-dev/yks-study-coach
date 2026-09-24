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
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

export type PlanTier = "free" | "premium" | "premium_plus";

/** tier -> bu tier'ın erişebildiği özellik anahtarları. Üst tier'lar alt tier'ların tüm özelliklerini kapsar (aşağıda otomatik birleştirilir). */
const TIER_FEATURES: Record<PlanTier, FeatureKey[]> = {
  free: [],
  premium: ["AI_STUDY_PLAN", "OCR_EXAM_IMPORT", "OCR_BOOK_IMPORT", "ADVANCED_ANALYTICS", "PLAN_ADHERENCE", "RESOURCE_RECOMMENDATIONS", "ADVANCED_REPORTS", "FOCUS_AURA_PREMIUM", "MOCK_EXAM_ANALYTICS"],
  premium_plus: ["AI_STUDY_PLAN", "OCR_EXAM_IMPORT", "OCR_BOOK_IMPORT", "ADVANCED_ANALYTICS", "PLAN_ADHERENCE", "RESOURCE_RECOMMENDATIONS", "ADVANCED_REPORTS", "FOCUS_AURA_PREMIUM", "MOCK_EXAM_ANALYTICS"],
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
};

/** FREE kullanıcıların kısıtlı biçimde erişebildiği (ama tam premium olmayan) uçlar için ayrı, daha düşük bir günlük/aylık limit — spec §10: "sınırlı study sessions, sınırlı exam entry". */
export const FREE_TIER_LIMITS: Partial<Record<FeatureKey, { windowDays: number; maxUses: number }>> = {
  AI_STUDY_PLAN: { windowDays: 30, maxUses: 3 },
  OCR_EXAM_IMPORT: { windowDays: 30, maxUses: 2 },
  OCR_BOOK_IMPORT: { windowDays: 30, maxUses: 3 },
};
