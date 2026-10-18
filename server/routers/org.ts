import { TRPCError } from "@trpc/server";
import { createHash, randomInt } from "node:crypto";
import { z } from "zod";
import { findClassConflict, toMinutes } from "../../shared/classSchedule";
import { INVITABLE_ROLES, ORG_ROLES, canAssignRole, canInviteRole, generateInviteCode, hasRole, invitationProblem, isStaffRole, normalizeInviteCode, seesAllStudents, summarizeStudent, type RiskKey, type StudentSummary } from "../../shared/org";
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
  listStudentFeedback,
  loadStudentSignals,
  revokeInvitation,
  setClassStudents,
  setMemberRole,
  setOrganizationStatus,
  setTeacherStudents,
} from "../org/orgDb";
import { getClassSchedule } from "../schedule/classScheduleDb";

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

const average = (values: number[]) => (values.length ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10 : null);

export const orgRouter = router({
  /** Kullanıcının aktif kurum üyelikleri: panel yönlendirmesi ve kurum seçici. */
  mine: protectedProcedure.query(({ ctx }) => listMyMemberships(ctx.user.id)),

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
      profile: { gradeLevel: profile.gradeLevel, examYear: profile.examYear, targetScoreType: profile.targetScoreType, targetUniversity: profile.targetUniversity, targetDepartment: profile.targetDepartment, dailyStudyDuration: profile.dailyStudyDuration, avatarStyle: profile.avatarStyle },
      summary: summarizeStudent(signals.get(input.studentUserId)!),
      exams,
      topics: topics.filter((topic) => !topic.insufficientData),
      sessions: calendar.sessions.map((session) => ({ id: session.id, sessionDate: session.sessionDate, title: session.title, subject: session.subject, topic: session.topic, kind: session.kind, plannedMinutes: session.plannedMinutes, status: session.status, actualMinutes: session.actualMinutes, actualQuestions: session.actualQuestions, correct: session.correct, assignedByUserId: session.assignedByUserId })),
      logs: calendar.logs.map((log) => ({ studyDate: log.studyDate, subject: log.subject, topic: log.topic, minutes: log.minutes, questions: log.questions, correct: log.correct })),
      notes,
      classes: classes.filter((item) => item.studentUserIds.includes(input.studentUserId)).map((item) => ({ id: item.id, name: item.name })),
      teachers: assignments.filter((row) => row.studentUserId === input.studentUserId).map((row) => ({ userId: row.teacherUserId, name: teachers.find((teacher) => teacher.userId === row.teacherUserId)?.name ?? "Öğretmen" })),
    };
  }),

  invitations: router({
    list: orgProcedure("teacher").query(async ({ ctx }) => {
      const rows = await listInvitations(ctx.membership.orgId);
      // Öğretmen yalnızca öğrenci davetlerini görür.
      return hasRole(ctx.membership.role, "coordinator") ? rows : rows.filter((row) => row.role === "student");
    }),
    create: orgProcedure("teacher")
      .input(z.object({ role: z.enum(INVITABLE_ROLES), note: z.string().trim().max(160).optional(), days: z.number().int().min(1).max(60).default(14), maxUses: z.number().int().min(1).max(500).default(1) }))
      .mutation(({ ctx, input }) => userFacing(async () => {
        if (!canInviteRole(ctx.membership.role, input.role)) throw new TRPCError({ code: "FORBIDDEN", message: "Bu rol için davet oluşturma yetkin yok." });
        const code = generateInviteCode((max) => randomInt(max));
        const invitationId = await createInvitation({ orgId: ctx.membership.orgId, role: input.role, codeHash: hashCode(code), note: input.note || null, expiresAt: new Date(Date.now() + input.days * DAY), maxUses: input.maxUses, createdBy: ctx.user.id });
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
    create: orgProcedure("coordinator").input(z.object({ name: z.string().trim().min(1).max(80), gradeLevel: z.string().trim().max(20).optional() })).mutation(async ({ ctx, input }) => {
      const classId = await createClass(ctx.membership.orgId, input.name, input.gradeLevel || null);
      await audit(ctx, "class.create", { type: "class", id: classId }, { name: input.name });
      return { id: classId };
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
        const schedule = await getClassSchedule(input.studentUserId);
        const conflict = findClassConflict(schedule.blocks, new Date(`${input.date}T12:00:00`), start, input.minutes);
        if (conflict) throw new TRPCError({ code: "BAD_REQUEST", message: `Öğrencinin ${conflict.label} dersiyle çakışıyor (${conflict.startTime}–${conflict.endTime}).` });
        const sessionId = await insertAssignedTask({ orgId: ctx.membership.orgId, studentUserId: input.studentUserId, teacherUserId: ctx.user.id, sessionDate: new Date(`${input.date}T${input.time}:00`), title: `${input.subject} · ${input.topic}`, subject: input.subject, topic: input.topic, kind: input.kind, plannedMinutes: input.minutes, targetQuestions: input.targetQuestions || null, summary: input.note || `${ctx.membership.orgName} öğretmeninin atadığı görev.` });
        await audit(ctx, "task.assign", { type: "user", id: input.studentUserId }, { sessionId, subject: input.subject, topic: input.topic });
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
      if (note.authorUserId !== ctx.user.id && !hasRole(ctx.membership.role, "admin")) throw new TRPCError({ code: "FORBIDDEN", message: "Yalnızca notu yazan ya da kurum yöneticisi silebilir." });
      await deleteNote(ctx.membership.orgId, input.noteId);
      await audit(ctx, "note.remove", { type: "user", id: note.studentUserId }, { noteId: input.noteId });
      return { ok: true };
    }),
  }),

  audit: orgProcedure("admin").query(({ ctx }) => listAudit(ctx.membership.orgId)),

  // --- Öğrenci (ve personel) tarafı: davet kodu ile katılma, ayrılma ---------------
  /** Davet kodunu doğrular, kurum adını ve rolü gösterir (katılmadan önce). */
  previewInvitation: protectedProcedure.input(z.object({ code: z.string().trim().min(4).max(20) })).mutation(async ({ input }) => {
    const invitation = await findInvitationByHash(hashCode(input.code));
    const problem = !invitation || invitation.orgStatus !== "active" ? "Davet kodu bulunamadı." : invitationProblem(invitation);
    if (problem) throw new TRPCError({ code: "BAD_REQUEST", message: problem });
    return { orgName: invitation!.orgName, role: invitation!.role };
  }),
  join: protectedProcedure.input(z.object({ code: z.string().trim().min(4).max(20), consent: z.literal(true) })).mutation(({ ctx, input }) => userFacing(async () => {
    const invitation = await findInvitationByHash(hashCode(input.code));
    const problem = !invitation || invitation.orgStatus !== "active" ? "Davet kodu bulunamadı." : invitationProblem(invitation);
    if (problem) throw new OrgError(problem);
    const memberships = await listMyMemberships(ctx.user.id);
    if (memberships.some((row) => row.orgId === invitation!.orgId)) throw new OrgError("Bu kuruma zaten bağlısın.");
    // Öğrenci aynı anda tek kuruma bağlı olur.
    if (invitation!.role === "student" && memberships.some((row) => row.role === "student")) throw new OrgError("Önce şu anki kurumundan ayrılman gerekiyor.");
    await acceptInvitation({ invitationId: invitation!.id, orgId: invitation!.orgId, userId: ctx.user.id, role: invitation!.role, invitedBy: invitation!.createdBy });
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
});

/** Platform admini: kurum oluşturma (+ ilk sahip davet kodu), listeleme, askıya alma. */
export const adminOrgsRouter = router({
  list: adminProcedure.query(() => listOrganizations()),
  create: adminProcedure.input(z.object({ name: z.string().trim().min(2).max(160), slug: z.string().trim().regex(/^[a-z0-9-]{3,80}$/, "Kısa ad küçük harf, rakam ve tire içermeli.") })).mutation(({ ctx, input }) => userFacing(async () => {
    let orgId: number;
    try {
      orgId = await createOrganization(input.name, input.slug);
    } catch (error) {
      if (/Duplicate/i.test(String((error as Error)?.message ?? error))) throw new OrgError("Bu kısa ad kullanılıyor.");
      throw error;
    }
    // İlk kurum yöneticisi için tek kullanımlık davet (yönetici rolü ancak platform admininden gelir).
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
