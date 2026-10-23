import { randomBytes, scryptSync } from "node:crypto";
import { eq } from "drizzle-orm";
import { users } from "../drizzle/schema";
import { getDb } from "../server/db";
import { parseIdentifier } from "../server/_core/loginIdentifier";

/**
 * Yalnızca yerel e2e: Yönetim Paneli testi için platform yöneticisi hesabı (platform.admin@test.local,
 * şifre test1234). Tanıtım tohumuna (scripts/seed-test-org.ts) girmez; canlı veritabanında çalışmaz.
 */
const EMAIL = "platform.admin@test.local";
if (/supabase\.(co|com)/.test(process.env.DATABASE_URL ?? "")) throw new Error("Bu test düzeneği canlı veritabanında çalıştırılamaz.");
const hashPassword = (password: string) => { const salt = randomBytes(16).toString("hex"); return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`; };

async function main() {
  const db = await getDb();
  if (!db) throw new Error("DB yok");
  const identifier = parseIdentifier(EMAIL);
  if (identifier?.kind !== "email") throw new Error("Geçersiz e-posta");
  const openId = identifier.openId;
  const values = { name: "Platform Yöneticisi", role: "admin" as const, approvalStatus: "approved" as const, emailVerifiedAt: new Date(), passwordHash: hashPassword("test1234") };
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.openId, openId)).limit(1);
  if (existing) await db.update(users).set(values).where(eq(users.id, existing.id));
  else await db.insert(users).values({ ...values, openId, email: EMAIL, loginMethod: "dev_email", approvedAt: new Date() });
  process.exit(0);
}

void main();
