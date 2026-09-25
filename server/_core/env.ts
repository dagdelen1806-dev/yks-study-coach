export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  // Yerel ad+şifre girişi (server/_core/devAuth.ts) varsayılan olarak
  // yalnızca development'ta açık — gerçek Manus platformunda production'da
  // gerçek OAuth kullanılır diye tasarlandı. Ama Manus dışı bağımsız bir
  // deploy'da (Vercel, Railway, ...) gerçek OAuth hiç yapılandırılmaz —
  // bu durumda ALLOW_LOCAL_AUTH=true ile bunu bilerek production'da da
  // açabilirsin; kayıt olan her hesap yine de admin onayı bekler (bkz.
  // approvalStatus), yani rastgele biri kayıt olsa bile panele giremez.
  allowLocalAuth: process.env.ALLOW_LOCAL_AUTH === "true" || process.env.NODE_ENV !== "production",
  // Virgülle ayrılmış e-posta/telefon listesi (ör. "ben@ornek.com,05551234567").
  // Bu tanımlayıcılarla yerel girişte kayıt olan/giriş yapan hesap otomatik
  // admin + onaylı olur (bkz. server/_core/devAuth.ts).
  adminLogins: (process.env.ADMIN_LOGINS ?? "").split(",").map((value) => value.trim()).filter(Boolean),
  // E-posta doğrulaması (bkz. server/_core/mailer.ts, emailVerification.ts).
  // APP_URL: doğrulama linklerinin kök adresi (ör. https://yks-study-coach.vercel.app).
  // Production'da set edilmeli — yoksa istekteki Host başlığına düşülür.
  appUrl: (process.env.APP_URL ?? "").replace(/\/+$/, ""),
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  mailFrom: process.env.MAIL_FROM ?? "Pusula YKS <onboarding@resend.dev>",
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
