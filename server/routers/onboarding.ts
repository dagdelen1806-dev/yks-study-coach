import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  COACHING_EXPECTATIONS,
  COACHING_STYLES,
  emptyOnboardingDraft,
  GRADE_LEVELS,
  MOCK_EXAM_FREQUENCIES,
  NOTIFICATION_PREFERENCES,
  STUDY_DAYS,
  STUDY_METHODS,
  STUDY_TIMES,
  TARGET_SCORE_TYPES,
  TOTAL_ONBOARDING_STEPS,
  validateOnboardingStep,
} from "@shared/onboarding";
import { completeOnboarding, getStudentProfile, upsertStudentProfileStep, type StudentProfilePatch } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

// Enum-shaped fields accept "" alongside the real enum values: the client
// keeps every field as a plain string ("" = not chosen yet) so every input
// stays a controlled component, and re-sends a step's full field set on each
// save. "" is treated as "leave unset" by `draftToPatch` below, never as a
// real enum value.
const enumOrBlank = <T extends readonly [string, ...string[]]>(values: T) => z.union([z.enum(values), z.literal("")]);

const draftSchema = z.object({
  preferredName: z.string().trim().max(120).optional(),
  gradeLevel: enumOrBlank(GRADE_LEVELS).optional(),
  examYear: z.string().max(4).optional(),
  targetScoreType: enumOrBlank(TARGET_SCORE_TYPES).optional(),
  currentTytNet: z.string().trim().max(40).optional(),
  currentAytNet: z.string().trim().max(40).optional(),
  mockExamFrequency: enumOrBlank(MOCK_EXAM_FREQUENCIES).optional(),
  strongSubjects: z.array(z.string().max(40)).max(15).optional(),
  weakSubjects: z.array(z.string().max(40)).max(15).optional(),
  hasPriorStudyPlan: enumOrBlank(["yes", "no"]).optional(),
  targetUniversity: z.string().trim().max(180).optional(),
  targetDepartment: z.string().trim().max(180).optional(),
  targetRanking: z.string().trim().max(60).optional(),
  mainGoal: z.string().trim().max(500).optional(),
  shortTermGoal: z.string().trim().max(500).optional(),
  longTermGoal: z.string().trim().max(500).optional(),
  dailyStudyDuration: z.string().max(6).optional(),
  preferredStudyStartTime: z.string().max(5).optional(),
  availableStudyDays: z.array(z.enum(STUDY_DAYS)).max(7).optional(),
  preferredStudyTimes: z.array(z.enum(STUDY_TIMES)).max(4).optional(),
  preferredStudyMethods: z.array(z.enum(STUDY_METHODS)).max(5).optional(),
  studyObstacles: z.string().trim().max(500).optional(),
  coachingExpectations: z.array(z.enum(COACHING_EXPECTATIONS)).max(7).optional(),
  notificationPreference: enumOrBlank(NOTIFICATION_PREFERENCES).optional(),
  coachingStyle: enumOrBlank(COACHING_STYLES).optional(),
  additionalNotes: z.string().trim().max(1000).optional(),
});

const saveStepInput = z.object({
  step: z.number().int().min(0).max(TOTAL_ONBOARDING_STEPS - 1),
  data: draftSchema,
  complete: z.boolean().optional(),
});

function draftToPatch(data: z.infer<typeof draftSchema>): StudentProfilePatch {
  const patch: StudentProfilePatch = {};
  if (data.preferredName !== undefined) patch.preferredName = data.preferredName || null;
  if (data.gradeLevel !== undefined) patch.gradeLevel = data.gradeLevel || null;
  if (data.examYear !== undefined) patch.examYear = data.examYear ? Number(data.examYear) : null;
  if (data.targetScoreType !== undefined) patch.targetScoreType = data.targetScoreType || null;
  if (data.currentTytNet !== undefined) patch.currentTytNet = data.currentTytNet || null;
  if (data.currentAytNet !== undefined) patch.currentAytNet = data.currentAytNet || null;
  if (data.mockExamFrequency !== undefined) patch.mockExamFrequency = data.mockExamFrequency || null;
  if (data.strongSubjects !== undefined) patch.strongSubjects = data.strongSubjects;
  if (data.weakSubjects !== undefined) patch.weakSubjects = data.weakSubjects;
  if (data.hasPriorStudyPlan !== undefined) patch.hasPriorStudyPlan = data.hasPriorStudyPlan === "yes" ? true : data.hasPriorStudyPlan === "no" ? false : null;
  if (data.targetUniversity !== undefined) patch.targetUniversity = data.targetUniversity || null;
  if (data.targetDepartment !== undefined) patch.targetDepartment = data.targetDepartment || null;
  if (data.targetRanking !== undefined) patch.targetRanking = data.targetRanking || null;
  if (data.mainGoal !== undefined) patch.mainGoal = data.mainGoal || null;
  if (data.shortTermGoal !== undefined) patch.shortTermGoal = data.shortTermGoal || null;
  if (data.longTermGoal !== undefined) patch.longTermGoal = data.longTermGoal || null;
  if (data.dailyStudyDuration !== undefined) patch.dailyStudyDuration = data.dailyStudyDuration ? Number(data.dailyStudyDuration) : null;
  if (data.preferredStudyStartTime !== undefined) patch.preferredStudyStartTime = data.preferredStudyStartTime || null;
  if (data.availableStudyDays !== undefined) patch.availableStudyDays = data.availableStudyDays;
  if (data.preferredStudyTimes !== undefined) patch.preferredStudyTimes = data.preferredStudyTimes;
  if (data.preferredStudyMethods !== undefined) patch.preferredStudyMethods = data.preferredStudyMethods;
  if (data.studyObstacles !== undefined) patch.studyObstacles = data.studyObstacles || null;
  if (data.coachingExpectations !== undefined) patch.coachingExpectations = data.coachingExpectations;
  if (data.notificationPreference !== undefined) patch.notificationPreference = data.notificationPreference || null;
  if (data.coachingStyle !== undefined) patch.coachingStyle = data.coachingStyle || null;
  if (data.additionalNotes !== undefined) patch.additionalNotes = data.additionalNotes || null;
  return patch;
}

/**
 * Student onboarding — `protectedProcedure` everywhere, so `ctx.user.id`
 * (never a client-supplied id) scopes every read/write. A user can only ever
 * read or write their own profile; there is no admin/cross-user access here.
 */
export const onboardingRouter = router({
  get: protectedProcedure.query(({ ctx }) => getStudentProfile(ctx.user.id)),

  saveStep: protectedProcedure.input(saveStepInput).mutation(async ({ ctx, input }) => {
    // Defense in depth: the client already blocks "Devam et" on an invalid
    // required field, but the server re-checks so a crafted request can't
    // skip a required step.
    const draftForValidation = { ...emptyOnboardingDraft(), ...input.data };
    const errors = validateOnboardingStep(input.step, draftForValidation as Parameters<typeof validateOnboardingStep>[1]);
    if (Object.keys(errors).length > 0) {
      throw new TRPCError({ code: "BAD_REQUEST", message: Object.values(errors)[0] });
    }

    await upsertStudentProfileStep(ctx.user.id, input.step, draftToPatch(input.data));
    if (input.complete) await completeOnboarding(ctx.user.id);
    return getStudentProfile(ctx.user.id);
  }),

  complete: protectedProcedure.mutation(({ ctx }) => completeOnboarding(ctx.user.id)),
});
