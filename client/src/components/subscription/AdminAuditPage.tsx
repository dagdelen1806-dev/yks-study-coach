import { Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { formatDateTime } from "./adminFormat";

/** /admin/audit-logs (spec §30/§45) — yalnızca admin erişebilir (adminProcedure), normal kullanıcı hiç göremez. */
export default function AdminAuditPage() {
  const list = trpc.admin.audit.list.useQuery({ limit: 100 });

  return (
    <Card className="soft-card overflow-hidden">
      {list.isLoading ? (
        <div className="flex justify-center p-10"><Loader2 className="animate-spin text-[#3b5ccc]" size={20} /></div>
      ) : !list.data?.length ? (
        <div className="p-8 text-center text-[12px] text-[#858690]">Henüz denetim kaydı yok.</div>
      ) : (
        <div className="divide-y divide-[#1f2333]/[0.06]">
          {list.data.map((log) => (
            <div key={log.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-[12px]">
              <div><span className="font-semibold text-[#343643]">{log.action}</span><span className="ml-2 text-[#9a9ba3]">kullanıcı #{log.userId}{log.adminId ? ` · admin #${log.adminId}` : " · sistem"}</span>{log.reason && <div className="mt-0.5 text-[11px] text-[#8b8c95]">{log.reason}</div>}</div>
              <span className="text-[10px] text-[#a0a1a9]">{formatDateTime(log.createdAt)}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
