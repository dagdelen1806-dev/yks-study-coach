// server/_core/vercelHandler.ts
import "dotenv/config";

// server/_core/app.ts
import express2 from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";
var APPROVAL_PENDING_ERR_MSG = "Account approval pending (10003)";
var APPROVAL_REJECTED_ERR_MSG = "Account approval rejected (10004)";
var PREMIUM_REQUIRED_ERR_MSG = "Premium subscription required (10005)";
var RATE_LIMITED_ERR_MSG = "Too many requests (10006)";
var OAUTH_STATE_COOKIE = "__Host-oauth_state";
var decodeOAuthState = (state) => {
  let decoded;
  try {
    decoded = atob(state);
  } catch {
    return { redirectUri: "" };
  }
  try {
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed.redirectUri === "string") return parsed;
  } catch {
  }
  return { redirectUri: decoded };
};

// server/_core/oauth.ts
import { parse as parseCookieHeader2 } from "cookie";

// server/db.ts
import { and, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

// drizzle/schema.ts
import { decimal, index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";
var users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  // Yalnızca yerel test girişi (`loginMethod = "dev"`, bkz. server/_core/devAuth.ts)
  // kullanan hesaplarda dolu olur — gerçek Manus OAuth hesapları hiç şifre
  // tutmaz, kimlik doğrulaması tamamen OAuth sağlayıcısındadır.
  passwordHash: varchar("passwordHash", { length: 255 }),
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
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var yksTopics = mysqlTable("yks_topics", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  exam: mysqlEnum("exam", ["TYT", "AYT"]).notNull(),
  subject: varchar("subject", { length: 80 }).notNull(),
  topic: varchar("topic", { length: 180 }).notNull(),
  unit: varchar("unit", { length: 120 }).notNull(),
  sourceUrl: varchar("sourceUrl", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var topicProgress = mysqlTable("topic_progress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  topicId: int("topicId").notNull(),
  progress: int("progress").default(0).notNull(),
  status: mysqlEnum("status", ["weak", "medium", "good"]).default("medium").notNull(),
  lastReviewedAt: timestamp("lastReviewedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var mockExams = mysqlTable("mock_exams", {
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
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var userMockExams = mysqlTable("user_mock_exams", {
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
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var studySessions = mysqlTable("study_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  topicId: int("topicId"),
  mode: mysqlEnum("mode", ["review", "practice", "analysis"]).notNull(),
  minutes: int("minutes").default(0).notNull(),
  completedAt: timestamp("completedAt").defaultNow().notNull()
});
var resources = mysqlTable("resources", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 180 }).notNull(),
  publisher: varchar("publisher", { length: 120 }).notNull(),
  subject: varchar("subject", { length: 80 }).notNull(),
  level: mysqlEnum("level", ["beginner", "medium", "advanced"]).notNull(),
  reason: text("reason").notNull(),
  sourceUrl: varchar("sourceUrl", { length: 500 })
});
var userResourceBooks = mysqlTable("user_resource_books", {
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
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var bookInventory = mysqlTable("book_inventory", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  bookId: varchar("bookId", { length: 120 }).notNull(),
  addedAt: timestamp("addedAt").defaultNow().notNull(),
  removedAt: timestamp("removedAt")
});
var bookStudyLogs = mysqlTable("book_study_logs", {
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
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var bookTopicMappings = mysqlTable("book_topic_mappings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  bookId: varchar("bookId", { length: 120 }).notNull(),
  topic: varchar("topic", { length: 180 }).notNull(),
  subject: varchar("subject", { length: 80 }).notNull(),
  pageStart: int("pageStart"),
  pageEnd: int("pageEnd"),
  testStart: int("testStart"),
  testEnd: int("testEnd"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var sourceSwitches = mysqlTable("source_switches", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  fromBookId: varchar("fromBookId", { length: 120 }),
  toBookId: varchar("toBookId", { length: 120 }).notNull(),
  reason: varchar("reason", { length: 300 }).notNull(),
  switchedAt: timestamp("switchedAt").defaultNow().notNull()
});
var studyPlans = mysqlTable("study_plans", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  weekStart: timestamp("weekStart").notNull(),
  weekEnd: timestamp("weekEnd").notNull(),
  summary: text("summary").notNull(),
  source: mysqlEnum("source", ["ai", "manual"]).default("ai").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var studyPlanSessions = mysqlTable("study_plan_sessions", {
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
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var topicStudyLogs = mysqlTable("topic_study_logs", {
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
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var planAdherenceReports = mysqlTable("plan_adherence_reports", {
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
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var studentProfiles = mysqlTable("student_profiles", {
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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var publishers = mysqlTable("publishers", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => ({
  normalizedNameIdx: index("publishers_normalized_name_idx").on(table.normalizedName)
}));
var catalogBooks = mysqlTable("catalog_books", {
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
    "other"
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => ({
  publisherIdx: index("catalog_books_publisher_idx").on(table.publisherId),
  isbnIdx: index("catalog_books_isbn_idx").on(table.isbn),
  bookTypeIdx: index("catalog_books_book_type_idx").on(table.bookType),
  examScopeIdx: index("catalog_books_exam_scope_idx").on(table.examScope),
  subjectIdx: index("catalog_books_subject_idx").on(table.subject),
  difficultyLabelIdx: index("catalog_books_difficulty_label_idx").on(table.difficultyLabel),
  activeIdx: index("catalog_books_active_idx").on(table.active),
  needsReviewIdx: index("catalog_books_needs_review_idx").on(table.needsReview),
  createdAtIdx: index("catalog_books_created_at_idx").on(table.createdAt)
}));
var externalBookSources = mysqlTable("external_book_sources", {
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
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (table) => ({
  sourceProductUnique: uniqueIndex("external_book_sources_source_product_unique").on(table.source, table.sourceProductId),
  syncStatusIdx: index("external_book_sources_sync_status_idx").on(table.syncStatus),
  matchedBookIdx: index("external_book_sources_matched_book_idx").on(table.matchedBookId),
  rawIsbnIdx: index("external_book_sources_raw_isbn_idx").on(table.rawIsbn)
}));
var bookOffers = mysqlTable("book_offers", {
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
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (table) => ({
  bookSourceUnique: uniqueIndex("book_offers_book_source_unique").on(table.bookId, table.source),
  bookIdx: index("book_offers_book_idx").on(table.bookId)
}));
var bookCurriculumTopics = mysqlTable("book_curriculum_topics", {
  id: int("id").autoincrement().primaryKey(),
  bookId: int("bookId").notNull(),
  topicId: int("topicId").notNull(),
  mappingMethod: mysqlEnum("mappingMethod", ["rule", "ai", "manual"]).default("rule").notNull(),
  confidence: decimal("confidence", { precision: 4, scale: 3 }).default("0").notNull(),
  isVerified: int("isVerified").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => ({
  bookTopicUnique: uniqueIndex("book_curriculum_topics_book_topic_unique").on(table.bookId, table.topicId),
  topicIdx: index("book_curriculum_topics_topic_idx").on(table.topicId)
}));
var resourceCatalogSyncLogs = mysqlTable("resource_catalog_sync_logs", {
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
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (table) => ({
  sourceIdx: index("resource_catalog_sync_logs_source_idx").on(table.source),
  startedAtIdx: index("resource_catalog_sync_logs_started_at_idx").on(table.startedAt)
}));
var coachAlerts = mysqlTable("coach_alerts", {
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
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var subscriptionPlans = mysqlTable("subscription_plans", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var subscriptions = mysqlTable("subscriptions", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => ({
  statusIdx: index("subscriptions_status_idx").on(table.status),
  periodEndIdx: index("subscriptions_current_period_end_idx").on(table.currentPeriodEnd),
  providerSubIdx: index("subscriptions_provider_subscription_idx").on(table.providerSubscriptionId)
}));
var payments = mysqlTable("payments", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => ({
  userIdx: index("payments_user_idx").on(table.userId),
  subscriptionIdx: index("payments_subscription_idx").on(table.subscriptionId),
  statusIdx: index("payments_status_idx").on(table.status)
}));
var paymentEvents = mysqlTable("payment_events", {
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
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (table) => ({
  providerEventUnique: uniqueIndex("payment_events_provider_event_unique").on(table.provider, table.eventId)
}));
var subscriptionAuditLogs = mysqlTable("subscription_audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  adminId: int("adminId"),
  action: varchar("action", { length: 80 }).notNull(),
  oldState: text("oldState"),
  newState: text("newState"),
  reason: text("reason"),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (table) => ({
  userIdx: index("subscription_audit_logs_user_idx").on(table.userId),
  createdAtIdx: index("subscription_audit_logs_created_at_idx").on(table.createdAt)
}));
var featureUsageLogs = mysqlTable("feature_usage_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  featureKey: varchar("featureKey", { length: 60 }).notNull(),
  usedAt: timestamp("usedAt").defaultNow().notNull()
}, (table) => ({
  userFeatureIdx: index("feature_usage_logs_user_feature_idx").on(table.userId, table.featureKey, table.usedAt)
}));

// shared/planAdherence.ts
var cap = (value) => Math.max(0, Math.min(100, Math.round(value)));
function dedupeAlerts(alerts, existingRuleKeys) {
  const known = new Set(existingRuleKeys);
  return alerts.filter((alert) => !known.has(alert.ruleKey));
}
function calculatePlanAdherence(sessions, averageAccuracy = 0) {
  const plannedSessions = sessions.length;
  const completed = sessions.filter((session) => session.status === "completed");
  const completedSessions = completed.length;
  const plannedMinutes = sessions.reduce((sum, session) => sum + Math.max(0, session.plannedMinutes || 0), 0);
  const actualMinutes = completed.reduce((sum, session) => sum + Math.max(0, session.actualMinutes ?? 0), 0);
  const targetQuestions = sessions.reduce((sum, session) => sum + Math.max(0, session.targetQuestions ?? 0), 0);
  const actualQuestions = completed.reduce((sum, session) => sum + Math.max(0, session.actualQuestions ?? 0), 0);
  const rescheduledSessions = sessions.filter((session) => Boolean(session.rescheduledFrom)).length;
  const sessionScore = plannedSessions ? cap(completedSessions / plannedSessions * 100) : 0;
  const timeScore = plannedMinutes ? cap(actualMinutes / plannedMinutes * 100) : 0;
  const questionScore = targetQuestions ? cap(actualQuestions / targetQuestions * 100) : 0;
  const punctualityScore = plannedSessions ? cap((plannedSessions - rescheduledSessions) / plannedSessions * 100) : 0;
  const overallScore = plannedSessions ? cap(sessionScore * 0.35 + timeScore * 0.25 + questionScore * 0.25 + punctualityScore * 0.15) : 0;
  let decision = "veri_topla";
  if (plannedSessions < 2) decision = "veri_topla";
  else if (overallScore < 55) decision = "plan\u0131_k\xFC\xE7\xFClt";
  else if (overallScore >= 80 && averageAccuracy >= 85) decision = "seviyeyi_art\u0131r";
  else if (timeScore >= 75 && averageAccuracy < 55) decision = "y\xF6ntemi_de\u011Fi\u015Ftir";
  else decision = "ritmi_koru";
  const alerts = [];
  if (plannedSessions < 2) alerts.push({ level: "info", ruleKey: "no_plan_data", title: "\xD6nce ritmini kaydedelim", message: "Bu d\xF6nem i\xE7in yeterli plan verisi yok. En az iki oturum tamamla; ko\xE7un daha g\xFCvenilir \xF6neriler versin.", actionLabel: "\u0130lk oturumu ba\u015Flat" });
  if (overallScore < 55 && plannedSessions >= 2) alerts.push({ level: "warning", ruleKey: "low_adherence", title: "Plan\u0131 k\xFC\xE7\xFCltelim", message: `Plan uyumun %${overallScore}. \xD6n\xFCm\xFCzdeki \xFC\xE7 g\xFCn i\xE7in oturumlar\u0131 %25 k\u0131salt\u0131p tek ana konuya odaklanal\u0131m.`, actionLabel: "Plan\u0131 hafiflet" });
  if (rescheduledSessions >= 2) alerts.push({ level: "action", ruleKey: "repeated_reschedule", title: "Erteleme paterni olu\u015Fuyor", message: `${rescheduledSessions} oturum ertelendi. G\xFCnl\xFCk oturum say\u0131s\u0131n\u0131 azalt\u0131p ilk oturumu g\xFCn\xFCn daha erken saatine ta\u015F\u0131yal\u0131m.`, actionLabel: "Takvimi d\xFCzenle" });
  if (timeScore >= 75 && averageAccuracy < 55 && plannedSessions >= 2) alerts.push({ level: "warning", ruleKey: "low_accuracy_high_time", title: "\xC7al\u0131\u015Fma y\xF6ntemini de\u011Fi\u015Ftirelim", message: "S\xFCreyi koruyorsun; ancak do\u011Fruluk d\xFC\u015F\xFCk. Bir sonraki oturuma k\u0131sa konu tekrar\u0131 ve daha kolay test ekleyelim.", actionLabel: "Tekrar oturumu ekle" });
  if (overallScore >= 80 && averageAccuracy >= 85) alerts.push({ level: "success", ruleKey: "ready_for_next_level", title: "Bir \xFCst seviyeye haz\u0131rs\u0131n", message: "Plan uyumun ve do\u011Frulu\u011Fun g\xFC\xE7l\xFC. En iyi giden konularda bir \xFCst seviye kayna\u011Fa ge\xE7ebiliriz.", actionLabel: "Kaynak \xF6nerilerini a\xE7" });
  if (!alerts.length) alerts.push({ level: "success", ruleKey: "keep_rhythm", title: "Ritmini koru", message: `Plan uyumun %${overallScore}. K\xFC\xE7\xFCk ama d\xFCzenli oturumlarla ayn\u0131 \xE7izgiyi s\xFCrd\xFCr.`, actionLabel: "Bug\xFCnk\xFC plana devam et" });
  const summary = decision === "plan\u0131_k\xFC\xE7\xFClt" ? "Uygulanabilirli\u011Fi art\u0131rmak i\xE7in plan\u0131 hafiflet." : decision === "y\xF6ntemi_de\u011Fi\u015Ftir" ? "S\xFCre korunuyor; konu \xE7al\u0131\u015Fma y\xF6ntemini de\u011Fi\u015Ftir." : decision === "seviyeyi_art\u0131r" ? "Uyum ve do\u011Fruluk g\xFC\xE7l\xFC; uygun konularda seviyeyi art\u0131r." : decision === "ritmi_koru" ? "Plan\u0131 b\xFCy\xFCk de\u011Fi\u015Fiklik yapmadan s\xFCrd\xFCr." : "Daha g\xFCvenilir karar i\xE7in birka\xE7 oturum daha kaydet.";
  return { overallScore, sessionScore, timeScore, questionScore, punctualityScore, plannedSessions, completedSessions, plannedMinutes, actualMinutes, targetQuestions, actualQuestions, rescheduledSessions, decision, summary, alerts };
}

// shared/calendarLogic.ts
function rescheduleOverdueSessions(sessions, today, tomorrow, now) {
  return sessions.filter((session) => session.sessionDate < today).map((session) => ({ id: session.id, sessionDate: tomorrow, rescheduledFrom: session.sessionDate, rescheduledAt: now }));
}
function buildSessionCompletion(session, input, completedAt) {
  return {
    sessionUpdate: { status: "completed", completedAt, ...input },
    topicLog: { sessionId: session.id, subject: session.subject, topic: session.topic, studyDate: completedAt, ...input }
  };
}

// shared/topicStatus.ts
var TOPIC_STATUS_THRESHOLDS = { weak: 55, good: 85 };
var MIN_RELIABLE_QUESTION_COUNT = 8;
function deriveTopicStatus(accuracy, questionCount) {
  const clamped = Math.max(0, Math.min(100, accuracy));
  const status = clamped < TOPIC_STATUS_THRESHOLDS.weak ? "Zay\u0131f" : clamped < TOPIC_STATUS_THRESHOLDS.good ? "Orta" : "\u0130yi";
  return { status, insufficientData: questionCount < MIN_RELIABLE_QUESTION_COUNT };
}

// shared/yksData.ts
var topicSeeds = [
  { id: "tyt-tr-paragraf", exam: "TYT", subject: "T\xFCrk\xE7e", topic: "Paragrafta anlam", unit: "Anlam bilgisi", progress: 38, status: "Zay\u0131f", accent: "coral" },
  { id: "tyt-tr-dilbilgisi", exam: "TYT", subject: "T\xFCrk\xE7e", topic: "Fiilimsi ve c\xFCmlenin \xF6geleri", unit: "Dil bilgisi", progress: 64, status: "Orta", accent: "coral" },
  { id: "tyt-mat-problem", exam: "TYT", subject: "Matematik", topic: "Problemler", unit: "Temel matematik", progress: 31, status: "Zay\u0131f", accent: "blue" },
  { id: "tyt-mat-sayilar", exam: "TYT", subject: "Matematik", topic: "Say\u0131lar ve b\xF6l\xFCnebilme", unit: "Temel matematik", progress: 78, status: "Orta", accent: "blue" },
  { id: "tyt-fen-kimya", exam: "TYT", subject: "Fen", topic: "Maddenin halleri", unit: "Kimya", progress: 71, status: "Orta", accent: "mint" },
  { id: "tyt-sos-tarih", exam: "TYT", subject: "Sosyal", topic: "Milli M\xFCcadele", unit: "Tarih", progress: 88, status: "\u0130yi", accent: "yellow" },
  { id: "ayt-mat-fonksiyon", exam: "AYT", subject: "Matematik", topic: "Fonksiyonlar", unit: "Cebir", progress: 46, status: "Zay\u0131f", accent: "blue" },
  { id: "ayt-mat-integral", exam: "AYT", subject: "Matematik", topic: "\u0130ntegral", unit: "Analiz", progress: 22, status: "Zay\u0131f", accent: "blue" },
  { id: "ayt-fizik-elektrik", exam: "AYT", subject: "Fizik", topic: "Elektrik ve manyetizma", unit: "Elektrik", progress: 58, status: "Orta", accent: "lilac" },
  { id: "ayt-biyo-sistem", exam: "AYT", subject: "Biyoloji", topic: "Sistemler", unit: "\u0130nsan fizyolojisi", progress: 67, status: "Orta", accent: "mint" }
];
var initialExams = [
  {
    id: "mock-3",
    title: "T\xFCrkiye Geneli TYT \xB7 03",
    date: "2026-09-14",
    net: 68.25,
    delta: 4.5,
    tag: "Y\xFCkseli\u015F",
    subjects: { T\u00FCrk\u00E7e: 28.5, Matematik: 18.75, Fen: 12.5, Sosyal: 8.5 },
    timeSpent: { T\u00FCrk\u00E7e: 48, Matematik: 74, Fen: 31, Sosyal: 27 },
    topicNets: { "Paragrafta anlam": 10, Problemler: 6, "Maddenin halleri": 2.5, "Milli M\xFCcadele": 4.5, Fonksiyonlar: 6.5 }
  },
  {
    id: "mock-2",
    title: "Kurum \u0130\xE7i TYT \xB7 02",
    date: "2026-09-07",
    net: 63.75,
    delta: 2.25,
    tag: "Y\xFCkseli\u015F",
    subjects: { T\u00FCrk\u00E7e: 27, Matematik: 16.5, Fen: 11.75, Sosyal: 8.5 },
    timeSpent: { T\u00FCrk\u00E7e: 51, Matematik: 69, Fen: 34, Sosyal: 26 },
    topicNets: { "Paragrafta anlam": 8, Problemler: 5.25, "Maddenin halleri": 3.25, "Milli M\xFCcadele": 4, Fonksiyonlar: 5.5 }
  },
  {
    id: "mock-1",
    title: "Ba\u015Flang\u0131\xE7 Denemesi",
    date: "2026-08-31",
    net: 61.5,
    delta: 0,
    tag: "Ba\u015Flang\u0131\xE7",
    subjects: { T\u00FCrk\u00E7e: 26, Matematik: 15.25, Fen: 11.25, Sosyal: 9 },
    timeSpent: { T\u00FCrk\u00E7e: 56, Matematik: 63, Fen: 36, Sosyal: 25 },
    topicNets: { "Paragrafta anlam": 7.5, Problemler: 4, "Maddenin halleri": 3.5, "Milli M\xFCcadele": 4.5, Fonksiyonlar: 5 }
  }
];
var topicCounts = {
  total: topicSeeds.length,
  weak: topicSeeds.filter((topic) => topic.status === "Zay\u0131f").length,
  medium: topicSeeds.filter((topic) => topic.status === "Orta").length,
  good: topicSeeds.filter((topic) => topic.status === "\u0130yi").length
};
var focusTopics = topicSeeds.filter((topic) => topic.status === "Zay\u0131f");
var averageProgress = Math.round(topicSeeds.reduce((sum, topic) => sum + topic.progress, 0) / topicSeeds.length);
var currentNet = initialExams[0].net;
var targetNet = 85;
var weeklyStudyMinutes = 485;
var weeklyGoalMinutes = 600;
var localStorageKeys = { exams: "pusula-yks-exams", topics: "pusula-yks-topics", studyHistory: "pusula-yks-study-history", bookInventory: "pusula-yks-book-inventory", bookLogs: "pusula-yks-book-logs", sourceSwitches: "pusula-yks-source-switches", customBooks: "pusula-yks-custom-books", calendarSessions: "pusula-yks-calendar-sessions", onboardingDraft: "pusula-yks-onboarding-draft" };
var perAccountCacheKeys = [localStorageKeys.exams, localStorageKeys.topics, localStorageKeys.studyHistory, localStorageKeys.bookInventory, localStorageKeys.bookLogs, localStorageKeys.sourceSwitches, localStorageKeys.customBooks, localStorageKeys.calendarSessions, localStorageKeys.onboardingDraft];
var dateInputToday = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
var progressGoalPercent = Math.round(currentNet / targetNet * 100);
var weeklyGoalPercent = Math.round(weeklyStudyMinutes / weeklyGoalMinutes * 100);
var currentGoalText = `${currentNet} netten ${targetNet} nete`;
var todayLabel = new Intl.DateTimeFormat("tr-TR", { weekday: "long", day: "numeric", month: "long" }).format(/* @__PURE__ */ new Date());

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  // Yerel ad+şifre girişi (server/_core/devAuth.ts) varsayılan olarak
  // yalnızca development'ta açık — gerçek Manus platformunda production'da
  // gerçek OAuth kullanılır diye tasarlandı. Ama Manus dışı bağımsız bir
  // deploy'da (Vercel, Railway, ...) gerçek OAuth hiç yapılandırılmaz —
  // bu durumda ALLOW_LOCAL_AUTH=true ile bunu bilerek production'da da
  // açabilirsin; kayıt olan her hesap yine de admin onayı bekler (bkz.
  // approvalStatus), yani rastgele biri kayıt olsa bile panele giremez.
  allowLocalAuth: process.env.ALLOW_LOCAL_AUTH === "true" || process.env.NODE_ENV !== "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // --- Subscription / Payment (PHASE 2) — bkz. docs/subscription/SUBSCRIPTION-ARCHITECTURE.md ---
  // "mock" (sandbox, varsayılan) | "apple" | "google" | gerçek bir web sağlayıcısı seçildiğinde onun adı.
  paymentProvider: process.env.PAYMENT_PROVIDER ?? "mock",
  paymentMockWebhookSecret: process.env.PAYMENT_MOCK_WEBHOOK_SECRET ?? "",
  appleIapKeyId: process.env.APPLE_IAP_KEY_ID ?? "",
  appleIapIssuerId: process.env.APPLE_IAP_ISSUER_ID ?? "",
  appleIapPrivateKey: process.env.APPLE_IAP_PRIVATE_KEY ?? "",
  appleIapBundleId: process.env.APPLE_IAP_BUNDLE_ID ?? "",
  googlePlayServiceAccountJson: process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON ?? "",
  googlePlayPackageName: process.env.GOOGLE_PLAY_PACKAGE_NAME ?? "",
  webhookIngestSecret: process.env.WEBHOOK_INGEST_SECRET ?? ""
};

// server/db.ts
var _db = null;
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = {
      openId: user.openId,
      approvalStatus: "pending"
    };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
var parseJsonArray = (value) => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
};
var defaultStudentProfileView = {
  onboardingCompleted: false,
  onboardingStep: 0,
  preferredName: null,
  gradeLevel: null,
  examYear: null,
  targetScoreType: null,
  currentTytNet: null,
  currentAytNet: null,
  mockExamFrequency: null,
  strongSubjects: [],
  weakSubjects: [],
  hasPriorStudyPlan: null,
  targetUniversity: null,
  targetDepartment: null,
  targetRanking: null,
  mainGoal: null,
  shortTermGoal: null,
  longTermGoal: null,
  dailyStudyDuration: null,
  preferredStudyStartTime: null,
  availableStudyDays: [],
  preferredStudyTimes: [],
  preferredStudyMethods: [],
  studyObstacles: null,
  coachingExpectations: [],
  notificationPreference: null,
  coachingStyle: null,
  additionalNotes: null,
  updatedAt: null
};
var toStudentProfileView = (row) => ({
  onboardingCompleted: row.onboardingCompleted === 1,
  onboardingStep: row.onboardingStep,
  preferredName: row.preferredName,
  gradeLevel: row.gradeLevel,
  examYear: row.examYear,
  targetScoreType: row.targetScoreType,
  currentTytNet: row.currentTytNet,
  currentAytNet: row.currentAytNet,
  mockExamFrequency: row.mockExamFrequency,
  strongSubjects: parseJsonArray(row.strongSubjectsJson),
  weakSubjects: parseJsonArray(row.weakSubjectsJson),
  hasPriorStudyPlan: row.hasPriorStudyPlan === null ? null : row.hasPriorStudyPlan === 1,
  targetUniversity: row.targetUniversity,
  targetDepartment: row.targetDepartment,
  targetRanking: row.targetRanking,
  mainGoal: row.mainGoal,
  shortTermGoal: row.shortTermGoal,
  longTermGoal: row.longTermGoal,
  dailyStudyDuration: row.dailyStudyDuration,
  preferredStudyStartTime: row.preferredStudyStartTime,
  availableStudyDays: parseJsonArray(row.availableStudyDaysJson),
  preferredStudyTimes: parseJsonArray(row.preferredStudyTimesJson),
  preferredStudyMethods: parseJsonArray(row.preferredStudyMethodsJson),
  studyObstacles: row.studyObstacles,
  coachingExpectations: parseJsonArray(row.coachingExpectationsJson),
  notificationPreference: row.notificationPreference,
  coachingStyle: row.coachingStyle,
  additionalNotes: row.additionalNotes,
  updatedAt: row.updatedAt
});
async function getStudentProfile(userId) {
  const db = await getDb();
  if (!db) return defaultStudentProfileView;
  const rows = await db.select().from(studentProfiles).where(eq(studentProfiles.userId, userId)).limit(1);
  return rows[0] ? toStudentProfileView(rows[0]) : defaultStudentProfileView;
}
var patchToRowValues = (patch) => {
  const values = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value === void 0) continue;
    if (key === "strongSubjects") values.strongSubjectsJson = JSON.stringify(value);
    else if (key === "weakSubjects") values.weakSubjectsJson = JSON.stringify(value);
    else if (key === "availableStudyDays") values.availableStudyDaysJson = JSON.stringify(value);
    else if (key === "preferredStudyTimes") values.preferredStudyTimesJson = JSON.stringify(value);
    else if (key === "preferredStudyMethods") values.preferredStudyMethodsJson = JSON.stringify(value);
    else if (key === "coachingExpectations") values.coachingExpectationsJson = JSON.stringify(value);
    else if (key === "hasPriorStudyPlan") values.hasPriorStudyPlan = value === null ? null : value ? 1 : 0;
    else values[key] = value;
  }
  return values;
};
async function upsertStudentProfileStep(userId, step, patch) {
  const db = await getDb();
  if (!db) return { ...defaultStudentProfileView, onboardingStep: step };
  const existing = await db.select().from(studentProfiles).where(eq(studentProfiles.userId, userId)).limit(1);
  const rowValues = patchToRowValues(patch);
  const nextStep = Math.max(step + 1, existing[0]?.onboardingStep ?? 0);
  if (existing[0]) {
    await db.update(studentProfiles).set({ ...rowValues, onboardingStep: nextStep }).where(eq(studentProfiles.id, existing[0].id));
  } else {
    await db.insert(studentProfiles).values({ userId, onboardingStep: nextStep, ...rowValues });
  }
  return getStudentProfile(userId);
}
async function completeOnboarding(userId) {
  const db = await getDb();
  if (!db) return { ...defaultStudentProfileView, onboardingCompleted: true };
  const existing = await db.select().from(studentProfiles).where(eq(studentProfiles.userId, userId)).limit(1);
  if (existing[0]) {
    await db.update(studentProfiles).set({ onboardingCompleted: 1 }).where(eq(studentProfiles.id, existing[0].id));
  } else {
    await db.insert(studentProfiles).values({ userId, onboardingCompleted: 1 });
  }
  return getStudentProfile(userId);
}
async function getBookInventory(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(bookInventory).where(and(eq(bookInventory.userId, userId), isNull(bookInventory.removedAt))).orderBy(desc(bookInventory.addedAt));
}
async function addBookToInventory(userId, bookId) {
  const db = await getDb();
  if (!db) return void 0;
  const existing = await db.select().from(bookInventory).where(and(eq(bookInventory.userId, userId), eq(bookInventory.bookId, bookId), isNull(bookInventory.removedAt))).limit(1);
  if (existing[0]) return existing[0];
  const result = await db.insert(bookInventory).values({ userId, bookId });
  return { id: Number(result[0].insertId), userId, bookId, addedAt: /* @__PURE__ */ new Date(), removedAt: null };
}
async function removeBookFromInventory(userId, bookId) {
  const db = await getDb();
  if (!db) return;
  await db.update(bookInventory).set({ removedAt: /* @__PURE__ */ new Date() }).where(and(eq(bookInventory.userId, userId), eq(bookInventory.bookId, bookId), isNull(bookInventory.removedAt)));
}
async function getBookStudyLogs(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(bookStudyLogs).where(eq(bookStudyLogs.userId, userId)).orderBy(desc(bookStudyLogs.sessionDate));
}
async function addBookStudyLog(userId, input) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.insert(bookStudyLogs).values({ ...input, userId });
  return { id: Number(result[0].insertId), ...input, userId, createdAt: /* @__PURE__ */ new Date() };
}
async function getBookTopicMappings(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(bookTopicMappings).where(eq(bookTopicMappings.userId, userId)).orderBy(desc(bookTopicMappings.updatedAt));
}
async function upsertBookTopicMapping(userId, input) {
  const db = await getDb();
  if (!db) return void 0;
  const existing = await db.select().from(bookTopicMappings).where(and(eq(bookTopicMappings.userId, userId), eq(bookTopicMappings.bookId, input.bookId), eq(bookTopicMappings.topic, input.topic))).limit(1);
  if (existing[0]) {
    await db.update(bookTopicMappings).set({ ...input, updatedAt: /* @__PURE__ */ new Date() }).where(eq(bookTopicMappings.id, existing[0].id));
    return { ...existing[0], ...input, updatedAt: /* @__PURE__ */ new Date() };
  }
  const result = await db.insert(bookTopicMappings).values({ ...input, userId });
  return { id: Number(result[0].insertId), ...input, userId, updatedAt: /* @__PURE__ */ new Date() };
}
async function getSourceSwitches(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sourceSwitches).where(eq(sourceSwitches.userId, userId)).orderBy(desc(sourceSwitches.switchedAt));
}
async function addSourceSwitch(userId, input) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.insert(sourceSwitches).values({ ...input, userId });
  return { id: Number(result[0].insertId), ...input, userId };
}
var parseJson = (value, fallback) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};
var serializeUserMockExam = (row) => ({
  id: String(row.id),
  title: row.title,
  date: row.examDate.toISOString().slice(0, 10),
  exam: row.exam,
  net: Number(row.net),
  delta: Number(row.delta),
  subjects: parseJson(row.subjectsJson, {}),
  timeSpent: parseJson(row.timeSpentJson, {}),
  topicNets: parseJson(row.topicNetsJson, {}),
  topicDetails: parseJson(row.topicDetailsJson, []),
  importedFrom: row.importedFrom
});
async function getUserMockExams(userId) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(userMockExams).where(eq(userMockExams.userId, userId)).orderBy(desc(userMockExams.examDate));
  return rows.map(serializeUserMockExam);
}
async function addUserMockExams(userId, inputs) {
  const db = await getDb();
  if (!db || inputs.length === 0) return [];
  await db.insert(userMockExams).values(inputs.map((input) => ({
    userId,
    title: input.title,
    exam: input.exam,
    examDate: input.examDate,
    net: input.net.toFixed(2),
    delta: input.delta.toFixed(2),
    subjectsJson: JSON.stringify(input.subjects),
    timeSpentJson: JSON.stringify(input.timeSpent),
    topicNetsJson: JSON.stringify(input.topicNets),
    topicDetailsJson: JSON.stringify(input.topicDetails),
    importedFrom: input.importedFrom,
    notes: input.notes ?? null
  })));
  return getUserMockExams(userId);
}
async function getUserResourceBooks(userId) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(userResourceBooks).where(eq(userResourceBooks.userId, userId)).orderBy(desc(userResourceBooks.createdAt));
  return rows.map((row) => ({ id: row.bookId, title: row.title, publisher: row.publisher, subject: row.subject, exam: row.exam, level: row.level, format: row.format, reason: row.reason, sourceUrl: row.sourceUrl || "", pageCount: row.pageCount ?? void 0, tone: row.tone }));
}
async function addUserResourceBooks(userId, inputs) {
  const db = await getDb();
  if (!db || inputs.length === 0) return [];
  await db.insert(userResourceBooks).values(inputs.map((book) => ({ userId, bookId: book.id, title: book.title, publisher: book.publisher, subject: book.subject, exam: book.exam, level: book.level, format: book.format, reason: book.reason, sourceUrl: book.sourceUrl ?? null, pageCount: book.pageCount ?? null, tone: book.tone })));
  return getUserResourceBooks(userId);
}
async function getStudyCalendar(userId) {
  const db = await getDb();
  if (!db) return { plans: [], sessions: [], logs: [] };
  const today = /* @__PURE__ */ new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const overdue = await db.select({ id: studyPlanSessions.id, sessionDate: studyPlanSessions.sessionDate }).from(studyPlanSessions).where(and(eq(studyPlanSessions.userId, userId), eq(studyPlanSessions.status, "planned"), lt(studyPlanSessions.sessionDate, today)));
  const reschedules = rescheduleOverdueSessions(overdue, today, tomorrow, /* @__PURE__ */ new Date());
  for (const instruction of reschedules) {
    await db.update(studyPlanSessions).set({ sessionDate: instruction.sessionDate, rescheduledFrom: instruction.rescheduledFrom, rescheduledAt: instruction.rescheduledAt, rescheduleCount: sql`${studyPlanSessions.rescheduleCount} + 1` }).where(eq(studyPlanSessions.id, instruction.id));
  }
  const [plans, sessions, logs] = await Promise.all([
    db.select().from(studyPlans).where(eq(studyPlans.userId, userId)).orderBy(desc(studyPlans.weekStart)),
    db.select().from(studyPlanSessions).where(eq(studyPlanSessions.userId, userId)).orderBy(studyPlanSessions.sessionDate),
    db.select().from(topicStudyLogs).where(eq(topicStudyLogs.userId, userId)).orderBy(desc(topicStudyLogs.studyDate))
  ]);
  return { plans, sessions, logs };
}
async function saveStudyPlan(userId, input) {
  const db = await getDb();
  if (!db) return void 0;
  const planResult = await db.insert(studyPlans).values({ userId, title: input.title, weekStart: input.weekStart, weekEnd: input.weekEnd, summary: input.summary, source: input.source ?? "ai" });
  const planId = Number(planResult[0].insertId);
  if (input.sessions.length) await db.insert(studyPlanSessions).values(input.sessions.map((session) => ({ ...session, userId, planId, targetPages: session.targetPages ?? null, targetTests: session.targetTests ?? null })));
  return getStudyCalendar(userId);
}
var FALLBACK_EXAM = "TYT";
async function completeStudySession(userId, input) {
  const db = await getDb();
  if (!db) return void 0;
  const existing = await db.select().from(studyPlanSessions).where(and(eq(studyPlanSessions.id, input.sessionId), eq(studyPlanSessions.userId, userId))).limit(1);
  if (!existing[0]) throw new Error("\xC7al\u0131\u015Fma oturumu bulunamad\u0131");
  const completedAt = /* @__PURE__ */ new Date();
  const { actualMinutes, actualQuestions, correct, wrong, blank, actualPages, note } = input;
  const plan = buildSessionCompletion(existing[0], { actualMinutes, actualQuestions, correct, wrong, blank, actualPages, note }, completedAt);
  await db.update(studyPlanSessions).set({ ...plan.sessionUpdate, actualPages: plan.sessionUpdate.actualPages ?? null, note: plan.sessionUpdate.note ?? null }).where(eq(studyPlanSessions.id, input.sessionId));
  const { actualPages: _actualPages, ...topicLogInput } = plan.topicLog;
  await db.insert(topicStudyLogs).values({ userId, ...topicLogInput, note: topicLogInput.note ?? null });
  if (actualQuestions > 0) {
    await upsertTopicProgress(userId, { exam: FALLBACK_EXAM, subject: plan.topicLog.subject, topic: plan.topicLog.topic, accuracy: correct / actualQuestions * 100, questionCount: actualQuestions, studyDate: completedAt });
  }
  return getStudyCalendar(userId);
}
async function logCompletedRoutineSession(userId, input) {
  const db = await getDb();
  if (!db) return void 0;
  const sessionDate = /* @__PURE__ */ new Date();
  const dayStart = new Date(sessionDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const planResult = await db.insert(studyPlans).values({ userId, title: input.title, weekStart: dayStart, weekEnd: dayEnd, summary: input.title, source: "manual" });
  const planId = Number(planResult[0].insertId);
  const completedAt = /* @__PURE__ */ new Date();
  const sessionValues = {
    userId,
    planId,
    sessionDate,
    title: input.title,
    subject: input.subject,
    topic: input.topic,
    kind: input.kind,
    plannedMinutes: input.plannedMinutes,
    status: "completed",
    completedAt,
    actualMinutes: input.actualMinutes,
    actualQuestions: 0,
    correct: 0,
    wrong: 0,
    blank: 0,
    actualPages: input.actualPages ?? null,
    note: input.note ?? null
  };
  const sessionResult = await db.insert(studyPlanSessions).values(sessionValues);
  const sessionId = Number(sessionResult[0].insertId);
  await db.insert(topicStudyLogs).values({ userId, sessionId, subject: input.subject, topic: input.topic, studyDate: completedAt, minutes: input.actualMinutes, questions: 0, correct: 0, wrong: 0, blank: 0, note: input.note ?? null });
  return getStudyCalendar(userId);
}
async function addTopicStudyLog(userId, input) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.insert(topicStudyLogs).values({ ...input, userId });
  const questionCount = input.questions ?? 0;
  if (questionCount > 0) {
    await upsertTopicProgress(userId, { exam: FALLBACK_EXAM, subject: input.subject, topic: input.topic, accuracy: (input.correct ?? 0) / questionCount * 100, questionCount, studyDate: input.studyDate });
  }
  return { id: Number(result[0].insertId), ...input, userId, createdAt: /* @__PURE__ */ new Date() };
}
async function getPlanAdherenceInputs(userId, periodStart, periodEnd) {
  const db = await getDb();
  if (!db) return { sessions: [], averageAccuracy: 0 };
  const sessions = await db.select().from(studyPlanSessions).where(and(eq(studyPlanSessions.userId, userId), gte(studyPlanSessions.sessionDate, periodStart), lt(studyPlanSessions.sessionDate, periodEnd)));
  const logs = await db.select().from(topicStudyLogs).where(and(eq(topicStudyLogs.userId, userId), gte(topicStudyLogs.studyDate, periodStart), lt(topicStudyLogs.studyDate, periodEnd)));
  const questions = logs.reduce((sum, log) => sum + log.questions, 0);
  const correct = logs.reduce((sum, log) => sum + log.correct, 0);
  return { sessions, averageAccuracy: questions ? Math.round(correct / questions * 100) : 0 };
}
async function savePlanAdherence(userId, periodStart, periodEnd) {
  const db = await getDb();
  if (!db) return void 0;
  const { sessions, averageAccuracy } = await getPlanAdherenceInputs(userId, periodStart, periodEnd);
  const result = calculatePlanAdherence(sessions, averageAccuracy);
  const inserted = await db.insert(planAdherenceReports).values({ userId, periodType: "week", periodStart, periodEnd, overallScore: result.overallScore, sessionScore: result.sessionScore, timeScore: result.timeScore, questionScore: result.questionScore, punctualityScore: result.punctualityScore, plannedSessions: result.plannedSessions, completedSessions: result.completedSessions, plannedMinutes: result.plannedMinutes, actualMinutes: result.actualMinutes, targetQuestions: result.targetQuestions, actualQuestions: result.actualQuestions, rescheduledSessions: result.rescheduledSessions, summary: result.summary, decision: result.decision, snapshotJson: JSON.stringify({ averageAccuracy, alerts: result.alerts }) });
  const reportId = Number(inserted[0].insertId);
  const existingAlerts = await db.select({ ruleKey: coachAlerts.ruleKey }).from(coachAlerts).where(eq(coachAlerts.userId, userId));
  const newAlerts = dedupeAlerts(result.alerts, existingAlerts.map((alert) => alert.ruleKey));
  if (newAlerts.length) await db.insert(coachAlerts).values(newAlerts.map((alert) => ({ userId, reportId, level: alert.level, ruleKey: alert.ruleKey, title: alert.title, message: alert.message, actionLabel: alert.actionLabel, actionJson: JSON.stringify({ decision: result.decision }) })));
  return { ...result, averageAccuracy, reportId };
}
async function getCoachAlerts(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(coachAlerts).where(and(eq(coachAlerts.userId, userId), eq(coachAlerts.isRead, 0))).orderBy(desc(coachAlerts.createdAt)).limit(10);
}
async function markCoachAlertRead(userId, alertId) {
  const db = await getDb();
  if (!db) return;
  await db.update(coachAlerts).set({ isRead: 1 }).where(and(eq(coachAlerts.id, alertId), eq(coachAlerts.userId, userId)));
}
var statusToDb = { Zay\u0131f: "weak", Orta: "medium", \u0130yi: "good" };
var statusFromDb = { weak: "Zay\u0131f", medium: "Orta", good: "\u0130yi" };
var slugify = (value) => value.toLocaleLowerCase("tr").replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
var topicCatalogSeeded = false;
async function ensureTopicCatalogSeeded() {
  if (topicCatalogSeeded) return;
  const db = await getDb();
  if (!db) return;
  const existing = await db.select({ id: yksTopics.id }).from(yksTopics).limit(1);
  if (existing.length === 0 && topicSeeds.length > 0) {
    await db.insert(yksTopics).values(topicSeeds.map((seed) => ({ slug: seed.id, exam: seed.exam, subject: seed.subject, topic: seed.topic, unit: seed.unit }))).onDuplicateKeyUpdate({ set: { subject: sql`subject` } });
  }
  topicCatalogSeeded = true;
}
async function findOrCreateTopic(db, exam, subject, topic) {
  const existing = await db.select().from(yksTopics).where(and(eq(yksTopics.subject, subject), eq(yksTopics.topic, topic))).limit(1);
  if (existing[0]) return existing[0];
  const slug = `${exam}-${slugify(subject)}-${slugify(topic)}` || `topic-${Date.now()}`;
  const result = await db.insert(yksTopics).values({ slug, exam, subject, topic, unit: subject }).onDuplicateKeyUpdate({ set: { subject } });
  const inserted = await db.select().from(yksTopics).where(eq(yksTopics.slug, slug)).limit(1);
  return inserted[0] ?? { id: Number(result[0].insertId), slug, exam, subject, topic, unit: subject, sourceUrl: null, createdAt: /* @__PURE__ */ new Date() };
}
async function getTopicCatalog() {
  await ensureTopicCatalogSeeded();
  const db = await getDb();
  if (!db) return topicSeeds.map((seed, index2) => ({ id: -1 - index2, slug: seed.id, exam: seed.exam, subject: seed.subject, topic: seed.topic, unit: seed.unit, sourceUrl: null, createdAt: /* @__PURE__ */ new Date() }));
  return db.select().from(yksTopics);
}
async function getUserTopicProgress(userId) {
  const catalog = await getTopicCatalog();
  const db = await getDb();
  if (!db) return catalog.map((topic) => ({ ...topic, progress: 0, status: "Zay\u0131f", insufficientData: true, lastReviewedAt: null }));
  const rows = await db.select().from(topicProgress).where(eq(topicProgress.userId, userId));
  const byTopicId = new Map(rows.map((row) => [row.topicId, row]));
  return catalog.map((topic) => {
    const row = byTopicId.get(topic.id);
    if (!row) return { ...topic, progress: 0, status: "Zay\u0131f", insufficientData: true, lastReviewedAt: null };
    return { ...topic, progress: row.progress, status: statusFromDb[row.status], insufficientData: false, lastReviewedAt: row.lastReviewedAt };
  });
}
async function upsertTopicProgress(userId, input) {
  await ensureTopicCatalogSeeded();
  const db = await getDb();
  if (!db) return void 0;
  const topicRow = await findOrCreateTopic(db, input.exam, input.subject, input.topic);
  const { status, insufficientData } = deriveTopicStatus(input.accuracy, input.questionCount);
  const existing = await db.select().from(topicProgress).where(and(eq(topicProgress.userId, userId), eq(topicProgress.topicId, topicRow.id))).limit(1);
  const dbStatus = statusToDb[status];
  if (existing[0]) {
    await db.update(topicProgress).set({ progress: Math.round(input.accuracy), status: dbStatus, lastReviewedAt: input.studyDate, updatedAt: /* @__PURE__ */ new Date() }).where(eq(topicProgress.id, existing[0].id));
  } else {
    await db.insert(topicProgress).values({ userId, topicId: topicRow.id, progress: Math.round(input.accuracy), status: dbStatus, lastReviewedAt: input.studyDate });
  }
  return { slug: topicRow.slug, exam: topicRow.exam, subject: topicRow.subject, topic: topicRow.topic, unit: topicRow.unit, progress: Math.round(input.accuracy), status, insufficientData, lastReviewedAt: input.studyDate };
}

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  const secure = isSecureRequest(req);
  return {
    httpOnly: true,
    path: "/",
    // `SameSite=None` without `Secure` is invalid per spec — browsers drop
    // the cookie outright rather than setting it. The hosted/iframed Manus
    // environment is always https (secure=true), where None is required for
    // the cookie to survive cross-site delivery. A plain-http deployment
    // (local dev, this project standalone) is same-origin anyway, so Lax
    // works and — unlike None — is actually accepted without Secure. Without
    // this, both login and logout cookies were silently rejected on http,
    // which is exactly why logout appeared to do nothing.
    sameSite: secure ? "none" : "lax",
    secure
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    return decodeOAuthState(state).redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    let sessionToken = cookies.get(COOKIE_NAME);
    if (!sessionToken) {
      const authHeader = req.headers.authorization;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        sessionToken = authHeader.slice(7);
      }
    }
    const session = await this.verifySession(sessionToken);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    if (session.openId.startsWith(CRON_OPEN_ID_PREFIX)) {
      const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
      const taskUid = userInfo.taskUid ?? null;
      if (!taskUid) {
        throw ForbiddenError("Cron session missing task_uid");
      }
      return buildCronUser(userInfo);
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var CRON_OPEN_ID_PREFIX = "cron_";
function buildCronUser(userInfo) {
  const now = /* @__PURE__ */ new Date();
  return {
    id: -1,
    openId: userInfo.openId,
    name: userInfo.name || "Manus Scheduled Task",
    email: null,
    loginMethod: null,
    role: "user",
    approvalStatus: "approved",
    approvedAt: null,
    approvedBy: null,
    rejectedAt: null,
    rejectionReason: null,
    accountStatus: "active",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    taskUid: userInfo.taskUid ?? void 0,
    isCron: true
  };
}
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app2) {
  app2.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    const { nonce } = decodeOAuthState(state);
    const expectedNonce = parseCookieHeader2(req.headers.cookie ?? "")[OAUTH_STATE_COOKIE];
    if (!nonce || nonce !== expectedNonce) {
      res.status(403).json({ error: "invalid oauth state" });
      return;
    }
    res.clearCookie(OAUTH_STATE_COOKIE, { path: "/", secure: true, sameSite: "none" });
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/_core/devAuth.ts
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { eq as eq2 } from "drizzle-orm";
var DEV_OPEN_ID_PREFIX = "dev_local_";
var SCRYPT_KEY_LENGTH = 64;
var slugifyName = (value) => value.toLocaleLowerCase("tr").replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, SCRYPT_KEY_LENGTH).toString("hex");
  return `${salt}:${derived}`;
}
function verifyPassword(password, stored) {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const keyBuffer = Buffer.from(key, "hex");
  const derived = scryptSync(password, salt, SCRYPT_KEY_LENGTH);
  if (keyBuffer.length !== derived.length) return false;
  return timingSafeEqual(keyBuffer, derived);
}
function registerDevAuthRoutes(app2) {
  if (!ENV.allowLocalAuth) return;
  app2.post("/api/dev-login", async (req, res) => {
    try {
      const rawName = typeof req.body?.name === "string" ? req.body.name.trim().slice(0, 120) : "";
      const password = typeof req.body?.password === "string" ? req.body.password : "";
      const mode = req.body?.mode === "register" ? "register" : req.body?.mode === "login" ? "login" : null;
      if (!rawName) {
        res.status(400).json({ error: "Ad\u0131n\u0131 yazmal\u0131s\u0131n." });
        return;
      }
      if (password.length < 4) {
        res.status(400).json({ error: "\u015Eifre en az 4 karakter olmal\u0131." });
        return;
      }
      const db = await getDb();
      if (!db) {
        res.status(503).json({ error: "Veritaban\u0131 ba\u011Flant\u0131s\u0131 yok." });
        return;
      }
      const openId = `${DEV_OPEN_ID_PREFIX}${slugifyName(rawName) || "ogrenci"}`;
      const existing = await db.select().from(users).where(eq2(users.openId, openId)).limit(1);
      if (mode === "register" && existing[0]) {
        res.status(409).json({ error: 'Bu isim zaten kay\u0131tl\u0131. "Giri\u015F yap" sekmesini kullan\u0131r m\u0131s\u0131n?' });
        return;
      }
      if (mode === "login" && !existing[0]) {
        res.status(404).json({ error: 'Bu isimde bir hesap bulunamad\u0131. \xD6nce "Kay\u0131t ol" sekmesinden hesap olu\u015Ftur.' });
        return;
      }
      if (existing[0]) {
        if (!existing[0].passwordHash || !verifyPassword(password, existing[0].passwordHash)) {
          res.status(401).json({ error: "Ad veya \u015Fifre hatal\u0131." });
          return;
        }
        await db.update(users).set({ lastSignedIn: /* @__PURE__ */ new Date() }).where(eq2(users.id, existing[0].id));
      } else {
        await db.insert(users).values({ openId, name: rawName, email: null, loginMethod: "dev", passwordHash: hashPassword(password), approvalStatus: "pending", lastSignedIn: /* @__PURE__ */ new Date() });
      }
      const sessionToken = await sdk.createSessionToken(openId, { name: rawName, expiresInMs: ONE_YEAR_MS });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.json({ success: true, name: rawName, isNewAccount: !existing[0] });
    } catch (error) {
      console.error("[DevAuth] Local sign-in failed:", error);
      res.status(500).json({ error: "Giri\u015F yap\u0131lamad\u0131, tekrar dener misin?" });
    }
  });
}

// server/_core/storageProxy.ts
function registerStorageProxy(app2) {
  app2.get("/manus-storage/*", async (req, res) => {
    const key = req.params[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }
    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/"
      );
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` }
      });
      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }
      const { url } = await forgeResp.json();
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}

// server/_core/webhooks.ts
import express from "express";

// server/subscriptions/paymentProviders/types.ts
var ProviderConfigRequiredError = class extends Error {
  constructor(provider, method) {
    super(`CONFIG_REQUIRED: "${provider}" sa\u011Flay\u0131c\u0131s\u0131 i\xE7in "${method}" hen\xFCz ger\xE7ek credential'larla yap\u0131land\u0131r\u0131lmad\u0131 \u2014 bkz. docs/subscription/SUBSCRIPTION-ARCHITECTURE.md`);
    this.name = "ProviderConfigRequiredError";
  }
};

// server/subscriptions/paymentProviders/appleProvider.ts
var AppleAppStoreProvider = class {
  name = "apple";
  assertConfigured(method) {
    throw new ProviderConfigRequiredError("apple", method);
  }
  async createCheckout() {
    this.assertConfigured("createCheckout (StoreKit istemci taraf\u0131nda ba\u015Flat\u0131l\u0131r)");
  }
  async createSubscription() {
    this.assertConfigured("createSubscription");
  }
  async cancelSubscription() {
    this.assertConfigured("cancelSubscription (Apple abonelikleri yaln\u0131zca kullan\u0131c\u0131 taraf\u0131ndan iptal edilebilir)");
  }
  async restorePurchase() {
    this.assertConfigured("restorePurchase");
  }
  async verifyPurchase() {
    this.assertConfigured("verifyPurchase (App Store Server API JWT + transaction lookup gerekir)");
  }
  async handleWebhook() {
    this.assertConfigured("handleWebhook (App Store Server Notifications V2 JWS zincir do\u011Frulamas\u0131 gerekir)");
  }
  async refund() {
    this.assertConfigured("refund (Apple'da refund App Store/Apple taraf\u0131ndan tetiklenir, sunucu yaln\u0131zca bildirimi dinler)");
  }
  async getSubscription() {
    this.assertConfigured("getSubscription");
  }
};

// server/subscriptions/paymentProviders/googleProvider.ts
var GooglePlayProvider = class {
  name = "google";
  assertConfigured(method) {
    throw new ProviderConfigRequiredError("google", method);
  }
  async createCheckout() {
    this.assertConfigured("createCheckout (Play Billing istemci taraf\u0131nda ba\u015Flat\u0131l\u0131r)");
  }
  async createSubscription() {
    this.assertConfigured("createSubscription");
  }
  async cancelSubscription() {
    this.assertConfigured("cancelSubscription");
  }
  async restorePurchase() {
    this.assertConfigured("restorePurchase");
  }
  async verifyPurchase() {
    this.assertConfigured("verifyPurchase (Play Developer API purchaseToken do\u011Frulamas\u0131 gerekir)");
  }
  async handleWebhook() {
    this.assertConfigured("handleWebhook (Real-time Developer Notifications / Pub/Sub do\u011Frulamas\u0131 gerekir)");
  }
  async refund() {
    this.assertConfigured("refund");
  }
  async getSubscription() {
    this.assertConfigured("getSubscription");
  }
};

// server/subscriptions/paymentProviders/mockProvider.ts
import { createHmac, randomUUID, timingSafeEqual as timingSafeEqual2 } from "node:crypto";
function getMockSecret() {
  return ENV.paymentMockWebhookSecret || "mock-payment-secret-dev-only";
}
function sign(payload) {
  return createHmac("sha256", getMockSecret()).update(payload).digest("hex");
}
var MockPaymentProvider = class {
  name = "web";
  async createCheckout(input) {
    const providerSessionId = `mock_checkout_${randomUUID()}`;
    console.log(`[MockPaymentProvider] (SANDBOX, ger\xE7ek para YOK) checkout olu\u015Fturuldu: user=${input.userId} plan=${input.planCode} session=${providerSessionId}`);
    return { checkoutUrl: `${input.successUrl}?mock_session=${providerSessionId}`, providerSessionId };
  }
  async createSubscription(input) {
    const providerSubscriptionId = `mock_sub_${randomUUID()}`;
    const now = /* @__PURE__ */ new Date();
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + 30);
    console.log(`[MockPaymentProvider] (SANDBOX) subscription olu\u015Fturuldu: ${providerSubscriptionId} \u2014 ger\xE7ek aktivasyon yaln\u0131zca webhook geldi\u011Finde olur.`);
    return { providerSubscriptionId, providerCustomerId: `mock_customer_${input.userId}`, status: "active", currentPeriodStart: now, currentPeriodEnd: periodEnd, cancelAtPeriodEnd: false };
  }
  async cancelSubscription(providerSubscriptionId) {
    console.log(`[MockPaymentProvider] (SANDBOX) iptal edildi: ${providerSubscriptionId}`);
  }
  async restorePurchase(input) {
    if (!input.providerToken) return { valid: false, reason: "Bo\u015F token" };
    return { valid: true, providerSubscriptionId: input.providerToken, providerCustomerId: `mock_customer_${input.userId}` };
  }
  async verifyPurchase(providerToken) {
    if (!providerToken.startsWith("mock_")) return { valid: false, reason: "Tan\u0131nmayan sandbox token format\u0131" };
    return { valid: true, providerSubscriptionId: providerToken };
  }
  /** Test yardımcı fonksiyonu — gerçek bir sağlayıcı asla böyle bir "imzala" fonksiyonu sunmaz, yalnızca mock'a özgü. */
  signTestPayload(payload) {
    return sign(payload);
  }
  async handleWebhook(input) {
    const raw = typeof input.rawBody === "string" ? input.rawBody : input.rawBody.toString("utf8");
    const signatureHeader = input.headers["x-mock-signature"];
    const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
    if (!signature) return { valid: false, reason: "\u0130mza ba\u015Fl\u0131\u011F\u0131 eksik (x-mock-signature)" };
    const expected = sign(raw);
    const signatureBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expected, "hex");
    if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual2(signatureBuffer, expectedBuffer)) {
      return { valid: false, reason: "\u0130mza do\u011Frulanamad\u0131" };
    }
    try {
      const payload = JSON.parse(raw);
      if (!payload.eventId || !payload.eventType) return { valid: false, reason: "eventId/eventType eksik" };
      return { valid: true, eventId: payload.eventId, eventType: payload.eventType, payload };
    } catch {
      return { valid: false, reason: "Ge\xE7ersiz JSON payload" };
    }
  }
  async refund(providerPaymentId) {
    console.log(`[MockPaymentProvider] (SANDBOX) iade edildi: ${providerPaymentId}`);
  }
  async getSubscription(providerSubscriptionId) {
    if (!providerSubscriptionId.startsWith("mock_sub_")) return null;
    const now = /* @__PURE__ */ new Date();
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + 30);
    return { providerSubscriptionId, providerCustomerId: null, status: "active", currentPeriodStart: now, currentPeriodEnd: periodEnd, cancelAtPeriodEnd: false };
  }
};

// server/subscriptions/paymentProviders/factory.ts
function paymentProviderFactory(providerName = ENV.paymentProvider) {
  switch (providerName) {
    case "apple":
      return new AppleAppStoreProvider();
    case "google":
      return new GooglePlayProvider();
    case "mock":
    case "web":
    default:
      return new MockPaymentProvider();
  }
}

// shared/subscriptionStateMachine.ts
var ALLOWED_TRANSITIONS = {
  incomplete: ["active", "canceled", "expired"],
  trialing: ["active", "canceled", "expired"],
  // "active" hem "ücretsiz plan, süresiz aktif" hem "premium, ödeme
  // döngüsünde aktif" durumunu temsil eder — FREE'den PREMIUM trial'ına
  // geçiş (spec §10/§11) bu yüzden active->trialing'i içerir.
  active: ["trialing", "past_due", "canceled", "paused", "expired"],
  past_due: ["active", "grace_period", "canceled", "expired"],
  grace_period: ["active", "expired", "canceled"],
  paused: ["active", "canceled"],
  canceled: ["active"],
  // resume — yalnızca dönem bitmeden önce (bkz. resolveCancellation)
  expired: ["active", "trialing"]
  // trialing yalnızca hiç trial kullanmamış (yeni) bir abonelik satırı içindir; gerçek "restart" application katmanında engellenir
};
function canTransitionSubscriptionStatus(from, to) {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}
function assertValidSubscriptionTransition(from, to) {
  if (!canTransitionSubscriptionStatus(from, to)) {
    throw new Error(`Ge\xE7ersiz abonelik durum ge\xE7i\u015Fi: ${from} -> ${to}`);
  }
}
function resolveEffectiveStatus(snapshot, now) {
  const { status, trialEndsAt, currentPeriodEnd, cancelAtPeriodEnd, gracePeriodEndsAt } = snapshot;
  if (status === "trialing" && trialEndsAt && now >= trialEndsAt) return "expired";
  if (status === "grace_period" && gracePeriodEndsAt && now >= gracePeriodEndsAt) return "expired";
  if (status === "active" && cancelAtPeriodEnd && currentPeriodEnd && now >= currentPeriodEnd) return "expired";
  if (status === "active" && !cancelAtPeriodEnd && currentPeriodEnd && now >= currentPeriodEnd) return "past_due";
  return status;
}
var PREMIUM_ACCESS_STATUSES = ["trialing", "active", "grace_period"];
function statusGrantsPremiumAccess(status) {
  return PREMIUM_ACCESS_STATUSES.includes(status);
}

// server/subscriptions/subscriptionDb.ts
import { and as and2, desc as desc2, eq as eq3, gte as gte2, sql as sql2 } from "drizzle-orm";
async function listActivePlans() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subscriptionPlans).where(eq3(subscriptionPlans.isActive, 1));
}
async function getPlanByCode(code) {
  const db = await getDb();
  if (!db) return void 0;
  const rows = await db.select().from(subscriptionPlans).where(eq3(subscriptionPlans.code, code)).limit(1);
  return rows[0];
}
async function getPlanById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const rows = await db.select().from(subscriptionPlans).where(eq3(subscriptionPlans.id, id)).limit(1);
  return rows[0];
}
async function upsertPlan(input) {
  const db = await getDb();
  if (!db) return;
  const existing = await getPlanByCode(input.code);
  if (existing) {
    await db.update(subscriptionPlans).set({ name: input.name, description: input.description ?? null, tier: input.tier, billingPeriod: input.billingPeriod, price: input.price, currency: input.currency ?? "TRY", trialDays: input.trialDays ?? 0, storeProductId: input.storeProductId ?? null, provider: input.provider ?? null }).where(eq3(subscriptionPlans.id, existing.id));
    return;
  }
  await db.insert(subscriptionPlans).values({ code: input.code, name: input.name, description: input.description ?? null, tier: input.tier, billingPeriod: input.billingPeriod, price: input.price, currency: input.currency ?? "TRY", trialDays: input.trialDays ?? 0, storeProductId: input.storeProductId ?? null, provider: input.provider ?? null });
}
async function getSubscriptionByUserId(userId) {
  const db = await getDb();
  if (!db) return void 0;
  const rows = await db.select().from(subscriptions).where(eq3(subscriptions.userId, userId)).limit(1);
  return rows[0];
}
async function ensureFreeSubscription(userId) {
  const db = await getDb();
  if (!db) throw new Error("Veritaban\u0131 ba\u011Flant\u0131s\u0131 yok");
  const existing = await getSubscriptionByUserId(userId);
  if (existing) return existing;
  const freePlan = await getPlanByCode("FREE");
  if (!freePlan) throw new Error("FREE plan\u0131 bulunamad\u0131 \u2014 \xF6nce seedSubscriptionPlans() \xE7al\u0131\u015Ft\u0131r\u0131lmal\u0131");
  await db.insert(subscriptions).values({ userId, planId: freePlan.id, status: "active", provider: null }).onDuplicateKeyUpdate({ set: { updatedAt: /* @__PURE__ */ new Date() } });
  const created = await getSubscriptionByUserId(userId);
  if (!created) throw new Error("Free subscription olu\u015Fturulamad\u0131");
  return created;
}
async function listAllSubscriptionsForAdmin() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    userId: subscriptions.userId,
    userName: users.name,
    userEmail: users.email,
    status: subscriptions.status,
    planCode: subscriptionPlans.code,
    planName: subscriptionPlans.name,
    trialEndsAt: subscriptions.trialEndsAt,
    currentPeriodEnd: subscriptions.currentPeriodEnd,
    cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
    isManualOverride: subscriptions.isManualOverride,
    provider: subscriptions.provider,
    updatedAt: subscriptions.updatedAt
  }).from(subscriptions).innerJoin(users, eq3(users.id, subscriptions.userId)).innerJoin(subscriptionPlans, eq3(subscriptionPlans.id, subscriptions.planId)).orderBy(desc2(subscriptions.updatedAt));
}
async function updateSubscription(userId, patch) {
  const db = await getDb();
  if (!db) throw new Error("Veritaban\u0131 ba\u011Flant\u0131s\u0131 yok");
  await db.update(subscriptions).set(patch).where(eq3(subscriptions.userId, userId));
  const updated = await getSubscriptionByUserId(userId);
  if (!updated) throw new Error("Abonelik bulunamad\u0131");
  return updated;
}
async function createPayment(input) {
  const db = await getDb();
  if (!db) throw new Error("Veritaban\u0131 ba\u011Flant\u0131s\u0131 yok");
  const result = await db.insert(payments).values(input);
  return Number(result[0].insertId);
}
async function updatePaymentStatus(paymentId, patch) {
  const db = await getDb();
  if (!db) return;
  await db.update(payments).set(patch).where(eq3(payments.id, paymentId));
}
async function listPaymentsForUser(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(payments).where(eq3(payments.userId, userId)).orderBy(desc2(payments.createdAt));
}
async function listAllPaymentsForAdmin(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: payments.id, userId: payments.userId, userName: users.name, userEmail: users.email, amount: payments.amount, currency: payments.currency, provider: payments.provider, status: payments.status, paymentType: payments.paymentType, providerPaymentId: payments.providerPaymentId, createdAt: payments.createdAt, paidAt: payments.paidAt }).from(payments).innerJoin(users, eq3(users.id, payments.userId)).orderBy(desc2(payments.createdAt)).limit(Math.min(500, Math.max(1, limit)));
}
async function isDuplicateEvent(provider, eventId) {
  const db = await getDb();
  if (!db) return false;
  const rows = await db.select({ id: paymentEvents.id, status: paymentEvents.status }).from(paymentEvents).where(and2(eq3(paymentEvents.provider, provider), eq3(paymentEvents.eventId, eventId))).limit(1);
  return rows.length > 0 && rows[0].status === "processed";
}
async function recordEventReceived(input) {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.insert(paymentEvents).values(input);
    return Number(result[0].insertId);
  } catch {
    const rows = await db.select({ id: paymentEvents.id }).from(paymentEvents).where(and2(eq3(paymentEvents.provider, input.provider), eq3(paymentEvents.eventId, input.eventId))).limit(1);
    return rows[0]?.id ?? null;
  }
}
async function markEventProcessed(id, status, errorMessage) {
  const db = await getDb();
  if (!db) return;
  await db.update(paymentEvents).set({ status, processedAt: /* @__PURE__ */ new Date(), errorMessage: errorMessage ?? null }).where(eq3(paymentEvents.id, id));
}
async function writeAuditLog(input) {
  const db = await getDb();
  if (!db) return;
  await db.insert(subscriptionAuditLogs).values({
    userId: input.userId,
    adminId: input.adminId ?? null,
    action: input.action,
    oldState: input.oldState !== void 0 ? JSON.stringify(input.oldState) : null,
    newState: input.newState !== void 0 ? JSON.stringify(input.newState) : null,
    reason: input.reason ?? null,
    metadata: input.metadata !== void 0 ? JSON.stringify(input.metadata) : null
  });
}
async function listAuditLogsForUser(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subscriptionAuditLogs).where(eq3(subscriptionAuditLogs.userId, userId)).orderBy(desc2(subscriptionAuditLogs.createdAt));
}
async function listAllAuditLogs(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subscriptionAuditLogs).orderBy(desc2(subscriptionAuditLogs.createdAt)).limit(Math.min(500, Math.max(1, limit)));
}
async function recordFeatureUsage(userId, featureKey) {
  const db = await getDb();
  if (!db) return;
  await db.insert(featureUsageLogs).values({ userId, featureKey });
}
async function countFeatureUsage(userId, featureKey, windowDays) {
  const db = await getDb();
  if (!db) return 0;
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1e3);
  const rows = await db.select({ id: featureUsageLogs.id }).from(featureUsageLogs).where(and2(eq3(featureUsageLogs.userId, userId), eq3(featureUsageLogs.featureKey, featureKey), gte2(featureUsageLogs.usedAt, since)));
  return rows.length;
}
async function resetFeatureUsage(userId, featureKey, windowDays, adminId) {
  const db = await getDb();
  if (!db) return;
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1e3);
  await db.delete(featureUsageLogs).where(and2(eq3(featureUsageLogs.userId, userId), eq3(featureUsageLogs.featureKey, featureKey), gte2(featureUsageLogs.usedAt, since)));
  await writeAuditLog({ userId, adminId, action: "usage_reset", newState: { featureKey, windowDays } });
}
async function listPendingUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).where(eq3(users.approvalStatus, "pending")).orderBy(desc2(users.createdAt));
}
async function approveUser(userId, adminId) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ approvalStatus: "approved", approvedAt: /* @__PURE__ */ new Date(), approvedBy: adminId, rejectedAt: null, rejectionReason: null }).where(eq3(users.id, userId));
  await writeAuditLog({ userId, adminId, action: "user_approved", newState: { approvalStatus: "approved" } });
}
async function rejectUser(userId, adminId, reason) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ approvalStatus: "rejected", rejectedAt: /* @__PURE__ */ new Date(), rejectionReason: reason ?? null }).where(eq3(users.id, userId));
  await writeAuditLog({ userId, adminId, action: "user_rejected", newState: { approvalStatus: "rejected" }, reason });
}

