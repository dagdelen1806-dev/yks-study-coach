import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useNotebook } from "@/components/notebook/NotebookProvider";
import { ReviewDueNotes } from "@/components/notebook/NotebookSection";
import { GettingStarted } from "./GettingStarted";
import Illustration, { ILLUSTRATIONS, useIllustrationAvailable } from "@/components/app/Illustration";
import { AvatarPicker, StudentAvatar } from "@/components/app/Avatar";
import { Bar100, EmptyNote, LinkButton, Panel, Ring, Segmented, StatCard } from "@/components/app/kit";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TARGET_SCORE_TYPE_LABELS, type AvatarStyle } from "@shared/onboarding";
import { NOTEBOOK_REVIEW_TASK_KIND } from "@shared/questionNotebook";
import { palette } from "@shared/palette";
import { EXAM_KIND_DEFS, estimateScore, targetSummary, trackSubjects, type ExamKind } from "@shared/exams";
import { useExamTrack } from "@/hooks/useExamTrack";
import { getStatusFromProgress, statusMeta } from "@shared/yksData";
import {
  chartLabels,
  formatExamDate,
  formatMinutes,
  getDisplayName,
  motivationalLines,
  netDeltaLabel,
  toLocalDateKey,
  type DashboardSection,
  type MockExam,
  type Topic,
} from "@shared/yksData";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  Camera,
  ChevronRight,
  CircleCheck,
  Clock3,
  ListChecks,
  NotebookPen,
  PenLine,
  Play,
  MessageSquareText,
  Quote,
  Sparkles,
  Target,
  Trophy,
  TrendingUp,
  Zap,
} from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
// Grafikler ayrı parça: sayfa grafik motorunu beklemeden çizilir.
const NetTrendChart = lazy(() => import("./OverviewCharts").then((module) => ({ default: module.NetTrendChart })));
const WeeklyStudyChart = lazy(() => import("./OverviewCharts").then((module) => ({ default: module.WeeklyStudyChart })));
const ChartLoading = () => <div className="h-full animate-pulse rounded-xl bg-paper" aria-hidden="true" />;

export type FocusSessionSeed = { sessionId?: number; subject: string; topic: string; plannedMinutes?: number; sessionDate?: string | Date };

type TodaySession = { id: string | number; subject: string; topic: string; kind?: string; plannedMinutes: number; targetQuestions: number | null; actualMinutes: number | null; actualQuestions: number | null; done: boolean; sessionDate?: string | Date };

const greetingFor = (hour: number) => (hour < 5 ? "İyi geceler" : hour < 12 ? "Günaydın" : hour < 18 ? "İyi günler" : "İyi akşamlar");

/** Bugünden (bugün boşsa dünden) geriye kesintisiz çalışılan gün sayısı. */
const countStreak = (minutesByDay: Map<string, number>) => {
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);
  if (!(minutesByDay.get(toLocalDateKey(cursor)) ?? 0)) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while ((minutesByDay.get(toLocalDateKey(cursor)) ?? 0) > 0) { streak++; cursor.setDate(cursor.getDate() - 1); }
  return streak;
};

/** Koç notu: sabit bir cümle değil, eldeki veriden çıkan tek öneri. */
function buildCoachNote(latest: MockExam | undefined, previous: MockExam | undefined, weakTopic: Topic | undefined, subjectOrder: readonly string[]) {
  if (latest && previous) {
    const deltas = subjectOrder.map((subject) => ({ subject, delta: (latest.subjects[subject] ?? 0) - (previous.subjects[subject] ?? 0) }));
    const best = [...deltas].sort((a, b) => b.delta - a.delta)[0];
    const worst = [...deltas].sort((a, b) => a.delta - b.delta)[0];
    if (worst.delta < 0) return `${worst.subject} son denemede ${Math.abs(worst.delta).toFixed(2)} net düştü. Bu hafta bir oturumu ${weakTopic && weakTopic.subject === worst.subject ? weakTopic.topic : worst.subject} tekrarına ayır.`;
    if (best.delta > 0) return `${best.subject} ${best.delta.toFixed(2)} net arttı. ${weakTopic ? `Sıradaki adım: ${weakTopic.topic}.` : "Aynı ritmi koru."}`;
  }
  if (weakTopic) return `En zayıf konun ${weakTopic.topic} (${weakTopic.subject}). Bugünkü oturumu ona ayırmak en hızlı net kazancı.`;
  if (!latest) return "İlk deneme sonucunu eklediğinde hangi derse öncelik vermen gerektiğini burada göreceksin.";
  return "İkinci deneme sonucunu eklediğinde ders bazında değişimi burada göreceksin.";
}

