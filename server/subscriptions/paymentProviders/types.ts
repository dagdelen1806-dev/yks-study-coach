// Provider-agnostic payment abstraction (spec §13/§40). Subscription domain
// code (routers, entitlementService) only ever talks to this interface —
// never to a specific vendor's SDK/HTTP API directly.

export type CheckoutSession = { checkoutUrl: string; providerSessionId: string };

export type ProviderSubscriptionInfo = {
  providerSubscriptionId: string;
  providerCustomerId: string | null;
  status: "active" | "trialing" | "past_due" | "canceled" | "expired" | "grace_period";
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
};

export type VerifiedPurchase = { valid: boolean; providerSubscriptionId?: string; providerCustomerId?: string; reason?: string };

export type WebhookVerificationResult = { valid: boolean; eventId?: string; eventType?: string; payload?: unknown; reason?: string };

export interface PaymentProvider {
  readonly name: "web" | "apple" | "google";

  createCheckout(input: { userId: number; planCode: string; successUrl: string; cancelUrl: string }): Promise<CheckoutSession>;

  createSubscription(input: { userId: number; planCode: string; providerToken: string }): Promise<ProviderSubscriptionInfo>;

  cancelSubscription(providerSubscriptionId: string): Promise<void>;

  /** App Store/Play "restore purchases" veya web'de "mevcut ödemeyi tekrar doğrula". */
  restorePurchase(input: { userId: number; providerToken: string }): Promise<VerifiedPurchase>;

  /** Client'ın gönderdiği satın alma kanıtını (receipt/purchaseToken) SUNUCU TARAFINDA sağlayıcıya sorup doğrular — asla client'ın "ödedim" demesine güvenilmez. */
  verifyPurchase(providerToken: string): Promise<VerifiedPurchase>;

  /** Ham webhook isteğini (imza + body) doğrular; imza geçersizse `valid:false`. */
  handleWebhook(input: { rawBody: Buffer | string; headers: Record<string, string | string[] | undefined> }): Promise<WebhookVerificationResult>;

  refund(providerPaymentId: string): Promise<void>;

  getSubscription(providerSubscriptionId: string): Promise<ProviderSubscriptionInfo | null>;
}

export class ProviderConfigRequiredError extends Error {
  constructor(provider: string, method: string) {
    super(`CONFIG_REQUIRED: "${provider}" sağlayıcısı için "${method}" henüz gerçek credential'larla yapılandırılmadı — bkz. docs/subscription/SUBSCRIPTION-ARCHITECTURE.md`);
    this.name = "ProviderConfigRequiredError";
  }
}
