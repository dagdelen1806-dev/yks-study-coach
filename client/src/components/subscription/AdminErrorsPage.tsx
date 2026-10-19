import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { formatDateTime } from "./adminFormat";

const sourceLabel = { client: "Tarayıcı", server: "Sunucu" } as const;
const sourceTone = { client: "bg-violet-soft text-violet", server: "bg-danger-soft text-danger" } as const;

/**
 * Uygulama hataları (server/errors/errorLog.ts). Aynı hata tek satır: sayaç, son görülme,
 * son kullanıcı. Çözüldü olarak işaretlenen hata tekrar görülürse kendiliğinden yeniden açılır.
 */
export default function AdminErrorsPage() {
  const [status, setStatus] = useState<"open" | "resolved">("open");
  const utils = trpc.useUtils();
  const list = trpc.admin.errors.list.useQuery({ status });
  const resolve = trpc.admin.errors.resolve.useMutation({
    onSuccess: () => { void utils.admin.errors.list.invalidate(); toast.success("Çözüldü olarak işaretlendi."); },
    onError: () => toast.error("İşaretlenemedi, tekrar dener misin?"),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full bg-paper p-1" role="tablist" aria-label="Hata durumu">
          {(["open", "resolved"] as const).map((key) => <button key={key} role="tab" aria-selected={status === key} onClick={() => setStatus(key)} className={`rounded-full px-3 py-1.5 text-[12px] font-semibold ${status === key ? "bg-white text-ink shadow-sm" : "text-ink-3"}`}>{key === "open" ? "Açık" : "Çözülenler"}</button>)}
        </div>
        <p className="text-[12px] text-ink-3">Tarayıcıdaki çökmeler ve sunucudaki beklenmeyen hatalar. Kullanıcıya gösterilen doğrulama mesajları burada yer almaz.</p>
      </div>
      <Card className="soft-card overflow-hidden">
        {list.isLoading ? (
          <div className="flex justify-center p-10"><Loader2 className="animate-spin text-brand" size={20} /></div>
        ) : list.isError ? (
          <div className="p-8 text-center text-[13px] text-danger">Hatalar yüklenemedi. <button onClick={() => list.refetch()} className="font-semibold underline">Tekrar dene</button></div>
        ) : !list.data?.length ? (
          <div className="p-8 text-center text-[13px] text-ink-3">{status === "open" ? "Açık hata yok. 🎉" : "Henüz çözülmüş hata yok."}</div>
        ) : (
          <div className="divide-y divide-ink/[0.06]">
            {list.data.map((item) => (
              <details key={item.id} className="group px-4 py-3">
                <summary className="flex cursor-pointer list-none flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${sourceTone[item.source]}`}>{sourceLabel[item.source]}</span>
                      <span className="rounded-full bg-paper px-2 py-0.5 text-[11px] font-bold text-ink-2">{item.count}×</span>
                      {item.path && <span className="truncate text-[12px] text-ink-4">{item.path}</span>}
                    </div>
                    <div className="mt-1.5 break-words text-[13px] font-semibold text-ink">{item.message}</div>
                    <div className="mt-1 text-[12px] text-ink-4">Son: {formatDateTime(item.lastSeenAt)} · İlk: {formatDateTime(item.firstSeenAt)}{item.lastUserId ? ` · kullanıcı #${item.lastUserId}` : ""}</div>
                  </div>
                  {status === "open" && <button onClick={(event) => { event.preventDefault(); resolve.mutate({ id: item.id }); }} disabled={resolve.isPending} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-rule bg-white px-3 py-1.5 text-[12px] font-semibold text-ink-2 hover:border-success/40 hover:text-success disabled:opacity-60"><CheckCircle2 size={14} /> Çözüldü</button>}
                </summary>
                {item.stack && <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-paper p-3 text-[11px] leading-5 text-ink-3">{item.stack}</pre>}
                {item.userAgent && <div className="mt-2 text-[11px] text-ink-4">{item.userAgent}</div>}
              </details>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