// server/subscriptions/webhookRedaction.ts
var SENSITIVE_KEYS = /* @__PURE__ */ new Set(["card_number", "cardNumber", "cvv", "cvc", "password", "secret", "token", "access_token", "refresh_token", "authorization"]);
function redactSensitivePayload(value) {
  if (Array.isArray(value)) return value.map(redactSensitivePayload);
  if (value && typeof value === "object") {
    const entries = Object.entries(value).map(([key, val]) => {
      if (SENSITIVE_KEYS.has(key)) return [key, "[REDACTED]"];
      return [key, redactSensitivePayload(val)];
    });
    return Object.fromEntries(entries);
  }
  return value;
}
function redactAndStringify(payload) {
  return JSON.stringify(redactSensitivePayload(payload));
}

// server/subscriptions/webhookProcessor.ts
async function processWebhookEvent(input) {
  const alreadyProcessed = await isDuplicateEvent(input.provider, input.eventId);
  if (alreadyProcessed) {
    return { status: "ignored", reason: "Bu event daha \xF6nce i\u015Flendi (idempotency)" };
  }
  const eventRowId = await recordEventReceived({
    provider: input.provider,
    eventId: input.eventId,
    eventType: input.eventType,
    payload: redactAndStringify(input.rawPayloadForAudit)
  });
  try {
    await applyCanonicalEvent(input.eventType, input.payload);
    if (eventRowId) await markEventProcessed(eventRowId, "processed");
    return { status: "processed" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (eventRowId) await markEventProcessed(eventRowId, "failed", message);
    return { status: "failed", reason: message };
  }
}
async function applyCanonicalEvent(eventType, payload) {
  if (!payload?.userId) throw new Error("payload.userId eksik");
  switch (eventType) {
    case "checkout.completed":
      return handleCheckoutCompleted(payload);
    case "subscription.renewed":
      return handleSubscriptionRenewed(payload);
    case "subscription.payment_failed":
      return handlePaymentFailed(payload);
    case "subscription.grace_period_started":
      return handleGracePeriodStarted(payload);
    case "subscription.canceled":
      return handleSubscriptionCanceled(payload);
    case "payment.refunded":
      return handleRefund(payload);
    default:
      throw new Error(`Bilinmeyen event tipi: ${eventType}`);
  }
}
async function handleCheckoutCompleted(payload) {
  if (!payload.planCode) throw new Error("payload.planCode eksik");
  const plan = await getPlanByCode(payload.planCode);
  if (!plan) throw new Error(`Plan bulunamad\u0131: ${payload.planCode}`);
  const existing = await ensureFreeSubscription(payload.userId);
  const now = /* @__PURE__ */ new Date();
  const periodDays = payload.periodDays ?? (plan.billingPeriod === "yearly" ? 365 : 30);
  const periodEnd = new Date(now.getTime() + periodDays * 24 * 60 * 60 * 1e3);
  const eligibleForTrial = plan.trialDays > 0 && !existing?.trialStartedAt;
  const nextStatus = eligibleForTrial ? "trialing" : "active";
  const trialEndsAt = eligibleForTrial ? new Date(now.getTime() + plan.trialDays * 24 * 60 * 60 * 1e3) : existing?.trialEndsAt ?? null;
  if (existing) assertValidSubscriptionTransition(existing.status, nextStatus);
  const paymentId = await createPayment({
    userId: payload.userId,
    subscriptionId: existing?.id ?? null,
    provider: "web",
    providerPaymentId: payload.providerPaymentId ?? null,
    amount: payload.amount ?? plan.price,
    currency: payload.currency ?? plan.currency,
    status: eligibleForTrial ? "authorized" : "paid",
    paymentType: eligibleForTrial ? "trial_start" : "initial",
    paidAt: eligibleForTrial ? null : now
  });
  const oldState = existing ? { status: existing.status } : null;
  await updateSubscription(payload.userId, {
    planId: plan.id,
    status: nextStatus,
    trialStartedAt: eligibleForTrial ? now : existing?.trialStartedAt ?? null,
    trialEndsAt,
    currentPeriodStart: now,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: 0,
    canceledAt: null,
    provider: "web",
    providerSubscriptionId: payload.providerSubscriptionId ?? null,
    providerCustomerId: payload.providerCustomerId ?? null,
    latestPaymentId: paymentId
  });
  await writeAuditLog({ userId: payload.userId, action: "checkout_completed", oldState, newState: { status: nextStatus, planCode: plan.code }, metadata: { paymentId } });
}
async function handleSubscriptionRenewed(payload) {
  const existing = await getSubscriptionByUserId(payload.userId);
  if (!existing) throw new Error("Yenilenecek abonelik bulunamad\u0131");
  const plan = await getPlanByCode(payload.planCode ?? "");
  assertValidSubscriptionTransition(existing.status, "active");
  const periodDays = payload.periodDays ?? (plan?.billingPeriod === "yearly" ? 365 : 30);
  const now = /* @__PURE__ */ new Date();
  const periodEnd = new Date(now.getTime() + periodDays * 24 * 60 * 60 * 1e3);
  const paymentId = await createPayment({ userId: payload.userId, subscriptionId: existing.id, provider: "web", providerPaymentId: payload.providerPaymentId ?? null, amount: payload.amount ?? plan?.price ?? 0, currency: payload.currency ?? plan?.currency ?? "TRY", status: "paid", paymentType: "renewal", paidAt: now });
  await updateSubscription(payload.userId, { status: "active", currentPeriodStart: now, currentPeriodEnd: periodEnd, latestPaymentId: paymentId });
  await writeAuditLog({ userId: payload.userId, action: "subscription_renewed", oldState: { status: existing.status }, newState: { status: "active" }, metadata: { paymentId } });
}
async function handlePaymentFailed(payload) {
  const existing = await getSubscriptionByUserId(payload.userId);
  if (!existing) throw new Error("Abonelik bulunamad\u0131");
  assertValidSubscriptionTransition(existing.status, "past_due");
  await updateSubscription(payload.userId, { status: "past_due" });
  await writeAuditLog({ userId: payload.userId, action: "payment_failed", oldState: { status: existing.status }, newState: { status: "past_due" } });
}
async function handleGracePeriodStarted(payload) {
  const existing = await getSubscriptionByUserId(payload.userId);
  if (!existing) throw new Error("Abonelik bulunamad\u0131");
  assertValidSubscriptionTransition(existing.status, "grace_period");
  const days = payload.gracePeriodDays ?? 3;
  const gracePeriodEndsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1e3);
  await updateSubscription(payload.userId, { status: "grace_period", gracePeriodEndsAt });
  await writeAuditLog({ userId: payload.userId, action: "grace_period_started", oldState: { status: existing.status }, newState: { status: "grace_period", gracePeriodEndsAt } });
}
async function handleSubscriptionCanceled(payload) {
  const existing = await getSubscriptionByUserId(payload.userId);
  if (!existing) throw new Error("Abonelik bulunamad\u0131");
  const nextStatus = payload.immediate ? "canceled" : existing.status;
  if (payload.immediate) assertValidSubscriptionTransition(existing.status, "canceled");
  await updateSubscription(payload.userId, { status: nextStatus, cancelAtPeriodEnd: payload.immediate ? 0 : 1, canceledAt: /* @__PURE__ */ new Date() });
  await writeAuditLog({ userId: payload.userId, action: "subscription_canceled", oldState: { status: existing.status }, newState: { status: nextStatus, cancelAtPeriodEnd: !payload.immediate } });
}
async function handleRefund(payload) {
  const existing = await getSubscriptionByUserId(payload.userId);
  if (!existing) throw new Error("Abonelik bulunamad\u0131");
  if (existing.latestPaymentId) await updatePaymentStatus(existing.latestPaymentId, { status: "refunded", refundedAt: /* @__PURE__ */ new Date() });
  assertValidSubscriptionTransition(existing.status, "canceled");
  await updateSubscription(payload.userId, { status: "canceled", canceledAt: /* @__PURE__ */ new Date(), cancelAtPeriodEnd: 0 });
  await writeAuditLog({ userId: payload.userId, action: "payment_refunded", oldState: { status: existing.status }, newState: { status: "canceled" } });
}

