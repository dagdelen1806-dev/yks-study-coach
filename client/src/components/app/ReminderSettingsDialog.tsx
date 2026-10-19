import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { currentSubscription, pushSupport, subscribePush, unsubscribePush } from "@/lib/push";
import { trpc } from "@/lib/trpc";
import { BellRing, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

/**
 * Oturum hatırlatmaları: planındaki her oturumdan birkaç dakika önce bu cihaza bildirim.
 * Cihaz başına: telefonda ve bilgisayarda ayrı ayrı açılır.
 */
export default function ReminderSettingsDialog({ onClose }: { onClose: () => void }) {
  const config = trpc.push.config.useQuery(undefined, { staleTime: Infinity });
  const [endpoint, setEndpoint] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const support = pushSupport();
  const status = trpc.push.status.useQuery({ endpoint: endpoint ?? "" }, { enabled: Boolean(endpoint) });
  const subscribe = trpc.push.subscribe.useMutation();
  const unsubscribe = trpc.push.unsubscribe.useMutation();
  const test = trpc.push.test.useMutation({
    onSuccess: () => toast.success("Deneme bildirimi gönderildi."),
    onError: (error) => toast.error(error.message),
  });

  useEffect(() => { void currentSubscription().then((subscription) => setEndpoint(subscription?.endpoint ?? null)); }, []);
  const enabled = Boolean(endpoint && status.data?.subscribed);
  const permissionDenied = support === "supported" && Notification.permission === "denied";

  const turnOn = async () => {
    if (!config.data?.publicKey) return;
    setBusy(true);
    try {
      const subscription = await subscribePush(config.data.publicKey);
      if (subscription === "denied") { toast.error("Bildirim izni verilmedi. Tarayıcı ayarlarından Pusula'ya izin verebilirsin."); return; }
      await subscribe.mutateAsync({ endpoint: subscription.endpoint!, keys: { p256dh: subscription.keys!.p256dh, auth: subscription.keys!.auth } });
      setEndpoint(subscription.endpoint!);
      await status.refetch();
      toast.success("Hatırlatmalar bu cihazda açık.");
    } catch {
      toast.error("Hatırlatmalar açılamadı, tekrar dener misin?");
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    setBusy(true);
    try {
      const removed = await unsubscribePush();
      if (removed) await unsubscribe.mutateAsync({ endpoint: removed });
      setEndpoint(null);
      toast.success("Hatırlatmalar bu cihazda kapatıldı.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle className="flex items-center gap-2"><BellRing size={18} className="text-brand" /> Oturum hatırlatmaları</DialogTitle>
        <DialogDescription>Planındaki her oturumdan yaklaşık 10–15 dakika önce bu cihaza bildirim gelir. Dokununca o oturumun odak ekranı açılır.</DialogDescription>
        {config.isLoading || endpoint === undefined ? (
          <div className="flex justify-center p-6"><Loader2 className="animate-spin text-brand" size={20} /></div>
        ) : !config.data?.publicKey || support === "unsupported" ? (
          <p className="rounded-xl bg-paper p-4 text-[13px] leading-6 text-ink-2">Bu tarayıcı bildirimleri desteklemiyor. Telefonunda Chrome ya da Safari ile, Pusula'yı ana ekrana ekleyerek deneyebilirsin.</p>
        ) : support === "ios-needs-install" ? (
          <p className="rounded-xl bg-paper p-4 text-[13px] leading-6 text-ink-2">iPhone'da bildirim için önce Pusula'yı ana ekrana ekle: Safari'de <strong>Paylaş</strong> → <strong>Ana Ekrana Ekle</strong>. Sonra Pusula'yı ana ekrandan açıp buradan hatırlatmaları aç.</p>
        ) : permissionDenied ? (
          <p className="rounded-xl bg-warn-soft p-4 text-[13px] leading-6 text-ink-2">Bu cihazda Pusula'nın bildirim izni kapalı. Tarayıcının site ayarlarından bildirimlere izin verip tekrar dene.</p>
        ) : (
          <div className="space-y-3">
            <div className={`rounded-xl p-4 text-[13px] font-semibold ${enabled ? "bg-success-soft text-success" : "bg-paper text-ink-2"}`}>{enabled ? "Bu cihazda hatırlatmalar açık." : "Bu cihazda hatırlatmalar kapalı."}</div>
            <div className="flex flex-wrap gap-2">
              {enabled ? (
                <>
                  <button onClick={() => test.mutate()} disabled={test.isPending} className="h-10 rounded-xl bg-brand px-4 text-[13px] font-semibold text-white hover:bg-brand-strong disabled:opacity-60">{test.isPending ? "Gönderiliyor…" : "Deneme bildirimi gönder"}</button>
                  <button onClick={() => void turnOff()} disabled={busy} className="h-10 rounded-xl border border-rule px-4 text-[13px] font-semibold text-ink-2 hover:bg-paper disabled:opacity-60">Kapat</button>
                </>
              ) : (
                <button onClick={() => void turnOn()} disabled={busy} className="h-10 rounded-xl bg-brand px-4 text-[13px] font-semibold text-white hover:bg-brand-strong disabled:opacity-60">{busy ? "Açılıyor…" : "Hatırlatmaları aç"}</button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
