import { and, count, desc, eq, gte, inArray, isNull, like, lt, or, sql } from "drizzle-orm";
import { phoneFromOpenId } from "../_core/loginIdentifier";
import { getDb, getStudentProfile } from "../db";
import { getNoteStatsForAdmin } from "../notes/notesDb";
import { catalogBooks, subscriptionPlans, subscriptions, topicProgress, topicStudyLogs, userBookContents, userMockExams, userResourceBooks, users } from "../../drizzle/schema";
import { getEntitlements, getUsageSummaryForUser } from "../subscriptions/entitlementService";
import { getPlanById, listAuditLogsForUser, listPaymentsForUser, writeAuditLog } from "../subscriptions/subscriptionDb";
import { getStudyProgressScore } from "./progressService";

export type AdminUserListFilters = {
  search?: string;
  approvalStatus?: "pending" | "approved" | "rejected";
  accountStatus?: "active" | "suspended" | "deleted";
  planCode?: string;
  subscriptionStatus?: string;
  activity?: "today" | "week" | "inactive";
  page: number;
  pageSize: number;
};

export type AdminUserListRow = {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: "user" | "admin";
  approvalStatus: "pending" | "approved" | "rejected";
  accountStatus: "active" | "suspended" | "deleted";
  loginMethod: string | null;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  lastSignedIn: Date;
  planCode: string;
  planName: string;
  subscriptionStatus: string;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  topicCoveragePercent: number;
  studiedTopicCount: number;
  examCount: number;
  latestExamNet: number | null;
  totalStudyMinutes: number;
};

/**
 * Server-side pagination/filter/search (spec §7/§8/§35 — "10.000 kullanıcı
 * olduğunda tüm kullanıcıları client'a çekme", "N+1 query oluşturma").
 * İki aşamalı: 1) users+subscriptions üzerinde LIMIT/OFFSET'li sayfa
 * sorgusu (küçük, sayfa boyutu kadar satır), 2) yalnızca O SAYFADAKİ
 * kullanıcı id'leri için topic/exam/study toplamları — tüm tablo asla
 * belleğe çekilmez.
 */
