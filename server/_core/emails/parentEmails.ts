import type { WeeklyDigest } from "@shared/weeklyDigest";
import { formatMinutes } from "@shared/yksData";
import type { OutgoingMail } from "../mailer";
import { rangeLabel } from "./weeklyDigestEmail";

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

// Veli e-postaları: weeklyDigestEmail.ts ile aynı tablo tabanlı, satır içi stilli yapı + düz metin.
const shell = (subject: string, preheader: string, body: string, footer: string) => `<!doctype html>
<html lang="tr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f3f6f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#18202a;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f6f5;">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e6ebe9;border-radius:20px;">
      <tr><td style="padding:28px 28px 8px 28px;font-size:15px;font-weight:700;color:#18202a;">Pusula · Veli erişimi</td></tr>
      <tr><td style="padding:8px 28px 28px 28px;">${body}</td></tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
      <tr><td align="center" style="padding:20px 8px 0 8px;font-size:11px;line-height:1.6;color:#7c858e;">${footer}</td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
const button = (href: string, label: string) => `<a href="${escapeHtml(href)}" style="display:inline-block;background:#17625f;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:12px 22px;border-radius:12px;">${escapeHtml(label)}</a>`;

/** Öğrencinin velisine gönderdiği davet: bağlantı veli sayfasını kodla açar. */
export function buildParentInviteEmail({ to, studentName, code, joinUrl, expiresAt }: { to: string; studentName: string; code: string; joinUrl: string; expiresAt: Date }): OutgoingMail {
  const subject = `${studentName} seni Pusula'da veli olarak ekledi`;
  const until = expiresAt.toLocaleDateString("tr-TR", { day: "numeric", month: "long", timeZone: "Europe/Istanbul" });
  const text = [
    "Merhaba,",
    "",
    `${studentName}, sınav hazırlığını Pusula'da takip ediyor ve seni veli olarak eklemek istiyor. Bağlandığında çalışma süresini, planını, deneme sonuçlarını ve zayıf konularını görebilirsin; notlarını ve soru defterini göremezsin.`,
    "",
    `Bağlanmak için: ${joinUrl}`,
    `Veli kodu: ${code} (${until} tarihine kadar geçerli)`,
    "",
    "Pusula hesabın yoksa bağlantıdan ücretsiz hesap açabilirsin. Kodu girdikten sonra öğrencinin de onaylaması gerekir.",
    "",
    "Bu daveti beklemiyorsan bu e-postayı görmezden gelebilirsin.",
  ].join("\n");
  const body = `<p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;">Merhaba,</p>
<p style="margin:0 0 14px 0;font-size:14px;line-height:1.6;color:#3f4753;"><strong>${escapeHtml(studentName)}</strong>, sınav hazırlığını Pusula'da takip ediyor ve seni veli olarak eklemek istiyor. Bağlandığında çalışma süresini, planını, deneme sonuçlarını ve zayıf konularını görebilirsin; notlarını ve soru defterini göremezsin.</p>
<p style="margin:0 0 18px 0;">${button(joinUrl, "Veli olarak bağlan")}</p>
<p style="margin:0 0 6px 0;font-size:13px;color:#5d6670;">Veli kodu: <strong style="font-size:16px;color:#18202a;letter-spacing:1px;">${escapeHtml(code)}</strong> · ${escapeHtml(until)} tarihine kadar geçerli</p>
<p style="margin:12px 0 0 0;font-size:12px;line-height:1.6;color:#7c858e;">Pusula hesabın yoksa bağlantıdan ücretsiz hesap açabilirsin. Kodu girdikten sonra öğrencinin de onaylaması gerekir. Bu daveti beklemiyorsan bu e-postayı görmezden gelebilirsin.</p>`;
  return { to, subject, text, html: shell(subject, `${studentName} seni veli olarak eklemek istiyor.`, body, "Pusula · Kişisel çalışma koçu") };
}

