import { trpc } from "@/lib/trpc";
import { ROLE_LABELS, isStaffRole } from "@shared/org";
import { Building2, Check, FileText, LogOut, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { primaryButton, secondaryButton } from "./kit";

/** Kurum Paneli'nin gördüğü veriler; öğrenci katılmadan önce bunu okur ve onaylar. */
const SHARED_DATA = [
  "Deneme sonuçların (netler, konu bazında doğru/yanlış/boş)",
  "Konu durumun (hangi konular iyi, hangileri tekrar istiyor)",
  "Takvimdeki planın, tamamladığın görevler ve çalışma süren",
  "Profilindeki hedef bilgisi (sınıf, puan türü, hedef bölüm)",
];
const NOT_SHARED = "Notların, soru defterin, fotoğrafların, sesli notların ve iletişim bilgilerin paylaşılmaz.";

/** "Kurumum": davet koduyla kuruma katıl (açık onayla), bağlı kurumu gör, istediğin an ayrıl. */
export default function MyOrganizationDialog({ onClose }: { onClose: () => void }) {
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const memberships = trpc.org.mine.useQuery(undefined, { retry: false });
  const [showKvkkFor, setShowKvkkFor] = useState<number | null>(null);
  const myKvkk = trpc.org.myKvkk.useQuery({ orgId: showKvkkFor ?? 0 }, { enabled: showKvkkFor !== null, retry: false });
  const leave = trpc.org.leave.useMutation({ onSuccess: () => { toast.success("Kurumdan ayrıldın; verilerin artık kurumla paylaşılmıyor."); utils.org.mine.invalidate(); utils.org.myFeedback.invalidate(); }, onError: (error) => toast.error(error.message) });
  const studentOrgs = (memberships.data ?? []).filter((membership) => membership.role === "student");
  const staffOrgs = (memberships.data ?? []).filter((membership) => isStaffRole(membership.role));

  return (
    <div className="modal-backdrop" style={{ zIndex: 320 }} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal-card max-w-[480px]" role="dialog" aria-modal="true" aria-label="Kurumum">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-[13px] font-semibold text-brand">Dershane / okul</p><h2 className="mt-1 text-[20px] font-extrabold text-ink">Kurumum</h2></div>
          <button onClick={onClose} className="rounded-lg p-2 text-ink-4 hover:bg-paper" aria-label="Kapat"><X size={17} /></button>
        </div>

        {studentOrgs.map((membership) => (
          <div key={membership.orgId} className="mt-4 rounded-2xl border border-rule p-4">
            <p className="flex items-center gap-2 text-[15px] font-bold text-ink"><Building2 size={17} className="text-brand" /> {membership.orgName}</p>
            <p className="mt-2 text-[13px] leading-6 text-ink-2">Bu kurum, verdiğin onayla şunları görebiliyor:</p>
            <ul className="mt-1 space-y-1 text-[12.5px] text-ink-2">{SHARED_DATA.map((item) => <li key={item} className="flex gap-2"><Check size={14} className="mt-0.5 shrink-0 text-success" />{item}</li>)}</ul>
            <p className="mt-2 text-[12px] text-ink-3">{NOT_SHARED}</p>
            <button onClick={() => setShowKvkkFor(showKvkkFor === membership.orgId ? null : membership.orgId)} className="mt-3 flex items-center gap-1.5 text-[12.5px] font-semibold text-brand hover:underline"><FileText size={14} /> {showKvkkFor === membership.orgId ? "KVKK metinlerini gizle" : "KVKK metinlerini gör"}</button>
            {showKvkkFor === membership.orgId && myKvkk.data && (
              <div className="mt-2 space-y-2">
                <p className="text-[12px] text-ink-3">{myKvkk.data.acceptedVersion ? `Sürüm ${myKvkk.data.acceptedVersion} onaylandı${myKvkk.data.consentAt ? ` · ${new Date(myKvkk.data.consentAt).toLocaleDateString("tr-TR")}` : ""}` : "Bu üyelik KVKK sürüm kaydından önce açıldı."}{myKvkk.data.acceptedVersion && myKvkk.data.acceptedVersion !== myKvkk.data.version ? ` · Kurum metni güncellendi (sürüm ${myKvkk.data.version}).` : ""}</p>
                <div className="max-h-[220px] overflow-y-auto whitespace-pre-line rounded-xl border border-rule bg-paper/50 p-3 text-[12px] leading-5 text-ink-2">{myKvkk.data.notice}{"\n\n"}{myKvkk.data.consent}</div>
              </div>
            )}
            <button onClick={() => { if (window.confirm(`${membership.orgName} kurumundan ayrılmak istediğine emin misin? Kurum verilerini artık göremez.`)) leave.mutate({ orgId: membership.orgId }); }} disabled={leave.isPending} className={`${secondaryButton} mt-3`}><LogOut size={15} /> Kurumdan ayrıl</button>
          </div>
        ))}

        {staffOrgs.length > 0 && (
          <div className="mt-4 rounded-2xl border border-rule bg-paper/60 p-4">
            <p className="text-[13px] text-ink-2">{staffOrgs.map((membership) => `${membership.orgName} · ${ROLE_LABELS[membership.role]}`).join(", ")}</p>
            <button onClick={() => { onClose(); setLocation("/kurum"); }} className={`${primaryButton} mt-3`}><Building2 size={15} /> Kurum Paneli'ni aç</button>
          </div>
        )}

        {studentOrgs.length === 0 && (
          <div className="mt-4">
            <p className="text-[13px] leading-6 text-ink-2">Dershanen ya da okulun sana bir davet kodu verdiyse buraya gir. Katılmadan önce kurumun neleri göreceğini göreceksin.</p>
            <JoinWithCode />
          </div>
        )}
      </div>
    </div>
  );
}

/** Davet kodu → kurum önizlemesi → onay → katıl. "Kurumum" penceresinde ve Kurum Paneli'nin
 * "henüz personel değilsin" ekranında kullanılır; personel kodu girenler Kurum Paneli'ne gider. */
export function JoinWithCode() {
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const [code, setCode] = useState("");
  const [preview, setPreview] = useState<{ orgName: string; role: string; kvkk: { version: number; notice: string; consent: string } | null } | null>(null);
  const [consent, setConsent] = useState(false);
  const [noticeRead, setNoticeRead] = useState(false);
  const check = trpc.org.previewInvitation.useMutation({ onSuccess: (result) => { setPreview(result); setConsent(false); setNoticeRead(false); }, onError: (error) => toast.error(error.message) });
  const join = trpc.org.join.useMutation({ onSuccess: (result) => { toast.success(`${result.orgName} kurumuna katıldın.`); setCode(""); setPreview(null); utils.org.mine.invalidate(); utils.org.myFeedback.invalidate(); if (result.role !== "student") setLocation("/kurum"); }, onError: (error) => toast.error(error.message) });
  return (
          <>
            {!preview ? (
              <div className="mt-3 flex gap-2">
                <input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} maxLength={12} placeholder="ABCD-EFGH" aria-label="Davet kodu" className="form-input flex-1 text-center text-[16px] font-bold tracking-[0.15em]" />
                <button onClick={() => code.trim().length >= 8 && check.mutate({ code: code.trim() })} disabled={check.isPending || code.trim().length < 8} className={primaryButton}>Devam</button>
              </div>
            ) : (
              <div className="mt-3 rounded-2xl border border-brand/25 bg-brand-soft/50 p-4">
                <p className="text-[15px] font-bold text-ink">{preview.orgName}</p>
                <p className="text-[12px] text-ink-3">{ROLE_LABELS[preview.role as keyof typeof ROLE_LABELS]} olarak katılacaksın.</p>
                {preview.role === "student" && <>
                  <p className="mt-3 text-[13px] text-ink-2">Katılırsan bu kurumun öğretmenleri şunları görebilir:</p>
                  <ul className="mt-1 space-y-1 text-[12.5px] text-ink-2">{SHARED_DATA.map((item) => <li key={item} className="flex gap-2"><Check size={14} className="mt-0.5 shrink-0 text-success" />{item}</li>)}</ul>
                  <p className="mt-2 text-[12px] text-ink-3">{NOT_SHARED} İstediğin zaman buradan ayrılabilirsin; ayrıldığın an erişim biter.</p>
                  {preview.kvkk && <>
                    <p className="mt-3 flex items-center gap-1.5 text-[12.5px] font-bold text-ink"><FileText size={14} /> KVKK Aydınlatma Metni</p>
                    <div className="mt-1 max-h-[200px] overflow-y-auto whitespace-pre-line rounded-xl border border-rule bg-white p-3 text-[12px] leading-5 text-ink-2" tabIndex={0} aria-label="KVKK aydınlatma metni">{preview.kvkk.notice}</div>
                    <label className="mt-2 flex items-start gap-2 text-[12.5px] font-semibold text-ink"><input type="checkbox" checked={noticeRead} onChange={(event) => setNoticeRead(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--brand)]" />Aydınlatma metnini okudum.</label>
                    <div className="mt-3 whitespace-pre-line rounded-xl border border-rule bg-white p-3 text-[12px] leading-5 text-ink-2">{preview.kvkk.consent}</div>
                  </>}
                </>}
                <label className="mt-3 flex items-start gap-2 text-[13px] font-semibold text-ink"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--brand)]" />{preview.role === "student" ? "Açık rıza metnini onaylıyor, verilerimin kurumla paylaşılmasına izin veriyorum." : "Bu kurumun personeli olarak katılıyorum."}</label>
                <div className="mt-3 flex justify-end gap-2">
                  <button onClick={() => setPreview(null)} className={secondaryButton}>Vazgeç</button>
                  <button onClick={() => join.mutate({ code: code.trim(), consent: true, kvkkVersion: preview.kvkk?.version })} disabled={!consent || (Boolean(preview.kvkk) && !noticeRead) || join.isPending} className={primaryButton}>{join.isPending ? "Katılınıyor…" : "Katıl"}</button>
                </div>
              </div>
            )}
          </>
  );
}
