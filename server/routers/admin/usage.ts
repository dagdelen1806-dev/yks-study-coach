import { z } from "zod";
import { adminProcedure, router } from "../../_core/trpc";
import { FEATURE_KEYS, FEATURE_USAGE_LIMITS, FREE_TIER_LIMITS } from "../../../shared/entitlements";
import { getUsageSummaryForUser } from "../../subscriptions/entitlementService";
import { resetFeatureUsage } from "../../subscriptions/subscriptionDb";

export const adminUsageRouter = router({
  get: adminProcedure.input(z.object({ userId: z.number().int() })).query(({ input }) => getUsageSummaryForUser(input.userId)),

  reset: adminProcedure
    .input(z.object({ userId: z.number().int(), featureKey: z.enum(FEATURE_KEYS) }))
    .mutation(({ ctx, input }) => {
      const limit = FEATURE_USAGE_LIMITS[input.featureKey] ?? FREE_TIER_LIMITS[input.featureKey];
      const windowDays = limit?.windowDays ?? 30;
      return resetFeatureUsage(input.userId, input.featureKey, windowDays, ctx.user.id);
    }),
});
