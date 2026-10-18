import { trpc } from "@/lib/trpc";
import type { AiSolution } from "@shared/questionNotebook";
import { useState } from "react";
import { toast } from "sonner";

/** Soru fotoğrafını AI'a gönderme onayı (adım adım çözüm ve benzer soru aynı veriyi gönderir). */
export const SOLVE_CONSENT_KEY = "pusula:question-solve-consent";

/**
 * ✨ Adım adım çöz: AI çözümünü ister. İlk kullanımda öğrenciye neyin AI'a
 * gittiğini söyleyen onay penceresi açılır. Çözüm karta kaydedilir; aynı kartı
 * yeniden açmak yeni bir AI hakkı harcamaz.
 */
export function useAiSolve(id: number | null, onSolved: (result: { aiSolution: AiSolution; aiSolutionAt: Date }) => void) {
  const utils = trpc.useUtils();
  const solve = trpc.questions.solve.useMutation();
  const [asking, setAsking] = useState(false);
  const [escalateAfterConsent, setEscalateAfterConsent] = useState(false);

  // escalate: "daha güçlü modelle çöz" — sunucu kademe seçimini atlayıp güçlü modeli kullanır.
  const run = async (consentGiven = false, escalate = false) => {
    if (!id || solve.isPending) return;
    let consent = consentGiven;
    try { consent = consent || localStorage.getItem(SOLVE_CONSENT_KEY) === "1"; } catch {}
    if (!consent) { setEscalateAfterConsent(escalate); setAsking(true); return; }
    try {
      const result = await solve.mutateAsync({ id, ...(escalate ? { escalate: true } : {}) });
      utils.questions.get.setData({ id }, (previous) => (previous ? { ...previous, ...result } : previous));
      void utils.questions.list.invalidate();
      onSolved(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Çözüm hazırlanamadı.");
    }
  };

  const consentDialog = asking ? (
    <div className="modal-backdrop" style={{ zIndex: 330 }} onMouseDown={(event) => event.target === event.currentTarget && setAsking(false)}>
      <div className="modal-card max-w-[400px]">
        <h2 className="text-[16px] font-semibold text-ink">✨ Adım adım çözüm için AI</h2>
        <p className="mt-2 text-[13px] leading-5 text-ink-2"><strong>Soru fotoğrafı</strong> ve <strong>takıldığın yer için yazdıkların</strong> AI servisine gönderilir. AI soruyu adım adım, her adımın nedeniyle çözer. Amaç cevabı değil yöntemi öğrenmen; AI hata yapabilir, sonucu kontrol adımıyla doğrula.</p>
        <p className="mt-2 text-[12px] text-ink-3">Her yeni çözüm AI not araçları hakkından sayılır; kayıtlı çözümü tekrar açmak ücretsizdir.</p>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={() => setAsking(false)} className="h-10 rounded-xl border border-ink/10 px-4 text-[13px] font-semibold text-ink-3">Vazgeç</button>
          <button onClick={() => { try { localStorage.setItem(SOLVE_CONSENT_KEY, "1"); } catch {} setAsking(false); void run(true, escalateAfterConsent); }} className="h-10 rounded-xl bg-violet px-4 text-[13px] font-semibold text-white">Anladım, çöz</button>
        </div>
      </div>
    </div>
  ) : null;

  return { run, pending: solve.isPending, consentDialog };
}

/** Adım kartları: "ADIM n" + işlem + neden; sonunda sonuç ve kontrol. */
export function AiSolutionSteps({ solution, onStuck }: { solution: AiSolution; onStuck?: (stepIndex: number) => void }) {
  return (
    <div className="space-y-3">
      {solution.method && <p className="text-[13px] text-ink-2"><span className="font-semibold text-ink">Yöntem:</span> {solution.method}</p>}
      <ol className="space-y-2.5">
        {solution.steps.map((step, index) => (
          <li key={index} className="flex items-start gap-2.5">
            <span className="mt-0.5 shrink-0 rounded-md bg-violet px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white">ADIM {index + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="whitespace-pre-wrap text-[14px] font-semibold text-ink">{step.work}</p>
              {step.why && <p className="mt-0.5 text-[13px] text-ink-3">{step.why}</p>}
              {onStuck && <button type="button" onClick={() => onStuck(index)} className="mt-1 text-[12px] font-semibold text-warn hover:underline">Burada takıldım</button>}
            </div>
          </li>
        ))}
      </ol>
      {solution.answer && <div className="flex items-center justify-between gap-3 rounded-xl bg-violet-soft px-3 py-2"><span className="text-[13px] font-semibold text-ink">Sonuç</span><span className="text-right text-[14px] font-bold text-violet">{solution.answer}</span></div>}
      {solution.check && <p className="text-[13px] text-ink-2"><span className="font-semibold text-ink">✓ Kontrol:</span> {solution.check}</p>}
      <p className="text-[11px] text-ink-4">AI hata yapabilir: kontrol adımıyla doğrula, anlamadığın adımı öğretmenine de sor.</p>
    </div>
  );
}
