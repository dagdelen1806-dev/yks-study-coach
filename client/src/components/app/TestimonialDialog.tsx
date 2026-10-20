import { trpc } from "@/lib/trpc";
import { TESTIMONIAL_LIMITS, TESTIMONIAL_STATUS_LABELS, suggestedDisplayName } from "@shared/testimonials";
import { MessageSquareQuote, Star, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { primaryButton, secondaryButton } from "./kit";

/** "Yorum bırak": öğrenci Pusula hakkındaki yorumunu yazar; admin onaylarsa tanıtım sayfasında görünür. */
export default function TestimonialDialog({ userName, onClose }: { userName: string | null | undefined; onClose: () => void }) {
  const utils = trpc.useUtils();
  const mine = trpc.testimonials.mine.useQuery(undefined, { retry: false });
  const [displayName, setDisplayName] = useState(() => suggestedDisplayName(userName));
  const [detail, setDetail] = useState("");
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  // Daha önce yazdıysa form onunla dolar; kaydetmek onu günceller ve yeniden onaya gönderir.
  useEffect(() => {
    if (!mine.data) return;
    setDisplayName(mine.data.displayName); setDetail(mine.data.detail ?? ""); setRating(mine.data.rating); setBody(mine.data.body);
  }, [mine.data]);
  const save = trpc.testimonials.save.useMutation({
    onSuccess: (row) => { utils.testimonials.mine.setData(undefined, row); toast.success("Teşekkürler! Yorumun onaylandıktan sonra tanıtım sayfasında görünecek."); onClose(); },
    // Doğrulama hatası mesajı JSON dizisi olarak gelir; ilk maddenin Türkçe açıklamasını göster.
    onError: (error) => {
      let message = error.message;
      try { message = (JSON.parse(error.message) as Array<{ message: string }>)[0]?.message ?? message; } catch {}
      toast.error(message || "Gönderilemedi, tekrar dener misin?");
    },
  });
  const remove = trpc.testimonials.remove.useMutation({ onSuccess: () => { utils.testimonials.mine.setData(undefined, null); toast.success("Yorumun kaldırıldı."); onClose(); } });
  const tooShort = body.trim().length < TESTIMONIAL_LIMITS.bodyMin;

  return (
    <div className="modal-backdrop" style={{ zIndex: 320 }} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal-card max-w-[480px]" role="dialog" aria-modal="true" aria-label="Yorum bırak">
        <div className="flex items-start justify-between gap-3">
          <div><p className="flex items-center gap-1.5 text-[13px] font-semibold text-brand"><MessageSquareQuote size={15} /> Öğrenci yorumları</p><h2 className="mt-1 text-[20px] font-extrabold text-ink">Pusula hakkında ne düşünüyorsun?</h2></div>
          <button onClick={onClose} className="rounded-lg p-2 text-ink-4 hover:bg-paper" aria-label="Kapat"><X size={17} /></button>
        </div>
        <p className="mt-2 text-[13px] leading-6 text-ink-3">Yorumun onaylanırsa tanıtım sayfasında, aşağıda yazdığın adla görünür. E-postan ve diğer bilgilerin paylaşılmaz.</p>
        {mine.data && <p className="mt-3 rounded-xl bg-paper px-3 py-2 text-[12.5px] text-ink-2">Durum: <b>{TESTIMONIAL_STATUS_LABELS[mine.data.status]}</b>. Değiştirirsen yorumun yeniden onaya gider.</p>}

        <div className="mt-4 space-y-3">
          <div>
            <p className="text-[13px] font-semibold text-ink">Puanın</p>
            <div className="mt-1 flex gap-1" role="radiogroup" aria-label="Puan">
              {[1, 2, 3, 4, 5].map((value) => (
                <button key={value} type="button" role="radio" aria-checked={rating === value} aria-label={`${value} yıldız`} onClick={() => setRating(value)} className="rounded-md p-1 hover:bg-paper">
                  <Star size={24} className={value <= rating ? "fill-[var(--pencil)] text-[var(--pencil)]" : "text-ink-4"} />
                </button>
              ))}
            </div>
          </div>
          <label className="block text-[13px] font-semibold text-ink">Görünecek adın
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={TESTIMONIAL_LIMITS.displayName} placeholder="Örn. Ece Y." className="form-input mt-1 font-normal" />
          </label>
          <label className="block text-[13px] font-semibold text-ink">Kısa bilgi <span className="font-normal text-ink-4">(isteğe bağlı)</span>
            <input value={detail} onChange={(event) => setDetail(event.target.value)} maxLength={TESTIMONIAL_LIMITS.detail} placeholder="Örn. 12. sınıf · Sayısal" className="form-input mt-1 font-normal" />
          </label>
          <label className="block text-[13px] font-semibold text-ink">Yorumun
            <textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={TESTIMONIAL_LIMITS.body} rows={4} placeholder="Pusula çalışmana nasıl yardımcı oldu?" className="form-input mt-1 h-auto py-2 font-normal leading-6" />
            <span className="mt-1 block text-right text-[11.5px] font-normal text-ink-4">{body.trim().length} / {TESTIMONIAL_LIMITS.body}</span>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          {mine.data ? <button onClick={() => { if (window.confirm("Yorumunu kaldırmak istediğine emin misin?")) remove.mutate(); }} disabled={remove.isPending} className={secondaryButton}><Trash2 size={15} /> Kaldır</button> : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className={secondaryButton}>Vazgeç</button>
            <button onClick={() => save.mutate({ displayName, detail, rating, body })} disabled={save.isPending || tooShort || displayName.trim().length < 2} className={primaryButton}>{save.isPending ? "Gönderiliyor…" : "Gönder"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
