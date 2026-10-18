import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { hasRole, seesAllStudents, type OrgRole } from "../../shared/org";
import { protectedProcedure } from "../_core/trpc";
import { getActiveMembership, hasActiveAssignment, isActiveStudent, writeAudit, type Membership } from "./orgDb";

/**
 * Kurum Paneli yetki katmanı. Tüm kurum uçları buradan geçer:
 * - `orgProcedure(minRole)`: girdideki `orgId` için kullanıcının AKTİF üyeliğini her istekte
 *   veritabanından taze okur; rolü yetmiyorsa ya da üye değilse NOT_FOUND (kurumun varlığı sızmaz).
 *   Üyelik süresi dolmuş kurumda değişiklik (mutation) uçları FORBIDDEN döner.
 * - `assertCanViewStudent`: koordinatör ve üstü kurumun aktif öğrencilerini, öğretmen yalnızca
 *   kendisine aktif olarak atanmış öğrencileri görür. Aksi halde NOT_FOUND.
 */

const notFound = (message = "Bulunamadı.") => new TRPCError({ code: "NOT_FOUND", message });

export type OrgContext = { user: { id: number }; membership: Membership };

/** `allowInactive`: süresi dolmuş kurumda da çalışan değişiklik uçları (paket yükseltme / süre uzatma talebi). */
export function orgProcedure(minRole: OrgRole, options: { allowInactive?: boolean } = {}) {
  return protectedProcedure
    .input(z.object({ orgId: z.number().int().positive() }))
    .use(async ({ ctx, input, next, type }) => {
      const membership = await getActiveMembership(ctx.user.id, input.orgId);
      if (!membership || !hasRole(membership.role, minRole)) throw notFound("Kurum bulunamadı.");
      // Üyelik süresi dolmuş (ya da henüz başlamamış) kurumda panel salt okunur: veriler görülür, değişiklik yapılamaz.
      if (type === "mutation" && !options.allowInactive && membership.state && membership.state !== "active") {
        throw new TRPCError({ code: "FORBIDDEN", message: membership.state === "expired" ? "Kurum üyeliğinin süresi doldu; panel salt okunur. Yenilemek için platform yöneticisiyle görüşün." : "Kurum üyeliği henüz başlamadı." });
      }
      return next({ ctx: { ...ctx, membership } });
    });
}

export async function assertCanViewStudent(ctx: OrgContext, studentUserId: number): Promise<void> {
  const { orgId, role } = ctx.membership;
  if (!(await isActiveStudent(orgId, studentUserId))) throw notFound("Öğrenci bulunamadı.");
  if (seesAllStudents(role)) return;
  if (role === "teacher" && (await hasActiveAssignment(orgId, ctx.user.id, studentUserId))) return;
  throw notFound("Öğrenci bulunamadı.");
}

export function audit(ctx: OrgContext, action: string, target?: { type: string; id: number }, metadata?: Record<string, unknown>) {
  return writeAudit({ orgId: ctx.membership.orgId, actorUserId: ctx.user.id, action, targetType: target?.type, targetId: target?.id, metadata });
}
