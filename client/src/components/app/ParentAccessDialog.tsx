import { trpc } from "@/lib/trpc";
import { MAX_PARENTS_PER_STUDENT } from "@shared/parent";
import { Check, Copy, KeyRound, Mail, ShieldCheck, UserRound, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { primaryButton, secondaryButton } from "./kit";

/** Velinin görebildikleri; öğrenci kod üretmeden önce okur. */
const PARENT_SEES = [
  "Çalışma süren, takvimdeki planın ve plan uyumun",
  "Deneme sonuçların ve (LGS'de) tahmini puanın",
  "Zayıf konuların ve hedef bilgin",
];
const PARENT_NEVER_SEES = "Notların, soru defterin, fotoğrafların, sesli notların ve öğretmen notları veliyle paylaşılmaz.";

/** "Veli erişimi": velin için kod üret, bağlanma isteğini onayla, bağlı velileri gör ve kaldır. */
export default function ParentAccessDialog({ onClose }: { onClose: () => void }) {
  const utils = trpc.useUtils();
  const links = trpc.parent.myParents.useQuery(undefined, { retry: false });
  const [parentEmail, setParentEmail] = useState("");
  const [created, setCreated] = useState<{ code: string; joinUrl: string; expiresAt: Date | string; emailed: boolean } | null>(null);
  const refresh = () => void utils.parent.myParents.invalidate();
  const createInvite = trpc.parent.createInvite.useMutation({
    onSuccess: (value) => { setCreated(value); refresh(); if (value.emailed) toast.success("Davet velinin e-postasına gönderildi."); },
    onError: (error) => toast.error(error.message),
  });
  const decide = trpc.parent.decide.useMutation({ onSuccess: (_, input) => { toast.success(input.approve ? "Velin artık özetini görebilir." : "İstek reddedildi."); refresh(); }, onError: (error) => toast.error(error.message) });
  const remove = trpc.parent.removeParent.useMutation({ onSuccess: () => { toast.success("Veli erişimi kaldırıldı."); refresh(); }, onError: (error) => toast.error(error.message) });

  const rows = links.data ?? [];
  const pending = rows.filter((row) => row.status === "pending");
  const active = rows.filter((row) => row.status === "active");
  const openInvite = rows.find((row) => row.status === "invited");
  const parentLabel = (row: { parentName: string | null; parentEmail: string | null }) => row.parentName || row.parentEmail || "Veli";
  const copy = (text: string) => { void navigator.clipboard?.writeText(text).then(() => toast.success("Kopyalandı.")).catch(() => toast.error("Kopyalanamadı; elle seçip kopyalayabilirsin.")); };
  const atLimit = pending.length + active.length >= MAX_PARENTS_PER_STUDENT;

  return (
    <div className="modal-backdrop" style={{ zIndex: 320 }} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal-card max-w-[480px]" role="dialog" aria-modal="true" aria-label="Veli erişimi">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-[13px] font-semibold text-brand">Ailenle paylaş</p><h2 className="mt-1 text-[20px] font-extrabold text-ink">Veli erişimi</h2></div>
          <button onClick={onClose} className="rounded-lg p-2 text-ink-4 hover:bg-paper" aria-label="Kapat"><X size={17} /></button>
        </div>

        {pending.map((row) => (
          <div key={row.id} className="mt-4 rounded-2xl border border-[#f3dc9b] bg-pencil-soft/60 p-4">
            <p className="text-[14px] font-bold text-ink">{parentLabel(row)} veli olarak bağlanmak istiyor</p>
            {row.parentEmail && row.parentName && <p className="mt-0.5 text-[12px] text-ink-3">{row.parentEmail}</p>}
            <p className="mt-2 text-[12.5px] leading-5 text-ink-2">Bu kişiyi tanıyorsan onayla. Onaylamazsan hiçbir bilgini göremez.</p>
            <div className="mt-3 flex gap-2">
              <button onClick={() => decide.mutate({ linkId: row.id, approve: true })} disabled={decide.isPending} className={primaryButton}><Check size={15} /> Onayla</button>
              <button onClick={() => decide.mutate({ linkId: row.id, approve: false })} disabled={decide.isPending} className={secondaryButton}>Reddet</button>
            </div>
          </div>
        ))}

        {active.length > 0 && (
          <div className="mt-4 rounded-2xl border border-rule p-4">
            <p className="flex items-center gap-2 text-[14px] font-bold text-ink"><ShieldCheck size={16} className="text-success" /> Bağlı veliler</p>
            <ul className="mt-2 divide-y divide-rule">
              {active.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="flex min-w-0 items-center gap-2 text-[13px] text-ink"><UserRound size={15} className="shrink-0 text-ink-4" /><span className="truncate">{parentLabel(row)}</span></span>
                  <button onClick={() => { if (window.confirm(`${parentLabel(row)} artık özetini göremesin mi?`)) remove.mutate({ linkId: row.id }); }} className="shrink-0 text-[12px] font-semibold text-danger hover:underline">Erişimi kaldır</button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-rule p-4">
          <p className="text-[13px] leading-6 text-ink-2">Velin bağlanınca şunları salt okunur görür:</p>
          <ul className="mt-1 space-y-1 text-[12.5px] text-ink-2">{PARENT_SEES.map((item) => <li key={item} className="flex gap-2"><Check size={14} className="mt-0.5 shrink-0 text-success" />{item}</li>)}</ul>
          <p className="mt-2 text-[12px] text-ink-3">{PARENT_NEVER_SEES}</p>

          {created ? (
            <div className="mt-4 rounded-xl bg-brand-soft p-3">
              <p className="text-[12px] text-ink-3">Veli kodun ({new Date(created.expiresAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long" })} tarihine kadar geçerli):</p>
              <p className="mt-1 flex items-center justify-between gap-2"><strong className="text-[22px] tracking-wider text-brand-strong" data-testid="parent-code">{created.code}</strong><button onClick={() => copy(created.code)} className="rounded-lg p-2 text-brand hover:bg-white" aria-label="Kodu kopyala"><Copy size={16} /></button></p>
              <button onClick={() => copy(created.joinUrl)} className="mt-1 flex items-center gap-1.5 text-[12.5px] font-semibold text-brand hover:underline"><Copy size={13} /> Bağlantıyı kopyala</button>
              <p className="mt-2 text-[12px] leading-5 text-ink-3">Velin pusula sitesinde <strong>/veli</strong> sayfasını açıp bu kodu girer; sonra isteğini burada onaylarsın.</p>
            </div>
          ) : atLimit ? (
            <p className="mt-4 text-[12.5px] text-ink-3">En fazla {MAX_PARENTS_PER_STUDENT} veli bağlanabilir. Yeni kod için önce bir veli erişimini kaldır.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {openInvite && <p className="text-[12px] text-ink-3">Kullanılmamış bir kodun var; yeni kod üretirsen eskisi geçersiz olur.</p>}
              <label className="block"><span className="mb-1 block text-[12px] text-ink-4">Velinin e-postası (isteğe bağlı: daveti biz göndeririz)</span><input type="email" value={parentEmail} onChange={(event) => setParentEmail(event.target.value)} placeholder="ornek@eposta.com" className="form-input" /></label>
              <button onClick={() => createInvite.mutate({ parentEmail: parentEmail.trim() || undefined })} disabled={createInvite.isPending} className={`${primaryButton} w-full justify-center`}>
                {parentEmail.trim() ? <Mail size={15} /> : <KeyRound size={15} />} {createInvite.isPending ? "Hazırlanıyor…" : parentEmail.trim() ? "Kod üret ve veliye gönder" : "Veli kodu üret"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
