import { describe, expect, it } from "vitest";
import { computeQuoteTotals, quoteNumber } from "../shared/orgQuote";
import { renewedMembershipEnd } from "../shared/org";
import { companyInfoSchema, formatIban } from "../shared/platformCompany";

describe("şirket bilgileri", () => {
  it("IBAN boşluksuz büyük harfe çevrilir ve dörtlü yazılır; hatalı vergi no / IBAN reddedilir; boş alanlar serbest", () => {
    const info = companyInfoSchema.parse({ legalName: "Örnek Ltd. Şti.", iban: "tr12 0006 2000 0000 0000 0000 01", taxNumber: "1234567890" });
    expect(info.iban).toBe("TR120006200000000000000001");
    expect(formatIban(info.iban)).toBe("TR12 0006 2000 0000 0000 0000 01");
    expect(info.address).toBe("");
    expect(companyInfoSchema.safeParse({ taxNumber: "12345" }).success).toBe(false);
    expect(companyInfoSchema.safeParse({ iban: "DE89370400440532013000" }).success).toBe(false);
    expect(companyInfoSchema.safeParse({}).success).toBe(true);
  });
});

describe("kurumsal fiyat teklifi hesabı", () => {
  it("indirim ara toplama, KDV indirimli tutara uygulanır", () => {
    expect(computeQuoteTotals([{ description: "Standart — aylık", quantity: 12, unitPriceTry: 1000 }, { description: "Kurulum", quantity: 1, unitPriceTry: 500 }], 10, 20))
      .toEqual({ subtotal: 12_500, discount: 1250, net: 11_250, vat: 2250, total: 13_500 });
  });

  it("kuruşlar yuvarlanır; indirim %0–100 aralığında tutulur", () => {
    expect(computeQuoteTotals([{ description: "x", quantity: 1, unitPriceTry: 999 }], 15, 20)).toEqual({ subtotal: 999, discount: 150, net: 849, vat: 170, total: 1019 });
    expect(computeQuoteTotals([{ description: "x", quantity: 2, unitPriceTry: 100 }], 150, 0).total).toBe(0);
  });

  it("teklif numarası yıl ve sıfır dolgulu kimlik taşır", () => {
    expect(quoteNumber(7, new Date("2026-10-23T10:00:00"))).toBe("T-2026-0007");
  });

  it("süre uzatma ay sayısıyla yapılır; bitmemiş üyelikte bitişin üstüne eklenir", () => {
    const now = new Date("2026-10-23T10:00:00");
    expect(renewedMembershipEnd(null, now, 6).toISOString()).toBe(new Date("2027-04-23T10:00:00").toISOString());
    expect(renewedMembershipEnd(new Date("2027-01-01T00:00:00"), now, 12).toISOString()).toBe(new Date("2028-01-01T00:00:00").toISOString());
    expect(renewedMembershipEnd(null, now).toISOString()).toBe(new Date("2027-10-23T10:00:00").toISOString());
  });
});
