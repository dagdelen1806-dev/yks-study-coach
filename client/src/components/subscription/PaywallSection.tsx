import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, CheckCircle2, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useEntitlement } from "@/hooks/useEntitlement";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PAID_TIERS, TIER_LABELS, type PaidTier } from "@shared/entitlements";
import { nextExamEnd, yksTermPrice } from "@shared/yksCalendar";
import { EXAM_TRACK_DEFS, EXAM_TRACK_LABELS, type ExamTrack } from "@shared/exams";
import { ADDON_DISCOUNT, BUNDLE_DISCOUNT, planCodeFor } from "@shared/checkoutQuote";
import PlanComparison, { tierHighlights } from "./PlanComparison";

const formatPrice = (minorUnits: number, currency: string) => `${(minorUnits / 100).toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${currency === "TRY" ? "₺" : currency}`;
const formatDate = (value: Date | string) => new Date(value).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;
const percent = (rate: number) => `%${Math.round(rate * 100)}`;

const TIER_TAGLINES: Record<PaidTier, string> = {
  basic: "Düzenli takip ve ara sıra yapay zekâ desteği.",
  premium: "Her gün yapay zekâyla çalışanlar için.",
  premium_plus: "Yoğun soru çözümü ve sınırları zorlayanlar için.",
};

/**
 * Paywall (spec §26/§48/§49): üç kademe (Temel / Premium / Pro), aylık/yıllık, trial, kotalar,
 * restore purchase. Her sınavın aboneliği ayrıdır (Ekim 2026): üstte adayın sınav abonelikleri
 * (sınav başına iptal/sürdür), altta aboneliği olmayan sınavlar için sepet. Aynı ödemede 2+ sınav
 * paket indirimi, KPSS aboneliği varken branş (MEB-AGS, A grubu) branş indirimi alır; tutar
 * sunucudan (`subscription.quote`) gelir, tahsilatla aynı hesap (shared/checkoutQuote.ts).
 */
