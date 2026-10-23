import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Building2, KeyRound, Loader2, UserRound } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/app/kit";
import { EMPTY_COMPANY, companyInfoSchema, type CompanyInfo } from "@shared/platformCompany";

type Tab = "company" | "account";
const TABS: Array<{ value: Tab; label: string }> = [{ value: "company", label: "Şirket bilgileri" }, { value: "account", label: "Hesabım" }];

/** Yönetim Paneli → Ayarlar: şirket bilgileri (teklif belgesine yazılır), ad ve şifre. */
export default function AdminSettingsPage() {
  const [tab, setTab] = useState<Tab>("company");
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto"><Segmented value={tab} options={TABS} onChange={setTab} label="Ayar bölümleri" /></div>
      {tab === "company" ? <CompanySettings /> : <AccountSettings />}
    </div>
  );
}

const COMPANY_FIELDS: Array<{ key: keyof CompanyInfo; label: string; placeholder?: string; wide?: boolean; type?: string }> = [
  { key: "brandName", label: "Görünen ad (marka)", placeholder: "Pusula" },
  { key: "legalName", label: "Ticari unvan", placeholder: "Örnek Eğitim Teknolojileri Ltd. Şti." },
  { key: "taxOffice", label: "Vergi dairesi" },
  { key: "taxNumber", label: "Vergi no / TC kimlik no", placeholder: "10 ya da 11 hane" },
  { key: "mersisNo", label: "MERSİS no", placeholder: "16 hane (varsa)" },
  { key: "phone", label: "Telefon", type: "tel" },
  { key: "email", label: "E-posta", type: "email" },
  { key: "website", label: "Web sitesi", placeholder: "https://…" },
  { key: "address", label: "Adres", wide: true },
  { key: "bankName", label: "Banka" },
  { key: "iban", label: "IBAN", placeholder: "TR00 0000 0000 0000 0000 0000 00" },
];

function CompanySettings() {
  const utils = trpc.useUtils();
  const company = trpc.admin.settings.company.useQuery();
  const [form, setForm] = useState<CompanyInfo>(EMPTY_COMPANY);
  const [error, setError] = useState("");
  useEffect(() => { if (company.data) setForm(company.data); }, [company.data]);
  const save = trpc.admin.settings.saveCompany.useMutation({ onSuccess: () => { toast.success("Şirket bilgileri kaydedildi."); utils.admin.settings.company.invalidate(); }, onError: (caught) => setError(caught.message) });
  const submit = () => {
    const parsed = companyInfoSchema.safeParse(form);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Bilgileri kontrol et."); return; }
    setError("");
    save.mutate(parsed.data);
  };

  if (company.isLoading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-brand" /></div>;
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center gap-2"><Building2 size={18} className="text-brand" /><h2 className="text-[15px] font-bold text-ink">Şirket bilgileri</h2></div>
      <p className="mt-1 text-[12px] text-ink-3">Fiyat tekliflerinin başlığında (unvan, adres, vergi bilgileri) ve altında (banka, IBAN, standart koşullar) görünür. Boş bırakılan alan belgeye yazılmaz.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {COMPANY_FIELDS.map((field) => (
          <label key={field.key} className={`block text-[12px] font-semibold text-ink-2 ${field.wide ? "sm:col-span-2" : ""}`}>{field.label}
            <input type={field.type ?? "text"} value={form[field.key]} onChange={(event) => { setForm({ ...form, [field.key]: event.target.value }); setError(""); }} placeholder={field.placeholder} className="form-input mt-1" />
          </label>
        ))}
        <label className="block text-[12px] font-semibold text-ink-2 sm:col-span-2">Tekliflerde standart koşullar
          <textarea value={form.quoteTerms} onChange={(event) => setForm({ ...form, quoteTerms: event.target.value })} rows={4} maxLength={2000} placeholder="Ör. Ödeme peşin ya da 3 taksit; fiyatlara KDV dahil değildir; teklif geçerlilik süresi sonunda yeniden fiyatlandırılır…" className="form-input mt-1 h-auto py-2" />
          <span className="mt-1 block font-normal text-ink-4">Yeni tekliflerin "Not ve koşullar" alanına hazır gelir; teklifte değiştirebilirsin.</span>
        </label>
      </div>
      {error && <p role="alert" className="mt-3 text-[12px] font-medium text-danger">{error}</p>}
      <div className="mt-4"><Button onClick={submit} disabled={save.isPending}>{save.isPending ? <Loader2 size={14} className="animate-spin" /> : "Kaydet"}</Button></div>
    </Card>
  );
}

