import { upsertPlan } from "./subscriptionDb";

// Fiyatlar kuruş cinsinden (minor unit) — kod içine ondalık gömmemek için
// (spec §31: "299, 2999 gibi fiyatlar gömme"). Şimdilik burada sabit
// tanımlı çünkü admin/config UI'ı henüz yok; ileride bir admin ekranından
// güncellenebilir hale gelmesi için `upsertPlan` zaten idempotent (spec
// §31: "Fiyatlar sonradan admin/config ile değiştirilebilir olsun").
const DEFAULT_PLANS = [
  { code: "FREE", name: "Ücretsiz", description: "Temel çalışma takibi, konu haritası ve odak zamanlayıcı.", tier: "free" as const, billingPeriod: "none" as const, price: 0, trialDays: 0 },
  { code: "PREMIUM_MONTHLY", name: "Premium (Aylık)", description: "AI çalışma planı, OCR deneme aktarımı, gelişmiş raporlar.", tier: "premium" as const, billingPeriod: "monthly" as const, price: 14900, trialDays: 10 },
  { code: "PREMIUM_YEARLY", name: "Premium (Yıllık)", description: "AI çalışma planı, OCR deneme aktarımı, gelişmiş raporlar — yıllık.", tier: "premium" as const, billingPeriod: "yearly" as const, price: 119900, trialDays: 10 },
];

/** Idempotent — sunucu her açıldığında çağrılabilir, var olan planları çoğaltmaz. */
export async function seedSubscriptionPlans(): Promise<void> {
  for (const plan of DEFAULT_PLANS) {
    await upsertPlan(plan);
  }
}
