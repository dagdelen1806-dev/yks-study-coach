import { useState } from "react";
import { toast } from "sonner";
import { Copy, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const slugify = (value: string) => value.toLocaleLowerCase("tr-TR").replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

/**
 * Admin "Kurumlar": pilot dershaneyi oluştur, ilk kurum yöneticisinin tek kullanımlık
 * davet kodunu al (kod bir kez gösterilir), gerekirse askıya al. Kurumun içini
 * (öğrenciler, sınıflar) kurum yöneticisi /kurum panelinden yönetir.
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
  const setStatus = trpc.admin.orgs.setStatus.useMutation({ onSuccess: () => utils.admin.orgs.list.invalidate(), onError: (error) => toast.error(error.message) });

  const copy = (code: string) => navigator.clipboard?.writeText(code).then(() => toast.success("Kod kopyalandı."), () => undefined);

  return (
    <div className="space-y-4">
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

      <Card className="overflow-x-auto p-0">
        {orgs.isLoading ? <div className="p-6 text-center"><Loader2 className="mx-auto animate-spin text-ink-4" /></div> : !orgs.data?.length ? <p className="p-6 text-center text-[13px] text-ink-3">Henüz kurum yok.</p> : (
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead className="border-b border-rule text-[11px] uppercase tracking-wide text-ink-4"><tr><th className="px-4 py-3">Kurum</th><th className="px-4 py-3">Öğrenci</th><th className="px-4 py-3">Personel</th><th className="px-4 py-3">Durum</th><th className="px-4 py-3 text-right">İşlem</th></tr></thead>
            <tbody>
              {orgs.data.map((org) => (
                <tr key={org.id} className="border-b border-rule last:border-0">
                  <td className="px-4 py-3"><p className="font-semibold text-ink">{org.name}</p><p className="text-[11px] text-ink-4">{org.slug}</p></td>
                  <td className="px-4 py-3">{org.students}</td>
                  <td className="px-4 py-3">{org.staff}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${org.status === "active" ? "bg-success-soft text-success" : "bg-warn-soft text-warn"}`}>{org.status === "active" ? "Aktif" : "Askıda"}</span></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
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
