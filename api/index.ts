import "dotenv/config";
import { createApiApp } from "../server/_core/app";
import { seedSubscriptionPlans } from "../server/subscriptions/seedPlans";

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
 */
const app = createApiApp();
void seedSubscriptionPlans();

export default app;