// server/_core/webhooks.ts
function registerWebhookRoutes(app2) {
  app2.post("/api/webhooks/:provider", express.raw({ type: "*/*", limit: "2mb" }), async (req, res) => {
    const providerName = req.params.provider;
    const provider = paymentProviderFactory(providerName);
    try {
      const verification = await provider.handleWebhook({ rawBody: req.body, headers: req.headers });
      if (!verification.valid) {
        console.warn(`[Webhook] ${providerName} imza do\u011Frulamas\u0131 ba\u015Far\u0131s\u0131z: ${verification.reason}`);
        res.status(401).json({ error: "invalid_signature" });
        return;
      }
      if (!verification.eventId || !verification.eventType || !verification.payload || typeof verification.payload !== "object") {
        res.status(400).json({ error: "invalid_payload" });
        return;
      }
      const result = await processWebhookEvent({
        provider: providerName,
        eventId: verification.eventId,
        eventType: verification.eventType,
        payload: verification.payload,
        rawPayloadForAudit: verification.payload
      });
      console.log(`[Webhook] ${providerName}/${verification.eventType} -> ${result.status}${result.reason ? ` (${result.reason})` : ""}`);
      res.status(200).json({ received: true, status: result.status });
    } catch (error) {
      console.error(`[Webhook] ${providerName} i\u015Flenirken hata:`, error);
      res.status(500).json({ error: "processing_failed" });
    }
  });
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";

// server/_core/rateLimit.ts
var buckets = /* @__PURE__ */ new Map();
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of Array.from(buckets)) {
    if (now - bucket.windowStartedAt > 10 * 60 * 1e3) buckets.delete(key);
  }
}, 5 * 60 * 1e3).unref?.();
var RateLimitExceededError = class extends Error {
  constructor(retryAfterMs) {
    super("RATE_LIMITED");
    this.retryAfterMs = retryAfterMs;
    this.name = "RateLimitExceededError";
  }
};
function checkRateLimit(key, maxRequests, windowMs) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now - bucket.windowStartedAt >= windowMs) {
    buckets.set(key, { count: 1, windowStartedAt: now });
    return;
  }
  if (bucket.count >= maxRequests) {
    throw new RateLimitExceededError(windowMs - (now - bucket.windowStartedAt));
  }
  bucket.count += 1;
}

// shared/entitlements.ts
var FEATURE_KEYS = [
  "AI_STUDY_PLAN",
  "OCR_EXAM_IMPORT",
  "ADVANCED_ANALYTICS",
  "PLAN_ADHERENCE",
  "RESOURCE_RECOMMENDATIONS",
  "ADVANCED_REPORTS",
  "FOCUS_AURA_PREMIUM",
  "MOCK_EXAM_ANALYTICS"
];
var TIER_FEATURES = {
  free: [],
  premium: ["AI_STUDY_PLAN", "OCR_EXAM_IMPORT", "ADVANCED_ANALYTICS", "PLAN_ADHERENCE", "RESOURCE_RECOMMENDATIONS", "ADVANCED_REPORTS", "FOCUS_AURA_PREMIUM", "MOCK_EXAM_ANALYTICS"],
  premium_plus: ["AI_STUDY_PLAN", "OCR_EXAM_IMPORT", "ADVANCED_ANALYTICS", "PLAN_ADHERENCE", "RESOURCE_RECOMMENDATIONS", "ADVANCED_REPORTS", "FOCUS_AURA_PREMIUM", "MOCK_EXAM_ANALYTICS"]
};
function featuresForTier(tier) {
  return TIER_FEATURES[tier] ?? [];
}
var FEATURE_USAGE_LIMITS = {
  AI_STUDY_PLAN: { windowDays: 30, maxUses: 60 },
  OCR_EXAM_IMPORT: { windowDays: 30, maxUses: 40 }
};
var FREE_TIER_LIMITS = {
  AI_STUDY_PLAN: { windowDays: 30, maxUses: 3 },
  OCR_EXAM_IMPORT: { windowDays: 30, maxUses: 2 }
};

// server/subscriptions/entitlementService.ts
async function getCurrentSubscription(userId) {
  const subscription = await ensureFreeSubscription(userId);
  const now = /* @__PURE__ */ new Date();
  const effectiveStatus = resolveEffectiveStatus(
    {
      status: subscription.status,
      trialEndsAt: subscription.trialEndsAt,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: Boolean(subscription.cancelAtPeriodEnd),
      gracePeriodEndsAt: subscription.gracePeriodEndsAt
    },
    now
  );
  if (effectiveStatus !== subscription.status) {
    const oldState = { status: subscription.status };
    const updated = await updateSubscription(userId, { status: effectiveStatus });
    await writeAuditLog({ userId, action: "status_auto_transitioned", oldState, newState: { status: effectiveStatus }, reason: "resolveEffectiveStatus (zaman bazl\u0131 otomatik ge\xE7i\u015F)" });
    return updated;
  }
  return subscription;
}
async function getEntitlements(userId) {
  const subscription = await getCurrentSubscription(userId);
  const plan = await getPlanById(subscription.planId);
  const tier = plan?.tier ?? "free";
  const status = subscription.status;
  const isPremium = tier !== "free" && statusGrantsPremiumAccess(status);
  return {
    tier,
    planCode: plan?.code ?? "FREE",
    status,
    isPremium,
    isTrial: status === "trialing",
    trialEndsAt: subscription.trialEndsAt ? subscription.trialEndsAt.toISOString() : null,
    currentPeriodEnd: subscription.currentPeriodEnd ? subscription.currentPeriodEnd.toISOString() : null,
    cancelAtPeriodEnd: Boolean(subscription.cancelAtPeriodEnd),
    gracePeriodEndsAt: subscription.gracePeriodEndsAt ? subscription.gracePeriodEndsAt.toISOString() : null,
    entitlements: isPremium ? featuresForTier(tier) : []
  };
}
var PremiumRequiredError = class extends Error {
  constructor(feature) {
    super(`PREMIUM_REQUIRED: ${feature}`);
    this.name = "PremiumRequiredError";
  }
};
var UsageLimitExceededError = class extends Error {
  constructor(feature, limit, windowDays) {
    super(`USAGE_LIMIT_EXCEEDED: ${feature} (son ${windowDays} g\xFCnde en fazla ${limit} kullan\u0131m)`);
    this.name = "UsageLimitExceededError";
  }
};
function limitForTier(feature, isPremium) {
  return isPremium ? FEATURE_USAGE_LIMITS[feature] : FREE_TIER_LIMITS[feature];
}
async function assertUsageAvailable(userId, feature) {
  const snapshot = await getEntitlements(userId);
  if (!snapshot.isPremium && !FREE_TIER_LIMITS[feature]) {
    throw new PremiumRequiredError(feature);
  }
  const limit = limitForTier(feature, snapshot.isPremium);
  if (limit) {
    const used = await countFeatureUsage(userId, feature, limit.windowDays);
    if (used >= limit.maxUses) throw new UsageLimitExceededError(feature, limit.maxUses, limit.windowDays);
  }
  return { isPremium: snapshot.isPremium };
}
async function getUsageSummaryForUser(userId) {
  const snapshot = await getEntitlements(userId);
  const summaries = [];
  for (const feature of FEATURE_KEYS) {
    const limit = limitForTier(feature, snapshot.isPremium);
    if (!limit) {
      const hasAccess = snapshot.isPremium ? snapshot.entitlements.includes(feature) : Boolean(FREE_TIER_LIMITS[feature]);
      if (!hasAccess) continue;
      summaries.push({ feature, used: 0, limit: null, remaining: null, windowDays: null, periodStart: null, periodEnd: null });
      continue;
    }
    const used = await countFeatureUsage(userId, feature, limit.windowDays);
    const periodStart = new Date(Date.now() - limit.windowDays * 24 * 60 * 60 * 1e3);
    summaries.push({ feature, used, limit: limit.maxUses, remaining: Math.max(0, limit.maxUses - used), windowDays: limit.windowDays, periodStart: periodStart.toISOString(), periodEnd: (/* @__PURE__ */ new Date()).toISOString() });
  }
  return summaries;
}

