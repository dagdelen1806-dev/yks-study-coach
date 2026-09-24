import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { protectedProcedure, metredFeatureProcedure } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { validateDataUrl } from "./_core/fileValidation";
import { z } from "zod";
import { addBookStudyLog, addBookToInventory, addSourceSwitch, addTopicStudyLog, addUserMockExams, addUserResourceBooks, completeStudySession, getBookInventory, getBookStudyLogs, getBookTopicMappings, getCoachAlerts, getPlanAdherenceInputs, getSourceSwitches, getStudyCalendar, getUserMockExams, getUserResourceBooks, logCompletedRoutineSession, markCoachAlertRead, removeBookFromInventory, savePlanAdherence, saveStudyPlan, upsertBookTopicMapping } from "./db";
import { calculatePlanAdherence } from "../shared/planAdherence";
import { topicsRouter } from "./routers/topics";
import { resourceCatalogRouter } from "./routers/resourceCatalog";
import { onboardingRouter } from "./routers/onboarding";
import { subscriptionRouter } from "./routers/subscription";
import { paymentRouter } from "./routers/payment";
import { adminRouter } from "./routers/admin";

const planInput = z.object({
  topics: z.array(z.object({
    topic: z.string(),
    subject: z.string(),
    exam: z.enum(["TYT", "AYT"]),
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
    id: z.string(), title: z.string(), subject: z.string(), exam: z.enum(["TYT", "AYT"]), level: z.enum(["Kolay", "Orta", "Zor"]), pageCount: z.number().optional(), totalQuestions: z.number().optional(), accuracy: z.number().optional(), activeDays: z.number().optional(), mappings: z.array(z.object({ topic: z.string(), pageStart: z.number().optional(), pageEnd: z.number().optional(), testStart: z.number().optional(), testEnd: z.number().optional() })).max(50).optional(),
  })).max(30).default([]),
  availableMinutes: z.number().min(120).max(2400).default(600),
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
    exam: { type: "string", enum: ["TYT", "AYT", "GENEL"] },
    confident: { type: "boolean" },
  },
  required: ["title", "publisher", "subject", "exam", "confident"],
  additionalProperties: false,
} as const;

