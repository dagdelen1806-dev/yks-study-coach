import { customType, decimal, index, integer, pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  // Yalnızca yerel giriş (`loginMethod` "dev" / "dev_email" / "dev_phone", bkz. server/_core/localAuth.ts)
  // kullanan hesaplarda dolu olur (scrypt `salt:hash`).
  passwordHash: varchar("passwordHash", { length: 255 }),
  // E-posta doğrulaması (bkz. server/_core/emailVerification.ts). Yalnızca
  // `loginMethod = "dev_email"` hesaplar için zorunlu; NULL = doğrulanmadı.
  // `emailVerificationSentAt` tekrar gönderme bekleme süresini sunucusuz
  // ortamda da (her instance ayrı bellek) güvenilir kılmak için DB'de tutulur.
  emailVerifiedAt: timestamp("emailVerifiedAt", { withTimezone: true }),
  emailVerificationSentAt: timestamp("emailVerificationSentAt", { withTimezone: true }),
  role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
  // Manuel üyelik onayı (PHASE 2 spec §admin-approval). Sütun varsayılanı
  // "approved" — bu, migration uygulandığında MEVCUT tüm hesapların
  // (bu oturumda test edilen gerçek hesap dahil) kilitlenmemesi içindir.
  // Yeni hesap oluşturma kodu (server/db.ts upsertUser'ın INSERT dalı)
  // bunu bilerek "pending" olarak GEÇERSİZ KILAR — yani sütun varsayılanı
  // yalnızca "geçmiş" kayıtlar için güvenli bir taban, uygulama mantığı her
  // zaman kazanır.
  approvalStatus: text("approvalStatus", { enum: ["pending", "approved", "rejected"] }).default("approved").notNull(),
  approvedAt: timestamp("approvedAt", { withTimezone: true }),
  approvedBy: integer("approvedBy"),
  rejectedAt: timestamp("rejectedAt", { withTimezone: true }),
  rejectionReason: varchar("rejectionReason", { length: 300 }),
  // Hesap yaşam döngüsü — subscription iptaliyle KARIŞTIRILMAMALI (spec §23).
  accountStatus: text("accountStatus", { enum: ["active", "suspended", "deleted"] }).default("active").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
  lastSignedIn: timestamp("lastSignedIn", { withTimezone: true }).defaultNow().notNull(),
});