export async function listUsersForAdminPaginated(filters: AdminUserListFilters): Promise<{ rows: AdminUserListRow[]; total: number; page: number; pageSize: number }> {
  const db = await getDb();
  const page = Math.max(1, filters.page);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize));
  if (!db) return { rows: [], total: 0, page, pageSize };

  const conditions = [];
  if (filters.search?.trim()) {
    const term = `%${filters.search.trim().replace(/[%_]/g, (char) => `\\${char}`)}%`;
    // Telefon `openId`'de tutulduğu için (bkz. phoneFromOpenId) oradan da aranır; 0555… → 555… gibi baştaki 0 atılır.
    const digits = filters.search.replace(/\D/g, "").replace(/^0/, "");
    conditions.push(or(like(users.name, term), like(users.email, term), ...(digits.length >= 4 ? [like(users.openId, `dev_phone_%${digits}%`)] : [])));
  }
  if (filters.approvalStatus) conditions.push(eq(users.approvalStatus, filters.approvalStatus));
  if (filters.accountStatus) conditions.push(eq(users.accountStatus, filters.accountStatus));
  if (filters.planCode) conditions.push(eq(subscriptionPlans.code, filters.planCode));
  if (filters.subscriptionStatus) conditions.push(eq(subscriptions.status, filters.subscriptionStatus as never));
  if (filters.activity === "today") conditions.push(gte(users.lastSignedIn, startOfToday()));
  else if (filters.activity === "week") conditions.push(gte(users.lastSignedIn, daysAgo(7)));
  else if (filters.activity === "inactive") conditions.push(lt(users.lastSignedIn, daysAgo(7)));

  const whereClause = conditions.length ? and(...conditions) : undefined;

  const countQuery = db.select({ total: count() }).from(users).leftJoin(subscriptions, eq(subscriptions.userId, users.id)).leftJoin(subscriptionPlans, eq(subscriptionPlans.id, subscriptions.planId));
  const [{ total }] = await (whereClause ? countQuery.where(whereClause) : countQuery);

  const pageQuery = db
    .select({
      id: users.id, openId: users.openId, name: users.name, email: users.email, role: users.role, approvalStatus: users.approvalStatus, accountStatus: users.accountStatus, loginMethod: users.loginMethod, emailVerifiedAt: users.emailVerifiedAt, createdAt: users.createdAt, lastSignedIn: users.lastSignedIn,
      planCode: subscriptionPlans.code, planName: subscriptionPlans.name, subscriptionStatus: subscriptions.status, trialEndsAt: subscriptions.trialEndsAt, currentPeriodEnd: subscriptions.currentPeriodEnd,
    })
    .from(users)
    .leftJoin(subscriptions, eq(subscriptions.userId, users.id))
    .leftJoin(subscriptionPlans, eq(subscriptionPlans.id, subscriptions.planId))
    .orderBy(desc(users.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const pageRows = await (whereClause ? pageQuery.where(whereClause) : pageQuery);
  const ids = pageRows.map((row) => row.id);

  const [topicAgg, examAgg, studyAgg] = ids.length
    ? await Promise.all([
        db.select({ userId: topicProgress.userId, avgProgress: sql<string>`avg(${topicProgress.progress})`, topicCount: sql<number>`count(*)` }).from(topicProgress).where(inArray(topicProgress.userId, ids)).groupBy(topicProgress.userId),
        db.select({ userId: userMockExams.userId, examCount: sql<number>`count(*)`, latestNet: sql<string>`max(${userMockExams.net})` }).from(userMockExams).where(inArray(userMockExams.userId, ids)).groupBy(userMockExams.userId),
        db.select({ userId: topicStudyLogs.userId, totalMinutes: sql<string>`sum(${topicStudyLogs.minutes})` }).from(topicStudyLogs).where(inArray(topicStudyLogs.userId, ids)).groupBy(topicStudyLogs.userId),
      ])
    : [[], [], []];

  const topicMap = new Map(topicAgg.map((row) => [row.userId, row]));
  const examMap = new Map(examAgg.map((row) => [row.userId, row]));
  const studyMap = new Map(studyAgg.map((row) => [row.userId, row]));

  const rows: AdminUserListRow[] = pageRows.map((row) => {
    const topic = topicMap.get(row.id);
    const exam = examMap.get(row.id);
    const study = studyMap.get(row.id);
    const { openId, ...rest } = row;
    return {
      ...rest,
      phone: phoneFromOpenId(openId),
      planCode: row.planCode ?? "FREE",
      planName: row.planName ?? "Ücretsiz",
      subscriptionStatus: row.subscriptionStatus ?? "active",
      topicCoveragePercent: topic ? Math.round(Number(topic.avgProgress)) : 0,
      studiedTopicCount: topic?.topicCount ?? 0,
      examCount: exam?.examCount ?? 0,
      latestExamNet: exam?.latestNet != null ? Number(exam.latestNet) : null,
      totalStudyMinutes: study ? Number(study.totalMinutes) : 0,
    };
  });

  return { rows, total, page, pageSize };
}

const startOfToday = () => { const date = new Date(); date.setHours(0, 0, 0, 0); return date; };
const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

export async function suspendUser(userId: number, adminId: number, reason?: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ accountStatus: "suspended" }).where(eq(users.id, userId));
  await writeAuditLog({ userId, adminId, action: "user_suspended", newState: { accountStatus: "suspended" }, reason });
}

export async function reactivateUser(userId: number, adminId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ accountStatus: "active" }).where(eq(users.id, userId));
  await writeAuditLog({ userId, adminId, action: "user_reactivated", newState: { accountStatus: "active" } });
}

/** Admin'in manuel e-posta doğrulaması (ör. mail hiç ulaşmıyorsa). Denetim
 * kaydına düşer. Bilerek `ADMIN_LOGINS` admin yetkisi VERMEZ — o yalnızca
 * kullanıcının kendi linkiyle, adres sahipliği kanıtlanınca gelir. */
export async function verifyUserEmailManually(userId: number, adminId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ emailVerifiedAt: new Date() }).where(and(eq(users.id, userId), isNull(users.emailVerifiedAt)));
  await writeAuditLog({ userId, adminId, action: "email_verified_by_admin", newState: { emailVerified: true } });
}

/** Provider ID'lerini tam göstermez (spec §11) — yalnızca ilk/son birkaç karakter, aradaki kısım maskelenir. */
function maskId(value: string | null): string | null {
  if (!value) return value;
  if (value.length <= 8) return `${value.slice(0, 2)}••••`;
  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}

/**
 * Öğrenci detay sayfası (spec §9-25) için tek çağrı — Overview/Subscription/
 * Usage/Progress/Exams/Topics/Payments/Audit sekmelerinin tamamına yetecek
 * veriyi bir arada döner. Hassas alanlar (passwordHash, provider secret'ları)
 * asla buraya dahil edilmez; provider ID'leri maskelenir (spec §37/§11).
 */