/** Sınav türü sekmeleri; tek türlü sınavda (LGS) gösterilmez. */
const ExamTabs = ({ value, options, onChange }: { value: ExamKind; options: ExamKind[]; onChange: (value: ExamKind) => void }) => options.length > 1 ? <Segmented value={value} options={options} onChange={onChange} label="Sınav türü" /> : null;

// ---------------------------------------------------------------------------
// Genel Bakış
// ---------------------------------------------------------------------------

/** Kurum öğretmeninin öğrenciye açık bıraktığı geri bildirimler (son 3). Kuruma bağlı değilse görünmez. */
function TeacherFeedback() {
  const feedback = trpc.org.myFeedback.useQuery(undefined, { retry: false, staleTime: 60_000 });
  const items = (feedback.data ?? []).slice(0, 3);
  if (!items.length) return null;
  return (
    <Panel icon={<MessageSquareText size={18} />} title="Öğretmeninden geri bildirim">
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="rounded-xl border border-rule bg-paper/50 p-3">
            <p className="whitespace-pre-line text-[14px] leading-6 text-ink-2">{item.body}</p>
            <p className="mt-1.5 text-[12px] text-ink-4">{item.authorName ?? "Öğretmen"} · {item.orgName} · {new Date(item.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}</p>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export default function Overview({ topics, exams, onSection, onStartSession, onEditProfile }: { topics: Topic[]; exams: MockExam[]; onSection: (section: DashboardSection) => void; onStartSession: (seed?: FocusSessionSeed) => void; onEditProfile: () => void }) {
  const { user } = useAuth();
  const notebook = useNotebook();
  const profile = trpc.onboarding.get.useQuery(undefined, { retry: false }).data;
  const calendar = trpc.calendar.snapshot.useQuery(undefined, { retry: false });
  const review = trpc.questions.summary.useQuery(undefined, { retry: false });
  const utils = trpc.useUtils();
  const setAvatar = trpc.onboarding.setAvatar.useMutation({ onSuccess: (next) => utils.onboarding.get.setData(undefined, next) });
  const avatarStyle: AvatarStyle | null = profile?.avatarStyle ?? null;
  const summitAvailable = useIllustrationAvailable(ILLUSTRATIONS.summit);
  const coverAvailable = useIllustrationAvailable(ILLUSTRATIONS.heroGirl);
  const coverDesign = avatarStyle === "girl" && coverAvailable;
  const { track, kinds, trackSubjectList: subjectOrder } = useExamTrack();
  const [netExam, setNetExam] = useState<ExamKind>(kinds[0]);
  const [masteryExam, setMasteryExam] = useState<ExamKind>(kinds[0]);
  useEffect(() => { setNetExam(kinds[0]); setMasteryExam(kinds[0]); }, [kinds[0]]);

  const now = new Date();
  const todayKey = toLocalDateKey(now);
  const name = profile?.preferredName || getDisplayName(user?.name ?? "");

  // Bugünün oturumları: Takvim'deki plan.
  const sessions: TodaySession[] = (calendar.data?.sessions ?? [])
    .filter((item) => item.status !== "skipped" && toLocalDateKey(item.sessionDate) === todayKey)
    .sort((a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime())
    .map((item) => ({ id: item.id, subject: item.subject, topic: item.topic, kind: item.kind, plannedMinutes: item.plannedMinutes, targetQuestions: item.targetQuestions, actualMinutes: item.actualMinutes, actualQuestions: item.actualQuestions, done: item.status === "completed", sessionDate: item.sessionDate }));
  const doneCount = sessions.filter((item) => item.done).length;
  const nextSession = sessions.find((item) => !item.done);
  const plannedMinutes = sessions.reduce((sum, item) => sum + item.plannedMinutes, 0);
  const doneMinutes = sessions.filter((item) => item.done).reduce((sum, item) => sum + (item.actualMinutes ?? item.plannedMinutes), 0);
  const plannedQuestions = sessions.reduce((sum, item) => sum + (item.targetQuestions ?? 0), 0);
  const doneQuestions = sessions.filter((item) => item.done).reduce((sum, item) => sum + (item.actualQuestions ?? 0), 0);
  const dueReviews = review.data?.due ?? 0;

  // Son 7 gün: konu çalışma günlüğü.
  const week = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => { const date = new Date(); date.setHours(12, 0, 0, 0); date.setDate(date.getDate() - (6 - index)); return date; });
    const minutesByDay = new Map<string, number>();
    for (const log of calendar.data?.logs ?? []) { const key = toLocalDateKey(log.studyDate); minutesByDay.set(key, (minutesByDay.get(key) ?? 0) + log.minutes); }
    const dailyGoal = profile?.dailyStudyDuration ?? 0;
    const bars = days.map((date) => ({ key: toLocalDateKey(date), day: chartLabels[(date.getDay() + 6) % 7], minutes: minutesByDay.get(toLocalDateKey(date)) ?? 0, goal: dailyGoal }));
    const total = bars.reduce((sum, bar) => sum + bar.minutes, 0);
    return { bars, total, goal: dailyGoal * 7, streak: countStreak(minutesByDay), from: days[0], to: days[6] };
  }, [calendar.data?.logs, profile?.dailyStudyDuration]);

  const weakTopic = topics.filter((item) => item.status === "Zayıf" && !item.insufficientData).sort((a, b) => a.progress - b.progress)[0];
  // Karşılaştırma yalnızca aynı türden denemeyle (TYT ile AYT'nin netleri kıyaslanamaz).
  const byDate = useMemo(() => exams.slice().sort((a, b) => b.date.localeCompare(a.date)), [exams]);
  const latest = byDate[0];
  const previous = latest ? byDate.find((exam) => exam !== latest && (exam.exam ?? "TYT") === (latest.exam ?? "TYT")) : undefined;
  const netChange = latest && previous ? latest.net - previous.net : null;
  const coachNote = buildCoachNote(latest, previous, weakTopic, subjectOrder);
  // Tahmini puanı olan sınavda (bugün LGS) son denemenin tahmini puanı.
  const latestScoreDef = latest?.exam ? EXAM_KIND_DEFS[latest.exam].scoreEstimate ?? null : null;
  const latestScore = latest ? estimateScore(latest.exam, latest.subjects) : null;

  // Net gelişimi: seçilen sınav türünün denemeleri, eskiden yeniye.
  const netSeries = useMemo(() => exams
    .filter((exam) => (exam.exam ?? "TYT") === netExam)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-10)
    .map((exam) => ({ label: formatExamDate(exam.date), net: Number(exam.net.toFixed(2)), title: exam.title })), [exams, netExam]);

  // Konu hâkimiyeti: ders bazında ortalama ilerleme; hiç güvenilir verisi olmayan ders "Veri yok".
  const mastery = useMemo(() => {
    const bySubject = new Map<string, Topic[]>();
    for (const topic of topics.filter((item) => item.exam === masteryExam)) bySubject.set(topic.subject, [...(bySubject.get(topic.subject) ?? []), topic]);
    return Array.from(bySubject, ([subject, items]) => {
      const reliable = items.filter((item) => !item.insufficientData);
      const value = reliable.length ? Math.round(reliable.reduce((sum, item) => sum + item.progress, 0) / reliable.length) : null;
      return { subject, value, color: value === null ? palette.ruleStrong : statusMeta[getStatusFromProgress(value)].color };
    });
  }, [topics, masteryExam]);

  // Son deneme analizi: konu detayı girilmişse doğru/yanlış/boş, yoksa ders netleri.
  const analysis = useMemo(() => {
    if (!latest) return null;
    const details = latest.topicDetails ?? [];
    const correct = details.reduce((sum, row) => sum + (row.correct ?? 0), 0);
    const wrong = details.reduce((sum, row) => sum + (row.wrong ?? 0), 0);
    const blank = details.reduce((sum, row) => sum + (row.blank ?? 0), 0);
    const answered = correct + wrong + blank;
    return { answered, correct, wrong, blank, rate: answered ? Math.round((correct / answered) * 100) : null };
  }, [latest]);

  const startNext = () => (nextSession?.kind === NOTEBOOK_REVIEW_TASK_KIND
    ? notebook.startReview()
    : onStartSession(nextSession ? { sessionId: typeof nextSession.id === "number" ? nextSession.id : undefined, subject: nextSession.subject, topic: nextSession.topic, plannedMinutes: nextSession.plannedMinutes, sessionDate: nextSession.sessionDate } : undefined));

  const target = targetSummary(track, { ...profile, targetScoreTypeLabel: profile?.targetScoreType ? TARGET_SCORE_TYPE_LABELS[profile.targetScoreType] : null });
  const targetSchool = target.goal;
  const targetLine = target.details;
  const quote = motivationalLines[now.getDate() % motivationalLines.length];

  const planLine = sessions.length === 0
    ? "Bugün için planlanmış bir görevin yok; Takvim'den ekleyebilir ya da AI Planım ile haftanı planlayabilirsin."
    : doneCount === sessions.length
      ? `Bugünkü ${sessions.length} görevinin hepsini bitirdin, harika gidiyorsun.`
      : `Bugün planında ${sessions.length} görev var${doneCount ? `, ${doneCount} tanesi tamam` : ""}.${nextSession ? ` Sıradaki odak: ${nextSession.subject} · ${nextSession.topic}.` : ""}`;

  return (
    <div className="grid gap-5 animate-page-in xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 space-y-5">
        {/* Karşılama: öğrenciyi tanıyan koç. İki ayrı tasarım:
            - Kız avatarı: üstte tam genişlik kapak manzarası (zirveye bakan öğrenci), avatar kapağın üstüne biner.
            - Erkek avatarı / nötr: sağ kenarda bayraklı zirve; metin soldaki yumuşak geçişin üstünde. */}
        <section className={`coach-hero ${coverDesign ? "" : "p-5 sm:p-7"}`}>
          {coverDesign ? (
            <div className="relative h-[130px] sm:h-[176px]" aria-hidden="true">
              <Illustration src={ILLUSTRATIONS.heroGirl} className="h-full w-full object-cover object-[50%_12%]" />
              <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#eaf4f1] to-transparent" />
            </div>
          ) : (
            <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[230px] lg:block" aria-hidden="true">
              <Illustration src={ILLUSTRATIONS.summit} className="h-full w-full object-cover object-top" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#eaf4f1] to-transparent" />
            </div>
          )}
          <div className={coverDesign ? "px-5 pb-5 sm:px-7 sm:pb-7" : ""}>
          <div className={`relative flex flex-col gap-5 sm:flex-row sm:items-start ${coverDesign ? "-mt-10 sm:-mt-14" : "lg:max-w-[calc(100%-180px)]"}`}>
            <div className={`shrink-0 flex-col items-center gap-2 ${coverDesign ? "flex items-start sm:items-center" : "hidden sm:flex"}`}>
              <StudentAvatar style={avatarStyle} name={name} size={coverDesign ? 112 : 104} className="border-4 border-white shadow-[var(--shadow-card)]" />
              {user && (
                <Popover>
                  <PopoverTrigger asChild><button className="text-[11px] font-semibold text-brand hover:text-brand-strong">{avatarStyle ? "Avatarı değiştir" : "Avatarını seç"}</button></PopoverTrigger>
                  <PopoverContent align="start" className="w-auto rounded-2xl p-4">
                    <p className="mb-3 text-[13px] font-bold text-ink">Avatarını seç</p>
                    <AvatarPicker value={avatarStyle ?? ""} onChange={(next) => setAvatar.mutate({ avatarStyle: next || null })} />
                  </PopoverContent>
                </Popover>
              )}
            </div>
            <div className={`min-w-0 flex-1 ${coverDesign ? "sm:pt-16" : ""}`}>
              <h1 className="font-display text-[26px] font-extrabold leading-tight text-ink sm:text-[30px]">{greetingFor(now.getHours())} {name}!</h1>
              <div className="mt-2 max-w-[68ch] space-y-1.5 text-[14.5px] leading-6 text-ink-2">
                <p>{targetSchool ? `${targetSchool} hedefin için attığın her bilinçli adım seni hedefine biraz daha yaklaştırıyor.` : `${track} hedefin için attığın her bilinçli adım seni hedefine biraz daha yaklaştırıyor.`}</p>
                <p>{planLine}{dueReviews > 0 ? ` Tekrar listende ${dueReviews} soru seni bekliyor.` : ""}</p>
              </div>
              <p className="mt-3 text-[14.5px] font-bold text-brand-strong">Hazırsan başlayalım {name}! Bugün nereden başlamak istersin?</p>
            </div>
          </div>
          <div className="relative mt-5 grid gap-2.5 md:grid-cols-3">
            <button onClick={startNext} className="flex min-h-[52px] items-center gap-3 rounded-xl bg-brand px-4 text-left text-[14.5px] font-bold text-white shadow-[var(--shadow-card)] transition hover:bg-brand-strong">
              <Play size={18} className="shrink-0" /> <span className="flex-1">{nextSession ? "Bugünkü planıma başla" : "Serbest oturum başlat"}</span><ArrowRight size={16} />
            </button>
            <button onClick={() => notebook.startReview()} className="flex min-h-[52px] items-center gap-3 rounded-xl border border-rule bg-white px-4 text-left text-[14.5px] font-semibold text-ink transition hover:border-brand/40">
              <BookOpen size={18} className="shrink-0 text-brand" /> <span className="flex-1">Tekrar listemden başla{dueReviews > 0 && <span className="ml-1.5 rounded-full bg-warn-soft px-2 py-0.5 text-[11px] font-bold text-warn">{dueReviews}</span>}</span><ChevronRight size={16} className="text-ink-4" />
            </button>
            <button onClick={() => onSection("calendar")} className="flex min-h-[52px] items-center gap-3 rounded-xl border border-rule bg-white px-4 text-left text-[14.5px] font-semibold text-ink transition hover:border-brand/40">
              <ListChecks size={18} className="shrink-0 text-brand" /> <span className="flex-1">Tüm görevleri gör</span><ChevronRight size={16} className="text-ink-4" />
            </button>
          </div>
          </div>
        </section>

        <GettingStarted exams={exams} onSection={onSection} onStartSession={() => onStartSession()} />

        {/* Bugünün hedefleri + son deneme. */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatCard icon={<Clock3 size={18} />} label="Bugünkü çalışma hedefi" value={formatMinutes(plannedMinutes)} progress={plannedMinutes ? (doneMinutes / plannedMinutes) * 100 : 0} foot={<><span>Planlanan süre</span><span>{doneMinutes} / {plannedMinutes} dk</span></>} />
          <StatCard icon={<PenLine size={18} />} label="Bugünkü soru hedefi" value={String(plannedQuestions)} unit="soru" progress={plannedQuestions ? (doneQuestions / plannedQuestions) * 100 : 0} foot={<><span>{plannedQuestions ? "Planlanan" : "Görevlerde soru hedefi yok"}</span><span>{doneQuestions} / {plannedQuestions}</span></>} />
          <StatCard icon={<ListChecks size={18} />} label="Bugünkü görev" value={String(sessions.length)} unit="görev" progress={sessions.length ? (doneCount / sessions.length) * 100 : 0} foot={<><span>Tamamlanan</span><span>{doneCount} / {sessions.length}</span></>} />
          <StatCard tone="warm" icon={<Trophy size={18} />} label="Son deneme neti" value={latest ? latest.net.toFixed(2) : "—"} unit={latest ? "net" : undefined} foot={latest ? <><span>{latest.exam ?? "TYT"} · {formatExamDate(latest.date)}{latestScore !== null ? ` · ~${latestScore.toFixed(0)} puan` : ""}</span>{netChange !== null && <span className={`font-bold ${netChange >= 0 ? "text-success" : "text-danger"}`}>{netChange >= 0 ? "↑" : "↓"} {netDeltaLabel(netChange)}</span>}</> : <button onClick={() => onSection("exams")} className="font-semibold text-brand">İlk denemeni ekle →</button>} />
        </div>

        {user && <ReviewDueNotes />}
        {user && <TeacherFeedback />}

        {/* Grafikler. */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Panel icon={<TrendingUp size={18} />} title="Net gelişimin" action={<ExamTabs value={netExam} options={kinds} onChange={setNetExam} />}>
            {netSeries.length === 0 ? (
              <EmptyNote>{netExam} denemesi eklediğinde netlerinin gelişimi burada çizilir.<br /><button onClick={() => onSection("exams")} className="mt-2 font-semibold text-brand">Deneme ekle →</button></EmptyNote>
            ) : (
              <>
                <p className="-mt-2 mb-2 text-[12px] text-ink-3">Son {netSeries.length} {netExam} denemesi · toplam net</p>
                <div className="h-[220px]" role="img" aria-label={`${netExam} net gelişimi: ${netSeries.map((point) => `${point.label} ${point.net}`).join(", ")}`}>
                  <Suspense fallback={<ChartLoading />}><NetTrendChart data={netSeries} /></Suspense>
                </div>
              </>
            )}
          </Panel>

          <Panel icon={<BarChart3 size={18} />} title="Haftalık çalışma süren" action={week.goal > 0 ? <Ring value={(week.total / week.goal) * 100} size={52} stroke={6}><span className="text-[11px] font-extrabold text-brand">%{Math.round(Math.min(100, (week.total / week.goal) * 100))}</span></Ring> : undefined}>
            <p className="-mt-2 mb-2 text-[12px] text-ink-3">
              Son 7 gün · <strong className="font-bold text-ink">{week.total} dk</strong>{week.goal > 0 ? ` / ${week.goal} dk hedef` : " · günlük hedefini profilinden belirle"}{week.streak > 1 ? ` · ${week.streak} gündür kesintisiz` : ""}
            </p>
            {week.total === 0 ? (
              <EmptyNote>Bu hafta henüz kayıtlı çalışma yok. Bir odak oturumunu bitirdiğinde süresi burada görünür.</EmptyNote>
            ) : (
              <div className="h-[220px]" role="img" aria-label={`Son 7 gün çalışma: ${week.bars.map((bar) => `${bar.day} ${bar.minutes} dakika`).join(", ")}`}>
                <Suspense fallback={<ChartLoading />}><WeeklyStudyChart data={week.bars} showGoal={week.goal > 0} /></Suspense>
              </div>
            )}
          </Panel>
        </div>

        {/* Konu hâkimiyeti, bugünün planı, son deneme. */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-[1.1fr_1fr_0.9fr]">
          <Panel icon={<Target size={18} />} title="Konu hâkimiyeti" action={<ExamTabs value={masteryExam} options={kinds} onChange={setMasteryExam} />}>
            {mastery.length === 0 ? (
              <EmptyNote>{masteryExam} konuların henüz yüklenmedi.</EmptyNote>
            ) : (
              <>
                <ul className="grid gap-x-5 gap-y-3 sm:grid-cols-2">
                  {mastery.map((row) => (
                    <li key={row.subject}>
                      <div className="mb-1.5 flex items-center justify-between text-[13px]"><span className="flex items-center gap-2 font-semibold text-ink"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: row.color }} />{row.subject}</span><span className="font-semibold text-ink-3">{row.value === null ? "Veri yok" : `%${row.value}`}</span></div>
                      <Bar100 value={row.value ?? 0} color={row.color} />
                    </li>
                  ))}
                </ul>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
                  <div className="flex flex-wrap gap-3 text-[11px] text-ink-3">{(["İyi", "Orta", "Zayıf"] as const).map((status) => <span key={status} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: statusMeta[status].color }} />{status}</span>)}<span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: palette.ruleStrong }} />Veri yok</span></div>
                  <LinkButton onClick={() => onSection("topics")}>Konu haritası</LinkButton>
                </div>
              </>
            )}
          </Panel>

          <Panel icon={<CalendarDays size={18} />} title="Bugünkü çalışma planın" action={<LinkButton onClick={() => onSection("calendar")}>Tümünü gör</LinkButton>}>
            {sessions.length === 0 ? (
              <EmptyNote>Bugün için görev yok.<br /><button onClick={() => onSection("plan")} className="mt-2 font-semibold text-brand">AI Planım ile haftanı planla →</button></EmptyNote>
            ) : (
              <ol className="space-y-2.5">
                {sessions.slice(0, 4).map((item, index) => (
                  <li key={String(item.id)} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${item === nextSession ? "border-[#f3dc9b] bg-pencil-soft/60" : "border-rule"}`}>
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${item.done ? "bg-success text-white" : item === nextSession ? "bg-brand-strong text-white" : "bg-paper text-ink-3"}`}>{item.done ? <CircleCheck size={15} /> : index + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-[13px] font-semibold ${item.done ? "text-ink-3 line-through" : "text-ink"}`}>{item.subject} · {item.topic}</span>
                      <span className="block truncate text-[12px] text-ink-3">{[item.kind, item.targetQuestions ? `${item.targetQuestions} soru` : null].filter(Boolean).join(" · ")}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-[12px] text-ink-3"><Clock3 size={13} />{item.plannedMinutes} dk</span>
                  </li>
                ))}
                {sessions.length > 4 && <li className="text-center text-[12px] text-ink-3">+{sessions.length - 4} görev daha</li>}
              </ol>
            )}
          </Panel>

          <Panel icon={<BarChart3 size={18} />} title="Son deneme analizi" className="lg:col-span-2 2xl:col-span-1" action={latest ? <LinkButton onClick={() => onSection("exams")}>Detaylı analiz</LinkButton> : undefined}>
            {!latest || !analysis ? (
              <EmptyNote>Deneme sonucu eklediğinde doğru, yanlış ve boş dağılımın burada görünür.</EmptyNote>
            ) : (
              <div className="flex flex-1 flex-col">
                <p className="-mt-2 mb-3 text-[12px] text-ink-3">{latest.title || `${latest.exam ?? "TYT"} denemesi`} · {formatExamDate(latest.date)}</p>
                {analysis.rate !== null ? (
                  <div className="flex items-center gap-5">
                    <Ring value={analysis.rate} size={104} stroke={11}><span className="text-[20px] font-extrabold text-ink">%{analysis.rate}</span><span className="text-[10px] text-ink-3">Doğru oranı</span></Ring>
                    <dl className="flex-1 space-y-1.5 text-[13px]">
                      {[["Doğru", analysis.correct, palette.success], ["Yanlış", analysis.wrong, palette.danger], ["Boş", analysis.blank, palette.ruleStrong]].map(([label, count, color]) => (
                        <div key={label as string} className="flex items-center justify-between"><dt className="flex items-center gap-2 text-ink-3"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: color as string }} />{label}</dt><dd className="font-bold text-ink">{count}</dd></div>
                      ))}
                    </dl>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {subjectOrder.filter((subject) => latest.subjects[subject] !== undefined).map((subject) => (
                      <li key={subject} className="flex items-center justify-between text-[13px]"><span className="text-ink-2">{subject}</span><span className="font-bold text-ink">{(latest.subjects[subject] ?? 0).toFixed(2)} net</span></li>
                    ))}
                    <li className="pt-1 text-[11px] text-ink-4">Doğru/yanlış dağılımı için denemeye konu detayı ekleyebilirsin.</li>
                  </ul>
                )}
                <div className="mt-auto flex items-center justify-between border-t border-rule pt-3 text-[13px]">
                  <span className="text-ink-3">Net</span>
                  <span className="flex items-baseline gap-2"><strong className="text-[18px] font-extrabold text-ink">{latest.net.toFixed(2)}</strong>{netChange !== null && <span className={`text-[12px] font-bold ${netChange >= 0 ? "text-success" : "text-danger"}`}>{netDeltaLabel(netChange)}</span>}</span>
                </div>
                {latestScore !== null && latestScoreDef && (
                  <div className="flex items-center justify-between pt-2 text-[13px]">
                    <span className="text-ink-3">{latestScoreDef.label} <span className="text-[11px] text-ink-4">(resmî değil)</span></span>
                    <strong className="text-ink">{latestScore.toFixed(1)} / {latestScoreDef.max}</strong>
                  </div>
                )}
              </div>
            )}
          </Panel>
        </div>
      </div>

      {/* Sağ sütun: hedef, koç önerisi, hızlı erişim. */}
      <aside className="grid content-start gap-5 sm:grid-cols-2 xl:grid-cols-1">
        <section className="soft-card border-[#f3dc9b] bg-gradient-to-b from-pencil-soft/80 to-white p-5">
          <p className="flex gap-2 text-[15px] font-semibold italic leading-6 text-ink-2"><Quote size={16} className="mt-1 shrink-0 text-pencil-strong" />{quote}</p>
          <div className="mt-4 rounded-xl border border-rule bg-white p-4">
            <div className="flex items-center gap-2 text-[14px] font-bold text-ink"><Target size={18} className="text-brand" /> Hedefin</div>
            {targetSchool ? (
              <p className="mt-2 text-[14px] font-semibold leading-5 text-ink">{targetSchool}</p>
            ) : (
              <p className="mt-2 text-[13px] text-ink-3">{target.emptyText}</p>
            )}
            {targetLine.some(Boolean) && <p className="mt-1 text-[12px] text-ink-3">{targetLine.filter(Boolean).join(" · ")}</p>}
            <button onClick={onEditProfile} className="mt-3 text-[12px] font-semibold text-brand hover:text-brand-strong">{targetSchool ? "Hedefini düzenle" : "Hedefini belirle"} →</button>
          </div>
        </section>

        <section className="soft-card p-5">
          <h2 className="flex items-center gap-2 text-[14px] font-bold text-ink"><Sparkles size={17} className="text-pencil-strong" /> Koçunun sana önerisi</h2>
          <p className="mt-3 text-[14px] leading-6 text-ink-2">{coachNote}</p>
          <button onClick={() => onSection(latest ? (weakTopic ? "topics" : "exams") : "exams")} className="mt-4 flex w-full items-center justify-between rounded-xl border border-rule px-3.5 py-2.5 text-[13px] font-semibold text-brand hover:bg-paper">
            {latest ? (weakTopic ? "Zayıf konularıma bak" : "Denemelerime bak") : "Deneme sonucu ekle"} <ChevronRight size={15} />
          </button>
        </section>

        <section className="soft-card p-5">
          <h2 className="flex items-center gap-2 text-[14px] font-bold text-ink"><Zap size={17} className="text-brand" /> Hızlı erişim</h2>
          <ul className="mt-3 divide-y divide-rule">
            {[
              { icon: <CalendarDays size={17} />, label: "Ders programım", run: () => onSection("calendar") },
              { icon: <PenLine size={17} />, label: "Planı düzenle", run: () => onSection("plan") },
              { icon: <Trophy size={17} />, label: "Deneme ekle", run: () => onSection("exams") },
              { icon: <Camera size={17} />, label: "Çözemediğim soruyu ekle", run: () => notebook.captureQuestion() },
              { icon: <NotebookPen size={17} />, label: "Soru defterim", run: () => onSection("notebook") },
              { icon: <BookOpen size={17} />, label: "Kaynak önerileri", run: () => onSection("resources") },
            ].map((item) => (
              <li key={item.label}>
                <button onClick={item.run} className="flex w-full items-center gap-3 py-2.5 text-left text-[13.5px] font-medium text-ink-2 hover:text-brand-strong">
                  <span className="text-brand">{item.icon}</span><span className="flex-1">{item.label}</span><ChevronRight size={15} className="text-ink-4" />
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* Zirve kartı kız tasarımında; erkek/nötr tasarımda aynı görsel zaten karşılama alanında. */}
        {avatarStyle === "girl" && summitAvailable && (
          <section className="relative overflow-hidden rounded-2xl sm:col-span-2 xl:col-span-1">
            <Illustration src={ILLUSTRATIONS.summit} className="h-[210px] w-full object-cover object-[50%_20%]" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f3d3b]/75 via-transparent to-transparent" />
            <p className="absolute bottom-4 left-5 right-5 text-[18px] font-bold leading-snug text-white">Küçük adımlar büyük hedeflere götürür.</p>
          </section>
        )}
      </aside>
    </div>
  );
}