// server/_core/trpc.ts
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var APPROVAL_GATE_ALLOWLIST = /* @__PURE__ */ new Set(["auth.me", "auth.logout"]);
var requireUser = t.middleware(async (opts) => {
  const { ctx, next, path } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  if (!APPROVAL_GATE_ALLOWLIST.has(path) && ctx.user.approvalStatus !== "approved") {
    const message = ctx.user.approvalStatus === "rejected" ? APPROVAL_REJECTED_ERR_MSG : APPROVAL_PENDING_ERR_MSG;
    throw new TRPCError2({ code: "FORBIDDEN", message });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);
function metredFeatureProcedure(feature, rateLimit = { maxRequests: 5, windowMs: 6e4 }) {
  return protectedProcedure.use(
    t.middleware(async (opts) => {
      const { ctx, next, path } = opts;
      if (!ctx.user) throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
      try {
        checkRateLimit(`${ctx.user.id}:${path}`, rateLimit.maxRequests, rateLimit.windowMs);
      } catch (error) {
        if (error instanceof RateLimitExceededError) throw new TRPCError2({ code: "TOO_MANY_REQUESTS", message: RATE_LIMITED_ERR_MSG });
        throw error;
      }
      try {
        await assertUsageAvailable(ctx.user.id, feature);
      } catch (error) {
        if (error instanceof PremiumRequiredError) throw new TRPCError2({ code: "FORBIDDEN", message: PREMIUM_REQUIRED_ERR_MSG });
        if (error instanceof UsageLimitExceededError) throw new TRPCError2({ code: "TOO_MANY_REQUESTS", message: error.message });
        throw error;
      }
      const result = await next({ ctx });
      if (result.ok) await recordFeatureUsage(ctx.user.id, feature);
      return result;
    })
  );
}

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/_core/llm.ts
var ensureArray = (value) => Array.isArray(value) ? value : [value];
var normalizeContentPart = (part) => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }
  if (part.type === "text") {
    return part;
  }
  if (part.type === "image_url") {
    return part;
  }
  if (part.type === "file_url") {
    return part;
  }
  throw new Error("Unsupported message content part");
};
var normalizeMessage = (message) => {
  const { role, name, tool_call_id } = message;
  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content).map((part) => typeof part === "string" ? part : JSON.stringify(part)).join("\n");
    return {
      role,
      name,
      tool_call_id,
      content
    };
  }
  const contentParts = ensureArray(message.content).map(normalizeContentPart);
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text
    };
  }
  return {
    role,
    name,
    content: contentParts
  };
};
var normalizeToolChoice = (toolChoice, tools) => {
  if (!toolChoice) return void 0;
  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }
  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }
    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }
    return {
      type: "function",
      function: { name: tools[0].function.name }
    };
  }
  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name }
    };
  }
  return toolChoice;
};
var resolveApiUrl = () => ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0 ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions` : "https://forge.manus.im/v1/chat/completions";
var assertApiKey = () => {
  if (!ENV.forgeApiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
};
var normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema
}) => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (explicitFormat.type === "json_schema" && !explicitFormat.json_schema?.schema) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }
  const schema = outputSchema || output_schema;
  if (!schema) return void 0;
  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }
  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...typeof schema.strict === "boolean" ? { strict: schema.strict } : {}
    }
  };
};
var RETRY_MAX_RETRIES = 4;
var RETRY_BASE_DELAY_MS = 500;
var RETRY_MAX_DELAY_MS = 3e4;
var sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
var parseRetryAfter = (value) => {
  if (!value) return void 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1e3);
  const at = Date.parse(value);
  return Number.isNaN(at) ? void 0 : Math.max(0, at - Date.now());
};
var computeBackoffDelay = (attempt, retryAfterMs) => {
  const cap3 = Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt, RETRY_MAX_DELAY_MS);
  const jittered = cap3 / 2 + Math.random() * (cap3 / 2);
  return Math.min(Math.max(jittered, retryAfterMs ?? 0), RETRY_MAX_DELAY_MS);
};
var fetchWithBackoff = async (url, init) => {
  let lastError;
  for (let attempt = 0; attempt <= RETRY_MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, init);
      if (response.ok || attempt === RETRY_MAX_RETRIES) {
        return response;
      }
      const retryAfterMs = parseRetryAfter(
        response.headers.get("retry-after")
      );
      try {
        await response.body?.cancel();
      } catch {
      }
      console.warn(
        `LLM request retry ${attempt + 1}/${RETRY_MAX_RETRIES} after status ${response.status}`
      );
      await sleep(computeBackoffDelay(attempt, retryAfterMs));
    } catch (error) {
      lastError = error;
      if (attempt === RETRY_MAX_RETRIES) throw error;
      console.warn(
        `LLM request retry ${attempt + 1}/${RETRY_MAX_RETRIES} after network error`
      );
      await sleep(computeBackoffDelay(attempt));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("LLM request failed after exhausting retries");
};
async function invokeLLM(params) {
  assertApiKey();
  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
    model,
    thinking,
    reasoning,
    maxTokens,
    max_tokens
  } = params;
  const payload = {
    messages: messages.map(normalizeMessage)
  };
  if (model) {
    payload.model = model;
  }
  if (tools && tools.length > 0) {
    payload.tools = tools;
  }
  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }
  const resolvedMaxTokens = max_tokens ?? maxTokens;
  if (typeof resolvedMaxTokens === "number") {
    payload.max_tokens = resolvedMaxTokens;
  }
  if (thinking) {
    payload.thinking = thinking;
  }
  if (reasoning) {
    payload.reasoning = reasoning;
  }
  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema
  });
  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }
  const response = await fetchWithBackoff(resolveApiUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ENV.forgeApiKey}`
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM invoke failed: ${response.status} ${response.statusText} \u2013 ${errorText}`
    );
  }
  return await response.json();
}

// server/_core/fileValidation.ts
var MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
var MAGIC_BYTES = {
  "application/pdf": [[37, 80, 68, 70]],
  // %PDF
  "image/png": [[137, 80, 78, 71, 13, 10, 26, 10]],
  "image/jpeg": [[255, 216, 255]],
  "image/webp": [[82, 73, 70, 70]]
  // "RIFF" — WEBP kontrolü ayrıca byte 8-11 "WEBP" olmalı
};
function validateDataUrl(dataUrl, declaredMimeType) {
  const match = /^data:([^;]+);base64,([\s\S]+)$/.exec(dataUrl);
  if (!match) return { valid: false, reason: "Ge\xE7ersiz data URL format\u0131." };
  const [, encodedMime, base64] = match;
  if (encodedMime !== declaredMimeType) {
    return { valid: false, reason: "data URL'deki MIME t\xFCr\xFC, bildirilen mimeType ile uyu\u015Fmuyor." };
  }
  let buffer;
  try {
    buffer = Buffer.from(base64, "base64");
  } catch {
    return { valid: false, reason: "Base64 \xE7\xF6z\xFClemedi." };
  }
  if (buffer.byteLength === 0) return { valid: false, reason: "Bo\u015F dosya." };
  if (buffer.byteLength > MAX_UPLOAD_BYTES) return { valid: false, reason: `Dosya ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB s\u0131n\u0131r\u0131n\u0131 a\u015F\u0131yor.` };
  const signatures = MAGIC_BYTES[declaredMimeType];
  if (!signatures) return { valid: false, reason: "Desteklenmeyen dosya t\xFCr\xFC." };
  const matchesSignature = signatures.some((signature) => signature.every((byte, index2) => buffer[index2] === byte));
  if (!matchesSignature) return { valid: false, reason: "Dosya i\xE7eri\u011Fi, bildirilen t\xFCrle e\u015Fle\u015Fmiyor (magic bytes do\u011Frulamas\u0131 ba\u015Far\u0131s\u0131z)." };
  if (declaredMimeType === "image/webp") {
    const webpMarker = buffer.subarray(8, 12).toString("ascii");
    if (webpMarker !== "WEBP") return { valid: false, reason: "Ge\xE7erli bir WEBP dosyas\u0131 de\u011Fil." };
  }
  return { valid: true, buffer };
}

// server/routers.ts
import { z as z13 } from "zod";

// server/routers/topics.ts
import { z as z2 } from "zod";
var topicsRouter = router({
  catalog: publicProcedure.query(() => getTopicCatalog()),
  progress: protectedProcedure.query(({ ctx }) => getUserTopicProgress(ctx.user.id)),
  logResult: protectedProcedure.input(
    z2.object({
      exam: z2.enum(["TYT", "AYT"]),
      subject: z2.string().min(1).max(80),
      topic: z2.string().min(1).max(180),
      accuracy: z2.number().min(0).max(100),
      questionCount: z2.number().int().min(0).max(2e3),
      studyDate: z2.string().min(8).max(30)
    })
  ).mutation(({ ctx, input }) => upsertTopicProgress(ctx.user.id, { ...input, studyDate: new Date(input.studyDate) }))
});

// server/routers/resourceCatalog.ts
import { TRPCError as TRPCError3 } from "@trpc/server";
import { z as z4 } from "zod";

// server/resourceCatalog/catalogQueries.ts
import { and as and3, asc, desc as desc3, eq as eq4, inArray, isNull as isNull2, like, sql as sql3 } from "drizzle-orm";
import { drizzle as drizzle2 } from "drizzle-orm/mysql2";
var _db2 = null;
async function getDb2() {
  if (!_db2 && ENV.databaseUrl) {
    try {
      _db2 = drizzle2(ENV.databaseUrl);
    } catch (error) {
      console.warn("[ResourceCatalog] Failed to connect:", error);
      _db2 = null;
    }
  }
  return _db2;
}
var DEFAULT_PAGE_SIZE = 24;
var MAX_PAGE_SIZE = 60;
async function listCatalogBooks(filters, page) {
  const db = await getDb2();
  if (!db) return { items: [], total: 0 };
  const pageSize = Math.max(1, Math.min(page.pageSize || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE));
  const offset = Math.max(0, (page.page - 1) * pageSize);
  const conditions = [eq4(catalogBooks.active, 1)];
  if (filters.exam) conditions.push(eq4(catalogBooks.examScope, filters.exam));
  if (filters.subject) conditions.push(eq4(catalogBooks.subject, filters.subject));
  if (filters.publisherId) conditions.push(eq4(catalogBooks.publisherId, filters.publisherId));
  if (filters.bookType) conditions.push(eq4(catalogBooks.bookType, filters.bookType));
  if (filters.difficulty) conditions.push(eq4(catalogBooks.difficultyLabel, filters.difficulty));
  if (filters.search) conditions.push(like(catalogBooks.name, `%${filters.search}%`));
  let bookIdsForTopic = null;
  if (filters.topic) {
    const topicRows = await db.select({ bookId: bookCurriculumTopics.bookId }).from(bookCurriculumTopics).innerJoin(yksTopics, eq4(bookCurriculumTopics.topicId, yksTopics.id)).where(eq4(yksTopics.topic, filters.topic));
    bookIdsForTopic = topicRows.map((r) => r.bookId);
    if (bookIdsForTopic.length === 0) return { items: [], total: 0 };
    conditions.push(inArray(catalogBooks.id, bookIdsForTopic));
  }
  const where = and3(...conditions);
  const [{ count: count3 }] = await db.select({ count: sql3`count(*)` }).from(catalogBooks).where(where);
  let rows = await db.select().from(catalogBooks).where(where).orderBy(desc3(catalogBooks.createdAt)).limit(pageSize).offset(offset);
  if (filters.minPrice !== void 0 || filters.maxPrice !== void 0) {
    const ids = rows.map((r) => r.id);
    const offerRows2 = ids.length ? await db.select().from(bookOffers).where(inArray(bookOffers.bookId, ids)) : [];
    const bestPriceByBook = /* @__PURE__ */ new Map();
    for (const offer of offerRows2) {
      if (offer.price === null) continue;
      const price = Number(offer.price);
      const current = bestPriceByBook.get(offer.bookId);
      if (current === void 0 || price < current) bestPriceByBook.set(offer.bookId, price);
    }
    rows = rows.filter((row) => {
      const price = bestPriceByBook.get(row.id);
      if (price === void 0) return false;
      if (filters.minPrice !== void 0 && price < filters.minPrice) return false;
      if (filters.maxPrice !== void 0 && price > filters.maxPrice) return false;
      return true;
    });
  }
  const publisherIds = Array.from(new Set(rows.map((r) => r.publisherId).filter((id) => id !== null)));
  const publisherRows = publisherIds.length ? await db.select().from(publishers).where(inArray(publishers.id, publisherIds)) : [];
  const publisherNameById = new Map(publisherRows.map((p) => [p.id, p.name]));
  const bookIds = rows.map((r) => r.id);
  const offerRows = bookIds.length ? await db.select().from(bookOffers).where(inArray(bookOffers.bookId, bookIds)) : [];
  const offerByBook = /* @__PURE__ */ new Map();
  for (const offer of offerRows) {
    if (!offerByBook.has(offer.bookId)) offerByBook.set(offer.bookId, { price: offer.price !== null ? Number(offer.price) : null, productUrl: offer.productUrl });
  }
  const items = rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    publisher: row.publisherId ? publisherNameById.get(row.publisherId) ?? null : null,
    examScope: row.examScope,
    subject: row.subject,
    bookType: row.bookType,
    imageUrl: row.imageUrl,
    difficultyLabel: row.difficultyLabel,
    difficultyScore: row.difficultyScore,
    difficultyConfidence: Number(row.difficultyConfidence),
    price: offerByBook.get(row.id)?.price ?? null,
    productUrl: offerByBook.get(row.id)?.productUrl ?? null
  }));
  return { items, total: Number(count3) };
}
async function getCatalogBookBySlug(slug) {
  const db = await getDb2();
  if (!db) return null;
  const rows = await db.select().from(catalogBooks).where(eq4(catalogBooks.slug, slug)).limit(1);
  const book = rows[0];
  if (!book) return null;
  const [publisherRow, offerRows, topicRows] = await Promise.all([
    book.publisherId ? db.select().from(publishers).where(eq4(publishers.id, book.publisherId)).limit(1) : Promise.resolve([]),
    db.select().from(bookOffers).where(eq4(bookOffers.bookId, book.id)),
    db.select({ topic: yksTopics.topic, subject: yksTopics.subject, confidence: bookCurriculumTopics.confidence, isVerified: bookCurriculumTopics.isVerified }).from(bookCurriculumTopics).innerJoin(yksTopics, eq4(bookCurriculumTopics.topicId, yksTopics.id)).where(eq4(bookCurriculumTopics.bookId, book.id))
  ]);
  return {
    id: book.id,
    name: book.name,
    slug: book.slug,
    description: book.description,
    publisher: publisherRow[0]?.name ?? null,
    examScope: book.examScope,
    subject: book.subject,
    bookType: book.bookType,
    imageUrl: book.imageUrl,
    difficulty: { label: book.difficultyLabel, score: book.difficultyScore, confidence: Number(book.difficultyConfidence) },
    offers: offerRows.map((o) => ({ source: o.source, price: o.price !== null ? Number(o.price) : null, currency: o.currency, stockStatus: o.stockStatus, productUrl: o.productUrl })),
    relatedTopics: topicRows.map((t2) => ({ topic: t2.topic, subject: t2.subject, confidence: Number(t2.confidence), verified: t2.isVerified === 1 }))
  };
}
async function listPublishersForFilter() {
  const db = await getDb2();
  if (!db) return [];
  return db.select({ id: publishers.id, name: publishers.name }).from(publishers).where(eq4(publishers.isActive, 1)).orderBy(asc(publishers.name));
}
async function listCatalogBooksForRecommendation(subject) {
  const db = await getDb2();
  if (!db) return [];
  const conditions = [eq4(catalogBooks.active, 1)];
  if (subject) conditions.push(eq4(catalogBooks.subject, subject));
  const rows = await db.select().from(catalogBooks).where(and3(...conditions));
  const bookIds = rows.map((r) => r.id);
  const topicRows = bookIds.length ? await db.select({ bookId: bookCurriculumTopics.bookId, topic: yksTopics.topic }).from(bookCurriculumTopics).innerJoin(yksTopics, eq4(bookCurriculumTopics.topicId, yksTopics.id)).where(inArray(bookCurriculumTopics.bookId, bookIds)) : [];
  const topicsByBook = /* @__PURE__ */ new Map();
  for (const row of topicRows) {
    const list = topicsByBook.get(row.bookId) ?? [];
    list.push(row.topic);
    topicsByBook.set(row.bookId, list);
  }
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    subject: row.subject,
    examScope: row.examScope,
    bookType: row.bookType,
    difficultyLabel: row.difficultyLabel,
    difficultyScore: row.difficultyScore,
    difficultyConfidence: Number(row.difficultyConfidence),
    active: row.active === 1,
    mappedTopicNames: topicsByBook.get(row.id) ?? []
  }));
}
async function listMyLibraryCatalogBooks(userId) {
  const db = await getDb2();
  if (!db) return [];
  const inventoryRows = await db.select().from(bookInventory).where(and3(eq4(bookInventory.userId, userId), isNull2(bookInventory.removedAt)));
  const numericIds = Array.from(new Set(inventoryRows.map((row) => row.bookId).filter((id) => /^\d+$/.test(id)).map(Number)));
  if (numericIds.length === 0) return [];
  const [books, topicRows] = await Promise.all([
    db.select().from(catalogBooks).where(inArray(catalogBooks.id, numericIds)),
    db.select({ bookId: bookCurriculumTopics.bookId, topicId: yksTopics.id, topic: yksTopics.topic, subject: yksTopics.subject, isVerified: bookCurriculumTopics.isVerified, confidence: bookCurriculumTopics.confidence }).from(bookCurriculumTopics).innerJoin(yksTopics, eq4(bookCurriculumTopics.topicId, yksTopics.id)).where(inArray(bookCurriculumTopics.bookId, numericIds))
  ]);
  const publisherIds = Array.from(new Set(books.map((b) => b.publisherId).filter((id) => id !== null)));
  const publisherRows = publisherIds.length ? await db.select().from(publishers).where(inArray(publishers.id, publisherIds)) : [];
  const publisherNameById = new Map(publisherRows.map((p) => [p.id, p.name]));
  const topicsByBook = /* @__PURE__ */ new Map();
  for (const row of topicRows) {
    const list = topicsByBook.get(row.bookId) ?? [];
    list.push({ topicId: row.topicId, topic: row.topic, subject: row.subject, isVerified: row.isVerified === 1, confidence: Number(row.confidence) });
    topicsByBook.set(row.bookId, list);
  }
  return books.map((book) => ({
    bookId: book.id,
    name: book.name,
    publisher: book.publisherId ? publisherNameById.get(book.publisherId) ?? null : null,
    subject: book.subject,
    examScope: book.examScope,
    difficultyLabel: book.difficultyLabel,
    pageCount: null,
    topics: topicsByBook.get(book.id) ?? []
  }));
}

// server/resourceCatalog/config.ts
var int2 = (value, fallback) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};
var float = (value, fallback) => {
  const parsed = Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) ? parsed : fallback;
};
var bool = (value, fallback) => {
  if (value === void 0) return fallback;
  return value === "1" || value.toLowerCase() === "true";
};
var resourceCatalogConfig = {
  difficulty: {
    // 0-100 score thresholds. Score <= easyMax -> easy, <= mediumMax -> medium, else hard.
    thresholds: {
      easyMax: int2(process.env.RESOURCE_CATALOG_DIFFICULTY_EASY_MAX, 39),
      mediumMax: int2(process.env.RESOURCE_CATALOG_DIFFICULTY_MEDIUM_MAX, 69)
    },
    // Hybrid engine weights. Renormalized at runtime if a layer is unavailable
    // (e.g. no AI signal), so they don't need to sum to 1 here.
    weights: {
      rule: float(process.env.RESOURCE_CATALOG_WEIGHT_RULE, 0.45),
      ai: float(process.env.RESOURCE_CATALOG_WEIGHT_AI, 0.4),
      metadata: float(process.env.RESOURCE_CATALOG_WEIGHT_METADATA, 0.15)
    },
    aiEnabled: bool(process.env.RESOURCE_CATALOG_AI_ENABLED, false),
    // Below this confidence, classification is flagged needsReview = true.
    reviewConfidenceThreshold: float(process.env.RESOURCE_CATALOG_REVIEW_CONFIDENCE_THRESHOLD, 0.55)
  },
  recommendation: {
    weights: {
      difficultyFit: float(process.env.RESOURCE_CATALOG_REC_WEIGHT_DIFFICULTY_FIT, 0.35),
      subjectMatch: float(process.env.RESOURCE_CATALOG_REC_WEIGHT_SUBJECT_MATCH, 0.2),
      examMatch: float(process.env.RESOURCE_CATALOG_REC_WEIGHT_EXAM_MATCH, 0.15),
      topicMatch: float(process.env.RESOURCE_CATALOG_REC_WEIGHT_TOPIC_MATCH, 0.15),
      bookTypeMatch: float(process.env.RESOURCE_CATALOG_REC_WEIGHT_BOOK_TYPE_MATCH, 0.05),
      performanceMatch: float(process.env.RESOURCE_CATALOG_REC_WEIGHT_PERFORMANCE_MATCH, 0.1)
    }
  },
  importer: {
    concurrency: int2(process.env.RESOURCE_CATALOG_IMPORT_CONCURRENCY, 1),
    delayMs: int2(process.env.RESOURCE_CATALOG_IMPORT_DELAY_MS, 800),
    timeoutMs: int2(process.env.RESOURCE_CATALOG_IMPORT_TIMEOUT_MS, 15e3),
    maxRetries: int2(process.env.RESOURCE_CATALOG_IMPORT_MAX_RETRIES, 3),
    maxPages: int2(process.env.RESOURCE_CATALOG_IMPORT_MAX_PAGES, 50),
    maxProducts: int2(process.env.RESOURCE_CATALOG_IMPORT_MAX_PRODUCTS, 5e3)
  },
  // In-process background sync (spec: kaynak kataloğu kitapisler.com'dan
  // sürekli güncellenen bir yapı olmalı) — periodically re-runs the same
  // KitapIslerSource pipeline the CLI uses, so the catalog stays fresh
  // without a human running `pnpm resource-catalog` by hand. Off by default
  // under `NODE_ENV=test` so the test suite never makes network calls.
  scheduler: {
    enabled: bool(process.env.RESOURCE_CATALOG_SCHEDULER_ENABLED, process.env.NODE_ENV !== "test"),
    intervalMs: int2(process.env.RESOURCE_CATALOG_SCHEDULER_INTERVAL_MS, 6 * 60 * 60 * 1e3),
    initialDelayMs: int2(process.env.RESOURCE_CATALOG_SCHEDULER_INITIAL_DELAY_MS, 3e4),
    limitPerRun: int2(process.env.RESOURCE_CATALOG_SCHEDULER_LIMIT_PER_RUN, 300)
  }
};

// server/resourceCatalog/normalizers/turkishText.ts
var turkishLowerCase = (value) => value.replace(/İ/g, "i").replace(/I/g, "\u0131").toLowerCase();
var DIACRITIC_MAP = {
  \u00E7: "c",
  \u011F: "g",
  \u0131: "i",
  \u00F6: "o",
  \u015F: "s",
  \u00FC: "u"
};
var foldTurkishDiacritics = (value) => value.replace(/[çğıöşü]/g, (char) => DIACRITIC_MAP[char] ?? char);
var normalizeForComparison = (value) => foldTurkishDiacritics(turkishLowerCase(value)).replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
var ALLOWED_LETTER_CLASS = "a-z\xE7\u011F\u0131\xF6\u015F\xFC\xE2\xEE\xFB";
var normalizeKeepingTurkish = (value) => turkishLowerCase(value).replace(/['’‘"“”]/g, "").replace(new RegExp(`[^${ALLOWED_LETTER_CLASS}0-9\\s]`, "g"), " ").replace(/\s+/g, " ").trim();
var slugify2 = (value) => {
  const folded = normalizeForComparison(value);
  return folded.replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
};
var tokenize = (value) => normalizeKeepingTurkish(value).split(" ").filter(Boolean);

// server/resourceCatalog/recommendationService.ts
var DIFFICULTY_RANK = { easy: 0, medium: 1, hard: 2 };
var DIFFICULTY_FIT_BY_STATUS = {
  "Zay\u0131f": [1, 0.6, 0.15],
  "Orta": [0.55, 1, 0.45],
  "\u0130yi": [0.25, 0.65, 1]
};
var LEARNING_TYPES = ["topic_explanation", "topic_explanation_question_bank", "fasikul"];
var PRACTICE_TYPES = ["question_bank", "test_book"];
var EXAM_STAGE_TYPES = ["mock_exam", "past_questions", "camp"];
var bookTypeFitByStatus = (status, bookType) => {
  if (status === "Zay\u0131f") return LEARNING_TYPES.includes(bookType) ? 1 : PRACTICE_TYPES.includes(bookType) ? 0.5 : 0.2;
  if (status === "Orta") return PRACTICE_TYPES.includes(bookType) ? 1 : LEARNING_TYPES.includes(bookType) ? 0.6 : 0.4;
  return EXAM_STAGE_TYPES.includes(bookType) ? 1 : PRACTICE_TYPES.includes(bookType) ? 0.8 : 0.3;
};
var examScopeCovers = (examScope, exam) => examScope === "TYT_AYT" || examScope === "YKS" || examScope === "GENEL" || examScope === exam;
var idealDifficultyScore = (accuracy) => Math.max(0, Math.min(100, accuracy + 15));
var labelFor = (bookDifficulty, status) => {
  const idealRank = DIFFICULTY_FIT_BY_STATUS[status].indexOf(Math.max(...DIFFICULTY_FIT_BY_STATUS[status]));
  const bookRank = DIFFICULTY_RANK[bookDifficulty];
  if (bookRank === idealRank) return "Seviyene uygun";
  if (bookRank === idealRank + 1) return "Bir sonraki seviyeye ge\xE7i\u015F";
  if (bookRank > idealRank + 1) return "\u0130leri seviye";
  return "Temel tekrar kayna\u011F\u0131";
};
function recommendBooksForTopic(topicPerf, books, config = resourceCatalogConfig) {
  const weights = config.recommendation.weights;
  const topicSubjectKey = normalizeForComparison(topicPerf.subject);
  const topicKey = normalizeForComparison(topicPerf.topic);
  const ideal = idealDifficultyScore(topicPerf.accuracy);
  return books.filter((book) => book.active).map((book) => {
    const difficultyFit = DIFFICULTY_FIT_BY_STATUS[topicPerf.status][DIFFICULTY_RANK[book.difficultyLabel]];
    const subjectMatch = book.subject === null ? 0.4 : normalizeForComparison(book.subject) === topicSubjectKey ? 1 : 0;
    const examMatch = examScopeCovers(book.examScope, topicPerf.exam) ? 1 : 0;
    const mappedTopics = (book.mappedTopicNames ?? []).map(normalizeForComparison);
    const topicMatch = mappedTopics.includes(topicKey) ? 1 : subjectMatch === 1 ? 0.3 : 0;
    const bookTypeMatch = bookTypeFitByStatus(topicPerf.status, book.bookType);
    const performanceMatch = 1 - Math.abs(book.difficultyScore - ideal) / 100;
    const rawScore = difficultyFit * weights.difficultyFit + subjectMatch * weights.subjectMatch + examMatch * weights.examMatch + topicMatch * weights.topicMatch + bookTypeMatch * weights.bookTypeMatch + performanceMatch * weights.performanceMatch;
    const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
    const normalizedScore = totalWeight > 0 ? rawScore / totalWeight : 0;
    const confidenceDamped = normalizedScore * (0.5 + 0.5 * book.difficultyConfidence);
    const score = Math.round(Math.max(0, Math.min(1, confidenceDamped)) * 100);
    const lowConfidenceNote = book.difficultyConfidence < config.difficulty.reviewConfidenceThreshold ? " (zorluk otomatik tahmin, d\xFC\u015F\xFCk g\xFCven)" : "";
    const reason = `Mevcut performans\u0131na (%${Math.round(topicPerf.accuracy)} do\u011Fruluk, ${topicPerf.status}) ve se\xE7ti\u011Fin konuya (${topicPerf.topic}) g\xF6re.${lowConfidenceNote}`;
    return {
      bookId: book.id,
      score,
      label: labelFor(book.difficultyLabel, topicPerf.status),
      reason,
      signals: { difficultyFit, subjectMatch, examMatch, topicMatch, bookTypeMatch, performanceMatch }
    };
  }).filter((rec) => rec.signals.subjectMatch > 0).sort((a, b) => b.score - a.score);
}
var STATUS_PRIORITY = { "Zay\u0131f": 0, "Orta": 1, "\u0130yi": 2 };
function recommendForStudent(topics, books, options = {}, config = resourceCatalogConfig) {
  const limitPerTopic = options.limitPerTopic ?? 3;
  const overallLimit = options.overallLimit ?? 12;
  const sortedTopics = [...topics].sort((a, b) => STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status]);
  const results = [];
  for (const topic of sortedTopics) {
    const perTopic = recommendBooksForTopic(topic, books, config).slice(0, limitPerTopic);
    for (const rec of perTopic) {
      results.push({ ...rec, subject: topic.subject, topic: topic.topic, exam: topic.exam, status: topic.status });
    }
    if (results.length >= overallLimit) break;
  }
  return results.slice(0, overallLimit);
}

// server/routers/resourceCatalogAdmin.ts
import { z as z3 } from "zod";

// server/resourceCatalog/catalogDb.ts
import { and as and4, eq as eq5, inArray as inArray2 } from "drizzle-orm";
import { drizzle as drizzle3 } from "drizzle-orm/mysql2";
var _db3 = null;
async function getDb3() {
  if (!_db3 && ENV.databaseUrl) {
    try {
      _db3 = drizzle3(ENV.databaseUrl);
    } catch (error) {
      console.warn("[ResourceCatalog] Failed to connect:", error);
      _db3 = null;
    }
  }
  return _db3;
}
var toCatalogBookRow = (row) => ({
  id: row.id,
  isbn: row.isbn,
  publisherId: row.publisherId,
  name: row.name,
  editionYear: row.editionYear,
  slug: row.slug,
  bookType: row.bookType,
  examScope: row.examScope,
  subject: row.subject,
  imageUrl: row.imageUrl,
  description: row.description,
  active: row.active === 1,
  manualOverride: row.manualOverride === 1,
  difficultyLabel: row.difficultyLabel,
  difficultyScore: row.difficultyScore,
  difficultyConfidence: Number(row.difficultyConfidence),
  classificationMethod: row.classificationMethod
});
var catalogDb = {
  async findPublisherByNormalizedName(normalizedName) {
    const db = await getDb3();
    if (!db) return null;
    const rows = await db.select().from(publishers).where(eq5(publishers.normalizedName, normalizedName)).limit(1);
    return rows[0] ? { id: rows[0].id, name: rows[0].name, slug: rows[0].slug, normalizedName: rows[0].normalizedName } : null;
  },
  async createPublisher(input) {
    const db = await getDb3();
    if (!db) throw new Error("Database not available");
    const result = await db.insert(publishers).values(input);
    const id = Number(result[0].insertId);
    return { id, ...input };
  },
  async findExternalSource(source, sourceProductId) {
    const db = await getDb3();
    if (!db) return null;
    const rows = await db.select().from(externalBookSources).where(and4(eq5(externalBookSources.source, source), eq5(externalBookSources.sourceProductId, sourceProductId))).limit(1);
    return rows[0] ? { id: rows[0].id, source: rows[0].source, sourceProductId: rows[0].sourceProductId, matchedBookId: rows[0].matchedBookId, syncStatus: rows[0].syncStatus } : null;
  },
  async upsertExternalSource(row) {
    const db = await getDb3();
    if (!db) throw new Error("Database not available");
    const existing = await db.select().from(externalBookSources).where(and4(eq5(externalBookSources.source, row.source), eq5(externalBookSources.sourceProductId, row.sourceProductId))).limit(1);
    const values = {
      source: row.source,
      sourceProductId: row.sourceProductId,
      sourceUrl: row.sourceUrl,
      rawName: row.rawName,
      rawDescription: row.rawDescription,
      rawPrice: row.rawPrice !== null ? String(row.rawPrice) : null,
      rawCurrency: row.rawCurrency,
      rawImageUrl: row.rawImageUrl,
      rawPublisher: row.rawPublisher,
      rawCategory: row.rawCategory,
      rawIsbn: row.rawIsbn,
      rawMetadata: row.rawMetadata ? JSON.stringify(row.rawMetadata) : null
    };
    if (existing[0]) {
      await db.update(externalBookSources).set(values).where(eq5(externalBookSources.id, existing[0].id));
      return { id: existing[0].id, source: row.source, sourceProductId: row.sourceProductId, matchedBookId: existing[0].matchedBookId, syncStatus: existing[0].syncStatus };
    }
    const result = await db.insert(externalBookSources).values(values);
    const id = Number(result[0].insertId);
    return { id, source: row.source, sourceProductId: row.sourceProductId, matchedBookId: null, syncStatus: "pending" };
  },
  async markExternalSourceOutcome(id, patch) {
    const db = await getDb3();
    if (!db) return;
    await db.update(externalBookSources).set({ matchedBookId: patch.matchedBookId, syncStatus: patch.syncStatus, lastSyncedAt: /* @__PURE__ */ new Date(), errorMessage: patch.errorMessage ?? null }).where(eq5(externalBookSources.id, id));
  },
  async findCatalogBookByIsbn(isbn) {
    const db = await getDb3();
    if (!db) return null;
    const rows = await db.select().from(catalogBooks).where(eq5(catalogBooks.isbn, isbn)).limit(1);
    return rows[0] ? toCatalogBookRow(rows[0]) : null;
  },
  async listCatalogBooksByPublisher(publisherId) {
    const db = await getDb3();
    if (!db) return [];
    const rows = await db.select().from(catalogBooks).where(eq5(catalogBooks.publisherId, publisherId));
    return rows.map((row) => ({ id: row.id, isbn: row.isbn, publisherId: row.publisherId, name: row.name, editionYear: row.editionYear }));
  },
  async getCatalogBookById(id) {
    const db = await getDb3();
    if (!db) return null;
    const rows = await db.select().from(catalogBooks).where(eq5(catalogBooks.id, id)).limit(1);
    return rows[0] ? toCatalogBookRow(rows[0]) : null;
  },
  async createCatalogBook(input) {
    const db = await getDb3();
    if (!db) throw new Error("Database not available");
    const result = await db.insert(catalogBooks).values({
      publisherId: input.publisherId,
      name: input.name,
      slug: input.slug,
      isbn: input.isbn,
      editionYear: input.editionYear,
      description: input.description,
      imageUrl: input.imageUrl,
      bookType: input.bookType,
      examScope: input.examScope,
      subject: input.subject,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null
    });
    const id = Number(result[0].insertId);
    const row = await this.getCatalogBookById(id);
    if (!row) throw new Error("Failed to read back created catalog book");
    return row;
  },
  async updateCatalogBook(id, patch) {
    const db = await getDb3();
    if (!db) throw new Error("Database not available");
    const values = {};
    if (patch.publisherId !== void 0) values.publisherId = patch.publisherId;
    if (patch.name !== void 0) values.name = patch.name;
    if (patch.isbn !== void 0) values.isbn = patch.isbn;
    if (patch.editionYear !== void 0) values.editionYear = patch.editionYear;
    if (patch.description !== void 0) values.description = patch.description;
    if (patch.imageUrl !== void 0) values.imageUrl = patch.imageUrl;
    if (patch.bookType !== void 0) values.bookType = patch.bookType;
    if (patch.examScope !== void 0) values.examScope = patch.examScope;
    if (patch.subject !== void 0) values.subject = patch.subject;
    if (patch.metadata !== void 0) values.metadata = patch.metadata ? JSON.stringify(patch.metadata) : null;
    if (Object.keys(values).length > 0) {
      await db.update(catalogBooks).set(values).where(eq5(catalogBooks.id, id));
    }
    const row = await this.getCatalogBookById(id);
    if (!row) throw new Error(`Catalog book ${id} not found after update`);
    return row;
  },
  async updateCatalogBookDifficulty(id, patch) {
    const db = await getDb3();
    if (!db) return;
    await db.update(catalogBooks).set({
      difficultyScore: patch.difficultyScore,
      difficultyLabel: patch.difficultyLabel,
      difficultyConfidence: String(patch.difficultyConfidence),
      classificationMethod: patch.classificationMethod,
      needsReview: patch.needsReview ? 1 : 0,
      classifiedAt: patch.classifiedAt
    }).where(eq5(catalogBooks.id, id));
  },
  async upsertBookOffer(input) {
    const db = await getDb3();
    if (!db) return;
    const existing = await db.select().from(bookOffers).where(and4(eq5(bookOffers.bookId, input.bookId), eq5(bookOffers.source, input.source))).limit(1);
    const values = { price: input.price !== null ? String(input.price) : null, currency: input.currency, productUrl: input.productUrl, lastSyncedAt: /* @__PURE__ */ new Date() };
    if (existing[0]) {
      await db.update(bookOffers).set(values).where(eq5(bookOffers.id, existing[0].id));
    } else {
      await db.insert(bookOffers).values({ bookId: input.bookId, source: input.source, ...values });
    }
  },
  async listCurriculumTopics() {
    const db = await getDb3();
    if (!db) return [];
    const rows = await db.select().from(yksTopics);
    return rows.map((row) => ({ id: row.id, exam: row.exam, subject: row.subject, topic: row.topic, unit: row.unit }));
  },
  async upsertBookCurriculumMapping(input) {
    const db = await getDb3();
    if (!db) return;
    const existing = await db.select().from(bookCurriculumTopics).where(and4(eq5(bookCurriculumTopics.bookId, input.bookId), eq5(bookCurriculumTopics.topicId, input.topicId))).limit(1);
    if (existing[0]) {
      if (existing[0].isVerified === 1) return;
      await db.update(bookCurriculumTopics).set({ confidence: String(input.confidence), mappingMethod: "rule" }).where(eq5(bookCurriculumTopics.id, existing[0].id));
    } else {
      await db.insert(bookCurriculumTopics).values({ bookId: input.bookId, topicId: input.topicId, confidence: String(input.confidence), mappingMethod: "rule" });
    }
  },
  async createSyncLog(input) {
    const db = await getDb3();
    if (!db) return { id: -1 };
    const result = await db.insert(resourceCatalogSyncLogs).values({ source: input.source, startedAt: input.startedAt, dryRun: input.dryRun ? 1 : 0, triggeredBy: input.triggeredBy });
    return { id: Number(result[0].insertId) };
  },
  async finishSyncLog(id, patch) {
    if (id < 0) return;
    const db = await getDb3();
    if (!db) return;
    await db.update(resourceCatalogSyncLogs).set({
      finishedAt: patch.finishedAt,
      fetched: patch.fetched,
      created: patch.created,
      updated: patch.updated,
      skipped: patch.skipped,
      failed: patch.failed,
      needsReview: patch.needsReview,
      statsJson: patch.statsJson,
      errorLog: patch.errorLog
    }).where(eq5(resourceCatalogSyncLogs.id, id));
  }
};
async function listResourceCatalogSyncLogs(limit = 20) {
  const db = await getDb3();
  if (!db) return [];
  return db.select().from(resourceCatalogSyncLogs).orderBy(resourceCatalogSyncLogs.id).limit(limit);
}
async function listNeedsReviewBooks() {
  const db = await getDb3();
  if (!db) return [];
  return db.select().from(catalogBooks).where(eq5(catalogBooks.needsReview, 1));
}
async function setManualDifficulty(bookId, input) {
  const db = await getDb3();
  if (!db) throw new Error("Database not available");
  await db.update(catalogBooks).set({ difficultyLabel: input.label, difficultyScore: input.score, difficultyConfidence: "1", classificationMethod: "manual", manualOverride: 1, needsReview: 0, classifiedAt: /* @__PURE__ */ new Date() }).where(eq5(catalogBooks.id, bookId));
}
async function approveCatalogBookClassification(bookId) {
  const db = await getDb3();
  if (!db) throw new Error("Database not available");
  await db.update(catalogBooks).set({ needsReview: 0 }).where(eq5(catalogBooks.id, bookId));
}
async function markCatalogBookNeedsReview(bookId, needsReview) {
  const db = await getDb3();
  if (!db) throw new Error("Database not available");
  await db.update(catalogBooks).set({ needsReview: needsReview ? 1 : 0 }).where(eq5(catalogBooks.id, bookId));
}

// server/routers/resourceCatalogAdmin.ts
var resourceCatalogAdminRouter = router({
  needsReview: adminProcedure.query(() => listNeedsReviewBooks()),
  syncLogs: adminProcedure.input(z3.object({ limit: z3.number().int().min(1).max(100).default(20) }).optional()).query(({ input }) => listResourceCatalogSyncLogs(input?.limit ?? 20)),
  approve: adminProcedure.input(z3.object({ bookId: z3.number().int() })).mutation(({ input }) => approveCatalogBookClassification(input.bookId)),
  setDifficulty: adminProcedure.input(z3.object({ bookId: z3.number().int(), label: z3.enum(["easy", "medium", "hard"]), score: z3.number().int().min(0).max(100) })).mutation(({ input }) => setManualDifficulty(input.bookId, { label: input.label, score: input.score })),
  markNeedsReview: adminProcedure.input(z3.object({ bookId: z3.number().int(), needsReview: z3.boolean() })).mutation(({ input }) => markCatalogBookNeedsReview(input.bookId, input.needsReview))
});

// server/routers/resourceCatalog.ts
var bookTypeEnum = z4.enum(["question_bank", "topic_explanation", "topic_explanation_question_bank", "mock_exam", "fasikul", "past_questions", "camp", "test_book", "reference", "other"]);
var examScopeEnum = z4.enum(["TYT", "AYT", "TYT_AYT", "YKS", "GENEL"]);
var difficultyEnum = z4.enum(["easy", "medium", "hard"]);
var listInput = z4.object({
  page: z4.number().int().min(1).default(1),
  pageSize: z4.number().int().min(1).max(60).default(24),
  exam: examScopeEnum.optional(),
  subject: z4.string().max(80).optional(),
  publisherId: z4.number().int().optional(),
  bookType: bookTypeEnum.optional(),
  difficulty: difficultyEnum.optional(),
  minPrice: z4.number().min(0).optional(),
  maxPrice: z4.number().min(0).optional(),
  search: z4.string().max(120).optional(),
  topic: z4.string().max(180).optional()
});
var resourceCatalogRouter = router({
  list: publicProcedure.input(listInput).query(async ({ input }) => {
    const { page, pageSize, ...filters } = input;
    const { items, total } = await listCatalogBooks(filters, { page, pageSize });
    return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }),
  get: publicProcedure.input(z4.object({ slug: z4.string().min(1).max(320) })).query(async ({ input }) => {
    const book = await getCatalogBookBySlug(input.slug);
    if (!book) throw new TRPCError3({ code: "NOT_FOUND", message: "Kaynak bulunamad\u0131" });
    return book;
  }),
  publishers: publicProcedure.query(() => listPublishersForFilter()),
  /** "Seviyene Uygun Kaynaklar" — deterministic, explainable per-topic
   * recommendations built from the student's own topic progress (spec §21/§34). */
  recommendations: protectedProcedure.input(z4.object({ subject: z4.string().max(80).optional(), limit: z4.number().int().min(1).max(30).default(12) })).query(async ({ ctx, input }) => {
    const progress = await getUserTopicProgress(ctx.user.id);
    const allTopics = progress.map((p) => ({ subject: p.subject, topic: p.topic, exam: p.exam, accuracy: p.progress, status: p.status }));
    const topics = input.subject ? allTopics.filter((t2) => t2.subject === input.subject) : allTopics;
    const books = await listCatalogBooksForRecommendation(input.subject);
    const recommendations = recommendForStudent(topics, books, { overallLimit: input.limit });
    const bookById = new Map(books.map((b) => [b.id, b]));
    return recommendations.map((rec) => ({ ...rec, book: bookById.get(rec.bookId) ?? null }));
  }),
  /** Kütüphanem — kataloğdan "kütüphaneme ekle" dediğim kitapların, gerçek
   * müfredat konu bağlantılarıyla birlikte listesi. Takvim sekmesi bunu
   * kullanarak "bu kitaptan oturum oluştur" akışında ders/konuyu otomatik doldurur. */
  myLibrary: protectedProcedure.query(({ ctx }) => listMyLibraryCatalogBooks(ctx.user.id)),
  admin: resourceCatalogAdminRouter
});

// server/routers/onboarding.ts
import { TRPCError as TRPCError4 } from "@trpc/server";
import { z as z5 } from "zod";

// shared/onboarding.ts
var GRADE_LEVELS = ["9", "10", "11", "12", "mezun"];
var TARGET_SCORE_TYPES = ["SAY", "EA", "SOZ", "DIL", "TYT", "belirsiz"];
var MOCK_EXAM_FREQUENCIES = ["haftada_birkac", "haftada_bir", "ayda_birkac", "nadiren", "henuz_cozmedim"];
var STUDY_DAYS = ["Pazartesi", "Sal\u0131", "\xC7ar\u015Famba", "Per\u015Fembe", "Cuma", "Cumartesi", "Pazar"];
var STUDY_TIMES = ["sabah", "oglen", "aksam", "gece"];
var STUDY_METHODS = ["konu_anlatimi", "soru_cozumu", "deneme", "tekrar", "karisik"];
var COACHING_EXPECTATIONS = ["gunluk_plan", "haftalik_plan", "konu_takibi", "deneme_analizi", "motivasyon", "eksik_konu_tespiti", "hepsi"];
var NOTIFICATION_PREFERENCES = ["gunluk", "haftalik", "onemli_anlarda", "kapali"];
var COACHING_STYLES = ["destekleyici", "disiplinli", "kisa_net", "detayli", "dengeli"];
var ONBOARDING_STEP_META = [
  { step: 0, key: "identity", title: "Seni tan\u0131yal\u0131m", eyebrow: "1. Ad\u0131m \xB7 Tan\u0131\u015Fal\u0131m" },
  { step: 1, key: "academic", title: "Akademik durumun", eyebrow: "2. Ad\u0131m \xB7 Ko\xE7luk bilgisi" },
  { step: 2, key: "goals", title: "Hedeflerin", eyebrow: "3. Ad\u0131m \xB7 Ko\xE7luk bilgisi" },
  { step: 3, key: "routine", title: "\xC7al\u0131\u015Fma d\xFCzenin", eyebrow: "4. Ad\u0131m \xB7 Ko\xE7luk bilgisi" },
  { step: 4, key: "coaching", title: "Ko\xE7luk tercihlerin", eyebrow: "5. Ad\u0131m \xB7 Ko\xE7luk bilgisi" }
];
var TOTAL_ONBOARDING_STEPS = ONBOARDING_STEP_META.length;
var emptyOnboardingDraft = () => ({
  preferredName: "",
  gradeLevel: "",
  examYear: "",
  targetScoreType: "",
  currentTytNet: "",
  currentAytNet: "",
  mockExamFrequency: "",
  strongSubjects: [],
  weakSubjects: [],
  hasPriorStudyPlan: "",
  targetUniversity: "",
  targetDepartment: "",
  targetRanking: "",
  mainGoal: "",
  shortTermGoal: "",
  longTermGoal: "",
  dailyStudyDuration: "",
  preferredStudyStartTime: "",
  availableStudyDays: [],
  preferredStudyTimes: [],
  preferredStudyMethods: [],
  studyObstacles: "",
  coachingExpectations: [],
  notificationPreference: "",
  coachingStyle: "",
  additionalNotes: ""
});
var currentYear = (/* @__PURE__ */ new Date()).getFullYear();
function validateOnboardingStep(step, draft) {
  const errors = {};
  if (step === 0) {
    if (!draft.preferredName.trim()) errors.preferredName = "Sana nas\u0131l hitap edelim, yazar m\u0131s\u0131n?";
    if (!draft.gradeLevel) errors.gradeLevel = "S\u0131n\u0131f d\xFCzeyini se\xE7.";
    if (!draft.examYear.trim()) errors.examYear = "Hedef s\u0131nav y\u0131l\u0131n\u0131 gir.";
    else {
      const year = Number(draft.examYear);
      if (!Number.isInteger(year) || year < currentYear || year > currentYear + 6) {
        errors.examYear = `${currentYear} ile ${currentYear + 6} aras\u0131nda bir y\u0131l gir.`;
      }
    }
    if (!draft.targetScoreType) errors.targetScoreType = "Hedef puan t\xFCr\xFCn\xFC se\xE7.";
  }
  if (step === 1) {
  }
  if (step === 2) {
  }
  if (step === 3) {
    if (draft.dailyStudyDuration.trim()) {
      const minutes = Number(draft.dailyStudyDuration);
      if (!Number.isFinite(minutes) || minutes < 0 || minutes > 960) {
        errors.dailyStudyDuration = "0-960 dakika aras\u0131nda bir s\xFCre gir (iste\u011Fe ba\u011Fl\u0131).";
      }
    }
    if (draft.preferredStudyStartTime.trim() && !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.preferredStudyStartTime.trim())) {
      errors.preferredStudyStartTime = "Saat SS:DD bi\xE7iminde olmal\u0131 (iste\u011Fe ba\u011Fl\u0131).";
    }
  }
  if (step === 4) {
  }
  return errors;
}

// server/routers/onboarding.ts
var enumOrBlank = (values) => z5.union([z5.enum(values), z5.literal("")]);
var draftSchema = z5.object({
  preferredName: z5.string().trim().max(120).optional(),
  gradeLevel: enumOrBlank(GRADE_LEVELS).optional(),
  examYear: z5.string().max(4).optional(),
  targetScoreType: enumOrBlank(TARGET_SCORE_TYPES).optional(),
  currentTytNet: z5.string().trim().max(40).optional(),
  currentAytNet: z5.string().trim().max(40).optional(),
  mockExamFrequency: enumOrBlank(MOCK_EXAM_FREQUENCIES).optional(),
  strongSubjects: z5.array(z5.string().max(40)).max(15).optional(),
  weakSubjects: z5.array(z5.string().max(40)).max(15).optional(),
  hasPriorStudyPlan: enumOrBlank(["yes", "no"]).optional(),
  targetUniversity: z5.string().trim().max(180).optional(),
  targetDepartment: z5.string().trim().max(180).optional(),
  targetRanking: z5.string().trim().max(60).optional(),
  mainGoal: z5.string().trim().max(500).optional(),
  shortTermGoal: z5.string().trim().max(500).optional(),
  longTermGoal: z5.string().trim().max(500).optional(),
  dailyStudyDuration: z5.string().max(6).optional(),
  preferredStudyStartTime: z5.string().max(5).optional(),
  availableStudyDays: z5.array(z5.enum(STUDY_DAYS)).max(7).optional(),
  preferredStudyTimes: z5.array(z5.enum(STUDY_TIMES)).max(4).optional(),
  preferredStudyMethods: z5.array(z5.enum(STUDY_METHODS)).max(5).optional(),
  studyObstacles: z5.string().trim().max(500).optional(),
  coachingExpectations: z5.array(z5.enum(COACHING_EXPECTATIONS)).max(7).optional(),
  notificationPreference: enumOrBlank(NOTIFICATION_PREFERENCES).optional(),
  coachingStyle: enumOrBlank(COACHING_STYLES).optional(),
  additionalNotes: z5.string().trim().max(1e3).optional()
});
var saveStepInput = z5.object({
  step: z5.number().int().min(0).max(TOTAL_ONBOARDING_STEPS - 1),
  data: draftSchema,
  complete: z5.boolean().optional()
});
function draftToPatch(data) {
  const patch = {};
  if (data.preferredName !== void 0) patch.preferredName = data.preferredName || null;
  if (data.gradeLevel !== void 0) patch.gradeLevel = data.gradeLevel || null;
  if (data.examYear !== void 0) patch.examYear = data.examYear ? Number(data.examYear) : null;
  if (data.targetScoreType !== void 0) patch.targetScoreType = data.targetScoreType || null;
  if (data.currentTytNet !== void 0) patch.currentTytNet = data.currentTytNet || null;
  if (data.currentAytNet !== void 0) patch.currentAytNet = data.currentAytNet || null;
  if (data.mockExamFrequency !== void 0) patch.mockExamFrequency = data.mockExamFrequency || null;
  if (data.strongSubjects !== void 0) patch.strongSubjects = data.strongSubjects;
  if (data.weakSubjects !== void 0) patch.weakSubjects = data.weakSubjects;
  if (data.hasPriorStudyPlan !== void 0) patch.hasPriorStudyPlan = data.hasPriorStudyPlan === "yes" ? true : data.hasPriorStudyPlan === "no" ? false : null;
  if (data.targetUniversity !== void 0) patch.targetUniversity = data.targetUniversity || null;
  if (data.targetDepartment !== void 0) patch.targetDepartment = data.targetDepartment || null;
  if (data.targetRanking !== void 0) patch.targetRanking = data.targetRanking || null;
  if (data.mainGoal !== void 0) patch.mainGoal = data.mainGoal || null;
  if (data.shortTermGoal !== void 0) patch.shortTermGoal = data.shortTermGoal || null;
  if (data.longTermGoal !== void 0) patch.longTermGoal = data.longTermGoal || null;
  if (data.dailyStudyDuration !== void 0) patch.dailyStudyDuration = data.dailyStudyDuration ? Number(data.dailyStudyDuration) : null;
  if (data.preferredStudyStartTime !== void 0) patch.preferredStudyStartTime = data.preferredStudyStartTime || null;
  if (data.availableStudyDays !== void 0) patch.availableStudyDays = data.availableStudyDays;
  if (data.preferredStudyTimes !== void 0) patch.preferredStudyTimes = data.preferredStudyTimes;
  if (data.preferredStudyMethods !== void 0) patch.preferredStudyMethods = data.preferredStudyMethods;
  if (data.studyObstacles !== void 0) patch.studyObstacles = data.studyObstacles || null;
  if (data.coachingExpectations !== void 0) patch.coachingExpectations = data.coachingExpectations;
  if (data.notificationPreference !== void 0) patch.notificationPreference = data.notificationPreference || null;
  if (data.coachingStyle !== void 0) patch.coachingStyle = data.coachingStyle || null;
  if (data.additionalNotes !== void 0) patch.additionalNotes = data.additionalNotes || null;
  return patch;
}
var onboardingRouter = router({
  get: protectedProcedure.query(({ ctx }) => getStudentProfile(ctx.user.id)),
  saveStep: protectedProcedure.input(saveStepInput).mutation(async ({ ctx, input }) => {
    const draftForValidation = { ...emptyOnboardingDraft(), ...input.data };
    const errors = validateOnboardingStep(input.step, draftForValidation);
    if (Object.keys(errors).length > 0) {
      throw new TRPCError4({ code: "BAD_REQUEST", message: Object.values(errors)[0] });
    }
    await upsertStudentProfileStep(ctx.user.id, input.step, draftToPatch(input.data));
    if (input.complete) await completeOnboarding(ctx.user.id);
    return getStudentProfile(ctx.user.id);
  }),
  complete: protectedProcedure.mutation(({ ctx }) => completeOnboarding(ctx.user.id))
});

// server/routers/subscription.ts
import { z as z6 } from "zod";
var subscriptionRouter = router({
  getPlans: publicProcedure.query(() => listActivePlans()),
  // Client'ın useEntitlement() hook'unun okuduğu tek snapshot (spec §8).
  getCurrent: protectedProcedure.query(({ ctx }) => getEntitlements(ctx.user.id)),
  getEntitlements: protectedProcedure.query(({ ctx }) => getEntitlements(ctx.user.id)),
  cancel: protectedProcedure.input(z6.object({ immediate: z6.boolean().optional() })).mutation(async ({ ctx, input }) => {
    const current = await getCurrentSubscription(ctx.user.id);
    const nextStatus = input.immediate ? "canceled" : current.status;
    if (input.immediate) assertValidSubscriptionTransition(current.status, "canceled");
    await updateSubscription(ctx.user.id, { status: nextStatus, cancelAtPeriodEnd: input.immediate ? 0 : 1, canceledAt: /* @__PURE__ */ new Date() });
    await writeAuditLog({ userId: ctx.user.id, action: "user_canceled", oldState: { status: current.status }, newState: { status: nextStatus, cancelAtPeriodEnd: !input.immediate } });
    return getEntitlements(ctx.user.id);
  }),
  resume: protectedProcedure.mutation(async ({ ctx }) => {
    const current = await getCurrentSubscription(ctx.user.id);
    if (!current.cancelAtPeriodEnd && current.status !== "canceled") return getEntitlements(ctx.user.id);
    assertValidSubscriptionTransition(current.status, "active");
    await updateSubscription(ctx.user.id, { status: "active", cancelAtPeriodEnd: 0, canceledAt: null });
    await writeAuditLog({ userId: ctx.user.id, action: "user_resumed", oldState: { status: current.status }, newState: { status: "active" } });
    return getEntitlements(ctx.user.id);
  }),
  restore: protectedProcedure.input(z6.object({ providerToken: z6.string().min(1) })).mutation(async ({ ctx, input }) => {
    const provider = paymentProviderFactory();
    const result = await provider.restorePurchase({ userId: ctx.user.id, providerToken: input.providerToken });
    if (!result.valid) throw new Error(result.reason ?? "Sat\u0131n alma do\u011Frulanamad\u0131");
    await writeAuditLog({ userId: ctx.user.id, action: "purchase_restored", newState: { providerSubscriptionId: result.providerSubscriptionId } });
    return getEntitlements(ctx.user.id);
  })
});

// server/routers/payment.ts
import { z as z7 } from "zod";
var paymentRouter = router({
  createCheckout: protectedProcedure.input(z7.object({ planCode: z7.string().min(1), successUrl: z7.string().url(), cancelUrl: z7.string().url() })).mutation(async ({ ctx, input }) => {
    const plan = await getPlanByCode(input.planCode);
    if (!plan || !plan.isActive) throw new Error("Ge\xE7ersiz veya pasif plan.");
    const provider = paymentProviderFactory();
    return provider.createCheckout({ userId: ctx.user.id, planCode: input.planCode, successUrl: input.successUrl, cancelUrl: input.cancelUrl });
  }),
  getHistory: protectedProcedure.query(({ ctx }) => listPaymentsForUser(ctx.user.id)),
  /**
   * SANDBOX-ONLY yardımcı uç nokta (spec §53: gerçek provider credential'ı
   * yokken "FAKE PAYMENT SUCCESS" davranışı UYGULANMAYACAK). Bu, gerçek bir
   * ödemeyi "başarılı" gibi göstermiyor — tam tersine, gerçek bir
   * sağlayıcının normalde webhook ile tetikleyeceği AYNI
   * `processWebhookEvent` yolunu, yalnızca `PAYMENT_PROVIDER=mock`
   * olduğunda ve yalnızca ÇAĞIRAN KULLANICININ KENDİ hesabı için tetikler —
   * Paywall'ı uçtan uca test edebilmek için var, production'da
   * `PAYMENT_PROVIDER` gerçek bir sağlayıcıya çevrildiğinde bu uç nokta
   * otomatik olarak devre dışı kalır.
   */
  completeMockCheckout: protectedProcedure.input(z7.object({ planCode: z7.string().min(1) })).mutation(async ({ ctx, input }) => {
    if (ENV.paymentProvider !== "mock") {
      throw new Error("Bu u\xE7 nokta yaln\u0131zca PAYMENT_PROVIDER=mock iken kullan\u0131labilir.");
    }
    const plan = await getPlanByCode(input.planCode);
    if (!plan || !plan.isActive) throw new Error("Ge\xE7ersiz veya pasif plan.");
    const result = await processWebhookEvent({
      provider: "mock",
      eventId: `mock_manual_${ctx.user.id}_${Date.now()}`,
      eventType: "checkout.completed",
      payload: { userId: ctx.user.id, planCode: input.planCode },
      rawPayloadForAudit: { userId: ctx.user.id, planCode: input.planCode, source: "completeMockCheckout" }
    });
    if (result.status === "failed") throw new Error(result.reason ?? "Sandbox \xF6demesi i\u015Flenemedi.");
    return result;
  })
});

// server/admin/analyticsService.ts
import { and as and5, count, eq as eq6, gte as gte4, isNotNull, lt as lt2, sql as sql4 } from "drizzle-orm";
async function getAdminDashboardKpis() {
  const db = await getDb();
  const empty = {
    totalUsers: 0,
    pendingApproval: 0,
    activeAccounts: 0,
    suspendedAccounts: 0,
    freeUsers: 0,
    trialUsers: 0,
    premiumUsers: 0,
    monthlySubscribers: 0,
    yearlySubscribers: 0,
    pastDue: 0,
    gracePeriod: 0,
    expiredSubscriptions: 0,
    canceledSubscriptions: 0,
    activeToday: 0,
    activeThisWeek: 0,
    inactive7Plus: 0,
    inactive30Plus: 0,
    trialConversion: { started: 0, stillTrialing: 0, converted: 0, conversionRate: null }
  };
  if (!db) return empty;
  const todayStart = /* @__PURE__ */ new Date();
  todayStart.setHours(0, 0, 0, 0);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3);
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1e3);
  const [approvalCounts, accountStatusCounts, planStatusCounts, activeTodayRow, activeWeekRow, inactive7Row, inactive30Row, totalRow, trialStartedRow, stillTrialingRow, convertedRow] = await Promise.all([
    db.select({ approvalStatus: users.approvalStatus, total: count() }).from(users).groupBy(users.approvalStatus),
    db.select({ accountStatus: users.accountStatus, total: count() }).from(users).groupBy(users.accountStatus),
    db.select({ tier: subscriptionPlans.tier, billingPeriod: subscriptionPlans.billingPeriod, status: subscriptions.status, total: count() }).from(subscriptions).innerJoin(subscriptionPlans, eq6(subscriptionPlans.id, subscriptions.planId)).groupBy(subscriptionPlans.tier, subscriptionPlans.billingPeriod, subscriptions.status),
    db.select({ total: count() }).from(users).where(gte4(users.lastSignedIn, todayStart)),
    db.select({ total: count() }).from(users).where(gte4(users.lastSignedIn, weekAgo)),
    db.select({ total: count() }).from(users).where(lt2(users.lastSignedIn, weekAgo)),
    db.select({ total: count() }).from(users).where(lt2(users.lastSignedIn, monthAgo)),
    db.select({ total: count() }).from(users),
    db.select({ total: count() }).from(subscriptions).where(isNotNull(subscriptions.trialStartedAt)),
    db.select({ total: count() }).from(subscriptions).where(eq6(subscriptions.status, "trialing")),
    db.select({ total: count() }).from(subscriptions).where(and5(isNotNull(subscriptions.trialStartedAt), sql4`${subscriptions.status} in ('active','past_due','grace_period')`))
  ]);
  const kpis = { ...empty, totalUsers: totalRow[0]?.total ?? 0, activeToday: activeTodayRow[0]?.total ?? 0, activeThisWeek: activeWeekRow[0]?.total ?? 0, inactive7Plus: inactive7Row[0]?.total ?? 0, inactive30Plus: inactive30Row[0]?.total ?? 0 };
  for (const row of approvalCounts) {
    if (row.approvalStatus === "pending") kpis.pendingApproval = row.total;
  }
  for (const row of accountStatusCounts) {
    if (row.accountStatus === "active") kpis.activeAccounts = row.total;
    if (row.accountStatus === "suspended") kpis.suspendedAccounts = row.total;
  }
  for (const row of planStatusCounts) {
    if (row.tier === "free") kpis.freeUsers += row.total;
    if (row.status === "trialing") kpis.trialUsers += row.total;
    if (row.tier !== "free" && (row.status === "active" || row.status === "trialing" || row.status === "grace_period")) kpis.premiumUsers += row.total;
    if (row.tier !== "free" && row.billingPeriod === "monthly") kpis.monthlySubscribers += row.total;
    if (row.tier !== "free" && row.billingPeriod === "yearly") kpis.yearlySubscribers += row.total;
    if (row.status === "past_due") kpis.pastDue += row.total;
    if (row.status === "grace_period") kpis.gracePeriod += row.total;
    if (row.status === "expired") kpis.expiredSubscriptions += row.total;
    if (row.status === "canceled") kpis.canceledSubscriptions += row.total;
  }
  const started = trialStartedRow[0]?.total ?? 0;
  const stillTrialing = stillTrialingRow[0]?.total ?? 0;
  const converted = convertedRow[0]?.total ?? 0;
  const ended = started - stillTrialing;
  kpis.trialConversion = { started, stillTrialing, converted, conversionRate: ended > 0 ? Math.round(converted / ended * 100) : null };
  return kpis;
}

// server/routers/admin/analytics.ts
var adminAnalyticsRouter = router({
  overview: adminProcedure.query(() => getAdminDashboardKpis())
});

// server/routers/admin/audit.ts
import { z as z8 } from "zod";
var adminAuditRouter = router({
  list: adminProcedure.input(z8.object({ userId: z8.number().int().optional(), limit: z8.number().int().min(1).max(500).default(100) })).query(({ input }) => input.userId ? listAuditLogsForUser(input.userId) : listAllAuditLogs(input.limit))
});

// server/routers/admin/payments.ts
import { z as z9 } from "zod";
var maskId = (value) => !value ? value : value.length <= 8 ? `${value.slice(0, 2)}\u2022\u2022\u2022\u2022` : `${value.slice(0, 4)}\u2022\u2022\u2022\u2022${value.slice(-4)}`;
var adminPaymentsRouter = router({
  // Kart numarası/CVV gibi bir alan şemada zaten hiç yok (spec §27/§37 — "ASLA saklanmamalı"); providerPaymentId yine de maskelenir.
  list: adminProcedure.input(z9.object({ limit: z9.number().int().min(1).max(500).default(100) })).query(async ({ input }) => {
    const rows = await listAllPaymentsForAdmin(input.limit);
    return rows.map((row) => ({ ...row, providerPaymentId: maskId(row.providerPaymentId) }));
  })
});

// server/routers/admin/subscriptions.ts
import { z as z10 } from "zod";
var adminSubscriptionsRouter = router({
  list: adminProcedure.query(() => listAllSubscriptionsForAdmin()),
  get: adminProcedure.input(z10.object({ userId: z10.number().int() })).query(async ({ input }) => {
    const [subscription, payments2, auditLogs] = await Promise.all([getSubscriptionByUserId(input.userId), listPaymentsForUser(input.userId), listAuditLogsForUser(input.userId)]);
    return { subscription, payments: payments2, auditLogs };
  }),
  /**
   * Elle erişim verme — spec §24/§9/§28/§29: "Manual entitlement ile
   * provider subscription birbirinden ayrı tutulmalı". `isManualOverride=1`
   * ile işaretlenir, `provider`/`providerSubscriptionId` alanları BOŞ
   * bırakılır (gerçek bir satın alma değil) — admin bunu geri aldığında
   * (revoke) hiçbir gerçek sağlayıcı çağrısı tetiklenmez, çünkü zaten hiç
   * yoktu. (Not: ayrı bir `manual_entitlements` tablosu yerine mevcut
   * `subscriptions.isManualOverride` bayrağı kullanıldı — spec §58 "mevcut
   * schema'yı yeniden tasarlama, duplicate logic oluşturma" ile tutarlı;
   * bkz. docs/admin/ADMIN-COMMAND-CENTER.md "Known limitations".)
   */
  grant: adminProcedure.input(z10.object({ userId: z10.number().int(), planCode: z10.string().min(1), days: z10.number().int().min(1).max(3650), reason: z10.string().max(500).optional() })).mutation(async ({ ctx, input }) => {
    const plan = await getPlanByCode(input.planCode);
    if (!plan) throw new Error(`Plan bulunamad\u0131: ${input.planCode}`);
    const existing = await getSubscriptionByUserId(input.userId);
    const now = /* @__PURE__ */ new Date();
    const periodEnd = new Date(now.getTime() + input.days * 24 * 60 * 60 * 1e3);
    if (existing) assertValidSubscriptionTransition(existing.status, "active");
    await updateSubscription(input.userId, { planId: plan.id, status: "active", currentPeriodStart: now, currentPeriodEnd: periodEnd, cancelAtPeriodEnd: 0, canceledAt: null, isManualOverride: 1, provider: null, providerSubscriptionId: null, providerCustomerId: null });
    await writeAuditLog({ userId: input.userId, adminId: ctx.user.id, action: "manual_grant", oldState: existing ? { status: existing.status } : null, newState: { status: "active", planCode: plan.code, until: periodEnd.toISOString() }, reason: input.reason });
    return getSubscriptionByUserId(input.userId);
  }),
  revoke: adminProcedure.input(z10.object({ userId: z10.number().int(), reason: z10.string().max(500).optional() })).mutation(async ({ ctx, input }) => {
    const existing = await getSubscriptionByUserId(input.userId);
    if (!existing) throw new Error("Abonelik bulunamad\u0131");
    const freePlan = await getPlanByCode("FREE");
    if (!freePlan) throw new Error("FREE plan\u0131 bulunamad\u0131");
    assertValidSubscriptionTransition(existing.status, "canceled");
    await updateSubscription(input.userId, { planId: freePlan.id, status: "canceled", cancelAtPeriodEnd: 0, canceledAt: /* @__PURE__ */ new Date(), isManualOverride: 0 });
    await writeAuditLog({ userId: input.userId, adminId: ctx.user.id, action: "manual_revoke", oldState: { status: existing.status }, newState: { status: "canceled", planCode: "FREE" }, reason: input.reason });
    return getSubscriptionByUserId(input.userId);
  }),
  cancel: adminProcedure.input(z10.object({ userId: z10.number().int(), reason: z10.string().max(500).optional() })).mutation(async ({ ctx, input }) => {
    const existing = await getSubscriptionByUserId(input.userId);
    if (!existing) throw new Error("Abonelik bulunamad\u0131");
    assertValidSubscriptionTransition(existing.status, "canceled");
    await updateSubscription(input.userId, { status: "canceled", canceledAt: /* @__PURE__ */ new Date(), cancelAtPeriodEnd: 0 });
    await writeAuditLog({ userId: input.userId, adminId: ctx.user.id, action: "admin_canceled", oldState: { status: existing.status }, newState: { status: "canceled" }, reason: input.reason });
    return getSubscriptionByUserId(input.userId);
  }),
  resume: adminProcedure.input(z10.object({ userId: z10.number().int() })).mutation(async ({ ctx, input }) => {
    const existing = await getSubscriptionByUserId(input.userId);
    if (!existing) throw new Error("Abonelik bulunamad\u0131");
    assertValidSubscriptionTransition(existing.status, "active");
    await updateSubscription(input.userId, { status: "active", cancelAtPeriodEnd: 0, canceledAt: null });
    await writeAuditLog({ userId: input.userId, adminId: ctx.user.id, action: "admin_resumed", oldState: { status: existing.status }, newState: { status: "active" } });
    return getSubscriptionByUserId(input.userId);
  })
});

// server/routers/admin/usage.ts
import { z as z11 } from "zod";
var adminUsageRouter = router({
  get: adminProcedure.input(z11.object({ userId: z11.number().int() })).query(({ input }) => getUsageSummaryForUser(input.userId)),
  reset: adminProcedure.input(z11.object({ userId: z11.number().int(), featureKey: z11.enum(FEATURE_KEYS) })).mutation(({ ctx, input }) => {
    const limit = FEATURE_USAGE_LIMITS[input.featureKey] ?? FREE_TIER_LIMITS[input.featureKey];
    const windowDays = limit?.windowDays ?? 30;
    return resetFeatureUsage(input.userId, input.featureKey, windowDays, ctx.user.id);
  })
});

// server/routers/admin/users.ts
import { z as z12 } from "zod";

// server/admin/adminUserDb.ts
import { and as and7, count as count2, desc as desc4, eq as eq8, gte as gte6, inArray as inArray3, like as like2, lt as lt3, or, sql as sql5 } from "drizzle-orm";

// server/admin/progressService.ts
import { and as and6, eq as eq7, gte as gte5 } from "drizzle-orm";

// shared/progressScore.ts
var PROGRESS_SCORE_CONFIG = {
  weights: { studyConsistency: 0.25, questionPerformance: 0.25, topicProgress: 0.2, mockExam: 0.2, planAdherence: 0.1 },
  // Her alt skorun "yeterli veri" sayılması için asgari örneklem — eşiğin
  // altında sahte/erken bir sayı üretmek yerine "Not enough data" dönülür.
  minAccountAgeDaysForConsistency: 3,
  minQuestionsForPerformance: MIN_RELIABLE_QUESTION_COUNT,
  // shared/topicStatus.ts ile aynı eşik — tek kaynak
  minTopicsForTopicProgress: 3,
  minExamsForMockExamScore: 1,
  minPlannedSessionsForAdherence: 2
  // shared/planAdherence.ts'in kendi "veri_topla" eşiğiyle aynı
};
var cap2 = (value) => Math.max(0, Math.min(100, Math.round(value)));
function calculateProgressScore(inputs, config = PROGRESS_SCORE_CONFIG) {
  const components = {
    studyConsistency: inputs.accountAgeDays < config.minAccountAgeDaysForConsistency ? { score: null, insufficientData: true, label: "\xC7al\u0131\u015Fma D\xFCzeni" } : { score: cap2(inputs.activeDaysInWindow / Math.max(1, inputs.windowDays) * 100), insufficientData: false, label: "\xC7al\u0131\u015Fma D\xFCzeni" },
    questionPerformance: inputs.totalQuestions < config.minQuestionsForPerformance ? { score: null, insufficientData: true, label: "Soru Performans\u0131" } : { score: cap2(inputs.correctQuestions / inputs.totalQuestions * 100), insufficientData: false, label: "Soru Performans\u0131" },
    topicProgress: inputs.studiedTopicCount < config.minTopicsForTopicProgress ? { score: null, insufficientData: true, label: "Konu \u0130lerlemesi" } : { score: cap2(inputs.topicCoveragePercent), insufficientData: false, label: "Konu \u0130lerlemesi" },
    mockExam: inputs.examCount < config.minExamsForMockExamScore || inputs.averageExamNet === null ? { score: null, insufficientData: true, label: "Deneme Performans\u0131" } : { score: cap2(inputs.averageExamNet / Math.max(1, inputs.referenceNetCeiling) * 100), insufficientData: false, label: "Deneme Performans\u0131" },
    planAdherence: inputs.plannedSessionsCount < config.minPlannedSessionsForAdherence || inputs.planAdherenceScore === null ? { score: null, insufficientData: true, label: "Plan Uyumu" } : { score: cap2(inputs.planAdherenceScore), insufficientData: false, label: "Plan Uyumu" }
  };
  const available = Object.keys(components).filter((key) => components[key].score !== null);
  if (available.length === 0) return { overallScore: null, insufficientData: true, components };
  const totalWeight = available.reduce((sum, key) => sum + config.weights[key], 0);
  const weightedSum = available.reduce((sum, key) => sum + components[key].score * config.weights[key], 0);
  const overallScore = totalWeight > 0 ? cap2(weightedSum / totalWeight) : null;
  return { overallScore, insufficientData: overallScore === null, components };
}

// server/admin/progressService.ts
var CONSISTENCY_WINDOW_DAYS = 7;
var ADHERENCE_WINDOW_DAYS = 30;
async function getStudyProgressScore(userId) {
  const db = await getDb();
  const generatedAt = (/* @__PURE__ */ new Date()).toISOString();
  if (!db) return { overallScore: null, insufficientData: true, components: emptyComponents(), generatedAt };
  const [userRow] = await db.select({ createdAt: users.createdAt }).from(users).where(eq7(users.id, userId)).limit(1);
  const accountAgeDays = userRow ? Math.max(0, Math.floor((Date.now() - userRow.createdAt.getTime()) / 864e5)) : 0;
  const windowStart = new Date(Date.now() - CONSISTENCY_WINDOW_DAYS * 864e5);
  const [recentLogs, allLogs, topicRows, examRows] = await Promise.all([
    db.select({ studyDate: topicStudyLogs.studyDate }).from(topicStudyLogs).where(and6(eq7(topicStudyLogs.userId, userId), gte5(topicStudyLogs.studyDate, windowStart))),
    db.select({ questions: topicStudyLogs.questions, correct: topicStudyLogs.correct }).from(topicStudyLogs).where(eq7(topicStudyLogs.userId, userId)),
    db.select({ progress: topicProgress.progress }).from(topicProgress).where(eq7(topicProgress.userId, userId)),
    db.select({ net: userMockExams.net }).from(userMockExams).where(eq7(userMockExams.userId, userId))
  ]);
  const activeDaysInWindow = new Set(recentLogs.map((row) => row.studyDate.toISOString().slice(0, 10))).size;
  const totalQuestions = allLogs.reduce((sum, row) => sum + row.questions, 0);
  const correctQuestions = allLogs.reduce((sum, row) => sum + row.correct, 0);
  const studiedTopicCount = topicRows.length;
  const topicCoveragePercent = topicRows.length ? Math.round(topicRows.reduce((sum, row) => sum + row.progress, 0) / topicRows.length) : 0;
  const examCount = examRows.length;
  const averageExamNet = examCount ? examRows.reduce((sum, row) => sum + Number(row.net), 0) / examCount : null;
  const periodEnd = /* @__PURE__ */ new Date();
  const periodStart = new Date(periodEnd.getTime() - ADHERENCE_WINDOW_DAYS * 864e5);
  const { sessions, averageAccuracy } = await getPlanAdherenceInputs(userId, periodStart, periodEnd);
  const adherence = calculatePlanAdherence(sessions, averageAccuracy);
  const result = calculateProgressScore({
    accountAgeDays,
    activeDaysInWindow,
    windowDays: CONSISTENCY_WINDOW_DAYS,
    totalQuestions,
    correctQuestions,
    topicCoveragePercent,
    studiedTopicCount,
    examCount,
    averageExamNet,
    referenceNetCeiling: targetNet,
    planAdherenceScore: adherence.plannedSessions > 0 ? adherence.overallScore : null,
    plannedSessionsCount: adherence.plannedSessions
  });
  return { ...result, generatedAt };
}
function emptyComponents() {
  const insufficient = { score: null, insufficientData: true };
  return {
    studyConsistency: { ...insufficient, label: "\xC7al\u0131\u015Fma D\xFCzeni" },
    questionPerformance: { ...insufficient, label: "Soru Performans\u0131" },
    topicProgress: { ...insufficient, label: "Konu \u0130lerlemesi" },
    mockExam: { ...insufficient, label: "Deneme Performans\u0131" },
    planAdherence: { ...insufficient, label: "Plan Uyumu" }
  };
}

// server/admin/adminUserDb.ts
async function listUsersForAdminPaginated(filters) {
  const db = await getDb();
  const page = Math.max(1, filters.page);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize));
  if (!db) return { rows: [], total: 0, page, pageSize };
  const conditions = [];
  if (filters.search?.trim()) {
    const term = `%${filters.search.trim().replace(/[%_]/g, (char) => `\\${char}`)}%`;
    conditions.push(or(like2(users.name, term), like2(users.email, term)));
  }
  if (filters.approvalStatus) conditions.push(eq8(users.approvalStatus, filters.approvalStatus));
  if (filters.accountStatus) conditions.push(eq8(users.accountStatus, filters.accountStatus));
  if (filters.planCode) conditions.push(eq8(subscriptionPlans.code, filters.planCode));
  if (filters.subscriptionStatus) conditions.push(eq8(subscriptions.status, filters.subscriptionStatus));
  if (filters.activity === "today") conditions.push(gte6(users.lastSignedIn, startOfToday()));
  else if (filters.activity === "week") conditions.push(gte6(users.lastSignedIn, daysAgo(7)));
  else if (filters.activity === "inactive") conditions.push(lt3(users.lastSignedIn, daysAgo(7)));
  const whereClause = conditions.length ? and7(...conditions) : void 0;
  const countQuery = db.select({ total: count2() }).from(users).leftJoin(subscriptions, eq8(subscriptions.userId, users.id)).leftJoin(subscriptionPlans, eq8(subscriptionPlans.id, subscriptions.planId));
  const [{ total }] = await (whereClause ? countQuery.where(whereClause) : countQuery);
  const pageQuery = db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    approvalStatus: users.approvalStatus,
    accountStatus: users.accountStatus,
    createdAt: users.createdAt,
    lastSignedIn: users.lastSignedIn,
    planCode: subscriptionPlans.code,
    planName: subscriptionPlans.name,
    subscriptionStatus: subscriptions.status,
    trialEndsAt: subscriptions.trialEndsAt,
    currentPeriodEnd: subscriptions.currentPeriodEnd
  }).from(users).leftJoin(subscriptions, eq8(subscriptions.userId, users.id)).leftJoin(subscriptionPlans, eq8(subscriptionPlans.id, subscriptions.planId)).orderBy(desc4(users.createdAt)).limit(pageSize).offset((page - 1) * pageSize);
  const pageRows = await (whereClause ? pageQuery.where(whereClause) : pageQuery);
  const ids = pageRows.map((row) => row.id);
  const [topicAgg, examAgg, studyAgg] = ids.length ? await Promise.all([
    db.select({ userId: topicProgress.userId, avgProgress: sql5`avg(${topicProgress.progress})`, topicCount: sql5`count(*)` }).from(topicProgress).where(inArray3(topicProgress.userId, ids)).groupBy(topicProgress.userId),
    db.select({ userId: userMockExams.userId, examCount: sql5`count(*)`, latestNet: sql5`max(${userMockExams.net})` }).from(userMockExams).where(inArray3(userMockExams.userId, ids)).groupBy(userMockExams.userId),
    db.select({ userId: topicStudyLogs.userId, totalMinutes: sql5`sum(${topicStudyLogs.minutes})` }).from(topicStudyLogs).where(inArray3(topicStudyLogs.userId, ids)).groupBy(topicStudyLogs.userId)
  ]) : [[], [], []];
  const topicMap = new Map(topicAgg.map((row) => [row.userId, row]));
  const examMap = new Map(examAgg.map((row) => [row.userId, row]));
  const studyMap = new Map(studyAgg.map((row) => [row.userId, row]));
  const rows = pageRows.map((row) => {
    const topic = topicMap.get(row.id);
    const exam = examMap.get(row.id);
    const study = studyMap.get(row.id);
    return {
      ...row,
      planCode: row.planCode ?? "FREE",
      planName: row.planName ?? "\xDCcretsiz",
      subscriptionStatus: row.subscriptionStatus ?? "active",
      topicCoveragePercent: topic ? Math.round(Number(topic.avgProgress)) : 0,
      studiedTopicCount: topic?.topicCount ?? 0,
      examCount: exam?.examCount ?? 0,
      latestExamNet: exam?.latestNet != null ? Number(exam.latestNet) : null,
      totalStudyMinutes: study ? Number(study.totalMinutes) : 0
    };
  });
  return { rows, total, page, pageSize };
}
var startOfToday = () => {
  const date = /* @__PURE__ */ new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};
var daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1e3);
async function suspendUser(userId, adminId, reason) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ accountStatus: "suspended" }).where(eq8(users.id, userId));
  await writeAuditLog({ userId, adminId, action: "user_suspended", newState: { accountStatus: "suspended" }, reason });
}
async function reactivateUser(userId, adminId) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ accountStatus: "active" }).where(eq8(users.id, userId));
  await writeAuditLog({ userId, adminId, action: "user_reactivated", newState: { accountStatus: "active" } });
}
function maskId2(value) {
  if (!value) return value;
  if (value.length <= 8) return `${value.slice(0, 2)}\u2022\u2022\u2022\u2022`;
  return `${value.slice(0, 4)}\u2022\u2022\u2022\u2022${value.slice(-4)}`;
}
async function getUserDetailForAdmin(userId) {
  const db = await getDb();
  if (!db) return null;
  const [userRow] = await db.select().from(users).where(eq8(users.id, userId)).limit(1);
  if (!userRow) return null;
  const [entitlements, usage, progressScore, payments2, recentExams, topicRows, recentStudyLogs, auditLogs] = await Promise.all([
    getEntitlements(userId),
    getUsageSummaryForUser(userId),
    getStudyProgressScore(userId),
    listPaymentsForUser(userId),
    db.select().from(userMockExams).where(eq8(userMockExams.userId, userId)).orderBy(desc4(userMockExams.examDate)).limit(10),
    db.select().from(topicProgress).where(eq8(topicProgress.userId, userId)),
    db.select().from(topicStudyLogs).where(eq8(topicStudyLogs.userId, userId)).orderBy(desc4(topicStudyLogs.studyDate)).limit(20),
    listAuditLogsForUser(userId)
  ]);
  const [subscriptionRow] = await db.select().from(subscriptions).where(eq8(subscriptions.userId, userId)).limit(1);
  const plan = subscriptionRow ? await getPlanById(subscriptionRow.planId) : null;
  const { passwordHash: _passwordHash, ...safeUser } = userRow;
  return {
    user: safeUser,
    subscription: subscriptionRow ? { ...subscriptionRow, providerSubscriptionId: maskId2(subscriptionRow.providerSubscriptionId), providerCustomerId: maskId2(subscriptionRow.providerCustomerId), planCode: plan?.code ?? "FREE", planName: plan?.name ?? "\xDCcretsiz", planTier: plan?.tier ?? "free" } : null,
    entitlements,
    usage,
    progressScore,
    payments: payments2.map((payment) => ({ ...payment, providerPaymentId: maskId2(payment.providerPaymentId), providerTransactionId: maskId2(payment.providerTransactionId), metadata: void 0 })),
    recentExams: recentExams.map((exam) => ({ id: exam.id, title: exam.title, exam: exam.exam, examDate: exam.examDate, net: Number(exam.net) })),
    topicProgress: topicRows,
    recentStudyLogs,
    auditLogs
  };
}

// server/routers/admin/users.ts
var adminUsersRouter = router({
  list: adminProcedure.input(
    z12.object({
      search: z12.string().max(120).optional(),
      approvalStatus: z12.enum(["pending", "approved", "rejected"]).optional(),
      accountStatus: z12.enum(["active", "suspended", "deleted"]).optional(),
      planCode: z12.string().max(40).optional(),
      subscriptionStatus: z12.string().max(40).optional(),
      activity: z12.enum(["today", "week", "inactive"]).optional(),
      page: z12.number().int().min(1).default(1),
      pageSize: z12.number().int().min(1).max(100).default(20)
    })
  ).query(({ input }) => listUsersForAdminPaginated(input)),
  get: adminProcedure.input(z12.object({ userId: z12.number().int() })).query(({ input }) => getUserDetailForAdmin(input.userId)),
  listPending: adminProcedure.query(() => listPendingUsers()),
  approve: adminProcedure.input(z12.object({ userId: z12.number().int() })).mutation(({ ctx, input }) => approveUser(input.userId, ctx.user.id)),
  reject: adminProcedure.input(z12.object({ userId: z12.number().int(), reason: z12.string().max(300).optional() })).mutation(({ ctx, input }) => rejectUser(input.userId, ctx.user.id, input.reason)),
  // Hesap yaşam döngüsü — subscription iptaliyle KARIŞTIRILMAZ (spec §5/§23): bir kullanıcı aboneliğini iptal edince hesabı askıya alınmaz.
  suspend: adminProcedure.input(z12.object({ userId: z12.number().int(), reason: z12.string().max(300).optional() })).mutation(({ ctx, input }) => suspendUser(input.userId, ctx.user.id, input.reason)),
  reactivate: adminProcedure.input(z12.object({ userId: z12.number().int() })).mutation(({ ctx, input }) => reactivateUser(input.userId, ctx.user.id))
});

// server/routers/admin/index.ts
var adminRouter = router({
  users: adminUsersRouter,
  subscriptions: adminSubscriptionsRouter,
  usage: adminUsageRouter,
  analytics: adminAnalyticsRouter,
  audit: adminAuditRouter,
  payments: adminPaymentsRouter
});

// server/routers.ts
var planInput = z13.object({
  topics: z13.array(z13.object({
    topic: z13.string(),
    subject: z13.string(),
    exam: z13.enum(["TYT", "AYT"]),
    progress: z13.number(),
    status: z13.enum(["Zay\u0131f", "Orta", "\u0130yi"])
  })).max(50),
  exams: z13.array(z13.object({
    title: z13.string(),
    date: z13.string(),
    net: z13.number(),
    subjects: z13.record(z13.string(), z13.number()),
    topicDetails: z13.array(z13.object({
      subject: z13.string(),
      topic: z13.string(),
      questionCount: z13.number(),
      correct: z13.number(),
      wrong: z13.number(),
      blank: z13.number(),
      accuracy: z13.number(),
      net: z13.number()
    })).optional()
  })).max(10),
  books: z13.array(z13.object({
    id: z13.string(),
    title: z13.string(),
    subject: z13.string(),
    exam: z13.enum(["TYT", "AYT"]),
    level: z13.enum(["Kolay", "Orta", "Zor"]),
    pageCount: z13.number().optional(),
    totalQuestions: z13.number().optional(),
    accuracy: z13.number().optional(),
    activeDays: z13.number().optional(),
    mappings: z13.array(z13.object({ topic: z13.string(), pageStart: z13.number().optional(), pageEnd: z13.number().optional(), testStart: z13.number().optional(), testEnd: z13.number().optional() })).max(50).optional()
  })).max(30).default([]),
  availableMinutes: z13.number().min(120).max(2400).default(600),
  goal: z13.string().max(120).default("YKS 2027"),
  // Onboarding'den gelen koçluk bağlamı — tamamen isteğe bağlı, eski
  // istemciler (veya onboarding'i henüz tamamlamamış kullanıcılar) bu alanı
  // hiç göndermeyebilir.
  studentProfile: z13.object({
    // Hedef bilgileri — onboarding'in "Kullanıcı tanımlama" ve "Hedefler"
    // adımlarından. AI planı önceliklendirirken (örn. hedef net/sıralamaya
    // göre tempo) ve dilini kişiselleştirirken kullanır.
    targetScoreType: z13.string().max(20).optional(),
    examYear: z13.number().int().optional(),
    targetUniversity: z13.string().max(180).optional(),
    targetDepartment: z13.string().max(180).optional(),
    targetRanking: z13.string().max(60).optional(),
    dailyStudyDuration: z13.number().int().min(0).max(960).optional(),
    preferredStudyMethods: z13.array(z13.string().max(40)).max(5).optional(),
    studyObstacles: z13.string().max(500).optional(),
    coachingStyle: z13.string().max(40).optional(),
    mainGoal: z13.string().max(500).optional()
  }).optional()
});
var documentExtractionInput = z13.object({
  dataUrl: z13.string().min(20).max(12e6),
  mimeType: z13.enum(["application/pdf", "image/png", "image/jpeg", "image/webp"]),
  fileName: z13.string().max(180).optional()
});
var userExamInput = z13.object({
  title: z13.string().min(1).max(180),
  exam: z13.enum(["TYT", "AYT"]),
  date: z13.string().min(8).max(30),
  net: z13.number().min(-100).max(200),
  delta: z13.number().min(-200).max(200),
  subjects: z13.record(z13.string(), z13.number().min(-50).max(100)),
  timeSpent: z13.record(z13.string(), z13.number().int().min(0).max(1e3)),
  topicNets: z13.record(z13.string(), z13.number().min(-50).max(100)),
  topicDetails: z13.array(z13.object({ subject: z13.string(), topic: z13.string(), questionCount: z13.number().int().min(0), correct: z13.number().int().min(0), wrong: z13.number().int().min(0), blank: z13.number().int().min(0), accuracy: z13.number().min(0).max(100), net: z13.number().min(-50).max(100) })).max(300),
  importedFrom: z13.enum(["manual", "ocr", "pdf", "csv", "xlsx"]),
  notes: z13.string().max(5e3).optional()
});
var documentExtractionSchema = {
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
          subject: { type: "string" },
          topic: { type: "string" },
          questionCount: { type: "integer" },
          correct: { type: "integer" },
          wrong: { type: "integer" },
          blank: { type: "integer" },
          accuracy: { type: "number" },
          net: { type: "number" }
        },
        required: ["subject", "topic", "questionCount", "correct", "wrong", "blank", "accuracy", "net"],
        additionalProperties: false
      }
    },
    notes: { type: "string" }
  },
  required: ["title", "date", "exam", "subjects", "timeSpent", "topics", "notes"],
  additionalProperties: false
};
var fallbackPlan = {
  summary: "Bu hafta \xF6nce zay\u0131f konular\u0131 k\xFC\xE7\xFClt\xFCyor, sonra deneme analizleriyle netlerini sabitliyoruz.",
  focus: [
    { topic: "Problemler", subject: "Matematik", reason: "Zay\u0131f konu ve son denemede geli\u015Fim alan\u0131." },
    { topic: "Paragrafta anlam", subject: "T\xFCrk\xE7e", reason: "G\xFCnl\xFCk k\u0131sa tekrarlarla h\u0131z kazan\u0131labilir." }
  ],
  days: [
    { day: "Pazartesi", date: "", totalMinutes: 90, sessions: [{ title: "Temel kavram tekrar", subject: "Matematik", topic: "Problemler", minutes: 35, kind: "\xD6\u011Frenme", rationale: "Zay\u0131f konunun temel ad\u0131mlar\u0131n\u0131 netle\u015Ftir." }, { title: "Yeni nesil soru seti", subject: "Matematik", topic: "Problemler", minutes: 40, kind: "Soru", rationale: "\xD6\u011Frenmeyi 20 soruyla peki\u015Ftir." }, { title: "Hata notu", subject: "Matematik", topic: "Problemler", minutes: 15, kind: "Tekrar", rationale: "Yanl\u0131\u015Flar\u0131n nedenini tek c\xFCmlede yaz." }] },
    { day: "Sal\u0131", date: "", totalMinutes: 75, sessions: [{ title: "Paragraf h\u0131z turu", subject: "T\xFCrk\xE7e", topic: "Paragrafta anlam", minutes: 35, kind: "Soru", rationale: "S\xFCre tutarak 20 soru \xE7\xF6z." }, { title: "Yanl\u0131\u015F analizi", subject: "T\xFCrk\xE7e", topic: "Paragrafta anlam", minutes: 20, kind: "Tekrar", rationale: "\xC7eldirici t\xFCrlerini ay\u0131r." }, { title: "K\u0131sa tekrar", subject: "Matematik", topic: "Problemler", minutes: 20, kind: "Tekrar", rationale: "D\xFCnk\xFC hata notuna d\xF6n." }] }
  ],
  coachNote: "Her oturumun sonunda yanl\u0131\u015F nedenini yaz; sadece do\u011Fru say\u0131s\u0131n\u0131 de\u011Fil, d\xFC\u015F\xFCnme bi\xE7imini de geli\u015Ftir."
};
var appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    // `passwordHash` (only ever set on local dev accounts, see
    // server/_core/devAuth.ts) must never reach the client — strip it here
    // rather than relying on every future caller of ctx.user to remember to.
    me: publicProcedure.query((opts) => {
      if (!opts.ctx.user) return null;
      const { passwordHash: _passwordHash, ...safeUser } = opts.ctx.user;
      return safeUser;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true
      };
    })
  }),
  resources: router({
    snapshot: protectedProcedure.query(async ({ ctx }) => {
      const [inventory, logs, mappings, switches, customBooks] = await Promise.all([
        getBookInventory(ctx.user.id),
        getBookStudyLogs(ctx.user.id),
        getBookTopicMappings(ctx.user.id),
        getSourceSwitches(ctx.user.id),
        getUserResourceBooks(ctx.user.id)
      ]);
      return { inventory, logs, mappings, switches, customBooks };
    }),
    addBook: protectedProcedure.input(z13.object({ bookId: z13.string().max(120) })).mutation(({ ctx, input }) => addBookToInventory(ctx.user.id, input.bookId)),
    removeBook: protectedProcedure.input(z13.object({ bookId: z13.string().max(120) })).mutation(({ ctx, input }) => removeBookFromInventory(ctx.user.id, input.bookId)),
    addLog: protectedProcedure.input(z13.object({ bookId: z13.string().max(120), topic: z13.string().max(180).optional(), sessionDate: z13.string(), minutes: z13.number().int().min(0).max(1440), questions: z13.number().int().min(0).max(2e3), correct: z13.number().int().min(0).max(2e3), wrong: z13.number().int().min(0).max(2e3), blank: z13.number().int().min(0).max(2e3), pageStart: z13.number().int().min(0).optional(), pageEnd: z13.number().int().min(0).optional(), testStart: z13.number().int().min(0).optional(), testEnd: z13.number().int().min(0).optional() })).mutation(({ ctx, input }) => addBookStudyLog(ctx.user.id, { ...input, sessionDate: new Date(input.sessionDate) })),
    upsertMapping: protectedProcedure.input(z13.object({ bookId: z13.string().max(120), topic: z13.string().max(180), subject: z13.string().max(80), pageStart: z13.number().int().min(0).optional(), pageEnd: z13.number().int().min(0).optional(), testStart: z13.number().int().min(0).optional(), testEnd: z13.number().int().min(0).optional() })).mutation(({ ctx, input }) => upsertBookTopicMapping(ctx.user.id, input)),
    addSwitch: protectedProcedure.input(z13.object({ fromBookId: z13.string().max(120).optional(), toBookId: z13.string().max(120), reason: z13.string().max(300) })).mutation(({ ctx, input }) => addSourceSwitch(ctx.user.id, { ...input, switchedAt: /* @__PURE__ */ new Date() })),
    importBooks: protectedProcedure.input(z13.object({ books: z13.array(z13.object({ id: z13.string().max(120), title: z13.string().min(1).max(180), publisher: z13.string().max(120), subject: z13.string().max(80), exam: z13.enum(["TYT", "AYT"]), level: z13.enum(["Kolay", "Orta", "Zor"]), format: z13.string().max(120), reason: z13.string().max(1e3), sourceUrl: z13.string().max(500).optional(), pageCount: z13.number().int().min(0).optional(), tone: z13.string().max(20) })).min(1).max(500) })).mutation(({ ctx, input }) => addUserResourceBooks(ctx.user.id, input.books))
  }),
  exams: router({
    snapshot: protectedProcedure.query(({ ctx }) => getUserMockExams(ctx.user.id)),
    importMany: protectedProcedure.input(z13.object({ exams: z13.array(userExamInput).min(1).max(200) })).mutation(({ ctx, input }) => addUserMockExams(ctx.user.id, input.exams.map((exam) => ({ ...exam, examDate: new Date(exam.date) }))))
  }),
  calendar: router({
    snapshot: protectedProcedure.query(({ ctx }) => getStudyCalendar(ctx.user.id)),
    savePlan: protectedProcedure.input(z13.object({ title: z13.string().max(180), weekStart: z13.string(), weekEnd: z13.string(), summary: z13.string().max(2e3), source: z13.enum(["ai", "manual"]).optional(), sessions: z13.array(z13.object({ sessionDate: z13.string(), title: z13.string().max(180), subject: z13.string().max(80), topic: z13.string().max(180), kind: z13.string().max(40), plannedMinutes: z13.number().int().min(0).max(1440), targetQuestions: z13.number().int().min(0).optional(), targetPages: z13.string().max(80).nullable().optional(), targetTests: z13.string().max(80).nullable().optional() })).max(100) })).mutation(({ ctx, input }) => saveStudyPlan(ctx.user.id, { ...input, weekStart: new Date(input.weekStart), weekEnd: new Date(input.weekEnd), sessions: input.sessions.map((session) => ({ ...session, sessionDate: new Date(session.sessionDate) })) })),
    completeSession: protectedProcedure.input(z13.object({ sessionId: z13.number().int(), actualMinutes: z13.number().int().min(0).max(1440), actualQuestions: z13.number().int().min(0).max(5e3), correct: z13.number().int().min(0).max(5e3), wrong: z13.number().int().min(0).max(5e3), blank: z13.number().int().min(0).max(5e3), actualPages: z13.number().int().min(0).max(5e3).optional(), note: z13.string().max(1e3).optional() })).mutation(({ ctx, input }) => completeStudySession(ctx.user.id, input)),
    coachSnapshot: protectedProcedure.input(z13.object({ periodStart: z13.string(), periodEnd: z13.string() })).query(async ({ ctx, input }) => {
      const { sessions, averageAccuracy } = await getPlanAdherenceInputs(ctx.user.id, new Date(input.periodStart), new Date(input.periodEnd));
      return { ...calculatePlanAdherence(sessions, averageAccuracy), averageAccuracy, alerts: await getCoachAlerts(ctx.user.id) };
    }),
    refreshCoach: protectedProcedure.input(z13.object({ periodStart: z13.string(), periodEnd: z13.string() })).mutation(({ ctx, input }) => savePlanAdherence(ctx.user.id, new Date(input.periodStart), new Date(input.periodEnd))),
    readCoachAlert: protectedProcedure.input(z13.object({ alertId: z13.number().int() })).mutation(({ ctx, input }) => markCoachAlertRead(ctx.user.id, input.alertId)),
    addFocusLog: protectedProcedure.input(z13.object({ subject: z13.string().max(80), topic: z13.string().max(180), studyDate: z13.string(), minutes: z13.number().int().min(1).max(1440), questions: z13.number().int().min(0).max(5e3), correct: z13.number().int().min(0).max(5e3), wrong: z13.number().int().min(0).max(5e3), blank: z13.number().int().min(0).max(5e3), note: z13.string().max(1e3).optional() })).mutation(({ ctx, input }) => addTopicStudyLog(ctx.user.id, { ...input, studyDate: new Date(input.studyDate), note: input.note ?? null, sessionId: null })),
    // Paragraf pratiği / gece okuması gibi "şimdi yaptım" alışkanlık kayıtları.
    logRoutine: protectedProcedure.input(z13.object({ title: z13.string().max(180), subject: z13.string().max(80), topic: z13.string().max(180), kind: z13.string().max(40), plannedMinutes: z13.number().int().min(0).max(1440), actualMinutes: z13.number().int().min(0).max(1440), actualPages: z13.number().int().min(0).max(5e3).optional(), note: z13.string().max(1e3).optional() })).mutation(({ ctx, input }) => logCompletedRoutineSession(ctx.user.id, input))
  }),
  aiPlan: router({
    // GÜVENLİK DÜZELTMESİ (audit §F.1): bu uç nokta önceden `publicProcedure`
    // idi — girişsiz, sınırsız olarak herkes tarafından çağrılabilen, gerçek
    // bir LLM çağrısı yapan (maliyetli) bir işlemdi. Artık giriş + onay
    // zorunlu (`protectedProcedure` içeren `metredFeatureProcedure`) VE
    // free/premium'a göre kullanım kotalı (bkz. shared/entitlements.ts).
    generate: metredFeatureProcedure("AI_STUDY_PLAN").input(planInput).mutation(async ({ input }) => {
      const weakTopics = input.topics.filter((topic) => topic.status === "Zay\u0131f");
      const recentExams = input.exams.slice(0, 3);
      const profile = input.studentProfile;
      const targetContext = profile && (profile.targetScoreType || profile.targetUniversity || profile.targetDepartment || profile.targetRanking || profile.examYear) ? `

