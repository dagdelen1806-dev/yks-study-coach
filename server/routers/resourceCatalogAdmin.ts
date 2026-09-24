import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import {
  approveCatalogBookClassification,
  catalogDb,
  listNeedsReviewBooks,
  listResourceCatalogSyncLogs,
  markCatalogBookNeedsReview,
  resolveOrCreatePublisherByName,
  setCatalogBookActive,
  setManualDifficulty,
} from "../resourceCatalog/catalogDb";
import { listCatalogBooksForAdmin } from "../resourceCatalog/catalogQueries";
import { slugForBook } from "../resourceCatalog/pipeline/normalize";

const bookTypeEnum = z.enum(["question_bank", "topic_explanation", "topic_explanation_question_bank", "mock_exam", "fasikul", "past_questions", "camp", "test_book", "reference", "other"]);
const examScopeEnum = z.enum(["TYT", "AYT", "TYT_AYT", "YKS", "GENEL"]);

const catalogBookInput = z.object({
  name: z.string().trim().min(1).max(300),
  publisherName: z.string().trim().max(120).optional(),
  isbn: z.string().trim().max(32).optional(),
  editionYear: z.number().int().min(1990).max(2100).optional(),
  description: z.string().trim().max(2000).optional(),
  imageUrl: z.string().trim().max(500).optional(),
  bookType: bookTypeEnum,
  examScope: examScopeEnum,
  subject: z.string().trim().max(80).optional(),
});

/**
 * Admin-only Resource Catalog surface (spec §19/§38). Everything here is
 * gated by `adminProcedure` (ctx.user.role === "admin") — no new authz
 * system. Kitapisler.com senkronu Vercel'in IP'lerinden engellendiği için
 * (canlıda doğrulandı: yerelden 5/5 kitap çekilirken Vercel Cron'dan 0/0
 * dönüyor, hiç hata vermeden) katalog artık burada elle de yönetilebiliyor
 * — `list`/`create`/`update`/`setActive`. Yeni eklenen bir kitap, kitapisler
 * pipeline'ının ürettiğiyle AYNI `catalog_books` tablosuna yazılır, bu
 * yüzden öğrenci tarafındaki Kaynak Kataloğu (resourceCatalogRouter.list)
 * hiçbir değişiklik gerektirmeden onu otomatik gösterir.
 */
export const resourceCatalogAdminRouter = router({
  needsReview: adminProcedure.query(() => listNeedsReviewBooks()),
  syncLogs: adminProcedure.input(z.object({ limit: z.number().int().min(1).max(100).default(20) }).optional()).query(({ input }) => listResourceCatalogSyncLogs(input?.limit ?? 20)),
  approve: adminProcedure.input(z.object({ bookId: z.number().int() })).mutation(({ input }) => approveCatalogBookClassification(input.bookId)),
  setDifficulty: adminProcedure
    .input(z.object({ bookId: z.number().int(), label: z.enum(["easy", "medium", "hard"]), score: z.number().int().min(0).max(100) }))
    .mutation(({ input }) => setManualDifficulty(input.bookId, { label: input.label, score: input.score })),
  markNeedsReview: adminProcedure.input(z.object({ bookId: z.number().int(), needsReview: z.boolean() })).mutation(({ input }) => markCatalogBookNeedsReview(input.bookId, input.needsReview)),

  list: adminProcedure
    .input(z.object({ page: z.number().int().min(1).default(1), pageSize: z.number().int().min(1).max(100).default(30), search: z.string().max(120).optional(), subject: z.string().max(80).optional(), active: z.boolean().optional() }))
    .query(async ({ input }) => {
      const { page, pageSize, ...filters } = input;
      const { items, total } = await listCatalogBooksForAdmin(filters, { page, pageSize });
      return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
    }),

  create: adminProcedure.input(catalogBookInput).mutation(async ({ input }) => {
    const publisherId = input.publisherName ? await resolveOrCreatePublisherByName(input.publisherName) : null;
    const baseSlug = slugForBook(input.name, input.publisherName ?? null);
    try {
      return await catalogDb.createCatalogBook({
        publisherId,
        name: input.name,
        slug: baseSlug,
        isbn: input.isbn || null,
        editionYear: input.editionYear ?? null,
        description: input.description || null,
        imageUrl: input.imageUrl || null,
        bookType: input.bookType,
        examScope: input.examScope,
        subject: input.subject || null,
        metadata: { source: "admin_manual" },
      });
    } catch (error) {
      // slug UNIQUE — aynı isim+yayınevi ikinci kez eklenmeye çalışılırsa
      // rastgele bir sonek ile bir kez daha dener; yine çakışırsa gerçekten
      // aynı kitap demektir, kullanıcıya net bir hata döner.
      const retrySlug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
      try {
        return await catalogDb.createCatalogBook({
          publisherId,
          name: input.name,
          slug: retrySlug,
          isbn: input.isbn || null,
          editionYear: input.editionYear ?? null,
          description: input.description || null,
          imageUrl: input.imageUrl || null,
          bookType: input.bookType,
          examScope: input.examScope,
          subject: input.subject || null,
          metadata: { source: "admin_manual" },
        });
      } catch {
        throw new TRPCError({ code: "CONFLICT", message: "Bu isim ve yayınevi ile bir kaynak zaten kayıtlı olabilir. Farklı bir isim dener misin?" });
      }
    }
  }),

  update: adminProcedure
    .input(
      z.object({
        bookId: z.number().int(),
        name: z.string().trim().min(1).max(300).optional(),
        publisherName: z.string().trim().max(120).optional(),
        isbn: z.string().trim().max(32).optional(),
        editionYear: z.number().int().min(1990).max(2100).optional(),
        description: z.string().trim().max(2000).optional(),
        imageUrl: z.string().trim().max(500).optional(),
        bookType: bookTypeEnum.optional(),
        examScope: examScopeEnum.optional(),
        subject: z.string().trim().max(80).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { bookId, publisherName, ...rest } = input;
      const publisherId = publisherName !== undefined ? await resolveOrCreatePublisherByName(publisherName) : undefined;
      return catalogDb.updateCatalogBook(bookId, {
        ...rest,
        ...(publisherId !== undefined ? { publisherId } : {}),
      });
    }),

  setActive: adminProcedure.input(z.object({ bookId: z.number().int(), active: z.boolean() })).mutation(({ input }) => setCatalogBookActive(input.bookId, input.active)),
});
