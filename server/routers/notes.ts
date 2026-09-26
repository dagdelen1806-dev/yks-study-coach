import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { metredFeatureProcedure, protectedProcedure, router } from "../_core/trpc";
import { extractPlainTextFromImage } from "../bookContent/ocrProvider";
import { AttachmentError, decodeAttachment, getAttachmentStorage } from "../notes/attachmentStorage";
import { notesConfig } from "../notes/config";
import { runNoteAi } from "../notes/noteAi";
import { NoteError, createTaskFromNote, deleteNote, getNote, getNoteCalendar, listNotes, listTags, saveNote, updateNoteFlags } from "../notes/notesDb";
import { SpeechToTextError, getSpeechProvider } from "../notes/speechProvider";
import { PlanTaskError } from "../studyPlan/planTasks";
import { NOTE_AI_ACTIONS, aiResultToNodes, type NoteAiAction } from "../../shared/noteContent";

const optionalId = z.number().int().positive().nullable().optional();
const linksInput = {
  subject: z.string().max(80).nullable().optional(),
  topicId: optionalId,
  bookId: z.string().max(120).nullable().optional(),
  bookContentId: optionalId,
  studySessionId: optionalId,
  mockExamId: optionalId,
};

/** Kullanıcıya gösterilebilir (Türkçe) hataları BAD_REQUEST'e çevirir. */
async function userFacing<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof NoteError || error instanceof AttachmentError || error instanceof PlanTaskError) throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
    throw error;
  }
}

const requireUserId = (ctx: { user: { id: number } | null }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  return ctx.user.id;
};

/**
 * Akıllı Defter. Her uç `ctx.user.id` ile kapsamlı: bir öğrenci başka
 * öğrencinin notunu/ekini okuyamaz, değiştiremez, silemez. Not içeriği hiçbir
 * zaman kendiliğinden AI'ya gönderilmez — yalnızca öğrencinin açıkça
 * tetiklediği "ai" / "transcribe" / "extractText" uçlarında.
 */
