import { SignJWT, jwtVerify } from "jose";
import { ENV } from "../_core/env";

/**
 * Haftalık özet maillerindeki "Almak istemiyorum" bağlantısının jetonu. Süresiz (eski
 * maillerdeki bağlantı da çalışmalı); `JWT_SECRET` ile imzalı, ayrı bir `audience` taşıdığı
 * için oturum ya da e-posta doğrulama jetonu yerine kullanılamaz.
 *  - student: `sub` = kullanıcı id'si (student_profiles.weeklyDigestOptOut)
 *  - staff:   `sub` = kurum üyeliği id'si (organization_members.weeklyDigestOptOut)
 */
export type DigestKind = "student" | "staff";

const AUDIENCE = "weekly-digest-unsubscribe";
const secretKey = () => new TextEncoder().encode(ENV.cookieSecret);

export async function createUnsubscribeToken(kind: DigestKind, id: number) {
  return new SignJWT({ k: kind }).setProtectedHeader({ alg: "HS256" }).setSubject(String(id)).setAudience(AUDIENCE).setIssuedAt().sign(secretKey());
}

export const unsubscribeUrlFor = async (appUrl: string, kind: DigestKind, id: number) =>
  `${appUrl}/api/email/weekly-digest/unsubscribe?token=${encodeURIComponent(await createUnsubscribeToken(kind, id))}`;

export async function readUnsubscribeToken(token: string): Promise<{ kind: DigestKind; id: number } | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { audience: AUDIENCE, algorithms: ["HS256"] });
    const id = Number(payload.sub);
    if (!Number.isInteger(id) || id <= 0) return null;
    return { kind: payload.k === "staff" ? "staff" : "student", id };
  } catch {
    return null;
  }
}
