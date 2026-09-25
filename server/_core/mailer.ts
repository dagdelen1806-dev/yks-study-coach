import { ENV } from "./env";

export type OutgoingMail = { to: string; subject: string; html: string; text: string };

export class MailNotConfiguredError extends Error {
  constructor(detail = "") {
    super(`MAIL_NOT_CONFIGURED${detail ? `: ${detail}` : ""}`);
    this.name = "MailNotConfiguredError";
  }
}

/** `MAIL_FROM`'u ("Pusula YKS <adres@ornek.com>" ya da yalnızca adres) ad + adres olarak ayırır. */
export function parseMailFrom(value: string): { name?: string; email: string } | null {
  const trimmed = value.trim();
  const withName = trimmed.match(/^(.*?)\s*<\s*([^<>\s]+@[^<>\s]+)\s*>$/);
  if (withName) return { ...(withName[1].trim() ? { name: withName[1].trim().replace(/^"|"$/g, "") } : {}), email: withName[2] };
  return /^[^\s@<>]+@[^\s@<>]+$/.test(trimmed) ? { email: trimmed } : null;
}

// Yanıt gövdesi yalnızca sağlayıcının hata açıklamasını içerir (token değil).
async function assertOk(provider: string, response: Response) {
  if (response.ok) return;
  const detail = await response.text().catch(() => "");
  throw new Error(`${provider} send failed (${response.status}): ${detail.slice(0, 300)}`);
}

/** Brevo: alan adı olmadan, doğrulanmış tek bir gönderen adresiyle (ör. bir
 * Gmail adresi) herkese gönderebilir — kendi alan adı olmayan kurulum için. */
async function sendWithBrevo(mail: OutgoingMail) {
  const sender = parseMailFrom(ENV.mailFrom);
  if (!sender) throw new MailNotConfiguredError("MAIL_FROM must be Brevo's verified sender, e.g. Pusula YKS <ben@gmail.com>");
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": ENV.brevoApiKey, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ sender, to: [{ email: mail.to }], subject: mail.subject, htmlContent: mail.html, textContent: mail.text }),
  });
  await assertOk("Brevo", response);
}

/** Resend: gönderen alan adının Resend'de doğrulanmış olmasını ister;
 * `onboarding@resend.dev` yalnızca Resend hesabı sahibinin adresine gönderir. */
async function sendWithResend(mail: OutgoingMail) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${ENV.resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: ENV.mailFrom || "Pusula YKS <onboarding@resend.dev>", to: [mail.to], subject: mail.subject, html: mail.html, text: mail.text }),
  });
  await assertOk("Resend", response);
}

/**
 * Sağlayıcıdan bağımsız tek gönderim noktası (yeni paket yok — düz `fetch`).
 * Sağlayıcı, hangi API anahtarı tanımlıysa ona göre seçilir; ikisi birden
 * varsa Brevo öncelikli.
 *
 * Hiçbir anahtar yoksa:
 *  - development: mail gönderilmez, içerik (doğrulama linki dahil) sunucu
 *    konsoluna yazılır — yerelde gerçek mail servisi gerekmeden test için.
 *  - production: `MailNotConfiguredError` fırlatılır; link/token asla loglanmaz.
 */
export async function sendMail(mail: OutgoingMail): Promise<void> {
  if (ENV.brevoApiKey) return sendWithBrevo(mail);
  if (ENV.resendApiKey) return sendWithResend(mail);
  if (ENV.isProduction) throw new MailNotConfiguredError("set BREVO_API_KEY or RESEND_API_KEY");
  console.info(`[Mail:dev] To: ${mail.to}\nSubject: ${mail.subject}\n\n${mail.text}`);
}
