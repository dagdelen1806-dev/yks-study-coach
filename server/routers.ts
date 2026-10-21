import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { getSessionCookieOptions } from "./_core/cookies";
import { normalizeIsbn } from "../shared/bookIdentity";
import { changeLocalPassword, PasswordChangeError } from "./_core/localAuth";
import { sendVerificationEmail } from "./_core/emailVerification";
import { checkRateLimit } from "./_core/rateLimit";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { protectedProcedure, metredFeatureProcedure } from "./_core/trpc";
import { LlmUnavailableError, invokeLLM, invokeLLMWithTier, llmUnavailableMessage } from "./_core/llm";
import { validateDataUrl } from "./_core/fileValidation";
import { z } from "zod";
import { addBookStudyLog, addBookToInventory, addSourceSwitch, addTopicStudyLog, addUserMockExams, addUserResourceBooks, completeStudySession, getBookInventory, getStudentProfile,getBookStudyLogs, getBookTopicMappings, getCoachAlerts, getPlanAdherenceInputs, getSourceSwitches, getStudyCalendar, getUserMockExams, getUserResourceBooks, logCompletedRoutineSession, markCoachAlertRead, removeBookFromInventory, savePlanAdherence, saveStudyPlan, upsertBookTopicMapping } from "./db";
import { calculatePlanAdherence } from "../shared/planAdherence";
import { topicsRouter } from "./routers/topics";
import { bookContentRouter } from "./routers/bookContent";
import { notesRouter } from "./routers/notes";
import { questionsRouter } from "./routers/questions";
import { getNotebookPlanSignal } from "./notes/questionsDb";
import { classScheduleRouter } from "./routers/classSchedule";
import { pushRouter } from "./routers/push";
import { readingRouter } from "./routers/reading";
import { orgRouter } from "./routers/org";
import { recordReadingPages } from "./reading/readingDb";
import { getPlanScheduleContext } from "./schedule/classScheduleDb";
import { normalizeAiPlan } from "./studyPlan/normalizeAiPlan";
import { DAY_LABELS, weekdayOf } from "../shared/classSchedule";
import { resourceCatalogRouter } from "./routers/resourceCatalog";
import { onboardingRouter } from "./routers/onboarding";
import { subscriptionRouter } from "./routers/subscription";
import { paymentRouter } from "./routers/payment";
import { adminRouter } from "./routers/admin";
import { testimonialsRouter } from "./routers/testimonials";
import { EXAM_KINDS, examPromptContext, type ExamKind } from "@shared/exams";

const planInput = z.object({
  topics: z.array(z.object({
    topic: z.string(),
    subject: z.string(),
    exam: z.enum(EXAM_KINDS),
    progress: z.number(),
    status: z.enum(["Zayıf", "Orta", "İyi"]),
  })).max(50),
  exams: z.array(z.object({
    title: z.string(),
    date: z.string(),
    net: z.number(),
    subjects: z.record(z.string(), z.number()),
    topicDetails: z.array(z.object({
      subject: z.string(), topic: z.string(), questionCount: z.number(), correct: z.number(), wrong: z.number(), blank: z.number(), accuracy: z.number(), net: z.number(),
    })).optional(),
  })).max(10),
  books: z.array(z.object({
    id: z.string(), title: z.string(), subject: z.string(), exam: z.enum(EXAM_KINDS), level: z.enum(["Kolay", "Orta", "Zor"]), pageCount: z.number().optional(), totalQuestions: z.number().optional(), accuracy: z.number().optional(), activeDays: z.number().optional(), mappings: z.array(z.object({ topic: z.string(), pageStart: z.number().optional(), pageEnd: z.number().optional(), testStart: z.number().optional(), testEnd: z.number().optional() })).max(50).optional(),
  })).max(30).default([]),
  availableMinutes: z.number().min(120).max(2400).default(600),
  // Öğrencinin yerel "bugün"ü (YYYY-MM-DD): plan bugünden başlayan 7 günü kapsar.
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  goal: z.string().max(120).default("YKS 2027"),
  // Onboarding'den gelen koçluk bağlamı — tamamen isteğe bağlı, eski
  // istemciler (veya onboarding'i henüz tamamlamamış kullanıcılar) bu alanı
  // hiç göndermeyebilir.
  studentProfile: z
    .object({
      // Hedef bilgileri — onboarding'in "Kullanıcı tanımlama" ve "Hedefler"
      // adımlarından. AI planı önceliklendirirken (örn. hedef net/sıralamaya
      // göre tempo) ve dilini kişiselleştirirken kullanır.
      targetScoreType: z.string().max(20).optional(),
      examYear: z.number().int().optional(),
      targetUniversity: z.string().max(180).optional(),
      targetDepartment: z.string().max(180).optional(),
      targetRanking: z.string().max(60).optional(),
      dailyStudyDuration: z.number().int().min(0).max(960).optional(),
      preferredStudyMethods: z.array(z.string().max(40)).max(5).optional(),
      studyObstacles: z.string().max(500).optional(),
      coachingStyle: z.string().max(40).optional(),
      mainGoal: z.string().max(500).optional(),
    })
    .optional(),
});

