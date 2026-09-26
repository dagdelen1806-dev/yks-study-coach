import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { validateDataUrl } from "../_core/fileValidation";
import { metredFeatureProcedure, protectedProcedure, router } from "../_core/trpc";
import { addRecommendationToPlan, getAutoSchedule, getBookContents, getBookContentSummaries, getMatchableTopics, getWeakTopicBookRecommendations, replaceBookContents, runAutoSchedule, setAutoSchedule, userOwnsBook } from "../bookContent/bookContentDb";
import { bookContentConfig } from "../bookContent/config";
import { suggestTopicsWithAi } from "../bookContent/aiMapper";
import { matchTopic, type MatchMethod, type MatchTier } from "../bookContent/curriculumMatcher";
import { getOcrProvider } from "../bookContent/ocrProvider";
import { LlmUnavailableError, llmUnavailableMessage } from "../_core/llm";
import { looksLikeTopicList,pageIssues, parseTableOfContents, type TocEntry } from "../bookContent/tocParser";

const bookIdInput = z.string().min(1).max(120);
const examInput = z.enum(["TYT", "AYT"]).nullable().optional();

const imageInput = z.object({
  dataUrl: z.string().min(20).max(Math.ceil(bookContentConfig.ocr.maxImageBytes * 1.4)),
  mimeType: z.enum(["image/png", "image/jpeg", "image/webp"]),
});

const contentTypeInput = z.enum(["topic_test", "osym_type", "review", "simulation", "topic"]);

type Suggestion = { topicId: number; confidence: number; method: MatchMethod | "ai"; matchedText: string; topic: string; subject: string; unit: string; reason?: string };

/**
 * İçindekiler satırlarını müfredata eşler: önce deterministik eşleştirici;
 * onun "manuel" bıraktığı başlıklar için (açıksa) tek bir AI isteğiyle aday
 * listesinden öneri. AI önerisi her zaman "onay gerekli" kademesinde kalır.
 */
async function matchEntries(entries: TocEntry[], subject: string | null) {
  const topics = await getMatchableTopics();
  const topicById = new Map(topics.map((topic) => [topic.id, topic]));
  const describe = (match: { topicId: number; confidence: number; method: MatchMethod | "ai"; matchedText: string }, reason?: string): Suggestion => {
    const topic = topicById.get(match.topicId)!;
    return { ...match, topic: topic.topic, subject: topic.subject, unit: topic.unit, ...(reason ? { reason } : {}) };
  };

  const matched = entries.map((entry) => {
    if (!entry.matchText) return { ...entry, suggestion: null as Suggestion | null, alternatives: [] as Suggestion[], tier: "not_applicable" as MatchTier | "not_applicable" };
    let result = matchTopic(entry.matchText, topics, { subject });
    // Ders yanlış seçilmiş olabilir: kendi dersinde hiç aday yoksa tüm müfredatta dene (onay yine öğrencide).
    if (!result.best && subject) result = matchTopic(entry.matchText, topics, {});
    return { ...entry, suggestion: result.best && result.tier !== "manual" ? describe(result.best) : null, alternatives: [result.best, ...result.alternatives].filter((item): item is NonNullable<typeof item> => Boolean(item)).map((item) => describe(item)), tier: result.tier as MatchTier | "not_applicable" };
  });

  const unresolvedTexts = Array.from(new Set(matched.filter((entry) => entry.tier === "manual" && entry.matchText).map((entry) => entry.matchText!)));
  if (unresolvedTexts.length > 0) {
    const candidates = topics.filter((topic) => !subject || topic.subject === subject);
    const ai = await suggestTopicsWithAi(unresolvedTexts.map((text, key) => ({ key, text, unitTitle: matched.find((entry) => entry.matchText === text)?.unitTitle ?? "" })), candidates);
    const byText = new Map(ai.map((answer) => [unresolvedTexts[answer.key], answer]));
    for (const entry of matched) {
      const answer = entry.tier === "manual" && entry.matchText ? byText.get(entry.matchText) : undefined;
      if (!answer) continue;
      entry.suggestion = describe({ topicId: answer.topicId, confidence: answer.confidence, method: "ai", matchedText: entry.matchText! }, answer.reason);
      entry.tier = "confirm";
    }
  }
  return matched;
}

async function assertOwnsBook(userId: number, bookId: string) {
  if (!(await userOwnsBook(userId, bookId))) throw new TRPCError({ code: "FORBIDDEN", message: "Bu kitap kütüphanende bulunmuyor. Önce kitabı rafına ekle." });
}

