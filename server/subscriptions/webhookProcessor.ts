import { assertValidSubscriptionTransition, type SubscriptionStatus } from "../../shared/subscriptionStateMachine";
import { planPeriodEnd, yksTermPrice } from "../../shared/yksCalendar";
import type { ExamTrack } from "../../shared/exams";
import {
  createPayment,
  ensureFreeSubscription,
  getPlanByCode,
  getStudentExamYearFor,
  getSubscriptionByUserId,
  isDuplicateEvent,
  markEventProcessed,
  recordEventReceived,
  updatePaymentStatus,
  updateSubscription,
  writeAuditLog,
} from "./subscriptionDb";
import { redactAndStringify } from "./webhookRedaction";

/**
 * Sağlayıcıdan bağımsız KANONİK event tipleri — her provider adapter'ı
 * kendi event isimlerini (ör. Apple'ın DID_RENEW'i, Google'ın
 * SUBSCRIPTION_RENEWED'i) bu isimlere çevirir (spec §44: "Provider-specific
 * errorları internal standard error modeline map et" ile aynı prensip,
 * event'ler için).
 */
export type CanonicalWebhookEventType =
  | "checkout.completed"
  | "subscription.renewed"
  | "subscription.payment_failed"
  | "subscription.grace_period_started"
  | "subscription.canceled"
  | "payment.refunded";

export type CanonicalWebhookPayload = {
  userId: number;
  planCode?: string;
  /** Aboneliğin sınavı; verilmezse plan kodunun sınavı (o da yoksa YKS). */
  track?: ExamTrack;
  /** Paket ödemesinde aynı ödemeye ait satırların ortak kimliği ve indirim nedeni (kayıt için). */
  checkoutId?: string;
  discountReason?: "bundle" | "addon" | null;
  amount?: number;
  currency?: string;
  providerSubscriptionId?: string;
  providerCustomerId?: string;
  providerPaymentId?: string;
  periodDays?: number;
  gracePeriodDays?: number;
  immediate?: boolean;
};

export type ProcessWebhookInput = {
  provider: string;
  eventId: string;
  eventType: string;
  payload: unknown;
  rawPayloadForAudit: unknown;
};

export type ProcessWebhookResult = { status: "processed" | "ignored" | "failed"; reason?: string };

/**
 * Tek giriş noktası — Express route (transport, imza doğrulama) bu
 * fonksiyonu çağırır. Idempotency + state transition + audit tek yerde.
 * Spec §17 adımları burada 3-9: duplicate kontrolü, transaction niyeti
 * (mysql2/Drizzle burada sarmalayıcı bir transaction API'si sunmuyor —
 * satırlar sırayla, hata durumunda `failed` işaretlenerek güncellenir;
 * gerçek bir ödeme sağlayıcısına bağlanırken bu adım Drizzle'ın
 * `db.transaction()` desteğiyle sarmalanmalı).
 */
