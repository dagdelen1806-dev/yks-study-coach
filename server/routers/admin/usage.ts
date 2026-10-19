import { z } from "zod";
import { adminProcedure, router } from "../../_core/trpc";
import { FEATURE_KEYS, USAGE_WINDOW_DAYS } from "../../../shared/entitlements";
import { getUsageSummaryForUser } from "../../subscriptions/entitlementService";
import { resetFeatureUsage } from "../../subscriptions/subscriptionDb";

export const adminUsageRouter = router({
  get: adminProcedure.input(z.object({ userId: z.number().int() })).query(({ input }) => getUsageSummaryForUser(input.userId)),

  reset: adminProcedure
    .input(z.object({ userId: z.number().int(), featureKey: z.enum(FEATURE_KEYS) }))
    .mutation(({ ctx, input }) => resetFeatureUsage(input.userId, input.featureKey, USAGE_WINDOW_DAYS, ctx.user.id)),
});
