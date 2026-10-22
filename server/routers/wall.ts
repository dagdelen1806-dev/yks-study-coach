import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { NoteDoc } from "../../shared/noteContent";
import { checkRateLimit } from "../_core/rateLimit";
import { protectedProcedure, router } from "../_core/trpc";
import { LinkPreviewError, fetchLinkPreview, parsePublicUrl } from "../wall/linkPreview";
import { WallError, createWallPost, deleteWallPost, getWallPost, listWallPosts, setWallPostFlags, updateWallPost, wallSummary, type WallPostInput } from "../wall/wallDb";

/** Duvarım (kişisel akış): ücretsiz, yalnızca sahibine görünür. */
const postInput = z.object({
  kind: z.enum(["note", "link", "quote"]),
  title: z.string().max(200),
  content: z.unknown(),
  sourceUrl: z.string().trim().max(1000).nullable().optional(),
  sourceTitle: z.string().max(300).nullable().optional(),
  sourceDescription: z.string().max(500).nullable().optional(),
  sourceSite: z.string().max(120).nullable().optional(),
  tags: z.array(z.string().max(40)).max(20),
  topicId: z.number().int().positive().nullable().optional(),
  readLater: z.boolean(),
});

/** Bağlantı kayıtlarında adres biçimi sunucuda da denetlenir (yalnızca http/https). */
function toInput(input: z.infer<typeof postInput>): WallPostInput {
  let sourceUrl: string | null = null;
  if (input.sourceUrl) {
    try {
      sourceUrl = parsePublicUrl(input.sourceUrl).toString();
    } catch (error) {
      throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Geçerli bir bağlantı değil." });
    }
  }
  return { ...input, content: input.content as NoteDoc, sourceUrl };
}

const wallCall = async <T,>(work: () => Promise<T>): Promise<T> => {
  try {
    return await work();
  } catch (error) {
    if (error instanceof WallError) throw new TRPCError({ code: error.message === "Kayıt bulunamadı." ? "NOT_FOUND" : "BAD_REQUEST", message: error.message });
    throw error;
  }
};

export const wallRouter = router({
  list: protectedProcedure
    .input(z.object({ filter: z.enum(["all", "unread", "pinned"]).default("all"), tag: z.string().max(40).nullable().optional(), topicId: z.number().int().positive().nullable().optional(), q: z.string().max(100).nullable().optional(), cursor: z.object({ postedAt: z.coerce.date(), id: z.number().int().positive() }).nullable().optional() }))
    .query(({ ctx, input }) => listWallPosts(ctx.user.id, input)),
  summary: protectedProcedure.query(({ ctx }) => wallSummary(ctx.user.id)),
  get: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const post = await getWallPost(ctx.user.id, input.id);
    if (!post) throw new TRPCError({ code: "NOT_FOUND", message: "Kayıt bulunamadı." });
    return post;
  }),
  create: protectedProcedure.input(postInput).mutation(({ ctx, input }) => wallCall(() => createWallPost(ctx.user.id, toInput(input)))),
  update: protectedProcedure.input(postInput.extend({ id: z.number().int().positive() })).mutation(({ ctx, input }) => wallCall(() => updateWallPost(ctx.user.id, input.id, toInput(input)))),
  delete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => ({ ok: await deleteWallPost(ctx.user.id, input.id) })),
  setFlags: protectedProcedure
    .input(z.object({ id: z.number().int().positive(), read: z.boolean().optional(), pinned: z.boolean().optional(), readLater: z.boolean().optional() }))
    .mutation(async ({ ctx, input }) => {
      if (!(await setWallPostFlags(ctx.user.id, input.id, input))) throw new TRPCError({ code: "NOT_FOUND", message: "Kayıt bulunamadı." });
      return { ok: true };
    }),
  // Bağlantı önizlemesi: dakikada 20 istek (sunucunun dışarıya istek atmasını kötüye kullanmayı sınırlar).
  linkPreview: protectedProcedure.input(z.object({ url: z.string().trim().min(4).max(1000) })).mutation(async ({ ctx, input }) => {
    try {
      checkRateLimit(`wall-link-preview:${ctx.user.id}`, 20, 60_000);
      return await fetchLinkPreview(input.url);
    } catch (error) {
      if (error instanceof LinkPreviewError) throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
      throw error;
    }
  }),
});
