import { z } from "zod";
import { adminProcedure, router } from "../../_core/trpc";
import { listTestimonialsForAdmin, reviewTestimonial } from "../../testimonials/testimonials";

export const adminTestimonialsRouter = router({
  list: adminProcedure.input(z.object({ status: z.enum(["pending", "approved", "rejected"]).default("pending") })).query(({ input }) => listTestimonialsForAdmin(input.status)),
  review: adminProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["approved", "rejected"]) })).mutation(async ({ ctx, input }) => {
    await reviewTestimonial(input.id, input.status, ctx.user.id);
    return { ok: true };
  }),
});
