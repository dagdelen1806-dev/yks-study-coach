import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { CORE_SUBJECTS, subjectIcon } from "./subjects";
import { useCurriculumTopics } from "./useNotebookData";

/**
 * 📚 Derse ekle: derssiz bir notu ya da soru kartını bir ders defterine koyar.
 * Kartın altında küçük bir seçim kutusu olarak durur (kartın kendisi bir düğme olduğu için ayrı).
 */
export default function MoveToSubject({ noteId, current = null, label = "📚 Derse ekle" }: { noteId: number; current?: string | null; label?: string }) {
  const utils = trpc.useUtils();
  const { subjects } = useCurriculumTopics();
  const move = trpc.questions.moveToSubject.useMutation();
  const [value, setValue] = useState(current ?? "");
  const options = Array.from(new Set([...CORE_SUBJECTS, ...subjects]));

  const choose = async (subject: string) => {
    setValue(subject);
    try {
      await move.mutateAsync({ noteId, subject: subject || null });
      toast.success(subject ? `${subjectIcon(subject)} ${subject} defterine eklendi.` : "Genel deftere taşındı.");
      void utils.notes.list.invalidate();
      void utils.questions.invalidate();
    } catch (error) {
      setValue(current ?? "");
      toast.error(error instanceof Error ? error.message : "Taşınamadı.");
    }
  };

  return (
    <label className="flex items-center gap-2 border-t border-ink/[0.06] px-3 py-2 text-[12px] text-ink-3">
      <span className="shrink-0 font-semibold">{label}</span>
      <select value={value} disabled={move.isPending} onChange={(event) => void choose(event.target.value)} className="h-8 min-w-0 flex-1 rounded-lg border border-ink/10 bg-white px-2 text-[12px] text-ink-2" aria-label="Ders defteri seç">
        <option value="">{current ? "Genel (ders yok)" : "Ders seç…"}</option>
        {options.map((subject) => <option key={subject} value={subject}>{subjectIcon(subject)} {subject}</option>)}
      </select>
    </label>
  );
}
