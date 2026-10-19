import { and, asc, desc, eq, gte, isNotNull, isNull, lt, or } from "drizzle-orm";
import type { Express } from "express";
import { SignJWT, jwtVerify } from "jose";
import { studentProfiles, studyPlanSessions, topicProgress, topicStudyLogs, users, yksTopics } from "../../drizzle/schema";
import { buildWeeklyDigest, weeklyDigestWindow } from "../../shared/weeklyDigest";
import { appBaseUrl } from "../_core/emailVerification";
import { buildWeeklyDigestEmail } from "../_core/emails/weeklyDigestEmail";
import { ENV } from "../_core/env";
import { MailNotConfiguredError, sendMail, type OutgoingMail } from "../_core/mailer";
import { getDb } from "../db";
import { getReviewSummary } from "../notes/questionsDb";

/**
 * Haftalık ilerleme e-postası (pazar akşamı, vercel.json `crons`).
 *
 * Alıcı: e-postası doğrulanmış, onaylı ve aktif hesap; onboarding'i bitmiş; son 30 günde giriş
 * yapmış; abonelikten çıkmamış; son 6 günde özet almamış öğrenci. Son koşul, cron'un tekrar
 * tetiklenmesi ya da sınırı aşan bir haftanın ertesi gün devam etmesi hâlinde aynı kişiye
 * ikinci mail gitmesini engeller. Mail sağlayıcısının günlük kotası için gönderim sayısı sınırlıdır.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const ACTIVE_WITHIN_MS = 30 * DAY_MS;
const RESEND_AFTER_MS = 6 * DAY_MS;
// Resend'in ücretsiz planı günde 100 mail (doğrulama mailleri dahil); kalanlar ertesi
// çalıştırmaya kalır. Ücretli planda WEEKLY_DIGEST_MAX_PER_RUN ile yükseltilir.
const DEFAULT_MAX_PER_RUN = Number(process.env.WEEKLY_DIGEST_MAX_PER_RUN) || 90;
// Vercel fonksiyonu 300 sn'de kesilir; yarıda kalan kişi bir sonraki çalıştırmaya kalsın.
const TIME_BUDGET_MS = 240_000;

const UNSUBSCRIBE_AUDIENCE = "weekly-digest-unsubscribe";
const secretKey = () => new TextEncoder().encode(ENV.cookieSecret);

/** Abonelikten çıkma jetonu: kullanıcı id'sine bağlı, süresiz (eski maillerdeki bağlantı da çalışmalı). */
export async function createUnsubscribeToken(userId: number) {
  return new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject(String(userId)).setAudience(UNSUBSCRIBE_AUDIENCE).setIssuedAt().sign(secretKey());
}

export async function readUnsubscribeToken(token: string): Promise<number | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { audience: UNSUBSCRIBE_AUDIENCE, algorithms: ["HS256"] });
    const userId = Number(payload.sub);
    return Number.isInteger(userId) && userId > 0 ? userId : null;
  } catch {
    return null;
  }
}

export async function getWeeklyDigestEnabled(userId: number) {
  const db = await getDb();
  if (!db) return true;
  const [row] = await db.select({ optOut: studentProfiles.weeklyDigestOptOut }).from(studentProfiles).where(eq(studentProfiles.userId, userId)).limit(1);
  return !row || row.optOut === 0;
}

export async function setWeeklyDigestEnabled(userId: number, enabled: boolean) {
  const db = await getDb();
  if (!db) return enabled;
  await db.update(studentProfiles).set({ weeklyDigestOptOut: enabled ? 0 : 1 }).where(eq(studentProfiles.userId, userId));
  return enabled;
}

