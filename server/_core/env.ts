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
  // Mail sağlayıcısı: hangi anahtar tanımlıysa o kullanılır (ikisi birden varsa Brevo).
  brevoApiKey: process.env.BREVO_API_KEY ?? "",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  mailFrom: process.env.MAIL_FROM ?? "",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // Manus dışı deploy'da yapay zekâ (kitap/deneme fotoğrafı okuma, AI plan, not AI) için
  // OpenAI uyumlu herhangi bir sağlayıcı. Tanımlıysa Forge yerine bu kullanılır.
  //   LLM_API_KEY (ya da OPENAI_API_KEY) — zorunlu
  //   LLM_API_URL — varsayılan https://api.openai.com/v1
  //     (Gemini: https://generativelanguage.googleapis.com/v1beta/openai)
  //   LLM_MODEL — görsel okuyabilen bir model; varsayılan gpt-4o-mini
  llmApiKey: process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || "",
  llmApiUrl: (process.env.LLM_API_URL ?? "").replace(/\/+$/, ""),
  llmModel: process.env.LLM_MODEL ?? "",

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
