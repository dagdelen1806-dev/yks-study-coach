import { TRPCError } from "@trpc/server";
import { createHash, randomInt } from "node:crypto";
import { z } from "zod";
import { estimateLgsScore } from "../../shared/exams";
import { generateInviteCode, normalizeInviteCode, summarizeStudent } from "../../shared/org";
import { PARENT_CONSENT_TEXT, PARENT_CONSENT_VERSION } from "../../shared/parent";
import { appBaseUrl } from "../_core/emailVerification";
import { buildParentInviteEmail } from "../_core/emails/parentEmails";
import { sendMail } from "../_core/mailer";
import { protectedProcedure, router } from "../_core/trpc";
import { getStudentProfile, getUserMockExams, getUserTopicProgress } from "../db";
import { getStudentCalendarReadOnly, loadStudentSignals } from "../org/orgDb";
import {
  ParentLinkError,
  createParentInvite,
  decideParentRequest,
  findActiveLink,
  listLinksForParent,
  listLinksForStudent,
  redeemParentInvite,
  revokeParentLink,
  setParentDigestEnabled,
  studentDisplayName,
} from "../parent/parentDb";

const DAY_MS = 24 * 60 * 60 * 1000;
const id = z.number().int().positive();
// Kurum davet kodlarıyla aynı biçim ve aynı özet (kodun kendisi saklanmaz).
const hashCode = (code: string) => createHash("sha256").update(`parent:${normalizeInviteCode(code)}`).digest("hex");

const userFacing = async <T,>(work: () => Promise<T>): Promise<T> => {
  try {
    return await work();
  } catch (error) {
    if (error instanceof ParentLinkError) throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
    throw error;
  }
};

function currentWeek(now = new Date()) {
  const start = new Date(now); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const end = new Date(start); end.setDate(end.getDate() + 7);
  return { start, end };
}

/**
 * Veli erişimi. Her uç `ctx.user.id` ile kapsamlıdır: öğrenci uçları yalnızca kendi
 * bağlantılarını, veli uçları yalnızca kendi bağlantılarını görür/değiştirir; öğrenci verisi
 * yalnızca öğrencinin onayladığı (aktif) bağlantıyla ve salt okunur döner.
 */
export const parentRouter = router({
  consentText: protectedProcedure.query(() => ({ version: PARENT_CONSENT_VERSION, text: PARENT_CONSENT_TEXT })),

  // --- Öğrenci tarafı ---------------------------------------------------------
  myParents: protectedProcedure.query(({ ctx }) => listLinksForStudent(ctx.user.id)),

  createInvite: protectedProcedure
    .input(z.object({ parentEmail: z.string().trim().email("Geçerli bir e-posta adresi yaz.").max(320).optional().or(z.literal("")) }).optional())
    .mutation(({ ctx, input }) => userFacing(async () => {
      const code = generateInviteCode((max) => randomInt(max));
      const { expiresAt } = await createParentInvite(ctx.user.id, hashCode(code));
      const joinUrl = `${appBaseUrl(ctx.req)}/veli?kod=${encodeURIComponent(code)}`;
      let emailed = false;
      if (input?.parentEmail) {
        const studentName = await studentDisplayName(ctx.user.id);
        try {
          await sendMail(buildParentInviteEmail({ to: input.parentEmail, studentName, code, joinUrl, expiresAt }));
          emailed = true;
        } catch (error) {
          // Kod yine geçerli: öğrenci elle paylaşabilir.
          console.warn("[Parent] invite email failed:", error instanceof Error ? error.message : error);
        }
      }
      return { code, expiresAt, joinUrl, emailed };
    })),

  decide: protectedProcedure
    .input(z.object({ linkId: id, approve: z.boolean() }))
    .mutation(({ ctx, input }) => userFacing(() => decideParentRequest(ctx.user.id, input.linkId, input.approve))),

  removeParent: protectedProcedure
    .input(z.object({ linkId: id }))
    .mutation(({ ctx, input }) => userFacing(() => revokeParentLink({ userId: ctx.user.id, side: "student" }, input.linkId))),

  // --- Veli tarafı ------------------------------------------------------------
  myStudents: protectedProcedure.query(({ ctx }) => listLinksForParent(ctx.user.id)),

  redeem: protectedProcedure
    .input(z.object({ code: z.string().trim().min(4).max(20), consent: z.literal(true, { message: "Devam etmek için rıza metnini onaylamalısın." }) }))
    .mutation(({ ctx, input }) => userFacing(() => redeemParentInvite(ctx.user.id, hashCode(input.code)))),

  unlink: protectedProcedure
    .input(z.object({ linkId: id }))
    .mutation(({ ctx, input }) => userFacing(() => revokeParentLink({ userId: ctx.user.id, side: "parent" }, input.linkId))),

  setDigest: protectedProcedure
    .input(z.object({ linkId: id, enabled: z.boolean() }))
    .mutation(({ ctx, input }) => userFacing(async () => ({ enabled: await setParentDigestEnabled(ctx.user.id, input.linkId, input.enabled) }))),

  /** Velinin gördüğü öğrenci özeti: salt okunur; not, soru defteri, öğretmen notu, iletişim bilgisi yok. */
  student: protectedProcedure.input(z.object({ studentUserId: id })).query(async ({ ctx, input }) => {
    if (!(await findActiveLink(ctx.user.id, input.studentUserId))) throw new TRPCError({ code: "FORBIDDEN", message: "Bu öğrencinin bilgilerini görme iznin yok." });
    const since = new Date(Date.now() - 42 * DAY_MS);
    const { start, end } = currentWeek();
    const [name, profile, exams, topics, calendar, signals] = await Promise.all([
      studentDisplayName(input.studentUserId),
      getStudentProfile(input.studentUserId),
      getUserMockExams(input.studentUserId),
      getUserTopicProgress(input.studentUserId),
      getStudentCalendarReadOnly(input.studentUserId, since),
      loadStudentSignals([input.studentUserId], start, end, new Date(Date.now() - 30 * DAY_MS)),
    ]);
    const latestLgs = exams.filter((exam) => exam.exam === "LGS").sort((a, b) => b.date.localeCompare(a.date))[0];
    return {
      name,
      profile: { examTrack: profile.examTrack, gradeLevel: profile.gradeLevel, examYear: profile.examYear, targetScoreType: profile.targetScoreType, targetUniversity: profile.targetUniversity, targetDepartment: profile.targetDepartment, targetHighSchool: profile.targetHighSchool, targetLgsScore: profile.targetLgsScore, dailyStudyDuration: profile.dailyStudyDuration },
      summary: summarizeStudent(signals.get(input.studentUserId)!),
      estimatedLgsScore: latestLgs ? estimateLgsScore(latestLgs.subjects) : null,
      exams: exams.map((exam) => ({ id: exam.id, title: exam.title, date: exam.date, exam: exam.exam, net: exam.net, subjects: exam.subjects })),
      weakTopics: topics.filter((topic) => !topic.insufficientData && topic.status === "Zayıf").sort((a, b) => a.progress - b.progress).slice(0, 10).map((topic) => ({ slug: topic.slug, subject: topic.subject, topic: topic.topic, progress: topic.progress })),
      sessions: calendar.sessions.map((session) => ({ id: session.id, sessionDate: session.sessionDate, subject: session.subject, topic: session.topic, kind: session.kind, plannedMinutes: session.plannedMinutes, status: session.status, abandonedAt: session.abandonedAt })),
      logs: calendar.logs.map((log) => ({ studyDate: log.studyDate, minutes: log.minutes })),
    };
  }),
});
