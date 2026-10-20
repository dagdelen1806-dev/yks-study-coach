import { useState } from "react";
import { toast } from "sonner";
import { Check, CheckCircle2, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useEntitlement } from "@/hooks/useEntitlement";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PAID_TIERS, TIER_LABELS, type PaidTier } from "@shared/entitlements";
import { nextYksEnd, yksTermPrice } from "@shared/yksCalendar";
import PlanComparison, { tierHighlights } from "./PlanComparison";

const formatPrice = (minorUnits: number, currency: string) => `${(minorUnits / 100).toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${currency === "TRY" ? "₺" : currency}`;
const formatDate = (value: Date | string) => new Date(value).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

const TIER_TAGLINES: Record<PaidTier, string> = {
  basic: "Düzenli takip ve ara sıra yapay zekâ desteği.",
  premium: "Her gün yapay zekâyla çalışanlar için.",
  premium_plus: "Yoğun soru çözümü ve sınırları zorlayanlar için.",
};

/**
 * Production-quality Paywall (spec §26/§48/§49): üç kademe (Temel / Premium / Pro),
 * aylık/yıllık geçişi, trial CTA, kotalar, mevcut plan göstergesi,
 * loading/error/empty durumları, restore purchase, responsive/mobile-first.
 * Yıllık plan bir sonraki YKS'nin sonuna kadar sürer: bitiş tarihi ve aylıkla
 * karşılaştırması her kartta açıkça yazılır (geç alınan yıllık aylıktan pahalıya gelebilir).
 */
