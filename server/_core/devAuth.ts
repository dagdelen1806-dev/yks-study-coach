import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import type { Express, Request, Response } from "express";
import { users } from "../../drizzle/schema";
import { getDb } from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sendVerificationEmail } from "./emailVerification";
import { ENV } from "./env";
import { isAdminLogin, parseIdentifier } from "./loginIdentifier";
import { sdk } from "./sdk";

const SCRYPT_KEY_LENGTH = 64;

// No new dependency for this — Node's built-in `crypto.scrypt` is a proper
// password-hashing KDF (salted, slow-by-design), same category as
// bcrypt/argon2, without adding a package for a local-only auth path.
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, SCRYPT_KEY_LENGTH).toString("hex");
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const keyBuffer = Buffer.from(key, "hex");
  const derived = scryptSync(password, salt, SCRYPT_KEY_LENGTH);
  if (keyBuffer.length !== derived.length) return false;
  return timingSafeEqual(keyBuffer, derived);
}

/**
 * Local-only sign-in (e-mail or phone + password), used instead of real
 * Manus OAuth when this project runs standalone (no `VITE_APP_ID`/OAuth
 * portal available — see `client/src/const.ts`'s `startLogin` fallback).
 *
 * "Kayıt ol" registers a new account for that e-mail/phone (plus a display
 * name) and sets its password; every later sign-in must give the matching
 * password. Accounts created before this change were keyed by name only —
 * typing that name on the "Giriş yap" tab still opens them (see
 * `parseIdentifier`).
 *
 * Development'ta hep açık; production'da yalnızca `ALLOW_LOCAL_AUTH=true`
 * bilerek set edilmişse açık (bkz. server/_core/env.ts — bağımsız/Manus dışı
 * deploy'larda gerçek OAuth olmadığı için bu, o deploy'un tek giriş yolu).
 */
export function registerDevAuthRoutes(app: Express) {
  if (!ENV.allowLocalAuth) return;

  app.post("/api/dev-login", async (req: Request, res: Response) => {
    try {
      const rawIdentifier = typeof req.body?.identifier === "string" ? req.body.identifier : "";
      const rawName = typeof req.body?.name === "string" ? req.body.name.trim().slice(0, 120) : "";
      const password = typeof req.body?.password === "string" ? req.body.password : "";
      // "login" | "register" — giriş sayfasındaki iki ayrı sekmeye karşılık gelir.
      const mode = req.body?.mode === "register" ? "register" : "login";
      if (!rawIdentifier.trim()) { res.status(400).json({ error: "E-posta adresini veya telefon numaranı yazmalısın." }); return; }
      if (password.length < 4) { res.status(400).json({ error: "Şifre en az 4 karakter olmalı." }); return; }

      const identifier = parseIdentifier(rawIdentifier);
      if (!identifier || (mode === "register" && identifier.kind === "legacyName")) {
        res.status(400).json({ error: "Geçerli bir e-posta adresi (ör. ece@ornek.com) ya da telefon numarası (ör. 0555 123 45 67) yaz." });
        return;
      }
      if (mode === "register" && !rawName) { res.status(400).json({ error: "Adını yazmalısın." }); return; }

      const db = await getDb();
      if (!db) { res.status(503).json({ error: "Veritabanı bağlantısı yok." }); return; }

      const { openId } = identifier;
      const existing = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
      const identifierLabel = identifier.kind === "phone" ? "telefon numarası" : "e-posta adresi";

      if (mode === "register" && existing[0]) {
        res.status(409).json({ error: `Bu ${identifierLabel} zaten kayıtlı. "Giriş yap" sekmesini kullanır mısın?` });
        return;
      }
      if (mode === "login" && !existing[0]) {
        res.status(404).json({ error: `Bu ${identifierLabel} ile bir hesap bulunamadı. Önce "Kayıt ol" sekmesinden hesap oluştur.` });
        return;
      }

      // `ADMIN_LOGINS`'teki hesap onay beklemeden admin olur; şifre kontrolü
      // aşağıda her zamanki gibi yapılır, yani yetki yalnızca doğru şifreyle gelir.
      // E-posta hesabında ayrıca adres doğrulanmış olmalı — aksi halde adresi
      // bilen biri senden önce kayıt olup admin olabilirdi. Doğrulanmamışsa
      // yetki, doğrulama anında verilir (bkz. emailVerification.ts verifyEmailToken).
      const grantAdmin = isAdminLogin(openId) && (identifier.kind === "phone" || Boolean(existing[0]?.emailVerifiedAt));

      let displayName = rawName;
      if (existing[0]) {
        if (!existing[0].passwordHash || !verifyPassword(password, existing[0].passwordHash)) {
          res.status(401).json({ error: "E-posta/telefon veya şifre hatalı." });
          return;
        }
        displayName = existing[0].name ?? identifier.value;
        await db
          .update(users)
          .set({ lastSignedIn: new Date(), ...(grantAdmin ? { role: "admin" as const, approvalStatus: "approved" as const, approvedAt: existing[0].approvedAt ?? new Date() } : {}) })
          .where(eq(users.id, existing[0].id));
      } else {
        // Yeni hesap her zaman onay bekler (bkz. drizzle/schema.ts users.approvalStatus
        // yorumu) — sütun varsayılanı mevcut hesapları etkilemesin diye "approved",
        // ama burada YENİ kayıt olduğu için bilerek "pending" veriyoruz.
        await db.insert(users).values({
          openId,
          name: rawName,
          email: identifier.kind === "email" ? identifier.value : null,
          loginMethod: identifier.kind === "phone" ? "dev_phone" : "dev_email",
          passwordHash: hashPassword(password),
          ...(grantAdmin ? { role: "admin" as const, approvalStatus: "approved" as const, approvedAt: new Date() } : { approvalStatus: "pending" as const }),
          lastSignedIn: new Date(),
        });
      }

      const sessionToken = await sdk.createSessionToken(openId, { name: displayName, expiresInMs: ONE_YEAR_MS });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // Yeni e-posta hesabına doğrulama maili. Gönderim başarısız olsa bile kayıt
      // geçerli kalır — "E-postanı doğrula" ekranındaki "Tekrar gönder" telafi eder.
      let verificationMailSent = false;
      if (!existing[0] && identifier.kind === "email") {
        const [created] = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
        if (created) {
          verificationMailSent = await sendVerificationEmail(created, req)
            .then((outcome) => outcome.status === "sent")
            .catch((error) => {
              console.error("[DevAuth] Verification mail failed:", error instanceof Error ? error.message : error);
              return false;
            });
        }
      }
      res.json({ success: true, name: displayName, isNewAccount: !existing[0], verificationMailSent });
    } catch (error) {
      console.error("[DevAuth] Local sign-in failed:", error);
      res.status(500).json({ error: "Giriş yapılamadı, tekrar dener misin?" });
    }
  });
}
