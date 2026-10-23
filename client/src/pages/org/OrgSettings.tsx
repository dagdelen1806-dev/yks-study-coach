import { trpc } from "@/lib/trpc";
import { EmptyNote, PageHeader, Panel, Segmented, primaryButton, secondaryButton } from "@/components/app/kit";
import { CLASS_GRADES, CLASS_TRACKS, CLASS_TRACK_LABELS, ORG_CREDIT_COSTS, ORG_CREDIT_FEATURE_LABELS, ORG_KINDS, ORG_KIND_LABELS, ORG_PLANS, ORG_PLAN_DEFAULT_CREDITS, ORG_PLAN_DESCRIPTIONS, ORG_PLAN_LABELS, ORG_PLAN_RANK, ROLE_LABELS, canRequestPlan, type MembershipState, type OrgPlan, ROLE_PERMISSIONS, TEACHER_SUBJECT_GROUPS, TEACHER_SUBJECTS, hasRole, isStaffRole, type OrgKind } from "@shared/org";
import { DEFAULT_KVKK_CONSENT, DEFAULT_KVKK_NOTICE, KVKK_PLACEHOLDERS } from "@shared/kvkk";
import type { FeatureKey } from "@shared/entitlements";
import { Building2, Check, ClipboardCheck, Copy, FileText, Pencil, Plus, Rocket, RotateCcw, School, ShieldCheck, Sparkles, Trash2, UserPlus, Users, Wallet, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { OrgScope } from "./OrgApp";
import { Initials, relativeTime } from "./orgShared";

type Tab = "org" | "membership" | "kvkk" | "teachers" | "classes" | "roles";
const TABS: Array<{ value: Tab; label: string }> = [
  { value: "org", label: "Kurum bilgileri" },
  { value: "membership", label: "Üyelik ve krediler" },
  { value: "kvkk", label: "KVKK metinleri" },
  { value: "teachers", label: "Öğretmen tanımlama" },
  { value: "classes", label: "Sınıf tanımlama" },
  { value: "roles", label: "Roller ve yetkiler" },
];

const copyText = async (text: string) => { try { await navigator.clipboard.writeText(text); toast.success("Kopyalandı."); } catch { toast.error("Kopyalanamadı; metni elle seç."); } };

/** Kurum Ayarları: kurum bilgileri, öğretmen ve sınıf tanımlama, rollerin yetkileri. */
export default function OrgSettings({ scope }: { scope: OrgScope }) {
  const [tab, setTab] = useState<Tab>("org");
  return (
    <div className="space-y-5">
      <PageHeader eyebrow={scope.orgName} title="Ayarlar" description="Kurumun bilgilerini, öğretmenlerini ve sınıflarını buradan tanımla. Öğrenciler kuruma yalnızca kendi onaylarıyla, davet koduyla katılır." />
      <div className="overflow-x-auto"><Segmented value={tab} options={TABS} onChange={setTab} label="Ayar bölümleri" /></div>
      {tab === "org" && <><OrgProfileSettings scope={scope} /><CasesSetting scope={scope} /></>}
      {tab === "membership" && <MembershipSettings scope={scope} />}
      {tab === "kvkk" && <KvkkSettings scope={scope} />}
      {tab === "teachers" && <TeacherSettings scope={scope} />}
      {tab === "classes" && <ClassSettings scope={scope} />}
      {tab === "roles" && <RoleSettings />}
    </div>
  );
}

function OrgProfileSettings({ scope }: { scope: OrgScope }) {
  const utils = trpc.useUtils();
  const canEdit = hasRole(scope.role, "admin");
  const org = trpc.org.settings.get.useQuery({ orgId: scope.orgId }, { retry: false });
  const [form, setForm] = useState({ name: "", kind: "dershane" as OrgKind, city: "", district: "", address: "", phone: "", contactEmail: "" });
  useEffect(() => {
    if (org.data) setForm({ name: org.data.name, kind: org.data.kind, city: org.data.city ?? "", district: org.data.district ?? "", address: org.data.address ?? "", phone: org.data.phone ?? "", contactEmail: org.data.contactEmail ?? "" });
  }, [org.data]);
  const save = trpc.org.settings.update.useMutation({ onSuccess: () => { toast.success("Kurum bilgileri kaydedildi."); utils.org.settings.get.invalidate(); utils.org.mine.invalidate(); }, onError: (error) => toast.error(error.message) });
  const field = (key: keyof typeof form) => ({ value: form[key], onChange: (event: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: event.target.value }), disabled: !canEdit, className: "form-input" });

  if (!org.data) return <EmptyNote>Yükleniyor…</EmptyNote>;
  return (
    <Panel icon={<Building2 size={18} />} title="Kurum bilgileri" subtitle={canEdit ? "Kurum adı panelde ve öğrencinin 'Kurumum' ekranında görünür." : "Yalnızca kurum yöneticisi düzenleyebilir."}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2"><span className="form-label">Kurum adı</span><input {...field("name")} maxLength={160} /></label>
        <label className="block"><span className="form-label">Kurum türü</span><select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value as OrgKind })} disabled={!canEdit} className="form-input">{ORG_KINDS.map((kind) => <option key={kind} value={kind}>{ORG_KIND_LABELS[kind]}</option>)}</select></label>
        <label className="block"><span className="form-label">Telefon</span><input {...field("phone")} maxLength={40} placeholder="0212 000 00 00" inputMode="tel" /></label>
        <label className="block"><span className="form-label">İl</span><input {...field("city")} maxLength={80} placeholder="İstanbul" /></label>
        <label className="block"><span className="form-label">İlçe</span><input {...field("district")} maxLength={80} placeholder="Kadıköy" /></label>
        <label className="block sm:col-span-2"><span className="form-label">Adres</span><input {...field("address")} maxLength={300} /></label>
        <label className="block sm:col-span-2"><span className="form-label">İletişim e-postası</span><input {...field("contactEmail")} type="email" maxLength={160} placeholder="iletisim@kurum.com" /></label>
      </div>
      <p className="mt-3 text-[12px] text-ink-4">Kurum kısa adı: {org.data.slug} · Oluşturulma: {new Date(org.data.createdAt).toLocaleDateString("tr-TR")}</p>
      {canEdit && <button onClick={() => save.mutate({ orgId: scope.orgId, ...form })} disabled={save.isPending || form.name.trim().length < 2} className={`${primaryButton} mt-4 self-start`}><Check size={16} /> {save.isPending ? "Kaydediliyor…" : "Kaydet"}</button>}
    </Panel>
  );
}

