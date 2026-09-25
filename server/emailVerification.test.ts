import { SignJWT } from "jose";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "../drizzle/schema";

process.env.JWT_SECRET = "test-secret-for-email-verification";

// Tek kullanıcılı, bellek-içi sahte DB: `select…limit` o kullanıcıyı döner,
// `update().set(patch)` onu yamalar. Doğrulama akışı yalnızca bu iki
// işlemi kullanıyor; gerçek sorgu koşulları burada değil, akışın mantığı test ediliyor.
let storedUser: User | null = null;
const fakeDb = {
  select: () => ({ from: () => ({ where: () => ({ limit: async () => (storedUser ? [storedUser] : []) }) }) }),
  update: () => ({ set: (patch: Partial<User>) => ({ where: async () => { if (storedUser) storedUser = { ...storedUser, ...patch }; } }) }),
};
vi.mock("./db", () => ({ getDb: vi.fn(async () => fakeDb) }));

const sentMails: { to: string; subject: string; html: string; text: string }[] = [];
vi.mock("./_core/mailer", () => ({ sendMail: vi.fn(async (mail: (typeof sentMails)[number]) => { sentMails.push(mail); }) }));

const { createVerificationToken, readVerificationToken, verifyEmailToken, sendVerificationEmail, appBaseUrl } = await import("./_core/emailVerification");
const { ENV } = await import("./_core/env");
const { parseIdentifier } = await import("./_core/loginIdentifier");
const { sdk } = await import("./_core/sdk");
const { buildVerifyEmail } = await import("./_core/emails/verifyEmail");
const { EMAIL_VERIFICATION_RESEND_COOLDOWN_MS } = await import("@shared/const");

const req = { protocol: "https", headers: { host: "app.test" } };

function makeEmailUser(overrides: Partial<User> = {}): User {
  const email = overrides.email ?? "ece@ornek.com";
  return {
    id: 7,
    openId: parseIdentifier(email)!.openId,
    email,
    name: "Ece",
    loginMethod: "dev_email",
    passwordHash: "x",
    emailVerifiedAt: null,
    emailVerificationSentAt: null,
    role: "user",
    approvalStatus: "pending",
    approvedAt: null,
    approvedBy: null,
    rejectedAt: null,
    rejectionReason: null,
    accountStatus: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  } as User;
}

beforeEach(() => {
  storedUser = null;
  sentMails.length = 0;
  ENV.adminLogins = [];
  ENV.appUrl = "";
});

describe("verification token", () => {
  it("valid token round-trips to the user id and e-mail", async () => {
    const token = await createVerificationToken({ id: 7, email: "ece@ornek.com" });
    expect(await readVerificationToken(token)).toEqual({ status: "valid", userId: 7, email: "ece@ornek.com" });
  });

  it("rejects a tampered signature", async () => {
    const token = await createVerificationToken({ id: 7, email: "ece@ornek.com" });
    const [header, payload, signature] = token.split(".");
    const tampered = `${header}.${payload}.${signature.slice(0, -2)}${signature.endsWith("AA") ? "BB" : "AA"}`;
    expect((await readVerificationToken(tampered)).status).toBe("invalid");
  });

  it("rejects a payload signed with another secret (e.g. forged uid)", async () => {
    const forged = await new SignJWT({ purpose: "email_verify", uid: 1, email: "ece@ornek.com" })
      .setProtectedHeader({ alg: "HS256" }).setAudience("email-verify").setExpirationTime("1h")
      .sign(new TextEncoder().encode("attacker-secret"));
    expect((await readVerificationToken(forged)).status).toBe("invalid");
  });

  it("reports an expired link as expired", async () => {
    const token = await createVerificationToken({ id: 7, email: "ece@ornek.com" }, -60_000);
    expect((await readVerificationToken(token)).status).toBe("expired");
  });

  it("a session token can never be used as a verification token", async () => {
    const session = await sdk.createSessionToken("dev_email_abc", { name: "Ece" });
    expect((await readVerificationToken(session)).status).toBe("invalid");
  });

  it("a verification token can never be used as a session", async () => {
    const token = await createVerificationToken({ id: 7, email: "ece@ornek.com" });
    expect(await sdk.verifySession(token)).toBeNull();
  });
});

