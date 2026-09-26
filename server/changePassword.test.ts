import { randomBytes, scryptSync } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Tek kullanıcılı sahte DB: yalnızca passwordHash okunur/yazılır.
let storedHash: string | null = null;
const fakeDb = {
  select: () => ({ from: () => ({ where: () => ({ limit: async () => (storedHash === undefined ? [] : [{ passwordHash: storedHash }]) }) }) }),
  update: () => ({ set: (patch: { passwordHash: string }) => ({ where: async () => { storedHash = patch.passwordHash; } }) }),
};
vi.mock("./db", () => ({ getDb: vi.fn(async () => fakeDb) }));

const { changeLocalPassword, PasswordChangeError } = await import("./_core/localAuth");

// Girişteki hashPassword ile aynı "salt:hash" biçimi.
const hash = (password: string) => { const salt = randomBytes(16).toString("hex"); return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`; };

beforeEach(() => { storedHash = hash("ykskoc2027"); });

describe("changeLocalPassword", () => {
  it("rejects a wrong current password and leaves the hash untouched", async () => {
    const before = storedHash;
    await expect(changeLocalPassword(1, "yanlis-sifre", "YeniSifre123")).rejects.toThrow("Mevcut şifre hatalı.");
    expect(storedHash).toBe(before);
  });

  it("enforces a minimum length and a different new password", async () => {
    await expect(changeLocalPassword(1, "ykskoc2027", "kisa")).rejects.toBeInstanceOf(PasswordChangeError);
    await expect(changeLocalPassword(1, "ykskoc2027", "ykskoc2027")).rejects.toThrow("aynı olamaz");
  });

  it("stores a new salted hash: the old password stops working, the new one works", async () => {
    await changeLocalPassword(1, "ykskoc2027", "YeniSifre123");
    expect(storedHash).not.toContain("YeniSifre123");
    await expect(changeLocalPassword(1, "ykskoc2027", "BaskaSifre456")).rejects.toThrow("Mevcut şifre hatalı.");
    await expect(changeLocalPassword(1, "YeniSifre123", "BaskaSifre456")).resolves.toBeUndefined();
  });

  it("refuses accounts that do not sign in with a password (e.g. legacy name-only accounts)", async () => {
    storedHash = null;
    await expect(changeLocalPassword(1, "x", "YeniSifre123")).rejects.toThrow("şifreyle giriş yapmıyor");
  });
});
