import { z } from "zod";
import { adminProcedure, router } from "../../_core/trpc";
import { FEATURE_KEYS, USAGE_WINDOW_DAYS } from "../../../shared/entitlements";
import { getUsageSummaryForUser } from "../../subscriptions/entitlementService";
import { resetFeatureUsage } from "../../subscriptions/subscriptionDb";
import { EXAM_TRACKS } from "../../../shared/exams";

export const adminUsageRouter = router({
  get: adminProcedure.input(z.object({ userId: z.number().int(), track: z.enum(EXAM_TRACKS).default("YKS") })).query(({ input }) => getUsageSummaryForUser(input.userId, input.track)),

  reset: adminProcedure
    .input(z.object({ userId: z.number().int(), featureKey: z.enum(FEATURE_KEYS) }))
    .mutation(({ ctx, input }) => resetFeatureUsage(input.userId, input.featureKey, USAGE_WINDOW_DAYS, ctx.user.id)),
});
