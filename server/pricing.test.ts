import { describe, expect, it } from "vitest";
import { FEATURE_KEYS, FREE_TIER_LIMITS, PAID_TIERS, TIER_USAGE_LIMITS, featuresForTier, usageLimitFor } from "../shared/entitlements";
import { nextYksEnd, planPeriodEnd, yksTermPrice } from "../shared/yksCalendar";
import { PAID_PRICES } from "./subscriptions/seedPlans";

describe("plan fiyatları", () => {
  it("aylık 249 / 999 / 2.499 TL", () => {
    expect([PAID_PRICES.basic.monthly, PAID_PRICES.premium.monthly, PAID_PRICES.premium_plus.monthly]).toEqual([24900, 99900, 249900]);
  });

  it("yıllık, 12 aylığın yaklaşık %20 indirimlisi (2.399 / 9.599 / 23.999 TL)", () => {
    expect([PAID_PRICES.basic.yearly, PAID_PRICES.premium.yearly, PAID_PRICES.premium_plus.yearly]).toEqual([239900, 959900, 2399900]);
    for (const tier of PAID_TIERS) {
      const discount = 1 - PAID_PRICES[tier].yearly / (PAID_PRICES[tier].monthly * 12);
      expect(discount).toBeGreaterThan(0.19);
      expect(discount).toBeLessThanOrEqual(0.2);
    }
  });
});

describe("kademe kotaları", () => {
  it("ücretli her kademede tüm özellikler açık; tek fark kota", () => {
    for (const tier of PAID_TIERS) expect(featuresForTier(tier)).toEqual([...FEATURE_KEYS]);
    expect(featuresForTier("free")).toEqual([]);
  });

  it("her kotalı özellikte Ücretsiz < Temel < Premium < Pro", () => {
    for (const feature of Object.keys(TIER_USAGE_LIMITS.premium) as Array<keyof typeof TIER_USAGE_LIMITS.premium>) {
      const ladder = [FREE_TIER_LIMITS[feature]?.maxUses ?? 0, ...PAID_TIERS.map((tier) => usageLimitFor(tier, feature)!.maxUses)];
      expect([...ladder].sort((a, b) => a - b)).toEqual(ladder);
      expect(new Set(ladder).size).toBe(ladder.length);
    }
  });
});

describe("YKS'ye kadar süren yıllık plan", () => {
  it("bitiş, bir sonraki YKS'nin son günü İstanbul saatiyle 23:59", () => {
    const now = new Date("2026-10-19T12:00:00Z");
    const end = nextYksEnd(now);
    expect(end.year).toBe(2027);
    expect(end.estimated).toBe(false);
    expect(end.endsAt.toISOString()).toBe("2027-06-20T20:59:59.999Z");
    expect(planPeriodEnd("yearly", now)).toEqual(end.endsAt);
  });

  it("sınav bittikten sonra alınan yıllık bir sonraki yılın sınavına kadar sürer (tarih açıklanmadıysa tahmini)", () => {
    const end = nextYksEnd(new Date("2027-06-21T08:00:00Z"));
    expect(end.year).toBe(2028);
    expect(end.estimated).toBe(true);
  });

  it("fiyat, sınava kalan süreyi aylık ödemenin %20 eksiği (…99'a yuvarlı)", () => {
    const now = new Date("2026-10-19T12:00:00Z"); // YKS 2027'ye 9 aylık dönem
    const quote = (tier: keyof typeof PAID_PRICES) => yksTermPrice({ monthlyPrice: PAID_PRICES[tier].monthly, now, examYear: 2027 });
    expect(quote("basic")).toMatchObject({ months: 9, monthlyTotal: 224100, price: 179900 });
    expect(quote("premium").price).toBe(719900);
    expect(quote("premium_plus").price).toBe(1799900);
  });

  it("sınava bir ay kala da indirimli", () => {
    expect(yksTermPrice({ monthlyPrice: 24900, now: new Date("2027-06-01T12:00:00Z"), examYear: 2027 })).toMatchObject({ months: 1, price: 19900 });
  });

  it("ankette seçilen sınav yılına kadar sürer; üst sınır yok", () => {
    const now = new Date("2026-10-19T12:00:00Z");
    const in2029 = yksTermPrice({ monthlyPrice: 24900, now, examYear: 2029 });
    expect(in2029.yks).toMatchObject({ year: 2029, estimated: true });
    expect(in2029.months).toBe(33);
    expect(in2029.price).toBe(659900); // 33 × 249 × 0,8 = 6.573,6 → en yakın …99: 6.599 TL
    expect(planPeriodEnd("yearly", now, 2028)).toEqual(nextYksEnd(now, 2028).endsAt);
  });

  it("sınav yılı yoksa ya da o sınav geçmişse bir sonraki YKS esas alınır", () => {
    const now = new Date("2026-10-19T12:00:00Z");
    expect(nextYksEnd(now, null).year).toBe(2027);
    expect(nextYksEnd(now, 2026).year).toBe(2027);
  });

  it("her ay için indirim gerçekten var ve %20'ye yakın", () => {
    for (let months = 0; months < 13; months++) {
      const now = new Date(Date.UTC(2026, 6, 1) + months * 30 * 24 * 60 * 60 * 1000);
      for (const tier of PAID_TIERS) {
        const quote = yksTermPrice({ monthlyPrice: PAID_PRICES[tier].monthly, now });
        const discount = 1 - quote.price / quote.monthlyTotal;
        expect(discount).toBeGreaterThan(0.19);
      }
    }
  });

  it("aylık plan 30 gün sürer", () => {
    const now = new Date("2026-10-19T12:00:00Z");
    expect(planPeriodEnd("monthly", now).getTime() - now.getTime()).toBe(30 * 24 * 60 * 60 * 1000);
  });
});
