import type { TeacherDigest } from "@shared/teacherDigest";
import { formatMinutes } from "@shared/yksData";
import type { OutgoingMail } from "../mailer";

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

/** Personelin haftalık sınıf özeti; weeklyDigestEmail.ts ile aynı görünüm (tablo tabanlı, satır içi stil). */
export function buildTeacherDigestEmail({ to, name, orgName, digest, rangeLabel, panelUrl, unsubscribeUrl }: { to: string; name: string | null; orgName: string; digest: TeacherDigest; rangeLabel: string; panelUrl: string; unsubscribeUrl: string }): OutgoingMail {
  const greeting = name ? `Merhaba ${name},` : "Merhaba,";
  const subject = `${orgName} · haftalık sınıf özeti · ${rangeLabel}`;
  const stats: Array<[string, string]> = [
    ["Bu hafta çalışan", `${digest.activeCount} / ${digest.total}`],
    ["Toplam çalışma", formatMinutes(digest.totalMinutes)],
    ["Ortalama plan uyumu", digest.averageAdherence !== null ? `%${digest.averageAdherence}` : "—"],
    ["Takip bekleyen", String(digest.followUps.length)],
  ];

  const text = [
    greeting,
    "",
    `${orgName} · ${rangeLabel}: ${digest.headline}`,
    "",
    ...stats.map(([label, value]) => `• ${label}: ${value}`),
    ...(digest.followUps.length ? ["", "Takip bekleyen öğrenciler:", ...digest.followUps.map((student) => `• ${student.name}: ${student.reasons.join(", ")}`)] : []),
    ...(digest.topStudents.length ? ["", "Haftanın en çok çalışanları:", ...digest.topStudents.map((student) => `• ${student.name} (${formatMinutes(student.minutes)})`)] : []),
    "",
    `Kurum Paneli: ${panelUrl}`,
    "",
    `Bu özeti her pazar alıyorsun. Almak istemiyorsan: ${unsubscribeUrl}`,
    "— Pusula YKS · Kurum Paneli",
  ].join("\n");

  const statCell = ([label, value]: [string, string]) =>
    `<td width="50%" valign="top" style="background:#f3f6f5;border-radius:12px;padding:12px 14px;"><div style="font-size:12px;color:#5d6670;">${escapeHtml(label)}</div><div style="margin-top:4px;font-size:18px;font-weight:700;color:#18202a;">${escapeHtml(value)}</div></td>`;
  const followRows = digest.followUps
    .map((student) => `<tr><td style="padding:8px 0;border-top:1px solid #e6ebe9;font-size:14px;font-weight:600;color:#18202a;">${escapeHtml(student.name)}</td><td align="right" style="padding:8px 0;border-top:1px solid #e6ebe9;font-size:12px;color:#b42318;">${escapeHtml(student.reasons.join(" · "))}</td></tr>`)
    .join("");
  const topRows = digest.topStudents
    .map((student) => `<tr><td style="padding:6px 0;font-size:14px;color:#18202a;">${escapeHtml(student.name)}</td><td align="right" style="padding:6px 0;font-size:13px;font-weight:700;color:#17625f;">${escapeHtml(formatMinutes(student.minutes))}</td></tr>`)
    .join("");

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
          <td style="padding-left:10px;font-size:15px;font-weight:700;color:#18202a;">${escapeHtml(orgName)}</td>
        </tr></table>
      </td></tr>
      <tr><td style="background:#ffffff;border-radius:20px;padding:28px 22px;border:1px solid #e6ebe9;">
        <div style="font-size:13px;font-weight:600;color:#17625f;">Haftalık sınıf özeti · ${escapeHtml(rangeLabel)}</div>
        <h1 style="margin:6px 0 10px 0;font-size:21px;line-height:1.3;font-weight:700;color:#18202a;">${escapeHtml(digest.headline)}</h1>
        <p style="margin:0 0 14px 0;font-size:14px;line-height:1.6;color:#3f4852;">${escapeHtml(greeting)} takip ettiğin öğrencilerin geçen yedi günü aşağıda.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="8" style="margin:0 -8px;width:calc(100% + 16px);">
          <tr>${statCell(stats[0])}${statCell(stats[1])}</tr>
          <tr>${statCell(stats[2])}${statCell(stats[3])}</tr>
        </table>
        ${followRows ? `<div style="margin:22px 0 4px 0;font-size:14px;font-weight:700;color:#18202a;">Takip bekleyen öğrenciler</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${followRows}</table>` : ""}
        ${topRows ? `<div style="margin:22px 0 4px 0;font-size:14px;font-weight:700;color:#18202a;">Haftanın en çok çalışanları</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${topRows}</table>` : ""}
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:22px;"><tr><td align="center">
          <a href="${escapeHtml(panelUrl)}" style="display:inline-block;background:#17625f;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 28px;border-radius:12px;">Kurum Paneli'ni aç</a>
        </td></tr></table>
      </td></tr>
      <tr><td align="center" style="padding:20px 8px 0 8px;font-size:11px;line-height:1.6;color:#7c858e;">Pusula YKS · Kurum Paneli<br>Bu özeti her pazar alıyorsun. <a href="${escapeHtml(unsubscribeUrl)}" style="color:#7c858e;">Almak istemiyorum</a></td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  return { to, subject, html, text };
}
