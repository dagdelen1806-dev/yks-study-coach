import { and, desc, eq, gte, inArray, isNull, lt, sql } from "drizzle-orm";
import {
  classStudents,
  classTimetableSlots,
  counselingNotes,
  organizationAuditLogs,
  organizationClasses,
  organizationInvitations,
  organizationMembers,
  organizationUpgradeRequests,
  organizations,
  studentProfiles,
  studyPlanSessions,
  studyPlans,
  teacherAssignments,
  topicProgress,
  topicStudyLogs,
  userMockExams,
  users,
} from "../../drizzle/schema";
import type { TimetableSlot } from "../../shared/orgTimetable";
import { membershipState, type InvitableRole, type MembershipState, type OrgKind, type OrgPlan, type OrgRole, type StudentSignals } from "../../shared/org";
import { getDb } from "../db";

// Kurum Paneli veri katmanı. Her sorgu orgId ile kapsamlıdır; yetki kararı orgAccess.ts'te verilir.

export class OrgError extends Error {}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new OrgError("Veritabanına ulaşılamadı.");
  return db;
}

// --- Üyelik -----------------------------------------------------------------

/** `state`: kurumun üyelik süresi (paket bitişi); süresi dolan kurumda panel salt okunur olur. */
export type Membership = { orgId: number; orgName: string; role: OrgRole; state?: MembershipState };

const membershipColumns = { orgId: organizationMembers.orgId, orgName: organizations.name, role: organizationMembers.role, membershipStartsAt: organizations.membershipStartsAt, membershipEndsAt: organizations.membershipEndsAt };
const toMembership = (row: { orgId: number; orgName: string; role: OrgRole; membershipStartsAt: Date | null; membershipEndsAt: Date | null }): Membership => ({ orgId: row.orgId, orgName: row.orgName, role: row.role, state: membershipState(row) });

/** Aktif kurumdaki aktif üyelik (askıya alınmış kurum = üyelik yok sayılır). */
export async function getActiveMembership(userId: number, orgId: number): Promise<Membership | null> {
  const db = await requireDb();
  const [row] = await db
    .select(membershipColumns)
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizations.id, organizationMembers.orgId))
    .where(and(eq(organizationMembers.userId, userId), eq(organizationMembers.orgId, orgId), eq(organizationMembers.status, "active"), eq(organizations.status, "active")))
    .limit(1);
  return row ? toMembership(row) : null;
}

export async function listMyMemberships(userId: number): Promise<Array<Membership & { kvkkVersion?: number | null; consentAt?: Date | null }>> {
  const db = await requireDb();
  const rows = await db
    .select({ ...membershipColumns, kvkkVersion: organizationMembers.kvkkVersion, consentAt: organizationMembers.consentAt })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizations.id, organizationMembers.orgId))
    .where(and(eq(organizationMembers.userId, userId), eq(organizationMembers.status, "active"), eq(organizations.status, "active")));
  return rows.map((row) => ({ ...toMembership(row), kvkkVersion: row.kvkkVersion, consentAt: row.consentAt }));
}

/**
 * Öğretmenin gördüğü öğrenciler: kendisine atananlar ve sorumlu öğretmeni olduğu sınıfların
 * öğrencileri (sınıftan çıkan öğrenci listeden de düşer).
 */
export async function teacherStudentIds(orgId: number, teacherUserId: number): Promise<number[]> {
  const db = await requireDb();
  const [assigned, advised] = await Promise.all([
    db.select({ studentUserId: teacherAssignments.studentUserId }).from(teacherAssignments)
      .where(and(eq(teacherAssignments.orgId, orgId), eq(teacherAssignments.teacherUserId, teacherUserId), eq(teacherAssignments.active, 1))),
    db.select({ studentUserId: classStudents.studentUserId }).from(classStudents)
      .innerJoin(organizationClasses, eq(organizationClasses.id, classStudents.classId))
      .where(and(eq(organizationClasses.orgId, orgId), eq(organizationClasses.advisorUserId, teacherUserId))),
  ]);
  return Array.from(new Set([...assigned, ...advised].map((row) => row.studentUserId)));
}

export async function hasActiveAssignment(orgId: number, teacherUserId: number, studentUserId: number): Promise<boolean> {
  return (await teacherStudentIds(orgId, teacherUserId)).includes(studentUserId);
}

export async function isActiveStudent(orgId: number, studentUserId: number): Promise<boolean> {
  const db = await requireDb();
  const [row] = await db.select({ id: organizationMembers.id }).from(organizationMembers)
    .where(and(eq(organizationMembers.orgId, orgId), eq(organizationMembers.userId, studentUserId), eq(organizationMembers.role, "student"), eq(organizationMembers.status, "active")))
    .limit(1);
  return Boolean(row);
}

