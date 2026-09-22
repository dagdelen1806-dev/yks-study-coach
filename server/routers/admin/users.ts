import { z } from "zod";
import { adminProcedure, router } from "../../_core/trpc";
import { getUserDetailForAdmin, listUsersForAdminPaginated, reactivateUser, suspendUser } from "../../admin/adminUserDb";
import { approveUser, listPendingUsers, rejectUser } from "../../subscriptions/subscriptionDb";

/**
 * Üyelik onayı (bu oturumun daha önceki isteği: her yeni kayıt
 * `users.approvalStatus = "pending"` ile başlar, `requireUser` middleware'i
 * — server/_core/trpc.ts — onaylanmadan hiçbir protectedProcedure'a izin
 * vermez) + PHASE 3'ün istediği tam üye listesi/detayı/askıya alma.
 */
export const adminUsersRouter = router({
  list: adminProcedure
    .input(
      z.object({
        search: z.string().max(120).optional(),
        approvalStatus: z.enum(["pending", "approved", "rejected"]).optional(),
        accountStatus: z.enum(["active", "suspended", "deleted"]).optional(),
        planCode: z.string().max(40).optional(),
        subscriptionStatus: z.string().max(40).optional(),
        activity: z.enum(["today", "week", "inactive"]).optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(({ input }) => listUsersForAdminPaginated(input)),

  get: adminProcedure.input(z.object({ userId: z.number().int() })).query(({ input }) => getUserDetailForAdmin(input.userId)),

  listPending: adminProcedure.query(() => listPendingUsers()),
  approve: adminProcedure.input(z.object({ userId: z.number().int() })).mutation(({ ctx, input }) => approveUser(input.userId, ctx.user.id)),
  reject: adminProcedure.input(z.object({ userId: z.number().int(), reason: z.string().max(300).optional() })).mutation(({ ctx, input }) => rejectUser(input.userId, ctx.user.id, input.reason)),

  // Hesap yaşam döngüsü — subscription iptaliyle KARIŞTIRILMAZ (spec §5/§23): bir kullanıcı aboneliğini iptal edince hesabı askıya alınmaz.
  suspend: adminProcedure.input(z.object({ userId: z.number().int(), reason: z.string().max(300).optional() })).mutation(({ ctx, input }) => suspendUser(input.userId, ctx.user.id, input.reason)),
  reactivate: adminProcedure.input(z.object({ userId: z.number().int() })).mutation(({ ctx, input }) => reactivateUser(input.userId, ctx.user.id)),
});
