import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../../server/routers";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { EmptyNote, PageHeader, Panel, primaryButton, secondaryButton } from "@/components/app/kit";
import { DAY_LABELS, DAY_SHORT_LABELS } from "@shared/classSchedule";
import { TEACHER_SUBJECT_GROUPS, TEACHER_SUBJECTS, hasRole } from "@shared/org";
import { TIMETABLE_PERIOD_PRESETS, branchMismatch, buildPeriodCells, findCrossClassConflicts, generateTimetables, sortSlots, validateClassTimetable, weeklyHours, type TimetableSlot } from "@shared/orgTimetable";
import { AlertTriangle, CalendarRange, Check, Plus, Trash2, UserRound, Wand2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { OrgScope } from "./OrgApp";

type Data = inferRouterOutputs<AppRouter>["org"]["timetable"]["get"];
const emptyDraft = { dayOfWeek: 1, startTime: "16:30", endTime: "17:10", subject: "", teacherUserId: "", room: "" };
const timeKey = (slot: Pick<TimetableSlot, "startTime" | "endTime">) => `${slot.startTime}–${slot.endTime}`;

/** Haftalık tablo: satırlar ders saatleri, sütunlar günler (Pzt–Cmt, pazar dersi varsa Pazar da). */
function WeekGrid<T extends TimetableSlot>({ slots, render, onCell }: { slots: T[]; render: (slot: T) => React.ReactNode; onCell?: (slot: T) => void }) {
  const days = slots.some((slot) => slot.dayOfWeek === 7) ? [1, 2, 3, 4, 5, 6, 7] : [1, 2, 3, 4, 5, 6];
  const times = Array.from(new Set(sortSlots(slots.map((slot) => ({ ...slot, dayOfWeek: 1 }))).map(timeKey)));
  if (!slots.length) return <EmptyNote>Henüz ders yok.</EmptyNote>;
  return (
    <div className="-mx-5 overflow-x-auto">
      <table className="w-full min-w-[720px] table-fixed border-collapse text-left text-[12.5px]">
        <thead><tr className="border-y border-rule bg-paper/70 text-[12px] text-ink-3"><th className="w-[92px] px-3 py-2 font-semibold">Saat</th>{days.map((day) => <th key={day} className="px-2 py-2 font-semibold"><span className="hidden sm:inline">{DAY_LABELS[day - 1]}</span><span className="sm:hidden">{DAY_SHORT_LABELS[day - 1]}</span></th>)}</tr></thead>
        <tbody className="divide-y divide-rule">
          {times.map((time) => (
            <tr key={time}>
              <td className="px-3 py-2 align-top font-mono text-[11.5px] text-ink-3">{time}</td>
              {days.map((day) => {
                const cell = slots.filter((slot) => slot.dayOfWeek === day && timeKey(slot) === time);
                return (
                  <td key={day} className="px-1.5 py-1.5 align-top">
                    {cell.map((slot, index) => (
                      <button key={index} type="button" onClick={() => onCell?.(slot)} disabled={!onCell} className="mb-1 block w-full rounded-lg bg-brand-soft px-2 py-1.5 text-left transition enabled:hover:ring-2 enabled:hover:ring-brand/30">
                        {render(slot)}
                      </button>
                    ))}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Kurum Paneli → Ders programı. Koordinatör sınıfın haftalık derslerini öğretmen ve derslikle girer;
 * aynı öğretmen ya da derslik aynı saatte iki sınıfa verilemez (sunucu da denetler). Öğretmen kendi
 * haftalık programını görür. Sınıfın öğrencileri bu programı kendi takviminde dolu saat olarak görür.
 */
export default function OrgTimetable({ scope }: { scope: OrgScope }) {
  const utils = trpc.useUtils();
  const canManage = hasRole(scope.role, "coordinator");
  const data = trpc.org.timetable.get.useQuery({ orgId: scope.orgId }, { retry: false });
  const [tab, setTab] = useState<"class" | "teacher" | "auto">(canManage ? "class" : "teacher");
  const [classId, setClassId] = useState<number | null>(null);

  if (!data.data) return <div className="space-y-5"><PageHeader eyebrow={scope.orgName} title="Ders programı" /><EmptyNote>{data.isError ? "Program yüklenemedi." : "Yükleniyor…"}</EmptyNote></div>;
  const classes = data.data.classes;
  const activeClassId = classId ?? classes[0]?.id ?? null;

  return (
    <div className="space-y-5">
      <PageHeader eyebrow={scope.orgName} title="Ders programı" description="Her sınıfın haftalık derslerini branşına uygun öğretmenle gir. Aynı öğretmen ya da derslik aynı saatte iki sınıfa verilemez; sınıftaki öğrenciler bu dersleri kendi takviminde dolu saat olarak görür." />
      <div className="flex w-fit gap-1 rounded-2xl bg-paper p-1">
        <button onClick={() => setTab("class")} className={`rounded-xl px-4 py-2 text-[13px] font-semibold ${tab === "class" ? "bg-white text-ink shadow-sm" : "text-ink-3"}`}>Sınıf programı</button>
        <button onClick={() => setTab("teacher")} className={`rounded-xl px-4 py-2 text-[13px] font-semibold ${tab === "teacher" ? "bg-white text-ink shadow-sm" : "text-ink-3"}`}>Öğretmen programı</button>
        {canManage && <button onClick={() => setTab("auto")} className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-[13px] font-semibold ${tab === "auto" ? "bg-white text-ink shadow-sm" : "text-ink-3"}`}><Wand2 size={14} /> Otomatik dağıt</button>}
      </div>
      {tab === "auto" && canManage ? <AutoTimetable scope={scope} data={data.data} onSaved={() => { utils.org.timetable.get.invalidate(); setTab("class"); }} /> : tab === "class" ? (
        classes.length === 0 ? <EmptyNote>Önce Sınıflar sayfasından sınıf oluştur.</EmptyNote> : (
          <>
            <label className="block max-w-xs"><span className="form-label">Sınıf</span>
              <select value={activeClassId ?? ""} onChange={(event) => setClassId(Number(event.target.value))} className="form-input" aria-label="Sınıf">{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            </label>
            {activeClassId && <ClassTimetable key={activeClassId} scope={scope} data={data.data} classId={activeClassId} canManage={canManage} onSaved={() => utils.org.timetable.get.invalidate()} />}
          </>
        )
      ) : <TeacherTimetable data={data.data} canPick={canManage} />}
    </div>
  );
}

function ClassTimetable({ scope, data, classId, canManage, onSaved }: { scope: OrgScope; data: Data; classId: number; canManage: boolean; onSaved: () => void }) {
  const utils = trpc.useUtils();
  const current = useMemo(() => data.slots.filter((slot) => slot.classId === classId).map(({ dayOfWeek, startTime, endTime, subject, teacherUserId, room }) => ({ dayOfWeek, startTime, endTime, subject, teacherUserId, room })), [data.slots, classId]);
  const [slots, setSlots] = useState<TimetableSlot[]>(current);
  const [draft, setDraft] = useState(emptyDraft);
  const [editing, setEditing] = useState<number | null>(null);
  useEffect(() => { setSlots(current); }, [current]);
  const klass = data.classes.find((item) => item.id === classId)!;
  const teacherOf = (userId: number | null) => data.teachers.find((teacher) => teacher.userId === userId);
  const dirty = JSON.stringify(sortSlots(slots)) !== JSON.stringify(sortSlots(current));

  const save = trpc.org.timetable.saveClass.useMutation({
    onSuccess: (result) => { toast.success(`${klass.name} programı kaydedildi.`); result.warnings.forEach((warning) => toast.warning(`Branş dışı: ${warning}`)); onSaved(); },
    onError: (error) => toast.error(error.message),
  });
  const setAdvisor = trpc.org.classes.update.useMutation({ onSuccess: () => { toast.success("Sorumlu öğretmen güncellendi."); utils.org.timetable.get.invalidate(); utils.org.classes.list.invalidate(); }, onError: (error) => toast.error(error.message) });

  // Diğer sınıflarla çakışmalar kaydetmeden görünür (sunucu kayıtta yeniden denetler).
  const others = data.slots.map((slot) => ({ ...slot, room: slot.room ?? null }));
  const conflicts = findCrossClassConflicts(classId, slots, others);
  const conflictText = (slot: TimetableSlot) => conflicts.filter((conflict) => conflict.slot === slot).map((conflict) => conflict.kind === "teacher" ? `öğretmen ${data.classes.find((item) => item.id === conflict.other.classId)?.name ?? "başka sınıfta"}` : `derslik ${data.classes.find((item) => item.id === conflict.other.classId)?.name ?? "başka sınıfta"}`).join(", ");

  const draftSlot = (): TimetableSlot | null => {
    if (!draft.subject.trim()) { toast.error("Ders seç."); return null; }
    return { dayOfWeek: draft.dayOfWeek, startTime: draft.startTime, endTime: draft.endTime, subject: draft.subject.trim(), teacherUserId: draft.teacherUserId ? Number(draft.teacherUserId) : null, room: draft.room.trim() || null };
  };
  const addOrUpdate = () => {
    const slot = draftSlot();
    if (!slot) return;
    const next = editing === null ? [...slots, slot] : slots.map((item, index) => (index === editing ? slot : item));
    const problem = validateClassTimetable(next);
    if (problem) { toast.error(problem); return; }
    setSlots(sortSlots(next));
    setEditing(null);
    setDraft({ ...draft, subject: "", teacherUserId: "" });
  };
  const edit = (slot: TimetableSlot) => {
    if (!canManage) return;
    setEditing(slots.indexOf(slot));
    setDraft({ dayOfWeek: slot.dayOfWeek, startTime: slot.startTime, endTime: slot.endTime, subject: slot.subject, teacherUserId: slot.teacherUserId ? String(slot.teacherUserId) : "", room: slot.room ?? "" });
  };
  const applyPreset = (index: number) => {
    const preset = TIMETABLE_PERIOD_PRESETS[index];
    if (preset) setDraft({ ...draft, startTime: preset.periods[0].start, endTime: preset.periods[0].end });
  };
  const usedTimes = Array.from(new Set(slots.map(timeKey)));
  const matching = data.teachers.filter((teacher) => !draft.subject || !branchMismatch(draft.subject, teacher.subject));
  const rest = data.teachers.filter((teacher) => !matching.includes(teacher));
  const hours = weeklyHours(slots);
  const advisor = teacherOf(klass.advisorUserId);

  return (
    <div className="space-y-5">
      <Panel icon={<UserRound size={18} />} title="Sorumlu öğretmen" subtitle="Sınıfın sorumlusu sınıftaki tüm öğrencileri panelde görür ve haftalık sınıf özetini alır.">
        {canManage ? (
          <select value={klass.advisorUserId ?? ""} onChange={(event) => setAdvisor.mutate({ orgId: scope.orgId, classId, name: klass.name, gradeLevel: (klass.gradeLevel ?? null) as never, track: (klass.track ?? null) as never, advisorUserId: event.target.value ? Number(event.target.value) : null })} disabled={setAdvisor.isPending} className="form-input max-w-sm" aria-label="Sorumlu öğretmen">
            <option value="">Atanmadı</option>
            {data.teachers.map((teacher) => <option key={teacher.userId} value={teacher.userId}>{teacher.name}{teacher.subject ? ` · ${teacher.subject}` : ""}</option>)}
          </select>
        ) : <p className="text-[13px] text-ink-2">{advisor ? `${advisor.name}${advisor.subject ? ` · ${advisor.subject}` : ""}` : "Atanmadı"}</p>}
      </Panel>

      <Panel icon={<CalendarRange size={18} />} title={`${klass.name} · haftalık program`} subtitle={`${slots.length} ders${hours.length ? ` · ${hours.map((item) => `${item.subject} ${item.count}`).join(", ")}` : ""}`}
        action={canManage && dirty ? <button onClick={() => save.mutate({ orgId: scope.orgId, classId, slots: slots.map((slot) => ({ ...slot, room: slot.room ?? undefined })) })} disabled={save.isPending || conflicts.length > 0} className={primaryButton}><Check size={16} /> {save.isPending ? "Kaydediliyor…" : "Programı kaydet"}</button> : undefined}>
        {conflicts.length > 0 && <div className="mb-3 flex items-start gap-2 rounded-xl bg-danger-soft/60 px-3 py-2 text-[12.5px] text-danger"><AlertTriangle size={15} className="mt-0.5 shrink-0" /> Çakışan dersler var; düzeltmeden kaydedilemez.</div>}
        <WeekGrid slots={slots} onCell={canManage ? edit : undefined} render={(slot) => {
          const teacher = teacherOf(slot.teacherUserId);
          const clash = conflictText(slot);
          return (
            <>
              <span className="block truncate font-semibold text-ink">{slot.subject}</span>
              <span className={`block truncate text-[11.5px] ${teacher ? "text-ink-3" : "text-warn"}`}>{teacher?.name ?? "Öğretmen yok"}{teacher && branchMismatch(slot.subject, teacher.subject) ? " ⚠" : ""}</span>
              {slot.room && <span className="block truncate text-[11px] text-ink-4">{slot.room}</span>}
              {clash && <span className="block text-[11px] font-semibold text-danger">Çakışma: {clash}</span>}
            </>
          );
        }} />
        {canManage && dirty && <p className="mt-3 text-[12px] text-ink-3">Kaydedilmemiş değişiklik var.</p>}
      </Panel>

      {canManage && (
        <Panel icon={<Plus size={18} />} title={editing === null ? "Ders ekle" : "Dersi düzenle"} subtitle="Tablodaki bir derse tıklayınca burada düzenlenir.">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <label className="block"><span className="form-label">Gün</span><select value={draft.dayOfWeek} onChange={(event) => setDraft({ ...draft, dayOfWeek: Number(event.target.value) })} className="form-input" aria-label="Gün">{DAY_LABELS.map((label, index) => <option key={label} value={index + 1}>{label}</option>)}</select></label>
            <label className="block"><span className="form-label">Başlangıç</span><input type="time" value={draft.startTime} onChange={(event) => setDraft({ ...draft, startTime: event.target.value })} className="form-input" aria-label="Başlangıç" /></label>
            <label className="block"><span className="form-label">Bitiş</span><input type="time" value={draft.endTime} onChange={(event) => setDraft({ ...draft, endTime: event.target.value })} className="form-input" aria-label="Bitiş" /></label>
            <label className="block"><span className="form-label">Ders</span>
              <select value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value, teacherUserId: "" })} className="form-input" aria-label="Ders">
                <option value="">Seç</option>
                {TEACHER_SUBJECT_GROUPS.map((group) => <optgroup key={group.label} label={group.label}>{group.subjects.filter((subject) => subject !== "Rehberlik").map((subject) => <option key={subject} value={subject}>{subject}</option>)}</optgroup>)}
                <option value="Rehberlik">Rehberlik</option>
                {draft.subject && !TEACHER_SUBJECTS.includes(draft.subject) && <option value={draft.subject}>{draft.subject}</option>}
              </select>
            </label>
            <label className="block"><span className="form-label">Öğretmen</span>
              <select value={draft.teacherUserId} onChange={(event) => setDraft({ ...draft, teacherUserId: event.target.value })} className="form-input" aria-label="Öğretmen">
                <option value="">Sonra atanacak</option>
                {matching.length > 0 && <optgroup label={draft.subject ? `${draft.subject} branşı` : "Öğretmenler"}>{matching.map((teacher) => <option key={teacher.userId} value={teacher.userId}>{teacher.name}{teacher.subject ? ` · ${teacher.subject}` : ""}</option>)}</optgroup>}
                {rest.length > 0 && <optgroup label="Diğer branşlar">{rest.map((teacher) => <option key={teacher.userId} value={teacher.userId}>{teacher.name}{teacher.subject ? ` · ${teacher.subject}` : ""}</option>)}</optgroup>}
              </select>
            </label>
            <label className="block"><span className="form-label">Derslik</span><input value={draft.room} onChange={(event) => setDraft({ ...draft, room: event.target.value })} maxLength={40} placeholder="Ör. B-203" className="form-input" aria-label="Derslik" /></label>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[12px]">
            <span className="text-ink-3">Hızlı saat:</span>
            {usedTimes.map((time) => <button key={time} type="button" onClick={() => { const [startTime, endTime] = time.split("–"); setDraft({ ...draft, startTime, endTime }); }} className="rounded-full bg-paper px-2.5 py-1 font-mono text-ink-2 hover:bg-brand-soft">{time}</button>)}
            {TIMETABLE_PERIOD_PRESETS.flatMap((preset) => preset.periods).filter((period) => !usedTimes.includes(timeKey({ startTime: period.start, endTime: period.end }))).slice(0, 6).map((period) => <button key={period.start} type="button" onClick={() => setDraft({ ...draft, startTime: period.start, endTime: period.end })} className="rounded-full border border-rule px-2.5 py-1 font-mono text-ink-3 hover:bg-paper">{period.start}–{period.end}</button>)}
            <select onChange={(event) => { applyPreset(Number(event.target.value)); event.target.value = ""; }} defaultValue="" className="form-input ml-1 h-8 w-auto text-[12px]" aria-label="Saat şablonu"><option value="" disabled>Şablon…</option>{TIMETABLE_PERIOD_PRESETS.map((preset, index) => <option key={preset.label} value={index}>{preset.label}</option>)}</select>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={addOrUpdate} className={primaryButton}>{editing === null ? <><Plus size={16} /> Tabloya ekle</> : <><Check size={16} /> Güncelle</>}</button>
            {editing !== null && <button onClick={() => { setSlots(slots.filter((_, index) => index !== editing)); setEditing(null); setDraft(emptyDraft); }} className={secondaryButton}><Trash2 size={15} /> Dersi sil</button>}
            {editing !== null && <button onClick={() => { setEditing(null); setDraft(emptyDraft); }} className={secondaryButton}>Vazgeç</button>}
          </div>
        </Panel>
      )}
    </div>
  );
}

type RequirementRow = { subject: string; teacherUserId: string; perWeek: number };
type AutoResult = ReturnType<typeof generateTimetables>;

/** Kayıtlı programdan haftalık ders saatleri: ders başına sayı ve en çok giren öğretmen. */
function requirementsFrom(slots: TimetableSlot[]): RequirementRow[] {
  const rows = weeklyHours(slots).map(({ subject, count }) => {
    const teachers = slots.filter((slot) => slot.subject === subject && slot.teacherUserId).map((slot) => slot.teacherUserId!);
    const top = teachers.sort((a, b) => teachers.filter((id) => id === b).length - teachers.filter((id) => id === a).length)[0];
    return { subject, teacherUserId: top ? String(top) : "", perWeek: count };
  });
  return rows.length ? rows : [{ subject: "", teacherUserId: "", perWeek: 4 }];
}

/**
 * Otomatik dağıt: seçilen sınıfların haftalık ders saatleri + öğretmenleri + kullanılabilir saatler
 * verilir; programlar BİRLİKTE kurulur (ortak öğretmen/derslik iki sınıfa aynı saatte düşmez),
 * seçilmeyen sınıfların kayıtlı programı sabit kalır. Sonuç önizlenir; "Tümünü kaydet" seçilen
 * sınıfların programını tek işlemde değiştirir.
 */
function AutoTimetable({ scope, data, onSaved }: { scope: OrgScope; data: Data; onSaved: () => void }) {
  const slotsOf = (classId: number) => data.slots.filter((slot) => slot.classId === classId).map(({ dayOfWeek, startTime, endTime, subject, teacherUserId, room }) => ({ dayOfWeek, startTime, endTime, subject, teacherUserId, room: room ?? null }));
  const [selected, setSelected] = useState<number[]>(() => data.classes.map((item) => item.id));
  const [editingClass, setEditingClass] = useState<number | null>(data.classes[0]?.id ?? null);
  const [rowsByClass, setRowsByClass] = useState<Record<number, RequirementRow[]>>(() => Object.fromEntries(data.classes.map((item) => [item.id, requirementsFrom(slotsOf(item.id))])));
  const [roomByClass, setRoomByClass] = useState<Record<number, string>>(() => Object.fromEntries(data.classes.map((item) => [item.id, slotsOf(item.id).find((slot) => slot.room)?.room ?? ""])));
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [weekdayPreset, setWeekdayPreset] = useState(0);
  const [weekendPreset, setWeekendPreset] = useState(1);
  const [result, setResult] = useState<AutoResult | null>(null);
  const [previewClass, setPreviewClass] = useState<number | null>(null);
  const save = trpc.org.timetable.saveClasses.useMutation({
    onSuccess: (response) => { toast.success(`${result?.length ?? 0} sınıfın programı kaydedildi.`); response.warnings.forEach((warning) => toast.warning(`Branş dışı: ${warning}`)); setResult(null); onSaved(); },
    onError: (error) => toast.error(error.message),
  });

  const className = (classId: number) => data.classes.find((item) => item.id === classId)?.name ?? "Sınıf";
  const teacherName = (userId: number | null) => data.teachers.find((teacher) => teacher.userId === userId)?.name;
  const cells = buildPeriodCells(days, TIMETABLE_PERIOD_PRESETS[weekdayPreset]?.periods ?? [], TIMETABLE_PERIOD_PRESETS[weekendPreset]?.periods ?? []);
  const activeClass = editingClass !== null && selected.includes(editingClass) ? editingClass : selected[0] ?? null;
  const rows = activeClass !== null ? rowsByClass[activeClass] ?? [] : [];
  const setRows = (next: RequirementRow[]) => activeClass !== null && setRowsByClass({ ...rowsByClass, [activeClass]: next });
  const update = (index: number, patch: Partial<RequirementRow>) => setRows(rows.map((row, at) => (at === index ? { ...row, ...patch } : row)));
  const totalOf = (classId: number) => (rowsByClass[classId] ?? []).reduce((sum, row) => sum + (row.subject ? row.perWeek : 0), 0);
  const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  const busiest = selected.reduce((max, classId) => Math.max(max, totalOf(classId)), 0);

  const generate = () => {
    if (!selected.length) { toast.error("En az bir sınıf seç."); return; }
    if (!cells.length) { toast.error("En az bir gün ve saat şablonu seç."); return; }
    const classes = selected.map((classId) => ({ classId, room: roomByClass[classId] || null, requirements: (rowsByClass[classId] ?? []).filter((row) => row.subject && row.perWeek > 0).map((row) => ({ subject: row.subject, teacherUserId: row.teacherUserId ? Number(row.teacherUserId) : null, perWeek: row.perWeek })) }));
    if (classes.every((item) => !item.requirements.length)) { toast.error("En az bir sınıfa ders ve haftalık saat gir."); return; }
    const generated = generateTimetables({ classes, cells, others: data.slots.map((slot) => ({ ...slot, room: slot.room ?? null })) });
    setResult(generated);
    setPreviewClass(generated[0]?.classId ?? null);
    const missing = generated.filter((item) => item.unplaced.length);
    if (missing.length) toast.warning(`Yerleşmeyen dersler var: ${missing.map((item) => `${className(item.classId)} (${item.unplaced.map((value) => `${value.subject} ${value.missing}`).join(", ")})`).join("; ")}. Gün ya da saat ekleyip tekrar dene.`, { duration: 9000 });
    else toast.success(`${generated.reduce((sum, item) => sum + item.slots.length, 0)} ders ${generated.length} sınıfa yerleşti. Önizleyip "Tümünü kaydet"e bas.`);
  };

  if (!data.classes.length) return <EmptyNote>Önce Sınıflar sayfasından sınıf oluştur.</EmptyNote>;
  const preview = result?.find((item) => item.classId === previewClass) ?? null;

  return (
    <div className="space-y-5">
      <Panel icon={<Wand2 size={18} />} title="1. Sınıflar ve haftalık dersler" subtitle="Seçilen sınıfların programı birlikte kurulur; seçilmeyen sınıfların kayıtlı programı sabit kalır.">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Dağıtılacak sınıflar">
          {data.classes.map((item) => (
            <button key={item.id} type="button" onClick={() => setSelected(toggle(selected, item.id))} aria-pressed={selected.includes(item.id)} className={`rounded-full px-3 py-1.5 text-[12px] font-semibold ${selected.includes(item.id) ? "bg-brand text-white" : "bg-paper text-ink-3"}`}>{item.name}</button>
          ))}
        </div>
        {activeClass !== null && (
          <div className="mt-4">
            <div className="flex flex-wrap items-end gap-3">
              <label className="block min-w-[180px]"><span className="form-label">Dersleri düzenlenen sınıf</span>
                <select value={activeClass} onChange={(event) => setEditingClass(Number(event.target.value))} className="form-input" aria-label="Dersleri düzenlenen sınıf">{selected.map((classId) => <option key={classId} value={classId}>{className(classId)} · {totalOf(classId)} ders</option>)}</select>
              </label>
              <label className="block w-36"><span className="form-label">Derslik</span><input value={roomByClass[activeClass] ?? ""} onChange={(event) => setRoomByClass({ ...roomByClass, [activeClass]: event.target.value })} maxLength={40} placeholder="Ör. B-203" className="form-input" aria-label="Sınıfın dersliği" /></label>
              {selected.length > 1 && <button type="button" onClick={() => { setRowsByClass({ ...rowsByClass, ...Object.fromEntries(selected.filter((classId) => classId !== activeClass).map((classId) => [classId, rows.map((row) => ({ ...row }))])) }); toast.success("Dersler diğer seçili sınıflara kopyalandı."); }} className={secondaryButton}>Diğer sınıflara kopyala</button>}
            </div>
            <div className="mt-3 space-y-2">
              {rows.map((row, index) => {
                const matching = data.teachers.filter((teacher) => !row.subject || !branchMismatch(row.subject, teacher.subject));
                const rest = data.teachers.filter((teacher) => !matching.includes(teacher));
                return (
                  <div key={index} className="grid grid-cols-[1fr_76px_auto] gap-2 sm:grid-cols-[1.2fr_90px_1.4fr_auto]">
                    <select value={row.subject} onChange={(event) => update(index, { subject: event.target.value, teacherUserId: "" })} className="form-input" aria-label={`Ders ${index + 1}`}>
                      <option value="">Ders seç</option>
                      {TEACHER_SUBJECT_GROUPS.map((group) => <optgroup key={group.label} label={group.label}>{group.subjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}</optgroup>)}
                      {row.subject && !TEACHER_SUBJECTS.includes(row.subject) && <option value={row.subject}>{row.subject}</option>}
                    </select>
                    <input type="number" min={1} max={20} value={row.perWeek} onChange={(event) => update(index, { perWeek: Math.max(1, Math.min(20, Number(event.target.value) || 1)) })} className="form-input" aria-label={`Haftalık saat ${index + 1}`} title="Haftalık ders saati" />
                    <select value={row.teacherUserId} onChange={(event) => update(index, { teacherUserId: event.target.value })} className="form-input col-span-2 sm:col-span-1" aria-label={`Öğretmen ${index + 1}`}>
                      <option value="">Sonra atanacak</option>
                      {matching.length > 0 && <optgroup label={row.subject ? `${row.subject} branşı` : "Öğretmenler"}>{matching.map((teacher) => <option key={teacher.userId} value={teacher.userId}>{teacher.name}{teacher.subject ? ` · ${teacher.subject}` : ""}</option>)}</optgroup>}
                      {rest.length > 0 && <optgroup label="Diğer branşlar">{rest.map((teacher) => <option key={teacher.userId} value={teacher.userId}>{teacher.name}{teacher.subject ? ` · ${teacher.subject}` : ""}</option>)}</optgroup>}
                    </select>
                    <button onClick={() => setRows(rows.length > 1 ? rows.filter((_, at) => at !== index) : rows)} className="row-start-1 col-start-3 flex h-10 w-10 items-center justify-center rounded-xl text-ink-3 hover:bg-paper sm:col-start-4" aria-label="Satırı sil"><Trash2 size={15} /></button>
                  </div>
                );
              })}
              <button onClick={() => setRows([...rows, { subject: "", teacherUserId: "", perWeek: 2 }])} className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-brand"><Plus size={14} /> Ders ekle</button>
            </div>
          </div>
        )}
      </Panel>

      <Panel icon={<CalendarRange size={18} />} title="2. Günler ve saatler" subtitle="Bir ders bir güne en fazla 2 kez düşer; aynı güne düşen iki ders yan yana konur.">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block"><span className="form-label">Hafta içi saatleri</span>
            <select value={weekdayPreset} onChange={(event) => setWeekdayPreset(Number(event.target.value))} className="form-input" aria-label="Hafta içi saatleri">{TIMETABLE_PERIOD_PRESETS.map((preset, index) => <option key={preset.label} value={index}>{preset.label}</option>)}</select>
          </label>
          <label className="block"><span className="form-label">Hafta sonu saatleri</span>
            <select value={weekendPreset} onChange={(event) => setWeekendPreset(Number(event.target.value))} className="form-input" aria-label="Hafta sonu saatleri">{TIMETABLE_PERIOD_PRESETS.map((preset, index) => <option key={preset.label} value={index}>{preset.label}</option>)}</select>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Ders günleri">
          {DAY_LABELS.map((label, index) => (
            <button key={label} type="button" onClick={() => setDays(toggle(days, index + 1).sort())} aria-pressed={days.includes(index + 1)} className={`rounded-full px-3 py-1.5 text-[12px] font-semibold ${days.includes(index + 1) ? "bg-brand text-white" : "bg-paper text-ink-3"}`}>{label}</button>
          ))}
        </div>
        <p className={`mt-3 text-[12.5px] ${busiest > cells.length ? "text-warn" : "text-ink-3"}`}>Haftada {cells.length} ders saati · en yoğun sınıf {busiest} ders{busiest > cells.length ? " — saat yetmiyor, gün ekle." : "."}</p>
        <div className="mt-4"><button onClick={generate} className={primaryButton}><Wand2 size={16} /> Programı oluştur</button></div>
      </Panel>

      {result && (
        <Panel icon={<Check size={18} />} title="3. Önizle ve kaydet" subtitle="Kaydedince seçilen sınıfların kayıtlı programı bu programla değişir."
          action={<button onClick={() => save.mutate({ orgId: scope.orgId, classes: result.map((item) => ({ classId: item.classId, slots: item.slots.map((slot) => ({ ...slot, room: slot.room ?? undefined })) })) })} disabled={save.isPending} className={primaryButton}><Check size={16} /> {save.isPending ? "Kaydediliyor…" : "Tümünü kaydet"}</button>}>
          <div className="flex flex-wrap gap-1.5">
            {result.map((item) => (
              <button key={item.classId} type="button" onClick={() => setPreviewClass(item.classId)} className={`rounded-xl px-3 py-1.5 text-left text-[12px] font-semibold ${previewClass === item.classId ? "bg-ink text-white" : "bg-paper text-ink-2"}`}>
                {className(item.classId)} · {item.slots.length} ders{item.unplaced.length ? <span className="ml-1 text-warn">· {item.unplaced.reduce((sum, value) => sum + value.missing, 0)} eksik</span> : ""}
              </button>
            ))}
          </div>
          {preview && (
            <div className="mt-4">
              {preview.unplaced.length > 0 && <p className="mb-3 rounded-xl bg-warn-soft/60 px-3 py-2 text-[12.5px] text-warn">Yerleşmedi: {preview.unplaced.map((value) => `${value.subject} ${value.missing} saat`).join(", ")}.</p>}
              <WeekGrid slots={preview.slots} render={(slot) => (
                <>
                  <span className="block truncate font-semibold text-ink">{slot.subject}</span>
                  <span className={`block truncate text-[11.5px] ${slot.teacherUserId ? "text-ink-3" : "text-warn"}`}>{teacherName(slot.teacherUserId) ?? "Öğretmen yok"}</span>
                  {slot.room && <span className="block truncate text-[11px] text-ink-4">{slot.room}</span>}
                </>
              )} />
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}

function TeacherTimetable({ data, canPick }: { data: Data; canPick: boolean }) {
  const { user } = useAuth();
  const teachersWithSlots = data.teachers.filter((teacher) => data.slots.some((slot) => slot.teacherUserId === teacher.userId));
  const [teacherId, setTeacherId] = useState<number | null>(null);
  const activeId = teacherId ?? (data.teachers.some((teacher) => teacher.userId === user?.id) ? user!.id : teachersWithSlots[0]?.userId ?? data.teachers[0]?.userId ?? null);
  const teacher = data.teachers.find((item) => item.userId === activeId);
  const slots = data.slots.filter((slot) => slot.teacherUserId === activeId).map((slot) => ({ ...slot, room: slot.room ?? null }));
  const className = (classId: number) => data.classes.find((item) => item.id === classId)?.name ?? "Sınıf";
  const minutes = weeklyHours(slots).reduce((sum, item) => sum + item.minutes, 0);
  const advising = data.classes.filter((item) => item.advisorUserId === activeId).map((item) => item.name);

  return (
    <div className="space-y-5">
      {canPick && (
        <label className="block max-w-xs"><span className="form-label">Öğretmen</span>
          <select value={activeId ?? ""} onChange={(event) => setTeacherId(Number(event.target.value))} className="form-input" aria-label="Öğretmen seç">{data.teachers.map((item) => <option key={item.userId} value={item.userId}>{item.name}{item.subject ? ` · ${item.subject}` : ""}</option>)}</select>
        </label>
      )}
      {!teacher ? <EmptyNote>Kurumda öğretmen yok.</EmptyNote> : (
        <Panel icon={<CalendarRange size={18} />} title={`${teacher.name}${teacher.subject ? ` · ${teacher.subject}` : ""}`} subtitle={`Haftada ${slots.length} ders (${Math.round(minutes / 6) / 10} saat)${advising.length ? ` · Sorumlu olduğu sınıf: ${advising.join(", ")}` : ""}`}>
          <WeekGrid slots={slots} render={(slot) => (
            <>
              <span className="block truncate font-semibold text-ink">{className(slot.classId)}</span>
              <span className="block truncate text-[11.5px] text-ink-3">{slot.subject}{slot.room ? ` · ${slot.room}` : ""}</span>
            </>
          )} />
        </Panel>
      )}
    </div>
  );
}