export async function getUserDetailForAdmin(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const [userRow] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!userRow) return null;

  const [entitlements, usage, progressScore, payments, recentExams, topicRows, recentStudyLogs, auditLogs, profile, bookContentRows, notebook] = await Promise.all([
    getEntitlements(userId),
    getUsageSummaryForUser(userId),
    getStudyProgressScore(userId),
    listPaymentsForUser(userId),
    db.select().from(userMockExams).where(eq(userMockExams.userId, userId)).orderBy(desc(userMockExams.examDate)).limit(10),
    db.select().from(topicProgress).where(eq(topicProgress.userId, userId)),
    db.select().from(topicStudyLogs).where(eq(topicStudyLogs.userId, userId)).orderBy(desc(topicStudyLogs.studyDate)).limit(20),
    listAuditLogsForUser(userId),
    getStudentProfile(userId),
    db.select({ bookId: userBookContents.bookId, mappingStatus: userBookContents.mappingStatus, mappingMethod: userBookContents.mappingMethod, mappingConfidence: userBookContents.mappingConfidence, source: userBookContents.source, createdAt: userBookContents.createdAt }).from(userBookContents).where(eq(userBookContents.userId, userId)),
    // Defter: yalnızca sayılar — öğrencinin not içeriği admin tarafından görülmez.
    getNoteStatsForAdmin(userId),
  ]);

  // Kitap içeriği özeti (OCR/eşleştirme kalitesi): kitap başına satır, eşleşen,
  // eşleşmeyen ve düşük güvenli (<0.9, otomatik öneri eşiği altı) eşleşme sayısı.
  const bookContents = Array.from(bookContentRows.reduce((map, row) => {
    const item = map.get(row.bookId) ?? { bookId: row.bookId, source: row.source, entries: 0, confirmed: 0, unmatched: 0, lowConfidence: 0, manual: 0, scannedAt: row.createdAt };
    item.entries += 1;
    if (row.mappingStatus === "confirmed") item.confirmed += 1;
    if (row.mappingStatus === "unmatched") item.unmatched += 1;
    if (row.mappingMethod === "manual") item.manual += 1;
    else if (row.mappingStatus === "confirmed" && Number(row.mappingConfidence) < 0.9) item.lowConfidence += 1;
    map.set(row.bookId, item);
    return map;
  }, new Map<string, { bookId: string; source: string; entries: number; confirmed: number; unmatched: number; lowConfidence: number; manual: number; scannedAt: Date }>()).values());
  // Kitap adı: öğrencinin eklediği kitap ya da katalog kitabı (statik vitrin kitaplarında id kalır).
  const bookIds = bookContents.map((book) => book.bookId);
  const numericIds = bookIds.filter((id) => /^\d+$/.test(id)).map(Number);
  const [customTitles, catalogTitles] = bookIds.length
    ? await Promise.all([
        db.select({ bookId: userResourceBooks.bookId, title: userResourceBooks.title }).from(userResourceBooks).where(and(eq(userResourceBooks.userId, userId), inArray(userResourceBooks.bookId, bookIds))),
        numericIds.length ? db.select({ id: catalogBooks.id, name: catalogBooks.name }).from(catalogBooks).where(inArray(catalogBooks.id, numericIds)) : Promise.resolve([]),
      ])
    : [[], []];
  const titleById = new Map<string, string>([...customTitles.map((row) => [row.bookId, row.title] as [string, string]), ...catalogTitles.map((row) => [String(row.id), row.name] as [string, string])]);
  const bookContentsWithTitles = bookContents.map((book) => ({ ...book, title: titleById.get(book.bookId) ?? null }));

  const [subscriptionRow] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
  const plan = subscriptionRow ? await getPlanById(subscriptionRow.planId) : null;

  const { passwordHash: _passwordHash, ...safeUser } = userRow;

  return {
    user: { ...safeUser, phone: phoneFromOpenId(safeUser.openId) },
    profile,
    bookContents: bookContentsWithTitles,
    notebook,
    subscription: subscriptionRow
      ? { ...subscriptionRow, providerSubscriptionId: maskId(subscriptionRow.providerSubscriptionId), providerCustomerId: maskId(subscriptionRow.providerCustomerId), planCode: plan?.code ?? "FREE", planName: plan?.name ?? "Ücretsiz", planTier: plan?.tier ?? "free" }
      : null,
    entitlements,
    usage,
    progressScore,
    payments: payments.map((payment) => ({ ...payment, providerPaymentId: maskId(payment.providerPaymentId), providerTransactionId: maskId(payment.providerTransactionId), metadata: undefined })),
    recentExams: recentExams.map((exam) => ({ id: exam.id, title: exam.title, exam: exam.exam, examDate: exam.examDate, net: Number(exam.net) })),
    topicProgress: topicRows,
    recentStudyLogs,
    auditLogs,
  };
}
