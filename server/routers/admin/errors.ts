import { z } from "zod";
import { adminProcedure, router } from "../../_core/trpc";
import { listAppErrors, resolveAppError } from "../../errors/errorLog";

export const adminErrorsRouter = router({
  list: adminProcedure.input(z.object({ status: z.enum(["open", "resolved"]).default("open") })).query(({ input }) => listAppErrors(input.status)),
  resolve: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => resolveAppError(input.id)),
});
