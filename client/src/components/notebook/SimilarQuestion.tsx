import { trpc } from "@/lib/trpc";
import { OPTION_LETTERS, type OptionLetter, type SimilarQuestion as SimilarQuestionData } from "@shared/questionNotebook";
import { Loader2, Repeat } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AiSolutionSteps, SOLVE_CONSENT_KEY } from "./AiSolution";

/**
 * 🔁 Benzer soru: kartdaki soruyla aynı yöntemi ölçen yeni 5 şıklı bir soru. Öğrenci şıkkını
 * seçer, sonra doğru cevap ve adım adım çözüm açılır. Soru kaydedilmez; her yeni soru AI not
 * araçları hakkından sayılır.
 */
export default function SimilarQuestion({ id, hasPhoto }: { id: number; hasPhoto: boolean }) {
  const similar = trpc.questions.similar.useMutation();
  const [data, setData] = useState<SimilarQuestionData | null>(null);
  const [picked, setPicked] = useState<OptionLetter | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [asking, setAsking] = useState(false);

  const generate = async (consentGiven = false) => {
    if (similar.isPending) return;
    let consent = consentGiven;
    try { consent = consent || localStorage.getItem(SOLVE_CONSENT_KEY) === "1"; } catch {}
    if (!consent) { setAsking(true); return; }
    try {
      const result = await similar.mutateAsync({ id });
      setData(result);
      setPicked(null);
      setShowHint(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Benzer soru hazırlanamadı.");
    }
  };

  const correctIndex = data ? OPTION_LETTERS.indexOf(data.answer) : -1;
  return (
    <div className="rounded-2xl border border-brand/20 bg-brand-soft/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[13px] font-semibold text-ink">🔁 Benzer soru</span>
        {data && <button type="button" onClick={() => void generate()} disabled={similar.isPending} className="flex h-8 items-center gap-1 rounded-lg px-2.5 text-[12px] font-semibold text-brand disabled:opacity-50">{similar.isPending && <Loader2 size={12} className="animate-spin" />} Yeni benzer soru</button>}
      </div>
      {!data ? (
        <div className="mt-2">
          <p className="text-[12px] text-ink-3">{hasPhoto ? "Yöntemi gerçekten öğrendin mi? Aynı yöntemle çözülen ama sayıları farklı yeni bir soru dene." : "Benzer soru için kartta soru fotoğrafı olmalı."}</p>
          {hasPhoto && <button type="button" onClick={() => void generate()} disabled={similar.isPending} className="mt-2 flex h-9 items-center gap-1.5 rounded-xl bg-brand px-3 text-[13px] font-semibold text-white disabled:opacity-60">{similar.isPending ? <Loader2 size={14} className="animate-spin" /> : <Repeat size={14} />} {similar.isPending ? "Hazırlanıyor…" : "Benzer soru üret"}</button>}
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <p className="whitespace-pre-wrap text-[14px] leading-6 text-ink">{data.question}</p>
          <div className="grid gap-1.5">
            {data.options.map((option, index) => {
              const letter = OPTION_LETTERS[index];
              const tone = !picked ? "border-ink/10 bg-white hover:border-brand/40" : index === correctIndex ? "border-success bg-success-soft text-success" : letter === picked ? "border-danger bg-danger-soft text-danger" : "border-ink/10 bg-white opacity-60";
              return (
                <button key={letter} type="button" disabled={Boolean(picked)} onClick={() => setPicked(letter)} className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-left text-[14px] text-ink-2 ${tone}`}>
                  <span className="font-bold">{letter})</span><span className="whitespace-pre-wrap">{option}</span>
                </button>
              );
            })}
          </div>
          {!picked && data.hint && (showHint ? <p className="rounded-xl bg-warn-soft px-3 py-2 text-[13px] text-ink-2">💡 {data.hint}</p> : <button type="button" onClick={() => setShowHint(true)} className="text-[12px] font-semibold text-warn">💡 İpucu göster</button>)}
          {picked && (
            <>
              <p className={`text-[13px] font-semibold ${picked === data.answer ? "text-success" : "text-danger"}`}>{picked === data.answer ? "✅ Doğru! Yöntemi oturtmuşsun." : `❌ Doğru cevap ${data.answer}. Çözüme bak, sonra yeni bir benzer soru dene.`}</p>
              {data.steps.length > 0 && <AiSolutionSteps solution={{ method: "", steps: data.steps, answer: `${data.answer}) ${data.options[correctIndex]}`, check: "", hint: "" }} />}
            </>
          )}
        </div>
      )}
      {asking && (
        <div className="modal-backdrop" style={{ zIndex: 330 }} onMouseDown={(event) => event.target === event.currentTarget && setAsking(false)}>
          <div className="modal-card max-w-[400px]">
            <h2 className="text-[16px] font-semibold text-ink">🔁 Benzer soru için AI</h2>
            <p className="mt-2 text-[13px] leading-5 text-ink-2"><strong>Soru fotoğrafı</strong> ve <strong>takıldığın yer için yazdıkların</strong> AI servisine gönderilir. AI aynı yöntemle çözülen yeni bir soru yazar; AI hata yapabilir.</p>
            <p className="mt-2 text-[12px] text-ink-3">Her yeni benzer soru AI not araçları hakkından sayılır.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setAsking(false)} className="h-10 rounded-xl border border-ink/10 px-4 text-[13px] font-semibold text-ink-3">Vazgeç</button>
              <button onClick={() => { try { localStorage.setItem(SOLVE_CONSENT_KEY, "1"); } catch {} setAsking(false); void generate(true); }} className="h-10 rounded-xl bg-brand px-4 text-[13px] font-semibold text-white">Anladım, üret</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
