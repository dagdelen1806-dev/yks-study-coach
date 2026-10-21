import type { PaidTier } from "./entitlements";
import { EXAM_TRACK_DEFS, type ExamTrack } from "./exams";
import { yksTermPrice } from "./yksCalendar";

// Sınav başına abonelik ve ödeme tutarı (Ekim 2026 kararı). Her sınavın ayrı aboneliği vardır;
//  - Paket: aynı ödemede 2 ya da daha fazla sınav alınırsa hepsine %20 indirim.
//  - Branş: ana sınava (KPSS) aktif aboneliği olan aday branşını (MEB-AGS, KPSS A grubu) sonradan
//    alırsa branş aboneliğine %20 indirim. İndirimler toplanmaz; en yükseği uygulanır.
// Hem ödeme ekranı hem tahsilat (sunucu) bu hesabı kullanır.

export const BUNDLE_DISCOUNT = 0.2;
export const ADDON_DISCOUNT = 0.2;

export type BillingPeriod = "monthly" | "yearly";
const TIER_CODES: Record<PaidTier, string> = { basic: "BASIC", premium: "PREMIUM", premium_plus: "PRO" };

/**
 * Plan kodu: YKS planları ilk dönemdeki kodlarını korur (BASIC_MONTHLY…), diğer sınavlar sınav
 * önekiyle (KPSS_BASIC_MONTHLY, MEB_AGS_PRO_YEARLY…).
 */
export const planCodeFor = (track: ExamTrack, tier: PaidTier, period: BillingPeriod): string =>
  `${track === "YKS" ? "" : `${track}_`}${TIER_CODES[tier]}_${period.toUpperCase()}`;

export type QuotePlan = { code: string; track: ExamTrack | null; tier: string; billingPeriod: string; price: number; currency: string };
export type QuoteItem = { track: ExamTrack; tier: PaidTier; period: BillingPeriod };
export type QuoteLine = {
  track: ExamTrack;
  planCode: string;
  /** İndirimsiz tutar (yıllıkta sınava kalan süreye göre, kuruş). */
  basePrice: number;
  discountRate: number;
  discountReason: "bundle" | "addon" | null;
  price: number;
  currency: string;
  /** Yıllık planın kaç aylık dönemi kapsadığı (aylıkta 1). */
  months: number;
};
export type CheckoutQuote = { lines: QuoteLine[]; total: number; currency: string; discountTotal: number };

export class QuoteError extends Error {}

/**
 * Ödeme tutarı. `activeTracks`: adayın şu an ücretli ve geçerli aboneliği olan sınavlar (branş
 * indirimi için). `examYearByTrack`: her sınavın hedef yılı (yıllık plan süresi ve fiyatı için).
 */
export function quoteCheckout(input: { items: QuoteItem[]; plans: QuotePlan[]; activeTracks: ExamTrack[]; examYearByTrack: Partial<Record<ExamTrack, number | null>>; now: Date }): CheckoutQuote {
  const tracks = input.items.map((item) => item.track);
  if (!input.items.length) throw new QuoteError("Sepet boş.");
  if (new Set(tracks).size !== tracks.length) throw new QuoteError("Aynı sınav sepette iki kez olamaz.");
  const bundle = input.items.length >= 2;
  const lines = input.items.map((item): QuoteLine => {
    const plan = input.plans.find((candidate) => candidate.code === planCodeFor(item.track, item.tier, item.period));
    if (!plan) throw new QuoteError("Bu plan şu an satışta değil.");
    let basePrice = plan.price;
    let months = 1;
    if (item.period === "yearly") {
      const monthly = input.plans.find((candidate) => candidate.code === planCodeFor(item.track, item.tier, "monthly"));
      if (monthly) {
        const term = yksTermPrice({ monthlyPrice: monthly.price, now: input.now, examYear: input.examYearByTrack[item.track] ?? null, track: item.track });
        basePrice = term.price;
        months = term.months;
      }
    }
    const parent = EXAM_TRACK_DEFS[item.track].addonOf;
    const addon = Boolean(parent && (input.activeTracks.includes(parent) || tracks.includes(parent)));
    const discountReason = bundle ? "bundle" : addon ? "addon" : null;
    const discountRate = discountReason === "bundle" ? BUNDLE_DISCOUNT : discountReason === "addon" ? ADDON_DISCOUNT : 0;
    // Tam lira (kuruşsuz) tutar: indirim yuvarlamada adayın aleyhine işlemez.
    const price = discountRate ? Math.floor((basePrice * (1 - discountRate)) / 100) * 100 : basePrice;
    return { track: item.track, planCode: plan.code, basePrice, discountRate, discountReason, price, currency: plan.currency, months };
  });
  const total = lines.reduce((sum, line) => sum + line.price, 0);
  return { lines, total, currency: lines[0].currency, discountTotal: lines.reduce((sum, line) => sum + (line.basePrice - line.price), 0) };
}
