import { trpc } from "@/lib/trpc";
import { DIFFICULTIES, ERROR_TYPES, HINT_LEVEL_LABELS, QUESTION_STATUS_LABELS, REVIEW_INTERVALS_DAYS, aiSolutionToText, type Difficulty, type ErrorType } from "@shared/questionNotebook";
import { tierOfTag } from "@shared/solveRouting";
import { Camera, Loader2, Mic, RotateCcw, Sparkles, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AiSolutionSteps, useAiSolve } from "./AiSolution";
import NoteImageDialog from "./NoteImageDialog";
import { Chip } from "./QuestionCapture";
import SimilarQuestion from "./SimilarQuestion";
import VoiceRecorder from "./VoiceRecorder";
import { attachmentUrl, formatDuration } from "./nodes";
import { useCurriculumTopics } from "./useNotebookData";

const RESULT_LABEL = { solved: "✅ Çözdü", partial: "🟡 Kısmen", failed: "❌ Çözemedi" } as const;
export const statusTone = { unsolved: "bg-danger-soft text-danger", learning: "bg-warn-soft text-warn", mastered: "bg-success-soft text-success" } as const;

/** Bir notun soru kartını açar (takvim / not listesi gibi not üzerinden gelen girişler için). */
export function QuestionByNote({ noteId, onClose, onReview }: { noteId: number; onClose: () => void; onReview: (id: number) => void }) {
  const lookup = trpc.questions.byNote.useQuery({ noteId }, { retry: false });
  if (lookup.data?.id) return <QuestionDetail id={lookup.data.id} onClose={onClose} onReview={onReview} />;
  if (lookup.data && !lookup.data.id) return <div className="modal-backdrop" style={{ zIndex: 300 }}><div className="modal-card max-w-[380px] text-center"><p className="text-[14px] text-ink-2">Bu soru kartı bulunamadı.</p><button onClick={onClose} className="mt-4 h-10 rounded-xl border border-ink/10 px-4 text-[13px] font-semibold">Kapat</button></div></div>;
  return <div className="modal-backdrop" style={{ zIndex: 300 }}><Loader2 className="animate-spin text-white" size={28} /></div>;
}

/**
 * Soru kartı: fotoğraf, takıldığı yer, çözüm notu, ders/konu, hata türü,
 * zorluk, tekrar basamağı ve geçmiş. Değişiklikler "Kaydet" ile gider; kartın
 * not içeriği sunucuda bu alanlardan yeniden üretilir.
 */