/** Akademik takip dosyaları (Novara Rehber): kurum bazında açılır; yalnızca kurum yöneticisi değiştirir. */
function CasesSetting({ scope }: { scope: OrgScope }) {
  const utils = trpc.useUtils();
  const canEdit = hasRole(scope.role, "admin");
  const status = trpc.org.cases.status.useQuery({ orgId: scope.orgId }, { retry: false });
  const update = trpc.org.cases.setEnabled.useMutation({
    onSuccess: (result) => { toast.success(result.enabled ? "Akademik takip açıldı." : "Akademik takip kapatıldı."); void utils.org.cases.invalidate(); },
    onError: (error) => toast.error(error.message),
  });
  if (!status.data) return null;
  return (
    <Panel icon={<ClipboardCheck size={18} />} title="Akademik takip" subtitle="Karşılaştırılabilir denemelerde düşüş eğilimi görülen öğrenciler için öğretmene inceleme önerisi ve takip dosyası. Öneri teşhis değildir; notlar mahremdir.">
      <label className={`flex items-center gap-2 text-[13.5px] ${canEdit ? "cursor-pointer text-ink-2" : "text-ink-3"}`}>
        <input type="checkbox" checked={status.data.enabled} disabled={!canEdit || update.isPending} onChange={(event) => update.mutate({ orgId: scope.orgId, enabled: event.target.checked })} className="h-4 w-4 accent-brand" />
        Akademik takip dosyalarını bu kurumda aç
      </label>
      {!canEdit && <p className="mt-2 text-[12px] text-ink-4">Yalnızca kurum yöneticisi değiştirebilir.</p>}
    </Panel>
  );
}

const formatDay = (value: string | Date | null | undefined) => (value ? new Date(value).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }) : "Süresiz");

const REQUEST_STATUS_LABELS = { pending: "Onay bekliyor", approved: "Onaylandı", rejected: "Reddedildi", canceled: "İptal edildi" } as const;