export type OrgMemberRow = { userId: number; name: string; email: string | null; role: OrgRole; subject: string | null; joinedAt: Date; consentAt: Date | null; lastSignedIn: Date | null };

/** Kurumun aktif üyeleri; `teacherUserId` verilirse yalnızca o öğretmenin gördüğü öğrenciler (atama + sorumlu olduğu sınıf). */
export async function listMembers(orgId: number, options: { role?: OrgRole; teacherUserId?: number } = {}): Promise<OrgMemberRow[]> {
  const db = await requireDb();
  const conditions = [eq(organizationMembers.orgId, orgId), eq(organizationMembers.status, "active")];
  if (options.role) conditions.push(eq(organizationMembers.role, options.role));
  if (options.teacherUserId) {
    const visible = await teacherStudentIds(orgId, options.teacherUserId);
    if (!visible.length) return [];
    conditions.push(inArray(organizationMembers.userId, visible));
  }
  const rows = await db
    .select({ userId: organizationMembers.userId, preferredName: studentProfiles.preferredName, name: users.name, email: users.email, role: organizationMembers.role, subject: organizationMembers.subject, joinedAt: organizationMembers.joinedAt, consentAt: organizationMembers.consentAt, lastSignedIn: users.lastSignedIn })
    .from(organizationMembers)
    .innerJoin(users, eq(users.id, organizationMembers.userId))
    .leftJoin(studentProfiles, eq(studentProfiles.userId, organizationMembers.userId))
    .where(and(...conditions))
    .orderBy(users.name);
  return rows.map((row) => ({ userId: row.userId, name: row.preferredName || row.name || "İsimsiz", email: row.email, role: row.role, subject: row.subject, joinedAt: row.joinedAt, consentAt: row.consentAt, lastSignedIn: row.lastSignedIn }));
}

export async function getMemberRole(orgId: number, userId: number): Promise<OrgRole | null> {
  const db = await requireDb();
  const [row] = await db.select({ role: organizationMembers.role }).from(organizationMembers)
    .where(and(eq(organizationMembers.orgId, orgId), eq(organizationMembers.userId, userId), eq(organizationMembers.status, "active"))).limit(1);
  return row?.role ?? null;
}

export async function setMemberRole(orgId: number, userId: number, role: OrgRole): Promise<void> {
  const db = await requireDb();
  await db.update(organizationMembers).set({ role }).where(and(eq(organizationMembers.orgId, orgId), eq(organizationMembers.userId, userId), eq(organizationMembers.status, "active")));
}

/** Personelin branşı (Ayarlar → Öğretmenler). */
export async function setMemberSubject(orgId: number, userId: number, subject: string | null): Promise<boolean> {
  const db = await requireDb();
  const result = await db.update(organizationMembers).set({ subject }).where(and(eq(organizationMembers.orgId, orgId), eq(organizationMembers.userId, userId), eq(organizationMembers.status, "active"), sql`${organizationMembers.role} <> 'student'`)).returning();
  return result.length > 0;
}

/** Üyeliği bitirir ve kurumdaki tüm erişim bağlarını (atama, sınıf) kaldırır; öğrencinin kendi verisine dokunmaz. */
export async function endMembership(orgId: number, userId: number, status: "left" | "removed"): Promise<void> {
  const db = await requireDb();
  await db.update(organizationMembers).set({ status, leftAt: new Date() }).where(and(eq(organizationMembers.orgId, orgId), eq(organizationMembers.userId, userId), eq(organizationMembers.status, "active")));
  await db.update(teacherAssignments).set({ active: 0 }).where(and(eq(teacherAssignments.orgId, orgId), sql`(${teacherAssignments.studentUserId} = ${userId} OR ${teacherAssignments.teacherUserId} = ${userId})`));
  const classes = await db.select({ id: organizationClasses.id }).from(organizationClasses).where(eq(organizationClasses.orgId, orgId));
  if (classes.length) await db.delete(classStudents).where(and(eq(classStudents.studentUserId, userId), inArray(classStudents.classId, classes.map((row) => row.id))));
  await db.update(organizationClasses).set({ advisorUserId: null }).where(and(eq(organizationClasses.orgId, orgId), eq(organizationClasses.advisorUserId, userId)));
  await db.update(classTimetableSlots).set({ teacherUserId: null }).where(and(eq(classTimetableSlots.orgId, orgId), eq(classTimetableSlots.teacherUserId, userId)));
}

// --- Davet ------------------------------------------------------------------

export async function createInvitation(input: { orgId: number; role: InvitableRole; codeHash: string; note: string | null; subject?: string | null; expiresAt: Date; maxUses: number; createdBy: number }) {
  const db = await requireDb();
  const result = await db.insert(organizationInvitations).values(input).returning({ id: organizationInvitations.id });
  return Number(result[0].id);
}

