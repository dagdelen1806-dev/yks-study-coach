import { TRPCError } from "@trpc/server";
import { createHash, randomInt } from "node:crypto";
import { z } from "zod";
import { getStaffDigestEnabled, setStaffDigestEnabled } from "../digest/teacherDigest";
import { fromMinutes, toMinutes } from "../../shared/classSchedule";
import { busyOn, describeInterval, findTaskConflict, suggestStart } from "../../shared/planPlacement";
import { effectiveKvkk } from "../../shared/kvkk";
import { MAX_TIMETABLE_SLOTS_PER_CLASS, branchMismatch, describeConflict, findCrossClassConflicts, sortSlots, validateClassTimetable } from "../../shared/orgTimetable";
import { EXAM_KINDS, type ExamKind } from "../../shared/exams";
import { CLASS_GRADES, CLASS_TRACKS, INVITABLE_ROLES, ORG_KINDS, ORG_PLANS, ORG_PLAN_DEFAULT_CREDITS, ORG_PLAN_LABELS, ORG_ROLES, canRequestPlan, membershipState, renewedMembershipEnd, canAssignRole, canInviteRole, generateInviteCode, hasRole, invitationProblem, isStaffRole, normalizeInviteCode, seesAllStudents, summarizeStudent, type RiskKey, type StudentSummary } from "../../shared/org";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { getStudentProfile, getUserMockExams, getUserTopicProgress } from "../db";
import { audit, assertCanViewStudent, orgProcedure, type OrgContext } from "../org/orgAccess";
import {
  OrgError,
  acceptInvitation,
  createClass,
  createInvitation,
  createNote,
  createOrganization,
  deleteClass,
  deleteNote,
  endMembership,
  findInvitationByHash,
  getMemberRole,
  getNote,
  getOrganization,
  getStudentCalendarReadOnly,
  insertAssignedTask,
  listAssignments,
  listAudit,
  listClasses,
  listInvitations,
  listMembers,
  listMyMemberships,
  listNotes,
  listOrganizations,
  listOrgTimetable,
  listPlannedSessionsOn,
  listStudentTimetable,
  replaceClassTimetables,
  listStudentFeedback,
  loadStudentSignals,
  revokeInvitation,
  setClassStudents,
  setMemberRole,
  setMemberSubject,
  setPerStudentCreditCap,
  cancelUpgradeRequest,
  createUpgradeRequest,
  getUpgradeRequest,
  listOrgUpgradeRequests,
  listPendingUpgradeRequests,
  resolveUpgradeRequest,
  writeAudit,
  listStudentKvkkVersions,
  updateKvkk,
  updateOrgMembership,
  setOrganizationStatus,
  setTeacherStudents,
  updateClass,
  updateOrganization,
} from "../org/orgDb";
import { getClassSchedule, getCourseBlocks } from "../schedule/classScheduleDb";
import { canReadNotes, filterPrivateNotes, notifyStudentOfTasks } from "../org/caseDb";
import { orgCasesRouter } from "./orgCases";
import { creditsUsedThisMonth, orgCreditReport } from "../org/orgCredits";

const id = z.number().int().positive();
const hashCode = (code: string) => createHash("sha256").update(normalizeInviteCode(code)).digest("hex");
const DAY = 24 * 60 * 60 * 1000;

async function userFacing<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof OrgError) throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
    throw error;
  }
}

/** Bu haftanın (Pazartesi 00:00 → gelecek Pazartesi) sınırları. */
function currentWeek(now = new Date()) {
  const start = new Date(now); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const end = new Date(start); end.setDate(end.getDate() + 7);
  return { start, end };
}

/** Rolün görebildiği öğrenciler + her biri için özet (toplu sorgularla, salt okunur). */
async function visibleStudentsWithSummary(ctx: OrgContext) {
  const { orgId, role } = ctx.membership;
  const students = await listMembers(orgId, seesAllStudents(role) ? { role: "student" } : { role: "student", teacherUserId: ctx.user.id });
  const { start, end } = currentWeek();
  const signals = await loadStudentSignals(students.map((student) => student.userId), start, end, new Date(Date.now() - 30 * DAY));
  return students.map((student) => ({ ...student, summary: summarizeStudent(signals.get(student.userId)!) }));
}

/** Boş metni null yapan isteğe bağlı alan (Ayarlar formları). */
const optionalText = (max: number) => z.string().trim().max(max).optional().transform((value) => value || null);
const classInput = z.object({ name: z.string().trim().min(1).max(80), gradeLevel: z.enum(CLASS_GRADES).nullable().optional(), track: z.enum(CLASS_TRACKS).nullable().optional(), advisorUserId: id.nullable().optional() });

/** Sınıfın sorumlu öğretmeni kurumun aktif personeli olmalı. */
async function classFields(orgId: number, input: z.infer<typeof classInput>) {
  if (input.advisorUserId) {
    const role = await getMemberRole(orgId, input.advisorUserId);
    if (!role || !isStaffRole(role)) throw new TRPCError({ code: "NOT_FOUND", message: "Sorumlu öğretmen bulunamadı." });
  }
  return { name: input.name, gradeLevel: input.gradeLevel ?? null, track: input.track ?? null, advisorUserId: input.advisorUserId ?? null };
}

const timetableSlotInput = z.object({
  dayOfWeek: z.number().int().min(1).max(7),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  subject: z.string().trim().min(1).max(60),
  teacherUserId: id.nullable(),
  room: optionalText(40),
});

