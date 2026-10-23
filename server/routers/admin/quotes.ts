import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, router } from "../../_core/trpc";
import { ORG_PLAN_DEFAULT_CREDITS, ORG_PLAN_LABELS, ORG_PLANS, membershipState, renewedMembershipEnd } from "../../../shared/org";
import { QUOTE_STATUSES, quoteLineSchema, quoteNumber } from "../../../shared/orgQuote";
import { getOrganization, updateOrgMembership, writeAudit } from "../../org/orgDb";
import { createQuote, deleteQuote, getQuote, listQuotes, markQuoteApplied, setQuoteStatus, updateQuote } from "../../org/quoteDb";

const id = z.number().int().positive();
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const quoteInput = z.object({
  orgId: id.nullable(),
  customerName: z.string().trim().min(2).max(160),
  contactName: z.string().trim().max(120).nullable(),
  contactEmail: z.string().trim().email().max(160).nullable(),
  plan: z.enum(ORG_PLANS),
  months: z.number().int().min(1).max(60),
  studentCount: z.number().int().min(1).max(100_000).nullable(),
  lines: z.array(quoteLineSchema).min(1).max(30),
  discountPercent: z.number().int().min(0).max(100),
  vatRate: z.number().int().min(0).max(30),
  validUntil: day.nullable(),
  note: z.string().trim().max(2000).nullable(),
});

async function requireQuote(quoteId: number) {
  const quote = await getQuote(quoteId);
  if (!quote) throw new TRPCError({ code: "NOT_FOUND", message: "Teklif bulunamadı." });
  return quote;
}

/**
 * Yönetim Paneli → Teklifler: kurumlara (ya da kurumu henüz açılmamış adaylara) abonelik fiyat
 * teklifi. Kabul edilen teklif bağlı kuruma tek seferlik uygulanır: paket, süre (bitmemişse üstüne)
 * ve en az paketin varsayılanı kadar aylık AI kredisi.
 */
export const adminQuotesRouter = router({
  list: adminProcedure.query(() => listQuotes()),
  get: adminProcedure.input(z.object({ id })).query(({ input }) => requireQuote(input.id)),
  save: adminProcedure.input(quoteInput.extend({ id: id.optional() })).mutation(async ({ ctx, input }) => {
    if (input.orgId && !(await getOrganization(input.orgId))) throw new TRPCError({ code: "NOT_FOUND", message: "Kurum bulunamadı." });
    const { id: quoteId, validUntil, ...rest } = input;
    const values = { ...rest, contactName: rest.contactName || null, contactEmail: rest.contactEmail || null, note: rest.note || null, validUntil: validUntil ? new Date(`${validUntil}T23:59:59`) : null };
    if (!quoteId) return { id: await createQuote(values, ctx.user.id) };
    const current = await requireQuote(quoteId);
    if (current.status === "accepted" || current.status === "rejected") throw new TRPCError({ code: "BAD_REQUEST", message: "Sonuçlanmış teklif değiştirilemez; kopyalayıp yenisini hazırla." });
    await updateQuote(quoteId, values);
    return { id: quoteId };
  }),
  setStatus: adminProcedure.input(z.object({ id, status: z.enum(QUOTE_STATUSES) })).mutation(async ({ ctx, input }) => {
    const quote = await requireQuote(input.id);
    if (quote.appliedAt) throw new TRPCError({ code: "BAD_REQUEST", message: "Kuruma uygulanmış teklifin durumu değişmez." });
    await setQuoteStatus(input.id, input.status);
    if (quote.orgId) await writeAudit({ orgId: quote.orgId, actorUserId: ctx.user.id, action: "platform.quote_status", targetType: "quote", targetId: input.id, metadata: { status: input.status, number: quoteNumber(quote.id, quote.createdAt) } });
    return { ok: true };
  }),
  /** Kabul edilen teklifi bağlı kurumun üyeliğine uygular (bir kez). */
  applyToOrg: adminProcedure.input(z.object({ id })).mutation(async ({ ctx, input }) => {
    const quote = await requireQuote(input.id);
    if (quote.status !== "accepted") throw new TRPCError({ code: "BAD_REQUEST", message: "Önce teklifi kabul edildi olarak işaretle." });
    if (quote.appliedAt) throw new TRPCError({ code: "CONFLICT", message: "Bu teklif kuruma zaten uygulandı." });
    if (!quote.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "Teklif bir kuruma bağlı değil; önce kurumu oluşturup teklife bağla." });
    const org = await getOrganization(quote.orgId);
    if (!org) throw new TRPCError({ code: "NOT_FOUND", message: "Kurum bulunamadı." });
    const now = new Date();
    const expired = membershipState(org, now) !== "active";
    await updateOrgMembership(org.id, { plan: quote.plan, membershipStartsAt: expired || !org.membershipStartsAt ? now : org.membershipStartsAt, membershipEndsAt: renewedMembershipEnd(expired ? null : org.membershipEndsAt, now, quote.months), aiCreditsMonthly: Math.max(org.aiCreditsMonthly, ORG_PLAN_DEFAULT_CREDITS[quote.plan]) });
    await markQuoteApplied(quote.id);
    await writeAudit({ orgId: org.id, actorUserId: ctx.user.id, action: "platform.quote_applied", targetType: "quote", targetId: quote.id, metadata: { plan: ORG_PLAN_LABELS[quote.plan], months: quote.months, number: quoteNumber(quote.id, quote.createdAt) } });
    return { ok: true };
  }),
  delete: adminProcedure.input(z.object({ id })).mutation(async ({ input }) => {
    const quote = await requireQuote(input.id);
    if (quote.status !== "draft") throw new TRPCError({ code: "BAD_REQUEST", message: "Yalnızca taslak teklif silinebilir." });
    await deleteQuote(input.id);
    return { ok: true };
  }),
});
