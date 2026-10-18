import { Camera, Zap } from "lucide-react";
import { createContext, useCallback, useContext, useState } from "react";
import { toast } from "sonner";
import NoteEditor, { type NotePrefill } from "./NoteEditor";
import QuestionCapture, { type QuestionPrefill } from "./QuestionCapture";
import QuestionDetail from "./QuestionDetail";
import QuestionReview from "./QuestionReview";

type OpenOptions = { noteId?: number; draftClientId?: string; prefill?: NotePrefill };
type NotebookApi = {
  open: (options?: OpenOptions) => void;
  /** 📷 Çözemediğin soruyu ekle (ders/konu/oturum önceden seçili olabilir). */
  captureQuestion: (prefill?: QuestionPrefill) => void;
  openQuestion: (id: number) => void;
  /** 🔁 Tekrar oturumu: kimlik verilmezse bugün zamanı gelen sorular (subject verilirse yalnızca o dersin defterinden; null = Genel). */
  startReview: (questionIds?: number[], subject?: string | null) => void;
  enabled: boolean;
};

const NotebookContext = createContext<NotebookApi | null>(null);

type Overlay =
  | { kind: "note"; key: number; options: OpenOptions }
  | { kind: "capture"; key: number; prefill?: QuestionPrefill }
  | { kind: "question"; key: number; id: number }
  | { kind: "review"; key: number; questionIds?: number[]; subject?: string | null };

/**
 * Defteri her ekrandan açılabilir kılar (Genel Bakış, Takvim, Kitap, Odak...):
 * `useNotebook().open({ prefill })` ile not, `captureQuestion()` ile soru kartı,
 * `startReview()` ile tekrar oturumu açılır. Ayrıca her ekranda "⚡ Hızlı Not"
 * ve "📷 Soru" düğmeleri.
 */
export function NotebookProvider({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  const [current, setCurrent] = useState<Overlay | null>(null);
  const guard = useCallback((show: () => void) => {
    if (!enabled) { toast("Defteri kullanmak için giriş yapmalısın."); return; }
    show();
  }, [enabled]);
  const open = useCallback((options: OpenOptions = {}) => guard(() => setCurrent({ kind: "note", key: Date.now(), options })), [guard]);
  const captureQuestion = useCallback((prefill?: QuestionPrefill) => guard(() => setCurrent({ kind: "capture", key: Date.now(), prefill })), [guard]);
  const openQuestion = useCallback((id: number) => guard(() => setCurrent({ kind: "question", key: Date.now(), id })), [guard]);
  const startReview = useCallback((questionIds?: number[], subject?: string | null) => guard(() => setCurrent({ kind: "review", key: Date.now(), questionIds, subject })), [guard]);
  const close = () => setCurrent(null);

  return (
    <NotebookContext.Provider value={{ open, captureQuestion, openQuestion, startReview, enabled }}>
      {children}
      {enabled && !current && (
        <div className="fixed bottom-24 right-4 z-40 flex items-center gap-2 sm:bottom-6 sm:right-6">
          <button onClick={() => captureQuestion()} className="flex h-14 items-center gap-2 rounded-full border border-ink/10 bg-white px-4 text-[14px] font-semibold text-ink shadow-float transition hover:scale-[1.03]" aria-label="Çözemediğin soruyu ekle">
            <Camera size={18} className="text-brand" /> Soru
          </button>
          <button onClick={() => open()} className="flex h-14 items-center gap-2 rounded-full bg-brand hover:bg-brand-strong px-5 text-[14px] font-semibold text-white shadow-float transition hover:scale-[1.03]" aria-label="Hızlı not al">
            <Zap size={18} className="text-[#f5d90a]" /> Hızlı Not
          </button>
        </div>
      )}
      {current?.kind === "note" && <NoteEditor key={current.key} noteId={current.options.noteId} draftClientId={current.options.draftClientId} prefill={current.options.prefill} onClose={close} onReviewQuestion={(id) => startReview([id])} />}
      {current?.kind === "capture" && <QuestionCapture key={current.key} prefill={current.prefill} onClose={close} />}
      {current?.kind === "question" && <QuestionDetail key={current.key} id={current.id} onClose={close} onReview={(id) => startReview([id])} />}
      {current?.kind === "review" && <QuestionReview key={current.key} questionIds={current.questionIds} subject={current.subject} onClose={close} />}
    </NotebookContext.Provider>
  );
}

const noop = () => toast("Defter şu an kullanılamıyor.");

export function useNotebook(): NotebookApi {
  return useContext(NotebookContext) ?? { open: noop, captureQuestion: noop, openQuestion: noop, startReview: noop, enabled: false };
}
