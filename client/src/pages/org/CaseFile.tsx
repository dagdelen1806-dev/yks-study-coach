import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../../server/routers";
import { EmptyNote, Panel, primaryButton, secondaryButton } from "@/components/app/kit";
import { trpc } from "@/lib/trpc";
import { fromMinutes } from "@shared/classSchedule";
import type { ExamKind } from "@shared/exams";
import { BookOpen, CalendarClock, CheckCircle2, ClipboardCheck, FolderOpen, Lock, MessageSquare, RotateCcw, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { OrgScope } from "./OrgApp";

type Detail = inferRouterOutputs<AppRouter>["org"]["cases"]["get"];
type Signal = inferRouterOutputs<AppRouter>["org"]["cases"]["signals"][number];
type DraftItem = { subject: string; topicId: number | null; topic: string; minutes: number; bookId?: string; bookContentId?: number; pages?: string; label: string };

export const CASE_STATUS_LABELS: Record<Detail["case"]["status"], string> = { open: "Açık", in_progress: "Devam ediyor", evaluating: "Değerlendirmede", closed: "Sonuçlandı" };
const OUTCOME_LABELS = { completed: "Tamamlandı", ongoing: "Devam ediyor", reassess: "Yeniden değerlendir" } as const;
const FEEDBACK_LABELS = { done: "Tamamladım", struggled: "Zorlandım", needs_review: "Tekrar etmeliyim" } as const;
const CONFIDENCE_LABELS = { high: "Yüksek güven", medium: "Orta güven", low: "Düşük güven" } as const;
const newKey = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
const tomorrowKey = () => { const date = new Date(Date.now() + 24 * 60 * 60 * 1000); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; };
const dateLabel = (value: string | Date) => new Date(value).toLocaleDateString("tr-TR", { weekday: "short", day: "numeric", month: "short" });

/** Öğrenci detayı → "Takip dosyası" sekmesi. Kurumda kapalıysa hiç görünmez (üst bileşen karar verir). */
export default function CaseFile({ scope, studentUserId }: { scope: OrgScope; studentUserId: number }) {
  const status = trpc.org.cases.status.useQuery({ orgId: scope.orgId }, { retry: false });
  const queue = trpc.org.cases.queue.useQuery({ orgId: scope.orgId }, { retry: false, enabled: Boolean(status.data?.enabled) });
  const signals = trpc.org.cases.signals.useQuery({ orgId: scope.orgId }, { retry: false, enabled: Boolean(status.data?.enabled) });
  if (!status.data || queue.isLoading || signals.isLoading) return <EmptyNote>Yükleniyor…</EmptyNote>;
  const mine = (queue.data ?? []).filter((row) => row.studentUserId === studentUserId);
  const active = mine.find((row) => row.status !== "closed") ?? mine[0];
  if (active) return <CaseView scope={scope} caseId={active.id} />;
  return <NoCase scope={scope} studentUserId={studentUserId} signals={(signals.data ?? []).filter((signal) => signal.studentUserId === studentUserId)} text={status.data} />;
}

function NoCase({ scope, studentUserId, signals, text }: { scope: OrgScope; studentUserId: number; signals: Signal[]; text: { title: string; text: string } }) {
  const utils = trpc.useUtils();
  const open = trpc.org.cases.open.useMutation({ onSuccess: () => { toast.success("Takip dosyası açıldı."); void utils.org.cases.invalidate(); }, onError: (error) => toast.error(error.message) });
  const signal = signals.find((item) => item.status === "signal");
  return (
    <div className="space-y-4">
      {signal ? (
        <Panel icon={<ClipboardCheck size={18} />} title={text.title} subtitle={`${signal.description} · ${CONFIDENCE_LABELS[(signal.confidence ?? "medium") as keyof typeof CONFIDENCE_LABELS]}`}>
          <p className="max-w-[68ch] text-[14px] leading-6 text-ink-2">{text.text}</p>
          <p className="mt-2 text-[12.5px] text-ink-3">Bu bir teşhis değildir; öğrenciyi etiketlemez. Dosyayı açarsan açılış anının denemeleri, çalışma süresi ve zayıf konuları kanıt olarak kaydedilir.</p>
          <button onClick={() => open.mutate({ orgId: scope.orgId, studentUserId, ruleKey: "trend_decline", examKind: signal.examKind })} disabled={open.isPending} className={`${primaryButton} mt-4`}><FolderOpen size={16} /> Takip dosyası aç</button>
        </Panel>
      ) : (
        <Panel icon={<ClipboardCheck size={18} />} title="Akademik takip" subtitle="Bu öğrenci için inceleme önerisi yok.">
          {signals.length > 0 && <ul className="mb-3 space-y-1 text-[13px] text-ink-3">{signals.map((item) => <li key={item.examKind}>{item.description}</li>)}</ul>}
          <p className="text-[13px] text-ink-3">Gerek görürsen dosyayı kendin açabilirsin; kanıt olarak son denemeler ve çalışma kayıtları kaydedilir.</p>
          <button onClick={() => open.mutate({ orgId: scope.orgId, studentUserId, ruleKey: "manual", examKind: (signals[0]?.examKind ?? null) as ExamKind | null })} disabled={open.isPending} className={`${secondaryButton} mt-3`}><FolderOpen size={16} /> Dosyayı elle aç</button>
        </Panel>
      )}
    </div>
  );
}

function CaseView({ scope, caseId }: { scope: OrgScope; caseId: number }) {
  const utils = trpc.useUtils();
  const detail = trpc.org.cases.get.useQuery({ orgId: scope.orgId, caseId }, { retry: false });
  const refresh = () => { void utils.org.cases.invalidate(); };
  if (detail.isError) return <EmptyNote>{detail.error.message}</EmptyNote>;
  if (!detail.data) return <EmptyNote>Yükleniyor…</EmptyNote>;
  const data = detail.data;
  const closed = data.case.status === "closed";
  return (
    <div className="space-y-5">
      <CaseHeader data={data} />
      <Evidence data={data} />
      {!closed && <ResourcesAndPlan scope={scope} data={data} onChanged={refresh} />}
      <Tasks data={data} />
      <Notes scope={scope} data={data} onChanged={refresh} />
      <Timeline data={data} />
      <Evaluate scope={scope} data={data} onChanged={refresh} />
    </div>
  );
}

function CaseHeader({ data }: { data: Detail }) {
  const summary = data.evidence.find((item) => item.kind === "exam" && item.refId === null)?.snapshot as { summary?: string } | null;
  const tone = data.case.status === "closed" ? "bg-success-soft text-success" : data.case.status === "open" ? "bg-warn-soft text-warn" : "bg-brand-soft text-brand";
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-rule bg-white p-4">
      <span className={`rounded-full px-2.5 py-1 text-[12px] font-bold ${tone}`}>{CASE_STATUS_LABELS[data.case.status]}</span>
      <span className="rounded-full bg-paper px-2.5 py-1 text-[12px] font-semibold text-ink-3">{CONFIDENCE_LABELS[data.case.confidence]}</span>
      {data.case.outcome && <span className="rounded-full bg-paper px-2.5 py-1 text-[12px] font-semibold text-ink-3">Son karar: {OUTCOME_LABELS[data.case.outcome]}</span>}
      <span className="text-[13px] text-ink-2">{summary?.summary ?? (data.case.ruleKey === "manual" ? "Öğretmenin açtığı dosya" : "Akademik inceleme")}</span>
      <span className="ml-auto text-[12px] text-ink-4">Açılış: {new Date(data.case.openedAt).toLocaleDateString("tr-TR")}</span>
    </div>
  );
}