export default function PaywallSection() {
  const { user } = useAuth();
  const entitlement = useEntitlement();
  const utils = trpc.useUtils();
  const plansQuery = trpc.subscription.getPlans.useQuery();
  // Yıllık plan öğrencinin başlangıç anketinde seçtiği sınav yılına kadar sürer (shared/yksCalendar.ts).
  const examYear = trpc.onboarding.get.useQuery(undefined, { enabled: Boolean(user), retry: false }).data?.examYear ?? null;
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [restoreToken, setRestoreToken] = useState("");
  const [showRestore, setShowRestore] = useState(false);

  const invalidateEntitlement = () => { utils.subscription.getCurrent.invalidate(); };

  const completeMockCheckout = trpc.payment.completeMockCheckout.useMutation({
    onSuccess: () => { toast.success("Ödeme alındı (sandbox); planın açıldı."); invalidateEntitlement(); },
    onError: (error) => toast.error(error.message || "İşlem tamamlanamadı."),
  });
  const cancelMutation = trpc.subscription.cancel.useMutation({ onSuccess: () => { toast.success("Abonelik dönemin sonunda sona erecek şekilde iptal edildi."); invalidateEntitlement(); }, onError: (error) => toast.error(error.message) });
  const resumeMutation = trpc.subscription.resume.useMutation({ onSuccess: () => { toast.success("Aboneliğin devam ediyor."); invalidateEntitlement(); }, onError: (error) => toast.error(error.message) });
  const restoreMutation = trpc.subscription.restore.useMutation({ onSuccess: () => { toast.success("Satın alma geri yüklendi."); invalidateEntitlement(); setShowRestore(false); setRestoreToken(""); }, onError: (error) => toast.error(error.message) });

  if (plansQuery.isLoading || entitlement.isLoading) {
    return <Card className="soft-card p-8"><div className="mx-auto h-6 w-6 animate-spin text-brand"><Loader2 size={24} /></div></Card>;
  }

  if (plansQuery.isError) {
    return <Card className="soft-card p-8 text-center"><p className="text-[14px] text-danger">Planlar yüklenemedi. Sayfayı yenilemeyi dener misin?</p></Card>;
  }

  const plans = plansQuery.data ?? [];
  const planFor = (tier: PaidTier, period: "monthly" | "yearly") => plans.find((plan) => plan.tier === tier && plan.billingPeriod === period);
  const now = new Date();
  const yks = nextYksEnd(now, examYear);
  const currentPlan = plans.find((plan) => plan.code === entitlement.planCode);
  // Yıllık ("YKS'ye kadar") fiyat sınava kalan süreye göre: tahsilatla aynı hesap (shared/yksCalendar.ts).
  const yearlyQuote = (tier: PaidTier) => {
    const yearly = planFor(tier, "yearly");
    const monthly = planFor(tier, "monthly");
    return yearly && monthly ? yksTermPrice({ monthlyPrice: monthly.price, now, examYear }) : null;
  };
  const monthsToYks = yearlyQuote("basic")?.months ?? Math.max(1, Math.ceil((yks.endsAt.getTime() - now.getTime()) / MONTH_MS));

  // Abonelikte: paywall değil, abonelik yönetimi.
  if (entitlement.isPremium) {
    const yearly = currentPlan?.billingPeriod === "yearly";
    return (
      <div className="space-y-5">
        <Card className="soft-card overflow-hidden border-success/20 bg-success-soft/50 p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success text-white"><CheckCircle2 size={18} /></div>
            <div>
              <div className="text-[12px] font-bold text-success">{entitlement.isTrial ? "Deneme sürüyor" : "Abonelik aktif"}</div>
              <h2 className="mt-1 text-[21px] font-semibold text-ink font-display">{currentPlan?.name ?? TIER_LABELS[entitlement.tier]}</h2>
              <p className="mt-1 text-[13px] leading-5 text-ink-2">
                {entitlement.isTrial && entitlement.trialEndsAt
                  ? `Deneme süren ${formatDate(entitlement.trialEndsAt)} tarihinde bitiyor.`
                  : entitlement.currentPeriodEnd ? (yearly ? `YKS dönemi aboneliğin ${formatDate(entitlement.currentPeriodEnd)} tarihinde sona erer.` : `Sonraki yenileme: ${formatDate(entitlement.currentPeriodEnd)}`) : ""}
                {entitlement.cancelAtPeriodEnd ? " · Dönem sonunda iptal edilecek." : ""}
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {entitlement.cancelAtPeriodEnd ? (
              <Button onClick={() => resumeMutation.mutate()} disabled={resumeMutation.isPending} className="h-10 rounded-xl bg-brand hover:bg-brand-strong px-4 text-[13px] font-semibold text-white">{resumeMutation.isPending ? "İşleniyor..." : "Aboneliği sürdür"}</Button>
            ) : (
              <Button onClick={() => cancelMutation.mutate({ immediate: false })} disabled={cancelMutation.isPending} variant="outline" className="h-10 rounded-xl border-ink/10 px-4 text-[13px] font-semibold text-ink-3">{cancelMutation.isPending ? "İşleniyor..." : "Aboneliği iptal et (dönem sonunda)"}</Button>
            )}
          </div>
        </Card>
        <PlanComparison current={entitlement.tier} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="hero-pill mx-auto bg-brand-soft text-brand"><Sparkles size={13} /> Planlar</div>
        <h1 className="mt-4 text-[30px] font-semibold text-ink sm:text-[32px] font-display">Sınava daha akıllı hazırlan.</h1>
        <p className="mx-auto mt-2 max-w-lg text-[14px] leading-6 text-ink-3">Tüm planlarda tüm özellikler açık; planlar yapay zekâ kotalarıyla ayrılır. Her plan 10 gün ücretsiz, istediğin an iptal et. Kredi kartı bilgisi sandbox modunda gerekmez.</p>
      </div>

      <div className="mx-auto flex w-fit items-center gap-1 rounded-2xl bg-paper p-1">
        <button onClick={() => setBillingPeriod("monthly")} className={`rounded-xl px-4 py-2 text-[13px] font-semibold transition ${billingPeriod === "monthly" ? "bg-white text-ink shadow-sm" : "text-ink-3"}`}>Aylık</button>
        <button onClick={() => setBillingPeriod("yearly")} className={`rounded-xl px-4 py-2 text-[13px] font-semibold transition ${billingPeriod === "yearly" ? "bg-white text-ink shadow-sm" : "text-ink-3"}`}>
          Yıllık · YKS'ye kadar <span className="ml-1 rounded-full bg-success-soft px-1.5 py-0.5 text-[11px] font-bold text-success">%20 indirim</span>
        </button>
      </div>
      {billingPeriod === "yearly" && (
        <p className="mx-auto max-w-xl text-center text-[12px] leading-5 text-ink-3">
          {examYear && yks.year === examYear ? `Hedef sınavın: YKS ${examYear}. ` : ""}Yıllık plan YKS {yks.year} sınavının bittiği gün ({formatDate(yks.endsAt)}) sona erer. Fiyatı, sınavına kalan {monthsToYks} aylık dönemi aylık ödemenin %20 eksiğidir; sınav yaklaştıkça düşer.{yks.estimated ? " Sınav tarihi henüz kesinleşmedi; ÖSYM açıklayınca güncellenir." : ""}
        </p>
      )}

      <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-3">
        {PAID_TIERS.map((tier) => {
          const plan = planFor(tier, billingPeriod);
          const quote = billingPeriod === "yearly" ? yearlyQuote(tier) : null;
          // Ekranda görünen fiyat = tahsil edilecek tutar (yıllıkta sınava kalan süreye göre).
          const displayPrice = quote ? quote.price : plan?.price ?? 0;
          const yearlySaves = quote ? quote.monthlyTotal - quote.price : 0;
          return (
            <Card key={tier} className={`soft-card flex flex-col p-6 ${tier === "premium" ? "border-brand/30" : ""}`}>
              <div className="hero-pill w-fit bg-brand/10 text-brand">{TIER_LABELS[tier]}</div>
              <p className="mt-2 text-[12px] leading-5 text-ink-3">{TIER_TAGLINES[tier]}</p>
              {plan ? (
                <>
                  <div className="mt-4 flex flex-wrap items-baseline gap-x-1.5">
                    <span className="whitespace-nowrap text-[34px] font-semibold text-ink font-display">{formatPrice(displayPrice, plan.currency)}</span>
                    {billingPeriod === "monthly" && <span className="text-[13px] text-ink-4">/ ay</span>}
                  </div>
                  {billingPeriod === "yearly" && <div className="text-[12px] text-ink-4">tek ödeme · YKS {yks.year} sonuna kadar</div>}
                  {quote && yearlySaves > 0 && <p className="mt-1 text-[12px] leading-5 text-success">Sınava kadar aylık ödesen {formatPrice(quote.monthlyTotal, plan.currency)}; yıllıkla {formatPrice(yearlySaves, plan.currency)} daha az ödersin.</p>}
                  {plan.trialDays > 0 && <div className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-warn-soft px-3 py-1.5 text-[12px] font-semibold text-warn"><Sparkles size={12} /> İlk {plan.trialDays} gün ücretsiz</div>}
                </>
              ) : <p className="mt-4 text-[13px] text-ink-4">Bu plan şu an yapılandırılmamış.</p>}

              <div className="mt-5 flex-1 space-y-2">
                {tierHighlights(tier).map((benefit) => <div key={benefit} className="flex items-start gap-2 text-[12.5px] leading-5 text-ink-2"><Check size={14} className="mt-0.5 shrink-0 text-brand" /> {benefit}</div>)}
              </div>

              <Button
                onClick={() => plan && completeMockCheckout.mutate({ planCode: plan.code })}
                disabled={!plan || completeMockCheckout.isPending}
                className="mt-6 h-11 w-full rounded-xl bg-brand text-[14px] font-semibold text-white hover:bg-brand-strong"
              >
                {completeMockCheckout.isPending && completeMockCheckout.variables?.planCode === plan?.code ? "İşleniyor..." : plan?.trialDays ? "Ücretsiz denemeyi başlat" : "Planı seç"}
              </Button>
            </Card>
          );
        })}
      </div>
      <p className="mx-auto max-w-xl text-center text-[12px] leading-4 text-ink-4">Devam ederek kullanım koşullarını kabul etmiş olursun. İstediğin an iptal edebilirsin, iptal dönem sonuna kadar erişimini etkilemez.</p>

      <PlanComparison current="free" />

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
