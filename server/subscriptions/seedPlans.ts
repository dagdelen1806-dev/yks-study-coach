import { PAID_TIERS, TIER_LABELS, type PaidTier } from "../../shared/entitlements";
import { upsertPlan } from "./subscriptionDb";

// Fiyatlar kuruş cinsinden (minor unit) — kod içine ondalık gömmemek için
// (spec §31: "299, 2999 gibi fiyatlar gömme"). Şimdilik burada sabit
// tanımlı çünkü admin/config UI'ı henüz yok; ileride bir admin ekranından
// güncellenebilir hale gelmesi için `upsertPlan` zaten idempotent (spec
// §31: "Fiyatlar sonradan admin/config ile değiştirilebilir olsun").
//
// Ekim 2026: üç aylık kademe (kotalarına göre fiyatlandırılır, shared/entitlements.ts
// TIER_USAGE_LIMITS) ve her birinin "YKS'ye kadar" yıllık planı: bir sonraki YKS'nin sonuna
// kadar sürer, fiyatı alındığı gün sınava kalan sürenin aylık tutarının %20 eksiğidir
// (shared/yksCalendar.ts yksTermPrice). Buradaki `yearly` tutar 12 aylık TAVAN fiyattır.
// Her planda 10 gün deneme.
// PREMIUM_* kodları tek kademeli dönemden korunuyor (mevcut abonelikler bozulmasın).
export const PAID_PRICES: Record<PaidTier, { code: string; monthly: number; yearly: number }> = {
  basic: { code: "BASIC", monthly: 24900, yearly: 239900 },
  premium: { code: "PREMIUM", monthly: 99900, yearly: 959900 },
  premium_plus: { code: "PRO", monthly: 249900, yearly: 2399900 },
};

const TRIAL_DAYS = 10;

const DEFAULT_PLANS = [
  { code: "FREE", name: "Ücretsiz", description: "Temel çalışma takibi, konu haritası ve odak zamanlayıcı.", tier: "free" as const, billingPeriod: "none" as const, price: 0, trialDays: 0 },
  ...PAID_TIERS.flatMap((tier) => {
    const { code, monthly, yearly } = PAID_PRICES[tier];
    const label = TIER_LABELS[tier];
    return [
      { code: `${code}_MONTHLY`, name: `${label} (Aylık)`, description: `${label} kotalarıyla tüm özellikler, aylık.`, tier, billingPeriod: "monthly" as const, price: monthly, trialDays: TRIAL_DAYS },
      { code: `${code}_YEARLY`, name: `${label} (Yıllık)`, description: `${label} kotalarıyla tüm özellikler, YKS bitene kadar.`, tier, billingPeriod: "yearly" as const, price: yearly, trialDays: TRIAL_DAYS },
    ];
  }),
];

/** Idempotent — sunucu her açıldığında çağrılabilir, var olan planları çoğaltmaz. */
export async function seedSubscriptionPlans(): Promise<void> {
  for (const plan of DEFAULT_PLANS) {
    await upsertPlan(plan);
  }
}