const documentExtractionInput = z.object({
  dataUrl: z.string().min(20).max(12_000_000),
  mimeType: z.enum(["application/pdf", "image/png", "image/jpeg", "image/webp"]),
  fileName: z.string().max(180).optional(),
});

const bookPhotoInput = z.object({
  dataUrl: z.string().min(20).max(12_000_000),
  mimeType: z.enum(["image/png", "image/jpeg", "image/webp"]),
});

const bookPhotoSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    publisher: { type: "string" },
    subject: { type: "string" },
    exam: { type: "string", enum: ["TYT", "AYT", "LGS", "GENEL"] },
    authors: { type: "array", items: { type: "string" } },
    isbn: { type: "string" },
    edition: { type: "string" },
    confident: { type: "boolean" },
    imageKind: { type: "string", enum: ["cover", "table_of_contents", "other"] },
    // Alan bazında 0-1 güven: arayüz düşük güvenli alanı "kontrol et" diye işaretler.
    fieldConfidence: {
      type: "object",
      properties: { title: { type: "number" }, publisher: { type: "number" }, subject: { type: "number" }, exam: { type: "number" }, isbn: { type: "number" } },
      required: ["title", "publisher", "subject", "exam", "isbn"],
      additionalProperties: false,
    },
  },
  required: ["title", "publisher", "subject", "exam", "authors", "isbn", "edition", "confident", "imageKind", "fieldConfidence"],
  additionalProperties: false,
} as const;

type BookPhotoResult = {
  title: string;
  publisher: string;
  subject: string;
  exam: ExamKind | "GENEL";
  authors: string[];
  isbn: string;
  edition: string;
  confident: boolean;
  imageKind: "cover" | "table_of_contents" | "other";
  fieldConfidence: { title: number; publisher: number; subject: number; exam: number; isbn: number };
};

const clamp01 = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0);

const userExamInput = z.object({
  title: z.string().min(1).max(180),
  exam: z.enum(EXAM_KINDS),
  date: z.string().min(8).max(30),
  net: z.number().min(-100).max(200),
  delta: z.number().min(-200).max(200),
  subjects: z.record(z.string(), z.number().min(-50).max(100)),
  timeSpent: z.record(z.string(), z.number().int().min(0).max(1000)),
  topicNets: z.record(z.string(), z.number().min(-50).max(100)),
  topicDetails: z.array(z.object({ subject: z.string(), topic: z.string(), questionCount: z.number().int().min(0), correct: z.number().int().min(0), wrong: z.number().int().min(0), blank: z.number().int().min(0), accuracy: z.number().min(0).max(100), net: z.number().min(-50).max(100) })).max(300),
  importedFrom: z.enum(["manual", "ocr", "pdf", "csv", "xlsx"]),
  notes: z.string().max(5000).optional(),
});

const documentExtractionSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    date: { type: "string" },
    exam: { type: "string", enum: ["TYT", "AYT", "LGS"] },
    subjects: { type: "object", additionalProperties: { type: "number" } },
    timeSpent: { type: "object", additionalProperties: { type: "number" } },
    topics: {
      type: "array",
      items: {
        type: "object",
        properties: {
          subject: { type: "string" }, topic: { type: "string" }, questionCount: { type: "integer" },
          correct: { type: "integer" }, wrong: { type: "integer" }, blank: { type: "integer" },
          accuracy: { type: "number" }, net: { type: "number" },
        },
        required: ["subject", "topic", "questionCount", "correct", "wrong", "blank", "accuracy", "net"],
        additionalProperties: false,
      },
    },
    notes: { type: "string" },
  },
  required: ["title", "date", "exam", "subjects", "timeSpent", "topics", "notes"],
  additionalProperties: false,
} as const;

