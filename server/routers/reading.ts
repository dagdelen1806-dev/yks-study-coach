import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { ReadingError, addReadingBook, listReadingBooks, removeReadingBook, updateReadingBook } from "../reading/readingDb";

const id = z.number().int().positive();
const pages = z.number().int().min(1).max(10_000).nullable().optional();

async function userFacing<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof ReadingError) throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
    throw error;
  }
}

/** Okuma kitapları (gece okuması). Her uç ctx.user.id ile kapsamlı. */
export const readingRouter = router({
  list: protectedProcedure.query(({ ctx }) => listReadingBooks(ctx.user.id)),
  add: protectedProcedure
    .input(z.object({ title: z.string().trim().min(1, "Kitap adını yaz.").max(180), author: z.string().trim().max(120).nullable().optional(), totalPages: pages }))
    .mutation(({ ctx, input }) => userFacing(() => addReadingBook(ctx.user.id, input))),
  update: protectedProcedure
    .input(z.object({ id, status: z.enum(["reading", "finished"]).optional(), totalPages: pages }))
    .mutation(({ ctx, input }) => userFacing(() => updateReadingBook(ctx.user.id, input.id, { status: input.status, totalPages: input.totalPages }))),
  remove: protectedProcedure.input(z.object({ id })).mutation(({ ctx, input }) => removeReadingBook(ctx.user.id, input.id)),
});
