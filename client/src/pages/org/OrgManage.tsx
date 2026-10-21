import { trpc } from "@/lib/trpc";
import { EmptyNote, PageHeader, Panel, primaryButton, secondaryButton } from "@/components/app/kit";
import { INVITABLE_ROLES, ROLE_LABELS, canInviteRole, hasRole, type InvitableRole, type OrgRole } from "@shared/org";
import { ClipboardList, Copy, Mail, Plus, School, Trash2, Users, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { OrgScope } from "./OrgApp";
import { Initials, relativeTime } from "./orgShared";

/** Öğrenci seçici (sınıf öğrencileri, öğretmen ataması): kurumun aktif öğrencileri, aramalı onay kutuları. */
function StudentPicker({ scope, title, initial, onSave, onClose, saving }: { scope: OrgScope; title: string; initial: number[]; onSave: (ids: number[]) => void; onClose: () => void; saving: boolean }) {
  const students = trpc.org.students.useQuery({ orgId: scope.orgId }, { retry: false });
  const [selected, setSelected] = useState(() => new Set(initial));
  const [q, setQ] = useState("");
  const list = (students.data ?? []).filter((student) => student.name.toLocaleLowerCase("tr").includes(q.trim().toLocaleLowerCase("tr")));
  const toggle = (id: number) => setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal-card max-w-[460px]" role="dialog" aria-modal="true" aria-label={title}>
        <div className="flex items-start justify-between gap-3"><h2 className="text-[18px] font-extrabold text-ink">{title}</h2><button onClick={onClose} className="rounded-lg p-2 text-ink-4 hover:bg-paper" aria-label="Kapat"><X size={17} /></button></div>
        <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Öğrenci ara…" className="form-input mt-4" />
        <ul className="mt-3 max-h-[320px] divide-y divide-rule overflow-y-auto rounded-xl border border-rule">
          {list.length === 0 && <li className="p-4 text-center text-[13px] text-ink-3">{students.data ? "Öğrenci yok." : "Yükleniyor…"}</li>}
          {list.map((student) => <li key={student.userId}><label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-paper/60"><input type="checkbox" checked={selected.has(student.userId)} onChange={() => toggle(student.userId)} className="h-4 w-4 accent-[var(--brand)]" /><Initials name={student.name} size={28} /><span className="text-[13px] font-semibold text-ink">{student.name}</span></label></li>)}
        </ul>
        <div className="mt-4 flex items-center justify-between gap-2"><span className="text-[12px] text-ink-3">{selected.size} öğrenci seçili</span><div className="flex gap-2"><button onClick={onClose} className={secondaryButton}>Vazgeç</button><button onClick={() => onSave(Array.from(selected))} disabled={saving} className={primaryButton}>{saving ? "Kaydediliyor…" : "Kaydet"}</button></div></div>
      </div>
    </div>
  );
}

export function OrgClasses({ scope }: { scope: OrgScope }) {
  const utils = trpc.useUtils();
  const canManage = hasRole(scope.role, "coordinator");
  const classes = trpc.org.classes.list.useQuery({ orgId: scope.orgId }, { retry: false });
  const students = trpc.org.students.useQuery({ orgId: scope.orgId }, { retry: false });
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<{ id: number; name: string; ids: number[] } | null>(null);
  const refresh = () => { utils.org.classes.list.invalidate(); utils.org.students.invalidate(); utils.org.overview.invalidate(); };
  const create = trpc.org.classes.create.useMutation({ onSuccess: () => { setName(""); refresh(); toast.success("Sınıf oluşturuldu."); }, onError: (error) => toast.error(error.message) });
  const remove = trpc.org.classes.remove.useMutation({ onSuccess: refresh, onError: (error) => toast.error(error.message) });
  const setStudents = trpc.org.classes.setStudents.useMutation({ onSuccess: () => { setEditing(null); refresh(); toast.success("Sınıf öğrencileri güncellendi."); }, onError: (error) => toast.error(error.message) });
  const nameOf = (id: number) => students.data?.find((student) => student.userId === id)?.name ?? "Öğrenci";

  return (
    <div className="space-y-5">
      <PageHeader eyebrow={scope.orgName} title="Sınıflar" description="Öğrencileri sınıflara ayır; panelde ve öğrenci listesinde sınıf bazında filtrele ve karşılaştır." />
      {canManage && (
        <section className="soft-card flex flex-col gap-2 p-4 sm:flex-row">
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} placeholder="Yeni sınıf adı (ör. 12-A Sayısal)" className="form-input flex-1" />
          <button onClick={() => name.trim() && create.mutate({ orgId: scope.orgId, name: name.trim() })} disabled={create.isPending || !name.trim()} className={primaryButton}><Plus size={16} /> Sınıf ekle</button>
        </section>
      )}
      {!classes.data ? <EmptyNote>Yükleniyor…</EmptyNote> : classes.data.length === 0 ? <EmptyNote>Henüz sınıf yok.</EmptyNote> : (
        <div className="grid gap-4 md:grid-cols-2">
          {classes.data.map((item) => (
            <Panel key={item.id} icon={<School size={18} />} title={item.name} subtitle={[item.gradeLevel && (item.gradeLevel === "Mezun" ? "Mezun" : `${item.gradeLevel}. sınıf`), item.track, `${item.studentUserIds.length} öğrenci`].filter(Boolean).join(" · ")} action={canManage ? <div className="flex gap-1"><button onClick={() => setEditing({ id: item.id, name: item.name, ids: item.studentUserIds })} className="rounded-lg px-2 py-1 text-[12px] font-semibold text-brand hover:bg-brand-soft">Öğrenciler</button><button onClick={() => { if (window.confirm(`"${item.name}" sınıfı silinsin mi? Öğrencilerin verisi silinmez.`)) remove.mutate({ orgId: scope.orgId, classId: item.id }); }} className="rounded-lg p-1.5 text-ink-4 hover:bg-danger-soft hover:text-danger" aria-label={`${item.name} sil`}><Trash2 size={14} /></button></div> : undefined}>
              {item.studentUserIds.length === 0 ? <p className="text-[13px] text-ink-3">Bu sınıfta öğrenci yok.</p> : <p className="text-[13px] leading-6 text-ink-2">{item.studentUserIds.map(nameOf).join(", ")}</p>}
            </Panel>
          ))}
        </div>
      )}
      {editing && <StudentPicker scope={scope} title={`${editing.name} öğrencileri`} initial={editing.ids} saving={setStudents.isPending} onClose={() => setEditing(null)} onSave={(ids) => setStudents.mutate({ orgId: scope.orgId, classId: editing.id, studentUserIds: ids })} />}
    </div>
  );
}

export function OrgTeachers({ scope }: { scope: OrgScope }) {
  const utils = trpc.useUtils();
  const members = trpc.org.members.list.useQuery({ orgId: scope.orgId }, { retry: false });
  const assignments = trpc.org.assignments.list.useQuery({ orgId: scope.orgId }, { retry: false });
  const timetable = trpc.org.timetable.get.useQuery({ orgId: scope.orgId }, { retry: false });
  const [editing, setEditing] = useState<{ userId: number; name: string } | null>(null);
  const [branch, setBranch] = useState("");
  const branches = Array.from(new Set((members.data ?? []).map((member) => member.subject).filter((subject): subject is string => Boolean(subject)))).sort((a, b) => a.localeCompare(b, "tr"));
  const advising = (userId: number) => (timetable.data?.classes ?? []).filter((item) => item.advisorUserId === userId).map((item) => item.name);
  const lessons = (userId: number) => (timetable.data?.slots ?? []).filter((slot) => slot.teacherUserId === userId).length;
  const refresh = () => { utils.org.assignments.list.invalidate(); utils.org.members.list.invalidate(); utils.org.students.invalidate(); };
  const setTeacherStudents = trpc.org.assignments.setTeacherStudents.useMutation({ onSuccess: (result) => { setEditing(null); refresh(); toast.success(`${result.assigned} öğrenci atandı.`); }, onError: (error) => toast.error(error.message) });
  const setRole = trpc.org.members.setRole.useMutation({ onSuccess: () => { refresh(); toast.success("Rol güncellendi."); }, onError: (error) => toast.error(error.message) });
  const remove = trpc.org.members.remove.useMutation({ onSuccess: () => { refresh(); toast.success("Üyelik sonlandırıldı."); }, onError: (error) => toast.error(error.message) });
  const isAdmin = hasRole(scope.role, "admin");
  const staffRoles: OrgRole[] = ["coordinator", "teacher"];

  return (
    <div className="space-y-5">
      <PageHeader eyebrow={scope.orgName} title="Öğretmenler ve personel" description="Öğretmen, kendisine atanan öğrencilerin ve sorumlu olduğu sınıfın öğrencilerinin verisini görür. Yeni öğretmeni branşıyla Ayarlar → Öğretmenler'den davet et; branşı oradan değiştirilir." />
      {branches.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Branşa göre">
          <button onClick={() => setBranch("")} className={`rounded-full px-3 py-1 text-[12.5px] font-semibold ${branch ? "bg-paper text-ink-3" : "bg-brand text-white"}`}>Tümü</button>
          {branches.map((item) => <button key={item} onClick={() => setBranch(item)} className={`rounded-full px-3 py-1 text-[12.5px] font-semibold ${branch === item ? "bg-brand text-white" : "bg-paper text-ink-3"}`}>{item} ({(members.data ?? []).filter((member) => member.subject === item).length})</button>)}
        </div>
      )}
      {!members.data ? <EmptyNote>Yükleniyor…</EmptyNote> : (
        <section className="soft-card overflow-hidden">
          <ul className="divide-y divide-rule">
            {members.data.filter((member) => !branch || member.subject === branch).map((member) => {
              const count = (assignments.data ?? []).filter((row) => row.teacherUserId === member.userId).length;
              const advisedClasses = advising(member.userId);
              const lessonCount = lessons(member.userId);
              return (
                <li key={member.userId} className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center">
                  <span className="flex min-w-0 flex-1 items-center gap-3"><Initials name={member.name} /><span className="min-w-0"><span className="block truncate text-[13.5px] font-semibold text-ink">{member.name}</span><span className="block text-[12px] text-ink-3">{ROLE_LABELS[member.role]}{member.subject ? ` · ${member.subject}` : ""}{member.role === "teacher" ? ` · ${count} öğrenci` : ""}{advisedClasses.length ? ` · Sorumlu: ${advisedClasses.join(", ")}` : ""}{lessonCount ? ` · haftada ${lessonCount} ders` : ""} · son giriş {relativeTime(member.lastSignedIn)}</span></span></span>
                  <span className="flex flex-wrap items-center gap-2">
                    {member.role === "teacher" && <button onClick={() => setEditing({ userId: member.userId, name: member.name })} className={secondaryButton}><Users size={15} /> Öğrenci ata</button>}
                    {isAdmin && staffRoles.includes(member.role) && <select value={member.role} onChange={(event) => setRole.mutate({ orgId: scope.orgId, userId: member.userId, role: event.target.value as OrgRole })} className="form-input h-10 w-auto text-[13px]" aria-label={`${member.name} rolü`}>{staffRoles.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}</select>}
                    {isAdmin && staffRoles.includes(member.role) && <button onClick={() => { if (window.confirm(`${member.name} kurumdan çıkarılsın mı?`)) remove.mutate({ orgId: scope.orgId, userId: member.userId }); }} className="rounded-lg p-2 text-ink-4 hover:bg-danger-soft hover:text-danger" aria-label={`${member.name} çıkar`}><Trash2 size={15} /></button>}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {editing && <StudentPicker scope={scope} title={`${editing.name} · atanan öğrenciler`} initial={(assignments.data ?? []).filter((row) => row.teacherUserId === editing.userId).map((row) => row.studentUserId)} saving={setTeacherStudents.isPending} onClose={() => setEditing(null)} onSave={(ids) => setTeacherStudents.mutate({ orgId: scope.orgId, teacherUserId: editing.userId, studentUserIds: ids })} />}
    </div>
  );
}

export function OrgInvitations({ scope }: { scope: OrgScope }) {
  const utils = trpc.useUtils();
  const invitations = trpc.org.invitations.list.useQuery({ orgId: scope.orgId }, { retry: false });
  const roles = INVITABLE_ROLES.filter((role) => canInviteRole(scope.role, role));
  const [form, setForm] = useState<{ role: InvitableRole; days: string; maxUses: string; note: string }>({ role: "student", days: "14", maxUses: "30", note: "" });
  const [created, setCreated] = useState<{ code: string; role: InvitableRole } | null>(null);
  const create = trpc.org.invitations.create.useMutation({ onSuccess: (result) => { setCreated({ code: result.code, role: form.role }); utils.org.invitations.list.invalidate(); }, onError: (error) => toast.error(error.message) });
  const revoke = trpc.org.invitations.revoke.useMutation({ onSuccess: () => utils.org.invitations.list.invalidate(), onError: (error) => toast.error(error.message) });
  const copy = async (text: string) => { try { await navigator.clipboard.writeText(text); toast.success("Kopyalandı."); } catch { toast.error("Kopyalanamadı; kodu elle seç."); } };
  const statusOf = (invitation: NonNullable<typeof invitations.data>[number]) => invitation.revokedAt ? "İptal" : new Date(invitation.expiresAt) < new Date() ? "Süresi doldu" : invitation.usedCount >= invitation.maxUses ? "Doldu" : "Geçerli";

  return (
    <div className="space-y-5">
      <PageHeader eyebrow={scope.orgName} title="Davetler" description="Öğrenci, davet kodunu Focus uygulamasında profil menüsündeki 'Kurumum' bölümüne girer ve verilerinin kurumla paylaşılmasına onay verir. Kod yalnızca oluşturulduğu anda gösterilir." />
      <Panel icon={<Mail size={18} />} title="Yeni davet kodu">
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="block"><span className="form-label">Rol</span><select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as InvitableRole, maxUses: event.target.value === "student" ? "30" : "1" })} className="form-input">{roles.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}</select></label>
          <label className="block"><span className="form-label">Geçerlilik (gün)</span><input type="number" min={1} max={60} value={form.days} onChange={(event) => setForm({ ...form, days: event.target.value })} className="form-input" /></label>
          <label className="block"><span className="form-label">Kullanım sayısı</span><input type="number" min={1} max={500} value={form.maxUses} onChange={(event) => setForm({ ...form, maxUses: event.target.value })} className="form-input" /></label>
          <label className="block"><span className="form-label">Not (opsiyonel)</span><input value={form.note} maxLength={160} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Ör. 12-A sınıfı" className="form-input" /></label>
        </div>
        <button onClick={() => create.mutate({ orgId: scope.orgId, role: form.role, days: Math.min(60, Math.max(1, Number(form.days) || 14)), maxUses: Math.min(500, Math.max(1, Number(form.maxUses) || 1)), note: form.note.trim() || undefined })} disabled={create.isPending} className={`${primaryButton} mt-4 self-start`}><Plus size={16} /> {create.isPending ? "Oluşturuluyor…" : "Kod oluştur"}</button>
        {created && (
          <div className="mt-4 rounded-2xl border border-[#f3dc9b] bg-pencil-soft/70 p-4" role="status">
            <p className="text-[13px] font-semibold text-ink">{ROLE_LABELS[created.role]} davet kodu — şimdi kopyala, tekrar gösterilmeyecek:</p>
            <div className="mt-2 flex flex-wrap items-center gap-2"><code className="rounded-xl bg-white px-4 py-2 text-[22px] font-extrabold tracking-[0.18em] text-ink">{created.code}</code><button onClick={() => void copy(created.code)} className={secondaryButton}><Copy size={15} /> Kopyala</button></div>
          </div>
        )}
      </Panel>
      <Panel icon={<ClipboardList size={18} />} title="Davet geçmişi">
        {!invitations.data ? <EmptyNote>Yükleniyor…</EmptyNote> : invitations.data.length === 0 ? <EmptyNote>Henüz davet oluşturulmadı.</EmptyNote> : (
          <ul className="divide-y divide-rule">
            {invitations.data.map((invitation) => {
              const status = statusOf(invitation);
              return (
                <li key={invitation.id} className="flex flex-wrap items-center gap-3 py-2.5">
                  <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-semibold text-ink">{ROLE_LABELS[invitation.role]}{invitation.note ? ` · ${invitation.note}` : ""}</span><span className="block text-[12px] text-ink-3">{invitation.usedCount}/{invitation.maxUses} kullanıldı · {new Date(invitation.expiresAt).toLocaleDateString("tr-TR")} tarihine kadar · {relativeTime(invitation.createdAt)}</span></span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${status === "Geçerli" ? "bg-success-soft text-success" : "bg-paper text-ink-3"}`}>{status}</span>
                  {status === "Geçerli" && <button onClick={() => revoke.mutate({ orgId: scope.orgId, invitationId: invitation.id })} className="text-[12px] font-semibold text-danger hover:underline">İptal et</button>}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}

const ACTION_LABELS: Record<string, string> = {
  "invitation.create": "Davet oluşturdu", "invitation.revoke": "Daveti iptal etti", "member.join": "Kuruma katıldı", "member.leave": "Kurumdan ayrıldı", "member.role": "Rol değiştirdi", "member.remove": "Üyeyi çıkardı",
  "class.create": "Sınıf oluşturdu", "class.update": "Sınıfı düzenledi", "class.remove": "Sınıf sildi", "org.update": "Kurum bilgilerini güncelledi", "org.credit_cap": "Öğrenci kredi sınırını değiştirdi", "org.kvkk": "KVKK metinlerini güncelledi", "org.upgrade_request": "Paket talebi gönderdi", "org.upgrade_cancel": "Paket talebini iptal etti", "org.upgrade_approved": "Paket talebi onaylandı (Pusula)", "org.upgrade_rejected": "Paket talebi reddedildi (Pusula)", "member.subject": "Branş değiştirdi", "class.students": "Sınıf öğrencilerini güncelledi", "assignment.set": "Öğretmene öğrenci atadı", "task.assign": "Görev atadı", "note.create": "Not yazdı", "note.remove": "Not sildi",
};

export function OrgAudit({ scope }: { scope: OrgScope }) {
  const audit = trpc.org.audit.useQuery({ orgId: scope.orgId }, { retry: false });
  return (
    <div className="space-y-5">
      <PageHeader eyebrow={scope.orgName} title="İşlem kayıtları" description="Kurumdaki kritik işlemler (davet, katılma/ayrılma, rol, atama, görev, not). Son 200 kayıt." />
      {!audit.data ? <EmptyNote>Yükleniyor…</EmptyNote> : audit.data.length === 0 ? <EmptyNote>Henüz kayıt yok.</EmptyNote> : (
        <section className="soft-card overflow-hidden"><ul className="divide-y divide-rule">
          {audit.data.map((row) => <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 text-[13px]"><span><strong className="font-semibold text-ink">{row.actorName ?? "Kullanıcı"}</strong> <span className="text-ink-2">{ACTION_LABELS[row.action] ?? row.action}</span>{row.targetType === "user" && row.targetId ? <span className="text-ink-4"> · #{row.targetId}</span> : null}</span><span className="text-[12px] text-ink-4">{new Date(row.createdAt).toLocaleString("tr-TR")}</span></li>)}
        </ul></section>
      )}
    </div>
  );
}
