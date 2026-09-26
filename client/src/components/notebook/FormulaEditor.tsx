import katex from "katex";
import "katex/dist/katex.min.css";
import { X } from "lucide-react";
import { useMemo, useState } from "react";

/** LaTeX → güvenli HTML (KaTeX `trust:false`: \href vb. komutlar kapalı). Hatalı ifade kırmızı gösterilir, çökmez. */
export function renderLatex(latex: string, displayMode = true): string {
  try {
    return katex.renderToString(latex || "\\;", { throwOnError: false, displayMode, trust: false, strict: "ignore", output: "html" });
  } catch {
    return "";
  }
}

// Sık kullanılan kalıplar: öğrenci LaTeX bilmese de tıklayarak ekleyebilsin.
const SNIPPETS: Array<{ label: string; latex: string }> = [
  { label: "x²", latex: "x^{2}" },
  { label: "xⁿ", latex: "x^{n}" },
  { label: "a/b", latex: "\\frac{a}{b}" },
  { label: "√x", latex: "\\sqrt{x}" },
  { label: "ⁿ√x", latex: "\\sqrt[n]{x}" },
  { label: "xᵢ", latex: "x_{i}" },
  { label: "π", latex: "\\pi" },
  { label: "≤", latex: "\\le" },
  { label: "≥", latex: "\\ge" },
  { label: "≠", latex: "\\neq" },
  { label: "±", latex: "\\pm" },
  { label: "·", latex: "\\cdot" },
  { label: "∑", latex: "\\sum_{i=1}^{n}" },
  { label: "∫", latex: "\\int_{a}^{b} f(x)\\,dx" },
  { label: "lim", latex: "\\lim_{x \\to 0}" },
  { label: "log", latex: "\\log_{a} b" },
  { label: "sin", latex: "\\sin x" },
  { label: "α β θ", latex: "\\alpha \\beta \\theta" },
  { label: "→", latex: "\\rightarrow" },
  { label: "( )", latex: "\\left( x \\right)" },
];

const EXAMPLES = ["a^{2} + b^{2} = c^{2}", "f(x) = ax^{2} + bx + c", "x_{1,2} = \\frac{-b \\pm \\sqrt{b^{2}-4ac}}{2a}"];

/** Formül düzenleyici: LaTeX kutusu + canlı önizleme + hızlı kalıplar. */
export default function FormulaEditor({ initial, onSave, onCancel }: { initial: string; onSave: (latex: string) => void; onCancel: () => void }) {
  const [latex, setLatex] = useState(initial);
  const preview = useMemo(() => renderLatex(latex), [latex]);
  const insert = (snippet: string) => setLatex((value) => (value ? `${value} ${snippet}` : snippet));

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
      <div className="modal-card max-w-[560px]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="eyebrow mb-2">Formül</div>
            <h2 className="text-[18px] font-semibold tracking-[-0.03em] text-[#1f2333]">Matematiksel ifade ekle</h2>
          </div>
          <button onClick={onCancel} className="rounded-lg p-2 text-[#8b8c95] hover:bg-[#f7f5ef]" aria-label="Kapat"><X size={16} /></button>
        </div>
        <div className="mt-4 min-h-[72px] overflow-x-auto rounded-2xl border border-[#1f2333]/[0.07] bg-[#fafafa] p-4 text-[#1f2333]" aria-live="polite" dangerouslySetInnerHTML={{ __html: preview }} />
        <label className="mt-3 block">
          <span className="form-label">LaTeX</span>
          <textarea value={latex} onChange={(event) => setLatex(event.target.value)} rows={3} spellCheck={false} placeholder="ör. x^{2} + y^{2} = z^{2}" className="form-input h-auto py-2 font-mono text-[13px]" autoFocus />
        </label>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {SNIPPETS.map((snippet) => <button key={snippet.label} onClick={() => insert(snippet.latex)} className="h-9 min-w-9 rounded-lg border border-[#1f2333]/10 px-2 text-[13px] text-[#343643] hover:bg-[#f4f6ff]">{snippet.label}</button>)}
        </div>
        <div className="mt-3 text-[11px] text-[#8b8c95]">Örnekler: {EXAMPLES.map((example) => <button key={example} onClick={() => setLatex(example)} className="mr-2 font-mono text-[#3b5ccc] underline-offset-2 hover:underline">{example}</button>)}</div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="h-10 rounded-xl border border-[#1f2333]/10 px-4 text-[12px] font-semibold text-[#777983]">Vazgeç</button>
          <button onClick={() => onSave(latex.trim())} disabled={!latex.trim()} className="h-10 rounded-xl bg-[#1f2333] px-4 text-[12px] font-semibold text-white disabled:opacity-40">Kaydet</button>
        </div>
      </div>
    </div>
  );
}
