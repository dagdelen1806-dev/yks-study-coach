import { COOKIE_NAME, EMAIL_VERIFICATION_RESEND_COOLDOWN_MS, EMAIL_VERIFICATION_TOKEN_TTL_MS, ONE_YEAR_MS } from "@shared/const";
import { eq } from "drizzle-orm";
import type { Express, Request } from "express";
import { SignJWT, errors as joseErrors, jwtVerify } from "jose";
import { users, type User } from "../../drizzle/schema";
import { getDb } from "../db";
import { getSessionCookieOptions } from "./cookies";
import { buildVerifyEmail } from "./emails/verifyEmail";
import { ENV } from "./env";
import { isAdminLogin, parseIdentifier } from "./loginIdentifier";
import { sendMail } from "./mailer";
import { RateLimitExceededError, checkRateLimit } from "./rateLimit";
import { authenticateRequest, createSessionToken } from "./session";

/**
 * E-posta doğrulaması — Laravel'in "signed + expiring URL" modelinin bu
 * projedeki karşılığı:
 *
 *  - Link, `JWT_SECRET` ile HS256 imzalı, `EMAIL_VERIFICATION_TOKEN_TTL_MS`
 *    sonra düşen bir jeton taşır. Jeton kullanıcı id'sine VE o anki e-posta
 *    adresine bağlıdır: başka bir hesabı doğrulayamaz, adres değişirse eski
 *    link geçersizleşir.
 *  - `audience` + `purpose` alanları sayesinde oturum jetonu doğrulama jetonu
 *    yerine (ya da tersi) kullanılamaz — oturum doğrulaması (session.ts verifySession)
 *    zaten openId/appId/name ister, bu jetonda hiçbiri yok.
 *  - Link oturum GEREKTİRMEZ: öğrenci maili telefonda açıp bilgisayarda giriş
 *    yapmış olabilir. Güvenliği jetonun imzası sağlar, oturum değil.
 */

const TOKEN_AUDIENCE = "email-verify";
const TOKEN_PURPOSE = "email_verify";
// Bellek-içi, instance başına ek tavan — asıl 60 sn'lik bekleme DB'deki
// `emailVerificationSentAt` ile her instance'ta tutarlı uygulanır.
const RESEND_HOURLY_MAX = 5;

const secretKey = () => new TextEncoder().encode(ENV.cookieSecret);

export async function createVerificationToken(user: Pick<User, "id" | "email">, ttlMs = EMAIL_VERIFICATION_TOKEN_TTL_MS): Promise<string> {
  return new SignJWT({ purpose: TOKEN_PURPOSE, uid: user.id, email: user.email })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setAudience(TOKEN_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(Math.floor((Date.now() + ttlMs) / 1000))
    .sign(secretKey());
}

export type TokenCheck = { status: "valid"; userId: number; email: string } | { status: "expired" } | { status: "invalid" };

export async function readVerificationToken(token: string): Promise<TokenCheck> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"], audience: TOKEN_AUDIENCE });
    if (payload.purpose !== TOKEN_PURPOSE || typeof payload.uid !== "number" || typeof payload.email !== "string") return { status: "invalid" };
    return { status: "valid", userId: payload.uid, email: payload.email };
  } catch (error) {
    return { status: error instanceof joseErrors.JWTExpired ? "expired" : "invalid" };
  }
}

export type VerifyOutcome = "success" | "already" | "expired" | "invalid";

/** Linkteki jetonu uygular. Admin yetkisi (`ADMIN_LOGINS`) e-posta hesabında
 * ancak BURADA, adresin sahipliği kanıtlandıktan sonra verilir. */
export async function verifyEmailToken(token: string): Promise<VerifyOutcome> {
  const check = await readVerificationToken(token);
  if (check.status !== "valid") return check.status;

  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [user] = await db.select().from(users).where(eq(users.id, check.userId)).limit(1);
  // Adres değişmişse (bkz. /api/email/change) eski link artık hiçbir hesaba ait değil.
  if (!user || user.loginMethod !== "dev_email" || user.email !== check.email) return "invalid";
  if (user.emailVerifiedAt) return "already";

  const grantAdmin = isAdminLogin(user.openId);
  await db
    .update(users)
    .set({ emailVerifiedAt: new Date(), ...(grantAdmin ? { role: "admin" as const, approvalStatus: "approved" as const, approvedAt: user.approvedAt ?? new Date() } : {}) })
    .where(eq(users.id, user.id));
  return "success";
}

/** Linkin kök adresi: production'da `APP_URL` (Host başlığına güvenmemek
 * için); yoksa isteğin kendi adresi (yerel geliştirme). */
export function appBaseUrl(req: Pick<Request, "protocol" | "headers">): string {
  if (ENV.appUrl) return ENV.appUrl;
  const forwardedProto = req.headers["x-forwarded-proto"];
  const proto = (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto)?.split(",")[0]?.trim() || req.protocol;
  return `${proto}://${req.headers["x-forwarded-host"] ?? req.headers.host}`;
}

export type SendOutcome = { status: "sent" } | { status: "cooldown"; retryAfterMs: number } | { status: "already_verified" } | { status: "not_required" };

/**
 * Doğrulama mailini gönderir; 60 sn bekleme DB'deki `emailVerificationSentAt`
 * üzerinden (sunucusuz ortamda da tutarlı), saatlik tavan bellek-içi.
 * Kayıt anında (`force` yok) da aynı yoldan geçer — tek gönderim noktası,
 * iki kez mail gitmesi mümkün değil.
 */