const MIN_PASSWORD = 8;

function AccountSettings() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [name, setName] = useState(user?.name ?? "");
  const updateName = trpc.admin.settings.updateMyName.useMutation({ onSuccess: () => { toast.success("Adın güncellendi."); utils.auth.me.invalidate(); }, onError: (caught) => toast.error(caught.message) });
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState("");
  const change = trpc.auth.changePassword.useMutation({
    onSuccess: () => { toast.success("Şifren değiştirildi. Bir sonraki girişinde yeni şifreni kullan."); setCurrent(""); setNext(""); setRepeat(""); },
    onError: (caught) => setError(caught.message),
  });
  const submitPassword = () => {
    if (!current) { setError("Mevcut şifreni yaz."); return; }
    if (next.length < MIN_PASSWORD) { setError(`Yeni şifre en az ${MIN_PASSWORD} karakter olmalı.`); return; }
    if (next !== repeat) { setError("Yeni şifreler birbirini tutmuyor."); return; }
    if (next === current) { setError("Yeni şifre mevcut şifreyle aynı olamaz."); return; }
    setError("");
    change.mutate({ currentPassword: current, newPassword: next });
  };
  const hasPassword = Boolean(user?.loginMethod?.startsWith("dev"));
  const passwordField = (id: string, label: string, value: string, setValue: (value: string) => void, autoComplete: string) => (
    <label htmlFor={id} className="block text-[12px] font-semibold text-ink-2">{label}
      <input id={id} type="password" value={value} onChange={(event) => { setValue(event.target.value); setError(""); }} onKeyDown={(event) => { if (event.key === "Enter") submitPassword(); }} autoComplete={autoComplete} maxLength={200} className="form-input mt-1" />
    </label>
  );

  return (
    <div className="space-y-4">
      <Card className="p-5 sm:p-6">
        <div className="flex items-center gap-2"><UserRound size={18} className="text-brand" /><h2 className="text-[15px] font-bold text-ink">Bilgilerim</h2></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <label className="block text-[12px] font-semibold text-ink-2">Ad soyad<input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} className="form-input mt-1" /></label>
          <label className="block text-[12px] font-semibold text-ink-2">E-posta<input value={user?.email ?? ""} readOnly disabled className="form-input mt-1" /></label>
          <div className="flex items-end"><Button disabled={updateName.isPending || name.trim().length < 2 || name.trim() === user?.name} onClick={() => updateName.mutate({ name: name.trim() })}>Kaydet</Button></div>
        </div>
        <p className="mt-2 text-[12px] text-ink-4">E-posta giriş kimliğindir; buradan değiştirilmez.</p>
      </Card>
      <Card className="p-5 sm:p-6">
        <div className="flex items-center gap-2"><KeyRound size={18} className="text-brand" /><h2 className="text-[15px] font-bold text-ink">Şifre değiştir</h2></div>
        {!hasPassword ? <p className="mt-2 text-[13px] text-ink-3">Bu hesap şifreyle değil, dış bir giriş sağlayıcısıyla açılıyor; şifresi orada yönetilir.</p> : (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {passwordField("admin-current-password", "Mevcut şifre", current, setCurrent, "current-password")}
              {passwordField("admin-new-password", `Yeni şifre (en az ${MIN_PASSWORD} karakter)`, next, setNext, "new-password")}
              {passwordField("admin-repeat-password", "Yeni şifre (tekrar)", repeat, setRepeat, "new-password")}
            </div>
            {error && <p role="alert" className="mt-3 text-[12px] font-medium text-danger">{error}</p>}
            <div className="mt-4"><Button onClick={submitPassword} disabled={change.isPending}>{change.isPending ? <Loader2 size={14} className="animate-spin" /> : "Şifreyi değiştir"}</Button></div>
          </>
        )}
      </Card>
    </div>
  );
}
