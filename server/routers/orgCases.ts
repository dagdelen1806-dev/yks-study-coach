import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { ACADEMIC_REVIEW_TEXT, ACADEMIC_REVIEW_TITLE, CONFIDENCE_TEXT } from "../../shared/academicCase";
import { EXAM_KINDS } from "../../shared/exams";
import { seesAllStudents } from "../../shared/org";
import { protectedProcedure, router } from "../_core/trpc";
import { assertCanViewStudent, audit, orgProcedure, type OrgContext } from "../org/orgAccess";
import { CaseError, addCaseAction, addCaseNote, assignCasePlan, canReadNotes, caseSummary, evaluateCase, filterPrivateNotes, getCaseDetail, getCaseRow, isCasesEnabled, listCases, listSignals, listStudentAssignedTasks, openCase, previewCasePlan, reopenCase, setCasesEnabled, setStudentFeedback, suggestOwnedResources } from "../org/caseDb";
import { listMembers, teacherStudentIds } from "../org/orgDb";

/**
 * Novara Rehber — akademik takip dosyası uçları (Kurum Paneli → `org.cases`). Kurum bazında açılır.
 * Öğretmen yalnızca görebildiği öğrencinin dosyasına erişir (`assertCanViewStudent`); dosya notları
 * mahremdir (yazanı + öğrencinin sorumlu öğretmenleri). Her değişiklik denetim kaydına yazılır.
 */
const id = z.number().int().positive();
const examKind = z.enum(EXAM_KINDS);
const planItem = z.object({ subject: z.string().trim().min(1).max(80), topicId: id.nullable(), topic: z.string().trim().min(1).max(180), minutes: z.number().int().min(10).max(180), targetQuestions: z.number().int().min(0).max(200).optional(), bookId: z.string().max(120).optional(), bookContentId: id.optional(), pages: z.string().max(80).optional() });
const planInput = z.object({ caseId: id, items: z.array(planItem).min(1).max(14), from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), days: z.number().int().min(1).max(14) });

const dayOf = (value: string) => new Date(`${value}T12:00:00`);

async function wrap<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof CaseError) throw new TRPCError({ code: error.code, message: error.message });
    throw error;
  }
}

async function requireEnabled(orgId: number) {
  if (!(await isCasesEnabled(orgId))) throw new TRPCError({ code: "FORBIDDEN", message: "Akademik takip dosyaları bu kurumda açık değil." });
}

/** Dosyayı getirir ve öğrencinin görülebilirliğini denetler. */
async function caseFor(ctx: OrgContext, caseId: number) {
  const row = await wrap(() => getCaseRow(ctx.membership.orgId, caseId));
  await assertCanViewStudent(ctx, row.studentUserId);
  return row;
}

/** Kullanıcının görebildiği öğrenciler (koordinatör+ tümü, öğretmen atandıkları + sorumlu olduğu sınıflar). */
async function visibleStudentIds(ctx: OrgContext): Promise<number[] | undefined> {
  if (seesAllStudents(ctx.membership.role)) return undefined;
  return teacherStudentIds(ctx.membership.orgId, ctx.user.id);
}

