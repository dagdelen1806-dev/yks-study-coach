import { z } from "zod";
import { adminProcedure, router } from "../../_core/trpc";
import { listAllAuditLogs, listAuditLogsForUser } from "../../subscriptions/subscriptionDb";

export const adminAuditRouter = router({
  list: adminProcedure.input(z.object({ userId: z.number().int().optional(), limit: z.number().int().min(1).max(500).default(100) })).query(({ input }) => (input.userId ? listAuditLogsForUser(input.userId) : listAllAuditLogs(input.limit))),
});
