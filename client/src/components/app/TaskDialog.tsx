import { trpc } from "@/lib/trpc";
import { findClassConflict, fromMinutes, toMinutes } from "@shared/classSchedule";
import { toLocalDateKey } from "@shared/yksData";
import { CalendarPlus, X } from "lucide-react";
import { primaryButton, secondaryButton } from "./kit";
import { toast } from "sonner";

export type TaskDraft = { subject: string; topic: string; date: string; time: string; minutes: string; questions: string; kind: string; source: string };

/** Yarın, öğrencinin tercih ettiği başlangıç saatinde (yoksa 17:00) bir görev taslağı. */
export function taskDraftFor(input: { subject: string; topic: string; kind?: string; source: string; questions?: number; preferredStart?: string | null }): TaskDraft {
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const start = input.preferredStart && /^\d{2}:\d{2}$/.test(input.preferredStart) ? input.preferredStart : "17:00";
  return { subject: input.subject, topic: input.topic, date: toLocalDateKey(tomorrow), time: fromMinutes(toMinutes(start)), minutes: "40", questions: input.questions ? String(input.questions) : "", kind: input.kind ?? "Soru çözümü", source: input.source };
}

/** Takvime tek görev ekler; okul/dershane programıyla çakışma ve 23:30 sınırı kontrol edilir. */
export default function TaskDialog({ draft, description, onChange, onClose }: { draft: TaskDraft; description: string; onChange: (draft: TaskDraft) => void; onClose: () => void }) {
  const utils = trpc.useUtils();
  const schedule = trpc.classSchedule.get.useQuery(undefined, { retry: false });
  const save = trpc.calendar.savePlan.useMutation({ onSuccess: () => { utils.calendar.snapshot.invalidate(); toast.success("Görev takvime eklendi."); onClose(); }, onError: () => toast.error("Görev eklenemedi, tekrar dener misin?") });
  const submit = () => {
    const minutes = Math.max(10, Math.min(240, Number(draft.minutes) || 40));
    const day = new Date(`${draft.date}T12:00:00`);
    if (!/^\d{2}:\d{2}$/.test(draft.time) || Number.isNaN(day.getTime())) { toast.error("Tarih ve saati kontrol et."); return; }
    const start = toMinutes(draft.time);
    if (start + minutes > 23 * 60 + 30) { toast.error("Görev 23:30'dan önce bitmeli."); return; }
    const conflict = findClassConflict([...(schedule.data?.blocks ?? []), ...(schedule.data?.courseBlocks ?? [])], day, start, minutes);
    if (conflict) { toast.error(`Bu saat ${conflict.label} (${conflict.startTime}–${conflict.endTime}) ile çakışıyor.`); return; }
    const startsAt = new Date(`${draft.date}T${draft.time}:00`);
    const weekEnd = new Date(startsAt); weekEnd.setDate(weekEnd.getDate() + 1);
    save.mutate({ title: draft.source, weekStart: startsAt.toISOString(), weekEnd: weekEnd.toISOString(), summary: `${draft.source}: ${draft.subject} · ${draft.topic}`, source: "manual", sessions: [{ sessionDate: startsAt.toISOString(), title: `${draft.subject} · ${draft.topic}`, subject: draft.subject, topic: draft.topic, kind: draft.kind, plannedMinutes: minutes, ...(Number(draft.questions) > 0 ? { targetQuestions: Number(draft.questions) } : {}) }] });
  };
  return (
    <div className="modal-backdrop" style={{ zIndex: 320 }} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal-card max-w-[420px]" role="dialog" aria-modal="true" aria-label="Takvime görev ekle">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-[13px] font-semibold text-brand">{draft.source}</p><h2 className="mt-1 text-[20px] font-extrabold text-ink">{draft.subject} · {draft.topic}</h2><p className="mt-1 text-[13px] text-ink-3">{description}</p></div>
          <button onClick={onClose} className="rounded-lg p-2 text-ink-4 hover:bg-paper" aria-label="Kapat"><X size={17} /></button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <label className="block"><span className="form-label">Gün</span><input type="date" value={draft.date} min={toLocalDateKey()} onChange={(event) => onChange({ ...draft, date: event.target.value })} className="form-input" /></label>
          <label className="block"><span className="form-label">Saat</span><input type="time" value={draft.time} onChange={(event) => onChange({ ...draft, time: event.target.value })} className="form-input" /></label>
          <label className="block"><span className="form-label">Süre (dk)</span><input type="number" min={10} max={240} value={draft.minutes} onChange={(event) => onChange({ ...draft, minutes: event.target.value })} className="form-input" /></label>
          <label className="block"><span className="form-label">Soru hedefi</span><input type="number" min={0} max={200} value={draft.questions} onChange={(event) => onChange({ ...draft, questions: event.target.value })} className="form-input" /></label>
          <label className="col-span-2 block"><span className="form-label">Görev türü</span><select value={draft.kind} onChange={(event) => onChange({ ...draft, kind: event.target.value })} className="form-input">{["Soru çözümü", "Konu tekrarı", "Konu çalışması"].map((kind) => <option key={kind}>{kind}</option>)}</select></label>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className={secondaryButton}>Vazgeç</button>
          <button onClick={submit} disabled={save.isPending} className={primaryButton}><CalendarPlus size={16} /> {save.isPending ? "Ekleniyor…" : "Takvime ekle"}</button>
        </div>
      </div>
    </div>
  );
}
