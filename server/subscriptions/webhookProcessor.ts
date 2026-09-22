import { assertValidSubscriptionTransition, type SubscriptionStatus } from "../../shared/subscriptionStateMachine";
import {
  createPayment,
  ensureFreeSubscription,
  getPlanByCode,
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

async function handleCheckoutCompleted(payload: CanonicalWebhookPayload): Promise<void> {
  if (!payload.planCode) throw new Error("payload.planCode eksik");
  const plan = await getPlanByCode(payload.planCode);
  if (!plan) throw new Error(`Plan bulunamadı: ${payload.planCode}`);

  // Bu, kullanıcının aboneliğine dokunan İLK olay olabilir (yeni kullanıcı) —
  // önce satırın var olduğundan emin ol (FREE olarak), sonra üstüne yaz.
  // `updateSubscription` yalnızca UPDATE yapar, INSERT yapmaz — satır yoksa
  // sessizce hiçbir şey değiştirmez.
  const existing = await ensureFreeSubscription(payload.userId);
  const now = new Date();
  const periodDays = payload.periodDays ?? (plan.billingPeriod === "yearly" ? 365 : 30);
  const periodEnd = new Date(now.getTime() + periodDays * 24 * 60 * 60 * 1000);

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
    amount: payload.amount ?? plan.price,
    currency: payload.currency ?? plan.currency,
    status: eligibleForTrial ? "authorized" : "paid",
    paymentType: eligibleForTrial ? "trial_start" : "initial",
    paidAt: eligibleForTrial ? null : now,
  });

  const oldState = existing ? { status: existing.status } : null;
  await updateSubscription(payload.userId, {
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
  await writeAuditLog({ userId: payload.userId, action: "checkout_completed", oldState, newState: { status: nextStatus, planCode: plan.code }, metadata: { paymentId } });
}

async function handleSubscriptionRenewed(payload: CanonicalWebhookPayload): Promise<void> {
  const existing = await getSubscriptionByUserId(payload.userId);
  if (!existing) throw new Error("Yenilenecek abonelik bulunamadı");
  const plan = await getPlanByCode(payload.planCode ?? "");
  assertValidSubscriptionTransition(existing.status as SubscriptionStatus, "active");

  const periodDays = payload.periodDays ?? (plan?.billingPeriod === "yearly" ? 365 : 30);
  const now = new Date();
  const periodEnd = new Date(now.getTime() + periodDays * 24 * 60 * 60 * 1000);

  const paymentId = await createPayment({ userId: payload.userId, subscriptionId: existing.id, provider: "web", providerPaymentId: payload.providerPaymentId ?? null, amount: payload.amount ?? plan?.price ?? 0, currency: payload.currency ?? plan?.currency ?? "TRY", status: "paid", paymentType: "renewal", paidAt: now });

  await updateSubscription(payload.userId, { status: "active", currentPeriodStart: now, currentPeriodEnd: periodEnd, latestPaymentId: paymentId });
  await writeAuditLog({ userId: payload.userId, action: "subscription_renewed", oldState: { status: existing.status }, newState: { status: "active" }, metadata: { paymentId } });
}

async function handlePaymentFailed(payload: CanonicalWebhookPayload): Promise<void> {
  const existing = await getSubscriptionByUserId(payload.userId);
  if (!existing) throw new Error("Abonelik bulunamadı");
  assertValidSubscriptionTransition(existing.status as SubscriptionStatus, "past_due");
  await updateSubscription(payload.userId, { status: "past_due" });
  await writeAuditLog({ userId: payload.userId, action: "payment_failed", oldState: { status: existing.status }, newState: { status: "past_due" } });
}

async function handleGracePeriodStarted(payload: CanonicalWebhookPayload): Promise<void> {
  const existing = await getSubscriptionByUserId(payload.userId);
  if (!existing) throw new Error("Abonelik bulunamadı");
  assertValidSubscriptionTransition(existing.status as SubscriptionStatus, "grace_period");
  const days = payload.gracePeriodDays ?? 3;
  const gracePeriodEndsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  await updateSubscription(payload.userId, { status: "grace_period", gracePeriodEndsAt });
  await writeAuditLog({ userId: payload.userId, action: "grace_period_started", oldState: { status: existing.status }, newState: { status: "grace_period", gracePeriodEndsAt } });
}

async function handleSubscriptionCanceled(payload: CanonicalWebhookPayload): Promise<void> {
  const existing = await getSubscriptionByUserId(payload.userId);
  if (!existing) throw new Error("Abonelik bulunamadı");
  const nextStatus: SubscriptionStatus = payload.immediate ? "canceled" : existing.status as SubscriptionStatus;
  if (payload.immediate) assertValidSubscriptionTransition(existing.status as SubscriptionStatus, "canceled");
  await updateSubscription(payload.userId, { status: nextStatus, cancelAtPeriodEnd: payload.immediate ? 0 : 1, canceledAt: new Date() });
  await writeAuditLog({ userId: payload.userId, action: "subscription_canceled", oldState: { status: existing.status }, newState: { status: nextStatus, cancelAtPeriodEnd: !payload.immediate } });
}

async function handleRefund(payload: CanonicalWebhookPayload): Promise<void> {
  const existing = await getSubscriptionByUserId(payload.userId);
  if (!existing) throw new Error("Abonelik bulunamadı");
  if (existing.latestPaymentId) await updatePaymentStatus(existing.latestPaymentId, { status: "refunded", refundedAt: new Date() });
  assertValidSubscriptionTransition(existing.status as SubscriptionStatus, "canceled");
  await updateSubscription(payload.userId, { status: "canceled", canceledAt: new Date(), cancelAtPeriodEnd: 0 });
  await writeAuditLog({ userId: payload.userId, action: "payment_refunded", oldState: { status: existing.status }, newState: { status: "canceled" } });
}
