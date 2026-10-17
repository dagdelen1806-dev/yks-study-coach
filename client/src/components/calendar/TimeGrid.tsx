import { blocksOn, computeFreeSlots, fromMinutes, isYksBlock, toMinutes, weekdayOf, type ClassBlock } from "@shared/classSchedule";
import { subjectPalette } from "@shared/palette";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";

// Focus tarzı zaman çizelgesi: okul/dershane blokları sabit arka plan (YKS dışı dersler gri),
// çalışma oturumları üstte renkli kartlar, günlük görünümde boş aralıklar tıklanabilir.

export type TimelineSession = { id: number | string; sessionDate: string | Date; plannedMinutes: number; title: string; topic: string; subject: string; status: string };

const PX_PER_MINUTE = 0.9;
const MIN_FREE_SLOT = 20;
const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
/** "YYYY-MM-DD" biçimindeki eski/misafir oturumların saati yoktur; çizelgeye değil üst şeride konur. */
const isUntimed = (value: string | Date) => typeof value === "string" && value.length === 10;
const minutesOfDay = (date: Date) => date.getHours() * 60 + date.getMinutes();
const formatDuration = (minutes: number) => { const hours = Math.floor(minutes / 60); const rest = minutes % 60; return hours ? `${hours} sa${rest ? ` ${rest} dk` : ""}` : `${rest} dk`; };

function useNowMinutes() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 60000); return () => window.clearInterval(timer); }, []);
  return now;
}

