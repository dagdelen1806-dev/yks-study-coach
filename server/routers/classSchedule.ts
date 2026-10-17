import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { llmUnavailableMessage } from "../_core/llm";
import { metredFeatureProcedure, protectedProcedure, router } from "../_core/trpc";
import { ScheduleError, getClassSchedule, saveClassSchedule } from "../schedule/classScheduleDb";
import { readScheduleFromImage } from "../schedule/scheduleImport";
import { MAX_SCHEDULE_BLOCKS, MAX_SCHOOL_PERIODS, SCHEDULE_SOURCES, YKS_SUBJECTS } from "../../shared/classSchedule";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Saat SS:dd biçiminde olmalı.");

/** Ders programım: öğrencinin okul/dershane haftalık programı. Her uç ctx.user.id ile kapsamlı. */
export const classScheduleRouter = router({
  get: protectedProcedure.query(({ ctx }) => getClassSchedule(ctx.user.id)),
  save: protectedProcedure
    .input(z.object({
      periods: z.array(z.object({ start: time, end: time })).max(MAX_SCHOOL_PERIODS),
      blocks: z.array(z.object({
        source: z.enum(SCHEDULE_SOURCES),
        dayOfWeek: z.number().int().min(1).max(7),
        startTime: time,
        endTime: time,
        subject: z.enum(YKS_SUBJECTS).nullable(),
        label: z.string().max(80),
      })).max(MAX_SCHEDULE_BLOCKS),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await saveClassSchedule(ctx.user.id, input);
      } catch (error) {
        if (error instanceof ScheduleError) throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
        throw error;
      }
    }),
  // 📷 Fotoğraftan aktar: program okunur ama KAYDEDİLMEZ; düzenleyiciye dolar, öğrenci kontrol edip kaydeder.
  // Kota: fotoğraf okuma (NOTE_OCR); yalnızca başarılı okumada sayılır.
  importPhoto: metredFeatureProcedure("NOTE_OCR")
    .input(z.object({ dataUrl: z.string().max(12_000_000).regex(/^data:image\/(jpeg|png|webp);base64,/, "Fotoğraf JPEG, PNG ya da WEBP olmalı.") }))
    .mutation(async ({ input }) => {
      try {
        return await readScheduleFromImage(input.dataUrl);
      } catch (error) {
        console.warn("[Class Schedule] Photo import failed:", error);
        throw new TRPCError({ code: "BAD_REQUEST", message: llmUnavailableMessage(error) ?? "Programı fotoğraftan okuyamadım. Tablonun tamamı görünecek şekilde, düz ve net bir fotoğrafla tekrar dener misin? İstersen tabloya elle de girebilirsin." });
      }
    }),
});