\xD6\u011Frencinin hedefi (onboarding'den \u2014 plan\u0131n \xF6nceliklerini buna g\xF6re kur, ama kesin bir s\u0131ralama/puan garantisi verme, sadece bu hedefe uygun bir tempo ve odak \xF6ner): hedef s\u0131nav y\u0131l\u0131 ${profile.examYear ?? "belirtilmemi\u015F"}, hedef puan t\xFCr\xFC ${profile.targetScoreType ?? "belirtilmemi\u015F"}, hedef \xFCniversite ${profile.targetUniversity || "belirtilmemi\u015F"}, hedef b\xF6l\xFCm ${profile.targetDepartment || "belirtilmemi\u015F"}, tahmini hedef s\u0131ralama ${profile.targetRanking || "belirtilmemi\u015F"}.` : "";
      const coachingContext = profile && (profile.dailyStudyDuration || profile.preferredStudyMethods?.length || profile.studyObstacles || profile.coachingStyle || profile.mainGoal) ? `

\xD6\u011Frencinin ko\xE7luk tercihleri (varsa bunlara uy \u2014 \xF6rn. tercih etti\u011Fi \xE7al\u0131\u015Fma y\xF6ntemine a\u011F\u0131rl\u0131k ver, ileti\u015Fim tarz\u0131na uygun bir dille yaz): ${JSON.stringify({ dailyStudyDuration: profile.dailyStudyDuration, preferredStudyMethods: profile.preferredStudyMethods, studyObstacles: profile.studyObstacles, coachingStyle: profile.coachingStyle, mainGoal: profile.mainGoal })}` : "";
      const prompt = `Bir YKS \xF6\u011Frencisi i\xE7in 7 g\xFCnl\xFCk uygulanabilir \xE7al\u0131\u015Fma program\u0131 olu\u015Ftur. Hedef: ${input.goal}. Haftal\u0131k toplam s\xFCre: ${input.availableMinutes} dakika. \xD6ncelik, zay\u0131f konular ve son deneme performans\u0131 olsun. Zay\u0131f konular\u0131 tamamen yok sayma; orta konulara peki\u015Ftirme, iyi konulara koruma oturumu ekle. Her g\xFCn toplam 60-150 dakika ve 2-4 oturum planla. T\xFCrk\xE7e yan\u0131t \xFCret. Ki\u015Fisel raftaki kitaplar\u0131 m\xFCmk\xFCn oldu\u011Funca ilgili zay\u0131f konu oturumlar\u0131na ba\u011Fla. Bir kitab\u0131n mappings alan\u0131nda ilgili konu varsa targetPages alan\u0131na ger\xE7ek sayfa aral\u0131\u011F\u0131n\u0131 ve targetTests alan\u0131na ger\xE7ek test aral\u0131\u011F\u0131n\u0131 yaz; e\u015Fle\u015Ftirme yoksa uydurma aral\u0131k verme, null b\u0131rak. Soru oturumlar\u0131nda ger\xE7ek\xE7i g\xFCnl\xFCk soru hedefi yaz.

Zay\u0131f/orta/iyi konu verisi:
${JSON.stringify(input.topics)}

\xD6ncelikli zay\u0131f konular:
${JSON.stringify(weakTopics)}

Son denemeler:
${JSON.stringify(recentExams)}

Ki\u015Fisel raf ve \xE7\xF6z\xFCm durumu:
${JSON.stringify(input.books)}${targetContext}${coachingContext}`;
      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "Sen deneyimli, \xF6l\xE7\xFCl\xFC ve motive edici bir YKS \xE7al\u0131\u015Fma ko\xE7usun. Sadece verilen verilere dayan; ger\xE7ek\xE7i olmayan hedefler verme. Yan\u0131t\u0131n JSON \u015Femas\u0131na tam uysun." },
            { role: "user", content: prompt }
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
                  days: { type: "array", minItems: 7, maxItems: 7, items: { type: "object", properties: { day: { type: "string" }, date: { type: "string" }, totalMinutes: { type: "integer" }, sessions: { type: "array", minItems: 2, maxItems: 4, items: { type: "object", properties: { title: { type: "string" }, subject: { type: "string" }, topic: { type: "string" }, minutes: { type: "integer" }, kind: { type: "string", enum: ["\xD6\u011Frenme", "Soru", "Tekrar", "Deneme analizi"] }, rationale: { type: "string" }, bookId: { type: "string" }, bookTitle: { type: "string" }, targetQuestions: { type: "integer" }, targetPages: { type: ["string", "null"] }, targetTests: { type: ["string", "null"] } }, required: ["title", "subject", "topic", "minutes", "kind", "rationale"], additionalProperties: false } } }, required: ["day", "date", "totalMinutes", "sessions"], additionalProperties: false } },
                  coachNote: { type: "string" }
                },
                required: ["summary", "focus", "days", "coachNote"],
                additionalProperties: false
              }
            }
          }
        });
        const content = response.choices[0]?.message?.content;
        const jsonText = typeof content === "string" ? content : content?.map((part) => part.type === "text" ? part.text : "").join("");
        if (!jsonText) return fallbackPlan;
        return JSON.parse(jsonText);
      } catch (error) {
        console.warn("[AI Plan] Falling back to deterministic plan:", error);
        return fallbackPlan;
      }
    })
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
      const content = isImage ? [{ type: "text", text: "Bu g\xF6rseldeki dershane deneme sonu\xE7 belgesini oku." }, { type: "image_url", image_url: { url: input.dataUrl, detail: "high" } }] : [{ type: "text", text: "Bu PDF i\xE7indeki deneme sonu\xE7 belgesini oku." }, { type: "file_url", file_url: { url: input.dataUrl, mime_type: "application/pdf" } }];
      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "Sen YKS deneme sonu\xE7 belgesi okuyucususun. T\xFCrk\xE7e yan\u0131t ver ve yaln\u0131zca belgede g\xF6r\xFClen verileri \xE7\u0131kar. Belge \xF6rnekteki gibi konu ad\u0131, soru say\u0131s\u0131, do\u011Fru, yanl\u0131\u015F ve y\xFCzde s\xFCtunlar\u0131 i\xE7erir. Her konu sat\u0131r\u0131n\u0131 ayr\u0131 kaydet. Neti do\u011Fru - yanl\u0131\u015F/4 olarak hesapla; bilinmeyen tarih i\xE7in bo\u015F string, bilinmeyen s\xFCre i\xE7in 0 kullan. Ders toplam netlerini subjects i\xE7inde, belge a\xE7\u0131k\xE7a s\xFCre vermiyorsa timeSpent i\xE7inde 0 d\xF6nd\xFCr. JSON \u015Femas\u0131na tam uy." },
            { role: "user", content }
          ],
          response_format: { type: "json_schema", json_schema: { name: "yks_exam_document", strict: true, schema: documentExtractionSchema } }
        });
        const raw = response.choices[0]?.message?.content;
        const jsonText = typeof raw === "string" ? raw : raw?.map((part) => part.type === "text" ? part.text : "").join("");
        if (!jsonText) throw new Error("Belgeden yap\u0131land\u0131r\u0131lm\u0131\u015F veri al\u0131namad\u0131");
        return JSON.parse(jsonText);
      } catch (error) {
        console.warn("[Exam Document] Extraction failed:", error);
        throw new Error("Belge okunamad\u0131. L\xFCtfen daha net bir PDF veya g\xF6rsel y\xFCkleyin.");
      }
    })
  }),
  topics: topicsRouter,
  catalog: resourceCatalogRouter,
  onboarding: onboardingRouter,
  subscription: subscriptionRouter,
  payment: paymentRouter,
  admin: adminRouter
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/resourceCatalog/difficulty/aiClassifier.ts
var SCHEMA = {
  type: "object",
  properties: {
    difficulty_label: { type: "string", enum: ["easy", "medium", "hard"] },
    difficulty_score: { type: "integer" },
    confidence: { type: "number" },
    reason: { type: "string" }
  },
  required: ["difficulty_label", "difficulty_score", "confidence", "reason"],
  additionalProperties: false
};
var isDifficultyLabel = (value) => value === "easy" || value === "medium" || value === "hard";
var unavailableResult = (reason) => ({
  label: "medium",
  score: 50,
  confidence: 0,
  rationale: reason,
  model: "ai:unavailable",
  classifiedAt: (/* @__PURE__ */ new Date()).toISOString()
});
var LlmDifficultyClassifier = class {
  method = "ai";
  async classify(input) {
    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "Sen bir YKS kaynak kitab\u0131n\u0131n zorluk seviyesini de\u011Ferlendiren bir s\u0131n\u0131fland\u0131r\u0131c\u0131s\u0131n. Yaln\u0131zca sana verilen ba\u015Fl\u0131k, yay\u0131nc\u0131, ders, s\u0131nav ve t\xFCr bilgisine dayan; kitab\u0131n i\xE7eri\u011Fi hakk\u0131nda bilmedi\u011Fin hi\xE7bir \u015Feyi uydurma. Emin de\u011Filsen confidence de\u011Ferini d\xFC\u015F\xFCk tut. JSON \u015Femas\u0131na tam uy."
          },
          {
            role: "user",
            content: `Kitap: ${input.title}
Yay\u0131nc\u0131: ${input.publisher ?? "bilinmiyor"}
Ders: ${input.subject ?? "bilinmiyor"}
S\u0131nav: ${input.exam ?? "bilinmiyor"}
T\xFCr: ${input.bookType ?? "bilinmiyor"}
Kategori: ${input.category ?? "bilinmiyor"}
A\xE7\u0131klama: ${input.description ?? "yok"}`
          }
        ],
        response_format: { type: "json_schema", json_schema: { name: "book_difficulty", strict: true, schema: SCHEMA } }
      });
      const content = response.choices[0]?.message?.content;
      const jsonText = typeof content === "string" ? content : content?.map((part) => part.type === "text" ? part.text : "").join("");
      if (!jsonText) return unavailableResult("AI bo\u015F yan\u0131t d\xF6nd\xFCrd\xFC");
      const parsed = JSON.parse(jsonText);
      if (!isDifficultyLabel(parsed.difficulty_label) || typeof parsed.difficulty_score !== "number" || typeof parsed.confidence !== "number") {
        return unavailableResult("AI yan\u0131t\u0131 beklenen \u015Femaya uymad\u0131");
      }
      return {
        label: parsed.difficulty_label,
        score: Math.max(0, Math.min(100, Math.round(parsed.difficulty_score))),
        confidence: Math.max(0, Math.min(1, parsed.confidence)),
        rationale: typeof parsed.reason === "string" ? parsed.reason : "",
        model: `ai:${response.model || "unknown"}`,
        classifiedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch (error) {
      console.warn("[ResourceCatalog] AI difficulty classification unavailable:", error);
      return unavailableResult("AI s\u0131n\u0131fland\u0131rma kullan\u0131lamad\u0131 (sa\u011Flay\u0131c\u0131 hatas\u0131 ya da API anahtar\u0131 yok)");
    }
  }
};