/** Paket yükseltme / süre uzatma: kurum yöneticisi talep gönderir, Pusula onaylayınca paket, kredi ve süre güncellenir. */
function PlanUpgrade({ scope, currentPlan, state }: { scope: OrgScope; currentPlan: OrgPlan; state: MembershipState }) {
  const utils = trpc.useUtils();
  const isAdmin = hasRole(scope.role, "admin");
  const requests = trpc.org.settings.upgrades.useQuery({ orgId: scope.orgId }, { enabled: isAdmin, retry: false });
  const prices = trpc.org.settings.planPrices.useQuery({ orgId: scope.orgId }, { enabled: isAdmin, retry: false, staleTime: 5 * 60_000 });
  const [choice, setChoice] = useState<OrgPlan | null>(null);
  const [note, setNote] = useState("");
  const refresh = () => utils.org.settings.upgrades.invalidate();
  const request = trpc.org.settings.requestUpgrade.useMutation({ onSuccess: () => { toast.success("Talebin alındı; onaylanınca paketin otomatik güncellenecek."); setChoice(null); setNote(""); refresh(); }, onError: (error) => toast.error(error.message) });
  const cancel = trpc.org.settings.cancelUpgrade.useMutation({ onSuccess: () => { toast.success("Talep iptal edildi."); refresh(); }, onError: (error) => toast.error(error.message) });
  const pending = requests.data?.find((row) => row.status === "pending");
  const lastResolved = requests.data?.find((row) => row.status === "approved" || row.status === "rejected");
  const plans = ORG_PLANS.filter((plan) => plan !== "trial" || currentPlan === "trial");

  return (
    <Panel icon={<Rocket size={18} />} title="Paketini yükselt" subtitle={isAdmin ? "Üst pakete geçmek ya da süreni uzatmak için talep gönder. Pusula onayladığında paket, aylık kredi ve süre otomatik güncellenir; süre bitmeden uzatırsan kalan günlerin korunur." : "Paket değişikliğini kurum yöneticisi talep edebilir."}>
      {pending && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#f3dc9b] bg-pencil-soft/70 p-4" role="status">
          <span className="text-[13px] text-ink"><strong>{ORG_PLAN_LABELS[pending.requestedPlan]}</strong> {pending.requestedPlan === currentPlan ? "süre uzatma" : "paketine yükseltme"} talebin onay bekliyor · {new Date(pending.createdAt).toLocaleDateString("tr-TR")}</span>
          <button onClick={() => cancel.mutate({ orgId: scope.orgId, requestId: pending.id })} disabled={cancel.isPending} className={secondaryButton}><X size={15} /> Talebi iptal et</button>
        </div>
      )}
      {!pending && lastResolved && <p className="mb-3 text-[12px] text-ink-3">Son talep: {ORG_PLAN_LABELS[lastResolved.requestedPlan]} · {REQUEST_STATUS_LABELS[lastResolved.status]}{lastResolved.resolvedAt ? ` (${new Date(lastResolved.resolvedAt).toLocaleDateString("tr-TR")})` : ""}</p>}
      <div className={`grid gap-4 ${plans.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
        {plans.map((plan) => {
          const isCurrent = plan === currentPlan;
          const allowed = canRequestPlan(currentPlan, plan);
          const label = isCurrent ? (state === "active" ? "Süreyi uzat" : "Yenile") : ORG_PLAN_RANK[plan] > ORG_PLAN_RANK[currentPlan] ? "Bu pakete yükselt" : "";
          return (
            <section key={plan} className={`flex flex-col rounded-2xl border p-4 ${isCurrent ? "border-brand bg-brand-soft/40" : "border-rule"} ${choice === plan ? "ring-2 ring-brand/40" : ""}`}>
              <div className="flex items-center justify-between gap-2"><h3 className="text-[16px] font-extrabold text-ink">{ORG_PLAN_LABELS[plan]}</h3>{isCurrent && <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold text-white">Mevcut paket</span>}</div>
              <p className="mt-1 text-[22px] font-extrabold text-ink">{ORG_PLAN_DEFAULT_CREDITS[plan].toLocaleString("tr-TR")} <span className="text-[12px] font-semibold text-ink-3">AI kredisi / ay</span></p>
              {plan !== "trial" && <PlanPrice price={prices.data?.[plan]} />}
              <ul className="mt-2 flex-1 space-y-1 text-[12.5px] text-ink-2">{ORG_PLAN_DESCRIPTIONS[plan].map((line) => <li key={line} className="flex gap-2"><Check size={14} className="mt-0.5 shrink-0 text-success" />{line}</li>)}</ul>
              {isAdmin && allowed && label && <button onClick={() => setChoice(choice === plan ? null : plan)} disabled={Boolean(pending)} className={`${isCurrent ? secondaryButton : primaryButton} mt-3 w-full justify-center`}>{label}</button>}
            </section>
          );
        })}
      </div>
      {choice && !pending && (
        <div className="mt-4 rounded-2xl border border-rule p-4">
          <p className="text-[13px] font-semibold text-ink">{ORG_PLAN_LABELS[choice]} {choice === currentPlan ? "süre uzatma" : "yükseltme"} talebi</p>
          <label className="mt-2 block"><span className="form-label">Not (opsiyonel)</span><input value={note} onChange={(event) => setNote(event.target.value)} maxLength={300} placeholder="Ör. öğrenci sayımız 80'e çıkacak, fatura bilgisi…" className="form-input" /></label>
          <div className="mt-3 flex gap-2">
            <button onClick={() => request.mutate({ orgId: scope.orgId, plan: choice, note: note.trim() || undefined })} disabled={request.isPending} className={primaryButton}><Rocket size={15} /> {request.isPending ? "Gönderiliyor…" : "Talebi gönder"}</button>
            <button onClick={() => setChoice(null)} className={secondaryButton}>Vazgeç</button>
          </div>
        </div>
      )}
    </Panel>
  );
}

/** Liste fiyatı Yönetim Paneli → Paketler'den gelir; tanımlı değilse fiyat uydurulmaz. */
function PlanPrice({ price }: { price?: { monthlyPriceTry: number | null; yearlyPriceTry: number | null; priceNote: string | null } }) {
  const money = (value: number) => `${value.toLocaleString("tr-TR")} TL`;
  if (!price || (price.monthlyPriceTry === null && price.yearlyPriceTry === null)) return <p className="mt-1 text-[12px] font-semibold text-ink-3">Fiyat için iletişime geçin</p>;
  return (
    <p className="mt-1 text-[13px] font-semibold text-ink-2">
      {[price.monthlyPriceTry !== null && `${money(price.monthlyPriceTry)} / ay`, price.yearlyPriceTry !== null && `${money(price.yearlyPriceTry)} / yıl`].filter(Boolean).join(" · ")}
      {price.priceNote && <span className="block text-[11.5px] font-normal text-ink-3">{price.priceNote}</span>}
    </p>
  );
}

function MembershipSettings({ scope }: { scope: OrgScope }) {
  const utils = trpc.useUtils();
  const isAdmin = hasRole(scope.role, "admin");
  const org = trpc.org.settings.get.useQuery({ orgId: scope.orgId }, { retry: false });
  const credits = trpc.org.settings.credits.useQuery({ orgId: scope.orgId }, { retry: false });
  const [cap, setCap] = useState("");
  useEffect(() => { if (credits.data) setCap(credits.data.cap ? String(credits.data.cap) : ""); }, [credits.data?.cap]);
  const saveCap = trpc.org.settings.setCreditCap.useMutation({ onSuccess: () => { toast.success("Öğrenci sınırı kaydedildi."); utils.org.settings.credits.invalidate(); }, onError: (error) => toast.error(error.message) });

  if (!org.data || !credits.data) return <EmptyNote>Yükleniyor…</EmptyNote>;
  const state = org.data.membershipState;
  const daysLeft = org.data.membershipEndsAt ? Math.ceil((new Date(org.data.membershipEndsAt).getTime() - Date.now()) / 86_400_000) : null;
  const percent = credits.data.monthly ? Math.min(100, Math.round((credits.data.used / credits.data.monthly) * 100)) : 0;
  const nextReset = new Date(new Date(credits.data.periodStart).getFullYear(), new Date(credits.data.periodStart).getMonth() + 1, 1);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <section className="soft-card p-5">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-ink-3"><Sparkles size={16} className="text-brand" /> Paket</p>
          <p className="mt-2 text-[24px] font-extrabold text-ink">{ORG_PLAN_LABELS[org.data.plan]}</p>
          <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${state === "active" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>{state === "active" ? "Aktif" : state === "expired" ? "Süresi doldu" : "Henüz başlamadı"}</span>
        </section>
        <section className="soft-card p-5">
          <p className="text-[13px] font-semibold text-ink-3">Üyelik süresi</p>
          <p className="mt-2 text-[15px] font-bold text-ink">{formatDay(org.data.membershipStartsAt)} → {formatDay(org.data.membershipEndsAt)}</p>
          <p className="mt-1 text-[12px] text-ink-3">{daysLeft === null ? "Bitiş tarihi tanımlı değil." : daysLeft >= 0 ? `${daysLeft} gün kaldı.` : "Süre doldu: panel salt okunur, öğrencilerin AI işlemleri kendi kotalarından yürür."}</p>
        </section>
        <section className="soft-card p-5">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-ink-3"><Wallet size={16} className="text-brand" /> Bu ay kalan AI kredisi</p>
          <p className="mt-2 text-[24px] font-extrabold text-ink">{credits.data.remaining.toLocaleString("tr-TR")} <span className="text-[13px] font-semibold text-ink-3">/ {credits.data.monthly.toLocaleString("tr-TR")}</span></p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-paper"><div className={`h-full rounded-full ${percent >= 90 ? "bg-danger" : "bg-brand"}`} style={{ width: `${percent}%` }} /></div>
          <p className="mt-1 text-[12px] text-ink-3">{nextReset.toLocaleDateString("tr-TR", { day: "numeric", month: "long" })} tarihinde yenilenir.</p>
        </section>
      </div>
      <PlanUpgrade scope={scope} currentPlan={org.data.plan} state={state} />

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel icon={<Wallet size={18} />} title="Kredi nasıl harcanır?" subtitle="Kuruma bağlı öğrencilerin AI işlemleri önce kurum havuzundan düşer; havuz biterse öğrencinin kendi hakkı kullanılır.">
          <ul className="divide-y divide-rule text-[13px]">
            {(Object.keys(ORG_CREDIT_COSTS) as FeatureKey[]).map((feature) => {
              const row = credits.data!.byFeature.find((item) => item.featureKey === feature);
              return <li key={feature} className="flex items-center justify-between gap-3 py-2"><span className="text-ink-2">{ORG_CREDIT_FEATURE_LABELS[feature]} <span className="text-ink-4">· {ORG_CREDIT_COSTS[feature]} kredi</span></span><span className="font-semibold text-ink">{row ? `${row.uses} işlem · ${row.credits} kredi` : "—"}</span></li>;
            })}
          </ul>
        </Panel>
        <Panel icon={<Users size={18} />} title="En çok kredi kullanan öğrenciler" subtitle="Bu ay">
          {credits.data.byStudent.length === 0 ? <EmptyNote>Bu ay henüz kredi kullanılmadı.</EmptyNote> : (
            <ul className="divide-y divide-rule text-[13px]">{credits.data.byStudent.map((row) => <li key={row.userId} className="flex items-center justify-between gap-3 py-2"><span className="flex items-center gap-2"><Initials name={row.name} size={26} /><span className="font-semibold text-ink">{row.name}</span></span><span className="text-ink-2">{row.uses} işlem · <strong className="text-ink">{row.credits}</strong> kredi</span></li>)}</ul>
          )}
          <div className="mt-4 border-t border-rule pt-4">
            <label className="block"><span className="form-label">Öğrenci başına aylık üst sınır (kredi)</span>
              <div className="flex gap-2"><input type="number" min={1} value={cap} onChange={(event) => setCap(event.target.value)} disabled={!isAdmin} placeholder="Sınırsız" className="form-input flex-1" /><button onClick={() => saveCap.mutate({ orgId: scope.orgId, cap: cap ? Math.max(1, Math.round(Number(cap))) : null })} disabled={!isAdmin || saveCap.isPending} className={secondaryButton}>Kaydet</button></div>
            </label>
            <p className="mt-1 text-[12px] text-ink-3">Bir öğrencinin havuzu tek başına tüketmesini önler. Boş bırakırsan sınır yok.</p>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function KvkkSettings({ scope }: { scope: OrgScope }) {
  const utils = trpc.useUtils();
  const isAdmin = hasRole(scope.role, "admin");
  const org = trpc.org.settings.get.useQuery({ orgId: scope.orgId }, { retry: false });
  const status = trpc.org.settings.kvkkStatus.useQuery({ orgId: scope.orgId }, { retry: false });
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState("");
  const [consent, setConsent] = useState("");
  const save = trpc.org.settings.updateKvkk.useMutation({
    onSuccess: () => { toast.success("KVKK metinleri kaydedildi; yeni katılan öğrenciler bu sürümü onaylayacak."); setEditing(false); utils.org.settings.get.invalidate(); utils.org.settings.kvkkStatus.invalidate(); },
    onError: (error) => toast.error(error.message),
  });
  if (!org.data) return <EmptyNote>Yükleniyor…</EmptyNote>;
  const kvkk = org.data.kvkk;
  const startEditing = () => { setNotice(org.data!.kvkkNotice || DEFAULT_KVKK_NOTICE); setConsent(org.data!.kvkkConsent || DEFAULT_KVKK_CONSENT); setEditing(true); };

  return (
    <div className="space-y-5">
      <section className="soft-card flex flex-wrap items-center gap-x-6 gap-y-2 p-4 text-[13px]">
        <span className="font-semibold text-ink">Sürüm {kvkk.version} · {kvkk.isCustom ? "Kurumun kendi metni" : "Pusula hazır şablonu"}</span>
        {org.data.kvkkUpdatedAt && <span className="text-ink-3">Son güncelleme: {new Date(org.data.kvkkUpdatedAt).toLocaleDateString("tr-TR")}</span>}
        {status.data && <span className="text-ink-3">Güncel sürümü onaylayan: {status.data.onCurrent} / {status.data.students} öğrenci{status.data.onOlder ? ` · eski sürümde: ${status.data.onOlder}` : ""}{status.data.missing ? ` · onay kaydı olmayan: ${status.data.missing}` : ""}</span>}
      </section>
      <p className="text-[12px] leading-5 text-ink-3">Hazır şablon KVKK m.10 aydınlatma başlıklarını izler ve kurum adı, adres, e-posta, telefon alanları Kurum bilgileri&apos;nden otomatik dolar. Hukuki görüş değildir; kurumunuzun hukuk danışmanıyla gözden geçirmenizi öneririz. Öğrenci kuruma katılırken iki metni de okur, aydınlatma metnini okuduğunu ve açık rızasını ayrı ayrı onaylar; onayladığı sürüm kaydedilir.</p>

      {!editing ? (
        <>
          <Panel icon={<FileText size={18} />} title="Aydınlatma metni (öğrencinin göreceği hâli)" action={isAdmin ? <button onClick={startEditing} className={secondaryButton}><Pencil size={14} /> Düzenle</button> : undefined}>
            <div className="max-h-[420px] overflow-y-auto whitespace-pre-line rounded-xl border border-rule bg-paper/40 p-4 text-[13px] leading-6 text-ink-2">{kvkk.notice}</div>
          </Panel>
          <Panel icon={<ShieldCheck size={18} />} title="Açık rıza metni">
            <div className="whitespace-pre-line rounded-xl border border-rule bg-paper/40 p-4 text-[13px] leading-6 text-ink-2">{kvkk.consent}</div>
          </Panel>
        </>
      ) : (
        <Panel icon={<Pencil size={18} />} title="KVKK metinlerini düzenle" subtitle={`Kullanabileceğin alanlar: ${KVKK_PLACEHOLDERS.map((key) => `{{${key}}}`).join(", ")}. Kaydedince sürüm ${kvkk.version + 1} olur.`}>
          <label className="block"><span className="form-label">Aydınlatma metni</span><textarea value={notice} onChange={(event) => setNotice(event.target.value)} maxLength={20000} rows={16} className="form-input min-h-[320px] py-3 font-mono text-[12.5px] leading-5" /></label>
          <label className="mt-3 block"><span className="form-label">Açık rıza metni</span><textarea value={consent} onChange={(event) => setConsent(event.target.value)} maxLength={5000} rows={6} className="form-input min-h-[140px] py-3 font-mono text-[12.5px] leading-5" /></label>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => save.mutate({ orgId: scope.orgId, notice: notice.trim() === DEFAULT_KVKK_NOTICE.trim() ? null : notice, consent: consent.trim() === DEFAULT_KVKK_CONSENT.trim() ? null : consent })} disabled={save.isPending || !notice.trim() || !consent.trim()} className={primaryButton}><Check size={16} /> {save.isPending ? "Kaydediliyor…" : "Kaydet"}</button>
            <button onClick={() => { setNotice(DEFAULT_KVKK_NOTICE); setConsent(DEFAULT_KVKK_CONSENT); }} className={secondaryButton}><RotateCcw size={15} /> Hazır şablona dön</button>
            <button onClick={() => setEditing(false)} className={secondaryButton}><X size={15} /> Vazgeç</button>
          </div>
        </Panel>
      )}
    </div>
  );
}

function SubjectSelect({ value, onChange, disabled, label }: { value: string; onChange: (value: string) => void; disabled?: boolean; label: string }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} className="form-input" aria-label={label}>
      <option value="">Branş seç</option>
      {TEACHER_SUBJECT_GROUPS.map((group) => <optgroup key={group.label} label={group.label}>{group.subjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}</optgroup>)}
      {value && !TEACHER_SUBJECTS.includes(value) && <option value={value}>{value}</option>}
    </select>
  );
}

function TeacherSettings({ scope }: { scope: OrgScope }) {
  const utils = trpc.useUtils();
  const isAdmin = hasRole(scope.role, "admin");
  const members = trpc.org.members.list.useQuery({ orgId: scope.orgId }, { retry: false });
  const assignments = trpc.org.assignments.list.useQuery({ orgId: scope.orgId }, { retry: false });
  const [form, setForm] = useState({ name: "", subject: "", role: "teacher" as "teacher" | "coordinator", days: "14" });
  const [created, setCreated] = useState<{ code: string; name: string; role: "teacher" | "coordinator"; days: number } | null>(null);
  const setSubject = trpc.org.members.setSubject.useMutation({ onSuccess: () => { utils.org.members.list.invalidate(); toast.success("Branş güncellendi."); }, onError: (error) => toast.error(error.message) });
  const invite = trpc.org.invitations.create.useMutation({
    onSuccess: (result) => { setCreated({ code: result.code, name: form.name.trim(), role: form.role, days: Number(form.days) || 14 }); setForm({ ...form, name: "", subject: "" }); utils.org.invitations.list.invalidate(); },
    onError: (error) => toast.error(error.message),
  });
  const staff = (members.data ?? []).filter((member) => isStaffRole(member.role));
  const message = created ? `Merhaba ${created.name || ""}, ${scope.orgName} Kurum Paneli'ne ${ROLE_LABELS[created.role].toLocaleLowerCase("tr")} olarak davetlisin. Pusula uygulamasına kayıt ol / giriş yap, profil menüsünden "Kurumum"a gir ve şu kodu yaz: ${created.code} (kod ${created.days} gün geçerli, tek kullanımlık).` : "";

  return (
    <div className="space-y-5">
      {isAdmin && (
        <Panel icon={<UserPlus size={18} />} title="Yeni öğretmen tanımla" subtitle="Öğretmenin adını ve branşını gir; ona özel, tek kullanımlık bir katılım kodu oluşur. Öğretmen kendi hesabıyla girip kodu yazınca kurumuna bağlanır.">
          <div className="grid gap-3 sm:grid-cols-4">
            <label className="block sm:col-span-2"><span className="form-label">Ad soyad</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} maxLength={120} placeholder="Ör. Murat Yılmaz" className="form-input" /></label>
            <label className="block"><span className="form-label">Branş</span><SubjectSelect value={form.subject} onChange={(subject) => setForm({ ...form, subject })} label="Branş" /></label>
            <label className="block"><span className="form-label">Rol</span><select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as "teacher" | "coordinator" })} className="form-input"><option value="teacher">{ROLE_LABELS.teacher}</option><option value="coordinator">{ROLE_LABELS.coordinator}</option></select></label>
          </div>
          <button onClick={() => invite.mutate({ orgId: scope.orgId, role: form.role, note: form.name.trim() || undefined, subject: form.subject || undefined, days: Math.min(60, Math.max(1, Number(form.days) || 14)), maxUses: 1 })} disabled={invite.isPending || form.name.trim().length < 2} className={`${primaryButton} mt-4 self-start`}><Plus size={16} /> {invite.isPending ? "Oluşturuluyor…" : "Katılım kodu oluştur"}</button>
          {created && (
            <div className="mt-4 rounded-2xl border border-[#f3dc9b] bg-pencil-soft/70 p-4" role="status">
              <p className="text-[13px] font-semibold text-ink">{created.name} için katılım kodu — şimdi kopyala, tekrar gösterilmeyecek:</p>
              <div className="mt-2 flex flex-wrap items-center gap-2"><code className="rounded-xl bg-white px-4 py-2 text-[22px] font-extrabold tracking-[0.18em] text-ink">{created.code}</code><button onClick={() => void copyText(created.code)} className={secondaryButton}><Copy size={15} /> Kodu kopyala</button><button onClick={() => void copyText(message)} className={secondaryButton}><Copy size={15} /> Davet mesajını kopyala</button></div>
              <p className="mt-2 text-[12px] leading-5 text-ink-3">{message}</p>
            </div>
          )}
        </Panel>
      )}
      <Panel icon={<Users size={18} />} title="Öğretmenler ve personel" subtitle="Branşlar öğrenci detayında ve öğretmen listesinde görünür. Öğrenci atamak için Öğretmenler sayfasını kullan.">
        {!members.data ? <EmptyNote>Yükleniyor…</EmptyNote> : staff.length === 0 ? <EmptyNote>Henüz personel yok.</EmptyNote> : (
          <ul className="divide-y divide-rule">
            {staff.map((member) => {
              const count = (assignments.data ?? []).filter((row) => row.teacherUserId === member.userId).length;
              return (
                <li key={member.userId} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
                  <span className="flex min-w-0 flex-1 items-center gap-3"><Initials name={member.name} /><span className="min-w-0"><span className="block truncate text-[13.5px] font-semibold text-ink">{member.name}</span><span className="block text-[12px] text-ink-3">{ROLE_LABELS[member.role]}{member.role === "teacher" ? ` · ${count} öğrenci` : ""} · son giriş {relativeTime(member.lastSignedIn)}</span></span></span>
                  <span className="sm:w-[200px]"><SubjectSelect value={member.subject ?? ""} onChange={(subject) => setSubject.mutate({ orgId: scope.orgId, userId: member.userId, subject })} disabled={setSubject.isPending} label={`${member.name} branşı`} /></span>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}

type ClassForm = { name: string; gradeLevel: string; track: string; advisorUserId: string };
const emptyClass: ClassForm = { name: "", gradeLevel: "", track: "", advisorUserId: "" };

function ClassSettings({ scope }: { scope: OrgScope }) {
  const utils = trpc.useUtils();
  const classes = trpc.org.classes.list.useQuery({ orgId: scope.orgId }, { retry: false });
  const members = trpc.org.members.list.useQuery({ orgId: scope.orgId }, { retry: false });
  const [form, setForm] = useState<ClassForm>(emptyClass);
  const [editingId, setEditingId] = useState<number | null>(null);
  const refresh = () => { utils.org.classes.list.invalidate(); utils.org.overview.invalidate(); utils.org.students.invalidate(); };
  const done = (message: string) => { setForm(emptyClass); setEditingId(null); refresh(); toast.success(message); };
  const create = trpc.org.classes.create.useMutation({ onSuccess: () => done("Sınıf tanımlandı."), onError: (error) => toast.error(error.message) });
  const update = trpc.org.classes.update.useMutation({ onSuccess: () => done("Sınıf güncellendi."), onError: (error) => toast.error(error.message) });
  const remove = trpc.org.classes.remove.useMutation({ onSuccess: refresh, onError: (error) => toast.error(error.message) });
  const staff = (members.data ?? []).filter((member) => isStaffRole(member.role));
  const advisorName = (userId: number | null) => (userId ? staff.find((member) => member.userId === userId)?.name ?? "—" : "—");
  const payload = () => ({ orgId: scope.orgId, name: form.name.trim(), gradeLevel: (form.gradeLevel || null) as (typeof CLASS_GRADES)[number] | null, track: (form.track || null) as (typeof CLASS_TRACKS)[number] | null, advisorUserId: form.advisorUserId ? Number(form.advisorUserId) : null });
  const submit = () => (editingId ? update.mutate({ ...payload(), classId: editingId }) : create.mutate(payload()));
  const pending = create.isPending || update.isPending;

  return (
    <div className="space-y-5">
      <Panel icon={<School size={18} />} title={editingId ? "Sınıfı düzenle" : "Yeni sınıf tanımla"} subtitle="Seviye ve alan, panelde sınıfları karşılaştırmayı kolaylaştırır; sorumlu öğretmen sınıfın tüm öğrencilerini panelde görür.">
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="block"><span className="form-label">Sınıf adı</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} maxLength={80} placeholder="Ör. 12-A" className="form-input" /></label>
          <label className="block"><span className="form-label">Seviye</span><select value={form.gradeLevel} onChange={(event) => setForm({ ...form, gradeLevel: event.target.value })} className="form-input"><option value="">Seç</option>{CLASS_GRADES.map((grade) => <option key={grade} value={grade}>{grade === "Mezun" ? "Mezun" : `${grade}. sınıf`}</option>)}</select></label>
          <label className="block"><span className="form-label">Alan</span><select value={form.track} onChange={(event) => setForm({ ...form, track: event.target.value })} className="form-input"><option value="">Seç</option>{CLASS_TRACKS.map((track) => <option key={track} value={track}>{CLASS_TRACK_LABELS[track]}</option>)}</select></label>
          <label className="block"><span className="form-label">Sorumlu öğretmen</span><select value={form.advisorUserId} onChange={(event) => setForm({ ...form, advisorUserId: event.target.value })} className="form-input"><option value="">Yok</option>{staff.map((member) => <option key={member.userId} value={member.userId}>{member.name}{member.subject ? ` · ${member.subject}` : ""}</option>)}</select></label>
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={submit} disabled={pending || !form.name.trim()} className={primaryButton}>{editingId ? <Check size={16} /> : <Plus size={16} />} {pending ? "Kaydediliyor…" : editingId ? "Kaydet" : "Sınıf ekle"}</button>
          {editingId && <button onClick={() => { setEditingId(null); setForm(emptyClass); }} className={secondaryButton}><X size={15} /> Vazgeç</button>}
        </div>
      </Panel>
      <section className="soft-card overflow-x-auto">
        {!classes.data ? <div className="p-5"><EmptyNote>Yükleniyor…</EmptyNote></div> : classes.data.length === 0 ? <div className="p-5"><EmptyNote>Henüz sınıf tanımlanmadı.</EmptyNote></div> : (
          <table className="w-full min-w-[620px] text-left text-[13px]">
            <thead className="border-b border-rule text-[11.5px] font-semibold text-ink-3"><tr><th className="px-5 py-3">Sınıf</th><th className="px-3 py-3">Seviye</th><th className="px-3 py-3">Alan</th><th className="px-3 py-3">Sorumlu öğretmen</th><th className="px-3 py-3">Öğrenci</th><th className="px-5 py-3 text-right">İşlem</th></tr></thead>
            <tbody>
              {classes.data.map((item) => (
                <tr key={item.id} className={`border-b border-rule last:border-0 ${editingId === item.id ? "bg-brand-soft/40" : ""}`}>
                  <td className="px-5 py-3 font-semibold text-ink">{item.name}</td>
                  <td className="px-3 py-3 text-ink-2">{item.gradeLevel ? (item.gradeLevel === "Mezun" ? "Mezun" : `${item.gradeLevel}. sınıf`) : "—"}</td>
                  <td className="px-3 py-3 text-ink-2">{item.track ? CLASS_TRACK_LABELS[item.track as (typeof CLASS_TRACKS)[number]] ?? item.track : "—"}</td>
                  <td className="px-3 py-3 text-ink-2">{advisorName(item.advisorUserId)}</td>
                  <td className="px-3 py-3 text-ink-2">{item.studentUserIds.length}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => { setEditingId(item.id); setForm({ name: item.name, gradeLevel: item.gradeLevel ?? "", track: item.track ?? "", advisorUserId: item.advisorUserId ? String(item.advisorUserId) : "" }); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="rounded-lg p-1.5 text-ink-3 hover:bg-brand-soft hover:text-brand" aria-label={`${item.name} düzenle`}><Pencil size={14} /></button>
                      <button onClick={() => { if (window.confirm(`"${item.name}" sınıfı silinsin mi? Öğrencilerin verisi silinmez.`)) remove.mutate({ orgId: scope.orgId, classId: item.id }); }} className="rounded-lg p-1.5 text-ink-4 hover:bg-danger-soft hover:text-danger" aria-label={`${item.name} sil`}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <p className="text-[12px] text-ink-3">Sınıfa öğrenci eklemek için Sınıflar sayfasındaki "Öğrenciler" düğmesini kullan.</p>
    </div>
  );
}

function RoleSettings() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {ROLE_PERMISSIONS.map((item) => (
        <Panel key={item.role} icon={<ShieldCheck size={18} />} title={ROLE_LABELS[item.role]}>
          <ul className="space-y-1.5 text-[13px] text-ink-2">{item.can.map((line) => <li key={line} className="flex gap-2"><Check size={14} className="mt-0.5 shrink-0 text-success" />{line}</li>)}</ul>
        </Panel>
      ))}
      <Panel icon={<ShieldCheck size={18} />} title="Öğrenci">
        <p className="text-[13px] leading-6 text-ink-2">Kuruma yalnızca kendi onayıyla katılır ve istediği an ayrılır. Kurum öğrencinin denemelerini, konu durumunu, planını ve hedefini görür; notları, soru defteri, fotoğrafları ve iletişim bilgileri paylaşılmaz.</p>
      </Panel>
    </div>
  );
}
