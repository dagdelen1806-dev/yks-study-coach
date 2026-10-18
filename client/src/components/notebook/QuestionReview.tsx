import { trpc } from "@/lib/trpc";
import { ERROR_TYPES, HINT_LEVELS, MAX_QUESTIONS_PER_REVIEW, REVIEW_INTERVALS_DAYS, type AttemptResult } from "@shared/questionNotebook";
import { Eye, Footprints, Lightbulb, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AiSolutionSteps, useAiSolve } from "./AiSolution";
import { attachmentUrl } from "./nodes";

const RESULT_BUTTONS: Array<{ result: AttemptResult; label: string; className: string }> = [
  { result: "failed", label: "❌ Çözemedim", className: "border border-danger/30 bg-danger-soft text-danger" },
  { result: "partial", label: "🟡 Kısmen", className: "border border-warn-fill/40 bg-warn-soft text-warn" },
  { result: "solved", label: "✅ Çözdüm", className: "bg-success text-white" },
];

/**
 * 🔁 Tekrar çöz: önce yalnızca soru görünür; öğrenci dener, sonra sonucunu
 * işaretler. Takılırsa yardım kademeli açılır: 💡 ipucu → ilk adım → çözüm.
 * Yalnızca ipucuyla çözmek basamak ilerletir; ilk adımı ya da çözümü gördükten
 * sonra "Çözdüm" denese de basamak ilerlemez. Oturum bitince
 * bugünün "Defter Tekrarı" plan görevi varsa sonuçlarla tamamlanır.
 */