function Evidence({ data }: { data: Detail }) {
  const exams = data.evidence.filter((item) => item.kind === "exam" && item.refId !== null).map((item) => item.snapshot as { title: string; date: string; net: number; subjects: Record<string, number> | null });
  const study = data.evidence.find((item) => item.kind === "study")?.snapshot as { weeks: Array<{ weeksAgo: number; minutes: number; questions: number }> } | null;
  const subjects = Array.from(new Set(exams.flatMap((exam) => Object.keys(exam.subjects ?? {}))));
  return (
    <Panel icon={<ClipboardCheck size={18} />} title="Kanıt" subtitle="Dosya açıldığı anın kaydı; sonradan değişen veri bunu değiştirmez.">
      {exams.length > 0 && (
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-[13px]">
            <thead><tr className="border-y border-rule bg-paper/70 text-[12px] text-ink-3"><th className="px-5 py-2 font-semibold">Deneme</th><th className="px-3 py-2 font-semibold">Net</th>{subjects.map((subject) => <th key={subject} className="px-3 py-2 font-semibold">{subject}</th>)}</tr></thead>
            <tbody className="divide-y divide-rule">{exams.map((exam) => <tr key={exam.date}><td className="px-5 py-2 text-ink-2">{exam.title} <span className="text-ink-4">· {new Date(exam.date).toLocaleDateString("tr-TR")}</span></td><td className="px-3 py-2 font-semibold tabular-nums text-ink">{exam.net}</td>{subjects.map((subject) => <td key={subject} className="px-3 py-2 tabular-nums text-ink-3">{typeof exam.subjects?.[subject] === "number" ? Number(exam.subjects[subject]).toFixed(1) : "—"}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )}
      {study && <p className="mt-3 text-[13px] text-ink-2">Son 4 haftanın çalışma süresi: {study.weeks.map((week) => `${week.minutes} dk`).join(" → ")}</p>}
    </Panel>
  );
}

function ResourcesAndPlan({ scope, data, onChanged }: { scope: OrgScope; data: Detail; onChanged: () => void }) {
  const weak = (data.evidence.find((item) => item.kind === "topic")?.snapshot as { weak: Array<{ topicId: number; subject: string; topic: string; progress: number }> } | null)?.weak ?? [];
  const [chosen, setChosen] = useState<number[]>(() => weak.slice(0, 3).map((topic) => topic.topicId));
  const [draft, setDraft] = useState<DraftItem[]>([]);
  const [from, setFrom] = useState(tomorrowKey);
  const [days, setDays] = useState(3);
  const [key, setKey] = useState(newKey);
  const resources = trpc.org.cases.suggestResources.useQuery({ orgId: scope.orgId, caseId: data.case.id, topicIds: chosen }, { enabled: chosen.length > 0, retry: false });
  const items = draft.map(({ label: _label, ...item }) => item);
  const preview = trpc.org.cases.previewPlan.useQuery({ orgId: scope.orgId, caseId: data.case.id, items, from, days }, { enabled: draft.length > 0, retry: false });
  const assign = trpc.org.cases.assignPlan.useMutation({
    onSuccess: (result) => { toast.success(result.skipped.length ? `${result.sessionIds.length} görev eklendi; ${result.skipped.length} görev için uygun saat yok.` : `${result.sessionIds.length} görev öğrencinin takvimine eklendi.`); setDraft([]); setKey(newKey()); onChanged(); },
    onError: (error) => toast.error(error.message),
  });
  const topicName = (id: number) => weak.find((topic) => topic.topicId === id);
  const add = (item: DraftItem) => setDraft((current) => [...current, item]);

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Panel icon={<BookOpen size={18} />} title="Eldeki kitaplardan öner" subtitle="Önce öğrencinin rafındaki kitaplar; yeni kaynak yalnızca rafta karşılığı olmayan konu için.">
        {weak.length === 0 ? <EmptyNote>Kanıtta zayıf konu yok. Plan için konuyu aşağıdan elle ekleyebilirsin.</EmptyNote> : (
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Konular">
            {weak.map((topic) => <button key={topic.topicId} type="button" aria-pressed={chosen.includes(topic.topicId)} onClick={() => setChosen((list) => (list.includes(topic.topicId) ? list.filter((id) => id !== topic.topicId) : [...list, topic.topicId].slice(-10)))} className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${chosen.includes(topic.topicId) ? "bg-brand text-white" : "bg-paper text-ink-3"}`}>{topic.topic}</button>)}
          </div>
        )}
        <div className="mt-4 space-y-3">
          {(resources.data?.owned ?? []).map((book) => (
            <div key={book.bookId} className="rounded-xl border border-rule p-3">
              <div className="text-[13.5px] font-semibold text-ink">{book.title}</div>
              <ul className="mt-2 space-y-1.5">{book.items.map((item) => {
                const topic = topicName(item.topicId);
                const pages = item.pageStart ? `s. ${item.pageStart}${item.pageEnd ? `–${item.pageEnd}` : ""}` : "";
                return (
                  <li key={item.bookContentId} className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-ink-2">
                    <span>{item.label}{item.title ? ` · ${item.title}` : ""}{pages ? ` (${pages})` : ""}</span>
                    <button onClick={() => add({ subject: topic?.subject ?? "Ders", topicId: item.topicId, topic: topic?.topic ?? item.title, minutes: 40, bookId: book.bookId, bookContentId: item.bookContentId, pages: pages || undefined, label: `${book.title} · ${item.label}` })} className="rounded-lg border border-rule px-2 py-1 text-[12px] font-semibold text-brand hover:bg-brand-soft">Plana ekle</button>
                  </li>
                );
              })}</ul>
            </div>
          ))}
          {(resources.data?.missingTopicIds ?? []).length > 0 && (
            <div className="rounded-xl bg-paper p-3 text-[13px] text-ink-2">
              <div className="font-semibold">Rafta kaynak yok: {resources.data!.missingTopicIds.map((id) => topicName(id)?.topic ?? "Konu").join(", ")}</div>
              {resources.data!.catalog.length > 0 && <div className="mt-1 text-ink-3">Yeni kaynak önerisi: {resources.data!.catalog.map((book) => book.title).join(", ")}</div>}
              <div className="mt-2 flex flex-wrap gap-1.5">{resources.data!.missingTopicIds.map((id) => { const topic = topicName(id); return topic ? <button key={id} onClick={() => add({ subject: topic.subject, topicId: id, topic: topic.topic, minutes: 40, label: `${topic.topic} · konu tekrarı` })} className="rounded-lg border border-rule bg-white px-2 py-1 text-[12px] font-semibold text-brand">{topic.topic} için kitapsız görev ekle</button> : null; })}</div>
            </div>
          )}
        </div>
      </Panel>

      <Panel icon={<CalendarClock size={18} />} title="Çalışma planı önizlemesi" subtitle="Okul, dershane ve öğrencinin planlı saatlerine görev yazılmaz; uygun saat yoksa söylenir.">
        {draft.length === 0 ? <EmptyNote>Soldan "Plana ekle" ile görev ekle.</EmptyNote> : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="form-label">Başlangıç</span><input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="form-input" aria-label="Plan başlangıcı" /></label>
              <label className="block"><span className="form-label">Gün sayısı</span><input type="number" min={1} max={14} value={days} onChange={(event) => setDays(Math.max(1, Math.min(14, Number(event.target.value) || 1)))} className="form-input" aria-label="Gün sayısı" /></label>
            </div>
            <ul className="mt-3 space-y-2">
              {draft.map((item, index) => {
                const place = preview.data?.find((entry) => entry.itemIndex === index);
                return (
                  <li key={index} className="flex flex-wrap items-center gap-2 rounded-xl border border-rule px-3 py-2 text-[13px]">
                    <span className="min-w-0 flex-1 text-ink-2">{item.label}</span>
                    <input type="number" min={10} max={180} value={item.minutes} onChange={(event) => setDraft(draft.map((entry, at) => (at === index ? { ...entry, minutes: Math.max(10, Math.min(180, Number(event.target.value) || 40)) } : entry)))} className="form-input h-8 w-20 text-[12px]" aria-label={`Süre ${index + 1}`} />
                    <span className={`text-[12px] font-semibold ${place && place.date ? "text-success" : "text-warn"}`}>{!place ? "…" : place.date && "start" in place ? `${dateLabel(place.date)} ${fromMinutes(place.start)}` : "Uygun saat yok"}</span>
                    <button onClick={() => setDraft(draft.filter((_, at) => at !== index))} className="rounded-lg p-1 text-ink-3 hover:bg-paper" aria-label="Görevi çıkar"><Trash2 size={14} /></button>
                  </li>
                );
              })}
            </ul>
            <button onClick={() => assign.mutate({ orgId: scope.orgId, caseId: data.case.id, items, from, days, idempotencyKey: key })} disabled={assign.isPending || !preview.data?.some((entry) => entry.date)} className={`${primaryButton} mt-4`}>Planı öğrenciye gönder</button>
          </>
        )}
      </Panel>
    </div>
  );
}

function Tasks({ data }: { data: Detail }) {
  if (!data.tasks.length) return null;
  const done = data.tasks.filter((task) => task.status === "completed" || task.studentFeedback === "done").length;
  return (
    <Panel icon={<CheckCircle2 size={18} />} title="Atanan çalışmalar" subtitle={`${done}/${data.tasks.length} tamamlandı`}>
      <ul className="divide-y divide-rule">{data.tasks.map((task) => (
        <li key={task.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-[13px]">
          <span className="text-ink-2">{dateLabel(task.sessionDate)} · {task.title} · {task.plannedMinutes} dk</span>
          <span className={`rounded-full px-2 py-0.5 text-[12px] font-semibold ${task.studentFeedback === "done" || task.status === "completed" ? "bg-success-soft text-success" : task.studentFeedback ? "bg-warn-soft text-warn" : "bg-paper text-ink-3"}`}>{task.studentFeedback ? FEEDBACK_LABELS[task.studentFeedback] : task.status === "completed" ? "Tamamlandı" : "Bekliyor"}</span>
        </li>
      ))}</ul>
    </Panel>
  );
}

function Notes({ scope, data, onChanged }: { scope: OrgScope; data: Detail; onChanged: () => void }) {
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<"staff" | "student">("staff");
  const add = trpc.org.cases.addNote.useMutation({ onSuccess: () => { setBody(""); toast.success("Not kaydedildi."); onChanged(); }, onError: (error) => toast.error(error.message) });
  return (
    <Panel icon={<Lock size={18} />} title="Mahrem notlar" subtitle={data.canReadNotes ? "Yalnızca yazanı ve öğrencinin sorumlu öğretmenleri görür; kurum yöneticisi ve veli görmez." : "Bu dosyanın notlarını yalnızca öğrencinin sorumlu öğretmenleri görür. Burada yalnızca senin yazdıkların görünür."}>
      <div className="flex flex-col gap-2 sm:flex-row">
        <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={2} maxLength={4000} placeholder="Görüşmeden ya da incelemeden bir not" className="form-input min-h-[44px] flex-1" aria-label="Dosya notu" />
        <div className="flex gap-2 sm:flex-col">
          <select value={visibility} onChange={(event) => setVisibility(event.target.value as "staff" | "student")} className="form-input h-10 min-w-0 flex-1" aria-label="Notu kim görsün"><option value="staff">Yalnızca öğretmen</option><option value="student">Öğrenci de görsün</option></select>
          <button onClick={() => body.trim() && add.mutate({ orgId: scope.orgId, caseId: data.case.id, body: body.trim(), visibility })} disabled={add.isPending || !body.trim()} className={`${secondaryButton} shrink-0 whitespace-nowrap`}><MessageSquare size={15} /> Not ekle</button>
        </div>
      </div>
      <ul className="mt-3 space-y-2">{data.notes.map((note) => (
        <li key={note.id} className="rounded-xl bg-paper px-3 py-2 text-[13px] text-ink-2"><div className="text-[11.5px] font-semibold text-ink-4">{note.authorName} · {new Date(note.createdAt).toLocaleDateString("tr-TR")}{note.visibility === "student" ? " · öğrenciye açık" : ""}</div>{note.body}</li>
      ))}</ul>
    </Panel>
  );
}

function Timeline({ data }: { data: Detail }) {
  const events = useMemo(() => [
    { at: data.case.openedAt, text: data.case.ruleKey === "manual" ? "Dosya açıldı (öğretmen)" : "Dosya açıldı (inceleme önerisi)" },
    ...data.actions.map((action) => {
      const payload = (action.payload ?? {}) as { meetingAt?: string; place?: string; reopened?: boolean; reason?: string; items?: unknown[] };
      const text = action.type === "meeting" ? `Görüşme planlandı${payload.meetingAt ? `: ${new Date(payload.meetingAt).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" })}` : ""}${payload.place ? ` · ${payload.place}` : ""}`
        : action.type === "plan" ? `Çalışma planı gönderildi (${payload.items?.length ?? 0} madde)`
        : payload.reopened ? `Yeniden açıldı: ${payload.reason ?? ""}` : "İncelendi";
      return { at: action.createdAt, text };
    }),
    ...data.evaluations.map((item) => ({ at: item.evaluatedAt, text: `Değerlendirme: ${OUTCOME_LABELS[item.teacherOutcome]}${item.netChange !== null ? ` · net ${item.netChange > 0 ? "+" : ""}${item.netChange}` : " · yeni deneme yok"} · görev ${item.tasksDone}/${item.tasksTotal}` })),
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()), [data]);
  return (
    <Panel icon={<CalendarClock size={18} />} title="Zaman çizelgesi">
      <ol className="space-y-2 border-l-2 border-rule pl-4">{events.map((event, index) => <li key={index} className="text-[13px] text-ink-2"><span className="text-[12px] text-ink-4">{new Date(event.at).toLocaleDateString("tr-TR")}</span> · {event.text}</li>)}</ol>
    </Panel>
  );
}

function Evaluate({ scope, data, onChanged }: { scope: OrgScope; data: Detail; onChanged: () => void }) {
  const [meeting, setMeeting] = useState({ at: `${tomorrowKey()}T16:00`, place: "" });
  const [outcome, setOutcome] = useState<"completed" | "ongoing" | "reassess">("ongoing");
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const action = trpc.org.cases.addAction.useMutation({ onSuccess: () => { toast.success("Kaydedildi."); onChanged(); }, onError: (error) => toast.error(error.message) });
  const evaluate = trpc.org.cases.evaluate.useMutation({ onSuccess: (result) => { toast.success(result.limitedEvidence ? "Değerlendirme kaydedildi (yeni deneme yok; sınırlı kanıt)." : `Değerlendirme kaydedildi (net ${result.netChange! > 0 ? "+" : ""}${result.netChange}).`); setNote(""); onChanged(); }, onError: (error) => toast.error(error.message) });
  const reopen = trpc.org.cases.reopen.useMutation({ onSuccess: () => { toast.success("Dosya yeniden açıldı."); setReason(""); onChanged(); }, onError: (error) => toast.error(error.message) });
  if (data.case.status === "closed") {
    return (
      <Panel icon={<RotateCcw size={18} />} title="Dosya sonuçlandı" subtitle="Gerekirse gerekçeyle yeniden açabilirsin; geçmiş korunur.">
        <div className="flex flex-col gap-2 sm:flex-row"><input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} placeholder="Neden yeniden açıyorsun?" className="form-input flex-1" aria-label="Yeniden açma gerekçesi" /><button onClick={() => reopen.mutate({ orgId: scope.orgId, caseId: data.case.id, reason: reason.trim() })} disabled={reason.trim().length < 3 || reopen.isPending} className={secondaryButton}><RotateCcw size={15} /> Yeniden aç</button></div>
      </Panel>
    );
  }
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Panel icon={<MessageSquare size={18} />} title="İnceleme ve görüşme">
        <button onClick={() => action.mutate({ orgId: scope.orgId, caseId: data.case.id, type: "review", idempotencyKey: newKey() })} disabled={action.isPending} className={secondaryButton}>Çalışma kayıtlarını inceledim</button>
        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input type="datetime-local" value={meeting.at} onChange={(event) => setMeeting({ ...meeting, at: event.target.value })} className="form-input" aria-label="Görüşme zamanı" />
          <input value={meeting.place} onChange={(event) => setMeeting({ ...meeting, place: event.target.value })} maxLength={120} placeholder="Yer (ör. Rehberlik odası)" className="form-input" aria-label="Görüşme yeri" />
          <button onClick={() => action.mutate({ orgId: scope.orgId, caseId: data.case.id, type: "meeting", meetingAt: new Date(meeting.at).toISOString(), place: meeting.place || undefined, idempotencyKey: newKey() })} disabled={action.isPending} className={secondaryButton}>Görüşme planla</button>
        </div>
      </Panel>
      <Panel icon={<ClipboardCheck size={18} />} title="Sonucu değerlendir" subtitle="Sonraki karşılaştırılabilir deneme varsa net farkı, yoksa görev tamamlama ve öğrencinin geri bildirimi kullanılır. Net değişimi tek başına müdahalenin etkisini göstermez.">
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Sonuç">
          {(Object.keys(OUTCOME_LABELS) as Array<keyof typeof OUTCOME_LABELS>).map((key) => <button key={key} type="button" role="radio" aria-checked={outcome === key} onClick={() => setOutcome(key)} className={`rounded-full px-3 py-1.5 text-[12.5px] font-semibold ${outcome === key ? "bg-ink text-white" : "bg-paper text-ink-3"}`}>{OUTCOME_LABELS[key]}</button>)}
        </div>
        <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={2} maxLength={2000} placeholder="Değerlendirme notu (mahrem, isteğe bağlı)" className="form-input mt-3" aria-label="Değerlendirme notu" />
        <button onClick={() => evaluate.mutate({ orgId: scope.orgId, caseId: data.case.id, outcome, note: note.trim() || undefined })} disabled={evaluate.isPending} className={`${primaryButton} mt-3`}>Değerlendirmeyi kaydet</button>
      </Panel>
    </div>
  );
}
