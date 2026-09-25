import { and, desc, eq, gte, sql } from "drizzle-orm";
import { phoneFromOpenId } from "../_core/loginIdentifier";
import { getDb } from "../db";
import {
  featureUsageLogs,
  paymentEvents,
  payments,
  subscriptionAuditLogs,
  subscriptionPlans,
  subscriptions,
  topicProgress,
  topicStudyLogs,
  userMockExams,
  users,
  type InsertPayment,
  type InsertPaymentEvent,
  type InsertSubscription,
  type Subscription,
  type SubscriptionPlan,
} from "../../drizzle/schema";

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

export async function listActivePlans(): Promise<SubscriptionPlan[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subscriptionPlans).where(eq(subscriptionPlans.isActive, 1));
}

export async function getPlanByCode(code: string): Promise<SubscriptionPlan | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.code, code)).limit(1);
  return rows[0];
}

export async function getPlanById(id: number): Promise<SubscriptionPlan | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, id)).limit(1);
  return rows[0];
}

/** Idempotent — var olan bir plan kodu tekrar seed edilirse günceller, çoğaltmaz. */
export async function upsertPlan(input: { code: string; name: string; description?: string | null; tier: "free" | "premium" | "premium_plus"; billingPeriod: "none" | "monthly" | "yearly"; price: number; currency?: string; trialDays?: number; storeProductId?: string | null; provider?: string | null }): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const existing = await getPlanByCode(input.code);
  if (existing) {
    await db.update(subscriptionPlans).set({ name: input.name, description: input.description ?? null, tier: input.tier, billingPeriod: input.billingPeriod, price: input.price, currency: input.currency ?? "TRY", trialDays: input.trialDays ?? 0, storeProductId: input.storeProductId ?? null, provider: input.provider ?? null }).where(eq(subscriptionPlans.id, existing.id));
    return;
  }
  await db.insert(subscriptionPlans).values({ code: input.code, name: input.name, description: input.description ?? null, tier: input.tier, billingPeriod: input.billingPeriod, price: input.price, currency: input.currency ?? "TRY", trialDays: input.trialDays ?? 0, storeProductId: input.storeProductId ?? null, provider: input.provider ?? null });
}

// ---------------------------------------------------------------------------
// Subscriptions — bkz. shared/subscriptionStateMachine.ts: kullanıcı başına
// TEK satır, hep bu satır üzerinde güncellenir.
// ---------------------------------------------------------------------------

export async function getSubscriptionByUserId(userId: number): Promise<Subscription | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
  return rows[0];
}

/** Kullanıcının hiç subscription satırı yoksa FREE planına, "active" (süresiz) olarak provizyonlar. */
export async function ensureFreeSubscription(userId: number): Promise<Subscription> {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı bağlantısı yok");
  const existing = await getSubscriptionByUserId(userId);
  if (existing) return existing;
  const freePlan = await getPlanByCode("FREE");
  if (!freePlan) throw new Error("FREE planı bulunamadı — önce seedSubscriptionPlans() çalıştırılmalı");
  await db.insert(subscriptions).values({ userId, planId: freePlan.id, status: "active", provider: null }).onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });
  const created = await getSubscriptionByUserId(userId);
  if (!created) throw new Error("Free subscription oluşturulamadı");
  return created;
}

/** Admin listesi için — kullanıcı adı/e-posta + plan koduyla birleştirilmiş özet. */
export async function listAllSubscriptionsForAdmin() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
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
      updatedAt: subscriptions.updatedAt,
    })
    .from(subscriptions)
    .innerJoin(users, eq(users.id, subscriptions.userId))
    .innerJoin(subscriptionPlans, eq(subscriptionPlans.id, subscriptions.planId))
    .orderBy(desc(subscriptions.updatedAt));
}

export type AdminUserOverview = {
  id: number;
  name: string | null;
  email: string | null;
  openId: string;
  role: "user" | "admin";
  approvalStatus: "pending" | "approved" | "rejected";
  accountStatus: "active" | "suspended" | "deleted";
  createdAt: Date;
  lastSignedIn: Date;
  planCode: string;
  subscriptionStatus: string;
  topicCoveragePercent: number;
  studiedTopicCount: number;
  examCount: number;
  latestExamNet: number | null;
  totalStudyMinutes: number;
};

/**
 * Admin "Üyeler" tablosu için — her kullanıcının kayıt bilgisini, abonelik
 * seviyesini (free/aylık/yıllık) VE gerçek ilerleyişini (konu kapsama %,
 * deneme sayısı/son net, toplam çalışma dakikası) tek satırda birleştirir.
 * Her kaynak tablo ayrı GROUP BY ile toplanıp userId'ye göre JS'te
 * birleştiriliyor — tek bir JOIN'li sorguda birden fazla 1-e-çok ilişkiyi
 * (topic_progress + user_mock_exams + topic_study_logs) aynı anda birleştirmek
 * satır çoğalmasına (fan-out) yol açar, bu yüzden bilerek ayrı tutuldu.
 */
