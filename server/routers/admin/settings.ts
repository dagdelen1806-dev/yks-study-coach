import { eq } from "drizzle-orm";
import { z } from "zod";
import { users } from "../../../drizzle/schema";
import { companyInfoSchema } from "../../../shared/platformCompany";
import { adminProcedure, router } from "../../_core/trpc";
import { getCompanyInfo, saveCompanyInfo } from "../../admin/platformSettings";
import { getDb } from "../../db";
import { writeAuditLog } from "../../subscriptions/subscriptionDb";

/**
 * Yönetim Paneli → Ayarlar: şirket bilgileri (teklif belgesine yazılır) ve yöneticinin kendi adı.
 * Şifre değişikliği ortak `auth.changePassword` ucunu kullanır; e-posta giriş kimliği olduğu için buradan değişmez.
 */
export const adminSettingsRouter = router({
  company: adminProcedure.query(() => getCompanyInfo()),
  saveCompany: adminProcedure.input(companyInfoSchema).mutation(async ({ ctx, input }) => {
    await saveCompanyInfo(input, ctx.user.id);
    await writeAuditLog({ userId: ctx.user.id, adminId: ctx.user.id, action: "company_info_updated", newState: { legalName: input.legalName, taxNumber: input.taxNumber } });
    return { ok: true };
  }),
  updateMyName: adminProcedure.input(z.object({ name: z.string().trim().min(2).max(120) })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Veritabanına ulaşılamadı.");
    await db.update(users).set({ name: input.name }).where(eq(users.id, ctx.user.id));
    return { ok: true };
  }),
});
