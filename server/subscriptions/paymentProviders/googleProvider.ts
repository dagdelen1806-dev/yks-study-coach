import { ENV } from "../../_core/env";
import { ProviderConfigRequiredError, type PaymentProvider, type CheckoutSession, type ProviderSubscriptionInfo, type VerifiedPurchase, type WebhookVerificationResult } from "./types";

/**
 * Google Play Billing adapter — ARCHITECTURE STUB (spec §15/§53).
 *
 * Gerçek implementasyon için gerekenler (henüz yok — CONFIG_REQUIRED):
 *  - Google Play Console'da ürünler (subscription product ID'leri,
 *    `subscription_plans.storeProductId`).
 *  - Google Cloud service account (Play Developer API erişimi) — env:
 *    GOOGLE_PLAY_SERVICE_ACCOUNT_JSON, GOOGLE_PLAY_PACKAGE_NAME.
 *  - `verifyPurchase`: client'tan gelen `purchaseToken`'ı
 *    `androidpublisher.purchases.subscriptionsv2.get` ile sunucu tarafında doğrular.
 *  - Gerekiyorsa `purchases.subscriptions.acknowledge` ile satın alma
 *    onaylanır (acknowledge edilmezse Google 3 gün sonra otomatik iade eder).
 *  - `handleWebhook`: Real-time Developer Notifications (Pub/Sub) — gelen
 *    mesaj base64 `subscriptionNotification`/`voidedPurchaseNotification`
 *    içerir; Pub/Sub mesaj imzası (JWT, Google'ın public key'i) doğrulanır.
 *  - Grace period / account hold: Google'ın kendi `SubscriptionState`
 *    değerleri (`SUBSCRIPTION_STATE_IN_GRACE_PERIOD`,
 *    `SUBSCRIPTION_STATE_ON_HOLD`) `shared/subscriptionStateMachine.ts`
 *    durumlarına eşlenir.
 *
 * Bu dosya bilerek gerçek bir HTTP çağrısı YAPMAZ — her method açıkça
 * `ProviderConfigRequiredError` fırlatır.
 */
export class GooglePlayProvider implements PaymentProvider {
  readonly name = "google" as const;

  private assertConfigured(method: string): never {
    throw new ProviderConfigRequiredError("google", method);
  }

  async createCheckout(): Promise<CheckoutSession> {
    this.assertConfigured("createCheckout (Play Billing istemci tarafında başlatılır)");
  }

  async createSubscription(): Promise<ProviderSubscriptionInfo> {
    this.assertConfigured("createSubscription");
  }

  async cancelSubscription(): Promise<void> {
    this.assertConfigured("cancelSubscription");
  }

  async restorePurchase(): Promise<VerifiedPurchase> {
    this.assertConfigured("restorePurchase");
  }

  async verifyPurchase(): Promise<VerifiedPurchase> {
    this.assertConfigured("verifyPurchase (Play Developer API purchaseToken doğrulaması gerekir)");
  }

  async handleWebhook(): Promise<WebhookVerificationResult> {
    this.assertConfigured("handleWebhook (Real-time Developer Notifications / Pub/Sub doğrulaması gerekir)");
  }

  async refund(): Promise<void> {
    this.assertConfigured("refund");
  }

  async getSubscription(): Promise<ProviderSubscriptionInfo | null> {
    this.assertConfigured("getSubscription");
  }
}

export function isGoogleProviderConfigured(): boolean {
  return Boolean(ENV.googlePlayServiceAccountJson && ENV.googlePlayPackageName);
}