export async function listInvitations(orgId: number) {
  const db = await requireDb();
  return db.select({ id: organizationInvitations.id, role: organizationInvitations.role, note: organizationInvitations.note, subject: organizationInvitations.subject, expiresAt: organizationInvitations.expiresAt, maxUses: organizationInvitations.maxUses, usedCount: organizationInvitations.usedCount, revokedAt: organizationInvitations.revokedAt, createdAt: organizationInvitations.createdAt })
    .from(organizationInvitations).where(eq(organizationInvitations.orgId, orgId)).orderBy(desc(organizationInvitations.createdAt)).limit(100);
}

export async function revokeInvitation(orgId: number, id: number): Promise<boolean> {
  const db = await requireDb();
  const result = await db.update(organizationInvitations).set({ revokedAt: new Date() }).where(and(eq(organizationInvitations.orgId, orgId), eq(organizationInvitations.id, id), isNull(organizationInvitations.revokedAt))).returning();
  return result.length > 0;
}

export async function findInvitationByHash(codeHash: string) {
  const db = await requireDb();
  const [row] = await db.select({ id: organizationInvitations.id, orgId: organizationInvitations.orgId, orgName: organizations.name, orgStatus: organizations.status, role: organizationInvitations.role, expiresAt: organizationInvitations.expiresAt, maxUses: organizationInvitations.maxUses, usedCount: organizationInvitations.usedCount, revokedAt: organizationInvitations.revokedAt, createdBy: organizationInvitations.createdBy, subject: organizationInvitations.subject, membershipStartsAt: organizations.membershipStartsAt, membershipEndsAt: organizations.membershipEndsAt })
    .from(organizationInvitations).innerJoin(organizations, eq(organizations.id, organizationInvitations.orgId))
    .where(eq(organizationInvitations.codeHash, codeHash)).limit(1);
  return row ?? null;
}

/** Daveti kullanır: üyeliği açar (eskiden ayrılmışsa yeniden etkinleştirir) ve kullanım sayısını artırır. */
export async function acceptInvitation(input: { invitationId: number; orgId: number; userId: number; role: InvitableRole; invitedBy: number; subject?: string | null; kvkkVersion?: number | null }): Promise<void> {
  const db = await requireDb();
  const now = new Date();
  const consentAt = input.role === "student" ? now : null;
  const subject = input.role === "student" ? null : input.subject ?? null;
  const kvkkVersion = input.role === "student" ? input.kvkkVersion ?? null : null;
  const [existing] = await db.select({ id: organizationMembers.id }).from(organizationMembers).where(and(eq(organizationMembers.orgId, input.orgId), eq(organizationMembers.userId, input.userId))).limit(1);
  if (existing) await db.update(organizationMembers).set({ role: input.role, status: "active", consentAt, subject, kvkkVersion, joinedAt: now, leftAt: null, invitedBy: input.invitedBy }).where(eq(organizationMembers.id, existing.id));
  else await db.insert(organizationMembers).values({ orgId: input.orgId, userId: input.userId, role: input.role, status: "active", consentAt, subject, kvkkVersion, joinedAt: now, invitedBy: input.invitedBy });
  await db.update(organizationInvitations).set({ usedCount: sql`${organizationInvitations.usedCount} + 1` }).where(eq(organizationInvitations.id, input.invitationId));
}

// --- Sınıflar ve atamalar ----------------------------------------------------

export async function listClasses(orgId: number) {
  const db = await requireDb();
  const classes = await db.select({ id: organizationClasses.id, name: organizationClasses.name, gradeLevel: organizationClasses.gradeLevel, track: organizationClasses.track, advisorUserId: organizationClasses.advisorUserId }).from(organizationClasses).where(eq(organizationClasses.orgId, orgId)).orderBy(organizationClasses.name);
  const links = classes.length ? await db.select({ classId: classStudents.classId, studentUserId: classStudents.studentUserId }).from(classStudents).where(inArray(classStudents.classId, classes.map((row) => row.id))) : [];
  return classes.map((row) => ({ ...row, studentUserIds: links.filter((link) => link.classId === row.id).map((link) => link.studentUserId) }));
}

export type ClassFields = { name: string; gradeLevel: string | null; track: string | null; advisorUserId: number | null };

export async function createClass(orgId: number, fields: ClassFields) {
  const db = await requireDb();
  const result = await db.insert(organizationClasses).values({ orgId, ...fields }).returning({ id: organizationClasses.id });
  return Number(result[0].id);
}

export async function updateClass(orgId: number, classId: number, fields: ClassFields): Promise<boolean> {
  const db = await requireDb();
  const result = await db.update(organizationClasses).set(fields).where(and(eq(organizationClasses.orgId, orgId), eq(organizationClasses.id, classId))).returning();
  return result.length > 0;
}

