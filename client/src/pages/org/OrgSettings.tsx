import { trpc } from "@/lib/trpc";
import { EmptyNote, PageHeader, Panel, Segmented, primaryButton, secondaryButton } from "@/components/app/kit";
import { CLASS_GRADES, CLASS_TRACKS, CLASS_TRACK_LABELS, ORG_KINDS, ORG_KIND_LABELS, ROLE_LABELS, ROLE_PERMISSIONS, TEACHER_SUBJECTS, hasRole, isStaffRole, type OrgKind } from "@shared/org";
import { Building2, Check, Copy, Pencil, Plus, School, ShieldCheck, Trash2, UserPlus, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { OrgScope } from "./OrgApp";
import { Initials, relativeTime } from "./orgShared";

type Tab = "org" | "teachers" | "classes" | "roles";
const TABS: Array<{ value: Tab; label: string }> = [
  { value: "org", label: "Kurum bilgileri" },
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
      {tab === "org" && <OrgProfileSettings scope={scope} />}
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

function SubjectSelect({ value, onChange, disabled, label }: { value: string; onChange: (value: string) => void; disabled?: boolean; label: string }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} className="form-input" aria-label={label}>
      <option value="">Branş seç</option>
      {TEACHER_SUBJECTS.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
      {value && !(TEACHER_SUBJECTS as readonly string[]).includes(value) && <option value={value}>{value}</option>}
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
      <Panel icon={<School size={18} />} title={editingId ? "Sınıfı düzenle" : "Yeni sınıf tanımla"} subtitle="Seviye ve alan, panelde sınıfları karşılaştırmayı kolaylaştırır; danışman öğretmen sınıfın rehberidir.">
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="block"><span className="form-label">Sınıf adı</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} maxLength={80} placeholder="Ör. 12-A" className="form-input" /></label>
          <label className="block"><span className="form-label">Seviye</span><select value={form.gradeLevel} onChange={(event) => setForm({ ...form, gradeLevel: event.target.value })} className="form-input"><option value="">Seç</option>{CLASS_GRADES.map((grade) => <option key={grade} value={grade}>{grade === "Mezun" ? "Mezun" : `${grade}. sınıf`}</option>)}</select></label>
          <label className="block"><span className="form-label">Alan</span><select value={form.track} onChange={(event) => setForm({ ...form, track: event.target.value })} className="form-input"><option value="">Seç</option>{CLASS_TRACKS.map((track) => <option key={track} value={track}>{CLASS_TRACK_LABELS[track]}</option>)}</select></label>
          <label className="block"><span className="form-label">Danışman öğretmen</span><select value={form.advisorUserId} onChange={(event) => setForm({ ...form, advisorUserId: event.target.value })} className="form-input"><option value="">Yok</option>{staff.map((member) => <option key={member.userId} value={member.userId}>{member.name}{member.subject ? ` · ${member.subject}` : ""}</option>)}</select></label>
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={submit} disabled={pending || !form.name.trim()} className={primaryButton}>{editingId ? <Check size={16} /> : <Plus size={16} />} {pending ? "Kaydediliyor…" : editingId ? "Kaydet" : "Sınıf ekle"}</button>
          {editingId && <button onClick={() => { setEditingId(null); setForm(emptyClass); }} className={secondaryButton}><X size={15} /> Vazgeç</button>}
        </div>
      </Panel>
      <section className="soft-card overflow-x-auto">
        {!classes.data ? <div className="p-5"><EmptyNote>Yükleniyor…</EmptyNote></div> : classes.data.length === 0 ? <div className="p-5"><EmptyNote>Henüz sınıf tanımlanmadı.</EmptyNote></div> : (
          <table className="w-full min-w-[620px] text-left text-[13px]">
            <thead className="border-b border-rule text-[11.5px] font-semibold text-ink-3"><tr><th className="px-5 py-3">Sınıf</th><th className="px-3 py-3">Seviye</th><th className="px-3 py-3">Alan</th><th className="px-3 py-3">Danışman</th><th className="px-3 py-3">Öğrenci</th><th className="px-5 py-3 text-right">İşlem</th></tr></thead>
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
