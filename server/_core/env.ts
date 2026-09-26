export const ENV = {
  // Oturum çerezlerini imzalar (server/_core/session.ts) — production'da uzun, rastgele olmalı.
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  // Virgülle ayrılmış e-posta/telefon listesi (ör. "ben@ornek.com,05551234567").
  // Bu tanımlayıcılarla kayıt olan/giriş yapan hesap (e-postası doğrulanınca)
  // otomatik admin + onaylı olur (bkz. server/_core/localAuth.ts).
  adminLogins: (process.env.ADMIN_LOGINS ?? "").split(",").map((value) => value.trim()).filter(Boolean),
  // E-posta doğrulaması (bkz. server/_core/mailer.ts, emailVerification.ts).
  // APP_URL: doğrulama linklerinin kök adresi (ör. https://yks-study-coach.vercel.app).
  // Production'da set edilmeli — yoksa istekteki Host başlığına düşülür.
  appUrl: (process.env.APP_URL ?? "").replace(/\/+$/, ""),
  // Mail sağlayıcısı: hangi anahtar tanımlıysa o kullanılır (ikisi birden varsa Brevo).
  brevoApiKey: process.env.BREVO_API_KEY ?? "",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  mailFrom: process.env.MAIL_FROM ?? "",
  // Yapay zekâ (kitap/deneme fotoğrafı okuma, AI plan, not AI, ses → metin):
  // OpenAI uyumlu herhangi bir sağlayıcı (bkz. server/_core/llm.ts).
  //   LLM_API_KEY (ya da OPENAI_API_KEY) — zorunlu
  //   LLM_API_URL — varsayılan https://api.openai.com/v1
  //     (Gemini: https://generativelanguage.googleapis.com/v1beta/openai)
  //   LLM_MODEL — görsel okuyabilen bir model; varsayılan gpt-4o-mini
  //   TRANSCRIBE_MODEL — ses → metin modeli; varsayılan whisper-1 (Gemini'de yok)
  llmApiKey: process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || "",
  llmApiUrl: (process.env.LLM_API_URL ?? "").replace(/\/+$/, ""),
  llmModel: process.env.LLM_MODEL ?? "",
  transcribeModel: process.env.TRANSCRIBE_MODEL ?? "",

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
