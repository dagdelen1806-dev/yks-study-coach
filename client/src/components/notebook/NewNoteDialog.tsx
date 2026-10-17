import { NOTE_TEMPLATES } from "@shared/noteContent";
import { Camera, Mic, PenLine, Sigma, SquarePen } from "lucide-react";
import { useNotebook } from "./NotebookProvider";
import { subjectIcon } from "./subjects";

/** ➕ Yeni Not: yazı / ses / fotoğraf / formül / çizim ya da şablon. subject verilirse not o dersin defterine açılır. */
export function NewNoteDialog({ subject = null, onClose }: { subject?: string | null; onClose: () => void }) {
  const notebook = useNotebook();
  const open = (prefill: NonNullable<Parameters<typeof notebook.open>[0]>["prefill"]) => { onClose(); notebook.open({ prefill: { ...prefill, ...(subject ? { subject } : {}) } }); };
  return (
    <div className="modal-backdrop items-end sm:items-center" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal-card max-w-[480px]">
        <div className="text-[15px] font-semibold text-ink">➕ Yeni Not{subject ? <span className="font-normal text-ink-3"> · {subjectIcon(subject)} {subject} defteri</span> : null}</div>
        <div className="mt-4 grid grid-cols-5 gap-2">
          {([["Yaz", <SquarePen key="t" size={20} />, undefined], ["Ses", <Mic key="v" size={20} className="text-danger" />, "voice"], ["Fotoğraf", <Camera key="p" size={20} />, "photo"], ["Formül", <Sigma key="f" size={20} />, "formula"], ["Çiz", <PenLine key="d" size={20} />, "drawing"]] as const).map(([label, icon, startWith]) => (
            <button key={label} onClick={() => open({ startWith })} className="flex h-20 flex-col items-center justify-center gap-1.5 rounded-2xl border border-ink/10 text-[12px] font-semibold text-ink-2 hover:bg-brand-soft">{icon}{label}</button>
          ))}
        </div>
        <div className="mt-5 text-[12px] font-bold text-ink-4">Şablonlar</div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {NOTE_TEMPLATES.map((template) => (
            <button key={template.key} onClick={() => open({ templateKey: template.key })} className="rounded-xl border border-ink/10 px-3 py-2.5 text-left text-[13px] hover:bg-paper"><span className="font-semibold text-ink">{template.icon} {template.label}</span><span className="mt-0.5 block text-[12px] text-ink-3">{template.sections.slice(0, 3).join(" · ")}…</span></button>
          ))}
        </div>
      </div>
    </div>
  );
}
