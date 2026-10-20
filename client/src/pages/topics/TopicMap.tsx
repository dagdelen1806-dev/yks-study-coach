import { trpc } from "@/lib/trpc";
import { Bar100, EmptyNote, PageHeader, Segmented, StatCard, primaryButton, secondaryButton } from "@/components/app/kit";
import TaskDialog, { taskDraftFor, type TaskDraft } from "@/components/app/TaskDialog";
import { palette } from "@shared/palette";
import { getColorForSubject, statusMeta, type DashboardSection, type Topic } from "@shared/yksData";
import { CalendarPlus, CheckCircle2, ChevronDown, CircleDashed, Compass, ExternalLink, Layers, Play, Plus, RotateCcw, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

type ExamFilter = "Tümü" | "TYT" | "AYT";
type StatusFilter = "Tümü" | "İyi" | "Orta" | "Zayıf" | "Veri yok";
type FocusSeed = { subject: string; topic: string };

/** Konunun öğrenme durumu: verisi olmayan konu "Veri yok" (gri); renk tek başına anlam taşımaz, etiket de yazılır. */
const stateOf = (topic: Topic): Exclude<StatusFilter, "Tümü"> => (topic.insufficientData ? "Veri yok" : topic.status);
const STATE_STYLE: Record<Exclude<StatusFilter, "Tümü">, { color: string; bg: string; hint: string }> = {
  İyi: { color: statusMeta.İyi.color, bg: statusMeta.İyi.bg, hint: "Koruma turu yeterli" },
  Orta: { color: statusMeta.Orta.color, bg: statusMeta.Orta.bg, hint: "Bir tekrar turu daha" },
  Zayıf: { color: statusMeta.Zayıf.color, bg: statusMeta.Zayıf.bg, hint: "Öncelikli tekrar" },
  "Veri yok": { color: palette.ink4, bg: palette.paper, hint: "Henüz yeterli soru çözülmedi" },
};

function StatePill({ topic }: { topic: Topic }) {
  const state = stateOf(topic);
  return <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ color: STATE_STYLE[state].color, backgroundColor: STATE_STYLE[state].bg }}><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STATE_STYLE[state].color }} />{state}</span>;
}

/** Konu detayı: durum, başarı oranı ve iki eylem (odak oturumu, takvime görev). */
function TopicDetail({ topic, onClose, onFocus, onTask }: { topic: Topic; onClose: () => void; onFocus?: () => void; onTask?: () => void }) {
  const state = stateOf(topic);
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal-card max-w-[440px]" role="dialog" aria-modal="true" aria-label={topic.topic}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0"><p className="text-[13px] font-semibold" style={{ color: getColorForSubject(topic.subject) }}>{topic.exam} · {topic.subject}</p><h2 className="mt-1 text-[21px] font-extrabold leading-tight text-ink">{topic.topic}</h2>{topic.unit && <p className="mt-1 text-[13px] text-ink-3">{topic.unit}</p>}</div>
          <button onClick={onClose} className="rounded-lg p-2 text-ink-4 hover:bg-paper" aria-label="Kapat"><X size={17} /></button>
        </div>
        <div className="mt-5 rounded-2xl border border-rule p-4">
          <div className="flex items-center justify-between"><StatePill topic={topic} /><span className="text-[13px] text-ink-3">{STATE_STYLE[state].hint}</span></div>
          {state === "Veri yok" ? (
            <p className="mt-3 text-[13px] leading-6 text-ink-3">Bu konuda kesin bir değerlendirme için yeterli soru verisi yok. Bir tarama testi ya da konu detaylı deneme girdiğinde durumu burada görünür.</p>
          ) : (
            <div className="mt-3"><div className="mb-1.5 flex justify-between text-[13px]"><span className="text-ink-3">Başarı oranı</span><strong className="text-ink">%{Math.round(topic.progress)}</strong></div><Bar100 value={topic.progress} color={STATE_STYLE[state].color} /></div>
          )}
        </div>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          {onFocus && <button onClick={onFocus} className={secondaryButton}><Play size={16} /> Şimdi çalış</button>}
          {onTask && <button onClick={onTask} className={primaryButton}><CalendarPlus size={16} /> Takvime görev ekle</button>}
        </div>
      </div>
    </div>
  );
}