const fallbackPlan = {
  summary: "Bu hafta önce zayıf konuları küçültüyor, sonra deneme analizleriyle netlerini sabitliyoruz.",
  focus: [
    { topic: "Problemler", subject: "Matematik", reason: "Zayıf konu ve son denemede gelişim alanı." },
    { topic: "Paragrafta anlam", subject: "Türkçe", reason: "Günlük kısa tekrarlarla hız kazanılabilir." },
  ],
  days: [
    { day: "Pazartesi", date: "", totalMinutes: 90, sessions: [{ title: "Temel kavram tekrar", subject: "Matematik", topic: "Problemler", minutes: 35, kind: "Öğrenme", rationale: "Zayıf konunun temel adımlarını netleştir." }, { title: "Yeni nesil soru seti", subject: "Matematik", topic: "Problemler", minutes: 40, kind: "Soru", rationale: "Öğrenmeyi 20 soruyla pekiştir." }, { title: "Hata notu", subject: "Matematik", topic: "Problemler", minutes: 15, kind: "Tekrar", rationale: "Yanlışların nedenini tek cümlede yaz." }] },
    { day: "Salı", date: "", totalMinutes: 75, sessions: [{ title: "Paragraf hız turu", subject: "Türkçe", topic: "Paragrafta anlam", minutes: 35, kind: "Soru", rationale: "Süre tutarak 20 soru çöz." }, { title: "Yanlış analizi", subject: "Türkçe", topic: "Paragrafta anlam", minutes: 20, kind: "Tekrar", rationale: "Çeldirici türlerini ayır." }, { title: "Kısa tekrar", subject: "Matematik", topic: "Problemler", minutes: 20, kind: "Tekrar", rationale: "Dünkü hata notuna dön." }] },
  ],
  coachNote: "Her oturumun sonunda yanlış nedenini yaz; sadece doğru sayısını değil, düşünme biçimini de geliştir.",
};

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    // `passwordHash` (only ever set on local dev accounts, see
    // server/_core/localAuth.ts) must never reach the client — strip it here
    // rather than relying on every future caller of ctx.user to remember to.
    me: publicProcedure.query(opts => {
      if (!opts.ctx.user) return null;
      const { passwordHash: _passwordHash, ...safeUser } = opts.ctx.user;
      return safeUser;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    // Profil menüsündeki "Şifre değiştir". Tahmin denemelerine karşı kullanıcı
    // başına 15 dakikada 5 deneme.
    changePassword: protectedProcedure
      .input(z.object({ currentPassword: z.string().min(1).max(200), newPassword: z.string().min(1).max(200) }))
      .mutation(async ({ ctx, input }) => {
        try {
          checkRateLimit(`change-password:${ctx.user.id}`, 5, 15 * 60_000);
        } catch {
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Çok fazla deneme yaptın. 15 dakika sonra tekrar dener misin?" });
        }
        try {
          await changeLocalPassword(ctx.user.id, input.currentPassword, input.newPassword);
          return { success: true } as const;
        } catch (error) {
          if (error instanceof PasswordChangeError) throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
          throw error;
        }
      }),
    // "E-postanı doğrula" ekranının "Tekrar gönder" butonu. requireUser'ın
    // doğrulama/onay kapısından muaf (bkz. _core/trpc.ts APPROVAL_GATE_ALLOWLIST).
    resendVerificationEmail: protectedProcedure.mutation(async ({ ctx }) => {
      try {
        return await sendVerificationEmail(ctx.user, ctx.req);
      } catch (error) {
        console.error("[EmailVerification] resend failed:", error instanceof Error ? error.message : error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Doğrulama maili şu an gönderilemedi. Birkaç dakika sonra tekrar dener misin?" });
      }
    }),
  }),

  resources: router({
    snapshot: protectedProcedure.query(async ({ ctx }) => {
      const [inventory, logs, mappings, switches, customBooks] = await Promise.all([
        getBookInventory(ctx.user.id),
        getBookStudyLogs(ctx.user.id),
        getBookTopicMappings(ctx.user.id),
        getSourceSwitches(ctx.user.id),
        getUserResourceBooks(ctx.user.id),
      ]);
      return { inventory, logs, mappings, switches, customBooks };
    }),
    addBook: protectedProcedure.input(z.object({ bookId: z.string().max(120) })).mutation(({ ctx, input }) => addBookToInventory(ctx.user.id, input.bookId)),
    removeBook: protectedProcedure.input(z.object({ bookId: z.string().max(120) })).mutation(({ ctx, input }) => removeBookFromInventory(ctx.user.id, input.bookId)),
    addLog: protectedProcedure.input(z.object({ bookId: z.string().max(120), topic: z.string().max(180).optional(), sessionDate: z.string(), minutes: z.number().int().min(0).max(1440), questions: z.number().int().min(0).max(2000), correct: z.number().int().min(0).max(2000), wrong: z.number().int().min(0).max(2000), blank: z.number().int().min(0).max(2000), pageStart: z.number().int().min(0).optional(), pageEnd: z.number().int().min(0).optional(), testStart: z.number().int().min(0).optional(), testEnd: z.number().int().min(0).optional() })).mutation(({ ctx, input }) => addBookStudyLog(ctx.user.id, { ...input, sessionDate: new Date(input.sessionDate) })),
    upsertMapping: protectedProcedure.input(z.object({ bookId: z.string().max(120), topic: z.string().max(180), subject: z.string().max(80), pageStart: z.number().int().min(0).optional(), pageEnd: z.number().int().min(0).optional(), testStart: z.number().int().min(0).optional(), testEnd: z.number().int().min(0).optional() })).mutation(({ ctx, input }) => upsertBookTopicMapping(ctx.user.id, input)),
    addSwitch: protectedProcedure.input(z.object({ fromBookId: z.string().max(120).optional(), toBookId: z.string().max(120), reason: z.string().max(300) })).mutation(({ ctx, input }) => addSourceSwitch(ctx.user.id, { ...input, switchedAt: new Date() })),
    importBooks: protectedProcedure.input(z.object({ books: z.array(z.object({ id: z.string().max(120), title: z.string().min(1).max(180), publisher: z.string().max(120), subject: z.string().max(80), exam: z.enum(EXAM_KINDS), level: z.enum(["Kolay", "Orta", "Zor"]), format: z.string().max(120), reason: z.string().max(1000), sourceUrl: z.string().max(500).optional(), pageCount: z.number().int().min(0).optional(), tone: z.string().max(20), authors: z.string().max(300).optional(), isbn: z.string().max(32).optional() })).min(1).max(500) })).mutation(({ ctx, input }) => addUserResourceBooks(ctx.user.id, input.books)),
    // Öğrenci elindeki fiziksel kitabın kapak fotoğrafını çeker (telefon
    // kamerası); LLM görselden kitap adı/yayınevi/ders tahmini çıkarır.
    // Sadece TAHMİN döner — hiçbir şeyi otomatik kütüphaneye eklemez, öğrenci
    // formda düzeltip onaylamadan `importBooks`/`addBook` çağrılmaz (spec:
    // uydurma veri asıl kütüphaneye sessizce yazılmasın).
    extractBookFromPhoto: metredFeatureProcedure("OCR_BOOK_IMPORT").input(bookPhotoInput).mutation(async ({ input }) => {
      const fileCheck = validateDataUrl(input.dataUrl, input.mimeType);
      if (!fileCheck.valid) throw new Error(fileCheck.reason);
      try {
        // Kapak okuması kütüphanedeki kitabın kimliğini belirler: en güçlü model (kotası doluysa varsayılan model).
        const response = await invokeLLMWithTier({
          messages: [
            { role: "system", content: "Sen bir kitap kapağı tanıma asistanısın. Türkçe bir sınav hazırlık (YKS ya da LGS) kaynak kitabının kapak fotoğrafını okuyup kitap adını, yayınevini, dersini (Türkçe, Matematik, Fizik, Kimya, Biyoloji, Tarih, Coğrafya, Felsefe, Din Kültürü, Fen Bilimleri, İnkılap Tarihi, İngilizce, Genel) ve sınav kapsamını (TYT/AYT/LGS/GENEL) tahmin et. Kapakta 'LGS', '8. Sınıf' ya da 'Liselere Geçiş' yazıyorsa exam 'LGS' olsun. Kapakta yazıyorsa yazar adlarını (authors), ISBN numarasını (isbn, yalnızca kapakta/arkada gerçekten görünüyorsa) ve baskı bilgisini (edition, ör. 'Güncellenmiş Yeni Baskı', '2025-2026') da çıkar. Görselde net okuyamadığın bir alanı boş string / boş dizi bırak, uydurma. fieldConfidence her alan için 0-1 arası okuma güvenin; alan boşsa 0. Kitap adı kapakta birden çok satıra/puntoya bölünmüş olabilir (ör. büyük 'Paragraf' + altında 'SORU BANKASI'): bunları tek başlıkta, kelimelerin ilk harfi büyük birleştir ('Paragraf Soru Bankası'); 'Video çözümlü', 'Yeni nesil', '20 deneme ilaveli' gibi slogan/özellik satırlarını başlığa katma. Ders kapakta açıkça yazmıyorsa kitap adından çıkar (Paragraf, Dil Bilgisi, Sözcükte Anlam → Türkçe; Problemler, Temel Matematik → Matematik); o durumda subject güvenini en fazla 0.7 ver. 'TYT-AYT' ya da 'YKS' yazıyorsa ve tek bir sınava ait değilse exam 'GENEL' olsun. Fotoğraf yan (90°) ya da ters çekilmiş, kapağın bir kısmı kadraj dışında kalmış olabilir: yazıyı döndürerek oku ve görünen başlığı yine çıkar; kapağın kısmen görünmesi onu 'other' yapmaz. Yayınevi çoğu zaman yalnızca logo olarak (ör. köşedeki 'ÜçDörtBeş') görünür; logodaki adı yayınevi olarak yaz. Büyük dekoratif yazılar ve rakamlar da başlığın parçasıdır ('0'DAN BAŞLA' + 'START' + 'Matematik' → '0'dan Başla Start Matematik'); yazar/hoca adı ('Şenol Hoca') authors alanına gider. imageKind: görsel bir kitap KAPAĞIYSA 'cover'; kitabın içindekiler / konu listesi / kitap bitirme planı sayfasıysa 'table_of_contents'; başka bir şeyse 'other'. `confident` alanını yalnızca kapaktaki yazıları gerçekten net okuyabildiysen true yap." },
            { role: "user", content: [{ type: "text" as const, text: "Bu kitap kapağını oku." }, { type: "image_url" as const, image_url: { url: input.dataUrl, detail: "high" as const } }] },
          ],
          response_format: { type: "json_schema", json_schema: { name: "yks_book_cover", strict: true, schema: bookPhotoSchema } },
        }, "strong", invokeLLM);
        const raw = response.choices[0]?.message?.content;
        const jsonText = typeof raw === "string" ? raw : raw?.map((part) => part.type === "text" ? part.text : "").join("");
        if (!jsonText) throw new Error("Fotoğraftan yapılandırılmış veri alınamadı");
        const parsed = JSON.parse(jsonText) as BookPhotoResult;
        // OCR çıktısı olduğu gibi kabul edilmez: ISBN sağlama toplamıyla doğrulanır
        // (geçersizse boş + güven 0), güvenler 0-1'e sıkıştırılır.
        const isbn = normalizeIsbn(parsed.isbn);
        return {
          title: String(parsed.title ?? "").slice(0, 180),
          publisher: String(parsed.publisher ?? "").slice(0, 120),
          subject: String(parsed.subject ?? "").slice(0, 80),
          exam: parsed.exam,
          authors: (Array.isArray(parsed.authors) ? parsed.authors : []).map((author) => String(author).trim()).filter(Boolean).slice(0, 8),
          isbn: isbn ?? "",
          edition: String(parsed.edition ?? "").slice(0, 120),
          confident: Boolean(parsed.confident) && parsed.imageKind === "cover",
          imageKind: parsed.imageKind === "table_of_contents" || parsed.imageKind === "other" ? parsed.imageKind : ("cover" as const),
          fieldConfidence: { title: clamp01(parsed.fieldConfidence?.title), publisher: clamp01(parsed.fieldConfidence?.publisher), subject: clamp01(parsed.fieldConfidence?.subject), exam: clamp01(parsed.fieldConfidence?.exam), isbn: isbn ? clamp01(parsed.fieldConfidence?.isbn) : 0 },
        };
      } catch (error) {
        console.warn("[Book Photo] Extraction failed:", error);
        throw new Error(llmUnavailableMessage(error) ?? "Fotoğraf okunamadı. Daha net, ışıklı bir kapak fotoğrafı dener misin?");
      }
    }),
  }),

  exams: router({
    snapshot: protectedProcedure.query(({ ctx }) => getUserMockExams(ctx.user.id)),
    importMany: protectedProcedure.input(z.object({ exams: z.array(userExamInput).min(1).max(200) })).mutation(({ ctx, input }) => addUserMockExams(ctx.user.id, input.exams.map((exam) => ({ ...exam, examDate: new Date(exam.date) })))),
  }),

  calendar: router({
    snapshot: protectedProcedure.query(({ ctx }) => getStudyCalendar(ctx.user.id)),
    savePlan: protectedProcedure.input(z.object({ title: z.string().max(180), weekStart: z.string(), weekEnd: z.string(), summary: z.string().max(2000), source: z.enum(["ai", "manual"]).optional(), replacePrevious: z.boolean().optional(), sessions: z.array(z.object({ sessionDate: z.string(), title: z.string().max(180), subject: z.string().max(80), topic: z.string().max(180), kind: z.string().max(40), plannedMinutes: z.number().int().min(0).max(1440), targetQuestions: z.number().int().min(0).optional(), targetPages: z.string().max(80).nullable().optional(), targetTests: z.string().max(80).nullable().optional() })).max(100) })).mutation(({ ctx, input }) => saveStudyPlan(ctx.user.id, { ...input, weekStart: new Date(input.weekStart), weekEnd: new Date(input.weekEnd), sessions: input.sessions.map((session) => ({ ...session, sessionDate: new Date(session.sessionDate) })) })),
    completeSession: protectedProcedure.input(z.object({ sessionId: z.number().int(), actualMinutes: z.number().int().min(0).max(1440), actualQuestions: z.number().int().min(0).max(5000), correct: z.number().int().min(0).max(5000), wrong: z.number().int().min(0).max(5000), blank: z.number().int().min(0).max(5000), actualPages: z.number().int().min(0).max(5000).optional(), note: z.string().max(1000).optional() })).mutation(({ ctx, input }) => completeStudySession(ctx.user.id, input)),
    coachSnapshot: protectedProcedure.input(z.object({ periodStart: z.string(), periodEnd: z.string() })).query(async ({ ctx, input }) => { const { sessions, averageAccuracy } = await getPlanAdherenceInputs(ctx.user.id, new Date(input.periodStart), new Date(input.periodEnd)); return { ...calculatePlanAdherence(sessions, averageAccuracy), averageAccuracy, alerts: await getCoachAlerts(ctx.user.id) }; }),
    refreshCoach: protectedProcedure.input(z.object({ periodStart: z.string(), periodEnd: z.string() })).mutation(({ ctx, input }) => savePlanAdherence(ctx.user.id, new Date(input.periodStart), new Date(input.periodEnd))),
    // Üst çubuktaki bildirim zili: okunmamış koç uyarıları (yalnızca okuma; uyarıları refreshCoach üretir).
    alerts: protectedProcedure.query(({ ctx }) => getCoachAlerts(ctx.user.id)),
    readCoachAlert: protectedProcedure.input(z.object({ alertId: z.number().int() })).mutation(({ ctx, input }) => markCoachAlertRead(ctx.user.id, input.alertId)),
    addFocusLog: protectedProcedure.input(z.object({ subject: z.string().max(80), topic: z.string().max(180), studyDate: z.string(), minutes: z.number().int().min(1).max(1440), questions: z.number().int().min(0).max(5000), correct: z.number().int().min(0).max(5000), wrong: z.number().int().min(0).max(5000), blank: z.number().int().min(0).max(5000), note: z.string().max(1000).optional() })).mutation(({ ctx, input }) => addTopicStudyLog(ctx.user.id, { ...input, studyDate: new Date(input.studyDate), note: input.note ?? null, sessionId: null })),
    // Paragraf pratiği / gece okuması gibi "şimdi yaptım" alışkanlık kayıtları.
    logRoutine: protectedProcedure.input(z.object({ title: z.string().max(180), subject: z.string().max(80), topic: z.string().max(180), kind: z.string().max(40), plannedMinutes: z.number().int().min(0).max(1440), actualMinutes: z.number().int().min(0).max(1440), actualPages: z.number().int().min(0).max(5000).optional(), note: z.string().max(1000).optional(), readingBookId: z.number().int().positive().optional() })).mutation(async ({ ctx, input }) => {
      const { readingBookId, ...routine } = input;
      const calendar = await logCompletedRoutineSession(ctx.user.id, routine);
      // Gece okuması bir okuma kitabına bağlıysa okunan sayfalar kitabın ilerlemesine eklenir (yalnızca kendi kitabı).
      const readingBook = readingBookId && input.actualPages ? await recordReadingPages(ctx.user.id, readingBookId, input.actualPages) : null;
      return { calendar, readingBook };
    }),
  }),

  aiPlan: router({
    // GÜVENLİK DÜZELTMESİ (audit §F.1): bu uç nokta önceden `publicProcedure`
    // idi — girişsiz, sınırsız olarak herkes tarafından çağrılabilen, gerçek
    // bir LLM çağrısı yapan (maliyetli) bir işlemdi. Artık giriş + onay
    // zorunlu (`protectedProcedure` içeren `metredFeatureProcedure`) VE
    // free/premium'a göre kullanım kotalı (bkz. shared/entitlements.ts).
    generate: metredFeatureProcedure("AI_STUDY_PLAN").input(planInput).mutation(async ({ ctx, input }) => {
      const weakTopics = input.topics.filter((topic) => topic.status === "Zayıf");
      const recentExams = input.exams.slice(0, 3);
      const profile = input.studentProfile;
      // Sınav (YKS/LGS) istemciye değil sunucudaki profile dayanır.
      const serverProfile = ctx.user ? await getStudentProfile(ctx.user.id) : null;
      const track = serverProfile?.examTrack ?? "YKS";
      const lgsTargetContext = track === "LGS" && serverProfile && (serverProfile.targetHighSchool || serverProfile.targetLgsScore || serverProfile.examYear)
        ? `\n\nÖğrencinin hedefi (onboarding'den — kesin bir puan/okul garantisi verme, yalnızca bu hedefe uygun tempo ve odak öner): LGS ${serverProfile.examYear ?? "yılı belirtilmemiş"}, hedef lise ${serverProfile.targetHighSchool || "belirtilmemiş"}, hedef puan ${serverProfile.targetLgsScore || "belirtilmemiş"} / 500.`
        : "";
      const targetContext = track === "LGS" ? lgsTargetContext : profile && (profile.targetScoreType || profile.targetUniversity || profile.targetDepartment || profile.targetRanking || profile.examYear)
        ? `\n\nÖğrencinin hedefi (onboarding'den — planın önceliklerini buna göre kur, ama kesin bir sıralama/puan garantisi verme, sadece bu hedefe uygun bir tempo ve odak öner): hedef sınav yılı ${profile.examYear ?? "belirtilmemiş"}, hedef puan türü ${profile.targetScoreType ?? "belirtilmemiş"}, hedef üniversite ${profile.targetUniversity || "belirtilmemiş"}, hedef bölüm ${profile.targetDepartment || "belirtilmemiş"}, tahmini hedef sıralama ${profile.targetRanking || "belirtilmemiş"}.`
        : "";
      const coachingContext = profile && (profile.dailyStudyDuration || profile.preferredStudyMethods?.length || profile.studyObstacles || profile.coachingStyle || profile.mainGoal)
        ? `\n\nÖğrencinin koçluk tercihleri (varsa bunlara uy — örn. tercih ettiği çalışma yöntemine ağırlık ver, iletişim tarzına uygun bir dille yaz): ${JSON.stringify({ dailyStudyDuration: profile.dailyStudyDuration, preferredStudyMethods: profile.preferredStudyMethods, studyObstacles: profile.studyObstacles, coachingStyle: profile.coachingStyle, mainGoal: profile.mainGoal })}`
        : "";
      // Soru Defterim: öğrencinin son 60 günde çözemediği soruların konu dağılımı. Zayıflık
      // hesabının yerine geçmez; plana "defterdeki soruları tekrar" oturumları için ek sinyaldir.
      const notebookSignal = ctx.user ? await getNotebookPlanSignal(ctx.user.id).catch(() => null) : null;
      const notebookContext = notebookSignal
        ? `\n\nÖğrencinin Soru Defteri (kendi kaydettiği, henüz öğrenemediği sorular — bu konulara kısa "Tekrar" oturumları ekle, öğrenciyi etiketleme):\n${notebookSignal}`
        : "";
      // Ders programım: okul/dershane saatleri dışındaki gerçek boş zaman ve o gün okulda işlenen dersler.
      const planStart = input.startDate ? new Date(`${input.startDate}T12:00:00Z`) : new Date();
      const planDays = Array.from({ length: 7 }, (_, offset) => { const date = new Date(planStart.getTime() + offset * 86400000); return `${DAY_LABELS[weekdayOf(date) - 1]} ${date.toISOString().slice(0, 10)}`; });
      const scheduleSignal = ctx.user ? await getPlanScheduleContext(ctx.user.id, planStart).catch(() => null) : null;
      const scheduleContext = scheduleSignal
        ? `\n\nÖğrencinin okul/dershane programına göre bu haftanın boş zamanı (oturumları yalnızca bu aralıklara ve her günün boş dakikasını aşmayacak şekilde planla; 23:30'dan sonra oturum koyma; o gün okulda işlenen ${track} derslerine akşam kısa bir pekiştirme oturumu eklemek iyi olur):\n${scheduleSignal}`
        : "";
      const prompt = `${track === "LGS" ? "LGS'ye hazırlanan bir ortaokul öğrencisi" : "Bir YKS öğrencisi"} için 7 günlük uygulanabilir çalışma programı oluştur. Plan bugünden başlar; days dizisi sırasıyla şu 7 gün olsun ve her günün day alanına gün adını, date alanına YYYY-MM-DD tarihini yaz: ${planDays.join(", ")}. Hedef: ${input.goal}. Haftalık toplam süre: ${input.availableMinutes} dakika. Öncelik, zayıf konular ve son deneme performansı olsun. Zayıf konuları tamamen yok sayma; orta konulara pekiştirme, iyi konulara koruma oturumu ekle. ${track === "LGS" ? "Her gün toplam 45-120 dakika ve 2-4 kısa oturum planla (okul ve ödevlerle birlikte yorucu olmasın)." : "Her gün toplam 60-150 dakika ve 2-4 oturum planla."} Türkçe yanıt üret. Kişisel raftaki kitapları mümkün olduğunca ilgili zayıf konu oturumlarına bağla. Bir kitabın mappings alanında ilgili konu varsa targetPages alanına gerçek sayfa aralığını ve targetTests alanına gerçek test aralığını yaz; eşleştirme yoksa uydurma aralık verme, boş metin ("") bırak. Soru oturumlarında gerçekçi günlük soru hedefi yaz.\n\nZayıf/orta/iyi konu verisi:\n${JSON.stringify(input.topics)}\n\nÖncelikli zayıf konular:\n${JSON.stringify(weakTopics)}\n\nSon denemeler:\n${JSON.stringify(recentExams)}\n\nKişisel raf ve çözüm durumu:\n${JSON.stringify(input.books)}${targetContext}${coachingContext}${notebookContext}${scheduleContext}`;
      try {
        const response = await invokeLLM({
          reasoningEffort: "low",
          messages: [
            { role: "system", content: `Sen deneyimli, ölçülü ve motive edici bir ${track} çalışma koçusun. ${examPromptContext(track)} Sadece verilen verilere dayan; gerçekçi olmayan hedefler verme. Yanıtın JSON şemasına tam uysun.` },
            { role: "user", content: prompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "yks_weekly_plan",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  summary: { type: "string" },
                  focus: { type: "array", items: { type: "object", properties: { topic: { type: "string" }, subject: { type: "string" }, reason: { type: "string" } }, required: ["topic", "subject", "reason"], additionalProperties: false } },
                  days: { type: "array", minItems: 7, maxItems: 7, items: { type: "object", properties: { day: { type: "string" }, date: { type: "string" }, totalMinutes: { type: "integer" }, sessions: { type: "array", minItems: 2, maxItems: 4, items: { type: "object", properties: { title: { type: "string" }, subject: { type: "string" }, topic: { type: "string" }, minutes: { type: "integer" }, kind: { type: "string", enum: ["Öğrenme", "Soru", "Tekrar", "Deneme analizi"] }, rationale: { type: "string" }, bookId: { type: "string" }, bookTitle: { type: "string" }, targetQuestions: { type: "integer" }, targetPages: { type: "string" }, targetTests: { type: "string" } }, required: ["title", "subject", "topic", "minutes", "kind", "rationale"], additionalProperties: false } } }, required: ["day", "date", "totalMinutes", "sessions"], additionalProperties: false } },
                  coachNote: { type: "string" },
                },
                required: ["summary", "focus", "days", "coachNote"],
                additionalProperties: false,
              },
            },
          },
        });
        const content = response.choices[0]?.message?.content;
        const jsonText = typeof content === "string" ? content : content?.map((part) => part.type === "text" ? part.text : "").join("");
        const parsed = jsonText ? JSON.parse(jsonText) : null;
        const normalized = normalizeAiPlan(parsed, fallbackPlan);
        if (normalized === fallbackPlan) {
          console.warn("[AI Plan] Unusable AI response; keys:", parsed && typeof parsed === "object" ? Object.keys(parsed).join(",") : typeof parsed);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI planı okunamadı. Tekrar dener misin? Bu deneme hakkından düşmedi." });
        }
        return normalized;
      } catch (error) {
        // Herkese aynı hazır planı "AI planı" diye göstermek yerine dürüst hata: hak düşmez
        // (metredFeatureProcedure yalnızca başarıda sayar), takvime sahte plan yazılmaz.
        if (error instanceof TRPCError) throw error;
        console.warn("[AI Plan] LLM failed:", error);
        const quota = error instanceof LlmUnavailableError && error.reason === "quota";
        throw new TRPCError({
          code: quota ? "TOO_MANY_REQUESTS" : "INTERNAL_SERVER_ERROR",
          message: quota
            ? "Yapay zekâ servisinin kotası şu an dolu; AI planını birkaç saat sonra tekrar dener misin? Bu deneme hakkından düşmedi."
            : "AI planı şu an hazırlanamadı; biraz sonra tekrar dener misin? Bu deneme hakkından düşmedi.",
        });
      }
    }),
  }),

  examDocument: router({
    // GÜVENLİK DÜZELTMESİ (audit §F.1): bu, projenin en pahalı uç noktasıydı
    // (LLM vision çağrısı) ve girişsizdi. Artık giriş + onay zorunlu ve
    // free/premium kullanım kotasına tabi; ayrıca gönderilen dosya artık
    // gerçekten sunucu tarafında doğrulanıyor (magic bytes + gerçek boyut —
    // önceden yalnızca client'taki 8MB kontrolüne güveniliyordu).
    extract: metredFeatureProcedure("OCR_EXAM_IMPORT").input(documentExtractionInput).mutation(async ({ ctx, input }) => {
      const track = ctx.user ? (await getStudentProfile(ctx.user.id)).examTrack : "YKS";
      const examHint = track === "LGS"
        ? "Bu bir LGS denemesi (exam = 'LGS'): dersler Türkçe, İnkılap Tarihi, Din Kültürü, İngilizce, Matematik, Fen Bilimleri adlarıyla yazılsın; neti doğru - yanlış/3 olarak hesapla."
        : "Neti doğru - yanlış/4 olarak hesapla.";
      const fileCheck = validateDataUrl(input.dataUrl, input.mimeType);
      if (!fileCheck.valid) throw new Error(fileCheck.reason);
      const isImage = input.mimeType.startsWith("image/");
      const content = isImage
        ? [{ type: "text" as const, text: "Bu görseldeki dershane deneme sonuç belgesini oku." }, { type: "image_url" as const, image_url: { url: input.dataUrl, detail: "high" as const } }]
        : [{ type: "text" as const, text: "Bu PDF içindeki deneme sonuç belgesini oku." }, { type: "file_url" as const, file_url: { url: input.dataUrl, mime_type: "application/pdf" as const } }];
      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: `Sen ${track} deneme sonuç belgesi okuyucususun. Türkçe yanıt ver ve yalnızca belgede görülen verileri çıkar. Belge örnekteki gibi konu adı, soru sayısı, doğru, yanlış ve yüzde sütunları içerir. Her konu satırını ayrı kaydet. ${examHint} Bilinmeyen tarih için boş string, bilinmeyen süre için 0 kullan. Ders toplam netlerini subjects içinde, belge açıkça süre vermiyorsa timeSpent içinde 0 döndür. JSON şemasına tam uy.` },
            { role: "user", content },
          ],
          response_format: { type: "json_schema", json_schema: { name: "yks_exam_document", strict: true, schema: documentExtractionSchema } },
        });
        const raw = response.choices[0]?.message?.content;
        const jsonText = typeof raw === "string" ? raw : raw?.map((part) => part.type === "text" ? part.text : "").join("");
        if (!jsonText) throw new Error("Belgeden yapılandırılmış veri alınamadı");
        return JSON.parse(jsonText);
      } catch (error) {
        console.warn("[Exam Document] Extraction failed:", error);
        throw new Error("Belge okunamadı. Lütfen daha net bir PDF veya görsel yükleyin.");
      }
    }),
  }),

  topics: topicsRouter,
  bookContent: bookContentRouter,
  notes: notesRouter,
  questions: questionsRouter,
  classSchedule: classScheduleRouter,
  push: pushRouter,
  reading: readingRouter,
  org: orgRouter,
  catalog: resourceCatalogRouter,
  onboarding: onboardingRouter,
  subscription: subscriptionRouter,
  payment: paymentRouter,
  admin: adminRouter,
  testimonials: testimonialsRouter,
});

export type AppRouter = typeof appRouter;