export const yksTopics = pgTable("yks_topics", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  exam: text("exam", { enum: ["TYT", "AYT", "LGS"] }).notNull(),
  subject: varchar("subject", { length: 80 }).notNull(),
  topic: varchar("topic", { length: 180 }).notNull(),
  unit: varchar("unit", { length: 120 }).notNull(),
  sourceUrl: varchar("sourceUrl", { length: 500 }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

export const topicProgress = pgTable("topic_progress", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  topicId: integer("topicId").notNull(),
  progress: integer("progress").default(0).notNull(),
  status: text("status", { enum: ["weak", "medium", "good"] }).default("medium").notNull(),
  lastReviewedAt: timestamp("lastReviewedAt", { withTimezone: true }),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const mockExams = pgTable("mock_exams", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  exam: text("exam", { enum: ["TYT", "AYT", "LGS"] }).default("TYT").notNull(),
  examDate: timestamp("examDate", { withTimezone: true }).notNull(),
  turkceNet: integer("turkceNet").default(0).notNull(),
  matematikNet: integer("matematikNet").default(0).notNull(),
  fenNet: integer("fenNet").default(0).notNull(),
  sosyalNet: integer("sosyalNet").default(0).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

export const userMockExams = pgTable("user_mock_exams", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  exam: text("exam", { enum: ["TYT", "AYT", "LGS"] }).notNull(),
  examDate: timestamp("examDate", { withTimezone: true }).notNull(),
  net: decimal("net", { precision: 6, scale: 2 }).notNull(),
  delta: decimal("delta", { precision: 6, scale: 2 }).default("0").notNull(),
  subjectsJson: text("subjectsJson").notNull(),
  timeSpentJson: text("timeSpentJson").notNull(),
  topicNetsJson: text("topicNetsJson").notNull(),
  topicDetailsJson: text("topicDetailsJson").notNull(),
  importedFrom: text("importedFrom", { enum: ["manual", "ocr", "pdf", "csv", "xlsx"] }).default("manual").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

export const studySessions = pgTable("study_sessions", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  topicId: integer("topicId"),
  mode: text("mode", { enum: ["review", "practice", "analysis"] }).notNull(),
  minutes: integer("minutes").default(0).notNull(),
  completedAt: timestamp("completedAt", { withTimezone: true }).defaultNow().notNull(),
});

export const resources = pgTable("resources", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  title: varchar("title", { length: 180 }).notNull(),
  publisher: varchar("publisher", { length: 120 }).notNull(),
  subject: varchar("subject", { length: 80 }).notNull(),
  level: text("level", { enum: ["beginner", "medium", "advanced"] }).notNull(),
  reason: text("reason").notNull(),
  sourceUrl: varchar("sourceUrl", { length: 500 }),
});

export const userResourceBooks = pgTable("user_resource_books", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  bookId: varchar("bookId", { length: 120 }).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  publisher: varchar("publisher", { length: 120 }).notNull(),
  subject: varchar("subject", { length: 80 }).notNull(),
  exam: text("exam", { enum: ["TYT", "AYT", "LGS"] }).notNull(),
  level: text("level", { enum: ["Kolay", "Orta", "Zor"] }).notNull(),
  format: varchar("format", { length: 120 }).notNull(),
  reason: text("reason").notNull(),
  sourceUrl: varchar("sourceUrl", { length: 500 }),
  pageCount: integer("pageCount"),
  tone: varchar("tone", { length: 20 }).default("blue").notNull(),
  // Kapak OCR'ından (öğrenci onayladıktan sonra). ISBN varsa mükerrer kitap
  // tespitinde en güçlü kimliktir; yoksa yayınevi + normalize ad + yazar.
  authors: varchar("authors", { length: 300 }),
  isbn: varchar("isbn", { length: 32 }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

export const bookInventory = pgTable("book_inventory", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  bookId: varchar("bookId", { length: 120 }).notNull(),
  addedAt: timestamp("addedAt", { withTimezone: true }).defaultNow().notNull(),
  removedAt: timestamp("removedAt", { withTimezone: true }),
});

export const bookStudyLogs = pgTable("book_study_logs", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  bookId: varchar("bookId", { length: 120 }).notNull(),
  topic: varchar("topic", { length: 180 }),
  sessionDate: timestamp("sessionDate", { withTimezone: true }).notNull(),
  minutes: integer("minutes").default(0).notNull(),
  questions: integer("questions").default(0).notNull(),
  correct: integer("correct").default(0).notNull(),
  wrong: integer("wrong").default(0).notNull(),
  blank: integer("blank").default(0).notNull(),
  pageStart: integer("pageStart"),
  pageEnd: integer("pageEnd"),
  testStart: integer("testStart"),
  testEnd: integer("testEnd"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

export const bookTopicMappings = pgTable("book_topic_mappings", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  bookId: varchar("bookId", { length: 120 }).notNull(),
  topic: varchar("topic", { length: 180 }).notNull(),
  subject: varchar("subject", { length: 80 }).notNull(),
  pageStart: integer("pageStart"),
  pageEnd: integer("pageEnd"),
  testStart: integer("testStart"),
  testEnd: integer("testEnd"),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
});

// Öğrencinin kendi kitabının içindekileri (OCR ya da elle), satır satır: her
// test/ÖSYM tipi/simülasyon ayrı satır, müfredat konusuna (`yks_topics.id`)
// bağlı. `book_topic_mappings` konu başına ÖZET tutar (mevcut AI planı onu
// okur) — bu tablo ayrıntıdır; kaydederken özet de buradan yeniden üretilir
// (bkz. server/bookContent/bookContentDb.ts). Yalnızca öğrencinin ONAYLADIĞI
// içerik yazılır. Proje genelindeki desenle aynı şekilde FK yok; `userId`
// kapsamı uygulama katmanında zorunlu. Kitap raftan kaldırılınca satırlar
// silinmez (raf `removedAt` ile yumuşak silinir, geri eklenince içerik döner);
// aynı kitap yeniden taranınca o kitabın satırları tümüyle değiştirilir.
export const userBookContents = pgTable("user_book_contents", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  bookId: varchar("bookId", { length: 120 }).notNull(),
  sortOrder: integer("sortOrder").notNull(),
  unitNumber: integer("unitNumber"),
  unitTitle: varchar("unitTitle", { length: 300 }).notNull(),
  contentType: text("contentType", { enum: ["topic_test", "osym_type", "review", "simulation", "topic"] }).notNull(),
  label: varchar("label", { length: 120 }).notNull(),
  testNumber: integer("testNumber"),
  title: varchar("title", { length: 300 }).notNull(),
  pageStart: integer("pageStart"),
  pageEnd: integer("pageEnd"),
  topicId: integer("topicId"),
  mappingStatus: text("mappingStatus", { enum: ["confirmed", "unmatched", "not_applicable"] }).notNull(),
  mappingMethod: text("mappingMethod", { enum: ["exact_topic", "exact_alias", "contains_topic", "contains_alias", "fuzzy", "ai", "manual", "none"] }).default("none").notNull(),
  mappingConfidence: decimal("mappingConfidence", { precision: 4, scale: 3 }).default("0").notNull(),
  source: text("source", { enum: ["ocr", "manual"] }).default("ocr").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userBookIdx: index("user_book_contents_user_book_idx").on(table.userId, table.bookId),
  userTopicIdx: index("user_book_contents_user_topic_idx").on(table.userId, table.topicId),
}));

// ---------------------------------------------------------------------------
// Akıllı Defter (öğrenci notları). İçerik HTML DEĞİL: blok tabanlı JSON belge
// (ProseMirror/TipTap şeması; özel bloklar: formula, drawing, noteImage,
// voiceClip — bkz. shared/noteContent.ts). Yeni blok türü eklemek migration
// gerektirmez. `plainText` ve `stats` sunucuda içerikten üretilir (arama ve
// liste önizlemesi için; istemcinin gönderdiğine güvenilmez).
// Tüm bağlantılar opsiyoneldir; not hiçbir şeye bağlı olmak zorunda değildir.
// Proje genelindeki desenle aynı: FK yok, `userId` kapsamı uygulama katmanında zorunlu.
// ---------------------------------------------------------------------------
const mediumBlob = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "bytea" });

export const notes = pgTable("notes", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  // Çevrimdışı/yeniden gönderilen kayıtta aynı notun ikinci kez oluşmaması için istemcinin ürettiği kimlik.
  clientId: varchar("clientId", { length: 40 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),
  plainText: text("plainText").notNull(),
  // Liste önizlemesi: {"images":2,"voice":1,"voiceSeconds":32,"formulas":1,"drawings":0,...}
  stats: varchar("stats", { length: 500 }).notNull(),
  noteDate: timestamp("noteDate", { withTimezone: true }).notNull(),
  status: text("status", { enum: ["active", "archived"] }).default("active").notNull(),
  visibility: text("visibility", { enum: ["private"] }).default("private").notNull(),
  isFavorite: integer("isFavorite").default(0).notNull(),
  isPinned: integer("isPinned").default(0).notNull(),
  reviewAt: timestamp("reviewAt", { withTimezone: true }),
  templateKey: varchar("templateKey", { length: 40 }),
  subject: varchar("subject", { length: 80 }),
  topicId: integer("topicId"),
  bookId: varchar("bookId", { length: 120 }),
  bookContentId: integer("bookContentId"),
  studySessionId: integer("studySessionId"),
  mockExamId: integer("mockExamId"),
  version: integer("version").default(1).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => ({
  userClientUnique: uniqueIndex("notes_user_client_unique").on(table.userId, table.clientId),
  userDateIdx: index("notes_user_date_idx").on(table.userId, table.noteDate),
  userTopicIdx: index("notes_user_topic_idx").on(table.userId, table.topicId),
  userBookIdx: index("notes_user_book_idx").on(table.userId, table.bookId),
  userSessionIdx: index("notes_user_session_idx").on(table.userId, table.studySessionId),
  userReviewIdx: index("notes_user_review_idx").on(table.userId, table.reviewAt),
}));

export const noteTags = pgTable("note_tags", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  noteId: integer("noteId").notNull(),
  userId: integer("userId").notNull(),
  tag: varchar("tag", { length: 40 }).notNull(),
}, (table) => ({
  noteTagUnique: uniqueIndex("note_tags_note_tag_unique").on(table.noteId, table.tag),
  userTagIdx: index("note_tags_user_tag_idx").on(table.userId, table.tag),
}));

// Not ekleri (fotoğraf, ses kaydı). Şimdilik veritabanında, sıkı boyut
// sınırıyla (bkz. server/notes/config.ts) ve yalnızca sahibine, kimlik
// doğrulamalı uçtan sunulur. Depolama bir arayüz arkasında
// (server/notes/attachmentStorage.ts): nesne depolamaya geçiş tek dosya.
export const noteAttachments = pgTable("note_attachments", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  noteId: integer("noteId"),
  kind: text("kind", { enum: ["image", "audio"] }).notNull(),
  mimeType: varchar("mimeType", { length: 60 }).notNull(),
  byteSize: integer("byteSize").notNull(),
  data: mediumBlob("data").notNull(),
  durationSec: integer("durationSec"),
  ocrText: text("ocrText"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userNoteIdx: index("note_attachments_user_note_idx").on(table.userId, table.noteId),
}));

