import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getLiveCurriculum, getStudentProfile, getTopicCatalog, getUserTopicProgress, markTopicForReview, upsertTopicProgress } from "../db";
import { EXAM_KINDS, kindsOf } from "@shared/exams";

export const topicsRouter = router({
  catalog: publicProcedure.query(() => getTopicCatalog()),
  // Müfredat tabanlı deneme şablonu (LGS, KPSS, DGS, AGS): Yönetim Paneli'nde eklenen/yeniden adlandırılan konularla.
  curriculum: publicProcedure.query(() => getLiveCurriculum()),
  // Yalnızca öğrencinin sınavının konuları (sınav değiştiren öğrencinin eski verisi silinmez, gizlenir).
  progress: protectedProcedure.query(async ({ ctx }) => {
    const [progress, profile] = await Promise.all([getUserTopicProgress(ctx.user.id), getStudentProfile(ctx.user.id)]);
    const kinds = kindsOf(profile.examTrack);
    return progress.filter((topic) => kinds.includes(topic.exam));
  }),
  logResult: protectedProcedure
    .input(
      z.object({
        exam: z.enum(EXAM_KINDS),
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
    .input(z.object({ exam: z.enum(EXAM_KINDS), subject: z.string().min(1).max(80), topic: z.string().min(1).max(180), sessionId: z.number().int().positive().optional() }))
    .mutation(({ ctx, input }) => markTopicForReview(ctx.user.id, input)),
});