async function collectDigest(userId: number, start: Date, end: Date) {
  const db = (await getDb())!;
  const [sessions, logs, weakTopics, review] = await Promise.all([
    db.select({ sessionDate: studyPlanSessions.sessionDate, status: studyPlanSessions.status, plannedMinutes: studyPlanSessions.plannedMinutes }).from(studyPlanSessions).where(and(eq(studyPlanSessions.userId, userId), gte(studyPlanSessions.sessionDate, start), lt(studyPlanSessions.sessionDate, end))),
    db.select({ studyDate: topicStudyLogs.studyDate, subject: topicStudyLogs.subject, minutes: topicStudyLogs.minutes, questions: topicStudyLogs.questions, correct: topicStudyLogs.correct }).from(topicStudyLogs).where(and(eq(topicStudyLogs.userId, userId), gte(topicStudyLogs.studyDate, start), lt(topicStudyLogs.studyDate, end))),
    db.select({ subject: yksTopics.subject, topic: yksTopics.topic, progress: topicProgress.progress }).from(topicProgress).innerJoin(yksTopics, eq(yksTopics.id, topicProgress.topicId)).where(and(eq(topicProgress.userId, userId), eq(topicProgress.status, "weak"))).orderBy(asc(topicProgress.progress)).limit(3),
    getReviewSummary(userId).catch(() => ({ due: 0 })),
  ]);
  return buildWeeklyDigest({ sessions, logs, weakTopics, dueReviews: review.due, start, end });
}

export type WeeklyDigestRunResult = { candidates: number; sent: number; failed: number; stoppedEarly: boolean; previews?: OutgoingMail[] };

export async function runWeeklyDigest(options: { now?: Date; appUrl: string; maxPerRun?: number; dryRun?: boolean; onlyUserIds?: number[] }): Promise<WeeklyDigestRunResult> {
  const db = await getDb();
  if (!db) return { candidates: 0, sent: 0, failed: 0, stoppedEarly: false };
  const now = options.now ?? new Date();
  const { start } = weeklyDigestWindow(now);
  const startedAt = Date.now();
  const recipients = await db
    .select({ id: users.id, email: users.email, name: users.name, preferredName: studentProfiles.preferredName })
    .from(users)
    .innerJoin(studentProfiles, eq(studentProfiles.userId, users.id))
    .where(and(
      isNotNull(users.email),
      isNotNull(users.emailVerifiedAt),
      eq(users.approvalStatus, "approved"),
      eq(users.accountStatus, "active"),
      gte(users.lastSignedIn, new Date(now.getTime() - ACTIVE_WITHIN_MS)),
      eq(studentProfiles.onboardingCompleted, 1),
      eq(studentProfiles.weeklyDigestOptOut, 0),
      or(isNull(studentProfiles.weeklyDigestLastSentAt), lt(studentProfiles.weeklyDigestLastSentAt, new Date(now.getTime() - RESEND_AFTER_MS))),
    ))
    .orderBy(desc(users.lastSignedIn))
    .limit(options.maxPerRun ?? DEFAULT_MAX_PER_RUN);

  const targets = options.onlyUserIds ? recipients.filter((user) => options.onlyUserIds!.includes(user.id)) : recipients;
  const result: WeeklyDigestRunResult = { candidates: targets.length, sent: 0, failed: 0, stoppedEarly: false, ...(options.dryRun ? { previews: [] } : {}) };
  for (const user of targets) {
    if (Date.now() - startedAt > TIME_BUDGET_MS) { result.stoppedEarly = true; break; }
    try {
      const digest = await collectDigest(user.id, start, now);
      const unsubscribeUrl = `${options.appUrl}/api/email/weekly-digest/unsubscribe?token=${encodeURIComponent(await createUnsubscribeToken(user.id))}`;
      const mail = buildWeeklyDigestEmail({ to: user.email!, name: user.preferredName || user.name?.split(" ")[0] || null, digest, start, end: now, appUrl: options.appUrl, unsubscribeUrl });
      if (options.dryRun) { result.previews!.push(mail); continue; }
      await sendMail(mail);
      await db.update(studentProfiles).set({ weeklyDigestLastSentAt: now }).where(eq(studentProfiles.userId, user.id));
      result.sent++;
    } catch (error) {
      // Mail servisi hiç kurulu değilse herkeste aynı hata alınır: boşuna dönme.
      if (error instanceof MailNotConfiguredError) throw error;
      result.failed++;
      console.error(`[WeeklyDigest] user ${user.id} failed:`, error instanceof Error ? error.message : error);
    }
  }
  return result;
}

