import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import type { Express, Request, Response } from "express";
import { users } from "../../drizzle/schema";
import { getDb } from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { sdk } from "./sdk";

const DEV_OPEN_ID_PREFIX = "dev_local_";
const SCRYPT_KEY_LENGTH = 64;

const slugifyName = (value: string) =>
  value
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

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
 * Local-only sign-in (name + password), used instead of real Manus OAuth
 * when this project runs standalone (no `VITE_APP_ID`/OAuth portal
 * available — see `client/src/const.ts`'s `startLogin` fallback).
 *
 * First sign-in with a given name registers a new account and sets its
 * password; every later sign-in with that name must give the matching
 * password — so one student's account can't be opened by typing someone
 * else's name, and logout (spec below) actually sticks instead of the app
 * silently re-entering a shared "test" account.
 *
 * Hard-disabled outside development — never reachable in a real deployment.
 */
export function registerDevAuthRoutes(app: Express) {
  if (ENV.isProduction) return;

  app.post("/api/dev-login", async (req: Request, res: Response) => {
    try {
      const rawName = typeof req.body?.name === "string" ? req.body.name.trim().slice(0, 120) : "";
      const password = typeof req.body?.password === "string" ? req.body.password : "";
      // "login" | "register" — giriş sayfasındaki iki ayrı sekmeye karşılık
      // gelir. Eksikse (eski client) geriye dönük olarak eski "var mı kontrol
      // et, yoksa oluştur" davranışına düşer.
      const mode = req.body?.mode === "register" ? "register" : req.body?.mode === "login" ? "login" : null;
      if (!rawName) { res.status(400).json({ error: "Adını yazmalısın." }); return; }
      if (password.length < 4) { res.status(400).json({ error: "Şifre en az 4 karakter olmalı." }); return; }

      const db = await getDb();
      if (!db) { res.status(503).json({ error: "Veritabanı bağlantısı yok." }); return; }

      const openId = `${DEV_OPEN_ID_PREFIX}${slugifyName(rawName) || "ogrenci"}`;
      const existing = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

      if (mode === "register" && existing[0]) {
        res.status(409).json({ error: "Bu isim zaten kayıtlı. \"Giriş yap\" sekmesini kullanır mısın?" });
        return;
      }
      if (mode === "login" && !existing[0]) {
        res.status(404).json({ error: "Bu isimde bir hesap bulunamadı. Önce \"Kayıt ol\" sekmesinden hesap oluştur." });
        return;
      }

      if (existing[0]) {
        if (!existing[0].passwordHash || !verifyPassword(password, existing[0].passwordHash)) {
          res.status(401).json({ error: "Ad veya şifre hatalı." });
          return;
        }
        await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, existing[0].id));
      } else {
        // Yeni hesap her zaman onay bekler (bkz. drizzle/schema.ts users.approvalStatus
        // yorumu) — sütun varsayılanı mevcut hesapları etkilemesin diye "approved",
        // ama burada YENİ kayıt olduğu için bilerek "pending" veriyoruz.
        await db.insert(users).values({ openId, name: rawName, email: null, loginMethod: "dev", passwordHash: hashPassword(password), approvalStatus: "pending", lastSignedIn: new Date() });
      }

      const sessionToken = await sdk.createSessionToken(openId, { name: rawName, expiresInMs: ONE_YEAR_MS });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.json({ success: true, name: rawName, isNewAccount: !existing[0] });
    } catch (error) {
      console.error("[DevAuth] Local sign-in failed:", error);
      res.status(500).json({ error: "Giriş yapılamadı, tekrar dener misin?" });
    }
  });
}