export async function deleteClass(orgId: number, classId: number): Promise<boolean> {
  const db = await requireDb();
  const [row] = await db.select({ id: organizationClasses.id }).from(organizationClasses).where(and(eq(organizationClasses.orgId, orgId), eq(organizationClasses.id, classId))).limit(1);
  if (!row) return false;
  await db.delete(classStudents).where(eq(classStudents.classId, classId));
  await db.delete(classTimetableSlots).where(and(eq(classTimetableSlots.orgId, orgId), eq(classTimetableSlots.classId, classId)));
  await db.delete(organizationClasses).where(eq(organizationClasses.id, classId));
  return true;
}

/** Sınıfın öğrenci listesini tamamen değiştirir; yalnızca kurumun aktif öğrencileri kabul edilir. */
export async function setClassStudents(orgId: number, classId: number, studentUserIds: number[]): Promise<boolean> {
  const db = await requireDb();
  const [row] = await db.select({ id: organizationClasses.id }).from(organizationClasses).where(and(eq(organizationClasses.orgId, orgId), eq(organizationClasses.id, classId))).limit(1);
  if (!row) return false;
  const valid = studentUserIds.length ? (await listMembers(orgId, { role: "student" })).map((member) => member.userId).filter((id) => studentUserIds.includes(id)) : [];
  await db.delete(classStudents).where(eq(classStudents.classId, classId));
  if (valid.length) await db.insert(classStudents).values(valid.map((studentUserId) => ({ classId, studentUserId })));
  return true;
}

export async function listAssignments(orgId: number) {
  const db = await requireDb();
  return db.select({ teacherUserId: teacherAssignments.teacherUserId, studentUserId: teacherAssignments.studentUserId }).from(teacherAssignments).where(and(eq(teacherAssignments.orgId, orgId), eq(teacherAssignments.active, 1)));
}

/** Öğretmenin öğrenci listesini tamamen değiştirir; yalnızca kurumun aktif öğrencileri atanabilir. */
export async function setTeacherStudents(orgId: number, teacherUserId: number, studentUserIds: number[]): Promise<number[]> {
  const db = await requireDb();
  const valid = studentUserIds.length ? (await listMembers(orgId, { role: "student" })).map((member) => member.userId).filter((id) => studentUserIds.includes(id)) : [];
  await db.update(teacherAssignments).set({ active: 0 }).where(and(eq(teacherAssignments.orgId, orgId), eq(teacherAssignments.teacherUserId, teacherUserId)));
  for (const studentUserId of valid) {
    await db.insert(teacherAssignments).values({ orgId, teacherUserId, studentUserId, active: 1 }).onConflictDoUpdate({ target: [teacherAssignments.orgId, teacherAssignments.teacherUserId, teacherAssignments.studentUserId], set: { active: 1 } });
  }
  return valid;
}

// --- Ders programı -----------------------------------------------------------

const slotColumns = { id: classTimetableSlots.id, classId: classTimetableSlots.classId, dayOfWeek: classTimetableSlots.dayOfWeek, startTime: classTimetableSlots.startTime, endTime: classTimetableSlots.endTime, subject: classTimetableSlots.subject, teacherUserId: classTimetableSlots.teacherUserId, room: classTimetableSlots.room };

/** Kurumun tüm sınıflarının dersleri (çakışma denetimi, öğretmen programı). */
export async function listOrgTimetable(orgId: number) {
  const db = await requireDb();
  return db.select(slotColumns).from(classTimetableSlots).where(eq(classTimetableSlots.orgId, orgId)).orderBy(classTimetableSlots.dayOfWeek, classTimetableSlots.startTime);
}

/** Sınıfın programını tümüyle değiştirir (denetim çağıran tarafta). */
export async function replaceClassTimetable(orgId: number, classId: number, slots: TimetableSlot[]): Promise<boolean> {
  return replaceClassTimetables(orgId, [{ classId, slots }]);
}

/** Birden çok sınıfın programı tek işlemde değişir (otomatik dağıtım: ya hepsi ya hiçbiri). */
export async function replaceClassTimetables(orgId: number, plans: Array<{ classId: number; slots: TimetableSlot[] }>): Promise<boolean> {
  const db = await requireDb();
  const classIds = plans.map((plan) => plan.classId);
  if (!classIds.length) return true;
  const rows = await db.select({ id: organizationClasses.id }).from(organizationClasses).where(and(eq(organizationClasses.orgId, orgId), inArray(organizationClasses.id, classIds)));
  if (rows.length !== new Set(classIds).size) return false;
  await db.transaction(async (tx) => {
    await tx.delete(classTimetableSlots).where(and(eq(classTimetableSlots.orgId, orgId), inArray(classTimetableSlots.classId, classIds)));
    const values = plans.flatMap((plan) => plan.slots.map((slot) => ({ ...slot, orgId, classId: plan.classId })));
    if (values.length) await tx.insert(classTimetableSlots).values(values);
  });
  return true;
}