// Soru Defterim: öğrencinin çözemediği soru kartı. Kart bir notun içinde yaşar
// (noteId — ekler, takvim, arama), tekrar takvimi ve sonuçları burada tutulur.
// Kartın alanları asıl kaynaktır; not içeriği bunlardan yeniden üretilir
// (bkz. shared/questionNotebook.ts → buildQuestionDoc).
export const notebookQuestions = pgTable("notebook_questions", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  noteId: integer("noteId").notNull(),
  subject: varchar("subject", { length: 80 }),
  topicId: integer("topicId"),
  questionImageId: integer("questionImageId"),
  solutionImageId: integer("solutionImageId"),
  voiceAttachmentId: integer("voiceAttachmentId"),
  voiceDuration: integer("voiceDuration"),
  stuckPoint: text("stuckPoint"),
  solutionText: text("solutionText"),
  // Hata türü: AI önerirse "ai", öğrenci seçer ya da onaylarsa "student".
  errorType: varchar("errorType", { length: 30 }),
  errorTypeSource: text("errorTypeSource", { enum: ["student", "ai"] }),
  difficulty: text("difficulty", { enum: ["easy", "medium", "hard"] }),
  // AI'ın önerdiği konu (öğrenci düzelttiyse topicId'den farklı kalır: öneri isabeti ölçülebilsin).
  aiTopicId: integer("aiTopicId"),
  // ✨ Adım adım çöz: AI çözümü (JSON, AiSolution). Kartta saklanır; tekrar açmak yeniden ücret ödetmez.
  aiSolution: text("aiSolution"),
  aiSolutionAt: timestamp("aiSolutionAt", { withTimezone: true }),
  // Çözümü hangi kademe/model yazdı ("strong:gemini-…", üst kademeye çıkıldıysa sonu "↑"): maliyet ve isabet takibi.
  aiSolutionModel: varchar("aiSolutionModel", { length: 100 }),
  status: text("status", { enum: ["unsolved", "learning", "mastered"] }).default("unsolved").notNull(),
  reviewStage: integer("reviewStage").default(0).notNull(),
  nextReviewAt: timestamp("nextReviewAt", { withTimezone: true }),
  attemptCount: integer("attemptCount").default(0).notNull(),
  lastResult: text("lastResult", { enum: ["solved", "partial", "failed"] }),
  lastAttemptAt: timestamp("lastAttemptAt", { withTimezone: true }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => ({
  noteUnique: uniqueIndex("notebook_questions_note_unique").on(table.noteId),
  userReviewIdx: index("notebook_questions_user_review_idx").on(table.userId, table.nextReviewAt),
  userTopicIdx: index("notebook_questions_user_topic_idx").on(table.userId, table.topicId),
}));

// "Tekrar çöz" denemeleri: soru kartının gelişim geçmişi.
export const questionAttempts = pgTable("question_attempts", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  questionId: integer("questionId").notNull(),
  result: text("result", { enum: ["solved", "partial", "failed"] }).notNull(),
  sawSolution: integer("sawSolution").default(0).notNull(),
  // Kademeli ipucu: 0 yok, 1 ipucu, 2 ilk adım, 3 tam çözüm (HINT_LEVELS).
  hintLevel: integer("hintLevel").default(0).notNull(),
  seconds: integer("seconds"),
  stageBefore: integer("stageBefore").notNull(),
  attemptedAt: timestamp("attemptedAt", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userQuestionIdx: index("question_attempts_user_question_idx").on(table.userId, table.questionId),
}));

// Kitap içindekiler OCR sonucu önbelleği: aynı öğrencinin aynı fotoğrafı (SHA-256)
// aynı işlem hattı sürümüyle tekrar okunmaz. Görselin kendisi SAKLANMAZ; yalnızca
// okuma sonucu (JSON). Öğrenciye özeldir (userId), başka öğrenciyle paylaşılmaz.
export const ocrPageCache = pgTable("ocr_page_cache", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  imageHash: varchar("imageHash", { length: 64 }).notNull(),
  pipelineVersion: varchar("pipelineVersion", { length: 16 }).notNull(),
  resultJson: text("resultJson").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userHashUnique: uniqueIndex("ocr_page_cache_user_hash_unique").on(table.userId, table.imageHash, table.pipelineVersion),
}));

export const sourceSwitches = pgTable("source_switches", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  fromBookId: varchar("fromBookId", { length: 120 }),
  toBookId: varchar("toBookId", { length: 120 }).notNull(),
  reason: varchar("reason", { length: 300 }).notNull(),
  switchedAt: timestamp("switchedAt", { withTimezone: true }).defaultNow().notNull(),
});

export const studyPlans = pgTable("study_plans", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  weekStart: timestamp("weekStart", { withTimezone: true }).notNull(),
  weekEnd: timestamp("weekEnd", { withTimezone: true }).notNull(),
  summary: text("summary").notNull(),
  source: text("source", { enum: ["ai", "manual"] }).default("ai").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

export const studyPlanSessions = pgTable("study_plan_sessions", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  planId: integer("planId").notNull(),
  userId: integer("userId").notNull(),
  sessionDate: timestamp("sessionDate", { withTimezone: true }).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  subject: varchar("subject", { length: 80 }).notNull(),
  topic: varchar("topic", { length: 180 }).notNull(),
  kind: varchar("kind", { length: 40 }).notNull(),
  plannedMinutes: integer("plannedMinutes").default(0).notNull(),
  targetQuestions: integer("targetQuestions"),
  targetPages: varchar("targetPages", { length: 80 }),
  targetTests: varchar("targetTests", { length: 80 }),
  // Kitaptan üretilmiş görevde öğrencinin kitabı (bkz. userBookContents).
  // Tamamlanınca performans ayrıca bookStudyLogs'a da yazılır: kitap çözümü
  // ile konu/soru takibi ayrı veri olarak kalır ama bu alanla ilişkilenir.
  sourceBookId: varchar("sourceBookId", { length: 120 }),
  status: text("status", { enum: ["planned", "completed", "skipped"] }).default("planned").notNull(),
  rescheduledFrom: timestamp("rescheduledFrom", { withTimezone: true }),
  rescheduledAt: timestamp("rescheduledAt", { withTimezone: true }),
  rescheduleCount: integer("rescheduleCount").default(0).notNull(),
  // Kurum öğretmeninin atadığı görev (bkz. organization_*); öğrencinin kendi görevlerinde boş.
  assignedByUserId: integer("assignedByUserId"),
  assignedOrgId: integer("assignedOrgId"),
  completedAt: timestamp("completedAt", { withTimezone: true }),
  actualMinutes: integer("actualMinutes"),
  actualQuestions: integer("actualQuestions"),
  correct: integer("correct"),
  wrong: integer("wrong"),
  blank: integer("blank"),
  actualPages: integer("actualPages"),
  note: text("note"),
  // Oturum hatırlatma bildirimi gönderildiyse (server/push/sessionReminders.ts): aynı oturuma ikinci bildirim gitmez.
  reminderSentAt: timestamp("reminderSentAt", { withTimezone: true }),
  // Bu oturumdan açılan odak süre dolmadan bırakıldıysa (topics.markForReview): takvimde
  // "Yarım kaldı" görünür; oturum planlı kalır, yeniden başlatılıp tamamlanabilir.
  abandonedAt: timestamp("abandonedAt", { withTimezone: true }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

// Web Push abonelikleri (oturum hatırlatmaları): kullanıcı başına cihaz başına bir satır.
// Tarayıcı aboneliği geçersiz kılarsa (404/410) satır silinir.
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  endpoint: varchar("endpoint", { length: 600 }).notNull(),
  p256dh: varchar("p256dh", { length: 200 }).notNull(),
  auth: varchar("auth", { length: 100 }).notNull(),
  userAgent: varchar("userAgent", { length: 300 }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  lastSentAt: timestamp("lastSentAt", { withTimezone: true }),
}, (table) => ({
  endpointIdx: uniqueIndex("push_subscriptions_endpoint_idx").on(table.endpoint),
  userIdx: index("push_subscriptions_user_idx").on(table.userId),
}));

// Ders programım: okul/dershane/özel ders blokları — tek haftalık, her hafta tekrar eder
// (bkz. shared/classSchedule.ts). subject null = YKS dışı ders: takvimde gri, meşgul
// zaman sayılır ama plana ve analizlere girmez. Kayıt tüm programı birlikte değiştirir.
export const classScheduleBlocks = pgTable("class_schedule_blocks", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  source: text("source", { enum: ["school", "course", "tutor", "other"] }).default("school").notNull(),
  dayOfWeek: integer("dayOfWeek").notNull(),
  startTime: varchar("startTime", { length: 5 }).notNull(),
  endTime: varchar("endTime", { length: 5 }).notNull(),
  subject: varchar("subject", { length: 80 }),
  label: varchar("label", { length: 80 }).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userDayIdx: index("class_schedule_blocks_user_day_idx").on(table.userId, table.dayOfWeek),
}));

