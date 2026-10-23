import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AdminPricesPanel from "@/components/subscription/AdminPricesPanel";
import type { OrgPlan } from "@shared/org";

type PriceForm = { monthly: string; yearly: string; note: string };
const toNumber = (value: string) => (value.trim() === "" ? null : Math.max(0, Math.round(Number(value) || 0)));

/**
 * Yönetim Paneli → Paketler ve fiyatlar: bireysel sınav paketleri (AdminPricesPanel) ve kurum
 * paketlerinin liste fiyatları. Kurum fiyatı boş bırakılırsa kurum panelinde "Fiyat için iletişime
 * geçin" görünür; fiyatlar kullanıcı kararıdır, burada varsayılan değer verilmez.
 */
export default function AdminPackagesPage() {
  return (
    <div className="space-y-5">
      <AdminPricesPanel />
      <OrgPlanPricesCard />
    </div>
  );
}

function OrgPlanPricesCard() {
  const utils = trpc.useUtils();
  const prices = trpc.admin.orgs.planPrices.useQuery();
  const [forms, setForms] = useState<Partial<Record<OrgPlan, PriceForm>>>({});
  useEffect(() => {
    if (!prices.data) return;
    setForms(Object.fromEntries(prices.data.map((row) => [row.plan, { monthly: row.monthlyPriceTry?.toString() ?? "", yearly: row.yearlyPriceTry?.toString() ?? "", note: row.priceNote ?? "" }])));
  }, [prices.data]);
  const setPrice = trpc.admin.orgs.setPlanPrice.useMutation({ onSuccess: () => { toast.success("Kurum paketi fiyatı kaydedildi."); utils.admin.orgs.planPrices.invalidate(); }, onError: (error) => toast.error(error.message) });

  return (
    <Card className="soft-card p-5 sm:p-6">
      <h2 className="text-[16px] font-semibold text-ink">Kurum paketleri</h2>
      <p className="mt-1 text-[12px] text-ink-3">Kurum panelindeki paket yükseltme ekranında görünen liste fiyatları (TL, KDV dahil yaz). Boş bırakılan alan "Fiyat için iletişime geçin" olarak görünür. Kurumun gerçek paketi ve süresi Kurumlar sayfasından verilir.</p>
      {prices.isLoading ? <div className="flex justify-center p-6"><Loader2 className="animate-spin text-brand" /></div> : (
        <div className="mt-4 space-y-3">
          {prices.data?.map((row) => {
            const form = forms[row.plan] ?? { monthly: "", yearly: "", note: "" };
            const update = (patch: Partial<PriceForm>) => setForms((current) => ({ ...current, [row.plan]: { ...form, ...patch } }));
            return (
              <section key={row.plan} aria-label={`${row.label} kurum paketi`} className="rounded-xl border border-rule p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-[14px] font-semibold text-ink">{row.label} <span className="text-[12px] font-normal text-ink-4">· aylık {row.defaultCredits.toLocaleString("tr-TR")} AI kredisi</span></p>
                  {row.updatedAt && <span className="text-[11px] text-ink-4">Son değişiklik {new Date(row.updatedAt).toLocaleDateString("tr-TR")}</span>}
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-[140px_140px_1fr_auto]">
                  <label className="block text-[12px] font-semibold text-ink-2">Aylık (TL)<input type="number" min={0} value={form.monthly} onChange={(event) => update({ monthly: event.target.value })} className="form-input mt-1" /></label>
                  <label className="block text-[12px] font-semibold text-ink-2">Yıllık (TL)<input type="number" min={0} value={form.yearly} onChange={(event) => update({ yearly: event.target.value })} className="form-input mt-1" /></label>
                  <label className="block text-[12px] font-semibold text-ink-2">Not (ör. "öğrenci başı", "50 öğrenciye kadar")<input value={form.note} maxLength={160} onChange={(event) => update({ note: event.target.value })} className="form-input mt-1" /></label>
                  <div className="flex items-end"><Button disabled={setPrice.isPending} onClick={() => setPrice.mutate({ plan: row.plan, monthlyPriceTry: toNumber(form.monthly), yearlyPriceTry: toNumber(form.yearly), priceNote: form.note.trim() || null })}>Kaydet</Button></div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </Card>
  );
}
