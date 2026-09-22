import { adminProcedure, router } from "../../_core/trpc";
import { getAdminDashboardKpis } from "../../admin/analyticsService";

export const adminAnalyticsRouter = router({
  overview: adminProcedure.query(() => getAdminDashboardKpis()),
});
