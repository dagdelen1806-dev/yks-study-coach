import { z } from "zod";
import { TESTIMONIAL_LIMITS } from "../../shared/testimonials";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { deleteMyTestimonial, getMyTestimonial, listPublishedTestimonials, saveMyTestimonial } from "../testimonials/testimonials";

const testimonialInput = z.object({
  displayName: z.string().trim().min(2, "Görünecek adını yaz.").max(TESTIMONIAL_LIMITS.displayName),
  detail: z.string().trim().max(TESTIMONIAL_LIMITS.detail).optional(),
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().min(TESTIMONIAL_LIMITS.bodyMin, `Yorumun en az ${TESTIMONIAL_LIMITS.bodyMin} karakter olmalı.`).max(TESTIMONIAL_LIMITS.body),
});

/** Öğrenci yorumları: öğrenci yazar, admin onaylar (admin.testimonials), tanıtım sayfası onaylıları gösterir. */
export const testimonialsRouter = router({
  published: publicProcedure.query(() => listPublishedTestimonials()),
  mine: protectedProcedure.query(({ ctx }) => getMyTestimonial(ctx.user.id)),
  save: protectedProcedure.input(testimonialInput).mutation(({ ctx, input }) => saveMyTestimonial(ctx.user.id, { ...input, detail: input.detail || null })),
  remove: protectedProcedure.mutation(async ({ ctx }) => { await deleteMyTestimonial(ctx.user.id); return { ok: true }; }),
});