// server/resourceCatalog/difficulty/hybridClassifier.ts
function scoreFromMetadata(hint) {
  if (hint.legacyLevel) {
    const score = { Kolay: 22, Orta: 50, Zor: 80 }[hint.legacyLevel];
    return { score, confidence: 0.6, rationale: `kaynak meta verisinde seviye etiketi: ${hint.legacyLevel}` };
  }
  if (typeof hint.pageCount === "number") {
    if (hint.pageCount >= 450) return { score: 60, confidence: 0.25, rationale: `y\xFCksek sayfa say\u0131s\u0131 (${hint.pageCount})` };
    if (hint.pageCount > 0 && hint.pageCount <= 260) return { score: 42, confidence: 0.2, rationale: `d\xFC\u015F\xFCk sayfa say\u0131s\u0131 (${hint.pageCount})` };
  }
  return null;
}
var HybridDifficultyClassifier = class {
  constructor(rule, ai, config = resourceCatalogConfig) {
    this.rule = rule;
    this.ai = ai;
    this.config = config;
  }
  async classify(input, options) {
    const ruleResult = await this.rule.classify(input);
    const aiResult = options.useAi ? await this.ai.classify(input) : null;
    const metaSignal = scoreFromMetadata(options.metadata ?? {});
    const weights = this.config.difficulty.weights;
    const layers = [
      { score: ruleResult.score, confidence: ruleResult.confidence, weight: weights.rule }
    ];
    if (aiResult && aiResult.confidence > 0) layers.push({ score: aiResult.score, confidence: aiResult.confidence, weight: weights.ai });
    if (metaSignal) layers.push({ score: metaSignal.score, confidence: metaSignal.confidence, weight: weights.metadata });
    const effectiveWeightOf = (l) => l.weight * l.confidence;
    const totalEffectiveWeight = layers.reduce((sum, l) => sum + effectiveWeightOf(l), 0);
    const finalScore = totalEffectiveWeight > 0 ? Math.round(layers.reduce((sum, l) => sum + l.score * effectiveWeightOf(l), 0) / totalEffectiveWeight) : ruleResult.score;
    const totalConfiguredWeight = layers.reduce((sum, l) => sum + l.weight, 0);
    const aggregateConfidence = totalConfiguredWeight > 0 ? layers.reduce((sum, l) => sum + l.confidence * l.weight, 0) / totalConfiguredWeight : ruleResult.confidence;
    const { easyMax, mediumMax } = this.config.difficulty.thresholds;
    const label = finalScore <= easyMax ? "easy" : finalScore <= mediumMax ? "medium" : "hard";
    const rationale = [
      `kural: ${ruleResult.rationale} (skor ${ruleResult.score}, g\xFCven ${ruleResult.confidence.toFixed(2)})`,
      aiResult ? `AI: ${aiResult.rationale || "-"} (skor ${aiResult.score}, g\xFCven ${aiResult.confidence.toFixed(2)})` : "AI: kullan\u0131lmad\u0131",
      metaSignal ? `metadata: ${metaSignal.rationale} (skor ${metaSignal.score}, g\xFCven ${metaSignal.confidence.toFixed(2)})` : "metadata: sinyal yok"
    ].join(" | ");
    return {
      label,
      score: Math.max(0, Math.min(100, finalScore)),
      confidence: Number(Math.max(0, Math.min(1, aggregateConfidence)).toFixed(3)),
      rationale,
      model: "hybrid-v1",
      classifiedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
};

// server/resourceCatalog/difficulty/ruleBasedClassifier.ts
var EASY_PHRASES = ["s\u0131f\u0131r", "s\u0131f\u0131rdan", "temel", "ba\u015Flang\u0131\xE7", "ilk ad\u0131m", "kolay", "temelden", "0dan", "0 dan", "ba\u015Flang\u0131\xE7 seviyesi"];
var HARD_PHRASES = ["ileri", "zor", "extreme", "advanced", "master", "pro", "ileri d\xFCzey", "\xFCst d\xFCzey", "se\xE7ici"];
var normalizedPhrases = (phrases) => phrases.map((phrase) => normalizeKeepingTurkish(phrase));
var EASY = normalizedPhrases(EASY_PHRASES);
var HARD = normalizedPhrases(HARD_PHRASES);
var countPhraseMatches = (text2, phrases) => {
  const padded = ` ${normalizeKeepingTurkish(text2)} `;
  return phrases.filter((phrase) => padded.includes(` ${phrase} `));
};
var BOOK_TYPE_MODIFIER = {
  topic_explanation: -6,
  topic_explanation_question_bank: -2,
  question_bank: 0,
  fasikul: -3,
  test_book: -2,
  mock_exam: 2,
  past_questions: 6,
  camp: 3,
  reference: 0,
  other: 0
};
var EASY_SHIFT_PER_MATCH = 16;
var HARD_SHIFT_PER_MATCH = 16;
var MAX_KEYWORD_SHIFT = 34;
var RuleBasedDifficultyClassifier = class {
  method = "rule";
  async classify(input) {
    const haystack = [input.title, input.description ?? "", input.category ?? ""].join(" ");
    const easyMatches = countPhraseMatches(haystack, EASY);
    const hardMatches = countPhraseMatches(haystack, HARD);
    const easyShift = Math.min(easyMatches.length * EASY_SHIFT_PER_MATCH, MAX_KEYWORD_SHIFT);
    const hardShift = Math.min(hardMatches.length * HARD_SHIFT_PER_MATCH, MAX_KEYWORD_SHIFT);
    const bookTypeShift = input.bookType ? BOOK_TYPE_MODIFIER[input.bookType] : 0;
    const rawScore = 50 - easyShift + hardShift + bookTypeShift;
    const score = Math.max(0, Math.min(100, Math.round(rawScore)));
    const { easyMax, mediumMax } = resourceCatalogConfig.difficulty.thresholds;
    const label = score <= easyMax ? "easy" : score <= mediumMax ? "medium" : "hard";
    const signalCount = easyMatches.length + hardMatches.length + (bookTypeShift !== 0 ? 1 : 0);
    const confidence = signalCount === 0 ? 0.3 : Math.min(0.3 + signalCount * 0.18, 0.85);
    const rationaleParts = [];
    if (easyMatches.length) rationaleParts.push(`kolay sinyaller: ${easyMatches.join(", ")}`);
    if (hardMatches.length) rationaleParts.push(`zor sinyaller: ${hardMatches.join(", ")}`);
    if (bookTypeShift !== 0) rationaleParts.push(`t\xFCr etkisi: ${input.bookType} (${bookTypeShift > 0 ? "+" : ""}${bookTypeShift})`);
    if (rationaleParts.length === 0) rationaleParts.push("belirgin anahtar kelime yok, n\xF6tr puan");
    return {
      label,
      score,
      confidence,
      rationale: rationaleParts.join("; "),
      model: "rule-based-v1",
      classifiedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
};

// server/resourceCatalog/curriculumMapper.ts
var STOPWORDS = /* @__PURE__ */ new Set(["ve", "ile", "soru", "bankasi", "konu", "anlatimi", "anlatimli", "deneme", "kitap", "kitabi", "tyt", "ayt", "fasikul"]);
var examScopeAllows = (examScope, topicExam) => {
  if (examScope === "TYT_AYT" || examScope === "YKS" || examScope === "GENEL") return true;
  return examScope === topicExam;
};
function mapBookToCurriculumTopics(book, topics, options = {}) {
  if (!book.subject) return [];
  const maxMatches = options.maxMatches ?? 3;
  const bookSubjectKey = normalizeForComparison(book.subject);
  const bookNameTokens = new Set(tokenize(book.name).filter((token) => !STOPWORDS.has(token)));
  const candidates = topics.filter((topic) => normalizeForComparison(topic.subject) === bookSubjectKey && examScopeAllows(book.examScope, topic.exam)).map((topic) => {
    const topicTokens = tokenize(topic.topic).filter((token) => !STOPWORDS.has(token));
    const shared = topicTokens.filter((token) => bookNameTokens.has(token));
    const overlapRatio = topicTokens.length > 0 ? shared.length / topicTokens.length : 0;
    return { topic, shared, overlapRatio };
  }).filter((candidate) => candidate.shared.length > 0).map((candidate) => ({
    topicId: candidate.topic.id,
    confidence: Math.min(0.9, 0.35 + candidate.overlapRatio * 0.55),
    reason: `Ders e\u015Fle\u015Fti (${book.subject}) + ortak kelimeler: ${candidate.shared.join(", ")}`
  })).sort((a, b) => b.confidence - a.confidence).slice(0, maxMatches);
  return candidates;
}

// server/resourceCatalog/duplicateDetector.ts
var normalizeIsbn = (isbn) => isbn.replace(/[^0-9Xx]/g, "").toUpperCase();
function levenshteinDistance(a, b) {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const previousRow = Array.from({ length: b.length + 1 }, (_, i) => i);
  const currentRow = new Array(b.length + 1);
  for (let i = 0; i < a.length; i++) {
    currentRow[0] = i + 1;
    for (let j = 0; j < b.length; j++) {
      const cost = a[i] === b[j] ? 0 : 1;
      currentRow[j + 1] = Math.min(
        currentRow[j] + 1,
        previousRow[j + 1] + 1,
        previousRow[j] + cost
      );
    }
    for (let j = 0; j <= b.length; j++) previousRow[j] = currentRow[j];
  }
  return previousRow[b.length];
}
var similarity = (a, b) => {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(a, b) / maxLen;
};
var FUZZY_SIMILARITY_THRESHOLD = 0.88;
function detectDuplicate(candidate, existingBooks) {
  if (candidate.isbn) {
    const candidateIsbn = normalizeIsbn(candidate.isbn);
    const isbnMatch = existingBooks.find((book) => book.isbn && normalizeIsbn(book.isbn) === candidateIsbn);
    if (isbnMatch) {
      return { bookId: isbnMatch.id, tier: "isbn", confidence: 1, reason: `ISBN e\u015Fle\u015Fmesi (${candidateIsbn})` };
    }
  }
  const candidateNormalizedName = normalizeForComparison(candidate.name);
  const identityMatch = existingBooks.find((book) => {
    if (book.publisherId !== candidate.publisherId) return false;
    if (normalizeForComparison(book.name) !== candidateNormalizedName) return false;
    const bothEditionsKnown = book.editionYear !== null && candidate.editionYear !== null;
    if (bothEditionsKnown && book.editionYear !== candidate.editionYear) return false;
    return true;
  });
  if (identityMatch) {
    return {
      bookId: identityMatch.id,
      tier: "normalized_identity",
      confidence: 0.95,
      reason: "Ayn\u0131 yay\u0131nc\u0131 + normalize edilmi\u015F ad + bask\u0131 y\u0131l\u0131 uyumu"
    };
  }
  const publisherNameMatch = existingBooks.find(
    (book) => book.publisherId === candidate.publisherId && normalizeForComparison(book.name) === candidateNormalizedName
  );
  if (publisherNameMatch) {
    const editionsDiffer = publisherNameMatch.editionYear !== null && candidate.editionYear !== null && publisherNameMatch.editionYear !== candidate.editionYear;
    return {
      bookId: publisherNameMatch.id,
      tier: "publisher_name",
      confidence: editionsDiffer ? 0.55 : 0.85,
      reason: editionsDiffer ? `Ayn\u0131 yay\u0131nc\u0131 + ad, farkl\u0131 bask\u0131 y\u0131l\u0131 (${publisherNameMatch.editionYear} vs ${candidate.editionYear}) \u2014 muhtemelen yeni bask\u0131` : "Ayn\u0131 yay\u0131nc\u0131 + normalize edilmi\u015F ad"
    };
  }
  if (candidate.publisherId !== null) {
    let best = null;
    for (const book of existingBooks) {
      if (book.publisherId !== candidate.publisherId) continue;
      const score = similarity(candidateNormalizedName, normalizeForComparison(book.name));
      if (score >= FUZZY_SIMILARITY_THRESHOLD && (!best || score > best.score)) {
        best = { book, score };
      }
    }
    if (best) {
      return {
        bookId: best.book.id,
        tier: "fuzzy",
        confidence: Number(best.score.toFixed(3)),
        reason: `Ayn\u0131 yay\u0131nc\u0131, bulan\u0131k ad benzerli\u011Fi %${Math.round(best.score * 100)}`
      };
    }
  }
  return null;
}

// server/resourceCatalog/normalizers/bookTypeNormalizer.ts
var RAW_RULES = [
  { type: "topic_explanation_question_bank", anyOf: ["konu anlat\u0131ml\u0131 soru bankas\u0131", "konu anlat\u0131ml\u0131 ve soru bankas\u0131"] },
  { type: "mock_exam", anyOf: ["deneme", "deneme s\u0131nav\u0131", "bran\u015F denemesi", "sim\xFClasyon"] },
  { type: "past_questions", anyOf: ["\xE7\u0131km\u0131\u015F sorular", "\xE7\u0131km\u0131\u015F soru", "\xF6sym \xE7\u0131km\u0131\u015F"] },
  { type: "camp", anyOf: ["kamp kitab\u0131", "yaz kamp\u0131", "kamp"] },
  { type: "fasikul", anyOf: ["fasik\xFCl", "fasik\xFCller"] },
  { type: "test_book", anyOf: ["yaprak test", "test kitab\u0131", "test kitaplar\u0131"] },
  { type: "topic_explanation", anyOf: ["konu anlat\u0131m\u0131", "konu anlat\u0131ml\u0131", "ders i\u015Fleme f\xF6y\xFC", "\xF6zet konu"] },
  { type: "question_bank", anyOf: ["soru bankas\u0131", "soru bankalar\u0131"] },
  { type: "reference", anyOf: ["ba\u015Fvuru kayna\u011F\u0131", "s\xF6zl\xFCk", "form\xFCler"] }
];
var RULES = RAW_RULES.map((rule) => ({ type: rule.type, anyOf: rule.anyOf.map(normalizeKeepingTurkish) }));
function normalizeBookType(rawCategory) {
  if (!rawCategory) return "other";
  const normalized = normalizeKeepingTurkish(rawCategory);
  for (const rule of RULES) {
    if (rule.anyOf.some((phrase) => normalized.includes(phrase))) return rule.type;
  }
  return "other";
}
function normalizeExamScope(rawExam) {
  if (!rawExam) return "GENEL";
  const normalized = normalizeKeepingTurkish(rawExam);
  const hasTyt = /\btyt\b/.test(normalized);
  const hasAyt = /\bayt\b/.test(normalized);
  if (hasTyt && hasAyt) return "TYT_AYT";
  if (hasTyt) return "TYT";
  if (hasAyt) return "AYT";
  if (normalized.includes("yks")) return "YKS";
  return "GENEL";
}

// server/resourceCatalog/normalizers/publisherNormalizer.ts
var PUBLISHER_ALIASES = {
  "3d": "3D Yay\u0131nlar\u0131",
  "3d yayinlari": "3D Yay\u0131nlar\u0131",
  "ucdortbes": "\xDC\xE7D\xF6rtBe\u015F",
  "345": "\xDC\xE7D\xF6rtBe\u015F",
  "uc dort bes": "\xDC\xE7D\xF6rtBe\u015F",
  "bilgi sarmal": "Bilgi Sarmal",
  "bilgi sarmal yayincilik": "Bilgi Sarmal",
  "pegem": "Pegem Akademi",
  "pegem akademi": "Pegem Akademi",
  "pegem yayincilik": "Pegem Akademi",
  "karekok": "Karek\xF6k",
  "karekok yayincilik": "Karek\xF6k",
  "paraf": "Paraf Yay\u0131nlar\u0131",
  "paraf yayinlari": "Paraf Yay\u0131nlar\u0131",
  "rasyonel": "Rasyonel Yay\u0131nlar\u0131",
  "rasyonel yayinlari": "Rasyonel Yay\u0131nlar\u0131",
  "aydin": "Ayd\u0131n Yay\u0131nlar\u0131",
  "aydin yayinlari": "Ayd\u0131n Yay\u0131nlar\u0131",
  "orijinal": "Orijinal Yay\u0131nlar\u0131",
  "orijinal yayinlari": "Orijinal Yay\u0131nlar\u0131",
  "hiz ve renk": "H\u0131z ve Renk Yay\u0131nlar\u0131",
  "hiz ve renk yayinlari": "H\u0131z ve Renk Yay\u0131nlar\u0131"
};
var suffixTitleCase = (value) => value.split(" ").filter(Boolean).map((word) => word.charAt(0).toLocaleUpperCase("tr-TR") + word.slice(1).toLocaleLowerCase("tr-TR")).join(" ");
function normalizePublisherName(rawName) {
  const trimmed = rawName.trim();
  const comparisonKey = normalizeForComparison(trimmed);
  const canonicalName = PUBLISHER_ALIASES[comparisonKey] ?? suffixTitleCase(trimmed);
  const normalizedName = normalizeForComparison(canonicalName);
  return {
    canonicalName,
    slug: slugify2(canonicalName),
    normalizedName
  };
}

// server/resourceCatalog/pipeline/normalize.ts
function normalizeProduct(product) {
  const publisher = product.rawPublisher ? normalizePublisherName(product.rawPublisher) : null;
  const metadata = product.rawMetadata ?? {};
  const subject = typeof metadata.subjectLabel === "string" ? metadata.subjectLabel : null;
  const examLabelSource = typeof metadata.examLabel === "string" ? metadata.examLabel : product.rawCategory;
  return {
    raw: product,
    name: product.rawName.trim().replace(/\s+/g, " "),
    publisherName: publisher?.canonicalName ?? null,
    publisherSlug: publisher?.slug ?? null,
    publisherNormalizedName: publisher?.normalizedName ?? null,
    isbn: product.rawIsbn ? product.rawIsbn.replace(/[^0-9Xx]/g, "").toUpperCase() || null : null,
    editionYear: typeof metadata.editionYear === "number" ? metadata.editionYear : null,
    description: product.rawDescription?.trim() || null,
    imageUrl: product.rawImageUrl ?? null,
    bookType: normalizeBookType(product.rawCategory),
    examScope: normalizeExamScope(examLabelSource ?? null),
    subject,
    price: typeof product.rawPrice === "number" ? product.rawPrice : null,
    currency: product.rawCurrency ?? "TRY"
  };
}
function slugForBook(name, publisherName) {
  const base = publisherName ? `${name} ${publisherName}` : name;
  return slugify2(base);
}

// server/resourceCatalog/pipeline/validate.ts
function validateRawProduct(product) {
  const issues = [];
  if (!product.rawName || product.rawName.trim().length < 2) {
    issues.push({ field: "rawName", message: "\xDCr\xFCn ad\u0131 eksik veya \xE7ok k\u0131sa" });
  }
  if (product.rawName && product.rawName.length > 300) {
    issues.push({ field: "rawName", message: "\xDCr\xFCn ad\u0131 300 karakteri a\u015F\u0131yor" });
  }
  if (!product.sourceProductId || product.sourceProductId.trim().length === 0) {
    issues.push({ field: "sourceProductId", message: "Kaynak \xFCr\xFCn kimli\u011Fi eksik" });
  }
  if (product.rawPrice !== void 0 && (Number.isNaN(product.rawPrice) || product.rawPrice < 0)) {
    issues.push({ field: "rawPrice", message: "Ge\xE7ersiz fiyat" });
  }
  return issues;
}

// server/resourceCatalog/pipeline/orchestrator.ts
var emptyStats = (source, dryRun, startedAt) => ({
  source,
  dryRun,
  fetched: 0,
  created: 0,
  updated: 0,
  skipped: 0,
  failed: 0,
  needsReview: 0,
  difficulty: { easy: 0, medium: 0, hard: 0, needsReview: 0 },
  curriculumMapped: 0,
  curriculumUnmapped: 0,
  missing: { isbn: 0, publisher: 0, subject: 0, examScope: 0, bookType: 0, image: 0, price: 0 },
  errors: [],
  startedAt: startedAt.toISOString(),
  finishedAt: startedAt.toISOString()
});
var AUTO_MERGE_CONFIDENCE_THRESHOLD = 0.75;
var ResourceCatalogImportPipeline = class {
  constructor(source, db, difficultyClassifier) {
    this.source = source;
    this.db = db;
    this.difficultyClassifier = difficultyClassifier;
  }
  async run(options = {}) {
    const startedAt = /* @__PURE__ */ new Date();
    const dryRun = !!options.dryRun;
    const log = dryRun ? null : await this.db.createSyncLog({ source: this.source.name, startedAt, dryRun, triggeredBy: options.triggeredBy ?? null });
    const stats = emptyStats(this.source.name, dryRun, startedAt);
    const limit = options.limit ?? Number.POSITIVE_INFINITY;
    const curriculumTopics = await this.db.listCurriculumTopics();
    let page = 0;
    let hasMore = true;
    while (hasMore && stats.fetched < limit) {
      const { products, hasMore: more } = await this.source.fetchPage(page);
      hasMore = more;
      page += 1;
      if (products.length === 0 && !hasMore) break;
      for (const product of products) {
        if (stats.fetched >= limit) break;
        stats.fetched += 1;
        try {
          this.trackMissingFields(stats, product);
          const outcome = await this.processOne(product, options, curriculumTopics, stats);
          this.tally(stats, outcome);
        } catch (error) {
          stats.failed += 1;
          stats.errors.push({ sourceProductId: product.sourceProductId, message: error instanceof Error ? error.message : String(error) });
        }
      }
    }
    stats.finishedAt = (/* @__PURE__ */ new Date()).toISOString();
    if (log) {
      await this.db.finishSyncLog(log.id, {
        finishedAt: new Date(stats.finishedAt),
        fetched: stats.fetched,
        created: stats.created,
        updated: stats.updated,
        skipped: stats.skipped,
        failed: stats.failed,
        needsReview: stats.needsReview,
        statsJson: JSON.stringify(stats),
        errorLog: stats.errors.length ? JSON.stringify(stats.errors) : null
      });
    }
    return stats;
  }
  trackMissingFields(stats, product) {
    if (!product.rawIsbn) stats.missing.isbn += 1;
    if (!product.rawPublisher) stats.missing.publisher += 1;
    if (!product.rawMetadata?.subjectLabel) stats.missing.subject += 1;
    if (!product.rawMetadata?.examLabel && !product.rawCategory) stats.missing.examScope += 1;
    if (!product.rawCategory) stats.missing.bookType += 1;
    if (!product.rawImageUrl) stats.missing.image += 1;
    if (product.rawPrice === void 0) stats.missing.price += 1;
  }
  tally(stats, outcome) {
    if (outcome.status === "created") stats.created += 1;
    else if (outcome.status === "updated") stats.updated += 1;
    else if (outcome.status === "skipped") stats.skipped += 1;
    else if (outcome.status === "needs_review") {
      stats.needsReview += 1;
      if (outcome.wasNew) stats.created += 1;
      else stats.updated += 1;
    } else {
      stats.failed += 1;
      stats.errors.push({ sourceProductId: outcome.product?.sourceProductId, message: outcome.reason });
    }
  }
  async processOne(product, options, curriculumTopics, stats) {
    const dryRun = !!options.dryRun;
    const issues = validateRawProduct(product);
    if (!dryRun) {
      const sourceRow = await this.db.upsertExternalSource({
        source: product.source,
        sourceProductId: product.sourceProductId,
        sourceUrl: product.sourceUrl ?? null,
        rawName: product.rawName,
        rawDescription: product.rawDescription ?? null,
        rawPrice: product.rawPrice ?? null,
        rawCurrency: product.rawCurrency ?? null,
        rawImageUrl: product.rawImageUrl ?? null,
        rawPublisher: product.rawPublisher ?? null,
        rawCategory: product.rawCategory ?? null,
        rawIsbn: product.rawIsbn ?? null,
        rawMetadata: product.rawMetadata ?? null
      });
      if (issues.length > 0) {
        await this.db.markExternalSourceOutcome(sourceRow.id, { matchedBookId: sourceRow.matchedBookId, syncStatus: "failed", errorMessage: issues.map((i) => i.message).join("; ") });
        return { status: "failed", reason: issues.map((i) => i.message).join("; "), product };
      }
      if (options.onlyNew && sourceRow.matchedBookId) {
        return { status: "skipped", reason: "--only-new: bu \xFCr\xFCn zaten e\u015Fle\u015Fmi\u015F", sourceRowId: sourceRow.id };
      }
      return this.upsertAndClassify(product, sourceRow.matchedBookId, options, curriculumTopics, sourceRow.id, stats);
    }
    if (issues.length > 0) return { status: "failed", reason: issues.map((i) => i.message).join("; "), product };
    const existing = await this.db.findExternalSource(product.source, product.sourceProductId);
    if (options.onlyNew && existing?.matchedBookId) return { status: "skipped", reason: "--only-new: bu \xFCr\xFCn zaten e\u015Fle\u015Fmi\u015F" };
    return this.upsertAndClassify(product, existing?.matchedBookId ?? null, options, curriculumTopics, existing?.id ?? -1, stats);
  }
  async upsertAndClassify(product, matchedBookId, options, curriculumTopics, sourceRowId, stats) {
    const dryRun = !!options.dryRun;
    const normalized = normalizeProduct(product);
    let publisherId = null;
    if (normalized.publisherNormalizedName && normalized.publisherName && normalized.publisherSlug) {
      const existingPublisher = await this.db.findPublisherByNormalizedName(normalized.publisherNormalizedName);
      if (existingPublisher) {
        publisherId = existingPublisher.id;
      } else if (!dryRun) {
        const created = await this.db.createPublisher({ name: normalized.publisherName, slug: normalized.publisherSlug, normalizedName: normalized.publisherNormalizedName });
        publisherId = created.id;
      }
    }
    let existingBook = matchedBookId ? await this.db.getCatalogBookById(matchedBookId) : null;
    let match = null;
    if (!existingBook) {
      if (normalized.isbn) {
        existingBook = await this.db.findCatalogBookByIsbn(normalized.isbn);
        if (existingBook) match = { bookId: existingBook.id, tier: "isbn", confidence: 1, reason: "ISBN e\u015Fle\u015Fmesi" };
      }
      if (!existingBook && publisherId !== null) {
        const candidates = await this.db.listCatalogBooksByPublisher(publisherId);
        match = detectDuplicate({ isbn: normalized.isbn, name: normalized.name, publisherId, editionYear: normalized.editionYear }, candidates);
      }
    }
    const willAutoMerge = !!existingBook || match !== null && match.confidence >= AUTO_MERGE_CONFIDENCE_THRESHOLD;
    const ambiguousMatch = match && match.confidence < AUTO_MERGE_CONFIDENCE_THRESHOLD ? match : null;
    const bookInput = {
      publisherId,
      name: normalized.name,
      slug: slugForBook(normalized.name, normalized.publisherName) + (ambiguousMatch ? `-${normalized.editionYear ?? Date.now()}` : ""),
      isbn: normalized.isbn,
      editionYear: normalized.editionYear,
      description: normalized.description,
      imageUrl: normalized.imageUrl,
      bookType: normalized.bookType,
      examScope: normalized.examScope,
      subject: normalized.subject,
      metadata: { source: product.source, sourceUrl: product.sourceUrl ?? null }
    };
    let book;
    let isNewBook;
    if (dryRun) {
      isNewBook = !existingBook && !willAutoMerge;
      book = existingBook ?? (match && match.confidence >= AUTO_MERGE_CONFIDENCE_THRESHOLD ? await this.db.getCatalogBookById(match.bookId) : { ...bookInput, id: -1, active: true, manualOverride: false, difficultyLabel: "medium", difficultyScore: 50, difficultyConfidence: 0, classificationMethod: "rule" });
    } else if (existingBook || match && match.confidence >= AUTO_MERGE_CONFIDENCE_THRESHOLD) {
      const targetId = existingBook?.id ?? match.bookId;
      book = await this.db.updateCatalogBook(targetId, bookInput);
      isNewBook = false;
    } else {
      book = await this.db.createCatalogBook(bookInput);
      isNewBook = true;
    }
    if (!dryRun) {
      await this.db.markExternalSourceOutcome(sourceRowId, { matchedBookId: book.id, syncStatus: ambiguousMatch ? "needs_review" : "processed" });
      if (normalized.price !== null) {
        await this.db.upsertBookOffer({ bookId: book.id, source: product.source, price: normalized.price, currency: normalized.currency, productUrl: product.sourceUrl ?? null });
      }
    }
    let needsReview = ambiguousMatch !== null;
    if (!book.manualOverride && (isNewBook || options.force)) {
      const rawMetadata = product.rawMetadata ?? {};
      const useAi = resourceCatalogConfig.difficulty.aiEnabled && !options.noAi;
      const result = await this.difficultyClassifier.classify(
        { title: normalized.name, publisher: normalized.publisherName, subject: normalized.subject, exam: normalized.examScope, bookType: normalized.bookType, description: normalized.description, category: product.rawCategory ?? null },
        { useAi, metadata: { legacyLevel: rawMetadata.legacyLevel ?? null, pageCount: rawMetadata.pageCount ?? null } }
      );
      needsReview = needsReview || result.confidence < resourceCatalogConfig.difficulty.reviewConfidenceThreshold;
      stats.difficulty[result.label] += 1;
      if (needsReview) stats.difficulty.needsReview += 1;
      if (!dryRun) {
        await this.db.updateCatalogBookDifficulty(book.id, {
          difficultyScore: result.score,
          difficultyLabel: result.label,
          difficultyConfidence: result.confidence,
          classificationMethod: "hybrid",
          needsReview,
          classifiedAt: /* @__PURE__ */ new Date()
        });
      }
    }
    const mappings = mapBookToCurriculumTopics({ name: normalized.name, subject: normalized.subject, examScope: normalized.examScope }, curriculumTopics);
    if (mappings.length > 0) stats.curriculumMapped += 1;
    else stats.curriculumUnmapped += 1;
    if (!dryRun) {
      for (const mapping of mappings) {
        await this.db.upsertBookCurriculumMapping({ bookId: book.id, topicId: mapping.topicId, confidence: mapping.confidence, reason: mapping.reason });
      }
    }
    if (needsReview) {
      return { status: "needs_review", bookId: dryRun ? null : book.id, sourceRowId, reason: ambiguousMatch ? ambiguousMatch.reason : "D\xFC\u015F\xFCk g\xFCvenli zorluk s\u0131n\u0131fland\u0131rmas\u0131", wasNew: isNewBook };
    }
    return { status: isNewBook ? "created" : "updated", bookId: book.id, sourceRowId };
  }
};

// server/resourceCatalog/sources/kitapIslerSource.ts
var BASE_URL = "https://www.kitapisler.com";
var DEFAULT_SEED_URL = `${BASE_URL}/YKS-Yuksekogretim-Kurum-Sinavi-1196`;
var sleep2 = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
var decodeEntities = (value) => value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&uuml;/g, "\xFC").replace(/&Uuml;/g, "\xDC").replace(/&ouml;/g, "\xF6").replace(/&Ouml;/g, "\xD6").replace(/&ccedil;/g, "\xE7").replace(/&Ccedil;/g, "\xC7").replace(/&scedil;|&#351;/g, "\u015F").replace(/&#350;/g, "\u015E").replace(/&#287;/g, "\u011F").replace(/&#286;/g, "\u011E").replace(/&#305;/g, "\u0131").replace(/&#304;/g, "\u0130");
var parseTurkishPrice = (raw) => {
  const normalized = raw.trim().replace(/\./g, "").replace(",", ".");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : void 0;
};
var PRODUCT_TITLE_PATTERN = /href="([^"]+_(\d+)\.html)"\s+title="([^"]+)"/;
var PUBLISHER_PATTERN = /class="dmarka"><a href="[^"]+" title="([^"]+)"/;
var IMAGE_PATTERN = /<img src="([^"]+)"/;
var CATEGORY_LINK_PATTERN = /class="top_cat(\d+)"><a href="(https:\/\/www\.kitapisler\.com\/[^"]+)" title="([^"]+)"/g;
var YKS_CATEGORY_KEYWORDS = ["tyt", "ayt", "yks"];
var isYksCategory = (title, url) => {
  const haystack = `${title} ${url}`.toLocaleLowerCase("tr");
  return YKS_CATEGORY_KEYWORDS.some((keyword) => haystack.includes(keyword));
};
var SUBJECT_KEYWORDS = [
  { subject: "T\xFCrk\xE7e", patterns: ["t\xFCrk\xE7e", "turkce"] },
  { subject: "Matematik", patterns: ["matematik"] },
  { subject: "Fizik", patterns: ["fizik"] },
  { subject: "Kimya", patterns: ["kimya"] },
  { subject: "Biyoloji", patterns: ["biyoloji"] },
  { subject: "Tarih", patterns: ["tarih"] },
  { subject: "Co\u011Frafya", patterns: ["co\u011Frafya", "cografya"] },
  { subject: "Felsefe", patterns: ["felsefe"] },
  { subject: "Din K\xFClt\xFCr\xFC", patterns: ["din k\xFClt\xFCr", "din kultur"] },
  { subject: "Edebiyat", patterns: ["edebiyat"] },
  { subject: "Sosyal", patterns: ["sosyal bilim"] },
  { subject: "Fen", patterns: ["fen bilim"] }
];
var inferSubjectFromTitle = (title) => {
  const normalized = title.toLocaleLowerCase("tr");
  return SUBJECT_KEYWORDS.find((entry) => entry.patterns.some((pattern) => normalized.includes(pattern)))?.subject;
};
var HeuristicHtmlExtractor = class {
  extractProducts(html, categoryUrl, categoryTitle) {
    const products = [];
    const chunks = html.split('<div class="listingProduct">').slice(1);
    const subjectLabel = inferSubjectFromTitle(categoryTitle);
    const seen = /* @__PURE__ */ new Set();
    for (const chunk of chunks) {
      const titleMatch = chunk.match(PRODUCT_TITLE_PATTERN);
      if (!titleMatch) continue;
      const [, hrefRaw, productId, rawTitle] = titleMatch;
      if (seen.has(productId)) continue;
      seen.add(productId);
      const publisherMatch = chunk.match(PUBLISHER_PATTERN);
      const imageMatch = chunk.match(IMAGE_PATTERN);
      const discountPriceMatch = chunk.match(new RegExp(`id="divdiscountprice${productId}"[^>]*>\\s*<span id="pric">([\\d.,]+)</span>`));
      const basePriceMatch = chunk.match(new RegExp(`id="divprice${productId}"><span id="pric">([\\d.,]+)</span>`));
      const priceMatch = discountPriceMatch ?? basePriceMatch;
      const url = hrefRaw.startsWith("http") ? hrefRaw : `${BASE_URL}/${hrefRaw}`;
      products.push({
        source: "kitapisler",
        sourceProductId: productId,
        sourceUrl: url,
        rawName: decodeEntities(rawTitle).trim(),
        rawPublisher: publisherMatch ? decodeEntities(publisherMatch[1]).trim() : void 0,
        rawCategory: categoryTitle || categoryUrl,
        rawImageUrl: imageMatch ? imageMatch[1].startsWith("http") ? imageMatch[1] : `${BASE_URL}/${imageMatch[1].replace(/^\//, "")}` : void 0,
        rawPrice: priceMatch ? parseTurkishPrice(priceMatch[1]) : void 0,
        rawCurrency: "TRY",
        rawMetadata: subjectLabel ? { subjectLabel, examLabel: categoryTitle } : { examLabel: categoryTitle }
      });
    }
    return products;
  }
  extractCategoryLinks(html) {
    const links = [];
    const seen = /* @__PURE__ */ new Set();
    const pattern = new RegExp(CATEGORY_LINK_PATTERN.source, "g");
    let match;
    while (match = pattern.exec(html)) {
      const [, id, url, rawTitle] = match;
      if (seen.has(id)) continue;
      seen.add(id);
      const title = decodeEntities(rawTitle).trim();
      if (isYksCategory(title, url)) links.push({ url, title });
    }
    return links;
  }
};
async function isCrawlingAllowed() {
  try {
    const response = await fetch(`${BASE_URL}/robots.txt`);
    if (!response.ok) return true;
    const text2 = await response.text();
    const blanketDisallow = /User-agent:\s*\*[\s\S]*?Disallow:\s*\/\s*$/im.test(text2);
    return !blanketDisallow;
  } catch {
    return true;
  }
}
async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal, headers: { "User-Agent": "PusulaYKS-ResourceCatalogBot/1.0 (+https://github.com/)" } });
  } finally {
    clearTimeout(timer);
  }
}
var KitapIslerSource = class {
  constructor(seedUrls = [DEFAULT_SEED_URL], extractor = new HeuristicHtmlExtractor(), config = resourceCatalogConfig.importer) {
    this.extractor = extractor;
    this.config = config;
    this.queue = seedUrls.map((url) => ({ url, title: "" }));
  }
  name = "kitapisler";
  queue;
  visited = /* @__PURE__ */ new Set();
  productsSeen = 0;
  robotsChecked = false;
  robotsAllowed = true;
  async fetchPage(page) {
    if (!this.robotsChecked) {
      this.robotsAllowed = await isCrawlingAllowed();
      this.robotsChecked = true;
    }
    if (!this.robotsAllowed) {
      console.warn("[ResourceCatalog] kitapisler.com robots.txt disallows crawling \u2014 aborting.");
      return { products: [], hasMore: false };
    }
    if (page >= this.config.maxPages || this.productsSeen >= this.config.maxProducts || this.queue.length === 0) {
      return { products: [], hasMore: false };
    }
    const next = this.queue.shift();
    if (this.visited.has(next.url)) return { products: [], hasMore: this.queue.length > 0 };
    this.visited.add(next.url);
    if (page > 0) await sleep2(this.config.delayMs);
    let lastError;
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const response = await fetchWithTimeout(next.url, this.config.timeoutMs);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const html = await response.text();
        const products = this.extractor.extractProducts(html, next.url, next.title).slice(0, Math.max(0, this.config.maxProducts - this.productsSeen));
        this.productsSeen += products.length;
        for (const category of this.extractor.extractCategoryLinks(html)) {
          if (!this.visited.has(category.url) && !this.queue.some((entry) => entry.url === category.url)) {
            this.queue.push(category);
          }
        }
        return { products, hasMore: this.queue.length > 0 && this.productsSeen < this.config.maxProducts };
      } catch (error) {
        lastError = error;
        if (attempt < this.config.maxRetries) await sleep2(this.config.delayMs * 2 ** attempt);
      }
    }
    console.warn(`[ResourceCatalog] kitapisler fetch failed for ${next.url}:`, lastError);
    return { products: [], hasMore: this.queue.length > 0 };
  }
};