/** Veliye giden haftalık özet: öğrencinin haftası, üçüncü şahıs diliyle. */
export function buildParentDigestEmail({ to, studentName, digest, start, end, appUrl, unsubscribeUrl, lastExam }: { to: string; studentName: string; digest: WeeklyDigest; start: Date; end: Date; appUrl: string; unsubscribeUrl: string; lastExam: { title: string; exam: string; net: number; estimatedScore: number | null } | null }): OutgoingMail {
  const range = rangeLabel(start, end);
  const subject = `${studentName} · haftalık özet · ${range}`;
  const stats: Array<[string, string]> = [
    ["Tamamlanan oturum", digest.plannedSessions ? `${digest.completedSessions} / ${digest.plannedSessions}` : String(digest.completedSessions)],
    ["Çalışma süresi", formatMinutes(digest.minutes)],
    ["Çözülen soru", digest.accuracy !== null ? `${digest.questions} · %${digest.accuracy} doğru` : String(digest.questions)],
    ["Çalıştığı gün", `${digest.activeDays} / 7`],
  ];
  const examLine = lastExam ? `Son deneme: ${lastExam.title} (${lastExam.exam}) · ${lastExam.net.toFixed(2)} net${lastExam.estimatedScore !== null ? ` · tahmini ~${lastExam.estimatedScore.toFixed(0)} puan (resmî değil)` : ""}` : null;
  const text = [
    "Merhaba,",
    "",
    `${studentName} için ${range} haftasının özeti:`,
    "",
    ...stats.map(([label, value]) => `• ${label}: ${value}`),
    ...(digest.topSubject ? [`• En çok çalıştığı ders: ${digest.topSubject.subject} (${formatMinutes(digest.topSubject.minutes)})`] : []),
    ...(examLine ? [`• ${examLine}`] : []),
    ...(digest.weakTopics.length ? ["", "Güçlendirmesi gereken konular:", ...digest.weakTopics.map((topic) => `• ${topic.topic} (${topic.subject}) · %${topic.progress}`)] : []),
    "",
    `Ayrıntılar için Pusula'yı aç: ${appUrl}/veli`,
    "",
    `Bu özeti her pazar alıyorsun. Almak istemiyorsan: ${unsubscribeUrl}`,
  ].join("\n");
  const statCell = ([label, value]: [string, string]) => `<td width="50%" valign="top" style="background:#f3f6f5;border-radius:12px;padding:12px 14px;"><div style="font-size:12px;color:#5d6670;">${escapeHtml(label)}</div><div style="margin-top:4px;font-size:17px;font-weight:700;color:#18202a;">${escapeHtml(value)}</div></td>`;
  const weakRows = digest.weakTopics.map((topic) => `<tr><td style="padding:8px 0;border-top:1px solid #e6ebe9;font-size:14px;">${escapeHtml(topic.topic)} <span style="color:#5d6670;">· ${escapeHtml(topic.subject)}</span></td><td align="right" style="padding:8px 0;border-top:1px solid #e6ebe9;font-size:14px;font-weight:700;color:#bf3a2b;">%${topic.progress}</td></tr>`).join("");
  const body = `<p style="margin:0 0 6px 0;font-size:15px;line-height:1.6;">Merhaba,</p>
<p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#3f4753;"><strong>${escapeHtml(studentName)}</strong> için ${escapeHtml(range)} haftasının özeti:</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="8" style="margin:0 -8px;"><tr>${statCell(stats[0])}${statCell(stats[1])}</tr><tr>${statCell(stats[2])}${statCell(stats[3])}</tr></table>
${digest.topSubject ? `<p style="margin:14px 0 0 0;font-size:14px;color:#3f4753;">En çok çalıştığı ders: <strong>${escapeHtml(digest.topSubject.subject)}</strong> (${escapeHtml(formatMinutes(digest.topSubject.minutes))})</p>` : ""}
${examLine ? `<p style="margin:8px 0 0 0;font-size:14px;color:#3f4753;">${escapeHtml(examLine)}</p>` : ""}
${weakRows ? `<p style="margin:18px 0 4px 0;font-size:14px;font-weight:700;">Güçlendirmesi gereken konular</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${weakRows}</table>` : ""}
<p style="margin:22px 0 0 0;">${button(`${appUrl}/veli`, "Ayrıntıları gör")}</p>`;
  const footer = `Pusula · Veli erişimi<br>Bu özeti her pazar alıyorsun. <a href="${escapeHtml(unsubscribeUrl)}" style="color:#7c858e;">Almak istemiyorum</a>`;
  return { to, subject, text, html: shell(subject, `${studentName} bu hafta ${formatMinutes(digest.minutes)} çalıştı.`, body, footer) };
}
