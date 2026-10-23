import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { Copy, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ORG_PLANS, ORG_PLAN_DEFAULT_CREDITS, ORG_PLAN_LABELS, type OrgPlan } from "@shared/org";

type MembershipForm = { orgId: number; orgName: string; plan: OrgPlan; startsAt: string; endsAt: string; credits: string };
const isoDay = (value: string | Date | null) => (value ? new Date(value).toLocaleDateString("sv-SE") : "");
const trDay = (value: string | Date | null) => (value ? new Date(value).toLocaleDateString("tr-TR") : "süresiz");

const slugify = (value: string) => value.toLocaleLowerCase("tr-TR").replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

/**
 * Admin "Kurumlar": pilot dershaneyi oluştur, ilk kurum yöneticisinin tek kullanımlık
 * davet kodunu al (kod bir kez gösterilir), gerekirse askıya al. Kurum adına tıklayınca
 * kurum detayı açılır (/yonetim/kurum/:id: personel, sınıflar, akademik takip); öğrencileri
 * ve sınıfları kurum yöneticisi /kurum panelinden yönetir.
 */
export default function AdminOrgsPage() {
  const utils = trpc.useUtils();
  const orgs = trpc.admin.orgs.list.useQuery();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [shownCode, setShownCode] = useState<{ orgName: string; code: string } | null>(null);
  const create = trpc.admin.orgs.create.useMutation({
    onSuccess: (result) => { setShownCode({ orgName: name, code: result.adminCode }); setName(""); setSlug(""); utils.admin.orgs.list.invalidate(); },
    onError: (error) => toast.error(error.message),
  });
  const inviteAdmin = trpc.admin.orgs.inviteAdmin.useMutation({ onError: (error) => toast.error(error.message) });
  const [membership, setMembership] = useState<MembershipForm | null>(null);
  const saveMembership = trpc.admin.orgs.setMembership.useMutation({ onSuccess: () => { toast.success("Üyelik kaydedildi."); setMembership(null); utils.admin.orgs.list.invalidate(); }, onError: (error) => toast.error(error.message) });
  const setStatus = trpc.admin.orgs.setStatus.useMutation({ onSuccess: () => utils.admin.orgs.list.invalidate(), onError: (error) => toast.error(error.message) });

  const upgrades = trpc.admin.orgs.upgradeRequests.useQuery();
  const resolveUpgrade = trpc.admin.orgs.resolveUpgrade.useMutation({ onSuccess: (_, input) => { toast.success(input.approve ? "Talep onaylandı; paket, kredi ve süre güncellendi." : "Talep reddedildi."); utils.admin.orgs.upgradeRequests.invalidate(); utils.admin.orgs.list.invalidate(); }, onError: (error) => toast.error(error.message) });
  const copy = (code: string) => navigator.clipboard?.writeText(code).then(() => toast.success("Kod kopyalandı."), () => undefined);

  return (
    <div className="space-y-4">
      {(upgrades.data?.length ?? 0) > 0 && (
        <Card className="border-[#f3dc9b] bg-pencil-soft/50 p-5">
          <h3 className="text-[15px] font-bold text-ink">Bekleyen paket talepleri ({upgrades.data!.length})</h3>
          <p className="mt-1 text-[12px] text-ink-3">Onaylayınca kurum talep ettiği pakete geçer, aylık kredi en az paketin varsayılanı olur ve süre 1 yıl uzar (bitmemişse mevcut bitişin üstüne).</p>
          <ul className="mt-3 divide-y divide-rule">
            {upgrades.data!.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="min-w-0 flex-1 text-[13px]"><strong className="text-ink">{row.orgName}</strong> · {ORG_PLAN_LABELS[row.currentPlan]} → <strong className="text-ink">{ORG_PLAN_LABELS[row.requestedPlan]}</strong>{row.requestedPlan === row.currentPlan ? " (süre uzatma)" : ""}<span className="block text-[12px] text-ink-3">{row.requesterName ?? "Kurum yöneticisi"}{row.requesterEmail ? ` · ${row.requesterEmail}` : ""} · {new Date(row.createdAt).toLocaleDateString("tr-TR")} · mevcut bitiş {trDay(row.membershipEndsAt)}{row.note ? ` · “${row.note}”` : ""}</span></span>
                <Link href={`/yonetim/teklif/yeni?kurum=${row.orgId}`} className="text-[12px] font-semibold text-brand hover:underline">Teklif hazırla</Link>
                <Button size="sm" disabled={resolveUpgrade.isPending} onClick={() => resolveUpgrade.mutate({ requestId: row.id, approve: true })}>Onayla</Button>
                <Button size="sm" variant="outline" disabled={resolveUpgrade.isPending} onClick={() => { if (window.confirm(`${row.orgName} talebi reddedilsin mi?`)) resolveUpgrade.mutate({ requestId: row.id, approve: false }); }}>Reddet</Button>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <Card className="p-5">
        <h3 className="text-[15px] font-bold text-ink">Yeni kurum</h3>
        <p className="mt-1 text-[12px] text-ink-3">Kurum oluşunca ilk yöneticisi için 30 gün geçerli, tek kullanımlık bir davet kodu üretilir. Kodu kurum yetkilisine ilet; o da uygulamada profil menüsü → Kurumum'dan girer.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_220px_auto]">
          <input value={name} onChange={(event) => { setName(event.target.value); setSlug(slugify(event.target.value)); }} placeholder="Kurum adı (ör. Örnek Dershanesi)" className="form-input" aria-label="Kurum adı" />
          <input value={slug} onChange={(event) => setSlug(slugify(event.target.value))} placeholder="kisa-ad" className="form-input" aria-label="Kısa ad" />
          <Button onClick={() => create.mutate({ name: name.trim(), slug })} disabled={create.isPending || name.trim().length < 2 || slug.length < 3}>{create.isPending ? <Loader2 size={14} className="animate-spin" /> : "Oluştur"}</Button>
        </div>
      </Card>

      {shownCode && (
        <Card className="border-brand/30 bg-brand-soft/40 p-5">
          <p className="text-[13px] font-semibold text-ink">{shownCode.orgName} — yönetici davet kodu</p>
          <div className="mt-2 flex items-center gap-3">
            <code className="rounded-lg bg-white px-3 py-2 text-[20px] font-extrabold tracking-[0.15em] text-ink">{shownCode.code}</code>
            <Button variant="outline" size="sm" onClick={() => copy(shownCode.code)}><Copy size={14} /> Kopyala</Button>
          </div>
          <p className="mt-2 text-[12px] text-ink-3">Bu kod bir daha gösterilmez; kaybolursa listeden yeni yönetici daveti üret.</p>
          <button onClick={() => setShownCode(null)} className="mt-2 text-[12px] font-semibold text-brand">Kapat</button>
        </Card>
      )}

      {membership && (
        <Card className="p-5">
          <h3 className="text-[15px] font-bold text-ink">{membership.orgName} — üyelik ve AI kredisi</h3>
          <p className="mt-1 text-[12px] text-ink-3">Süre dolunca kurum paneli salt okunur olur ve öğrenciler kurum kredisi yerine kendi kotalarını kullanır. Kredi her ayın ilk günü yenilenir.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <label className="block text-[12px] font-semibold text-ink-2">Paket<select value={membership.plan} onChange={(event) => { const plan = event.target.value as OrgPlan; setMembership({ ...membership, plan, credits: String(ORG_PLAN_DEFAULT_CREDITS[plan]) }); }} className="form-input mt-1">{ORG_PLANS.map((plan) => <option key={plan} value={plan}>{ORG_PLAN_LABELS[plan]}</option>)}</select></label>
            <label className="block text-[12px] font-semibold text-ink-2">Başlangıç<input type="date" value={membership.startsAt} onChange={(event) => setMembership({ ...membership, startsAt: event.target.value })} className="form-input mt-1" /></label>
            <label className="block text-[12px] font-semibold text-ink-2">Bitiş (boş = süresiz)<input type="date" value={membership.endsAt} onChange={(event) => setMembership({ ...membership, endsAt: event.target.value })} className="form-input mt-1" /></label>
            <label className="block text-[12px] font-semibold text-ink-2">Aylık AI kredisi<input type="number" min={0} value={membership.credits} onChange={(event) => setMembership({ ...membership, credits: event.target.value })} className="form-input mt-1" /></label>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => saveMembership.mutate({ orgId: membership.orgId, plan: membership.plan, startsAt: membership.startsAt || null, endsAt: membership.endsAt || null, aiCreditsMonthly: Math.max(0, Math.round(Number(membership.credits) || 0)) })} disabled={saveMembership.isPending}>{saveMembership.isPending ? <Loader2 size={14} className="animate-spin" /> : "Kaydet"}</Button>
            <Button variant="outline" onClick={() => setMembership(null)}>Vazgeç</Button>
          </div>
        </Card>
      )}

      <Card className="overflow-x-auto p-0">
        {orgs.isLoading ? <div className="p-6 text-center"><Loader2 className="mx-auto animate-spin text-ink-4" /></div> : !orgs.data?.length ? <p className="p-6 text-center text-[13px] text-ink-3">Henüz kurum yok.</p> : (
          <table className="w-full min-w-[900px] text-left text-[13px]">
            <thead className="border-b border-rule text-[11px] uppercase tracking-wide text-ink-4"><tr><th className="px-4 py-3">Kurum</th><th className="px-4 py-3">Paket</th><th className="px-4 py-3">AI kredisi (bu ay)</th><th className="px-4 py-3">Öğrenci</th><th className="px-4 py-3">Personel</th><th className="px-4 py-3">Durum</th><th className="px-4 py-3 text-right">İşlem</th></tr></thead>
            <tbody>
              {orgs.data.map((org) => (
                <tr key={org.id} className="border-b border-rule last:border-0">
                  <td className="px-4 py-3"><Link href={`/yonetim/kurum/${org.id}`} className="font-semibold text-brand hover:underline">{org.name}</Link><p className="text-[11px] text-ink-4">{org.slug}</p></td>
                  <td className="px-4 py-3"><p className="font-semibold text-ink">{ORG_PLAN_LABELS[org.plan]}</p><p className={`text-[11px] ${org.membershipState === "active" ? "text-ink-4" : "font-bold text-danger"}`}>{trDay(org.membershipStartsAt)} → {trDay(org.membershipEndsAt)}{org.membershipState === "expired" ? " · süresi doldu" : org.membershipState === "not_started" ? " · başlamadı" : ""}</p></td>
                  <td className="px-4 py-3">{org.creditsUsed.toLocaleString("tr-TR")} / {org.aiCreditsMonthly.toLocaleString("tr-TR")}</td>
                  <td className="px-4 py-3">{org.students}</td>
                  <td className="px-4 py-3">{org.staff}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${org.status === "active" ? "bg-success-soft text-success" : "bg-warn-soft text-warn"}`}>{org.status === "active" ? "Aktif" : "Askıda"}</span></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setMembership({ orgId: org.id, orgName: org.name, plan: org.plan, startsAt: isoDay(org.membershipStartsAt), endsAt: isoDay(org.membershipEndsAt), credits: String(org.aiCreditsMonthly) })}>Üyelik</Button>
                      <Button variant="outline" size="sm" disabled={inviteAdmin.isPending} onClick={() => inviteAdmin.mutate({ orgId: org.id }, { onSuccess: (result) => setShownCode({ orgName: org.name, code: result.adminCode }) })}>Yönetici daveti</Button>
                      <Button variant="outline" size="sm" disabled={setStatus.isPending} onClick={() => { const next = org.status === "active" ? "suspended" : "active"; if (next === "active" || window.confirm(`${org.name} askıya alınsın mı? Personel paneli kapanır.`)) setStatus.mutate({ orgId: org.id, status: next }); }}>{org.status === "active" ? "Askıya al" : "Etkinleştir"}</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