export async function listAllUsersForAdmin(): Promise<AdminUserOverview[]> {
  const db = await getDb();
  if (!db) return [];

  const [allUsers, topicAgg, examAgg, studyAgg, subs] = await Promise.all([
    db.select({ id: users.id, name: users.name, email: users.email, openId: users.openId, role: users.role, approvalStatus: users.approvalStatus, accountStatus: users.accountStatus, createdAt: users.createdAt, lastSignedIn: users.lastSignedIn }).from(users).orderBy(desc(users.createdAt)),
    db.select({ userId: topicProgress.userId, avgProgress: sql<string>`avg(${topicProgress.progress})`, topicCount: sql<number>`count(*)` }).from(topicProgress).groupBy(topicProgress.userId),
    db.select({ userId: userMockExams.userId, examCount: sql<number>`count(*)`, latestNet: sql<string>`max(${userMockExams.net})` }).from(userMockExams).groupBy(userMockExams.userId),
    db.select({ userId: topicStudyLogs.userId, totalMinutes: sql<string>`sum(${topicStudyLogs.minutes})` }).from(topicStudyLogs).groupBy(topicStudyLogs.userId),
    listAllSubscriptionsForAdmin(),
  ]);

  const topicMap = new Map(topicAgg.map((row) => [row.userId, row]));
  const examMap = new Map(examAgg.map((row) => [row.userId, row]));
  const studyMap = new Map(studyAgg.map((row) => [row.userId, row]));
  const subMap = new Map(subs.map((row) => [row.userId, row]));

  return allUsers.map((user) => {
    const topic = topicMap.get(user.id);
    const exam = examMap.get(user.id);
    const study = studyMap.get(user.id);
    const sub = subMap.get(user.id);
    return {
      ...user,
      planCode: sub?.planCode ?? "FREE",
      subscriptionStatus: sub?.status ?? "active",
      topicCoveragePercent: topic ? Math.round(Number(topic.avgProgress)) : 0,
      studiedTopicCount: topic?.topicCount ?? 0,
      examCount: exam?.examCount ?? 0,
      latestExamNet: exam?.latestNet != null ? Number(exam.latestNet) : null,
      totalStudyMinutes: study ? Number(study.totalMinutes) : 0,
    };
  });
}

export async function updateSubscription(userId: number, patch: Partial<InsertSubscription>): Promise<Subscription> {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı bağlantısı yok");
  await db.update(subscriptions).set(patch).where(eq(subscriptions.userId, userId));
  const updated = await getSubscriptionByUserId(userId);
  if (!updated) throw new Error("Abonelik bulunamadı");
  return updated;
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export async function createPayment(input: InsertPayment): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı bağlantısı yok");
  const result = await db.insert(payments).values(input);
  return Number(result[0].insertId);
}

export async function updatePaymentStatus(paymentId: number, patch: Partial<InsertPayment>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(payments).set(patch).where(eq(payments.id, paymentId));
}

export async function listPaymentsForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(payments).where(eq(payments.userId, userId)).orderBy(desc(payments.createdAt));
}

/** Admin "Payments" sayfası (spec §27) — kullanıcı adıyla birleştirilmiş, en son N ödeme. Kart numarası gibi bir alan zaten şemada YOK (hiç saklanmadı, spec §27/§37). */
export async function listAllPaymentsForAdmin(limit: number = 100) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ id: payments.id, userId: payments.userId, userName: users.name, userEmail: users.email, amount: payments.amount, currency: payments.currency, provider: payments.provider, status: payments.status, paymentType: payments.paymentType, providerPaymentId: payments.providerPaymentId, createdAt: payments.createdAt, paidAt: payments.paidAt })
    .from(payments)
    .innerJoin(users, eq(users.id, payments.userId))
    .orderBy(desc(payments.createdAt))
    .limit(Math.min(500, Math.max(1, limit)));
}

// ---------------------------------------------------------------------------
// Webhook idempotency
// ---------------------------------------------------------------------------

/** true dönerse bu event DAHA ÖNCE işlenmiş demektir — çağıran taraf işlemi atlamalı. */
export async function isDuplicateEvent(provider: string, eventId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const rows = await db.select({ id: paymentEvents.id, status: paymentEvents.status }).from(paymentEvents).where(and(eq(paymentEvents.provider, provider), eq(paymentEvents.eventId, eventId))).limit(1);
  return rows.length > 0 && rows[0].status === "processed";
}