describe("verifyEmailToken", () => {
  it("valid link verifies the user", async () => {
    storedUser = makeEmailUser();
    const token = await createVerificationToken(storedUser);
    expect(await verifyEmailToken(token)).toBe("success");
    expect(storedUser.emailVerifiedAt).toBeInstanceOf(Date);
    expect(storedUser.role).toBe("user");
  });

  it("already verified user gets 'already' and nothing changes", async () => {
    const verifiedAt = new Date("2026-01-01");
    storedUser = makeEmailUser({ emailVerifiedAt: verifiedAt });
    expect(await verifyEmailToken(await createVerificationToken(storedUser))).toBe("already");
    expect(storedUser.emailVerifiedAt).toBe(verifiedAt);
  });

  it("a link issued for another user/e-mail cannot verify this account", async () => {
    storedUser = makeEmailUser({ email: "yeni@ornek.com" });
    const oldLink = await createVerificationToken({ id: storedUser.id, email: "eski@ornek.com" });
    expect(await verifyEmailToken(oldLink)).toBe("invalid");
    expect(storedUser.emailVerifiedAt).toBeNull();
  });

  it("expired link fails without verifying", async () => {
    storedUser = makeEmailUser();
    expect(await verifyEmailToken(await createVerificationToken(storedUser, -1000))).toBe("expired");
    expect(storedUser.emailVerifiedAt).toBeNull();
  });

  it("grants admin only once an ADMIN_LOGINS e-mail is verified", async () => {
    ENV.adminLogins = ["ece@ornek.com"];
    storedUser = makeEmailUser();
    expect(await verifyEmailToken(await createVerificationToken(storedUser))).toBe("success");
    expect(storedUser).toMatchObject({ role: "admin", approvalStatus: "approved" });
  });
});

describe("sendVerificationEmail", () => {
  it("sends a mail containing a signed link for an unverified user", async () => {
    storedUser = makeEmailUser();
    expect(await sendVerificationEmail(storedUser, req)).toEqual({ status: "sent" });
    expect(sentMails).toHaveLength(1);
    expect(sentMails[0].to).toBe("ece@ornek.com");
    const link = sentMails[0].text.match(/https:\/\/app\.test\/api\/email\/verify\?token=(\S+)/);
    expect(link).not.toBeNull();
    expect((await readVerificationToken(decodeURIComponent(link![1]))).status).toBe("valid");
    expect(storedUser.emailVerificationSentAt).toBeInstanceOf(Date);
  });

  it("enforces the 60 s cooldown server-side", async () => {
    storedUser = makeEmailUser({ id: 8, emailVerificationSentAt: new Date(Date.now() - 10_000) });
    const outcome = await sendVerificationEmail(storedUser, req);
    expect(outcome.status).toBe("cooldown");
    expect(outcome.status === "cooldown" && outcome.retryAfterMs).toBeGreaterThan(EMAIL_VERIFICATION_RESEND_COOLDOWN_MS - 11_000);
    expect(sentMails).toHaveLength(0);
  });

  it("caps resends per hour even after each cooldown passes", async () => {
    storedUser = makeEmailUser({ id: 9 });
    const results = [];
    for (let i = 0; i < 6; i++) {
      storedUser = { ...storedUser!, emailVerificationSentAt: null };
      results.push((await sendVerificationEmail(storedUser, req)).status);
    }
    expect(results.slice(0, 5)).toEqual(["sent", "sent", "sent", "sent", "sent"]);
    expect(results[5]).toBe("cooldown");
  });

  it("does not send to an already verified user", async () => {
    storedUser = makeEmailUser({ id: 10, emailVerifiedAt: new Date() });
    expect(await sendVerificationEmail(storedUser, req)).toEqual({ status: "already_verified" });
    expect(sentMails).toHaveLength(0);
  });

  it("phone accounts never need e-mail verification", async () => {
    storedUser = makeEmailUser({ id: 11, loginMethod: "dev_phone", email: null, openId: "dev_phone_905551112233" });
    expect(await sendVerificationEmail(storedUser, req)).toEqual({ status: "not_required" });
  });

  it("builds links from APP_URL when set, not from the Host header", () => {
    ENV.appUrl = "https://yks-study-coach.vercel.app";
    expect(appBaseUrl({ protocol: "http", headers: { host: "evil.example" } })).toBe("https://yks-study-coach.vercel.app");
  });
});

describe("verification e-mail template", () => {
  it("escapes user-controlled values in the HTML part", () => {
    const mail = buildVerifyEmail({ to: "a@b.co", name: "<script>x</script>", verifyUrl: "https://app.test/api/email/verify?token=t", expiresInMinutes: 60 });
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).toContain("E-postamı Doğrula");
    expect(mail.text).toContain("60 dakika");
  });
});
