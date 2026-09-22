import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getUserTopicProgress } from "../db";
import { getCatalogBookBySlug, listCatalogBooks, listCatalogBooksForRecommendation, listMyLibraryCatalogBooks, listPublishersForFilter } from "../resourceCatalog/catalogQueries";
import { recommendForStudent, type StudentTopicPerformance } from "../resourceCatalog/recommendationService";
import { resourceCatalogAdminRouter } from "./resourceCatalogAdmin";

const bookTypeEnum = z.enum(["question_bank", "topic_explanation", "topic_explanation_question_bank", "mock_exam", "fasikul", "past_questions", "camp", "test_book", "reference", "other"]);
const examScopeEnum = z.enum(["TYT", "AYT", "TYT_AYT", "YKS", "GENEL"]);
const difficultyEnum = z.enum(["easy", "medium", "hard"]);

const listInput = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(60).default(24),
  exam: examScopeEnum.optional(),
  subject: z.string().max(80).optional(),
  publisherId: z.number().int().optional(),
  bookType: bookTypeEnum.optional(),
  difficulty: difficultyEnum.optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  search: z.string().max(120).optional(),
  topic: z.string().max(180).optional(),
});

/**
 * Public/protected Resource Catalog API (spec §30/§31), consumed by the
 * React client instead of Flutter (this project has no mobile app). List
 * results are always paginated — never the full ~4000-row catalog in one
 * response.
 */
export const resourceCatalogRouter = router({
  list: publicProcedure.input(listInput).query(async ({ input }) => {
    const { page, pageSize, ...filters } = input;
    const { items, total } = await listCatalogBooks(filters, { page, pageSize });
    return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }),

  get: publicProcedure.input(z.object({ slug: z.string().min(1).max(320) })).query(async ({ input }) => {
    const book = await getCatalogBookBySlug(input.slug);
    if (!book) throw new TRPCError({ code: "NOT_FOUND", message: "Kaynak bulunamadı" });
    return book;
  }),

  publishers: publicProcedure.query(() => listPublishersForFilter()),

  /** "Seviyene Uygun Kaynaklar" — deterministic, explainable per-topic
   * recommendations built from the student's own topic progress (spec §21/§34). */
  recommendations: protectedProcedure
    .input(z.object({ subject: z.string().max(80).optional(), limit: z.number().int().min(1).max(30).default(12) }))
    .query(async ({ ctx, input }) => {
      const progress = await getUserTopicProgress(ctx.user.id);
      const allTopics: StudentTopicPerformance[] = progress.map((p) => ({ subject: p.subject, topic: p.topic, exam: p.exam, accuracy: p.progress, status: p.status }));
      const topics = input.subject ? allTopics.filter((t) => t.subject === input.subject) : allTopics;
      const books = await listCatalogBooksForRecommendation(input.subject);
      const recommendations = recommendForStudent(topics, books, { overallLimit: input.limit });

      const bookById = new Map(books.map((b) => [b.id, b]));
      return recommendations.map((rec) => ({ ...rec, book: bookById.get(rec.bookId) ?? null }));
    }),

  /** Kütüphanem — kataloğdan "kütüphaneme ekle" dediğim kitapların, gerçek
   * müfredat konu bağlantılarıyla birlikte listesi. Takvim sekmesi bunu
   * kullanarak "bu kitaptan oturum oluştur" akışında ders/konuyu otomatik doldurur. */
  myLibrary: protectedProcedure.query(({ ctx }) => listMyLibraryCatalogBooks(ctx.user.id)),

  admin: resourceCatalogAdminRouter,
});
