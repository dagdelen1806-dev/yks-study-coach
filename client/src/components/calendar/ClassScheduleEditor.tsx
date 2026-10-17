import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import {
  DAY_LABELS,
  DAY_SHORT_LABELS,
  DEFAULT_SCHOOL_PERIODS,
  MAX_SCHOOL_PERIODS,
  NON_YKS_PRESETS,
  SCHEDULE_SOURCE_LABELS,
  YKS_SUBJECTS,
  fromMinutes,
  toMinutes,
  validateSchedule,
  type ClassBlock,
  type ClassPeriod,
  type ScheduleSource,
} from "@shared/classSchedule";
import { CalendarClock, Loader2, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// Ders programım: okul programı gün × ders saati tablosu (fotoğraftaki okul çizelgesi gibi)
// + dershane/özel ders blokları. Kaydet tüm programı birlikte değiştirir.

type Cell = { subject: string | null; label: string } | null;
const SCHOOL_DAYS = [1, 2, 3, 4, 5, 6];
const encode = (cell: Cell) => (cell ? `${cell.subject ? "y" : "n"}:${cell.label}` : "");
const decode = (value: string): Cell => {
  if (!value) return null;
  const label = value.slice(2);
  return { subject: value.startsWith("y:") ? label : null, label };
};

function SubjectOptions() {
  return (
    <>
      <option value="">—</option>
      <optgroup label="YKS dersleri">{YKS_SUBJECTS.map((subject) => <option key={subject} value={`y:${subject}`}>{subject}</option>)}</optgroup>
      <optgroup label="YKS dışı (gri, plana girmez)">{NON_YKS_PRESETS.map((label) => <option key={label} value={`n:${label}`}>{label}</option>)}</optgroup>
    </>
  );
}

export default function ClassScheduleEditor({ onClose }: { onClose: () => void }) {
  const utils = trpc.useUtils();
  const schedule = trpc.classSchedule.get.useQuery(undefined, { retry: false });
  const save = trpc.classSchedule.save.useMutation({
    onSuccess: (value) => { utils.classSchedule.get.setData(undefined, value); toast.success("Ders programın kaydedildi; takvim ve planın boş zamanına göre ayarlanacak."); onClose(); },
    onError: (error) => toast.error(error.message || "Program kaydedilemedi, tekrar dener misin?"),
  });
  const [periods, setPeriods] = useState<ClassPeriod[]>(DEFAULT_SCHOOL_PERIODS);
  const [cells, setCells] = useState<Cell[][]>(() => DEFAULT_SCHOOL_PERIODS.map(() => SCHOOL_DAYS.map(() => null)));
  const [extras, setExtras] = useState<ClassBlock[]>([]);
  const [showSaturday, setShowSaturday] = useState(false);
  const [activeDay, setActiveDay] = useState(1);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState({ source: "course" as ScheduleSource, dayOfWeek: 6, startTime: "09:00", endTime: "12:00", value: "y:Matematik" });

  // Sunucudaki programı tabloya aç: ders saatine oturan okul blokları hücreye, diğerleri ek bloklara.
  useEffect(() => {
    if (loaded || !schedule.data) return;
    const loadedPeriods = schedule.data.periods.length ? schedule.data.periods : DEFAULT_SCHOOL_PERIODS;
    const grid: Cell[][] = loadedPeriods.map(() => SCHOOL_DAYS.map(() => null));
    const rest: ClassBlock[] = [];
    for (const block of schedule.data.blocks) {
      const row = loadedPeriods.findIndex((period) => period.start === block.startTime && period.end === block.endTime);
      if (block.source === "school" && row >= 0 && block.dayOfWeek <= 6) grid[row][block.dayOfWeek - 1] = { subject: block.subject, label: block.label };
      else rest.push(block);
    }
    setPeriods(loadedPeriods);
    setCells(grid);
    setExtras(rest);
    setShowSaturday(grid.some((row) => row[5] !== null));
    setLoaded(true);
  }, [schedule.data, loaded]);

  const days = showSaturday ? SCHOOL_DAYS : SCHOOL_DAYS.slice(0, 5);
  const setCell = (row: number, day: number, cell: Cell) => setCells((grid) => grid.map((cols, index) => (index === row ? cols.map((value, col) => (col === day - 1 ? cell : value)) : cols)));
  const copyDay = (fromDay: number, toDay: number) => setCells((grid) => grid.map((cols) => cols.map((value, col) => (col === toDay - 1 ? cols[fromDay - 1] : value))));
  const setPeriod = (row: number, key: keyof ClassPeriod, value: string) => setPeriods((items) => items.map((item, index) => (index === row ? { ...item, [key]: value } : item)));
  const addPeriod = () => {
    const last = periods.at(-1);
    const start = last ? Math.min(toMinutes(last.end) + 10, 23 * 60) : 8 * 60 + 30;
    setPeriods((items) => [...items, { start: fromMinutes(start), end: fromMinutes(Math.min(start + 40, 23 * 60 + 59)) }]);
    setCells((grid) => [...grid, SCHOOL_DAYS.map(() => null)]);
  };
  const removePeriod = (row: number) => { setPeriods((items) => items.filter((_, index) => index !== row)); setCells((grid) => grid.filter((_, index) => index !== row)); };
  const addExtra = () => {
    const cell = decode(draft.value);
    if (!cell) { toast.error("Bir ders seç."); return; }
    setExtras((items) => [...items, { source: draft.source, dayOfWeek: draft.dayOfWeek, startTime: draft.startTime, endTime: draft.endTime, subject: cell.subject, label: cell.label }]);
  };

  const buildBlocks = (): ClassBlock[] => [
    ...cells.flatMap((cols, row) => cols.flatMap((cell, col) => (cell && (col < 5 || showSaturday) ? [{ source: "school" as const, dayOfWeek: col + 1, startTime: periods[row].start, endTime: periods[row].end, subject: cell.subject, label: cell.label }] : []))),
    ...extras,
  ];
  const submit = () => {
    const value = { periods, blocks: buildBlocks() };
    const problem = validateSchedule(value);
    if (problem) { toast.error(problem); return; }
    save.mutate(value as Parameters<typeof save.mutate>[0]);
  };
  const filled = cells.flat().filter(Boolean).length;

  return (
    <Card className="soft-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="eyebrow flex items-center gap-2"><CalendarClock size={13} /> Ders programım</div>
          <h2 className="mt-1 text-[21px] font-semibold text-ink font-display">Okul ve dershane saatlerini bir kez gir.</h2>
          <p className="mt-1 max-w-2xl text-[12px] leading-5 text-ink-3">Program her hafta tekrar eder. Takvim bu saatleri dolu sayar; ders çıkışından sonra 30 dk yol/dinlenme payı bırakır ve 23:30'dan sonra plan yapmaz. YKS dışı dersler gri görünür, plana girmez.</p>
        </div>
        <button onClick={onClose} aria-label="Ders programını kapat" className="rounded-lg p-2 text-ink-3 hover:bg-paper"><X size={16} /></button>
      </div>

      {schedule.isLoading ? <div className="mt-6 flex items-center gap-2 text-[13px] text-ink-3"><Loader2 size={15} className="animate-spin" /> Programın yükleniyor…</div> : (
        <>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
            <div className="text-[13px] font-semibold text-ink-2">Okul programı <span className="font-normal text-ink-4">· {filled} ders saati dolu</span></div>
            <label className="flex items-center gap-2 text-[12px] text-ink-3"><input type="checkbox" checked={showSaturday} onChange={(event) => setShowSaturday(event.target.checked)} /> Cumartesi de okul var</label>
          </div>
          <div className="mt-3 flex gap-1.5 md:hidden">
            {days.map((day) => <button key={day} onClick={() => setActiveDay(day)} className={`flex-1 rounded-lg py-1.5 text-[12px] font-semibold ${activeDay === day ? "bg-ink text-white" : "bg-paper text-ink-3"}`}>{DAY_SHORT_LABELS[day - 1]}</button>)}
          </div>
          <div className="mt-3 overflow-hidden rounded-xl border border-rule">
            <table className="w-full table-fixed text-[12px]">
              <thead className="bg-paper text-ink-3">
                <tr>
                  <th className="w-[200px] px-2 py-2 text-left font-semibold">Ders saati</th>
                  {days.map((day) => (
                    <th key={day} className={`px-1 py-2 font-semibold ${day === activeDay ? "" : "hidden md:table-cell"}`}>
                      <div>{DAY_LABELS[day - 1]}</div>
                      <select aria-label={`${DAY_LABELS[day - 1]} gününe kopyala`} value="" onChange={(event) => event.target.value && copyDay(Number(event.target.value), day)} className="mt-1 w-full rounded-md border border-rule bg-white px-1 py-0.5 text-[11px] font-normal text-ink-3">
                        <option value="">Kopyala…</option>
                        {days.filter((other) => other !== day).map((other) => <option key={other} value={other}>{DAY_LABELS[other - 1]}'den</option>)}
                      </select>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periods.map((period, row) => (
                  <tr key={row} className="border-t border-rule">
                    <td className="px-2 py-1.5">
                      <div className="text-[11px] font-semibold text-ink-4">{row + 1}. ders</div>
                      <div className="flex items-center gap-1">
                        <input aria-label={`${row + 1}. ders başlangıç`} type="time" value={period.start} onChange={(event) => setPeriod(row, "start", event.target.value)} className="w-full min-w-0 rounded-md border border-rule px-1 py-0.5 text-[11px]" />
                        <input aria-label={`${row + 1}. ders bitiş`} type="time" value={period.end} onChange={(event) => setPeriod(row, "end", event.target.value)} className="w-full min-w-0 rounded-md border border-rule px-1 py-0.5 text-[11px]" />
                        <button onClick={() => removePeriod(row)} aria-label={`${row + 1}. ders saatini sil`} className="shrink-0 rounded p-0.5 text-ink-4 hover:text-danger"><Trash2 size={12} /></button>
                      </div>
                    </td>
                    {days.map((day) => {
                      const cell = cells[row]?.[day - 1] ?? null;
                      return (
                        <td key={day} className={`px-1 py-1.5 ${day === activeDay ? "" : "hidden md:table-cell"}`}>
                          <select aria-label={`${DAY_LABELS[day - 1]} ${row + 1}. ders`} value={encode(cell)} onChange={(event) => setCell(row, day, decode(event.target.value))} className={`h-9 w-full rounded-lg border px-1 text-[12px] ${!cell ? "border-dashed border-rule text-ink-4" : cell.subject ? "border-brand/30 bg-brand-soft font-semibold text-brand" : "border-rule bg-paper text-ink-4"}`}>
                            <SubjectOptions />
                          </select>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {periods.length < MAX_SCHOOL_PERIODS && <button onClick={addPeriod} className="mt-2 inline-flex items-center gap-1 text-[12px] font-bold text-brand"><Plus size={13} /> Ders saati ekle</button>}

          <div className="mt-6 text-[13px] font-semibold text-ink-2">Dershane, özel ders ve diğer düzenli işler</div>
          {extras.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {extras.map((block, index) => (
                <div key={index} className="flex items-center justify-between gap-2 rounded-xl border border-rule px-3 py-2 text-[12px]">
                  <span className={block.subject ? "text-ink-2" : "text-ink-4"}><strong>{SCHEDULE_SOURCE_LABELS[block.source]}</strong> · {DAY_LABELS[block.dayOfWeek - 1]} {block.startTime}–{block.endTime} · {block.label}{block.subject ? "" : " (YKS dışı)"}</span>
                  <button onClick={() => setExtras((items) => items.filter((_, other) => other !== index))} aria-label="Bloğu sil" className="rounded p-1 text-ink-4 hover:text-danger"><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          )}
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_90px_90px_1.3fr_auto]">
            <select aria-label="Tür" value={draft.source} onChange={(event) => setDraft((value) => ({ ...value, source: event.target.value as ScheduleSource }))} className="h-9 rounded-lg border border-rule px-2 text-[12px]">
              {(["course", "tutor", "school", "other"] as const).map((source) => <option key={source} value={source}>{SCHEDULE_SOURCE_LABELS[source]}</option>)}
            </select>
            <select aria-label="Gün" value={draft.dayOfWeek} onChange={(event) => setDraft((value) => ({ ...value, dayOfWeek: Number(event.target.value) }))} className="h-9 rounded-lg border border-rule px-2 text-[12px]">
              {DAY_LABELS.map((label, index) => <option key={label} value={index + 1}>{label}</option>)}
            </select>
            <input aria-label="Başlangıç" type="time" value={draft.startTime} onChange={(event) => setDraft((value) => ({ ...value, startTime: event.target.value }))} className="h-9 rounded-lg border border-rule px-2 text-[12px]" />
            <input aria-label="Bitiş" type="time" value={draft.endTime} onChange={(event) => setDraft((value) => ({ ...value, endTime: event.target.value }))} className="h-9 rounded-lg border border-rule px-2 text-[12px]" />
            <select aria-label="Ders" value={draft.value} onChange={(event) => setDraft((value) => ({ ...value, value: event.target.value }))} className="h-9 rounded-lg border border-rule px-2 text-[12px]"><SubjectOptions /></select>
            <Button onClick={addExtra} variant="outline" className="h-9 rounded-lg text-[12px]"><Plus size={13} className="mr-1" /> Ekle</Button>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} className="rounded-xl text-[12px]">Vazgeç</Button>
            <Button onClick={submit} disabled={save.isPending} className="rounded-xl bg-pencil text-[12px] text-ink">{save.isPending ? "Kaydediliyor..." : "Programı kaydet"}</Button>
          </div>
        </>
      )}
    </Card>
  );
}
