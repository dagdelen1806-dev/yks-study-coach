import { ENV } from "./env";

export type OutgoingMail = { to: string; subject: string; html: string; text: string };

export class MailNotConfiguredError extends Error {
  constructor() {
    super("MAIL_NOT_CONFIGURED");
    this.name = "MailNotConfiguredError";
  }
}

/**
 * Sağlayıcıdan bağımsız tek gönderim noktası. Şu an Resend'in HTTP API'si
 * kullanılıyor (yeni paket yok — düz `fetch`); başka bir sağlayıcıya geçmek
 * yalnızca bu fonksiyonu değiştirmeyi gerektirir.
 *
 * `RESEND_API_KEY` yoksa:
 *  - development: mail gönderilmez, içerik (doğrulama linki dahil) sunucu
 *    konsoluna yazılır — yerelde gerçek mail servisi gerekmeden test için.
 *  - production: `MailNotConfiguredError` fırlatılır; link/token asla loglanmaz.
 */
export async function sendMail(mail: OutgoingMail): Promise<void> {
  if (!ENV.resendApiKey) {
    if (ENV.isProduction) throw new MailNotConfiguredError();
    console.info(`[Mail:dev] To: ${mail.to}\nSubject: ${mail.subject}\n\n${mail.text}`);
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${ENV.resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: ENV.mailFrom, to: [mail.to], subject: mail.subject, html: mail.html, text: mail.text }),
  });
  if (!response.ok) {
    // Yanıt gövdesi yalnızca sağlayıcının hata açıklamasını içerir (token değil).
    const detail = await response.text().catch(() => "");
    throw new Error(`Resend send failed (${response.status}): ${detail.slice(0, 300)}`);
  }
}