export async function processWebhookEvent(input: ProcessWebhookInput): Promise<ProcessWebhookResult> {
  const alreadyProcessed = await isDuplicateEvent(input.provider, input.eventId);
  if (alreadyProcessed) {
    return { status: "ignored", reason: "Bu event daha önce işlendi (idempotency)" };
  }

  const eventRowId = await recordEventReceived({
    provider: input.provider,
    eventId: input.eventId,
    eventType: input.eventType,
    payload: redactAndStringify(input.rawPayloadForAudit),
  });

  try {
    await applyCanonicalEvent(input.eventType as CanonicalWebhookEventType, input.payload as CanonicalWebhookPayload);
    if (eventRowId) await markEventProcessed(eventRowId, "processed");
    return { status: "processed" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (eventRowId) await markEventProcessed(eventRowId, "failed", message);
    return { status: "failed", reason: message };
  }
}

async function applyCanonicalEvent(eventType: CanonicalWebhookEventType, payload: CanonicalWebhookPayload): Promise<void> {
  if (!payload?.userId) throw new Error("payload.userId eksik");

  switch (eventType) {
    case "checkout.completed":
      return handleCheckoutCompleted(payload);
    case "subscription.renewed":
      return handleSubscriptionRenewed(payload);
    case "subscription.payment_failed":
      return handlePaymentFailed(payload);
    case "subscription.grace_period_started":
      return handleGracePeriodStarted(payload);
    case "subscription.canceled":
      return handleSubscriptionCanceled(payload);
    case "payment.refunded":
      return handleRefund(payload);
    default:
      throw new Error(`Bilinmeyen event tipi: ${eventType}`);
  }
}

/**
 * Tahsil edilecek tutar: aylık plan kayıtlı fiyatından; yıllık ("sınavına kadar") plan öğrencinin
 * sınavına kalan süreye göre (shared/yksCalendar.ts yksTermPrice) — ödeme ekranında gösterilenle aynı hesap.
 */
/** Olayın sınavı: payload'da açıkça varsa o, yoksa plan kodunun sınavı, o da yoksa YKS. */
async function trackOfEvent(payload: CanonicalWebhookPayload, plan?: { track: ExamTrack | null } | undefined): Promise<ExamTrack> {
  if (payload.track) return payload.track;
  if (plan?.track) return plan.track;
  if (payload.planCode) { const byCode = await getPlanByCode(payload.planCode); if (byCode?.track) return byCode.track; }
  return "YKS";
}

async function chargeAmountFor(plan: { code: string; billingPeriod: string; price: number }, now: Date, examYear: number | null, track: ExamTrack): Promise<number> {
  if (plan.billingPeriod !== "yearly") return plan.price;
  const monthly = await getPlanByCode(plan.code.replace(/_YEARLY$/, "_MONTHLY"));
  return monthly ? yksTermPrice({ monthlyPrice: monthly.price, now, examYear, track }).price : plan.price;
}

async function handleCheckoutCompleted(payload: CanonicalWebhookPayload): Promise<void> {
  if (!payload.planCode) throw new Error("payload.planCode eksik");
  const plan = await getPlanByCode(payload.planCode);
  if (!plan) throw new Error(`Plan bulunamadı: ${payload.planCode}`);

  // Bu, kullanıcının aboneliğine dokunan İLK olay olabilir (yeni kullanıcı) —
  // önce satırın var olduğundan emin ol (FREE olarak), sonra üstüne yaz.
  // `updateSubscription` yalnızca UPDATE yapar, INSERT yapmaz — satır yoksa
  // sessizce hiçbir şey değiştirmez.
  const track = await trackOfEvent(payload, plan);
  const existing = await ensureFreeSubscription(payload.userId, track);
  const now = new Date();
  // Yıllık plan o sınavın hedef yılının sonuna kadar sürer (shared/yksCalendar.ts); sağlayıcı süreyi açıkça verdiyse o geçerli.
  const examYear = await getStudentExamYearFor(payload.userId, track);
  const periodEnd = payload.periodDays ? new Date(now.getTime() + payload.periodDays * 24 * 60 * 60 * 1000) : planPeriodEnd(plan.billingPeriod, now, examYear, track);

  // "trial yalnızca bir kez" (spec §11) — bu abonelik satırı DAHA ÖNCE hiç
  // trialStartedAt almadıysa VE plan trialDays>0 ise trialing'e girer;
  // aksi halde doğrudan active.
  const eligibleForTrial = plan.trialDays > 0 && !existing?.trialStartedAt;
  const nextStatus: SubscriptionStatus = eligibleForTrial ? "trialing" : "active";
  const trialEndsAt = eligibleForTrial ? new Date(now.getTime() + plan.trialDays * 24 * 60 * 60 * 1000) : (existing?.trialEndsAt ?? null);

  if (existing) assertValidSubscriptionTransition(existing.status as SubscriptionStatus, nextStatus);

  const paymentId = await createPayment({
    userId: payload.userId,
    subscriptionId: existing?.id ?? null,
    provider: "web",
    providerPaymentId: payload.providerPaymentId ?? null,
    amount: payload.amount ?? await chargeAmountFor(plan, now, examYear, track),
    currency: payload.currency ?? plan.currency,
    status: eligibleForTrial ? "authorized" : "paid",
    paymentType: eligibleForTrial ? "trial_start" : "initial",
    paidAt: eligibleForTrial ? null : now,
    track,
    metadata: payload.checkoutId ? JSON.stringify({ checkoutId: payload.checkoutId, discountReason: payload.discountReason ?? null }) : null,
  });

  const oldState = existing ? { status: existing.status } : null;
  await updateSubscription(payload.userId, track, {
    planId: plan.id,
    status: nextStatus,
    trialStartedAt: eligibleForTrial ? now : existing?.trialStartedAt ?? null,
    trialEndsAt,
    currentPeriodStart: now,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: 0,
    canceledAt: null,
    provider: "web",
    providerSubscriptionId: payload.providerSubscriptionId ?? null,
    providerCustomerId: payload.providerCustomerId ?? null,
    latestPaymentId: paymentId,
  });
  await writeAuditLog({ userId: payload.userId, action: "checkout_completed", oldState, newState: { status: nextStatus, planCode: plan.code, track }, metadata: { paymentId, checkoutId: payload.checkoutId ?? null } });
}

async function handleSubscriptionRenewed(payload: CanonicalWebhookPayload): Promise<void> {
  const plan = await getPlanByCode(payload.planCode ?? "");
  const track = await trackOfEvent(payload, plan);
  const existing = await getSubscriptionByUserId(payload.userId, track);
  if (!existing) throw new Error("Yenilenecek abonelik bulunamadı");
  assertValidSubscriptionTransition(existing.status as SubscriptionStatus, "active");

  const now = new Date();
  const examYear = await getStudentExamYearFor(payload.userId, track);
  const periodEnd = payload.periodDays ? new Date(now.getTime() + payload.periodDays * 24 * 60 * 60 * 1000) : planPeriodEnd(plan?.billingPeriod ?? "monthly", now, examYear, track);

  const paymentId = await createPayment({ userId: payload.userId, subscriptionId: existing.id, provider: "web", providerPaymentId: payload.providerPaymentId ?? null, amount: payload.amount ?? (plan ? await chargeAmountFor(plan, now, examYear, track) : 0), currency: payload.currency ?? plan?.currency ?? "TRY", status: "paid", paymentType: "renewal", paidAt: now, track });

  await updateSubscription(payload.userId, track, { status: "active", currentPeriodStart: now, currentPeriodEnd: periodEnd, latestPaymentId: paymentId });
  await writeAuditLog({ userId: payload.userId, action: "subscription_renewed", oldState: { status: existing.status }, newState: { status: "active" }, metadata: { paymentId } });
}

async function handlePaymentFailed(payload: CanonicalWebhookPayload): Promise<void> {
  const track = await trackOfEvent(payload);
  const existing = await getSubscriptionByUserId(payload.userId, track);
  if (!existing) throw new Error("Abonelik bulunamadı");
  assertValidSubscriptionTransition(existing.status as SubscriptionStatus, "past_due");
  await updateSubscription(payload.userId, track, { status: "past_due" });
  await writeAuditLog({ userId: payload.userId, action: "payment_failed", oldState: { status: existing.status }, newState: { status: "past_due" } });
}

async function handleGracePeriodStarted(payload: CanonicalWebhookPayload): Promise<void> {
  const track = await trackOfEvent(payload);
  const existing = await getSubscriptionByUserId(payload.userId, track);
  if (!existing) throw new Error("Abonelik bulunamadı");
  assertValidSubscriptionTransition(existing.status as SubscriptionStatus, "grace_period");
  const days = payload.gracePeriodDays ?? 3;
  const gracePeriodEndsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  await updateSubscription(payload.userId, track, { status: "grace_period", gracePeriodEndsAt });
  await writeAuditLog({ userId: payload.userId, action: "grace_period_started", oldState: { status: existing.status }, newState: { status: "grace_period", gracePeriodEndsAt } });
}

async function handleSubscriptionCanceled(payload: CanonicalWebhookPayload): Promise<void> {
  const track = await trackOfEvent(payload);
  const existing = await getSubscriptionByUserId(payload.userId, track);
  if (!existing) throw new Error("Abonelik bulunamadı");
  const nextStatus: SubscriptionStatus = payload.immediate ? "canceled" : existing.status as SubscriptionStatus;
  if (payload.immediate) assertValidSubscriptionTransition(existing.status as SubscriptionStatus, "canceled");
  await updateSubscription(payload.userId, track, { status: nextStatus, cancelAtPeriodEnd: payload.immediate ? 0 : 1, canceledAt: new Date() });
  await writeAuditLog({ userId: payload.userId, action: "subscription_canceled", oldState: { status: existing.status }, newState: { status: nextStatus, cancelAtPeriodEnd: !payload.immediate } });
}

async function handleRefund(payload: CanonicalWebhookPayload): Promise<void> {
  const track = await trackOfEvent(payload);
  const existing = await getSubscriptionByUserId(payload.userId, track);
  if (!existing) throw new Error("Abonelik bulunamadı");
  if (existing.latestPaymentId) await updatePaymentStatus(existing.latestPaymentId, { status: "refunded", refundedAt: new Date() });
  assertValidSubscriptionTransition(existing.status as SubscriptionStatus, "canceled");
  await updateSubscription(payload.userId, track, { status: "canceled", canceledAt: new Date(), cancelAtPeriodEnd: 0 });
  await writeAuditLog({ userId: payload.userId, action: "payment_refunded", oldState: { status: existing.status }, newState: { status: "canceled" } });
}
