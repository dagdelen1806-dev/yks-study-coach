var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/resourceCatalog/normalizers/turkishText.ts
var turkishLowerCase, DIACRITIC_MAP, foldTurkishDiacritics, normalizeForComparison, ALLOWED_LETTER_CLASS, normalizeKeepingTurkish, slugify2, tokenize;
var init_turkishText = __esm({
  "server/resourceCatalog/normalizers/turkishText.ts"() {
    "use strict";
    turkishLowerCase = (value) => value.replace(/İ/g, "i").replace(/I/g, "\u0131").toLowerCase();
    DIACRITIC_MAP = {
      \u00E7: "c",
      \u011F: "g",
      \u0131: "i",
      \u00F6: "o",
      \u015F: "s",
      \u00FC: "u"
    };
    foldTurkishDiacritics = (value) => value.replace(/[çğıöşü]/g, (char) => DIACRITIC_MAP[char] ?? char);
    normalizeForComparison = (value) => foldTurkishDiacritics(turkishLowerCase(value)).replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
    ALLOWED_LETTER_CLASS = "a-z\xE7\u011F\u0131\xF6\u015F\xFC\xE2\xEE\xFB";
    normalizeKeepingTurkish = (value) => turkishLowerCase(value).replace(/['’‘"“”]/g, "").replace(new RegExp(`[^${ALLOWED_LETTER_CLASS}0-9\\s]`, "g"), " ").replace(/\s+/g, " ").trim();
    slugify2 = (value) => {
      const folded = normalizeForComparison(value);
      return folded.replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    };
    tokenize = (value) => normalizeKeepingTurkish(value).split(" ").filter(Boolean);
  }
});

// server/resourceCatalog/normalizers/publisherNormalizer.ts
var publisherNormalizer_exports = {};
__export(publisherNormalizer_exports, {
  normalizePublisherName: () => normalizePublisherName
});
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
var PUBLISHER_ALIASES, suffixTitleCase;
var init_publisherNormalizer = __esm({
  "server/resourceCatalog/normalizers/publisherNormalizer.ts"() {
    "use strict";
    init_turkishText();
    PUBLISHER_ALIASES = {
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
    suffixTitleCase = (value) => value.split(" ").filter(Boolean).map((word) => word.charAt(0).toLocaleUpperCase("tr-TR") + word.slice(1).toLocaleLowerCase("tr-TR")).join(" ");
  }
});

// server/_core/vercelHandler.ts
import "dotenv/config";

// server/_core/app.ts
import express2 from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";
var APPROVAL_PENDING_ERR_MSG = "Account approval pending (10003)";
var APPROVAL_REJECTED_ERR_MSG = "Account approval rejected (10004)";
var PREMIUM_REQUIRED_ERR_MSG = "Premium subscription required (10005)";
var RATE_LIMITED_ERR_MSG = "Too many requests (10006)";
var EMAIL_UNVERIFIED_ERR_MSG = "Email verification required (10007)";
var EMAIL_VERIFICATION_RESEND_COOLDOWN_MS = 6e4;
var EMAIL_VERIFICATION_TOKEN_TTL_MS = 60 * 60 * 1e3;
var needsEmailVerification = (user) => user.loginMethod === "dev_email" && !user.emailVerifiedAt;

// server/_core/localAuth.ts
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { eq as eq3 } from "drizzle-orm";

// drizzle/schema.ts
import { customType, decimal, index, int, mediumtext, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";
var users = mysqlTable("users", {
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
  // Kapak OCR'ından (öğrenci onayladıktan sonra). ISBN varsa mükerrer kitap
  // tespitinde en güçlü kimliktir; yoksa yayınevi + normalize ad + yazar.
  authors: varchar("authors", { length: 300 }),
  isbn: varchar("isbn", { length: 32 }),
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
var userBookContents = mysqlTable("user_book_contents", {
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
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (table) => ({
  userBookIdx: index("user_book_contents_user_book_idx").on(table.userId, table.bookId),
  userTopicIdx: index("user_book_contents_user_topic_idx").on(table.userId, table.topicId)
}));
var mediumBlob = customType({ dataType: () => "mediumblob" });
var notes = mysqlTable("notes", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => ({
  userClientUnique: uniqueIndex("notes_user_client_unique").on(table.userId, table.clientId),
  userDateIdx: index("notes_user_date_idx").on(table.userId, table.noteDate),
  userTopicIdx: index("notes_user_topic_idx").on(table.userId, table.topicId),
  userBookIdx: index("notes_user_book_idx").on(table.userId, table.bookId),
  userSessionIdx: index("notes_user_session_idx").on(table.userId, table.studySessionId),
  userReviewIdx: index("notes_user_review_idx").on(table.userId, table.reviewAt)
}));
var noteTags = mysqlTable("note_tags", {
  id: int("id").autoincrement().primaryKey(),
  noteId: int("noteId").notNull(),
  userId: int("userId").notNull(),
  tag: varchar("tag", { length: 40 }).notNull()
}, (table) => ({
  noteTagUnique: uniqueIndex("note_tags_note_tag_unique").on(table.noteId, table.tag),
  userTagIdx: index("note_tags_user_tag_idx").on(table.userId, table.tag)
}));
var noteAttachments = mysqlTable("note_attachments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  noteId: int("noteId"),
  kind: mysqlEnum("kind", ["image", "audio"]).notNull(),
  mimeType: varchar("mimeType", { length: 60 }).notNull(),
  byteSize: int("byteSize").notNull(),
  data: mediumBlob("data").notNull(),
  durationSec: int("durationSec"),
  ocrText: text("ocrText"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (table) => ({
  userNoteIdx: index("note_attachments_user_note_idx").on(table.userId, table.noteId)
}));
var ocrPageCache = mysqlTable("ocr_page_cache", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  imageHash: varchar("imageHash", { length: 64 }).notNull(),
  pipelineVersion: varchar("pipelineVersion", { length: 16 }).notNull(),
  resultJson: mediumtext("resultJson").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (table) => ({
  userHashUnique: uniqueIndex("ocr_page_cache_user_hash_unique").on(table.userId, table.imageHash, table.pipelineVersion)
}));
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
  // "Zayıf konular için kitapları otomatik planla" — varsayılan KAPALI: kitap
  // görevleri yalnızca önerilir, öğrenci açıkça seçmeden plana girmez.
  autoScheduleBookTasks: int("autoScheduleBookTasks").default(0).notNull(),
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

// server/db.ts
import { and, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

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

// shared/bookIdentity.ts
function normalizeIsbn(value) {
  const compact = (value ?? "").toUpperCase().replace(/ISBN(-1[03])?:?/g, "").replace(/[^0-9X]/g, "");
  if (compact.length === 13 && /^\d{13}$/.test(compact)) {
    const sum = compact.split("").reduce((total, digit, index2) => total + Number(digit) * (index2 % 2 === 0 ? 1 : 3), 0);
    return sum % 10 === 0 ? compact : null;
  }
  if (compact.length === 10 && /^\d{9}[\dX]$/.test(compact)) {
    const sum = compact.split("").reduce((total, char, index2) => total + (char === "X" ? 10 : Number(char)) * (10 - index2), 0);
    if (sum % 11 !== 0) return null;
    const body = `978${compact.slice(0, 9)}`;
    const check2 = (10 - body.split("").reduce((total, digit, index2) => total + Number(digit) * (index2 % 2 === 0 ? 1 : 3), 0) % 10) % 10;
    return `${body}${check2}`;
  }
  return null;
}

// shared/curriculum.ts
var TYT = {
  T\u00FCrk\u00E7e: {
    "S\xF6zc\xFCk ve C\xFCmle Anlam\u0131": [
      { topic: "S\xF6zc\xFCkte Anlam", aliases: ["s\xF6zc\xFCk anlam\u0131", "s\xF6z \xF6beklerinde anlam", "deyim ve atas\xF6zleri"] },
      { topic: "C\xFCmlede Anlam", aliases: ["c\xFCmle anlam\u0131", "c\xFCmle yorumu"] }
    ],
    Paragraf: [
      { topic: "Paragrafta Anlat\u0131m Bi\xE7imleri ve D\xFC\u015F\xFCnceyi Geli\u015Ftirme Yollar\u0131", aliases: ["paragrafta anlat\u0131m", "par\xE7ada anlat\u0131m", "anlat\u0131m bi\xE7imleri", "anlat\u0131m teknikleri", "d\xFC\u015F\xFCnceyi geli\u015Ftirme yollar\u0131"] },
      { topic: "Paragrafta Konu ve Ana D\xFC\u015F\xFCnce", aliases: ["paragrafta konu", "paragrafta ana d\xFC\u015F\xFCnce", "ana d\xFC\u015F\xFCnce", "ana fikir", "par\xE7ada konu", "konu ba\u015Fl\u0131k soru"] },
      { topic: "Paragrafta Yard\u0131mc\u0131 D\xFC\u015F\xFCnce", aliases: ["yard\u0131mc\u0131 d\xFC\u015F\xFCnce", "yard\u0131mc\u0131 fikir", "par\xE7ada yard\u0131mc\u0131 d\xFC\u015F\xFCnce"] },
      { topic: "Paragraf\u0131n Yap\u0131s\u0131", aliases: ["paragrafta yap\u0131", "paragraf\u0131n ak\u0131\u015F\u0131", "ak\u0131\u015F\u0131 bozan c\xFCmle", "paragraf olu\u015Fturma", "c\xFCmle yerle\u015Ftirme", "giri\u015F geli\u015Fme sonu\xE7"] },
      { topic: "Paragrafta Anlam ve Yorum", legacySlug: "tyt-tr-paragraf", aliases: ["paragrafta anlam", "par\xE7ada anlam", "ki\u015Fi \xF6zellikleri", "paragraf\u0131 par\xE7alara b\xF6lerek anlama", "par\xE7alara b\xF6lerek anlama", "yeni nesil anlam", "metin yorumlama", "paragraftan \xE7\u0131kar\u0131m"] }
    ],
    "Dil Bilgisi": [
      "Ses Bilgisi",
      { topic: "Yaz\u0131m Kurallar\u0131", aliases: ["imla kurallar\u0131"] },
      { topic: "Noktalama \u0130\u015Faretleri", aliases: ["noktalama"] },
      { topic: "S\xF6zc\xFCkte Yap\u0131", aliases: ["k\xF6k ve ekler", "yap\u0131m ekleri", "\xE7ekim ekleri"] },
      { topic: "\u0130simler", aliases: ["adlar", "isim tamlamalar\u0131"] },
      { topic: "S\u0131fatlar", aliases: ["\xF6nadlar", "s\u0131fat tamlamalar\u0131"] },
      { topic: "Zamirler", aliases: ["ad\u0131llar"] },
      { topic: "Zarflar", aliases: ["belirte\xE7ler"] },
      { topic: "Edat, Ba\u011Fla\xE7 ve \xDCnlem", aliases: ["edatlar", "ba\u011Fla\xE7lar", "\xFCnlemler"] },
      { topic: "Fiiller", aliases: ["fiilde anlam", "fiil kip ve ki\u015Fi", "kip ve ki\u015Fi ekleri"] },
      { topic: "Ek Fiil", aliases: ["ek eylem"] },
      { topic: "Fiilimsiler", aliases: ["eylemsiler", "fiilimsi"] },
      { topic: "Fiilde \xC7at\u0131", aliases: ["eylemde \xE7at\u0131", "\xE7at\u0131"] },
      { topic: "C\xFCmlenin \xD6geleri", aliases: ["c\xFCmle \xF6geleri", "\xF6\u011Feler"] },
      { topic: "C\xFCmle T\xFCrleri", aliases: ["c\xFCmle \xE7e\u015Fitleri"] },
      { topic: "Anlat\u0131m Bozukluklar\u0131", aliases: ["anlat\u0131m bozuklu\u011Fu"] }
    ]
  },
  Matematik: {
    "Say\u0131lar": [
      // Başlangıç kitapları konuları daha ince böler ("Toplama ve Çıkarma İşlemi", "Ondalık Gösterim"…); takma adlar onları doğru üst konuya bağlar.
      { topic: "Temel Kavramlar", aliases: ["toplama ve \xE7\u0131karma i\u015Flemi", "\xE7arpma ve b\xF6lme i\u015Flemi", "d\xF6rt i\u015Flem", "i\u015Flem \xF6nceli\u011Fi", "say\u0131 k\xFCmeleri", "say\u0131lar"] },
      "Say\u0131 Basamaklar\u0131",
      { topic: "B\xF6lme ve B\xF6l\xFCnebilme", aliases: ["b\xF6l\xFCnebilme kurallar\u0131"] },
      { topic: "EBOB - EKOK", aliases: ["ebob ekok", "obeb okek"] },
      { topic: "Rasyonel Say\u0131lar", aliases: ["ondal\u0131k g\xF6sterim", "ondal\u0131k say\u0131lar", "kesirler", "kesirli say\u0131lar"] },
      "Basit E\u015Fitsizlikler",
      "Mutlak De\u011Fer",
      { topic: "\xDCsl\xFC Say\u0131lar", aliases: ["\xFCsl\xFC ifadeler"] },
      { topic: "K\xF6kl\xFC Say\u0131lar", aliases: ["k\xF6kl\xFC ifadeler"] },
      "\xC7arpanlara Ay\u0131rma",
      { topic: "Oran - Orant\u0131", aliases: ["oran orant\u0131", "oran ve orant\u0131"] },
      { topic: "Denklem \xC7\xF6zme", aliases: ["basit denklem \xE7\xF6z\xFCm\xFC", "birinci dereceden denklemler", "rasyonel denklemlerin \xE7\xF6z\xFCm\xFC", "iki bilinmeyenli denklemler", "harfli ifadeler", "cebirsel ifadeler"] }
    ],
    Problemler: [
      "Say\u0131 Problemleri",
      "Kesir Problemleri",
      "Ya\u015F Problemleri",
      "Y\xFCzde Problemleri",
      { topic: "K\xE2r - Zarar Problemleri", aliases: ["kar zarar problemleri"] },
      "Kar\u0131\u015F\u0131m Problemleri",
      "Hareket Problemleri",
      "\u0130\u015F\xE7i Problemleri",
      { topic: "Tablo ve Grafik Problemleri", aliases: ["grafik problemleri"] },
      { topic: "Rutin Olmayan Problemler", aliases: ["yeni nesil problemler", "mant\u0131ksal ak\u0131l y\xFCr\xFCtme"] }
    ],
    "Cebir ve Veri": [
      "K\xFCmeler",
      "Mant\u0131k",
      { topic: "Fonksiyonlar (TYT)", aliases: ["fonksiyon"] },
      "Polinomlar",
      { topic: "\u0130kinci Dereceden Denklemler", aliases: ["2. dereceden denklemler"] },
      "Perm\xFCtasyon",
      "Kombinasyon",
      "Olas\u0131l\u0131k",
      { topic: "Veri ve \u0130statistik", aliases: ["istatistik", "veri analizi"] }
    ]
  },
  Geometri: {
    "\xDC\xE7genler": [
      { topic: "Do\u011Fruda ve \xDC\xE7gende A\xE7\u0131lar", aliases: ["\xFC\xE7gende a\xE7\u0131lar", "do\u011Fruda a\xE7\u0131lar"] },
      "Dik \xDC\xE7gen",
      "\u0130kizkenar ve E\u015Fkenar \xDC\xE7gen",
      "\xDC\xE7gende Alan",
      "\xDC\xE7gende Benzerlik",
      "A\xE7\u0131ortay",
      "Kenarortay"
    ],
    "\xC7okgenler ve D\xF6rtgenler": ["\xC7okgenler", "D\xF6rtgenler", "Yamuk", "Paralelkenar", "E\u015Fkenar D\xF6rtgen", "Dikd\xF6rtgen", "Kare"],
    "\xC7ember ve Analitik": ["\xC7ember ve Daire", { topic: "Noktan\u0131n ve Do\u011Frunun Analiti\u011Fi", aliases: ["analitik geometri"] }, "Kat\u0131 Cisimler"]
  },
  Fizik: {
    "Fizik": [
      "Fizik Bilimine Giri\u015F",
      "Madde ve \xD6zellikleri",
      "Hareket ve Kuvvet",
      "\u0130\u015F, G\xFC\xE7 ve Enerji",
      { topic: "Is\u0131, S\u0131cakl\u0131k ve Genle\u015Fme", aliases: ["\u0131s\u0131 ve s\u0131cakl\u0131k"] },
      "Elektrostatik",
      { topic: "Elektrik Ak\u0131m\u0131 ve Devreler", aliases: ["elektrik devreleri", "elektrik ak\u0131m\u0131"] },
      "Manyetizma",
      { topic: "Bas\u0131n\xE7 ve Kald\u0131rma Kuvveti", aliases: ["bas\u0131n\xE7", "kald\u0131rma kuvveti"] },
      "Dalgalar",
      "Optik"
    ]
  },
  Kimya: {
    "Kimya": [
      "Kimya Bilimi",
      { topic: "Atom ve Periyodik Sistem", aliases: ["periyodik sistem", "atom modelleri"] },
      "Kimyasal T\xFCrler Aras\u0131 Etkile\u015Fimler",
      "Maddenin Halleri",
      "Do\u011Fa ve Kimya",
      "Kimyan\u0131n Temel Kanunlar\u0131",
      "Mol Kavram\u0131",
      "Kimyasal Tepkimeler",
      "Kar\u0131\u015F\u0131mlar",
      { topic: "Asitler, Bazlar ve Tuzlar", aliases: ["asit baz tuz"] },
      "Kimya Her Yerde"
    ]
  },
  Biyoloji: {
    "Biyoloji": [
      "Canl\u0131lar\u0131n Ortak \xD6zellikleri",
      "Canl\u0131lar\u0131n Temel Bile\u015Fenleri",
      { topic: "H\xFCcre ve Organeller", aliases: ["h\xFCcre"] },
      "H\xFCcre Zar\u0131ndan Madde Ge\xE7i\u015Fi",
      "Canl\u0131lar\u0131n S\u0131n\u0131fland\u0131r\u0131lmas\u0131",
      { topic: "H\xFCcre B\xF6l\xFCnmeleri", aliases: ["mitoz", "mayoz", "mitoz ve mayoz"] },
      { topic: "Kal\u0131t\u0131m", aliases: ["kal\u0131t\u0131m\u0131n genel ilkeleri"] },
      "Ekosistem Ekolojisi",
      "G\xFCncel \xC7evre Sorunlar\u0131"
    ]
  },
  Tarih: {
    "Tarih": [
      "Tarih ve Zaman",
      "\u0130nsanl\u0131\u011F\u0131n \u0130lk D\xF6nemleri",
      "Orta \xC7a\u011F'da D\xFCnya",
      "\u0130lk ve Orta \xC7a\u011Flarda T\xFCrk D\xFCnyas\u0131",
      "\u0130slam Medeniyetinin Do\u011Fu\u015Fu",
      "\u0130lk T\xFCrk-\u0130slam Devletleri",
      "Sel\xE7uklu T\xFCrkiyesi",
      "Beylikten Devlete Osmanl\u0131",
      "D\xFCnya G\xFCc\xFC Osmanl\u0131",
      "De\u011Fi\u015Fen D\xFCnya Dengeleri Kar\u015F\u0131s\u0131nda Osmanl\u0131",
      "Uluslararas\u0131 \u0130li\u015Fkilerde Denge Stratejisi (1774-1914)",
      "XX. Y\xFCzy\u0131l Ba\u015Flar\u0131nda Osmanl\u0131 ve D\xFCnya",
      { topic: "Milli M\xFCcadele", aliases: ["kurtulu\u015F sava\u015F\u0131"] },
      { topic: "Atat\xFCrk\xE7\xFCl\xFCk ve T\xFCrk \u0130nk\u0131lab\u0131", aliases: ["atat\xFCrk ilke ve ink\u0131laplar\u0131", "ink\u0131lap tarihi"] }
    ]
  },
  Co\u011Frafya: {
    "Co\u011Frafya": [
      "Do\u011Fa ve \u0130nsan",
      "D\xFCnya'n\u0131n \u015Eekli ve Hareketleri",
      "Co\u011Frafi Konum",
      "Harita Bilgisi",
      { topic: "Atmosfer ve \u0130klim", aliases: ["iklim bilgisi"] },
      "\u0130\xE7 ve D\u0131\u015F Kuvvetler",
      "Su, Toprak ve Bitkiler",
      "N\xFCfus",
      "G\xF6\xE7",
      "Yerle\u015Fme",
      "Ekonomik Faaliyetler",
      "B\xF6lgeler",
      "Uluslararas\u0131 Ula\u015F\u0131m Hatlar\u0131",
      "Do\u011Fal Afetler",
      "\xC7evre ve Toplum"
    ]
  },
  Felsefe: {
    "Felsefe": [
      "Felsefeye Giri\u015F",
      "Bilgi Felsefesi",
      "Varl\u0131k Felsefesi",
      "Ahlak Felsefesi",
      "Sanat Felsefesi",
      "Din Felsefesi",
      "Siyaset Felsefesi",
      "Bilim Felsefesi",
      { topic: "Felsefe Tarihi", aliases: ["m\xF6 6 y\xFCzy\u0131l ms 2 y\xFCzy\u0131l felsefesi", "ms 2 y\xFCzy\u0131l ms 15 y\xFCzy\u0131l felsefesi", "15 17 y\xFCzy\u0131l felsefesi", "18 19 y\xFCzy\u0131l felsefesi", "20 y\xFCzy\u0131l felsefesi"] }
    ]
  },
  "Din K\xFClt\xFCr\xFC": {
    "Din K\xFClt\xFCr\xFC": ["Bilgi ve \u0130nan\xE7", "Din ve \u0130slam", "\u0130slam ve \u0130badet", "Gen\xE7lik ve De\u011Ferler", "Allah \u0130nsan \u0130li\u015Fkisi", "Hz. Muhammed", "Vahiy ve Ak\u0131l", "\u0130slam D\xFC\u015F\xFCncesinde Yorumlar"]
  }
};
var AYT = {
  Matematik: {
    "Cebir": [
      { topic: "Fonksiyonlar", legacySlug: "ayt-mat-fonksiyon", aliases: ["fonksiyon"] },
      "Polinomlar",
      { topic: "\u0130kinci Dereceden Denklemler ve E\u015Fitsizlikler", aliases: ["e\u015Fitsizlikler"] },
      "Parabol",
      "Karma\u015F\u0131k Say\u0131lar",
      "Logaritma",
      "Diziler",
      { topic: "Perm\xFCtasyon, Kombinasyon ve Binom", aliases: ["binom"] },
      "Olas\u0131l\u0131k"
    ],
    "Trigonometri": ["Trigonometri"],
    "Analiz": [{ topic: "Limit ve S\xFCreklilik", aliases: ["limit"] }, "T\xFCrev", { topic: "\u0130ntegral", legacySlug: "ayt-mat-integral" }]
  },
  Geometri: {
    "Geometri": ["D\xF6n\xFC\u015F\xFCm Geometrisi", { topic: "Do\u011Frunun Analitik \u0130ncelenmesi", aliases: ["analitik geometri"] }, "\xC7emberin Analitik \u0130ncelenmesi", "\xC7ember ve Daire", "Kat\u0131 Cisimler"]
  },
  Fizik: {
    "Mekanik": [
      "Vekt\xF6rler",
      "Ba\u011F\u0131l Hareket",
      "Newton'un Hareket Yasalar\u0131",
      "Bir Boyutta Sabit \u0130vmeli Hareket",
      "At\u0131\u015Flar",
      { topic: "\u0130\u015F, Enerji ve Momentum", aliases: ["itme ve momentum"] },
      "Tork ve Denge",
      "K\xFCtle Merkezi",
      "Basit Makineler",
      { topic: "\xC7embersel Hareket", aliases: ["d\xFCzg\xFCn \xE7embersel hareket"] },
      "Basit Harmonik Hareket"
    ],
    "Elektrik ve Manyetizma": [
      "Elektrik Alan ve Potansiyel",
      { topic: "Paralel Levhalar ve S\u0131\u011Fa", aliases: ["s\u0131\u011Fa\xE7lar"] },
      { topic: "Manyetizma ve Elektromanyetik \u0130nd\xFCksiyon", aliases: ["ind\xFCksiyon"] },
      "Alternatif Ak\u0131m ve Transformat\xF6rler"
    ],
    "Dalgalar ve Modern Fizik": ["Dalga Mekani\u011Fi", "Atom Fizi\u011Fi ve Radyoaktivite", "Modern Fizik"]
  },
  Kimya: {
    "Kimya": [
      "Modern Atom Teorisi",
      "Gazlar",
      { topic: "S\u0131v\u0131 \xC7\xF6zeltiler ve \xC7\xF6z\xFCn\xFCrl\xFCk", aliases: ["\xE7\xF6zeltiler"] },
      "Kimyasal Tepkimelerde Enerji",
      "Kimyasal Tepkimelerde H\u0131z",
      "Kimyasal Denge",
      "Asit-Baz Dengesi",
      "\xC7\xF6z\xFCn\xFCrl\xFCk Dengesi",
      { topic: "Kimya ve Elektrik", aliases: ["elektrokimya"] },
      "Karbon Kimyas\u0131na Giri\u015F",
      "Organik Bile\u015Fikler",
      "Enerji Kaynaklar\u0131 ve Bilimsel Geli\u015Fmeler"
    ]
  },
  Biyoloji: {
    "\u0130nsan Fizyolojisi": [
      "Sinir Sistemi",
      { topic: "Endokrin Sistem", aliases: ["hormonlar"] },
      "Duyu Organlar\u0131",
      "Destek ve Hareket Sistemi",
      "Sindirim Sistemi",
      "Dola\u015F\u0131m ve Ba\u011F\u0131\u015F\u0131kl\u0131k Sistemi",
      "Solunum Sistemi",
      "Bo\u015Falt\u0131m Sistemi",
      "\xDCreme Sistemi ve Embriyonik Geli\u015Fim"
    ],
    "Genetik ve Enerji": [
      "N\xFCkleik Asitler ve Genetik \u015Eifre",
      "Protein Sentezi",
      { topic: "Canl\u0131l\u0131k ve Enerji", aliases: ["fotosentez", "h\xFCcresel solunum", "kemosentez"] },
      "Bitki Biyolojisi"
    ],
    "Ekoloji": ["Kom\xFCnite ve Pop\xFClasyon Ekolojisi", "Canl\u0131lar ve \xC7evre"]
  },
  Edebiyat: {
    "Edebiyat Bilgisi": ["G\xFCzel Sanatlar ve Edebiyat", "Metinlerin S\u0131n\u0131fland\u0131r\u0131lmas\u0131", { topic: "\u015Eiir Bilgisi", aliases: ["naz\u0131m birimi", "\xF6l\xE7\xFC", "uyak", "redif"] }, "Edebi Sanatlar", "Edebi Ak\u0131mlar"],
    "T\xFCrk Edebiyat\u0131 D\xF6nemleri": [
      "\u0130slamiyet \xD6ncesi T\xFCrk Edebiyat\u0131",
      "Ge\xE7i\u015F D\xF6nemi T\xFCrk Edebiyat\u0131",
      { topic: "Divan Edebiyat\u0131", aliases: ["klasik t\xFCrk edebiyat\u0131"] },
      "Halk Edebiyat\u0131",
      "Tanzimat Edebiyat\u0131",
      "Servet-i F\xFCnun Edebiyat\u0131",
      "Fecr-i Ati Edebiyat\u0131",
      "Milli Edebiyat",
      "Cumhuriyet D\xF6nemi T\xFCrk Edebiyat\u0131",
      "D\xFCnya Edebiyat\u0131"
    ]
  },
  Tarih: {
    "Tarih": [
      "Osmanl\u0131 K\xFClt\xFCr ve Medeniyeti",
      "XX. Y\xFCzy\u0131lda D\xFCnya",
      "\u0130kinci D\xFCnya Sava\u015F\u0131",
      "So\u011Fuk Sava\u015F D\xF6nemi",
      "Yumu\u015Fama D\xF6nemi ve Sonras\u0131",
      "K\xFCreselle\u015Fen D\xFCnya",
      "T\xFCrk D\u0131\u015F Politikas\u0131"
    ]
  },
  Co\u011Frafya: {
    "Co\u011Frafya": ["Ekosistem", "N\xFCfus Politikalar\u0131", "T\xFCrkiye'de Ekonomi", "T\xFCrkiye'nin \u0130\u015Flevsel B\xF6lgeleri", "K\xFCresel Ticaret", "\xDClkeler ve B\xF6lgeler", "\xC7evre Sorunlar\u0131"]
  },
  Felsefe: {
    "Felsefe Grubu": ["Mant\u0131k", "Psikoloji", "Sosyoloji"]
  }
};
var slugPart = (value) => value.replace(/İ/g, "i").replace(/I/g, "\u0131").toLowerCase().replace(/[çğıöşüâîû]/g, (char) => ({ \u00E7: "c", \u011F: "g", \u0131: "i", \u00F6: "o", \u015F: "s", \u00FC: "u", \u00E2: "a", \u00EE: "i", \u00FB: "u" })[char] ?? char).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
function flatten(exam, tree) {
  return Object.entries(tree).flatMap(
    ([subject, units]) => Object.entries(units).flatMap(
      ([unit, entries]) => entries.map((entry) => {
        const def = typeof entry === "string" ? { topic: entry } : entry;
        return {
          slug: def.legacySlug ?? `cur-${exam.toLowerCase()}-${slugPart(subject)}-${slugPart(def.topic)}`.slice(0, 120),
          exam,
          subject,
          unit,
          topic: def.topic,
          aliases: def.aliases ?? []
        };
      })
    )
  );
}
var CURRICULUM = [...flatten("TYT", TYT), ...flatten("AYT", AYT)];
var isCurriculumOnlySlug = (slug) => slug.startsWith("cur-");

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
  return rows.map((row) => ({ id: row.bookId, title: row.title, publisher: row.publisher, subject: row.subject, exam: row.exam, level: row.level, format: row.format, reason: row.reason, sourceUrl: row.sourceUrl || "", pageCount: row.pageCount ?? void 0, tone: row.tone, authors: row.authors ?? void 0, isbn: row.isbn ?? void 0 }));
}
async function addUserResourceBooks(userId, inputs) {
  const db = await getDb();
  if (!db || inputs.length === 0) return [];
  await db.insert(userResourceBooks).values(inputs.map((book) => ({ userId, bookId: book.id, title: book.title, publisher: book.publisher, subject: book.subject, exam: book.exam, level: book.level, format: book.format, reason: book.reason, sourceUrl: book.sourceUrl ?? null, pageCount: book.pageCount ?? null, tone: book.tone, authors: book.authors?.trim() || null, isbn: normalizeIsbn(book.isbn) })));
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
  if (existing[0].sourceBookId) {
    const pages = existing[0].targetPages?.match(/(\d+)\s*[-–]\s*(\d+)/);
    const tests = existing[0].targetTests?.match(/(\d+)(?:\s*[-–]\s*(\d+))?/);
    await db.insert(bookStudyLogs).values({
      userId,
      bookId: existing[0].sourceBookId,
      topic: existing[0].topic,
      sessionDate: completedAt,
      minutes: actualMinutes,
      questions: actualQuestions,
      correct,
      wrong,
      blank,
      pageStart: pages ? Number(pages[1]) : null,
      pageEnd: pages ? Number(pages[2]) : null,
      testStart: tests ? Number(tests[1]) : null,
      testEnd: tests ? Number(tests[2] ?? tests[1]) : null
    });
  }
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
  await ensureCurriculumSeeded(db);
  topicCatalogSeeded = true;
}
async function ensureCurriculumSeeded(db) {
  const present = new Set((await db.select({ slug: yksTopics.slug }).from(yksTopics)).map((row) => row.slug));
  const missing = CURRICULUM.filter((def) => !present.has(def.slug));
  if (missing.length === 0) return;
  await db.insert(yksTopics).values(missing.map((def) => ({ slug: def.slug, exam: def.exam, subject: def.subject, topic: def.topic, unit: def.unit }))).onDuplicateKeyUpdate({ set: { slug: sql`slug` } });
}
async function findOrCreateTopic(db, exam, subject, topic) {
  const existing = await db.select().from(yksTopics).where(and(eq(yksTopics.subject, subject), eq(yksTopics.topic, topic))).orderBy(sql`${yksTopics.exam} = ${exam} DESC`, yksTopics.id).limit(1);
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
  return catalog.filter((topic) => !isCurriculumOnlySlug(topic.slug) || byTopicId.has(topic.id)).map((topic) => {
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
  return {
    httpOnly: true,
    path: "/",
    // Uygulama ve API aynı kökende (ör. yks-study-coach.vercel.app) çalışır;
    // çerezin başka sitelerden gelen isteklere eklenmesine gerek yok. `Lax`
    // CSRF'e karşı da koruma sağlar ve http'de (yerel geliştirme) de kabul edilir.
    sameSite: "lax",
    secure: isSecureRequest(req)
  };
}

// server/_core/emailVerification.ts
import { eq as eq2 } from "drizzle-orm";
import { SignJWT as SignJWT2, errors as joseErrors, jwtVerify as jwtVerify2 } from "jose";

// server/_core/emails/verifyEmail.ts
var escapeHtml = (value) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
function buildVerifyEmail({ to, name, verifyUrl, expiresInMinutes }) {
  const greeting = name ? `Merhaba ${name},` : "Merhaba,";
  const subject = "Pusula YKS hesab\u0131n\u0131 do\u011Frula";
  const text2 = [
    greeting,
    "",
    "Pusula YKS'ye ho\u015F geldin! Hesab\u0131n\u0131 kullanmaya ba\u015Flamak i\xE7in e-posta adresini do\u011Frulaman gerekiyor.",
    "",
    `E-postam\u0131 do\u011Frula: ${verifyUrl}`,
    "",
    `Bu ba\u011Flant\u0131 ${expiresInMinutes} dakika ge\xE7erlidir. S\xFCresi dolarsa uygulamadan yeni bir do\u011Frulama maili isteyebilirsin.`,
    "",
    "Bu hesab\u0131 sen olu\u015Fturmad\u0131ysan bu maili g\xF6rmezden gelebilirsin; adresin onays\u0131z bir hesaba ba\u011Flanmaz.",
    "",
    "\u2014 Pusula YKS \xB7 Ki\u015Fisel \xE7al\u0131\u015Fma ko\xE7u"
  ].join("\n");
  const safeUrl = escapeHtml(verifyUrl);
  const html = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f7f5ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2333;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">Hesab\u0131n\u0131 kullanmaya ba\u015Flamak i\xE7in e-posta adresini do\u011Frula.</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f5ef;">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
      <tr><td style="padding:0 4px 20px 4px;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="width:36px;height:36px;border-radius:10px;background:#1f2333;color:#ffffff;font-size:17px;font-weight:700;text-align:center;vertical-align:middle;">P</td>
          <td style="padding-left:10px;font-size:15px;font-weight:700;color:#1f2333;">Pusula YKS</td>
        </tr></table>
      </td></tr>
      <tr><td style="background:#ffffff;border-radius:20px;padding:32px 28px;border:1px solid #ebe8df;">
        <h1 style="margin:0 0 12px 0;font-size:21px;line-height:1.3;font-weight:700;color:#1f2333;">Hesab\u0131n\u0131 do\u011Frula</h1>
        <p style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:#4a4c57;">${escapeHtml(greeting)}</p>
        <p style="margin:0 0 24px 0;font-size:14px;line-height:1.6;color:#4a4c57;">Pusula YKS'ye ho\u015F geldin! Hesab\u0131n\u0131 kullanmaya ba\u015Flamak i\xE7in e-posta adresini (<strong style="color:#1f2333;">${escapeHtml(to)}</strong>) do\u011Frulaman gerekiyor.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td align="center">
          <a href="${safeUrl}" style="display:inline-block;background:#3b5ccc;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 28px;border-radius:12px;">E-postam\u0131 Do\u011Frula</a>
        </td></tr></table>
        <p style="margin:24px 0 0 0;font-size:12px;line-height:1.6;color:#8b8c95;">Bu ba\u011Flant\u0131 <strong>${expiresInMinutes} dakika</strong> ge\xE7erlidir. S\xFCresi dolarsa uygulamadan yeni bir do\u011Frulama maili isteyebilirsin.</p>
        <p style="margin:12px 0 0 0;font-size:12px;line-height:1.6;color:#8b8c95;">Buton \xE7al\u0131\u015Fmazsa bu adresi taray\u0131c\u0131na yap\u0131\u015Ft\u0131r:<br><a href="${safeUrl}" style="color:#3b5ccc;word-break:break-all;">${safeUrl}</a></p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;"><tr>
          <td style="background:#f7f5ef;border-radius:12px;padding:12px 14px;font-size:12px;line-height:1.6;color:#6b6d77;">\u{1F512} Bu hesab\u0131 sen olu\u015Fturmad\u0131ysan bu maili g\xF6rmezden gelebilirsin; adresin onays\u0131z bir hesaba ba\u011Flanmaz. Pusula YKS senden asla \u015Fifreni e-postayla istemez.</td>
        </tr></table>
      </td></tr>
      <tr><td align="center" style="padding:20px 8px 0 8px;font-size:11px;line-height:1.6;color:#9a9ba3;">Pusula YKS \xB7 Ki\u015Fisel \xE7al\u0131\u015Fma ko\xE7u<br>Bu mail, hesab\u0131n olu\u015Fturuldu\u011Fu i\xE7in otomatik g\xF6nderildi.</td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
  return { to, subject, html, text: text2 };
}

// server/_core/env.ts
var ENV = {
  // Oturum çerezlerini imzalar (server/_core/session.ts) — production'da uzun, rastgele olmalı.
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  // Virgülle ayrılmış e-posta/telefon listesi (ör. "ben@ornek.com,05551234567").
  // Bu tanımlayıcılarla kayıt olan/giriş yapan hesap (e-postası doğrulanınca)
  // otomatik admin + onaylı olur (bkz. server/_core/localAuth.ts).
  adminLogins: (process.env.ADMIN_LOGINS ?? "").split(",").map((value) => value.trim()).filter(Boolean),
  // E-posta doğrulaması (bkz. server/_core/mailer.ts, emailVerification.ts).
  // APP_URL: doğrulama linklerinin kök adresi (ör. https://yks-study-coach.vercel.app).
  // Production'da set edilmeli — yoksa istekteki Host başlığına düşülür.
  appUrl: (process.env.APP_URL ?? "").replace(/\/+$/, ""),
  // Mail sağlayıcısı: hangi anahtar tanımlıysa o kullanılır (ikisi birden varsa Brevo).
  brevoApiKey: process.env.BREVO_API_KEY ?? "",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  mailFrom: process.env.MAIL_FROM ?? "",
  // Yapay zekâ (kitap/deneme fotoğrafı okuma, AI plan, not AI, ses → metin):
  // OpenAI uyumlu herhangi bir sağlayıcı (bkz. server/_core/llm.ts).
  //   LLM_API_KEY (ya da OPENAI_API_KEY) — zorunlu
  //   LLM_API_URL — varsayılan https://api.openai.com/v1
  //     (Gemini: https://generativelanguage.googleapis.com/v1beta/openai)
  //   LLM_MODEL — görsel okuyabilen bir model; varsayılan gpt-4o-mini
  //   TRANSCRIBE_MODEL — ses → metin modeli; varsayılan whisper-1 (Gemini'de yok)
  llmApiKey: process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || "",
  llmApiUrl: (process.env.LLM_API_URL ?? "").replace(/\/+$/, ""),
  llmModel: process.env.LLM_MODEL ?? "",
  transcribeModel: process.env.TRANSCRIBE_MODEL ?? "",
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

// server/_core/loginIdentifier.ts
import { createHash } from "node:crypto";
var DEV_OPEN_ID_PREFIX = "dev_local_";
var DEV_EMAIL_OPEN_ID_PREFIX = "dev_email_";
var DEV_PHONE_OPEN_ID_PREFIX = "dev_phone_";
var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function normalizePhone(raw) {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) digits = `90${digits.slice(1)}`;
  else if (digits.length === 10 && digits.startsWith("5")) digits = `90${digits}`;
  return digits.length >= 10 && digits.length <= 15 ? digits : null;
}
var slugifyName = (value) => value.toLocaleLowerCase("tr").replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
function parseIdentifier(raw) {
  const trimmed = raw.trim().slice(0, 320);
  if (!trimmed) return null;
  if (trimmed.includes("@")) {
    const email = trimmed.toLowerCase();
    if (!EMAIL_PATTERN.test(email)) return null;
    const hash = createHash("sha256").update(email).digest("hex").slice(0, 40);
    return { kind: "email", value: email, openId: `${DEV_EMAIL_OPEN_ID_PREFIX}${hash}` };
  }
  if (/^[\d\s()+-]+$/.test(trimmed)) {
    const phone = normalizePhone(trimmed);
    if (!phone) return null;
    return { kind: "phone", value: phone, openId: `${DEV_PHONE_OPEN_ID_PREFIX}${phone}` };
  }
  const name = trimmed.slice(0, 120);
  return { kind: "legacyName", value: name, openId: `${DEV_OPEN_ID_PREFIX}${slugifyName(name) || "ogrenci"}` };
}
function phoneFromOpenId(openId) {
  return openId.startsWith(DEV_PHONE_OPEN_ID_PREFIX) ? `+${openId.slice(DEV_PHONE_OPEN_ID_PREFIX.length)}` : null;
}
function isAdminLogin(openId, adminLogins = ENV.adminLogins) {
  return adminLogins.some((login) => {
    const parsed = parseIdentifier(login);
    return parsed !== null && parsed.kind !== "legacyName" && parsed.openId === openId;
  });
}

// server/_core/mailer.ts
var MailNotConfiguredError = class extends Error {
  constructor(detail = "") {
    super(`MAIL_NOT_CONFIGURED${detail ? `: ${detail}` : ""}`);
    this.name = "MailNotConfiguredError";
  }
};
function parseMailFrom(value) {
  const trimmed = value.trim();
  const withName = trimmed.match(/^(.*?)\s*<\s*([^<>\s]+@[^<>\s]+)\s*>$/);
  if (withName) return { ...withName[1].trim() ? { name: withName[1].trim().replace(/^"|"$/g, "") } : {}, email: withName[2] };
  return /^[^\s@<>]+@[^\s@<>]+$/.test(trimmed) ? { email: trimmed } : null;
}
async function assertOk(provider, response) {
  if (response.ok) return;
  const detail = await response.text().catch(() => "");
  throw new Error(`${provider} send failed (${response.status}): ${detail.slice(0, 300)}`);
}
async function sendWithBrevo(mail) {
  const sender = parseMailFrom(ENV.mailFrom);
  if (!sender) throw new MailNotConfiguredError("MAIL_FROM must be Brevo's verified sender, e.g. Pusula YKS <ben@gmail.com>");
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": ENV.brevoApiKey, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ sender, to: [{ email: mail.to }], subject: mail.subject, htmlContent: mail.html, textContent: mail.text })
  });
  await assertOk("Brevo", response);
}
async function sendWithResend(mail) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${ENV.resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: ENV.mailFrom || "Pusula YKS <onboarding@resend.dev>", to: [mail.to], subject: mail.subject, html: mail.html, text: mail.text })
  });
  await assertOk("Resend", response);
}
async function sendMail(mail) {
  if (ENV.brevoApiKey) return sendWithBrevo(mail);
  if (ENV.resendApiKey) return sendWithResend(mail);
  if (ENV.isProduction) throw new MailNotConfiguredError("set BREVO_API_KEY or RESEND_API_KEY");
  console.info(`[Mail:dev] To: ${mail.to}
Subject: ${mail.subject}

${mail.text}`);
}

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

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/session.ts
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var SESSION_ISSUER_TAG = "pusula";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var secretKey = () => new TextEncoder().encode(ENV.cookieSecret);
async function createSessionToken(openId, options = {}) {
  const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
  return new SignJWT({ openId, appId: SESSION_ISSUER_TAG, name: options.name || "" }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(Math.floor((Date.now() + expiresInMs) / 1e3)).sign(secretKey());
}
async function verifySession(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    const { openId, name } = payload;
    if (!isNonEmptyString(openId) || !isNonEmptyString(name)) return null;
    return { openId, name };
  } catch {
    return null;
  }
}
function readSessionToken(req) {
  const fromCookie = req.headers.cookie ? parseCookieHeader(req.headers.cookie)[COOKIE_NAME] : void 0;
  if (fromCookie) return fromCookie;
  const header = req.headers.authorization;
  return typeof header === "string" && header.startsWith("Bearer ") ? header.slice(7) : void 0;
}
async function authenticateRequest(req) {
  const session = await verifySession(readSessionToken(req));
  if (!session) throw ForbiddenError("Invalid session cookie");
  const user = await getUserByOpenId(session.openId);
  if (!user) throw ForbiddenError("User not found");
  await upsertUser({ openId: user.openId, lastSignedIn: /* @__PURE__ */ new Date() });
  return user;
}

// server/_core/emailVerification.ts
var TOKEN_AUDIENCE = "email-verify";
var TOKEN_PURPOSE = "email_verify";
var RESEND_HOURLY_MAX = 5;
var secretKey2 = () => new TextEncoder().encode(ENV.cookieSecret);
async function createVerificationToken(user, ttlMs = EMAIL_VERIFICATION_TOKEN_TTL_MS) {
  return new SignJWT2({ purpose: TOKEN_PURPOSE, uid: user.id, email: user.email }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setAudience(TOKEN_AUDIENCE).setIssuedAt().setExpirationTime(Math.floor((Date.now() + ttlMs) / 1e3)).sign(secretKey2());
}
async function readVerificationToken(token) {
  try {
    const { payload } = await jwtVerify2(token, secretKey2(), { algorithms: ["HS256"], audience: TOKEN_AUDIENCE });
    if (payload.purpose !== TOKEN_PURPOSE || typeof payload.uid !== "number" || typeof payload.email !== "string") return { status: "invalid" };
    return { status: "valid", userId: payload.uid, email: payload.email };
  } catch (error) {
    return { status: error instanceof joseErrors.JWTExpired ? "expired" : "invalid" };
  }
}
async function verifyEmailToken(token) {
  const check2 = await readVerificationToken(token);
  if (check2.status !== "valid") return check2.status;
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [user] = await db.select().from(users).where(eq2(users.id, check2.userId)).limit(1);
  if (!user || user.loginMethod !== "dev_email" || user.email !== check2.email) return "invalid";
  if (user.emailVerifiedAt) return "already";
  const grantAdmin = isAdminLogin(user.openId);
  await db.update(users).set({ emailVerifiedAt: /* @__PURE__ */ new Date(), ...grantAdmin ? { role: "admin", approvalStatus: "approved", approvedAt: user.approvedAt ?? /* @__PURE__ */ new Date() } : {} }).where(eq2(users.id, user.id));
  return "success";
}
function appBaseUrl(req) {
  if (ENV.appUrl) return ENV.appUrl;
  const forwardedProto = req.headers["x-forwarded-proto"];
  const proto = (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto)?.split(",")[0]?.trim() || req.protocol;
  return `${proto}://${req.headers["x-forwarded-host"] ?? req.headers.host}`;
}
async function sendVerificationEmail(user, req) {
  if (user.loginMethod !== "dev_email" || !user.email) return { status: "not_required" };
  if (user.emailVerifiedAt) return { status: "already_verified" };
  const sinceLast = user.emailVerificationSentAt ? Date.now() - new Date(user.emailVerificationSentAt).getTime() : Infinity;
  if (sinceLast < EMAIL_VERIFICATION_RESEND_COOLDOWN_MS) return { status: "cooldown", retryAfterMs: EMAIL_VERIFICATION_RESEND_COOLDOWN_MS - sinceLast };
  try {
    checkRateLimit(`email-verify:${user.id}`, RESEND_HOURLY_MAX, 60 * 60 * 1e3);
  } catch (error) {
    if (error instanceof RateLimitExceededError) return { status: "cooldown", retryAfterMs: error.retryAfterMs };
    throw error;
  }
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(users).set({ emailVerificationSentAt: /* @__PURE__ */ new Date() }).where(eq2(users.id, user.id));
  try {
    const token = await createVerificationToken(user);
    const verifyUrl = `${appBaseUrl(req)}/api/email/verify?token=${encodeURIComponent(token)}`;
    await sendMail(buildVerifyEmail({ to: user.email, name: user.name, verifyUrl, expiresInMinutes: Math.round(EMAIL_VERIFICATION_TOKEN_TTL_MS / 6e4) }));
  } catch (error) {
    await db.update(users).set({ emailVerificationSentAt: user.emailVerificationSentAt }).where(eq2(users.id, user.id));
    throw error;
  }
  return { status: "sent" };
}
function registerEmailVerificationRoutes(app2) {
  app2.get("/api/email/verify", async (req, res) => {
    const token = typeof req.query.token === "string" ? req.query.token : "";
    let outcome;
    try {
      outcome = token ? await verifyEmailToken(token) : "invalid";
    } catch (error) {
      console.error("[EmailVerification] verify failed:", error instanceof Error ? error.message : error);
      outcome = "error";
    }
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.redirect(302, `${appBaseUrl(req)}/?emailVerification=${outcome}`);
  });
  app2.post("/api/email/change", async (req, res) => {
    try {
      let user;
      try {
        user = await authenticateRequest(req);
      } catch {
        res.status(401).json({ error: "Oturumun sona ermi\u015F. L\xFCtfen tekrar giri\u015F yap." });
        return;
      }
      if (user.loginMethod !== "dev_email" || user.emailVerifiedAt) {
        res.status(400).json({ error: "Do\u011Frulanm\u0131\u015F bir hesab\u0131n e-posta adresi buradan de\u011Fi\u015Ftirilemez." });
        return;
      }
      try {
        checkRateLimit(`email-change:${user.id}`, 5, 60 * 60 * 1e3);
      } catch {
        res.status(429).json({ error: "\xC7ok fazla deneme yapt\u0131n. Biraz sonra tekrar dener misin?" });
        return;
      }
      const identifier = parseIdentifier(typeof req.body?.email === "string" ? req.body.email : "");
      if (!identifier || identifier.kind !== "email") {
        res.status(400).json({ error: "Ge\xE7erli bir e-posta adresi yaz (\xF6r. ece@ornek.com)." });
        return;
      }
      if (identifier.openId === user.openId) {
        res.status(400).json({ error: "Bu zaten kay\u0131tl\u0131 e-posta adresin." });
        return;
      }
      const db = await getDb();
      if (!db) {
        res.status(503).json({ error: "Veritaban\u0131 ba\u011Flant\u0131s\u0131 yok." });
        return;
      }
      const [taken] = await db.select({ id: users.id }).from(users).where(eq2(users.openId, identifier.openId)).limit(1);
      if (taken) {
        res.status(409).json({ error: "Bu e-posta adresi ba\u015Fka bir hesapta kay\u0131tl\u0131." });
        return;
      }
      await db.update(users).set({ openId: identifier.openId, email: identifier.value, emailVerificationSentAt: null }).where(eq2(users.id, user.id));
      const updated = { ...user, openId: identifier.openId, email: identifier.value, emailVerificationSentAt: null };
      const sessionToken = await createSessionToken(updated.openId, { name: updated.name ?? identifier.value, expiresInMs: ONE_YEAR_MS });
      res.cookie(COOKIE_NAME, sessionToken, { ...getSessionCookieOptions(req), maxAge: ONE_YEAR_MS });
      const sent = await sendVerificationEmail(updated, req).catch((error) => {
        console.error("[EmailVerification] send after change failed:", error instanceof Error ? error.message : error);
        return null;
      });
      res.json({ success: true, email: identifier.value, mailSent: sent?.status === "sent" });
    } catch (error) {
      console.error("[EmailVerification] change failed:", error instanceof Error ? error.message : error);
      res.status(500).json({ error: "E-posta adresi de\u011Fi\u015Ftirilemedi, tekrar dener misin?" });
    }
  });
}

// server/_core/localAuth.ts
var SCRYPT_KEY_LENGTH = 64;
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
var MIN_NEW_PASSWORD_LENGTH = 8;
var PasswordChangeError = class extends Error {
};
async function changeLocalPassword(userId, currentPassword, newPassword) {
  if (newPassword.length < MIN_NEW_PASSWORD_LENGTH) throw new PasswordChangeError(`Yeni \u015Fifre en az ${MIN_NEW_PASSWORD_LENGTH} karakter olmal\u0131.`);
  if (newPassword === currentPassword) throw new PasswordChangeError("Yeni \u015Fifre mevcut \u015Fifreyle ayn\u0131 olamaz.");
  const db = await getDb();
  if (!db) throw new PasswordChangeError("Veritaban\u0131 ba\u011Flant\u0131s\u0131 yok.");
  const [user] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq3(users.id, userId)).limit(1);
  if (!user?.passwordHash) throw new PasswordChangeError("Bu hesap \u015Fifreyle giri\u015F yapm\u0131yor; \u015Fifresi buradan de\u011Fi\u015Ftirilemez.");
  if (!verifyPassword(currentPassword, user.passwordHash)) throw new PasswordChangeError("Mevcut \u015Fifre hatal\u0131.");
  await db.update(users).set({ passwordHash: hashPassword(newPassword) }).where(eq3(users.id, userId));
}
function registerLocalAuthRoutes(app2) {
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const rawIdentifier = typeof req.body?.identifier === "string" ? req.body.identifier : "";
      const rawName = typeof req.body?.name === "string" ? req.body.name.trim().slice(0, 120) : "";
      const password = typeof req.body?.password === "string" ? req.body.password : "";
      const mode = req.body?.mode === "register" ? "register" : "login";
      if (!rawIdentifier.trim()) {
        res.status(400).json({ error: "E-posta adresini veya telefon numaran\u0131 yazmal\u0131s\u0131n." });
        return;
      }
      if (password.length < 4) {
        res.status(400).json({ error: "\u015Eifre en az 4 karakter olmal\u0131." });
        return;
      }
      const identifier = parseIdentifier(rawIdentifier);
      if (!identifier || mode === "register" && identifier.kind === "legacyName") {
        res.status(400).json({ error: "Ge\xE7erli bir e-posta adresi (\xF6r. ece@ornek.com) ya da telefon numaras\u0131 (\xF6r. 0555 123 45 67) yaz." });
        return;
      }
      if (mode === "register" && !rawName) {
        res.status(400).json({ error: "Ad\u0131n\u0131 yazmal\u0131s\u0131n." });
        return;
      }
      const db = await getDb();
      if (!db) {
        res.status(503).json({ error: "Veritaban\u0131 ba\u011Flant\u0131s\u0131 yok." });
        return;
      }
      const { openId } = identifier;
      const existing = await db.select().from(users).where(eq3(users.openId, openId)).limit(1);
      const identifierLabel = identifier.kind === "phone" ? "telefon numaras\u0131" : "e-posta adresi";
      if (mode === "register" && existing[0]) {
        res.status(409).json({ error: `Bu ${identifierLabel} zaten kay\u0131tl\u0131. "Giri\u015F yap" sekmesini kullan\u0131r m\u0131s\u0131n?` });
        return;
      }
      if (mode === "login" && !existing[0]) {
        res.status(404).json({ error: `Bu ${identifierLabel} ile bir hesap bulunamad\u0131. \xD6nce "Kay\u0131t ol" sekmesinden hesap olu\u015Ftur.` });
        return;
      }
      const grantAdmin = isAdminLogin(openId) && (identifier.kind === "phone" || Boolean(existing[0]?.emailVerifiedAt));
      let displayName = rawName;
      if (existing[0]) {
        if (!existing[0].passwordHash || !verifyPassword(password, existing[0].passwordHash)) {
          res.status(401).json({ error: "E-posta/telefon veya \u015Fifre hatal\u0131." });
          return;
        }
        displayName = existing[0].name ?? identifier.value;
        await db.update(users).set({ lastSignedIn: /* @__PURE__ */ new Date(), ...grantAdmin ? { role: "admin", approvalStatus: "approved", approvedAt: existing[0].approvedAt ?? /* @__PURE__ */ new Date() } : {} }).where(eq3(users.id, existing[0].id));
      } else {
        await db.insert(users).values({
          openId,
          name: rawName,
          email: identifier.kind === "email" ? identifier.value : null,
          loginMethod: identifier.kind === "phone" ? "dev_phone" : "dev_email",
          passwordHash: hashPassword(password),
          ...grantAdmin ? { role: "admin", approvalStatus: "approved", approvedAt: /* @__PURE__ */ new Date() } : { approvalStatus: "pending" },
          lastSignedIn: /* @__PURE__ */ new Date()
        });
      }
      const sessionToken = await createSessionToken(openId, { name: displayName, expiresInMs: ONE_YEAR_MS });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      let verificationMailSent = false;
      if (!existing[0] && identifier.kind === "email") {
        const [created] = await db.select().from(users).where(eq3(users.openId, openId)).limit(1);
        if (created) {
          verificationMailSent = await sendVerificationEmail(created, req).then((outcome) => outcome.status === "sent").catch((error) => {
            console.error("[Auth] Verification mail failed:", error instanceof Error ? error.message : error);
            return false;
          });
        }
      }
      res.json({ success: true, name: displayName, isNewAccount: !existing[0], verificationMailSent });
    } catch (error) {
      console.error("[Auth] Sign-in failed:", error);
      res.status(500).json({ error: "Giri\u015F yap\u0131lamad\u0131, tekrar dener misin?" });
    }
  });
}

// server/notes/attachmentStorage.ts
import { and as and2, eq as eq4, inArray, isNull as isNull2, lt as lt2, sql as sql2 } from "drizzle-orm";

// server/notes/config.ts
var notesConfig = {
  content: {
    /** Tek bir notun JSON içeriğinin en büyük boyutu (çizim noktaları dahil). */
    maxContentBytes: 900 * 1024,
    maxTitleLength: 200,
    maxTagsPerNote: 12
  },
  attachments: {
    /** İstemci fotoğrafı ~1600 px JPEG'e küçültür; sunucu yine de sınırlar. */
    imageMaxBytes: 900 * 1024,
    /** ~10 dk Opus/WebM ses kaydı. */
    audioMaxBytes: 3 * 1024 * 1024,
    /** Kullanıcı başına toplam ek boyutu (veritabanında tutulduğu için sıkı). */
    perUserQuotaBytes: 60 * 1024 * 1024,
    /** Hiçbir nota bağlanmamış (kaydedilmeden bırakılmış) ek bu süreden sonra silinir. */
    orphanTtlMs: 24 * 60 * 60 * 1e3,
    imageMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    audioMimeTypes: ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav"]
  },
  speech: {
    /** "whisper": sağlayıcının /audio/transcriptions uç noktası. İstemci, sunucu kullanılamazsa tarayıcının kendi dikte özelliğine düşebilir. */
    provider: "whisper",
    language: "tr",
    prompt: "T\xFCrk\xE7e bir YKS \xF6\u011Frencisinin ders notu. Noktalama i\u015Faretlerini do\u011Fru kullan.",
    maxAudioSeconds: 600
  },
  ai: {
    /** AI'ya gönderilen not metninin üst sınırı (gizlilik + maliyet: yalnızca gerekenden fazlası gitmesin). */
    maxInputChars: 6e3
  },
  list: {
    pageSize: 30,
    snippetLength: 160
  },
  review: {
    /** "Tekrar tarihi" hızlı seçenekleri (gün). */
    presetsDays: [0, 3, 7, 14]
  },
  task: {
    defaultMinutes: 30
  }
};

// server/notes/attachmentStorage.ts
var AttachmentError = class extends Error {
};
var ascii = (bytes, start, end) => bytes.subarray(start, end).toString("ascii");
var SIGNATURES = [
  { mime: "image/jpeg", test: (b) => b[0] === 255 && b[1] === 216 && b[2] === 255 },
  { mime: "image/png", test: (b) => b[0] === 137 && ascii(b, 1, 4) === "PNG" },
  { mime: "image/webp", test: (b) => ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WEBP" },
  { mime: "audio/webm", test: (b) => b[0] === 26 && b[1] === 69 && b[2] === 223 && b[3] === 163 },
  { mime: "audio/ogg", test: (b) => ascii(b, 0, 4) === "OggS" },
  { mime: "audio/mp4", test: (b) => ascii(b, 4, 8) === "ftyp" },
  { mime: "audio/mpeg", test: (b) => ascii(b, 0, 3) === "ID3" || b[0] === 255 && (b[1] & 224) === 224 },
  { mime: "audio/wav", test: (b) => ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WAVE" }
];
function decodeAttachment(dataUrl, kind) {
  const match = /^data:([^;,]+)(?:;[^,]*)?;base64,([\s\S]+)$/.exec(dataUrl);
  if (!match) throw new AttachmentError("Ge\xE7ersiz dosya bi\xE7imi.");
  const mimeType = match[1].toLowerCase();
  const allowed = kind === "image" ? notesConfig.attachments.imageMimeTypes : notesConfig.attachments.audioMimeTypes;
  if (!allowed.includes(mimeType)) throw new AttachmentError(kind === "image" ? "Yaln\u0131zca JPG, PNG veya WEBP foto\u011Fraf eklenebilir." : "Bu ses bi\xE7imi desteklenmiyor.");
  const data = Buffer.from(match[2], "base64");
  if (data.byteLength === 0) throw new AttachmentError("Dosya bo\u015F.");
  const maxBytes = kind === "image" ? notesConfig.attachments.imageMaxBytes : notesConfig.attachments.audioMaxBytes;
  if (data.byteLength > maxBytes) throw new AttachmentError(kind === "image" ? "Foto\u011Fraf \xE7ok b\xFCy\xFCk; daha k\xFC\xE7\xFCk bir foto\u011Fraf dener misin?" : "Ses kayd\u0131 \xE7ok uzun; daha k\u0131sa bir kay\u0131t dener misin?");
  const signature = SIGNATURES.find((item) => item.mime === mimeType);
  if (!signature || !signature.test(data)) throw new AttachmentError("Dosya i\xE7eri\u011Fi bildirilen t\xFCrle e\u015Fle\u015Fmiyor.");
  return { mimeType, data };
}
async function requireDb() {
  const db = await getDb();
  if (!db) throw new AttachmentError("Veritaban\u0131 ba\u011Flant\u0131s\u0131 yok.");
  return db;
}
var databaseAttachmentStorage = {
  async put(userId, input) {
    const db = await requireDb();
    const used = await this.usageBytes(userId);
    if (used + input.data.byteLength > notesConfig.attachments.perUserQuotaBytes) {
      throw new AttachmentError("Defterindeki ek alan\u0131 doldu. Eski notlardaki baz\u0131 foto\u011Fraf/ses kay\u0131tlar\u0131n\u0131 silip tekrar dener misin?");
    }
    const result = await db.insert(noteAttachments).values({ userId, kind: input.kind, mimeType: input.mimeType, byteSize: input.data.byteLength, data: input.data, durationSec: input.durationSec ?? null });
    return { id: Number(result[0].insertId) };
  },
  async get(userId, id) {
    const db = await requireDb();
    const [row] = await db.select({ mimeType: noteAttachments.mimeType, data: noteAttachments.data, kind: noteAttachments.kind, noteId: noteAttachments.noteId }).from(noteAttachments).where(and2(eq4(noteAttachments.id, id), eq4(noteAttachments.userId, userId))).limit(1);
    return row ?? null;
  },
  async setOcrText(userId, id, text2) {
    const db = await requireDb();
    await db.update(noteAttachments).set({ ocrText: text2 }).where(and2(eq4(noteAttachments.id, id), eq4(noteAttachments.userId, userId)));
  },
  async syncNoteLinks(userId, noteId, referencedIds) {
    const db = await requireDb();
    await db.update(noteAttachments).set({ noteId: null }).where(and2(eq4(noteAttachments.userId, userId), eq4(noteAttachments.noteId, noteId)));
    if (referencedIds.length) {
      await db.update(noteAttachments).set({ noteId }).where(and2(eq4(noteAttachments.userId, userId), inArray(noteAttachments.id, referencedIds)));
    }
  },
  async deleteForNote(userId, noteId) {
    const db = await requireDb();
    await db.delete(noteAttachments).where(and2(eq4(noteAttachments.userId, userId), eq4(noteAttachments.noteId, noteId)));
  },
  async usageBytes(userId) {
    const db = await requireDb();
    const [row] = await db.select({ total: sql2`COALESCE(SUM(${noteAttachments.byteSize}), 0)` }).from(noteAttachments).where(eq4(noteAttachments.userId, userId));
    return Number(row?.total ?? 0);
  },
  async cleanupOrphans(userId) {
    const db = await requireDb();
    await db.delete(noteAttachments).where(and2(eq4(noteAttachments.userId, userId), isNull2(noteAttachments.noteId), lt2(noteAttachments.createdAt, new Date(Date.now() - notesConfig.attachments.orphanTtlMs))));
  }
};
var getAttachmentStorage = () => databaseAttachmentStorage;

// server/notes/attachmentRoutes.ts
function registerNoteAttachmentRoutes(app2) {
  app2.get("/api/notes/attachments/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).end();
      return;
    }
    let userId;
    try {
      userId = (await authenticateRequest(req)).id;
    } catch {
      res.status(401).end();
      return;
    }
    try {
      const attachment = await getAttachmentStorage().get(userId, id);
      if (!attachment) {
        res.status(404).end();
        return;
      }
      res.setHeader("Content-Type", attachment.mimeType);
      res.setHeader("Content-Length", String(attachment.data.byteLength));
      res.setHeader("Cache-Control", "private, max-age=3600");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Disposition", "inline");
      res.end(attachment.data);
    } catch (error) {
      console.error("[Notes] attachment read failed:", error instanceof Error ? error.message : error);
      res.status(500).end();
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
import { and as and3, desc as desc2, eq as eq5, gte as gte2, sql as sql3 } from "drizzle-orm";
async function listActivePlans() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subscriptionPlans).where(eq5(subscriptionPlans.isActive, 1));
}
async function getPlanByCode(code) {
  const db = await getDb();
  if (!db) return void 0;
  const rows = await db.select().from(subscriptionPlans).where(eq5(subscriptionPlans.code, code)).limit(1);
  return rows[0];
}
async function getPlanById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const rows = await db.select().from(subscriptionPlans).where(eq5(subscriptionPlans.id, id)).limit(1);
  return rows[0];
}
async function upsertPlan(input) {
  const db = await getDb();
  if (!db) return;
  const existing = await getPlanByCode(input.code);
  if (existing) {
    await db.update(subscriptionPlans).set({ name: input.name, description: input.description ?? null, tier: input.tier, billingPeriod: input.billingPeriod, price: input.price, currency: input.currency ?? "TRY", trialDays: input.trialDays ?? 0, storeProductId: input.storeProductId ?? null, provider: input.provider ?? null }).where(eq5(subscriptionPlans.id, existing.id));
    return;
  }
  await db.insert(subscriptionPlans).values({ code: input.code, name: input.name, description: input.description ?? null, tier: input.tier, billingPeriod: input.billingPeriod, price: input.price, currency: input.currency ?? "TRY", trialDays: input.trialDays ?? 0, storeProductId: input.storeProductId ?? null, provider: input.provider ?? null });
}
async function getSubscriptionByUserId(userId) {
  const db = await getDb();
  if (!db) return void 0;
  const rows = await db.select().from(subscriptions).where(eq5(subscriptions.userId, userId)).limit(1);
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
  }).from(subscriptions).innerJoin(users, eq5(users.id, subscriptions.userId)).innerJoin(subscriptionPlans, eq5(subscriptionPlans.id, subscriptions.planId)).orderBy(desc2(subscriptions.updatedAt));
}
async function updateSubscription(userId, patch) {
  const db = await getDb();
  if (!db) throw new Error("Veritaban\u0131 ba\u011Flant\u0131s\u0131 yok");
  await db.update(subscriptions).set(patch).where(eq5(subscriptions.userId, userId));
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
  await db.update(payments).set(patch).where(eq5(payments.id, paymentId));
}
async function listPaymentsForUser(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(payments).where(eq5(payments.userId, userId)).orderBy(desc2(payments.createdAt));
}
async function listAllPaymentsForAdmin(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: payments.id, userId: payments.userId, userName: users.name, userEmail: users.email, amount: payments.amount, currency: payments.currency, provider: payments.provider, status: payments.status, paymentType: payments.paymentType, providerPaymentId: payments.providerPaymentId, createdAt: payments.createdAt, paidAt: payments.paidAt }).from(payments).innerJoin(users, eq5(users.id, payments.userId)).orderBy(desc2(payments.createdAt)).limit(Math.min(500, Math.max(1, limit)));
}
async function isDuplicateEvent(provider, eventId) {
  const db = await getDb();
  if (!db) return false;
  const rows = await db.select({ id: paymentEvents.id, status: paymentEvents.status }).from(paymentEvents).where(and3(eq5(paymentEvents.provider, provider), eq5(paymentEvents.eventId, eventId))).limit(1);
  return rows.length > 0 && rows[0].status === "processed";
}
async function recordEventReceived(input) {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.insert(paymentEvents).values(input);
    return Number(result[0].insertId);
  } catch {
    const rows = await db.select({ id: paymentEvents.id }).from(paymentEvents).where(and3(eq5(paymentEvents.provider, input.provider), eq5(paymentEvents.eventId, input.eventId))).limit(1);
    return rows[0]?.id ?? null;
  }
}
async function markEventProcessed(id, status, errorMessage) {
  const db = await getDb();
  if (!db) return;
  await db.update(paymentEvents).set({ status, processedAt: /* @__PURE__ */ new Date(), errorMessage: errorMessage ?? null }).where(eq5(paymentEvents.id, id));
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
  return db.select().from(subscriptionAuditLogs).where(eq5(subscriptionAuditLogs.userId, userId)).orderBy(desc2(subscriptionAuditLogs.createdAt));
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
  const rows = await db.select({ id: featureUsageLogs.id }).from(featureUsageLogs).where(and3(eq5(featureUsageLogs.userId, userId), eq5(featureUsageLogs.featureKey, featureKey), gte2(featureUsageLogs.usedAt, since)));
  return rows.length;
}
async function resetFeatureUsage(userId, featureKey, windowDays, adminId) {
  const db = await getDb();
  if (!db) return;
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1e3);
  await db.delete(featureUsageLogs).where(and3(eq5(featureUsageLogs.userId, userId), eq5(featureUsageLogs.featureKey, featureKey), gte2(featureUsageLogs.usedAt, since)));
  await writeAuditLog({ userId, adminId, action: "usage_reset", newState: { featureKey, windowDays } });
}
async function listPendingUsers() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(users).where(eq5(users.approvalStatus, "pending")).orderBy(desc2(users.createdAt));
  return rows.map(({ passwordHash: _passwordHash, ...safeUser }) => ({ ...safeUser, phone: phoneFromOpenId(safeUser.openId) }));
}
async function approveUser(userId, adminId) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ approvalStatus: "approved", approvedAt: /* @__PURE__ */ new Date(), approvedBy: adminId, rejectedAt: null, rejectionReason: null }).where(eq5(users.id, userId));
  await writeAuditLog({ userId, adminId, action: "user_approved", newState: { approvalStatus: "approved" } });
}
async function rejectUser(userId, adminId, reason) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ approvalStatus: "rejected", rejectedAt: /* @__PURE__ */ new Date(), rejectionReason: reason ?? null }).where(eq5(users.id, userId));
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

// server/routers.ts
import { TRPCError as TRPCError7 } from "@trpc/server";

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/trpc.ts
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";

// shared/entitlements.ts
var FEATURE_KEYS = [
  "AI_STUDY_PLAN",
  "OCR_EXAM_IMPORT",
  "OCR_BOOK_IMPORT",
  "ADVANCED_ANALYTICS",
  "PLAN_ADHERENCE",
  "RESOURCE_RECOMMENDATIONS",
  "ADVANCED_REPORTS",
  "FOCUS_AURA_PREMIUM",
  "MOCK_EXAM_ANALYTICS",
  // Akıllı Defter: ses → metin, fotoğraftan metin, AI araçları (özet/flashcard...).
  "NOTE_VOICE",
  "NOTE_OCR",
  "NOTE_AI"
];
var TIER_FEATURES = {
  free: [],
  premium: ["AI_STUDY_PLAN", "OCR_EXAM_IMPORT", "OCR_BOOK_IMPORT", "ADVANCED_ANALYTICS", "PLAN_ADHERENCE", "RESOURCE_RECOMMENDATIONS", "ADVANCED_REPORTS", "FOCUS_AURA_PREMIUM", "MOCK_EXAM_ANALYTICS", "NOTE_VOICE", "NOTE_OCR", "NOTE_AI"],
  premium_plus: ["AI_STUDY_PLAN", "OCR_EXAM_IMPORT", "OCR_BOOK_IMPORT", "ADVANCED_ANALYTICS", "PLAN_ADHERENCE", "RESOURCE_RECOMMENDATIONS", "ADVANCED_REPORTS", "FOCUS_AURA_PREMIUM", "MOCK_EXAM_ANALYTICS", "NOTE_VOICE", "NOTE_OCR", "NOTE_AI"]
};
function featuresForTier(tier) {
  return TIER_FEATURES[tier] ?? [];
}
var FEATURE_USAGE_LIMITS = {
  AI_STUDY_PLAN: { windowDays: 30, maxUses: 60 },
  OCR_EXAM_IMPORT: { windowDays: 30, maxUses: 40 },
  OCR_BOOK_IMPORT: { windowDays: 30, maxUses: 40 },
  NOTE_VOICE: { windowDays: 30, maxUses: 300 },
  NOTE_OCR: { windowDays: 30, maxUses: 150 },
  NOTE_AI: { windowDays: 30, maxUses: 100 }
};
var FREE_TIER_LIMITS = {
  AI_STUDY_PLAN: { windowDays: 30, maxUses: 3 },
  OCR_EXAM_IMPORT: { windowDays: 30, maxUses: 2 },
  OCR_BOOK_IMPORT: { windowDays: 30, maxUses: 3 },
  // Defter herkesin temel aracı: ses → metin ücretsizde de makul ölçüde açık.
  NOTE_VOICE: { windowDays: 30, maxUses: 30 },
  NOTE_OCR: { windowDays: 30, maxUses: 10 },
  NOTE_AI: { windowDays: 30, maxUses: 5 }
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
var APPROVAL_GATE_ALLOWLIST = /* @__PURE__ */ new Set(["auth.me", "auth.logout", "auth.resendVerificationEmail"]);
var requireUser = t.middleware(async (opts) => {
  const { ctx, next, path: path2 } = opts;
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  if (!APPROVAL_GATE_ALLOWLIST.has(path2) && needsEmailVerification(ctx.user)) {
    throw new TRPCError({ code: "FORBIDDEN", message: EMAIL_UNVERIFIED_ERR_MSG });
  }
  if (!APPROVAL_GATE_ALLOWLIST.has(path2) && ctx.user.approvalStatus !== "approved") {
    const message = ctx.user.approvalStatus === "rejected" ? APPROVAL_REJECTED_ERR_MSG : APPROVAL_PENDING_ERR_MSG;
    throw new TRPCError({ code: "FORBIDDEN", message });
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
    if (!ctx.user || ctx.user.role !== "admin" || needsEmailVerification(ctx.user)) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
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
      const { ctx, next, path: path2 } = opts;
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
      try {
        checkRateLimit(`${ctx.user.id}:${path2}`, rateLimit.maxRequests, rateLimit.windowMs);
      } catch (error) {
        if (error instanceof RateLimitExceededError) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: RATE_LIMITED_ERR_MSG });
        throw error;
      }
      try {
        await assertUsageAvailable(ctx.user.id, feature);
      } catch (error) {
        if (error instanceof PremiumRequiredError) throw new TRPCError({ code: "FORBIDDEN", message: PREMIUM_REQUIRED_ERR_MSG });
        if (error instanceof UsageLimitExceededError) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: error.message });
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
  }))
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
var LlmUnavailableError = class extends Error {
  constructor(reason, message, status) {
    super(message);
    this.reason = reason;
    this.status = status;
    this.name = "LlmUnavailableError";
  }
};
var DEFAULT_LLM_API_URL = "https://api.openai.com/v1";
var DEFAULT_LLM_MODEL = "gpt-4o-mini";
var GEMINI_OPENAI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";
var DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
function normalizeLlmSettings(rawUrl, rawModel, key) {
  let baseUrl = (rawUrl || "").trim().replace(/\/+$/, "").replace(/\/chat\/completions$/, "").replace(/\/+$/, "");
  let model = (rawModel || "").trim().replace(/^models\//, "");
  const geminiKey = key.trim().startsWith("AIza");
  if (!baseUrl) baseUrl = geminiKey ? GEMINI_OPENAI_BASE_URL : DEFAULT_LLM_API_URL;
  if (baseUrl.includes("generativelanguage.googleapis.com")) {
    baseUrl = GEMINI_OPENAI_BASE_URL;
    if (!model.startsWith("gemini") || /^gemini-(1\.0|1\.5|pro($|-))/.test(model)) model = DEFAULT_GEMINI_MODEL;
  }
  return { baseUrl, model: model || DEFAULT_LLM_MODEL };
}
var resolveLlmTarget = () => {
  if (!ENV.llmApiKey) return null;
  const { baseUrl, model } = normalizeLlmSettings(ENV.llmApiUrl, ENV.llmModel, ENV.llmApiKey);
  return { baseUrl, chatUrl: `${baseUrl}/chat/completions`, modelsUrl: `${baseUrl}/models`, key: ENV.llmApiKey.trim(), model };
};
var requireTarget = () => {
  const target = resolveLlmTarget();
  if (!target) throw new LlmUnavailableError("not_configured", "LLM is not configured (set LLM_API_KEY or OPENAI_API_KEY)");
  return target;
};
function llmUnavailableMessage(error) {
  if (!(error instanceof LlmUnavailableError)) return null;
  switch (error.reason) {
    case "not_configured":
      return "Foto\u011Fraf okuma (yapay zek\xE2) servisi sunucuda hen\xFCz a\xE7\u0131lmam\u0131\u015F. Sorun foto\u011Fraf\u0131nda de\u011Fil \u2014 y\xF6netici LLM_API_KEY ayar\u0131n\u0131 yap\u0131nca \xE7al\u0131\u015Facak. \u015Eimdilik bilgileri elle girebilirsin.";
    case "auth":
      return "Foto\u011Fraf okuma servisinin anahtar\u0131 ge\xE7ersiz. Sorun foto\u011Fraf\u0131nda de\u011Fil; y\xF6neticiye haber ver.";
    case "quota":
      return "Foto\u011Fraf okuma servisi \u015Fu an yo\u011Fun ya da kotas\u0131 doldu. Birka\xE7 dakika sonra tekrar dener misin?";
    case "too_large":
      return "Foto\u011Fraf servis i\xE7in \xE7ok b\xFCy\xFCk. Daha k\xFC\xE7\xFCk bir foto\u011Frafla ya da k\u0131rparak tekrar dener misin?";
    default:
      if (error.status === 400 || error.status === 404 || error.status === 422) return `Yapay zek\xE2 sa\u011Flay\u0131c\u0131s\u0131 iste\u011Fi reddetti (kod ${error.status}). Sorun foto\u011Fraf\u0131nda de\u011Fil; y\xF6netici LLM_MODEL / LLM_API_URL ayar\u0131n\u0131 kontrol etmeli (Admin \u2192 Yapay zek\xE2 ba\u011Flant\u0131 testi).`;
      return `Foto\u011Fraf okuma servisine \u015Fu an ula\u015F\u0131lam\u0131yor${error.status ? ` (kod ${error.status})` : ""}. Sorun foto\u011Fraf\u0131nda de\u011Fil; biraz sonra tekrar dener misin?`;
  }
}
var errorForStatus = (status, detail) => {
  const reason = status === 401 || status === 403 ? "auth" : status === 402 || status === 429 ? "quota" : status === 413 ? "too_large" : "provider";
  const safeDetail = detail.replace(/\b(sk-[A-Za-z0-9_*.\-]{4,}|AIza[0-9A-Za-z_\-]{10,}|Bearer\s+\S+)/g, "[redacted]");
  return new LlmUnavailableError(reason, `LLM invoke failed: ${status} \u2013 ${safeDetail.slice(0, 500)}`, status);
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
      const transient = response.status === 408 || response.status === 409 || response.status === 429 || response.status >= 500;
      if (response.ok || !transient || attempt === RETRY_MAX_RETRIES) {
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
  const target = requireTarget();
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
  payload.model = model || target.model;
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
  const send = async (body) => {
    try {
      return await fetchWithBackoff(target.chatUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${target.key}`
        },
        body: JSON.stringify(body)
      });
    } catch (error) {
      throw new LlmUnavailableError("provider", `LLM request failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  let response = await send(payload);
  const format = payload.response_format;
  if (response.status === 400 && format?.type === "json_schema") {
    const firstError = await response.text().catch(() => "");
    console.warn(`[LLM] json_schema rejected (400), retrying with json_object: ${firstError.slice(0, 200).replace(/\b(sk-[A-Za-z0-9_*.\-]{4,}|AIza[0-9A-Za-z_\-]{10,})/g, "[redacted]")}`);
    const schemaHint = { role: "system", content: `Yan\u0131t\u0131 YALNIZCA \u015Fu JSON \u015Femas\u0131na uyan ge\xE7erli bir JSON nesnesi olarak ver (a\xE7\u0131klama, kod blo\u011Fu yok): ${JSON.stringify(format.json_schema?.schema ?? {})}` };
    response = await send({ ...payload, messages: [schemaHint, ...payload.messages], response_format: { type: "json_object" } });
  }
  if (!response.ok) {
    throw errorForStatus(response.status, await response.text().catch(() => ""));
  }
  const result = await response.json();
  if (payload.response_format) {
    for (const choice of result.choices ?? []) {
      const content = choice.message?.content;
      if (typeof content === "string") choice.message.content = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    }
  }
  return result;
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
import { z as z15 } from "zod";

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

// server/routers/bookContent.ts
import { TRPCError as TRPCError2 } from "@trpc/server";
import { z as z3 } from "zod";

// server/bookContent/bookContentDb.ts
import { and as and5, eq as eq7, inArray as inArray2, isNull as isNull3 } from "drizzle-orm";

// server/bookContent/config.ts
var bookContentConfig = {
  mapping: {
    /** Bu güvenin üstü: eşleşme otomatik önerilir (öğrenci yine görür, değiştirebilir). */
    autoSuggestMin: 0.9,
    /** Bu aralık: öğrencinin açıkça onaylaması istenir. Altı: manuel eşleştirme gerekli. */
    confirmMin: 0.7,
    /** Eşleşme adımlarının verdiği güven (tam eşleşme > alias > kapsama > benzerlik). */
    scores: { exactTopic: 1, exactAlias: 0.95, containsTopic: 0.88, containsAlias: 0.85, fuzzyMax: 0.8 },
    /** Kelime kökü yaklaşımı: Türkçe ekleri tolere etmek için kelimenin ilk N harfi karşılaştırılır. */
    stemLength: 5,
    maxAlternatives: 3
  },
  aiMapping: {
    /** Deterministik eşleştirme belirsiz kaldığında (onay/manuel) AI'ya aday listesinden seçtirilsin mi. */
    enabled: true,
    /** AI'ya gösterilecek en fazla aday konu (ilgili dersin konuları). */
    maxCandidates: 60,
    /** AI önerisinin güveni bu değeri AŞAMAZ: otomatik öneri eşiğinin altında kalır, öğrenci her zaman onaylar. */
    maxConfidence: 0.85,
    /** Bu güvenin altındaki AI önerisi hiç gösterilmez (manuel eşleştirme kalır). */
    minConfidence: 0.6
  },
  ocr: {
    /** Tek istekte gönderilebilecek en büyük görsel (Vercel istek gövdesi sınırı ~4.5 MB). */
    maxImageBytes: 3.5 * 1024 * 1024,
    /** Bir kitap için en fazla içindekiler sayfası. */
    maxTocPages: 8,
    /** İsteğin tamamı için süre bütçesi (Vercel fonksiyonu 60 sn; yanıt + eşleştirme payı bırakılır). */
    requestBudgetMs: 5e4,
    /** Aynı anda okunan sayfa sayısı bunu aşarsa sayfa başına geçiş sayısı kısılır (hız sınırı + süre). */
    manyPagesThreshold: 3,
    maxPassesWhenManyPages: 2
  },
  confidence: {
    /** Nihai güven = ağırlıklı ortalama (görüntü, okuma, yapı, eşleştirme). */
    weights: { image: 0.15, ocr: 0.35, structure: 0.25, mapping: 0.25 },
    /** Bunun altındaki satır / sayfa "kontrol et" olarak işaretlenir. */
    needsReviewBelow: 0.7
  },
  allocation: {
    /** Zayıflık (0-1) → önerilen çalışma süresi (dk). Aralık alt sınırı dahil; ilk eşleşen kullanılır. */
    weaknessMinutes: [
      { min: 0.85, minutes: 60 },
      { min: 0.7, minutes: 45 },
      { min: 0.5, minutes: 30 },
      { min: 0.3, minutes: 20 }
    ],
    /** Bu doğruluğun (%) altındaki "Orta" konular için de TEKRAR önerisi yapılır (Zayıf eşiği shared/topicStatus.ts'te). */
    reviewMaxAccuracy: 70,
    /** Bir kitap testinin ortalama çözüm süresi (dk) — öneride kaç test verileceğini belirler. */
    minutesPerTest: 15,
    /** Bir günde kitap görevlerine ayrılabilecek en fazla süre (dk). */
    maxDailyBookMinutes: 90,
    /** Öğrencinin tercihi yoksa varsayılan: kitap görevleri otomatik planlanmaz, yalnızca önerilir. */
    autoScheduleDefault: false
  }
};

// server/bookContent/bookStudyAllocation.ts
var weaknessFromAccuracy = (accuracy) => Math.round((1 - Math.max(0, Math.min(100, accuracy)) / 100) * 100) / 100;
function minutesForWeakness(weakness, bands = bookContentConfig.allocation.weaknessMinutes) {
  const band = [...bands].sort((a, b) => b.min - a.min).find((item) => weakness >= item.min);
  return band ? band.minutes : null;
}
var overlaps = (row, ranges) => row.pageStart !== null && ranges.some((range) => row.pageStart >= range.pageStart && row.pageStart <= range.pageEnd);
var PRACTICE_TYPES = /* @__PURE__ */ new Set(["topic_test", "topic", "osym_type"]);
function buildBookRecommendations(input) {
  const { minutesPerTest, weaknessMinutes } = bookContentConfig.allocation;
  const recommendations = [];
  for (const weak of input.weakTopics) {
    const weakness = weaknessFromAccuracy(weak.accuracy);
    const minutes = minutesForWeakness(weakness, weaknessMinutes);
    if (minutes === null) continue;
    const byBook = /* @__PURE__ */ new Map();
    for (const row of input.contents) {
      if (row.topicId !== weak.topicId || !PRACTICE_TYPES.has(row.contentType)) continue;
      byBook.set(row.bookId, [...byBook.get(row.bookId) ?? [], row]);
    }
    const purpose = weak.accuracy < TOPIC_STATUS_THRESHOLDS.weak ? "practice" : "review";
    for (const [bookId, rows] of Array.from(byBook)) {
      const skip = [...input.donePages[bookId] ?? [], ...input.scheduledPages[bookId] ?? []];
      const open = rows.sort((a, b) => a.sortOrder - b.sortOrder).filter((row) => !overlaps(row, skip));
      if (open.length === 0) continue;
      if (purpose === "review") open.sort((a, b) => Number(b.contentType === "osym_type") - Number(a.contentType === "osym_type") || a.sortOrder - b.sortOrder);
      const first = open[0];
      const count3 = Math.max(1, Math.floor(minutes / minutesPerTest));
      const picked = open.filter((row) => row.unitNumber === first.unitNumber && row.unitTitle === first.unitTitle).slice(0, count3);
      const numbers = picked.map((row) => row.testNumber).filter((value) => value !== null);
      const allTopicTests = picked.every((row) => row.contentType === "topic_test");
      recommendations.push({
        purpose,
        topicId: weak.topicId,
        topic: weak.topic,
        subject: weak.subject,
        exam: weak.exam,
        weakness,
        minutes,
        bookId,
        unitNumber: first.unitNumber,
        unitTitle: first.unitTitle,
        contentIds: picked.map((row) => row.id),
        labels: picked.map((row) => row.label),
        testRange: allTopicTests && numbers.length ? numbers.length === 1 ? String(numbers[0]) : `${Math.min(...numbers)}-${Math.max(...numbers)}` : null,
        pageStart: picked[0].pageStart,
        pageEnd: picked[picked.length - 1].pageEnd ?? picked[picked.length - 1].pageStart,
        match: Math.min(...picked.map((row) => row.mappingConfidence)) >= bookContentConfig.mapping.autoSuggestMin ? "HIGH" : "MEDIUM",
        remainingTests: open.length
      });
    }
  }
  return recommendations.sort((a, b) => b.weakness - a.weakness || a.bookId.localeCompare(b.bookId));
}
function computeBookCompletion(input) {
  const ranges = input.logs.filter((log) => log.pageStart !== null).map((log) => ({ pageStart: log.pageStart, pageEnd: Math.max(log.pageStart, log.pageEnd ?? log.pageStart) }));
  const questions = input.logs.reduce((sum, log) => sum + log.questions, 0);
  const correct = input.logs.reduce((sum, log) => sum + log.correct, 0);
  const accuracy = questions > 0 ? Math.round(correct / questions * 100) : null;
  const isDone = (row) => row.pageStart !== null && ranges.some((range) => row.pageStart >= range.pageStart && row.pageStart <= range.pageEnd);
  if (input.contents.length > 0) {
    const units = [];
    for (const row of input.contents) {
      let unit = units[units.length - 1];
      if (!unit || unit.unitNumber !== row.unitNumber || unit.unitTitle !== row.unitTitle) {
        unit = { unitNumber: row.unitNumber, unitTitle: row.unitTitle, done: 0, total: 0 };
        units.push(unit);
      }
      unit.total += 1;
      if (isDone(row)) unit.done += 1;
    }
    const total = input.contents.length;
    const done = units.reduce((sum, unit) => sum + unit.done, 0);
    return { percent: Math.round(done / total * 100), basis: "contents", done, total, accuracy, questions, units };
  }
  if (input.pageCount && input.pageCount > 0) {
    const covered = /* @__PURE__ */ new Set();
    for (const range of ranges) for (let page = range.pageStart; page <= Math.min(range.pageEnd, input.pageCount); page++) covered.add(page);
    return { percent: Math.min(100, Math.round(covered.size / input.pageCount * 100)), basis: "pages", done: covered.size, total: input.pageCount, accuracy, questions, units: [] };
  }
  return { percent: null, basis: "none", done: 0, total: 0, accuracy, questions, units: [] };
}
function pickStudyDay(input) {
  const { maxDailyBookMinutes } = bookContentConfig.allocation;
  const start = /* @__PURE__ */ new Date(`${input.today}T00:00:00Z`);
  for (let offset = 0; offset < (input.horizonDays ?? 7); offset++) {
    const date = new Date(start.getTime() + offset * 864e5).toISOString().slice(0, 10);
    const dayLoad = input.load.filter((item) => item.date === date);
    const total = dayLoad.reduce((sum, item) => sum + item.minutes, 0);
    const bookTotal = dayLoad.filter((item) => item.isBook).reduce((sum, item) => sum + item.minutes, 0);
    if (total + input.minutes <= input.dailyCapacity && bookTotal + input.minutes <= maxDailyBookMinutes) return date;
  }
  return null;
}

// shared/examTopicLinks.ts
var examTopicKey = (value) => value.replace(/İ/g, "i").replace(/I/g, "\u0131").toLowerCase().replace(/[çğıöşüâîû]/g, (char) => ({ \u00E7: "c", \u011F: "g", \u0131: "i", \u00F6: "o", \u015F: "s", \u00FC: "u", \u00E2: "a", \u00EE: "i", \u00FB: "u" })[char] ?? char).replace(/[^a-z0-9]+/g, " ").trim();
var TR = (...topics) => topics.map((topic) => ({ exam: "TYT", subject: "T\xFCrk\xE7e", topic }));
var MAT = (...topics) => topics.map((topic) => ({ exam: "TYT", subject: "Matematik", topic }));
var GEO = (...topics) => topics.map((topic) => ({ exam: "TYT", subject: "Geometri", topic }));
var FIZ = (...topics) => topics.map((topic) => ({ exam: "TYT", subject: "Fizik", topic }));
var KIM = (...topics) => topics.map((topic) => ({ exam: "TYT", subject: "Kimya", topic }));
var TAR = (...topics) => topics.map((topic) => ({ exam: "TYT", subject: "Tarih", topic }));
var COG = (...topics) => topics.map((topic) => ({ exam: "TYT", subject: "Co\u011Frafya", topic }));
var FEL = (...topics) => topics.map((topic) => ({ exam: "TYT", subject: "Felsefe", topic }));
var DIN = (...topics) => topics.map((topic) => ({ exam: "TYT", subject: "Din K\xFClt\xFCr\xFC", topic }));
var LINKS = [
  // Türkçe
  ["C\xFCmlede Yorum", TR("C\xFCmlede Anlam")],
  ["Anlam\u0131na G\xF6re S\xF6zc\xFCkler", TR("S\xF6zc\xFCkte Anlam")],
  ["Anlam \u0130li\u015Fkisine G\xF6re S\xF6zc\xFCkler", TR("S\xF6zc\xFCkte Anlam")],
  ["\u0130sim Tamlamalar\u0131, C\xFCmlenin \xD6geleri (Tamlay\u0131c\u0131lar), Fiilimsi Bulma, S\xF6zc\xFCk T\xFCrleri", TR("\u0130simler", "C\xFCmlenin \xD6geleri", "Fiilimsiler")],
  ["S\u0131fat Tamlamalar\u0131", TR("S\u0131fatlar")],
  ["Yaz\u0131m Kurallar\u0131", TR("Yaz\u0131m Kurallar\u0131")],
  ["Noktalama \u0130\u015Faretleri", TR("Noktalama \u0130\u015Faretleri")],
  ["C\xFCmlenin \xD6geleri (Tamlay\u0131c\u0131lar)", TR("C\xFCmlenin \xD6geleri")],
  ["Ses Bilgisi", TR("Ses Bilgisi")],
  ["C\xFCmlenin \xD6geleri (Temel \xD6geler), C\xFCmlenin \xD6geleri (Tamlay\u0131c\u0131lar), \u0130sim Tamlamalar\u0131, S\u0131fat Tamlamalar\u0131", TR("C\xFCmlenin \xD6geleri", "\u0130simler", "S\u0131fatlar")],
  ["Par\xE7ada Anlam (Ana D\xFC\u015F\xFCnce-Yard\u0131mc\u0131 D\xFC\u015F\xFCnce)", TR("Paragrafta Konu ve Ana D\xFC\u015F\xFCnce", "Paragrafta Yard\u0131mc\u0131 D\xFC\u015F\xFCnce")],
  ["Par\xE7ada Konu-Ba\u015Fl\u0131k-Soru", TR("Paragrafta Konu ve Ana D\xFC\u015F\xFCnce")],
  ["Ek Fiil - Fiilde Yap\u0131, C\xFCmle T\xFCrleri (Yap\u0131s\u0131na G\xF6re C\xFCmleler), S\xF6zc\xFCk T\xFCrleri, \xC7ekim Ekleri", TR("Ek Fiil", "C\xFCmle T\xFCrleri", "S\xF6zc\xFCkte Yap\u0131")],
  ["C\xFCmlenin \xD6geleri (Temel \xD6geler), C\xFCmlenin \xD6geleri (Nesne), C\xFCmlenin \xD6geleri (Tamlay\u0131c\u0131lar)", TR("C\xFCmlenin \xD6geleri")],
  ["Ek Fiil - Fiilde Yap\u0131, \u0130sim Tamlamalar\u0131, S\xF6zc\xFCk T\xFCrleri", TR("Ek Fiil", "\u0130simler")],
  ["Par\xE7ada Anlat\u0131m", TR("Paragrafta Anlat\u0131m Bi\xE7imleri ve D\xFC\u015F\xFCnceyi Geli\u015Ftirme Yollar\u0131")],
  ["Paragrafta Yap\u0131", TR("Paragraf\u0131n Yap\u0131s\u0131")],
  // Matematik-1 (sayı/cebir/problem → Matematik; açı/şekil → Geometri)
  ["Fonksiyonda D\xF6rt \u0130\u015Flem", MAT("Fonksiyonlar (TYT)")],
  ["Bir Bilinmeyenli E\u015Fitsizlikler", MAT("Basit E\u015Fitsizlikler")],
  ["Mutlak De\u011Ferli E\u015Fitsizlikler", MAT("Mutlak De\u011Fer")],
  ["\xDCsl\xFC \u0130fadeler", MAT("\xDCsl\xFC Say\u0131lar")],
  ["Fakt\xF6riyel", MAT("Perm\xFCtasyon")],
  ["Say\u0131 Basamaklar\u0131", MAT("Say\u0131 Basamaklar\u0131")],
  ["Ondal\u0131kl\u0131 Say\u0131lar", MAT("Rasyonel Say\u0131lar")],
  ["Tek-\xC7ift Say\u0131lar", MAT("Temel Kavramlar")],
  ["Do\u011Fal Say\u0131lar", MAT("Temel Kavramlar")],
  ["G\xFCncel Y\xFCzde Problemleri", MAT("Y\xFCzde Problemleri")],
  ["Kar Zarar Problemleri", MAT("K\xE2r - Zarar Problemleri")],
  ["Polinomlarda D\xF6rt \u0130\u015Flem", MAT("Polinomlar")],
  ["Merkezi E\u011Filim \xD6l\xE7\xFCleri", MAT("Veri ve \u0130statistik")],
  ["Bile\u015Fik \xD6nermeler", MAT("Mant\u0131k")],
  ["Ard\u0131\u015F\u0131k Say\u0131lar", MAT("Temel Kavramlar")],
  ["B\xF6l\xFCnebilme Kurallar\u0131", MAT("B\xF6lme ve B\xF6l\xFCnebilme")],
  ["Periyodik Tekrar Eden Durumlar", MAT("Rutin Olmayan Problemler")],
  ["\u0130ki Bilinmeyenli Denklemler", MAT("Denklem \xC7\xF6zme")],
  ["Kombinasyon Problemleri", MAT("Kombinasyon")],
  ["Basit Olaylar\u0131n Olas\u0131l\u0131\u011F\u0131", MAT("Olas\u0131l\u0131k")],
  ["G\xFCncel Hareket Problemleri", MAT("Hareket Problemleri")],
  ["G\xFCncel Kar\u0131\u015F\u0131m Problemleri", MAT("Kar\u0131\u015F\u0131m Problemleri")],
  ["Orant\u0131 Problemleri", MAT("Oran - Orant\u0131")],
  ["G\xFCncel Say\u0131 Problemleri", MAT("Say\u0131 Problemleri")],
  ["K\xFCme Tan\u0131m\u0131 ve G\xF6sterimi", MAT("K\xFCmeler")],
  ["Tablo Grafik Problemleri", MAT("Tablo ve Grafik Problemleri")],
  ["G\xFCncel Ya\u015F Problemleri", MAT("Ya\u015F Problemleri")],
  ["Paralel \u0130ki Do\u011Frunun Kesenle Yapt\u0131\u011F\u0131 A\xE7\u0131lar", GEO("Do\u011Fruda ve \xDC\xE7gende A\xE7\u0131lar")],
  ["Do\u011Fruda A\xE7\u0131lar", GEO("Do\u011Fruda ve \xDC\xE7gende A\xE7\u0131lar")],
  ["\xDC\xE7gende A\xE7\u0131lar", GEO("Do\u011Fruda ve \xDC\xE7gende A\xE7\u0131lar")],
  ["K\xFCp\xFCn Alan\u0131", GEO("Kat\u0131 Cisimler")],
  ["D\xFCzg\xFCn \xC7okgende A\xE7\u0131", GEO("\xC7okgenler")],
  ["D\xF6rtgen \xD6zellikleri", GEO("D\xF6rtgenler")],
  ["Karede Uzunluk \xD6zellikleri", GEO("Kare")],
  ["Dik \xDC\xE7gende Trigonometrik Oranlar", GEO("Dik \xDC\xE7gen")],
  ["Yamukta Alan \xD6zellikleri", GEO("Yamuk")],
  ["A\xE7\u0131lar\u0131na G\xF6re \xD6zel \xDC\xE7genler", GEO("Dik \xDC\xE7gen", "\u0130kizkenar ve E\u015Fkenar \xDC\xE7gen")],
  // Fen — Fizik / Kimya
  ["Ortam Derinli\u011Fi ile Su Dalgalar\u0131n\u0131n Yay\u0131lma H\u0131z\u0131 \u0130li\u015Fkisi", FIZ("Dalgalar")],
  ["Elektroskop", FIZ("Elektrostatik")],
  ["Cisimlerin S\u0131v\u0131 \u0130\xE7indeki Denge Durumlar\u0131", FIZ("Bas\u0131n\xE7 ve Kald\u0131rma Kuvveti")],
  ["I\u015F\u0131k \u015Eiddeti, I\u015F\u0131k Ak\u0131s\u0131 ve Ayd\u0131nlanma \u015Eiddeti", FIZ("Optik")],
  ["\xD6zk\xFCtle, Suyun Genle\u015Fmesi", FIZ("Madde ve \xD6zellikleri", "Is\u0131, S\u0131cakl\u0131k ve Genle\u015Fme")],
  ["Verim", FIZ("\u0130\u015F, G\xFC\xE7 ve Enerji")],
  ["Temel ve T\xFCretilmi\u015F B\xFCy\xFCkl\xFCkler", FIZ("Fizik Bilimine Giri\u015F")],
  ["Deri\u015Fik Seyreltik", KIM("Kar\u0131\u015F\u0131mlar")],
  ["Asitlerin ve Bazlar\u0131n Metallerle Tepkimeleri", KIM("Asitler, Bazlar ve Tuzlar")],
  ["G\xFCvenlik \u0130\u015Faretleri", KIM("Kimya Bilimi")],
  ["Element, Bile\u015Fik", KIM("Kimya Bilimi")],
  ["G\xFC\xE7l\xFC Etkile\u015Fimler T\xFCrleri (Kovalent Ba\u011F), Lewis Form\xFClleri", KIM("Kimyasal T\xFCrler Aras\u0131 Etkile\u015Fimler")],
  ["Periyodik \xD6zelliklerin De\u011Fi\u015Fimleri", KIM("Atom ve Periyodik Sistem")],
  ["Tepkimeli Miktar Ge\xE7i\u015F Problemleri", KIM("Kimyasal Tepkimeler")],
  // Sosyal — Tarih / Coğrafya / Felsefe / Din Kültürü
  ["Toplumsal Alanda Yap\u0131lan \u0130nk\u0131laplar", TAR("Atat\xFCrk\xE7\xFCl\xFCk ve T\xFCrk \u0130nk\u0131lab\u0131")],
  ["E\u011Fitim ve K\xFClt\xFCr Alan\u0131nda Yap\u0131lan \u0130nk\u0131laplar", TAR("Atat\xFCrk\xE7\xFCl\xFCk ve T\xFCrk \u0130nk\u0131lab\u0131")],
  ["Osmanl\u0131da Sanayile\u015Fme \xC7abalar\u0131", TAR("Uluslararas\u0131 \u0130li\u015Fkilerde Denge Stratejisi (1774-1914)")],
  ["B\xFCy\xFCk Sel\xE7uklu Devleti", TAR("\u0130lk T\xFCrk-\u0130slam Devletleri")],
  ["Avrasya'da \u0130lk T\xFCrk \u0130zleri", TAR("\u0130lk ve Orta \xC7a\u011Flarda T\xFCrk D\xFCnyas\u0131")],
  ["Afetlerin Da\u011F\u0131l\u0131\u015Flar\u0131", COG("Do\u011Fal Afetler")],
  ["Y\u0131ll\u0131k Hareket (Grafikler)", COG("D\xFCnya'n\u0131n \u015Eekli ve Hareketleri")],
  ["T\xFCrkiye \u0130klimi (T\xFCrkiye'de S\u0131cakl\u0131k)", COG("Atmosfer ve \u0130klim")],
  ["T\xFCrkiye'deki G\xF6\xE7lerin Sebep ve Sonu\xE7lar\u0131", COG("G\xF6\xE7")],
  ["B\xF6lge Kavram\u0131 ve T\xFCrlerinin S\u0131n\u0131fland\u0131r\u0131lmas\u0131", COG("B\xF6lgeler")],
  ["20. Y\xFCzy\u0131l Felsefesinin Temel Problemleri ve Baz\u0131 Ana Ak\u0131mlar\u0131", FEL("Felsefe Tarihi")],
  ["Sanat Nedir?", FEL("Sanat Felsefesi")],
  ["G\xFCzel Nedir?", FEL("Sanat Felsefesi")],
  ["Bilimin De\u011Feri Nedir?", FEL("Bilim Felsefesi")],
  ["\xD6rnek Felsefi Metinlerinden Hareketle 18-19. Y\xFCzy\u0131l Filozoflar\u0131n\u0131n G\xF6r\xFC\u015Flerini Analiz Eder", FEL("Felsefe Tarihi")],
  ["M\xD6 6. Y\xFCzy\u0131l - MS 2. Y\xFCzy\u0131l Felsefesinin Karakteristik \xD6zelliklerini A\xE7\u0131klar", FEL("Felsefe Tarihi")],
  ["Varl\u0131k Felsefesi Nedir?", FEL("Varl\u0131k Felsefesi")],
  ["Varl\u0131\u011F\u0131n Mahiyeti Nedir?", FEL("Varl\u0131k Felsefesi")],
  ["Dogmatizm", FEL("Bilgi Felsefesi")],
  ["Hz. Muhammed'in \u015Eahsiyeti", DIN("Hz. Muhammed")],
  ["Allah'\u0131n Varl\u0131\u011F\u0131 ve Birli\u011Fi Konusunda Akli ve Nakli Delilleri Analiz Eder", DIN("Allah \u0130nsan \u0130li\u015Fkisi")],
  ["\u0130nan\xE7", DIN("Bilgi ve \u0130nan\xE7")]
];
var bySlugKey = new Map(CURRICULUM.map((def) => [`${def.exam}|${def.subject}|${def.topic}`, def]));
var EXAM_TOPIC_LINKS = new Map(
  LINKS.map(([raw, refs]) => [
    examTopicKey(raw),
    refs.map((ref) => {
      const def = bySlugKey.get(`${ref.exam}|${ref.subject}|${ref.topic}`);
      if (!def) throw new Error(`examTopicLinks: m\xFCfredatta olmayan konu: ${ref.exam} ${ref.subject} ${ref.topic}`);
      return def;
    })
  ])
);
function curriculumSubjectsFor(subject, category) {
  const key = examTopicKey(category || subject);
  if (key.startsWith("fizik")) return ["Fizik"];
  if (key.startsWith("kimya")) return ["Kimya"];
  if (key.startsWith("biyoloji")) return ["Biyoloji"];
  if (key.startsWith("tarih")) return ["Tarih"];
  if (key.startsWith("cografya")) return ["Co\u011Frafya"];
  if (key.startsWith("felsefe") || key.startsWith("mantik") || key.startsWith("psikoloji") || key.startsWith("sosyoloji")) return ["Felsefe"];
  if (key.startsWith("din")) return ["Din K\xFClt\xFCr\xFC"];
  if (key.startsWith("geometri")) return ["Geometri"];
  if (key.startsWith("matematik")) return ["Matematik", "Geometri"];
  if (key.startsWith("turkce")) return ["T\xFCrk\xE7e"];
  if (key.startsWith("edebiyat") || key.startsWith("turk dili")) return ["Edebiyat"];
  if (key === "fen" || key.startsWith("fen ")) return ["Fizik", "Kimya", "Biyoloji"];
  if (key === "sosyal" || key.startsWith("sosyal ")) return ["Tarih", "Co\u011Frafya", "Felsefe", "Din K\xFClt\xFCr\xFC"];
  return [subject];
}

// server/bookContent/curriculumMatcher.ts
init_turkishText();
var STOPWORDS = /* @__PURE__ */ new Set(["ve", "ile", "de", "da", "test", "testi", "testleri", "soru", "sorulari", "konu", "konulari", "unite", "bolum", "tyt", "ayt", "yks", "yeni", "nesil"]);
var contentTokens = (text2) => normalizeForComparison(text2).split(" ").filter((token) => token.length > 1 && !STOPWORDS.has(token));
var stems = (text2, length) => new Set(contentTokens(text2).map((token) => token.slice(0, length)));
function dice(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const item of Array.from(a)) if (b.has(item)) shared += 1;
  return 2 * shared / (a.size + b.size);
}
var containsPhrase = (haystack, needle) => needle.length >= 4 && ` ${haystack} `.includes(` ${needle} `);
var tierFor = (confidence) => confidence >= bookContentConfig.mapping.autoSuggestMin ? "auto" : confidence >= bookContentConfig.mapping.confirmMin ? "confirm" : "manual";
function matchTopic(title, topics, filter = {}) {
  const { scores, stemLength, maxAlternatives } = bookContentConfig.mapping;
  const normalizedTitle = normalizeForComparison(title);
  if (!normalizedTitle) return { best: null, alternatives: [], tier: "manual" };
  const subjectKey = filter.subject ? normalizeForComparison(filter.subject) : null;
  const pool = topics.filter((topic) => (!subjectKey || normalizeForComparison(topic.subject) === subjectKey) && (!filter.exam || topic.exam === filter.exam));
  const titleStems = stems(title, stemLength);
  const scored = pool.map((topic) => {
    const names = [{ text: topic.topic, isAlias: false }, ...topic.aliases.map((alias) => ({ text: alias, isAlias: true }))];
    let best2 = { topicId: topic.id, confidence: 0, method: "fuzzy", matchedText: topic.topic };
    for (const name of names) {
      const normalizedName = normalizeForComparison(name.text);
      let candidate;
      if (normalizedName === normalizedTitle) {
        candidate = { topicId: topic.id, confidence: name.isAlias ? scores.exactAlias : scores.exactTopic, method: name.isAlias ? "exact_alias" : "exact_topic", matchedText: name.text };
      } else if (containsPhrase(normalizedTitle, normalizedName)) {
        candidate = { topicId: topic.id, confidence: name.isAlias ? scores.containsAlias : scores.containsTopic, method: name.isAlias ? "contains_alias" : "contains_topic", matchedText: name.text };
      } else {
        candidate = { topicId: topic.id, confidence: Math.round(dice(titleStems, stems(name.text, stemLength)) * scores.fuzzyMax * 1e3) / 1e3, method: "fuzzy", matchedText: name.text };
      }
      if (candidate.confidence > best2.confidence) best2 = candidate;
    }
    return best2;
  });
  const ranked = scored.filter((match) => match.confidence > 0).sort((a, b) => b.confidence - a.confidence);
  const best = ranked[0] ?? null;
  const ambiguous = Boolean(best && ranked[1] && ranked[1].confidence === best.confidence && ranked[1].topicId !== best.topicId);
  const tier = !best ? "manual" : ambiguous ? tierFor(best.confidence) === "auto" ? "confirm" : tierFor(best.confidence) : tierFor(best.confidence);
  return { best, alternatives: ranked.slice(1, 1 + maxAlternatives), tier };
}

// server/bookContent/examTopicResolver.ts
var CURRICULUM_SLUGS = new Set(CURRICULUM.map((def) => def.slug));
function resolveToCurriculumTopicIds(row, topics) {
  const idBySlug = new Map(topics.map((topic) => [topic.slug, topic.id]));
  if (CURRICULUM_SLUGS.has(row.slug)) {
    const id = idBySlug.get(row.slug);
    return id === void 0 ? [] : [id];
  }
  const linked = EXAM_TOPIC_LINKS.get(examTopicKey(row.topic));
  if (linked) return Array.from(new Set(linked.map((def) => idBySlug.get(def.slug)).filter((id) => id !== void 0)));
  const curriculumTopics = topics.filter((topic) => CURRICULUM_SLUGS.has(topic.slug));
  const subjects = curriculumSubjectsFor(row.subject, row.category);
  const parts = [row.topic, ...row.topic.split(/[,()]/).map((part) => part.trim()).filter((part) => part.length >= 4)];
  const ids = /* @__PURE__ */ new Set();
  for (const part of Array.from(new Set(parts))) {
    for (const subject of subjects) {
      const result = matchTopic(part, curriculumTopics, { subject, exam: row.exam });
      if (result.best && result.tier === "auto") ids.add(result.best.topicId);
    }
    if (part === row.topic && ids.size > 0) break;
  }
  return Array.from(ids);
}
var DAY_MS = 864e5;
function deriveCurriculumWeakTopics(rows, topics) {
  const topicById = new Map(topics.map((topic) => [topic.id, topic]));
  const signals = /* @__PURE__ */ new Map();
  for (const row of rows) {
    if (row.insufficientData) continue;
    const at = row.lastReviewedAt ? new Date(row.lastReviewedAt).getTime() : 0;
    for (const id of resolveToCurriculumTopicIds(row, topics)) signals.set(id, [...signals.get(id) ?? [], { accuracy: row.progress, at }]);
  }
  const weak = [];
  for (const [id, list] of Array.from(signals)) {
    const latestDay = Math.floor(Math.max(...list.map((signal) => signal.at)) / DAY_MS);
    const latest = list.filter((signal) => Math.floor(signal.at / DAY_MS) === latestDay);
    const accuracy = Math.round(latest.reduce((sum, signal) => sum + signal.accuracy, 0) / latest.length);
    const topic = topicById.get(id);
    if (!topic || accuracy >= bookContentConfig.allocation.reviewMaxAccuracy) continue;
    weak.push({ topicId: id, topic: topic.topic, subject: topic.subject, exam: topic.exam, accuracy });
  }
  return weak;
}

// server/studyPlan/planTasks.ts
import { and as and4, eq as eq6, gte as gte3, lte } from "drizzle-orm";
var PlanTaskError = class extends Error {
};
var isoDate = (date) => date.toISOString().slice(0, 10);
async function pickDayForTask(userId, minutes, when) {
  const db = await getDb();
  if (!db) throw new PlanTaskError("Veritaban\u0131 ba\u011Flant\u0131s\u0131 yok.");
  const today = /* @__PURE__ */ new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (when === "today") return isoDate(today);
  const horizonEnd = new Date(today.getTime() + 7 * 864e5);
  const [profile] = await db.select({ daily: studentProfiles.dailyStudyDuration }).from(studentProfiles).where(eq6(studentProfiles.userId, userId)).limit(1);
  const sessions = await db.select({ sessionDate: studyPlanSessions.sessionDate, minutes: studyPlanSessions.plannedMinutes, sourceBookId: studyPlanSessions.sourceBookId }).from(studyPlanSessions).where(and4(eq6(studyPlanSessions.userId, userId), eq6(studyPlanSessions.status, "planned"), gte3(studyPlanSessions.sessionDate, today), lte(studyPlanSessions.sessionDate, horizonEnd)));
  const picked = pickStudyDay({ today: isoDate(today), minutes, dailyCapacity: profile?.daily ?? 120, load: sessions.map((session) => ({ date: isoDate(new Date(session.sessionDate)), minutes: session.minutes, isBook: Boolean(session.sourceBookId) })) });
  if (!picked) throw new PlanTaskError('\xD6n\xFCm\xFCzdeki 7 g\xFCnde bu g\xF6rev i\xE7in yer yok \u2014 plan\u0131n dolu. "Bug\xFCn \xE7al\u0131\u015F" ile yine de ekleyebilirsin.');
  return picked;
}
async function insertPlanTask(userId, input) {
  const db = await getDb();
  if (!db) throw new PlanTaskError("Veritaban\u0131 ba\u011Flant\u0131s\u0131 yok.");
  const noon = /* @__PURE__ */ new Date(`${input.date}T12:00:00Z`);
  const sessionDate = input.date === isoDate(/* @__PURE__ */ new Date()) ? new Date(Math.max(noon.getTime(), Date.now() + 5 * 6e4)) : noon;
  const [plan] = await db.select({ id: studyPlans.id }).from(studyPlans).where(and4(eq6(studyPlans.userId, userId), lte(studyPlans.weekStart, sessionDate), gte3(studyPlans.weekEnd, sessionDate))).orderBy(studyPlans.createdAt).limit(1);
  let planId = plan?.id;
  if (!planId) {
    const weekStart = /* @__PURE__ */ new Date(`${input.date}T00:00:00Z`);
    const weekEnd = new Date(weekStart.getTime() + 6 * 864e5 + 86399e3);
    const result2 = await db.insert(studyPlans).values({ userId, title: input.planTitle, weekStart, weekEnd, summary: input.planSummary, source: "manual" });
    planId = Number(result2[0].insertId);
  }
  const result = await db.insert(studyPlanSessions).values({
    planId,
    userId,
    sessionDate,
    title: input.title.slice(0, 180),
    subject: input.subject,
    // Tam konu adı: tamamlanınca completeStudySession → upsertTopicProgress aynı
    // konu satırını günceller; zayıflık mevcut sistem tarafından yeniden hesaplanır.
    topic: input.topic,
    kind: input.kind,
    plannedMinutes: input.minutes,
    targetPages: input.targetPages ?? null,
    targetTests: input.targetTests ?? null,
    sourceBookId: input.sourceBookId ?? null
  });
  return { sessionId: Number(result[0].insertId), date: input.date };
}

// server/bookContent/bookContentDb.ts
async function requireDb2() {
  const db = await getDb();
  if (!db) throw new Error("Veritaban\u0131 ba\u011Flant\u0131s\u0131 yok.");
  return db;
}
async function getMatchableTopics() {
  const catalog = await getTopicCatalog();
  const aliasesBySlug = new Map(CURRICULUM.map((def) => [def.slug, def.aliases]));
  return catalog.map((row) => ({ id: row.id, slug: row.slug, exam: row.exam, subject: row.subject, unit: row.unit, topic: row.topic, aliases: aliasesBySlug.get(row.slug) ?? [] }));
}
async function userOwnsBook(userId, bookId) {
  const db = await requireDb2();
  const [row] = await db.select({ id: bookInventory.id }).from(bookInventory).where(and5(eq7(bookInventory.userId, userId), eq7(bookInventory.bookId, bookId), isNull3(bookInventory.removedAt))).limit(1);
  return Boolean(row);
}
async function replaceBookContents(userId, bookId, subject, items, source) {
  const db = await requireDb2();
  const topicIds = Array.from(new Set(items.map((item) => item.topicId).filter((id) => id !== null)));
  const validTopics = topicIds.length ? await db.select().from(yksTopics).where(inArray2(yksTopics.id, topicIds)) : [];
  const topicById = new Map(validTopics.map((row) => [row.id, row]));
  const unknown = topicIds.filter((id) => !topicById.has(id));
  if (unknown.length) throw new Error("Ge\xE7ersiz m\xFCfredat konusu se\xE7ildi. Sayfay\u0131 yenileyip tekrar dener misin?");
  const mixed = (type) => type === "review" || type === "simulation";
  const rows = items.map((item, index2) => ({
    userId,
    bookId,
    sortOrder: index2 + 1,
    unitNumber: item.unitNumber,
    unitTitle: item.unitTitle.slice(0, 300),
    contentType: item.contentType,
    label: item.label.slice(0, 120),
    testNumber: item.testNumber,
    title: item.title.slice(0, 300),
    pageStart: item.pageStart,
    pageEnd: item.pageEnd,
    topicId: item.topicId,
    mappingStatus: item.topicId !== null ? "confirmed" : mixed(item.contentType) ? "not_applicable" : "unmatched",
    mappingMethod: item.topicId !== null ? item.mappingMethod : "none",
    mappingConfidence: (item.topicId !== null ? Math.max(0, Math.min(1, item.mappingConfidence)) : 0).toFixed(3),
    source
  }));
  await db.transaction(async (tx) => {
    await tx.delete(userBookContents).where(and5(eq7(userBookContents.userId, userId), eq7(userBookContents.bookId, bookId)));
    if (rows.length) await tx.insert(userBookContents).values(rows);
  });
  for (const topicId of topicIds) {
    const topicRows = rows.filter((row) => row.topicId === topicId);
    const pages = topicRows.flatMap((row) => [row.pageStart, row.pageEnd]).filter((value) => value !== null);
    const tests = topicRows.filter((row) => row.contentType === "topic_test").map((row) => row.testNumber).filter((value) => value !== null);
    const singleUnit = new Set(topicRows.map((row) => `${row.unitNumber}|${row.unitTitle}`)).size === 1;
    const topic = topicById.get(topicId);
    await upsertBookTopicMapping(userId, {
      bookId,
      topic: topic.topic,
      subject: topic.subject || subject,
      pageStart: pages.length ? Math.min(...pages) : null,
      pageEnd: pages.length ? Math.max(...pages) : null,
      testStart: singleUnit && tests.length ? Math.min(...tests) : null,
      testEnd: singleUnit && tests.length ? Math.max(...tests) : null
    });
  }
  return getBookContents(userId, bookId);
}
async function getBookContents(userId, bookId) {
  const db = await requireDb2();
  const rows = await db.select().from(userBookContents).where(and5(eq7(userBookContents.userId, userId), eq7(userBookContents.bookId, bookId))).orderBy(userBookContents.sortOrder);
  const topicIds = Array.from(new Set(rows.map((row) => row.topicId).filter((id) => id !== null)));
  const topics = topicIds.length ? await db.select({ id: yksTopics.id, topic: yksTopics.topic, subject: yksTopics.subject, unit: yksTopics.unit }).from(yksTopics).where(inArray2(yksTopics.id, topicIds)) : [];
  const topicById = new Map(topics.map((row) => [row.id, row]));
  return rows.map((row) => ({ ...row, mappingConfidence: Number(row.mappingConfidence), topic: row.topicId !== null ? topicById.get(row.topicId) ?? null : null }));
}
async function getBookContentSummaries(userId) {
  const db = await requireDb2();
  const activeBooks = (await db.select({ bookId: bookInventory.bookId }).from(bookInventory).where(and5(eq7(bookInventory.userId, userId), isNull3(bookInventory.removedAt)))).map((row) => row.bookId);
  if (activeBooks.length === 0) return [];
  const [contentRows, logs, customBooks] = await Promise.all([
    db.select({ bookId: userBookContents.bookId, topicId: userBookContents.topicId, unitNumber: userBookContents.unitNumber, unitTitle: userBookContents.unitTitle, pageStart: userBookContents.pageStart }).from(userBookContents).where(and5(eq7(userBookContents.userId, userId), inArray2(userBookContents.bookId, activeBooks))).orderBy(userBookContents.sortOrder),
    db.select({ bookId: bookStudyLogs.bookId, pageStart: bookStudyLogs.pageStart, pageEnd: bookStudyLogs.pageEnd, questions: bookStudyLogs.questions, correct: bookStudyLogs.correct }).from(bookStudyLogs).where(and5(eq7(bookStudyLogs.userId, userId), inArray2(bookStudyLogs.bookId, activeBooks))),
    db.select({ bookId: userResourceBooks.bookId, pageCount: userResourceBooks.pageCount }).from(userResourceBooks).where(and5(eq7(userResourceBooks.userId, userId), inArray2(userResourceBooks.bookId, activeBooks)))
  ]);
  const pageCountByBook = new Map(customBooks.map((row) => [row.bookId, row.pageCount]));
  return activeBooks.map((bookId) => {
    const contents = contentRows.filter((row) => row.bookId === bookId);
    return {
      bookId,
      entries: contents.length,
      topicIds: Array.from(new Set(contents.map((row) => row.topicId).filter((id) => id !== null))),
      completion: computeBookCompletion({ contents, logs: logs.filter((log) => log.bookId === bookId), pageCount: pageCountByBook.get(bookId) ?? null })
    };
  });
}
var parseRange = (value) => {
  const match = value?.match(/(\d+)\s*[-–]\s*(\d+)/) ?? value?.match(/^(\d+)$/);
  if (!match) return null;
  const start = Number(match[1]);
  return { pageStart: start, pageEnd: Number(match[2] ?? match[1]) };
};
async function getWeakTopicBookRecommendations(userId) {
  const db = await requireDb2();
  const [progress, topics] = await Promise.all([getUserTopicProgress(userId), getMatchableTopics()]);
  const weakTopics = deriveCurriculumWeakTopics(progress, topics);
  if (weakTopics.length === 0) return [];
  const activeBooks = (await db.select({ bookId: bookInventory.bookId }).from(bookInventory).where(and5(eq7(bookInventory.userId, userId), isNull3(bookInventory.removedAt)))).map((row) => row.bookId);
  if (activeBooks.length === 0) return [];
  const [contentRows, logs, planned] = await Promise.all([
    db.select().from(userBookContents).where(and5(eq7(userBookContents.userId, userId), eq7(userBookContents.mappingStatus, "confirmed"), inArray2(userBookContents.bookId, activeBooks), inArray2(userBookContents.topicId, weakTopics.map((topic) => topic.topicId)))),
    db.select({ bookId: bookStudyLogs.bookId, pageStart: bookStudyLogs.pageStart, pageEnd: bookStudyLogs.pageEnd }).from(bookStudyLogs).where(and5(eq7(bookStudyLogs.userId, userId), inArray2(bookStudyLogs.bookId, activeBooks))),
    db.select({ bookId: studyPlanSessions.sourceBookId, targetPages: studyPlanSessions.targetPages }).from(studyPlanSessions).where(and5(eq7(studyPlanSessions.userId, userId), eq7(studyPlanSessions.status, "planned"), inArray2(studyPlanSessions.sourceBookId, activeBooks)))
  ]);
  const donePages = {};
  for (const log of logs) if (log.pageStart !== null) (donePages[log.bookId] ??= []).push({ pageStart: log.pageStart, pageEnd: log.pageEnd ?? log.pageStart });
  const scheduledPages = {};
  for (const session of planned) {
    const range = parseRange(session.targetPages);
    if (session.bookId && range) (scheduledPages[session.bookId] ??= []).push(range);
  }
  const contents = contentRows.map((row) => ({ id: row.id, bookId: row.bookId, sortOrder: row.sortOrder, unitNumber: row.unitNumber, unitTitle: row.unitTitle, contentType: row.contentType, label: row.label, testNumber: row.testNumber, pageStart: row.pageStart, pageEnd: row.pageEnd, topicId: row.topicId, mappingConfidence: Number(row.mappingConfidence) }));
  return buildBookRecommendations({ weakTopics, contents, donePages, scheduledPages });
}
async function getAutoSchedule(userId) {
  const db = await requireDb2();
  const [row] = await db.select({ value: studentProfiles.autoScheduleBookTasks }).from(studentProfiles).where(eq7(studentProfiles.userId, userId)).limit(1);
  return row?.value === 1;
}
async function setAutoSchedule(userId, enabled) {
  const db = await requireDb2();
  await db.insert(studentProfiles).values({ userId, autoScheduleBookTasks: enabled ? 1 : 0 }).onDuplicateKeyUpdate({ set: { autoScheduleBookTasks: enabled ? 1 : 0 } });
  return enabled;
}
async function runAutoSchedule(userId, bookTitles, maxTasks = 3) {
  if (!await getAutoSchedule(userId)) return { added: 0 };
  let added = 0;
  for (let index2 = 0; index2 < maxTasks; index2++) {
    const [next] = await getWeakTopicBookRecommendations(userId);
    if (!next) break;
    try {
      await addRecommendationToPlan(userId, { topicId: next.topicId, bookId: next.bookId, bookTitle: bookTitles[next.bookId] ?? "", when: "auto" });
      added += 1;
    } catch {
      break;
    }
  }
  return { added };
}
async function resolveBookTitle(db, userId, bookId, fallback) {
  const [custom] = await db.select({ title: userResourceBooks.title }).from(userResourceBooks).where(and5(eq7(userResourceBooks.userId, userId), eq7(userResourceBooks.bookId, bookId))).limit(1);
  if (custom) return custom.title;
  if (/^\d+$/.test(bookId)) {
    const [catalogBook] = await db.select({ name: catalogBooks.name }).from(catalogBooks).where(eq7(catalogBooks.id, Number(bookId))).limit(1);
    if (catalogBook) return catalogBook.name;
  }
  return fallback.slice(0, 120) || "Kitap";
}
async function addRecommendationToPlan(userId, input) {
  const db = await requireDb2();
  if (!await userOwnsBook(userId, input.bookId)) throw new Error("Bu kitap k\xFCt\xFCphanende bulunmuyor.");
  const recommendation = (await getWeakTopicBookRecommendations(userId)).find((rec) => rec.topicId === input.topicId && rec.bookId === input.bookId);
  if (!recommendation) throw new Error("Bu \xF6neri art\u0131k ge\xE7erli de\u011Fil (testler \xE7\xF6z\xFClm\xFC\u015F ya da zaten planlanm\u0131\u015F olabilir).");
  const date = await pickDayForTask(userId, recommendation.minutes, input.when);
  const bookTitle = await resolveBookTitle(db, userId, input.bookId, input.bookTitle);
  const unitPart = recommendation.unitNumber !== null ? `\xDCnite ${recommendation.unitNumber}` : recommendation.unitTitle;
  const testPart = recommendation.testRange ? `Test ${recommendation.testRange}` : recommendation.labels.join(", ");
  const title = `${bookTitle} \u2014 ${unitPart} \u2014 ${testPart}`.slice(0, 180);
  const targetPages = recommendation.pageStart !== null ? `${recommendation.pageStart}-${recommendation.pageEnd ?? recommendation.pageStart}` : null;
  await insertPlanTask(userId, {
    date,
    title,
    subject: recommendation.subject,
    topic: recommendation.topic,
    kind: recommendation.purpose === "review" ? "Tekrar" : "Soru",
    minutes: recommendation.minutes,
    targetPages,
    targetTests: recommendation.testRange,
    sourceBookId: input.bookId,
    planTitle: "Kitap g\xF6revleri",
    planSummary: "Zay\u0131f konular i\xE7in kitaplar\u0131ndan \xF6nerilen g\xF6revler."
  });
  return { date, title, minutes: recommendation.minutes };
}

// server/bookContent/aiMapper.ts
async function suggestTopicsWithAi(titles, candidates, invoke = invokeLLM) {
  const { enabled, maxCandidates, maxConfidence, minConfidence } = bookContentConfig.aiMapping;
  if (!enabled || titles.length === 0 || candidates.length === 0) return [];
  const pool = candidates.slice(0, maxCandidates);
  const allowed = new Set(pool.map((topic) => topic.id));
  try {
    const response = await invoke({
      messages: [
        { role: "system", content: "Bir YKS kitab\u0131n\u0131n i\xE7indekiler ba\u015Fl\u0131klar\u0131n\u0131, verilen m\xFCfredat konu listesindeki EN UYGUN konuyla e\u015Fle\u015Ftiriyorsun. Yaln\u0131zca listedeki id'lerden birini se\xE7; hi\xE7biri ger\xE7ekten uymuyorsa candidateTopicId null ver. Yeni konu \xF6nerme. confidence 0-1 aras\u0131, emin de\u011Filsen d\xFC\u015F\xFCk ver. reason tek k\u0131sa T\xFCrk\xE7e c\xFCmle." },
        { role: "user", content: JSON.stringify({ topics: pool.map((topic) => ({ id: topic.id, subject: topic.subject, unit: topic.unit, topic: topic.topic })), titles: titles.map((title) => ({ key: title.key, title: title.text, unit: title.unitTitle })) }) }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "yks_topic_mapping",
          strict: true,
          schema: {
            type: "object",
            properties: { answers: { type: "array", items: { type: "object", properties: { key: { type: "integer" }, candidateTopicId: { type: ["integer", "null"] }, confidence: { type: "number" }, reason: { type: "string" } }, required: ["key", "candidateTopicId", "confidence", "reason"], additionalProperties: false } } },
            required: ["answers"],
            additionalProperties: false
          }
        }
      }
    });
    const raw = response.choices[0]?.message?.content;
    const jsonText = typeof raw === "string" ? raw : raw?.map((part) => part.type === "text" ? part.text : "").join("");
    if (!jsonText) return [];
    const parsed = JSON.parse(jsonText);
    const keys = new Set(titles.map((title) => title.key));
    return (parsed.answers ?? []).filter((answer) => keys.has(answer.key) && answer.candidateTopicId !== null && allowed.has(answer.candidateTopicId) && Number.isFinite(answer.confidence)).map((answer) => ({ key: answer.key, topicId: answer.candidateTopicId, confidence: Math.min(maxConfidence, Math.max(0, answer.confidence)), reason: String(answer.reason ?? "").slice(0, 200) })).filter((answer) => answer.confidence >= minConfidence);
  } catch (error) {
    console.warn("[BookContent] AI mapping skipped:", error instanceof Error ? error.message : error);
    return [];
  }
}

// server/bookContent/tocPostprocess.ts
init_turkishText();

// server/bookContent/ocrText.ts
init_turkishText();
var DIGIT_LOOKALIKES = { I: "1", l: "1", "|": "1", i: "1", "!": "1", O: "0", o: "0", D: "0", Z: "2", z: "2", S: "5", s: "5", B: "8", G: "6", b: "6", q: "9", g: "9" };
function parsePageNumber(raw) {
  if (raw === null || raw === void 0) return { value: null, corrected: false, raw: "" };
  if (typeof raw === "number") return { value: Number.isInteger(raw) && raw > 0 && raw < 2e3 ? raw : null, corrected: false, raw: String(raw) };
  const text2 = raw.trim();
  const inParens = /\(\s*([^)]{1,6})\s*\)/.exec(text2)?.[1];
  const token = (inParens ?? text2.split(/[\s.…·_-]+/).filter(Boolean).pop() ?? "").trim();
  if (!token || token.length > 4) return { value: null, corrected: false, raw: text2 };
  if (/^\d+$/.test(token)) {
    const value2 = Number(token);
    return { value: value2 > 0 && value2 < 2e3 ? value2 : null, corrected: false, raw: text2 };
  }
  const letters = token.replace(/\d/g, "");
  if (!/\d/.test(token) || letters.length > token.length - letters.length) return { value: null, corrected: false, raw: text2 };
  const mapped = token.split("").map((char) => /\d/.test(char) ? char : DIGIT_LOOKALIKES[char] ?? "?").join("");
  if (!/^\d+$/.test(mapped)) return { value: null, corrected: false, raw: text2 };
  const value = Number(mapped);
  return { value: value > 0 && value < 2e3 ? value : null, corrected: true, raw: text2 };
}
function splitTrailingPage(title) {
  const match = /^(.*?)[\s.…·_]{3,}\s*\(?\s*([0-9IlOoZS|]{1,4})\s*\)?\s*$/.exec(title);
  if (!match || !/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(match[1])) return { title, pageText: null };
  return { title: match[1].trim(), pageText: match[2] };
}
function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let previous = Array.from({ length: b.length + 1 }, (_, index2) => index2);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    previous = current;
  }
  return previous[b.length];
}
function textSimilarity(a, b) {
  const left = normalizeForComparison(a), right = normalizeForComparison(b);
  if (!left && !right) return 1;
  return 1 - levenshtein(left, right) / Math.max(left.length, right.length, 1);
}
var TURKISH_LETTERS = /[A-Za-zÇĞİÖŞÜçğıöşüÂâÎîÛû]/;
var TURKISH_SPECIFIC = /[ÇĞİÖŞÜçğıöşü]/g;
var VOWELS = /[AEIİOÖUÜaeıioöuüâîû]/;
function turkishPlausibility(text2) {
  const compact = text2.replace(/\s+/g, "");
  if (!compact) return 0;
  const letters = compact.split("").filter((char) => TURKISH_LETTERS.test(char)).length;
  const digits = compact.split("").filter((char) => /\d/.test(char)).length;
  const symbols = compact.length - letters - digits - (compact.match(/[.,;:()'’\-–—/&]/g)?.length ?? 0);
  const words = text2.split(/\s+/).filter((word) => word.replace(/[^A-Za-zÇĞİÖŞÜçğıöşü]/g, "").length >= 2);
  const wordsWithVowel = words.filter((word) => VOWELS.test(word)).length;
  const letterRatio = letters / Math.max(1, compact.length - digits);
  const vowelRatio = words.length ? wordsWithVowel / words.length : 0.5;
  return Math.max(0, Math.min(1, 0.6 * letterRatio + 0.4 * vowelRatio - 0.15 * Math.max(0, symbols)));
}
var turkishCharCount = (text2) => text2.match(TURKISH_SPECIFIC)?.length ?? 0;

// server/bookContent/tocPostprocess.ts
var HEADING_WORDS = /* @__PURE__ */ new Set(["icindekiler", "icerik", "icerikler", "kitap bitirme plani", "konular", "konu listesi", "konu takip cizelgesi", "sayfa", "test", "unite"]);
function noiseReason(item, context) {
  const text2 = `${item.label ?? ""} ${item.title}`.trim();
  const normalized = normalizeForComparison(text2);
  if (!normalized) return "decorative";
  if (/\bisbn\b/.test(normalized) || /\b97[89][\d\s-]{10,}/.test(text2)) return "isbn";
  if (/\d{8,}/.test(text2.replace(/[\s-]/g, "")) && !/[a-zçğıöşü]{3,}/i.test(text2)) return "barcode";
  if (/(www\.|https?:\/\/|\.com\b|\.com\.tr\b|@)/i.test(text2)) return "url";
  if (/©|\bcopyright\b|tum haklari|yayin hakki|baski\s*:|matbaa/.test(`${text2} ${normalized}`.toLowerCase())) return "copyright";
  if (HEADING_WORDS.has(normalized)) return "heading";
  if (context.publisher && normalizeForComparison(context.publisher) === normalized) return "publisher";
  if (context.title && item.type !== "unit" && normalizeForComparison(context.title) === normalized) return "book_title";
  if (!/[a-zçğıöşü]/i.test(text2) && item.page === null) return "decorative";
  return null;
}
function repairPageNumbers(items) {
  return items.map((item) => {
    if (item.type !== "entry") return item;
    let title = item.title;
    let pageText = item.pageText ?? null;
    if (!pageText && item.page === null) {
      const split = splitTrailingPage(title);
      if (split.pageText) {
        title = split.title;
        pageText = split.pageText;
      }
    }
    if (pageText === null || pageText === void 0) return { ...item, title, review: { ...item.review, page: item.review?.page || item.page === null } };
    const parsed = parsePageNumber(pageText);
    const conflict = item.page !== null && parsed.value !== null && parsed.value !== item.page;
    return { ...item, title, pageText, page: parsed.value ?? (parsed.raw ? null : item.page), review: { ...item.review, page: Boolean(item.review?.page) || parsed.corrected || parsed.value === null || conflict } };
  });
}
function filterTocNoise(pages, context = {}) {
  const removed = [];
  const repeated = /* @__PURE__ */ new Set();
  if (pages.length > 1) {
    const seen = /* @__PURE__ */ new Map();
    for (const page of pages) {
      const onPage = new Set(page.items.filter((item) => item.page === null && item.type !== "unit").map((item) => normalizeForComparison(`${item.label ?? ""} ${item.title}`)).filter(Boolean));
      for (const key of Array.from(onPage)) seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    for (const [key, count3] of Array.from(seen.entries())) if (count3 >= 2) repeated.add(key);
  }
  const cleaned = pages.map((page) => ({
    ...page,
    items: page.items.filter((item) => {
      const reason = noiseReason(item, context) ?? (item.page === null && item.type !== "unit" && repeated.has(normalizeForComparison(`${item.label ?? ""} ${item.title}`)) ? "repeated_header" : null);
      if (reason) removed.push({ text: `${item.label ?? ""} ${item.title}`.trim(), reason });
      return !reason;
    })
  }));
  return { pages: cleaned, removed };
}
function rawTextOf(page) {
  return page.items.map((item) => [item.type === "unit" && item.unitNumber !== null && !/ünite|unite/i.test(item.title) ? `${item.unitNumber}. \xDCN\u0130TE` : "", item.label ?? "", item.title, item.pageText ?? (item.page !== null ? String(item.page) : "")].filter(Boolean).join(" ")).join("\n");
}

// server/bookContent/ocrProvider.ts
var tocItemSchema = {
  type: "object",
  properties: {
    type: { type: "string", enum: ["unit", "section", "entry"] },
    unitNumber: { type: ["integer", "null"] },
    title: { type: "string" },
    label: { type: ["string", "null"] },
    pageText: { type: ["string", "null"] },
    confidence: { type: "number" }
  },
  required: ["type", "unitNumber", "title", "label", "pageText", "confidence"],
  additionalProperties: false
};
var SYSTEM_PROMPT = [
  "Sen bir T\xFCrk\xE7e YKS kaynak kitab\u0131n\u0131n \u0130\xC7\u0130NDEK\u0130LER (konu listesi) sayfas\u0131n\u0131 sat\u0131r sat\u0131r okuyan bir OCR asistan\u0131s\u0131n.",
  "G\xF6rseldeki her sat\u0131r\u0131 yukar\u0131dan a\u015Fa\u011F\u0131ya, sayfadaki s\u0131ras\u0131yla d\xF6nd\xFCr. Yorum yapma, \xF6zetleme, eksik sat\u0131r\u0131 tahminle doldurma.",
  "type: numaral\u0131 \xFCnite ba\u015Fl\u0131\u011F\u0131 (\xF6r. '1. \xDCN\u0130TE') i\xE7in 'unit' (unitNumber dolu); \xFCnite ad\u0131 ayr\u0131 sat\u0131rdaysa veya numaras\u0131z grup ba\u015Fl\u0131\u011F\u0131ysa (\xF6r. 'S\u0130M\xDCLASYON DENEMELER\u0130') 'section'; sayfa numaras\u0131 olan her sat\u0131r i\xE7in 'entry'.",
  "entry sat\u0131rlar\u0131nda: label = sat\u0131r ba\u015F\u0131ndaki etiket ('Test 1', '\xD6SYM Tipi', 'Sarmal Test \u2013 2', 'Sim\xFClasyon 3', '\xD6SYM Tipi - E\u011Fitim Kontrol Testi - 1'); title = etiketten sonraki konu ad\u0131 (yoksa bo\u015F string); pageText = sat\u0131r\u0131n sa\u011F\u0131ndaki sayfa numaras\u0131n\u0131 G\xD6RD\xDC\u011E\xDCN G\u0130B\u0130 yaz (\xF6r. '12'; '1' ile 'I' ay\u0131rt edilemiyorsa g\xF6rd\xFC\u011F\xFCn\xFC yaz, d\xFCzeltme yapma), yoksa null.",
  "Foto\u011Fraf e\u011Fik \xE7ekilmi\u015F olabilir: sayfa numaras\u0131, noktal\u0131 \xE7izginin (.....) ba\u011Flad\u0131\u011F\u0131 sat\u0131ra aittir, hizas\u0131 yar\u0131m sat\u0131r kaym\u0131\u015F g\xF6r\xFCnse bile. Bir \xFCnite ba\u015Fl\u0131\u011F\u0131na sayfa numaras\u0131 atama; numaralar test sat\u0131rlar\u0131na aittir.",
  "Kitaplar\u0131n i\xE7indekiler d\xFCzeni farkl\u0131d\u0131r. \xDCnite/test yoksa ve sayfa numaral\u0131 bir KONU L\u0130STES\u0130 varsa (\xF6r. 'K\u0130TAP B\u0130T\u0130RME PLANI', 'KONULAR', 'Konu Takip \xC7izelgesi'; '1. TOPLAMA VE \xC7IKARMA \u0130\u015ELEM\u0130' ba\u015Fl\u0131\u011F\u0131 ve alt\u0131nda 'Sayfa (3)'), her konu bir 'entry'dir: label = null, title = numaras\u0131z konu ad\u0131 (iki sat\u0131ra b\xF6l\xFCnm\xFC\u015Fse birle\u015Ftir; harfleri kitaptaki gibi, b\xFCy\xFCk harfse b\xFCy\xFCk), pageText = o konunun sayfa numaras\u0131 ('Sayfa (3)' \u2192 '3'). 'Sayfa' kelimesini ve onay kutular\u0131n\u0131 ba\u015Fl\u0131\u011Fa katma.",
  "Sayfa \u0130K\u0130 ya da daha \xE7ok S\xDCTUNLUYSA \xF6nce sol s\xFCtunu yukar\u0131dan a\u015Fa\u011F\u0131ya, sonra sa\u011F s\xFCtunu oku; sat\u0131rlar\u0131 s\xFCtunlar aras\u0131nda kar\u0131\u015Ft\u0131rma. Konu numaralar\u0131 (1, 2, 3\u2026) okuma s\u0131ras\u0131n\u0131 do\u011Frulamana yard\u0131m eder.",
  "Foto\u011Fraf yan (90\xB0) ya da ters \xE7ekilmi\u015F, sayfa kadraj\u0131n k\xFC\xE7\xFCk bir k\u0131sm\u0131nda, arka sayfan\u0131n yaz\u0131s\u0131 soluk bi\xE7imde g\xF6r\xFCn\xFCr olabilir: yaz\u0131y\u0131 d\xF6nd\xFCrerek oku, soluk arka sayfa yaz\u0131s\u0131n\u0131 yok say.",
  "Okuyamad\u0131\u011F\u0131n sayfa numaras\u0131n\u0131 null b\u0131rak, uydurma. Metni kitaptaki gibi, T\xFCrk\xE7e karakterleriyle (\xE7 \u011F \u0131 \u0130 \xF6 \u015F \xFC) yaz; karakteri net g\xF6remiyorsan en olas\u0131 harfi yaz ama o sat\u0131r\u0131n confidence de\u011Ferini d\xFC\u015F\xFCr. confidence: o sat\u0131r\u0131 ne kadar net okudu\u011Fun (0\u20131); bulan\u0131k, g\xF6lgeli, kesik ya da tahmin i\xE7eren sat\u0131rlarda 0.6'n\u0131n alt\u0131nda ver. ISBN, barkod, web adresi, yay\u0131nevi logosu, telif yaz\u0131s\u0131 ve sayfa \xFCst/alt bilgisi i\xE7indekiler sat\u0131r\u0131 DE\u011E\u0130LD\u0130R, items'a ekleme.",
  "pageKind: g\xF6rsel konular\u0131 sayfa numaralar\u0131yla listeleyen herhangi bir sayfaysa (i\xE7indekiler, kitap bitirme plan\u0131, konu listesi) 'table_of_contents'; kitap kapa\u011F\u0131ysa 'cover'; ba\u015Fka bir \u015Feyse 'other' (bu iki durumda items bo\u015F olabilir)."
].join(" ");
var llmVisionOcrProvider = {
  name: "llm-vision",
  async extractTableOfContentsPage(imageDataUrl, hint) {
    const instruction = hint ? `Bu i\xE7indekiler sayfas\u0131n\u0131 yeniden, dikkatle oku. \u0130lk okumada \u015Fu tutars\u0131zl\u0131klar bulundu: ${hint.issues.join(" | ")}. \u0130lk okuma: ${JSON.stringify(hint.previous.items).slice(0, 6e3)}. G\xF6rselde noktal\u0131 \xE7izgileri takip ederek her sayfa numaras\u0131n\u0131 do\u011Fru sat\u0131ra e\u015Fle; g\xF6rselde olmayan bir \u015Feyi ekleme.` : "Bu i\xE7indekiler sayfas\u0131n\u0131 oku.";
    const response = await invokeLLM({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: [{ type: "text", text: instruction }, { type: "image_url", image_url: { url: imageDataUrl, detail: "high" } }] }
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "yks_book_toc_page", strict: true, schema: { type: "object", properties: { pageKind: { type: "string", enum: ["table_of_contents", "cover", "other"] }, items: { type: "array", items: tocItemSchema } }, required: ["pageKind", "items"], additionalProperties: false } }
      }
    });
    const raw = response.choices[0]?.message?.content;
    const jsonText = typeof raw === "string" ? raw : raw?.map((part) => part.type === "text" ? part.text : "").join("");
    if (!jsonText) throw new Error("OCR yan\u0131t\u0131 bo\u015F d\xF6nd\xFC");
    const parsed = JSON.parse(jsonText);
    const items = repairPageNumbers((parsed.items ?? []).filter(
      (item) => Boolean(item) && ["unit", "section", "entry"].includes(item.type) && typeof item.title === "string"
    ).map((item) => ({
      type: item.type,
      unitNumber: Number.isInteger(item.unitNumber) ? item.unitNumber : null,
      title: item.title.slice(0, 300),
      label: typeof item.label === "string" ? item.label.slice(0, 120) : null,
      // Sayfa numarası sağlayıcının ham metninden deterministik olarak çözülür (bkz. repairPageNumbers).
      page: null,
      pageText: typeof item.pageText === "string" ? item.pageText.slice(0, 20) : null,
      confidence: typeof item.confidence === "number" && Number.isFinite(item.confidence) ? Math.max(0, Math.min(1, item.confidence)) : 0.7
    })));
    const pageKind = parsed.pageKind === "cover" || parsed.pageKind === "other" ? parsed.pageKind : "table_of_contents";
    return { items, pageKind };
  }
};
var getOcrProvider = () => llmVisionOcrProvider;
async function extractPlainTextFromImage(imageDataUrl) {
  const response = await invokeLLM({
    messages: [
      { role: "system", content: "G\xF6rseldeki yaz\u0131y\u0131 oldu\u011Fu gibi, T\xFCrk\xE7e karakterleriyle ve sat\u0131r yap\u0131s\u0131n\u0131 koruyarak metne d\xF6k. Matematiksel ifadeleri d\xFCz yaz\u0131yla (\xF6r. x^2 + y^2 = z^2) yaz. Yorum ekleme, \xF6zetleme, \xE7evirme. G\xF6rselde okunabilir yaz\u0131 yoksa bo\u015F string d\xF6nd\xFCr." },
      { role: "user", content: [{ type: "text", text: "Bu g\xF6rseldeki metni \xE7\u0131kar." }, { type: "image_url", image_url: { url: imageDataUrl, detail: "high" } }] }
    ],
    response_format: { type: "json_schema", json_schema: { name: "note_image_text", strict: true, schema: { type: "object", properties: { text: { type: "string" } }, required: ["text"], additionalProperties: false } } }
  });
  const raw = response.choices[0]?.message?.content;
  const jsonText = typeof raw === "string" ? raw : raw?.map((part) => part.type === "text" ? part.text : "").join("");
  if (!jsonText) throw new Error("OCR yan\u0131t\u0131 bo\u015F d\xF6nd\xFC");
  return String(JSON.parse(jsonText).text ?? "").slice(0, 2e4).trim();
}

// server/bookContent/ocrCache.ts
import { createHash as createHash2 } from "node:crypto";
import { and as and6, eq as eq8, lt as lt3 } from "drizzle-orm";
var OCR_PIPELINE_VERSION = "toc-2.0";
var CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1e3;
var disabledReason = null;
var imageHash = (buffer) => createHash2("sha256").update(buffer).digest("hex");
function disable(error) {
  const message = error instanceof Error ? error.message : String(error);
  if (!disabledReason) console.warn(`[OCR cache] disabled: ${message.slice(0, 200)}`);
  disabledReason = message;
}
async function readOcrCache(userId, hash) {
  if (disabledReason) return null;
  try {
    const db = await getDb();
    if (!db) return null;
    const [row] = await db.select({ resultJson: ocrPageCache.resultJson, createdAt: ocrPageCache.createdAt }).from(ocrPageCache).where(and6(eq8(ocrPageCache.userId, userId), eq8(ocrPageCache.imageHash, hash), eq8(ocrPageCache.pipelineVersion, OCR_PIPELINE_VERSION))).limit(1);
    if (!row || Date.now() - new Date(row.createdAt).getTime() > CACHE_TTL_MS) return null;
    return JSON.parse(row.resultJson);
  } catch (error) {
    disable(error);
    return null;
  }
}
async function writeOcrCache(userId, hash, result) {
  if (disabledReason) return;
  try {
    const db = await getDb();
    if (!db) return;
    const resultJson = JSON.stringify(result);
    await db.insert(ocrPageCache).values({ userId, imageHash: hash, pipelineVersion: OCR_PIPELINE_VERSION, resultJson }).onDuplicateKeyUpdate({ set: { resultJson, createdAt: /* @__PURE__ */ new Date() } });
    await db.delete(ocrPageCache).where(and6(eq8(ocrPageCache.userId, userId), lt3(ocrPageCache.createdAt, new Date(Date.now() - CACHE_TTL_MS))));
  } catch (error) {
    disable(error);
  }
}

// server/bookContent/ocrOrchestrator.ts
import fs from "node:fs";
import path from "node:path";

// shared/imaging/image.ts
var createGray = (width, height, fill = 0) => {
  const data = new Float32Array(width * height);
  if (fill) data.fill(fill);
  return { width, height, data };
};
function toGray(image) {
  const out = createGray(image.width, image.height);
  const source = image.data;
  for (let index2 = 0, offset = 0; index2 < out.data.length; index2++, offset += 4) {
    out.data[index2] = 0.299 * source[offset] + 0.587 * source[offset + 1] + 0.114 * source[offset + 2];
  }
  return out;
}
function grayToRgba(image) {
  const out = new Uint8ClampedArray(image.width * image.height * 4);
  for (let index2 = 0, offset = 0; index2 < image.data.length; index2++, offset += 4) {
    const value = image.data[index2];
    out[offset] = out[offset + 1] = out[offset + 2] = value;
    out[offset + 3] = 255;
  }
  return out;
}
var sample = (image, x, y, fill) => {
  if (x < 0 || y < 0 || x > image.width - 1 || y > image.height - 1) return fill;
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const x1 = Math.min(image.width - 1, x0 + 1), y1 = Math.min(image.height - 1, y0 + 1);
  const tx = x - x0, ty = y - y0;
  const row0 = y0 * image.width, row1 = y1 * image.width;
  const top = image.data[row0 + x0] * (1 - tx) + image.data[row0 + x1] * tx;
  const bottom = image.data[row1 + x0] * (1 - tx) + image.data[row1 + x1] * tx;
  return top * (1 - ty) + bottom * ty;
};
function resizeGray(image, width, height) {
  width = Math.max(1, Math.round(width));
  height = Math.max(1, Math.round(height));
  const out = createGray(width, height);
  const scaleX = image.width / width, scaleY = image.height / height;
  if (scaleX <= 1 && scaleY <= 1) {
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) out.data[y * width + x] = sample(image, (x + 0.5) * scaleX - 0.5, (y + 0.5) * scaleY - 0.5, 255);
    return out;
  }
  for (let y = 0; y < height; y++) {
    const sy0 = Math.floor(y * scaleY), sy1 = Math.max(sy0 + 1, Math.min(image.height, Math.floor((y + 1) * scaleY)));
    for (let x = 0; x < width; x++) {
      const sx0 = Math.floor(x * scaleX), sx1 = Math.max(sx0 + 1, Math.min(image.width, Math.floor((x + 1) * scaleX)));
      let sum = 0;
      for (let sy = sy0; sy < sy1; sy++) for (let sx = sx0; sx < sx1; sx++) sum += image.data[sy * image.width + sx];
      out.data[y * width + x] = sum / ((sy1 - sy0) * (sx1 - sx0));
    }
  }
  return out;
}
function limitSize(image, maxDimension) {
  const longest = Math.max(image.width, image.height);
  if (longest <= maxDimension) return image;
  const scale = maxDimension / longest;
  return resizeGray(image, image.width * scale, image.height * scale);
}
function rotateQuarter(image, degrees) {
  if (degrees === 0) return image;
  const { width, height, data } = image;
  const swap = degrees !== 180;
  const out = createGray(swap ? height : width, swap ? width : height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const value = data[y * width + x];
      let nx, ny;
      if (degrees === 90) {
        nx = height - 1 - y;
        ny = x;
      } else if (degrees === 180) {
        nx = width - 1 - x;
        ny = height - 1 - y;
      } else {
        nx = y;
        ny = width - 1 - x;
      }
      out.data[ny * out.width + nx] = value;
    }
  }
  return out;
}
function rotateSmall(image, degrees, fill = 255) {
  if (Math.abs(degrees) < 1e-3) return image;
  const radians = degrees * Math.PI / 180;
  const cos = Math.cos(radians), sin = Math.sin(radians);
  const cx = (image.width - 1) / 2, cy = (image.height - 1) / 2;
  const out = createGray(image.width, image.height);
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const dx = x - cx, dy = y - cy;
      out.data[y * image.width + x] = sample(image, cx + dx * cos + dy * sin, cy - dx * sin + dy * cos, fill);
    }
  }
  return out;
}
function percentileOf(values, fraction, maxSamples = 2e5) {
  const length = values.length;
  if (!length) return 0;
  const step = Math.max(1, Math.floor(length / maxSamples));
  const picked = [];
  for (let index2 = 0; index2 < length; index2 += step) picked.push(values[index2]);
  picked.sort((a, b) => a - b);
  return picked[Math.min(picked.length - 1, Math.max(0, Math.floor(picked.length * fraction)))];
}

// shared/imaging/enhance.ts
function estimateBackground(image) {
  const { width, height, data } = image;
  const block = Math.max(16, Math.round(Math.max(width, height) / 60));
  const gw = Math.ceil(width / block), gh = Math.ceil(height / block);
  const raw = new Float32Array(gw * gh);
  const values = [];
  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      values.length = 0;
      for (let y = gy * block; y < Math.min(height, (gy + 1) * block); y += 2) for (let x = gx * block; x < Math.min(width, (gx + 1) * block); x += 2) values.push(data[y * width + x]);
      values.sort((a, b) => a - b);
      raw[gy * gw + gx] = values.length ? values[Math.floor(values.length * 0.95)] : 255;
    }
  }
  const grid = new Float32Array(gw * gh);
  for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
    let sum = 0, count3 = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const x = gx + dx, y = gy + dy;
      if (x >= 0 && y >= 0 && x < gw && y < gh) {
        sum += raw[y * gw + x];
        count3++;
      }
    }
    grid[gy * gw + gx] = sum / count3;
  }
  const at = (x, y) => {
    const fx = Math.min(gw - 1, Math.max(0, x / block - 0.5)), fy = Math.min(gh - 1, Math.max(0, y / block - 0.5));
    const x0 = Math.floor(fx), y0 = Math.floor(fy), x1 = Math.min(gw - 1, x0 + 1), y1 = Math.min(gh - 1, y0 + 1);
    const tx = fx - x0, ty = fy - y0;
    const top = grid[y0 * gw + x0] * (1 - tx) + grid[y0 * gw + x1] * tx;
    const bottom = grid[y1 * gw + x0] * (1 - tx) + grid[y1 * gw + x1] * tx;
    return top * (1 - ty) + bottom * ty;
  };
  return { block, gw, gh, grid, at };
}
function flattenIllumination(image, background = estimateBackground(image)) {
  const out = createGray(image.width, image.height);
  for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
    const index2 = y * image.width + x;
    out.data[index2] = Math.min(255, image.data[index2] / Math.max(24, background.at(x, y)) * 255);
  }
  return out;
}
function stretchContrast(image, options = {}) {
  const low = percentileOf(image.data, options.lowPct ?? 0.01);
  const high = Math.max(low + 30, percentileOf(image.data, options.highPct ?? 0.9));
  const knee = options.knee ?? 0.8;
  const gamma = options.gamma ?? 1.6;
  const out = createGray(image.width, image.height);
  for (let index2 = 0; index2 < image.data.length; index2++) {
    const normalized = Math.min(1, Math.max(0, (image.data[index2] - low) / (high - low) / knee));
    out.data[index2] = 255 * normalized ** gamma;
  }
  return out;
}
function otsuThreshold(image) {
  const histogram = new Float64Array(256);
  for (let index2 = 0; index2 < image.data.length; index2++) histogram[Math.max(0, Math.min(255, Math.round(image.data[index2])))]++;
  const total = image.data.length;
  let sumAll = 0;
  for (let value = 0; value < 256; value++) sumAll += value * histogram[value];
  let sumBackground = 0, weightBackground = 0, best = 0, threshold = 127;
  for (let value = 0; value < 256; value++) {
    weightBackground += histogram[value];
    if (!weightBackground) continue;
    const weightForeground = total - weightBackground;
    if (!weightForeground) break;
    sumBackground += value * histogram[value];
    const meanBackground = sumBackground / weightBackground;
    const meanForeground = (sumAll - sumBackground) / weightForeground;
    const between = weightBackground * weightForeground * (meanBackground - meanForeground) ** 2;
    if (between > best) {
      best = between;
      threshold = value;
    }
  }
  return threshold;
}
function binarizeGlobal(image, threshold) {
  const out = createGray(image.width, image.height);
  for (let index2 = 0; index2 < image.data.length; index2++) out.data[index2] = image.data[index2] > threshold ? 255 : 0;
  return out;
}
function binarizeSauvola(image, options = {}) {
  const { width, height, data } = image;
  const radius = Math.max(4, Math.floor((options.window ?? Math.max(15, Math.round(Math.min(width, height) / 40))) / 2));
  const k = options.k ?? 0.2;
  const stride = width + 1;
  const sum = new Float64Array(stride * (height + 1));
  const sumSq = new Float64Array(stride * (height + 1));
  for (let y = 0; y < height; y++) {
    let rowSum = 0, rowSq = 0;
    for (let x = 0; x < width; x++) {
      const value = data[y * width + x];
      rowSum += value;
      rowSq += value * value;
      sum[(y + 1) * stride + x + 1] = sum[y * stride + x + 1] + rowSum;
      sumSq[(y + 1) * stride + x + 1] = sumSq[y * stride + x + 1] + rowSq;
    }
  }
  const out = createGray(width, height);
  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - radius), y1 = Math.min(height, y + radius + 1);
    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - radius), x1 = Math.min(width, x + radius + 1);
      const count3 = (y1 - y0) * (x1 - x0);
      const s = sum[y1 * stride + x1] - sum[y0 * stride + x1] - sum[y1 * stride + x0] + sum[y0 * stride + x0];
      const sq = sumSq[y1 * stride + x1] - sumSq[y0 * stride + x1] - sumSq[y1 * stride + x0] + sumSq[y0 * stride + x0];
      const mean2 = s / count3;
      const std = Math.sqrt(Math.max(0, sq / count3 - mean2 * mean2));
      const threshold = mean2 * (1 + k * (std / 128 - 1));
      out.data[y * width + x] = data[y * width + x] > threshold ? 255 : 0;
    }
  }
  return out;
}
function median3(image) {
  const { width, height, data } = image;
  const out = createGray(width, height);
  const window2 = new Float32Array(9);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    let count3 = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const sx = Math.min(width - 1, Math.max(0, x + dx)), sy = Math.min(height - 1, Math.max(0, y + dy));
      window2[count3++] = data[sy * width + sx];
    }
    window2.sort();
    out.data[y * width + x] = window2[4];
  }
  return out;
}
function boxBlur3(image) {
  const { width, height, data } = image;
  const out = createGray(width, height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    let sum = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) sum += data[Math.min(height - 1, Math.max(0, y + dy)) * width + Math.min(width - 1, Math.max(0, x + dx))];
    out.data[y * width + x] = sum / 9;
  }
  return out;
}
function unsharpMask(image, amount = 0.6) {
  const blurred = boxBlur3(image);
  const out = createGray(image.width, image.height);
  for (let index2 = 0; index2 < image.data.length; index2++) out.data[index2] = Math.max(0, Math.min(255, image.data[index2] + amount * (image.data[index2] - blurred.data[index2])));
  return out;
}

// shared/imaging/geometry.ts
function inkPoints(image, options = {}) {
  const flat = flattenIllumination(image);
  const threshold = Math.min(200, otsuThreshold(flat));
  let total = 0;
  for (let index2 = 0; index2 < flat.data.length; index2++) if (flat.data[index2] < threshold) total++;
  const { width, height } = flat;
  const stride = width + 1;
  const integral = new Float64Array(stride * (height + 1));
  for (let y = 0; y < height; y++) {
    let row = 0;
    for (let x = 0; x < width; x++) {
      row += flat.data[y * width + x] < threshold ? 1 : 0;
      integral[(y + 1) * stride + x + 1] = integral[y * stride + x + 1] + row;
    }
  }
  const radius = Math.max(6, Math.round(Math.max(width, height) / 70));
  const density = (x, y) => {
    const x0 = Math.max(0, x - radius), x1 = Math.min(width, x + radius + 1), y0 = Math.max(0, y - radius), y1 = Math.min(height, y + radius + 1);
    return (integral[y1 * stride + x1] - integral[y0 * stride + x1] - integral[y1 * stride + x0] + integral[y0 * stride + x0]) / ((x1 - x0) * (y1 - y0));
  };
  const step = Math.max(1, Math.ceil(total / (options.maxPoints ?? 6e4)));
  const xs = new Float32Array(Math.ceil(total / step) + 1), ys = new Float32Array(xs.length);
  let seen = 0, count3 = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (flat.data[y * width + x] >= threshold) continue;
    if (seen++ % step !== 0) continue;
    if (options.textOnly && density(x, y) > 0.35) continue;
    xs[count3] = x;
    ys[count3] = y;
    count3++;
  }
  return { xs, ys, count: count3, ratio: total / flat.data.length };
}
function projectionPeakiness(values, count3, bins, offset, shear, shearFactor) {
  const histogram = new Float64Array(bins);
  for (let index2 = 0; index2 < count3; index2++) {
    const bin = Math.round(values[index2] - (shear ? shear[index2] * shearFactor : 0)) + offset;
    if (bin >= 0 && bin < bins) histogram[bin]++;
  }
  let sumSq = 0;
  for (let bin = 0; bin < bins; bin++) sumSq += histogram[bin] * histogram[bin];
  return sumSq / (count3 * count3 / bins);
}
function estimateSkew(image, options = {}) {
  const work = limitSize(image, 900);
  const points = inkPoints(work, { textOnly: true });
  if (points.count < 200 || points.ratio > 0.45) return { angle: 0, confidence: 0 };
  const maxAngle = options.maxAngle ?? 8, step = options.step ?? 0.25;
  const margin = Math.ceil(work.width * Math.tan(maxAngle * Math.PI / 180)) + 2;
  const bins = work.height + 2 * margin;
  const scores = [];
  for (let angle = -maxAngle; angle <= maxAngle + 1e-9; angle += step) {
    scores.push({ angle, score: projectionPeakiness(points.ys, points.count, bins, margin, points.xs, Math.tan(angle * Math.PI / 180)) });
  }
  const best = scores.reduce((a, b) => b.score > a.score ? b : a);
  const sorted = scores.map((item) => item.score).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const confidence = Math.max(0, Math.min(1, (best.score / Math.max(1e-9, median) - 1) / 0.6));
  return { angle: Math.round(best.angle * 100) / 100, confidence: Math.round(confidence * 100) / 100 };
}
function detectOrientation(image) {
  const work = limitSize(image, 900);
  const points = inkPoints(work);
  if (points.count < 200) return { sideways: false, confidence: 0, horizontalScore: 1, verticalScore: 1 };
  const best = (values, other, length, otherLength) => {
    let top = 0;
    for (let angle = -6; angle <= 6; angle += 1) {
      const margin = Math.ceil(otherLength * Math.tan(6 * Math.PI / 180)) + 2;
      top = Math.max(top, projectionPeakiness(values, points.count, length + 2 * margin, margin, other, Math.tan(angle * Math.PI / 180)));
    }
    return top;
  };
  const horizontalScore = best(points.ys, points.xs, work.height, work.width);
  const verticalScore = best(points.xs, points.ys, work.width, work.height);
  const ratio = verticalScore / Math.max(1e-9, horizontalScore);
  return { sideways: ratio > 1.25, confidence: Math.max(0, Math.min(1, Math.abs(Math.log(ratio)) / Math.log(2))), horizontalScore, verticalScore };
}
var quadArea = (quad) => {
  const points = [quad.topLeft, quad.topRight, quad.bottomRight, quad.bottomLeft];
  let area = 0;
  for (let index2 = 0; index2 < 4; index2++) {
    const a = points[index2], b = points[(index2 + 1) % 4];
    area += a.x * b.y - b.x * a.y;
  }
  return Math.abs(area) / 2;
};
var distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function perspectiveDistortionOf(quad) {
  const top = distance(quad.topLeft, quad.topRight), bottom = distance(quad.bottomLeft, quad.bottomRight);
  const left = distance(quad.topLeft, quad.bottomLeft), right = distance(quad.topRight, quad.bottomRight);
  const horizontal = 1 - Math.min(top, bottom) / Math.max(top, bottom, 1e-9);
  const vertical = 1 - Math.min(left, right) / Math.max(left, right, 1e-9);
  return Math.round(Math.min(1, (horizontal + vertical) * 2) * 100) / 100;
}
function detectDocument(image) {
  const work = limitSize(image, 320);
  const { width, height, data } = work;
  const scale = image.width / width;
  const threshold = otsuThreshold(work);
  const total = width * height;
  const label = new Int32Array(total).fill(-1);
  const stack = new Int32Array(total);
  let bestLabel = -1, bestCount = 0, current = 0;
  for (let start = 0; start < total; start++) {
    if (label[start] !== -1 || data[start] <= threshold) continue;
    let top2 = 0, count3 = 0;
    stack[top2++] = start;
    label[start] = current;
    while (top2) {
      const index2 = stack[--top2];
      count3++;
      const x = index2 % width, y = (index2 - x) / width;
      const neighbours = [x > 0 ? index2 - 1 : -1, x < width - 1 ? index2 + 1 : -1, y > 0 ? index2 - width : -1, y < height - 1 ? index2 + width : -1];
      for (const next of neighbours) if (next >= 0 && label[next] === -1 && data[next] > threshold) {
        label[next] = current;
        stack[top2++] = next;
      }
    }
    if (count3 > bestCount) {
      bestCount = count3;
      bestLabel = current;
    }
    current++;
  }
  const none = { quad: null, coverage: 1, confidence: 0, perspectiveDistortion: 0, touchesEdges: 0 };
  if (bestLabel < 0 || bestCount < total * 0.05) return none;
  const outside = new Uint8Array(total);
  let top = 0;
  const pushOutside = (index2) => {
    if (!outside[index2] && label[index2] !== bestLabel) {
      outside[index2] = 1;
      stack[top++] = index2;
    }
  };
  for (let x = 0; x < width; x++) {
    pushOutside(x);
    pushOutside((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    pushOutside(y * width);
    pushOutside(y * width + width - 1);
  }
  while (top) {
    const index2 = stack[--top];
    const x = index2 % width, y = (index2 - x) / width;
    if (x > 0) pushOutside(index2 - 1);
    if (x < width - 1) pushOutside(index2 + 1);
    if (y > 0) pushOutside(index2 - width);
    if (y < height - 1) pushOutside(index2 + width);
  }
  let filled = 0;
  let tl = { x: 0, y: 0, v: Infinity }, br = { x: 0, y: 0, v: -Infinity }, tr = { x: 0, y: 0, v: -Infinity }, bl = { x: 0, y: 0, v: Infinity };
  let touchLeft = false, touchRight = false, touchTop = false, touchBottom = false;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (outside[y * width + x]) continue;
    filled++;
    if (x === 0) touchLeft = true;
    if (x === width - 1) touchRight = true;
    if (y === 0) touchTop = true;
    if (y === height - 1) touchBottom = true;
    const sum = x + y, diff = x - y;
    if (sum < tl.v) tl = { x, y, v: sum };
    if (sum > br.v) br = { x, y, v: sum };
    if (diff > tr.v) tr = { x, y, v: diff };
    if (diff < bl.v) bl = { x, y, v: diff };
  }
  const quadSmall = { topLeft: tl, topRight: tr, bottomRight: br, bottomLeft: bl };
  const area = quadArea(quadSmall);
  const coverage = Math.min(1, area / total);
  const rectangularity = area > 0 ? Math.min(1, filled / area) : 0;
  const touchesEdges = [touchLeft, touchRight, touchTop, touchBottom].filter(Boolean).length;
  const quad = {
    topLeft: { x: tl.x * scale, y: tl.y * scale },
    topRight: { x: (tr.x + 1) * scale, y: tr.y * scale },
    bottomRight: { x: (br.x + 1) * scale, y: (br.y + 1) * scale },
    bottomLeft: { x: bl.x * scale, y: (bl.y + 1) * scale }
  };
  let confidence = Math.max(0, (rectangularity - 0.8) / 0.18);
  if (coverage > 0.93 || coverage < 0.15) confidence = 0;
  confidence *= touchesEdges >= 3 ? 0.3 : touchesEdges === 2 ? 0.7 : 1;
  return { quad, coverage: Math.round(coverage * 100) / 100, confidence: Math.round(Math.min(1, confidence) * 100) / 100, perspectiveDistortion: perspectiveDistortionOf(quad), touchesEdges };
}
function solveHomography(from, to) {
  const matrix = [];
  for (let index2 = 0; index2 < 4; index2++) {
    const { x, y } = from[index2], { x: u, y: v } = to[index2];
    matrix.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
    matrix.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  }
  for (let column = 0; column < 8; column++) {
    let pivot = column;
    for (let row = column + 1; row < 8; row++) if (Math.abs(matrix[row][column]) > Math.abs(matrix[pivot][column])) pivot = row;
    [matrix[column], matrix[pivot]] = [matrix[pivot], matrix[column]];
    const divisor = matrix[column][column];
    if (Math.abs(divisor) < 1e-12) throw new Error("degenerate quad");
    for (let k = column; k < 9; k++) matrix[column][k] /= divisor;
    for (let row = 0; row < 8; row++) {
      if (row === column) continue;
      const factor = matrix[row][column];
      for (let k = column; k < 9; k++) matrix[row][k] -= factor * matrix[column][k];
    }
  }
  return [...matrix.map((row) => row[8]), 1];
}
function warpPerspective(image, quad, maxDimension = 2600) {
  const widthTop = distance(quad.topLeft, quad.topRight), widthBottom = distance(quad.bottomLeft, quad.bottomRight);
  const heightLeft = distance(quad.topLeft, quad.bottomLeft), heightRight = distance(quad.topRight, quad.bottomRight);
  let outWidth = Math.max(widthTop, widthBottom), outHeight = Math.max(heightLeft, heightRight);
  const scale = Math.min(1, maxDimension / Math.max(outWidth, outHeight));
  outWidth = Math.max(1, Math.round(outWidth * scale));
  outHeight = Math.max(1, Math.round(outHeight * scale));
  const h = solveHomography(
    [{ x: 0, y: 0 }, { x: outWidth - 1, y: 0 }, { x: outWidth - 1, y: outHeight - 1 }, { x: 0, y: outHeight - 1 }],
    [quad.topLeft, quad.topRight, quad.bottomRight, quad.bottomLeft]
  );
  const out = createGray(outWidth, outHeight);
  for (let y = 0; y < outHeight; y++) for (let x = 0; x < outWidth; x++) {
    const w = h[6] * x + h[7] * y + h[8];
    out.data[y * outWidth + x] = sample(image, (h[0] * x + h[1] * y + h[2]) / w, (h[3] * x + h[4] * y + h[5]) / w, 255);
  }
  return out;
}

// shared/imaging/pipeline.ts
var preprocessingConfig = {
  /** Kalite seviyesine göre en fazla okuma geçişi (ilk dalga + ikinci dalga). */
  passBudget: { GOOD: 2, ACCEPTABLE: 4, POOR: 6 },
  perspective: { minConfidence: 0.7, maxCoverage: 0.9 },
  deskew: { minAngle: 0.5, minConfidence: 0.35, maxAngle: 8 },
  /** Satır yüksekliği bunun altındaysa büyüt (1.5x); yarısının altındaysa 2x. */
  upscaleBelowTextPx: 18,
  maxOutputDimension: 2600,
  /** Bu değerlerin üstü ilgili düzeltmeyi tetikler. */
  triggers: { illuminationShadow: 0.25, illuminationBrightness: 0.5, lowContrast: 0.55, denoiseNoise: 0.5, sharpenBlur: 0.3 }
};
function planPreprocessing(quality, config = preprocessingConfig) {
  const perspective = quality.documentConfidence >= config.perspective.minConfidence && quality.documentCoverage <= config.perspective.maxCoverage && quality.documentQuad !== null;
  const sideways = quality.orientation === "sideways";
  const deskew = sideways || Math.abs(quality.skew) >= config.deskew.minAngle && quality.skewConfidence >= config.deskew.minConfidence;
  const geometry = [...perspective ? ["perspective"] : [], ...sideways ? ["rotate"] : [], ...deskew ? ["deskew"] : []];
  const photometric = ["grayscale"];
  if (quality.noise >= config.triggers.denoiseNoise) photometric.push("denoise");
  const needsIllumination = quality.shadow >= config.triggers.illuminationShadow || quality.brightness < config.triggers.illuminationBrightness || quality.glare > 0;
  if (needsIllumination) photometric.push("illumination");
  photometric.push(needsIllumination || quality.contrast < config.triggers.lowContrast ? "contrast" : "contrast_mild");
  const textHeight = quality.estimatedTextHeight;
  const upscale = textHeight !== null && textHeight < config.upscaleBelowTextPx ? textHeight < config.upscaleBelowTextPx / 2 ? 2 : 1.5 : 1;
  if (upscale > 1) photometric.push("upscale");
  if (quality.blur >= config.triggers.sharpenBlur || upscale > 1) photometric.push("sharpen");
  const rotation = sideways ? "auto" : 0;
  const variants = [{ id: "A_original", kind: "original", rotate: 0, steps: [], upscale: 1, wave: 1 }];
  if (sideways) {
    variants.push({ id: "B_enhanced_r90", kind: "enhanced", rotate: 90, steps: [...geometry, ...photometric], upscale, wave: 1 });
    variants.push({ id: "B_enhanced_r270", kind: "enhanced", rotate: 270, steps: [...geometry, ...photometric], upscale, wave: 1 });
  } else {
    variants.push({ id: "B_enhanced", kind: "enhanced", rotate: 0, steps: [...geometry, ...photometric], upscale, wave: 1 });
  }
  const binarizeBase = [...geometry, "grayscale", ...photometric.includes("denoise") ? ["denoise"] : [], "illumination", ...upscale > 1 ? ["upscale"] : []];
  variants.push({ id: "C_adaptive", kind: "adaptive", rotate: rotation, steps: [...binarizeBase, "sauvola"], upscale, wave: quality.level === "POOR" && !sideways ? 1 : 2 });
  variants.push({ id: "D_otsu", kind: "otsu", rotate: rotation, steps: [...binarizeBase, "otsu"], upscale, wave: 2 });
  if (geometry.length) variants.push({ id: "E_geometry_gray", kind: "geometry_gray", rotate: rotation, steps: [...geometry, "grayscale"], upscale: 1, wave: 2 });
  const budget = config.passBudget[quality.level] + (sideways ? 1 : 0);
  return { level: quality.level, variants: variants.slice(0, budget), geometry: { perspective, deskew, sideways } };
}
function renderVariant(source, spec, quality, rotation = spec.rotate === "auto" ? 0 : spec.rotate, config = preprocessingConfig) {
  let image = source;
  const applied = [];
  const has = (step) => spec.steps.includes(step);
  if (has("perspective") && quality.documentQuad) {
    try {
      image = warpPerspective(image, quality.documentQuad, config.maxOutputDimension);
      applied.push("perspective");
    } catch {
    }
  }
  if (rotation) {
    image = rotateQuarter(image, rotation);
    applied.push(`rotate${rotation}`);
  }
  if (has("deskew")) {
    const skew = estimateSkew(image, { maxAngle: config.deskew.maxAngle });
    if (Math.abs(skew.angle) >= config.deskew.minAngle && skew.confidence >= config.deskew.minConfidence) {
      image = rotateSmall(image, -skew.angle);
      applied.push(`deskew(${skew.angle}\xB0)`);
    }
  }
  if (has("grayscale")) applied.push("grayscale");
  if (has("denoise")) {
    image = median3(image);
    applied.push("denoise");
  }
  if (has("illumination")) {
    image = flattenIllumination(image);
    applied.push("illumination");
  }
  if (has("contrast")) {
    image = stretchContrast(image);
    applied.push("contrast");
  } else if (has("contrast_mild")) {
    image = stretchContrast(image, { lowPct: 5e-3, highPct: 0.97, knee: 0.95, gamma: 1.15 });
    applied.push("contrast_mild");
  }
  if (has("upscale") && spec.upscale > 1) {
    const factor = Math.min(spec.upscale, config.maxOutputDimension / Math.max(image.width, image.height));
    if (factor > 1.05) {
      image = resizeGray(image, image.width * factor, image.height * factor);
      applied.push(`upscale(${Math.round(factor * 10) / 10}x)`);
    }
  }
  if (has("sharpen")) {
    image = unsharpMask(image, 0.5);
    applied.push("sharpen");
  }
  if (has("sauvola")) {
    image = binarizeSauvola(image);
    applied.push("sauvola");
  }
  if (has("otsu")) {
    image = binarizeGlobal(image, otsuThreshold(image));
    applied.push("otsu");
  }
  return { image: limitSize(image, config.maxOutputDimension), applied };
}

// shared/imaging/quality.ts
var qualityThresholds = {
  resolution: { goodLongSide: 1600, lowLongSide: 900 },
  blur: { warning: 0.45, critical: 0.75 },
  brightness: { dark: 0.3, veryDark: 0.18 },
  contrast: { low: 0.35, veryLow: 0.2 },
  shadow: { warning: 0.45, critical: 0.7 },
  glare: { warning: 0.04, critical: 0.12 },
  skew: { warning: 3, critical: 8 },
  perspective: { warning: 0.12, critical: 0.3 },
  noise: { warning: 0.5 },
  /** Bu satır yüksekliğinin altı "küçük yazı" (büyütme yararlı). */
  smallTextPx: 18
};
var clamp01 = (value) => Math.max(0, Math.min(1, value));
var round = (value, digits = 2) => Math.round(value * 10 ** digits) / 10 ** digits;
function blurScore(image) {
  const { width, height, data } = image;
  let sum = 0, sumSq = 0, count3 = 0;
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
    const index2 = y * width + x;
    const laplacian = 4 * data[index2] - data[index2 - 1] - data[index2 + 1] - data[index2 - width] - data[index2 + width];
    sum += laplacian;
    sumSq += laplacian * laplacian;
    count3++;
  }
  const variance = sumSq / Math.max(1, count3) - (sum / Math.max(1, count3)) ** 2;
  return clamp01((Math.log(600) - Math.log(Math.max(1, variance))) / (Math.log(600) - Math.log(30)));
}
function noiseScore(image) {
  const filtered = median3(image);
  const diffs = new Float32Array(image.data.length);
  for (let index2 = 0; index2 < diffs.length; index2++) diffs[index2] = Math.abs(image.data[index2] - filtered.data[index2]);
  return clamp01(percentileOf(diffs, 0.5) / 6);
}
function textLineHeight(image) {
  const flat = flattenIllumination(image);
  const threshold = Math.min(200, otsuThreshold(flat));
  const rows = new Float32Array(flat.height);
  for (let y = 0; y < flat.height; y++) {
    let ink = 0;
    for (let x = 0; x < flat.width; x++) if (flat.data[y * flat.width + x] < threshold) ink++;
    rows[y] = ink / flat.width;
  }
  const runs = [];
  let run = 0;
  for (let y = 0; y < rows.length; y++) {
    if (rows[y] > 0.01) run++;
    else {
      if (run >= 2) runs.push(run);
      run = 0;
    }
  }
  if (run >= 2) runs.push(run);
  if (runs.length < 3) return null;
  runs.sort((a, b) => a - b);
  return runs[Math.floor(runs.length / 2)];
}
function analyzeImageQuality(image, thresholds = qualityThresholds) {
  const work = limitSize(image, 1e3);
  const scale = image.width / work.width;
  const longSide = Math.max(image.width, image.height);
  const document = detectDocument(image);
  const orientation = detectOrientation(work);
  const skew = orientation.sideways ? { angle: 0, confidence: 0 } : estimateSkew(work);
  const brightness = clamp01(percentileOf(work.data, 0.5) / 255);
  const contrast = clamp01((percentileOf(work.data, 0.98) - percentileOf(work.data, 0.02)) / 255);
  const background = estimateBackground(work);
  const cells = [];
  const inside = (gx, gy) => {
    if (!document.quad || document.confidence < 0.5) return true;
    const x = (gx + 0.5) * background.block * scale, y = (gy + 0.5) * background.block * scale;
    const q = document.quad;
    return x >= Math.max(q.topLeft.x, q.bottomLeft.x) && x <= Math.min(q.topRight.x, q.bottomRight.x) && y >= Math.max(q.topLeft.y, q.topRight.y) && y <= Math.min(q.bottomLeft.y, q.bottomRight.y);
  };
  for (let gy = 0; gy < background.gh; gy++) for (let gx = 0; gx < background.gw; gx++) if (inside(gx, gy)) cells.push(background.grid[gy * background.gw + gx]);
  cells.sort((a, b) => a - b);
  const bgLow = cells[Math.floor(cells.length * 0.1)] ?? 255, bgHigh = cells[Math.floor(cells.length * 0.9)] ?? 255, bgMedian = cells[Math.floor(cells.length / 2)] ?? 255;
  const shadow = clamp01(1 - bgLow / Math.max(1, bgHigh));
  const glare = cells.length ? cells.filter((value) => value >= 250 && value >= bgMedian + 18).length / cells.length : 0;
  const blur = blurScore(work);
  const noise = noiseScore(work);
  const lineHeight = orientation.sideways ? null : textLineHeight(work);
  const estimatedTextHeight = lineHeight === null ? null : Math.round(lineHeight * scale);
  const issues = [];
  const add = (code, severity, message) => issues.push({ code, severity, message });
  if (longSide < thresholds.resolution.lowLongSide) add("low_resolution", "critical", "Foto\u011Fraf\u0131n \xE7\xF6z\xFCn\xFCrl\xFC\u011F\xFC \xE7ok d\xFC\u015F\xFCk. Sayfaya biraz daha yakla\u015F\u0131p tekrar \xE7eker misin?");
  else if (longSide < thresholds.resolution.goodLongSide) add("low_resolution", "warning", "Foto\u011Fraf\u0131n \xE7\xF6z\xFCn\xFCrl\xFC\u011F\xFC d\xFC\u015F\xFCk; k\xFC\xE7\xFCk yaz\u0131lar zor okunabilir.");
  if (blur >= thresholds.blur.critical) add("blurry", "critical", "Foto\u011Fraf bulan\u0131k. Telefonu sabit tutup netle\u015Fmesini bekleyerek tekrar \xE7eker misin?");
  else if (blur >= thresholds.blur.warning) add("blurry", "warning", "Foto\u011Fraf biraz bulan\u0131k.");
  if (brightness < thresholds.brightness.veryDark) add("dark", "critical", "Sayfa \xE7ok karanl\u0131k. Daha ayd\u0131nl\u0131k bir yerde \xE7eker misin?");
  else if (brightness < thresholds.brightness.dark) add("dark", "warning", "Sayfa yeterince ayd\u0131nl\u0131k de\u011Fil.");
  if (contrast < thresholds.contrast.veryLow) add("low_contrast", "critical", "Yaz\u0131lar zeminden ay\u0131rt edilemiyor (kontrast \xE7ok d\xFC\u015F\xFCk).");
  else if (contrast < thresholds.contrast.low) add("low_contrast", "warning", "Kontrast d\xFC\u015F\xFCk; yaz\u0131lar soluk g\xF6r\xFCn\xFCyor.");
  if (shadow >= thresholds.shadow.critical) add("shadow", "critical", "Sayfada yo\u011Fun g\xF6lge var. I\u015F\u0131\u011F\u0131 sayfan\u0131n kar\u015F\u0131s\u0131na al\u0131p tekrar \xE7eker misin?");
  else if (shadow >= thresholds.shadow.warning) add("shadow", "warning", "Sayfan\u0131n bir k\u0131sm\u0131 g\xF6lgede.");
  if (glare >= thresholds.glare.critical) add("glare", "critical", "Foto\u011Frafta parlama var. Sayfay\u0131 biraz farkl\u0131 a\xE7\u0131dan \xE7ekmen daha iyi sonu\xE7 verebilir.");
  else if (glare >= thresholds.glare.warning) add("glare", "warning", "Foto\u011Frafta hafif parlama var.");
  if (orientation.sideways) add("sideways", "info", "Foto\u011Fraf yan \xE7ekilmi\u015F g\xF6r\xFCn\xFCyor; otomatik d\xF6nd\xFCr\xFClecek.");
  if (Math.abs(skew.angle) >= thresholds.skew.critical && skew.confidence > 0.3) add("skewed", "warning", "Sayfa \xE7ok e\u011Fik g\xF6r\xFCn\xFCyor.");
  else if (Math.abs(skew.angle) >= thresholds.skew.warning && skew.confidence > 0.2) add("skewed", "info", "Sayfa biraz e\u011Fik; otomatik d\xFCzeltilecek.");
  if (document.confidence >= 0.7 && document.perspectiveDistortion >= thresholds.perspective.critical) add("perspective", "warning", "Sayfa yandan \xE7ekilmi\u015F; telefonu sayfaya paralel tutarsan daha iyi okunur.");
  if (document.confidence >= 0.5 && document.touchesEdges >= 2 && document.coverage > 0.6) add("partial_page", "warning", "Sayfan\u0131n bir k\u0131sm\u0131 kadraj d\u0131\u015F\u0131nda olabilir.");
  if (noise >= thresholds.noise.warning) add("noisy", "info", "Foto\u011Frafta gren (g\xFCr\xFClt\xFC) var.");
  if (estimatedTextHeight !== null && estimatedTextHeight < thresholds.smallTextPx) add("small_text", "info", "Yaz\u0131lar k\xFC\xE7\xFCk; b\xFCy\xFCt\xFClerek okunacak.");
  const criticals = issues.filter((issue) => issue.severity === "critical").length;
  const warnings = issues.filter((issue) => issue.severity === "warning").length;
  const level = criticals > 0 || warnings >= 3 ? "POOR" : warnings > 0 ? "ACCEPTABLE" : "GOOD";
  const score = clamp01(1 - 0.28 * criticals - 0.1 * warnings - 0.25 * Math.max(0, blur - 0.4) - 0.5 * glare);
  return {
    width: image.width,
    height: image.height,
    megapixels: round(image.width * image.height / 1e6),
    resolution: longSide >= thresholds.resolution.goodLongSide ? "good" : longSide >= thresholds.resolution.lowLongSide ? "low" : "very_low",
    brightness: round(brightness),
    contrast: round(contrast),
    blur: round(blur),
    noise: round(noise),
    shadow: round(shadow),
    glare: round(glare, 3),
    skew: skew.angle,
    skewConfidence: skew.confidence,
    perspective: document.perspectiveDistortion,
    documentCoverage: document.coverage,
    documentConfidence: document.confidence,
    documentQuad: document.quad,
    orientation: orientation.sideways ? "sideways" : "upright",
    orientationConfidence: round(orientation.confidence),
    estimatedTextHeight,
    level,
    score: round(score),
    issues
  };
}

// server/bookContent/ocrOrchestrator.ts
init_turkishText();

// server/bookContent/imageCodec.ts
import jpeg from "jpeg-js";
var ocrCodecLimits = { maxResolutionInMP: 16, maxMemoryUsageInMB: 512 };
function parseDataUrl(dataUrl) {
  const match = /^data:([^;,]+);base64,([\s\S]+)$/.exec(dataUrl);
  if (!match) return null;
  return { mimeType: match[1].toLowerCase(), buffer: Buffer.from(match[2], "base64") };
}
function decodeJpegToGray(buffer) {
  const decoded = jpeg.decode(buffer, { useTArray: true, formatAsRGBA: true, maxResolutionInMP: ocrCodecLimits.maxResolutionInMP, maxMemoryUsageInMB: ocrCodecLimits.maxMemoryUsageInMB });
  return toGray({ width: decoded.width, height: decoded.height, data: decoded.data });
}
function encodeGrayToJpegDataUrl(image, quality = 85) {
  const encoded = jpeg.encode({ width: image.width, height: image.height, data: Buffer.from(grayToRgba(image).buffer) }, quality);
  return `data:image/jpeg;base64,${Buffer.from(encoded.data).toString("base64")}`;
}

// server/bookContent/ocrConsensus.ts
init_turkishText();
var ocrScoringConfig = {
  weights: {
    ocrConfidence: 0.2,
    completeness: 0.2,
    language: 0.1,
    structure: 0.15,
    numberConsistency: 0.15,
    layout: 0.05,
    agreement: 0.15
  },
  /** İki satırın "aynı satır" sayılması için etiket+başlık benzerliği (normalize). */
  matchSimilarity: 0.8,
  /** Bu güvenin altındaki satır öğrenciye "kontrol et" diye gösterilir. */
  needsReviewBelow: 0.7,
  /** Tek okuma varsa (doğrulanamaz) satır güveni bu katsayıyla düşürülür. */
  singlePassPenalty: 0.85,
  /** İlk dalganın uzlaşısı bunun üstündeyse ikinci dalga çalıştırılmaz (maliyet). */
  earlyStopAgreement: 0.85,
  earlyStopScore: 0.8
};
var clamp012 = (value) => Math.max(0, Math.min(1, value));
var mean = (values, fallback = 0) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : fallback;
var entriesOf = (page) => page.items.filter((item) => item.type === "entry");
var lineText = (item) => `${item.label ?? ""} ${item.title}`.trim();
function itemsMatch(a, b, config = ocrScoringConfig) {
  if (a.type !== b.type) return false;
  if (a.type === "unit" && a.unitNumber !== null && a.unitNumber === b.unitNumber) return true;
  return textSimilarity(lineText(a), lineText(b)) >= config.matchSimilarity;
}
function structureScore(page) {
  const entries = entriesOf(page);
  if (!entries.length) return 0;
  const usable = entries.filter((item) => (item.label || item.title) && item.page !== null).length / entries.length;
  const units = page.items.filter((item) => item.type === "unit" && item.unitNumber !== null).map((item) => item.unitNumber);
  let unitBreaks = 0;
  for (let index2 = 1; index2 < units.length; index2++) if (units[index2] !== units[index2 - 1] + 1) unitBreaks++;
  let testPairs = 0, testBreaks = 0, lastTest = null;
  for (const item of page.items) {
    if (item.type === "unit") {
      lastTest = null;
      continue;
    }
    const match = item.type === "entry" ? /^test\s*(\d+)/.exec(normalizeForComparison(item.label ?? "")) : null;
    if (!match) continue;
    const number = Number(match[1]);
    if (lastTest !== null) {
      testPairs++;
      if (number !== lastTest + 1 && number !== 1) testBreaks++;
    }
    lastTest = number;
  }
  const sequence = 1 - (unitBreaks + testBreaks) / Math.max(1, units.length - 1 + testPairs);
  return clamp012(0.6 * usable + 0.4 * sequence);
}
function numberConsistency(page) {
  const entries = entriesOf(page);
  if (!entries.length) return 0;
  const withPage = entries.filter((item) => item.page !== null);
  let decreasing = 0;
  for (let index2 = 1; index2 < withPage.length; index2++) if (withPage[index2].page < withPage[index2 - 1].page) decreasing++;
  return clamp012(withPage.length / entries.length * (1 - decreasing / Math.max(1, withPage.length - 1)));
}
function languageScore(page) {
  const texts = page.items.map((item) => item.title).filter((title) => title.trim());
  return mean(texts.map(turkishPlausibility), 0);
}
function layoutScore(page) {
  if (!page.items.length) return 0;
  if (page.pageKind === "table_of_contents" || page.pageKind === void 0) return 1;
  return entriesOf(page).filter((item) => item.page !== null).length >= 3 ? 0.7 : 0.2;
}
function agreementScores(passes, config) {
  return passes.map((pass, index2) => {
    const others = passes.filter((_, other) => other !== index2);
    if (!others.length) return 0.5;
    const entries = pass.page.items;
    if (!entries.length) return 0;
    return mean(entries.map((item) => others.filter((other) => other.page.items.some((candidate) => itemsMatch(item, candidate, config))).length / others.length));
  });
}
function scorePasses(passes, config = ocrScoringConfig) {
  const maxEntries = Math.max(1, ...passes.map((pass) => entriesOf(pass.page).length));
  const agreement = agreementScores(passes, config);
  return passes.map((pass, index2) => {
    const breakdown = {
      ocrConfidence: mean(pass.page.items.map((item) => item.confidence ?? 0.7), 0),
      completeness: entriesOf(pass.page).length / maxEntries,
      language: languageScore(pass.page),
      structure: structureScore(pass.page),
      numberConsistency: numberConsistency(pass.page),
      layout: layoutScore(pass.page),
      agreement: agreement[index2]
    };
    const total = Object.keys(config.weights).reduce((sum, key) => sum + config.weights[key] * breakdown[key], 0);
    return { variantId: pass.variantId, total: Math.round(total * 1e3) / 1e3, breakdown, entries: entriesOf(pass.page).length };
  });
}
function voteText(values) {
  const counts = /* @__PURE__ */ new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  const ranked = Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || turkishCharCount(b[0]) - turkishCharCount(a[0]));
  const normalizedTop = normalizeForComparison(ranked[0][0]);
  const agreeing = values.filter((value) => normalizeForComparison(value) === normalizedTop).length;
  return { value: ranked[0][0], agreement: agreeing / values.length };
}
function buildConsensus(passes, scores, config = ocrScoringConfig) {
  const order = scores.map((score, index2) => ({ score, index: index2 })).sort((a, b) => b.score.total - a.score.total);
  const backbone = passes[order[0].index];
  const others = passes.filter((pass) => pass !== backbone && pass.page.items.length > 0);
  const passCount = 1 + others.length;
  const used = others.map(() => /* @__PURE__ */ new Set());
  const merged = backbone.page.items.map((item) => {
    const matches = [];
    others.forEach((other, otherIndex) => {
      let bestIndex = -1, bestSimilarity = 0;
      other.page.items.forEach((candidate, candidateIndex) => {
        if (used[otherIndex].has(candidateIndex) || !itemsMatch(item, candidate, config)) return;
        const similarity2 = textSimilarity(lineText(item), lineText(candidate));
        if (similarity2 > bestSimilarity) {
          bestSimilarity = similarity2;
          bestIndex = candidateIndex;
        }
      });
      if (bestIndex >= 0) {
        used[otherIndex].add(bestIndex);
        matches.push(other.page.items[bestIndex]);
      }
    });
    const group = [item, ...matches];
    const support = group.length / passCount;
    const title = voteText(group.map((member) => member.title));
    const label = item.label === null && matches.every((member) => member.label === null) ? { value: null, agreement: 1 } : voteText(group.map((member) => member.label ?? ""));
    const pages = group.map((member) => member.page).filter((page) => page !== null);
    const pageVotes = /* @__PURE__ */ new Map();
    for (const page of pages) pageVotes.set(page, (pageVotes.get(page) ?? 0) + 1);
    const topPage = Array.from(pageVotes.entries()).sort((a, b) => b[1] - a[1] || (a[0] === item.page ? -1 : b[0] === item.page ? 1 : 0))[0];
    const pageAgreement = topPage ? topPage[1] / group.length : 0;
    const selfConfidence = mean(group.map((member) => member.confidence ?? 0.7));
    const confidence = clamp012(passCount === 1 ? selfConfidence * config.singlePassPenalty : selfConfidence * (0.45 + 0.55 * support) * (0.7 + 0.3 * title.agreement));
    const pageFlag = item.type === "entry" && (topPage === void 0 || pageAgreement < 0.5 || passCount > 1 && pageVotes.size > 1 || group.some((member) => member.review?.page && member.page === (topPage?.[0] ?? null)));
    return {
      ...item,
      title: title.value,
      label: label.value === "" ? null : label.value,
      page: topPage ? topPage[0] : null,
      pageText: group.find((member) => member.page === (topPage?.[0] ?? null))?.pageText ?? item.pageText ?? null,
      confidence: Math.round(confidence * 100) / 100,
      support: Math.round(support * 100) / 100,
      review: { title: confidence < config.needsReviewBelow || title.agreement < 0.5, page: Boolean(pageFlag) }
    };
  });
  const majority = Math.ceil(passCount / 2);
  others.forEach((other, otherIndex) => {
    other.page.items.forEach((item, itemIndex) => {
      if (used[otherIndex].has(itemIndex)) return;
      const seenIn = 1 + others.filter((third, thirdIndex) => thirdIndex !== otherIndex && third.page.items.some((candidate, candidateIndex) => !used[thirdIndex].has(candidateIndex) && itemsMatch(item, candidate, config))).length;
      if (seenIn < majority || passCount < 3 || merged.some((existing) => itemsMatch(existing, item, config))) return;
      const previous = other.page.items[itemIndex - 1];
      const anchor = previous ? merged.findIndex((existing) => itemsMatch(existing, previous, config)) : -1;
      const support = seenIn / passCount;
      merged.splice(anchor + 1, 0, { ...item, confidence: Math.round(clamp012((item.confidence ?? 0.7) * support) * 100) / 100, support: Math.round(support * 100) / 100, review: { title: true, page: item.type === "entry" } });
    });
  });
  const agreement = mean(merged.map((item) => item.support ?? 0), 0);
  return { page: { ...backbone.page, items: merged }, backboneVariant: backbone.variantId, agreement: Math.round(agreement * 100) / 100, passCount };
}

// server/bookContent/tocParser.ts
init_turkishText();
function pageIssues(page) {
  const issues = [];
  const entries = page.items.filter((item) => item.type === "entry");
  const missing = entries.filter((item) => item.page === null).map((item) => `${item.label ?? ""} ${item.title}`.trim());
  if (missing.length) issues.push(`\u015Eu sat\u0131rlar\u0131n sayfa numaras\u0131 okunamad\u0131: ${missing.slice(0, 6).join("; ")}`);
  let previous = null;
  for (const item of entries) {
    if (item.page === null) continue;
    if (previous && previous.page !== null && item.page < previous.page) issues.push(`"${previous.label ?? previous.title}" (${previous.page}) sat\u0131r\u0131ndan sonra "${item.label ?? item.title}" (${item.page}) geliyor; sayfa numaralar\u0131 artmal\u0131.`);
    previous = item;
  }
  return issues;
}
function looksLikeTopicList(page) {
  return page.items.filter((item) => item.type === "entry" && item.page !== null && item.title.trim()).length >= 3;
}
var UNIT_ONLY = /^\d+\s*\.?\s*unite$/;
function classify(label, title) {
  if (label && /^\d+\s*[.)]?$/.test(label.trim())) return { contentType: "topic", testNumber: null };
  const text2 = normalizeForComparison(`${label ?? ""} ${label ? "" : title}`);
  const lastNumber = (() => {
    const all = text2.match(/\d+/g);
    return all ? Number(all[all.length - 1]) : null;
  })();
  const testMatch = text2.match(/^test\s*(\d+)/);
  if (testMatch) return { contentType: "topic_test", testNumber: Number(testMatch[1]) };
  if (text2.includes("egitim kontrol") || text2.startsWith("osym")) return { contentType: "osym_type", testNumber: lastNumber };
  if (text2.includes("sarmal") || text2.includes("karma") || text2.includes("genel tekrar")) return { contentType: "review", testNumber: lastNumber };
  if (text2.includes("simulasyon") || text2.includes("deneme")) return { contentType: "simulation", testNumber: lastNumber };
  return { contentType: label ? "topic_test" : "topic", testNumber: lastNumber };
}
var cleanTitle = (value) => value.replace(/\s+/g, " ").replace(/^[\s\-–—:.]+|[\s\-–—:.]+$/g, "").trim();
function parseTableOfContents(pages) {
  const warnings = [];
  const entries = [];
  let unitNumber = null;
  let unitTitle = "";
  let awaitingUnitTitle = false;
  for (const page of pages) {
    for (const item of page.items) {
      const title = cleanTitle(item.title ?? "");
      if (item.type === "unit") {
        unitNumber = item.unitNumber;
        const normalized = normalizeForComparison(title);
        awaitingUnitTitle = !title || UNIT_ONLY.test(normalized);
        unitTitle = awaitingUnitTitle ? "" : title;
        continue;
      }
      if (item.type === "section") {
        const unitHasEntries = entries.some((entry) => entry.unitNumber === unitNumber && entry.unitTitle === unitTitle);
        if (awaitingUnitTitle) {
          unitTitle = title;
          awaitingUnitTitle = false;
        } else if (unitNumber !== null && !unitHasEntries) {
          unitTitle = unitTitle ? `${unitTitle} ${title}` : title;
        } else {
          unitNumber = null;
          unitTitle = title;
        }
        continue;
      }
      awaitingUnitTitle = false;
      const label = cleanTitle(item.label ?? "");
      const { contentType, testNumber } = classify(label || null, title);
      const isMixed = contentType === "review" || contentType === "simulation";
      entries.push({
        order: entries.length + 1,
        unitNumber,
        unitTitle,
        contentType,
        label: label || title,
        testNumber,
        title,
        pageStart: item.page ?? null,
        pageEnd: null,
        // Konu testi kendi başlığıyla, ÖSYM tipi/başlıksız satır ünite adıyla eşlenir.
        // Konu listesi satırı da kendi başlığıyla eşlenir ("KİTAP BİTİRME PLANI" gibi bir sayfa başlığıyla değil).
        matchText: isMixed ? null : (contentType === "topic_test" || contentType === "topic") && title ? title : unitTitle || title || null,
        readConfidence: typeof item.confidence === "number" ? item.confidence : null,
        review: { title: Boolean(item.review?.title), page: Boolean(item.review?.page) }
      });
    }
  }
  for (let index2 = 0; index2 < entries.length; index2++) {
    const entry = entries[index2];
    if (entry.pageStart === null) {
      warnings.push(`"${entry.unitTitle} \u2014 ${entry.label}" sat\u0131r\u0131nda sayfa numaras\u0131 okunamad\u0131.`);
      continue;
    }
    const next = entries.slice(index2 + 1).find((candidate) => candidate.pageStart !== null);
    if (!next) continue;
    if (next.pageStart < entry.pageStart) {
      warnings.push(`Sayfa s\u0131ras\u0131 tutars\u0131z: "${entry.label}" (${entry.pageStart}) sonras\u0131nda "${next.label}" (${next.pageStart}) geliyor. Foto\u011Fraf\u0131 d\xFCz ve net \xE7ekip tekrar dener misin?`);
      continue;
    }
    entry.pageEnd = Math.max(entry.pageStart, next.pageStart - 1);
  }
  return { entries, warnings };
}

// server/bookContent/ocrOrchestrator.ts
var ocrOrchestratorConfig = {
  /** Tek bir fotoğraf için toplam süre bütçesi (isteğin tamamı 60 sn ile sınırlı). */
  timeBudgetMs: 48e3,
  /** Tek bir okuma geçişinin zaman aşımı. */
  passTimeoutMs: 28e3,
  /** Yeni bir dalga başlatmak için kalması gereken en az süre. */
  minRemainingForWaveMs: 16e3,
  maxWorkingDimension: 2400,
  jpegQuality: 85,
  /** Düzeltme okuması (sayfa numarası tutarsızlığı ipucuyla) yapılsın mı. */
  correctiveReread: true
};
var PassTimeoutError = class extends Error {
};
var withTimeout = (promise, ms) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new PassTimeoutError(`timeout after ${ms}ms`)), ms);
  promise.then((value) => {
    clearTimeout(timer);
    resolve(value);
  }, (error) => {
    clearTimeout(timer);
    reject(error);
  });
});
var isPermanent = (error) => error instanceof LlmUnavailableError && error.reason !== "provider";
function debugDir() {
  if (ENV.isProduction || process.env.OCR_DEBUG !== "1") return null;
  const dir = path.join(process.cwd(), ".ocr-debug", (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-"));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
async function readTocImage(dataUrl, options) {
  const config = options.config ?? ocrOrchestratorConfig;
  const scoring = options.scoring ?? ocrScoringConfig;
  const started = Date.now();
  const deadline = Math.min(options.deadline ?? Infinity, started + config.timeBudgetMs);
  const notes2 = [];
  const debug = debugDir();
  let gray = null;
  let quality = null;
  const parsed = parseDataUrl(dataUrl);
  if (parsed && parsed.mimeType === "image/jpeg") {
    try {
      gray = limitSize(decodeJpegToGray(parsed.buffer), config.maxWorkingDimension);
      quality = analyzeImageQuality(gray);
    } catch (error) {
      notes2.push("G\xF6r\xFCnt\xFC \xE7\xF6z\xFClemedi; \xF6n i\u015Fleme yap\u0131lmadan okundu.");
      console.warn("[OCR] decode failed:", error instanceof Error ? error.message : error);
    }
  }
  const fullPlan = quality ? planPreprocessing(quality) : { level: "ACCEPTABLE", variants: [{ id: "A_original", kind: "original", rotate: 0, steps: [], upscale: 1, wave: 1 }], geometry: { perspective: false, deskew: false, sideways: false } };
  const plan = options.maxPasses ? { ...fullPlan, variants: fullPlan.variants.slice(0, Math.max(options.maxPasses, fullPlan.variants.filter((variant) => variant.wave === 1).length)) } : fullPlan;
  const passes = [];
  const reports = [];
  let chosenRotation = 0;
  let lastError = null;
  const runVariants = async (variants) => {
    await Promise.all(variants.map(async (spec) => {
      const rotation = spec.rotate === "auto" ? chosenRotation : spec.rotate;
      const passStart = Date.now();
      let url = dataUrl, applied = [];
      try {
        if (spec.kind !== "original" && gray && quality) {
          const rendered = renderVariant(gray, spec, quality, rotation);
          applied = rendered.applied;
          url = encodeGrayToJpegDataUrl(rendered.image, config.jpegQuality);
          if (debug) fs.writeFileSync(path.join(debug, `${spec.id}.jpg`), Buffer.from(url.split(",")[1], "base64"));
        }
        const remaining = deadline - Date.now();
        if (remaining < 3e3) {
          reports.push({ variantId: spec.id, applied, rotation, status: "skipped", elapsedMs: 0 });
          return;
        }
        const page = await withTimeout(options.provider.extractTableOfContentsPage(url), Math.min(config.passTimeoutMs, remaining));
        passes.push({ variantId: spec.id, page, applied, rotation, elapsedMs: Date.now() - passStart });
        reports.push({ variantId: spec.id, applied, rotation, status: "ok", elapsedMs: Date.now() - passStart });
      } catch (error) {
        if (isPermanent(error)) throw error;
        lastError = error;
        reports.push({ variantId: spec.id, applied, rotation, status: error instanceof PassTimeoutError ? "timeout" : "failed", elapsedMs: Date.now() - passStart, error: error instanceof Error ? error.message.slice(0, 160) : "error" });
      }
    }));
  };
  const waveOne = plan.variants.filter((variant) => variant.wave === 1);
  await runVariants(waveOne);
  let waves = 1;
  let scores = scorePasses(passes, scoring);
  if (plan.geometry.sideways) {
    const byRotation = (rotation) => Math.max(0, ...scores.filter((score, index2) => passes[index2].rotation === rotation).map((score) => score.total));
    chosenRotation = byRotation(270) > byRotation(90) ? 270 : 90;
    notes2.push(`Foto\u011Fraf yan \xE7ekilmi\u015F; ${chosenRotation}\xB0 d\xF6nd\xFCr\xFClerek okundu.`);
  }
  const waveTwo = plan.variants.filter((variant) => variant.wave === 2);
  if (waveTwo.length && passes.length) {
    const consensus2 = buildConsensus(passes, scores, scoring);
    const best = Math.max(...scores.map((score) => score.total));
    const confident = passes.length >= 2 && consensus2.agreement >= scoring.earlyStopAgreement && best >= scoring.earlyStopScore;
    if (confident) notes2.push("\u0130lk okumalar birbirini do\u011Frulad\u0131; ek okuma gerekmedi.");
    else if (deadline - Date.now() >= config.minRemainingForWaveMs) {
      await runVariants(waveTwo);
      waves = 2;
      scores = scorePasses(passes, scoring);
    } else waveTwo.forEach((variant) => reports.push({ variantId: variant.id, applied: [], rotation: chosenRotation, status: "skipped", elapsedMs: 0 }));
  } else if (waveTwo.length && !passes.length && deadline - Date.now() >= config.minRemainingForWaveMs) {
    await runVariants(waveTwo);
    waves = 2;
    scores = scorePasses(passes, scoring);
  }
  if (!passes.length) throw lastError instanceof Error ? lastError : new Error("OCR okumas\u0131 ba\u015Far\u0131s\u0131z oldu");
  let consensus = buildConsensus(passes, scores, scoring);
  const issues = pageIssues(consensus.page);
  if (config.correctiveReread && issues.length && deadline - Date.now() >= config.minRemainingForWaveMs) {
    const backbone = passes.find((pass) => pass.variantId === consensus.backboneVariant);
    const spec = plan.variants.find((variant) => variant.id === backbone.variantId);
    const url = spec.kind === "original" || !gray || !quality ? dataUrl : encodeGrayToJpegDataUrl(renderVariant(gray, spec, quality, backbone.rotation).image, config.jpegQuality);
    const rereadStart = Date.now();
    try {
      const page = await withTimeout(options.provider.extractTableOfContentsPage(url, { previous: consensus.page, issues }), Math.min(config.passTimeoutMs, deadline - Date.now()));
      passes.push({ variantId: `${backbone.variantId}_reread`, page, applied: backbone.applied, rotation: backbone.rotation, elapsedMs: Date.now() - rereadStart });
      reports.push({ variantId: `${backbone.variantId}_reread`, applied: backbone.applied, rotation: backbone.rotation, status: "ok", elapsedMs: Date.now() - rereadStart });
      scores = scorePasses(passes, scoring);
      const rebuilt = buildConsensus(passes, scores, scoring);
      if (pageIssues(rebuilt.page).length < issues.length) {
        consensus = rebuilt;
        notes2.push("Sayfa numaras\u0131 tutars\u0131zl\u0131\u011F\u0131 yeniden okunarak d\xFCzeltildi.");
      }
    } catch (error) {
      if (isPermanent(error)) throw error;
      reports.push({ variantId: `${backbone.variantId}_reread`, applied: backbone.applied, rotation: backbone.rotation, status: error instanceof PassTimeoutError ? "timeout" : "failed", elapsedMs: Date.now() - rereadStart });
    }
  }
  for (const report of reports) {
    const index2 = passes.findIndex((pass) => pass.variantId === report.variantId);
    if (index2 >= 0) Object.assign(report, { score: scores[index2].total, breakdown: scores[index2].breakdown, entries: scores[index2].entries });
  }
  const backboneScore = scores[passes.findIndex((pass) => pass.variantId === consensus.backboneVariant)];
  const rawText = rawTextOf(passes.find((pass) => pass.variantId === consensus.backboneVariant).page);
  const { documentQuad: _quad, ...qualitySummary } = quality ?? {};
  return {
    page: consensus.page,
    rawText,
    normalizedText: normalizeForComparison(rawText),
    quality: quality ? qualitySummary : null,
    plan: { level: plan.level, variants: plan.variants.map((variant) => variant.id), geometry: plan.geometry },
    passes: reports,
    chosenVariant: consensus.backboneVariant,
    agreement: consensus.agreement,
    confidence: {
      image: quality ? quality.score : 0.75,
      ocr: backboneScore.total,
      structure: Math.round((backboneScore.breakdown.structure + backboneScore.breakdown.numberConsistency) / 2 * 100) / 100
    },
    waves,
    elapsedMs: Date.now() - started,
    notes: notes2
  };
}

// server/routers/bookContent.ts
var bookIdInput = z3.string().min(1).max(120);
var examInput = z3.enum(["TYT", "AYT"]).nullable().optional();
var imageInput = z3.object({
  dataUrl: z3.string().min(20).max(Math.ceil(bookContentConfig.ocr.maxImageBytes * 1.4)),
  mimeType: z3.enum(["image/png", "image/jpeg", "image/webp"])
});
var contentTypeInput = z3.enum(["topic_test", "osym_type", "review", "simulation", "topic"]);
async function matchEntries(entries, subject) {
  const topics = await getMatchableTopics();
  const topicById = new Map(topics.map((topic) => [topic.id, topic]));
  const describe = (match, reason) => {
    const topic = topicById.get(match.topicId);
    return { ...match, topic: topic.topic, subject: topic.subject, unit: topic.unit, ...reason ? { reason } : {} };
  };
  const matched = entries.map((entry) => {
    if (!entry.matchText) return { ...entry, suggestion: null, alternatives: [], tier: "not_applicable" };
    let result = matchTopic(entry.matchText, topics, { subject });
    if (!result.best && subject) result = matchTopic(entry.matchText, topics, {});
    return { ...entry, suggestion: result.best && result.tier !== "manual" ? describe(result.best) : null, alternatives: [result.best, ...result.alternatives].filter((item) => Boolean(item)).map((item) => describe(item)), tier: result.tier };
  });
  const unresolvedTexts = Array.from(new Set(matched.filter((entry) => entry.tier === "manual" && entry.matchText).map((entry) => entry.matchText)));
  if (unresolvedTexts.length > 0) {
    const candidates = topics.filter((topic) => !subject || topic.subject === subject);
    const ai = await suggestTopicsWithAi(unresolvedTexts.map((text2, key) => ({ key, text: text2, unitTitle: matched.find((entry) => entry.matchText === text2)?.unitTitle ?? "" })), candidates);
    const byText = new Map(ai.map((answer) => [unresolvedTexts[answer.key], answer]));
    for (const entry of matched) {
      const answer = entry.tier === "manual" && entry.matchText ? byText.get(entry.matchText) : void 0;
      if (!answer) continue;
      entry.suggestion = describe({ topicId: answer.topicId, confidence: answer.confidence, method: "ai", matchedText: entry.matchText }, answer.reason);
      entry.tier = "confirm";
    }
  }
  return matched;
}
function summarizeConfidence(entries, reports) {
  const average = (values, fallback) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : fallback;
  const round2 = (value) => Math.round(value * 100) / 100;
  const matchable = entries.filter((entry) => entry.matchText);
  const imageConfidence = round2(average(reports.map((report) => report.confidence.image), 0.75));
  const ocrConfidence = round2(average(reports.map((report) => report.confidence.ocr), 0));
  const structureConfidence = round2(average(reports.map((report) => report.confidence.structure), 0));
  const mappingConfidence = round2(average(matchable.map((entry) => entry.suggestion?.confidence ?? 0), 1));
  const weights = bookContentConfig.confidence.weights;
  const finalConfidence = round2(weights.image * imageConfidence + weights.ocr * ocrConfidence + weights.structure * structureConfidence + weights.mapping * mappingConfidence);
  const flagged = entries.filter((entry) => entry.review.title || entry.review.page).length;
  return { imageConfidence, ocrConfidence, structureConfidence, mappingConfidence, finalConfidence, flaggedEntries: flagged, needsReview: finalConfidence < bookContentConfig.confidence.needsReviewBelow || flagged > entries.length * 0.25 };
}
async function assertOwnsBook(userId, bookId) {
  if (!await userOwnsBook(userId, bookId)) throw new TRPCError2({ code: "FORBIDDEN", message: "Bu kitap k\xFCt\xFCphanende bulunmuyor. \xD6nce kitab\u0131 raf\u0131na ekle." });
}
var bookContentRouter = router({
  // Fotoğrafları okur ve bir ÖNİZLEME döner — hiçbir şey kaydetmez.
  // Kota: bir kitap taraması (en fazla 8 sayfa) = 1 kullanım.
  readTableOfContents: metredFeatureProcedure("OCR_BOOK_IMPORT").input(z3.object({
    bookId: bookIdInput,
    subject: z3.string().max(80).nullable().optional(),
    exam: examInput,
    images: z3.array(imageInput).min(1).max(bookContentConfig.ocr.maxTocPages),
    /** Gürültü filtresi için (kitap adı/yayınevi satırı içerik sayılmaz). */
    book: z3.object({ title: z3.string().max(180).optional(), publisher: z3.string().max(120).optional() }).optional()
  })).mutation(async ({ ctx, input }) => {
    if (!ctx.user) throw new TRPCError2({ code: "UNAUTHORIZED" });
    const userId = ctx.user.id;
    await assertOwnsBook(userId, input.bookId);
    for (let index2 = 0; index2 < input.images.length; index2++) {
      const image = input.images[index2];
      const check2 = validateDataUrl(image.dataUrl, image.mimeType);
      if (!check2.valid) throw new TRPCError2({ code: "BAD_REQUEST", message: `${index2 + 1}. foto\u011Fraf: ${check2.reason}` });
      if (check2.buffer.byteLength > bookContentConfig.ocr.maxImageBytes) throw new TRPCError2({ code: "BAD_REQUEST", message: `${index2 + 1}. foto\u011Fraf \xE7ok b\xFCy\xFCk. Daha d\xFC\u015F\xFCk \xE7\xF6z\xFCn\xFCrl\xFCkle tekrar dener misin?` });
    }
    const provider = getOcrProvider();
    const deadline = Date.now() + bookContentConfig.ocr.requestBudgetMs;
    const maxPasses = input.images.length > bookContentConfig.ocr.manyPagesThreshold ? bookContentConfig.ocr.maxPassesWhenManyPages : void 0;
    const reports = await Promise.all(input.images.map(async (image, index2) => {
      const hash = imageHash(image.dataUrl);
      const cached = await readOcrCache(userId, hash);
      if (cached) return { ...cached, cached: true };
      try {
        const report = await readTocImage(image.dataUrl, { provider, deadline, maxPasses });
        if (report.page.items.length) void writeOcrCache(userId, hash, report);
        return { ...report, cached: false };
      } catch (error) {
        console.warn(`[BookContent] OCR failed on page ${index2 + 1}:`, error instanceof Error ? error.message : error);
        throw new TRPCError2({ code: "INTERNAL_SERVER_ERROR", message: llmUnavailableMessage(error) ?? `${index2 + 1}. sayfa okunamad\u0131. Daha net, d\xFCz ve \u0131\u015F\u0131kl\u0131 bir foto\u011Frafla tekrar dener misin?` });
      }
    }));
    const notes2 = [];
    const tocReports = reports.map((report, index2) => ({ report, index: index2 })).filter(({ report, index: index2 }) => {
      if (looksLikeTopicList(report.page)) return true;
      if (report.page.pageKind && report.page.pageKind !== "table_of_contents") {
        notes2.push(`${index2 + 1}. foto\u011Fraf ${report.page.pageKind === "cover" ? "kitap kapa\u011F\u0131" : "i\xE7indekiler sayfas\u0131 de\u011Fil"} gibi g\xF6r\xFCn\xFCyor; atland\u0131.`);
        return false;
      }
      return true;
    });
    if (tocReports.length === 0) {
      const allCovers = reports.every((report) => report.page.pageKind === "cover");
      throw new TRPCError2({ code: "UNPROCESSABLE_CONTENT", message: allCovers ? "Bu foto\u011Fraf kitab\u0131n kapa\u011F\u0131. Burada kitab\u0131n \u0130\xC7\u0130NDEK\u0130LER sayfas\u0131n\u0131 \xE7ekmelisin." : "Ekledi\u011Fin foto\u011Fraflar i\xE7indekiler sayfas\u0131 gibi g\xF6r\xFCnm\xFCyor. \xDCnite ve test listesinin oldu\u011Fu sayfay\u0131 \xE7eker misin?" });
    }
    tocReports.forEach(({ report, index: index2 }) => report.notes.forEach((note) => notes2.push(`${index2 + 1}. sayfa: ${note}`)));
    const { pages: cleanPages, removed } = filterTocNoise(tocReports.map(({ report }) => report.page), input.book ?? {});
    const { entries, warnings } = parseTableOfContents(cleanPages);
    if (entries.length === 0) throw new TRPCError2({ code: "UNPROCESSABLE_CONTENT", message: "Foto\u011Fraflarda i\xE7indekiler sat\u0131r\u0131 bulunamad\u0131. \u0130\xE7indekiler sayfas\u0131n\u0131n tamam\u0131 g\xF6r\xFCnecek \u015Fekilde tekrar \xE7eker misin?" });
    const matched = await matchEntries(entries, input.subject || null);
    const confidence = summarizeConfidence(matched, tocReports.map(({ report }) => report));
    const withReview = matched.map((entry) => {
      const mapping = entry.matchText ? entry.suggestion?.confidence ?? 0 : 1;
      const finalConfidence = Math.round((entry.readConfidence ?? 0.75) * (entry.matchText ? 0.5 + 0.5 * mapping : 1) * 100) / 100;
      return { ...entry, finalConfidence, needsReview: entry.review.title || entry.review.page || finalConfidence < bookContentConfig.confidence.needsReviewBelow };
    });
    if (confidence.needsReview) notes2.unshift("Bu sayfan\u0131n baz\u0131 b\xF6l\xFCmlerini net okuyamad\u0131k. \u0130\u015Faretli sat\u0131rlar\u0131 kontrol et ya da foto\u011Fraf\u0131 tekrar \xE7ek.");
    return {
      warnings: [...notes2, ...warnings],
      entries: withReview,
      confidence,
      report: {
        pages: reports.map((report, index2) => ({
          index: index2,
          cached: report.cached,
          quality: report.quality ? { level: report.quality.level, score: report.quality.score, issues: report.quality.issues, orientation: report.quality.orientation, skew: report.quality.skew, blur: report.quality.blur, glare: report.quality.glare, shadow: report.quality.shadow } : null,
          plan: report.plan,
          passes: report.passes.map(({ variantId, applied, status, score, entries: passEntries, elapsedMs }) => ({ variantId, applied, status, score: score ?? null, entries: passEntries ?? null, elapsedMs })),
          chosenVariant: report.chosenVariant,
          agreement: report.agreement,
          waves: report.waves,
          elapsedMs: report.elapsedMs,
          rawText: report.rawText
        })),
        removed
      }
    };
  }),
  // Elle eşleştirme listesi (öğrenci "Değiştir" dediğinde).
  topicOptions: protectedProcedure.input(z3.object({ subject: z3.string().max(80).nullable().optional() }).optional()).query(async ({ input }) => {
    const topics = await getMatchableTopics();
    const subject = input?.subject?.trim();
    return topics.filter((topic) => !subject || topic.subject === subject).map(({ id, exam, subject: topicSubject, unit, topic }) => ({ id, exam, subject: topicSubject, unit, topic })).sort((a, b) => a.exam.localeCompare(b.exam) || a.subject.localeCompare(b.subject, "tr") || a.unit.localeCompare(b.unit, "tr") || a.topic.localeCompare(b.topic, "tr"));
  }),
  // Öğrencinin onayladığı içerik (OCR'dan ya da tamamen elle).
  save: protectedProcedure.input(z3.object({
    bookId: bookIdInput,
    subject: z3.string().max(80),
    source: z3.enum(["ocr", "manual"]),
    items: z3.array(z3.object({
      unitNumber: z3.number().int().min(0).max(200).nullable(),
      unitTitle: z3.string().max(300),
      contentType: contentTypeInput,
      label: z3.string().min(1).max(120),
      testNumber: z3.number().int().min(0).max(1e3).nullable(),
      title: z3.string().max(300),
      pageStart: z3.number().int().min(1).max(5e3).nullable(),
      pageEnd: z3.number().int().min(1).max(5e3).nullable(),
      topicId: z3.number().int().positive().nullable(),
      mappingMethod: z3.enum(["exact_topic", "exact_alias", "contains_topic", "contains_alias", "fuzzy", "ai", "manual", "none"]),
      mappingConfidence: z3.number().min(0).max(1)
    })).max(400)
  })).mutation(async ({ ctx, input }) => {
    await assertOwnsBook(ctx.user.id, input.bookId);
    for (const item of input.items) {
      if (item.pageStart !== null && item.pageEnd !== null && item.pageEnd < item.pageStart) throw new TRPCError2({ code: "BAD_REQUEST", message: `"${item.label}" sat\u0131r\u0131nda biti\u015F sayfas\u0131 ba\u015Flang\u0131\xE7tan k\xFC\xE7\xFCk.` });
    }
    try {
      return await replaceBookContents(ctx.user.id, input.bookId, input.subject, input.items, input.source);
    } catch (error) {
      throw new TRPCError2({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "\u0130\xE7erik kaydedilemedi." });
    }
  }),
  contents: protectedProcedure.input(z3.object({ bookId: bookIdInput })).query(async ({ ctx, input }) => {
    await assertOwnsBook(ctx.user.id, input.bookId);
    return getBookContents(ctx.user.id, input.bookId);
  }),
  summaries: protectedProcedure.query(({ ctx }) => getBookContentSummaries(ctx.user.id)),
  recommendations: protectedProcedure.query(({ ctx }) => getWeakTopicBookRecommendations(ctx.user.id)),
  autoSchedule: protectedProcedure.query(({ ctx }) => getAutoSchedule(ctx.user.id)),
  setAutoSchedule: protectedProcedure.input(z3.object({ enabled: z3.boolean() })).mutation(({ ctx, input }) => setAutoSchedule(ctx.user.id, input.enabled)),
  // İstemci günde bir kez çağırır (tercih kapalıysa hiçbir şey yapmaz).
  runAutoSchedule: protectedProcedure.input(z3.object({ bookTitles: z3.record(z3.string().max(120), z3.string().max(180)) })).mutation(({ ctx, input }) => runAutoSchedule(ctx.user.id, input.bookTitles)),
  addToPlan: protectedProcedure.input(z3.object({ topicId: z3.number().int().positive(), bookId: bookIdInput, bookTitle: z3.string().max(180), when: z3.enum(["today", "auto"]) })).mutation(async ({ ctx, input }) => {
    try {
      return await addRecommendationToPlan(ctx.user.id, input);
    } catch (error) {
      throw new TRPCError2({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "G\xF6rev plana eklenemedi." });
    }
  })
});

// server/routers/notes.ts
import { TRPCError as TRPCError3 } from "@trpc/server";
import { z as z4 } from "zod";

// server/notes/noteAi.ts
var INSTRUCTIONS = {
  summarize: "Notu 3-6 maddelik k\u0131sa bir \xF6zete \xE7evir.",
  keypoints: "Nottaki s\u0131nav i\xE7in \xF6nemli bilgileri madde madde \xE7\u0131kar (en fazla 8).",
  questions: "Nottaki bilgiyi yoklayan 3-6 k\u0131sa YKS tarz\u0131 soru yaz (cevaps\u0131z, yaln\u0131z soru).",
  flashcards: "Nottan 3-8 flashcard \xFCret: front = k\u0131sa soru, back = k\u0131sa net cevap.",
  simplify: "Notu bir lise \xF6\u011Frencisinin hemen anlayaca\u011F\u0131 sade c\xFCmlelerle, madde madde yeniden anlat.",
  review: "Nottan \xF6\u011Frencinin tekrar etmesi gereken kavram/konular\u0131 madde madde \xE7\u0131kar (en fazla 6)."
};
async function runNoteAi(action, plainText, invoke = invokeLLM) {
  const input = plainText.trim().slice(0, notesConfig.ai.maxInputChars);
  if (!input) throw new Error("Bu notta i\u015Flenecek yaz\u0131 yok.");
  const response = await invoke({
    messages: [
      { role: "system", content: `Sen bir YKS \xF6\u011Frencisinin kendi ders notunu i\u015Fleyen yard\u0131mc\u0131 bir asistans\u0131n. Yaln\u0131zca nottaki bilgiye dayan, not d\u0131\u015F\u0131 bilgi uydurma; T\xFCrk\xE7e yaz. ${INSTRUCTIONS[action]} Her maddeyi 'front' alan\u0131na yaz; yaln\u0131zca flashcard'larda 'back' doldur, di\u011Ferlerinde bo\u015F string b\u0131rak.` },
      { role: "user", content: input }
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "note_ai_items", strict: true, schema: { type: "object", properties: { items: { type: "array", items: { type: "object", properties: { front: { type: "string" }, back: { type: "string" } }, required: ["front", "back"], additionalProperties: false } } }, required: ["items"], additionalProperties: false } }
    }
  });
  const raw = response.choices[0]?.message?.content;
  const jsonText = typeof raw === "string" ? raw : raw?.map((part) => part.type === "text" ? part.text : "").join("");
  if (!jsonText) throw new Error("AI yan\u0131t\u0131 bo\u015F d\xF6nd\xFC.");
  const items = (JSON.parse(jsonText).items ?? []).map((item) => ({ front: String(item.front ?? "").trim().slice(0, 500), back: String(item.back ?? "").trim().slice(0, 500) })).filter((item) => item.front).slice(0, 10);
  if (items.length === 0) throw new Error("AI bu nottan bir sonu\xE7 \xE7\u0131karamad\u0131.");
  return items.map((item) => action === "flashcards" && item.back ? item : { front: item.front });
}

// server/notes/notesDb.ts
import { and as and7, desc as desc3, eq as eq9, gte as gte5, inArray as inArray3, isNotNull, like, lt as lt4, lte as lte3, or, sql as sql4 } from "drizzle-orm";

// shared/noteContent.ts
var BLOCK_TYPES = /* @__PURE__ */ new Set(["paragraph", "heading", "listItem", "taskItem", "blockquote", "formula", "noteImage", "voiceClip", "drawing", "horizontalRule"]);
function extractPlainText(doc) {
  const parts = [];
  const walk = (node) => {
    if (node.type === "text" && typeof node.text === "string") parts.push(node.text);
    else if (node.type === "hardBreak") parts.push("\n");
    else if (node.type === "formula" && typeof node.attrs?.latex === "string") parts.push(` ${node.attrs.latex} `);
    else if (node.type === "noteImage" && typeof node.attrs?.ocrText === "string") parts.push(node.attrs.ocrText);
    for (const child of node.content ?? []) walk(child);
    if (BLOCK_TYPES.has(node.type)) parts.push("\n");
  };
  walk(doc);
  return parts.join("").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
function computeNoteStats(doc) {
  const stats = { images: 0, voice: 0, voiceSeconds: 0, formulas: 0, drawings: 0, checklist: 0, checklistDone: 0, firstFormula: null };
  const walk = (node) => {
    if (node.type === "noteImage") stats.images += 1;
    if (node.type === "voiceClip") {
      stats.voice += 1;
      stats.voiceSeconds += Number(node.attrs?.duration) || 0;
    }
    if (node.type === "formula") {
      stats.formulas += 1;
      if (!stats.firstFormula && typeof node.attrs?.latex === "string") stats.firstFormula = node.attrs.latex.slice(0, 60);
    }
    if (node.type === "drawing") stats.drawings += 1;
    if (node.type === "taskItem") {
      stats.checklist += 1;
      if (node.attrs?.checked) stats.checklistDone += 1;
    }
    for (const child of node.content ?? []) walk(child);
  };
  walk(doc);
  return stats;
}
function deriveNoteTitle(title, plainText, noteDate) {
  const clean = title.trim();
  if (clean) return clean.slice(0, 200);
  const firstLine = plainText.split("\n").map((line) => line.trim()).find(Boolean);
  if (firstLine) return firstLine.length > 60 ? `${firstLine.slice(0, 57)}\u2026` : firstLine;
  return `Not \xB7 ${noteDate.toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}`;
}
function normalizeTag(value) {
  const tag = value.trim().replace(/^#+/, "").replace(/İ/g, "i").replace(/I/g, "\u0131").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9çğıöşü_-]/g, "").slice(0, 40);
  return tag.length >= 2 ? tag : null;
}
function isValidNoteDoc(value, limits = { maxNodes: 2e4, maxDepth: 30 }) {
  if (!value || typeof value !== "object" || value.type !== "doc" || !Array.isArray(value.content)) return false;
  let count3 = 0;
  const check2 = (node, depth) => {
    if (!node || typeof node !== "object" || typeof node.type !== "string") return false;
    if (++count3 > limits.maxNodes || depth > limits.maxDepth) return false;
    const children = node.content;
    if (children !== void 0 && !Array.isArray(children)) return false;
    return (children ?? []).every((child) => check2(child, depth + 1));
  };
  return check2(value, 0);
}
var NOTE_AI_ACTIONS = {
  summarize: { label: "\xD6zet", menu: "\xD6zetle" },
  keypoints: { label: "\xD6nemli noktalar", menu: "\xD6nemli noktalar\u0131 \xE7\u0131kar" },
  questions: { label: "Sorular", menu: "Soru olu\u015Ftur" },
  flashcards: { label: "Flashcard", menu: "Flashcard olu\u015Ftur" },
  simplify: { label: "Basitle\u015Ftirilmi\u015F", menu: "Basitle\u015Ftir" },
  review: { label: "Tekrar etmem gerekenler", menu: "Tekrar etmem gerekenleri bul" }
};
function aiResultToNodes(action, items) {
  const text2 = (value) => value.trim() ? [{ type: "text", text: value.trim() }] : [];
  const listType = action === "questions" ? "orderedList" : "bulletList";
  const list = {
    type: listType,
    content: items.map((item) => ({
      type: "listItem",
      content: action === "flashcards" && item.back ? [{ type: "paragraph", content: [{ type: "text", text: "S: ", marks: [{ type: "bold" }] }, ...text2(item.front)] }, { type: "paragraph", content: [{ type: "text", text: "C: ", marks: [{ type: "bold" }] }, ...text2(item.back)] }] : [{ type: "paragraph", content: text2(item.front) }]
    }))
  };
  return [{ type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text: `\u2728 AI \xB7 ${NOTE_AI_ACTIONS[action].label}`, marks: [{ type: "bold" }] }] }, list] }];
}

// server/notes/notesDb.ts
var NoteError = class extends Error {
};
async function requireDb3() {
  const db = await getDb();
  if (!db) throw new NoteError("Veritaban\u0131 ba\u011Flant\u0131s\u0131 yok.");
  return db;
}
function referencedAttachmentIds(doc) {
  const ids = /* @__PURE__ */ new Set();
  const walk = (node) => {
    if ((node.type === "noteImage" || node.type === "voiceClip") && Number.isInteger(node.attrs?.attachmentId)) ids.add(Number(node.attrs.attachmentId));
    for (const child of node.content ?? []) walk(child);
  };
  walk(doc);
  return Array.from(ids);
}
async function resolveLinks(db, userId, links) {
  let subject = links.subject?.trim() || null;
  const topicId = links.topicId ?? null;
  if (topicId !== null) {
    const [topic] = await db.select({ subject: yksTopics.subject }).from(yksTopics).where(eq9(yksTopics.id, topicId)).limit(1);
    if (!topic) throw new NoteError("Se\xE7ilen konu bulunamad\u0131.");
    subject = subject ?? topic.subject;
  }
  const bookId = links.bookId?.trim() || null;
  if (bookId) {
    const [owned] = await db.select({ id: bookInventory.id }).from(bookInventory).where(and7(eq9(bookInventory.userId, userId), eq9(bookInventory.bookId, bookId))).limit(1);
    if (!owned) throw new NoteError("Bu kitap k\xFCt\xFCphanende bulunmuyor.");
  }
  const bookContentId = links.bookContentId ?? null;
  if (bookContentId !== null) {
    const [content] = await db.select({ bookId: userBookContents.bookId }).from(userBookContents).where(and7(eq9(userBookContents.id, bookContentId), eq9(userBookContents.userId, userId))).limit(1);
    if (!content || bookId && content.bookId !== bookId) throw new NoteError("Se\xE7ilen kitap b\xF6l\xFCm\xFC ge\xE7ersiz.");
  }
  const studySessionId = links.studySessionId ?? null;
  if (studySessionId !== null) {
    const [session] = await db.select({ id: studyPlanSessions.id }).from(studyPlanSessions).where(and7(eq9(studyPlanSessions.id, studySessionId), eq9(studyPlanSessions.userId, userId))).limit(1);
    if (!session) throw new NoteError("\xC7al\u0131\u015Fma oturumu bulunamad\u0131.");
  }
  const mockExamId = links.mockExamId ?? null;
  if (mockExamId !== null) {
    const [exam] = await db.select({ id: userMockExams.id }).from(userMockExams).where(and7(eq9(userMockExams.id, mockExamId), eq9(userMockExams.userId, userId))).limit(1);
    if (!exam) throw new NoteError("Deneme bulunamad\u0131.");
  }
  return { subject: subject?.slice(0, 80) ?? null, topicId, bookId, bookContentId, studySessionId, mockExamId };
}
async function saveNote(userId, input) {
  const db = await requireDb3();
  if (!isValidNoteDoc(input.content)) throw new NoteError("Not i\xE7eri\u011Fi okunamad\u0131.");
  const contentJson = JSON.stringify(input.content);
  if (Buffer.byteLength(contentJson) > notesConfig.content.maxContentBytes) throw new NoteError("Not \xE7ok b\xFCy\xFCk. Baz\u0131 \xE7izim ya da g\xF6rselleri ayr\u0131 bir nota ta\u015F\u0131r m\u0131s\u0131n?");
  const plainText = extractPlainText(input.content);
  const stats = computeNoteStats(input.content);
  const links = await resolveLinks(db, userId, input);
  const title = deriveNoteTitle(input.title, plainText, input.noteDate);
  const tags = Array.from(new Set(input.tags.map(normalizeTag).filter((tag) => Boolean(tag)))).slice(0, notesConfig.content.maxTagsPerNote);
  const values = {
    title,
    content: contentJson,
    plainText,
    stats: JSON.stringify(stats),
    noteDate: input.noteDate,
    subject: links.subject,
    topicId: links.topicId,
    bookId: links.bookId,
    bookContentId: links.bookContentId,
    studySessionId: links.studySessionId,
    mockExamId: links.mockExamId,
    reviewAt: input.reviewAt ?? null,
    templateKey: input.templateKey ?? null,
    ...input.isFavorite !== void 0 ? { isFavorite: input.isFavorite ? 1 : 0 } : {},
    ...input.isPinned !== void 0 ? { isPinned: input.isPinned ? 1 : 0 } : {}
  };
  await db.insert(notes).values({ userId, clientId: input.clientId, ...values, isFavorite: input.isFavorite ? 1 : 0, isPinned: input.isPinned ? 1 : 0 }).onDuplicateKeyUpdate({ set: { ...values, version: sql4`${notes.version} + 1` } });
  const [saved] = await db.select({ id: notes.id, version: notes.version, updatedAt: notes.updatedAt, title: notes.title }).from(notes).where(and7(eq9(notes.userId, userId), eq9(notes.clientId, input.clientId))).limit(1);
  if (!saved) throw new NoteError("Not kaydedilemedi.");
  await db.delete(noteTags).where(and7(eq9(noteTags.userId, userId), eq9(noteTags.noteId, saved.id)));
  if (tags.length) await db.insert(noteTags).values(tags.map((tag) => ({ noteId: saved.id, userId, tag })));
  await getAttachmentStorage().syncNoteLinks(userId, saved.id, referencedAttachmentIds(input.content));
  return { id: saved.id, clientId: input.clientId, version: saved.version, title: saved.title, updatedAt: saved.updatedAt };
}
async function describeLinks(db, userId, rows) {
  const topicIds = Array.from(new Set(rows.map((row) => row.topicId).filter((id) => id !== null)));
  const bookIds = Array.from(new Set(rows.map((row) => row.bookId).filter((id) => Boolean(id))));
  const numeric = bookIds.filter((id) => /^\d+$/.test(id)).map(Number);
  const [topics, custom, catalog] = await Promise.all([
    topicIds.length ? db.select({ id: yksTopics.id, topic: yksTopics.topic, unit: yksTopics.unit }).from(yksTopics).where(inArray3(yksTopics.id, topicIds)) : Promise.resolve([]),
    bookIds.length ? db.select({ bookId: userResourceBooks.bookId, title: userResourceBooks.title }).from(userResourceBooks).where(and7(eq9(userResourceBooks.userId, userId), inArray3(userResourceBooks.bookId, bookIds))) : Promise.resolve([]),
    numeric.length ? db.select({ id: catalogBooks.id, name: catalogBooks.name }).from(catalogBooks).where(inArray3(catalogBooks.id, numeric)) : Promise.resolve([])
  ]);
  const topicById = new Map(topics.map((row) => [row.id, row]));
  const bookTitle = new Map([...custom.map((row) => [row.bookId, row.title]), ...catalog.map((row) => [String(row.id), row.name])]);
  return { topicById, bookTitle };
}
var parseStats = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return computeNoteStats({ type: "doc", content: [] });
  }
};
async function getNote(userId, id) {
  const db = await requireDb3();
  const [row] = await db.select().from(notes).where(and7(eq9(notes.id, id), eq9(notes.userId, userId))).limit(1);
  if (!row) return null;
  const [tags, links] = await Promise.all([
    db.select({ tag: noteTags.tag }).from(noteTags).where(and7(eq9(noteTags.userId, userId), eq9(noteTags.noteId, id))),
    describeLinks(db, userId, [row])
  ]);
  return {
    ...row,
    content: JSON.parse(row.content),
    stats: parseStats(row.stats),
    isFavorite: row.isFavorite === 1,
    isPinned: row.isPinned === 1,
    tags: tags.map((item) => item.tag),
    topic: row.topicId !== null ? links.topicById.get(row.topicId) ?? null : null,
    bookTitle: row.bookId ? links.bookTitle.get(row.bookId) ?? null : null
  };
}
var escapeLike = (value) => value.replace(/[\\%_]/g, (char) => `\\${char}`);
async function keywordCondition(db, userId, q) {
  const term = `%${escapeLike(q.trim().slice(0, 100))}%`;
  const [topics, books] = await Promise.all([
    db.select({ id: yksTopics.id }).from(yksTopics).where(like(yksTopics.topic, term)).limit(50),
    db.select({ bookId: userResourceBooks.bookId }).from(userResourceBooks).where(and7(eq9(userResourceBooks.userId, userId), like(userResourceBooks.title, term))).limit(50)
  ]);
  const conditions = [
    like(notes.title, term),
    like(notes.plainText, term),
    like(notes.subject, term),
    sql4`EXISTS (SELECT 1 FROM ${noteTags} WHERE ${noteTags.noteId} = ${notes.id} AND ${noteTags.tag} LIKE ${term})`
  ];
  if (topics.length) conditions.push(inArray3(notes.topicId, topics.map((row) => row.id)));
  if (books.length) conditions.push(inArray3(notes.bookId, books.map((row) => row.bookId)));
  return or(...conditions);
}
async function listNotes(userId, filters) {
  const db = await requireDb3();
  const limit = Math.min(Math.max(filters.limit ?? notesConfig.list.pageSize, 1), 100);
  const conditions = [eq9(notes.userId, userId), eq9(notes.status, "active")];
  if (filters.from) conditions.push(gte5(notes.noteDate, filters.from));
  if (filters.to) conditions.push(lte3(notes.noteDate, filters.to));
  if (filters.subject) conditions.push(eq9(notes.subject, filters.subject));
  if (filters.topicId) conditions.push(eq9(notes.topicId, filters.topicId));
  if (filters.bookId) conditions.push(eq9(notes.bookId, filters.bookId));
  if (filters.studySessionId) conditions.push(eq9(notes.studySessionId, filters.studySessionId));
  if (filters.favorite) conditions.push(eq9(notes.isFavorite, 1));
  if (filters.pinned) conditions.push(eq9(notes.isPinned, 1));
  if (filters.reviewDue) conditions.push(and7(isNotNull(notes.reviewAt), lte3(notes.reviewAt, endOfToday())));
  if (filters.tag) {
    const tag = normalizeTag(filters.tag);
    if (tag) conditions.push(sql4`EXISTS (SELECT 1 FROM ${noteTags} WHERE ${noteTags.noteId} = ${notes.id} AND ${noteTags.tag} = ${tag})`);
  }
  if (filters.kind) {
    const statKey = { voice: "voice", image: "images", formula: "formulas", drawing: "drawings" };
    if (filters.kind === "text") conditions.push(sql4`CHAR_LENGTH(${notes.plainText}) > 0`);
    else conditions.push(sql4`CAST(JSON_UNQUOTE(JSON_EXTRACT(${notes.stats}, ${`$.${statKey[filters.kind]}`})) AS UNSIGNED) > 0`);
  }
  if (filters.q?.trim()) conditions.push(await keywordCondition(db, userId, filters.q));
  if (filters.cursor) {
    const [time, id] = filters.cursor.split("_").map(Number);
    if (Number.isFinite(time) && Number.isFinite(id)) conditions.push(or(lt4(notes.noteDate, new Date(time)), and7(eq9(notes.noteDate, new Date(time)), lt4(notes.id, id))));
  }
  const rows = await db.select({ id: notes.id, clientId: notes.clientId, title: notes.title, plainText: notes.plainText, stats: notes.stats, noteDate: notes.noteDate, subject: notes.subject, topicId: notes.topicId, bookId: notes.bookId, studySessionId: notes.studySessionId, isFavorite: notes.isFavorite, isPinned: notes.isPinned, reviewAt: notes.reviewAt, updatedAt: notes.updatedAt }).from(notes).where(and7(...conditions)).orderBy(desc3(notes.noteDate), desc3(notes.id)).limit(limit + 1);
  const page = rows.slice(0, limit);
  const ids = page.map((row) => row.id);
  const [tags, links] = await Promise.all([
    ids.length ? db.select({ noteId: noteTags.noteId, tag: noteTags.tag }).from(noteTags).where(and7(eq9(noteTags.userId, userId), inArray3(noteTags.noteId, ids))) : Promise.resolve([]),
    describeLinks(db, userId, page)
  ]);
  const last = page[page.length - 1];
  return {
    items: page.map(({ plainText, stats, ...row }) => ({
      ...row,
      snippet: plainText.replace(/\s+/g, " ").slice(0, notesConfig.list.snippetLength),
      stats: parseStats(stats),
      isFavorite: row.isFavorite === 1,
      isPinned: row.isPinned === 1,
      tags: tags.filter((item) => item.noteId === row.id).map((item) => item.tag),
      topic: row.topicId !== null ? links.topicById.get(row.topicId)?.topic ?? null : null,
      bookTitle: row.bookId ? links.bookTitle.get(row.bookId) ?? null : null
    })),
    nextCursor: rows.length > limit && last ? `${new Date(last.noteDate).getTime()}_${last.id}` : null
  };
}
var endOfToday = () => {
  const date = /* @__PURE__ */ new Date();
  date.setHours(23, 59, 59, 999);
  return date;
};
async function updateNoteFlags(userId, id, flags) {
  const db = await requireDb3();
  const set = {
    ...flags.isFavorite !== void 0 ? { isFavorite: flags.isFavorite ? 1 : 0 } : {},
    ...flags.isPinned !== void 0 ? { isPinned: flags.isPinned ? 1 : 0 } : {},
    ...flags.reviewAt !== void 0 ? { reviewAt: flags.reviewAt } : {},
    ...flags.archived !== void 0 ? { status: flags.archived ? "archived" : "active" } : {}
  };
  const [row] = await db.select({ id: notes.id }).from(notes).where(and7(eq9(notes.id, id), eq9(notes.userId, userId))).limit(1);
  if (!row) throw new NoteError("Not bulunamad\u0131.");
  if (Object.keys(set).length === 0) return;
  await db.update(notes).set(set).where(and7(eq9(notes.id, id), eq9(notes.userId, userId)));
}
async function deleteNote(userId, id) {
  const db = await requireDb3();
  const [row] = await db.select({ id: notes.id }).from(notes).where(and7(eq9(notes.id, id), eq9(notes.userId, userId))).limit(1);
  if (!row) throw new NoteError("Not bulunamad\u0131.");
  await getAttachmentStorage().deleteForNote(userId, id);
  await db.delete(noteTags).where(and7(eq9(noteTags.userId, userId), eq9(noteTags.noteId, id)));
  await db.delete(notes).where(and7(eq9(notes.id, id), eq9(notes.userId, userId)));
}
async function getNoteCalendar(userId, from, to) {
  const db = await requireDb3();
  const [written, reviews] = await Promise.all([
    db.select({ noteDate: notes.noteDate }).from(notes).where(and7(eq9(notes.userId, userId), eq9(notes.status, "active"), gte5(notes.noteDate, from), lte3(notes.noteDate, to))),
    db.select({ reviewAt: notes.reviewAt }).from(notes).where(and7(eq9(notes.userId, userId), eq9(notes.status, "active"), gte5(notes.reviewAt, from), lte3(notes.reviewAt, to)))
  ]);
  return { notes: written.map((row) => row.noteDate), reviews: reviews.map((row) => row.reviewAt).filter((value) => value !== null) };
}
async function listTags(userId) {
  const db = await requireDb3();
  const rows = await db.select({ tag: noteTags.tag, count: sql4`COUNT(*)` }).from(noteTags).where(eq9(noteTags.userId, userId)).groupBy(noteTags.tag).orderBy(desc3(sql4`COUNT(*)`)).limit(50);
  return rows.map((row) => ({ tag: row.tag, count: Number(row.count) }));
}
async function getNoteStatsForAdmin(userId) {
  const db = await requireDb3();
  const rows = await db.select({ stats: notes.stats, updatedAt: notes.updatedAt }).from(notes).where(eq9(notes.userId, userId));
  const parsed = rows.map((row) => parseStats(row.stats));
  return {
    notes: rows.length,
    voiceNotes: parsed.filter((stats) => stats.voice > 0).length,
    imageNotes: parsed.filter((stats) => stats.images > 0).length,
    lastActivity: rows.reduce((latest, row) => !latest || row.updatedAt > latest ? row.updatedAt : latest, null)
  };
}
async function createTaskFromNote(userId, noteId, input) {
  const db = await requireDb3();
  const [note] = await db.select({ id: notes.id, title: notes.title, topicId: notes.topicId }).from(notes).where(and7(eq9(notes.id, noteId), eq9(notes.userId, userId))).limit(1);
  if (!note) throw new NoteError("Not bulunamad\u0131.");
  const topicId = input.topicId ?? note.topicId;
  if (!topicId) throw new NoteError("G\xF6rev olu\u015Fturmak i\xE7in \xF6nce notu bir konuya ba\u011Fla.");
  const [topic] = await db.select({ topic: yksTopics.topic, subject: yksTopics.subject }).from(yksTopics).where(eq9(yksTopics.id, topicId)).limit(1);
  if (!topic) throw new NoteError("Se\xE7ilen konu bulunamad\u0131.");
  const minutes = Math.min(Math.max(input.minutes ?? notesConfig.task.defaultMinutes, 10), 240);
  const date = await pickDayForTask(userId, minutes, input.when);
  const title = `${topic.subject} \xB7 ${topic.topic} (nottan: ${note.title})`;
  await insertPlanTask(userId, { date, title, subject: topic.subject, topic: topic.topic, kind: "Tekrar", minutes, planTitle: "Defter g\xF6revleri", planSummary: "Ak\u0131ll\u0131 Defter'deki notlardan olu\u015Fturulan \xE7al\u0131\u015Fma g\xF6revleri." });
  return { date, title: title.slice(0, 180), minutes };
}

// server/_core/voiceTranscription.ts
var MAX_AUDIO_BYTES = 16 * 1024 * 1024;
var EXTENSIONS = {
  "audio/webm": "webm",
  "audio/mp3": "mp3",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/wave": "wav",
  "audio/ogg": "ogg",
  "audio/m4a": "m4a",
  "audio/mp4": "m4a"
};
async function transcribeAudioBuffer(audio, mimeType, options = {}) {
  const target = resolveLlmTarget();
  if (!target) return { error: "Voice transcription service is not configured", code: "SERVICE_ERROR", details: "LLM_API_KEY is not set" };
  if (audio.length > MAX_AUDIO_BYTES) return { error: "Audio file exceeds maximum size limit", code: "FILE_TOO_LARGE" };
  try {
    const baseMime = mimeType.split(";")[0].trim();
    const formData = new FormData();
    formData.append("file", new Blob([new Uint8Array(audio)], { type: baseMime }), `audio.${EXTENSIONS[baseMime] ?? "webm"}`);
    const model = ENV.transcribeModel || "whisper-1";
    formData.append("model", model);
    formData.append("response_format", model === "whisper-1" ? "verbose_json" : "json");
    if (options.language) formData.append("language", options.language);
    if (options.prompt) formData.append("prompt", options.prompt);
    const response = await fetch(`${target.baseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: { authorization: `Bearer ${target.key}` },
      body: formData
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return { error: "Transcription service request failed", code: "TRANSCRIPTION_FAILED", details: `${response.status} ${response.statusText}${errorText ? `: ${errorText.slice(0, 300)}` : ""}` };
    }
    const result = await response.json();
    if (typeof result.text !== "string") return { error: "Invalid transcription response", code: "SERVICE_ERROR" };
    return result;
  } catch (error) {
    return { error: "Voice transcription failed", code: "SERVICE_ERROR", details: error instanceof Error ? error.message : "Unknown error" };
  }
}

// server/notes/speechProvider.ts
var SpeechToTextError = class extends Error {
  constructor(message, retryable) {
    super(message);
    this.retryable = retryable;
  }
};
var whisperSpeechProvider = {
  name: "whisper",
  async transcribe(audio, mimeType) {
    const result = await transcribeAudioBuffer(audio, mimeType, { language: notesConfig.speech.language, prompt: notesConfig.speech.prompt });
    if ("error" in result) {
      console.warn(`[Notes] Transcription failed: ${result.code}`);
      if (result.code === "SERVICE_ERROR" && /not configured|not set/i.test(`${result.error} ${result.details ?? ""}`)) throw new SpeechToTextError("Ses \u2192 metin servisi \u015Fu an yap\u0131land\u0131r\u0131lmam\u0131\u015F.", false);
      throw new SpeechToTextError("Ses metne \xE7evrilemedi. Tekrar dener misin?", true);
    }
    return { text: result.text.trim(), durationSec: typeof result.duration === "number" && Number.isFinite(result.duration) ? Math.round(result.duration) : null };
  }
};
var getSpeechProvider = () => notesConfig.speech.provider === "whisper" ? whisperSpeechProvider : null;

// server/routers/notes.ts
var optionalId = z4.number().int().positive().nullable().optional();
var linksInput = {
  subject: z4.string().max(80).nullable().optional(),
  topicId: optionalId,
  bookId: z4.string().max(120).nullable().optional(),
  bookContentId: optionalId,
  studySessionId: optionalId,
  mockExamId: optionalId
};
async function userFacing(work) {
  try {
    return await work();
  } catch (error) {
    if (error instanceof NoteError || error instanceof AttachmentError || error instanceof PlanTaskError) throw new TRPCError3({ code: "BAD_REQUEST", message: error.message });
    throw error;
  }
}
var requireUserId = (ctx) => {
  if (!ctx.user) throw new TRPCError3({ code: "UNAUTHORIZED" });
  return ctx.user.id;
};
var notesRouter = router({
  list: protectedProcedure.input(z4.object({
    from: z4.string().datetime().nullable().optional(),
    to: z4.string().datetime().nullable().optional(),
    subject: z4.string().max(80).nullable().optional(),
    topicId: optionalId,
    bookId: z4.string().max(120).nullable().optional(),
    tag: z4.string().max(40).nullable().optional(),
    kind: z4.enum(["text", "voice", "image", "formula", "drawing"]).nullable().optional(),
    q: z4.string().max(100).nullable().optional(),
    favorite: z4.boolean().optional(),
    pinned: z4.boolean().optional(),
    studySessionId: optionalId,
    reviewDue: z4.boolean().optional(),
    cursor: z4.string().max(40).nullable().optional(),
    limit: z4.number().int().min(1).max(100).optional()
  })).query(({ ctx, input }) => userFacing(() => listNotes(ctx.user.id, { ...input, from: input.from ? new Date(input.from) : null, to: input.to ? new Date(input.to) : null }))),
  get: protectedProcedure.input(z4.object({ id: z4.number().int().positive() })).query(async ({ ctx, input }) => {
    const note = await getNote(ctx.user.id, input.id);
    if (!note) throw new TRPCError3({ code: "NOT_FOUND", message: "Not bulunamad\u0131." });
    return note;
  }),
  // Otomatik kayıt da bu uçtan yapılır (istemci 800 ms debounce ile çağırır).
  save: protectedProcedure.input(z4.object({
    clientId: z4.string().min(8).max(40).regex(/^[A-Za-z0-9_-]+$/),
    title: z4.string().max(notesConfig.content.maxTitleLength),
    content: z4.unknown(),
    noteDate: z4.string().datetime(),
    tags: z4.array(z4.string().max(40)).max(notesConfig.content.maxTagsPerNote),
    isFavorite: z4.boolean().optional(),
    isPinned: z4.boolean().optional(),
    reviewAt: z4.string().datetime().nullable().optional(),
    templateKey: z4.string().max(40).nullable().optional(),
    ...linksInput
  })).mutation(({ ctx, input }) => userFacing(() => saveNote(ctx.user.id, { ...input, noteDate: new Date(input.noteDate), reviewAt: input.reviewAt ? new Date(input.reviewAt) : null }))),
  updateFlags: protectedProcedure.input(z4.object({ id: z4.number().int().positive(), isFavorite: z4.boolean().optional(), isPinned: z4.boolean().optional(), reviewAt: z4.string().datetime().nullable().optional(), archived: z4.boolean().optional() })).mutation(({ ctx, input }) => userFacing(() => updateNoteFlags(ctx.user.id, input.id, { isFavorite: input.isFavorite, isPinned: input.isPinned, archived: input.archived, reviewAt: input.reviewAt === void 0 ? void 0 : input.reviewAt ? new Date(input.reviewAt) : null }))),
  delete: protectedProcedure.input(z4.object({ id: z4.number().int().positive() })).mutation(({ ctx, input }) => userFacing(() => deleteNote(ctx.user.id, input.id))),
  calendar: protectedProcedure.input(z4.object({ from: z4.string().datetime(), to: z4.string().datetime() })).query(({ ctx, input }) => getNoteCalendar(ctx.user.id, new Date(input.from), new Date(input.to))),
  tags: protectedProcedure.query(({ ctx }) => listTags(ctx.user.id)),
  createTask: protectedProcedure.input(z4.object({ id: z4.number().int().positive(), topicId: optionalId, minutes: z4.number().int().min(10).max(240).optional(), when: z4.enum(["today", "auto"]) })).mutation(({ ctx, input }) => userFacing(() => createTaskFromNote(ctx.user.id, input.id, input))),
  // Fotoğraf ekleme (ücretsiz). İstemci fotoğrafı küçültüp gönderir; sunucu tür/boyut/kota doğrular.
  uploadImage: protectedProcedure.input(z4.object({ dataUrl: z4.string().min(20).max(Math.ceil(notesConfig.attachments.imageMaxBytes * 1.4)) })).mutation(({ ctx, input }) => userFacing(async () => {
    const storage = getAttachmentStorage();
    await storage.cleanupOrphans(ctx.user.id);
    const { mimeType, data } = decodeAttachment(input.dataUrl, "image");
    return storage.put(ctx.user.id, { kind: "image", mimeType, data });
  })),
  // Ses → metin. İsterse ses kaydı da nota eklenir (keepAudio).
  transcribe: metredFeatureProcedure("NOTE_VOICE", { maxRequests: 10, windowMs: 6e4 }).input(z4.object({ dataUrl: z4.string().min(20).max(Math.ceil(notesConfig.attachments.audioMaxBytes * 1.4)), durationSec: z4.number().min(0).max(notesConfig.speech.maxAudioSeconds + 5), keepAudio: z4.boolean() })).mutation(({ ctx, input }) => userFacing(async () => {
    const userId = requireUserId(ctx);
    const provider = getSpeechProvider();
    if (!provider) throw new NoteError("Ses \u2192 metin \u015Fu an kapal\u0131.");
    const { mimeType, data } = decodeAttachment(input.dataUrl, "audio");
    let text2;
    try {
      ({ text: text2 } = await provider.transcribe(data, mimeType));
    } catch (error) {
      if (error instanceof SpeechToTextError) throw new NoteError(error.message);
      throw error;
    }
    if (!text2) throw new NoteError("Kay\u0131tta konu\u015Fma alg\u0131lanamad\u0131. Mikrofona biraz daha yak\u0131n konu\u015Fup tekrar dener misin?");
    const durationSec = Math.round(input.durationSec);
    const attachment = input.keepAudio ? await getAttachmentStorage().put(userId, { kind: "audio", mimeType, data, durationSec }) : null;
    return { text: text2, durationSec, attachmentId: attachment?.id ?? null };
  })),
  // Fotoğraftaki metni çıkar (kitap OCR'ıyla aynı sağlayıcı).
  extractText: metredFeatureProcedure("NOTE_OCR").input(z4.object({ attachmentId: z4.number().int().positive() })).mutation(({ ctx, input }) => userFacing(async () => {
    const userId = requireUserId(ctx);
    const storage = getAttachmentStorage();
    const attachment = await storage.get(userId, input.attachmentId);
    if (!attachment || attachment.kind !== "image") throw new NoteError("Foto\u011Fraf bulunamad\u0131.");
    let text2;
    try {
      text2 = await extractPlainTextFromImage(`data:${attachment.mimeType};base64,${attachment.data.toString("base64")}`);
    } catch (error) {
      console.warn("[Notes] OCR failed:", error instanceof Error ? error.message : error);
      throw new NoteError(llmUnavailableMessage(error) ?? "Foto\u011Fraftaki metin okunamad\u0131. Daha net bir foto\u011Frafla tekrar dener misin?");
    }
    if (!text2) throw new NoteError("Foto\u011Frafta okunabilir bir yaz\u0131 bulunamad\u0131.");
    await storage.setOcrText(userId, input.attachmentId, text2);
    return { text: text2 };
  })),
  // AI araçları: sonuç notun ÜZERİNE YAZILMAZ; eklenecek blok olarak döner.
  ai: metredFeatureProcedure("NOTE_AI").input(z4.object({ id: z4.number().int().positive(), action: z4.enum(Object.keys(NOTE_AI_ACTIONS)) })).mutation(({ ctx, input }) => userFacing(async () => {
    const userId = requireUserId(ctx);
    const note = await getNote(userId, input.id);
    if (!note) throw new NoteError("Not bulunamad\u0131.");
    try {
      const items = await runNoteAi(input.action, note.plainText);
      return { items, nodes: aiResultToNodes(input.action, items) };
    } catch (error) {
      console.warn("[Notes] AI failed:", error instanceof Error ? error.message : error);
      throw new NoteError(error instanceof Error && /yazı yok|çıkaramadı/.test(error.message) ? error.message : "AI \u015Fu an yan\u0131t veremedi. Biraz sonra tekrar dener misin?");
    }
  }))
});

// server/routers/resourceCatalog.ts
import { TRPCError as TRPCError5 } from "@trpc/server";
import { z as z6 } from "zod";

// server/resourceCatalog/catalogQueries.ts
import { and as and8, asc, desc as desc4, eq as eq10, inArray as inArray4, isNull as isNull4, like as like2, sql as sql5 } from "drizzle-orm";
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
  const conditions = [eq10(catalogBooks.active, 1)];
  if (filters.exam) conditions.push(eq10(catalogBooks.examScope, filters.exam));
  if (filters.subject) conditions.push(eq10(catalogBooks.subject, filters.subject));
  if (filters.publisherId) conditions.push(eq10(catalogBooks.publisherId, filters.publisherId));
  if (filters.bookType) conditions.push(eq10(catalogBooks.bookType, filters.bookType));
  if (filters.difficulty) conditions.push(eq10(catalogBooks.difficultyLabel, filters.difficulty));
  if (filters.search) conditions.push(like2(catalogBooks.name, `%${filters.search}%`));
  let bookIdsForTopic = null;
  if (filters.topic) {
    const topicRows = await db.select({ bookId: bookCurriculumTopics.bookId }).from(bookCurriculumTopics).innerJoin(yksTopics, eq10(bookCurriculumTopics.topicId, yksTopics.id)).where(eq10(yksTopics.topic, filters.topic));
    bookIdsForTopic = topicRows.map((r) => r.bookId);
    if (bookIdsForTopic.length === 0) return { items: [], total: 0 };
    conditions.push(inArray4(catalogBooks.id, bookIdsForTopic));
  }
  const where = and8(...conditions);
  const [{ count: count3 }] = await db.select({ count: sql5`count(*)` }).from(catalogBooks).where(where);
  let rows = await db.select().from(catalogBooks).where(where).orderBy(desc4(catalogBooks.createdAt)).limit(pageSize).offset(offset);
  if (filters.minPrice !== void 0 || filters.maxPrice !== void 0) {
    const ids = rows.map((r) => r.id);
    const offerRows2 = ids.length ? await db.select().from(bookOffers).where(inArray4(bookOffers.bookId, ids)) : [];
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
  const publisherRows = publisherIds.length ? await db.select().from(publishers).where(inArray4(publishers.id, publisherIds)) : [];
  const publisherNameById = new Map(publisherRows.map((p) => [p.id, p.name]));
  const bookIds = rows.map((r) => r.id);
  const offerRows = bookIds.length ? await db.select().from(bookOffers).where(inArray4(bookOffers.bookId, bookIds)) : [];
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
async function listCatalogBooksForAdmin(filters, page) {
  const db = await getDb2();
  if (!db) return { items: [], total: 0 };
  const pageSize = Math.max(1, Math.min(page.pageSize || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE));
  const offset = Math.max(0, (page.page - 1) * pageSize);
  const conditions = [];
  if (filters.active !== void 0) conditions.push(eq10(catalogBooks.active, filters.active ? 1 : 0));
  if (filters.subject) conditions.push(eq10(catalogBooks.subject, filters.subject));
  if (filters.search) conditions.push(like2(catalogBooks.name, `%${filters.search}%`));
  const where = conditions.length ? and8(...conditions) : void 0;
  const countQuery = db.select({ count: sql5`count(*)` }).from(catalogBooks);
  const [{ count: count3 }] = await (where ? countQuery.where(where) : countQuery);
  const rowsQuery = db.select().from(catalogBooks).orderBy(desc4(catalogBooks.createdAt)).limit(pageSize).offset(offset);
  const rows = await (where ? rowsQuery.where(where) : rowsQuery);
  const publisherIds = Array.from(new Set(rows.map((r) => r.publisherId).filter((id) => id !== null)));
  const publisherRows = publisherIds.length ? await db.select().from(publishers).where(inArray4(publishers.id, publisherIds)) : [];
  const publisherNameById = new Map(publisherRows.map((p) => [p.id, p.name]));
  const items = rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    publisher: row.publisherId ? publisherNameById.get(row.publisherId) ?? null : null,
    examScope: row.examScope,
    subject: row.subject,
    bookType: row.bookType,
    difficultyLabel: row.difficultyLabel,
    active: row.active === 1,
    needsReview: row.needsReview === 1,
    classificationMethod: row.classificationMethod,
    createdAt: row.createdAt
  }));
  return { items, total: Number(count3) };
}
async function getCatalogBookBySlug(slug) {
  const db = await getDb2();
  if (!db) return null;
  const rows = await db.select().from(catalogBooks).where(eq10(catalogBooks.slug, slug)).limit(1);
  const book = rows[0];
  if (!book) return null;
  const [publisherRow, offerRows, topicRows] = await Promise.all([
    book.publisherId ? db.select().from(publishers).where(eq10(publishers.id, book.publisherId)).limit(1) : Promise.resolve([]),
    db.select().from(bookOffers).where(eq10(bookOffers.bookId, book.id)),
    db.select({ topic: yksTopics.topic, subject: yksTopics.subject, confidence: bookCurriculumTopics.confidence, isVerified: bookCurriculumTopics.isVerified }).from(bookCurriculumTopics).innerJoin(yksTopics, eq10(bookCurriculumTopics.topicId, yksTopics.id)).where(eq10(bookCurriculumTopics.bookId, book.id))
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
  return db.select({ id: publishers.id, name: publishers.name }).from(publishers).where(eq10(publishers.isActive, 1)).orderBy(asc(publishers.name));
}
async function listCatalogBooksForRecommendation(subject) {
  const db = await getDb2();
  if (!db) return [];
  const conditions = [eq10(catalogBooks.active, 1)];
  if (subject) conditions.push(eq10(catalogBooks.subject, subject));
  const rows = await db.select().from(catalogBooks).where(and8(...conditions));
  const bookIds = rows.map((r) => r.id);
  const topicRows = bookIds.length ? await db.select({ bookId: bookCurriculumTopics.bookId, topic: yksTopics.topic }).from(bookCurriculumTopics).innerJoin(yksTopics, eq10(bookCurriculumTopics.topicId, yksTopics.id)).where(inArray4(bookCurriculumTopics.bookId, bookIds)) : [];
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
  const inventoryRows = await db.select().from(bookInventory).where(and8(eq10(bookInventory.userId, userId), isNull4(bookInventory.removedAt)));
  const numericIds = Array.from(new Set(inventoryRows.map((row) => row.bookId).filter((id) => /^\d+$/.test(id)).map(Number)));
  if (numericIds.length === 0) return [];
  const [books, topicRows] = await Promise.all([
    db.select().from(catalogBooks).where(inArray4(catalogBooks.id, numericIds)),
    db.select({ bookId: bookCurriculumTopics.bookId, topicId: yksTopics.id, topic: yksTopics.topic, subject: yksTopics.subject, isVerified: bookCurriculumTopics.isVerified, confidence: bookCurriculumTopics.confidence }).from(bookCurriculumTopics).innerJoin(yksTopics, eq10(bookCurriculumTopics.topicId, yksTopics.id)).where(inArray4(bookCurriculumTopics.bookId, numericIds))
  ]);
  const publisherIds = Array.from(new Set(books.map((b) => b.publisherId).filter((id) => id !== null)));
  const publisherRows = publisherIds.length ? await db.select().from(publishers).where(inArray4(publishers.id, publisherIds)) : [];
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

// server/resourceCatalog/recommendationService.ts
init_turkishText();
var DIFFICULTY_RANK = { easy: 0, medium: 1, hard: 2 };
var DIFFICULTY_FIT_BY_STATUS = {
  "Zay\u0131f": [1, 0.6, 0.15],
  "Orta": [0.55, 1, 0.45],
  "\u0130yi": [0.25, 0.65, 1]
};
var LEARNING_TYPES = ["topic_explanation", "topic_explanation_question_bank", "fasikul"];
var PRACTICE_TYPES2 = ["question_bank", "test_book"];
var EXAM_STAGE_TYPES = ["mock_exam", "past_questions", "camp"];
var bookTypeFitByStatus = (status, bookType) => {
  if (status === "Zay\u0131f") return LEARNING_TYPES.includes(bookType) ? 1 : PRACTICE_TYPES2.includes(bookType) ? 0.5 : 0.2;
  if (status === "Orta") return PRACTICE_TYPES2.includes(bookType) ? 1 : LEARNING_TYPES.includes(bookType) ? 0.6 : 0.4;
  return EXAM_STAGE_TYPES.includes(bookType) ? 1 : PRACTICE_TYPES2.includes(bookType) ? 0.8 : 0.3;
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
import { TRPCError as TRPCError4 } from "@trpc/server";
import { z as z5 } from "zod";

// server/resourceCatalog/catalogDb.ts
import { and as and9, eq as eq11, inArray as inArray5 } from "drizzle-orm";
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
    const rows = await db.select().from(publishers).where(eq11(publishers.normalizedName, normalizedName)).limit(1);
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
    const rows = await db.select().from(externalBookSources).where(and9(eq11(externalBookSources.source, source), eq11(externalBookSources.sourceProductId, sourceProductId))).limit(1);
    return rows[0] ? { id: rows[0].id, source: rows[0].source, sourceProductId: rows[0].sourceProductId, matchedBookId: rows[0].matchedBookId, syncStatus: rows[0].syncStatus } : null;
  },
  async upsertExternalSource(row) {
    const db = await getDb3();
    if (!db) throw new Error("Database not available");
    const existing = await db.select().from(externalBookSources).where(and9(eq11(externalBookSources.source, row.source), eq11(externalBookSources.sourceProductId, row.sourceProductId))).limit(1);
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
      await db.update(externalBookSources).set(values).where(eq11(externalBookSources.id, existing[0].id));
      return { id: existing[0].id, source: row.source, sourceProductId: row.sourceProductId, matchedBookId: existing[0].matchedBookId, syncStatus: existing[0].syncStatus };
    }
    const result = await db.insert(externalBookSources).values(values);
    const id = Number(result[0].insertId);
    return { id, source: row.source, sourceProductId: row.sourceProductId, matchedBookId: null, syncStatus: "pending" };
  },
  async markExternalSourceOutcome(id, patch) {
    const db = await getDb3();
    if (!db) return;
    await db.update(externalBookSources).set({ matchedBookId: patch.matchedBookId, syncStatus: patch.syncStatus, lastSyncedAt: /* @__PURE__ */ new Date(), errorMessage: patch.errorMessage ?? null }).where(eq11(externalBookSources.id, id));
  },
  async findCatalogBookByIsbn(isbn) {
    const db = await getDb3();
    if (!db) return null;
    const rows = await db.select().from(catalogBooks).where(eq11(catalogBooks.isbn, isbn)).limit(1);
    return rows[0] ? toCatalogBookRow(rows[0]) : null;
  },
  async listCatalogBooksByPublisher(publisherId) {
    const db = await getDb3();
    if (!db) return [];
    const rows = await db.select().from(catalogBooks).where(eq11(catalogBooks.publisherId, publisherId));
    return rows.map((row) => ({ id: row.id, isbn: row.isbn, publisherId: row.publisherId, name: row.name, editionYear: row.editionYear }));
  },
  async getCatalogBookById(id) {
    const db = await getDb3();
    if (!db) return null;
    const rows = await db.select().from(catalogBooks).where(eq11(catalogBooks.id, id)).limit(1);
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
      await db.update(catalogBooks).set(values).where(eq11(catalogBooks.id, id));
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
    }).where(eq11(catalogBooks.id, id));
  },
  async upsertBookOffer(input) {
    const db = await getDb3();
    if (!db) return;
    const existing = await db.select().from(bookOffers).where(and9(eq11(bookOffers.bookId, input.bookId), eq11(bookOffers.source, input.source))).limit(1);
    const values = { price: input.price !== null ? String(input.price) : null, currency: input.currency, productUrl: input.productUrl, lastSyncedAt: /* @__PURE__ */ new Date() };
    if (existing[0]) {
      await db.update(bookOffers).set(values).where(eq11(bookOffers.id, existing[0].id));
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
    const existing = await db.select().from(bookCurriculumTopics).where(and9(eq11(bookCurriculumTopics.bookId, input.bookId), eq11(bookCurriculumTopics.topicId, input.topicId))).limit(1);
    if (existing[0]) {
      if (existing[0].isVerified === 1) return;
      await db.update(bookCurriculumTopics).set({ confidence: String(input.confidence), mappingMethod: "rule" }).where(eq11(bookCurriculumTopics.id, existing[0].id));
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
    }).where(eq11(resourceCatalogSyncLogs.id, id));
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
  return db.select().from(catalogBooks).where(eq11(catalogBooks.needsReview, 1));
}
async function setManualDifficulty(bookId, input) {
  const db = await getDb3();
  if (!db) throw new Error("Database not available");
  await db.update(catalogBooks).set({ difficultyLabel: input.label, difficultyScore: input.score, difficultyConfidence: "1", classificationMethod: "manual", manualOverride: 1, needsReview: 0, classifiedAt: /* @__PURE__ */ new Date() }).where(eq11(catalogBooks.id, bookId));
}
async function approveCatalogBookClassification(bookId) {
  const db = await getDb3();
  if (!db) throw new Error("Database not available");
  await db.update(catalogBooks).set({ needsReview: 0 }).where(eq11(catalogBooks.id, bookId));
}
async function markCatalogBookNeedsReview(bookId, needsReview) {
  const db = await getDb3();
  if (!db) throw new Error("Database not available");
  await db.update(catalogBooks).set({ needsReview: needsReview ? 1 : 0 }).where(eq11(catalogBooks.id, bookId));
}
async function setCatalogBookActive(bookId, active) {
  const db = await getDb3();
  if (!db) throw new Error("Database not available");
  await db.update(catalogBooks).set({ active: active ? 1 : 0 }).where(eq11(catalogBooks.id, bookId));
}
async function resolveOrCreatePublisherByName(rawName) {
  const trimmed = rawName.trim();
  if (!trimmed) return null;
  const { normalizePublisherName: normalizePublisherName2 } = await Promise.resolve().then(() => (init_publisherNormalizer(), publisherNormalizer_exports));
  const normalized = normalizePublisherName2(trimmed);
  const existing = await catalogDb.findPublisherByNormalizedName(normalized.normalizedName);
  if (existing) return existing.id;
  const created = await catalogDb.createPublisher({ name: normalized.canonicalName, slug: normalized.slug, normalizedName: normalized.normalizedName });
  return created.id;
}

// server/resourceCatalog/normalizers/bookTypeNormalizer.ts
init_turkishText();
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

// server/resourceCatalog/pipeline/normalize.ts
init_publisherNormalizer();
init_turkishText();
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

// server/routers/resourceCatalogAdmin.ts
var bookTypeEnum = z5.enum(["question_bank", "topic_explanation", "topic_explanation_question_bank", "mock_exam", "fasikul", "past_questions", "camp", "test_book", "reference", "other"]);
var examScopeEnum = z5.enum(["TYT", "AYT", "TYT_AYT", "YKS", "GENEL"]);
var catalogBookInput = z5.object({
  name: z5.string().trim().min(1).max(300),
  publisherName: z5.string().trim().max(120).optional(),
  isbn: z5.string().trim().max(32).optional(),
  editionYear: z5.number().int().min(1990).max(2100).optional(),
  description: z5.string().trim().max(2e3).optional(),
  imageUrl: z5.string().trim().max(500).optional(),
  bookType: bookTypeEnum,
  examScope: examScopeEnum,
  subject: z5.string().trim().max(80).optional()
});
var resourceCatalogAdminRouter = router({
  needsReview: adminProcedure.query(() => listNeedsReviewBooks()),
  syncLogs: adminProcedure.input(z5.object({ limit: z5.number().int().min(1).max(100).default(20) }).optional()).query(({ input }) => listResourceCatalogSyncLogs(input?.limit ?? 20)),
  approve: adminProcedure.input(z5.object({ bookId: z5.number().int() })).mutation(({ input }) => approveCatalogBookClassification(input.bookId)),
  setDifficulty: adminProcedure.input(z5.object({ bookId: z5.number().int(), label: z5.enum(["easy", "medium", "hard"]), score: z5.number().int().min(0).max(100) })).mutation(({ input }) => setManualDifficulty(input.bookId, { label: input.label, score: input.score })),
  markNeedsReview: adminProcedure.input(z5.object({ bookId: z5.number().int(), needsReview: z5.boolean() })).mutation(({ input }) => markCatalogBookNeedsReview(input.bookId, input.needsReview)),
  list: adminProcedure.input(z5.object({ page: z5.number().int().min(1).default(1), pageSize: z5.number().int().min(1).max(100).default(30), search: z5.string().max(120).optional(), subject: z5.string().max(80).optional(), active: z5.boolean().optional() })).query(async ({ input }) => {
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
        metadata: { source: "admin_manual" }
      });
    } catch (error) {
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
          metadata: { source: "admin_manual" }
        });
      } catch {
        throw new TRPCError4({ code: "CONFLICT", message: "Bu isim ve yay\u0131nevi ile bir kaynak zaten kay\u0131tl\u0131 olabilir. Farkl\u0131 bir isim dener misin?" });
      }
    }
  }),
  update: adminProcedure.input(
    z5.object({
      bookId: z5.number().int(),
      name: z5.string().trim().min(1).max(300).optional(),
      publisherName: z5.string().trim().max(120).optional(),
      isbn: z5.string().trim().max(32).optional(),
      editionYear: z5.number().int().min(1990).max(2100).optional(),
      description: z5.string().trim().max(2e3).optional(),
      imageUrl: z5.string().trim().max(500).optional(),
      bookType: bookTypeEnum.optional(),
      examScope: examScopeEnum.optional(),
      subject: z5.string().trim().max(80).optional()
    })
  ).mutation(async ({ input }) => {
    const { bookId, publisherName, ...rest } = input;
    const publisherId = publisherName !== void 0 ? await resolveOrCreatePublisherByName(publisherName) : void 0;
    return catalogDb.updateCatalogBook(bookId, {
      ...rest,
      ...publisherId !== void 0 ? { publisherId } : {}
    });
  }),
  setActive: adminProcedure.input(z5.object({ bookId: z5.number().int(), active: z5.boolean() })).mutation(({ input }) => setCatalogBookActive(input.bookId, input.active))
});

// server/routers/resourceCatalog.ts
var bookTypeEnum2 = z6.enum(["question_bank", "topic_explanation", "topic_explanation_question_bank", "mock_exam", "fasikul", "past_questions", "camp", "test_book", "reference", "other"]);
var examScopeEnum2 = z6.enum(["TYT", "AYT", "TYT_AYT", "YKS", "GENEL"]);
var difficultyEnum = z6.enum(["easy", "medium", "hard"]);
var listInput = z6.object({
  page: z6.number().int().min(1).default(1),
  pageSize: z6.number().int().min(1).max(60).default(24),
  exam: examScopeEnum2.optional(),
  subject: z6.string().max(80).optional(),
  publisherId: z6.number().int().optional(),
  bookType: bookTypeEnum2.optional(),
  difficulty: difficultyEnum.optional(),
  minPrice: z6.number().min(0).optional(),
  maxPrice: z6.number().min(0).optional(),
  search: z6.string().max(120).optional(),
  topic: z6.string().max(180).optional()
});
var resourceCatalogRouter = router({
  list: publicProcedure.input(listInput).query(async ({ input }) => {
    const { page, pageSize, ...filters } = input;
    const { items, total } = await listCatalogBooks(filters, { page, pageSize });
    return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }),
  get: publicProcedure.input(z6.object({ slug: z6.string().min(1).max(320) })).query(async ({ input }) => {
    const book = await getCatalogBookBySlug(input.slug);
    if (!book) throw new TRPCError5({ code: "NOT_FOUND", message: "Kaynak bulunamad\u0131" });
    return book;
  }),
  publishers: publicProcedure.query(() => listPublishersForFilter()),
  /** "Seviyene Uygun Kaynaklar" — deterministic, explainable per-topic
   * recommendations built from the student's own topic progress (spec §21/§34). */
  recommendations: protectedProcedure.input(z6.object({ subject: z6.string().max(80).optional(), limit: z6.number().int().min(1).max(30).default(12) })).query(async ({ ctx, input }) => {
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
import { TRPCError as TRPCError6 } from "@trpc/server";
import { z as z7 } from "zod";

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
var enumOrBlank = (values) => z7.union([z7.enum(values), z7.literal("")]);
var draftSchema = z7.object({
  preferredName: z7.string().trim().max(120).optional(),
  gradeLevel: enumOrBlank(GRADE_LEVELS).optional(),
  examYear: z7.string().max(4).optional(),
  targetScoreType: enumOrBlank(TARGET_SCORE_TYPES).optional(),
  currentTytNet: z7.string().trim().max(40).optional(),
  currentAytNet: z7.string().trim().max(40).optional(),
  mockExamFrequency: enumOrBlank(MOCK_EXAM_FREQUENCIES).optional(),
  strongSubjects: z7.array(z7.string().max(40)).max(15).optional(),
  weakSubjects: z7.array(z7.string().max(40)).max(15).optional(),
  hasPriorStudyPlan: enumOrBlank(["yes", "no"]).optional(),
  targetUniversity: z7.string().trim().max(180).optional(),
  targetDepartment: z7.string().trim().max(180).optional(),
  targetRanking: z7.string().trim().max(60).optional(),
  mainGoal: z7.string().trim().max(500).optional(),
  shortTermGoal: z7.string().trim().max(500).optional(),
  longTermGoal: z7.string().trim().max(500).optional(),
  dailyStudyDuration: z7.string().max(6).optional(),
  preferredStudyStartTime: z7.string().max(5).optional(),
  availableStudyDays: z7.array(z7.enum(STUDY_DAYS)).max(7).optional(),
  preferredStudyTimes: z7.array(z7.enum(STUDY_TIMES)).max(4).optional(),
  preferredStudyMethods: z7.array(z7.enum(STUDY_METHODS)).max(5).optional(),
  studyObstacles: z7.string().trim().max(500).optional(),
  coachingExpectations: z7.array(z7.enum(COACHING_EXPECTATIONS)).max(7).optional(),
  notificationPreference: enumOrBlank(NOTIFICATION_PREFERENCES).optional(),
  coachingStyle: enumOrBlank(COACHING_STYLES).optional(),
  additionalNotes: z7.string().trim().max(1e3).optional()
});
var saveStepInput = z7.object({
  step: z7.number().int().min(0).max(TOTAL_ONBOARDING_STEPS - 1),
  data: draftSchema,
  complete: z7.boolean().optional()
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
      throw new TRPCError6({ code: "BAD_REQUEST", message: Object.values(errors)[0] });
    }
    await upsertStudentProfileStep(ctx.user.id, input.step, draftToPatch(input.data));
    if (input.complete) await completeOnboarding(ctx.user.id);
    return getStudentProfile(ctx.user.id);
  }),
  complete: protectedProcedure.mutation(({ ctx }) => completeOnboarding(ctx.user.id))
});

// server/routers/subscription.ts
import { z as z8 } from "zod";
var subscriptionRouter = router({
  getPlans: publicProcedure.query(() => listActivePlans()),
  // Client'ın useEntitlement() hook'unun okuduğu tek snapshot (spec §8).
  getCurrent: protectedProcedure.query(({ ctx }) => getEntitlements(ctx.user.id)),
  getEntitlements: protectedProcedure.query(({ ctx }) => getEntitlements(ctx.user.id)),
  cancel: protectedProcedure.input(z8.object({ immediate: z8.boolean().optional() })).mutation(async ({ ctx, input }) => {
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
  restore: protectedProcedure.input(z8.object({ providerToken: z8.string().min(1) })).mutation(async ({ ctx, input }) => {
    const provider = paymentProviderFactory();
    const result = await provider.restorePurchase({ userId: ctx.user.id, providerToken: input.providerToken });
    if (!result.valid) throw new Error(result.reason ?? "Sat\u0131n alma do\u011Frulanamad\u0131");
    await writeAuditLog({ userId: ctx.user.id, action: "purchase_restored", newState: { providerSubscriptionId: result.providerSubscriptionId } });
    return getEntitlements(ctx.user.id);
  })
});

// server/routers/payment.ts
import { z as z9 } from "zod";
var paymentRouter = router({
  createCheckout: protectedProcedure.input(z9.object({ planCode: z9.string().min(1), successUrl: z9.string().url(), cancelUrl: z9.string().url() })).mutation(async ({ ctx, input }) => {
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
  completeMockCheckout: protectedProcedure.input(z9.object({ planCode: z9.string().min(1) })).mutation(async ({ ctx, input }) => {
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
import { and as and10, count, eq as eq12, gte as gte7, isNotNull as isNotNull2, lt as lt5, sql as sql6 } from "drizzle-orm";
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
    db.select({ tier: subscriptionPlans.tier, billingPeriod: subscriptionPlans.billingPeriod, status: subscriptions.status, total: count() }).from(subscriptions).innerJoin(subscriptionPlans, eq12(subscriptionPlans.id, subscriptions.planId)).groupBy(subscriptionPlans.tier, subscriptionPlans.billingPeriod, subscriptions.status),
    db.select({ total: count() }).from(users).where(gte7(users.lastSignedIn, todayStart)),
    db.select({ total: count() }).from(users).where(gte7(users.lastSignedIn, weekAgo)),
    db.select({ total: count() }).from(users).where(lt5(users.lastSignedIn, weekAgo)),
    db.select({ total: count() }).from(users).where(lt5(users.lastSignedIn, monthAgo)),
    db.select({ total: count() }).from(users),
    db.select({ total: count() }).from(subscriptions).where(isNotNull2(subscriptions.trialStartedAt)),
    db.select({ total: count() }).from(subscriptions).where(eq12(subscriptions.status, "trialing")),
    db.select({ total: count() }).from(subscriptions).where(and10(isNotNull2(subscriptions.trialStartedAt), sql6`${subscriptions.status} in ('active','past_due','grace_period')`))
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
import { z as z10 } from "zod";
var adminAuditRouter = router({
  list: adminProcedure.input(z10.object({ userId: z10.number().int().optional(), limit: z10.number().int().min(1).max(500).default(100) })).query(({ input }) => input.userId ? listAuditLogsForUser(input.userId) : listAllAuditLogs(input.limit))
});

// server/routers/admin/payments.ts
import { z as z11 } from "zod";
var maskId = (value) => !value ? value : value.length <= 8 ? `${value.slice(0, 2)}\u2022\u2022\u2022\u2022` : `${value.slice(0, 4)}\u2022\u2022\u2022\u2022${value.slice(-4)}`;
var adminPaymentsRouter = router({
  // Kart numarası/CVV gibi bir alan şemada zaten hiç yok (spec §27/§37 — "ASLA saklanmamalı"); providerPaymentId yine de maskelenir.
  list: adminProcedure.input(z11.object({ limit: z11.number().int().min(1).max(500).default(100) })).query(async ({ input }) => {
    const rows = await listAllPaymentsForAdmin(input.limit);
    return rows.map((row) => ({ ...row, providerPaymentId: maskId(row.providerPaymentId) }));
  })
});

// server/routers/admin/subscriptions.ts
import { z as z12 } from "zod";
var adminSubscriptionsRouter = router({
  list: adminProcedure.query(() => listAllSubscriptionsForAdmin()),
  get: adminProcedure.input(z12.object({ userId: z12.number().int() })).query(async ({ input }) => {
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
  grant: adminProcedure.input(z12.object({ userId: z12.number().int(), planCode: z12.string().min(1), days: z12.number().int().min(1).max(3650), reason: z12.string().max(500).optional() })).mutation(async ({ ctx, input }) => {
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
  revoke: adminProcedure.input(z12.object({ userId: z12.number().int(), reason: z12.string().max(500).optional() })).mutation(async ({ ctx, input }) => {
    const existing = await getSubscriptionByUserId(input.userId);
    if (!existing) throw new Error("Abonelik bulunamad\u0131");
    const freePlan = await getPlanByCode("FREE");
    if (!freePlan) throw new Error("FREE plan\u0131 bulunamad\u0131");
    assertValidSubscriptionTransition(existing.status, "canceled");
    await updateSubscription(input.userId, { planId: freePlan.id, status: "canceled", cancelAtPeriodEnd: 0, canceledAt: /* @__PURE__ */ new Date(), isManualOverride: 0 });
    await writeAuditLog({ userId: input.userId, adminId: ctx.user.id, action: "manual_revoke", oldState: { status: existing.status }, newState: { status: "canceled", planCode: "FREE" }, reason: input.reason });
    return getSubscriptionByUserId(input.userId);
  }),
  cancel: adminProcedure.input(z12.object({ userId: z12.number().int(), reason: z12.string().max(500).optional() })).mutation(async ({ ctx, input }) => {
    const existing = await getSubscriptionByUserId(input.userId);
    if (!existing) throw new Error("Abonelik bulunamad\u0131");
    assertValidSubscriptionTransition(existing.status, "canceled");
    await updateSubscription(input.userId, { status: "canceled", canceledAt: /* @__PURE__ */ new Date(), cancelAtPeriodEnd: 0 });
    await writeAuditLog({ userId: input.userId, adminId: ctx.user.id, action: "admin_canceled", oldState: { status: existing.status }, newState: { status: "canceled" }, reason: input.reason });
    return getSubscriptionByUserId(input.userId);
  }),
  resume: adminProcedure.input(z12.object({ userId: z12.number().int() })).mutation(async ({ ctx, input }) => {
    const existing = await getSubscriptionByUserId(input.userId);
    if (!existing) throw new Error("Abonelik bulunamad\u0131");
    assertValidSubscriptionTransition(existing.status, "active");
    await updateSubscription(input.userId, { status: "active", cancelAtPeriodEnd: 0, canceledAt: null });
    await writeAuditLog({ userId: input.userId, adminId: ctx.user.id, action: "admin_resumed", oldState: { status: existing.status }, newState: { status: "active" } });
    return getSubscriptionByUserId(input.userId);
  })
});

// server/routers/admin/system.ts
var redact = (text2) => text2.replace(/\b(sk-[A-Za-z0-9_*.\-]{4,}|AIza[0-9A-Za-z_\-]{10,}|Bearer\s+\S+)/g, "[redacted]");
async function check(run) {
  const started = Date.now();
  try {
    await run();
    return { ok: true, ms: Date.now() - started, status: null, error: null };
  } catch (error) {
    return { ok: false, ms: Date.now() - started, status: error instanceof LlmUnavailableError ? error.status ?? null : null, error: redact(error instanceof Error ? error.message : String(error)).slice(0, 400) };
  }
}
function configHints(baseUrl, model) {
  const hints = [];
  if (/\/chat\/completions\/?$/.test(baseUrl)) hints.push("LLM_API_URL '/chat/completions' ile bitmemeli; yaln\u0131zca k\xF6k adres (\xF6r. https://api.openai.com/v1).");
  if (!/^https:\/\//.test(baseUrl)) hints.push("LLM_API_URL https:// ile ba\u015Flamal\u0131.");
  if (baseUrl.includes("generativelanguage.googleapis.com")) {
    if (!baseUrl.endsWith("/v1beta/openai")) hints.push("Gemini i\xE7in LLM_API_URL tam olarak https://generativelanguage.googleapis.com/v1beta/openai olmal\u0131.");
    if (!model.startsWith("gemini")) hints.push(`Gemini adresiyle '${model}' modeli kullan\u0131lamaz; LLM_MODEL \xF6rn. gemini-2.5-flash olmal\u0131.`);
  }
  if (baseUrl.includes("api.openai.com") && model.startsWith("gemini")) hints.push("OpenAI adresiyle Gemini modeli kullan\u0131lamaz; LLM_MODEL \xF6rn. gpt-4o-mini olmal\u0131.");
  if (/\s/.test(model)) hints.push("LLM_MODEL de\u011Ferinde bo\u015Fluk var.");
  return hints;
}
var adminSystemRouter = router({
  llmHealth: adminProcedure.mutation(async () => {
    const target = resolveLlmTarget();
    const config = {
      configured: Boolean(target),
      keyLength: ENV.llmApiKey ? ENV.llmApiKey.trim().length : 0,
      keyHasWhitespace: ENV.llmApiKey !== ENV.llmApiKey.trim() || /\s/.test(ENV.llmApiKey.trim()),
      baseUrl: target?.baseUrl ?? null,
      model: target?.model ?? null,
      usingDefaultUrl: !ENV.llmApiUrl,
      usingDefaultModel: !ENV.llmModel,
      // Vercel'deki ham değerler (anahtar değil) — otomatik düzeltme yapıldıysa farkı görmek için.
      rawUrl: ENV.llmApiUrl || null,
      rawModel: ENV.llmModel || null,
      transcribeModel: ENV.transcribeModel || "whisper-1"
    };
    if (!target) return { config, hints: ["LLM_API_KEY (ya da OPENAI_API_KEY) tan\u0131ml\u0131 de\u011Fil ya da bu deploy'a ula\u015Fmad\u0131 \u2014 Vercel'de ekledikten sonra Redeploy gerekir."], checks: null };
    const hints = configHints(target.baseUrl, target.model);
    if (config.keyHasWhitespace) hints.push("LLM_API_KEY de\u011Ferinde bo\u015Fluk/sat\u0131r sonu var; Vercel'de yeniden, bo\u015Fluksuz yap\u0131\u015Ft\u0131r.");
    const text2 = await check(() => invokeLLM({ messages: [{ role: "user", content: "Yaln\u0131zca OK yaz." }], max_tokens: 5 }));
    const json = await check(() => invokeLLM({
      messages: [{ role: "user", content: '{"sonuc": "tamam", "sayi": null} d\xF6nd\xFCr.' }],
      response_format: { type: "json_schema", json_schema: { name: "health", strict: true, schema: { type: "object", properties: { sonuc: { type: "string" }, sayi: { type: ["integer", "null"] } }, required: ["sonuc", "sayi"], additionalProperties: false } } }
    }));
    const image = encodeGrayToJpegDataUrl(createGray(64, 64, 230), 80);
    const vision = await check(() => invokeLLM({ messages: [{ role: "user", content: [{ type: "text", text: "Bu g\xF6rselin rengi ne? Tek kelime." }, { type: "image_url", image_url: { url: image, detail: "low" } }] }], max_tokens: 10 }));
    return { config, hints, checks: { text: text2, json, vision } };
  })
});

// server/routers/admin/usage.ts
import { z as z13 } from "zod";
var adminUsageRouter = router({
  get: adminProcedure.input(z13.object({ userId: z13.number().int() })).query(({ input }) => getUsageSummaryForUser(input.userId)),
  reset: adminProcedure.input(z13.object({ userId: z13.number().int(), featureKey: z13.enum(FEATURE_KEYS) })).mutation(({ ctx, input }) => {
    const limit = FEATURE_USAGE_LIMITS[input.featureKey] ?? FREE_TIER_LIMITS[input.featureKey];
    const windowDays = limit?.windowDays ?? 30;
    return resetFeatureUsage(input.userId, input.featureKey, windowDays, ctx.user.id);
  })
});

// server/routers/admin/users.ts
import { z as z14 } from "zod";

// server/admin/adminUserDb.ts
import { and as and12, count as count2, desc as desc5, eq as eq14, gte as gte9, inArray as inArray6, isNull as isNull5, like as like3, lt as lt6, or as or2, sql as sql7 } from "drizzle-orm";

// server/admin/progressService.ts
import { and as and11, eq as eq13, gte as gte8 } from "drizzle-orm";

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
  const [userRow] = await db.select({ createdAt: users.createdAt }).from(users).where(eq13(users.id, userId)).limit(1);
  const accountAgeDays = userRow ? Math.max(0, Math.floor((Date.now() - userRow.createdAt.getTime()) / 864e5)) : 0;
  const windowStart = new Date(Date.now() - CONSISTENCY_WINDOW_DAYS * 864e5);
  const [recentLogs, allLogs, topicRows, examRows] = await Promise.all([
    db.select({ studyDate: topicStudyLogs.studyDate }).from(topicStudyLogs).where(and11(eq13(topicStudyLogs.userId, userId), gte8(topicStudyLogs.studyDate, windowStart))),
    db.select({ questions: topicStudyLogs.questions, correct: topicStudyLogs.correct }).from(topicStudyLogs).where(eq13(topicStudyLogs.userId, userId)),
    db.select({ progress: topicProgress.progress }).from(topicProgress).where(eq13(topicProgress.userId, userId)),
    db.select({ net: userMockExams.net }).from(userMockExams).where(eq13(userMockExams.userId, userId))
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
    const digits = filters.search.replace(/\D/g, "").replace(/^0/, "");
    conditions.push(or2(like3(users.name, term), like3(users.email, term), ...digits.length >= 4 ? [like3(users.openId, `dev_phone_%${digits}%`)] : []));
  }
  if (filters.approvalStatus) conditions.push(eq14(users.approvalStatus, filters.approvalStatus));
  if (filters.accountStatus) conditions.push(eq14(users.accountStatus, filters.accountStatus));
  if (filters.planCode) conditions.push(eq14(subscriptionPlans.code, filters.planCode));
  if (filters.subscriptionStatus) conditions.push(eq14(subscriptions.status, filters.subscriptionStatus));
  if (filters.activity === "today") conditions.push(gte9(users.lastSignedIn, startOfToday()));
  else if (filters.activity === "week") conditions.push(gte9(users.lastSignedIn, daysAgo(7)));
  else if (filters.activity === "inactive") conditions.push(lt6(users.lastSignedIn, daysAgo(7)));
  const whereClause = conditions.length ? and12(...conditions) : void 0;
  const countQuery = db.select({ total: count2() }).from(users).leftJoin(subscriptions, eq14(subscriptions.userId, users.id)).leftJoin(subscriptionPlans, eq14(subscriptionPlans.id, subscriptions.planId));
  const [{ total }] = await (whereClause ? countQuery.where(whereClause) : countQuery);
  const pageQuery = db.select({
    id: users.id,
    openId: users.openId,
    name: users.name,
    email: users.email,
    role: users.role,
    approvalStatus: users.approvalStatus,
    accountStatus: users.accountStatus,
    loginMethod: users.loginMethod,
    emailVerifiedAt: users.emailVerifiedAt,
    createdAt: users.createdAt,
    lastSignedIn: users.lastSignedIn,
    planCode: subscriptionPlans.code,
    planName: subscriptionPlans.name,
    subscriptionStatus: subscriptions.status,
    trialEndsAt: subscriptions.trialEndsAt,
    currentPeriodEnd: subscriptions.currentPeriodEnd
  }).from(users).leftJoin(subscriptions, eq14(subscriptions.userId, users.id)).leftJoin(subscriptionPlans, eq14(subscriptionPlans.id, subscriptions.planId)).orderBy(desc5(users.createdAt)).limit(pageSize).offset((page - 1) * pageSize);
  const pageRows = await (whereClause ? pageQuery.where(whereClause) : pageQuery);
  const ids = pageRows.map((row) => row.id);
  const [topicAgg, examAgg, studyAgg] = ids.length ? await Promise.all([
    db.select({ userId: topicProgress.userId, avgProgress: sql7`avg(${topicProgress.progress})`, topicCount: sql7`count(*)` }).from(topicProgress).where(inArray6(topicProgress.userId, ids)).groupBy(topicProgress.userId),
    db.select({ userId: userMockExams.userId, examCount: sql7`count(*)`, latestNet: sql7`max(${userMockExams.net})` }).from(userMockExams).where(inArray6(userMockExams.userId, ids)).groupBy(userMockExams.userId),
    db.select({ userId: topicStudyLogs.userId, totalMinutes: sql7`sum(${topicStudyLogs.minutes})` }).from(topicStudyLogs).where(inArray6(topicStudyLogs.userId, ids)).groupBy(topicStudyLogs.userId)
  ]) : [[], [], []];
  const topicMap = new Map(topicAgg.map((row) => [row.userId, row]));
  const examMap = new Map(examAgg.map((row) => [row.userId, row]));
  const studyMap = new Map(studyAgg.map((row) => [row.userId, row]));
  const rows = pageRows.map((row) => {
    const topic = topicMap.get(row.id);
    const exam = examMap.get(row.id);
    const study = studyMap.get(row.id);
    const { openId, ...rest } = row;
    return {
      ...rest,
      phone: phoneFromOpenId(openId),
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
  await db.update(users).set({ accountStatus: "suspended" }).where(eq14(users.id, userId));
  await writeAuditLog({ userId, adminId, action: "user_suspended", newState: { accountStatus: "suspended" }, reason });
}
async function reactivateUser(userId, adminId) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ accountStatus: "active" }).where(eq14(users.id, userId));
  await writeAuditLog({ userId, adminId, action: "user_reactivated", newState: { accountStatus: "active" } });
}
async function verifyUserEmailManually(userId, adminId) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ emailVerifiedAt: /* @__PURE__ */ new Date() }).where(and12(eq14(users.id, userId), isNull5(users.emailVerifiedAt)));
  await writeAuditLog({ userId, adminId, action: "email_verified_by_admin", newState: { emailVerified: true } });
}
function maskId2(value) {
  if (!value) return value;
  if (value.length <= 8) return `${value.slice(0, 2)}\u2022\u2022\u2022\u2022`;
  return `${value.slice(0, 4)}\u2022\u2022\u2022\u2022${value.slice(-4)}`;
}
async function getUserDetailForAdmin(userId) {
  const db = await getDb();
  if (!db) return null;
  const [userRow] = await db.select().from(users).where(eq14(users.id, userId)).limit(1);
  if (!userRow) return null;
  const [entitlements, usage, progressScore, payments2, recentExams, topicRows, recentStudyLogs, auditLogs, profile, bookContentRows, notebook] = await Promise.all([
    getEntitlements(userId),
    getUsageSummaryForUser(userId),
    getStudyProgressScore(userId),
    listPaymentsForUser(userId),
    db.select().from(userMockExams).where(eq14(userMockExams.userId, userId)).orderBy(desc5(userMockExams.examDate)).limit(10),
    db.select().from(topicProgress).where(eq14(topicProgress.userId, userId)),
    db.select().from(topicStudyLogs).where(eq14(topicStudyLogs.userId, userId)).orderBy(desc5(topicStudyLogs.studyDate)).limit(20),
    listAuditLogsForUser(userId),
    getStudentProfile(userId),
    db.select({ bookId: userBookContents.bookId, mappingStatus: userBookContents.mappingStatus, mappingMethod: userBookContents.mappingMethod, mappingConfidence: userBookContents.mappingConfidence, source: userBookContents.source, createdAt: userBookContents.createdAt }).from(userBookContents).where(eq14(userBookContents.userId, userId)),
    // Defter: yalnızca sayılar — öğrencinin not içeriği admin tarafından görülmez.
    getNoteStatsForAdmin(userId)
  ]);
  const bookContents = Array.from(bookContentRows.reduce((map, row) => {
    const item = map.get(row.bookId) ?? { bookId: row.bookId, source: row.source, entries: 0, confirmed: 0, unmatched: 0, lowConfidence: 0, manual: 0, scannedAt: row.createdAt };
    item.entries += 1;
    if (row.mappingStatus === "confirmed") item.confirmed += 1;
    if (row.mappingStatus === "unmatched") item.unmatched += 1;
    if (row.mappingMethod === "manual") item.manual += 1;
    else if (row.mappingStatus === "confirmed" && Number(row.mappingConfidence) < 0.9) item.lowConfidence += 1;
    map.set(row.bookId, item);
    return map;
  }, /* @__PURE__ */ new Map()).values());
  const bookIds = bookContents.map((book) => book.bookId);
  const numericIds = bookIds.filter((id) => /^\d+$/.test(id)).map(Number);
  const [customTitles, catalogTitles] = bookIds.length ? await Promise.all([
    db.select({ bookId: userResourceBooks.bookId, title: userResourceBooks.title }).from(userResourceBooks).where(and12(eq14(userResourceBooks.userId, userId), inArray6(userResourceBooks.bookId, bookIds))),
    numericIds.length ? db.select({ id: catalogBooks.id, name: catalogBooks.name }).from(catalogBooks).where(inArray6(catalogBooks.id, numericIds)) : Promise.resolve([])
  ]) : [[], []];
  const titleById = new Map([...customTitles.map((row) => [row.bookId, row.title]), ...catalogTitles.map((row) => [String(row.id), row.name])]);
  const bookContentsWithTitles = bookContents.map((book) => ({ ...book, title: titleById.get(book.bookId) ?? null }));
  const [subscriptionRow] = await db.select().from(subscriptions).where(eq14(subscriptions.userId, userId)).limit(1);
  const plan = subscriptionRow ? await getPlanById(subscriptionRow.planId) : null;
  const { passwordHash: _passwordHash, ...safeUser } = userRow;
  return {
    user: { ...safeUser, phone: phoneFromOpenId(safeUser.openId) },
    profile,
    bookContents: bookContentsWithTitles,
    notebook,
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
    z14.object({
      search: z14.string().max(120).optional(),
      approvalStatus: z14.enum(["pending", "approved", "rejected"]).optional(),
      accountStatus: z14.enum(["active", "suspended", "deleted"]).optional(),
      planCode: z14.string().max(40).optional(),
      subscriptionStatus: z14.string().max(40).optional(),
      activity: z14.enum(["today", "week", "inactive"]).optional(),
      page: z14.number().int().min(1).default(1),
      pageSize: z14.number().int().min(1).max(100).default(20)
    })
  ).query(({ input }) => listUsersForAdminPaginated(input)),
  get: adminProcedure.input(z14.object({ userId: z14.number().int() })).query(({ input }) => getUserDetailForAdmin(input.userId)),
  listPending: adminProcedure.query(() => listPendingUsers()),
  approve: adminProcedure.input(z14.object({ userId: z14.number().int() })).mutation(({ ctx, input }) => approveUser(input.userId, ctx.user.id)),
  reject: adminProcedure.input(z14.object({ userId: z14.number().int(), reason: z14.string().max(300).optional() })).mutation(({ ctx, input }) => rejectUser(input.userId, ctx.user.id, input.reason)),
  // Hesap yaşam döngüsü — subscription iptaliyle KARIŞTIRILMAZ (spec §5/§23): bir kullanıcı aboneliğini iptal edince hesabı askıya alınmaz.
  suspend: adminProcedure.input(z14.object({ userId: z14.number().int(), reason: z14.string().max(300).optional() })).mutation(({ ctx, input }) => suspendUser(input.userId, ctx.user.id, input.reason)),
  reactivate: adminProcedure.input(z14.object({ userId: z14.number().int() })).mutation(({ ctx, input }) => reactivateUser(input.userId, ctx.user.id)),
  verifyEmail: adminProcedure.input(z14.object({ userId: z14.number().int() })).mutation(({ ctx, input }) => verifyUserEmailManually(input.userId, ctx.user.id))
});

// server/routers/admin/index.ts
var adminRouter = router({
  users: adminUsersRouter,
  subscriptions: adminSubscriptionsRouter,
  usage: adminUsageRouter,
  analytics: adminAnalyticsRouter,
  audit: adminAuditRouter,
  payments: adminPaymentsRouter,
  system: adminSystemRouter
});

// server/routers.ts
var planInput = z15.object({
  topics: z15.array(z15.object({
    topic: z15.string(),
    subject: z15.string(),
    exam: z15.enum(["TYT", "AYT"]),
    progress: z15.number(),
    status: z15.enum(["Zay\u0131f", "Orta", "\u0130yi"])
  })).max(50),
  exams: z15.array(z15.object({
    title: z15.string(),
    date: z15.string(),
    net: z15.number(),
    subjects: z15.record(z15.string(), z15.number()),
    topicDetails: z15.array(z15.object({
      subject: z15.string(),
      topic: z15.string(),
      questionCount: z15.number(),
      correct: z15.number(),
      wrong: z15.number(),
      blank: z15.number(),
      accuracy: z15.number(),
      net: z15.number()
    })).optional()
  })).max(10),
  books: z15.array(z15.object({
    id: z15.string(),
    title: z15.string(),
    subject: z15.string(),
    exam: z15.enum(["TYT", "AYT"]),
    level: z15.enum(["Kolay", "Orta", "Zor"]),
    pageCount: z15.number().optional(),
    totalQuestions: z15.number().optional(),
    accuracy: z15.number().optional(),
    activeDays: z15.number().optional(),
    mappings: z15.array(z15.object({ topic: z15.string(), pageStart: z15.number().optional(), pageEnd: z15.number().optional(), testStart: z15.number().optional(), testEnd: z15.number().optional() })).max(50).optional()
  })).max(30).default([]),
  availableMinutes: z15.number().min(120).max(2400).default(600),
  goal: z15.string().max(120).default("YKS 2027"),
  // Onboarding'den gelen koçluk bağlamı — tamamen isteğe bağlı, eski
  // istemciler (veya onboarding'i henüz tamamlamamış kullanıcılar) bu alanı
  // hiç göndermeyebilir.
  studentProfile: z15.object({
    // Hedef bilgileri — onboarding'in "Kullanıcı tanımlama" ve "Hedefler"
    // adımlarından. AI planı önceliklendirirken (örn. hedef net/sıralamaya
    // göre tempo) ve dilini kişiselleştirirken kullanır.
    targetScoreType: z15.string().max(20).optional(),
    examYear: z15.number().int().optional(),
    targetUniversity: z15.string().max(180).optional(),
    targetDepartment: z15.string().max(180).optional(),
    targetRanking: z15.string().max(60).optional(),
    dailyStudyDuration: z15.number().int().min(0).max(960).optional(),
    preferredStudyMethods: z15.array(z15.string().max(40)).max(5).optional(),
    studyObstacles: z15.string().max(500).optional(),
    coachingStyle: z15.string().max(40).optional(),
    mainGoal: z15.string().max(500).optional()
  }).optional()
});
var documentExtractionInput = z15.object({
  dataUrl: z15.string().min(20).max(12e6),
  mimeType: z15.enum(["application/pdf", "image/png", "image/jpeg", "image/webp"]),
  fileName: z15.string().max(180).optional()
});
var bookPhotoInput = z15.object({
  dataUrl: z15.string().min(20).max(12e6),
  mimeType: z15.enum(["image/png", "image/jpeg", "image/webp"])
});
var bookPhotoSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    publisher: { type: "string" },
    subject: { type: "string" },
    exam: { type: "string", enum: ["TYT", "AYT", "GENEL"] },
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
      additionalProperties: false
    }
  },
  required: ["title", "publisher", "subject", "exam", "authors", "isbn", "edition", "confident", "imageKind", "fieldConfidence"],
  additionalProperties: false
};
var clamp013 = (value) => typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
var userExamInput = z15.object({
  title: z15.string().min(1).max(180),
  exam: z15.enum(["TYT", "AYT"]),
  date: z15.string().min(8).max(30),
  net: z15.number().min(-100).max(200),
  delta: z15.number().min(-200).max(200),
  subjects: z15.record(z15.string(), z15.number().min(-50).max(100)),
  timeSpent: z15.record(z15.string(), z15.number().int().min(0).max(1e3)),
  topicNets: z15.record(z15.string(), z15.number().min(-50).max(100)),
  topicDetails: z15.array(z15.object({ subject: z15.string(), topic: z15.string(), questionCount: z15.number().int().min(0), correct: z15.number().int().min(0), wrong: z15.number().int().min(0), blank: z15.number().int().min(0), accuracy: z15.number().min(0).max(100), net: z15.number().min(-50).max(100) })).max(300),
  importedFrom: z15.enum(["manual", "ocr", "pdf", "csv", "xlsx"]),
  notes: z15.string().max(5e3).optional()
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
    // server/_core/localAuth.ts) must never reach the client — strip it here
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
    }),
    // Profil menüsündeki "Şifre değiştir". Tahmin denemelerine karşı kullanıcı
    // başına 15 dakikada 5 deneme.
    changePassword: protectedProcedure.input(z15.object({ currentPassword: z15.string().min(1).max(200), newPassword: z15.string().min(1).max(200) })).mutation(async ({ ctx, input }) => {
      try {
        checkRateLimit(`change-password:${ctx.user.id}`, 5, 15 * 6e4);
      } catch {
        throw new TRPCError7({ code: "TOO_MANY_REQUESTS", message: "\xC7ok fazla deneme yapt\u0131n. 15 dakika sonra tekrar dener misin?" });
      }
      try {
        await changeLocalPassword(ctx.user.id, input.currentPassword, input.newPassword);
        return { success: true };
      } catch (error) {
        if (error instanceof PasswordChangeError) throw new TRPCError7({ code: "BAD_REQUEST", message: error.message });
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
        throw new TRPCError7({ code: "INTERNAL_SERVER_ERROR", message: "Do\u011Frulama maili \u015Fu an g\xF6nderilemedi. Birka\xE7 dakika sonra tekrar dener misin?" });
      }
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
    addBook: protectedProcedure.input(z15.object({ bookId: z15.string().max(120) })).mutation(({ ctx, input }) => addBookToInventory(ctx.user.id, input.bookId)),
    removeBook: protectedProcedure.input(z15.object({ bookId: z15.string().max(120) })).mutation(({ ctx, input }) => removeBookFromInventory(ctx.user.id, input.bookId)),
    addLog: protectedProcedure.input(z15.object({ bookId: z15.string().max(120), topic: z15.string().max(180).optional(), sessionDate: z15.string(), minutes: z15.number().int().min(0).max(1440), questions: z15.number().int().min(0).max(2e3), correct: z15.number().int().min(0).max(2e3), wrong: z15.number().int().min(0).max(2e3), blank: z15.number().int().min(0).max(2e3), pageStart: z15.number().int().min(0).optional(), pageEnd: z15.number().int().min(0).optional(), testStart: z15.number().int().min(0).optional(), testEnd: z15.number().int().min(0).optional() })).mutation(({ ctx, input }) => addBookStudyLog(ctx.user.id, { ...input, sessionDate: new Date(input.sessionDate) })),
    upsertMapping: protectedProcedure.input(z15.object({ bookId: z15.string().max(120), topic: z15.string().max(180), subject: z15.string().max(80), pageStart: z15.number().int().min(0).optional(), pageEnd: z15.number().int().min(0).optional(), testStart: z15.number().int().min(0).optional(), testEnd: z15.number().int().min(0).optional() })).mutation(({ ctx, input }) => upsertBookTopicMapping(ctx.user.id, input)),
    addSwitch: protectedProcedure.input(z15.object({ fromBookId: z15.string().max(120).optional(), toBookId: z15.string().max(120), reason: z15.string().max(300) })).mutation(({ ctx, input }) => addSourceSwitch(ctx.user.id, { ...input, switchedAt: /* @__PURE__ */ new Date() })),
    importBooks: protectedProcedure.input(z15.object({ books: z15.array(z15.object({ id: z15.string().max(120), title: z15.string().min(1).max(180), publisher: z15.string().max(120), subject: z15.string().max(80), exam: z15.enum(["TYT", "AYT"]), level: z15.enum(["Kolay", "Orta", "Zor"]), format: z15.string().max(120), reason: z15.string().max(1e3), sourceUrl: z15.string().max(500).optional(), pageCount: z15.number().int().min(0).optional(), tone: z15.string().max(20), authors: z15.string().max(300).optional(), isbn: z15.string().max(32).optional() })).min(1).max(500) })).mutation(({ ctx, input }) => addUserResourceBooks(ctx.user.id, input.books)),
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
            { role: "system", content: "Sen bir kitap kapa\u011F\u0131 tan\u0131ma asistan\u0131s\u0131n. T\xFCrk\xE7e bir YKS kaynak kitab\u0131n\u0131n kapak foto\u011Fraf\u0131n\u0131 okuyup kitap ad\u0131n\u0131, yay\u0131nevini, dersini (T\xFCrk\xE7e, Matematik, Fizik, Kimya, Biyoloji, Tarih, Co\u011Frafya, Felsefe, Din K\xFClt\xFCr\xFC, Genel) ve s\u0131nav kapsam\u0131n\u0131 (TYT/AYT/GENEL) tahmin et. Kapakta yaz\u0131yorsa yazar adlar\u0131n\u0131 (authors), ISBN numaras\u0131n\u0131 (isbn, yaln\u0131zca kapakta/arkada ger\xE7ekten g\xF6r\xFCn\xFCyorsa) ve bask\u0131 bilgisini (edition, \xF6r. 'G\xFCncellenmi\u015F Yeni Bask\u0131', '2025-2026') da \xE7\u0131kar. G\xF6rselde net okuyamad\u0131\u011F\u0131n bir alan\u0131 bo\u015F string / bo\u015F dizi b\u0131rak, uydurma. fieldConfidence her alan i\xE7in 0-1 aras\u0131 okuma g\xFCvenin; alan bo\u015Fsa 0. Kitap ad\u0131 kapakta birden \xE7ok sat\u0131ra/puntoya b\xF6l\xFCnm\xFC\u015F olabilir (\xF6r. b\xFCy\xFCk 'Paragraf' + alt\u0131nda 'SORU BANKASI'): bunlar\u0131 tek ba\u015Fl\u0131kta, kelimelerin ilk harfi b\xFCy\xFCk birle\u015Ftir ('Paragraf Soru Bankas\u0131'); 'Video \xE7\xF6z\xFCml\xFC', 'Yeni nesil', '20 deneme ilaveli' gibi slogan/\xF6zellik sat\u0131rlar\u0131n\u0131 ba\u015Fl\u0131\u011Fa katma. Ders kapakta a\xE7\u0131k\xE7a yazm\u0131yorsa kitap ad\u0131ndan \xE7\u0131kar (Paragraf, Dil Bilgisi, S\xF6zc\xFCkte Anlam \u2192 T\xFCrk\xE7e; Problemler, Temel Matematik \u2192 Matematik); o durumda subject g\xFCvenini en fazla 0.7 ver. 'TYT-AYT' ya da 'YKS' yaz\u0131yorsa ve tek bir s\u0131nava ait de\u011Filse exam 'GENEL' olsun. Foto\u011Fraf yan (90\xB0) ya da ters \xE7ekilmi\u015F, kapa\u011F\u0131n bir k\u0131sm\u0131 kadraj d\u0131\u015F\u0131nda kalm\u0131\u015F olabilir: yaz\u0131y\u0131 d\xF6nd\xFCrerek oku ve g\xF6r\xFCnen ba\u015Fl\u0131\u011F\u0131 yine \xE7\u0131kar; kapa\u011F\u0131n k\u0131smen g\xF6r\xFCnmesi onu 'other' yapmaz. Yay\u0131nevi \xE7o\u011Fu zaman yaln\u0131zca logo olarak (\xF6r. k\xF6\u015Fedeki '\xDC\xE7D\xF6rtBe\u015F') g\xF6r\xFCn\xFCr; logodaki ad\u0131 yay\u0131nevi olarak yaz. B\xFCy\xFCk dekoratif yaz\u0131lar ve rakamlar da ba\u015Fl\u0131\u011F\u0131n par\xE7as\u0131d\u0131r ('0'DAN BA\u015ELA' + 'START' + 'Matematik' \u2192 '0'dan Ba\u015Fla Start Matematik'); yazar/hoca ad\u0131 ('\u015Eenol Hoca') authors alan\u0131na gider. imageKind: g\xF6rsel bir kitap KAPA\u011EIYSA 'cover'; kitab\u0131n i\xE7indekiler / konu listesi / kitap bitirme plan\u0131 sayfas\u0131ysa 'table_of_contents'; ba\u015Fka bir \u015Feyse 'other'. `confident` alan\u0131n\u0131 yaln\u0131zca kapaktaki yaz\u0131lar\u0131 ger\xE7ekten net okuyabildiysen true yap." },
            { role: "user", content: [{ type: "text", text: "Bu kitap kapa\u011F\u0131n\u0131 oku." }, { type: "image_url", image_url: { url: input.dataUrl, detail: "high" } }] }
          ],
          response_format: { type: "json_schema", json_schema: { name: "yks_book_cover", strict: true, schema: bookPhotoSchema } }
        });
        const raw = response.choices[0]?.message?.content;
        const jsonText = typeof raw === "string" ? raw : raw?.map((part) => part.type === "text" ? part.text : "").join("");
        if (!jsonText) throw new Error("Foto\u011Fraftan yap\u0131land\u0131r\u0131lm\u0131\u015F veri al\u0131namad\u0131");
        const parsed = JSON.parse(jsonText);
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
          imageKind: parsed.imageKind === "table_of_contents" || parsed.imageKind === "other" ? parsed.imageKind : "cover",
          fieldConfidence: { title: clamp013(parsed.fieldConfidence?.title), publisher: clamp013(parsed.fieldConfidence?.publisher), subject: clamp013(parsed.fieldConfidence?.subject), exam: clamp013(parsed.fieldConfidence?.exam), isbn: isbn ? clamp013(parsed.fieldConfidence?.isbn) : 0 }
        };
      } catch (error) {
        console.warn("[Book Photo] Extraction failed:", error);
        throw new Error(llmUnavailableMessage(error) ?? "Foto\u011Fraf okunamad\u0131. Daha net, \u0131\u015F\u0131kl\u0131 bir kapak foto\u011Fraf\u0131 dener misin?");
      }
    })
  }),
  exams: router({
    snapshot: protectedProcedure.query(({ ctx }) => getUserMockExams(ctx.user.id)),
    importMany: protectedProcedure.input(z15.object({ exams: z15.array(userExamInput).min(1).max(200) })).mutation(({ ctx, input }) => addUserMockExams(ctx.user.id, input.exams.map((exam) => ({ ...exam, examDate: new Date(exam.date) }))))
  }),
  calendar: router({
    snapshot: protectedProcedure.query(({ ctx }) => getStudyCalendar(ctx.user.id)),
    savePlan: protectedProcedure.input(z15.object({ title: z15.string().max(180), weekStart: z15.string(), weekEnd: z15.string(), summary: z15.string().max(2e3), source: z15.enum(["ai", "manual"]).optional(), sessions: z15.array(z15.object({ sessionDate: z15.string(), title: z15.string().max(180), subject: z15.string().max(80), topic: z15.string().max(180), kind: z15.string().max(40), plannedMinutes: z15.number().int().min(0).max(1440), targetQuestions: z15.number().int().min(0).optional(), targetPages: z15.string().max(80).nullable().optional(), targetTests: z15.string().max(80).nullable().optional() })).max(100) })).mutation(({ ctx, input }) => saveStudyPlan(ctx.user.id, { ...input, weekStart: new Date(input.weekStart), weekEnd: new Date(input.weekEnd), sessions: input.sessions.map((session) => ({ ...session, sessionDate: new Date(session.sessionDate) })) })),
    completeSession: protectedProcedure.input(z15.object({ sessionId: z15.number().int(), actualMinutes: z15.number().int().min(0).max(1440), actualQuestions: z15.number().int().min(0).max(5e3), correct: z15.number().int().min(0).max(5e3), wrong: z15.number().int().min(0).max(5e3), blank: z15.number().int().min(0).max(5e3), actualPages: z15.number().int().min(0).max(5e3).optional(), note: z15.string().max(1e3).optional() })).mutation(({ ctx, input }) => completeStudySession(ctx.user.id, input)),
    coachSnapshot: protectedProcedure.input(z15.object({ periodStart: z15.string(), periodEnd: z15.string() })).query(async ({ ctx, input }) => {
      const { sessions, averageAccuracy } = await getPlanAdherenceInputs(ctx.user.id, new Date(input.periodStart), new Date(input.periodEnd));
      return { ...calculatePlanAdherence(sessions, averageAccuracy), averageAccuracy, alerts: await getCoachAlerts(ctx.user.id) };
    }),
    refreshCoach: protectedProcedure.input(z15.object({ periodStart: z15.string(), periodEnd: z15.string() })).mutation(({ ctx, input }) => savePlanAdherence(ctx.user.id, new Date(input.periodStart), new Date(input.periodEnd))),
    readCoachAlert: protectedProcedure.input(z15.object({ alertId: z15.number().int() })).mutation(({ ctx, input }) => markCoachAlertRead(ctx.user.id, input.alertId)),
    addFocusLog: protectedProcedure.input(z15.object({ subject: z15.string().max(80), topic: z15.string().max(180), studyDate: z15.string(), minutes: z15.number().int().min(1).max(1440), questions: z15.number().int().min(0).max(5e3), correct: z15.number().int().min(0).max(5e3), wrong: z15.number().int().min(0).max(5e3), blank: z15.number().int().min(0).max(5e3), note: z15.string().max(1e3).optional() })).mutation(({ ctx, input }) => addTopicStudyLog(ctx.user.id, { ...input, studyDate: new Date(input.studyDate), note: input.note ?? null, sessionId: null })),
    // Paragraf pratiği / gece okuması gibi "şimdi yaptım" alışkanlık kayıtları.
    logRoutine: protectedProcedure.input(z15.object({ title: z15.string().max(180), subject: z15.string().max(80), topic: z15.string().max(180), kind: z15.string().max(40), plannedMinutes: z15.number().int().min(0).max(1440), actualMinutes: z15.number().int().min(0).max(1440), actualPages: z15.number().int().min(0).max(5e3).optional(), note: z15.string().max(1e3).optional() })).mutation(({ ctx, input }) => logCompletedRoutineSession(ctx.user.id, input))
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
  bookContent: bookContentRouter,
  notes: notesRouter,
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
    user = await authenticateRequest(opts.req);
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
init_turkishText();
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
init_turkishText();
var STOPWORDS2 = /* @__PURE__ */ new Set(["ve", "ile", "soru", "bankasi", "konu", "anlatimi", "anlatimli", "deneme", "kitap", "kitabi", "tyt", "ayt", "fasikul"]);
var examScopeAllows = (examScope, topicExam) => {
  if (examScope === "TYT_AYT" || examScope === "YKS" || examScope === "GENEL") return true;
  return examScope === topicExam;
};
function mapBookToCurriculumTopics(book, topics, options = {}) {
  if (!book.subject) return [];
  const maxMatches = options.maxMatches ?? 3;
  const bookSubjectKey = normalizeForComparison(book.subject);
  const bookNameTokens = new Set(tokenize(book.name).filter((token) => !STOPWORDS2.has(token)));
  const candidates = topics.filter((topic) => normalizeForComparison(topic.subject) === bookSubjectKey && examScopeAllows(book.examScope, topic.exam)).map((topic) => {
    const topicTokens = tokenize(topic.topic).filter((token) => !STOPWORDS2.has(token));
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
init_turkishText();
var normalizeIsbn2 = (isbn) => isbn.replace(/[^0-9Xx]/g, "").toUpperCase();
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
    const candidateIsbn = normalizeIsbn2(candidate.isbn);
    const isbnMatch = existingBooks.find((book) => book.isbn && normalizeIsbn2(book.isbn) === candidateIsbn);
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
  registerLocalAuthRoutes(app2);
  registerEmailVerificationRoutes(app2);
  registerNoteAttachmentRoutes(app2);
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
