import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getCurrentSubscription, getEntitlements } from "../subscriptions/entitlementService";
import { getStudentExamTrack, listActivePlans, listSubscriptionsForUser, updateSubscription, writeAuditLog } from "../subscriptions/subscriptionDb";
import { quoteForUser } from "../subscriptions/checkout";
import { paymentProviderFactory } from "../subscriptions/paymentProviders/factory";
import { assertValidSubscriptionTransition, type SubscriptionStatus } from "../../shared/subscriptionStateMachine";
import { PAID_TIERS } from "../../shared/entitlements";
import { EXAM_TRACKS, type ExamTrack } from "../../shared/exams";
import { listTracks } from "../tracks/trackDb";
import { QuoteError } from "../../shared/checkoutQuote";
import { TRPCError } from "@trpc/server";

// Her sınavın ayrı aboneliği var (Ekim 2026). Sınav verilmeyen uçlar öğrencinin aktif sınavını kullanır.
const trackInput = z.object({ track: z.enum(EXAM_TRACKS).optional() }).optional();
const resolveTrack = async (userId: number, track?: ExamTrack) => track ?? (await getStudentExamTrack(userId));
export const quoteItemsInput = z.array(z.object({ track: z.enum(EXAM_TRACKS), tier: z.enum(PAID_TIERS), period: z.enum(["monthly", "yearly"]) })).min(1).max(EXAM_TRACKS.length);

export const subscriptionRouter = router({
  getPlans: publicProcedure.query(() => listActivePlans()),

  // Client'ın useEntitlement() hook'unun okuduğu tek snapshot (spec §8) — bir sınavın aboneliği.
  getCurrent: protectedProcedure.input(trackInput).query(async ({ ctx, input }) => getEntitlements(ctx.user.id, await resolveTrack(ctx.user.id, input?.track))),
  getEntitlements: protectedProcedure.input(trackInput).query(async ({ ctx, input }) => getEntitlements(ctx.user.id, await resolveTrack(ctx.user.id, input?.track))),

  /** Adayın sınavlarındaki (eklediği ve aboneliği olan) tüm abonelikler. */
  mine: protectedProcedure.query(async ({ ctx }) => {
    const [enrolled, rows] = await Promise.all([listTracks(ctx.user.id).catch(() => []), listSubscriptionsForUser(ctx.user.id)]);
    const tracks = Array.from(new Set<ExamTrack>([...enrolled.map((row) => row.track), ...rows.map((row) => row.track)]));
    if (!tracks.length) tracks.push(await getStudentExamTrack(ctx.user.id));
    return Promise.all(tracks.map((track) => getEntitlements(ctx.user.id, track)));
  }),

  /** Sepet tutarı: paket (2+ sınav) ya da branş (KPSS aboneliği varken MEB-AGS / A grubu) indirimiyle. */
  quote: protectedProcedure.input(z.object({ items: quoteItemsInput })).query(async ({ ctx, input }) => {
    try {
      return await quoteForUser(ctx.user.id, input.items);
    } catch (error) {
      if (error instanceof QuoteError) throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
      throw error;
    }
  }),

  cancel: protectedProcedure.input(z.object({ immediate: z.boolean().optional(), track: z.enum(EXAM_TRACKS).optional() })).mutation(async ({ ctx, input }) => {
    const track = await resolveTrack(ctx.user.id, input.track);
    const current = await getCurrentSubscription(ctx.user.id, track);
    const nextStatus: SubscriptionStatus = input.immediate ? "canceled" : (current.status as SubscriptionStatus);
    if (input.immediate) assertValidSubscriptionTransition(current.status as SubscriptionStatus, "canceled");
    await updateSubscription(ctx.user.id, track, { status: nextStatus, cancelAtPeriodEnd: input.immediate ? 0 : 1, canceledAt: new Date() });
    await writeAuditLog({ userId: ctx.user.id, action: "user_canceled", oldState: { status: current.status }, newState: { status: nextStatus, cancelAtPeriodEnd: !input.immediate, track } });
    return getEntitlements(ctx.user.id, track);
  }),

  resume: protectedProcedure.input(trackInput).mutation(async ({ ctx, input }) => {
    const track = await resolveTrack(ctx.user.id, input?.track);
    const current = await getCurrentSubscription(ctx.user.id, track);
    if (!current.cancelAtPeriodEnd && current.status !== "canceled") return getEntitlements(ctx.user.id, track);
    assertValidSubscriptionTransition(current.status as SubscriptionStatus, "active");
    await updateSubscription(ctx.user.id, track, { status: "active", cancelAtPeriodEnd: 0, canceledAt: null });
    await writeAuditLog({ userId: ctx.user.id, action: "user_resumed", oldState: { status: current.status }, newState: { status: "active", track } });
    return getEntitlements(ctx.user.id, track);
  }),

  restore: protectedProcedure.input(z.object({ providerToken: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    const provider = paymentProviderFactory();
    const result = await provider.restorePurchase({ userId: ctx.user.id, providerToken: input.providerToken });
    if (!result.valid) throw new Error(result.reason ?? "Satın alma doğrulanamadı");
    await writeAuditLog({ userId: ctx.user.id, action: "purchase_restored", newState: { providerSubscriptionId: result.providerSubscriptionId } });
    return getEntitlements(ctx.user.id, await getStudentExamTrack(ctx.user.id));
  }),
});