export const notesRouter = router({
  list: protectedProcedure
    .input(z.object({
      from: z.string().datetime().nullable().optional(),
      to: z.string().datetime().nullable().optional(),
      subject: z.string().max(80).nullable().optional(),
      topicId: optionalId,
      bookId: z.string().max(120).nullable().optional(),
      tag: z.string().max(40).nullable().optional(),
      kind: z.enum(["text", "voice", "image", "formula", "drawing"]).nullable().optional(),
      q: z.string().max(100).nullable().optional(),
      favorite: z.boolean().optional(),
      pinned: z.boolean().optional(),
      studySessionId: optionalId,
      reviewDue: z.boolean().optional(),
      cursor: z.string().max(40).nullable().optional(),
      limit: z.number().int().min(1).max(100).optional(),
    }))
    .query(({ ctx, input }) => userFacing(() => listNotes(ctx.user.id, { ...input, from: input.from ? new Date(input.from) : null, to: input.to ? new Date(input.to) : null }))),

  get: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const note = await getNote(ctx.user.id, input.id);
    if (!note) throw new TRPCError({ code: "NOT_FOUND", message: "Not bulunamadı." });
    return note;
  }),

  // Otomatik kayıt da bu uçtan yapılır (istemci 800 ms debounce ile çağırır).
  save: protectedProcedure
    .input(z.object({
      clientId: z.string().min(8).max(40).regex(/^[A-Za-z0-9_-]+$/),
      title: z.string().max(notesConfig.content.maxTitleLength),
      content: z.unknown(),
      noteDate: z.string().datetime(),
      tags: z.array(z.string().max(40)).max(notesConfig.content.maxTagsPerNote),
      isFavorite: z.boolean().optional(),
      isPinned: z.boolean().optional(),
      reviewAt: z.string().datetime().nullable().optional(),
      templateKey: z.string().max(40).nullable().optional(),
      ...linksInput,
    }))
    .mutation(({ ctx, input }) => userFacing(() => saveNote(ctx.user.id, { ...input, noteDate: new Date(input.noteDate), reviewAt: input.reviewAt ? new Date(input.reviewAt) : null }))),

  updateFlags: protectedProcedure
    .input(z.object({ id: z.number().int().positive(), isFavorite: z.boolean().optional(), isPinned: z.boolean().optional(), reviewAt: z.string().datetime().nullable().optional(), archived: z.boolean().optional() }))
    .mutation(({ ctx, input }) => userFacing(() => updateNoteFlags(ctx.user.id, input.id, { isFavorite: input.isFavorite, isPinned: input.isPinned, archived: input.archived, reviewAt: input.reviewAt === undefined ? undefined : input.reviewAt ? new Date(input.reviewAt) : null }))),

  delete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => userFacing(() => deleteNote(ctx.user.id, input.id))),

  calendar: protectedProcedure
    .input(z.object({ from: z.string().datetime(), to: z.string().datetime() }))
    .query(({ ctx, input }) => getNoteCalendar(ctx.user.id, new Date(input.from), new Date(input.to))),

  tags: protectedProcedure.query(({ ctx }) => listTags(ctx.user.id)),

  createTask: protectedProcedure
    .input(z.object({ id: z.number().int().positive(), topicId: optionalId, minutes: z.number().int().min(10).max(240).optional(), when: z.enum(["today", "auto"]) }))
    .mutation(({ ctx, input }) => userFacing(() => createTaskFromNote(ctx.user.id, input.id, input))),

  // Fotoğraf ekleme (ücretsiz). İstemci fotoğrafı küçültüp gönderir; sunucu tür/boyut/kota doğrular.
  uploadImage: protectedProcedure
    .input(z.object({ dataUrl: z.string().min(20).max(Math.ceil(notesConfig.attachments.imageMaxBytes * 1.4)) }))
    .mutation(({ ctx, input }) => userFacing(async () => {
      const storage = getAttachmentStorage();
      await storage.cleanupOrphans(ctx.user.id);
      const { mimeType, data } = decodeAttachment(input.dataUrl, "image");
      return storage.put(ctx.user.id, { kind: "image", mimeType, data });
    })),

  // Ses → metin. İsterse ses kaydı da nota eklenir (keepAudio).
  transcribe: metredFeatureProcedure("NOTE_VOICE", { maxRequests: 10, windowMs: 60_000 })
    .input(z.object({ dataUrl: z.string().min(20).max(Math.ceil(notesConfig.attachments.audioMaxBytes * 1.4)), durationSec: z.number().min(0).max(notesConfig.speech.maxAudioSeconds + 5), keepAudio: z.boolean() }))
    .mutation(({ ctx, input }) => userFacing(async () => {
      const userId = requireUserId(ctx);
      const provider = getSpeechProvider();
      if (!provider) throw new NoteError("Ses → metin şu an kapalı.");
      const { mimeType, data } = decodeAttachment(input.dataUrl, "audio");
      let text: string;
      try {
        ({ text } = await provider.transcribe(data, mimeType));
      } catch (error) {
        if (error instanceof SpeechToTextError) throw new NoteError(error.message);
        throw error;
      }
      if (!text) throw new NoteError("Kayıtta konuşma algılanamadı. Mikrofona biraz daha yakın konuşup tekrar dener misin?");
      const durationSec = Math.round(input.durationSec);
      const attachment = input.keepAudio ? await getAttachmentStorage().put(userId, { kind: "audio", mimeType, data, durationSec }) : null;
      return { text, durationSec, attachmentId: attachment?.id ?? null };
    })),

  // Fotoğraftaki metni çıkar (kitap OCR'ıyla aynı sağlayıcı).
  extractText: metredFeatureProcedure("NOTE_OCR")
    .input(z.object({ attachmentId: z.number().int().positive() }))
    .mutation(({ ctx, input }) => userFacing(async () => {
      const userId = requireUserId(ctx);
      const storage = getAttachmentStorage();
      const attachment = await storage.get(userId, input.attachmentId);
      if (!attachment || attachment.kind !== "image") throw new NoteError("Fotoğraf bulunamadı.");
      let text: string;
      try {
        text = await extractPlainTextFromImage(`data:${attachment.mimeType};base64,${attachment.data.toString("base64")}`);
      } catch (error) {
        console.warn("[Notes] OCR failed:", error instanceof Error ? error.message : error);
        throw new NoteError("Fotoğraftaki metin okunamadı. Daha net bir fotoğrafla tekrar dener misin?");
      }
      if (!text) throw new NoteError("Fotoğrafta okunabilir bir yazı bulunamadı.");
      await storage.setOcrText(userId, input.attachmentId, text);
      return { text };
    })),

  // AI araçları: sonuç notun ÜZERİNE YAZILMAZ; eklenecek blok olarak döner.
  ai: metredFeatureProcedure("NOTE_AI")
    .input(z.object({ id: z.number().int().positive(), action: z.enum(Object.keys(NOTE_AI_ACTIONS) as [NoteAiAction, ...NoteAiAction[]]) }))
    .mutation(({ ctx, input }) => userFacing(async () => {
      const userId = requireUserId(ctx);
      const note = await getNote(userId, input.id);
      if (!note) throw new NoteError("Not bulunamadı.");
      try {
        const items = await runNoteAi(input.action, note.plainText);
        return { items, nodes: aiResultToNodes(input.action, items) };
      } catch (error) {
        console.warn("[Notes] AI failed:", error instanceof Error ? error.message : error);
        throw new NoteError(error instanceof Error && /yazı yok|çıkaramadı/.test(error.message) ? error.message : "AI şu an yanıt veremedi. Biraz sonra tekrar dener misin?");
      }
    })),
});