/**
 * Öğrencinin dershane programı: aktif üyesi olduğu kurumlarda bulunduğu sınıfların dersleri,
 * öğretmen adıyla. Öğrenci uygulaması (Ders programım) ve AI haftalık plan bunu okur.
 */
export async function listStudentTimetable(studentUserId: number) {
  const db = await requireDb();
  return db
    .select({ orgName: organizations.name, className: organizationClasses.name, dayOfWeek: classTimetableSlots.dayOfWeek, startTime: classTimetableSlots.startTime, endTime: classTimetableSlots.endTime, subject: classTimetableSlots.subject, room: classTimetableSlots.room, teacherName: users.name })
    .from(classStudents)
    .innerJoin(organizationClasses, eq(organizationClasses.id, classStudents.classId))
    .innerJoin(organizationMembers, and(eq(organizationMembers.orgId, organizationClasses.orgId), eq(organizationMembers.userId, classStudents.studentUserId), eq(organizationMembers.role, "student"), eq(organizationMembers.status, "active")))
    .innerJoin(organizations, eq(organizations.id, organizationClasses.orgId))
    .innerJoin(classTimetableSlots, eq(classTimetableSlots.classId, organizationClasses.id))
    .leftJoin(users, eq(users.id, classTimetableSlots.teacherUserId))
    .where(eq(classStudents.studentUserId, studentUserId))
    .orderBy(classTimetableSlots.dayOfWeek, classTimetableSlots.startTime);
}

// --- Görüşme notları ve denetim kaydı ---------------------------------------

export async function listNotes(orgId: number, studentUserId: number) {
  const db = await requireDb();
  return db.select({ id: counselingNotes.id, body: counselingNotes.body, visibility: counselingNotes.visibility, authorUserId: counselingNotes.authorUserId, authorName: users.name, createdAt: counselingNotes.createdAt })
    .from(counselingNotes).innerJoin(users, eq(users.id, counselingNotes.authorUserId))
    .where(and(eq(counselingNotes.orgId, orgId), eq(counselingNotes.studentUserId, studentUserId))).orderBy(desc(counselingNotes.createdAt)).limit(200);
}

export async function createNote(input: { orgId: number; studentUserId: number; authorUserId: number; body: string; visibility: "staff" | "student" }) {
  const db = await requireDb();
  const result = await db.insert(counselingNotes).values(input).returning({ id: counselingNotes.id });
  return Number(result[0].id);
}

export async function getNote(orgId: number, id: number) {
  const db = await requireDb();
  const [row] = await db.select({ id: counselingNotes.id, studentUserId: counselingNotes.studentUserId, authorUserId: counselingNotes.authorUserId }).from(counselingNotes).where(and(eq(counselingNotes.orgId, orgId), eq(counselingNotes.id, id))).limit(1);
  return row ?? null;
}

export async function deleteNote(orgId: number, id: number): Promise<void> {
  const db = await requireDb();
  await db.delete(counselingNotes).where(and(eq(counselingNotes.orgId, orgId), eq(counselingNotes.id, id)));
}

/** Öğrencinin görebildiği geri bildirimler: yalnızca aktif üyesi olduğu kurumlardan, `student` görünürlüklü notlar. */
export async function listStudentFeedback(studentUserId: number) {
  const db = await requireDb();
  return db.select({ id: counselingNotes.id, body: counselingNotes.body, orgName: organizations.name, authorName: users.name, createdAt: counselingNotes.createdAt })
    .from(counselingNotes)
    .innerJoin(organizationMembers, and(eq(organizationMembers.orgId, counselingNotes.orgId), eq(organizationMembers.userId, studentUserId), eq(organizationMembers.status, "active")))
    .innerJoin(organizations, eq(organizations.id, counselingNotes.orgId))
    .innerJoin(users, eq(users.id, counselingNotes.authorUserId))
    .where(and(eq(counselingNotes.studentUserId, studentUserId), eq(counselingNotes.visibility, "student")))
    .orderBy(desc(counselingNotes.createdAt)).limit(20);
}

export async function writeAudit(input: { orgId: number; actorUserId: number; action: string; targetType?: string; targetId?: number; metadata?: Record<string, unknown> }) {
  const db = await requireDb();
  await db.insert(organizationAuditLogs).values({ orgId: input.orgId, actorUserId: input.actorUserId, action: input.action, targetType: input.targetType ?? null, targetId: input.targetId ?? null, metadataJson: input.metadata ? JSON.stringify(input.metadata) : null });
}

