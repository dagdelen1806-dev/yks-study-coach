import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate, subscriptionStatusLabel } from "./adminFormat";

/**
 * /admin/subscriptions (spec §26). NOT: bu liste (mevcut abonelik kaydı olan
 * kullanıcı sayısı kadar) `admin.subscriptions.list` üzerinden tek seferde
 * gelir — çok büyük ölçekte (on binlerce abonelik) buraya da Users
 * sayfasındakiyle aynı server-side pagination eklenmesi gerekir; ilk
 * MVP'de birincil, sayfalanmış liste zaten Users sekmesinde (bkz.
 * docs/admin/ADMIN-COMMAND-CENTER.md "Known limitations").
 */
export default function AdminSubscriptionsPage() {
  const utils = trpc.useUtils();
  const list = trpc.admin.subscriptions.list.useQuery();
  const [grantPlan, setGrantPlan] = useState("PREMIUM_MONTHLY");
  const [grantDays, setGrantDays] = useState("30");
  const [grantUserId, setGrantUserId] = useState("");
  const [grantReason, setGrantReason] = useState("");

  const refetch = () => { list.refetch(); utils.admin.users.list.invalidate(); utils.admin.analytics.overview.invalidate(); };
  const revoke = trpc.admin.subscriptions.revoke.useMutation({ onSuccess: () => { toast.success("Erişim geri alındı."); refetch(); }, onError: (error) => toast.error(error.message) });
  const grant = trpc.admin.subscriptions.grant.useMutation({ onSuccess: () => { toast.success("Premium verildi."); refetch(); setGrantUserId(""); setGrantReason(""); }, onError: (error) => toast.error(error.message) });

  return (
    <div className="space-y-4">
      <Card className="soft-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-[16px] font-semibold text-[#1f2333]">Elle Premium ver</h2></div>
        <p className="mt-1 text-[11px] text-[#9a9ba3]">Gerçek bir ödeme olmadan, admin kararıyla verilir — ayrı bir "manuel" kaynak olarak işaretlenir, gerçek sağlayıcı aboneliğiyle karışmaz.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_100px_1.4fr_auto]">
          <input value={grantUserId} onChange={(event) => setGrantUserId(event.target.value)} placeholder="Kullanıcı ID" className="form-input text-[12px]" />
          <select value={grantPlan} onChange={(event) => setGrantPlan(event.target.value)} className="form-input text-[12px]"><option value="PREMIUM_MONTHLY">Premium Aylık</option><option value="PREMIUM_YEARLY">Premium Yıllık</option></select>
          <input type="number" min="1" value={grantDays} onChange={(event) => setGrantDays(event.target.value)} placeholder="gün" className="form-input text-[12px]" />
          <input value={grantReason} onChange={(event) => setGrantReason(event.target.value)} placeholder="Neden (audit log'a yazılır)" className="form-input text-[12px]" />
          <Button
            onClick={() => {
              const userId = Number(grantUserId);
              if (!userId) { toast.error("Geçerli bir kullanıcı ID gir."); return; }
              grant.mutate({ userId, planCode: grantPlan, days: Number(grantDays) || 30, reason: grantReason || undefined });
            }}
            disabled={grant.isPending}
            className="h-10 rounded-xl bg-[#3b5ccc] text-[11px] font-semibold text-white"
          >
            {grant.isPending ? "Veriliyor..." : "Ver"}
          </Button>
        </div>
      </Card>

      <Card className="soft-card overflow-hidden">
        {list.isLoading ? (
          <div className="flex justify-center p-10"><Loader2 className="animate-spin text-[#3b5ccc]" size={20} /></div>
        ) : !list.data?.length ? (
          <div className="p-8 text-center text-[12px] text-[#858690]">Henüz abonelik kaydı yok.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-[12px]">
              <thead className="border-b border-[#1f2333]/[0.06] bg-[#fafafa] text-[10px] uppercase tracking-[.1em] text-[#9a9ba3]"><tr><th className="px-4 py-2.5">Kullanıcı</th><th className="px-4 py-2.5">Plan</th><th className="px-4 py-2.5">Durum</th><th className="px-4 py-2.5">Trial bitiş</th><th className="px-4 py-2.5">Dönem bitiş</th><th className="px-4 py-2.5">Manuel mi</th><th className="px-4 py-2.5" /></tr></thead>
              <tbody className="divide-y divide-[#1f2333]/[0.06]">
                {list.data.map((row) => (
                  <tr key={row.userId}>
                    <td className="px-4 py-2.5 font-medium text-[#343643]">{row.userName || row.userEmail || `#${row.userId}`}</td>
                    <td className="px-4 py-2.5">{row.planName}</td>
                    <td className="px-4 py-2.5 text-[#8b8c95]">{subscriptionStatusLabel[row.status] ?? row.status}</td>
                    <td className="px-4 py-2.5 text-[#8b8c95]">{formatDate(row.trialEndsAt)}</td>
                    <td className="px-4 py-2.5 text-[#8b8c95]">{formatDate(row.currentPeriodEnd)}</td>
                    <td className="px-4 py-2.5 text-[#8b8c95]">{row.isManualOverride ? "Evet" : "Hayır"}</td>
                    <td className="px-4 py-2.5 text-right">{row.planCode !== "FREE" && <button onClick={() => revoke.mutate({ userId: row.userId })} className="text-[11px] font-semibold text-[#d95d4d]">Erişimi geri al</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
