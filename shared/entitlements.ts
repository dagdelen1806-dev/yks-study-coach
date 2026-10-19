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

/**
 * Ücretli kademeler (Ekim 2026 kararı): Temel (basic) 249 TL, Premium 999 TL, Pro (premium_plus)
 * 2.499 TL aylık; her birinin %20 indirimli, YKS'ye kadar süren yıllık planı var
 * (server/subscriptions/seedPlans.ts). Kademeler arasındaki TEK fark kotalardır
 * (TIER_USAGE_LIMITS) — ücretli her kademede tüm özellikler açıktır.
 */
export type PlanTier = "free" | "basic" | "premium" | "premium_plus";
export type PaidTier = Exclude<PlanTier, "free">;
export const PAID_TIERS: readonly PaidTier[] = ["basic", "premium", "premium_plus"];
export const TIER_LABELS: Record<PlanTier, string> = { free: "Ücretsiz", basic: "Temel", premium: "Premium", premium_plus: "Pro" };

const ALL_PAID_FEATURES: FeatureKey[] = [...FEATURE_KEYS];

/** tier -> bu tier'ın erişebildiği özellik anahtarları. */
const TIER_FEATURES: Record<PlanTier, FeatureKey[]> = {
  free: [],
  basic: ALL_PAID_FEATURES,
  premium: ALL_PAID_FEATURES,
  premium_plus: ALL_PAID_FEATURES,
};

export function featuresForTier(tier: PlanTier): FeatureKey[] {
  return TIER_FEATURES[tier] ?? [];
}

export function tierHasFeature(tier: PlanTier, feature: FeatureKey): boolean {
  return featuresForTier(tier).includes(feature);
}

export type UsageLimit = { windowDays: number; maxUses: number };
type UsageLimits = Partial<Record<FeatureKey, UsageLimit>>;

/** Kotalar son 30 günde kullanılan sayıya göre işler (rolling window, spec §32). */
export const USAGE_WINDOW_DAYS = 30;
const per30 = (maxUses: number): UsageLimit => ({ windowDays: USAGE_WINDOW_DAYS, maxUses });

/** FREE kullanıcıların kısıtlı biçimde erişebildiği uçlar — spec §10: "sınırlı study sessions, sınırlı exam entry". */
export const FREE_TIER_LIMITS: UsageLimits = {
  AI_STUDY_PLAN: per30(3),
  OCR_EXAM_IMPORT: per30(2),
  OCR_BOOK_IMPORT: per30(3),
  // Defter herkesin temel aracı: ses → metin ücretsizde de makul ölçüde açık.
  NOTE_VOICE: per30(30),
  NOTE_OCR: per30(10),
  NOTE_AI: per30(5),
};

/**
 * Ücretli kademelerin kotaları (fiyatlandırma bunlara göre). Burada olmayan özellik o
 * kademede sınırsızdır. Premium'un değerleri tek kademeli dönemin Premium kotalarıdır.
 */
export const TIER_USAGE_LIMITS: Record<PaidTier, UsageLimits> = {
  basic: { AI_STUDY_PLAN: per30(8), OCR_EXAM_IMPORT: per30(8), OCR_BOOK_IMPORT: per30(8), NOTE_VOICE: per30(100), NOTE_OCR: per30(40), NOTE_AI: per30(30) },
  premium: { AI_STUDY_PLAN: per30(60), OCR_EXAM_IMPORT: per30(40), OCR_BOOK_IMPORT: per30(40), NOTE_VOICE: per30(300), NOTE_OCR: per30(150), NOTE_AI: per30(100) },
  premium_plus: { AI_STUDY_PLAN: per30(150), OCR_EXAM_IMPORT: per30(100), OCR_BOOK_IMPORT: per30(100), NOTE_VOICE: per30(1000), NOTE_OCR: per30(400), NOTE_AI: per30(300) },
};

/** Bir kademenin bir özellik için kotası; `undefined` = o kademede sınırsız (ya da ücretsizde hiç yok). */
export function usageLimitFor(tier: PlanTier, feature: FeatureKey): UsageLimit | undefined {
  return tier === "free" ? FREE_TIER_LIMITS[feature] : TIER_USAGE_LIMITS[tier][feature];
}
