import express, { type Express } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerDevAuthRoutes } from "./devAuth";
import { registerEmailVerificationRoutes } from "./emailVerification";
import { registerStorageProxy } from "./storageProxy";
import { registerWebhookRoutes } from "./webhooks";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { runResourceCatalogSyncOnce } from "../resourceCatalog/scheduler";
import { resourceCatalogConfig } from "../resourceCatalog/config";

/**
 * Builds the Express app with every API route mounted (tRPC, oauth,
 * dev-login, storage proxy, webhooks, cron) but never calls `.listen()` and
 * never wires the frontend (Vite dev middleware / static file serving).
 * Two very different entry points share this single builder so route
 * registration can never drift between them:
 *  - `server/_core/index.ts` — a traditional long-running host (local dev,
 *    Railway/Render/a VPS): adds Vite/static + `.listen()` on top.
 *  - `api/index.ts` — a Vercel serverless function: exports the app as-is;
 *    Vercel's CDN serves the built client (`dist/public`) separately.
 */
export function createApiApp(): Express {
  const app = express();
  // Webhook route BİLEREK global express.json()'dan ÖNCE kayıtlı — imza
  // doğrulaması ham body ister (bkz. webhooks.ts başlık yorumu).
  registerWebhookRoutes(app);
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  registerDevAuthRoutes(app);
  registerEmailVerificationRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // Sunucusuz (Vercel) barındırmada sürekli çalışan bir `setInterval`
  // kalıcı olamaz — bu yüzden kaynak kataloğu senkronu burada, bir Vercel
  // Cron Job'un tetiklediği bir HTTP uç noktası olarak sunuluyor (bkz.
  // vercel.json `crons`). Geleneksel/kalıcı barındırmada bu uç nokta hâlâ
  // var ama kullanılmıyor; oradaki senkron `startResourceCatalogScheduler`ın
  // kendi interval'ından geliyor.
  app.get("/api/cron/resource-catalog-sync", async (req, res) => {
    const secret = process.env.CRON_SECRET;
    if (secret && req.headers.authorization !== `Bearer ${secret}`) {
      res.status(401).json({ ok: false, error: "unauthorized" });
      return;
    }
    if (!resourceCatalogConfig.scheduler.enabled) {
      res.json({ ok: true, result: { disabled: true } });
      return;
    }
    try {
      const result = await runResourceCatalogSyncOnce();
      res.json({ ok: true, result });
    } catch (error) {
      res.status(500).json({ ok: false, error: error instanceof Error ? error.message : "unknown error" });
    }
  });

  return app;
}