// =============================================================================
// Kurum Paneli: dershaneler, kendi öğrencilerinin (öğrencinin onayıyla) verisini izler.
// Öğrenci verisi tabloları değişmez; kurum erişimi yalnızca üyelik + atama tablolarından
// türetilir (bkz. server/org/orgAccess.ts).
// =============================================================================

export const organizations = pgTable("organizations", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  name: varchar("name", { length: 160 }).notNull(),
  slug: varchar("slug", { length: 80 }).notNull().unique(),
  status: text("status", { enum: ["active", "suspended"] }).default("active").notNull(),
  // Kurum bilgileri (Ayarlar → Kurum bilgileri; kurum yöneticisi düzenler).
  kind: text("kind", { enum: ["dershane", "okul", "etut", "kocluk", "diger"] }).default("dershane").notNull(),
  city: varchar("city", { length: 80 }),
  district: varchar("district", { length: 80 }),
  address: varchar("address", { length: 300 }),
  phone: varchar("phone", { length: 40 }),
  contactEmail: varchar("contactEmail", { length: 160 }),
  // Üyelik (platform yöneticisi tanımlar): paket, süre ve aylık AI kredi havuzu.
  plan: text("plan", { enum: ["trial", "standard", "pro"] }).default("trial").notNull(),
  membershipStartsAt: timestamp("membershipStartsAt", { withTimezone: true }),
  membershipEndsAt: timestamp("membershipEndsAt", { withTimezone: true }),
  aiCreditsMonthly: integer("aiCreditsMonthly").default(0).notNull(),
  // Kurum yöneticisinin öğrenci başına aylık üst sınırı (boş = sınırsız).
  perStudentCreditCap: integer("perStudentCreditCap"),
  // KVKK: boşsa platform şablonu kullanılır; her düzenlemede sürüm artar.
  kvkkNotice: text("kvkkNotice"),
  kvkkConsent: text("kvkkConsent"),
  kvkkVersion: integer("kvkkVersion").default(1).notNull(),
  kvkkUpdatedAt: timestamp("kvkkUpdatedAt", { withTimezone: true }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

/// Kurum yöneticisinin paket yükseltme / süre uzatma talebi; platform yöneticisi onaylar.
export const organizationUpgradeRequests = pgTable("organization_upgrade_requests", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  orgId: integer("orgId").notNull(),
  requestedBy: integer("requestedBy").notNull(),
  currentPlan: text("currentPlan", { enum: ["trial", "standard", "pro"] }).notNull(),
  requestedPlan: text("requestedPlan", { enum: ["trial", "standard", "pro"] }).notNull(),
  note: varchar("note", { length: 300 }),
  status: text("status", { enum: ["pending", "approved", "rejected", "canceled"] }).default("pending").notNull(),
  resolvedBy: integer("resolvedBy"),
  resolvedAt: timestamp("resolvedAt", { withTimezone: true }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  orgStatusIdx: index("organization_upgrade_requests_org_status_idx").on(table.orgId, table.status),
}));

// Kurum AI kredi havuzundan yapılan harcamalar (append-only; ay toplamı SUM ile).
export const organizationCreditUsage = pgTable("organization_credit_usage", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  orgId: integer("orgId").notNull(),
  userId: integer("userId").notNull(),
  featureKey: varchar("featureKey", { length: 60 }).notNull(),
  credits: integer("credits").notNull(),
  usedAt: timestamp("usedAt", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  orgUsedIdx: index("organization_credit_usage_org_used_idx").on(table.orgId, table.usedAt),
  orgUserUsedIdx: index("organization_credit_usage_org_user_used_idx").on(table.orgId, table.userId, table.usedAt),
}));

export const organizationMembers = pgTable("organization_members", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  orgId: integer("orgId").notNull(),
  userId: integer("userId").notNull(),
  role: text("role", { enum: ["owner", "admin", "coordinator", "teacher", "student"] }).notNull(),
  status: text("status", { enum: ["active", "left", "removed"] }).default("active").notNull(),
  // Öğrencinin "kurumun verilerimi görmesine izin veriyorum" onayı (personelde boş).
  consentAt: timestamp("consentAt", { withTimezone: true }),
  joinedAt: timestamp("joinedAt", { withTimezone: true }).defaultNow().notNull(),
  leftAt: timestamp("leftAt", { withTimezone: true }),
  invitedBy: integer("invitedBy"),
  // Personelin branşı (ör. Matematik); öğrencide boş.
  subject: varchar("subject", { length: 60 }),
  // Öğrencinin onayladığı KVKK metin sürümü (organizations.kvkkVersion).
  kvkkVersion: integer("kvkkVersion"),
  // Personelin pazar akşamı aldığı sınıf özeti (server/digest/teacherDigest.ts): üyelik başına,
  // varsayılan AÇIK. Son gönderim, cron tekrar çalışırsa aynı haftaya ikinci mail gitmesin diye.
  weeklyDigestOptOut: integer("weeklyDigestOptOut").default(0).notNull(),
  weeklyDigestLastSentAt: timestamp("weeklyDigestLastSentAt", { withTimezone: true }),
}, (table) => ({
  orgUserUnique: uniqueIndex("organization_members_org_user_unique").on(table.orgId, table.userId),
  userStatusIdx: index("organization_members_user_status_idx").on(table.userId, table.status),
}));

export const organizationInvitations = pgTable("organization_invitations", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  orgId: integer("orgId").notNull(),
  role: text("role", { enum: ["admin", "coordinator", "teacher", "student"] }).notNull(),
  // Kodun kendisi saklanmaz; yalnızca sha256 özeti (kod oluşturulurken bir kez gösterilir).
  codeHash: varchar("codeHash", { length: 64 }).notNull().unique(),
  note: varchar("note", { length: 160 }),
  // Öğretmen tanımlarken girilen branş; kabulde üyeliğe yazılır.
  subject: varchar("subject", { length: 60 }),
  expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
  maxUses: integer("maxUses").default(1).notNull(),
  usedCount: integer("usedCount").default(0).notNull(),
  createdBy: integer("createdBy").notNull(),
  revokedAt: timestamp("revokedAt", { withTimezone: true }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("organization_invitations_org_idx").on(table.orgId),
}));

export const organizationClasses = pgTable("organization_classes", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  orgId: integer("orgId").notNull(),
  name: varchar("name", { length: 80 }).notNull(),
  gradeLevel: varchar("gradeLevel", { length: 20 }),
  // Alan (SAY/EA/SÖZ/DİL/TYT) ve danışman (rehber) öğretmen.
  track: varchar("track", { length: 20 }),
  advisorUserId: integer("advisorUserId"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("organization_classes_org_idx").on(table.orgId),
}));

export const classStudents = pgTable("class_students", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  classId: integer("classId").notNull(),
  studentUserId: integer("studentUserId").notNull(),
}, (table) => ({
  classStudentUnique: uniqueIndex("class_students_class_student_unique").on(table.classId, table.studentUserId),
}));

