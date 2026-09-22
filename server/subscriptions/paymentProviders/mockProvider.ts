import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { ENV } from "../../_core/env";
import type { PaymentProvider, CheckoutSession, ProviderSubscriptionInfo, VerifiedPurchase, WebhookVerificationResult } from "./types";

// SANDBOX / TEST provider — NEVER real money. Used when
// `PAYMENT_PROVIDER=mock` (the default while no real provider is
// configured, spec §53: "FAKE PAYMENT SUCCESS uygulama" için değil, tersine
// gerçek webhook/idempotency/state-machine akışını GERÇEK bir imza
// doğrulaması ve iki-adımlı (checkout -> webhook) akışla test edebilmek
// için var. `createSubscription` kendi başına hiçbir şeyi aktive etmez —
// yalnızca bir "pending" checkout kaydı üretir; asıl aktivasyon, gerçek
// providerlarla birebir aynı şekilde, webhook (`handleWebhook`) üzerinden
// gelir. Bu yüzden production'da yanlışlıkla "her satın alma otomatik
// başarılı" davranışına DÖNÜŞMEZ — webhook tetiklenmeden entitlement değişmez.
function getMockSecret(): string {
  return ENV.paymentMockWebhookSecret || "mock-payment-secret-dev-only";
}

function sign(payload: string): string {
  return createHmac("sha256", getMockSecret()).update(payload).digest("hex");
}

export class MockPaymentProvider implements PaymentProvider {
  readonly name = "web" as const;

  async createCheckout(input: { userId: number; planCode: string; successUrl: string; cancelUrl: string }): Promise<CheckoutSession> {
    const providerSessionId = `mock_checkout_${randomUUID()}`;
    console.log(`[MockPaymentProvider] (SANDBOX, gerçek para YOK) checkout oluşturuldu: user=${input.userId} plan=${input.planCode} session=${providerSessionId}`);
    return { checkoutUrl: `${input.successUrl}?mock_session=${providerSessionId}`, providerSessionId };
  }

  async createSubscription(input: { userId: number; planCode: string; providerToken: string }): Promise<ProviderSubscriptionInfo> {
    const providerSubscriptionId = `mock_sub_${randomUUID()}`;
    const now = new Date();
    const periodEnd = new Date(now); periodEnd.setDate(periodEnd.getDate() + 30);
    console.log(`[MockPaymentProvider] (SANDBOX) subscription oluşturuldu: ${providerSubscriptionId} — gerçek aktivasyon yalnızca webhook geldiğinde olur.`);
    return { providerSubscriptionId, providerCustomerId: `mock_customer_${input.userId}`, status: "active", currentPeriodStart: now, currentPeriodEnd: periodEnd, cancelAtPeriodEnd: false };
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<void> {
    console.log(`[MockPaymentProvider] (SANDBOX) iptal edildi: ${providerSubscriptionId}`);
  }

  async restorePurchase(input: { userId: number; providerToken: string }): Promise<VerifiedPurchase> {
    if (!input.providerToken) return { valid: false, reason: "Boş token" };
    return { valid: true, providerSubscriptionId: input.providerToken, providerCustomerId: `mock_customer_${input.userId}` };
  }

  async verifyPurchase(providerToken: string): Promise<VerifiedPurchase> {
    if (!providerToken.startsWith("mock_")) return { valid: false, reason: "Tanınmayan sandbox token formatı" };
    return { valid: true, providerSubscriptionId: providerToken };
  }

  /** Test yardımcı fonksiyonu — gerçek bir sağlayıcı asla böyle bir "imzala" fonksiyonu sunmaz, yalnızca mock'a özgü. */
  signTestPayload(payload: string): string {
    return sign(payload);
  }

  async handleWebhook(input: { rawBody: Buffer | string; headers: Record<string, string | string[] | undefined> }): Promise<WebhookVerificationResult> {
    const raw = typeof input.rawBody === "string" ? input.rawBody : input.rawBody.toString("utf8");
    const signatureHeader = input.headers["x-mock-signature"];
    const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
    if (!signature) return { valid: false, reason: "İmza başlığı eksik (x-mock-signature)" };

    const expected = sign(raw);
    const signatureBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expected, "hex");
    if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
      return { valid: false, reason: "İmza doğrulanamadı" };
    }

    try {
      const payload = JSON.parse(raw) as { eventId?: string; eventType?: string };
      if (!payload.eventId || !payload.eventType) return { valid: false, reason: "eventId/eventType eksik" };
      return { valid: true, eventId: payload.eventId, eventType: payload.eventType, payload };
    } catch {
      return { valid: false, reason: "Geçersiz JSON payload" };
    }
  }

  async refund(providerPaymentId: string): Promise<void> {
    console.log(`[MockPaymentProvider] (SANDBOX) iade edildi: ${providerPaymentId}`);
  }

  async getSubscription(providerSubscriptionId: string): Promise<ProviderSubscriptionInfo | null> {
    if (!providerSubscriptionId.startsWith("mock_sub_")) return null;
    const now = new Date();
    const periodEnd = new Date(now); periodEnd.setDate(periodEnd.getDate() + 30);
    return { providerSubscriptionId, providerCustomerId: null, status: "active", currentPeriodStart: now, currentPeriodEnd: periodEnd, cancelAtPeriodEnd: false };
  }
}
