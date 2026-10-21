import { PAID_TIERS, TIER_LABELS, type PaidTier } from "../../shared/entitlements";
import { EXAM_TRACK_DEFS, EXAM_TRACKS } from "../../shared/exams";
import { planCodeFor } from "../../shared/checkoutQuote";
import { upsertPlan } from "./subscriptionDb";

// Fiyatlar kuruş cinsinden (minor unit). Her sınavın ayrı aboneliği vardır (Ekim 2026 kararı) ve
// başlangıçta hepsi aynı fiyatla açılır; fiyatlar yönetim panelinden (Fiyatlar) sınav başına
// değiştirilir. Bu yüzden seed yalnızca EKSİK planı oluşturur — var olan planın fiyatına ve satış
// durumuna dokunmaz (adı/açıklaması güncellenir).
//
// Üç aylık kademe (kotalarına göre, shared/entitlements.ts TIER_USAGE_LIMITS) ve her birinin
// "sınavına kadar" yıllık planı: fiyatı alındığı gün sınava kalan sürenin aylık tutarının %20
// eksiğidir (shared/yksCalendar.ts yksTermPrice). Buradaki `yearly` tutar 12 aylık TAVAN fiyattır.
// Her planda 10 gün deneme (sınav başına bir kez).
export const PAID_PRICES: Record<PaidTier, { monthly: number; yearly: number }> = {
  basic: { monthly: 24900, yearly: 239900 },
  premium: { monthly: 99900, yearly: 959900 },
  premium_plus: { monthly: 249900, yearly: 2399900 },
};

const TRIAL_DAYS = 10;

const DEFAULT_PLANS = [
  { code: "FREE", name: "Ücretsiz", description: "Temel çalışma takibi, konu haritası ve odak zamanlayıcı.", tier: "free" as const, track: null, billingPeriod: "none" as const, price: 0, trialDays: 0 },
  ...EXAM_TRACKS.flatMap((track) => PAID_TIERS.flatMap((tier) => {
    const { monthly, yearly } = PAID_PRICES[tier];
    const label = TIER_LABELS[tier];
    const exam = EXAM_TRACK_DEFS[track].label;
    return [
      { code: planCodeFor(track, tier, "monthly"), name: `${exam} ${label} (Aylık)`, description: `${exam} için ${label} kotalarıyla tüm özellikler, aylık.`, tier, track, billingPeriod: "monthly" as const, price: monthly, trialDays: TRIAL_DAYS },
      { code: planCodeFor(track, tier, "yearly"), name: `${exam} ${label} (Yıllık)`, description: `${exam} için ${label} kotalarıyla tüm özellikler, sınav bitene kadar.`, tier, track, billingPeriod: "yearly" as const, price: yearly, trialDays: TRIAL_DAYS },
    ];
  })),
];

/** Idempotent — sunucu her açıldığında çağrılabilir; eksik planı ekler, var olanın fiyatını korur. */
export async function seedSubscriptionPlans(): Promise<void> {
  for (const plan of DEFAULT_PLANS) {
    await upsertPlan(plan, { keepPrice: true });
  }
}
