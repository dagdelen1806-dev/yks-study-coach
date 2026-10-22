import { trpc } from "@/lib/trpc";
import { Bar100, EmptyNote, PageHeader, Panel, Segmented, StatCard, primaryButton, secondaryButton } from "@/components/app/kit";
import { TARGET_SCORE_TYPE_LABELS } from "@shared/onboarding";
import { getStatusFromProgress, statusMeta, toLocalDateKey } from "@shared/yksData";
import { EXAM_KIND_DEFS, GRADE_LEVEL_LABELS, estimateScore, kindsOf, scoredKindOf, targetSummary, trackSubjects, type ExamKind, type ExamTrack } from "@shared/exams";
import { ArrowLeft, CalendarCheck, CalendarPlus, Clock3, Eye, EyeOff, NotebookPen, Target, Trash2, Trophy, TrendingUp } from "lucide-react";
import { lazy, Suspense, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import type { OrgScope } from "./OrgApp";
import { ORG_PATHS, Initials, RiskBadges, deltaText, formatNet, relativeTime } from "./orgShared";

const NetTrendChart = lazy(() => import("@/pages/overview/OverviewCharts").then((module) => ({ default: module.NetTrendChart })));
type Tab = "summary" | "exams" | "topics" | "plan" | "notes";

/** Personelin öğrenci görünümü (salt okunur veri) + görev atama ve görüşme notu. */
export function StudentDetail({ scope, studentUserId, compact = false }: { scope: OrgScope; studentUserId: number; compact?: boolean }) {
  const utils = trpc.useUtils();
  const detail = trpc.org.student.useQuery({ orgId: scope.orgId, studentUserId }, { retry: false });
  const [tab, setTab] = useState<Tab>("summary");
  const track: ExamTrack = detail.data?.profile.examTrack ?? "YKS";
  const kinds = kindsOf(track);
  const [chosenKind, setExamKind] = useState<ExamKind>("TYT");
  // Öğrencinin sınavında olmayan tür seçili kalmasın (LGS öğrencisinde tek tür).
  const examKind = kinds.includes(chosenKind) ? chosenKind : kinds[0];
  const subjectOrder = trackSubjects(track);
  const tomorrow = toLocalDateKey(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const [task, setTask] = useState({ date: tomorrow, time: "17:00", subject: "Matematik", topic: "", kind: "Soru çözümü" as "Soru çözümü" | "Konu tekrarı" | "Konu çalışması", minutes: "40", questions: "20" });
  const [note, setNote] = useState({ body: "", visibility: "staff" as "staff" | "student" });
  const refresh = () => utils.org.student.invalidate({ orgId: scope.orgId, studentUserId });
  const assign = trpc.org.tasks.assign.useMutation({ onSuccess: () => { toast.success("Görev öğrencinin takvimine eklendi."); setTask((value) => ({ ...value, topic: "" })); refresh(); }, onError: (error) => toast.error(error.message) });
  const addNote = trpc.org.notes.create.useMutation({ onSuccess: () => { toast.success(note.visibility === "student" ? "Geri bildirim öğrenciye gönderildi." : "Not kaydedildi."); setNote({ body: "", visibility: "staff" }); refresh(); }, onError: (error) => toast.error(error.message) });
  const removeNote = trpc.org.notes.remove.useMutation({ onSuccess: refresh, onError: (error) => toast.error(error.message) });

  const series = useMemo(() => (detail.data?.exams ?? []).filter((exam) => (exam.exam ?? "TYT") === examKind).slice().sort((a, b) => a.date.localeCompare(b.date)).slice(-10).map((exam) => ({ label: new Date(`${exam.date}T12:00:00`).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" }), net: Number(exam.net.toFixed(2)), title: exam.title })), [detail.data?.exams, examKind]);

  if (detail.isError) return <EmptyNote>{detail.error.message || "Öğrenci bulunamadı."}</EmptyNote>;
  if (!detail.data) return <EmptyNote>Yükleniyor…</EmptyNote>;
  const { student, profile, summary, exams, topics, sessions, logs, notes, classes, teachers } = detail.data;
  const upcoming = sessions.filter((session) => session.status === "planned" && new Date(session.sessionDate).getTime() >= Date.now() - 60 * 60 * 1000).slice(0, 12);
  const recent = sessions.filter((session) => new Date(session.sessionDate).getTime() < Date.now()).slice(-12).reverse();
  const scoredKind = scoredKindOf(track);
  const latestScoredExam = scoredKind ? exams.filter((exam) => exam.exam === scoredKind).sort((a, b) => b.date.localeCompare(a.date))[0] : undefined;
  const scoreValue = latestScoredExam ? estimateScore(scoredKind, latestScoredExam.subjects) : null;
  const examCards = ([...kinds.map((kind) => ({ type: "net" as const, kind })), ...(scoredKind ? [{ type: "score" as const, kind: scoredKind }] : [])]).slice(0, 2);
  const target = targetSummary(track, { ...profile, targetScoreTypeLabel: profile.targetScoreType ? TARGET_SCORE_TYPE_LABELS[profile.targetScoreType] : null });
  const weakTopics = topics.filter((topic) => getStatusFromProgress(topic.progress) === "Zayıf").sort((a, b) => a.progress - b.progress);
  const submitTask = () => {
    if (!task.topic.trim()) { toast.error("Konu yaz."); return; }
    assign.mutate({ orgId: scope.orgId, studentUserId, date: task.date, time: task.time, subject: task.subject, topic: task.topic.trim(), kind: task.kind, minutes: Number(task.minutes) || 40, targetQuestions: Number(task.questions) || undefined });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-4">
        <Initials name={student.name} size={compact ? 52 : 64} />
        <div className="min-w-0 flex-1">
          <h2 className={`${compact ? "text-[21px]" : "text-[26px]"} font-extrabold leading-tight text-ink`}>{student.name}</h2>
          <p className="mt-1 text-[13px] text-ink-3">{[profile.gradeLevel ? GRADE_LEVEL_LABELS[profile.gradeLevel] : null, ...target.details].filter(Boolean).join(" · ")}</p>
          {target.goal && <p className="mt-0.5 flex items-center gap-1.5 text-[13px] font-semibold text-ink-2"><Target size={14} className="text-brand" />{target.goal}</p>}
          <p className="mt-1 text-[12px] text-ink-4">{[classes.map((item) => item.name).join(", "), teachers.length ? `Öğretmen: ${teachers.map((teacher) => teacher.name).join(", ")}` : null, `Kuruma katılım: ${new Date(student.joinedAt).toLocaleDateString("tr-TR")}`].filter(Boolean).join(" · ")}</p>
          <div className="mt-2"><RiskBadges risks={summary.risks} /></div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {/* İlk iki kart: sınavın oturumlarının son netleri; tahmini puanı olan sınavda ikinci kart tahmini puan. */}
        {examCards.map((card, index) => card.type === "score" ? (
          <StatCard key="score" icon={<TrendingUp size={18} />} label={EXAM_KIND_DEFS[card.kind].scoreEstimate!.label} value={scoreValue !== null ? scoreValue.toFixed(1) : "—"} unit={scoreValue !== null ? `/ ${EXAM_KIND_DEFS[card.kind].scoreEstimate!.max}` : undefined} foot={<span>{scoreValue !== null ? "Son denemeden · resmî değil" : "Deneme yok"}</span>} />
        ) : (() => {
          const last = summary.lastByKind[card.kind];
          return <StatCard key={card.kind} tone={index === 0 ? "warm" : "plain"} icon={index === 0 ? <Trophy size={18} /> : <TrendingUp size={18} />} label={`Son ${card.kind}`} value={formatNet(last?.net)} foot={last ? <><span>{new Date(last.date).toLocaleDateString("tr-TR")}</span><span className={`font-bold ${(last.delta ?? 0) < 0 ? "text-danger" : "text-success"}`}>{deltaText(last.delta)}</span></> : <span>Deneme yok</span>} />;
        })())}
        <StatCard icon={<CalendarCheck size={18} />} label="Bu hafta plan uyumu" value={summary.adherence !== null ? `%${summary.adherence}` : "—"} progress={summary.adherence ?? undefined} foot={<span>{summary.plannedThisWeek} görev planlandı</span>} />
        <StatCard icon={<Clock3 size={18} />} label="Son 7 gün" value={`${summary.weekMinutes}`} unit="dk" foot={<span>Son etkinlik: {relativeTime(summary.lastActivityAt)}</span>} />
      </div>

      <div className="overflow-x-auto pb-0.5"><Segmented value={tab} options={[{ value: "summary", label: "Özet" }, { value: "exams", label: "Denemeler" }, { value: "topics", label: "Konular" }, { value: "plan", label: "Plan" }, { value: "notes", label: `Notlar${notes.length ? ` (${notes.length})` : ""}` }]} onChange={setTab} label="Öğrenci bölümleri" /></div>

      {tab === "summary" && (
        <div className={`grid gap-5 ${compact ? "" : "xl:grid-cols-2"}`}>
          <Panel icon={<TrendingUp size={18} />} title="Net gelişimi" action={kinds.length > 1 ? <Segmented value={examKind} options={kinds} onChange={setExamKind} label="Sınav türü" /> : undefined}>
            {series.length === 0 ? <EmptyNote>{examKind} denemesi yok.</EmptyNote> : <div className="h-[220px]"><Suspense fallback={<div className="h-full animate-pulse rounded-xl bg-paper" />}><NetTrendChart data={series} /></Suspense></div>}
          </Panel>
          <Panel icon={<Target size={18} />} title="Zayıf konular" subtitle="Yeterli soru verisi olan konulardan">
            {weakTopics.length === 0 ? <EmptyNote>Zayıf konu yok ya da henüz yeterli veri yok.</EmptyNote> : (
              <ul className="space-y-2.5">{weakTopics.slice(0, 8).map((topic) => <li key={topic.slug}><div className="mb-1 flex justify-between text-[13px]"><span className="truncate font-semibold text-ink">{topic.topic} <span className="font-normal text-ink-4">· {topic.subject}</span></span><span className="text-ink-3">%{topic.progress}</span></div><Bar100 value={topic.progress} color={statusMeta.Zayıf.color} /></li>)}</ul>
            )}
          </Panel>
        </div>
      )}

      {tab === "exams" && (
        <Panel icon={<Trophy size={18} />} title="Denemeler" subtitle={`${exams.length} deneme`}>
          {exams.length === 0 ? <EmptyNote>Öğrenci henüz deneme girmedi.</EmptyNote> : (
            <div className="-mx-5 overflow-x-auto"><table className="w-full min-w-[520px] text-left text-[13px]"><thead className="border-y border-rule bg-paper/70 text-[12px] text-ink-3"><tr><th className="px-5 py-2 font-semibold">Deneme</th><th className="px-3 py-2 font-semibold">Tür</th>{subjectOrder.map((name) => <th key={name} className="px-3 py-2 text-right font-semibold">{name}</th>)}<th className="px-5 py-2 text-right font-semibold">Net</th></tr></thead>
              <tbody className="divide-y divide-rule">{exams.map((exam) => <tr key={exam.id}><td className="px-5 py-2.5"><div className="font-semibold text-ink">{exam.title}</div><div className="text-[12px] text-ink-4">{new Date(`${exam.date}T12:00:00`).toLocaleDateString("tr-TR")}</div></td><td className="px-3 py-2.5">{exam.exam ?? "TYT"}</td>{subjectOrder.map((name) => <td key={name} className="px-3 py-2.5 text-right text-ink-2">{exam.subjects[name] === undefined ? "—" : exam.subjects[name].toFixed(2)}</td>)}<td className="px-5 py-2.5 text-right font-extrabold text-ink">{exam.net.toFixed(2)}</td></tr>)}</tbody></table></div>
          )}
        </Panel>
      )}

      {tab === "topics" && (
        <Panel icon={<Target size={18} />} title="Konu durumu" subtitle="Yalnızca yeterli soru verisi olan konular">
          {topics.length === 0 ? <EmptyNote>Henüz yeterli konu verisi yok.</EmptyNote> : (
            <ul className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">{topics.slice().sort((a, b) => a.progress - b.progress).map((topic) => { const status = getStatusFromProgress(topic.progress); return <li key={topic.slug}><div className="mb-1 flex justify-between gap-2 text-[13px]"><span className="truncate text-ink">{topic.topic} <span className="text-ink-4">· {topic.exam} {topic.subject}</span></span><span className="shrink-0 font-semibold" style={{ color: statusMeta[status].color }}>%{topic.progress}</span></div><Bar100 value={topic.progress} color={statusMeta[status].color} /></li>; })}</ul>
          )}
        </Panel>
      )}

      {tab === "plan" && (
        <div className={`grid gap-5 ${compact ? "" : "xl:grid-cols-2"}`}>
          <Panel icon={<CalendarPlus size={18} />} title="Görev ata" subtitle="Öğrencinin takvimine 'Öğretmenin atadı' etiketiyle eklenir; ders programıyla çakışırsa uyarılırsın.">
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="form-label">Gün</span><input type="date" min={toLocalDateKey()} value={task.date} onChange={(event) => setTask({ ...task, date: event.target.value })} className="form-input" /></label>
              <label className="block"><span className="form-label">Saat</span><input type="time" value={task.time} onChange={(event) => setTask({ ...task, time: event.target.value })} className="form-input" /></label>
              <label className="block"><span className="form-label">Ders</span><select value={task.subject} onChange={(event) => setTask({ ...task, subject: event.target.value })} className="form-input">{["Türkçe", "Matematik", "Geometri", "Fizik", "Kimya", "Biyoloji", "Tarih", "Coğrafya", "Felsefe", "Edebiyat"].map((name) => <option key={name}>{name}</option>)}</select></label>
              <label className="block"><span className="form-label">Konu</span><input value={task.topic} onChange={(event) => setTask({ ...task, topic: event.target.value })} placeholder={weakTopics[0]?.topic ?? "Örn. Problemler"} className="form-input" /></label>
              <label className="block"><span className="form-label">Tür</span><select value={task.kind} onChange={(event) => setTask({ ...task, kind: event.target.value as typeof task.kind })} className="form-input">{["Soru çözümü", "Konu tekrarı", "Konu çalışması"].map((kind) => <option key={kind}>{kind}</option>)}</select></label>
              <div className="grid grid-cols-2 gap-2"><label className="block"><span className="form-label">Dk</span><input type="number" min={10} max={240} value={task.minutes} onChange={(event) => setTask({ ...task, minutes: event.target.value })} className="form-input" /></label><label className="block"><span className="form-label">Soru</span><input type="number" min={0} max={300} value={task.questions} onChange={(event) => setTask({ ...task, questions: event.target.value })} className="form-input" /></label></div>
            </div>
            <button onClick={submitTask} disabled={assign.isPending} className={`${primaryButton} mt-4 self-end`}><CalendarPlus size={16} /> {assign.isPending ? "Ekleniyor…" : "Görevi ata"}</button>
          </Panel>
          <Panel icon={<CalendarCheck size={18} />} title="Plan ve görevler" subtitle="Yaklaşan ve son görevler (salt okunur)">
            {upcoming.length + recent.length === 0 ? <EmptyNote>Öğrencinin takviminde görev yok.</EmptyNote> : (
              <ul className="space-y-2">
                {[...upcoming, ...recent].slice(0, 16).map((session) => (
                  <li key={session.id} className="flex items-center gap-3 rounded-xl border border-rule px-3 py-2">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${session.status === "completed" ? "bg-success" : session.status === "skipped" ? "bg-rule-strong" : new Date(session.sessionDate) < new Date() ? "bg-warn-fill" : "bg-brand"}`} aria-hidden="true" />
                    <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-semibold text-ink">{session.title}{session.assignedByUserId && <span className="ml-1.5 rounded-full bg-violet-soft px-1.5 py-0.5 text-[10px] font-bold text-violet">Öğretmen</span>}</span><span className="block text-[12px] text-ink-3">{new Date(session.sessionDate).toLocaleString("tr-TR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {session.plannedMinutes} dk</span></span>
                    <span className="shrink-0 text-[12px] font-semibold text-ink-3">{session.status === "completed" ? `${session.actualMinutes ?? 0} dk${session.actualQuestions ? ` · ${session.correct ?? 0}/${session.actualQuestions}` : ""}` : session.status === "skipped" ? "atlandı" : session.abandonedAt ? "yarım kaldı" : "planlı"}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-[12px] text-ink-4">Son 42 günde {logs.reduce((sum, log) => sum + log.minutes, 0)} dk çalışma kaydı.</p>
          </Panel>
        </div>
      )}

      {tab === "notes" && (
        <Panel icon={<NotebookPen size={18} />} title="Görüşme notları ve geri bildirim" subtitle="Notlar mahremdir: yalnızca yazanı ve öğrencinin sorumlu öğretmenleri görür; kurum yöneticisi ve veli görmez. 'Yalnızca personel' notunu öğrenci görmez, 'Öğrenciye geri bildirim' öğrencinin uygulamasında görünür.">
          <textarea value={note.body} onChange={(event) => setNote({ ...note, body: event.target.value })} maxLength={4000} rows={3} placeholder="Görüşme notu ya da öğrenciye geri bildirim…" className="form-input min-h-[84px] resize-y py-2" />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <Segmented value={note.visibility} options={[{ value: "staff", label: "Yalnızca personel" }, { value: "student", label: "Öğrenciye geri bildirim" }]} onChange={(visibility) => setNote({ ...note, visibility })} label="Görünürlük" />
            <button onClick={() => note.body.trim() && addNote.mutate({ orgId: scope.orgId, studentUserId, body: note.body.trim(), visibility: note.visibility })} disabled={addNote.isPending || !note.body.trim()} className={primaryButton}>Kaydet</button>
          </div>
          <ul className="mt-4 space-y-2">
            {notes.length === 0 && <li className="text-[13px] text-ink-3">Henüz not yok.</li>}
            {notes.map((item) => (
              <li key={item.id} className="rounded-xl border border-rule p-3">
                <div className="flex items-start justify-between gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${item.visibility === "student" ? "bg-brand-soft text-brand" : "bg-paper text-ink-3"}`}>{item.visibility === "student" ? <><Eye size={11} /> Öğrenci görüyor</> : <><EyeOff size={11} /> Yalnızca personel</>}</span>
                  <button onClick={() => { if (window.confirm("Not silinsin mi?")) removeNote.mutate({ orgId: scope.orgId, noteId: item.id }); }} className="rounded-lg p-1 text-ink-4 hover:bg-danger-soft hover:text-danger" aria-label="Notu sil"><Trash2 size={14} /></button>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-[13.5px] leading-6 text-ink">{item.body}</p>
                <p className="mt-1 text-[11px] text-ink-4">{item.authorName ?? "Personel"} · {relativeTime(item.createdAt)}</p>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}

export function StudentDetailPage({ scope, studentUserId }: { scope: OrgScope; studentUserId: number }) {
  const [, setLocation] = useLocation();
  return (
    <div className="space-y-5">
      <button onClick={() => setLocation(ORG_PATHS.students)} className={secondaryButton}><ArrowLeft size={16} /> Öğrenciler</button>
      <PageHeader eyebrow={scope.orgName} title="Öğrenci detayı" />
      <StudentDetail scope={scope} studentUserId={studentUserId} />
    </div>
  );
}
