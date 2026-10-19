import type { WeeklyDigest } from "@shared/weeklyDigest";
import { formatMinutes } from "@shared/yksData";
import type { OutgoingMail } from "../mailer";

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

export const rangeLabel = (start: Date, end: Date) => {
  const last = new Date(end.getTime() - 1);
  const fmt = (date: Date, withMonth: boolean) => date.toLocaleDateString("tr-TR", withMonth ? { day: "numeric", month: "long", timeZone: "Europe/Istanbul" } : { day: "numeric", timeZone: "Europe/Istanbul" });
  const sameMonth = start.toLocaleDateString("tr-TR", { month: "long", timeZone: "Europe/Istanbul" }) === last.toLocaleDateString("tr-TR", { month: "long", timeZone: "Europe/Istanbul" });
  return `${fmt(start, !sameMonth)} – ${fmt(last, true)}`;
};

/**
 * Pazar akşamı giden haftalık ilerleme özeti. verifyEmail.ts ile aynı yapı (tablo tabanlı,
 * satır içi stil + düz metin yedeği); renkler uygulamanın marka renkleri (#17625f yeşil, #f2b934 sarı).
 */
export function buildWeeklyDigestEmail({ to, name, digest, start, end, appUrl, unsubscribeUrl }: { to: string; name: string | null; digest: WeeklyDigest; start: Date; end: Date; appUrl: string; unsubscribeUrl: string }): OutgoingMail {
  const greeting = name ? `Merhaba ${name},` : "Merhaba,";
  const range = rangeLabel(start, end);
  const subject = `Haftalık özetin · ${range}`;
  const stats: Array<[string, string]> = [
    ["Tamamlanan oturum", digest.plannedSessions ? `${digest.completedSessions} / ${digest.plannedSessions}` : String(digest.completedSessions)],
    ["Çalışma süresi", formatMinutes(digest.minutes)],
    ["Çözülen soru", digest.accuracy !== null ? `${digest.questions} · %${digest.accuracy} doğru` : String(digest.questions)],
    ["Çalıştığın gün", `${digest.activeDays} / 7`],
  ];

  const text = [
    greeting,
    "",
    `${range} haftan: ${digest.headline}`,
    "",
    ...stats.map(([label, value]) => `• ${label}: ${value}`),
    ...(digest.topSubject ? [`• En çok çalıştığın ders: ${digest.topSubject.subject} (${formatMinutes(digest.topSubject.minutes)})`] : []),
    ...(digest.weakTopics.length ? ["", "Güçlendirmen gereken konular:", ...digest.weakTopics.map((topic) => `• ${topic.topic} (${topic.subject}) · %${topic.progress}`)] : []),
    ...(digest.dueReviews > 0 ? ["", `Tekrar listende ${digest.dueReviews} soru seni bekliyor.`] : []),
    "",
    `Gelecek hafta için önerim: ${digest.suggestion}`,
    "",
    `Pusula'yı aç: ${appUrl}`,
    "",
    `Bu özeti her pazar alıyorsun. Almak istemiyorsan: ${unsubscribeUrl}`,
    "— Pusula YKS · Kişisel çalışma koçu",
  ].join("\n");

  const statCell = ([label, value]: [string, string]) =>
    `<td width="50%" valign="top" style="background:#f3f6f5;border-radius:12px;padding:12px 14px;"><div style="font-size:12px;color:#5d6670;">${escapeHtml(label)}</div><div style="margin-top:4px;font-size:18px;font-weight:700;color:#18202a;">${escapeHtml(value)}</div></td>`;
  const weakRows = digest.weakTopics
    .map((topic) => `<tr><td style="padding:8px 0;border-top:1px solid #e6ebe9;font-size:14px;color:#18202a;">${escapeHtml(topic.topic)} <span style="color:#5d6670;">· ${escapeHtml(topic.subject)}</span></td><td align="right" style="padding:8px 0;border-top:1px solid #e6ebe9;font-size:13px;font-weight:700;color:#b42318;">%${topic.progress}</td></tr>`)
    .join("");
  const safeApp = escapeHtml(appUrl);
  const safeUnsub = escapeHtml(unsubscribeUrl);

  const html = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f6f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#18202a;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(digest.headline)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f6f5;">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
      <tr><td style="padding:0 4px 20px 4px;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="width:36px;height:36px;border-radius:10px;background:#17625f;color:#ffffff;font-size:17px;font-weight:700;text-align:center;vertical-align:middle;">P</td>
          <td style="padding-left:10px;font-size:15px;font-weight:700;color:#18202a;">Pusula YKS</td>
        </tr></table>
      </td></tr>
      <tr><td style="background:#ffffff;border-radius:20px;padding:28px 22px;border:1px solid #e6ebe9;">
        <div style="font-size:13px;font-weight:600;color:#17625f;">Haftalık özet · ${escapeHtml(range)}</div>
        <h1 style="margin:6px 0 10px 0;font-size:21px;line-height:1.3;font-weight:700;color:#18202a;">${escapeHtml(digest.headline)}</h1>
        <p style="margin:0 0 14px 0;font-size:14px;line-height:1.6;color:#3f4852;">${escapeHtml(greeting)} geçen yedi günün kısa özeti aşağıda.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="8" style="margin:0 -8px;width:calc(100% + 16px);">
          <tr>${statCell(stats[0])}${statCell(stats[1])}</tr>
          <tr>${statCell(stats[2])}${statCell(stats[3])}</tr>
        </table>
        ${digest.topSubject ? `<p style="margin:14px 0 0 0;font-size:13px;line-height:1.6;color:#5d6670;">En çok çalıştığın ders: <strong style="color:#18202a;">${escapeHtml(digest.topSubject.subject)}</strong> (${escapeHtml(formatMinutes(digest.topSubject.minutes))})</p>` : ""}
        ${weakRows ? `<div style="margin:22px 0 4px 0;font-size:14px;font-weight:700;color:#18202a;">Güçlendirmen gereken konular</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${weakRows}</table>` : ""}
        ${digest.dueReviews > 0 ? `<p style="margin:14px 0 0 0;font-size:13px;line-height:1.6;color:#5d6670;">Tekrar listende <strong style="color:#18202a;">${digest.dueReviews} soru</strong> seni bekliyor.</p>` : ""}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px;"><tr>
          <td style="background:#fdf3d9;border-radius:12px;padding:14px 16px;font-size:14px;line-height:1.6;color:#18202a;"><strong>Gelecek hafta için önerim:</strong> ${escapeHtml(digest.suggestion)}</td>
        </tr></table>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:22px;"><tr><td align="center">
          <a href="${safeApp}" style="display:inline-block;background:#17625f;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 28px;border-radius:12px;">Pusula'yı aç</a>
        </td></tr></table>
      </td></tr>
      <tr><td align="center" style="padding:20px 8px 0 8px;font-size:11px;line-height:1.6;color:#7c858e;">Pusula YKS · Kişisel çalışma koçu<br>Bu özeti her pazar alıyorsun. <a href="${safeUnsub}" style="color:#7c858e;">Almak istemiyorum</a></td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  return { to, subject, html, text };
}