const userExamInput = z.object({
  title: z.string().min(1).max(180),
  exam: z.enum(["TYT", "AYT"]),
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
    exam: { type: "string", enum: ["TYT", "AYT"] },
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
    // server/_core/devAuth.ts) must never reach the client — strip it here
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
    importBooks: protectedProcedure.input(z.object({ books: z.array(z.object({ id: z.string().max(120), title: z.string().min(1).max(180), publisher: z.string().max(120), subject: z.string().max(80), exam: z.enum(["TYT", "AYT"]), level: z.enum(["Kolay", "Orta", "Zor"]), format: z.string().max(120), reason: z.string().max(1000), sourceUrl: z.string().max(500).optional(), pageCount: z.number().int().min(0).optional(), tone: z.string().max(20) })).min(1).max(500) })).mutation(({ ctx, input }) => addUserResourceBooks(ctx.user.id, input.books)),
    // Öğrenci elindeki fiziksel kitabın kapak fotoğrafını çeker (telefon
    // kamerası); LLM görselden kitap adı/yayınevi/ders tahmini çıkarır.
    // Sadece TAHMİN döner — hiçbir şeyi otomatik kütüphaneye eklemez, öğrenci
    // formda düzeltip onaylamadan `importBooks`/`addBook` çağrılmaz (spec:
    // uydurma veri asıl kütüphaneye sessizce yazılmasın).
    extractBookFromPhoto: metredFeatureProcedure("OCR_BOOK_IMPORT").input(bookPhotoInput).mutation(async ({ input }) => {
      const fileCheck = validateDataUrl(input.dataUrl, input.mimeType);
      if (!fileCheck.valid) throw new Error(fileCheck.reason);
      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "Sen bir kitap kapağı tanıma asistanısın. Türkçe bir YKS kaynak kitabının kapak fotoğrafını okuyup kitap adını, yayınevini, dersini (Türkçe, Matematik, Fizik, Kimya, Biyoloji, Tarih, Coğrafya, Felsefe, Din Kültürü, Genel) ve sınav kapsamını (TYT/AYT/GENEL) tahmin et. Görselde net okuyamadığın bir alanı boş string bırak, uydurma. `confident` alanını yalnızca kapaktaki yazıları gerçekten net okuyabildiysen true yap." },
            { role: "user", content: [{ type: "text" as const, text: "Bu kitap kapağını oku." }, { type: "image_url" as const, image_url: { url: input.dataUrl, detail: "high" as const } }] },
          ],
          response_format: { type: "json_schema", json_schema: { name: "yks_book_cover", strict: true, schema: bookPhotoSchema } },
        });
        const raw = response.choices[0]?.message?.content;
        const jsonText = typeof raw === "string" ? raw : raw?.map((part) => part.type === "text" ? part.text : "").join("");
        if (!jsonText) throw new Error("Fotoğraftan yapılandırılmış veri alınamadı");
        return JSON.parse(jsonText) as { title: string; publisher: string; subject: string; exam: "TYT" | "AYT" | "GENEL"; confident: boolean };
      } catch (error) {
        console.warn("[Book Photo] Extraction failed:", error);
        throw new Error("Fotoğraf okunamadı. Daha net, ışıklı bir kapak fotoğrafı dener misin?");
      }
    }),
  }),

  exams: router({
    snapshot: protectedProcedure.query(({ ctx }) => getUserMockExams(ctx.user.id)),
    importMany: protectedProcedure.input(z.object({ exams: z.array(userExamInput).min(1).max(200) })).mutation(({ ctx, input }) => addUserMockExams(ctx.user.id, input.exams.map((exam) => ({ ...exam, examDate: new Date(exam.date) })))),
  }),

  calendar: router({
    snapshot: protectedProcedure.query(({ ctx }) => getStudyCalendar(ctx.user.id)),
    savePlan: protectedProcedure.input(z.object({ title: z.string().max(180), weekStart: z.string(), weekEnd: z.string(), summary: z.string().max(2000), source: z.enum(["ai", "manual"]).optional(), sessions: z.array(z.object({ sessionDate: z.string(), title: z.string().max(180), subject: z.string().max(80), topic: z.string().max(180), kind: z.string().max(40), plannedMinutes: z.number().int().min(0).max(1440), targetQuestions: z.number().int().min(0).optional(), targetPages: z.string().max(80).nullable().optional(), targetTests: z.string().max(80).nullable().optional() })).max(100) })).mutation(({ ctx, input }) => saveStudyPlan(ctx.user.id, { ...input, weekStart: new Date(input.weekStart), weekEnd: new Date(input.weekEnd), sessions: input.sessions.map((session) => ({ ...session, sessionDate: new Date(session.sessionDate) })) })),
    completeSession: protectedProcedure.input(z.object({ sessionId: z.number().int(), actualMinutes: z.number().int().min(0).max(1440), actualQuestions: z.number().int().min(0).max(5000), correct: z.number().int().min(0).max(5000), wrong: z.number().int().min(0).max(5000), blank: z.number().int().min(0).max(5000), actualPages: z.number().int().min(0).max(5000).optional(), note: z.string().max(1000).optional() })).mutation(({ ctx, input }) => completeStudySession(ctx.user.id, input)),
    coachSnapshot: protectedProcedure.input(z.object({ periodStart: z.string(), periodEnd: z.string() })).query(async ({ ctx, input }) => { const { sessions, averageAccuracy } = await getPlanAdherenceInputs(ctx.user.id, new Date(input.periodStart), new Date(input.periodEnd)); return { ...calculatePlanAdherence(sessions, averageAccuracy), averageAccuracy, alerts: await getCoachAlerts(ctx.user.id) }; }),
    refreshCoach: protectedProcedure.input(z.object({ periodStart: z.string(), periodEnd: z.string() })).mutation(({ ctx, input }) => savePlanAdherence(ctx.user.id, new Date(input.periodStart), new Date(input.periodEnd))),
    readCoachAlert: protectedProcedure.input(z.object({ alertId: z.number().int() })).mutation(({ ctx, input }) => markCoachAlertRead(ctx.user.id, input.alertId)),
    addFocusLog: protectedProcedure.input(z.object({ subject: z.string().max(80), topic: z.string().max(180), studyDate: z.string(), minutes: z.number().int().min(1).max(1440), questions: z.number().int().min(0).max(5000), correct: z.number().int().min(0).max(5000), wrong: z.number().int().min(0).max(5000), blank: z.number().int().min(0).max(5000), note: z.string().max(1000).optional() })).mutation(({ ctx, input }) => addTopicStudyLog(ctx.user.id, { ...input, studyDate: new Date(input.studyDate), note: input.note ?? null, sessionId: null })),
    // Paragraf pratiği / gece okuması gibi "şimdi yaptım" alışkanlık kayıtları.
    logRoutine: protectedProcedure.input(z.object({ title: z.string().max(180), subject: z.string().max(80), topic: z.string().max(180), kind: z.string().max(40), plannedMinutes: z.number().int().min(0).max(1440), actualMinutes: z.number().int().min(0).max(1440), actualPages: z.number().int().min(0).max(5000).optional(), note: z.string().max(1000).optional() })).mutation(({ ctx, input }) => logCompletedRoutineSession(ctx.user.id, input)),
  }),

  aiPlan: router({
    // GÜVENLİK DÜZELTMESİ (audit §F.1): bu uç nokta önceden `publicProcedure`
    // idi — girişsiz, sınırsız olarak herkes tarafından çağrılabilen, gerçek
    // bir LLM çağrısı yapan (maliyetli) bir işlemdi. Artık giriş + onay
    // zorunlu (`protectedProcedure` içeren `metredFeatureProcedure`) VE
    // free/premium'a göre kullanım kotalı (bkz. shared/entitlements.ts).
    generate: metredFeatureProcedure("AI_STUDY_PLAN").input(planInput).mutation(async ({ input }) => {
      const weakTopics = input.topics.filter((topic) => topic.status === "Zayıf");
      const recentExams = input.exams.slice(0, 3);
      const profile = input.studentProfile;
      const targetContext = profile && (profile.targetScoreType || profile.targetUniversity || profile.targetDepartment || profile.targetRanking || profile.examYear)
        ? `\n\nÖğrencinin hedefi (onboarding'den — planın önceliklerini buna göre kur, ama kesin bir sıralama/puan garantisi verme, sadece bu hedefe uygun bir tempo ve odak öner): hedef sınav yılı ${profile.examYear ?? "belirtilmemiş"}, hedef puan türü ${profile.targetScoreType ?? "belirtilmemiş"}, hedef üniversite ${profile.targetUniversity || "belirtilmemiş"}, hedef bölüm ${profile.targetDepartment || "belirtilmemiş"}, tahmini hedef sıralama ${profile.targetRanking || "belirtilmemiş"}.`
        : "";
      const coachingContext = profile && (profile.dailyStudyDuration || profile.preferredStudyMethods?.length || profile.studyObstacles || profile.coachingStyle || profile.mainGoal)
        ? `\n\nÖğrencinin koçluk tercihleri (varsa bunlara uy — örn. tercih ettiği çalışma yöntemine ağırlık ver, iletişim tarzına uygun bir dille yaz): ${JSON.stringify({ dailyStudyDuration: profile.dailyStudyDuration, preferredStudyMethods: profile.preferredStudyMethods, studyObstacles: profile.studyObstacles, coachingStyle: profile.coachingStyle, mainGoal: profile.mainGoal })}`
        : "";
      const prompt = `Bir YKS öğrencisi için 7 günlük uygulanabilir çalışma programı oluştur. Hedef: ${input.goal}. Haftalık toplam süre: ${input.availableMinutes} dakika. Öncelik, zayıf konular ve son deneme performansı olsun. Zayıf konuları tamamen yok sayma; orta konulara pekiştirme, iyi konulara koruma oturumu ekle. Her gün toplam 60-150 dakika ve 2-4 oturum planla. Türkçe yanıt üret. Kişisel raftaki kitapları mümkün olduğunca ilgili zayıf konu oturumlarına bağla. Bir kitabın mappings alanında ilgili konu varsa targetPages alanına gerçek sayfa aralığını ve targetTests alanına gerçek test aralığını yaz; eşleştirme yoksa uydurma aralık verme, null bırak. Soru oturumlarında gerçekçi günlük soru hedefi yaz.\n\nZayıf/orta/iyi konu verisi:\n${JSON.stringify(input.topics)}\n\nÖncelikli zayıf konular:\n${JSON.stringify(weakTopics)}\n\nSon denemeler:\n${JSON.stringify(recentExams)}\n\nKişisel raf ve çözüm durumu:\n${JSON.stringify(input.books)}${targetContext}${coachingContext}`;
      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "Sen deneyimli, ölçülü ve motive edici bir YKS çalışma koçusun. Sadece verilen verilere dayan; gerçekçi olmayan hedefler verme. Yanıtın JSON şemasına tam uysun." },
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
                  days: { type: "array", minItems: 7, maxItems: 7, items: { type: "object", properties: { day: { type: "string" }, date: { type: "string" }, totalMinutes: { type: "integer" }, sessions: { type: "array", minItems: 2, maxItems: 4, items: { type: "object", properties: { title: { type: "string" }, subject: { type: "string" }, topic: { type: "string" }, minutes: { type: "integer" }, kind: { type: "string", enum: ["Öğrenme", "Soru", "Tekrar", "Deneme analizi"] }, rationale: { type: "string" }, bookId: { type: "string" }, bookTitle: { type: "string" }, targetQuestions: { type: "integer" }, targetPages: { type: ["string", "null"] }, targetTests: { type: ["string", "null"] } }, required: ["title", "subject", "topic", "minutes", "kind", "rationale"], additionalProperties: false } } }, required: ["day", "date", "totalMinutes", "sessions"], additionalProperties: false } },
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
        if (!jsonText) return fallbackPlan;
        return JSON.parse(jsonText);
      } catch (error) {
        console.warn("[AI Plan] Falling back to deterministic plan:", error);
        return fallbackPlan;
      }
    }),
  }),

  examDocument: router({
    // GÜVENLİK DÜZELTMESİ (audit §F.1): bu, projenin en pahalı uç noktasıydı
    // (LLM vision çağrısı) ve girişsizdi. Artık giriş + onay zorunlu ve
    // free/premium kullanım kotasına tabi; ayrıca gönderilen dosya artık
    // gerçekten sunucu tarafında doğrulanıyor (magic bytes + gerçek boyut —
    // önceden yalnızca client'taki 8MB kontrolüne güveniliyordu).
    extract: metredFeatureProcedure("OCR_EXAM_IMPORT").input(documentExtractionInput).mutation(async ({ input }) => {
      const fileCheck = validateDataUrl(input.dataUrl, input.mimeType);
      if (!fileCheck.valid) throw new Error(fileCheck.reason);
      const isImage = input.mimeType.startsWith("image/");
      const content = isImage
        ? [{ type: "text" as const, text: "Bu görseldeki dershane deneme sonuç belgesini oku." }, { type: "image_url" as const, image_url: { url: input.dataUrl, detail: "high" as const } }]
        : [{ type: "text" as const, text: "Bu PDF içindeki deneme sonuç belgesini oku." }, { type: "file_url" as const, file_url: { url: input.dataUrl, mime_type: "application/pdf" as const } }];
      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "Sen YKS deneme sonuç belgesi okuyucususun. Türkçe yanıt ver ve yalnızca belgede görülen verileri çıkar. Belge örnekteki gibi konu adı, soru sayısı, doğru, yanlış ve yüzde sütunları içerir. Her konu satırını ayrı kaydet. Neti doğru - yanlış/4 olarak hesapla; bilinmeyen tarih için boş string, bilinmeyen süre için 0 kullan. Ders toplam netlerini subjects içinde, belge açıkça süre vermiyorsa timeSpent içinde 0 döndür. JSON şemasına tam uy." },
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
  catalog: resourceCatalogRouter,
  onboarding: onboardingRouter,
  subscription: subscriptionRouter,
  payment: paymentRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