// server/resourceCatalog/scheduler.ts
var runInFlight = false;
async function runResourceCatalogSyncOnce() {
  if (runInFlight) return { alreadyRunning: true };
  runInFlight = true;
  try {
    const source = new KitapIslerSource();
    const classifier = new HybridDifficultyClassifier(new RuleBasedDifficultyClassifier(), new LlmDifficultyClassifier());
    const pipeline = new ResourceCatalogImportPipeline(source, catalogDb, classifier);
    const stats = await pipeline.run({ limit: resourceCatalogConfig.scheduler.limitPerRun });
    console.log(
      `[ResourceCatalog Scheduler] kitapisler.com senkronu tamamland\u0131: ${stats.fetched} taranan, ${stats.created} yeni, ${stats.updated} g\xFCncellendi, ${stats.failed} hata.`
    );
    return { alreadyRunning: false, ...stats };
  } catch (error) {
    console.error("[ResourceCatalog Scheduler] senkron ba\u015Far\u0131s\u0131z:", error);
    throw error;
  } finally {
    runInFlight = false;
  }
}

// server/_core/app.ts
function createApiApp() {
  const app2 = express2();
  registerWebhookRoutes(app2);
  app2.use(express2.json({ limit: "50mb" }));
  app2.use(express2.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app2);
  registerOAuthRoutes(app2);
  registerDevAuthRoutes(app2);
  app2.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  app2.get("/api/cron/resource-catalog-sync", async (req, res) => {
    const secret = process.env.CRON_SECRET;
    if (secret && req.headers.authorization !== `Bearer ${secret}`) {
      res.status(401).json({ ok: false, error: "unauthorized" });
      return;
    }
    if (!resourceCatalogConfig.scheduler.enabled) {
      res.json({ ok: true, result: { disabled: true } });
      return;
    }
    try {
      const result = await runResourceCatalogSyncOnce();
      res.json({ ok: true, result });
    } catch (error) {
      res.status(500).json({ ok: false, error: error instanceof Error ? error.message : "unknown error" });
    }
  });
  return app2;
}

