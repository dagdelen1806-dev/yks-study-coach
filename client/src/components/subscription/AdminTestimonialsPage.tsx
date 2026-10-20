import { useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, Star, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { TESTIMONIAL_STATUS_LABELS, type TestimonialStatus } from "@shared/testimonials";

/** Öğrenci yorumları: onaylananlar tanıtım sayfasında yayınlanır; ilk onayla birlikte örnek yorumlar kalkar. */
export default function AdminTestimonialsPage() {
  const [status, setStatus] = useState<TestimonialStatus>("pending");
  const utils = trpc.useUtils();
  const list = trpc.admin.testimonials.list.useQuery({ status });
  const review = trpc.admin.testimonials.review.useMutation({
    onSuccess: (_, input) => { toast.success(input.status === "approved" ? "Yorum yayında." : "Yorum yayından kaldırıldı."); utils.admin.testimonials.list.invalidate(); },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-ink-3">Öğrencilerin profil menüsündeki "Yorum bırak"tan gönderdiği yorumlar. Onaylananlar tanıtım sayfasında görünür; onaylı yorum yokken orada "örnek" etiketli yorumlar durur.</p>
        <div className="flex gap-1 rounded-xl bg-paper p-1">
          {(Object.keys(TESTIMONIAL_STATUS_LABELS) as TestimonialStatus[]).map((key) => <button key={key} onClick={() => setStatus(key)} className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold ${status === key ? "bg-white text-ink shadow-sm" : "text-ink-3"}`}>{TESTIMONIAL_STATUS_LABELS[key]}</button>)}
        </div>
      </div>
      {list.isLoading ? <Card className="soft-card p-10"><div className="flex justify-center"><Loader2 className="animate-spin text-brand" size={22} /></div></Card>
        : !list.data?.length ? <Card className="soft-card p-8 text-center text-[13px] text-ink-3">Bu durumda yorum yok.</Card>
        : list.data.map((item) => (
          <Card key={item.id} className="soft-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-ink">{item.displayName}{item.detail && <span className="font-normal text-ink-3"> · {item.detail}</span>}</p>
                <p className="mt-0.5 text-[12px] text-ink-4">{item.userName ?? "—"} · {item.userEmail ?? "e-posta yok"} · {new Date(item.updatedAt).toLocaleString("tr-TR")}</p>
              </div>
              <div className="flex gap-0.5" aria-label={`${item.rating} yıldız`}>{[1, 2, 3, 4, 5].map((value) => <Star key={value} size={15} className={value <= item.rating ? "fill-[var(--pencil)] text-[var(--pencil)]" : "text-ink-4"} />)}</div>
            </div>
            <p className="mt-3 whitespace-pre-line text-[14px] leading-6 text-ink-2">{item.body}</p>
            <div className="mt-4 flex justify-end gap-2">
              {item.status !== "rejected" && <button onClick={() => review.mutate({ id: item.id, status: "rejected" })} disabled={review.isPending} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-ink/10 px-3 text-[13px] font-semibold text-ink-2 hover:bg-paper"><X size={14} /> {item.status === "approved" ? "Yayından kaldır" : "Reddet"}</button>}
              {item.status !== "approved" && <button onClick={() => review.mutate({ id: item.id, status: "approved" })} disabled={review.isPending} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand px-3 text-[13px] font-semibold text-white"><Check size={14} /> Onayla ve yayınla</button>}
            </div>
          </Card>
        ))}
    </div>
  );
}