export const teacherAssignments = pgTable("teacher_assignments", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  orgId: integer("orgId").notNull(),
  teacherUserId: integer("teacherUserId").notNull(),
  studentUserId: integer("studentUserId").notNull(),
  active: integer("active").default(1).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  pairUnique: uniqueIndex("teacher_assignments_pair_unique").on(table.orgId, table.teacherUserId, table.studentUserId),
}));

export const counselingNotes = pgTable("counseling_notes", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  orgId: integer("orgId").notNull(),
  studentUserId: integer("studentUserId").notNull(),
  authorUserId: integer("authorUserId").notNull(),
  body: text("body").notNull(),
  // staff: yalnızca kurum personeli görür; student: öğrenciye geri bildirim olarak gösterilir.
  visibility: text("visibility", { enum: ["staff", "student"] }).default("staff").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => ({
  orgStudentIdx: index("counseling_notes_org_student_idx").on(table.orgId, table.studentUserId),
}));

export const organizationAuditLogs = pgTable("organization_audit_logs", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  orgId: integer("orgId").notNull(),
  actorUserId: integer("actorUserId").notNull(),
  action: varchar("action", { length: 60 }).notNull(),
  targetType: varchar("targetType", { length: 40 }),
  targetId: integer("targetId"),
  metadataJson: text("metadataJson"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  orgCreatedIdx: index("organization_audit_logs_org_created_idx").on(table.orgId, table.createdAt),
}));