// server/subscriptions/seedPlans.ts
var DEFAULT_PLANS = [
  { code: "FREE", name: "\xDCcretsiz", description: "Temel \xE7al\u0131\u015Fma takibi, konu haritas\u0131 ve odak zamanlay\u0131c\u0131.", tier: "free", billingPeriod: "none", price: 0, trialDays: 0 },
  { code: "PREMIUM_MONTHLY", name: "Premium (Ayl\u0131k)", description: "AI \xE7al\u0131\u015Fma plan\u0131, OCR deneme aktar\u0131m\u0131, geli\u015Fmi\u015F raporlar.", tier: "premium", billingPeriod: "monthly", price: 14900, trialDays: 10 },
  { code: "PREMIUM_YEARLY", name: "Premium (Y\u0131ll\u0131k)", description: "AI \xE7al\u0131\u015Fma plan\u0131, OCR deneme aktar\u0131m\u0131, geli\u015Fmi\u015F raporlar \u2014 y\u0131ll\u0131k.", tier: "premium", billingPeriod: "yearly", price: 119900, trialDays: 10 }
];
async function seedSubscriptionPlans() {
  for (const plan of DEFAULT_PLANS) {
    await upsertPlan(plan);
  }
}

// server/_core/vercelHandler.ts
process.on("unhandledRejection", (reason) => {
  console.error("[vercelHandler] Yakalanmam\u0131\u015F promise reddi:", reason);
});
var app = createApiApp();
seedSubscriptionPlans().catch((error) => {
  console.error("[vercelHandler] seedSubscriptionPlans ba\u015Far\u0131s\u0131z (DATABASE_URL kontrol et):", error);
});
var vercelHandler_default = app;
export {
  vercelHandler_default as default
};
