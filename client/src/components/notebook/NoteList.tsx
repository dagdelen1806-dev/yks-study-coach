import type { inferRouterOutputs } from "@trpc/server";
import { Pin, Star } from "lucide-react";
import type { AppRouter } from "../../../../server/routers";
import { formatDuration } from "./nodes";

export type NoteSummary = inferRouterOutputs<AppRouter>["notes"]["list"]["items"][number];

const typeIcon = (note: NoteSummary) => (note.stats.voice ? "🎙️" : note.stats.images ? "📷" : note.stats.formulas ? "∑" : note.stats.drawings ? "🖊" : "✍️");

/** Liste kartı: sade — başlık, kısa önizleme, ders/konu, tarih, küçük içerik göstergeleri. */
export function NoteCard({ note, onOpen }: { note: NoteSummary; onOpen: (id: number) => void }) {
  const indicators = [
    note.stats.voice ? `🎙️ ${formatDuration(note.stats.voiceSeconds)}` : null,
    note.stats.images ? `📷 ${note.stats.images} görsel` : null,
    note.stats.formulas ? `∑ ${note.stats.firstFormula ?? note.stats.formulas}` : null,
    note.stats.drawings ? `🖊 ${note.stats.drawings} çizim` : null,
    note.stats.checklist ? `☑ ${note.stats.checklistDone}/${note.stats.checklist}` : null,
  ].filter(Boolean);
  return (
    <button onClick={() => onOpen(note.id)} className="w-full rounded-2xl border border-[#1f2333]/[0.07] bg-white p-4 text-left shadow-[0_6px_20px_rgba(31,35,51,.035)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(31,35,51,.08)]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 text-[14px] font-semibold text-[#1f2333]"><span aria-hidden className="mr-1">{typeIcon(note)}</span>{note.title}</div>
        <div className="flex shrink-0 gap-1">
          {note.isPinned && <Pin size={13} className="fill-[#3b5ccc] text-[#3b5ccc]" aria-label="Sabitlenmiş" />}
          {note.isFavorite && <Star size={13} className="fill-[#f5b301] text-[#f5b301]" aria-label="Favori" />}
        </div>
      </div>
      {note.snippet && note.snippet !== note.title && <p className="mt-1.5 line-clamp-2 text-[12px] leading-5 text-[#6d7390]">{note.snippet}</p>}
      {indicators.length > 0 && <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] text-[#8b8c95]">{indicators.map((item) => <span key={item}>{item}</span>)}</div>}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[10px]">
        {(note.subject || note.topic) && <span className="rounded-full bg-[#edf1ff] px-2 py-0.5 font-semibold text-[#3b5ccc]">{[note.subject, note.topic].filter(Boolean).join(" · ")}</span>}
        {note.bookTitle && <span className="rounded-full bg-[#fff4ea] px-2 py-0.5 font-semibold text-[#c25e00]">📚 {note.bookTitle}</span>}
        {note.tags.slice(0, 3).map((tag) => <span key={tag} className="rounded-full bg-[#f7f5ef] px-2 py-0.5 text-[#545661]">#{tag}</span>)}
        <span className="ml-auto text-[#9a9ba3]">{new Date(note.noteDate).toLocaleString("tr-TR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}</span>
      </div>
    </button>
  );
}

/** Zaman çizelgesi: gün başlıkları altında saat saat notlar. */
export function NoteTimeline({ notes, onOpen }: { notes: NoteSummary[]; onOpen: (id: number) => void }) {
  const days: Array<{ key: string; label: string; items: NoteSummary[] }> = [];
  for (const note of notes) {
    const date = new Date(note.noteDate);
    const key = date.toDateString();
    let day = days[days.length - 1];
    if (!day || day.key !== key) { day = { key, label: date.toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "long" }), items: [] }; days.push(day); }
    day.items.push(note);
  }
  return (
    <div className="space-y-5">
      {days.map((day) => (
        <section key={day.key} aria-label={day.label}>
          <h3 className="text-[12px] font-bold text-[#1f2333]">{day.label}</h3>
          <ol className="mt-2 space-y-1 border-l-2 border-[#e3e9ff] pl-4">
            {day.items.map((note) => (
              <li key={note.id} className="relative">
                <span className="absolute -left-[21px] top-3 h-2.5 w-2.5 rounded-full bg-[#3b5ccc]" aria-hidden />
                <button onClick={() => onOpen(note.id)} className="flex w-full items-baseline gap-3 rounded-xl px-2 py-2 text-left hover:bg-[#f7f9ff]">
                  <span className="shrink-0 font-mono text-[11px] text-[#8b8c95]">{new Date(note.noteDate).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</span>
                  <span className="min-w-0"><span className="text-[13px] font-semibold text-[#343643]">{typeIcon(note)} {note.title}</span>{(note.subject || note.topic) && <span className="block text-[10px] text-[#8b8c95]">{[note.subject, note.topic].filter(Boolean).join(" · ")}</span>}</span>
                </button>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
