import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../../server/routers";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { EmptyNote, PageHeader, Panel, primaryButton, secondaryButton } from "@/components/app/kit";
import { DAY_LABELS, DAY_SHORT_LABELS } from "@shared/classSchedule";
import { TEACHER_SUBJECT_GROUPS, TEACHER_SUBJECTS, hasRole } from "@shared/org";
import { TIMETABLE_PERIOD_PRESETS, branchMismatch, findCrossClassConflicts, sortSlots, validateClassTimetable, weeklyHours, type TimetableSlot } from "@shared/orgTimetable";
import { AlertTriangle, CalendarRange, Check, Plus, Trash2, UserRound } from "lucide-react";
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
  const [tab, setTab] = useState<"class" | "teacher">(canManage ? "class" : "teacher");
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
      </div>
      {tab === "class" ? (
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
