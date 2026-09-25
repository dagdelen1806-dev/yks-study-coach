import type { OutgoingMail } from "../mailer";

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

/**
 * "Hesabını doğrula" maili — tablo tabanlı, satır içi stilli HTML (mail
 * istemcileri <style>/flex/grid'i güvenilir desteklemez) + düz metin yedeği.
 * Renkler uygulamanınkiyle aynı (#1f2333 lacivert, #3b5ccc mavi, #f7f5ef zemin).
 */
export function buildVerifyEmail({ to, name, verifyUrl, expiresInMinutes }: { to: string; name: string | null; verifyUrl: string; expiresInMinutes: number }): OutgoingMail {
  const greeting = name ? `Merhaba ${name},` : "Merhaba,";
  const subject = "Pusula YKS hesabını doğrula";

  const text = [
    greeting,
    "",
    "Pusula YKS'ye hoş geldin! Hesabını kullanmaya başlamak için e-posta adresini doğrulaman gerekiyor.",
    "",
    `E-postamı doğrula: ${verifyUrl}`,
    "",
    `Bu bağlantı ${expiresInMinutes} dakika geçerlidir. Süresi dolarsa uygulamadan yeni bir doğrulama maili isteyebilirsin.`,
    "",
    "Bu hesabı sen oluşturmadıysan bu maili görmezden gelebilirsin; adresin onaysız bir hesaba bağlanmaz.",
    "",
    "— Pusula YKS · Kişisel çalışma koçu",
  ].join("\n");

  const safeUrl = escapeHtml(verifyUrl);
  const html = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f7f5ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2333;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">Hesabını kullanmaya başlamak için e-posta adresini doğrula.</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f5ef;">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
      <tr><td style="padding:0 4px 20px 4px;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="width:36px;height:36px;border-radius:10px;background:#1f2333;color:#ffffff;font-size:17px;font-weight:700;text-align:center;vertical-align:middle;">P</td>
          <td style="padding-left:10px;font-size:15px;font-weight:700;color:#1f2333;">Pusula YKS</td>
        </tr></table>
      </td></tr>
      <tr><td style="background:#ffffff;border-radius:20px;padding:32px 28px;border:1px solid #ebe8df;">
        <h1 style="margin:0 0 12px 0;font-size:21px;line-height:1.3;font-weight:700;color:#1f2333;">Hesabını doğrula</h1>
        <p style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:#4a4c57;">${escapeHtml(greeting)}</p>
        <p style="margin:0 0 24px 0;font-size:14px;line-height:1.6;color:#4a4c57;">Pusula YKS'ye hoş geldin! Hesabını kullanmaya başlamak için e-posta adresini (<strong style="color:#1f2333;">${escapeHtml(to)}</strong>) doğrulaman gerekiyor.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td align="center">
          <a href="${safeUrl}" style="display:inline-block;background:#3b5ccc;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 28px;border-radius:12px;">E-postamı Doğrula</a>
        </td></tr></table>
        <p style="margin:24px 0 0 0;font-size:12px;line-height:1.6;color:#8b8c95;">Bu bağlantı <strong>${expiresInMinutes} dakika</strong> geçerlidir. Süresi dolarsa uygulamadan yeni bir doğrulama maili isteyebilirsin.</p>
        <p style="margin:12px 0 0 0;font-size:12px;line-height:1.6;color:#8b8c95;">Buton çalışmazsa bu adresi tarayıcına yapıştır:<br><a href="${safeUrl}" style="color:#3b5ccc;word-break:break-all;">${safeUrl}</a></p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;"><tr>
          <td style="background:#f7f5ef;border-radius:12px;padding:12px 14px;font-size:12px;line-height:1.6;color:#6b6d77;">🔒 Bu hesabı sen oluşturmadıysan bu maili görmezden gelebilirsin; adresin onaysız bir hesaba bağlanmaz. Pusula YKS senden asla şifreni e-postayla istemez.</td>
        </tr></table>
      </td></tr>
      <tr><td align="center" style="padding:20px 8px 0 8px;font-size:11px;line-height:1.6;color:#9a9ba3;">Pusula YKS · Kişisel çalışma koçu<br>Bu mail, hesabın oluşturulduğu için otomatik gönderildi.</td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  return { to, subject, html, text };
}
