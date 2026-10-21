import { and, desc, eq, gte, isNotNull, isNull, lt, or } from "drizzle-orm";
import { parentLinks, studentProfiles, userMockExams, users } from "../../drizzle/schema";
import { estimateScore } from "../../shared/exams";
import { weeklyDigestWindow } from "../../shared/weeklyDigest";
import { buildParentDigestEmail } from "../_core/emails/parentEmails";
import { MailNotConfiguredError, sendMail, type OutgoingMail } from "../_core/mailer";
import { getDb } from "../db";
import { collectDigest } from "./weeklyDigest";
import { unsubscribeUrlFor } from "./unsubscribeToken";

/**
 * Veliye giden haftalık özet (öğrenci özetiyle aynı pazar çalıştırmasında, aynı günlük kotadan).
 * Alıcı: öğrencinin onayladığı (aktif) bağlantıdaki, e-postası doğrulanmış ve onaylı veli hesabı;
 * bu bağlantı için özeti kapatmamış; son 6 günde bu bağlantıdan özet almamış.
 */
const DAY_MS = 24 * 60 * 60 * 1000;
const RESEND_AFTER_MS = 6 * DAY_MS;
const TIME_BUDGET_MS = 60_000;

export type ParentDigestRunResult = { candidates: number; sent: number; failed: number; stoppedEarly: boolean; previews?: OutgoingMail[] };

export async function runParentDigest(options: { now?: Date; appUrl: string; maxPerRun: number; dryRun?: boolean }): Promise<ParentDigestRunResult> {
  const db = await getDb();
  if (!db || options.maxPerRun <= 0) return { candidates: 0, sent: 0, failed: 0, stoppedEarly: false };
  const now = options.now ?? new Date();
  const { start } = weeklyDigestWindow(now);
  const startedAt = Date.now();
  const rows = await db
    .select({ linkId: parentLinks.id, studentUserId: parentLinks.studentUserId, email: users.email })
    .from(parentLinks)
    .innerJoin(users, eq(users.id, parentLinks.parentUserId))
    .where(and(
      eq(parentLinks.status, "active"),
      eq(parentLinks.weeklyDigestOptOut, 0),
      or(isNull(parentLinks.weeklyDigestLastSentAt), lt(parentLinks.weeklyDigestLastSentAt, new Date(now.getTime() - RESEND_AFTER_MS))),
      isNotNull(users.email),
      isNotNull(users.emailVerifiedAt),
      eq(users.approvalStatus, "approved"),
      eq(users.accountStatus, "active"),
    ))
    .limit(options.maxPerRun);

  const result: ParentDigestRunResult = { candidates: rows.length, sent: 0, failed: 0, stoppedEarly: false, ...(options.dryRun ? { previews: [] } : {}) };
  for (const row of rows) {
    if (Date.now() - startedAt > TIME_BUDGET_MS) { result.stoppedEarly = true; break; }
    try {
      const [student] = await db.select({ name: users.name, preferredName: studentProfiles.preferredName }).from(users)
        .leftJoin(studentProfiles, eq(studentProfiles.userId, users.id)).where(eq(users.id, row.studentUserId)).limit(1);
      const studentName = student?.preferredName || student?.name?.split(" ")[0] || "Öğrenci";
      const digest = await collectDigest(row.studentUserId, start, now);
      const [exam] = await db.select({ title: userMockExams.title, exam: userMockExams.exam, net: userMockExams.net, subjectsJson: userMockExams.subjectsJson }).from(userMockExams)
        .where(and(eq(userMockExams.userId, row.studentUserId), gte(userMockExams.examDate, new Date(now.getTime() - 30 * DAY_MS)))).orderBy(desc(userMockExams.examDate)).limit(1);
      const lastExam = exam ? { title: exam.title, exam: exam.exam, net: Number(exam.net), estimatedScore: estimateScore(exam.exam, safeJson(exam.subjectsJson)) } : null;
      const unsubscribeUrl = await unsubscribeUrlFor(options.appUrl, "parent", row.linkId);
      const mail = buildParentDigestEmail({ to: row.email!, studentName, digest, start, end: now, appUrl: options.appUrl, unsubscribeUrl, lastExam });
      if (options.dryRun) { result.previews!.push(mail); continue; }
      await sendMail(mail);
      await db.update(parentLinks).set({ weeklyDigestLastSentAt: now }).where(eq(parentLinks.id, row.linkId));
      result.sent++;
    } catch (error) {
      if (error instanceof MailNotConfiguredError) throw error;
      result.failed++;
      console.error(`[ParentDigest] link ${row.linkId} failed:`, error instanceof Error ? error.message : error);
    }
  }
  return result;
}

function safeJson(value: string): Record<string, number> {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
