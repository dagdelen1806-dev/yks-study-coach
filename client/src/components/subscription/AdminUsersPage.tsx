import { useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import AdminUserDetail from "./AdminUserDetail";
import { accountStatusLabel, accountStatusTone, approvalLabel, approvalTone, formatDate, subscriptionStatusLabel } from "./adminFormat";

/**
 * /admin/users karşılığı (spec §7/§35) — server-side arama/filtre/pagination.
 * Hiçbir zaman "tüm kullanıcıları çekip client'ta filtrele" yapmaz;
 * `admin.users.list` zaten sayfalanmış, filtrelenmiş sonucu döner.
 */
export default function AdminUsersPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [approvalStatus, setApprovalStatus] = useState("");
  const [accountStatus, setAccountStatus] = useState("");
  const [planCode, setPlanCode] = useState("");
  const [activity, setActivity] = useState("");
  const [page, setPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const pageSize = 20;

  // Debounced search (spec §8) — yazarken her tuşta istek atmaz.
  useEffect(() => {
    const timer = window.setTimeout(() => { setSearch(searchInput); setPage(1); }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const list = trpc.admin.users.list.useQuery({
    search: search || undefined,
    approvalStatus: (approvalStatus || undefined) as never,
    accountStatus: (accountStatus || undefined) as never,
    planCode: planCode || undefined,
    activity: (activity || undefined) as never,
    page,
    pageSize,
  });

  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.total / pageSize)) : 1;

  return (
    <div className="space-y-4">
      <Card className="soft-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a2a3aa]" size={15} /><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="İsim veya e-posta ara..." className="form-input h-9 w-full pl-9 text-[12px]" /></div>
          <select value={approvalStatus} onChange={(event) => { setApprovalStatus(event.target.value); setPage(1); }} className="form-input h-9 w-auto text-[11px]"><option value="">Tüm onay durumları</option><option value="pending">Onay bekliyor</option><option value="approved">Onaylı</option><option value="rejected">Reddedildi</option></select>
          <select value={accountStatus} onChange={(event) => { setAccountStatus(event.target.value); setPage(1); }} className="form-input h-9 w-auto text-[11px]"><option value="">Tüm hesap durumları</option><option value="active">Aktif</option><option value="suspended">Askıda</option></select>
          <select value={planCode} onChange={(event) => { setPlanCode(event.target.value); setPage(1); }} className="form-input h-9 w-auto text-[11px]"><option value="">Tüm planlar</option><option value="FREE">Free</option><option value="PREMIUM_MONTHLY">Premium Aylık</option><option value="PREMIUM_YEARLY">Premium Yıllık</option></select>
          <select value={activity} onChange={(event) => { setActivity(event.target.value); setPage(1); }} className="form-input h-9 w-auto text-[11px]"><option value="">Tüm aktivite</option><option value="today">Bugün aktif</option><option value="week">Bu hafta aktif</option><option value="inactive">7+ gün pasif</option></select>
        </div>
      </Card>

      <Card className="soft-card overflow-hidden">
        {list.isLoading ? (
          <div className="flex justify-center p-10"><Loader2 className="animate-spin text-[#3b5ccc]" size={20} /></div>
        ) : list.isError ? (
          <div className="p-8 text-center text-[12px] text-[#d95d4d]">Kullanıcılar yüklenemedi. <button onClick={() => list.refetch()} className="font-semibold underline">Tekrar dene</button></div>
        ) : !list.data?.rows.length ? (
          <div className="p-8 text-center text-[12px] text-[#858690]">Bu filtrelerle eşleşen kullanıcı yok.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-[12px]">
                <thead className="border-b border-[#1f2333]/[0.06] bg-[#fafafa] text-[10px] uppercase tracking-[.1em] text-[#9a9ba3]"><tr><th className="px-4 py-2.5">Kullanıcı</th><th className="px-4 py-2.5">Onay</th><th className="px-4 py-2.5">Hesap</th><th className="px-4 py-2.5">Plan</th><th className="px-4 py-2.5">Abonelik</th><th className="px-4 py-2.5">Konu %</th><th className="px-4 py-2.5">Deneme</th><th className="px-4 py-2.5">Katıldı</th></tr></thead>
                <tbody className="divide-y divide-[#1f2333]/[0.06]">
                  {list.data.rows.map((row) => (
                    <tr key={row.id} onClick={() => setSelectedUserId(row.id)} className="cursor-pointer hover:bg-[#fafaff]">
                      <td className="px-4 py-2.5 font-medium text-[#343643]"><span className="mr-1.5 rounded-md bg-[#f7f5ef] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#8b8c95]">#{row.id}</span>{row.name || row.email || `#${row.id}`}{row.role === "admin" && <span className="ml-1.5 rounded-full bg-[#1f2333] px-1.5 py-0.5 text-[9px] font-bold text-white">admin</span>}</td>
                      <td className="px-4 py-2.5"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${approvalTone[row.approvalStatus]}`}>{approvalLabel[row.approvalStatus]}</span></td>
                      <td className="px-4 py-2.5"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${accountStatusTone[row.accountStatus]}`}>{accountStatusLabel[row.accountStatus]}</span></td>
                      <td className="px-4 py-2.5 text-[#8b8c95]">{row.planCode}</td>
                      <td className="px-4 py-2.5 text-[#8b8c95]">{subscriptionStatusLabel[row.subscriptionStatus] ?? row.subscriptionStatus}</td>
                      <td className="px-4 py-2.5 text-[#8b8c95]">%{row.topicCoveragePercent}</td>
                      <td className="px-4 py-2.5 text-[#8b8c95]">{row.examCount}{row.latestExamNet != null ? ` · ${row.latestExamNet.toFixed(2)}` : ""}</td>
                      <td className="px-4 py-2.5 text-[#8b8c95]">{formatDate(row.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-[#1f2333]/[0.06] px-4 py-3 text-[11px] text-[#8b8c95]">
              <span>{list.data.total} kayıt · sayfa {page}/{totalPages}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1} className="rounded-lg border border-[#1f2333]/10 px-2.5 py-1.5 font-semibold disabled:opacity-40">Önceki</button>
                <button onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page >= totalPages} className="rounded-lg border border-[#1f2333]/10 px-2.5 py-1.5 font-semibold disabled:opacity-40">Sonraki</button>
              </div>
            </div>
          </>
        )}
      </Card>

      {selectedUserId !== null && <AdminUserDetail userId={selectedUserId} onClose={() => setSelectedUserId(null)} />}
    </div>
  );
}
