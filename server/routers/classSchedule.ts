import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { ScheduleError, getClassSchedule, saveClassSchedule } from "../schedule/classScheduleDb";
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
});