// Okuma kitapları (YKS dışı, gece okuması alışkanlığı): okunan sayfalar kitabın ilerlemesine eklenir.
export const readingBooks = pgTable("reading_books", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  author: varchar("author", { length: 120 }),
  totalPages: integer("totalPages"),
  pagesRead: integer("pagesRead").default(0).notNull(),
  status: text("status", { enum: ["reading", "finished"] }).default("reading").notNull(),
  finishedAt: timestamp("finishedAt", { withTimezone: true }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => ({
  userIdx: index("reading_books_user_idx").on(table.userId),
}));

export const topicStudyLogs = pgTable("topic_study_logs", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  sessionId: integer("sessionId"),
  subject: varchar("subject", { length: 80 }).notNull(),
  topic: varchar("topic", { length: 180 }).notNull(),
  studyDate: timestamp("studyDate", { withTimezone: true }).notNull(),
  minutes: integer("minutes").default(0).notNull(),
  questions: integer("questions").default(0).notNull(),
  correct: integer("correct").default(0).notNull(),
  wrong: integer("wrong").default(0).notNull(),
  blank: integer("blank").default(0).notNull(),
  note: text("note"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

export const planAdherenceReports = pgTable("plan_adherence_reports", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  periodType: text("periodType", { enum: ["day", "week", "month"] }).notNull(),
  periodStart: timestamp("periodStart", { withTimezone: true }).notNull(),
  periodEnd: timestamp("periodEnd", { withTimezone: true }).notNull(),
  overallScore: integer("overallScore").default(0).notNull(),
  sessionScore: integer("sessionScore").default(0).notNull(),
  timeScore: integer("timeScore").default(0).notNull(),
  questionScore: integer("questionScore").default(0).notNull(),
  punctualityScore: integer("punctualityScore").default(0).notNull(),
  plannedSessions: integer("plannedSessions").default(0).notNull(),
  completedSessions: integer("completedSessions").default(0).notNull(),
  plannedMinutes: integer("plannedMinutes").default(0).notNull(),
  actualMinutes: integer("actualMinutes").default(0).notNull(),
  targetQuestions: integer("targetQuestions").default(0).notNull(),
  actualQuestions: integer("actualQuestions").default(0).notNull(),
  rescheduledSessions: integer("rescheduledSessions").default(0).notNull(),
  summary: text("summary").notNull(),
  decision: varchar("decision", { length: 80 }).notNull(),
  snapshotJson: text("snapshotJson").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Student onboarding / coaching profile.
//
// One row per user (`userId` unique). `users.name`/`users.email` already
// come from OAuth — this table never repeats them, it only stores the
// student-facing preferences and coaching context gathered during
// onboarding (and later editable from the profile screen). List-shaped
// answers are stored as `...Json` text columns, matching the convention
// already used for `user_mock_exams.subjectsJson` / `topicNetsJson` etc.
// ---------------------------------------------------------------------------

// Veli erişimi (bkz. shared/parent.ts): öğrenci kod üretir (invited) → veli kodu girer ve rıza
// metnini onaylar (pending) → öğrenci onaylar (active) ya da iki taraftan biri kapatır (revoked).
export const parentLinks = pgTable("parent_links", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  studentUserId: integer("studentUserId").notNull(),
  parentUserId: integer("parentUserId"),
  // Kodun kendisi saklanmaz; yalnızca sha256 özeti (öğrenciye bir kez gösterilir).
  codeHash: varchar("codeHash", { length: 64 }).notNull().unique(),
  status: text("status", { enum: ["invited", "pending", "active", "revoked"] }).default("invited").notNull(),
  expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
  parentConsentAt: timestamp("parentConsentAt", { withTimezone: true }),
  parentConsentVersion: integer("parentConsentVersion"),
  studentApprovedAt: timestamp("studentApprovedAt", { withTimezone: true }),
  revokedAt: timestamp("revokedAt", { withTimezone: true }),
  // Velinin haftalık özet e-postası (bağlantı başına; varsayılan açık).
  weeklyDigestOptOut: integer("weeklyDigestOptOut").default(0).notNull(),
  weeklyDigestLastSentAt: timestamp("weeklyDigestLastSentAt", { withTimezone: true }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  studentIdx: index("parent_links_student_idx").on(table.studentUserId),
  parentIdx: index("parent_links_parent_idx").on(table.parentUserId),
}));

export const studentProfiles = pgTable("student_profiles", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull().unique(),

  onboardingCompleted: integer("onboardingCompleted").default(0).notNull(),
  // 0 = kullanıcı tanımlama, 1..4 = koçluk bilgisi adımları (bkz. shared/onboarding.ts STEP_ORDER).
  onboardingStep: integer("onboardingStep").default(0).notNull(),

  // 1) Kullanıcı tanımlama
  preferredName: varchar("preferredName", { length: 120 }),
  // Arayüz avatarı (öğrencinin seçimi; boşsa nötr tasarım). Bkz. shared/onboarding.ts AVATAR_STYLES.
  avatarStyle: text("avatarStyle", { enum: ["girl", "boy"] }),
  // Hazırlandığı sınav (bkz. shared/exams.ts): YKS (TYT+AYT) ya da LGS (8. sınıf).
  examTrack: text("examTrack", { enum: ["YKS", "LGS"] }).default("YKS").notNull(),
  gradeLevel: text("gradeLevel", { enum: ["7", "8", "9", "10", "11", "12", "mezun"] }),
  examYear: integer("examYear"),
  targetScoreType: text("targetScoreType", { enum: ["SAY", "EA", "SOZ", "DIL", "TYT", "belirsiz"] }),

  // 2) Akademik durum — free text: "yaklaşık net aralığı" veya "Bilmiyorum" gibi
  // metinsel değerlere izin vermek için sayısal değil varchar.
  currentTytNet: varchar("currentTytNet", { length: 40 }),
  currentAytNet: varchar("currentAytNet", { length: 40 }),
  currentLgsNet: varchar("currentLgsNet", { length: 40 }),
  mockExamFrequency: varchar("mockExamFrequency", { length: 60 }),
  strongSubjectsJson: text("strongSubjectsJson"),
  weakSubjectsJson: text("weakSubjectsJson"),
  hasPriorStudyPlan: integer("hasPriorStudyPlan"),

  // 3) Hedefler
  targetUniversity: varchar("targetUniversity", { length: 180 }),
  targetDepartment: varchar("targetDepartment", { length: 180 }),
  targetRanking: varchar("targetRanking", { length: 60 }),
  // LGS hedefi: lise (ör. "Fen Lisesi", okul adı) ve 500 üzerinden puan.
  targetHighSchool: varchar("targetHighSchool", { length: 180 }),
  targetLgsScore: varchar("targetLgsScore", { length: 20 }),
  mainGoal: text("mainGoal"),
  shortTermGoal: text("shortTermGoal"),
  longTermGoal: text("longTermGoal"),

  // 4) Çalışma düzeni
  dailyStudyDuration: integer("dailyStudyDuration"),
  // "HH:mm" — öğrencinin genelde ders çalışmaya başladığı saat; Pusula Odak
  // günlük planının gerçek saat dilimlerini (16:00–16:40, 16:50–17:30...)
  // buradan türetir (bkz. shared/focusPlan.ts generateDailyFocusPlan).
  preferredStudyStartTime: varchar("preferredStudyStartTime", { length: 5 }),
  // Ders programım'daki okul ders saatleri ([{start,end}], "HH:mm") — tablo düzenleyicinin satırları.
  schoolPeriodsJson: text("schoolPeriodsJson"),
  availableStudyDaysJson: text("availableStudyDaysJson"),
  preferredStudyTimesJson: text("preferredStudyTimesJson"),
  preferredStudyMethodsJson: text("preferredStudyMethodsJson"),
  studyObstacles: text("studyObstacles"),

  // 5) Koçluk tercihleri
  coachingExpectationsJson: text("coachingExpectationsJson"),
  notificationPreference: varchar("notificationPreference", { length: 60 }),
  coachingStyle: text("coachingStyle", { enum: ["destekleyici", "disiplinli", "kisa_net", "detayli", "dengeli"] }),
  additionalNotes: text("additionalNotes"),
  // "Zayıf konular için kitapları otomatik planla" — varsayılan KAPALI: kitap
  // görevleri yalnızca önerilir, öğrenci açıkça seçmeden plana girmez.
  autoScheduleBookTasks: integer("autoScheduleBookTasks").default(0).notNull(),
  // Pazar akşamı giden haftalık ilerleme özeti: varsayılan AÇIK, maildeki bağlantı
  // ya da profil menüsü kapatır. Son gönderim, cron tekrar çalışırsa aynı haftaya ikinci mail gitmesin diye.
  weeklyDigestOptOut: integer("weeklyDigestOptOut").default(0).notNull(),
  weeklyDigestLastSentAt: timestamp("weeklyDigestLastSentAt", { withTimezone: true }),

  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
});

// ---------------------------------------------------------------------------
// FAZ 4A — Resource Catalog + Difficulty Engine + Recommendation Engine
//
// Purely additive tables. They never replace `resources` / `userResourceBooks`
// / `bookInventory` (the student's personal shelf, unchanged from earlier
// phases) — this is a separate, global, admin-curated catalog layer that the
// personal shelf can optionally reference later via `catalogBookId`.
// ---------------------------------------------------------------------------

export const publishers = pgTable("publishers", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  name: varchar("name", { length: 180 }).notNull(),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  // Deterministic normalization key (lowercase, Turkish-folded, punctuation
  // stripped) used to detect "3D Yayınları" === "3D YAYINLARI" === "3D Yayinlari".
  normalizedName: varchar("normalizedName", { length: 200 }).notNull(),
  logoUrl: varchar("logoUrl", { length: 500 }),
  websiteUrl: varchar("websiteUrl", { length: 500 }),
  isActive: integer("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => ({
  normalizedNameIdx: index("publishers_normalized_name_idx").on(table.normalizedName),
}));

export const catalogBooks = pgTable("catalog_books", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  publisherId: integer("publisherId"),
  name: varchar("name", { length: 300 }).notNull(),
  slug: varchar("slug", { length: 320 }).notNull().unique(),
  isbn: varchar("isbn", { length: 32 }),
  editionYear: integer("editionYear"),
  description: text("description"),
  imageUrl: varchar("imageUrl", { length: 500 }),
  bookType: text("bookType", { enum: [
    "question_bank",
    "topic_explanation",
    "topic_explanation_question_bank",
    "mock_exam",
    "fasikul",
    "past_questions",
    "camp",
    "test_book",
    "reference",
    "other",
  ] }).default("other").notNull(),
  examScope: text("examScope", { enum: ["TYT", "AYT", "TYT_AYT", "YKS", "LGS", "GENEL"] }).default("GENEL").notNull(),
  // Free-text subject label kept consistent with `yks_topics.subject` /
  // `resources.subject` conventions (e.g. "Matematik", "Türkçe") — no parallel
  // subject table is introduced. Null means multi-subject/general product.
  subject: varchar("subject", { length: 80 }),
  difficultyScore: integer("difficultyScore").default(50).notNull(),
  difficultyLabel: text("difficultyLabel", { enum: ["easy", "medium", "hard"] }).default("medium").notNull(),
  difficultyConfidence: decimal("difficultyConfidence", { precision: 4, scale: 3 }).default("0").notNull(),
  classificationMethod: text("classificationMethod", { enum: ["rule", "ai", "hybrid", "manual"] }).default("rule").notNull(),
  manualOverride: integer("manualOverride").default(0).notNull(),
  needsReview: integer("needsReview").default(0).notNull(),
  classifiedAt: timestamp("classifiedAt", { withTimezone: true }),
  active: integer("active").default(1).notNull(),
  // Free-form JSON bag for source-specific extras that don't warrant their own column.
  metadata: text("metadata"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => ({
  publisherIdx: index("catalog_books_publisher_idx").on(table.publisherId),
  isbnIdx: index("catalog_books_isbn_idx").on(table.isbn),
  bookTypeIdx: index("catalog_books_book_type_idx").on(table.bookType),
  examScopeIdx: index("catalog_books_exam_scope_idx").on(table.examScope),
  subjectIdx: index("catalog_books_subject_idx").on(table.subject),
  difficultyLabelIdx: index("catalog_books_difficulty_label_idx").on(table.difficultyLabel),
  activeIdx: index("catalog_books_active_idx").on(table.active),
  needsReviewIdx: index("catalog_books_needs_review_idx").on(table.needsReview),
  createdAtIdx: index("catalog_books_created_at_idx").on(table.createdAt),
}));

// Raw, unmodified snapshot of what an external source returned. Canonical
// `catalogBooks` rows are only ever written by the pipeline's UPSERT step —
// never directly from a source adapter — so a source outage or format change
// can't corrupt canonical data.
export const externalBookSources = pgTable("external_book_sources", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  source: varchar("source", { length: 60 }).notNull(),
  sourceProductId: varchar("sourceProductId", { length: 160 }).notNull(),
  sourceUrl: varchar("sourceUrl", { length: 500 }),
  rawName: varchar("rawName", { length: 320 }),
  rawDescription: text("rawDescription"),
  rawPrice: decimal("rawPrice", { precision: 10, scale: 2 }),
  rawCurrency: varchar("rawCurrency", { length: 8 }).default("TRY"),
  rawImageUrl: varchar("rawImageUrl", { length: 500 }),
  rawPublisher: varchar("rawPublisher", { length: 200 }),
  rawCategory: varchar("rawCategory", { length: 200 }),
  rawIsbn: varchar("rawIsbn", { length: 32 }),
  rawMetadata: text("rawMetadata"),
  firstSeenAt: timestamp("firstSeenAt", { withTimezone: true }).defaultNow().notNull(),
  lastSeenAt: timestamp("lastSeenAt", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
  lastSyncedAt: timestamp("lastSyncedAt", { withTimezone: true }),
  syncStatus: text("syncStatus", { enum: ["pending", "processed", "needs_review", "failed"] }).default("pending").notNull(),
  matchedBookId: integer("matchedBookId"),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  sourceProductUnique: uniqueIndex("external_book_sources_source_product_unique").on(table.source, table.sourceProductId),
  syncStatusIdx: index("external_book_sources_sync_status_idx").on(table.syncStatus),
  matchedBookIdx: index("external_book_sources_matched_book_idx").on(table.matchedBookId),
  rawIsbnIdx: index("external_book_sources_raw_isbn_idx").on(table.rawIsbn),
}));

// Variable commercial data (price/stock/affiliate) kept out of the canonical
// book row so a source's price churn never touches classification/metadata.
export const bookOffers = pgTable("book_offers", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  bookId: integer("bookId").notNull(),
  source: varchar("source", { length: 60 }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 8 }).default("TRY").notNull(),
  stockStatus: text("stockStatus", { enum: ["in_stock", "out_of_stock", "unknown"] }).default("unknown").notNull(),
  productUrl: varchar("productUrl", { length: 500 }),
  affiliateUrl: varchar("affiliateUrl", { length: 500 }),
  affiliateEnabled: integer("affiliateEnabled").default(0).notNull(),
  lastSyncedAt: timestamp("lastSyncedAt", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  bookSourceUnique: uniqueIndex("book_offers_book_source_unique").on(table.bookId, table.source),
  bookIdx: index("book_offers_book_idx").on(table.bookId),
}));

