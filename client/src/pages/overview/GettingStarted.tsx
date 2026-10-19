import { useAuth } from "@/_core/hooks/useAuth";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { isIos, useInstallPrompt } from "@/lib/installPrompt";
import { trpc } from "@/lib/trpc";
import type { DashboardSection, MockExam } from "@shared/yksData";
import { Check, ChevronRight, Compass, PlayCircle, X } from "lucide-react";
import { useState } from "react";
import { Bar100 } from "@/components/app/kit";

export const GUIDE_VIDEO_SRC = "/videos/pusula-nasil-kullanilir.mp4";

const hiddenKey = (userId: number) => `pusula-guide-hidden:${userId}`;
const readHidden = (userId: number) => { try { return localStorage.getItem(hiddenKey(userId)) === "1"; } catch { return false; } };
const writeHidden = (userId: number) => { try { localStorage.setItem(hiddenKey(userId), "1"); } catch { /* gizli pencere: yalnızca bu oturumda gizlenir */ } };

type Step = { key: string; title: string; why: string; done: boolean; action: string; onClick: () => void };

/** Yeni öğrenciye Pusula'yı verimli kullanmanın ilk adımları; adımlar gerçek veriden işaretlenir. */
export function GettingStarted({ exams, onSection, onStartSession }: { exams: MockExam[]; onSection: (section: DashboardSection) => void; onStartSession: () => void }) {
  const { user } = useAuth();
  const schedule = trpc.classSchedule.get.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const calendar = trpc.calendar.snapshot.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const review = trpc.questions.summary.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const { install, installed } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);
  const hidden = dismissed || (user ? readHidden(user.id) : true);
  const [showVideo, setShowVideo] = useState(false);
  const [showInstallHelp, setShowInstallHelp] = useState(false);

  if (!user || hidden || schedule.isLoading || calendar.isLoading || review.isLoading) return null;

  const totals = review.data?.totals;
  const steps: Step[] = [
    { key: "schedule", title: "Okul ve dershane saatlerini gir", why: "Plan yalnızca gerçekten boş olduğun saatlere yerleşir.", done: (schedule.data?.blocks.length ?? 0) > 0, action: "Takvim'e git", onClick: () => onSection("calendar") },
    { key: "exam", title: "Son denemeni ekle", why: "Zayıf konuların denemelerden çıkar; koç buna göre önerir.", done: exams.length > 0, action: "Deneme ekle", onClick: () => onSection("exams") },
    { key: "plan", title: "AI ile haftalık planını oluştur", why: "Haftalık süren günlere küçük oturumlar olarak dağıtılır.", done: (calendar.data?.plans.length ?? 0) > 0, action: "AI Planım", onClick: () => onSection("plan") },
    { key: "focus", title: "İlk odak oturumunu tamamla", why: "Süre, soru ve doğruluk konu günlüğüne kendiliğinden işlenir.", done: (calendar.data?.logs.length ?? 0) > 0, action: "Oturum başlat", onClick: onStartSession },
    { key: "notebook", title: "Yapamadığın bir soruyu deftere ekle", why: "Soru, unutmadan önce tekrar listene geri gelir.", done: Boolean(totals && totals.unsolved + totals.learning + totals.mastered > 0), action: "Soru Defterim", onClick: () => onSection("notebook") },
    { key: "install", title: "Pusula'yı telefonuna yükle", why: "Ana ekrandan tek dokunuşla, uygulama gibi açılır.", done: installed, action: "Yükle", onClick: () => (install ? void install() : setShowInstallHelp(true)) },
  ];
  const doneCount = steps.filter((step) => step.done).length;
  if (doneCount === steps.length) return null;
  const hide = () => { writeHidden(user.id); setDismissed(true); };

  return (
    <section className="soft-card p-5" aria-labelledby="guide-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 id="guide-title" className="flex items-center gap-2.5 text-[15px] font-bold text-ink"><span className="text-brand"><Compass size={18} /></span>Pusula'yı verimli kullanmanın 6 adımı</h2>
          <p className="mt-1 text-[12px] text-ink-3">Her adım tamamladığında kendiliğinden işaretlenir. {doneCount} / {steps.length} tamam.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button onClick={() => setShowVideo(true)} className="inline-flex h-9 items-center gap-2 rounded-xl bg-brand px-3 text-[13px] font-semibold text-white hover:bg-brand-strong"><PlayCircle size={16} /> Videoyu izle</button>
          <button onClick={hide} aria-label="Rehberi gizle" title="Rehberi gizle" className="rounded-lg p-2 text-ink-4 hover:bg-paper hover:text-ink-2"><X size={16} /></button>
        </div>
      </div>
      <div className="mt-3"><Bar100 value={(doneCount / steps.length) * 100} /></div>
      <ol className="mt-4 grid gap-2 md:grid-cols-2">
        {steps.map((step, index) => (
          <li key={step.key} className={`flex items-center gap-3 rounded-xl border p-3 ${step.done ? "border-success/20 bg-success-soft/40" : "border-rule bg-white"}`}>
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${step.done ? "bg-success text-white" : "bg-brand-soft text-brand"}`}>{step.done ? <Check size={14} /> : index + 1}</span>
            <div className="min-w-0 flex-1">
              <div className={`text-[13px] font-semibold ${step.done ? "text-ink-3 line-through decoration-ink-4/40" : "text-ink"}`}>{step.title}</div>
              {!step.done && <div className="mt-0.5 text-[12px] leading-5 text-ink-3">{step.why}</div>}
            </div>
            {!step.done && <button onClick={step.onClick} className="inline-flex shrink-0 items-center gap-0.5 text-[12px] font-semibold text-brand hover:text-brand-strong">{step.action}<ChevronRight size={14} /></button>}
          </li>
        ))}
      </ol>
      {showVideo && (
        <Dialog open onOpenChange={(open) => !open && setShowVideo(false)}>
          <DialogContent className="sm:max-w-3xl">
            <DialogTitle>Pusula'yı verimli kullanmak</DialogTitle>
            <DialogDescription>Birkaç dakikada günlük akış: plan, odak oturumu, deneme ve soru defteri.</DialogDescription>
            <video src={GUIDE_VIDEO_SRC} controls autoPlay playsInline className="w-full rounded-xl bg-ink" />
          </DialogContent>
        </Dialog>
      )}
      {showInstallHelp && (
        <Dialog open onOpenChange={(open) => !open && setShowInstallHelp(false)}>
          <DialogContent className="sm:max-w-md">
            <DialogTitle>Telefonuna yükle</DialogTitle>
            <DialogDescription>Pusula'yı ana ekranına ekleyince uygulama gibi açılır.</DialogDescription>
            <ol className="list-decimal space-y-2 pl-5 text-[14px] leading-6 text-ink-2">
              {isIos()
                ? <><li>Safari'de alttaki <strong>Paylaş</strong> düğmesine dokun.</li><li><strong>Ana Ekrana Ekle</strong>'yi seç.</li><li>Sağ üstteki <strong>Ekle</strong>'ye dokun.</li></>
                : <><li>Pusula'yı telefonunda Chrome ile aç.</li><li>Sağ üstteki <strong>⋮</strong> menüsüne dokun.</li><li><strong>Ana ekrana ekle</strong> ya da <strong>Uygulamayı yükle</strong>'yi seç.</li></>}
            </ol>
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
}
