import { createHash } from "node:crypto";
import { ENV } from "./env";

// Yerel girişin (server/_core/devAuth.ts) e-posta/telefon → openId eşlemesi.
// Ayrı modülde: hem giriş hem e-posta doğrulaması hem admin sorguları
// kullanıyor, devAuth ↔ emailVerification döngüsel import'u olmasın diye.

const DEV_OPEN_ID_PREFIX = "dev_local_";
const DEV_EMAIL_OPEN_ID_PREFIX = "dev_email_";
const DEV_PHONE_OPEN_ID_PREFIX = "dev_phone_";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type LoginIdentifier =
  | { kind: "email"; value: string; openId: string }
  | { kind: "phone"; value: string; openId: string }
  | { kind: "legacyName"; value: string; openId: string };

// Türkiye numaralarını tek biçime indirger (0555…, 555…, +90 555… → 90555…)
// ki aynı telefon farklı yazılınca iki ayrı hesap açılmasın.
function normalizePhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) digits = `90${digits.slice(1)}`;
  else if (digits.length === 10 && digits.startsWith("5")) digits = `90${digits}`;
  return digits.length >= 10 && digits.length <= 15 ? digits : null;
}

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

/**
 * Girişte yazılan tanımlayıcıyı (e-posta ya da telefon) çözer ve hesabın
 * `openId`'sini türetir — `users.openId` zaten unique olduğu için ayrı bir
 * sütun/migration gerekmeden aynı e-posta/telefonla ikinci hesap açılamaz.
 * E-posta 64 karakterlik `openId` sınırına sığmayabileceği için hash'lenir.
 *
 * Ne e-postaya ne telefona benzeyen girdi, bu değişiklikten önce yalnızca
 * isimle açılmış eski hesaplar için "legacyName" olarak döner; bu yalnızca
 * girişte kabul edilir, yeni kayıt artık e-posta/telefon ister.
 */
export function parseIdentifier(raw: string): LoginIdentifier | null {
  const trimmed = raw.trim().slice(0, 320);
  if (!trimmed) return null;
  if (trimmed.includes("@")) {
    const email = trimmed.toLowerCase();
    if (!EMAIL_PATTERN.test(email)) return null;
    const hash = createHash("sha256").update(email).digest("hex").slice(0, 40);
    return { kind: "email", value: email, openId: `${DEV_EMAIL_OPEN_ID_PREFIX}${hash}` };
  }
  if (/^[\d\s()+-]+$/.test(trimmed)) {
    const phone = normalizePhone(trimmed);
    if (!phone) return null;
    return { kind: "phone", value: phone, openId: `${DEV_PHONE_OPEN_ID_PREFIX}${phone}` };
  }
  const name = trimmed.slice(0, 120);
  return { kind: "legacyName", value: name, openId: `${DEV_OPEN_ID_PREFIX}${slugifyName(name) || "ogrenci"}` };
}

/** Telefonla açılmış hesabın numarası ayrı bir sütunda değil `openId`'de
 * durur; admin paneli göstermek için buradan geri okur. */
export function phoneFromOpenId(openId: string): string | null {
  return openId.startsWith(DEV_PHONE_OPEN_ID_PREFIX) ? `+${openId.slice(DEV_PHONE_OPEN_ID_PREFIX.length)}` : null;
}

/** `ADMIN_LOGINS`'te listelenen bir e-posta/telefona mı ait? İsimle açılmış
 * eski hesaplar bilerek hiç eşleşmez — admin yetkisi yalnızca e-posta/telefonla. */
export function isAdminLogin(openId: string, adminLogins: string[] = ENV.adminLogins): boolean {
  return adminLogins.some((login) => {
    const parsed = parseIdentifier(login);
    return parsed !== null && parsed.kind !== "legacyName" && parsed.openId === openId;
  });
}
