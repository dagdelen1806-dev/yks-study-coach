import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { llmUnavailableMessage } from "../_core/llm";
import { metredFeatureProcedure, protectedProcedure, router } from "../_core/trpc";
import { getMatchableTopics } from "../bookContent/bookContentDb";
import { AttachmentError, getAttachmentStorage } from "../notes/attachmentStorage";
import { NoteError } from "../notes/notesDb";
import { suggestQuestionDetails } from "../notes/questionAi";
import { addReviewTask, createQuestion, deleteQuestion, finishReviewSession, getErrorMap, getQuestion, getQuestionIdByNote, getReviewSummary, getSubjectSummary, listQuestions, moveNoteToSubject, recordAttempt, updateQuestion } from "../notes/questionsDb";
import { PlanTaskError } from "../studyPlan/planTasks";
import { ATTEMPT_RESULT_KEYS, DIFFICULTY_KEYS, ERROR_TYPE_KEYS } from "../../shared/questionNotebook";

async function userFacing<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof NoteError || error instanceof AttachmentError || error instanceof PlanTaskError) throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
    throw error;
  }
}

const id = z.number().int().positive();
const subjectScope = z.string().max(80).nullable().optional();
const optionalId = id.nullable().optional();
const fields = {
  subject: z.string().max(80).nullable().optional(),
  topicId: optionalId,
  stuckPoint: z.string().max(4000).nullable().optional(),
  solutionText: z.string().max(4000).nullable().optional(),
  solutionImageId: optionalId,
  errorType: z.enum(ERROR_TYPE_KEYS).nullable().optional(),
  errorTypeSource: z.enum(["student", "ai"]).nullable().optional(),
  difficulty: z.enum(DIFFICULTY_KEYS).nullable().optional(),
};

/**
 * Soru Defterim: çözülemeyen soru kartları, basamaklı tekrar, hata haritası ve
 * plan bağlantısı. Her uç ctx.user.id ile kapsamlı. Fotoğraf yalnızca öğrenci
 * "✨ Öner" dediğinde AI'a gider.
 */
export const questionsRouter = router({
  list: protectedProcedure
    .input(z.object({ status: z.enum(["open", "mastered", "all"]).optional(), due: z.boolean().optional(), subject: subjectScope, topicId: optionalId, cursor: optionalId, limit: z.number().int().min(1).max(100).optional() }))
    .query(({ ctx, input }) => userFacing(() => listQuestions(ctx.user.id, input))),

  get: protectedProcedure.input(z.object({ id })).query(async ({ ctx, input }) => {
    const question = await getQuestion(ctx.user.id, input.id);
    if (!question) throw new TRPCError({ code: "NOT_FOUND", message: "Soru bulunamadı." });
    return question;
  }),

  byNote: protectedProcedure.input(z.object({ noteId: id })).query(({ ctx, input }) => userFacing(async () => ({ id: await getQuestionIdByNote(ctx.user.id, input.noteId) }))),

  create: protectedProcedure
    .input(z.object({
      clientId: z.string().min(8).max(40).regex(/^[A-Za-z0-9_-]+$/),
      questionImageId: optionalId,
      questionOcrText: z.string().max(5000).nullable().optional(),
      voiceAttachmentId: optionalId,
      voiceDuration: z.number().min(0).max(700).nullable().optional(),
      aiTopicId: optionalId,
      bookId: z.string().max(120).nullable().optional(),
      studySessionId: optionalId,
      ...fields,
    }))
    .mutation(({ ctx, input }) => userFacing(() => createQuestion(ctx.user.id, input))),

  update: protectedProcedure.input(z.object({ id, ...fields })).mutation(({ ctx, input }) => userFacing(() => { const { id: questionId, ...patch } = input; return updateQuestion(ctx.user.id, questionId, patch); })),

  delete: protectedProcedure.input(z.object({ id })).mutation(({ ctx, input }) => userFacing(() => deleteQuestion(ctx.user.id, input.id))),

  attempt: protectedProcedure
    .input(z.object({ id, result: z.enum(ATTEMPT_RESULT_KEYS), sawSolution: z.boolean(), seconds: z.number().min(0).max(7200).nullable().optional() }))
    .mutation(({ ctx, input }) => userFacing(() => recordAttempt(ctx.user.id, input.id, input))),

  // subject: verilmezse tüm dersler, null ise derssiz ("Genel"), metinse o dersin defteri.
  summary: protectedProcedure.input(z.object({ subject: subjectScope }).optional()).query(({ ctx, input }) => userFacing(() => getReviewSummary(ctx.user.id, input?.subject))),

  errorMap: protectedProcedure.input(z.object({ days: z.number().int().min(1).max(365).nullable(), subject: subjectScope })).query(({ ctx, input }) => userFacing(() => getErrorMap(ctx.user.id, input.days, input.subject))),

  /** Ders sekmeleri: ders başına not / soru / tekrar bekleyen sayısı. */
  subjectSummary: protectedProcedure.query(({ ctx }) => userFacing(() => getSubjectSummary(ctx.user.id))),

  /** Notu ya da soru kartını bir ders defterine koy (null: "Genel"e döndür). */
  moveToSubject: protectedProcedure.input(z.object({ noteId: id, subject: z.string().trim().min(1).max(80).nullable() })).mutation(({ ctx, input }) => userFacing(() => moveNoteToSubject(ctx.user.id, input.noteId, input.subject))),

  addReviewTask: protectedProcedure.mutation(({ ctx }) => userFacing(() => addReviewTask(ctx.user.id))),

  finishReview: protectedProcedure
    .input(z.object({ minutes: z.number().min(0).max(600), solved: z.number().int().min(0).max(100), partial: z.number().int().min(0).max(100), failed: z.number().int().min(0).max(100) }))
    .mutation(({ ctx, input }) => userFacing(() => finishReviewSession(ctx.user.id, input))),

  // ✨ Öner: fotoğrafı okur, müfredattan konu + zorluk + olası hata türü önerir (fotoğraf okuma kotasından sayılır).
  suggest: metredFeatureProcedure("NOTE_OCR")
    .input(z.object({ attachmentId: optionalId, stuckPoint: z.string().max(4000).nullable().optional() }))
    .mutation(({ ctx, input }) => userFacing(async () => {
      let imageDataUrl: string | null = null;
      if (input.attachmentId) {
        const attachment = await getAttachmentStorage().get(ctx.user!.id, input.attachmentId);
        if (!attachment || attachment.kind !== "image") throw new NoteError("Fotoğraf bulunamadı.");
        imageDataUrl = `data:${attachment.mimeType};base64,${attachment.data.toString("base64")}`;
      }
      const topics = (await getMatchableTopics()).map((topic) => ({ id: topic.id, subject: topic.subject, unit: topic.unit, topic: topic.topic }));
      try {
        const suggestion = await suggestQuestionDetails({ imageDataUrl, stuckPoint: input.stuckPoint ?? null, topics });
        if (input.attachmentId && suggestion.ocrText) await getAttachmentStorage().setOcrText(ctx.user!.id, input.attachmentId, suggestion.ocrText);
        return suggestion;
      } catch (error) {
        console.warn("[Questions] suggest failed:", error instanceof Error ? error.message : error);
        throw new NoteError(llmUnavailableMessage(error) ?? "Öneri şu an hazırlanamadı. Ders ve konuyu kendin seçebilirsin.");
      }
    })),
});
