import { and, count, eq, gte, isNotNull, lt, sql } from "drizzle-orm";
import { getDb } from "../db";
import { subscriptionPlans, subscriptions, users } from "../../drizzle/schema";

export type AdminDashboardKpis = {
  totalUsers: number;
  pendingApproval: number;
  activeAccounts: number;
  suspendedAccounts: number;
  freeUsers: number;
  trialUsers: number;
  premiumUsers: number;
  monthlySubscribers: number;
  yearlySubscribers: number;
  pastDue: number;
  gracePeriod: number;
  expiredSubscriptions: number;
  canceledSubscriptions: number;
  activeToday: number;
  activeThisWeek: number;
  inactive7Plus: number;
  inactive30Plus: number;
  trialConversion: { started: number; stillTrialing: number; converted: number; conversionRate: number | null };
};

/**
 * Admin Command Center'ın üst KPI kartları (spec §3/§52) — tek bir sayfa
 * açılışında onlarca ayrı sorgu yerine, birkaç GROUP BY sorgusuyla
 * hesaplanır. Hiçbir sayı client'ta tüm kullanıcı listesi çekilip
 * SAYILARAK üretilmez.
 */
export async function getAdminDashboardKpis(): Promise<AdminDashboardKpis> {
  const db = await getDb();
  const empty: AdminDashboardKpis = {
    totalUsers: 0, pendingApproval: 0, activeAccounts: 0, suspendedAccounts: 0,
    freeUsers: 0, trialUsers: 0, premiumUsers: 0, monthlySubscribers: 0, yearlySubscribers: 0,
    pastDue: 0, gracePeriod: 0, expiredSubscriptions: 0, canceledSubscriptions: 0,
    activeToday: 0, activeThisWeek: 0, inactive7Plus: 0, inactive30Plus: 0,
    trialConversion: { started: 0, stillTrialing: 0, converted: 0, conversionRate: null },
  };
  if (!db) return empty;

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [approvalCounts, accountStatusCounts, planStatusCounts, activeTodayRow, activeWeekRow, inactive7Row, inactive30Row, totalRow, trialStartedRow, stillTrialingRow, convertedRow] = await Promise.all([
    db.select({ approvalStatus: users.approvalStatus, total: count() }).from(users).groupBy(users.approvalStatus),
    db.select({ accountStatus: users.accountStatus, total: count() }).from(users).groupBy(users.accountStatus),
    db.select({ tier: subscriptionPlans.tier, billingPeriod: subscriptionPlans.billingPeriod, status: subscriptions.status, total: count() }).from(subscriptions).innerJoin(subscriptionPlans, eq(subscriptionPlans.id, subscriptions.planId)).groupBy(subscriptionPlans.tier, subscriptionPlans.billingPeriod, subscriptions.status),
    db.select({ total: count() }).from(users).where(gte(users.lastSignedIn, todayStart)),
    db.select({ total: count() }).from(users).where(gte(users.lastSignedIn, weekAgo)),
    db.select({ total: count() }).from(users).where(lt(users.lastSignedIn, weekAgo)),
    db.select({ total: count() }).from(users).where(lt(users.lastSignedIn, monthAgo)),
    db.select({ total: count() }).from(users),
    db.select({ total: count() }).from(subscriptions).where(isNotNull(subscriptions.trialStartedAt)),
    db.select({ total: count() }).from(subscriptions).where(eq(subscriptions.status, "trialing")),
    db.select({ total: count() }).from(subscriptions).where(and(isNotNull(subscriptions.trialStartedAt), sql`${subscriptions.status} in ('active','past_due','grace_period')`)),
  ]);

  const kpis: AdminDashboardKpis = { ...empty, totalUsers: totalRow[0]?.total ?? 0, activeToday: activeTodayRow[0]?.total ?? 0, activeThisWeek: activeWeekRow[0]?.total ?? 0, inactive7Plus: inactive7Row[0]?.total ?? 0, inactive30Plus: inactive30Row[0]?.total ?? 0 };

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
  kpis.trialConversion = { started, stillTrialing, converted, conversionRate: ended > 0 ? Math.round((converted / ended) * 100) : null };

  return kpis;
}