export const bookCurriculumTopics = pgTable("book_curriculum_topics", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  bookId: integer("bookId").notNull(),
  topicId: integer("topicId").notNull(),
  mappingMethod: text("mappingMethod", { enum: ["rule", "ai", "manual"] }).default("rule").notNull(),
  confidence: decimal("confidence", { precision: 4, scale: 3 }).default("0").notNull(),
  isVerified: integer("isVerified").default(0).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => ({
  bookTopicUnique: uniqueIndex("book_curriculum_topics_book_topic_unique").on(table.bookId, table.topicId),
  topicIdx: index("book_curriculum_topics_topic_idx").on(table.topicId),
}));

export const resourceCatalogSyncLogs = pgTable("resource_catalog_sync_logs", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  source: varchar("source", { length: 60 }).notNull(),
  startedAt: timestamp("startedAt", { withTimezone: true }).notNull(),
  finishedAt: timestamp("finishedAt", { withTimezone: true }),
  dryRun: integer("dryRun").default(0).notNull(),
  fetched: integer("fetched").default(0).notNull(),
  created: integer("created").default(0).notNull(),
  updated: integer("updated").default(0).notNull(),
  skipped: integer("skipped").default(0).notNull(),
  failed: integer("failed").default(0).notNull(),
  needsReview: integer("needsReview").default(0).notNull(),
  statsJson: text("statsJson"),
  errorLog: text("errorLog"),
  triggeredBy: integer("triggeredBy"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  sourceIdx: index("resource_catalog_sync_logs_source_idx").on(table.source),
  startedAtIdx: index("resource_catalog_sync_logs_started_at_idx").on(table.startedAt),
}));

export const coachAlerts = pgTable("coach_alerts", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  reportId: integer("reportId"),
  level: text("level", { enum: ["info", "success", "warning", "action"] }).notNull(),
  ruleKey: varchar("ruleKey", { length: 80 }).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  message: text("message").notNull(),
  actionLabel: varchar("actionLabel", { length: 120 }),
  actionJson: text("actionJson"),
  isRead: integer("isRead").default(0).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

// =============================================================================
// SUBSCRIPTION / ENTITLEMENT / PAYMENT DOMAIN (PHASE 2)
// =============================================================================
// Provider-agnostic by design (spec §13/§40): `provider` columns hold
// "web" | "apple" | "google" | "manual" | null (free), never a hard dependency
// on one payment vendor. No FK constraints — consistent with the rest of this
// schema (see audit §G), relationships enforced in application code only.

export const subscriptionPlans = pgTable("subscription_plans", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  code: varchar("code", { length: 40 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  // basic = Temel, premium = Premium, premium_plus = Pro (bkz. shared/entitlements.ts).
  tier: text("tier", { enum: ["free", "basic", "premium", "premium_plus"] }).default("free").notNull(),
  billingPeriod: text("billingPeriod", { enum: ["none", "monthly", "yearly"] }).default("none").notNull(),
  // Kuruş cinsinden (minor unit) — ondalık/float fiyat yuvarlama hatalarından kaçınmak için.
  price: integer("price").default(0).notNull(),
  currency: varchar("currency", { length: 8 }).default("TRY").notNull(),
  trialDays: integer("trialDays").default(0).notNull(),
  storeProductId: varchar("storeProductId", { length: 180 }),
  provider: varchar("provider", { length: 40 }),
  isActive: integer("isActive").default(1).notNull(),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
});

// Kullanıcı başına TEK satır — planId/status zaman içinde bu satır üzerinde
// GÜNCELLENİR (yeni satır açılmaz). `trialStartedAt` bir kez set edildikten
// sonra kalıcıdır; "trial yalnızca bir kez" kuralı (spec §11) bu satırın hiç
// silinmemesine dayanır.
export const subscriptions = pgTable("subscriptions", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull().unique(),
  planId: integer("planId").notNull(),
  status: text("status", { enum: ["trialing", "active", "past_due", "grace_period", "canceled", "expired", "paused", "incomplete"] }).default("active").notNull(),
  trialStartedAt: timestamp("trialStartedAt", { withTimezone: true }),
  trialEndsAt: timestamp("trialEndsAt", { withTimezone: true }),
  currentPeriodStart: timestamp("currentPeriodStart", { withTimezone: true }),
  currentPeriodEnd: timestamp("currentPeriodEnd", { withTimezone: true }),
  canceledAt: timestamp("canceledAt", { withTimezone: true }),
  cancelAtPeriodEnd: integer("cancelAtPeriodEnd").default(0).notNull(),
  gracePeriodEndsAt: timestamp("gracePeriodEndsAt", { withTimezone: true }),
  provider: varchar("provider", { length: 40 }),
  providerSubscriptionId: varchar("providerSubscriptionId", { length: 180 }),
  providerCustomerId: varchar("providerCustomerId", { length: 180 }),
  latestPaymentId: integer("latestPaymentId"),
  // Admin'in elle verdiği erişim (spec §24: "manual entitlement ile provider
  // subscription birbirinden ayrı tutulmalı") — provider alanları boş kalır,
  // yalnızca bu bayrak + subscription_audit_logs kaydı ile iz sürülür.
  isManualOverride: integer("isManualOverride").default(0).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => ({
  statusIdx: index("subscriptions_status_idx").on(table.status),
  periodEndIdx: index("subscriptions_current_period_end_idx").on(table.currentPeriodEnd),
  providerSubIdx: index("subscriptions_provider_subscription_idx").on(table.providerSubscriptionId),
}));

export const payments = pgTable("payments", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  subscriptionId: integer("subscriptionId"),
  provider: varchar("provider", { length: 40 }).notNull(),
  providerPaymentId: varchar("providerPaymentId", { length: 180 }),
  providerTransactionId: varchar("providerTransactionId", { length: 180 }),
  amount: integer("amount").notNull(),
  currency: varchar("currency", { length: 8 }).default("TRY").notNull(),
  status: text("status", { enum: ["pending", "authorized", "paid", "failed", "refunded", "partially_refunded", "canceled"] }).default("pending").notNull(),
  paymentType: varchar("paymentType", { length: 40 }),
  paidAt: timestamp("paidAt", { withTimezone: true }),
  failedAt: timestamp("failedAt", { withTimezone: true }),
  refundedAt: timestamp("refundedAt", { withTimezone: true }),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => ({
  userIdx: index("payments_user_idx").on(table.userId),
  subscriptionIdx: index("payments_subscription_idx").on(table.subscriptionId),
  statusIdx: index("payments_status_idx").on(table.status),
}));

// Webhook idempotency (spec §6/§18) — (provider, eventId) unique: aynı event
// ikinci kez geldiğinde ikinci kez state değiştirilmez.
export const paymentEvents = pgTable("payment_events", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  provider: varchar("provider", { length: 40 }).notNull(),
  eventId: varchar("eventId", { length: 180 }).notNull(),
  eventType: varchar("eventType", { length: 80 }).notNull(),
  // Redaction uygulanmış payload (bkz. server/services/payments/webhookRedaction.ts) — ham kart/secret verisi asla yazılmaz.
  payload: text("payload").notNull(),
  signature: varchar("signature", { length: 500 }),
  processedAt: timestamp("processedAt", { withTimezone: true }),
  status: text("status", { enum: ["received", "processed", "failed", "ignored"] }).default("received").notNull(),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  providerEventUnique: uniqueIndex("payment_events_provider_event_unique").on(table.provider, table.eventId),
}));

