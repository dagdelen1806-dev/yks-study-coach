import { ENV } from "../../_core/env";
import { ProviderConfigRequiredError, type PaymentProvider, type CheckoutSession, type ProviderSubscriptionInfo, type VerifiedPurchase, type WebhookVerificationResult } from "./types";

/**
 * Apple App Store Server API adapter — ARCHITECTURE STUB (spec §14/§53).
 *
 * Gerçek bir implementasyon için gerekenler (henüz yok — CONFIG_REQUIRED):
 *  - App Store Connect'te bir Subscription Group + ürünler (Product ID'ler,
 *    `subscription_plans.storeProductId` alanına yazılır).
 *  - App Store Server API için bir private key (.p8), Key ID, Issuer ID
 *    (env: APPLE_IAP_KEY_ID, APPLE_IAP_ISSUER_ID, APPLE_IAP_PRIVATE_KEY,
 *    APPLE_IAP_BUNDLE_ID) — ES256 imzalı bir JWT üretip
 *    `https://api.storekit.itunes.apple.com` (prod) /
 *    `https://api.storekit-sandbox.itunes.apple.com` (sandbox) çağrılır.
 *  - `verifyPurchase`: client'tan gelen signed transaction'ı (JWS) App
 *    Store Server API `GET /inApps/v1/transactions/{id}` ile doğrular.
 *  - `handleWebhook`: App Store Server Notifications V2 — gelen `signedPayload`
 *    JWS'i Apple'ın kök sertifikasına kadar zincir doğrulamasıyla çözülür
 *    (basit bir HMAC değil, gerçek bir x5c sertifika zinciri doğrulaması).
 *  - `restorePurchase`: client "Restore Purchases" akışıyla StoreKit'ten
 *    aldığı transaction'ları aynı `verifyPurchase` ile tek tek doğrular.
 *
 * Bu dosya bilerek gerçek bir HTTP çağrısı YAPMAZ — sahte "başarılı ödeme"
 * üretmek yerine her method açıkça `ProviderConfigRequiredError` fırlatır.
 */
export class AppleAppStoreProvider implements PaymentProvider {
  readonly name = "apple" as const;

  private assertConfigured(method: string): never {
    throw new ProviderConfigRequiredError("apple", method);
  }

  async createCheckout(): Promise<CheckoutSession> {
    // Apple'da "checkout" kavramı yok — satın alma cihazda StoreKit ile
    // başlar, sunucu yalnızca doğrulama/webhook tarafında devreye girer.
    this.assertConfigured("createCheckout (StoreKit istemci tarafında başlatılır)");
  }

  async createSubscription(): Promise<ProviderSubscriptionInfo> {
    this.assertConfigured("createSubscription");
  }

  async cancelSubscription(): Promise<void> {
    // Apple'da iptal kullanıcı tarafından Ayarlar > Abonelikler'den yapılır;
    // sunucu yalnızca App Store Server API ile mevcut durumu SORGULAYABİLİR,
    // iptali TETİKLEYEMEZ.
    this.assertConfigured("cancelSubscription (Apple abonelikleri yalnızca kullanıcı tarafından iptal edilebilir)");
  }

  async restorePurchase(): Promise<VerifiedPurchase> {
    this.assertConfigured("restorePurchase");
  }

  async verifyPurchase(): Promise<VerifiedPurchase> {
    this.assertConfigured("verifyPurchase (App Store Server API JWT + transaction lookup gerekir)");
  }

  async handleWebhook(): Promise<WebhookVerificationResult> {
    this.assertConfigured("handleWebhook (App Store Server Notifications V2 JWS zincir doğrulaması gerekir)");
  }

  async refund(): Promise<void> {
    this.assertConfigured("refund (Apple'da refund App Store/Apple tarafından tetiklenir, sunucu yalnızca bildirimi dinler)");
  }

  async getSubscription(): Promise<ProviderSubscriptionInfo | null> {
    this.assertConfigured("getSubscription");
  }
}

/** Yapılandırma tamamlanmış mı — env değişkenleri set edilmiş mi? Gerçek implementasyon eklendiğinde bu, adapter'ı gerçekten kullanılabilir kılar. */
export function isAppleProviderConfigured(): boolean {
  return Boolean(ENV.appleIapKeyId && ENV.appleIapIssuerId && ENV.appleIapPrivateKey);
}
