import { and, desc, eq, gte, sql } from "drizzle-orm";
import { organizationCreditUsage, organizationMembers, organizations, studentProfiles, users } from "../../drizzle/schema";
import type { FeatureKey } from "../../shared/entitlements";
import { ORG_CREDIT_COSTS, creditDecision, creditPeriodStart, membershipState } from "../../shared/org";
import { getDb } from "../db";

// Kurum AI kredi havuzu. Kuruma bağlı öğrencinin AI işlemi önce kurumun aylık havuzundan
// karşılanır (öğrencinin kendi kotası harcanmaz); havuz biter, üyelik süresi dolar ya da
// öğrenci kurumun koyduğu üst sınıra ulaşırsa öğrencinin kendi kotası devreye girer.

export type OrgCreditSource = { orgId: number; cost: number };

async function sumCredits(orgId: number, since: Date, userId?: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const conditions = [eq(organizationCreditUsage.orgId, orgId), gte(organizationCreditUsage.usedAt, since)];
  if (userId) conditions.push(eq(organizationCreditUsage.userId, userId));
  const [row] = await db.select({ total: sql<number>`COALESCE(SUM(${organizationCreditUsage.credits}), 0)`.mapWith(Number) }).from(organizationCreditUsage).where(and(...conditions));
  return Number(row?.total ?? 0);
}

/** Bu işlem kurum havuzundan karşılanabiliyorsa kaynağı döner; yoksa null (kişisel kota). Yazmaz. */
export async function findOrgCreditSource(userId: number, feature: FeatureKey, now = new Date()): Promise<OrgCreditSource | null> {
  const cost = ORG_CREDIT_COSTS[feature];
  if (!cost) return null;
  const db = await getDb();
  if (!db) return null;
  const [org] = await db
    .select({ orgId: organizations.id, monthly: organizations.aiCreditsMonthly, cap: organizations.perStudentCreditCap, membershipStartsAt: organizations.membershipStartsAt, membershipEndsAt: organizations.membershipEndsAt })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizations.id, organizationMembers.orgId))
    .where(and(eq(organizationMembers.userId, userId), eq(organizationMembers.role, "student"), eq(organizationMembers.status, "active"), eq(organizations.status, "active")))
    .limit(1);
  if (!org || org.monthly <= 0 || membershipState(org, now) !== "active") return null;
  const since = creditPeriodStart(now);
  const [usedByOrg, usedByStudent] = await Promise.all([sumCredits(org.orgId, since), org.cap === null ? Promise.resolve(0) : sumCredits(org.orgId, since, userId)]);
  return creditDecision({ monthly: org.monthly, usedByOrg, cap: org.cap, usedByStudent, cost }).ok ? { orgId: org.orgId, cost } : null;
}

export async function recordOrgCredit(source: OrgCreditSource, userId: number, feature: FeatureKey): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(organizationCreditUsage).values({ orgId: source.orgId, userId, featureKey: feature, credits: source.cost });
}

/** Ayarlar → Üyelik ve krediler: bu ayın toplamı, özelliğe ve öğrenciye göre dağılım. */
export async function orgCreditReport(orgId: number, now = new Date()) {
  const db = await getDb();
  if (!db) return { periodStart: creditPeriodStart(now), used: 0, byFeature: [], byStudent: [] };
  const since = creditPeriodStart(now);
  const scope = and(eq(organizationCreditUsage.orgId, orgId), gte(organizationCreditUsage.usedAt, since));
  const total = sql<number>`SUM(${organizationCreditUsage.credits})`.mapWith(Number);
  const count = sql<number>`COUNT(*)::int`;
  const [byFeature, byStudent] = await Promise.all([
    db.select({ featureKey: organizationCreditUsage.featureKey, credits: total, uses: count }).from(organizationCreditUsage).where(scope).groupBy(organizationCreditUsage.featureKey),
    db.select({ userId: organizationCreditUsage.userId, name: users.name, preferredName: studentProfiles.preferredName, credits: total, uses: count })
      .from(organizationCreditUsage)
      .innerJoin(users, eq(users.id, organizationCreditUsage.userId))
      .leftJoin(studentProfiles, eq(studentProfiles.userId, organizationCreditUsage.userId))
      .where(scope)
      .groupBy(organizationCreditUsage.userId, users.name, studentProfiles.preferredName)
      .orderBy(desc(total))
      .limit(20),
  ]);
  return {
    periodStart: since,
    used: byFeature.reduce((sum, row) => sum + Number(row.credits), 0),
    byFeature: byFeature.map((row) => ({ featureKey: row.featureKey, credits: Number(row.credits), uses: Number(row.uses) })),
    byStudent: byStudent.map((row) => ({ userId: row.userId, name: row.preferredName || row.name || "Öğrenci", credits: Number(row.credits), uses: Number(row.uses) })),
  };
}

/** Platform listesi için: kurumların bu ayki harcaması. */
export async function creditsUsedThisMonth(orgIds: number[], now = new Date()): Promise<Map<number, number>> {
  const result = new Map<number, number>();
  for (const orgId of orgIds) result.set(orgId, await sumCredits(orgId, creditPeriodStart(now)));
  return result;
}