export async function listAudit(orgId: number) {
  const db = await requireDb();
  return db.select({ id: organizationAuditLogs.id, action: organizationAuditLogs.action, targetType: organizationAuditLogs.targetType, targetId: organizationAuditLogs.targetId, metadataJson: organizationAuditLogs.metadataJson, actorName: users.name, createdAt: organizationAuditLogs.createdAt })
    .from(organizationAuditLogs).innerJoin(users, eq(users.id, organizationAuditLogs.actorUserId))
    .where(eq(organizationAuditLogs.orgId, orgId)).orderBy(desc(organizationAuditLogs.createdAt)).limit(200);
}

// --- Öğrenci verisi (SALT OKUNUR) --------------------------------------------
// Personel ekranı öğrencinin verisini değiştirmemeli: getStudyCalendar gecikmiş oturumları
// yeniden planladığı (yazdığı) için burada kullanılmaz.

/** Birden çok öğrencinin liste/panel sinyalleri, öğrenci başına değil toplu sorgularla. */
export async function loadStudentSignals(studentUserIds: number[], weekStart: Date, weekEnd: Date, logsSince: Date): Promise<Map<number, StudentSignals>> {
  const signals = new Map<number, StudentSignals>(studentUserIds.map((id) => [id, { exams: [], logs: [], weekSessions: [], weakTopicCount: 0, lastSignedIn: null }]));
  if (!studentUserIds.length) return signals;
  const db = await requireDb();
  const [exams, logs, sessions, weak, signins] = await Promise.all([
    db.select({ userId: userMockExams.userId, exam: userMockExams.exam, examDate: userMockExams.examDate, net: userMockExams.net }).from(userMockExams).where(inArray(userMockExams.userId, studentUserIds)),
    db.select({ userId: topicStudyLogs.userId, studyDate: topicStudyLogs.studyDate, minutes: topicStudyLogs.minutes }).from(topicStudyLogs).where(and(inArray(topicStudyLogs.userId, studentUserIds), gte(topicStudyLogs.studyDate, logsSince))),
    db.select({ userId: studyPlanSessions.userId, status: studyPlanSessions.status, plannedMinutes: studyPlanSessions.plannedMinutes, actualMinutes: studyPlanSessions.actualMinutes, targetQuestions: studyPlanSessions.targetQuestions, actualQuestions: studyPlanSessions.actualQuestions, sessionDate: studyPlanSessions.sessionDate, rescheduledFrom: studyPlanSessions.rescheduledFrom }).from(studyPlanSessions).where(and(inArray(studyPlanSessions.userId, studentUserIds), gte(studyPlanSessions.sessionDate, weekStart), lt(studyPlanSessions.sessionDate, weekEnd))),
    db.select({ userId: topicProgress.userId, count: sql<number>`COUNT(*)::int` }).from(topicProgress).where(and(inArray(topicProgress.userId, studentUserIds), eq(topicProgress.status, "weak"))).groupBy(topicProgress.userId),
    db.select({ id: users.id, lastSignedIn: users.lastSignedIn }).from(users).where(inArray(users.id, studentUserIds)),
  ]);
  for (const row of exams) signals.get(row.userId)?.exams.push({ exam: row.exam, examDate: row.examDate, net: Number(row.net) });
  for (const row of logs) signals.get(row.userId)?.logs.push({ studyDate: row.studyDate, minutes: row.minutes });
  for (const row of sessions) signals.get(row.userId)?.weekSessions.push({ ...row, status: row.status });
  for (const row of weak) { const entry = signals.get(row.userId); if (entry) entry.weakTopicCount = Number(row.count); }
  for (const row of signins) { const entry = signals.get(row.id); if (entry) entry.lastSignedIn = row.lastSignedIn; }
  return signals;
}

/** Öğrenci detayı için takvim (yeniden planlama YAPMADAN). */
export async function getStudentCalendarReadOnly(studentUserId: number, since: Date) {
  const db = await requireDb();
  const [sessions, logs] = await Promise.all([
    db.select().from(studyPlanSessions).where(and(eq(studyPlanSessions.userId, studentUserId), gte(studyPlanSessions.sessionDate, since))).orderBy(studyPlanSessions.sessionDate).limit(300),
    db.select().from(topicStudyLogs).where(and(eq(topicStudyLogs.userId, studentUserId), gte(topicStudyLogs.studyDate, since))).orderBy(desc(topicStudyLogs.studyDate)).limit(300),
  ]);
  return { sessions, logs };
}

/** Öğrencinin o günkü planlı oturumları (görev atarken çakışma denetimi için; tamamlanan/atlanan yer tutmaz). */
export async function listPlannedSessionsOn(studentUserId: number, day: Date) {
  const db = await requireDb();
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return db.select({ sessionDate: studyPlanSessions.sessionDate, plannedMinutes: studyPlanSessions.plannedMinutes, status: studyPlanSessions.status, title: studyPlanSessions.title }).from(studyPlanSessions)
    .where(and(eq(studyPlanSessions.userId, studentUserId), eq(studyPlanSessions.status, "planned"), gte(studyPlanSessions.sessionDate, start), lt(studyPlanSessions.sessionDate, end)));
}

