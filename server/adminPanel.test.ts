import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import type { User } from "../drizzle/schema";
import { orgPlanPrices, orgQuotes, organizationAuditLogs, organizationMembers, organizations, users } from "../drizzle/schema";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";
import { getDb } from "./db";

// Yönetim Paneli: kurum personeli yönetimi, son yönetici koruması, kurum paketi fiyatları — router + gerçek veritabanı.
const hasDb = Boolean(process.env.DATABASE_URL);
describe.skipIf(!hasDb)("yönetim paneli (router + veritabanı)", () => {
  const stamp = Date.now() % 1_000_000;
  const ids = { platform: 0, orgAdmin: 0, teacher: 0, student: 0, newcomer: 0 };
  const email = (key: keyof typeof ids) => `panel-${key}-${stamp}@test.local`;
  let orgId = 0;
  let savedPrices: Array<typeof orgPlanPrices.$inferSelect> = [];
  const createdQuoteIds: number[] = [];
  const caller = (id: number, role: "admin" | "user" = "user") => appRouter.createCaller({ user: { id, role, approvalStatus: "approved", accountStatus: "active", emailVerifiedAt: new Date(), loginMethod: "dev_email" } as unknown as User, req: { protocol: "https", headers: { host: "localhost" } } as TrpcContext["req"], res: {} as TrpcContext["res"] } as TrpcContext);
  const platform = () => caller(ids.platform, "admin");

  beforeAll(async () => {
    const db = (await getDb())!;
    for (const key of Object.keys(ids) as Array<keyof typeof ids>) {
      const [row] = await db.insert(users).values({ openId: `panel-${key}-${stamp}`, name: `Panel ${key}`, email: email(key), loginMethod: "dev_email", role: key === "platform" ? "admin" : "user" }).returning({ id: users.id });
      ids[key] = row.id;
    }
    [{ id: orgId }] = await db.insert(organizations).values({ name: "Panel Testi", slug: `panel-${stamp}`, membershipStartsAt: new Date("2026-01-01"), membershipEndsAt: new Date("2030-01-01") }).returning({ id: organizations.id });
    await db.insert(organizationMembers).values([
      { orgId, userId: ids.orgAdmin, role: "admin" },
      { orgId, userId: ids.teacher, role: "teacher", subject: "Matematik" },
      { orgId, userId: ids.student, role: "student", consentAt: new Date() },
    ]);
    savedPrices = await db.select().from(orgPlanPrices);
  });

  afterAll(async () => {
    const db = (await getDb())!;
    await db.delete(orgPlanPrices);
    if (savedPrices.length) await db.insert(orgPlanPrices).values(savedPrices);
    if (createdQuoteIds.length) await db.delete(orgQuotes).where(inArray(orgQuotes.id, createdQuoteIds));
    await db.delete(organizationAuditLogs).where(eq(organizationAuditLogs.orgId, orgId));
    await db.delete(organizationMembers).where(eq(organizationMembers.orgId, orgId));
    await db.delete(organizations).where(eq(organizations.id, orgId));
    await db.delete(users).where(inArray(users.id, Object.values(ids)));
  });

  it("platform yöneticisi olmayan hesap yönetim uçlarına erişemez", async () => {
    await expect(caller(ids.orgAdmin).admin.orgs.get({ orgId })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller(ids.orgAdmin).admin.orgs.setPlanPrice({ plan: "pro", monthlyPriceTry: 1, yearlyPriceTry: null, priceNote: null })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("kurum detayı personel, öğrenci ve sınıfları döner", async () => {
    const detail = await platform().admin.orgs.get({ orgId });
    expect(detail.org).toMatchObject({ id: orgId, status: "active", membershipState: "active", academicCasesEnabled: false });
    expect(detail.members.map((member) => member.role).sort()).toEqual(["admin", "student", "teacher"]);
  });

  it("e-postayla personel ekler; öğrenciyi personel yapmaz, hesabı olmayanı reddeder", async () => {
    await platform().admin.orgs.addStaff({ orgId, email: email("newcomer").toUpperCase(), role: "coordinator", subject: null });
    expect((await platform().admin.orgs.userMemberships({ userId: ids.newcomer }))).toEqual([expect.objectContaining({ orgId, role: "coordinator", status: "active" })]);
    await expect(platform().admin.orgs.addStaff({ orgId, email: email("student"), role: "teacher" })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(platform().admin.orgs.addStaff({ orgId, email: `yok-${stamp}@test.local`, role: "teacher" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("son kurum yöneticisini düşürmez ve çıkarmaz; başka yönetici varken izin verir", async () => {
    await expect(platform().admin.orgs.setMemberRole({ orgId, userId: ids.orgAdmin, role: "teacher" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(platform().admin.orgs.removeMember({ orgId, userId: ids.orgAdmin })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(platform().admin.orgs.setMemberRole({ orgId, userId: ids.student, role: "teacher" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await platform().admin.orgs.setMemberRole({ orgId, userId: ids.teacher, role: "admin" });
    await platform().admin.orgs.setMemberRole({ orgId, userId: ids.orgAdmin, role: "teacher" });
    await platform().admin.orgs.removeMember({ orgId, userId: ids.orgAdmin });
    const links = await platform().admin.orgs.userMemberships({ userId: ids.orgAdmin });
    expect(links[0]).toMatchObject({ orgId, status: "removed" });
  });

  it("kurum paketi fiyatı kaydedilir, kurum yöneticisi görür; boş fiyat null kalır", async () => {
    await platform().admin.orgs.setPlanPrice({ plan: "standard", monthlyPriceTry: 4990, yearlyPriceTry: null, priceNote: "50 öğrenciye kadar" });
    await platform().admin.orgs.setPlanPrice({ plan: "pro", monthlyPriceTry: null, yearlyPriceTry: null, priceNote: "" });
    const rows = await platform().admin.orgs.planPrices();
    expect(rows.find((row) => row.plan === "standard")).toMatchObject({ monthlyPriceTry: 4990, yearlyPriceTry: null, priceNote: "50 öğrenciye kadar" });
    expect(rows.find((row) => row.plan === "pro")).toMatchObject({ monthlyPriceTry: null, priceNote: null });
    const seen = await caller(ids.teacher).org.settings.planPrices({ orgId });
    expect(seen.standard).toEqual({ monthlyPriceTry: 4990, yearlyPriceTry: null, priceNote: "50 öğrenciye kadar" });
    // Koordinatör yönetici değil: kurum uçları yetkisiz role kurumu hiç göstermez.
    await expect(caller(ids.newcomer).org.settings.planPrices({ orgId })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("fiyat teklifi: yalnızca platform yöneticisi; kabul edilmeden ve iki kez uygulanmaz; sonuçlanan değişmez", async () => {
    const draft = { orgId, customerName: "Panel Testi", contactName: null, contactEmail: null, plan: "pro" as const, months: 6, studentCount: 40, lines: [{ description: "Pro — aylık", quantity: 6, unitPriceTry: 2000 }], discountPercent: 0, vatRate: 20, validUntil: "2026-12-31", note: null };
    await expect(caller(ids.teacher).admin.quotes.save(draft)).rejects.toMatchObject({ code: "FORBIDDEN" });
    const { id: quoteId } = await platform().admin.quotes.save(draft);
    const saved = await platform().admin.quotes.get({ id: quoteId });
    expect(saved).toMatchObject({ status: "draft", subtotalTry: 12_000, totalTry: 14_400, totals: { vat: 2400 } });

    await expect(platform().admin.quotes.applyToOrg({ id: quoteId })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await platform().admin.quotes.setStatus({ id: quoteId, status: "accepted" });
    await expect(platform().admin.quotes.save({ ...draft, id: quoteId, discountPercent: 50 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(platform().admin.quotes.delete({ id: quoteId })).rejects.toMatchObject({ code: "BAD_REQUEST" });

    const before = (await platform().admin.orgs.get({ orgId })).org;
    await platform().admin.quotes.applyToOrg({ id: quoteId });
    const after = (await platform().admin.orgs.get({ orgId })).org;
    expect(after.plan).toBe("pro");
    expect(after.aiCreditsMonthly).toBeGreaterThanOrEqual(20_000);
    const expectedEnd = new Date(before.membershipEndsAt!);
    expectedEnd.setMonth(expectedEnd.getMonth() + 6);
    expect(new Date(after.membershipEndsAt!).toISOString()).toBe(expectedEnd.toISOString());
    await expect(platform().admin.quotes.applyToOrg({ id: quoteId })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(platform().admin.quotes.setStatus({ id: quoteId, status: "draft" })).rejects.toMatchObject({ code: "BAD_REQUEST" });

    // Kuruma bağlı olmayan aday teklifi kabul edilse de uygulanamaz.
    const { id: prospectId } = await platform().admin.quotes.save({ ...draft, orgId: null, customerName: "Aday Dershane" });
    await platform().admin.quotes.setStatus({ id: prospectId, status: "accepted" });
    await expect(platform().admin.quotes.applyToOrg({ id: prospectId })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    createdQuoteIds.push(quoteId, prospectId);
  });
});
