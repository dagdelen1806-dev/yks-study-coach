import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import { approveCatalogBookClassification, listNeedsReviewBooks, listResourceCatalogSyncLogs, markCatalogBookNeedsReview, setManualDifficulty } from "../resourceCatalog/catalogDb";

/**
 * Admin-only Resource Catalog review surface (spec §19/§38). Everything
 * here is gated by `adminProcedure` (ctx.user.role === "admin"), the same
 * primitive already used elsewhere in the project — no new authz system.
 */
export const resourceCatalogAdminRouter = router({
  needsReview: adminProcedure.query(() => listNeedsReviewBooks()),
  syncLogs: adminProcedure.input(z.object({ limit: z.number().int().min(1).max(100).default(20) }).optional()).query(({ input }) => listResourceCatalogSyncLogs(input?.limit ?? 20)),
  approve: adminProcedure.input(z.object({ bookId: z.number().int() })).mutation(({ input }) => approveCatalogBookClassification(input.bookId)),
  setDifficulty: adminProcedure
    .input(z.object({ bookId: z.number().int(), label: z.enum(["easy", "medium", "hard"]), score: z.number().int().min(0).max(100) }))
    .mutation(({ input }) => setManualDifficulty(input.bookId, { label: input.label, score: input.score })),
  markNeedsReview: adminProcedure.input(z.object({ bookId: z.number().int(), needsReview: z.boolean() })).mutation(({ input }) => markCatalogBookNeedsReview(input.bookId, input.needsReview)),
});
