import { and, eq, gte, isNull, lte } from "drizzle-orm";
import type { Express } from "express";
import { pushSubscriptions, studyPlanSessions } from "../../drizzle/schema";
import { buildReminderMessage, REMINDER_MAX_LEAD_MS, REMINDER_MIN_LEAD_MS } from "../../shared/sessionReminder";
import { ENV } from "../_core/env";
import { getDb } from "../db";
import { pushConfigured, sendToUser } from "./push";

/**
 * Yaklaşan oturumlar için bildirim. Dış bir zamanlayıcı birkaç dakikada bir çağırır
 * (.github/workflows/session-reminders.yml); Vercel'in ücretsiz planındaki cron günde bir kez çalışır.
 * Her oturum önce "gönderildi" diye işaretlenir (koşullu UPDATE), sonra bildirim gider: iki
 * çağrı üst üste gelse de aynı oturuma iki bildirim gitmez.
 */
export async function runSessionReminders(now = new Date()) {
  const result = { due: 0, sent: 0, delivered: 0, removed: 0, failed: 0 };
  const db = await getDb();
  if (!db || !pushConfigured()) return result;
  // Yalnızca en az bir cihazı abone olan öğrencilerin oturumları.
  const sessions = await db
    .selectDistinct({ id: studyPlanSessions.id, userId: studyPlanSessions.userId, sessionDate: studyPlanSessions.sessionDate, subject: studyPlanSessions.subject, topic: studyPlanSessions.topic, kind: studyPlanSessions.kind, plannedMinutes: studyPlanSessions.plannedMinutes })
    .from(studyPlanSessions)
    .innerJoin(pushSubscriptions, eq(pushSubscriptions.userId, studyPlanSessions.userId))
    .where(and(
      eq(studyPlanSessions.status, "planned"),
      isNull(studyPlanSessions.reminderSentAt),
      gte(studyPlanSessions.sessionDate, new Date(now.getTime() + REMINDER_MIN_LEAD_MS)),
      lte(studyPlanSessions.sessionDate, new Date(now.getTime() + REMINDER_MAX_LEAD_MS)),
    ))
    .limit(500);
  result.due = sessions.length;
  for (const session of sessions) {
    const [claim] = await db.update(studyPlanSessions).set({ reminderSentAt: now }).where(and(eq(studyPlanSessions.id, session.id), isNull(studyPlanSessions.reminderSentAt)));
    if (!(claim as { affectedRows?: number }).affectedRows) continue;
    const outcome = await sendToUser(session.userId, buildReminderMessage(session, now));
    result.sent++;
    result.delivered += outcome.delivered;
    result.removed += outcome.removed;
    result.failed += outcome.failed;
  }
  return result;
}

/** Zamanlayıcı ayrı bir sırla da çağırabilir (REMINDER_CRON_SECRET): Vercel'in CRON_SECRET'ini dışarıya vermemek için. */
const authorized = (header: string | undefined) => {
  const secrets = [process.env.CRON_SECRET, process.env.REMINDER_CRON_SECRET].filter((value): value is string => Boolean(value));
  return secrets.some((secret) => header === `Bearer ${secret}`);
};

export function registerSessionReminderRoutes(app: Express) {
  app.post("/api/cron/session-reminders", async (req, res) => {
    const anySecret = Boolean(process.env.CRON_SECRET || process.env.REMINDER_CRON_SECRET);
    if (ENV.isProduction && !anySecret) { res.status(503).json({ ok: false, error: "CRON secret not set" }); return; }
    if (anySecret && !authorized(req.headers.authorization)) { res.status(401).json({ ok: false, error: "unauthorized" }); return; }
    try {
      const result = await runSessionReminders();
      if (result.due) console.info("[SessionReminders]", JSON.stringify(result));
      res.json({ ok: true, configured: pushConfigured(), result });
    } catch (error) {
      res.status(500).json({ ok: false, error: error instanceof Error ? error.message : "unknown error" });
    }
  });
}