/**
 * Kitap içeriği: içindekiler OCR'ı → yapı → müfredat eşleştirme önerisi →
 * öğrenci onayı → kayıt → zayıf konu önerileri → plana ekleme.
 * Her uç `ctx.user.id` ile kapsamlı; bir öğrenci başkasının kitabına ya da
 * içeriğine hiçbir uçtan erişemez (kitap sahipliği sunucuda kontrol edilir).
 */
export const bookContentRouter = router({
  // Fotoğrafları okur ve bir ÖNİZLEME döner — hiçbir şey kaydetmez.
  // Kota: bir kitap taraması (en fazla 8 sayfa) = 1 kullanım.
  readTableOfContents: metredFeatureProcedure("OCR_BOOK_IMPORT")
    .input(z.object({ bookId: bookIdInput, subject: z.string().max(80).nullable().optional(), exam: examInput, images: z.array(imageInput).min(1).max(bookContentConfig.ocr.maxTocPages) }))
    .mutation(async ({ ctx, input }) => {
      // metredFeatureProcedure oturumu zaten doğruladı; tip daraltması için.
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      await assertOwnsBook(ctx.user.id, input.bookId);
      for (let index = 0; index < input.images.length; index++) {
        const image = input.images[index];
        const check = validateDataUrl(image.dataUrl, image.mimeType);
        if (!check.valid) throw new TRPCError({ code: "BAD_REQUEST", message: `${index + 1}. fotoğraf: ${check.reason}` });
        if (check.buffer.byteLength > bookContentConfig.ocr.maxImageBytes) throw new TRPCError({ code: "BAD_REQUEST", message: `${index + 1}. fotoğraf çok büyük. Daha düşük çözünürlükle tekrar dener misin?` });
      }

      const provider = getOcrProvider();
      const pages = await Promise.all(input.images.map(async (image, index) => {
        // Sağlayıcıdaki geçici hatalara karşı bir kez yeniden dene.
        for (let attempt = 1; ; attempt++) {
          try {
            return await provider.extractTableOfContentsPage(image.dataUrl);
          } catch (error) {
            console.warn(`[BookContent] OCR failed on page ${index + 1} (attempt ${attempt}):`, error instanceof Error ? error.message : error);
            // Servis kapalı/anahtar hatalıysa tekrar denemek ve "daha net çek" demek anlamsız.
            const serviceMessage = llmUnavailableMessage(error);
            const permanent = error instanceof LlmUnavailableError && error.reason !== "provider";
            if (permanent || attempt >= 2) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: serviceMessage ?? `${index + 1}. sayfa okunamadı. Daha net, düz ve ışıklı bir fotoğrafla tekrar dener misin?` });
          }
        }
      }));

      // 1) Yanlış fotoğrafı ayıkla (kapak ya da alakasız sayfa).
      const notes: string[] = [];
      const tocPages = pages.map((page, index) => ({ page, index })).filter(({ page, index }) => {
        // Sağlayıcı alışılmadık bir düzeni ("Kitap Bitirme Planı" gibi) 'other' sayabilir; sayfa numaralı
        // birkaç satır okuduysa içerik gerçektir — atma.
        if (looksLikeTopicList(page)) return true;
        if (page.pageKind && page.pageKind !== "table_of_contents") {
          notes.push(`${index + 1}. fotoğraf ${page.pageKind === "cover" ? "kitap kapağı" : "içindekiler sayfası değil"} gibi görünüyor; atlandı.`);
          return false;
        }
        return true;
      });
      if (tocPages.length === 0) {
        const allCovers = pages.every((page) => page.pageKind === "cover");
        throw new TRPCError({ code: "UNPROCESSABLE_CONTENT", message: allCovers ? "Bu fotoğraf kitabın kapağı. Burada kitabın İÇİNDEKİLER sayfasını çekmelisin." : "Eklediğin fotoğraflar içindekiler sayfası gibi görünmüyor. Ünite ve test listesinin olduğu sayfayı çeker misin?" });
      }

      // 2) Tutarsız okunan sayfayı (azalan/eksik sayfa numarası) bir kez, sorunları ipucu vererek yeniden oku;
      //    daha az sorunlu okumayı kullan.
      const finalPages = await Promise.all(tocPages.map(async ({ page, index }) => {
        const issues = pageIssues(page);
        if (issues.length === 0) return page;
        try {
          const reread = await provider.extractTableOfContentsPage(input.images[index].dataUrl, { previous: page, issues });
          if (reread.items.length > 0 && pageIssues(reread).length < issues.length) {
            notes.push(`${index + 1}. sayfadaki sayfa numarası tutarsızlığı yeniden okunarak düzeltildi.`);
            return reread;
          }
        } catch (error) {
          console.warn(`[BookContent] Corrective re-read failed on page ${index + 1}:`, error instanceof Error ? error.message : error);
        }
        return page;
      }));

      const { entries, warnings } = parseTableOfContents(finalPages);
      if (entries.length === 0) throw new TRPCError({ code: "UNPROCESSABLE_CONTENT", message: "Fotoğraflarda içindekiler satırı bulunamadı. İçindekiler sayfasının tamamı görünecek şekilde tekrar çeker misin?" });
      return { warnings: [...notes, ...warnings], entries: await matchEntries(entries, input.subject || null) };
    }),

  // Elle eşleştirme listesi (öğrenci "Değiştir" dediğinde).
  topicOptions: protectedProcedure.input(z.object({ subject: z.string().max(80).nullable().optional() }).optional()).query(async ({ input }) => {
    const topics = await getMatchableTopics();
    const subject = input?.subject?.trim();
    return topics
      .filter((topic) => !subject || topic.subject === subject)
      .map(({ id, exam, subject: topicSubject, unit, topic }) => ({ id, exam, subject: topicSubject, unit, topic }))
      .sort((a, b) => a.exam.localeCompare(b.exam) || a.subject.localeCompare(b.subject, "tr") || a.unit.localeCompare(b.unit, "tr") || a.topic.localeCompare(b.topic, "tr"));
  }),

  // Öğrencinin onayladığı içerik (OCR'dan ya da tamamen elle).
  save: protectedProcedure
    .input(z.object({
      bookId: bookIdInput,
      subject: z.string().max(80),
      source: z.enum(["ocr", "manual"]),
      items: z.array(z.object({
        unitNumber: z.number().int().min(0).max(200).nullable(),
        unitTitle: z.string().max(300),
        contentType: contentTypeInput,
        label: z.string().min(1).max(120),
        testNumber: z.number().int().min(0).max(1000).nullable(),
        title: z.string().max(300),
        pageStart: z.number().int().min(1).max(5000).nullable(),
        pageEnd: z.number().int().min(1).max(5000).nullable(),
        topicId: z.number().int().positive().nullable(),
        mappingMethod: z.enum(["exact_topic", "exact_alias", "contains_topic", "contains_alias", "fuzzy", "ai", "manual", "none"]),
        mappingConfidence: z.number().min(0).max(1),
      })).max(400),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertOwnsBook(ctx.user.id, input.bookId);
      for (const item of input.items) {
        if (item.pageStart !== null && item.pageEnd !== null && item.pageEnd < item.pageStart) throw new TRPCError({ code: "BAD_REQUEST", message: `"${item.label}" satırında bitiş sayfası başlangıçtan küçük.` });
      }
      try {
        return await replaceBookContents(ctx.user.id, input.bookId, input.subject, input.items, input.source);
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "İçerik kaydedilemedi." });
      }
    }),

  contents: protectedProcedure.input(z.object({ bookId: bookIdInput })).query(async ({ ctx, input }) => {
    await assertOwnsBook(ctx.user.id, input.bookId);
    return getBookContents(ctx.user.id, input.bookId);
  }),

  summaries: protectedProcedure.query(({ ctx }) => getBookContentSummaries(ctx.user.id)),

  recommendations: protectedProcedure.query(({ ctx }) => getWeakTopicBookRecommendations(ctx.user.id)),

  autoSchedule: protectedProcedure.query(({ ctx }) => getAutoSchedule(ctx.user.id)),
  setAutoSchedule: protectedProcedure.input(z.object({ enabled: z.boolean() })).mutation(({ ctx, input }) => setAutoSchedule(ctx.user.id, input.enabled)),
  // İstemci günde bir kez çağırır (tercih kapalıysa hiçbir şey yapmaz).
  runAutoSchedule: protectedProcedure
    .input(z.object({ bookTitles: z.record(z.string().max(120), z.string().max(180)) }))
    .mutation(({ ctx, input }) => runAutoSchedule(ctx.user.id, input.bookTitles)),

  addToPlan: protectedProcedure
    .input(z.object({ topicId: z.number().int().positive(), bookId: bookIdInput, bookTitle: z.string().max(180), when: z.enum(["today", "auto"]) }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await addRecommendationToPlan(ctx.user.id, input);
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Görev plana eklenemedi." });
      }
    }),
});
