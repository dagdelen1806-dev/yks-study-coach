import { router } from "../../_core/trpc";
import { adminAnalyticsRouter } from "./analytics";
import { adminAuditRouter } from "./audit";
import { adminErrorsRouter } from "./errors";
import { adminPaymentsRouter } from "./payments";
import { adminSubscriptionsRouter } from "./subscriptions";
import { adminSystemRouter } from "./system";
import { adminTestimonialsRouter } from "./testimonials";
import { adminUsageRouter } from "./usage";
import { adminUsersRouter } from "./users";
import { adminOrgsRouter } from "../org";
import { adminQuotesRouter } from "./quotes";
import { adminSettingsRouter } from "./settings";
import { adminTopicsRouter } from "./topics";

/**
 * Admin Command Center (PHASE 3) — domain'e göre bölünmüş alt router'lar
 * (spec §47: "Tek bir devasa admin router oluşturmak yerine domain'e göre
 * böl."). Her alt router kendi dosyasında, her procedure `adminProcedure`
 * ile korunuyor (spec §1: `ctx.user.role` üzerinden — client'ın
 * `role: "admin"` göndermesiyle KENDİNİ admin yapması mümkün değil).
 */
export const adminRouter = router({
  users: adminUsersRouter,
  subscriptions: adminSubscriptionsRouter,
  usage: adminUsageRouter,
  analytics: adminAnalyticsRouter,
  audit: adminAuditRouter,
  payments: adminPaymentsRouter,
  system: adminSystemRouter,
  orgs: adminOrgsRouter,
  quotes: adminQuotesRouter,
  settings: adminSettingsRouter,
  topics: adminTopicsRouter,
  errors: adminErrorsRouter,
  testimonials: adminTestimonialsRouter,
});