export async function sendVerificationEmail(user: User, req: Pick<Request, "protocol" | "headers">): Promise<SendOutcome> {
  if (user.loginMethod !== "dev_email" || !user.email) return { status: "not_required" };
  if (user.emailVerifiedAt) return { status: "already_verified" };

  const sinceLast = user.emailVerificationSentAt ? Date.now() - new Date(user.emailVerificationSentAt).getTime() : Infinity;
  if (sinceLast < EMAIL_VERIFICATION_RESEND_COOLDOWN_MS) return { status: "cooldown", retryAfterMs: EMAIL_VERIFICATION_RESEND_COOLDOWN_MS - sinceLast };
  try {
    checkRateLimit(`email-verify:${user.id}`, RESEND_HOURLY_MAX, 60 * 60 * 1000);
  } catch (error) {
    if (error instanceof RateLimitExceededError) return { status: "cooldown", retryAfterMs: error.retryAfterMs };
    throw error;
  }

  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  // Önce damgala, sonra gönder: aynı anda gelen iki istek iki mail göndermesin.
  await db.update(users).set({ emailVerificationSentAt: new Date() }).where(eq(users.id, user.id));

  try {
    const token = await createVerificationToken(user);
    const verifyUrl = `${appBaseUrl(req)}/api/email/verify?token=${encodeURIComponent(token)}`;
    await sendMail(buildVerifyEmail({ to: user.email, name: user.name, verifyUrl, expiresInMinutes: Math.round(EMAIL_VERIFICATION_TOKEN_TTL_MS / 60_000) }));
  } catch (error) {
    // Gönderilemediyse kullanıcı boşuna 60 sn beklemesin.
    await db.update(users).set({ emailVerificationSentAt: user.emailVerificationSentAt }).where(eq(users.id, user.id));
    throw error;
  }
  return { status: "sent" };
}

export function registerEmailVerificationRoutes(app: Express) {
  // Maildeki link buraya gelir; sonuç, uygulamanın kendisinde (App.tsx)
  // `?emailVerification=<sonuç>` ile gösterilir — giriş yapılmamış bir
  // cihazda açılsa bile kullanıcı anlaşılır bir mesaj görür.
  app.get("/api/email/verify", async (req, res) => {
    const token = typeof req.query.token === "string" ? req.query.token : "";
    let outcome: VerifyOutcome | "error";
    try {
      outcome = token ? await verifyEmailToken(token) : "invalid";
    } catch (error) {
      console.error("[EmailVerification] verify failed:", error instanceof Error ? error.message : error);
      outcome = "error";
    }
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.redirect(302, `${appBaseUrl(req)}/?emailVerification=${outcome}`);
  });

  // "E-posta adresimi değiştirmek istiyorum" — yalnızca henüz doğrulanmamış
  // e-posta hesabı için. openId e-postadan türediği için (loginIdentifier.ts)
  // o da değişir; oturum çerezi yeni openId ile yeniden verilir.
  app.post("/api/email/change", async (req, res) => {
    try {
      let user: User;
      try {
        user = await authenticateRequest(req);
      } catch {
        res.status(401).json({ error: "Oturumun sona ermiş. Lütfen tekrar giriş yap." });
        return;
      }
      if (user.loginMethod !== "dev_email" || user.emailVerifiedAt) {
        res.status(400).json({ error: "Doğrulanmış bir hesabın e-posta adresi buradan değiştirilemez." });
        return;
      }
      try {
        checkRateLimit(`email-change:${user.id}`, 5, 60 * 60 * 1000);
      } catch {
        res.status(429).json({ error: "Çok fazla deneme yaptın. Biraz sonra tekrar dener misin?" });
        return;
      }
      const identifier = parseIdentifier(typeof req.body?.email === "string" ? req.body.email : "");
      if (!identifier || identifier.kind !== "email") {
        res.status(400).json({ error: "Geçerli bir e-posta adresi yaz (ör. ece@ornek.com)." });
        return;
      }
      if (identifier.openId === user.openId) {
        res.status(400).json({ error: "Bu zaten kayıtlı e-posta adresin." });
        return;
      }

      const db = await getDb();
      if (!db) { res.status(503).json({ error: "Veritabanı bağlantısı yok." }); return; }
      const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.openId, identifier.openId)).limit(1);
      if (taken) {
        res.status(409).json({ error: "Bu e-posta adresi başka bir hesapta kayıtlı." });
        return;
      }

      await db.update(users).set({ openId: identifier.openId, email: identifier.value, emailVerificationSentAt: null }).where(eq(users.id, user.id));
      const updated: User = { ...user, openId: identifier.openId, email: identifier.value, emailVerificationSentAt: null };

      const sessionToken = await createSessionToken(updated.openId, { name: updated.name ?? identifier.value, expiresInMs: ONE_YEAR_MS });
      res.cookie(COOKIE_NAME, sessionToken, { ...getSessionCookieOptions(req), maxAge: ONE_YEAR_MS });

      const sent = await sendVerificationEmail(updated, req).catch((error) => {
        console.error("[EmailVerification] send after change failed:", error instanceof Error ? error.message : error);
        return null;
      });
      res.json({ success: true, email: identifier.value, mailSent: sent?.status === "sent" });
    } catch (error) {
      console.error("[EmailVerification] change failed:", error instanceof Error ? error.message : error);
      res.status(500).json({ error: "E-posta adresi değiştirilemedi, tekrar dener misin?" });
    }
  });
}
