import { describe, expect, it } from "vitest";
import { isAdminLogin, parseIdentifier, phoneFromOpenId } from "./_core/loginIdentifier";

describe("isAdminLogin / phoneFromOpenId", () => {
  const adminLogins = ["Admin@Ornek.com", "0555 111 22 33"];

  it("matches ADMIN_LOGINS regardless of how the e-mail/phone is spelled", () => {
    expect(isAdminLogin(parseIdentifier("admin@ornek.com")!.openId, adminLogins)).toBe(true);
    expect(isAdminLogin(parseIdentifier("+90 555 111 2233")!.openId, adminLogins)).toBe(true);
    expect(isAdminLogin(parseIdentifier("ogrenci@ornek.com")!.openId, adminLogins)).toBe(false);
  });

  it("never grants admin to a legacy name-only account", () => {
    expect(isAdminLogin(parseIdentifier("Admin")!.openId, ["Admin"])).toBe(false);
  });

  it("reads the phone back out of a phone-account openId", () => {
    expect(phoneFromOpenId("dev_phone_905551112233")).toBe("+905551112233");
    expect(phoneFromOpenId(parseIdentifier("a@b.co")!.openId)).toBeNull();
  });
});

describe("parseIdentifier", () => {
  it("normalizes e-mail case and hashes it into a short openId", () => {
    const a = parseIdentifier("  Ece@Ornek.com ");
    const b = parseIdentifier("ece@ornek.com");
    expect(a?.kind).toBe("email");
    expect(a?.value).toBe("ece@ornek.com");
    expect(a?.openId).toBe(b?.openId);
    expect(a!.openId.length).toBeLessThanOrEqual(64);
  });

  it("maps every common Turkish phone spelling to the same account", () => {
    const spellings = ["0555 123 45 67", "5551234567", "+90 (555) 123-45-67", "905551234567"];
    const ids = spellings.map((s) => parseIdentifier(s));
    for (const id of ids) {
      expect(id?.kind).toBe("phone");
      expect(id?.openId).toBe("dev_phone_905551234567");
    }
  });

  it("rejects malformed e-mails and too-short numbers", () => {
    expect(parseIdentifier("ece@")).toBeNull();
    expect(parseIdentifier("12345")).toBeNull();
    expect(parseIdentifier("   ")).toBeNull();
  });

  it("keeps pre-existing name-only accounts reachable", () => {
    expect(parseIdentifier("Ece Yılmaz")).toEqual({ kind: "legacyName", value: "Ece Yılmaz", openId: "dev_local_ece-yilmaz" });
  });
});
