import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { featureUsageLogs, payments, studentExamTracks, studentProfiles, subscriptions, users } from "../drizzle/schema";
import { ADDON_DISCOUNT, BUNDLE_DISCOUNT, planCodeFor, quoteCheckout, type QuotePlan } from "../shared/checkoutQuote";
import { EXAM_TRACKS } from "../shared/exams";
import { getDb } from "./db";

// Sınav başına abonelik: plan kodları, paket (2+ sınav) ve branş (KPSS'ye bağlı MEB-AGS/A grubu) indirimi.
const plans: QuotePlan[] = EXAM_TRACKS.flatMap((track) => [
  { code: planCodeFor(track, "basic", "monthly"), track, tier: "basic", billingPeriod: "monthly", price: 24900, currency: "TRY" },
  { code: planCodeFor(track, "premium", "monthly"), track, tier: "premium", billingPeriod: "monthly", price: 99900, currency: "TRY" },
  { code: planCodeFor(track, "premium", "yearly"), track, tier: "premium", billingPeriod: "yearly", price: 959900, currency: "TRY" },
]);
const now = new Date("2026-10-21T12:00:00+03:00");
const quote = (items: Parameters<typeof quoteCheckout>[0]["items"], activeTracks: Parameters<typeof quoteCheckout>[0]["activeTracks"] = []) => quoteCheckout({ items, plans, activeTracks, examYearByTrack: {}, now });

describe("plan kodları", () => {
  it("YKS eski kodlarını korur, diğer sınavlar önekli", () => {
    expect(planCodeFor("YKS", "premium", "monthly")).toBe("PREMIUM_MONTHLY");
    expect(planCodeFor("MEB_AGS", "premium_plus", "yearly")).toBe("MEB_AGS_PRO_YEARLY");
  });
});

describe("ödeme tutarı", () => {
  it("tek sınav: indirimsiz", () => {
    const result = quote([{ track: "KPSS", tier: "premium", period: "monthly" }]);
    expect(result.lines[0]).toMatchObject({ price: 99900, discountReason: null });
    expect(result.total).toBe(99900);
  });

  it("aynı ödemede iki sınav: ikisine de %20 paket indirimi (tam liraya yuvarlanır)", () => {
    const result = quote([{ track: "KPSS", tier: "premium", period: "monthly" }, { track: "MEB_AGS", tier: "basic", period: "monthly" }]);
    expect(BUNDLE_DISCOUNT).toBe(0.2);
    expect(result.lines.map((line) => [line.track, line.discountReason, line.price])).toEqual([["KPSS", "bundle", 79900], ["MEB_AGS", "bundle", 19900]]);
    expect(result.discountTotal).toBe(99900 + 24900 - 79900 - 19900);
  });

  it("KPSS aboneliği olan aday branşı sonradan alırsa branş indirimi; KPSS yoksa yok", () => {
    expect(ADDON_DISCOUNT).toBe(0.2);
    expect(quote([{ track: "MEB_AGS", tier: "premium", period: "monthly" }], ["KPSS"]).lines[0]).toMatchObject({ discountReason: "addon", price: 79900 });
    expect(quote([{ track: "KPSS_A", tier: "premium", period: "monthly" }], ["KPSS"]).lines[0].discountReason).toBe("addon");
    expect(quote([{ track: "MEB_AGS", tier: "premium", period: "monthly" }], []).lines[0].discountReason).toBeNull();
    // Branşı olmayan sınavda (DGS) KPSS aboneliği indirim vermez.
    expect(quote([{ track: "DGS", tier: "premium", period: "monthly" }], ["KPSS"]).lines[0].discountReason).toBeNull();
  });

  it("indirimler toplanmaz: KPSS + branş aynı ödemede yine %20", () => {
    const result = quote([{ track: "KPSS", tier: "premium", period: "monthly" }, { track: "KPSS_A", tier: "premium", period: "monthly" }], ["KPSS"]);
    expect(result.lines.every((line) => line.discountRate === 0.2)).toBe(true);
  });

  it("yıllık plan sınava kalan süreye göre, paket indirimi onun üstüne", () => {
    const single = quote([{ track: "DGS", tier: "premium", period: "yearly" }]).lines[0];
    expect(single.months).toBeGreaterThan(1);
    expect(single.basePrice).toBeLessThan(99900 * single.months);
    const bundled = quote([{ track: "DGS", tier: "premium", period: "yearly" }, { track: "YKS", tier: "basic", period: "monthly" }]).lines[0];
    expect(bundled.basePrice).toBe(single.basePrice);
    expect(bundled.price).toBe(Math.floor((single.basePrice * 0.8) / 100) * 100);
  });

  it("aynı sınav iki kez ya da satışta olmayan plan reddedilir", () => {
    expect(() => quote([{ track: "KPSS", tier: "premium", period: "monthly" }, { track: "KPSS", tier: "basic", period: "monthly" }])).toThrow(/iki kez/);
    expect(() => quote([{ track: "KPSS", tier: "premium_plus", period: "monthly" }])).toThrow(/satışta değil/);
  });
});

