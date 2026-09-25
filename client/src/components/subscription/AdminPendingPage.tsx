import { useState } from "react";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "./adminFormat";

export default function AdminPendingPage() {
  const utils = trpc.useUtils();
  const pendingUsers = trpc.admin.users.listPending.useQuery();
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [reason, setReason] = useState("");

  const refetch = () => { pendingUsers.refetch(); utils.admin.users.list.invalidate(); utils.admin.analytics.overview.invalidate(); };
  const approve = trpc.admin.users.approve.useMutation({ onSuccess: () => { toast.success("Kullanıcı onaylandı."); refetch(); }, onError: (error) => toast.error(error.message) });
  const reject = trpc.admin.users.reject.useMutation({ onSuccess: () => { toast.success("Kullanıcı reddedildi."); refetch(); setRejectingId(null); setReason(""); }, onError: (error) => toast.error(error.message) });

  return (
    <Card className="soft-card p-5 sm:p-6">
      <div className="flex items-center justify-between"><h2 className="text-[16px] font-semibold text-[#1f2333]">Onay bekleyen kayıtlar</h2><span className="rounded-full bg-[#fff8df] px-2.5 py-1 text-[10px] font-bold text-[#a1711d]">{pendingUsers.data?.length ?? 0}</span></div>
      {pendingUsers.isLoading ? (
        <p className="mt-4 text-[12px] text-[#9a9ba3]">Yükleniyor...</p>
      ) : pendingUsers.isError ? (
        <p className="mt-4 text-[12px] text-[#d95d4d]">Yüklenemedi. <button onClick={() => pendingUsers.refetch()} className="font-semibold underline">Tekrar dene</button></p>
      ) : !pendingUsers.data?.length ? (
        <p className="mt-4 rounded-xl bg-[#f7f5ef] p-4 text-[12px] text-[#858690]">Onay bekleyen kayıt yok.</p>
      ) : (
        <div className="mt-4 space-y-2">
          {pendingUsers.data.map((pendingUser) => (
            <div key={pendingUser.id} className="rounded-2xl border border-[#1f2333]/[0.07] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><div className="text-[13px] font-semibold text-[#303342]">{pendingUser.name || "İsimsiz"}</div><div className="mt-0.5 text-[10px] text-[#999aa2]">{pendingUser.email || pendingUser.phone || pendingUser.openId} ·{formatDate(pendingUser.createdAt)}</div></div>
                <div className="flex gap-2">
                  <Button onClick={() => approve.mutate({ userId: pendingUser.id })} disabled={approve.isPending} className="h-9 rounded-xl bg-[#55a98b] px-3 text-[11px] font-semibold text-white hover:bg-[#469278]"><Check size={13} className="mr-1" /> Onayla</Button>
                  <Button onClick={() => setRejectingId(rejectingId === pendingUser.id ? null : pendingUser.id)} variant="outline" className="h-9 rounded-xl border-[#d95d4d]/25 px-3 text-[11px] font-semibold text-[#d95d4d]"><X size={13} className="mr-1" /> Reddet</Button>
                </div>
              </div>
              {rejectingId === pendingUser.id && (
                <div className="mt-3 flex gap-2">
                  <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Red nedeni (opsiyonel)" className="form-input flex-1 text-[11px]" />
                  <Button onClick={() => reject.mutate({ userId: pendingUser.id, reason: reason || undefined })} disabled={reject.isPending} className="h-9 shrink-0 rounded-xl bg-[#d95d4d] px-3 text-[11px] font-semibold text-white">Onayla</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
