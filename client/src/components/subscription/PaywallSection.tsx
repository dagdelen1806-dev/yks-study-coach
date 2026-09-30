import { useState } from "react";
import { toast } from "sonner";
import { Check, CheckCircle2, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useEntitlement } from "@/hooks/useEntitlement";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const formatPrice = (minorUnits: number, currency: string) => `${(minorUnits / 100).toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${currency === "TRY" ? "₺" : currency}`;

const BENEFITS = [
  "AI destekli haftalık çalışma planı (sınırsız)",
  "PDF/fotoğraftan deneme sonucu aktarımı (sınırsız)",
  "Gelişmiş performans analizleri ve raporlar",
  "Kaynak Kataloğu'ndan kişiselleştirilmiş öneriler",
  "Öncelikli destek",
];

/**
 * Production-quality Paywall (spec §26/§48/§49): plan kartları,
 * aylık/yıllık geçişi, trial CTA, avantajlar, mevcut plan göstergesi,
 * loading/error/empty durumları, restore purchase, responsive/mobile-first.
 * Premium kullanıcıda aynı bileşen SubscriptionManagementCard'a devrediyor.
 */
export default function PaywallSection() {
  const { user } = useAuth();
  const entitlement = useEntitlement();
  const utils = trpc.useUtils();
  const plansQuery = trpc.subscription.getPlans.useQuery();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [restoreToken, setRestoreToken] = useState("");
  const [showRestore, setShowRestore] = useState(false);

  const invalidateEntitlement = () => { utils.subscription.getCurrent.invalidate(); };

  const completeMockCheckout = trpc.payment.completeMockCheckout.useMutation({
    onSuccess: () => { toast.success("Ödeme alındı (sandbox); Premium erişimin açıldı."); invalidateEntitlement(); },
    onError: (error) => toast.error(error.message || "İşlem tamamlanamadı."),
  });
  const cancelMutation = trpc.subscription.cancel.useMutation({ onSuccess: () => { toast.success("Abonelik dönemin sonunda sona erecek şekilde iptal edildi."); invalidateEntitlement(); }, onError: (error) => toast.error(error.message) });
  const resumeMutation = trpc.subscription.resume.useMutation({ onSuccess: () => { toast.success("Aboneliğin devam ediyor."); invalidateEntitlement(); }, onError: (error) => toast.error(error.message) });
  const restoreMutation = trpc.subscription.restore.useMutation({ onSuccess: () => { toast.success("Satın alma geri yüklendi."); invalidateEntitlement(); setShowRestore(false); setRestoreToken(""); }, onError: (error) => toast.error(error.message) });

  if (!user) {
    return <Card className="soft-card p-8 text-center"><p className="text-[14px] text-ink-3">Premium'a göz atmak için önce giriş yapmalısın.</p></Card>;
  }

  if (plansQuery.isLoading || entitlement.isLoading) {
    return <Card className="soft-card p-8"><div className="mx-auto h-6 w-6 animate-spin text-brand"><Loader2 size={24} /></div></Card>;
  }

  if (plansQuery.isError) {
    return <Card className="soft-card p-8 text-center"><p className="text-[14px] text-danger">Planlar yüklenemedi. Sayfayı yenilemeyi dener misin?</p></Card>;
  }

  const plans = plansQuery.data ?? [];
  const monthly = plans.find((p) => p.code === "PREMIUM_MONTHLY");
  const yearly = plans.find((p) => p.code === "PREMIUM_YEARLY");
  const selectedPlan = billingPeriod === "monthly" ? monthly : yearly;
  const monthlyEquivalentOfYearly = yearly ? yearly.price / 12 : 0;

  // Premium'da: paywall değil, abonelik yönetimi.
  if (entitlement.isPremium) {
    return (
      <div className="space-y-5">
        <Card className="soft-card overflow-hidden border-success/20 bg-success-soft/50 p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success text-white"><CheckCircle2 size={18} /></div>
            <div>
              <div className="text-[12px] font-bold text-success">{entitlement.isTrial ? "Premium Deneme" : "Premium Aktif"}</div>
              <h2 className="mt-1 text-[21px] font-semibold text-ink font-display">{entitlement.planCode === "PREMIUM_YEARLY" ? "Premium (Yıllık)" : "Premium (Aylık)"}</h2>
              <p className="mt-1 text-[13px] leading-5 text-ink-2">
                {entitlement.isTrial && entitlement.trialEndsAt ? `Deneme süren ${new Date(entitlement.trialEndsAt).toLocaleDateString("tr-TR")} tarihinde bitiyor.` : entitlement.currentPeriodEnd ? `Sonraki yenileme: ${new Date(entitlement.currentPeriodEnd).toLocaleDateString("tr-TR")}` : ""}
                {entitlement.cancelAtPeriodEnd ? " · Dönem sonunda iptal edilecek." : ""}
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {entitlement.cancelAtPeriodEnd ? (
              <Button onClick={() => resumeMutation.mutate()} disabled={resumeMutation.isPending} className="h-10 rounded-xl bg-ink px-4 text-[13px] font-semibold text-white">{resumeMutation.isPending ? "İşleniyor..." : "Aboneliği sürdür"}</Button>
            ) : (
              <Button onClick={() => cancelMutation.mutate({ immediate: false })} disabled={cancelMutation.isPending} variant="outline" className="h-10 rounded-xl border-ink/10 px-4 text-[13px] font-semibold text-ink-3">{cancelMutation.isPending ? "İşleniyor..." : "Aboneliği iptal et (dönem sonunda)"}</Button>
            )}
          </div>
        </Card>
        <Card className="soft-card p-6"><div className="eyebrow">Neler dahil</div><div className="mt-3 space-y-2">{BENEFITS.map((benefit) => <div key={benefit} className="flex items-start gap-2 text-[13px] text-ink-2"><Check size={14} className="mt-0.5 shrink-0 text-success" /> {benefit}</div>)}</div></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="hero-pill mx-auto bg-brand-soft text-brand"><Sparkles size={13} /> Premium</div>
        <h1 className="mt-4 text-[30px] font-semibold text-ink sm:text-[32px] font-display">Sınava daha akıllı hazırlan.</h1>
        <p className="mx-auto mt-2 max-w-md text-[14px] leading-6 text-ink-3">10 gün ücretsiz dene, istediğin an iptal et. Kredi kartı bilgisi sandbox modunda gerekmez.</p>
      </div>

      <div className="mx-auto flex w-fit items-center gap-1 rounded-2xl bg-paper p-1">
        <button onClick={() => setBillingPeriod("monthly")} className={`rounded-xl px-4 py-2 text-[13px] font-semibold transition ${billingPeriod === "monthly" ? "bg-white text-ink shadow-sm" : "text-ink-3"}`}>Aylık</button>
        <button onClick={() => setBillingPeriod("yearly")} className={`rounded-xl px-4 py-2 text-[13px] font-semibold transition ${billingPeriod === "yearly" ? "bg-white text-ink shadow-sm" : "text-ink-3"}`}>
          Yıllık {yearly && monthly && yearly.price < monthly.price * 12 && <span className="ml-1 rounded-full bg-success-soft px-1.5 py-0.5 text-[11px] font-bold text-success">avantajlı</span>}
        </button>
      </div>

      <Card className="soft-card relative mx-auto max-w-md overflow-hidden border-brand/15 p-7">
        <div className="hero-pill bg-brand/10 text-brand">{selectedPlan?.name ?? "Premium"}</div>
        {selectedPlan ? (
          <>
            <div className="mt-5 flex items-baseline gap-1.5">
              <span className="text-[41px] font-semibold text-ink font-display">{formatPrice(selectedPlan.price, selectedPlan.currency)}</span>
              <span className="text-[13px] text-ink-4">/ {billingPeriod === "monthly" ? "ay" : "yıl"}</span>
            </div>
            {billingPeriod === "yearly" && <p className="mt-1 text-[12px] text-ink-3">Aya böldüğünde {formatPrice(monthlyEquivalentOfYearly, selectedPlan.currency)}/ay</p>}
            {selectedPlan.trialDays > 0 && <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-warn-soft px-3 py-1.5 text-[12px] font-semibold text-warn"><Sparkles size={12} /> İlk {selectedPlan.trialDays} gün ücretsiz</div>}
          </>
        ) : <p className="mt-5 text-[13px] text-ink-4">Bu plan şu an yapılandırılmamış.</p>}

        <div className="mt-6 space-y-2.5">
          {BENEFITS.map((benefit) => <div key={benefit} className="flex items-start gap-2 text-[13px] leading-5 text-ink-2"><Check size={14} className="mt-0.5 shrink-0 text-brand" /> {benefit}</div>)}
        </div>

        <Button
          onClick={() => selectedPlan && completeMockCheckout.mutate({ planCode: selectedPlan.code })}
          disabled={!selectedPlan || completeMockCheckout.isPending}
          className="mt-7 h-11 w-full rounded-xl bg-brand text-[14px] font-semibold text-white hover:bg-brand"
        >
          {completeMockCheckout.isPending ? "İşleniyor..." : selectedPlan?.trialDays ? "Ücretsiz denemeyi başlat" : "Premium'a geç"}
        </Button>
        <p className="mt-3 text-center text-[12px] leading-4 text-ink-4">Devam ederek kullanım koşullarını kabul etmiş olursun. İstediğin an iptal edebilirsin, iptal dönem sonuna kadar erişimini etkilemez.</p>
      </Card>

      <div className="text-center">
        {!showRestore ? (
          <button onClick={() => setShowRestore(true)} className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-brand"><RotateCcw size={12} /> Satın almaları geri yükle</button>
        ) : (
          <div className="mx-auto flex max-w-sm flex-col gap-2 sm:flex-row">
            <input value={restoreToken} onChange={(event) => setRestoreToken(event.target.value)} placeholder="Satın alma jetonu / makbuz" className="form-input flex-1 text-[13px]" />
            <Button onClick={() => restoreToken.trim() && restoreMutation.mutate({ providerToken: restoreToken.trim() })} disabled={restoreMutation.isPending} variant="outline" className="h-10 shrink-0 rounded-xl border-brand/20 text-[13px] text-brand">{restoreMutation.isPending ? "Kontrol ediliyor..." : "Geri yükle"}</Button>
          </div>
        )}
      </div>
    </div>
  );
}
