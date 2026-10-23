import { and, desc, eq, inArray, isNotNull, isNull, lt, or } from "drizzle-orm";
import { organizationMembers, organizations, users } from "../../drizzle/schema";
import { membershipState, seesAllStudents, STAFF_ROLES, summarizeStudent } from "../../shared/org";
import { buildTeacherDigest } from "../../shared/teacherDigest";
import { weeklyDigestWindow } from "../../shared/weeklyDigest";
import { buildTeacherDigestEmail } from "../_core/emails/teacherDigestEmail";
import { rangeLabel } from "../_core/emails/weeklyDigestEmail";
import { MailNotConfiguredError, sendMail, type OutgoingMail } from "../_core/mailer";
import { getDb } from "../db";
import { academicDigestFor } from "../org/caseDb";
import { listMembers, loadStudentSignals } from "../org/orgDb";
import { unsubscribeUrlFor } from "./unsubscribeToken";

/**
 * Kurum personeline (öğretmen, koordinatör, yönetici) pazar akşamı sınıf özeti: rolün
 * Kurum Paneli'nde gördüğü öğrenciler (öğretmen: kendisine atananlar) ve aynı risk kuralları.
 * Alıcı: aktif üyelik, e-postası doğrulanmış aktif hesap, üyeliği süresi içinde ve aktif
 * kurum, abonelikten çıkmamış, son 6 günde özet almamış; görebildiği öğrenci yoksa gönderilmez.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const RESEND_AFTER_MS = 6 * DAY_MS;
const TIME_BUDGET_MS = 120_000;

export async function getStaffDigestEnabled(userId: number, orgId: number) {
  const db = await getDb();
  if (!db) return true;
  const [row] = await db.select({ optOut: organizationMembers.weeklyDigestOptOut }).from(organizationMembers).where(and(eq(organizationMembers.userId, userId), eq(organizationMembers.orgId, orgId))).limit(1);
  return !row || row.optOut === 0;
}

export async function setStaffDigestEnabled(userId: number, orgId: number, enabled: boolean) {
  const db = await getDb();
  if (!db) return enabled;
  await db.update(organizationMembers).set({ weeklyDigestOptOut: enabled ? 0 : 1 }).where(and(eq(organizationMembers.userId, userId), eq(organizationMembers.orgId, orgId)));
  return enabled;
}

export async function setStaffDigestEnabledByMemberId(memberId: number, enabled: boolean) {
  const db = await getDb();
  if (!db) return;
  await db.update(organizationMembers).set({ weeklyDigestOptOut: enabled ? 0 : 1 }).where(eq(organizationMembers.id, memberId));
}

export type TeacherDigestRunResult = { candidates: number; sent: number; skipped: number; failed: number; stoppedEarly: boolean; previews?: OutgoingMail[] };

export async function runTeacherDigest(options: { now?: Date; appUrl: string; maxPerRun: number; dryRun?: boolean; onlyMemberIds?: number[] }): Promise<TeacherDigestRunResult> {
  const result: TeacherDigestRunResult = { candidates: 0, sent: 0, skipped: 0, failed: 0, stoppedEarly: false, ...(options.dryRun ? { previews: [] } : {}) };
  const db = await getDb();
  if (!db || options.maxPerRun <= 0) return result;
  const now = options.now ?? new Date();
  const { start } = weeklyDigestWindow(now);
  const weekEnd = new Date(start.getTime() + 7 * DAY_MS);
  const startedAt = Date.now();

  const rows = await db
    .select({ memberId: organizationMembers.id, userId: users.id, email: users.email, name: users.name, role: organizationMembers.role, orgId: organizations.id, orgName: organizations.name, membershipStartsAt: organizations.membershipStartsAt, membershipEndsAt: organizations.membershipEndsAt })
    .from(organizationMembers)
    .innerJoin(users, eq(users.id, organizationMembers.userId))
    .innerJoin(organizations, eq(organizations.id, organizationMembers.orgId))
    .where(and(
      inArray(organizationMembers.role, [...STAFF_ROLES]),
      eq(organizationMembers.status, "active"),
      eq(organizationMembers.weeklyDigestOptOut, 0),
      or(isNull(organizationMembers.weeklyDigestLastSentAt), lt(organizationMembers.weeklyDigestLastSentAt, new Date(now.getTime() - RESEND_AFTER_MS))),
      eq(organizations.status, "active"),
      isNotNull(users.email),
      isNotNull(users.emailVerifiedAt),
      eq(users.approvalStatus, "approved"),
      eq(users.accountStatus, "active"),
    ))
    .orderBy(desc(users.lastSignedIn))
    .limit(options.maxPerRun);

  const targets = rows.filter((row) => membershipState(row, now) === "active" && (!options.onlyMemberIds || options.onlyMemberIds.includes(row.memberId)));
  result.candidates = targets.length;
  for (const member of targets) {
    if (Date.now() - startedAt > TIME_BUDGET_MS) { result.stoppedEarly = true; break; }
    try {
      const students = await listMembers(member.orgId, seesAllStudents(member.role) ? { role: "student" } : { role: "student", teacherUserId: member.userId });
      if (!students.length) { result.skipped++; continue; }
      const signals = await loadStudentSignals(students.map((student) => student.userId), start, weekEnd, new Date(now.getTime() - 30 * DAY_MS));
      // Akademik takip bölümü yalnızca kurumda açıksa (aksi hâlde null, e-postada görünmez).
      const academic = await academicDigestFor(member.orgId, students.map((student) => ({ userId: student.userId, name: student.name })), now).catch(() => null);
      const digest = buildTeacherDigest(students.map((student) => ({ name: student.name, summary: summarizeStudent(signals.get(student.userId)!, now) })), academic);
      const mail = buildTeacherDigestEmail({
        to: member.email!,
        name: member.name?.split(" ")[0] || null,
        orgName: member.orgName,
        digest,
        rangeLabel: rangeLabel(start, now),
        panelUrl: `${options.appUrl}/kurum`,
        casesUrl: academic ? `${options.appUrl}/kurum/akademik-takip` : undefined,
        unsubscribeUrl: await unsubscribeUrlFor(options.appUrl, "staff", member.memberId),
      });
      if (options.dryRun) { result.previews!.push(mail); continue; }
      await sendMail(mail);
      await db.update(organizationMembers).set({ weeklyDigestLastSentAt: now }).where(eq(organizationMembers.id, member.memberId));
      result.sent++;
    } catch (error) {
      if (error instanceof MailNotConfiguredError) throw error;
      result.failed++;
      console.error(`[TeacherDigest] member ${member.memberId} failed:`, error instanceof Error ? error.message : error);
    }
  }
  return result;
}
