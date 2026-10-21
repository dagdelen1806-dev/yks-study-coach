import { trpc } from "@/lib/trpc";
import { Bar100, EmptyNote, Panel, PageHeader, Segmented, StatCard, primaryButton, secondaryButton } from "@/components/app/kit";
import TaskDialog, { taskDraftFor, type TaskDraft } from "@/components/app/TaskDialog";
import { palette } from "@shared/palette";
import { formatExamDate, getColorForSubject, netDeltaLabel, toLocalDateKey, type MockExam } from "@shared/yksData";
import { EXAM_KIND_DEFS, estimateScore, scoredKindOf, subjectTotalsOf, trackSubjects, type ExamKind } from "@shared/exams";
import { useExamTrack } from "@/hooks/useExamTrack";
import { AlertTriangle, BarChart3, CalendarPlus, Clock3, FileText, Gauge, ListChecks, Plus, Target, TrendingUp, Trophy, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, ComposedChart, Area, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Range = "all" | "30" | "90";

// Ders soru sayıları (ÖSYM/MEB) shared/exams.ts'ten: TYT 40/40/20/20, AYT 40/40/40/46, LGS 20/10/10/10/20/20.
const kindOf = (exam: MockExam): ExamKind => exam.exam ?? "TYT";
const netOf = (exam: MockExam) => Object.values(exam.subjects).reduce((sum, value) => sum + value, 0);

/** Aynı türden bir önceki denemeye göre fark (TYT ile AYT kıyaslanmaz). */
export function previousOfSameKind(exams: MockExam[], exam: MockExam) {
  return exams.filter((item) => item !== exam && kindOf(item) === kindOf(exam) && item.date <= exam.date).sort((a, b) => b.date.localeCompare(a.date))[0];
}

export default function ExamsDashboard({ exams, onAddExam, onAddScan, onUpload }: { exams: MockExam[]; onAddExam: () => void; onAddScan: () => void; onUpload: () => void }) {
  const profile = trpc.onboarding.get.useQuery(undefined, { retry: false }).data;
  const { track, kinds } = useExamTrack();
  const subjectOrder = trackSubjects(track);
  const [kind, setKind] = useState<ExamKind>(() => kinds.find((candidate) => exams.some((exam) => kindOf(exam) === candidate)) ?? kinds[0]);
  useEffect(() => { if (!kinds.includes(kind)) setKind(kinds[0]); }, [kinds[0]]);
  const [subject, setSubject] = useState("Toplam");
  const [range, setRange] = useState<Range>("all");
  const [task, setTask] = useState<TaskDraft | null>(null);

  const byDate = useMemo(() => exams.slice().sort((a, b) => b.date.localeCompare(a.date)), [exams]);
  const inRange = useMemo(() => {
    if (range === "all") return byDate;
    const since = toLocalDateKey(new Date(Date.now() - Number(range) * 24 * 60 * 60 * 1000));
    return byDate.filter((exam) => exam.date >= since);
  }, [byDate, range]);
  const ofKind = inRange.filter((exam) => kindOf(exam) === kind);
  const latest = ofKind[0];
  const previous = latest ? previousOfSameKind(exams, latest) : undefined;
  const latestByKind = kinds.map((candidate) => [candidate, byDate.find((exam) => kindOf(exam) === candidate)] as const);
  // Tahmini puanı olan oturum (bugün LGS) ve son denemesi.
  const scoredKind = scoredKindOf(track);
  const scoreDef = scoredKind ? EXAM_KIND_DEFS[scoredKind].scoreEstimate! : null;
  const latestScored = scoredKind ? byDate.find((exam) => kindOf(exam) === scoredKind) : undefined;
  const deltaFor = (exam: MockExam | undefined) => { const before = exam && previousOfSameKind(exams, exam); return exam && before ? netOf(exam) - netOf(before) : null; };

  const series = ofKind.slice(0, 12).reverse().map((exam) => ({ label: formatExamDate(exam.date), title: exam.title, net: Number((subject === "Toplam" ? netOf(exam) : exam.subjects[subject] ?? 0).toFixed(2)) }));
  const totals = subjectTotalsOf(kind);
  const subjectRows = latest ? subjectOrder.filter((name) => latest.subjects[name] !== undefined).map((name) => {
    const value = latest.subjects[name] ?? 0;
    const before = previous?.subjects[name];
    return { name, value, total: totals[name] ?? 40, delta: before === undefined ? null : value - before };
  }) : [];

  // Yanlış + boş analizi: seçili türdeki denemelerin konu satırlarından, en çok soru kaybettiren konular.
  const losses = useMemo(() => {
    const byTopic = new Map<string, { subject: string; topic: string; wrong: number; blank: number; questions: number; exams: number }>();
    for (const exam of ofKind) {
      for (const row of exam.topicDetails ?? []) {
        if (!row.topic?.trim() || !row.questionCount) continue;
        const key = `${row.subject}|${row.topic}`;
        const current = byTopic.get(key) ?? { subject: row.subject || "Genel", topic: row.topic, wrong: 0, blank: 0, questions: 0, exams: 0 };
        current.wrong += row.wrong ?? 0; current.blank += row.blank ?? 0; current.questions += row.questionCount; current.exams += 1;
        byTopic.set(key, current);
      }
    }
    return Array.from(byTopic.values()).filter((row) => row.wrong + row.blank > 0).sort((a, b) => (b.wrong + b.blank) / b.questions - (a.wrong + a.blank) / a.questions || b.wrong + b.blank - (a.wrong + a.blank)).slice(0, 8);
  }, [ofKind]);
  const examsWithDetails = ofKind.filter((exam) => exam.topicDetails?.some((row) => row.questionCount > 0)).length;

  const timeRows = latest ? subjectOrder.map((name) => ({ name, minutes: latest.timeSpent?.[name] ?? 0 })).filter((row) => row.minutes > 0) : [];
  const totalTime = timeRows.reduce((sum, row) => sum + row.minutes, 0);

  const openTask = (row: { subject: string; topic: string; wrong: number; blank: number }) =>
    setTask(taskDraftFor({ subject: row.subject, topic: row.topic, source: "Deneme analizi görevleri", questions: Math.min(40, Math.max(10, (row.wrong + row.blank) * 3)), preferredStart: profile?.preferredStudyStartTime }));

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Deneme günlüğü"
        title="Denemeler"
        description={`${kinds.join(" ve ")} netlerini izle, önceki denemelerle karşılaştır; yanlış ve boşlarından doğrudan çalışma görevi oluştur.`}
        actions={<>
          <button onClick={onAddScan} className={secondaryButton}><Plus size={16} /> Konu tarama testi</button>
          <button onClick={onUpload} className={secondaryButton}><Upload size={16} /> Belgeden aktar</button>
          <button onClick={onAddExam} className={primaryButton}><Plus size={16} /> Deneme ekle</button>
        </>}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {latestByKind.map(([label, exam], index) => {
          const delta = deltaFor(exam);
          return <StatCard key={label} tone={index === 0 ? "warm" : "plain"} icon={<Trophy size={18} />} label={`Son ${label} neti`} value={exam ? netOf(exam).toFixed(2) : "—"} unit={exam ? "net" : undefined} foot={exam ? <><span>{formatExamDate(exam.date)}</span>{delta !== null && <span className={`font-bold ${delta >= 0 ? "text-success" : "text-danger"}`}>{delta >= 0 ? "↑" : "↓"} {netDeltaLabel(delta)}</span>}</> : <span>Henüz {label} denemesi yok</span>} />;
        })}
        {scoreDef && <StatCard icon={<Gauge size={18} />} label={scoreDef.label} value={latestScored ? estimateScore(scoredKind, latestScored.subjects)!.toFixed(1) : "—"} unit={latestScored ? `/ ${scoreDef.max}` : undefined} foot={<span>{latestScored ? "Son denemenden · resmî puan değil" : `${scoredKind} denemesi ekleyince görünür`}</span>} />}
        <StatCard icon={<ListChecks size={18} />} label="Kayıtlı deneme" value={String(exams.length)} foot={<span>{kinds.map((candidate) => `${exams.filter((exam) => kindOf(exam) === candidate).length} ${candidate}`).join(" · ")}</span>} />
        <StatCard tone={losses.length ? "warn" : "plain"} icon={<AlertTriangle size={18} />} label="En çok kaybettiren konu" value={losses[0] ? `%${Math.round(((losses[0].wrong + losses[0].blank) / losses[0].questions) * 100)}` : "—"} foot={<span className="truncate">{losses[0] ? `${losses[0].topic} · yanlış/boş` : "Konu detaylı deneme ekleyince görünür"}</span>} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {kinds.length > 1 && <Segmented value={kind} options={kinds} onChange={setKind} label="Sınav türü" />}
        <Segmented value={range} options={[{ value: "all", label: "Tüm tarihler" }, { value: "90", label: "Son 90 gün" }, { value: "30", label: "Son 30 gün" }]} onChange={setRange} label="Tarih aralığı" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.35fr_1fr]">
        <Panel icon={<TrendingUp size={18} />} title="Net gelişimi" subtitle={`${kind} · ${series.length} deneme · ${subject === "Toplam" ? "toplam net" : `${subject} neti`}`} action={<select value={subject} onChange={(event) => setSubject(event.target.value)} className="form-input h-8 w-auto py-0 text-[12px]" aria-label="Ders"><option value="Toplam">Toplam net</option>{subjectOrder.map((name) => <option key={name} value={name}>{name}</option>)}</select>}>
          {series.length === 0 ? (
            <EmptyNote>Bu aralıkta {kind} denemesi yok.<br /><button onClick={onAddExam} className="mt-2 font-semibold text-brand">Deneme ekle →</button></EmptyNote>
          ) : (
            <div className="h-[260px]" role="img" aria-label={`${kind} net gelişimi: ${series.map((point) => `${point.label} ${point.net}`).join(", ")}`}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={series} margin={{ top: 16, right: 12, bottom: 0, left: 0 }}>
                  <defs><linearGradient id="examNetFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={palette.brand} stopOpacity={0.18} /><stop offset="100%" stopColor={palette.brand} stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid stroke={palette.rule} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: palette.ink3 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: palette.ink3 }} axisLine={false} tickLine={false} width={40} domain={[0, "auto"]} />
                  <Tooltip formatter={(value: number) => [`${value} net`, "Net"]} labelFormatter={(label, payload) => payload?.[0]?.payload?.title || label} contentStyle={{ borderRadius: 12, border: `1px solid ${palette.rule}`, fontSize: 12 }} />
                  <Area type="monotone" dataKey="net" stroke="none" fill="url(#examNetFill)" />
                  <Line type="monotone" dataKey="net" stroke={palette.brand} strokeWidth={2.5} dot={{ r: 3.5, fill: "#fff", stroke: palette.brand, strokeWidth: 2 }} activeDot={{ r: 5 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel icon={<BarChart3 size={18} />} title="Son deneme · ders bazında" subtitle={latest ? `${latest.title} · ${formatExamDate(latest.date)}${previous ? ` · önceki: ${previous.title}` : ""}` : undefined}>
          {!latest ? <EmptyNote>{kind} denemesi eklediğinde ders netlerin ve öncekiyle farkı burada görünür.</EmptyNote> : (
            <div className="flex flex-1 flex-col">
              <ul className="space-y-4">
                {subjectRows.map((row) => (
                  <li key={row.name}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-2 text-[13px]">
                      <span className="font-semibold text-ink">{row.name}</span>
                      <span className="flex items-baseline gap-2"><strong className="text-ink">{row.value.toFixed(2)}</strong><span className="text-ink-4">/ {row.total}</span>{row.delta !== null && <span className={`w-12 text-right text-[12px] font-bold ${row.delta >= 0 ? "text-success" : "text-danger"}`}>{netDeltaLabel(row.delta)}</span>}</span>
                    </div>
                    <Bar100 value={(row.value / row.total) * 100} color={getColorForSubject(row.name)} />
                  </li>
                ))}
              </ul>
              <div className="mt-auto flex items-center justify-between border-t border-rule pt-3 text-[13px]">
                <span className="text-ink-3">Toplam net</span>
                <span className="flex items-baseline gap-2"><strong className="text-[18px] font-extrabold text-ink">{netOf(latest).toFixed(2)}</strong>{previous && <span className={`text-[12px] font-bold ${netOf(latest) - netOf(previous) >= 0 ? "text-success" : "text-danger"}`}>{netDeltaLabel(netOf(latest) - netOf(previous))}</span>}</span>
              </div>
            </div>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.35fr_1fr]">
        <Panel icon={<Target size={18} />} title="Yanlış ve boş analizi" subtitle={examsWithDetails ? `${kind} · konu detaylı ${examsWithDetails} deneme · en çok soru kaybettiğin konular` : undefined}>
          {losses.length === 0 ? (
            <EmptyNote>{examsWithDetails ? "Bu denemelerde yanlış ya da boş bulunan konu yok." : "Denemeyi konu konu (doğru/yanlış/boş) girdiğinde ya da dershane belgesinden aktardığında, en çok soru kaybettiğin konular burada sıralanır."}</EmptyNote>
          ) : (
            <ul className="divide-y divide-rule">
              {losses.map((row) => {
                const lostRate = Math.round(((row.wrong + row.blank) / row.questions) * 100);
                return (
                  <li key={`${row.subject}|${row.topic}`} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2"><span className="truncate text-[13.5px] font-semibold text-ink">{row.topic}</span><span className="shrink-0 text-[12px] text-ink-3">{row.subject}</span></div>
                      <div className="mt-1.5 flex items-center gap-3"><div className="flex-1"><Bar100 value={lostRate} color={lostRate >= 50 ? palette.danger : palette.warnFill} /></div><span className="w-[150px] shrink-0 text-right text-[12px] text-ink-3">{row.wrong} yanlış · {row.blank} boş / {row.questions}</span></div>
                    </div>
                    <button onClick={() => openTask(row)} className="inline-flex h-8 shrink-0 items-center gap-1.5 self-start rounded-lg border border-rule px-3 text-[12px] font-semibold text-brand hover:bg-brand-soft sm:self-auto"><CalendarPlus size={14} /> Görev oluştur</button>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel icon={<Clock3 size={18} />} title="Süre dağılımı" subtitle={latest && totalTime ? `${latest.title} · toplam ${totalTime} dk` : undefined}>
          {timeRows.length === 0 ? <EmptyNote>Denemeye ders sürelerini girdiğinde zamanı nereye harcadığın burada görünür.</EmptyNote> : (
            <ul className="space-y-4">
              {timeRows.map((row) => (
                <li key={row.name}>
                  <div className="mb-1.5 flex justify-between text-[13px]"><span className="font-semibold text-ink">{row.name}</span><span className="text-ink-3">{row.minutes} dk · %{Math.round((row.minutes / totalTime) * 100)}</span></div>
                  <Bar100 value={(row.minutes / totalTime) * 100} color={getColorForSubject(row.name)} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel icon={<FileText size={18} />} title="Deneme geçmişi" action={<span className="rounded-full bg-brand-soft px-2.5 py-1 text-[12px] font-bold text-brand">{inRange.length} / {exams.length} kayıt</span>}>
        {inRange.length === 0 ? <EmptyNote>Bu aralıkta kayıtlı deneme yok.</EmptyNote> : (
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[13px]">
              <thead className="border-y border-rule bg-paper/70 text-[12px] text-ink-3">
                <tr><th className="px-5 py-2.5 font-semibold">Deneme</th><th className="px-3 py-2.5 font-semibold">Tür</th>{subjectOrder.map((name) => <th key={name} className="px-3 py-2.5 text-right font-semibold">{name}</th>)}<th className="px-3 py-2.5 text-right font-semibold">Net</th><th className="px-5 py-2.5 text-right font-semibold">Fark</th></tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {inRange.map((exam) => {
                  const delta = deltaFor(exam);
                  return (
                    <tr key={exam.id} className="hover:bg-paper/50">
                      <td className="px-5 py-3"><div className="font-semibold text-ink">{exam.title}</div><div className="mt-0.5 text-[12px] text-ink-4">{formatExamDate(exam.date)}{exam.topicDetails?.length ? ` · ${exam.topicDetails.length} konu satırı` : ""}{exam.importedFrom && exam.importedFrom !== "manual" ? ` · ${exam.importedFrom === "pdf" ? "PDF" : exam.importedFrom === "csv" ? "CSV" : exam.importedFrom === "xlsx" ? "Excel" : "OCR"} aktarımı` : ""}</div></td>
                      <td className="px-3 py-3"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${kindOf(exam) !== "AYT" ? "bg-brand-soft text-brand" : "bg-violet-soft text-violet"}`}>{kindOf(exam)}</span></td>
                      {subjectOrder.map((name) => <td key={name} className="px-3 py-3 text-right text-ink-2">{exam.subjects[name] === undefined ? "—" : exam.subjects[name].toFixed(2)}</td>)}
                      <td className="px-3 py-3 text-right text-[15px] font-extrabold text-ink">{netOf(exam).toFixed(2)}</td>
                      <td className={`px-5 py-3 text-right text-[12px] font-bold ${delta === null ? "text-ink-4" : delta >= 0 ? "text-success" : "text-danger"}`}>{delta === null ? "ilk" : netDeltaLabel(delta)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {task && <TaskDialog draft={task} description="Bu konudaki yanlış ve boşların için takvimine bir çalışma oturumu ekle." onChange={setTask} onClose={() => setTask(null)} />}
    </div>
  );
}
