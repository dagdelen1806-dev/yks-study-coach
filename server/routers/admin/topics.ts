import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { EXAM_KINDS } from "../../../shared/exams";
import { adminProcedure, router } from "../../_core/trpc";
import { TopicAdminError, addTopic, listTopicsForAdmin, renameUnit, setTopicHidden, updateTopic } from "../../admin/topicAdmin";
import { writeAuditLog } from "../../subscriptions/subscriptionDb";

const id = z.number().int().positive();
const name = (max: number) => z.string().trim().min(2).max(max);

async function userFacing<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof TopicAdminError) throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
    throw error;
  }
}

/** Yönetim Paneli → Konular: sınavların ders > ünite > konu listesi (ekle, yeniden adlandır, gizle). */
export const adminTopicsRouter = router({
  list: adminProcedure.input(z.object({ exam: z.enum(EXAM_KINDS) })).query(({ input }) => listTopicsForAdmin(input.exam)),
  add: adminProcedure.input(z.object({ exam: z.enum(EXAM_KINDS), subject: name(80), unit: name(120), topic: name(180) })).mutation(({ ctx, input }) => userFacing(async () => {
    const topicId = await addTopic(input);
    await writeAuditLog({ userId: ctx.user.id, adminId: ctx.user.id, action: "topic_added", newState: input });
    return { id: topicId };
  })),
  update: adminProcedure.input(z.object({ id, topic: name(180), unit: name(120) })).mutation(({ ctx, input }) => userFacing(async () => {
    const result = await updateTopic(input);
    await writeAuditLog({ userId: ctx.user.id, adminId: ctx.user.id, action: "topic_updated", oldState: { topic: result.from }, newState: input });
    return { ok: true };
  })),
  renameUnit: adminProcedure.input(z.object({ exam: z.enum(EXAM_KINDS), subject: name(80), from: z.string().trim().min(1).max(120), to: name(120) })).mutation(({ ctx, input }) => userFacing(async () => {
    const count = await renameUnit(input);
    await writeAuditLog({ userId: ctx.user.id, adminId: ctx.user.id, action: "topic_unit_renamed", newState: input });
    return { count };
  })),
  setHidden: adminProcedure.input(z.object({ id, hidden: z.boolean() })).mutation(({ ctx, input }) => userFacing(async () => {
    await setTopicHidden(input.id, input.hidden);
    await writeAuditLog({ userId: ctx.user.id, adminId: ctx.user.id, action: input.hidden ? "topic_hidden" : "topic_shown", newState: input });
    return { ok: true };
  })),
});