/** Öğretmenin öğrenciye atadığı görev: öğrencinin takvimine "kim atadı" bilgisiyle tek oturum ekler. */
export async function insertAssignedTask(input: { orgId: number; studentUserId: number; teacherUserId: number; sessionDate: Date; title: string; subject: string; topic: string; kind: string; plannedMinutes: number; targetQuestions: number | null; summary: string; caseActionId?: number | null; targetPages?: string | null; sourceBookId?: string | null }) {
  const db = await requireDb();
  const dayStart = new Date(input.sessionDate); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
  const plan = await db.insert(studyPlans).values({ userId: input.studentUserId, title: "Öğretmenin atadığı görevler", weekStart: dayStart, weekEnd: dayEnd, summary: input.summary, source: "manual" }).returning({ id: studyPlans.id });
  const session = await db.insert(studyPlanSessions).values({ userId: input.studentUserId, planId: Number(plan[0].id), sessionDate: input.sessionDate, title: input.title, subject: input.subject, topic: input.topic, kind: input.kind, plannedMinutes: input.plannedMinutes, targetQuestions: input.targetQuestions, assignedByUserId: input.teacherUserId, assignedOrgId: input.orgId, caseActionId: input.caseActionId ?? null, targetPages: input.targetPages ?? null, sourceBookId: input.sourceBookId ?? null }).returning({ id: studyPlanSessions.id });
  return Number(session[0].id);
}

// --- Platform admini ----------------------------------------------------------

export type OrganizationProfile = { name: string; kind: OrgKind; city: string | null; district: string | null; address: string | null; phone: string | null; contactEmail: string | null };

export async function getOrganization(orgId: number) {
  const db = await requireDb();
  const [row] = await db.select({
    id: organizations.id, name: organizations.name, slug: organizations.slug, kind: organizations.kind, city: organizations.city, district: organizations.district, address: organizations.address, phone: organizations.phone, contactEmail: organizations.contactEmail, createdAt: organizations.createdAt,
    plan: organizations.plan, membershipStartsAt: organizations.membershipStartsAt, membershipEndsAt: organizations.membershipEndsAt, aiCreditsMonthly: organizations.aiCreditsMonthly, perStudentCreditCap: organizations.perStudentCreditCap,
    kvkkNotice: organizations.kvkkNotice, kvkkConsent: organizations.kvkkConsent, kvkkVersion: organizations.kvkkVersion, kvkkUpdatedAt: organizations.kvkkUpdatedAt,
  }).from(organizations).where(eq(organizations.id, orgId)).limit(1);
  return row ?? null;
}

/** Platform yöneticisi: paket, süre ve aylık AI kredisi. */
export async function updateOrgMembership(orgId: number, input: { plan: OrgPlan; membershipStartsAt: Date | null; membershipEndsAt: Date | null; aiCreditsMonthly: number }): Promise<void> {
  const db = await requireDb();
  await db.update(organizations).set(input).where(eq(organizations.id, orgId));
}

export async function setPerStudentCreditCap(orgId: number, cap: number | null): Promise<void> {
  const db = await requireDb();
  await db.update(organizations).set({ perStudentCreditCap: cap }).where(eq(organizations.id, orgId));
}

/** KVKK metinlerini kaydeder (null = platform şablonuna dön) ve sürümü bir artırır; yeni katılanlar yeni sürümü onaylar. */
export async function updateKvkk(orgId: number, notice: string | null, consent: string | null): Promise<void> {
  const db = await requireDb();
  await db.update(organizations).set({ kvkkNotice: notice, kvkkConsent: consent, kvkkVersion: sql`${organizations.kvkkVersion} + 1`, kvkkUpdatedAt: new Date() }).where(eq(organizations.id, orgId));
}

/** Öğrencilerin onayladığı KVKK sürümleri (Ayarlar → KVKK özetinde). */
export async function listStudentKvkkVersions(orgId: number): Promise<Array<number | null>> {
  const db = await requireDb();
  const rows = await db.select({ kvkkVersion: organizationMembers.kvkkVersion }).from(organizationMembers).where(and(eq(organizationMembers.orgId, orgId), eq(organizationMembers.role, "student"), eq(organizationMembers.status, "active")));
  return rows.map((row) => row.kvkkVersion);
}

export async function updateOrganization(orgId: number, profile: OrganizationProfile): Promise<void> {
  const db = await requireDb();
  await db.update(organizations).set(profile).where(eq(organizations.id, orgId));
}

