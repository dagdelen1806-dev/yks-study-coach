import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EXAM_TRACK_LABELS, EXAM_TRACKS, type ExamTrack } from "@shared/exams";
import { ADDON_DISCOUNT, BUNDLE_DISCOUNT } from "@shared/checkoutQuote";

/**
 * Yönetim → Fiyatlar: her sınavın planları ayrı fiyatlanır (Ekim 2026). Fiyat lira olarak girilir,
 * kuruş olarak saklanır; yıllık plandaki tutar 12 aylık tavandır (asıl tahsilat sınava kalan
 * süreye göre hesaplanır). Sunucu açılışında seed var olan fiyata dokunmaz.
 */
export default function AdminPricesPanel() {
  const utils = trpc.useUtils();
  const plans = trpc.admin.subscriptions.plans.useQuery();
  const [track, setTrack] = useState<ExamTrack>("YKS");
  const [drafts, setDrafts] = useState<Record<number, { price: string; trialDays: string }>>({});
  const update = trpc.admin.subscriptions.updatePlan.useMutation({
    onSuccess: (plan) => { toast.success(`${plan.name} güncellendi.`); setDrafts((current) => { const next = { ...current }; delete next[plan.id]; return next; }); utils.admin.subscriptions.plans.invalidate(); utils.subscription.getPlans.invalidate(); },
    onError: (error) => toast.error(error.message),
  });

  const rows = (plans.data ?? []).filter((plan) => plan.track === track);
  return (
    <Card className="soft-card p-5 sm:p-6">
      <h2 className="text-[16px] font-semibold text-ink">Fiyatlar</h2>
      <p className="mt-1 text-[12px] text-ink-4">Her sınavın aboneliği ayrı fiyatlanır. Paket indirimi (aynı ödemede 2+ sınav) %{Math.round(BUNDLE_DISCOUNT * 100)}, branş indirimi (KPSS aboneliği varken MEB-AGS / A grubu) %{Math.round(ADDON_DISCOUNT * 100)}; indirimler toplanmaz. Yıllık tutar 12 aylık tavandır, tahsilat sınava kalan süreye göre.</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {EXAM_TRACKS.map((item) => (
          <button key={item} onClick={() => setTrack(item)} className={`rounded-full px-3 py-1 text-[12px] font-semibold ${track === item ? "bg-brand text-white" : "bg-paper text-ink-3"}`}>{EXAM_TRACK_LABELS[item]}</button>
        ))}
      </div>
      {plans.isLoading ? (
        <div className="flex justify-center p-6"><Loader2 className="animate-spin text-brand" size={20} /></div>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead className="border-b border-ink/[0.06] text-[12px] text-ink-4"><tr><th className="py-2 pr-3">Plan</th><th className="py-2 pr-3">Fiyat (₺)</th><th className="py-2 pr-3">Deneme (gün)</th><th className="py-2 pr-3">Satışta</th><th className="py-2" /></tr></thead>
            <tbody className="divide-y divide-ink/[0.06]">
              {rows.map((plan) => {
                const draft = drafts[plan.id] ?? { price: String(plan.price / 100), trialDays: String(plan.trialDays) };
                const setDraft = (patch: Partial<typeof draft>) => setDrafts((current) => ({ ...current, [plan.id]: { ...draft, ...patch } }));
                const dirty = Boolean(drafts[plan.id]);
                return (
                  <tr key={plan.id}>
                    <td className="py-2 pr-3"><div className="font-medium text-ink-2">{plan.name}</div><div className="font-mono text-[11px] text-ink-4">{plan.code}</div></td>
                    <td className="py-2 pr-3"><input type="number" min="0" step="1" value={draft.price} onChange={(event) => setDraft({ price: event.target.value })} className="form-input h-9 w-28 text-[13px]" /></td>
                    <td className="py-2 pr-3"><input type="number" min="0" max="60" value={draft.trialDays} onChange={(event) => setDraft({ trialDays: event.target.value })} className="form-input h-9 w-20 text-[13px]" /></td>
                    <td className="py-2 pr-3"><input type="checkbox" checked={Boolean(plan.isActive)} onChange={(event) => update.mutate({ planId: plan.id, isActive: event.target.checked })} aria-label={`${plan.name} satışta`} /></td>
                    <td className="py-2 text-right">
                      <Button
                        disabled={!dirty || update.isPending}
                        onClick={() => {
                          const lira = Number(draft.price);
                          const trialDays = Number(draft.trialDays);
                          if (!Number.isFinite(lira) || lira < 0 || !Number.isInteger(trialDays) || trialDays < 0) { toast.error("Geçerli bir fiyat ve deneme süresi gir."); return; }
                          update.mutate({ planId: plan.id, price: Math.round(lira * 100), trialDays });
                        }}
                        className="h-8 rounded-lg bg-brand px-3 text-[12px] font-semibold text-white"
                      >
                        Kaydet
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