export default function TimeGrid({ dates, blocks, sessions, freeFrom, onAddAt, onSessionClick }: {
  dates: Date[];
  blocks: ClassBlock[];
  sessions: TimelineSession[];
  /** Boş zaman hesabının başladığı saat (öğrencinin "genelde başladığım saat" tercihi). Verilirse boş aralıklar gösterilir. */
  freeFrom?: string;
  onAddAt?: (date: Date, startMinutes: number, maxMinutes: number) => void;
  onSessionClick?: (session: TimelineSession) => void;
}) {
  const now = useNowMinutes();
  const single = dates.length === 1;
  const sessionsOn = (date: Date) => sessions.filter((session) => dayKey(new Date(isUntimed(session.sessionDate) ? `${session.sessionDate}T12:00:00` : session.sessionDate)) === dayKey(date));
  const timedOn = (date: Date) => sessionsOn(date).filter((session) => !isUntimed(session.sessionDate));
  const untimed = dates.flatMap((date) => sessionsOn(date).filter((session) => isUntimed(session.sessionDate)).map((session) => ({ date, session })));

  // Görünür aralık: en erken blok/oturumdan (en geç 07:00) gece yarısına kadar.
  const earliest = Math.min(7 * 60, ...dates.flatMap((date) => [...blocksOn(blocks, date).map((block) => toMinutes(block.startTime)), ...timedOn(date).map((session) => minutesOfDay(new Date(session.sessionDate)))]));
  const rangeStart = Math.floor(earliest / 60) * 60;
  const rangeEnd = 24 * 60;
  const height = (rangeEnd - rangeStart) * PX_PER_MINUTE;
  const top = (minutes: number) => (minutes - rangeStart) * PX_PER_MINUTE;
  const hours = Array.from({ length: (rangeEnd - rangeStart) / 60 }, (_, index) => rangeStart + index * 60);
  const isToday = (date: Date) => dayKey(date) === dayKey(now);

  const freeSlotsOn = (date: Date) => {
    if (!freeFrom) return [];
    const from = isToday(date) ? fromMinutes(Math.max(toMinutes(freeFrom), Math.ceil(minutesOfDay(now) / 5) * 5)) : freeFrom;
    if (toMinutes(from) >= 23 * 60 + 30) return [];
    // Planlı oturumlar da meşgul sayılır: boş aralık yalnızca gerçekten boş kalan zaman.
    const busy: ClassBlock[] = [...blocks, ...timedOn(date).filter((session) => session.status !== "skipped").map((session) => { const start = minutesOfDay(new Date(session.sessionDate)); return { source: "other" as const, dayOfWeek: weekdayOf(date), startTime: fromMinutes(start), endTime: fromMinutes(Math.min(start + session.plannedMinutes, 23 * 60 + 59)), subject: null, label: session.title }; })];
    // Ders bloklarından sonraki yol/dinlenme payı yalnızca ders bloklarına uygulanır: iki aralık kümesinin kesişimi.
    const afterClass = computeFreeSlots(blocks, date, { from });
    return computeFreeSlots(busy, date, { from, buffer: 0 })
      .flatMap((slot) => afterClass.map((free) => ({ start: Math.max(free.start, slot.start), end: Math.min(free.end, slot.end) })))
      .filter((item) => item.end - item.start >= MIN_FREE_SLOT);
  };

  return (
    <div>
      {untimed.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {untimed.map(({ date, session }) => (
            <button key={String(session.id)} onClick={() => onSessionClick?.(session)} className={`rounded-lg px-2 py-1 text-[12px] font-semibold ${session.status === "completed" ? "bg-success-soft text-success" : "bg-brand-soft text-brand"}`}>
              {!single && `${date.toLocaleDateString("tr-TR", { weekday: "short" })} · `}{session.topic} <span className="font-normal">· saatsiz</span>
            </button>
          ))}
        </div>
      )}
      <div className={single ? "" : "overflow-x-auto"}>
        <div className={single ? "" : "min-w-[680px]"}>
          {!single && (
            <div className="grid pl-11" style={{ gridTemplateColumns: `repeat(${dates.length}, minmax(0, 1fr))` }}>
              {dates.map((date) => <div key={dayKey(date)} className={`pb-2 text-center text-[12px] font-bold ${isToday(date) ? "text-brand" : "text-ink-3"}`}>{date.toLocaleDateString("tr-TR", { weekday: "short" })} {date.getDate()}</div>)}
            </div>
          )}
          <div className="relative flex" style={{ height }}>
            <div className="relative w-11 shrink-0">
              {hours.map((hour) => <div key={hour} className="absolute -translate-y-1/2 text-[11px] text-ink-4" style={{ top: top(hour) }}>{fromMinutes(hour)}</div>)}
            </div>
            <div className="relative grid flex-1 border-l border-rule" style={{ gridTemplateColumns: `repeat(${dates.length}, minmax(0, 1fr))` }}>
              {hours.map((hour) => <div key={hour} className="pointer-events-none absolute inset-x-0 border-t border-rule/70" style={{ top: top(hour) }} />)}
              {dates.map((date) => (
                <div key={dayKey(date)} className={`relative border-r border-rule/60 ${isToday(date) && !single ? "bg-brand-soft/30" : ""}`}>
                  {freeSlotsOn(date).map((slot) => (
                    <button key={slot.start} onClick={() => onAddAt?.(date, slot.start, slot.end - slot.start)} disabled={!onAddAt} className="group absolute inset-x-1 flex flex-col items-start justify-start overflow-hidden rounded-lg border border-dashed border-success/40 bg-success-soft/40 px-2 py-1 text-left text-[11px] text-success hover:bg-success-soft disabled:cursor-default" style={{ top: top(slot.start) + 1, height: (slot.end - slot.start) * PX_PER_MINUTE - 2 }}>
                      <span className="font-semibold">Boş {fromMinutes(slot.start)}–{fromMinutes(slot.end)} · {formatDuration(slot.end - slot.start)}</span>
                      {onAddAt && <span className="mt-0.5 hidden items-center gap-1 font-semibold group-hover:inline-flex"><Plus size={12} /> Oturum ekle</span>}
                    </button>
                  ))}
                  {blocksOn(blocks, date).map((block) => {
                    const start = toMinutes(block.startTime);
                    const blockHeight = (toMinutes(block.endTime) - start) * PX_PER_MINUTE;
                    const yks = isYksBlock(block);
                    return (
                      <div key={`${block.startTime}-${block.label}`} title={`${block.label} · ${block.startTime}–${block.endTime}${yks ? "" : " · YKS dışı"}`} className={`absolute inset-x-0.5 overflow-hidden rounded-md border px-1.5 text-[11px] leading-tight ${yks ? "border-rule-strong bg-paper text-ink-2" : "border-rule bg-paper/60 text-ink-4"}`} style={{ top: top(start) + 1, height: blockHeight - 2, borderLeft: `3px solid ${yks ? subjectPalette[block.subject as string] ?? "var(--ink-3, #6b6b6b)" : "transparent"}` }}>
                        <span className="font-semibold">{block.label}</span>{blockHeight > 26 && <span className="block text-[10px] opacity-80">{block.startTime}–{block.endTime}</span>}
                      </div>
                    );
                  })}
                  {timedOn(date).map((session) => {
                    const start = minutesOfDay(new Date(session.sessionDate));
                    const sessionHeight = Math.max(18, session.plannedMinutes * PX_PER_MINUTE);
                    return (
                      <button key={String(session.id)} onClick={() => onSessionClick?.(session)} className={`absolute z-10 overflow-hidden rounded-md px-1.5 py-0.5 text-left text-[11px] leading-tight shadow-sm ${single ? "inset-x-6" : "inset-x-1.5"} ${session.status === "completed" ? "bg-success text-white" : session.status === "skipped" ? "bg-rule text-ink-3 line-through" : "bg-brand text-white"}`} style={{ top: top(start) + 1, height: sessionHeight - 2 }}>
                        <span className="font-semibold">{single ? session.title : session.topic}</span>{sessionHeight > 26 && <span className="block text-[10px] opacity-90">{fromMinutes(start)}–{fromMinutes(Math.min(start + session.plannedMinutes, 24 * 60 - 1))}</span>}
                      </button>
                    );
                  })}
                  {isToday(date) && minutesOfDay(now) >= rangeStart && <div className="pointer-events-none absolute inset-x-0 z-20 border-t-2 border-danger" style={{ top: top(minutesOfDay(now)) }}><span className="absolute -left-1 -top-[5px] h-2 w-2 rounded-full bg-danger" /></div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
