import { trpc } from "@/lib/trpc";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Bell, CheckCheck } from "lucide-react";

const LEVEL_DOT = { info: "bg-brand", success: "bg-success", warning: "bg-warn-fill", action: "bg-pencil" } as const;

const ago = (value: string | Date) => {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 60) return `${Math.max(1, minutes)} dk önce`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours} saat önce` : `${Math.round(hours / 24)} gün önce`;
};

/** Okunmamış koç uyarıları (plan uyumu, deneme düşüşü vb.); tıklanan uyarı okundu sayılır. */
export default function NotificationBell() {
  const utils = trpc.useUtils();
  const alerts = trpc.calendar.alerts.useQuery(undefined, { retry: false, staleTime: 60_000 });
  const markRead = trpc.calendar.readCoachAlert.useMutation({ onSuccess: () => utils.calendar.alerts.invalidate() });
  const items = alerts.data ?? [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="icon-button" aria-label={items.length ? `Bildirimler, ${items.length} okunmamış` : "Bildirimler"}>
          <Bell size={19} />
          {items.length > 0 && <span className="notification-dot" />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(340px,calc(100vw-24px))] p-0">
        <div className="border-b border-rule px-4 py-3 text-[14px] font-bold text-ink">Bildirimler</div>
        {alerts.isError ? (
          <p className="px-4 py-6 text-center text-[13px] text-ink-3">Bildirimler yüklenemedi.</p>
        ) : items.length === 0 ? (
          <p className="flex items-center justify-center gap-2 px-4 py-6 text-[13px] text-ink-3"><CheckCheck size={16} /> Yeni bildirim yok.</p>
        ) : (
          <ul className="max-h-[360px] divide-y divide-rule overflow-y-auto">
            {items.map((alert) => (
              <li key={alert.id}>
                <button onClick={() => markRead.mutate({ alertId: alert.id })} className="flex w-full gap-3 px-4 py-3 text-left hover:bg-paper" title="Okundu olarak işaretle">
                  <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${LEVEL_DOT[alert.level]}`} aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold text-ink">{alert.title}</span>
                    <span className="mt-0.5 block text-[12px] leading-5 text-ink-3">{alert.message}</span>
                    <span className="mt-1 block text-[11px] text-ink-4">{ago(alert.createdAt)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
