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
        <div className="flex justify-center p-10"><Loader2 className="animate-spin text-brand" size={20} /></div>
      ) : !list.data?.length ? (
        <div className="p-8 text-center text-[13px] text-ink-3">Henüz denetim kaydı yok.</div>
      ) : (
        <div className="divide-y divide-ink/[0.06]">
          {list.data.map((log) => (
            <div key={log.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-[13px]">
              <div><span className="font-semibold text-ink-2">{log.action}</span><span className="ml-2 text-ink-4">kullanıcı #{log.userId}{log.adminId ? ` · admin #${log.adminId}` : " · sistem"}</span>{log.reason && <div className="mt-0.5 text-[12px] text-ink-3">{log.reason}</div>}</div>
              <span className="text-[12px] text-ink-4">{formatDateTime(log.createdAt)}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
