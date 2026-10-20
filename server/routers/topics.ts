import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getTopicCatalog, getUserTopicProgress, markTopicForReview, upsertTopicProgress } from "../db";

export const topicsRouter = router({
  catalog: publicProcedure.query(() => getTopicCatalog()),
  progress: protectedProcedure.query(({ ctx }) => getUserTopicProgress(ctx.user.id)),
  logResult: protectedProcedure
    .input(
      z.object({
        exam: z.enum(["TYT", "AYT"]),
        subject: z.string().min(1).max(80),
        topic: z.string().min(1).max(180),
        accuracy: z.number().min(0).max(100),
        questionCount: z.number().int().min(0).max(2000),
        studyDate: z.string().min(8).max(30),
      })
    )
    .mutation(({ ctx, input }) => upsertTopicProgress(ctx.user.id, { ...input, studyDate: new Date(input.studyDate) })),
  // Odak oturumu süresi dolmadan bırakıldı: konu tekrar gerektiren konulara eklenir.
  markForReview: protectedProcedure
    .input(z.object({ exam: z.enum(["TYT", "AYT"]), subject: z.string().min(1).max(80), topic: z.string().min(1).max(180) }))
    .mutation(({ ctx, input }) => markTopicForReview(ctx.user.id, input)),
});