export const subscriptionAuditLogs = pgTable("subscription_audit_logs", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  adminId: integer("adminId"),
  action: varchar("action", { length: 80 }).notNull(),
  oldState: text("oldState"),
  newState: text("newState"),
  reason: text("reason"),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index("subscription_audit_logs_user_idx").on(table.userId),
  createdAtIdx: index("subscription_audit_logs_created_at_idx").on(table.createdAt),
}));

// Maliyetli özellikler (AI plan, OCR) için kullanım sayacı (spec §32) — sabit
// bir "counter" sütunu yerine append-only log: pencere (ör. son 30 gün)
// içindeki satır sayısı COUNT edilerek limit kontrol edilir; reset cron'u gerekmez.
export const featureUsageLogs = pgTable("feature_usage_logs", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  featureKey: varchar("featureKey", { length: 60 }).notNull(),
  usedAt: timestamp("usedAt", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userFeatureIdx: index("feature_usage_logs_user_feature_idx").on(table.userId, table.featureKey, table.usedAt),
}));

// Uygulama hataları (Admin → Hatalar). Aynı hata tek satırda toplanır: `fingerprint`
// kaynak + mesaj + ilk yığın satırından türer, tekrar görülünce `count` artar ve
// çözülmüş hata yeniden açılır (`resolvedAt` boşalır).
// Öğrenci yorumları: öğrenci uygulamadan yazar (kişi başı tek yorum, düzenleyince yeniden onaya düşer),
// admin onaylar; yalnızca onaylananlar tanıtım sayfasında görünür (server/testimonials/testimonials.ts).
export const testimonials = pgTable("testimonials", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  displayName: varchar("displayName", { length: 60 }).notNull(),
  detail: varchar("detail", { length: 80 }),
  rating: integer("rating").notNull(),
  body: varchar("body", { length: 600 }).notNull(),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).default("pending").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
  reviewedAt: timestamp("reviewedAt", { withTimezone: true }),
  reviewedBy: integer("reviewedBy"),
}, (table) => ({
  userIdx: uniqueIndex("testimonials_user_idx").on(table.userId),
  statusIdx: index("testimonials_status_idx").on(table.status, table.updatedAt),
}));

export const appErrors = pgTable("app_errors", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  fingerprint: varchar("fingerprint", { length: 64 }).notNull(),
  source: text("source", { enum: ["client", "server"] }).notNull(),
  message: varchar("message", { length: 500 }).notNull(),
  stack: text("stack"),
  path: varchar("path", { length: 300 }),
  lastUserId: integer("lastUserId"),
  userAgent: varchar("userAgent", { length: 300 }),
  count: integer("count").default(1).notNull(),
  firstSeenAt: timestamp("firstSeenAt", { withTimezone: true }).defaultNow().notNull(),
  lastSeenAt: timestamp("lastSeenAt", { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp("resolvedAt", { withTimezone: true }),
}, (table) => ({
  fingerprintIdx: uniqueIndex("app_errors_fingerprint_idx").on(table.fingerprint),
  lastSeenIdx: index("app_errors_last_seen_idx").on(table.lastSeenAt),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type StudentProfile = typeof studentProfiles.$inferSelect;
export type InsertStudentProfile = typeof studentProfiles.$inferInsert;
export type YksTopic = typeof yksTopics.$inferSelect;
export type InsertYksTopic = typeof yksTopics.$inferInsert;
export type TopicProgress = typeof topicProgress.$inferSelect;
export type MockExam = typeof mockExams.$inferSelect;
export type UserMockExam = typeof userMockExams.$inferSelect;
export type StudySession = typeof studySessions.$inferSelect;
export type Resource = typeof resources.$inferSelect;
export type UserResourceBook = typeof userResourceBooks.$inferSelect;
export type BookInventory = typeof bookInventory.$inferSelect;
export type BookStudyLog = typeof bookStudyLogs.$inferSelect;
export type BookTopicMapping = typeof bookTopicMappings.$inferSelect;
export type SourceSwitch = typeof sourceSwitches.$inferSelect;
export type StudyPlan = typeof studyPlans.$inferSelect;
export type StudyPlanSession = typeof studyPlanSessions.$inferSelect;
export type TopicStudyLog = typeof topicStudyLogs.$inferSelect;
export type PlanAdherenceReport = typeof planAdherenceReports.$inferSelect;
export type CoachAlert = typeof coachAlerts.$inferSelect;
export type Publisher = typeof publishers.$inferSelect;
export type InsertPublisher = typeof publishers.$inferInsert;
export type CatalogBook = typeof catalogBooks.$inferSelect;
export type InsertCatalogBook = typeof catalogBooks.$inferInsert;
export type ExternalBookSource = typeof externalBookSources.$inferSelect;
export type InsertExternalBookSource = typeof externalBookSources.$inferInsert;
export type BookOffer = typeof bookOffers.$inferSelect;
export type BookCurriculumTopic = typeof bookCurriculumTopics.$inferSelect;
export type ResourceCatalogSyncLog = typeof resourceCatalogSyncLogs.$inferSelect;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = typeof subscriptionPlans.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;
export type PaymentEvent = typeof paymentEvents.$inferSelect;
export type InsertPaymentEvent = typeof paymentEvents.$inferInsert;
export type SubscriptionAuditLog = typeof subscriptionAuditLogs.$inferSelect;
export type FeatureUsageLog = typeof featureUsageLogs.$inferSelect;