export default function QuestionReview({ questionIds, subject, onClose }: { questionIds?: number[]; subject?: string | null; onClose: () => void }) {
  const utils = trpc.useUtils();
  const due = trpc.questions.list.useQuery({ due: true, limit: MAX_QUESTIONS_PER_REVIEW, subject }, { enabled: !questionIds, retry: false, refetchOnWindowFocus: false });
  const single = trpc.questions.get.useQuery({ id: questionIds?.[0] ?? 0 }, { enabled: Boolean(questionIds?.length), retry: false, refetchOnWindowFocus: false });
  // Oturum başında liste sabitlenir: denenen kart "zamanı gelenler"den çıkınca sıra kaymasın.
  const [queue, setQueue] = useState<NonNullable<typeof due.data>["items"] | null>(null);
  const [index, setIndex] = useState(0);
  // Kademeli yardım: 0 yok → 1 ipucu → 2 ilk adım → 3 tam çözüm (HINT_LEVELS).
  const [hintLevel, setHintLevel] = useState<number>(HINT_LEVELS.none);
  const revealed = hintLevel >= HINT_LEVELS.solution;
  const [results, setResults] = useState<AttemptResult[]>([]);
  const [finished, setFinished] = useState<{ taskCompleted: boolean } | null>(null);
  const startedAt = useRef(Date.now());
  const questionStartedAt = useRef(Date.now());
  const attempt = trpc.questions.attempt.useMutation();
  const finish = trpc.questions.finishReview.useMutation();

  useEffect(() => {
    if (queue) return;
    if (questionIds && single.data) setQueue([single.data]);
    else if (!questionIds && due.data) setQueue(due.data.items);
  }, [questionIds, single.data, due.data, queue]);

  const current = queue?.[index] ?? null;
  // Kayıtlı AI çözümü yoksa ipucu için bir kez çözdürülür (karta kaydedilir); sonra kademeler ücretsiz açılır.
  const solver = useAiSolve(current?.id ?? null, (result) => {
    setQueue((items) => items?.map((item) => (item.id === current?.id ? { ...item, ...result } : item)) ?? items);
    setHintLevel((level) => Math.max(level, HINT_LEVELS.hint));
  });
  const aiSolution = current?.aiSolution ?? null;
  const loading = !queue && (due.isLoading || single.isLoading);
  const failedToLoad = !queue && (due.isError || single.isError);

  const complete = async (all: AttemptResult[]) => {
    const counts = { solved: all.filter((item) => item === "solved").length, partial: all.filter((item) => item === "partial").length, failed: all.filter((item) => item === "failed").length };
    let taskCompleted = false;
    // Günün "Defter Tekrarı" görevi tüm derslerin sorularını kapsar: yalnızca genel tekrar oturumu onu tamamlar.
    if (!questionIds && subject === undefined && all.length) {
      try { taskCompleted = (await finish.mutateAsync({ minutes: (Date.now() - startedAt.current) / 60_000, ...counts })).taskCompleted; } catch {}
    }
    void utils.questions.invalidate();
    void utils.calendar.snapshot.invalidate();
    setFinished({ taskCompleted });
  };

  const mark = async (result: AttemptResult) => {
    if (!current || attempt.isPending) return;
    try {
      await attempt.mutateAsync({ id: current.id, result, sawSolution: revealed, hintLevel, seconds: (Date.now() - questionStartedAt.current) / 1000 });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sonuç kaydedilemedi.");
      return;
    }
    const next = [...results, result];
    setResults(next);
    setHintLevel(HINT_LEVELS.none);
    questionStartedAt.current = Date.now();
    if (queue && index + 1 < queue.length) setIndex(index + 1);
    else await complete(next);
  };

  const close = () => {
    if (results.length && !finished) void complete(results);
    void utils.questions.invalidate();
    onClose();
  };

  const solved = results.filter((item) => item === "solved").length;

  return (
    <div className="fixed inset-0 z-[310] flex items-stretch justify-center bg-ink/50 sm:p-4" role="dialog" aria-modal="true" aria-label="Defterim tekrar oturumu">
      <div className="flex w-full max-w-2xl flex-col overflow-hidden bg-white sm:rounded-3xl sm:shadow-2xl">
        <div className="flex items-center justify-between border-b border-ink/[0.07] px-4 py-3">
          <div>
            <div className="text-[15px] font-semibold text-ink">🔁 Defterimden tekrar</div>
            {queue && !finished && <div className="text-[12px] text-ink-3">{Math.min(index + 1, queue.length)} / {queue.length} soru · önce çözümü görmeden dene</div>}
          </div>
          <button onClick={close} className="rounded-lg p-2 text-ink-3 hover:bg-paper" aria-label="Kapat"><X size={18} /></button>
        </div>
        {queue && !finished && <div className="h-1 bg-paper"><div className="h-1 bg-brand transition-all" style={{ width: `${(index / queue.length) * 100}%` }} /></div>}

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {loading && <div className="flex justify-center py-16"><Loader2 className="animate-spin text-brand" size={24} /></div>}
          {failedToLoad && <p className="rounded-xl bg-danger-soft p-4 text-[13px] text-danger">Sorular yüklenemedi. Bağlantını kontrol edip tekrar dener misin?</p>}
          {queue && queue.length === 0 && !finished && (
            <div className="py-12 text-center">
              <div className="text-[34px]" aria-hidden>🎉</div>
              <p className="mt-2 text-[15px] font-semibold text-ink">Bugün tekrar bekleyen soru yok.</p>
              <p className="mt-1 text-[13px] text-ink-3">Yeni çözemediğin soruları ekledikçe burada karşına çıkacaklar.</p>
            </div>
          )}

          {current && !finished && (
            <div>
              <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
                {(current.subject || current.topic) && <span className="rounded-full bg-brand-soft px-2 py-0.5 font-semibold text-brand">{[current.subject, current.topic].filter(Boolean).join(" · ")}</span>}
                <span className="rounded-full bg-paper px-2 py-0.5 text-ink-3">Basamak {Math.min(current.reviewStage + 1, REVIEW_INTERVALS_DAYS.length)}/{REVIEW_INTERVALS_DAYS.length}</span>
                {current.attemptCount > 0 && <span className="text-ink-4">{current.attemptCount}. tekrar</span>}
              </div>
              {current.questionImageId
                ? <img src={attachmentUrl(current.questionImageId)} alt="Soru" className="mx-auto mt-3 max-h-[46vh] rounded-2xl border border-ink/10 object-contain" />
                : <p className="mt-3 rounded-2xl bg-paper p-4 text-[14px] text-ink-2">Bu soruda fotoğraf yok — takıldığın yeri hatırla ve konuyu yeniden çöz.</p>}
              {current.stuckPoint && (
                <div className="mt-3 rounded-xl bg-warn-soft px-3 py-2 text-[13px] text-warn">
                  <span className="font-semibold">Geçen sefer burada takılmıştın:</span> “{current.stuckPoint}”
                  {current.errorType && <span className="mt-0.5 block text-[12px] opacity-80">{ERROR_TYPES[current.errorType].icon} {ERROR_TYPES[current.errorType].label}</span>}
                </div>
              )}

              {!revealed && hintLevel >= HINT_LEVELS.hint && aiSolution?.hint && (
                <div className="mt-3 rounded-xl border border-violet/20 bg-violet-soft p-3 text-[14px] text-ink-2"><span className="font-semibold text-violet">💡 İpucu:</span> {aiSolution.hint}</div>
              )}
              {!revealed && hintLevel >= HINT_LEVELS.firstStep && aiSolution?.steps[0] && (
                <div className="mt-2 rounded-xl border border-violet/20 bg-white p-3">
                  <div className="text-[11px] font-bold tracking-wide text-violet">ADIM 1</div>
                  <p className="mt-0.5 text-[14px] font-semibold text-ink">{aiSolution.steps[0].work}</p>
                  {aiSolution.steps[0].why && <p className="mt-0.5 text-[13px] text-ink-3">{aiSolution.steps[0].why}</p>}
                </div>
              )}

              {revealed ? (
                <div className="mt-3 space-y-3">
                  {(current.solutionText || current.solutionImageId || !aiSolution) && (
                    <div className="rounded-xl border border-success/25 bg-success-soft p-3">
                      <div className="text-[13px] font-semibold text-success">🗣️ Çözüm notun</div>
                      {current.solutionImageId && <img src={attachmentUrl(current.solutionImageId)} alt="Çözüm" className="mt-2 max-h-64 rounded-lg border border-ink/10" />}
                      <p className="mt-1 whitespace-pre-wrap text-[14px] text-ink-2">{current.solutionText || (current.solutionImageId ? "" : "Bu soruya henüz çözüm notu eklememişsin. Çözünce karttan ekleyebilirsin.")}</p>
                    </div>
                  )}
                  {aiSolution && <div className="rounded-xl border border-violet/20 p-3"><div className="mb-2 text-[13px] font-semibold text-violet">✨ Adım adım çözüm</div><AiSolutionSteps solution={aiSolution} /></div>}
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  {aiSolution ? (
                    <>
                      {hintLevel < HINT_LEVELS.hint && aiSolution.hint && <button onClick={() => setHintLevel(HINT_LEVELS.hint)} className="flex h-10 items-center gap-1.5 rounded-xl border border-violet/30 px-3 text-[13px] font-semibold text-violet hover:bg-violet-soft"><Lightbulb size={15} /> İpucu</button>}
                      {hintLevel < HINT_LEVELS.firstStep && <button onClick={() => setHintLevel(HINT_LEVELS.firstStep)} className="flex h-10 items-center gap-1.5 rounded-xl border border-violet/30 px-3 text-[13px] font-semibold text-violet hover:bg-violet-soft"><Footprints size={15} /> İlk adım</button>}
                    </>
                  ) : current.questionImageId ? (
                    <button onClick={() => void solver.run()} disabled={solver.pending} className="flex h-10 items-center gap-1.5 rounded-xl border border-violet/30 px-3 text-[13px] font-semibold text-violet hover:bg-violet-soft disabled:opacity-60">{solver.pending ? <Loader2 size={15} className="animate-spin" /> : <Lightbulb size={15} />} {solver.pending ? "Hazırlanıyor…" : "✨ AI ipucu"}</button>
                  ) : null}
                  <button onClick={() => setHintLevel(HINT_LEVELS.solution)} className="flex h-10 items-center gap-1.5 rounded-xl border border-ink/10 px-3 text-[13px] font-semibold text-ink-2 hover:bg-paper"><Eye size={15} /> Çözümü göster</button>
                </div>
              )}
              {hintLevel === HINT_LEVELS.hint && <p className="mt-2 text-[12px] text-ink-4">Yalnızca ipucuyla çözersen soru yine bir sonraki basamağa geçer.</p>}
              {hintLevel === HINT_LEVELS.firstStep && <p className="mt-2 text-[12px] text-ink-4">İlk adımı gördün: “Çözdüm” desen de bu soru aynı basamakta kalır.</p>}
              {revealed && <p className="mt-2 text-[12px] text-ink-4">Çözüme baktın: “Çözdüm” desen de bu soru aynı basamakta kalır.</p>}
            </div>
          )}

          {finished && (
            <div className="py-10 text-center">
              <div className="text-[34px]" aria-hidden>{solved === results.length && results.length ? "🏆" : "💪"}</div>
              <p className="mt-2 text-[16px] font-semibold text-ink">{results.length} sorudan {solved} tanesini çözdün.</p>
              <p className="mt-1 text-[13px] text-ink-3">Çözemediklerin yarın yeniden karşına çıkacak; kendi başına (en fazla ipucuyla) çözdüklerin bir sonraki basamağa geçti.</p>
              {finished.taskCompleted && <p className="mt-3 inline-block rounded-full bg-success-soft px-3 py-1 text-[12px] font-semibold text-success">✓ Bugünün defter görevi tamamlandı</p>}
              <div className="mt-6"><button onClick={onClose} className="h-11 rounded-xl bg-brand hover:bg-brand-strong px-6 text-[14px] font-semibold text-white">Kapat</button></div>
            </div>
          )}
        </div>

        {solver.consentDialog}
        {current && !finished && (
          <div className="grid grid-cols-3 gap-2 border-t border-ink/[0.07] p-3 sm:p-4">
            {RESULT_BUTTONS.map((button) => (
              <button key={button.result} onClick={() => void mark(button.result)} disabled={attempt.isPending || finish.isPending} className={`h-12 rounded-xl text-[14px] font-semibold disabled:opacity-50 ${button.className}`}>{button.label}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
