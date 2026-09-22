import "dotenv/config";
import { createApiApp } from "./app";
import { seedSubscriptionPlans } from "../subscriptions/seedPlans";

// Genel güvenlik ağı: bu dosyanın import ettiği geniş modül grafiğinde
// (tRPC router'ları, kaynak kataloğu pipeline'ı, ödeme sağlayıcıları...)
// başka bir yerde unutulmuş, yakalanmamış bir promise reddi olursa, modern
// Node.js bunu süreci çökertecek şekilde ele alır — Vercel'de bu da HER
// isteği FUNCTION_INVOCATION_FAILED yapar (bkz. aşağıdaki seedSubscriptionPlans
// yorumu, tam olarak bu senaryoyu yaşadık). Süreç asla bu yüzden çökmesin
// diye sadece logluyoruz.
process.on("unhandledRejection", (reason) => {
  console.error("[vercelHandler] Yakalanmamış promise reddi:", reason);
});

/**
 * Vercel serverless entry point'in KAYNAK dosyası. Bu dosya doğrudan Vercel'e
 * deploy edilmez — build sırasında (`vercel.json` buildCommand, bkz.
 * package.json "build:vercel") esbuild ile TEK bir dosyaya paketlenip
 * `api/index.js` olarak üretilir. Sebep: Vercel'in kendi zero-config
 * TypeScript derleyicisi, `/api` dışındaki (`../server/...`) relative
 * import'ları ayrı dosyalar olarak bırakıyor ve Node'un native ESM
 * loader'ı (esbuild/tsx'in aksine) uzantısız/TS-aware çözümleme
 * yapamadığı için `ERR_MODULE_NOT_FOUND` ile çöküyor — canlıda böyle
 * çöktüğü doğrulandı. Kendi esbuild bundle'ımız bu sorunu ortadan kaldırır:
 * tüm proje kodu tek dosyaya gömülür, yalnızca gerçek npm paketleri
 * (`--packages=external`) dışarıda, Node'un normal node_modules
 * çözümlemesiyle bulunur.
 *
 * Vercel invokes an Express app's default export directly as a request
 * handler — no `.listen()`, no port. The built client (`dist/public`, see
 * vite.config.ts) is served separately by Vercel's static CDN per
 * `vercel.json`'s rewrites; this function only ever receives `/api/**` and
 * `/manus-storage/**` requests.
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
  console.error("[vercelHandler] seedSubscriptionPlans başarısız (DATABASE_URL kontrol et):", error);
});

export default app;
