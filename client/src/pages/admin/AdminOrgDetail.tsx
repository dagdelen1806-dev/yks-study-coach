import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ORG_PLAN_LABELS, ROLE_LABELS, type OrgRole } from "@shared/org";

type StaffRole = Exclude<OrgRole, "student">;
const STAFF_ROLES: StaffRole[] = ["owner", "admin", "coordinator", "teacher"];
const trDay = (value: string | Date | null) => (value ? new Date(value).toLocaleDateString("tr-TR") : "süresiz");

/**
 * Yönetim Paneli → Kurumlar → kurum: personeli e-postayla ekle, rolünü değiştir, çıkar; akademik
 * takibi aç/kapat. Öğrenciler buradan eklenmez — kendi onaylarıyla davet koduyla katılırlar.
 * Son yönetici korunur (sunucu da reddeder).
 */
export default function AdminOrgDetail({ orgId }: { orgId: number }) {
  const utils = trpc.useUtils();
  const detail = trpc.admin.orgs.get.useQuery({ orgId }, { retry: false });
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRole>("teacher");
  const [subject, setSubject] = useState("");
  const refresh = () => { utils.admin.orgs.get.invalidate({ orgId }); utils.admin.orgs.list.invalidate(); };
  const onError = (error: { message: string }) => toast.error(error.message);
  const addStaff = trpc.admin.orgs.addStaff.useMutation({ onSuccess: () => { toast.success("Personel eklendi."); setEmail(""); setSubject(""); refresh(); }, onError });
  const setMemberRole = trpc.admin.orgs.setMemberRole.useMutation({ onSuccess: () => { toast.success("Rol güncellendi."); refresh(); }, onError });
  const removeMember = trpc.admin.orgs.removeMember.useMutation({ onSuccess: () => { toast.success("Üye kurumdan çıkarıldı."); refresh(); }, onError });
  const setCases = trpc.admin.orgs.setCasesEnabled.useMutation({ onSuccess: () => refresh(), onError });

  if (detail.isLoading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-brand" /></div>;
  if (detail.isError || !detail.data) return <Card className="p-6 text-center text-[13px] text-danger">{detail.error?.message ?? "Kurum yüklenemedi."} <Link href="/yonetim/kurumlar" className="font-semibold underline">Kurumlara dön</Link></Card>;

  const { org, members, classes } = detail.data;
  const staff = members.filter((member) => member.role !== "student");
  const studentCount = members.length - staff.length;

  return (
    <div className="space-y-5">
      <div>
        <Link href="/yonetim/kurumlar" className="inline-flex items-center gap-1 text-[13px] font-semibold text-ink-3 hover:text-ink"><ArrowLeft size={14} /> Kurumlar</Link>
        <h1 className="page-heading mt-2">{org.name}</h1>
        <p className="page-subtitle">{org.slug} · {ORG_PLAN_LABELS[org.plan]} · {trDay(org.membershipStartsAt)} → {trDay(org.membershipEndsAt)}{org.membershipState === "expired" ? " · süresi doldu" : ""} · {org.status === "active" ? "Aktif" : "Askıda"}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Öğrenci" value={studentCount} />
        <Stat label="Personel" value={staff.length} />
        <Stat label="Sınıf" value={classes.length} />
        <Stat label="AI kredisi (bu ay)" value={`${org.creditsUsed.toLocaleString("tr-TR")} / ${org.aiCreditsMonthly.toLocaleString("tr-TR")}`} />
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-bold text-ink">Akademik takip</h2>
            <p className="mt-1 text-[12px] text-ink-3">Öğretmenlerin vaka dosyası açıp görev ve izleme yapabildiği bölüm.</p>
          </div>
          <Button variant="outline" size="sm" disabled={setCases.isPending} onClick={() => setCases.mutate({ orgId, enabled: !org.academicCasesEnabled })}>{org.academicCasesEnabled ? "Açık · kapat" : "Kapalı · aç"}</Button>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-[15px] font-bold text-ink">Personel ekle</h2>
        <p className="mt-1 text-[12px] text-ink-3">Kişinin uygulamada hesabı olmalı. Öğrenciler buradan eklenmez; davet koduyla kendi onaylarıyla katılırlar.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1.4fr_180px_1fr_auto]">
          <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="E-posta" type="email" className="form-input" aria-label="Personel e-postası" />
          <select value={role} onChange={(event) => setRole(event.target.value as StaffRole)} className="form-input" aria-label="Rol">{STAFF_ROLES.map((value) => <option key={value} value={value}>{ROLE_LABELS[value]}</option>)}</select>
          <input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Branş (isteğe bağlı)" className="form-input" aria-label="Branş" />
          <Button disabled={addStaff.isPending || !email.includes("@")} onClick={() => addStaff.mutate({ orgId, email: email.trim(), role, subject: subject.trim() || null })}>{addStaff.isPending ? <Loader2 size={14} className="animate-spin" /> : "Ekle"}</Button>
        </div>
      </Card>

      <Card className="overflow-x-auto p-0">
        <div className="px-5 pt-5"><h2 className="text-[15px] font-bold text-ink">Personel ({staff.length})</h2></div>
        {!staff.length ? <p className="p-5 text-[13px] text-ink-3">Henüz personel yok.</p> : (
          <table className="mt-3 w-full min-w-[720px] text-left text-[13px]">
            <thead className="border-y border-rule text-[11px] uppercase tracking-wide text-ink-4"><tr><th className="px-5 py-2.5">Ad</th><th className="px-5 py-2.5">Rol</th><th className="px-5 py-2.5">Branş</th><th className="px-5 py-2.5">Son giriş</th><th className="px-5 py-2.5 text-right">İşlem</th></tr></thead>
            <tbody>
              {staff.map((member) => (
                <tr key={member.userId} className="border-b border-rule last:border-0">
                  <td className="px-5 py-2.5"><p className="font-semibold text-ink">{member.name || `#${member.userId}`}</p><p className="text-[11px] text-ink-4">{member.email}</p></td>
                  <td className="px-5 py-2.5">
                    <select value={member.role} disabled={setMemberRole.isPending} onChange={(event) => setMemberRole.mutate({ orgId, userId: member.userId, role: event.target.value as StaffRole })} className="form-input h-8 py-0 text-[12px]" aria-label={`${member.name ?? member.email} rolü`}>
                      {STAFF_ROLES.map((value) => <option key={value} value={value}>{ROLE_LABELS[value]}</option>)}
                    </select>
                  </td>
                  <td className="px-5 py-2.5 text-ink-3">{member.subject || "—"}</td>
                  <td className="px-5 py-2.5 text-ink-3">{member.lastSignedIn ? new Date(member.lastSignedIn).toLocaleDateString("tr-TR") : "—"}</td>
                  <td className="px-5 py-2.5 text-right"><button disabled={removeMember.isPending} onClick={() => { if (window.confirm(`${member.name || member.email} kurumdan çıkarılsın mı?`)) removeMember.mutate({ orgId, userId: member.userId }); }} className="text-[12px] font-semibold text-danger">Çıkar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="text-[15px] font-bold text-ink">Sınıflar ({classes.length})</h2>
        {!classes.length ? <p className="mt-2 text-[13px] text-ink-3">Henüz sınıf yok.</p> : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-3">
            {classes.map((item) => {
              const advisor = members.find((member) => member.userId === item.advisorUserId);
              return <li key={item.id} className="rounded-xl bg-paper p-3 text-[13px]"><p className="font-semibold text-ink">{item.name}</p><p className="text-[12px] text-ink-3">{item.students} öğrenci{advisor ? ` · ${advisor.name}` : ""}</p></li>;
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return <div className="rounded-2xl bg-surface p-4 shadow-sm"><div className="text-[12px] font-medium text-ink-3">{label}</div><div className="mt-1 text-[22px] font-semibold text-ink font-display">{value}</div></div>;
}