export default function PaywallSection() {
  const { user } = useAuth();
  const entitlement = useEntitlement();
  const utils = trpc.useUtils();
  const plansQuery = trpc.subscription.getPlans.useQuery();
  const mineQuery = trpc.subscription.mine.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const enrolled = trpc.onboarding.tracks.useQuery(undefined, { enabled: Boolean(user), retry: false }).data ?? [];
  const profile = trpc.onboarding.get.useQuery(undefined, { enabled: Boolean(user), retry: false }).data;
  const activeTrack: ExamTrack = profile?.examTrack ?? "YKS";
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [tier, setTier] = useState<PaidTier>("premium");
  const [cart, setCart] = useState<ExamTrack[] | null>(null);
  const [restoreToken, setRestoreToken] = useState("");
  const [showRestore, setShowRestore] = useState(false);

  const subscriptions = mineQuery.data ?? [];
  const paid = subscriptions.filter((row) => row.isPremium);
  const paidTracks = paid.map((row) => row.track);
  // Satın alınabilecek sınavlar: adayın eklediği ve henüz aboneliği olmayanlar (aktif sınav başta).
  const buyable = useMemo(() => {
    const tracks = enrolled.length ? enrolled.map((row) => row.track) : [activeTrack];
    return tracks.filter((track) => !paidTracks.includes(track));
  }, [enrolled, activeTrack, paidTracks.join(",")]);
  const selected = (cart ?? buyable.slice(0, 1)).filter((track) => buyable.includes(track));
  useEffect(() => { if (cart && !cart.some((track) => buyable.includes(track))) setCart(null); }, [buyable.join(",")]);

  const items = selected.map((track) => ({ track, tier, period: billingPeriod }));
  const quoteQuery = trpc.subscription.quote.useQuery({ items }, { enabled: Boolean(user) && items.length > 0, retry: false });

  const invalidate = () => { utils.subscription.getCurrent.invalidate(); utils.subscription.mine.invalidate(); utils.subscription.quote.invalidate(); };
  const completeMockCheckout = trpc.payment.completeMockCheckout.useMutation({
    onSuccess: () => { toast.success("Ödeme alındı (sandbox); aboneliğin açıldı."); setCart(null); invalidate(); },
    onError: (error) => toast.error(error.message || "İşlem tamamlanamadı."),
  });
  const cancelMutation = trpc.subscription.cancel.useMutation({ onSuccess: () => { toast.success("Abonelik dönemin sonunda sona erecek şekilde iptal edildi."); invalidate(); }, onError: (error) => toast.error(error.message) });
  const resumeMutation = trpc.subscription.resume.useMutation({ onSuccess: () => { toast.success("Aboneliğin devam ediyor."); invalidate(); }, onError: (error) => toast.error(error.message) });
  const restoreMutation = trpc.subscription.restore.useMutation({ onSuccess: () => { toast.success("Satın alma geri yüklendi."); invalidate(); setShowRestore(false); setRestoreToken(""); }, onError: (error) => toast.error(error.message) });

  if (plansQuery.isLoading || entitlement.isLoading || mineQuery.isLoading) {
    return <Card className="soft-card p-8"><div className="mx-auto h-6 w-6 animate-spin text-brand"><Loader2 size={24} /></div></Card>;
  }
  if (plansQuery.isError) {
    return <Card className="soft-card p-8 text-center"><p className="text-[14px] text-danger">Planlar yüklenemedi. Sayfayı yenilemeyi dener misin?</p></Card>;
  }

  const plans = plansQuery.data ?? [];
  const planByCode = (code: string) => plans.find((plan) => plan.code === code);
  // Kartlardaki fiyat sepetteki ilk sınavın planından (sınav seçilmemişse aktif sınav).
  const cardTrack = selected[0] ?? buyable[0] ?? activeTrack;
  const examYear = enrolled.find((row) => row.track === cardTrack)?.examYear ?? (cardTrack === activeTrack ? profile?.examYear ?? null : null);
  const planFor = (cardTier: PaidTier, period: "monthly" | "yearly") => planByCode(planCodeFor(cardTrack, cardTier, period));
  const now = new Date();
  const exam = nextExamEnd(now, examYear, cardTrack);
  const examAuthority = EXAM_TRACK_DEFS[cardTrack].authority.name;
  const yearlyQuote = (cardTier: PaidTier) => {
    const monthly = planFor(cardTier, "monthly");
    return planFor(cardTier, "yearly") && monthly ? yksTermPrice({ monthlyPrice: monthly.price, now, examYear, track: cardTrack }) : null;
  };
  const monthsToExam = yearlyQuote("basic")?.months ?? Math.max(1, Math.ceil((exam.endsAt.getTime() - now.getTime()) / MONTH_MS));
  const toggle = (track: ExamTrack) => setCart(selected.includes(track) ? selected.filter((item) => item !== track) : [...selected, track]);
  // Branş indirimi hatırlatması: KPSS aboneliği olan aday branş sınavını henüz eklememiş olabilir.
  const addonHint = EXAM_TRACKS_WITH_PARENT.filter((track) => paidTracks.includes(EXAM_TRACK_DEFS[track].addonOf!) && !paidTracks.includes(track));
  const quote = quoteQuery.data;

  return (
    <div className="space-y-6">
      {paid.length > 0 && (
        <Card className="soft-card overflow-hidden border-success/20 bg-success-soft/50 p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success text-white"><CheckCircle2 size={18} /></div>
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-bold text-success">Aboneliklerin</div>
              <p className="mt-1 text-[13px] leading-5 text-ink-2">Her sınavın aboneliği ve yapay zekâ kotası ayrıdır.</p>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {paid.map((row) => {
              const plan = planByCode(row.planCode);
              const yearly = plan?.billingPeriod === "yearly";
              const pending = (cancelMutation.isPending && cancelMutation.variables?.track === row.track) || (resumeMutation.isPending && resumeMutation.variables?.track === row.track);
              return (
                <div key={row.track} className="flex flex-col gap-3 rounded-2xl bg-white/80 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-semibold text-ink">{EXAM_TRACK_LABELS[row.track]} · {TIER_LABELS[row.tier]}{row.isTrial ? " (deneme)" : ""}</div>
                    <p className="mt-0.5 text-[12.5px] leading-5 text-ink-3">
                      {row.isTrial && row.trialEndsAt
                        ? `Deneme süren ${formatDate(row.trialEndsAt)} tarihinde bitiyor.`
                        : row.currentPeriodEnd ? (yearly ? `${EXAM_TRACK_LABELS[row.track]} dönemi aboneliğin ${formatDate(row.currentPeriodEnd)} tarihinde sona erer.` : `Sonraki yenileme: ${formatDate(row.currentPeriodEnd)}`) : ""}
                      {row.cancelAtPeriodEnd ? " · Dönem sonunda iptal edilecek." : ""}
                    </p>
                  </div>
                  {row.cancelAtPeriodEnd ? (
                    <Button onClick={() => resumeMutation.mutate({ track: row.track })} disabled={pending} className="h-9 shrink-0 rounded-xl bg-brand px-3 text-[12.5px] font-semibold text-white hover:bg-brand-strong">{pending ? "İşleniyor..." : "Sürdür"}</Button>
                  ) : (
                    <Button onClick={() => cancelMutation.mutate({ immediate: false, track: row.track })} disabled={pending} variant="outline" className="h-9 shrink-0 rounded-xl border-ink/10 px-3 text-[12.5px] font-semibold text-ink-3">{pending ? "İşleniyor..." : "İptal et (dönem sonunda)"}</Button>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {buyable.length > 0 && (
        <>
          <div className="text-center">
            <div className="hero-pill mx-auto bg-brand-soft text-brand"><Sparkles size={13} /> Planlar</div>
            <h1 className="mt-4 text-[30px] font-semibold text-ink sm:text-[32px] font-display">{paid.length ? "Diğer sınavların için de abone ol." : "Sınava daha akıllı hazırlan."}</h1>
            <p className="mx-auto mt-2 max-w-lg text-[14px] leading-6 text-ink-3">Tüm planlarda tüm özellikler açık; planlar yapay zekâ kotalarıyla ayrılır. Her sınavın aboneliği ayrı; birden fazla sınavı birlikte alana {percent(BUNDLE_DISCOUNT)} paket indirimi. Kredi kartı bilgisi sandbox modunda gerekmez.</p>
          </div>

          {buyable.length > 1 && (
            <div className="mx-auto max-w-xl">
              <div className="mb-2 text-center text-[12px] font-semibold text-ink-3">Hangi sınavlar için?</div>
              <div className="flex flex-wrap justify-center gap-2">
                {buyable.map((track) => (
                  <button key={track} type="button" onClick={() => toggle(track)} aria-pressed={selected.includes(track)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition ${selected.includes(track) ? "border-brand bg-brand text-white" : "border-ink/10 bg-white text-ink-2"}`}>
                    {selected.includes(track) && <Check size={13} />} {EXAM_TRACK_LABELS[track]}
                  </button>
                ))}
              </div>
            </div>
          )}
          {addonHint.length > 0 && (
            <p className="mx-auto max-w-xl rounded-2xl bg-success-soft px-4 py-2.5 text-center text-[12.5px] leading-5 text-success">
              KPSS aboneliğin var: {addonHint.map((track) => EXAM_TRACK_LABELS[track]).join(" ya da ")} aboneliğine {percent(ADDON_DISCOUNT)} branş indirimi uygulanır{addonHint.some((track) => !buyable.includes(track)) ? " (önce sınavı profilinden ekle)" : ""}.
            </p>
          )}

          <div className="mx-auto flex w-fit items-center gap-1 rounded-2xl bg-paper p-1">
            <button onClick={() => setBillingPeriod("monthly")} className={`rounded-xl px-4 py-2 text-[13px] font-semibold transition ${billingPeriod === "monthly" ? "bg-white text-ink shadow-sm" : "text-ink-3"}`}>Aylık</button>
            <button onClick={() => setBillingPeriod("yearly")} className={`rounded-xl px-4 py-2 text-[13px] font-semibold transition ${billingPeriod === "yearly" ? "bg-white text-ink shadow-sm" : "text-ink-3"}`}>
              Yıllık · sınava kadar <span className="ml-1 rounded-full bg-success-soft px-1.5 py-0.5 text-[11px] font-bold text-success">%20 indirim</span>
            </button>
          </div>
          {billingPeriod === "yearly" && (
            <p className="mx-auto max-w-xl text-center text-[12px] leading-5 text-ink-3">
              Yıllık plan her sınavın kendi tarihinde biter ({EXAM_TRACK_LABELS[cardTrack]} {exam.year}: {formatDate(exam.endsAt)}). Fiyatı, sınava kalan {monthsToExam} aylık dönemi aylık ödemenin %20 eksiğidir; sınav yaklaştıkça düşer.{exam.estimated ? ` Sınav tarihi henüz kesinleşmedi; ${examAuthority} açıklayınca güncellenir.` : ""}
            </p>
          )}

          <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-3">
            {PAID_TIERS.map((cardTier) => {
              const plan = planFor(cardTier, billingPeriod);
              const term = billingPeriod === "yearly" ? yearlyQuote(cardTier) : null;
              const displayPrice = term ? term.price : plan?.price ?? 0;
              const yearlySaves = term ? term.monthlyTotal - term.price : 0;
              const chosen = tier === cardTier;
              return (
                <Card key={cardTier} className={`soft-card flex flex-col p-6 ${chosen ? "border-brand ring-2 ring-brand/30" : cardTier === "premium" ? "border-brand/30" : ""}`}>
                  <div className="hero-pill w-fit bg-brand/10 text-brand">{TIER_LABELS[cardTier]}</div>
                  <p className="mt-2 text-[12px] leading-5 text-ink-3">{TIER_TAGLINES[cardTier]}</p>
                  {plan ? (
                    <>
                      <div className="mt-4 flex flex-wrap items-baseline gap-x-1.5">
                        <span className="whitespace-nowrap text-[34px] font-semibold text-ink font-display">{formatPrice(displayPrice, plan.currency)}</span>
                        {billingPeriod === "monthly" && <span className="text-[13px] text-ink-4">/ ay · sınav başına</span>}
                      </div>
                      {billingPeriod === "yearly" && <div className="text-[12px] text-ink-4">tek ödeme · {EXAM_TRACK_LABELS[cardTrack]} {exam.year} sonuna kadar</div>}
                      {term && yearlySaves > 0 && <p className="mt-1 text-[12px] leading-5 text-success">Sınava kadar aylık ödesen {formatPrice(term.monthlyTotal, plan.currency)}; yıllıkla {formatPrice(yearlySaves, plan.currency)} daha az ödersin.</p>}
                      {plan.trialDays > 0 && <div className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-warn-soft px-3 py-1.5 text-[12px] font-semibold text-warn"><Sparkles size={12} /> İlk {plan.trialDays} gün ücretsiz</div>}
                    </>
                  ) : <p className="mt-4 text-[13px] text-ink-4">Bu plan şu an yapılandırılmamış.</p>}
                  <div className="mt-5 flex-1 space-y-2">
                    {tierHighlights(cardTier).map((benefit) => <div key={benefit} className="flex items-start gap-2 text-[12.5px] leading-5 text-ink-2"><Check size={14} className="mt-0.5 shrink-0 text-brand" /> {benefit}</div>)}
                  </div>
                  <Button onClick={() => setTier(cardTier)} disabled={!plan} variant={chosen ? "default" : "outline"}
                    className={`mt-6 h-11 w-full rounded-xl text-[14px] font-semibold ${chosen ? "bg-brand text-white hover:bg-brand-strong" : "border-brand/20 text-brand"}`}>
                    {chosen ? <><Check size={15} /> Seçildi</> : "Bu planı seç"}
                  </Button>
                </Card>
              );
            })}
          </div>

          <Card className="soft-card mx-auto max-w-xl p-5">
            <div className="text-[13px] font-bold text-ink">Ödeme özeti</div>
            {!items.length ? (
              <p className="mt-2 text-[13px] text-ink-3">En az bir sınav seç.</p>
            ) : quoteQuery.isLoading ? (
              <div className="mt-3 h-5 w-5 animate-spin text-brand"><Loader2 size={20} /></div>
            ) : quoteQuery.isError || !quote ? (
              <p className="mt-2 text-[13px] text-danger">{quoteQuery.error?.message ?? "Tutar hesaplanamadı."}</p>
            ) : (
              <>
                <div className="mt-3 space-y-2">
                  {quote.lines.map((line) => (
                    <div key={line.track} className="flex items-start justify-between gap-3 text-[13px]">
                      <div className="min-w-0">
                        <div className="font-semibold text-ink">{EXAM_TRACK_LABELS[line.track]} · {TIER_LABELS[tier]} {billingPeriod === "yearly" ? `(sınava kadar, ${line.months} ay)` : "(aylık)"}</div>
                        {line.discountReason && <div className="text-[12px] text-success">{line.discountReason === "bundle" ? "Paket indirimi" : "Branş indirimi (KPSS aboneliğin var)"} {percent(line.discountRate)}</div>}
                      </div>
                      <div className="shrink-0 text-right">
                        {line.discountReason && <div className="text-[11.5px] text-ink-4 line-through">{formatPrice(line.basePrice, line.currency)}</div>}
                        <div className="font-semibold text-ink">{formatPrice(line.price, line.currency)}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-baseline justify-between border-t border-ink/10 pt-3">
                  <span className="text-[13px] font-semibold text-ink-2">Toplam{quote.discountTotal > 0 ? ` · ${formatPrice(quote.discountTotal, quote.currency)} indirim` : ""}</span>
                  <span className="text-[20px] font-semibold text-ink font-display">{formatPrice(quote.total, quote.currency)}</span>
                </div>
                {buyable.length === 1 && !paid.length && (
                  <p className="mt-2 text-[11.5px] leading-4 text-ink-4">Birden fazla sınava hazırlanıyorsan sınavlarını profilinden ekle; birlikte alınca {percent(BUNDLE_DISCOUNT)} paket indirimi uygulanır.</p>
                )}
              </>
            )}
            <Button
              onClick={() => completeMockCheckout.mutate({ items })}
              disabled={!items.length || !quote || completeMockCheckout.isPending}
              className="mt-4 h-11 w-full rounded-xl bg-brand text-[14px] font-semibold text-white hover:bg-brand-strong"
            >
              {completeMockCheckout.isPending ? "İşleniyor..." : planFor(tier, billingPeriod)?.trialDays ? "Ücretsiz denemeyi başlat" : "Ödemeyi tamamla"}
            </Button>
            <p className="mt-2 text-center text-[11.5px] leading-4 text-ink-4">Devam ederek kullanım koşullarını kabul etmiş olursun. İstediğin an iptal edebilirsin, iptal dönem sonuna kadar erişimini etkilemez.</p>
          </Card>
        </>
      )}

      <PlanComparison current={entitlement.isPremium ? entitlement.tier : "free"} />

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

/** Ana sınava bağlı branş sınavları (MEB-AGS, KPSS A grubu). */
const EXAM_TRACKS_WITH_PARENT = (Object.keys(EXAM_TRACK_DEFS) as ExamTrack[]).filter((track) => EXAM_TRACK_DEFS[track].addonOf);
