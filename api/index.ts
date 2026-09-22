import "dotenv/config";
import { createApiApp } from "../server/_core/app";
import { seedSubscriptionPlans } from "../server/subscriptions/seedPlans";

// Genel güvenlik ağı: bu dosyanın import ettiği geniş modül grafiğinde
// (tRPC router'ları, kaynak kataloğu pipeline'ı, ödeme sağlayıcıları...)
// başka bir yerde unutulmuş, yakalanmamış bir promise reddi olursa, modern
// Node.js bunu süreci çökertecek şekilde ele alır — Vercel'de bu da HER
// isteği FUNCTION_INVOCATION_FAILED yapar (bkz. aşağıdaki seedSubscriptionPlans
// yorumu, tam olarak bu senaryoyu yaşadık). Süreç asla bu yüzden çökmesin
// diye sadece logluyoruz.
process.on("unhandledRejection", (reason) => {
  console.error("[api/index] Yakalanmamış promise reddi:", reason);
});

/**
 * Vercel serverless entry point. Vercel invokes an Express app's default
 * export directly as a request handler — no `.listen()`, no port. The built
 * client (`dist/public`, see vite.config.ts) is served separately by
 * Vercel's static CDN per `vercel.json`'s rewrites; this function only ever
 * receives `/api/**` and `/manus-storage/**` requests.
 *
 * `seedSubscriptionPlans()` is idempotent (bkz. server/subscriptions/seedPlans.ts)
 * — running it again on every cold start is harmless, cheap, and simpler
 * than wiring a separate one-time migration step.
 *
 * KRİTİK: bu çağrı asla `await` edilmeden, hatası yakalanmadan bırakılmamalı.
 * Modern Node.js'te yakalanmamış bir promise reddi SÜRECİ ÇÖKERTİR — bu da
 * Vercel'de o andan sonraki HER isteği (route'undan bağımsız)
 * FUNCTION_INVOCATION_FAILED yapar. DATABASE_URL yanlış/erişilemez olduğunda
 * (ör. henüz bulut MySQL bağlanmadıysa) tam olarak bu senaryo tetiklenir —
 * bu yüzden hatayı burada mutlaka yakalayıp sadece logluyoruz, süreci asla
 * çökertmiyoruz.
 */
const app = createApiApp();
seedSubscriptionPlans().catch((error) => {
  console.error("[api/index] seedSubscriptionPlans başarısız (DATABASE_URL kontrol et):", error);
});

export default app;
