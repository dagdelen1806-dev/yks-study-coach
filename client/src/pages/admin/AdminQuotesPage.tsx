import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Copy, FileText, Loader2, Plus, Printer, Trash2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ORG_PLANS, ORG_PLAN_DEFAULT_CREDITS, ORG_PLAN_LABELS, type OrgPlan } from "@shared/org";
import { EMPTY_COMPANY, formatIban } from "@shared/platformCompany";
import { QUOTE_STATUS_LABELS, computeQuoteTotals, formatTry, quoteNumber, type QuoteLine, type QuoteStatus } from "@shared/orgQuote";

export const quotePath = (id: number | "yeni") => `/yonetim/teklif/${id}`;
const STATUS_TONES: Record<QuoteStatus, string> = { draft: "bg-paper text-ink-3", sent: "bg-brand-soft text-brand", accepted: "bg-success-soft text-success", rejected: "bg-danger-soft text-danger" };
const isoDay = (value: Date | string | null | undefined) => (value ? new Date(value).toLocaleDateString("sv-SE") : "");
const trDay = (value: Date | string | null | undefined) => (value ? new Date(value).toLocaleDateString("tr-TR") : "—");

/** Yönetim Paneli → Teklifler: kurumsal abonelik teklifleri listesi. */
export default function AdminQuotesPage() {
  const quotes = trpc.admin.quotes.list.useQuery();
  const [, setLocation] = useLocation();
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={() => setLocation(quotePath("yeni"))}><Plus size={15} /> Yeni teklif</Button></div>
      <Card className="overflow-x-auto p-0">
        {quotes.isLoading ? <div className="p-6 text-center"><Loader2 className="mx-auto animate-spin text-ink-4" /></div> : !quotes.data?.length ? <p className="p-6 text-center text-[13px] text-ink-3">Henüz teklif yok. Bir kuruma ya da aday kuruma "Yeni teklif" ile başla.</p> : (
          <table className="w-full min-w-[760px] text-left text-[13px]">
            <thead className="border-b border-rule text-[11px] uppercase tracking-wide text-ink-4"><tr><th className="px-4 py-3">No</th><th className="px-4 py-3">Kurum</th><th className="px-4 py-3">Paket</th><th className="px-4 py-3 text-right">Toplam (KDV dahil)</th><th className="px-4 py-3">Geçerlilik</th><th className="px-4 py-3">Durum</th></tr></thead>
            <tbody>
              {quotes.data.map((row) => (
                <tr key={row.id} className="border-b border-rule last:border-0">
                  <td className="px-4 py-3"><Link href={quotePath(row.id)} className="font-mono font-semibold text-brand hover:underline">{quoteNumber(row.id, row.createdAt)}</Link></td>
                  <td className="px-4 py-3"><p className="font-semibold text-ink">{row.orgName ?? row.customerName}</p>{!row.orgId && <p className="text-[11px] text-ink-4">aday · kurum açılmadı</p>}</td>
                  <td className="px-4 py-3">{ORG_PLAN_LABELS[row.plan]} · {row.months} ay</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatTry(row.totalTry)}</td>
                  <td className="px-4 py-3 text-ink-3">{trDay(row.validUntil)}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS_TONES[row.status]}`}>{QUOTE_STATUS_LABELS[row.status]}{row.appliedAt ? " · uygulandı" : ""}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

type Form = {
  orgId: number | null; customerName: string; contactName: string; contactEmail: string; plan: OrgPlan; months: string; studentCount: string;
  lines: Array<{ description: string; quantity: string; unitPriceTry: string }>; discountPercent: string; vatRate: string; validUntil: string; note: string;
};
const emptyForm = (orgId: number | null): Form => ({
  orgId, customerName: "", contactName: "", contactEmail: "", plan: "standard", months: "12", studentCount: "",
  lines: [], discountPercent: "0", vatRate: "20", validUntil: isoDay(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)), note: "",
});
const int = (value: string) => Math.max(0, Math.round(Number(value) || 0));
const toLines = (form: Form): QuoteLine[] => form.lines.filter((line) => line.description.trim()).map((line) => ({ description: line.description.trim(), quantity: Math.max(1, int(line.quantity)), unitPriceTry: int(line.unitPriceTry) }));

/** Teklif düzenleyici (/yonetim/teklif/:id, yeni için /yonetim/teklif/yeni?kurum=ID). */
export function AdminQuoteEditor({ quoteId }: { quoteId: number | null }) {
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const quote = trpc.admin.quotes.get.useQuery({ id: quoteId ?? 0 }, { enabled: quoteId !== null, retry: false });
  const orgs = trpc.admin.orgs.list.useQuery();
  const prices = trpc.admin.orgs.planPrices.useQuery();
  const [form, setForm] = useState<Form>(() => {
    const orgParam = Number(new URLSearchParams(window.location.search).get("kurum")) || null;
    try {
      const copied = sessionStorage.getItem("quote-copy");
      if (copied && quoteId === null) { sessionStorage.removeItem("quote-copy"); return JSON.parse(copied) as Form; }
    } catch { /* yoksay */ }
    return emptyForm(orgParam);
  });
  useEffect(() => {
    if (!quote.data) return;
    const data = quote.data;
    setForm({ orgId: data.orgId, customerName: data.customerName, contactName: data.contactName ?? "", contactEmail: data.contactEmail ?? "", plan: data.plan, months: String(data.months), studentCount: data.studentCount ? String(data.studentCount) : "", lines: data.lines.map((line) => ({ description: line.description, quantity: String(line.quantity), unitPriceTry: String(line.unitPriceTry) })), discountPercent: String(data.discountPercent), vatRate: String(data.vatRate), validUntil: isoDay(data.validUntil), note: data.note ?? "" });
  }, [quote.data]);
  // Yeni teklifin "Not ve koşullar" alanına Ayarlar'daki standart koşullar gelir.
  const company = trpc.admin.settings.company.useQuery();
  useEffect(() => {
    if (quoteId !== null || !company.data?.quoteTerms) return;
    const terms = company.data.quoteTerms;
    setForm((current) => (current.note ? current : { ...current, note: terms }));
  }, [quoteId, company.data]);
  // Kurumdan gelinince müşteri adı kurumun adıyla dolar.
  useEffect(() => {
    if (!form.orgId || form.customerName || !orgs.data) return;
    const org = orgs.data.find((item) => item.id === form.orgId);
    if (org) setForm((current) => ({ ...current, customerName: org.name, plan: org.plan === "trial" ? "standard" : org.plan, studentCount: current.studentCount || (org.students ? String(org.students) : "") }));
  }, [form.orgId, form.customerName, orgs.data]);

  const totals = useMemo(() => computeQuoteTotals(toLines(form), int(form.discountPercent), int(form.vatRate)), [form]);
  const locked = quote.data?.status === "accepted" || quote.data?.status === "rejected";
  const refresh = () => { utils.admin.quotes.list.invalidate(); if (quoteId) utils.admin.quotes.get.invalidate({ id: quoteId }); };
  const onError = (error: { message: string }) => toast.error(error.message);
  const save = trpc.admin.quotes.save.useMutation({ onSuccess: (result) => { toast.success("Teklif kaydedildi."); refresh(); if (!quoteId) setLocation(quotePath(result.id), { replace: true }); }, onError });
  const setStatus = trpc.admin.quotes.setStatus.useMutation({ onSuccess: () => { toast.success("Durum güncellendi."); refresh(); }, onError });
  const apply = trpc.admin.quotes.applyToOrg.useMutation({ onSuccess: () => { toast.success("Teklif kuruma uygulandı: paket, süre ve kredi güncellendi."); refresh(); utils.admin.orgs.list.invalidate(); }, onError });
  const remove = trpc.admin.quotes.delete.useMutation({ onSuccess: () => { toast.success("Taslak silindi."); utils.admin.quotes.list.invalidate(); setLocation("/yonetim/teklifler"); }, onError });

  const update = (patch: Partial<Form>) => setForm((current) => ({ ...current, ...patch }));
  const updateLine = (index: number, patch: Partial<Form["lines"][number]>) => update({ lines: form.lines.map((line, i) => (i === index ? { ...line, ...patch } : line)) });
  /** Liste fiyatından kalem: süre 12'nin katıysa yıllık fiyat, değilse aylık fiyat; fiyat yoksa elle girilir. */
  const addPlanLine = () => {
    const price = prices.data?.find((row) => row.plan === form.plan);
    const months = Math.max(1, int(form.months));
    const label = `${ORG_PLAN_LABELS[form.plan]} kurum paketi`;
    if (price?.yearlyPriceTry != null && months % 12 === 0) update({ lines: [...form.lines, { description: `${label} — yıllık`, quantity: String(months / 12), unitPriceTry: String(price.yearlyPriceTry) }] });
    else if (price?.monthlyPriceTry != null) update({ lines: [...form.lines, { description: `${label} — aylık`, quantity: String(months), unitPriceTry: String(price.monthlyPriceTry) }] });
    else { update({ lines: [...form.lines, { description: `${label} — ${months} ay`, quantity: "1", unitPriceTry: "" }] }); toast("Bu paketin liste fiyatı yok; birim fiyatı elle gir (Paketler ve fiyatlar'dan da tanımlayabilirsin)."); }
  };
  const submit = () => {
    const lines = toLines(form);
    if (form.customerName.trim().length < 2) { toast.error("Kurum / müşteri adını yaz."); return; }
    if (!lines.length) { toast.error("En az bir kalem ekle."); return; }
    save.mutate({ id: quoteId ?? undefined, orgId: form.orgId, customerName: form.customerName.trim(), contactName: form.contactName.trim() || null, contactEmail: form.contactEmail.trim() || null, plan: form.plan, months: Math.min(60, Math.max(1, int(form.months))), studentCount: int(form.studentCount) || null, lines, discountPercent: Math.min(100, int(form.discountPercent)), vatRate: Math.min(30, int(form.vatRate)), validUntil: form.validUntil || null, note: form.note.trim() || null });
  };
  const copyAsNew = () => {
    try { sessionStorage.setItem("quote-copy", JSON.stringify({ ...form, validUntil: emptyForm(null).validUntil })); } catch { /* yoksay */ }
    setLocation(quotePath("yeni"));
  };

  if (quoteId !== null && quote.isLoading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-brand" /></div>;
  if (quoteId !== null && !quote.data) return <Card className="p-6 text-center text-[13px] text-danger">{quote.error?.message ?? "Teklif bulunamadı."} <Link href="/yonetim/teklifler" className="font-semibold underline">Tekliflere dön</Link></Card>;
  const data = quote.data;

  return (
    <div className="space-y-5">
      <div>
        <Link href="/yonetim/teklifler" className="inline-flex items-center gap-1 text-[13px] font-semibold text-ink-3 hover:text-ink"><ArrowLeft size={14} /> Teklifler</Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="page-heading">{data ? `Teklif ${quoteNumber(data.id, data.createdAt)}` : "Yeni teklif"}</h1>
          {data && <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS_TONES[data.status]}`}>{QUOTE_STATUS_LABELS[data.status]}{data.appliedAt ? ` · ${trDay(data.appliedAt)} kuruma uygulandı` : ""}</span>}
        </div>
        <p className="page-subtitle">Kalemler KDV hariç girilir; indirim ara toplama, KDV indirimli tutara uygulanır.{locked ? " Sonuçlanmış teklif değiştirilemez; kopyalayıp yenisini hazırlayabilirsin." : ""}</p>
      </div>

      {data && (
        <Card className="flex flex-wrap items-center gap-2 p-4">
          <Button variant="outline" size="sm" onClick={() => window.open(`${quotePath(data.id)}/yazdir`, "_blank")}><Printer size={14} /> Yazdır / PDF</Button>
          <Button variant="outline" size="sm" onClick={copyAsNew}><Copy size={14} /> Kopyala</Button>
          {!data.appliedAt && data.status !== "sent" && !locked && <Button variant="outline" size="sm" disabled={setStatus.isPending} onClick={() => setStatus.mutate({ id: data.id, status: "sent" })}>Gönderildi olarak işaretle</Button>}
          {!data.appliedAt && data.status !== "accepted" && <Button variant="outline" size="sm" disabled={setStatus.isPending} onClick={() => setStatus.mutate({ id: data.id, status: "accepted" })}>Kabul edildi</Button>}
          {!data.appliedAt && data.status !== "rejected" && <Button variant="outline" size="sm" disabled={setStatus.isPending} onClick={() => setStatus.mutate({ id: data.id, status: "rejected" })}>Reddedildi</Button>}
          {!data.appliedAt && locked && <Button variant="outline" size="sm" disabled={setStatus.isPending} onClick={() => setStatus.mutate({ id: data.id, status: "draft" })}>Taslağa geri al</Button>}
          {data.status === "accepted" && !data.appliedAt && (data.orgId
            ? <Button size="sm" disabled={apply.isPending} onClick={() => { if (window.confirm(`${data.orgName ?? data.customerName}: ${ORG_PLAN_LABELS[data.plan]} paketi, ${data.months} ay ve en az ${ORG_PLAN_DEFAULT_CREDITS[data.plan].toLocaleString("tr-TR")} aylık AI kredisi uygulansın mı?`)) apply.mutate({ id: data.id }); }}>Kuruma uygula</Button>
            : <span className="text-[12px] text-ink-3">Kurum açılmadı: Kurumlar'dan oluştur, teklifi kopyalayıp kuruma bağla.</span>)}
          {data.status === "draft" && <button disabled={remove.isPending} onClick={() => { if (window.confirm("Taslak silinsin mi?")) remove.mutate({ id: data.id }); }} className="ml-auto inline-flex items-center gap-1 text-[12px] font-semibold text-danger"><Trash2 size={13} /> Sil</button>}
        </Card>
      )}

      <fieldset disabled={locked} className="space-y-5">
        <Card className="p-5">
          <h2 className="text-[15px] font-bold text-ink">Müşteri</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-[12px] font-semibold text-ink-2">Kurum
              <select value={form.orgId ?? ""} onChange={(event) => update({ orgId: Number(event.target.value) || null, customerName: "" })} className="form-input mt-1">
                <option value="">Aday kurum (henüz açılmadı)</option>
                {orgs.data?.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
              </select>
            </label>
            <label className="block text-[12px] font-semibold text-ink-2">Teklifteki ad<input value={form.customerName} onChange={(event) => update({ customerName: event.target.value })} placeholder="Ör. Örnek Dershanesi" className="form-input mt-1" /></label>
            <label className="block text-[12px] font-semibold text-ink-2">Yetkili<input value={form.contactName} onChange={(event) => update({ contactName: event.target.value })} placeholder="Ad soyad" className="form-input mt-1" /></label>
            <label className="block text-[12px] font-semibold text-ink-2">Yetkili e-postası<input type="email" value={form.contactEmail} onChange={(event) => update({ contactEmail: event.target.value })} className="form-input mt-1" /></label>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-[15px] font-bold text-ink">Paket ve kalemler</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <label className="block text-[12px] font-semibold text-ink-2">Paket<select value={form.plan} onChange={(event) => update({ plan: event.target.value as OrgPlan })} className="form-input mt-1">{ORG_PLANS.map((plan) => <option key={plan} value={plan}>{ORG_PLAN_LABELS[plan]}</option>)}</select></label>
            <label className="block text-[12px] font-semibold text-ink-2">Süre (ay)<input type="number" min={1} max={60} value={form.months} onChange={(event) => update({ months: event.target.value })} className="form-input mt-1" /></label>
            <label className="block text-[12px] font-semibold text-ink-2">Öğrenci sayısı<input type="number" min={1} value={form.studentCount} onChange={(event) => update({ studentCount: event.target.value })} placeholder="isteğe bağlı" className="form-input mt-1" /></label>
            <div className="flex items-end"><Button variant="outline" className="w-full" onClick={addPlanLine}>Liste fiyatından ekle</Button></div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-[13px]">
              <thead className="text-[11px] uppercase tracking-wide text-ink-4"><tr><th className="py-2 pr-2">Açıklama</th><th className="w-24 py-2 pr-2">Adet</th><th className="w-36 py-2 pr-2">Birim fiyat (TL)</th><th className="w-32 py-2 pr-2 text-right">Tutar</th><th className="w-8" /></tr></thead>
              <tbody>
                {form.lines.map((line, index) => (
                  <tr key={index}>
                    <td className="py-1 pr-2"><input value={line.description} onChange={(event) => updateLine(index, { description: event.target.value })} className="form-input" aria-label={`Kalem ${index + 1} açıklaması`} /></td>
                    <td className="py-1 pr-2"><input type="number" min={1} value={line.quantity} onChange={(event) => updateLine(index, { quantity: event.target.value })} className="form-input" aria-label={`Kalem ${index + 1} adedi`} /></td>
                    <td className="py-1 pr-2"><input type="number" min={0} value={line.unitPriceTry} onChange={(event) => updateLine(index, { unitPriceTry: event.target.value })} className="form-input" aria-label={`Kalem ${index + 1} birim fiyatı`} /></td>
                    <td className="py-1 pr-2 text-right font-semibold">{formatTry(Math.max(1, int(line.quantity)) * int(line.unitPriceTry))}</td>
                    <td className="py-1"><button onClick={() => update({ lines: form.lines.filter((_, i) => i !== index) })} className="text-ink-4 hover:text-danger" aria-label={`Kalem ${index + 1} sil`}><Trash2 size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={() => update({ lines: [...form.lines, { description: "", quantity: "1", unitPriceTry: "" }] })} className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-brand"><Plus size={13} /> Kalem ekle</button>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_280px]">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-[12px] font-semibold text-ink-2">İndirim (%)<input type="number" min={0} max={100} value={form.discountPercent} onChange={(event) => update({ discountPercent: event.target.value })} className="form-input mt-1" /></label>
              <label className="block text-[12px] font-semibold text-ink-2">KDV (%)<input type="number" min={0} max={30} value={form.vatRate} onChange={(event) => update({ vatRate: event.target.value })} className="form-input mt-1" /></label>
              <label className="block text-[12px] font-semibold text-ink-2">Geçerlilik<input type="date" value={form.validUntil} onChange={(event) => update({ validUntil: event.target.value })} className="form-input mt-1" /></label>
            </div>
            <QuoteTotalsBox totals={totals} discountPercent={int(form.discountPercent)} vatRate={int(form.vatRate)} />
          </div>
          <label className="mt-4 block text-[12px] font-semibold text-ink-2">Not ve koşullar<textarea value={form.note} onChange={(event) => update({ note: event.target.value })} rows={4} maxLength={2000} placeholder="Ör. ödeme koşulları, kurulum ve eğitim desteği, öğrenci sayısı aşımında ek ücret…" className="form-input mt-1 h-auto py-2" /></label>
        </Card>
      </fieldset>

      {!locked && <div className="flex gap-2"><Button onClick={submit} disabled={save.isPending}>{save.isPending ? <Loader2 size={14} className="animate-spin" /> : <><FileText size={14} /> Kaydet</>}</Button></div>}
    </div>
  );
}

export function QuoteTotalsBox({ totals, discountPercent, vatRate }: { totals: ReturnType<typeof computeQuoteTotals>; discountPercent: number; vatRate: number }) {
  const row = (label: string, value: string, strong = false) => <div className={`flex justify-between gap-3 ${strong ? "border-t border-rule pt-2 text-[15px] font-extrabold text-ink" : "text-ink-2"}`}><span>{label}</span><span>{value}</span></div>;
  return (
    <div className="space-y-1.5 rounded-xl bg-paper p-4 text-[13px]">
      {row("Ara toplam", formatTry(totals.subtotal))}
      {discountPercent > 0 && row(`İndirim (%${discountPercent})`, `−${formatTry(totals.discount)}`)}
      {row(`KDV (%${vatRate})`, formatTry(totals.vat))}
      {row("Genel toplam", formatTry(totals.total), true)}
    </div>
  );
}

/** Yazdırılabilir teklif (/yonetim/teklif/:id/yazdir): tarayıcının "PDF olarak kaydet"iyle paylaşılır. */
export function AdminQuotePrint({ quoteId }: { quoteId: number }) {
  const quote = trpc.admin.quotes.get.useQuery({ id: quoteId }, { retry: false });
  const company = trpc.admin.settings.company.useQuery();
  useEffect(() => { if (quote.data) document.title = `Fiyat Teklifi ${quoteNumber(quote.data.id, quote.data.createdAt)}`; }, [quote.data]);
  if (quote.isLoading || company.isLoading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="animate-spin text-brand" /></div>;
  if (!quote.data) return <p className="p-10 text-center text-danger">{quote.error?.message ?? "Teklif bulunamadı."}</p>;
  const data = quote.data;
  const firm = company.data ?? EMPTY_COMPANY;
  const taxLine = [firm.taxOffice && `${firm.taxOffice} V.D.`, firm.taxNumber && `VKN/TCKN ${firm.taxNumber}`, firm.mersisNo && `MERSİS ${firm.mersisNo}`].filter(Boolean).join(" · ");
  const contactLine = [firm.phone, firm.email, firm.website].filter(Boolean).join(" · ");
  return (
    <div className="min-h-screen bg-white text-ink print:min-h-0">
      <div className="mx-auto max-w-[800px] p-8 print:p-0">
        <div className="mb-6 flex justify-end gap-2 print:hidden"><Button onClick={() => window.print()}><Printer size={14} /> Yazdır / PDF kaydet</Button></div>
        <header className="flex items-start justify-between gap-6 border-b border-rule pb-5">
          <div className="text-[12px] leading-5 text-ink-3">
            <p className="text-[22px] font-extrabold leading-tight text-ink">{firm.brandName || "Pusula"}</p>
            {firm.legalName && <p className="font-semibold text-ink-2">{firm.legalName}</p>}
            {firm.address && <p className="max-w-[340px]">{firm.address}</p>}
            {taxLine && <p>{taxLine}</p>}
            {contactLine && <p>{contactLine}</p>}
          </div>
          <div className="text-right text-[13px]"><p className="text-[18px] font-extrabold">Fiyat Teklifi</p><p className="font-mono">{quoteNumber(data.id, data.createdAt)}</p><p className="text-ink-3">Tarih: {trDay(data.updatedAt)}</p>{data.validUntil && <p className="text-ink-3">Geçerlilik: {trDay(data.validUntil)}</p>}</div>
        </header>
        <section className="mt-5 text-[14px]">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-4">Sayın</p>
          <p className="mt-1 text-[16px] font-bold">{data.customerName}</p>
          {(data.contactName || data.contactEmail) && <p className="text-ink-3">{[data.contactName, data.contactEmail].filter(Boolean).join(" · ")}</p>}
          <p className="mt-3 text-ink-2">{ORG_PLAN_LABELS[data.plan]} kurum paketi · {data.months} ay{data.studentCount ? ` · ${data.studentCount} öğrenci` : ""} · aylık {ORG_PLAN_DEFAULT_CREDITS[data.plan].toLocaleString("tr-TR")} AI kredisi</p>
        </section>
        <table className="mt-5 w-full text-left text-[13px]">
          <thead className="border-y border-rule text-[11px] uppercase tracking-wide text-ink-4"><tr><th className="py-2">Açıklama</th><th className="py-2 text-right">Adet</th><th className="py-2 text-right">Birim fiyat</th><th className="py-2 text-right">Tutar</th></tr></thead>
          <tbody>{data.lines.map((line, index) => <tr key={index} className="border-b border-rule"><td className="py-2">{line.description}</td><td className="py-2 text-right">{line.quantity}</td><td className="py-2 text-right">{formatTry(line.unitPriceTry)}</td><td className="py-2 text-right">{formatTry(line.quantity * line.unitPriceTry)}</td></tr>)}</tbody>
        </table>
        <div className="mt-4 flex justify-end"><div className="w-full max-w-[300px]"><QuoteTotalsBox totals={data.totals} discountPercent={data.discountPercent} vatRate={data.vatRate} /></div></div>
        {data.note && <section className="mt-6 whitespace-pre-line text-[13px] leading-6 text-ink-2"><p className="text-[12px] font-semibold uppercase tracking-wide text-ink-4">Not ve koşullar</p>{data.note}</section>}
        {firm.iban && <section className="mt-6 rounded-xl bg-paper p-4 text-[13px]"><p className="text-[12px] font-semibold uppercase tracking-wide text-ink-4">Ödeme bilgileri</p><p className="mt-1">{[firm.bankName, firm.legalName].filter(Boolean).join(" · ")}</p><p className="font-mono">{formatIban(firm.iban)}</p></section>}
        <footer className="mt-10 border-t border-rule pt-4 text-[12px] text-ink-3">Teklifi hazırlayan: {data.createdByName ?? (firm.brandName || "Pusula")}{data.createdByEmail ? ` · ${data.createdByEmail}` : ""}. Fiyatlar Türk lirasıdır; KDV ayrıca gösterilmiştir.</footer>
      </div>
    </div>
  );
}