/**
 * Sınıf programlarını doğrulayıp kaydeder. Gönderilen sınıflar birbirleriyle ve kurumdaki diğer
 * sınıfların kayıtlı programıyla çakışamaz (öğretmen/derslik). Branş dışı atama yalnızca uyarıdır.
 */
async function saveTimetables(ctx: OrgContext, plans: Array<{ classId: number; slots: z.infer<typeof timetableSlotInput>[] }>) {
  const orgId = ctx.membership.orgId;
  const prepared = plans.map((plan) => ({ classId: plan.classId, slots: sortSlots(plan.slots.map((slot) => ({ ...slot, room: slot.room ?? null }))) }));
  if (new Set(prepared.map((plan) => plan.classId)).size !== prepared.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Bir sınıf iki kez gönderildi." });
  const [members, classes, current] = await Promise.all([listMembers(orgId), listClasses(orgId), listOrgTimetable(orgId)]);
  const staff = new Map(members.filter((member) => isStaffRole(member.role)).map((member) => [member.userId, member]));
  const className = (classId: number) => classes.find((item) => item.id === classId)?.name ?? "başka bir";
  for (const plan of prepared) {
    if (!classes.some((item) => item.id === plan.classId)) throw new TRPCError({ code: "NOT_FOUND", message: "Sınıf bulunamadı." });
    const problem = validateClassTimetable(plan.slots);
    if (problem) throw new TRPCError({ code: "BAD_REQUEST", message: prepared.length > 1 ? `${className(plan.classId)}: ${problem}` : problem });
    if (plan.slots.some((slot) => slot.teacherUserId && !staff.has(slot.teacherUserId))) throw new TRPCError({ code: "NOT_FOUND", message: "Öğretmen bulunamadı." });
  }
  const replaced = new Set(prepared.map((plan) => plan.classId));
  const placed = [...current.filter((slot) => !replaced.has(slot.classId)).map((slot) => ({ ...slot, room: slot.room ?? null })), ...prepared.flatMap((plan) => plan.slots.map((slot) => ({ ...slot, classId: plan.classId })))];
  const conflicts = prepared.flatMap((plan) => findCrossClassConflicts(plan.classId, plan.slots, placed));
  if (conflicts.length) {
    const names = { teacher: (userId: number) => staff.get(userId)?.name ?? "Öğretmen", className };
    throw new TRPCError({ code: "CONFLICT", message: conflicts.slice(0, 3).map((conflict) => describeConflict(conflict, names)).join(" ") });
  }
  await replaceClassTimetables(orgId, prepared);
  for (const plan of prepared) await audit(ctx, "timetable.update", { type: "class", id: plan.classId }, { slots: plan.slots.length, auto: prepared.length > 1 });
  const warnings = prepared.flatMap((plan) => plan.slots).filter((slot) => slot.teacherUserId && branchMismatch(slot.subject, staff.get(slot.teacherUserId)?.subject ?? null))
    .map((slot) => `${staff.get(slot.teacherUserId!)?.name} (${staff.get(slot.teacherUserId!)?.subject}) ${slot.subject} dersine atandı.`);
  return { ok: true, warnings: Array.from(new Set(warnings)) };
}

const average = (values: number[]) => (values.length ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10 : null);

export const orgRouter = router({
  /** Kullanıcının aktif kurum üyelikleri: panel yönlendirmesi ve kurum seçici. */
  mine: protectedProcedure.query(({ ctx }) => listMyMemberships(ctx.user.id)),

  /** Personelin pazar akşamı aldığı sınıf özeti (server/digest/teacherDigest.ts); üyelik başına. */
  myDigest: orgProcedure("teacher").query(async ({ ctx }) => ({ enabled: await getStaffDigestEnabled(ctx.user.id, ctx.membership.orgId) })),
  setMyDigest: orgProcedure("teacher", { allowInactive: true }).input(z.object({ enabled: z.boolean() })).mutation(async ({ ctx, input }) => ({ enabled: await setStaffDigestEnabled(ctx.user.id, ctx.membership.orgId, input.enabled) })),

  overview: orgProcedure("teacher").query(async ({ ctx }) => {
    const students = await visibleStudentsWithSummary(ctx);
    const classes = await listClasses(ctx.membership.orgId);
    const adherence = students.map((student) => student.summary.adherence).filter((value): value is number => value !== null);
    const atRisk = students.filter((student) => student.summary.risks.length).sort((a, b) => b.summary.risks.length - a.summary.risks.length).slice(0, 10);
    return {
      orgName: ctx.membership.orgName,
      role: ctx.membership.role,
      totals: {
        students: students.length,
        activeThisWeek: students.filter((student) => student.summary.weekMinutes > 0).length,
        averageAdherence: average(adherence),
        averageLastTyt: average(students.map((student) => student.summary.lastTyt?.net).filter((value): value is number => typeof value === "number")),
        // Her sınav türü için öğrencilerin son denemelerinin ortalaması (yalnız denemesi olan türler).
        averageByKind: Object.fromEntries(EXAM_KINDS.flatMap((kind) => {
          const value = average(students.map((student) => student.summary.lastByKind[kind]?.net).filter((net): net is number => typeof net === "number"));
          return value === null ? [] : [[kind, value]];
        })) as Partial<Record<ExamKind, number>>,
        atRisk: students.filter((student) => student.summary.risks.length).length,
        weekMinutes: students.reduce((sum, student) => sum + student.summary.weekMinutes, 0),
      },
      atRisk: atRisk.map((student) => ({ userId: student.userId, name: student.name, risks: student.summary.risks, lastActivityAt: student.summary.lastActivityAt, adherence: student.summary.adherence })),
      classes: classes.map((item) => {
        const members = students.filter((student) => item.studentUserIds.includes(student.userId));
        return { id: item.id, name: item.name, students: members.length, averageAdherence: average(members.map((member) => member.summary.adherence).filter((value): value is number => value !== null)), averageLastTyt: average(members.map((member) => member.summary.lastTyt?.net).filter((value): value is number => typeof value === "number")) };
      }),
    };
  }),

  students: orgProcedure("teacher")
    .input(z.object({ classId: id.optional(), teacherUserId: id.optional(), risk: z.enum(["inactive", "low_adherence", "net_drop", "any"]).optional(), q: z.string().max(80).optional() }))
    .query(async ({ ctx, input }) => {
      const students = await visibleStudentsWithSummary(ctx);
      const [classes, assignments, teachers] = await Promise.all([listClasses(ctx.membership.orgId), listAssignments(ctx.membership.orgId), listMembers(ctx.membership.orgId, { role: "teacher" })]);
      const query = input.q?.trim().toLocaleLowerCase("tr") ?? "";
      return students
        .map((student) => ({
          userId: student.userId,
          name: student.name,
          joinedAt: student.joinedAt,
          classes: classes.filter((item) => item.studentUserIds.includes(student.userId)).map((item) => ({ id: item.id, name: item.name })),
          teachers: assignments.filter((row) => row.studentUserId === student.userId).map((row) => ({ userId: row.teacherUserId, name: teachers.find((teacher) => teacher.userId === row.teacherUserId)?.name ?? "Öğretmen" })),
          summary: student.summary as StudentSummary,
        }))
        .filter((student) => (!input.classId || student.classes.some((item) => item.id === input.classId))
          && (!input.teacherUserId || student.teachers.some((teacher) => teacher.userId === input.teacherUserId))
          && (!input.risk || (input.risk === "any" ? student.summary.risks.length > 0 : student.summary.risks.includes(input.risk as RiskKey)))
          && (!query || student.name.toLocaleLowerCase("tr").includes(query)));
    }),

  student: orgProcedure("teacher").input(z.object({ studentUserId: id })).query(async ({ ctx, input }) => {
    await assertCanViewStudent(ctx, input.studentUserId);
    const since = new Date(Date.now() - 42 * DAY);
    const { start, end } = currentWeek();
    const [profile, exams, topics, calendar, notes, signals, classes, assignments, teachers] = await Promise.all([
      getStudentProfile(input.studentUserId),
      getUserMockExams(input.studentUserId),
      getUserTopicProgress(input.studentUserId),
      getStudentCalendarReadOnly(input.studentUserId, since),
      listNotes(ctx.membership.orgId, input.studentUserId),
      loadStudentSignals([input.studentUserId], start, end, new Date(Date.now() - 30 * DAY)),
      listClasses(ctx.membership.orgId),
      listAssignments(ctx.membership.orgId),
      listMembers(ctx.membership.orgId, { role: "teacher" }),
    ]);
    const member = (await listMembers(ctx.membership.orgId, { role: "student" })).find((row) => row.userId === input.studentUserId)!;
    return {
      student: { userId: input.studentUserId, name: member.name, joinedAt: member.joinedAt, consentAt: member.consentAt },
      // Profilden yalnızca koçluk için gerekenler (iletişim/kimlik bilgisi yok).
      profile: { examTrack: profile.examTrack, gradeLevel: profile.gradeLevel, examYear: profile.examYear, targetScoreType: profile.targetScoreType, targetUniversity: profile.targetUniversity, targetDepartment: profile.targetDepartment, targetGoal: profile.targetGoal, targetScore: profile.targetScore, dailyStudyDuration: profile.dailyStudyDuration, avatarStyle: profile.avatarStyle },
      summary: summarizeStudent(signals.get(input.studentUserId)!),
      exams,
      topics: topics.filter((topic) => !topic.insufficientData),
      sessions: calendar.sessions.map((session) => ({ id: session.id, sessionDate: session.sessionDate, title: session.title, subject: session.subject, topic: session.topic, kind: session.kind, plannedMinutes: session.plannedMinutes, status: session.status, actualMinutes: session.actualMinutes, actualQuestions: session.actualQuestions, correct: session.correct, assignedByUserId: session.assignedByUserId, abandonedAt: session.abandonedAt })),
      logs: calendar.logs.map((log) => ({ studyDate: log.studyDate, subject: log.subject, topic: log.topic, minutes: log.minutes, questions: log.questions, correct: log.correct })),
      // Görüşme notları mahrem: yalnızca yazanı ve öğrencinin sorumlu öğretmenleri görür (koordinatör/yönetici görmez).
      notes: filterPrivateNotes(notes, ctx.user.id, await canReadNotes(ctx.membership.orgId, ctx.user.id, input.studentUserId)),
      classes: classes.filter((item) => item.studentUserIds.includes(input.studentUserId)).map((item) => ({ id: item.id, name: item.name })),
      teachers: assignments.filter((row) => row.studentUserId === input.studentUserId).map((row) => ({ userId: row.teacherUserId, name: teachers.find((teacher) => teacher.userId === row.teacherUserId)?.name ?? "Öğretmen" })),
    };
  }),

  /** Ayarlar → Kurum bilgileri: personel görür, yalnızca yönetici düzenler. */
  settings: router({
    get: orgProcedure("teacher").query(async ({ ctx }) => {
      const org = await getOrganization(ctx.membership.orgId);
      if (!org) throw new TRPCError({ code: "NOT_FOUND", message: "Kurum bulunamadı." });
      return { ...org, membershipState: membershipState(org), kvkk: effectiveKvkk(org) };
    }),
    /** Kurum yöneticisi: öğrenci başına aylık AI kredi üst sınırı (null = sınırsız). */
    setCreditCap: orgProcedure("admin").input(z.object({ cap: z.number().int().min(1).max(1_000_000).nullable() })).mutation(async ({ ctx, input }) => {
      await setPerStudentCreditCap(ctx.membership.orgId, input.cap);
      await audit(ctx, "org.credit_cap", { type: "organization", id: ctx.membership.orgId }, { cap: input.cap });
      return { ok: true };
    }),
    credits: orgProcedure("coordinator").query(async ({ ctx }) => {
      const org = await getOrganization(ctx.membership.orgId);
      if (!org) throw new TRPCError({ code: "NOT_FOUND", message: "Kurum bulunamadı." });
      const report = await orgCreditReport(ctx.membership.orgId);
      return { monthly: org.aiCreditsMonthly, cap: org.perStudentCreditCap, remaining: Math.max(0, org.aiCreditsMonthly - report.used), ...report };
    }),
    /** KVKK metinleri: boş gönderilen metin platform şablonuna döner. Her kayıtta sürüm artar. */
    updateKvkk: orgProcedure("admin").input(z.object({ notice: z.string().trim().max(20000).nullable(), consent: z.string().trim().max(5000).nullable() })).mutation(async ({ ctx, input }) => {
      await updateKvkk(ctx.membership.orgId, input.notice || null, input.consent || null);
      await audit(ctx, "org.kvkk", { type: "organization", id: ctx.membership.orgId }, { custom: Boolean(input.notice || input.consent) });
      return { ok: true };
    }),
    /** Paket yükseltme / süre uzatma talebi: kurum yöneticisi gönderir, platform yöneticisi onaylar. Süresi dolmuş kurumda da açık. */
    upgrades: orgProcedure("admin").query(({ ctx }) => listOrgUpgradeRequests(ctx.membership.orgId)),
    requestUpgrade: orgProcedure("admin", { allowInactive: true }).input(z.object({ plan: z.enum(ORG_PLANS), note: z.string().trim().max(300).optional() })).mutation(({ ctx, input }) => userFacing(async () => {
      const org = await getOrganization(ctx.membership.orgId);
      if (!org) throw new TRPCError({ code: "NOT_FOUND", message: "Kurum bulunamadı." });
      if (!canRequestPlan(org.plan, input.plan)) throw new OrgError("Bu pakete geçiş talep edilemez; yalnızca üst pakete yükseltme ya da süre uzatma istenebilir.");
      if ((await listOrgUpgradeRequests(ctx.membership.orgId)).some((row) => row.status === "pending")) throw new OrgError("Zaten bekleyen bir talebin var; sonuçlanmasını bekle ya da iptal et.");
      const requestId = await createUpgradeRequest({ orgId: ctx.membership.orgId, requestedBy: ctx.user.id, currentPlan: org.plan, requestedPlan: input.plan, note: input.note || null });
      await audit(ctx, "org.upgrade_request", { type: "upgrade", id: requestId }, { from: org.plan, to: input.plan });
      return { id: requestId };
    })),
    cancelUpgrade: orgProcedure("admin", { allowInactive: true }).input(z.object({ requestId: id })).mutation(async ({ ctx, input }) => {
      if (!(await cancelUpgradeRequest(ctx.membership.orgId, input.requestId))) throw new TRPCError({ code: "NOT_FOUND", message: "Bekleyen talep bulunamadı." });
      await audit(ctx, "org.upgrade_cancel", { type: "upgrade", id: input.requestId });
      return { ok: true };
    }),
    kvkkStatus: orgProcedure("coordinator").query(async ({ ctx }) => {
      const [org, versions] = await Promise.all([getOrganization(ctx.membership.orgId), listStudentKvkkVersions(ctx.membership.orgId)]);
      const current = org?.kvkkVersion ?? 1;
      return { current, students: versions.length, onCurrent: versions.filter((version) => version === current).length, onOlder: versions.filter((version) => version !== null && version !== current).length, missing: versions.filter((version) => version === null).length };
    }),
    update: orgProcedure("admin")
      .input(z.object({ name: z.string().trim().min(2).max(160), kind: z.enum(ORG_KINDS), city: optionalText(80), district: optionalText(80), address: optionalText(300), phone: optionalText(40), contactEmail: z.union([z.literal(""), z.string().trim().email("Geçerli bir e-posta yaz.").max(160)]).optional().transform((value) => value || null) }))
      .mutation(async ({ ctx, input }) => {
        await updateOrganization(ctx.membership.orgId, input);
        await audit(ctx, "org.update", { type: "organization", id: ctx.membership.orgId }, { name: input.name });
        return { ok: true };
      }),
  }),

  invitations: router({
    list: orgProcedure("teacher").query(async ({ ctx }) => {
      const rows = await listInvitations(ctx.membership.orgId);
      // Öğretmen yalnızca öğrenci davetlerini görür.
      return hasRole(ctx.membership.role, "coordinator") ? rows : rows.filter((row) => row.role === "student");
    }),
    create: orgProcedure("teacher")
      .input(z.object({ role: z.enum(INVITABLE_ROLES), note: z.string().trim().max(160).optional(), subject: z.string().trim().max(60).optional(), days: z.number().int().min(1).max(60).default(14), maxUses: z.number().int().min(1).max(500).default(1) }))
      .mutation(({ ctx, input }) => userFacing(async () => {
        if (!canInviteRole(ctx.membership.role, input.role)) throw new TRPCError({ code: "FORBIDDEN", message: "Bu rol için davet oluşturma yetkin yok." });
        const code = generateInviteCode((max) => randomInt(max));
        const invitationId = await createInvitation({ orgId: ctx.membership.orgId, role: input.role, codeHash: hashCode(code), note: input.note || null, subject: input.role === "student" ? null : input.subject || null, expiresAt: new Date(Date.now() + input.days * DAY), maxUses: input.maxUses, createdBy: ctx.user.id });
        await audit(ctx, "invitation.create", { type: "invitation", id: invitationId }, { role: input.role, maxUses: input.maxUses, days: input.days });
        // Kodun kendisi yalnızca bu yanıtta döner; veritabanında özeti saklanır.
        return { id: invitationId, code };
      })),
    revoke: orgProcedure("teacher").input(z.object({ invitationId: id })).mutation(async ({ ctx, input }) => {
      const rows = await listInvitations(ctx.membership.orgId);
      const target = rows.find((row) => row.id === input.invitationId);
      if (!target || (!hasRole(ctx.membership.role, "coordinator") && target.role !== "student")) throw new TRPCError({ code: "NOT_FOUND", message: "Davet bulunamadı." });
      await revokeInvitation(ctx.membership.orgId, input.invitationId);
      await audit(ctx, "invitation.revoke", { type: "invitation", id: input.invitationId });
      return { ok: true };
    }),
  }),

  members: router({
    list: orgProcedure("coordinator").query(async ({ ctx }) => (await listMembers(ctx.membership.orgId)).filter((member) => isStaffRole(member.role))),
    setRole: orgProcedure("admin").input(z.object({ userId: id, role: z.enum(ORG_ROLES) })).mutation(async ({ ctx, input }) => {
      const current = await getMemberRole(ctx.membership.orgId, input.userId);
      if (!current || input.userId === ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Üye bulunamadı." });
      if (!canAssignRole(ctx.membership.role, current, input.role)) throw new TRPCError({ code: "FORBIDDEN", message: "Bu rol değişikliğini yapma yetkin yok." });
      // Öğrenci ↔ personel geçişi yapılmaz: öğrenci üyeliği onayla, personel davetle açılır.
      if ((current === "student") !== (input.role === "student")) throw new TRPCError({ code: "BAD_REQUEST", message: "Öğrenci ve personel rolleri birbirine çevrilemez." });
      await setMemberRole(ctx.membership.orgId, input.userId, input.role);
      await audit(ctx, "member.role", { type: "user", id: input.userId }, { from: current, to: input.role });
      return { ok: true };
    }),
    setSubject: orgProcedure("coordinator").input(z.object({ userId: id, subject: optionalText(60) })).mutation(async ({ ctx, input }) => {
      if (!(await setMemberSubject(ctx.membership.orgId, input.userId, input.subject))) throw new TRPCError({ code: "NOT_FOUND", message: "Personel bulunamadı." });
      await audit(ctx, "member.subject", { type: "user", id: input.userId }, { subject: input.subject });
      return { ok: true };
    }),
    remove: orgProcedure("admin").input(z.object({ userId: id })).mutation(async ({ ctx, input }) => {
      const current = await getMemberRole(ctx.membership.orgId, input.userId);
      if (!current || input.userId === ctx.user.id || !canAssignRole(ctx.membership.role, current, current === "student" ? "student" : "teacher")) throw new TRPCError({ code: "NOT_FOUND", message: "Üye bulunamadı." });
      await endMembership(ctx.membership.orgId, input.userId, "removed");
      await audit(ctx, "member.remove", { type: "user", id: input.userId }, { role: current });
      return { ok: true };
    }),
  }),

  classes: router({
    list: orgProcedure("teacher").query(({ ctx }) => listClasses(ctx.membership.orgId)),
    create: orgProcedure("coordinator").input(classInput).mutation(async ({ ctx, input }) => {
      const classId = await createClass(ctx.membership.orgId, await classFields(ctx.membership.orgId, input));
      await audit(ctx, "class.create", { type: "class", id: classId }, { name: input.name });
      return { id: classId };
    }),
    update: orgProcedure("coordinator").input(classInput.extend({ classId: id })).mutation(async ({ ctx, input }) => {
      if (!(await updateClass(ctx.membership.orgId, input.classId, await classFields(ctx.membership.orgId, input)))) throw new TRPCError({ code: "NOT_FOUND", message: "Sınıf bulunamadı." });
      await audit(ctx, "class.update", { type: "class", id: input.classId }, { name: input.name });
      return { ok: true };
    }),
    remove: orgProcedure("coordinator").input(z.object({ classId: id })).mutation(async ({ ctx, input }) => {
      if (!(await deleteClass(ctx.membership.orgId, input.classId))) throw new TRPCError({ code: "NOT_FOUND", message: "Sınıf bulunamadı." });
      await audit(ctx, "class.remove", { type: "class", id: input.classId });
      return { ok: true };
    }),
    setStudents: orgProcedure("coordinator").input(z.object({ classId: id, studentUserIds: z.array(id).max(500) })).mutation(async ({ ctx, input }) => {
      if (!(await setClassStudents(ctx.membership.orgId, input.classId, input.studentUserIds))) throw new TRPCError({ code: "NOT_FOUND", message: "Sınıf bulunamadı." });
      await audit(ctx, "class.students", { type: "class", id: input.classId }, { count: input.studentUserIds.length });
      return { ok: true };
    }),
  }),

  /**
   * Ders programı: tüm sınıfların haftalık dersleri. Personel (öğretmen dahil) görür; öğrenci verisi
   * içermez. Kaydı koordinatör+ yapar; öğretmen ve derslik çakışması kaydı engeller, branş
   * uyuşmazlığı yalnız uyarıdır.
   */
  timetable: router({
    get: orgProcedure("teacher").query(async ({ ctx }) => {
      const [slots, classes, members] = await Promise.all([listOrgTimetable(ctx.membership.orgId), listClasses(ctx.membership.orgId), listMembers(ctx.membership.orgId)]);
      return {
        slots,
        classes: classes.map((item) => ({ id: item.id, name: item.name, gradeLevel: item.gradeLevel, track: item.track, advisorUserId: item.advisorUserId, studentCount: item.studentUserIds.length })),
        teachers: members.filter((member) => isStaffRole(member.role)).map((member) => ({ userId: member.userId, name: member.name, role: member.role, subject: member.subject })),
      };
    }),
    saveClass: orgProcedure("coordinator")
      .input(z.object({ classId: id, slots: z.array(timetableSlotInput).max(MAX_TIMETABLE_SLOTS_PER_CLASS) }))
      .mutation(({ ctx, input }) => saveTimetables(ctx, [input])),
    // Otomatik dağıtımın sonucu: seçilen sınıfların programı birlikte, tek işlemde kaydedilir.
    saveClasses: orgProcedure("coordinator")
      .input(z.object({ classes: z.array(z.object({ classId: id, slots: z.array(timetableSlotInput).max(MAX_TIMETABLE_SLOTS_PER_CLASS) })).min(1).max(100) }))
      .mutation(({ ctx, input }) => saveTimetables(ctx, input.classes)),
  }),

  assignments: router({
    list: orgProcedure("coordinator").query(({ ctx }) => listAssignments(ctx.membership.orgId)),
    setTeacherStudents: orgProcedure("coordinator").input(z.object({ teacherUserId: id, studentUserIds: z.array(id).max(500) })).mutation(async ({ ctx, input }) => {
      if ((await getMemberRole(ctx.membership.orgId, input.teacherUserId)) !== "teacher") throw new TRPCError({ code: "NOT_FOUND", message: "Öğretmen bulunamadı." });
      const assigned = await setTeacherStudents(ctx.membership.orgId, input.teacherUserId, input.studentUserIds);
      await audit(ctx, "assignment.set", { type: "user", id: input.teacherUserId }, { count: assigned.length });
      return { assigned: assigned.length };
    }),
  }),

  tasks: router({
    assign: orgProcedure("teacher")
      .input(z.object({ studentUserId: id, date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), subject: z.string().trim().min(1).max(80), topic: z.string().trim().min(1).max(180), kind: z.enum(["Soru çözümü", "Konu tekrarı", "Konu çalışması"]), minutes: z.number().int().min(10).max(240), targetQuestions: z.number().int().min(0).max(300).optional(), note: z.string().trim().max(300).optional() }))
      .mutation(async ({ ctx, input }) => {
        await assertCanViewStudent(ctx, input.studentUserId);
        const start = toMinutes(input.time);
        if (start + input.minutes > 23 * 60 + 30) throw new TRPCError({ code: "BAD_REQUEST", message: "Görev 23:30'dan önce bitmeli." });
        // Dolu saatler: öğrencinin okul/dershane blokları, kurumun ders programı ve o günkü planlı oturumları.
        // Çakışan saate görev yazılmaz; hata mesajı aynı gün uygun ilk saati önerir.
        const day = new Date(`${input.date}T12:00:00`);
        const [schedule, courseBlocks, sessions] = await Promise.all([getClassSchedule(input.studentUserId), getCourseBlocks(input.studentUserId), listPlannedSessionsOn(input.studentUserId, day)]);
        const busy = busyOn(day, { blocks: schedule.blocks, courseBlocks, sessions });
        const conflict = findTaskConflict(busy, start, input.minutes);
        if (conflict) {
          const suggestion = suggestStart(busy, input.minutes, { from: start });
          const what = conflict.kind === "session" ? `planlı çalışmasıyla: ${describeInterval(conflict)}` : `${describeInterval(conflict)} dersiyle`;
          throw new TRPCError({ code: "BAD_REQUEST", message: `Öğrencinin ${what} çakışıyor. ${suggestion !== null ? `Aynı gün uygun ilk saat: ${fromMinutes(suggestion)}.` : "Bu gün uygun saat yok; başka bir gün seç."}` });
        }
        const sessionId = await insertAssignedTask({ orgId: ctx.membership.orgId, studentUserId: input.studentUserId, teacherUserId: ctx.user.id, sessionDate: new Date(`${input.date}T${input.time}:00`), title: `${input.subject} · ${input.topic}`, subject: input.subject, topic: input.topic, kind: input.kind, plannedMinutes: input.minutes, targetQuestions: input.targetQuestions || null, summary: input.note || `${ctx.membership.orgName} öğretmeninin atadığı görev.` });
        await audit(ctx, "task.assign", { type: "user", id: input.studentUserId }, { sessionId, subject: input.subject, topic: input.topic });
        const teacherName = (await listMembers(ctx.membership.orgId)).find((member) => member.userId === ctx.user.id)?.name ?? null;
        await notifyStudentOfTasks({ studentUserId: input.studentUserId, teacherName, sessionDates: [new Date(`${input.date}T${input.time}:00`)] }).catch(() => undefined);
        return { sessionId };
      }),
  }),

  notes: router({
    create: orgProcedure("teacher").input(z.object({ studentUserId: id, body: z.string().trim().min(1).max(4000), visibility: z.enum(["staff", "student"]) })).mutation(async ({ ctx, input }) => {
      await assertCanViewStudent(ctx, input.studentUserId);
      const noteId = await createNote({ orgId: ctx.membership.orgId, studentUserId: input.studentUserId, authorUserId: ctx.user.id, body: input.body, visibility: input.visibility });
      await audit(ctx, "note.create", { type: "user", id: input.studentUserId }, { noteId, visibility: input.visibility });
      return { id: noteId };
    }),
    remove: orgProcedure("teacher").input(z.object({ noteId: id })).mutation(async ({ ctx, input }) => {
      const note = await getNote(ctx.membership.orgId, input.noteId);
      if (!note) throw new TRPCError({ code: "NOT_FOUND", message: "Not bulunamadı." });
      await assertCanViewStudent(ctx, note.studentUserId);
      if (note.authorUserId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Notu yalnızca yazan öğretmen silebilir." });
      await deleteNote(ctx.membership.orgId, input.noteId);
      await audit(ctx, "note.remove", { type: "user", id: note.studentUserId }, { noteId: input.noteId });
      return { ok: true };
    }),
  }),

  audit: orgProcedure("admin").query(({ ctx }) => listAudit(ctx.membership.orgId)),

  // Novara Rehber: akademik takip dosyaları.
  cases: orgCasesRouter,

  // --- Öğrenci (ve personel) tarafı: davet kodu ile katılma, ayrılma ---------------
  /** Davet kodunu doğrular, kurum adını ve rolü gösterir (katılmadan önce). */
  previewInvitation: protectedProcedure.input(z.object({ code: z.string().trim().min(4).max(20) })).mutation(async ({ input }) => {
    const invitation = await findInvitationByHash(hashCode(input.code));
    const problem = !invitation || invitation.orgStatus !== "active" ? "Davet kodu bulunamadı." : invitationProblem(invitation);
    if (problem) throw new TRPCError({ code: "BAD_REQUEST", message: problem });
    if (membershipState(invitation!) === "expired") throw new TRPCError({ code: "BAD_REQUEST", message: "Bu kurumun üyelik süresi dolmuş; yeni katılım alınmıyor." });
    const org = invitation!.role === "student" ? await getOrganization(invitation!.orgId) : null;
    return { orgName: invitation!.orgName, role: invitation!.role, kvkk: org ? effectiveKvkk(org) : null };
  }),
  join: protectedProcedure.input(z.object({ code: z.string().trim().min(4).max(20), consent: z.literal(true), kvkkVersion: z.number().int().positive().optional() })).mutation(({ ctx, input }) => userFacing(async () => {
    const invitation = await findInvitationByHash(hashCode(input.code));
    const problem = !invitation || invitation.orgStatus !== "active" ? "Davet kodu bulunamadı." : invitationProblem(invitation);
    if (problem) throw new OrgError(problem);
    if (membershipState(invitation!) === "expired") throw new OrgError("Bu kurumun üyelik süresi dolmuş; yeni katılım alınmıyor.");
    // Öğrenci, kurumun GÜNCEL KVKK metnini onaylamış olmalı (onay anında metin değiştiyse yeniden okutulur).
    let kvkkVersion: number | null = null;
    if (invitation!.role === "student") {
      const org = await getOrganization(invitation!.orgId);
      kvkkVersion = org?.kvkkVersion ?? 1;
      if (input.kvkkVersion !== kvkkVersion) throw new OrgError("Kurumun KVKK metni güncellendi; lütfen metni yeniden okuyup onayla.");
    }
    const memberships = await listMyMemberships(ctx.user.id);
    if (memberships.some((row) => row.orgId === invitation!.orgId)) throw new OrgError("Bu kuruma zaten bağlısın.");
    // Öğrenci aynı anda tek kuruma bağlı olur.
    if (invitation!.role === "student" && memberships.some((row) => row.role === "student")) throw new OrgError("Önce şu anki kurumundan ayrılman gerekiyor.");
    await acceptInvitation({ invitationId: invitation!.id, orgId: invitation!.orgId, userId: ctx.user.id, role: invitation!.role, invitedBy: invitation!.createdBy, subject: invitation!.subject, kvkkVersion });
    await audit({ user: { id: ctx.user.id }, membership: { orgId: invitation!.orgId, orgName: invitation!.orgName, role: invitation!.role } }, "member.join", { type: "user", id: ctx.user.id }, { role: invitation!.role });
    return { orgId: invitation!.orgId, orgName: invitation!.orgName, role: invitation!.role };
  })),
  leave: protectedProcedure.input(z.object({ orgId: id })).mutation(async ({ ctx, input }) => {
    const memberships = await listMyMemberships(ctx.user.id);
    const membership = memberships.find((row) => row.orgId === input.orgId);
    if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Kurum bulunamadı." });
    if (membership.role === "owner") throw new TRPCError({ code: "BAD_REQUEST", message: "Kurum sahibi kurumdan ayrılamaz." });
    await endMembership(input.orgId, ctx.user.id, "left");
    await audit({ user: { id: ctx.user.id }, membership }, "member.leave", { type: "user", id: ctx.user.id }, { role: membership.role });
    return { ok: true };
  }),
  myFeedback: protectedProcedure.query(({ ctx }) => listStudentFeedback(ctx.user.id)),

  /** Öğrencinin dershane programı (sınıflarının dersleri). */
  myTimetable: protectedProcedure.query(({ ctx }) => listStudentTimetable(ctx.user.id)),
  /** Üyenin bağlı olduğu kurumun KVKK metinleri ve kendi onayladığı sürüm ("Kurumum"). */
  myKvkk: protectedProcedure.input(z.object({ orgId: id })).query(async ({ ctx, input }) => {
    const membership = (await listMyMemberships(ctx.user.id)).find((row) => row.orgId === input.orgId);
    const org = membership ? await getOrganization(input.orgId) : null;
    if (!membership || !org) throw new TRPCError({ code: "NOT_FOUND", message: "Kurum bulunamadı." });
    return { ...effectiveKvkk(org), acceptedVersion: membership.kvkkVersion ?? null, consentAt: membership.consentAt ?? null };
  }),
});

/** Platform admini: kurum oluşturma (+ ilk sahip davet kodu), listeleme, askıya alma. */
export const adminOrgsRouter = router({
  list: adminProcedure.query(async () => {
    const orgs = await listOrganizations();
    const used = await creditsUsedThisMonth(orgs.map((org) => org.id));
    return orgs.map((org) => ({ ...org, membershipState: membershipState(org), creditsUsed: used.get(org.id) ?? 0 }));
  }),
  upgradeRequests: adminProcedure.query(() => listPendingUpgradeRequests()),
  /** Onay: paket talep edilene geçer, kredi en az paketin varsayılanı olur, süre 1 yıl uzar (bitmemişse üstüne). */
  resolveUpgrade: adminProcedure.input(z.object({ requestId: id, approve: z.boolean() })).mutation(async ({ ctx, input }) => {
    const request = await getUpgradeRequest(input.requestId);
    if (!request || request.status !== "pending") throw new TRPCError({ code: "NOT_FOUND", message: "Bekleyen talep bulunamadı." });
    const org = await getOrganization(request.orgId);
    if (!org) throw new TRPCError({ code: "NOT_FOUND", message: "Kurum bulunamadı." });
    if (!(await resolveUpgradeRequest(input.requestId, input.approve ? "approved" : "rejected", ctx.user.id))) throw new TRPCError({ code: "CONFLICT", message: "Talep az önce sonuçlandırıldı." });
    if (input.approve) {
      const now = new Date();
      const expired = membershipState(org, now) !== "active";
      await updateOrgMembership(org.id, { plan: request.requestedPlan, membershipStartsAt: expired || !org.membershipStartsAt ? now : org.membershipStartsAt, membershipEndsAt: renewedMembershipEnd(org.membershipEndsAt, now), aiCreditsMonthly: Math.max(org.aiCreditsMonthly, ORG_PLAN_DEFAULT_CREDITS[request.requestedPlan]) });
    }
    await writeAudit({ orgId: org.id, actorUserId: ctx.user.id, action: input.approve ? "org.upgrade_approved" : "org.upgrade_rejected", targetType: "upgrade", targetId: input.requestId, metadata: { plan: ORG_PLAN_LABELS[request.requestedPlan] } });
    return { ok: true };
  }),
  setMembership: adminProcedure.input(z.object({ orgId: id, plan: z.enum(ORG_PLANS), startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(), endsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(), aiCreditsMonthly: z.number().int().min(0).max(10_000_000) })).mutation(async ({ input }) => {
    if (input.startsAt && input.endsAt && input.endsAt < input.startsAt) throw new TRPCError({ code: "BAD_REQUEST", message: "Bitiş tarihi başlangıçtan önce olamaz." });
    const day = (value: string | null) => (value ? new Date(`${value}T00:00:00`) : null);
    await updateOrgMembership(input.orgId, { plan: input.plan, membershipStartsAt: day(input.startsAt), membershipEndsAt: day(input.endsAt), aiCreditsMonthly: input.aiCreditsMonthly });
    return { ok: true };
  }),
  create: adminProcedure.input(z.object({ name: z.string().trim().min(2).max(160), slug: z.string().trim().regex(/^[a-z0-9-]{3,80}$/, "Kısa ad küçük harf, rakam ve tire içermeli.") })).mutation(({ ctx, input }) => userFacing(async () => {
    let orgId: number;
    try {
      orgId = await createOrganization(input.name, input.slug);
    } catch (error) {
      if (/Duplicate/i.test(String((error as Error)?.message ?? error))) throw new OrgError("Bu kısa ad kullanılıyor.");
      throw error;
    }
    // İlk kurum yöneticisi için tek kullanımlık davet (yönetici rolü ancak platform admininden gelir).
    await updateOrgMembership(orgId, { plan: "trial", membershipStartsAt: new Date(), membershipEndsAt: new Date(Date.now() + 30 * DAY), aiCreditsMonthly: ORG_PLAN_DEFAULT_CREDITS.trial });
    const code = generateInviteCode((max) => randomInt(max));
    await createInvitation({ orgId, role: "admin", codeHash: hashCode(code), note: "Kurum yöneticisi daveti", expiresAt: new Date(Date.now() + 30 * DAY), maxUses: 1, createdBy: ctx.user.id });
    return { orgId, adminCode: code };
  })),
  inviteAdmin: adminProcedure.input(z.object({ orgId: id })).mutation(async ({ ctx, input }) => {
    const code = generateInviteCode((max) => randomInt(max));
    await createInvitation({ orgId: input.orgId, role: "admin", codeHash: hashCode(code), note: "Kurum yöneticisi daveti (platform)", expiresAt: new Date(Date.now() + 30 * DAY), maxUses: 1, createdBy: ctx.user.id });
    return { adminCode: code };
  }),
  setStatus: adminProcedure.input(z.object({ orgId: id, status: z.enum(["active", "suspended"]) })).mutation(async ({ input }) => { await setOrganizationStatus(input.orgId, input.status); return { ok: true }; }),
});