// Gerçek veritabanıyla: paket ödemesi iki ayrı abonelik açar, kotalar sınav başına sayılır.
const hasDb = Boolean(process.env.DATABASE_URL);
describe.skipIf(!hasDb)("sınav başına abonelik (veritabanı)", () => {
  const stamp = Date.now() % 1_000_000;
  let userId = 0;

  beforeAll(async () => {
    const { seedSubscriptionPlans } = await import("./subscriptions/seedPlans");
    await seedSubscriptionPlans();
    const db = (await getDb())!;
    const [row] = await db.insert(users).values({ openId: `per-exam-sub-${stamp}`, name: "Abonelik Test", loginMethod: "dev_email" }).returning({ id: users.id });
    userId = row.id;
    await db.insert(studentProfiles).values({ userId, onboardingCompleted: 1, examTrack: "KPSS", gradeLevel: "lisans_mezun", examYear: 2028 });
  });
  afterAll(async () => {
    const db = (await getDb())!;
    for (const table of [featureUsageLogs, payments, subscriptions, studentExamTracks, studentProfiles]) await db.delete(table).where(eq(table.userId, userId));
    await db.delete(users).where(inArray(users.id, [userId]));
  });

  it("KPSS + MEB-AGS paket ödemesi: iki abonelik, iki indirimli ödeme satırı, ortak checkoutId", async () => {
    const { completeMockCheckoutForUser } = await import("./subscriptions/checkout");
    const { getEntitlements } = await import("./subscriptions/entitlementService");
    const { quote: result, checkoutId } = await completeMockCheckoutForUser(userId, [{ track: "KPSS", tier: "premium", period: "monthly" }, { track: "MEB_AGS", tier: "basic", period: "monthly" }]);
    expect(result.total).toBe(79900 + 19900);
    const [kpss, ags, yks] = await Promise.all([getEntitlements(userId, "KPSS"), getEntitlements(userId, "MEB_AGS"), getEntitlements(userId, "YKS")]);
    expect([kpss.tier, kpss.isPremium, ags.tier, ags.isPremium, yks.isPremium]).toEqual(["premium", true, "basic", true, false]);
    const db = (await getDb())!;
    const rows = await db.select().from(payments).where(eq(payments.userId, userId));
    expect(rows.map((row) => [row.track, row.amount]).sort()).toEqual([["KPSS", 79900], ["MEB_AGS", 19900]]);
    expect(rows.every((row) => JSON.parse(row.metadata ?? "{}").checkoutId === checkoutId)).toBe(true);
  });

  it("kota sınav başına: KPSS'deki kullanım MEB-AGS'nin hakkından düşmez", async () => {
    const { recordFeatureUsage, countFeatureUsage } = await import("./subscriptions/subscriptionDb");
    await recordFeatureUsage(userId, "NOTE_AI", "KPSS");
    await recordFeatureUsage(userId, "NOTE_AI", "KPSS");
    expect(await countFeatureUsage(userId, "NOTE_AI", 30, "KPSS")).toBe(2);
    expect(await countFeatureUsage(userId, "NOTE_AI", 30, "MEB_AGS")).toBe(0);
  });
});
