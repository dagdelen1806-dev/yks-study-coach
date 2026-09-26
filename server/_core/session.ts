import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

/**
 * Oturum: e-posta/telefon + şifre ile giriş (server/_core/localAuth.ts) başarılı
 * olunca JWT_SECRET ile imzalanmış bir HS256 çerezi verilir; her istekte bu
 * çerez doğrulanıp kullanıcı veritabanından okunur. Dış bir kimlik sağlayıcısı yok.
 */

export type SessionPayload = { openId: string; name: string };

// Eski oturum çerezlerinde bir `appId` alanı da vardı; artık kullanılmıyor ama
// o çerezler geçerli kalsın diye doğrulamada zorunlu tutulmuyor.
const SESSION_ISSUER_TAG = "pusula";

const isNonEmptyString = (value: unknown): value is string => typeof value === "string" && value.length > 0;
const secretKey = () => new TextEncoder().encode(ENV.cookieSecret);

export async function createSessionToken(openId: string, options: { expiresInMs?: number; name?: string } = {}): Promise<string> {
  const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
  return new SignJWT({ openId, appId: SESSION_ISSUER_TAG, name: options.name || "" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(Math.floor((Date.now() + expiresInMs) / 1000))
    .sign(secretKey());
}

export async function verifySession(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    const { openId, name } = payload as Record<string, unknown>;
    if (!isNonEmptyString(openId) || !isNonEmptyString(name)) return null;
    return { openId, name };
  } catch {
    return null;
  }
}

function readSessionToken(req: Request): string | undefined {
  const fromCookie = req.headers.cookie ? parseCookieHeader(req.headers.cookie)[COOKIE_NAME] : undefined;
  if (fromCookie) return fromCookie;
  // Çerezi engelleyen gömülü tarayıcılar (WebView) için Authorization başlığı da kabul edilir.
  const header = req.headers.authorization;
  return typeof header === "string" && header.startsWith("Bearer ") ? header.slice(7) : undefined;
}

export async function authenticateRequest(req: Request): Promise<User> {
  const session = await verifySession(readSessionToken(req));
  if (!session) throw ForbiddenError("Invalid session cookie");
  const user = await db.getUserByOpenId(session.openId);
  if (!user) throw ForbiddenError("User not found");
  await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });
  return user;
}

export const sessions = { createSessionToken, verifySession, authenticateRequest };