const page = (title: string, body: string) => `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title></head>
<body style="margin:0;background:#f3f6f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#18202a;">
<div style="max-width:440px;margin:64px auto;padding:0 16px;"><div style="background:#fff;border:1px solid #e6ebe9;border-radius:20px;padding:28px 24px;text-align:center;">${body}</div></div></body></html>`;
const button = "display:inline-block;margin-top:18px;background:#17625f;color:#fff;border:0;text-decoration:none;font-size:15px;font-weight:700;padding:12px 24px;border-radius:12px;cursor:pointer;";

export function registerWeeklyDigestRoutes(app: Express) {
  app.get("/api/cron/weekly-digest", async (req, res) => {
    const secret = process.env.CRON_SECRET;
    // Toplu mail gönderen bir uç nokta: production'da sır tanımlı değilse hiç çalışmaz.
    if (ENV.isProduction && !secret) { res.status(503).json({ ok: false, error: "CRON_SECRET not set" }); return; }
    if (secret && req.headers.authorization !== `Bearer ${secret}`) { res.status(401).json({ ok: false, error: "unauthorized" }); return; }
    try {
      const result = await runWeeklyDigest({ appUrl: appBaseUrl(req) });
      console.info("[WeeklyDigest]", JSON.stringify(result));
      res.json({ ok: true, result });
    } catch (error) {
      res.status(500).json({ ok: false, error: error instanceof Error ? error.message : "unknown error" });
    }
  });

  // GET yalnızca onay sayfasını gösterir: mail istemcilerinin bağlantı tarayıcıları linki
  // önceden açtığında kimse kendiliğinden abonelikten çıkmasın. Asıl işlem POST.
  app.get("/api/email/weekly-digest/unsubscribe", async (req, res) => {
    const token = typeof req.query.token === "string" ? req.query.token : "";
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Referrer-Policy", "no-referrer");
    if (!(await readUnsubscribeToken(token))) { res.status(400).send(page("Bağlantı geçersiz", `<h1 style="font-size:20px;margin:0 0 8px;">Bağlantı geçersiz</h1><p style="font-size:14px;color:#5d6670;line-height:1.6;">Haftalık özet ayarını uygulamada profil menüsünden değiştirebilirsin.</p><a href="${appBaseUrl(req)}" style="${button}">Pusula'yı aç</a>`)); return; }
    res.send(page("Haftalık özet", `<h1 style="font-size:20px;margin:0 0 8px;">Haftalık özet e-postaları</h1><p style="font-size:14px;color:#5d6670;line-height:1.6;">Her pazar gelen ilerleme özetini artık almak istemiyor musun?</p><form method="post"><input type="hidden" name="token" value="${token.replace(/"/g, "&quot;")}"><button type="submit" style="${button}">Evet, almak istemiyorum</button></form>`));
  });

  app.post("/api/email/weekly-digest/unsubscribe", async (req, res) => {
    const token = typeof req.body?.token === "string" ? req.body.token : typeof req.query.token === "string" ? req.query.token : "";
    const userId = await readUnsubscribeToken(token);
    res.setHeader("Cache-Control", "no-store");
    if (!userId) { res.status(400).send(page("Bağlantı geçersiz", `<h1 style="font-size:20px;margin:0;">Bağlantı geçersiz</h1>`)); return; }
    await setWeeklyDigestEnabled(userId, false);
    res.send(page("Abonelikten çıktın", `<h1 style="font-size:20px;margin:0 0 8px;">Tamam, artık göndermeyeceğiz</h1><p style="font-size:14px;color:#5d6670;line-height:1.6;">Fikrini değiştirirsen uygulamada profil menüsündeki <strong>Haftalık özet e-postası</strong> seçeneğiyle yeniden açabilirsin.</p><a href="${appBaseUrl(req)}" style="${button}">Pusula'yı aç</a>`));
  });
}
