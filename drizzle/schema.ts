import { customType, decimal, index, int, mediumtext, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
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
  emailVerifiedAt: timestamp("emailVerifiedAt"),
  emailVerificationSentAt: timestamp("emailVerificationSentAt"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  // Manuel üyelik onayı (PHASE 2 spec §admin-approval). Sütun varsayılanı
  // "approved" — bu, migration uygulandığında MEVCUT tüm hesapların
  // (bu oturumda test edilen gerçek hesap dahil) kilitlenmemesi içindir.
  // Yeni hesap oluşturma kodu (server/db.ts upsertUser'ın INSERT dalı)
  // bunu bilerek "pending" olarak GEÇERSİZ KILAR — yani sütun varsayılanı
  // yalnızca "geçmiş" kayıtlar için güvenli bir taban, uygulama mantığı her
  // zaman kazanır.
  approvalStatus: mysqlEnum("approvalStatus", ["pending", "approved", "rejected"]).default("approved").notNull(),
  approvedAt: timestamp("approvedAt"),
  approvedBy: int("approvedBy"),
  rejectedAt: timestamp("rejectedAt"),
  rejectionReason: varchar("rejectionReason", { length: 300 }),
  // Hesap yaşam döngüsü — subscription iptaliyle KARIŞTIRILMAMALI (spec §23).
  accountStatus: mysqlEnum("accountStatus", ["active", "suspended", "deleted"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const yksTopics = mysqlTable("yks_topics", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  exam: mysqlEnum("exam", ["TYT", "AYT"]).notNull(),
  subject: varchar("subject", { length: 80 }).notNull(),
  topic: varchar("topic", { length: 180 }).notNull(),
  unit: varchar("unit", { length: 120 }).notNull(),
  sourceUrl: varchar("sourceUrl", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const topicProgress = mysqlTable("topic_progress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  topicId: int("topicId").notNull(),
  progress: int("progress").default(0).notNull(),
  status: mysqlEnum("status", ["weak", "medium", "good"]).default("medium").notNull(),
  lastReviewedAt: timestamp("lastReviewedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const mockExams = mysqlTable("mock_exams", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  exam: mysqlEnum("exam", ["TYT", "AYT"]).default("TYT").notNull(),
  examDate: timestamp("examDate").notNull(),
  turkceNet: int("turkceNet").default(0).notNull(),
  matematikNet: int("matematikNet").default(0).notNull(),
  fenNet: int("fenNet").default(0).notNull(),
  sosyalNet: int("sosyalNet").default(0).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const userMockExams = mysqlTable("user_mock_exams", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  exam: mysqlEnum("exam", ["TYT", "AYT"]).notNull(),
  examDate: timestamp("examDate").notNull(),
  net: decimal("net", { precision: 6, scale: 2 }).notNull(),
  delta: decimal("delta", { precision: 6, scale: 2 }).default("0").notNull(),
  subjectsJson: text("subjectsJson").notNull(),
  timeSpentJson: text("timeSpentJson").notNull(),
  topicNetsJson: text("topicNetsJson").notNull(),
  topicDetailsJson: text("topicDetailsJson").notNull(),
  importedFrom: mysqlEnum("importedFrom", ["manual", "ocr", "pdf", "csv", "xlsx"]).default("manual").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const studySessions = mysqlTable("study_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  topicId: int("topicId"),
  mode: mysqlEnum("mode", ["review", "practice", "analysis"]).notNull(),
  minutes: int("minutes").default(0).notNull(),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
});

export const resources = mysqlTable("resources", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 180 }).notNull(),
  publisher: varchar("publisher", { length: 120 }).notNull(),
  subject: varchar("subject", { length: 80 }).notNull(),
  level: mysqlEnum("level", ["beginner", "medium", "advanced"]).notNull(),
  reason: text("reason").notNull(),
  sourceUrl: varchar("sourceUrl", { length: 500 }),
});

export const userResourceBooks = mysqlTable("user_resource_books", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  bookId: varchar("bookId", { length: 120 }).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  publisher: varchar("publisher", { length: 120 }).notNull(),
  subject: varchar("subject", { length: 80 }).notNull(),
  exam: mysqlEnum("exam", ["TYT", "AYT"]).notNull(),
  level: mysqlEnum("level", ["Kolay", "Orta", "Zor"]).notNull(),
  format: varchar("format", { length: 120 }).notNull(),
  reason: text("reason").notNull(),
  sourceUrl: varchar("sourceUrl", { length: 500 }),
  pageCount: int("pageCount"),
  tone: varchar("tone", { length: 20 }).default("blue").notNull(),
  // Kapak OCR'ından (öğrenci onayladıktan sonra). ISBN varsa mükerrer kitap
  // tespitinde en güçlü kimliktir; yoksa yayınevi + normalize ad + yazar.
  authors: varchar("authors", { length: 300 }),
  isbn: varchar("isbn", { length: 32 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const bookInventory = mysqlTable("book_inventory", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  bookId: varchar("bookId", { length: 120 }).notNull(),
  addedAt: timestamp("addedAt").defaultNow().notNull(),
  removedAt: timestamp("removedAt"),
});

export const bookStudyLogs = mysqlTable("book_study_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  bookId: varchar("bookId", { length: 120 }).notNull(),
  topic: varchar("topic", { length: 180 }),
  sessionDate: timestamp("sessionDate").notNull(),
  minutes: int("minutes").default(0).notNull(),
  questions: int("questions").default(0).notNull(),
  correct: int("correct").default(0).notNull(),
  wrong: int("wrong").default(0).notNull(),
  blank: int("blank").default(0).notNull(),
  pageStart: int("pageStart"),
  pageEnd: int("pageEnd"),
  testStart: int("testStart"),
  testEnd: int("testEnd"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const bookTopicMappings = mysqlTable("book_topic_mappings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  bookId: varchar("bookId", { length: 120 }).notNull(),
  topic: varchar("topic", { length: 180 }).notNull(),
  subject: varchar("subject", { length: 80 }).notNull(),
  pageStart: int("pageStart"),
  pageEnd: int("pageEnd"),
  testStart: int("testStart"),
  testEnd: int("testEnd"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
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
export const userBookContents = mysqlTable("user_book_contents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  bookId: varchar("bookId", { length: 120 }).notNull(),
  sortOrder: int("sortOrder").notNull(),
  unitNumber: int("unitNumber"),
  unitTitle: varchar("unitTitle", { length: 300 }).notNull(),
  contentType: mysqlEnum("contentType", ["topic_test", "osym_type", "review", "simulation", "topic"]).notNull(),
  label: varchar("label", { length: 120 }).notNull(),
  testNumber: int("testNumber"),
  title: varchar("title", { length: 300 }).notNull(),
  pageStart: int("pageStart"),
  pageEnd: int("pageEnd"),
  topicId: int("topicId"),
  mappingStatus: mysqlEnum("mappingStatus", ["confirmed", "unmatched", "not_applicable"]).notNull(),
  mappingMethod: mysqlEnum("mappingMethod", ["exact_topic", "exact_alias", "contains_topic", "contains_alias", "fuzzy", "ai", "manual", "none"]).default("none").notNull(),
  mappingConfidence: decimal("mappingConfidence", { precision: 4, scale: 3 }).default("0").notNull(),
  source: mysqlEnum("source", ["ocr", "manual"]).default("ocr").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
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
const mediumBlob = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "mediumblob" });

export const notes = mysqlTable("notes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // Çevrimdışı/yeniden gönderilen kayıtta aynı notun ikinci kez oluşmaması için istemcinin ürettiği kimlik.
  clientId: varchar("clientId", { length: 40 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  content: mediumtext("content").notNull(),
  plainText: mediumtext("plainText").notNull(),
  // Liste önizlemesi: {"images":2,"voice":1,"voiceSeconds":32,"formulas":1,"drawings":0,...}
  stats: varchar("stats", { length: 500 }).notNull(),
  noteDate: timestamp("noteDate").notNull(),
  status: mysqlEnum("status", ["active", "archived"]).default("active").notNull(),
  visibility: mysqlEnum("visibility", ["private"]).default("private").notNull(),
  isFavorite: int("isFavorite").default(0).notNull(),
  isPinned: int("isPinned").default(0).notNull(),
  reviewAt: timestamp("reviewAt"),
  templateKey: varchar("templateKey", { length: 40 }),
  subject: varchar("subject", { length: 80 }),
  topicId: int("topicId"),
  bookId: varchar("bookId", { length: 120 }),
  bookContentId: int("bookContentId"),
  studySessionId: int("studySessionId"),
  mockExamId: int("mockExamId"),
  version: int("version").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userClientUnique: uniqueIndex("notes_user_client_unique").on(table.userId, table.clientId),
  userDateIdx: index("notes_user_date_idx").on(table.userId, table.noteDate),
  userTopicIdx: index("notes_user_topic_idx").on(table.userId, table.topicId),
  userBookIdx: index("notes_user_book_idx").on(table.userId, table.bookId),
  userSessionIdx: index("notes_user_session_idx").on(table.userId, table.studySessionId),
  userReviewIdx: index("notes_user_review_idx").on(table.userId, table.reviewAt),
}));

export const noteTags = mysqlTable("note_tags", {
  id: int("id").autoincrement().primaryKey(),
  noteId: int("noteId").notNull(),
  userId: int("userId").notNull(),
  tag: varchar("tag", { length: 40 }).notNull(),
}, (table) => ({
  noteTagUnique: uniqueIndex("note_tags_note_tag_unique").on(table.noteId, table.tag),
  userTagIdx: index("note_tags_user_tag_idx").on(table.userId, table.tag),
}));

// Not ekleri (fotoğraf, ses kaydı). Şimdilik veritabanında, sıkı boyut
// sınırıyla (bkz. server/notes/config.ts) ve yalnızca sahibine, kimlik
// doğrulamalı uçtan sunulur. Depolama bir arayüz arkasında
// (server/notes/attachmentStorage.ts): nesne depolamaya geçiş tek dosya.
export const noteAttachments = mysqlTable("note_attachments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  noteId: int("noteId"),
  kind: mysqlEnum("kind", ["image", "audio"]).notNull(),
  mimeType: varchar("mimeType", { length: 60 }).notNull(),
  byteSize: int("byteSize").notNull(),
  data: mediumBlob("data").notNull(),
  durationSec: int("durationSec"),
  ocrText: text("ocrText"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userNoteIdx: index("note_attachments_user_note_idx").on(table.userId, table.noteId),
}));

export const sourceSwitches = mysqlTable("source_switches", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  fromBookId: varchar("fromBookId", { length: 120 }),
  toBookId: varchar("toBookId", { length: 120 }).notNull(),
  reason: varchar("reason", { length: 300 }).notNull(),
  switchedAt: timestamp("switchedAt").defaultNow().notNull(),
});

export const studyPlans = mysqlTable("study_plans", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  weekStart: timestamp("weekStart").notNull(),
  weekEnd: timestamp("weekEnd").notNull(),
  summary: text("summary").notNull(),
  source: mysqlEnum("source", ["ai", "manual"]).default("ai").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const studyPlanSessions = mysqlTable("study_plan_sessions", {
  id: int("id").autoincrement().primaryKey(),
  planId: int("planId").notNull(),
  userId: int("userId").notNull(),
  sessionDate: timestamp("sessionDate").notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  subject: varchar("subject", { length: 80 }).notNull(),
  topic: varchar("topic", { length: 180 }).notNull(),
  kind: varchar("kind", { length: 40 }).notNull(),
  plannedMinutes: int("plannedMinutes").default(0).notNull(),
  targetQuestions: int("targetQuestions"),
  targetPages: varchar("targetPages", { length: 80 }),
  targetTests: varchar("targetTests", { length: 80 }),
  // Kitaptan üretilmiş görevde öğrencinin kitabı (bkz. userBookContents).
  // Tamamlanınca performans ayrıca bookStudyLogs'a da yazılır: kitap çözümü
  // ile konu/soru takibi ayrı veri olarak kalır ama bu alanla ilişkilenir.
  sourceBookId: varchar("sourceBookId", { length: 120 }),
  status: mysqlEnum("status", ["planned", "completed", "skipped"]).default("planned").notNull(),
  rescheduledFrom: timestamp("rescheduledFrom"),
  rescheduledAt: timestamp("rescheduledAt"),
  rescheduleCount: int("rescheduleCount").default(0).notNull(),
  completedAt: timestamp("completedAt"),
  actualMinutes: int("actualMinutes"),
  actualQuestions: int("actualQuestions"),
  correct: int("correct"),
  wrong: int("wrong"),
  blank: int("blank"),
  actualPages: int("actualPages"),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const topicStudyLogs = mysqlTable("topic_study_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  sessionId: int("sessionId"),
  subject: varchar("subject", { length: 80 }).notNull(),
  topic: varchar("topic", { length: 180 }).notNull(),
  studyDate: timestamp("studyDate").notNull(),
  minutes: int("minutes").default(0).notNull(),
  questions: int("questions").default(0).notNull(),
  correct: int("correct").default(0).notNull(),
  wrong: int("wrong").default(0).notNull(),
  blank: int("blank").default(0).notNull(),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const planAdherenceReports = mysqlTable("plan_adherence_reports", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  periodType: mysqlEnum("periodType", ["day", "week", "month"]).notNull(),
  periodStart: timestamp("periodStart").notNull(),
  periodEnd: timestamp("periodEnd").notNull(),
  overallScore: int("overallScore").default(0).notNull(),
  sessionScore: int("sessionScore").default(0).notNull(),
  timeScore: int("timeScore").default(0).notNull(),
  questionScore: int("questionScore").default(0).notNull(),
  punctualityScore: int("punctualityScore").default(0).notNull(),
  plannedSessions: int("plannedSessions").default(0).notNull(),
  completedSessions: int("completedSessions").default(0).notNull(),
  plannedMinutes: int("plannedMinutes").default(0).notNull(),
  actualMinutes: int("actualMinutes").default(0).notNull(),
  targetQuestions: int("targetQuestions").default(0).notNull(),
  actualQuestions: int("actualQuestions").default(0).notNull(),
  rescheduledSessions: int("rescheduledSessions").default(0).notNull(),
  summary: text("summary").notNull(),
  decision: varchar("decision", { length: 80 }).notNull(),
  snapshotJson: text("snapshotJson").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
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

export const studentProfiles = mysqlTable("student_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),

  onboardingCompleted: int("onboardingCompleted").default(0).notNull(),
  // 0 = kullanıcı tanımlama, 1..4 = koçluk bilgisi adımları (bkz. shared/onboarding.ts STEP_ORDER).
  onboardingStep: int("onboardingStep").default(0).notNull(),

  // 1) Kullanıcı tanımlama
  preferredName: varchar("preferredName", { length: 120 }),
  gradeLevel: mysqlEnum("gradeLevel", ["9", "10", "11", "12", "mezun"]),
  examYear: int("examYear"),
  targetScoreType: mysqlEnum("targetScoreType", ["SAY", "EA", "SOZ", "DIL", "TYT", "belirsiz"]),

  // 2) Akademik durum — free text: "yaklaşık net aralığı" veya "Bilmiyorum" gibi
  // metinsel değerlere izin vermek için sayısal değil varchar.
  currentTytNet: varchar("currentTytNet", { length: 40 }),
  currentAytNet: varchar("currentAytNet", { length: 40 }),
  mockExamFrequency: varchar("mockExamFrequency", { length: 60 }),
  strongSubjectsJson: text("strongSubjectsJson"),
  weakSubjectsJson: text("weakSubjectsJson"),
  hasPriorStudyPlan: int("hasPriorStudyPlan"),

  // 3) Hedefler
  targetUniversity: varchar("targetUniversity", { length: 180 }),
  targetDepartment: varchar("targetDepartment", { length: 180 }),
  targetRanking: varchar("targetRanking", { length: 60 }),
  mainGoal: text("mainGoal"),
  shortTermGoal: text("shortTermGoal"),
  longTermGoal: text("longTermGoal"),

  // 4) Çalışma düzeni
  dailyStudyDuration: int("dailyStudyDuration"),
  // "HH:mm" — öğrencinin genelde ders çalışmaya başladığı saat; Pusula Odak
  // günlük planının gerçek saat dilimlerini (16:00–16:40, 16:50–17:30...)
  // buradan türetir (bkz. shared/focusPlan.ts generateDailyFocusPlan).
  preferredStudyStartTime: varchar("preferredStudyStartTime", { length: 5 }),
  availableStudyDaysJson: text("availableStudyDaysJson"),
  preferredStudyTimesJson: text("preferredStudyTimesJson"),
  preferredStudyMethodsJson: text("preferredStudyMethodsJson"),
  studyObstacles: text("studyObstacles"),

  // 5) Koçluk tercihleri
  coachingExpectationsJson: text("coachingExpectationsJson"),
  notificationPreference: varchar("notificationPreference", { length: 60 }),
  coachingStyle: mysqlEnum("coachingStyle", ["destekleyici", "disiplinli", "kisa_net", "detayli", "dengeli"]),
  additionalNotes: text("additionalNotes"),
  // "Zayıf konular için kitapları otomatik planla" — varsayılan KAPALI: kitap
  // görevleri yalnızca önerilir, öğrenci açıkça seçmeden plana girmez.
  autoScheduleBookTasks: int("autoScheduleBookTasks").default(0).notNull(),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ---------------------------------------------------------------------------
// FAZ 4A — Resource Catalog + Difficulty Engine + Recommendation Engine
//
// Purely additive tables. They never replace `resources` / `userResourceBooks`
// / `bookInventory` (the student's personal shelf, unchanged from earlier
// phases) — this is a separate, global, admin-curated catalog layer that the
// personal shelf can optionally reference later via `catalogBookId`.
// ---------------------------------------------------------------------------

export const publishers = mysqlTable("publishers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  // Deterministic normalization key (lowercase, Turkish-folded, punctuation
  // stripped) used to detect "3D Yayınları" === "3D YAYINLARI" === "3D Yayinlari".
  normalizedName: varchar("normalizedName", { length: 200 }).notNull(),
  logoUrl: varchar("logoUrl", { length: 500 }),
  websiteUrl: varchar("websiteUrl", { length: 500 }),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  normalizedNameIdx: index("publishers_normalized_name_idx").on(table.normalizedName),
}));

export const catalogBooks = mysqlTable("catalog_books", {
  id: int("id").autoincrement().primaryKey(),
  publisherId: int("publisherId"),
  name: varchar("name", { length: 300 }).notNull(),
  slug: varchar("slug", { length: 320 }).notNull().unique(),
  isbn: varchar("isbn", { length: 32 }),
  editionYear: int("editionYear"),
  description: text("description"),
  imageUrl: varchar("imageUrl", { length: 500 }),
  bookType: mysqlEnum("bookType", [
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
  ]).default("other").notNull(),
  examScope: mysqlEnum("examScope", ["TYT", "AYT", "TYT_AYT", "YKS", "GENEL"]).default("GENEL").notNull(),
  // Free-text subject label kept consistent with `yks_topics.subject` /
  // `resources.subject` conventions (e.g. "Matematik", "Türkçe") — no parallel
  // subject table is introduced. Null means multi-subject/general product.
  subject: varchar("subject", { length: 80 }),
  difficultyScore: int("difficultyScore").default(50).notNull(),
  difficultyLabel: mysqlEnum("difficultyLabel", ["easy", "medium", "hard"]).default("medium").notNull(),
  difficultyConfidence: decimal("difficultyConfidence", { precision: 4, scale: 3 }).default("0").notNull(),
  classificationMethod: mysqlEnum("classificationMethod", ["rule", "ai", "hybrid", "manual"]).default("rule").notNull(),
  manualOverride: int("manualOverride").default(0).notNull(),
  needsReview: int("needsReview").default(0).notNull(),
  classifiedAt: timestamp("classifiedAt"),
  active: int("active").default(1).notNull(),
  // Free-form JSON bag for source-specific extras that don't warrant their own column.
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
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
export const externalBookSources = mysqlTable("external_book_sources", {
  id: int("id").autoincrement().primaryKey(),
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
  firstSeenAt: timestamp("firstSeenAt").defaultNow().notNull(),
  lastSeenAt: timestamp("lastSeenAt").defaultNow().onUpdateNow().notNull(),
  lastSyncedAt: timestamp("lastSyncedAt"),
  syncStatus: mysqlEnum("syncStatus", ["pending", "processed", "needs_review", "failed"]).default("pending").notNull(),
  matchedBookId: int("matchedBookId"),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  sourceProductUnique: uniqueIndex("external_book_sources_source_product_unique").on(table.source, table.sourceProductId),
  syncStatusIdx: index("external_book_sources_sync_status_idx").on(table.syncStatus),
  matchedBookIdx: index("external_book_sources_matched_book_idx").on(table.matchedBookId),
  rawIsbnIdx: index("external_book_sources_raw_isbn_idx").on(table.rawIsbn),
}));

// Variable commercial data (price/stock/affiliate) kept out of the canonical
// book row so a source's price churn never touches classification/metadata.
export const bookOffers = mysqlTable("book_offers", {
  id: int("id").autoincrement().primaryKey(),
  bookId: int("bookId").notNull(),
  source: varchar("source", { length: 60 }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 8 }).default("TRY").notNull(),
  stockStatus: mysqlEnum("stockStatus", ["in_stock", "out_of_stock", "unknown"]).default("unknown").notNull(),
  productUrl: varchar("productUrl", { length: 500 }),
  affiliateUrl: varchar("affiliateUrl", { length: 500 }),
  affiliateEnabled: int("affiliateEnabled").default(0).notNull(),
  lastSyncedAt: timestamp("lastSyncedAt").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  bookSourceUnique: uniqueIndex("book_offers_book_source_unique").on(table.bookId, table.source),
  bookIdx: index("book_offers_book_idx").on(table.bookId),
}));

export const bookCurriculumTopics = mysqlTable("book_curriculum_topics", {
  id: int("id").autoincrement().primaryKey(),
  bookId: int("bookId").notNull(),
  topicId: int("topicId").notNull(),
  mappingMethod: mysqlEnum("mappingMethod", ["rule", "ai", "manual"]).default("rule").notNull(),
  confidence: decimal("confidence", { precision: 4, scale: 3 }).default("0").notNull(),
  isVerified: int("isVerified").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  bookTopicUnique: uniqueIndex("book_curriculum_topics_book_topic_unique").on(table.bookId, table.topicId),
  topicIdx: index("book_curriculum_topics_topic_idx").on(table.topicId),
}));

export const resourceCatalogSyncLogs = mysqlTable("resource_catalog_sync_logs", {
  id: int("id").autoincrement().primaryKey(),
  source: varchar("source", { length: 60 }).notNull(),
  startedAt: timestamp("startedAt").notNull(),
  finishedAt: timestamp("finishedAt"),
  dryRun: int("dryRun").default(0).notNull(),
  fetched: int("fetched").default(0).notNull(),
  created: int("created").default(0).notNull(),
  updated: int("updated").default(0).notNull(),
  skipped: int("skipped").default(0).notNull(),
  failed: int("failed").default(0).notNull(),
  needsReview: int("needsReview").default(0).notNull(),
  statsJson: text("statsJson"),
  errorLog: text("errorLog"),
  triggeredBy: int("triggeredBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  sourceIdx: index("resource_catalog_sync_logs_source_idx").on(table.source),
  startedAtIdx: index("resource_catalog_sync_logs_started_at_idx").on(table.startedAt),
}));

export const coachAlerts = mysqlTable("coach_alerts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  reportId: int("reportId"),
  level: mysqlEnum("level", ["info", "success", "warning", "action"]).notNull(),
  ruleKey: varchar("ruleKey", { length: 80 }).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  message: text("message").notNull(),
  actionLabel: varchar("actionLabel", { length: 120 }),
  actionJson: text("actionJson"),
  isRead: int("isRead").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// =============================================================================
// SUBSCRIPTION / ENTITLEMENT / PAYMENT DOMAIN (PHASE 2)
// =============================================================================
// Provider-agnostic by design (spec §13/§40): `provider` columns hold
// "web" | "apple" | "google" | "manual" | null (free), never a hard dependency
// on one payment vendor. No FK constraints — consistent with the rest of this
// schema (see audit §G), relationships enforced in application code only.

export const subscriptionPlans = mysqlTable("subscription_plans", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 40 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  tier: mysqlEnum("tier", ["free", "premium", "premium_plus"]).default("free").notNull(),
  billingPeriod: mysqlEnum("billingPeriod", ["none", "monthly", "yearly"]).default("none").notNull(),
  // Kuruş cinsinden (minor unit) — ondalık/float fiyat yuvarlama hatalarından kaçınmak için.
  price: int("price").default(0).notNull(),
  currency: varchar("currency", { length: 8 }).default("TRY").notNull(),
  trialDays: int("trialDays").default(0).notNull(),
  storeProductId: varchar("storeProductId", { length: 180 }),
  provider: varchar("provider", { length: 40 }),
  isActive: int("isActive").default(1).notNull(),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Kullanıcı başına TEK satır — planId/status zaman içinde bu satır üzerinde
// GÜNCELLENİR (yeni satır açılmaz). `trialStartedAt` bir kez set edildikten
// sonra kalıcıdır; "trial yalnızca bir kez" kuralı (spec §11) bu satırın hiç
// silinmemesine dayanır.
export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  planId: int("planId").notNull(),
  status: mysqlEnum("status", ["trialing", "active", "past_due", "grace_period", "canceled", "expired", "paused", "incomplete"]).default("active").notNull(),
  trialStartedAt: timestamp("trialStartedAt"),
  trialEndsAt: timestamp("trialEndsAt"),
  currentPeriodStart: timestamp("currentPeriodStart"),
  currentPeriodEnd: timestamp("currentPeriodEnd"),
  canceledAt: timestamp("canceledAt"),
  cancelAtPeriodEnd: int("cancelAtPeriodEnd").default(0).notNull(),
  gracePeriodEndsAt: timestamp("gracePeriodEndsAt"),
  provider: varchar("provider", { length: 40 }),
  providerSubscriptionId: varchar("providerSubscriptionId", { length: 180 }),
  providerCustomerId: varchar("providerCustomerId", { length: 180 }),
  latestPaymentId: int("latestPaymentId"),
  // Admin'in elle verdiği erişim (spec §24: "manual entitlement ile provider
  // subscription birbirinden ayrı tutulmalı") — provider alanları boş kalır,
  // yalnızca bu bayrak + subscription_audit_logs kaydı ile iz sürülür.
  isManualOverride: int("isManualOverride").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  statusIdx: index("subscriptions_status_idx").on(table.status),
  periodEndIdx: index("subscriptions_current_period_end_idx").on(table.currentPeriodEnd),
  providerSubIdx: index("subscriptions_provider_subscription_idx").on(table.providerSubscriptionId),
}));

export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  subscriptionId: int("subscriptionId"),
  provider: varchar("provider", { length: 40 }).notNull(),
  providerPaymentId: varchar("providerPaymentId", { length: 180 }),
  providerTransactionId: varchar("providerTransactionId", { length: 180 }),
  amount: int("amount").notNull(),
  currency: varchar("currency", { length: 8 }).default("TRY").notNull(),
  status: mysqlEnum("status", ["pending", "authorized", "paid", "failed", "refunded", "partially_refunded", "canceled"]).default("pending").notNull(),
  paymentType: varchar("paymentType", { length: 40 }),
  paidAt: timestamp("paidAt"),
  failedAt: timestamp("failedAt"),
  refundedAt: timestamp("refundedAt"),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdx: index("payments_user_idx").on(table.userId),
  subscriptionIdx: index("payments_subscription_idx").on(table.subscriptionId),
  statusIdx: index("payments_status_idx").on(table.status),
}));

// Webhook idempotency (spec §6/§18) — (provider, eventId) unique: aynı event
// ikinci kez geldiğinde ikinci kez state değiştirilmez.
export const paymentEvents = mysqlTable("payment_events", {
  id: int("id").autoincrement().primaryKey(),
  provider: varchar("provider", { length: 40 }).notNull(),
  eventId: varchar("eventId", { length: 180 }).notNull(),
  eventType: varchar("eventType", { length: 80 }).notNull(),
  // Redaction uygulanmış payload (bkz. server/services/payments/webhookRedaction.ts) — ham kart/secret verisi asla yazılmaz.
  payload: text("payload").notNull(),
  signature: varchar("signature", { length: 500 }),
  processedAt: timestamp("processedAt"),
  status: mysqlEnum("status", ["received", "processed", "failed", "ignored"]).default("received").notNull(),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  providerEventUnique: uniqueIndex("payment_events_provider_event_unique").on(table.provider, table.eventId),
}));

export const subscriptionAuditLogs = mysqlTable("subscription_audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  adminId: int("adminId"),
  action: varchar("action", { length: 80 }).notNull(),
  oldState: text("oldState"),
  newState: text("newState"),
  reason: text("reason"),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("subscription_audit_logs_user_idx").on(table.userId),
  createdAtIdx: index("subscription_audit_logs_created_at_idx").on(table.createdAt),
}));

// Maliyetli özellikler (AI plan, OCR) için kullanım sayacı (spec §32) — sabit
// bir "counter" sütunu yerine append-only log: pencere (ör. son 30 gün)
// içindeki satır sayısı COUNT edilerek limit kontrol edilir; reset cron'u gerekmez.
export const featureUsageLogs = mysqlTable("feature_usage_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  featureKey: varchar("featureKey", { length: 60 }).notNull(),
  usedAt: timestamp("usedAt").defaultNow().notNull(),
}, (table) => ({
  userFeatureIdx: index("feature_usage_logs_user_feature_idx").on(table.userId, table.featureKey, table.usedAt),
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
