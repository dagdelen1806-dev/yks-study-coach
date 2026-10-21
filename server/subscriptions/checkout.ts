import { randomUUID } from "node:crypto";
import { PAID_TIERS, type PaidTier } from "../../shared/entitlements";
import { EXAM_TRACKS, type ExamTrack } from "../../shared/exams";
import { quoteCheckout, type BillingPeriod, type CheckoutQuote, type QuoteItem } from "../../shared/checkoutQuote";
import { getEntitlements } from "./entitlementService";
import { getPlanByCode, getStudentExamYearFor, listActivePlans, listSubscriptionsForUser } from "./subscriptionDb";
import { processWebhookEvent } from "./webhookProcessor";

// Sınav başına abonelik ödemesi: tutar sunucuda hesaplanır (istemcinin gönderdiği fiyata güvenilmez).

/** Adayın ücretli ve geçerli (deneme dışı) aboneliği olan sınavları — branş indirimi için. */
export async function paidActiveTracks(userId: number): Promise<ExamTrack[]> {
  const rows = await listSubscriptionsForUser(userId);
  const tracks: ExamTrack[] = [];
  for (const row of rows) {
    const snapshot = await getEntitlements(userId, row.track);
    if (snapshot.isPremium && !snapshot.isTrial) tracks.push(row.track);
  }
  return tracks;
}

export async function quoteForUser(userId: number, items: QuoteItem[], now = new Date()): Promise<CheckoutQuote> {
  const [plans, activeTracks] = await Promise.all([listActivePlans(), paidActiveTracks(userId)]);
  const examYearByTrack: Partial<Record<ExamTrack, number | null>> = {};
  for (const item of items) examYearByTrack[item.track] = await getStudentExamYearFor(userId, item.track);
  return quoteCheckout({ items, plans: plans.map((plan) => ({ code: plan.code, track: plan.track, tier: plan.tier, billingPeriod: plan.billingPeriod, price: plan.price, currency: plan.currency })), activeTracks, examYearByTrack, now });
}

/** Eski tek plan kodlu istemciler için: plan kodundan sepet satırı. */
export async function itemFromPlanCode(planCode: string): Promise<QuoteItem> {
  const plan = await getPlanByCode(planCode);
  if (!plan || !plan.isActive || plan.tier === "free" || plan.billingPeriod === "none") throw new Error("Geçersiz veya pasif plan.");
  if (!(PAID_TIERS as readonly string[]).includes(plan.tier)) throw new Error("Geçersiz plan.");
  return { track: plan.track ?? "YKS", tier: plan.tier as PaidTier, period: plan.billingPeriod as BillingPeriod };
}

/**
 * Sandbox ödemesi (PAYMENT_PROVIDER=mock): sepetteki her sınav için gerçek sağlayıcının
 * göndereceği checkout.completed olayını, hesaplanan indirimli tutarla işler. Paketteki satırlar
 * ortak bir checkoutId taşır.
 */
export async function completeMockCheckoutForUser(userId: number, items: QuoteItem[]): Promise<{ quote: CheckoutQuote; checkoutId: string }> {
  const quote = await quoteForUser(userId, items);
  const checkoutId = randomUUID();
  for (const line of quote.lines) {
    const result = await processWebhookEvent({
      provider: "mock",
      eventId: `mock_manual_${userId}_${checkoutId}_${line.track}`,
      eventType: "checkout.completed",
      payload: { userId, planCode: line.planCode, track: line.track, amount: line.price, currency: line.currency, checkoutId, discountReason: line.discountReason },
      rawPayloadForAudit: { userId, planCode: line.planCode, track: line.track, amount: line.price, checkoutId, source: "completeMockCheckout" },
    });
    if (result.status === "failed") throw new Error(result.reason ?? "Sandbox ödemesi işlenemedi.");
  }
  return { quote, checkoutId };
}

export const quoteItemTracks = EXAM_TRACKS;
