import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { AFFIRMATION_MAX } from "../../shared/intentionJar";
import { checkRateLimit } from "../_core/rateLimit";
import { protectedProcedure, router } from "../_core/trpc";
import { getEffortGarden } from "../personal/gardenDb";
import { IntentionJarError, getIntentionJar, performRitual, setAffirmation } from "../personal/intentionJarDb";

async function userFacing<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof IntentionJarError) throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
    throw error;
  }
}

/**
 * Kişisel gelişim alanları (ücretsiz, yalnızca sahibine görünür; hiçbir kurum/veli/koç ucuna girmez):
 * Niyet Kavanozum = kendime verdiğim sözler; Emek Bahçem = gerçek akademik çalışmalarım.
 */
export const jarRouter = router({
  get: protectedProcedure.query(({ ctx }) => getIntentionJar(ctx.user.id)),
  setAffirmation: protectedProcedure
    .input(z.object({ text: z.string().max(AFFIRMATION_MAX + 50).nullable().optional(), presetKey: z.string().max(40).nullable().optional() }))
    .mutation(({ ctx, input }) => userFacing(() => setAffirmation(ctx.user.id, input))),
  ritual: protectedProcedure.input(z.object({ typed: z.string().max(AFFIRMATION_MAX + 50) })).mutation(({ ctx, input }) => userFacing(async () => {
    try {
      checkRateLimit(`jar-ritual:${ctx.user.id}`, 20, 60_000);
    } catch {
      throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Biraz yavaşla; bir dakika sonra tekrar dene." });
    }
    return performRitual(ctx.user.id, input.typed);
  })),
});

export const gardenRouter = router({
  get: protectedProcedure.query(({ ctx }) => getEffortGarden(ctx.user.id)),
});