export default function TopicMap({ topics, onSection, onStartSession }: { topics: Topic[]; onSection: (section: DashboardSection) => void; onStartSession: (seed: FocusSeed) => void }) {
  const profile = trpc.onboarding.get.useQuery(undefined, { retry: false }).data;
  const [exam, setExam] = useState<ExamFilter>("Tümü");
  const [status, setStatus] = useState<StatusFilter>("Tümü");
  const [subject, setSubject] = useState("Tümü");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Topic | null>(null);
  const [task, setTask] = useState<TaskDraft | null>(null);

  const ofExam = topics.filter((topic) => exam === "Tümü" || topic.exam === exam);
  const subjects = Array.from(new Set(ofExam.map((topic) => topic.subject)));
  const query = search.trim().toLocaleLowerCase("tr");
  const visible = ofExam.filter((topic) => (subject === "Tümü" || topic.subject === subject) && (status === "Tümü" || stateOf(topic) === status) && (!query || `${topic.topic} ${topic.subject} ${topic.unit}`.toLocaleLowerCase("tr").includes(query)));
  const groups = useMemo(() => {
    const bySubject = new Map<string, Topic[]>();
    for (const topic of visible) bySubject.set(topic.subject, [...(bySubject.get(topic.subject) ?? []), topic]);
    // Önce tekrar gerektiren konular: Zayıf → Orta → İyi → Veri yok.
    const order = { Zayıf: 0, Orta: 1, İyi: 2, "Veri yok": 3 } as const;
    return Array.from(bySubject, ([name, items]) => {
      const sorted = items.slice().sort((a, b) => order[stateOf(a)] - order[stateOf(b)] || a.progress - b.progress);
      const reliable = items.filter((item) => !item.insufficientData);
      return { name, items: sorted, average: reliable.length ? Math.round(reliable.reduce((sum, item) => sum + item.progress, 0) / reliable.length) : null, review: items.filter((item) => ["Zayıf", "Orta"].includes(stateOf(item))).length };
    });
  }, [visible]);

  const count = (state: Exclude<StatusFilter, "Tümü">) => ofExam.filter((topic) => stateOf(topic) === state).length;
  const toggle = (name: string) => setExpanded((current) => { const next = new Set(current); if (next.has(name)) next.delete(name); else next.add(name); return next; });

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="ÖSYM kapsamı · kişisel takip"
        title="Konu Haritası"
        description="Konularını gerçek soru verine göre izle: hangileri tamam, hangileri tekrar istiyor, hangilerinde henüz veri yok."
        actions={<><button onClick={() => onSection("exams")} className={secondaryButton}><Plus size={16} /> Tarama testi / deneme ekle</button></>}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard icon={<Layers size={18} />} label="Takip edilen konu" value={String(ofExam.length)} foot={<span>{exam === "Tümü" ? "TYT + AYT" : exam}</span>} />
        <StatCard tone="good" icon={<CheckCircle2 size={18} />} label="Hâkim olduğun" value={String(count("İyi"))} foot={<span>İyi durumdaki konular</span>} />
        <StatCard tone="warn" icon={<RotateCcw size={18} />} label="Tekrar gerektiren" value={String(count("Zayıf") + count("Orta"))} foot={<span>{count("Zayıf")} zayıf · {count("Orta")} orta</span>} />
        <StatCard icon={<CircleDashed size={18} />} label="Veri yok" value={String(count("Veri yok"))} foot={<span>Henüz yeterli soru çözülmedi</span>} />
      </div>

      <section className="soft-card space-y-3 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" size={16} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Konu ara…" aria-label="Konu ara" className="form-input pl-9" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Segmented value={exam} options={["Tümü", "TYT", "AYT"] as const} onChange={(value) => { setExam(value); setSubject("Tümü"); }} label="Sınav" />
            <Segmented value={status} options={["Tümü", "Zayıf", "Orta", "İyi", "Veri yok"] as const} onChange={setStatus} label="Durum" />
          </div>
        </div>
        {subjects.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-0.5" role="tablist" aria-label="Ders">
            {["Tümü", ...subjects].map((name) => (
              <button key={name} role="tab" aria-selected={subject === name} onClick={() => setSubject(name)} className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-[12px] font-semibold transition ${subject === name ? "border-brand bg-brand-soft text-brand-strong" : "border-rule text-ink-3 hover:border-brand/40"}`}>
                {name !== "Tümü" && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: getColorForSubject(name) }} />}{name}
              </button>
            ))}
          </div>
        )}
      </section>

      {groups.length === 0 ? (
        <EmptyNote>{topics.length === 0 ? "Konu haritan, ilk tarama testi ya da konu detaylı denemeyle oluşmaya başlar." : "Bu filtrelerle eşleşen konu yok."}</EmptyNote>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {groups.map((group) => {
            const open = expanded.has(group.name);
            const shown = open ? group.items : group.items.slice(0, 6);
            return (
              <section key={group.name} className="soft-card flex flex-col p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="flex items-center gap-2.5 text-[15px] font-bold text-ink"><span className="h-3 w-3 rounded" style={{ backgroundColor: getColorForSubject(group.name) }} />{group.name}</h2>
                  <span className="text-[12px] text-ink-3">{group.items.length} konu{group.review ? ` · ${group.review} tekrar` : ""}{group.average !== null ? ` · ort. %${group.average}` : ""}</span>
                </div>
                <ul className="divide-y divide-rule">
                  {shown.map((topic) => (
                    <li key={topic.id}>
                      <button onClick={() => setSelected(topic)} className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-paper/60">
                        <span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-semibold text-ink">{topic.topic}</span><span className="block truncate text-[12px] text-ink-4">{topic.exam}{topic.unit ? ` · ${topic.unit}` : ""}</span></span>
                        {!topic.insufficientData && <span className="hidden w-20 sm:block"><Bar100 value={topic.progress} color={STATE_STYLE[stateOf(topic)].color} /></span>}
                        <span className="w-9 shrink-0 text-right text-[12px] font-semibold text-ink-3">{topic.insufficientData ? "" : `%${Math.round(topic.progress)}`}</span>
                        <StatePill topic={topic} />
                      </button>
                    </li>
                  ))}
                </ul>
                {group.items.length > 6 && <button onClick={() => toggle(group.name)} className="mt-2 inline-flex items-center gap-1 self-start text-[12px] font-semibold text-brand">{open ? "Daha az göster" : `${group.items.length - 6} konu daha`} <ChevronDown size={14} className={open ? "rotate-180" : ""} /></button>}
              </section>
            );
          })}
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-brand/10 bg-brand-soft p-4 text-[13px] text-ink-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-3"><Compass size={17} className="mt-0.5 shrink-0 text-brand" /><span><strong className="font-semibold text-brand-strong">Kapsam notu:</strong> Konu listesi ÖSYM TYT/AYT kapsamına ve MEB programına dayanır; durum, girdiğin deneme ve tarama testlerindeki doğruluk oranından hesaplanır.</span></p>
        <a href="https://www.osym.gov.tr" target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 font-semibold text-brand">ÖSYM'yi aç <ExternalLink size={12} /></a>
      </div>

      {selected && !task && (
        <TopicDetail
          topic={selected}
          onClose={() => setSelected(null)}
          onFocus={() => { onStartSession({ subject: selected.subject, topic: selected.topic }); setSelected(null); }}
          onTask={() => setTask(taskDraftFor({ subject: selected.subject, topic: selected.topic, kind: stateOf(selected) === "Veri yok" ? "Konu çalışması" : "Konu tekrarı", source: "Konu haritası görevleri", questions: 20, preferredStart: profile?.preferredStudyStartTime }))}
        />
      )}
      {task && <TaskDialog draft={task} description="Bu konu için takvimine bir çalışma oturumu ekle." onChange={setTask} onClose={() => { setTask(null); setSelected(null); }} />}
    </div>
  );
}