export default function QuestionDetail({ id, onClose, onReview }: { id: number; onClose: () => void; onReview: (id: number) => void }) {
  const utils = trpc.useUtils();
  const question = trpc.questions.get.useQuery({ id }, { retry: false });
  const { topics, subjects } = useCurriculumTopics();
  const update = trpc.questions.update.useMutation();
  const remove = trpc.questions.delete.useMutation();
  const [form, setForm] = useState<{ subject: string; topicId: number | null; stuckPoint: string; solutionText: string; solutionImageId: number | null; errorType: ErrorType | null; difficulty: Difficulty | null } | null>(null);
  const [dialog, setDialog] = useState<null | "solutionPhoto" | "solutionVoice">(null);
  // Kayıtlı çözüm kapalı açılır: öğrenci önce kendi denesin.
  const [showSolution, setShowSolution] = useState(false);
  const solver = useAiSolve(id, () => setShowSolution(true));

  type Loaded = NonNullable<typeof question.data>;
  const formFrom = (data: Loaded) => ({ subject: data.subject ?? "", topicId: data.topicId, stuckPoint: data.stuckPoint ?? "", solutionText: data.solutionText ?? "", solutionImageId: data.solutionImageId, errorType: data.errorType, difficulty: data.difficulty });
  useEffect(() => {
    if (question.data && !form) setForm(formFrom(question.data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.data, form]);

  if (question.isError) return <div className="modal-backdrop" style={{ zIndex: 300 }}><div className="modal-card max-w-[380px] text-center"><p className="text-[14px] text-danger">{question.error.message}</p><button onClick={onClose} className="mt-4 h-10 rounded-xl border border-ink/10 px-4 text-[13px] font-semibold">Kapat</button></div></div>;
  if (!question.data || !form) return <div className="modal-backdrop" style={{ zIndex: 300 }}><Loader2 className="animate-spin text-white" size={28} /></div>;
  const data = question.data;

  const dirty = form.subject !== (data.subject ?? "") || form.topicId !== data.topicId || form.stuckPoint !== (data.stuckPoint ?? "") || form.solutionText !== (data.solutionText ?? "") || form.solutionImageId !== data.solutionImageId || form.errorType !== data.errorType || form.difficulty !== data.difficulty;
  const patch = (value: Partial<typeof form>) => setForm({ ...form, ...value });
  const subjectTopics = topics.filter((topic) => !form.subject || topic.subject === form.subject);
  const solvedTier = tierOfTag(data.aiSolutionModel);
  const solvedByStrong = solvedTier === "strong";

  const save = async () => {
    try {
      const updated = await update.mutateAsync({ id, subject: form.subject || null, topicId: form.topicId, stuckPoint: form.stuckPoint, solutionText: form.solutionText, solutionImageId: form.solutionImageId, errorType: form.errorType, errorTypeSource: form.errorType === data.errorType ? data.errorTypeSource : "student", difficulty: form.difficulty });
      utils.questions.get.setData({ id }, updated);
      setForm(formFrom(updated));
      void utils.questions.invalidate();
      void utils.notes.list.invalidate();
      toast.success("Soru kartı güncellendi.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kaydedilemedi.");
    }
  };

  const destroy = async () => {
    if (!window.confirm("Bu soru kartı, fotoğrafları ve tekrar geçmişi silinsin mi? Bu işlem geri alınamaz.")) return;
    try {
      await remove.mutateAsync({ id });
      void utils.questions.invalidate();
      void utils.notes.list.invalidate();
      void utils.notes.calendar.invalidate();
      toast.success("Soru silindi.");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Silinemedi.");
    }
  };

  const addToNote = () => {
    if (!data.aiSolution) return;
    patch({ solutionText: [form.solutionText.trim(), aiSolutionToText(data.aiSolution)].filter(Boolean).join("\n\n").slice(0, 4000) });
    toast.success("Çözüm notuna eklendi — kendi cümlelerinle düzenleyip kaydet.");
  };

  const markStuck = (stepIndex: number) => {
    const step = data.aiSolution?.steps[stepIndex];
    if (!step) return;
    patch({ stuckPoint: [form.stuckPoint.trim(), `Adım ${stepIndex + 1}: ${step.work}`].filter(Boolean).join("\n").slice(0, 4000) });
    toast.success("Takıldığın adım karta yazıldı. Hata türünü de seçip kaydet.");
  };

  const close = () => { if (dirty && !window.confirm("Kaydedilmemiş değişiklikler var. Yine de kapatılsın mı?")) return; onClose(); };
  const nextReview = data.nextReviewAt ? new Date(data.nextReviewAt).toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" }) : null;

  return (
    <div className="fixed inset-0 z-[300] flex items-stretch justify-center bg-ink/40 sm:p-4" role="dialog" aria-modal="true" aria-label="Soru kartı">
      <div className="flex w-full max-w-2xl flex-col overflow-hidden bg-white sm:rounded-3xl sm:shadow-2xl">
        <div className="flex items-center gap-2 border-b border-ink/[0.07] px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-semibold text-ink">❓ {[data.subject, data.topic].filter(Boolean).join(" · ") || "Soru"}</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12px]">
              <span className={`rounded-full px-2 py-0.5 font-semibold ${statusTone[data.status]}`}>{QUESTION_STATUS_LABELS[data.status]}</span>
              {data.status !== "mastered" && <span className="text-ink-3">Basamak {Math.min(data.reviewStage + 1, REVIEW_INTERVALS_DAYS.length)}/{REVIEW_INTERVALS_DAYS.length}{nextReview ? ` · sonraki tekrar ${nextReview}` : ""}</span>}
            </div>
          </div>
          <button onClick={() => onReview(id)} className="flex h-9 items-center gap-1.5 rounded-xl bg-brand px-3 text-[12px] font-semibold text-white"><RotateCcw size={14} /> Şimdi tekrar çöz</button>
          <button onClick={close} className="rounded-lg p-2 text-ink-3 hover:bg-paper" aria-label="Kapat"><X size={18} /></button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {data.questionImageId && <a href={attachmentUrl(data.questionImageId)} target="_blank" rel="noreferrer"><img src={attachmentUrl(data.questionImageId)} alt="Soru fotoğrafı" className="mx-auto max-h-[40vh] rounded-2xl border border-ink/10 object-contain" /></a>}

          <label className="block">
            <span className="form-label">❓ Takıldığım yer</span>
            {data.voiceAttachmentId && <audio controls src={attachmentUrl(data.voiceAttachmentId)} className="mb-2 h-9 w-full" aria-label={`Ses kaydı ${formatDuration(data.voiceDuration ?? 0)}`} />}
            <textarea value={form.stuckPoint} onChange={(event) => patch({ stuckPoint: event.target.value })} maxLength={4000} rows={2} className="form-input min-h-[64px] py-2" />
          </label>

          <div>
            <span className="form-label">🗣️ Çözüm notum</span>
            <div className="relative">
              <textarea value={form.solutionText} onChange={(event) => patch({ solutionText: event.target.value })} maxLength={4000} rows={3} placeholder="Çözümü anladığında buraya yaz ya da söyle…" className="form-input min-h-[84px] py-2 pr-12" aria-label="Çözüm notu" />
              <button type="button" onClick={() => setDialog("solutionVoice")} className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-xl bg-danger text-white" aria-label="Çözümü sesle anlat"><Mic size={16} /></button>
            </div>
            <div className="mt-2">
              {form.solutionImageId
                ? <div className="flex items-center gap-2"><img src={attachmentUrl(form.solutionImageId)} alt="Çözüm fotoğrafı" className="h-20 rounded-lg border border-ink/10" /><button onClick={() => patch({ solutionImageId: null })} className="text-[12px] font-semibold text-ink-3">Kaldır</button></div>
                : <button type="button" onClick={() => setDialog("solutionPhoto")} className="flex h-9 items-center gap-1.5 rounded-lg border border-ink/10 px-3 text-[12px] font-semibold text-ink-2"><Camera size={14} /> Çözüm fotoğrafı ekle</button>}
            </div>
          </div>

          <div className="rounded-2xl border border-violet/20 bg-violet-soft/40 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[13px] font-semibold text-ink">✨ Adım adım çözüm</span>
              {data.aiSolution && (
                <div className="flex gap-1.5">
                  <button type="button" onClick={addToNote} className="h-8 rounded-lg bg-white px-2.5 text-[12px] font-semibold text-ink-2 shadow-sm">Çözüm notuma ekle</button>
                  <button type="button" onClick={() => void solver.run()} disabled={solver.pending} className="flex h-8 items-center gap-1 rounded-lg px-2.5 text-[12px] font-semibold text-violet disabled:opacity-50">{solver.pending && <Loader2 size={12} className="animate-spin" />} Yeniden çöz</button>
                </div>
              )}
            </div>
            {data.aiSolution ? (
              showSolution
                ? <div className="mt-3">
                    <AiSolutionSteps solution={data.aiSolution} onStuck={markStuck} />
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-violet/15 pt-2 text-[12px]">
                      <span className="text-ink-3">{solvedByStrong ? "Güçlü model çözdü" : solvedTier === "light" ? "Hızlı model çözdü" : "AI çözdü"} · AI hata yapabilir, sonucu kontrol et.</span>
                      {!solvedByStrong && <button type="button" onClick={() => void solver.run(false, true)} disabled={solver.pending} className="flex items-center gap-1 font-semibold text-violet disabled:opacity-50">{solver.pending && <Loader2 size={12} className="animate-spin" />} Çözüm yanlış ya da anlaşılmadı mı? Daha güçlü modelle çöz</button>}
                    </div>
                  </div>
                : <button type="button" onClick={() => setShowSolution(true)} className="mt-2 text-[13px] font-semibold text-violet">Kayıtlı çözümü göster</button>
            ) : (
              <div className="mt-2">
                <p className="text-[12px] text-ink-3">{data.questionImageId ? "Takıldığın soruyu AI bir öğretmen gibi adım adım, her adımın nedeniyle çözsün. Önce kendin denemen daha çok öğretir." : "Adım adım çözüm için kartta soru fotoğrafı olmalı."}</p>
                {data.questionImageId && <button type="button" onClick={() => void solver.run()} disabled={solver.pending} className="mt-2 flex h-9 items-center gap-1.5 rounded-xl bg-violet px-3 text-[13px] font-semibold text-white disabled:opacity-60">{solver.pending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} {solver.pending ? "Çözülüyor…" : "Adım adım çöz"}</button>}
              </div>
            )}
          </div>

          <SimilarQuestion id={data.id} hasPhoto={Boolean(data.questionImageId)} />

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-[12px]"><span className="form-label">Ders</span>
              <select value={form.subject} onChange={(event) => patch({ subject: event.target.value, topicId: null })} className="form-input h-10"><option value="">Ders yok</option>{subjects.map((item) => <option key={item} value={item}>{item}</option>)}</select>
            </label>
            <label className="block text-[12px]"><span className="form-label">Konu</span>
              <select value={form.topicId ?? ""} onChange={(event) => { const topicId = event.target.value ? Number(event.target.value) : null; const topic = topics.find((item) => item.id === topicId); patch({ topicId, subject: topic?.subject ?? form.subject }); }} className="form-input h-10"><option value="">Konu seç…</option>{subjectTopics.map((topic) => <option key={topic.id} value={topic.id}>{form.subject ? "" : `${topic.subject} · `}{topic.topic}</option>)}</select>
            </label>
          </div>

          <div>
            <span className="form-label">Muhtemel hata türü {data.errorTypeSource === "ai" && form.errorType === data.errorType && <span className="font-normal text-violet">· ✨ AI önerisi</span>}</span>
            <div className="flex flex-wrap gap-1.5">{(Object.keys(ERROR_TYPES) as ErrorType[]).map((key) => <Chip key={key} active={form.errorType === key} onClick={() => patch({ errorType: form.errorType === key ? null : key })}>{ERROR_TYPES[key].icon} {ERROR_TYPES[key].label}</Chip>)}</div>
          </div>
          <div>
            <span className="form-label">Zorluk</span>
            <div className="flex flex-wrap gap-1.5">{(Object.keys(DIFFICULTIES) as Difficulty[]).map((key) => <Chip key={key} active={form.difficulty === key} onClick={() => patch({ difficulty: form.difficulty === key ? null : key })}>{DIFFICULTIES[key]}</Chip>)}</div>
          </div>

          {data.attempts.length > 0 && (
            <div>
              <span className="form-label">Tekrar geçmişi</span>
              <ol className="space-y-1 text-[13px] text-ink-2">
                {data.attempts.map((item, index) => <li key={index} className="flex justify-between rounded-lg bg-paper px-3 py-1.5"><span>{RESULT_LABEL[item.result]}{item.sawSolution ? " · çözüme bakarak" : item.hintLevel ? ` · ${HINT_LEVEL_LABELS[item.hintLevel]}` : ""}</span><span className="text-ink-4">{new Date(item.attemptedAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}</span></li>)}
              </ol>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-ink/[0.07] px-4 py-3">
          <button onClick={() => void destroy()} disabled={remove.isPending} className="flex h-10 items-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold text-danger hover:bg-danger-soft"><Trash2 size={14} /> Sil</button>
          <button onClick={() => void save()} disabled={!dirty || update.isPending} className="flex h-10 items-center gap-2 rounded-xl bg-ink px-5 text-[13px] font-semibold text-white disabled:opacity-40">{update.isPending && <Loader2 size={14} className="animate-spin" />} Kaydet</button>
        </div>
      </div>

      {solver.consentDialog}
      {dialog === "solutionPhoto" && <NoteImageDialog confirmLabel="Çözümü ekle" onClose={() => setDialog(null)} onDone={(attachmentId) => { setDialog(null); patch({ solutionImageId: attachmentId }); }} />}
      {dialog === "solutionVoice" && <VoiceRecorder offerKeepAudio={false} onClose={() => setDialog(null)} onDone={(result) => { setDialog(null); patch({ solutionText: [form.solutionText.trim(), result.text].filter(Boolean).join(" ") }); }} />}
    </div>
  );
}