export async function createOrganization(name: string, slug: string) {
  const db = await requireDb();
  const result = await db.insert(organizations).values({ name, slug }).returning({ id: organizations.id });
  return Number(result[0].id);
}

export async function listOrganizations() {
  const db = await requireDb();
  const rows = await db.select({ id: organizations.id, name: organizations.name, slug: organizations.slug, status: organizations.status, createdAt: organizations.createdAt, plan: organizations.plan, membershipStartsAt: organizations.membershipStartsAt, membershipEndsAt: organizations.membershipEndsAt, aiCreditsMonthly: organizations.aiCreditsMonthly }).from(organizations).orderBy(desc(organizations.createdAt));
  const counts = rows.length ? await db.select({ orgId: organizationMembers.orgId, role: organizationMembers.role, count: sql<number>`COUNT(*)::int` }).from(organizationMembers).where(and(inArray(organizationMembers.orgId, rows.map((row) => row.id)), eq(organizationMembers.status, "active"))).groupBy(organizationMembers.orgId, organizationMembers.role) : [];
  return rows.map((row) => ({ ...row, students: Number(counts.find((count) => count.orgId === row.id && count.role === "student")?.count ?? 0), staff: counts.filter((count) => count.orgId === row.id && count.role !== "student").reduce((sum, count) => sum + Number(count.count), 0) }));
}

export async function setOrganizationStatus(orgId: number, status: "active" | "suspended") {
  const db = await requireDb();
  await db.update(organizations).set({ status }).where(eq(organizations.id, orgId));
}

// --- Paket yükseltme talepleri ------------------------------------------------

const upgradeColumns = { id: organizationUpgradeRequests.id, orgId: organizationUpgradeRequests.orgId, currentPlan: organizationUpgradeRequests.currentPlan, requestedPlan: organizationUpgradeRequests.requestedPlan, note: organizationUpgradeRequests.note, status: organizationUpgradeRequests.status, createdAt: organizationUpgradeRequests.createdAt, resolvedAt: organizationUpgradeRequests.resolvedAt, requestedBy: organizationUpgradeRequests.requestedBy };

export async function createUpgradeRequest(input: { orgId: number; requestedBy: number; currentPlan: OrgPlan; requestedPlan: OrgPlan; note: string | null }) {
  const db = await requireDb();
  const result = await db.insert(organizationUpgradeRequests).values(input).returning({ id: organizationUpgradeRequests.id });
  return Number(result[0].id);
}

/** Kurumun son talepleri (en yeni önce). */
export async function listOrgUpgradeRequests(orgId: number) {
  const db = await requireDb();
  return db.select(upgradeColumns).from(organizationUpgradeRequests).where(eq(organizationUpgradeRequests.orgId, orgId)).orderBy(desc(organizationUpgradeRequests.createdAt)).limit(10);
}

export async function cancelUpgradeRequest(orgId: number, requestId: number): Promise<boolean> {
  const db = await requireDb();
  const result = await db.update(organizationUpgradeRequests).set({ status: "canceled", resolvedAt: new Date() }).where(and(eq(organizationUpgradeRequests.orgId, orgId), eq(organizationUpgradeRequests.id, requestId), eq(organizationUpgradeRequests.status, "pending"))).returning();
  return result.length > 0;
}

/** Platform yöneticisi: bekleyen talepler, kurum ve talep eden adıyla. */
export async function listPendingUpgradeRequests() {
  const db = await requireDb();
  return db.select({ ...upgradeColumns, orgName: organizations.name, requesterName: users.name, requesterEmail: users.email, membershipEndsAt: organizations.membershipEndsAt })
    .from(organizationUpgradeRequests)
    .innerJoin(organizations, eq(organizations.id, organizationUpgradeRequests.orgId))
    .innerJoin(users, eq(users.id, organizationUpgradeRequests.requestedBy))
    .where(eq(organizationUpgradeRequests.status, "pending"))
    .orderBy(organizationUpgradeRequests.createdAt);
}

export async function getUpgradeRequest(requestId: number) {
  const db = await requireDb();
  const [row] = await db.select(upgradeColumns).from(organizationUpgradeRequests).where(eq(organizationUpgradeRequests.id, requestId)).limit(1);
  return row ?? null;
}

/** Yalnızca bekleyen talep sonuçlandırılır (aynı talep iki kez onaylanmaz). */
export async function resolveUpgradeRequest(requestId: number, status: "approved" | "rejected", resolvedBy: number): Promise<boolean> {
  const db = await requireDb();
  const result = await db.update(organizationUpgradeRequests).set({ status, resolvedBy, resolvedAt: new Date() }).where(and(eq(organizationUpgradeRequests.id, requestId), eq(organizationUpgradeRequests.status, "pending"))).returning();
  return result.length > 0;
}