export const orgCasesRouter = router({
  status: orgProcedure("teacher").query(async ({ ctx }) => ({ enabled: await isCasesEnabled(ctx.membership.orgId), title: ACADEMIC_REVIEW_TITLE, text: ACADEMIC_REVIEW_TEXT, confidenceText: CONFIDENCE_TEXT })),
  setEnabled: orgProcedure("admin").input(z.object({ enabled: z.boolean() })).mutation(async ({ ctx, input }) => {
    await setCasesEnabled(ctx.membership.orgId, input.enabled);
    await audit(ctx, "cases.enable", { type: "organization", id: ctx.membership.orgId }, { enabled: input.enabled });
    return { enabled: input.enabled };
  }),

  /** Kural önerileri: düşüş eğilimi ya da "inceleme için yetersiz" (dosyası olmayanlar ve açık dosyası olanlar). */
  signals: orgProcedure("teacher").query(async ({ ctx }) => {
    await requireEnabled(ctx.membership.orgId);
    const scoped = await visibleStudentIds(ctx);
    const students = scoped ?? (await listMembers(ctx.membership.orgId, { role: "student" })).map((member) => member.userId);
    const names = new Map((await listMembers(ctx.membership.orgId, { role: "student" })).map((member) => [member.userId, member.name]));
    return (await listSignals(ctx.membership.orgId, students)).map((signal) => ({ ...signal, studentName: names.get(signal.studentUserId) ?? "Öğrenci" }));
  }),

  queue: orgProcedure("teacher").input(z.object({ status: z.enum(["open", "in_progress", "evaluating", "closed"]).optional() })).query(async ({ ctx, input }) => {
    await requireEnabled(ctx.membership.orgId);
    return listCases(ctx.membership.orgId, { studentUserIds: await visibleStudentIds(ctx), status: input.status });
  }),

  open: orgProcedure("teacher").input(z.object({ studentUserId: id, ruleKey: z.enum(["trend_decline", "manual"]), examKind: examKind.nullable() })).mutation(async ({ ctx, input }) => {
    await requireEnabled(ctx.membership.orgId);
    await assertCanViewStudent(ctx, input.studentUserId);
    const result = await wrap(() => openCase({ orgId: ctx.membership.orgId, studentUserId: input.studentUserId, ruleKey: input.ruleKey, examKind: input.examKind, actorUserId: ctx.user.id }));
    if (result.created) await audit(ctx, "case.open", { type: "case", id: result.caseId }, { studentUserId: input.studentUserId, ruleKey: input.ruleKey, examKind: input.examKind });
    return result;
  }),

  get: orgProcedure("teacher").input(z.object({ caseId: id })).query(async ({ ctx, input }) => {
    await requireEnabled(ctx.membership.orgId);
    const row = await caseFor(ctx, input.caseId);
    const detail = await wrap(() => getCaseDetail(ctx.membership.orgId, input.caseId));
    const responsible = await canReadNotes(ctx.membership.orgId, ctx.user.id, row.studentUserId);
    return { ...detail, notes: filterPrivateNotes(detail.notes, ctx.user.id, responsible), canReadNotes: responsible };
  }),

  addAction: orgProcedure("teacher").input(z.object({ caseId: id, type: z.enum(["review", "meeting"]), note: z.string().trim().max(2000).optional(), meetingAt: z.string().max(40).optional(), place: z.string().trim().max(120).optional(), idempotencyKey: z.string().min(8).max(64) })).mutation(async ({ ctx, input }) => {
    await requireEnabled(ctx.membership.orgId);
    await caseFor(ctx, input.caseId);
    const payload = input.type === "meeting" ? { meetingAt: input.meetingAt ?? null, place: input.place ?? null } : {};
    const result = await wrap(() => addCaseAction({ orgId: ctx.membership.orgId, caseId: input.caseId, type: input.type, payload, actorUserId: ctx.user.id, idempotencyKey: input.idempotencyKey, status: input.type === "meeting" ? "planned" : "done" }));
    if (input.note) await addCaseNote({ orgId: ctx.membership.orgId, caseId: input.caseId, authorUserId: ctx.user.id, body: input.note, visibility: "staff" });
    if (result.created) await audit(ctx, `case.${input.type}`, { type: "case", id: input.caseId }, { actionId: result.actionId });
    return result;
  }),

  addNote: orgProcedure("teacher").input(z.object({ caseId: id, body: z.string().trim().min(1).max(4000), visibility: z.enum(["staff", "student"]) })).mutation(async ({ ctx, input }) => {
    await requireEnabled(ctx.membership.orgId);
    await caseFor(ctx, input.caseId);
    const noteId = await wrap(() => addCaseNote({ orgId: ctx.membership.orgId, caseId: input.caseId, authorUserId: ctx.user.id, body: input.body, visibility: input.visibility }));
    await audit(ctx, "case.note", { type: "case", id: input.caseId }, { noteId, visibility: input.visibility });
    return { noteId };
  }),

  suggestResources: orgProcedure("teacher").input(z.object({ caseId: id, topicIds: z.array(id).min(1).max(10) })).query(async ({ ctx, input }) => {
    await requireEnabled(ctx.membership.orgId);
    const row = await caseFor(ctx, input.caseId);
    return suggestOwnedResources(row.studentUserId, input.topicIds);
  }),

  previewPlan: orgProcedure("teacher").input(planInput).query(async ({ ctx, input }) => {
    await requireEnabled(ctx.membership.orgId);
    const row = await caseFor(ctx, input.caseId);
    const placements = await previewCasePlan(row.studentUserId, input.items, dayOf(input.from), input.days);
    return placements.map((placement) => (placement.date ? { itemIndex: placement.index, date: placement.date, start: placement.start } : { itemIndex: placement.index, date: null, reason: placement.reason }));
  }),

  assignPlan: orgProcedure("teacher").input(planInput.extend({ idempotencyKey: z.string().min(8).max(64) })).mutation(async ({ ctx, input }) => {
    await requireEnabled(ctx.membership.orgId);
    await caseFor(ctx, input.caseId);
    const result = await wrap(() => assignCasePlan({ orgId: ctx.membership.orgId, caseId: input.caseId, actorUserId: ctx.user.id, items: input.items, from: dayOf(input.from), days: input.days, idempotencyKey: input.idempotencyKey }));
    if (!result.duplicate) await audit(ctx, "case.plan", { type: "case", id: input.caseId }, { actionId: result.actionId, sessions: result.sessionIds.length, skipped: result.skipped.length });
    return result;
  }),

  evaluate: orgProcedure("teacher").input(z.object({ caseId: id, outcome: z.enum(["completed", "ongoing", "reassess"]), note: z.string().trim().max(2000).optional() })).mutation(async ({ ctx, input }) => {
    await requireEnabled(ctx.membership.orgId);
    await caseFor(ctx, input.caseId);
    const result = await wrap(() => evaluateCase({ orgId: ctx.membership.orgId, caseId: input.caseId, actorUserId: ctx.user.id, outcome: input.outcome, note: input.note }));
    await audit(ctx, input.outcome === "completed" ? "case.close" : "case.evaluate", { type: "case", id: input.caseId }, { outcome: input.outcome, limitedEvidence: result.limitedEvidence });
    return result;
  }),

  reopen: orgProcedure("teacher").input(z.object({ caseId: id, reason: z.string().trim().min(3).max(500) })).mutation(async ({ ctx, input }) => {
    await requireEnabled(ctx.membership.orgId);
    await caseFor(ctx, input.caseId);
    await wrap(() => reopenCase({ orgId: ctx.membership.orgId, caseId: input.caseId, actorUserId: ctx.user.id, reason: input.reason }));
    await audit(ctx, "case.reopen", { type: "case", id: input.caseId });
    return { ok: true };
  }),

  /** Yönetici özeti: yalnızca sayılar; not ya da kanıt içeriği yok. */
  summary: orgProcedure("coordinator").query(async ({ ctx }) => {
    await requireEnabled(ctx.membership.orgId);
    return caseSummary(ctx.membership.orgId);
  }),
});

/** Öğrenci tarafı: "Bu haftaki çalışmalar" ve görev geri bildirimi (dosyanın kendisi görünmez). */
export const studyTasksRouter = router({
  thisWeek: protectedProcedure.query(({ ctx }) => listStudentAssignedTasks(ctx.user.id)),
  feedback: protectedProcedure.input(z.object({ sessionId: id, feedback: z.enum(["done", "struggled", "needs_review"]) })).mutation(async ({ ctx, input }) => {
    if (!(await setStudentFeedback(ctx.user.id, input.sessionId, input.feedback))) throw new TRPCError({ code: "NOT_FOUND", message: "Görev bulunamadı." });
    return { ok: true };
  }),
});
