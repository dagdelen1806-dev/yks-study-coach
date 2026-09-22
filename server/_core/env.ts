export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",

  // --- Subscription / Payment (PHASE 2) — bkz. docs/subscription/SUBSCRIPTION-ARCHITECTURE.md ---
  // "mock" (sandbox, varsayılan) | "apple" | "google" | gerçek bir web sağlayıcısı seçildiğinde onun adı.
  paymentProvider: process.env.PAYMENT_PROVIDER ?? "mock",
  paymentMockWebhookSecret: process.env.PAYMENT_MOCK_WEBHOOK_SECRET ?? "",
  appleIapKeyId: process.env.APPLE_IAP_KEY_ID ?? "",
  appleIapIssuerId: process.env.APPLE_IAP_ISSUER_ID ?? "",
  appleIapPrivateKey: process.env.APPLE_IAP_PRIVATE_KEY ?? "",
  appleIapBundleId: process.env.APPLE_IAP_BUNDLE_ID ?? "",
  googlePlayServiceAccountJson: process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON ?? "",
  googlePlayPackageName: process.env.GOOGLE_PLAY_PACKAGE_NAME ?? "",
  webhookIngestSecret: process.env.WEBHOOK_INGEST_SECRET ?? "",
};