export async function recordEventReceived(input: InsertPaymentEvent): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.insert(paymentEvents).values(input);
    return Number(result[0].insertId);
  } catch {
    // UNIQUE(provider, eventId) çakışması — event zaten var, mevcut satırın id'sini döndür.
    const rows = await db.select({ id: paymentEvents.id }).from(paymentEvents).where(and(eq(paymentEvents.provider, input.provider), eq(paymentEvents.eventId, input.eventId))).limit(1);
    return rows[0]?.id ?? null;
  }
}

export async function markEventProcessed(id: number, status: "processed" | "failed" | "ignored", errorMessage?: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(paymentEvents).set({ status, processedAt: new Date(), errorMessage: errorMessage ?? null }).where(eq(paymentEvents.id, id));
}

// ---------------------------------------------------------------------------
// Audit log (spec §25 — admin override'lar dahil her subscription değişikliği)
// ---------------------------------------------------------------------------

export async function writeAuditLog(input: { userId: number; adminId?: number | null; action: string; oldState?: unknown; newState?: unknown; reason?: string | null; metadata?: unknown }): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(subscriptionAuditLogs).values({
    userId: input.userId,
    adminId: input.adminId ?? null,
    action: input.action,
    oldState: input.oldState !== undefined ? JSON.stringify(input.oldState) : null,
    newState: input.newState !== undefined ? JSON.stringify(input.newState) : null,
    reason: input.reason ?? null,
    metadata: input.metadata !== undefined ? JSON.stringify(input.metadata) : null,
  });
}

export async function listAuditLogsForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subscriptionAuditLogs).where(eq(subscriptionAuditLogs.userId, userId)).orderBy(desc(subscriptionAuditLogs.createdAt));
}

/** Global "Audit Logs" sayfası (spec §30/§47: `admin.audit.list`) — en son N işlem, sınırlı (tüm tabloyu belleğe çekmez). */
export async function listAllAuditLogs(limit: number = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subscriptionAuditLogs).orderBy(desc(subscriptionAuditLogs.createdAt)).limit(Math.min(500, Math.max(1, limit)));
}

// ---------------------------------------------------------------------------
// Feature usage (rolling-window limitler, spec §32)
// ---------------------------------------------------------------------------

export async function recordFeatureUsage(userId: number, featureKey: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(featureUsageLogs).values({ userId, featureKey });
}

export async function countFeatureUsage(userId: number, featureKey: string, windowDays: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  const rows = await db.select({ id: featureUsageLogs.id }).from(featureUsageLogs).where(and(eq(featureUsageLogs.userId, userId), eq(featureUsageLogs.featureKey, featureKey), gte(featureUsageLogs.usedAt, since)));
  return rows.length;
}

/**
 * Admin "Reset usage" (spec §28/§47: `admin.usage.reset`) — append-only
 * `feature_usage_logs`'ta bir "sayaç" olmadığı için, pencereyi sıfırlamak o
 * pencere içindeki satırları silmek anlamına gelir. Yalnızca `windowDays`
 * kapsamındaki satırlar silinir (tüm geçmiş değil) — böylece uzun vadeli
 * kullanım geçmişi/denetim izi korunur.
 */
export async function resetFeatureUsage(userId: number, featureKey: string, windowDays: number, adminId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  await db.delete(featureUsageLogs).where(and(eq(featureUsageLogs.userId, userId), eq(featureUsageLogs.featureKey, featureKey), gte(featureUsageLogs.usedAt, since)));
  await writeAuditLog({ userId, adminId, action: "usage_reset", newState: { featureKey, windowDays } });
}

// ---------------------------------------------------------------------------
// Admin — üyelik onayı (bu oturumun ek isteği)
// ---------------------------------------------------------------------------

export async function listPendingUsers() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(users).where(eq(users.approvalStatus, "pending")).orderBy(desc(users.createdAt));
  // passwordHash bilerek hariç — admin.users.get (getUserDetailForAdmin) bunu
  // zaten filtreliyordu, bu liste uç noktası filtrelemiyordu (canlıda
  // doğrulandı: scrypt hash'i client'a gidiyordu). Aynı desen: bkz.
  // server/admin/adminUserDb.ts getUserDetailForAdmin.
  return rows.map(({ passwordHash: _passwordHash, ...safeUser }) => ({ ...safeUser, phone: phoneFromOpenId(safeUser.openId) }));
}

export async function approveUser(userId: number, adminId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ approvalStatus: "approved", approvedAt: new Date(), approvedBy: adminId, rejectedAt: null, rejectionReason: null }).where(eq(users.id, userId));
  await writeAuditLog({ userId, adminId, action: "user_approved", newState: { approvalStatus: "approved" } });
}

export async function rejectUser(userId: number, adminId: number, reason?: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ approvalStatus: "rejected", rejectedAt: new Date(), rejectionReason: reason ?? null }).where(eq(users.id, userId));
  await writeAuditLog({ userId, adminId, action: "user_rejected", newState: { approvalStatus: "rejected" }, reason });
}
