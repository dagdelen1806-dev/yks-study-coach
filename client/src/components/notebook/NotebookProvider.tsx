import { Zap } from "lucide-react";
import { createContext, useCallback, useContext, useState } from "react";
import { toast } from "sonner";
import NoteEditor, { type NotePrefill } from "./NoteEditor";

type OpenOptions = { noteId?: number; draftClientId?: string; prefill?: NotePrefill };
type NotebookApi = { open: (options?: OpenOptions) => void; enabled: boolean };

const NotebookContext = createContext<NotebookApi | null>(null);

/**
 * Defteri her ekrandan açılabilir kılar (Genel Bakış, Takvim, Kitap, Odak...):
 * `useNotebook().open({ prefill })` ile ilgili konu/kitap/oturum önceden
 * seçilmiş bir not açılır. Ayrıca her ekranda "⚡ Hızlı Not" düğmesi.
 */
export function NotebookProvider({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  const [current, setCurrent] = useState<(OpenOptions & { key: number }) | null>(null);
  const open = useCallback((options: OpenOptions = {}) => {
    if (!enabled) { toast("Defteri kullanmak için giriş yapmalısın."); return; }
    setCurrent({ ...options, key: Date.now() });
  }, [enabled]);

  return (
    <NotebookContext.Provider value={{ open, enabled }}>
      {children}
      {enabled && !current && (
        <button onClick={() => open()} className="fixed bottom-24 right-4 z-40 flex h-14 items-center gap-2 rounded-full bg-[#1f2333] px-5 text-[13px] font-semibold text-white shadow-[0_12px_30px_rgba(31,35,51,.3)] transition hover:scale-[1.03] sm:bottom-6 sm:right-6" aria-label="Hızlı not al">
          <Zap size={18} className="text-[#f5d90a]" /> Hızlı Not
        </button>
      )}
      {current && <NoteEditor key={current.key} noteId={current.noteId} draftClientId={current.draftClientId} prefill={current.prefill} onClose={() => setCurrent(null)} />}
    </NotebookContext.Provider>
  );
}

export function useNotebook(): NotebookApi {
  return useContext(NotebookContext) ?? { open: () => toast("Defter şu an kullanılamıyor."), enabled: false };
}
