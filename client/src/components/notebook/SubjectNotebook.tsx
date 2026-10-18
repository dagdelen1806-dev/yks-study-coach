import { trpc } from "@/lib/trpc";
import { Camera, Loader2, SquarePen } from "lucide-react";
import { useState } from "react";
import MoveToSubject from "./MoveToSubject";
import { NoteCard } from "./NoteList";
import { useNotebook } from "./NotebookProvider";
import { NewNoteDialog } from "./NewNoteDialog";
import { ErrorMapCard, QuestionCard, QuestionReviewCard } from "./QuestionsPanel";
import { subjectIcon } from "./subjects";

type Filter = "all" | "questions" | "notes";
export type SubjectCounts = { notes: number; questions: number; due: number };

/**
 * 📘 Ders defteri: Defterim'deki her ders sekmesi. O dersin soru kartları ve
 * notları tek bir zaman akışında; "Soru ekle" / "Not ekle" dersi önceden seçili
 * açar. subject = null → "Genel": henüz bir derse konmamış her şey, her kartta
 * "Derse ekle" ile.
 */
export default function SubjectNotebook({ subject, counts }: { subject: string | null; counts?: SubjectCounts }) {
  const notebook = useNotebook();
  const [filter, setFilter] = useState<Filter>("all");
  const [showNew, setShowNew] = useState(false);
  const general = subject === null;
  const list = trpc.notes.list.useInfiniteQuery(
    { ...(general ? { noSubject: true } : { subject }), questions: filter === "questions" ? "only" : filter === "notes" ? "exclude" : undefined },
    { getNextPageParam: (page) => page.nextCursor ?? undefined, retry: false }
  );
  const items = list.data?.pages.flatMap((page) => page.items) ?? [];
  const title = general ? "Genel defter" : `${subject} defteri`;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-3xl border border-ink/[0.07] bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-[28px]" aria-hidden>{subjectIcon(subject)}</div>
          <div>
            <h2 className="text-[19px] font-semibold text-ink">{title}</h2>
            <p className="text-[13px] text-ink-3">
              {general ? "Henüz bir derse konmamış notların ve soruların — her birini “Derse ekle” ile bir ders defterine koyabilirsin." : `${counts?.questions ?? 0} soru · ${counts?.notes ?? 0} not`}
            </p>
          </div>
        </div>
        {!general && (
          <div className="flex gap-2">
            <button onClick={() => notebook.captureQuestion({ subject })} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-brand hover:bg-brand-strong px-4 text-[13px] font-semibold text-white sm:flex-none"><Camera size={16} /> Soru ekle</button>
            <button onClick={() => setShowNew(true)} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-ink/10 px-4 text-[13px] font-semibold text-ink-2 sm:flex-none"><SquarePen size={16} /> Not ekle</button>
          </div>
        )}
      </div>

      <QuestionReviewCard compact subject={subject} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-3">
          <div className="flex rounded-xl bg-paper p-1 sm:w-fit" role="tablist" aria-label="İçerik türü">
            {([["all", "Hepsi"], ["questions", "❓ Sorular"], ["notes", "📝 Notlar"]] as const).map(([key, label]) => (
              <button key={key} role="tab" aria-selected={filter === key} onClick={() => setFilter(key)} className={`h-9 flex-1 rounded-lg px-3 text-[13px] font-semibold sm:flex-none ${filter === key ? "bg-white text-ink shadow-sm" : "text-ink-3"}`}>{label}</button>
            ))}
          </div>
          {list.isLoading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-brand" size={22} /></div>
            : list.isError ? <div className="rounded-2xl bg-danger-soft p-4 text-[13px] text-danger">Defter yüklenemedi. <button onClick={() => void list.refetch()} className="font-semibold underline">Tekrar dene</button></div>
              : items.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-ink/15 p-8 text-center">
                  <div className="text-[30px]" aria-hidden>{subjectIcon(subject)}</div>
                  <p className="mt-2 text-[14px] font-semibold text-ink">{general ? "Derssiz not ya da soru yok — her şey bir defterde 👌" : filter === "questions" ? `${subject} defterinde henüz soru yok.` : filter === "notes" ? `${subject} defterinde henüz not yok.` : `${subject} defterin boş.`}</p>
                  {!general && <p className="mt-1 text-[13px] text-ink-3">Çözemediğin bir soruyu fotoğrafla ya da bugün öğrendiğini not al — hepsi bu defterde toplanır.</p>}
                </div>
              ) : (
                <div className="grid gap-2 md:grid-cols-2">
                  {items.map((note) => {
                    const move = general ? <MoveToSubject noteId={note.id} /> : undefined;
                    return note.question
                      ? <QuestionCard key={note.id} question={{ ...note.question, subject: note.subject, topic: note.topic }} onOpen={notebook.openQuestion} footer={move} />
                      : <NoteCard key={note.id} note={note} onOpen={(id) => notebook.open({ noteId: id })} footer={move} />;
                  })}
                </div>
              )}
          {list.hasNextPage && <div className="text-center"><button onClick={() => void list.fetchNextPage()} disabled={list.isFetchingNextPage} className="h-10 rounded-xl border border-ink/10 px-5 text-[13px] font-semibold text-ink-2">{list.isFetchingNextPage ? "Yükleniyor…" : "Daha fazla göster"}</button></div>}
        </div>
        {!general && <ErrorMapCard subject={subject} />}
      </div>

      {showNew && <NewNoteDialog subject={subject} onClose={() => setShowNew(false)} />}
    </div>
  );
}
