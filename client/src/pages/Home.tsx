import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { TARGET_SCORE_TYPE_LABELS } from "@shared/onboarding";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BookContentBadge, BookDetailDialog, BookRecommendationsCard } from "@/components/books/BookLibrary";
import type { ScannerBook } from "@/components/books/BookContentScanner";
import AddBookWizard, { type CoverDraft } from "@/components/books/AddBookWizard";
import { isSameBook } from "@shared/bookIdentity";
import ChangePasswordDialog from "@/components/auth/ChangePasswordDialog";
import NotebookSection, { DayNotes, ReviewDueNotes } from "@/components/notebook/NotebookSection";
import { NotebookProvider, useNotebook } from "@/components/notebook/NotebookProvider";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  Compass,
  ExternalLink,
  FileText,
  Flame,
  Grid2X2,
  Library,
  ListFilter,
  KeyRound,
  LogOut,
  NotebookPen,
  Map,
  Menu,
  Moon,
  Pause,
  PenLine,
  Play,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Upload,
  History,
  TrendingDown,
  TrendingUp,
  Trophy,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import * as XLSX from "xlsx";
import ResourceCatalogSection from "@/components/resourceCatalog/ResourceCatalogSection";
import PaywallSection from "@/components/subscription/PaywallSection";
import AdminPanel from "@/components/subscription/AdminPanel";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import FocusAuraVideo from "@/components/focusAura/FocusAuraVideo";
import { DEFAULT_FOCUS_AURA_CONFIG } from "@/lib/focusAura";
import { useFocusClock } from "@/hooks/useFocusClock";
import { calculatePlanAdherence, type AdherenceDecision, type AdherenceResult } from "../../../shared/planAdherence";
import { buildTytTemplateTopicDetails, groupTopicDetailsBySubject, TYT_TEMPLATE_MISSING_NOTE } from "../../../shared/tytExamTemplate";
import { buildSubjectTopicMap, findCurrentAndNextSession, generateDailyFocusPlan, type SubjectTopicMap } from "../../../shared/focusPlan";
import { resolveBookTarget } from "../../../shared/planTargets";
import { deriveTopicStatus } from "../../../shared/topicStatus";
import { palette, categoricalPalette } from "@shared/palette";
import {
  appNavSections,
  calculateTopicResult,
  currentNet,
  dailyPlan,
  defaultDashboardUser,
  demoNotice,
  footerDisclaimer,
  fieldLabels,
  formatDayRange,
  formatExamDate,
  formatPercent,
  formatMinutes,
  getColorForSubject,
  getDisplayName,
  getInitials,
  getNextStatus,
  getStatusFromProgress,
  getStoredValue,
  initialExams,
  initialResources,
  initialTopics,
  localStorageKeys,
  motivationBody,
  motivationTitle,
  netDeltaLabel,
  officialScopeNote,
  postOnboardingNudgeKey,
  questionGoal,
  questionProgress,
  resourceSeeds,
  resourceBookCatalog,
  scopeSources,
  sectionDescriptions,
  statusFilters,
  statusLegend,
  statusMeta,
  subjectBreakdown,
  adminNavSection,
  chartLabels,
  subjectColors,
  subjectFilters,
  subjectOrder,
  trackedTopics,
  targetNet,
  timeFieldLabels,
  toLocalDateKey,
  tytSubjectTotals,
  topicCounts,
  type DashboardSection,
  type AiWeeklyPlan,
  type AiStudySession,
  type BookLevel,
  type BookStudyLog,
  type BookTopicMapping,
  type SourceSwitch,
  type ExamDocumentExtraction,
  type ExamTopicResult,
  type MockExam,
  type Resource,
  type ResourceBook,
  type StudyHistoryItem,
  type Topic,
  weeklyBars,
  weeklyGoalMinutes,
  weeklyStudyMinutes,
} from "@shared/yksData";

type ExamForm = {
  title: string;
  date: string;
  exam: "TYT" | "AYT";
  turkce: string;
  matematik: string;
  fen: string;
  sosyal: string;
  turkceTime: string;
  matematikTime: string;
  fenTime: string;
  sosyalTime: string;
  topicNets: Record<string, string>;
  topicDetails: ExamTopicResult[];
  notes: string;
  importedFrom: "manual" | "ocr" | "pdf";
};

// Dershane denemesi konu satırları: TYT için öğrencinin kendi dershanesinin
// gerçek "Derslere Göre Başarı Analizi" tablosundan gelen sabit şablon
// (shared/tytExamTemplate.ts — ders > kategori > konu, S soru sayısı
// kaynaktan) kullanılıyor; öğrenci yalnızca doğru/yanlış/boş girer. AYT için
// karşılık gelen bir kaynak paylaşılmadığından eski davranış (Konu
// Haritası'ndan, sabit S olmadan) korunuyor.
const buildTopicDetailsForExam = (examType: "TYT" | "AYT", allTopics: Topic[]): ExamTopicResult[] =>
  examType === "TYT"
    ? buildTytTemplateTopicDetails()
    : allTopics.filter((item) => item.exam === examType).map(({ subject, topic }) => ({ subject, topic, questionCount: 0, correct: 0, wrong: 0, blank: 0, accuracy: 0, net: 0 }));

const createBlankExamForm = (allTopics: Topic[]): ExamForm => {
  const topicDetails = buildTopicDetailsForExam("TYT", allTopics);
  return {
    title: "",
    date: toLocalDateKey(),
    exam: "TYT",
    turkce: "",
    matematik: "",
    fen: "",
    sosyal: "",
    turkceTime: "",
    matematikTime: "",
    fenTime: "",
    sosyalTime: "",
    topicNets: Object.fromEntries(topicDetails.map(({ topic }) => [topic, ""])),
    topicDetails,
    notes: "",
    importedFrom: "manual",
  };
};

const examToPersistenceInput = (exam: MockExam) => ({
  title: exam.title,
  exam: (exam.exam || "TYT") as "TYT" | "AYT",
  date: exam.date,
  net: exam.net,
  delta: exam.delta,
  subjects: exam.subjects,
  timeSpent: exam.timeSpent || {},
  topicNets: exam.topicNets || {},
  topicDetails: exam.topicDetails || [],
  importedFrom: exam.importedFrom || "manual",
});

const sectionIcons: Record<DashboardSection, typeof Grid2X2> = {
  overview: Grid2X2,
  topics: Map,
  exams: BarChart3,
  resources: BookOpen,
  catalog: Library,
  plan: CalendarDays,
  calendar: CalendarDays,
  notebook: NotebookPen,
  premium: Sparkles,
  admin: ShieldCheck,
};

const toneClasses: Record<string, string> = {
  blue: "bg-brand-soft text-brand",
  coral: "bg-danger-soft text-danger",
  mint: "bg-success-soft text-success",
  lilac: "bg-violet-soft text-violet",
  yellow: "bg-warn-soft text-warn",
};

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-2">
      <div className="brand-mark">P</div>
      <div className="font-display text-[22px] font-semibold leading-none text-ink">Pusula</div>
    </div>
  );
}

function StatusPill({ status, insufficientData }: { status: Topic["status"]; insufficientData?: boolean }) {
  const meta = statusMeta[status];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="status-pill" style={{ color: meta.color, backgroundColor: meta.bg }}>
        <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
        {status}
      </span>
      {insufficientData && <span className="status-pill bg-paper text-ink-3" title="Kesin karar için yeterli soru hacmi yok">Veri yetersiz</span>}
    </span>
  );
}

function ProgressBar({ value, color = palette.brand }: { value: number; color?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-rule">
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: color }} />
    </div>
  );
}

function SectionHeading({ eyebrow, title, copy, action }: { eyebrow?: string; title: string; copy?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
        <h2 className="font-display text-[26px] font-semibold leading-tight text-ink">{title}</h2>
        {copy && <p className="mt-1 text-[14px] leading-6 text-ink-3">{copy}</p>}
      </div>
      {action}
    </div>
  );
}

type OverviewSession = { id: string | number; subject: string; topic: string; kind?: string; plannedMinutes: number; done: boolean; sessionDate?: string | Date };

/** Bugünden (bugün boşsa dünden) geriye kesintisiz çalışılan gün sayısı. */
const countStreak = (minutesByDay: globalThis.Map<string, number>) => {
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);
  if (!(minutesByDay.get(toLocalDateKey(cursor)) ?? 0)) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while ((minutesByDay.get(toLocalDateKey(cursor)) ?? 0) > 0) { streak++; cursor.setDate(cursor.getDate() - 1); }
  return streak;
};

/** Koç notu: sabit bir cümle değil, eldeki veriden çıkan tek öneri. */
function buildCoachNote(latest: MockExam | undefined, previous: MockExam | undefined, weakTopic: Topic | undefined) {
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

function Overview({ topics, exams, onSection, onStartSession }: { topics: Topic[]; exams: MockExam[]; onSection: (section: DashboardSection) => void; onStartSession: (seed?: FocusSessionSeed) => void }) {
  const { user } = useAuth();
  const isGuest = !user;
  const onboarding = trpc.onboarding.get.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const profile = onboarding.data;
  const calendarSnapshot = trpc.calendar.snapshot.useQuery(undefined, { enabled: Boolean(user), retry: false });

  const today = new Date();
  const todayKey = toLocalDateKey(today);
  const todayTitle = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long" }).format(today);
  const todayWeekday = new Intl.DateTimeFormat("tr-TR", { weekday: "long" }).format(today);
  const greeting = profile?.preferredName || (user ? getDisplayName(user.name) : null);

  // Bugünün oturumları: hesapta Takvim'deki gerçek plan, misafirde demo plan.
  const sessions: OverviewSession[] = isGuest
    ? dailyPlan.map((item, index) => { const [topic] = item.title.split(" · "); return { id: `demo-${index}`, subject: item.meta.replace(/^(TYT|AYT) /, ""), topic, kind: item.title.split(" · ")[1], plannedMinutes: 40, done: item.done }; })
    : (calendarSnapshot.data?.sessions ?? [])
        .filter((item) => item.status !== "skipped" && toLocalDateKey(item.sessionDate) === todayKey)
        .sort((a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime())
        .map((item) => ({ id: item.id, subject: item.subject, topic: item.topic, kind: item.kind, plannedMinutes: item.plannedMinutes, done: item.status === "completed", sessionDate: item.sessionDate }));
  const doneCount = sessions.filter((item) => item.done).length;
  const nextSession = sessions.find((item) => !item.done);

  // Son 7 gün: hesapta konu çalışma günlüğü, misafirde demo çubuklar.
  const last7Days = Array.from({ length: 7 }, (_, index) => { const date = new Date(); date.setHours(12, 0, 0, 0); date.setDate(date.getDate() - (6 - index)); return date; });
  const minutesByDay = new globalThis.Map<string, number>(); // "Map" burada lucide ikonu
  if (isGuest) {
    for (const date of last7Days) minutesByDay.set(toLocalDateKey(date), weeklyBars.find((bar) => bar.day === chartLabels[(date.getDay() + 6) % 7])?.value ?? 0);
  } else {
    for (const log of calendarSnapshot.data?.logs ?? []) { const key = toLocalDateKey(log.studyDate); minutesByDay.set(key, (minutesByDay.get(key) ?? 0) + log.minutes); }
  }
  const bars = last7Days.map((date) => ({ key: toLocalDateKey(date), day: chartLabels[(date.getDay() + 6) % 7], value: minutesByDay.get(toLocalDateKey(date)) ?? 0 }));
  const weekTotal = bars.reduce((sum, bar) => sum + bar.value, 0);
  const weekMax = Math.max(1, ...bars.map((bar) => bar.value));
  const weekGoal = isGuest ? weeklyGoalMinutes : (profile?.dailyStudyDuration ?? 0) * 7;
  const streak = countStreak(minutesByDay);

  const studiedTopicCount = topics.filter((item) => !item.insufficientData).length;
  const coverage = topics.length ? Math.round(topics.reduce((sum, item) => sum + item.progress, 0) / topics.length) : 0;
  const weakTopic = topics.filter((item) => item.status === "Zayıf" && !item.insufficientData).sort((a, b) => a.progress - b.progress)[0];

  const latest = exams[0];
  const previous = exams[1];
  const netChange = latest && previous ? latest.net - previous.net : null;
  const latestTyt = exams.find((item) => (item.exam ?? "TYT") === "TYT");
  // Hedef net yalnızca demoda var; hesapta profil hedefi sıralama olarak tutuluyor.
  const demoTarget = isGuest ? targetNet : null;
  const targetText = profile?.targetRanking ? `İlk ${profile.targetRanking}` : null;
  const scoreTypeText = profile?.targetScoreType ? TARGET_SCORE_TYPE_LABELS[profile.targetScoreType] : null;

  const startNext = () => onStartSession(nextSession ? { sessionId: typeof nextSession.id === "number" ? nextSession.id : undefined, subject: nextSession.subject, topic: nextSession.topic, plannedMinutes: nextSession.plannedMinutes, sessionDate: nextSession.sessionDate } : undefined);

  return (
    <div className="space-y-5 animate-page-in">
      {/* Bugün şeridi: günün oturumları optik form baloncukları olarak. */}
      <section className="today-band grid gap-6 p-6 sm:p-7 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)] lg:gap-10">
        <div>
          <p className="text-[15px] font-medium capitalize text-ink-3">{todayWeekday}</p>
          <h1 className="today-date mt-1">{todayTitle}</h1>
          <p className="mt-3 max-w-[38ch] text-[15px] leading-6 text-ink-2">
            {greeting ? `Merhaba ${greeting}. ` : ""}
            {sessions.length === 0 ? "Bugün için planlanmış oturum yok." : doneCount === sessions.length ? "Bugünün planı tamam." : `Bugün ${sessions.length} oturumdan ${doneCount} tanesi bitti.`}
          </p>
        </div>
        <div className="lg:border-l lg:border-rule lg:pl-10">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[15px] font-semibold text-ink">Bugünkü plan</h2>
            {sessions.length > 0 && <span className="text-[14px] text-ink-3">{doneCount}/{sessions.length} oturum</span>}
          </div>
          <div className="bubble-row mt-3" role="list" aria-label="Bugünkü oturumlar">
            {sessions.length === 0 && <span className="bubble-item" aria-hidden="true"><span className="bubble is-empty">–</span><span className="bubble-label">Plan yok</span></span>}
            {sessions.map((item, index) => (
              <span key={String(item.id)} role="listitem" className="bubble-item" aria-label={`${index + 1}. ${item.subject}, ${item.topic}${item.done ? ", bitti" : item === nextSession ? ", sıradaki" : ""}`}>
                <span className={`bubble ${item.done ? "is-done" : ""} ${item === nextSession ? "is-next" : ""}`} aria-hidden="true">{item.done ? <Check size={18} strokeWidth={3} /> : index + 1}</span>
                <span className="bubble-label" aria-hidden="true">{item.subject}</span>
              </span>
            ))}
          </div>
          {nextSession ? (
            <p className="mt-4 text-[15px] text-ink-2">Sıradaki: <strong className="font-semibold text-ink">{nextSession.subject} · {nextSession.topic}</strong>{nextSession.kind ? `, ${nextSession.kind.toLocaleLowerCase("tr-TR")}` : ""} · {nextSession.plannedMinutes} dk</p>
          ) : sessions.length > 0 ? (
            <p className="mt-4 text-[15px] text-ink-2">Planın bitti. İstersen serbest bir oturum daha açabilirsin.</p>
          ) : (
            <p className="mt-4 text-[15px] text-ink-2">Takvimde bugün için oturum oluştur ya da serbest bir oturumla başla.</p>
          )}
          <div className="mt-5 flex flex-wrap gap-2.5">
            {nextSession ? (
              <Button onClick={startNext} className="h-11 rounded-[10px] bg-pencil px-5 text-[15px] font-semibold text-ink hover:bg-pencil-strong"><Play className="mr-1.5" size={16} /> Oturumu başlat</Button>
            ) : (
              <Button onClick={() => onStartSession()} className="h-11 rounded-[10px] bg-pencil px-5 text-[15px] font-semibold text-ink hover:bg-pencil-strong"><Play className="mr-1.5" size={16} /> Serbest oturum başlat</Button>
            )}
            <button onClick={() => onSection("calendar")} className="inline-flex h-11 items-center gap-2 rounded-[10px] border border-rule-strong px-4 text-[15px] font-medium text-ink-2 hover:bg-paper">
              <CalendarDays size={16} /> {sessions.length ? "Takvimi aç" : "Takvimde plan oluştur"}
            </button>
          </div>
        </div>
      </section>
      {user && <ReviewDueNotes />}

      <div className="stat-strip">
        <div>
          <p className="text-[14px] text-ink-3">Konu kapsama</p>
          <p className="stat-value mt-1">{formatPercent(coverage)}</p>
          <p className="mt-1 text-[13px] text-ink-3">{studiedTopicCount} / {topics.length} konuda yeterli veri</p>
        </div>
        <div>
          <p className="text-[14px] text-ink-3">Son 7 gün</p>
          <p className="stat-value mt-1">{formatMinutes(weekTotal)}</p>
          <p className="mt-1 text-[13px] text-ink-3">{weekGoal > 0 ? `Hedef ${formatMinutes(weekGoal)} · ${formatPercent(Math.min(100, (weekTotal / weekGoal) * 100))}` : "Günlük hedefini profilinden belirle"}</p>
        </div>
        <div>
          <p className="text-[14px] text-ink-3">Çalışma serisi</p>
          <p className="stat-value mt-1">{streak} gün</p>
          <p className="mt-1 text-[13px] text-ink-3">{streak ? "Kesintisiz çalıştığın günler" : "Bugün bir oturumla başlat"}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="soft-card gap-0 p-6 sm:p-7">
          <SectionHeading title="Odak süren" copy={`${formatDayRange(last7Days[0], last7Days[6])} arasında konu çalışmasına ayırdığın zaman.`} />
          {weekTotal === 0 ? (
            <div className="flex h-[190px] flex-col items-start justify-end">
              <div className="flex w-full items-end gap-2 sm:gap-4">{bars.map((bar) => <div key={bar.key} className="flex flex-1 flex-col items-center gap-2"><div className="weekly-stub" /><span className="text-[13px] text-ink-4">{bar.day}</span></div>)}</div>
              <p className="mt-5 text-[14px] text-ink-3">Bu hafta henüz kayıtlı çalışma yok. Bir odak oturumunu bitirdiğinde süresi burada görünür.</p>
            </div>
          ) : (
            <div className="flex h-[190px] items-end gap-2 pt-6 sm:gap-4">
              {bars.map((bar) => (
                <div key={bar.key} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <div className="relative flex w-full flex-1 items-end justify-center">
                    <div className={`weekly-bar ${bar.value > 0 && bar.value === weekMax ? "is-active" : ""}`} style={{ height: `${bar.value ? Math.max(4, Math.round((bar.value / weekMax) * 100)) : 0}%` }}>{bar.value > 0 && <span>{bar.value} dk</span>}</div>
                  </div>
                  <span className={`text-[13px] ${bar.key === todayKey ? "font-semibold text-ink" : "text-ink-3"}`}>{bar.day}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="soft-card gap-0 p-6 sm:p-7">
          <SectionHeading title="Denemeler" copy={[scoreTypeText, targetText ? `${targetText} hedefi` : null].filter(Boolean).join(" · ") || (isGuest ? "Demo verisi" : "Hedefini profilinden belirleyebilirsin")} />
          {latest ? (
            <div>
              <p className="text-[14px] text-ink-3">Son deneme · {formatExamDate(latest.date)}</p>
              <p className="mt-1 flex items-baseline gap-2"><span className="stat-value">{latest.net.toFixed(2)}</span><span className="text-[15px] text-ink-3">net</span>{netChange !== null && <span className={`ml-1 text-[15px] font-semibold ${netChange >= 0 ? "text-success" : "text-danger"}`}>{netDeltaLabel(netChange)}</span>}</p>
              {demoTarget !== null && (
                <div className="mt-4">
                  <div className="mb-2 flex justify-between text-[14px]"><span className="text-ink-3">{demoTarget} net hedefine</span><span className="font-semibold text-ink">{(demoTarget - latest.net).toFixed(2)} net kaldı</span></div>
                  <ProgressBar value={(latest.net / demoTarget) * 100} />
                </div>
              )}
            </div>
          ) : (
            <div>
              <p className="text-[15px] text-ink-2">Henüz deneme sonucu yok.</p>
              <Button onClick={() => onSection("exams")} variant="outline" className="mt-3 h-10 rounded-[10px] text-[14px]"><Plus className="mr-1" size={15} /> Deneme sonucu ekle</Button>
            </div>
          )}
          <p className="mt-5 border-t border-rule pt-4 text-[14px] leading-6 text-ink-2">{buildCoachNote(latest, previous, weakTopic)}</p>
        </Card>
      </div>

      <Card className="soft-card gap-0 p-6 sm:p-7">
        <SectionHeading
          title="Derslerin"
          copy={latestTyt ? `${latestTyt.title || "Son TYT denemesi"} · ${formatExamDate(latestTyt.date)}` : "Ders bazındaki netlerin ilk TYT denemenden sonra görünür."}
          action={<button onClick={() => onSection(latestTyt ? "exams" : "topics")} className="text-[14px] font-semibold text-brand hover:text-brand-strong">{latestTyt ? "Denemeler" : "Konu haritası"}</button>}
        />
        {latestTyt && (
          <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
            {subjectOrder.map((subject) => {
              const value = latestTyt.subjects[subject] ?? 0;
              const total = tytSubjectTotals[subject];
              return (
                <div key={subject}>
                  <div className="mb-2 flex items-baseline justify-between"><span className="text-[15px] font-semibold text-ink">{subject}</span><span className="text-[14px] text-ink-3"><strong className="font-semibold text-ink">{value}</strong> / {total} net</span></div>
                  <ProgressBar value={(value / total) * 100} color={getColorForSubject(subject)} />
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function Topics({ topics, setTopics, onSection }: { topics: Topic[]; setTopics: React.Dispatch<React.SetStateAction<Topic[]>>; onSection: (section: DashboardSection) => void }) {
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("Tümü");
  const [status, setStatus] = useState<(typeof statusFilters)[number]>("Tümü");
  const filtered = useMemo(() => topics.filter((topic) => `${topic.topic} ${topic.subject} ${topic.unit}`.toLocaleLowerCase("tr").includes(search.toLocaleLowerCase("tr")) && (subject === "Tümü" || topic.subject === subject) && (status === "Tümü" || topic.status === status)), [topics, search, subject, status]);
  const cycleStatus = (id: string) => setTopics((items) => items.map((item) => item.id === id ? { ...item, status: getNextStatus(item.status) } : item));

  return <div id="topics" className="space-y-7 animate-page-in"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="eyebrow mb-2">ÖSYM kapsamı · kişisel takip</div><h1 className="page-heading">Konu haritan.</h1><p className="page-subtitle">{sectionDescriptions.topics}</p></div><Button onClick={() => onSection("exams")} className="h-10 rounded-xl bg-ink px-4 text-[13px] font-semibold text-white hover:bg-ink"><Plus className="mr-2" size={15} /> Deneme sonucu ekle</Button></div>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[{ label: "Toplam konu", value: topics.length, tone: "blue" }, { label: "Zayıf", value: topics.filter((item) => item.status === "Zayıf").length, tone: "coral" }, { label: "Orta", value: topics.filter((item) => item.status === "Orta").length, tone: "yellow" }, { label: "İyi", value: topics.filter((item) => item.status === "İyi").length, tone: "mint" }].map((item) => <div key={item.label} className={`rounded-2xl p-4 ${toneClasses[item.tone]}`}><div className="text-[12px] font-medium opacity-75">{item.label}</div><div className="mt-2 text-[29px] font-semibold font-display">{item.value}</div></div>)}</div>
    <Card className="soft-card p-4 sm:p-5"><div className="flex flex-col gap-3 lg:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Konu ara..." className="h-10 w-full rounded-xl border border-ink/[0.08] bg-paper pl-10 pr-3 text-[14px] outline-none transition placeholder:text-rule-strong focus:border-brand/45 focus:ring-4 focus:ring-brand/[0.08]" /></div><div className="flex items-center gap-2 overflow-x-auto"><ListFilter size={15} className="shrink-0 text-ink-4" />{statusFilters.map((item) => <button key={item} onClick={() => setStatus(item)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-[12px] font-semibold transition ${status === item ? "bg-ink text-white" : "bg-paper text-ink-3 hover:bg-rule"}`}>{item}</button>)}</div></div><div className="mt-3 flex gap-2 overflow-x-auto">{subjectFilters.map((item) => <button key={item} onClick={() => setSubject(item)} className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-[12px] font-medium transition ${subject === item ? "border-brand bg-brand-soft text-brand" : "border-ink/[0.08] text-ink-4 hover:border-brand/40"}`}>{item}</button>)}</div></Card>
    <Card className="soft-card overflow-hidden"><div className="hidden grid-cols-[1.5fr_0.7fr_1fr_0.7fr_0.85fr] gap-4 border-b border-ink/[0.06] bg-paper px-6 py-3 text-[12px] font-bold text-ink-4 lg:grid"><span>Konu</span><span>Ders</span><span>İlerleme</span><span>Durum</span><span>Sonraki adım</span></div><div className="divide-y divide-ink/[0.06]">{filtered.map((topic) => <button key={topic.id} onClick={() => { cycleStatus(topic.id); toast.success("Konu durumu güncellendi."); }} className="group grid w-full grid-cols-1 gap-3 px-5 py-4 text-left transition hover:bg-paper lg:grid-cols-[1.5fr_0.7fr_1fr_0.7fr_0.85fr] lg:items-center lg:gap-4 lg:px-6"><div className="flex items-center gap-3"><span className="h-8 w-1 rounded-full" style={{ backgroundColor: getColorForSubject(topic.subject) }} /><span><span className="block text-[14px] font-semibold text-ink">{topic.topic}</span><span className="mt-0.5 block text-[12px] text-ink-4">{topic.exam} · {topic.unit}</span></span></div><span className="hidden text-[13px] font-medium text-ink-3 lg:block">{topic.subject}</span><div className="flex items-center gap-3"><div className="flex-1 lg:max-w-[130px]"><ProgressBar value={topic.progress} color={getColorForSubject(topic.subject)} /></div><span className="w-8 text-right text-[12px] font-semibold text-ink-3">{formatPercent(topic.progress)}</span></div><div><StatusPill status={topic.status} insufficientData={topic.insufficientData} /></div><span className="hidden text-[12px] text-ink-3 lg:block">{statusMeta[topic.status].description} <ArrowRight className="ml-1 inline transition group-hover:translate-x-0.5" size={12} /></span></button>)}{filtered.length === 0 && <div className="px-6 py-12 text-center text-[14px] text-ink-4">Bu filtrelerle eşleşen bir konu yok.</div>}</div></Card>
    <div className="flex flex-col gap-3 rounded-2xl border border-brand/10 bg-brand-soft p-4 text-[13px] text-ink-2 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><Compass size={17} className="mt-0.5 shrink-0 text-brand" /><p><span className="font-semibold text-brand-strong">Kapsam notu:</span> {officialScopeNote}</p></div><a href="https://www.osym.gov.tr" target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 font-semibold text-brand">ÖSYM'yi aç <ExternalLink size={12} /></a></div>
  </div>;
}

// TYT dershane denemesi konu tablosu — öğrencinin dershanesinin gerçek
// "Derslere Göre Başarı Analizi" raporuyla aynı hiyerarşi: ders başlığı
// (koyu), kategori başlığı (gri zemin), konu satırları (S/D/Y/Boş girilebilir,
// B%/Net otomatik). Her seviyede toplamlar canlı hesaplanır.
function TytTopicTemplateTable({ topicDetails, updateDetail, removeRow }: { topicDetails: ExamTopicResult[]; updateDetail: (index: number, field: keyof ExamTopicResult, value: string) => void; removeRow: (index: number) => void }) {
  const grouped = useMemo(() => groupTopicDetailsBySubject(topicDetails), [topicDetails]);
  const numberInput = (value: number, onChange: (value: string) => void) => (
    <input type="number" min="0" value={value} onChange={(event) => onChange(event.target.value)} className="form-input h-7 w-14 px-1 text-right text-[12px]" />
  );
  return (
    <table className="w-full min-w-[720px] text-left">
      <thead className="sticky top-0 bg-white text-[12px] text-ink-4">
        <tr><th className="px-3 py-2">Konu</th><th className="w-16 px-2 py-2 text-right">S</th><th className="w-16 px-2 py-2 text-right">D</th><th className="w-16 px-2 py-2 text-right">Y</th><th className="w-16 px-2 py-2 text-right">Boş</th><th className="w-14 px-2 py-2 text-right">B%</th><th className="w-16 px-2 py-2 text-right">Net</th><th className="w-8 px-2 py-2" /></tr>
      </thead>
      <tbody className="divide-y divide-ink/[0.06]">
        {grouped.flatMap((subjectGroup) => [
          <tr key={`subject-${subjectGroup.subject}`} className="bg-ink">
            <td className="px-3 py-2 text-[12px] font-bold text-white">TYT {subjectGroup.subject}</td>
            <td className="px-2 py-2 text-right text-[12px] font-bold text-white">{subjectGroup.totals.questionCount}</td>
            <td className="px-2 py-2 text-right text-[12px] font-bold text-white">{subjectGroup.totals.correct}</td>
            <td className="px-2 py-2 text-right text-[12px] font-bold text-white">{subjectGroup.totals.wrong}</td>
            <td className="px-2 py-2 text-right text-[12px] font-bold text-white">{subjectGroup.totals.blank}</td>
            <td className="px-2 py-2 text-right text-[12px] font-bold text-white">%{subjectGroup.totals.accuracy}</td>
            <td className="px-2 py-2 text-right text-[12px] font-bold text-white">{subjectGroup.totals.net.toFixed(2)}</td>
            <td />
          </tr>,
          ...subjectGroup.categories.flatMap((categoryGroup) => [
            <tr key={`category-${subjectGroup.subject}-${categoryGroup.category}`} className="bg-brand-soft">
              <td className="px-3 py-1.5 text-[12px] font-semibold text-ink-2">{categoryGroup.category}</td>
              <td className="px-2 py-1.5 text-right text-[12px] font-semibold text-ink-2">{categoryGroup.totals.questionCount}</td>
              <td className="px-2 py-1.5 text-right text-[12px] font-semibold text-ink-2">{categoryGroup.totals.correct}</td>
              <td className="px-2 py-1.5 text-right text-[12px] font-semibold text-ink-2">{categoryGroup.totals.wrong}</td>
              <td className="px-2 py-1.5 text-right text-[12px] font-semibold text-ink-2">{categoryGroup.totals.blank}</td>
              <td className="px-2 py-1.5 text-right text-[12px] font-semibold text-ink-2">%{categoryGroup.totals.accuracy}</td>
              <td className="px-2 py-1.5 text-right text-[12px] font-semibold text-ink-2">{categoryGroup.totals.net.toFixed(2)}</td>
              <td />
            </tr>,
            ...categoryGroup.rows.map(({ row, index }) => (
              <tr key={`row-${index}`}>
                <td className="px-3 py-1.5 pl-5 text-[12px] text-ink-2">{row.topic}</td>
                <td className="px-2 py-1.5">{numberInput(row.questionCount, (value) => updateDetail(index, "questionCount", value))}</td>
                <td className="px-2 py-1.5">{numberInput(row.correct, (value) => updateDetail(index, "correct", value))}</td>
                <td className="px-2 py-1.5">{numberInput(row.wrong, (value) => updateDetail(index, "wrong", value))}</td>
                <td className="px-2 py-1.5">{numberInput(row.blank, (value) => updateDetail(index, "blank", value))}</td>
                <td className="px-2 py-1.5 text-right text-[12px] font-semibold text-ink-3">%{row.accuracy}</td>
                <td className="px-2 py-1.5 text-right text-[12px] font-bold text-brand">{row.net.toFixed(2)}</td>
                <td className="px-1 py-1.5"><button onClick={() => removeRow(index)} aria-label="Konu satırını sil" className="rounded-lg p-1 text-rule-strong hover:bg-danger-soft hover:text-danger"><X size={12} /></button></td>
              </tr>
            )),
          ]),
        ])}
      </tbody>
    </table>
  );
}
function Exams({ topics, exams, setExams, setTopics, persistExams }: { topics: Topic[]; exams: MockExam[]; setExams: React.Dispatch<React.SetStateAction<MockExam[]>>; setTopics: React.Dispatch<React.SetStateAction<Topic[]>>; persistExams?: (input: { exams: Array<ReturnType<typeof examToPersistenceInput>> }) => void }) {
  const { user } = useAuth();
  const logTopicResult = trpc.topics.logResult.useMutation();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ExamForm>(() => createBlankExamForm(topics));
  // Sınav türü değişince konu satırları o türün (TYT/AYT) gerçek konularıyla
  // yeniden kurulur — henüz hiçbir satıra veri girilmediyse (sıfırdan
  // başlıyorsa) veri kaybı olmaz.
  const changeExamType = (nextExam: "TYT" | "AYT") => {
    setForm((current) => {
      const hasData = current.topicDetails.some((detail) => detail.questionCount > 0);
      if (hasData) return { ...current, exam: nextExam };
      const topicDetails = buildTopicDetailsForExam(nextExam, topics);
      return { ...current, exam: nextExam, topicDetails, topicNets: Object.fromEntries(topicDetails.map(({ topic }) => [topic, ""])) };
    });
  };
  // Konu Tarama Testi — tek bir konu için hızlı doğru/yanlış/boş girişi;
  // tam bir TYT/AYT denemesi değil, bu yüzden ayrı ve hafif bir akış.
  const [openTopicScan, setOpenTopicScan] = useState(false);
  const [scanForm, setScanForm] = useState<{ subject: string; topic: string; correct: string; wrong: string; blank: string; minutes: string }>({ subject: subjectOrder[0] ?? "Matematik", topic: "", correct: "", wrong: "", blank: "", minutes: "20" });
  const scanTopicOptions = topics.filter((item) => item.subject === scanForm.subject).map((item) => item.topic);
  const addFocusLog = trpc.calendar.addFocusLog.useMutation({ onSuccess: () => toast.success("Konu tarama testi kaydedildi; konu gelişimin güncellendi."), onError: () => toast.error("Kaydedilemedi, tekrar dener misin?") });
  const addTopicScan = () => {
    const topic = scanForm.topic || scanTopicOptions[0];
    if (!topic) { toast.error("Önce bir konu seç."); return; }
    const correct = Number(scanForm.correct) || 0;
    const wrong = Number(scanForm.wrong) || 0;
    const blank = Number(scanForm.blank) || 0;
    const questionCount = correct + wrong + blank;
    if (questionCount === 0) { toast.error("Doğru, yanlış veya boş sayısından en az birini gir."); return; }
    const minutes = Math.max(1, Number(scanForm.minutes) || 20);
    const studyDate = new Date().toISOString();
    const accuracy = (correct / questionCount) * 100;
    const { status, insufficientData } = deriveTopicStatus(accuracy, questionCount);
    const examType = topics.find((item) => item.subject === scanForm.subject && item.topic === topic)?.exam ?? "TYT";
    setTopics((items) => items.map((item) => item.subject === scanForm.subject && item.topic === topic ? { ...item, progress: accuracy, status, insufficientData } : item));
    if (user) {
      addFocusLog.mutate({ subject: scanForm.subject, topic, studyDate, minutes, questions: questionCount, correct, wrong, blank, note: "Konu tarama testi" });
      logTopicResult.mutate({ exam: examType, subject: scanForm.subject, topic, accuracy, questionCount, studyDate });
    } else toast.success("Konu tarama testi kaydedildi (demo modu); giriş yaptığında hesabına da aktarılır.");
    setScanForm({ subject: scanForm.subject, topic: "", correct: "", wrong: "", blank: "", minutes: "20" });
    setOpenTopicScan(false);
  };
  const [topicFilter, setTopicFilter] = useState("Tümü");
  const [chartSubject, setChartSubject] = useState("Tümü");
  const [dateRange, setDateRange] = useState<"all" | "30" | "90" | "custom">("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const bulkFileRef = useRef<HTMLInputElement>(null);
  const extractDocument = trpc.examDocument.extract.useMutation({
    onSuccess: (value) => {
      const data = value as ExamDocumentExtraction;
      setForm((current) => ({ ...current, title: data.title || current.title, date: data.date || current.date, exam: data.exam || current.exam, turkce: String(data.subjects.Türkçe ?? current.turkce), matematik: String(data.subjects.Matematik ?? current.matematik), fen: String(data.subjects.Fen ?? current.fen), sosyal: String(data.subjects.Sosyal ?? current.sosyal), turkceTime: String(data.timeSpent.Türkçe ?? 0), matematikTime: String(data.timeSpent.Matematik ?? 0), fenTime: String(data.timeSpent.Fen ?? 0), sosyalTime: String(data.timeSpent.Sosyal ?? 0), topicDetails: data.topics, topicNets: Object.fromEntries(data.topics.map((item) => [item.topic, String(item.net)])), notes: data.notes, importedFrom: fileRef.current?.files?.[0]?.type === "application/pdf" ? "pdf" : "ocr" }));
      toast.success(`${data.topics.length} konu satırı belgeden aktarıldı.`);
    },
    onError: (error) => toast.error(error.message || "Belge okunamadı."),
  });
  const totalNet = (item: MockExam) => Object.values(item.subjects).reduce((sum, value) => sum + value, 0);
  const filteredExams = useMemo(() => {
    const now = Date.now();
    return exams.filter((exam) => {
      const timestamp = new Date(exam.date).getTime();
      if (dateRange === "30") return timestamp >= now - 30 * 24 * 60 * 60 * 1000;
      if (dateRange === "90") return timestamp >= now - 90 * 24 * 60 * 60 * 1000;
      if (dateRange === "custom") return (!customStart || exam.date >= customStart) && (!customEnd || exam.date <= customEnd);
      return true;
    });
  }, [exams, dateRange, customStart, customEnd]);
  const chartExams = [...filteredExams].slice(0, 8).reverse();
  const chartValues = chartExams.map((exam) => chartSubject === "Tümü" ? exam.net : (exam.subjects[chartSubject] ?? 0));
  const { user: examsUser } = useAuth();
  const demoTarget = examsUser ? null : targetNet;
  const maxChartNet = Math.max(chartSubject === "Tümü" ? (demoTarget ?? 0) : 40, ...chartValues, 1);
  const latestExam = filteredExams[0];
  const firstChartExam = chartExams[0];
  const timeRows = subjectOrder.map((subject) => ({ subject, minutes: latestExam?.timeSpent?.[subject] ?? 0, color: getColorForSubject(subject) }));
  const totalTime = timeRows.reduce((sum, item) => sum + item.minutes, 0);
  const filteredTopics = trackedTopics.filter((item) => topicFilter === "Tümü" || item.subject === topicFilter);
  const topicTrends = filteredTopics.map((topic) => {
    const values = chartExams.map((exam) => exam.topicNets?.[topic.topic] ?? 0);
    const delta = Number(((latestExam?.topicNets?.[topic.topic] ?? 0) - (firstChartExam?.topicNets?.[topic.topic] ?? 0)).toFixed(2));
    return { ...topic, values, delta };
  });
  const updateDetail = (index: number, field: keyof ExamTopicResult, value: string) => {
    setForm((current) => {
      const next = [...current.topicDetails];
      const numeric = ["questionCount", "correct", "wrong", "blank", "accuracy", "net"].includes(field);
      next[index] = { ...next[index], [field]: numeric ? Number(value) || 0 : value };
      if (["questionCount", "correct", "wrong", "blank"].includes(field)) {
        next[index] = calculateTopicResult(next[index]);
      }
      return { ...current, topicDetails: next, topicNets: Object.fromEntries(next.map((item) => [item.topic, String(item.net)])) };
    });
  };
  const removeTopicRow = (index: number) => setForm((current) => ({ ...current, topicDetails: current.topicDetails.filter((_, itemIndex) => itemIndex !== index) }));
  const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); });
  const handleDocument = async (file?: File) => {
    if (!file) return;
    if (!(["application/pdf", "image/png", "image/jpeg", "image/webp"] as string[]).includes(file.type)) { toast.error("PDF, PNG, JPG veya WEBP yükleyebilirsin."); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error("Belge boyutu 8 MB'dan küçük olmalı."); return; }
    try { extractDocument.mutate({ dataUrl: await readFileAsDataUrl(file), mimeType: file.type as "application/pdf" | "image/png" | "image/jpeg" | "image/webp", fileName: file.name }); } catch { toast.error("Dosya okunamadı."); }
  };
  const addExam = () => {
    if (!form.title || !form.date) { toast.error("Deneme adı ve tarih gerekli."); return; }
    const subjects = { Türkçe: Number(form.turkce) || 0, Matematik: Number(form.matematik) || 0, Fen: Number(form.fen) || 0, Sosyal: Number(form.sosyal) || 0 };
    const net = Number(Object.values(subjects).reduce((sum, value) => sum + value, 0).toFixed(2));
    const previous = exams[0]?.net || net;
    const newExam: MockExam = { id: `mock-${Date.now()}`, title: form.title, date: form.date, exam: form.exam, net, delta: Number((net - previous).toFixed(2)), tag: net >= previous ? "Yükseliş" : "Tekrar bak", subjects, timeSpent: { Türkçe: Number(form.turkceTime) || 0, Matematik: Number(form.matematikTime) || 0, Fen: Number(form.fenTime) || 0, Sosyal: Number(form.sosyalTime) || 0 }, topicNets: Object.fromEntries(form.topicDetails.map(({ topic, net: topicNet }) => [topic, topicNet])), topicDetails: form.topicDetails, importedFrom: form.importedFrom };
    setExams((items) => [newExam, ...items]);
    persistExams?.({ exams: [examToPersistenceInput(newExam)] });
    const meaningfulDetails = form.topicDetails.filter((detail) => detail.topic.trim() && detail.questionCount > 0);
    setTopics((items) => items.map((item) => {
      const detail = meaningfulDetails.find((row) => row.topic.trim().toLocaleLowerCase("tr") === item.topic.trim().toLocaleLowerCase("tr"));
      if (!detail) return item;
      const { status, insufficientData } = deriveTopicStatus(detail.accuracy, detail.questionCount);
      return { ...item, progress: detail.accuracy, status, insufficientData };
    }));
    if (user) meaningfulDetails.forEach((detail) => logTopicResult.mutate({ exam: form.exam, subject: detail.subject || "Genel", topic: detail.topic, accuracy: detail.accuracy, questionCount: detail.questionCount, studyDate: form.date }));
    setOpen(false); setForm(createBlankExamForm(topics)); toast.success("Deneme eklendi. Zayıf konu analizin güncellendi.");
  };
  return <div id="exams" className="space-y-7 animate-page-in">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="eyebrow mb-2">Deneme günlüğü · iki tür sonuç girişi</div><h1 className="page-heading">Eksiklerini görünür kıl.</h1><p className="page-subtitle">Tek konuluk tarama testini hızlıca kaydet ya da TYT/AYT dershane denemeni konu konu ayrıntılandır.</p></div><div className="flex flex-wrap gap-2"><Button onClick={() => setOpenTopicScan(true)} variant="outline" className="h-10 rounded-xl border-brand/20 bg-white px-4 text-[13px] font-semibold text-brand hover:bg-brand-soft"><Plus className="mr-2" size={15} /> Konu tarama testi ekle</Button><Button onClick={() => setOpen(true)} className="h-10 rounded-xl bg-pencil px-4 text-[13px] font-semibold text-ink hover:bg-pencil-strong"><Plus className="mr-2" size={15} /> TYT/AYT dershane denemesi ekle</Button></div></div>
    <div className="rounded-2xl border border-brand/10 bg-brand-soft p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><FileText size={18} className="mt-0.5 shrink-0 text-brand" /><div><div className="text-[13px] font-semibold text-brand-strong">Dershane sonuç belgesini aktar</div><p className="mt-1 text-[12px] leading-5 text-ink-3">PDF veya ekran görüntüsünü yükle; konu adı, soru sayısı, doğru, yanlış ve yüzde sütunlarını otomatik forma taşıyalım.</p></div></div><Button onClick={() => { setOpen(true); window.setTimeout(() => fileRef.current?.click(), 120); }} variant="outline" className="h-9 shrink-0 rounded-xl border-brand/20 bg-white text-[12px] font-semibold text-brand"><Upload className="mr-2" size={14} /> PDF / görsel yükle</Button></div></div>
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.25fr_0.75fr]"><Card className="soft-card p-6 sm:p-7"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><SectionHeading eyebrow="Toplam net trendi" title="Yönünü gör." copy="Ders ve tarih filtresiyle gelişimini karşılaştır." /><div className="flex flex-wrap items-center gap-2"><select value={chartSubject} onChange={(event) => setChartSubject(event.target.value)} className="form-input h-8 w-auto min-w-[112px] py-1 text-[12px]"><option value="Tümü">Toplam net</option>{subjectOrder.map((subject) => <option key={subject} value={subject}>{subject}</option>)}</select><select value={dateRange} onChange={(event) => setDateRange(event.target.value as "all" | "30" | "90" | "custom")} className="form-input h-8 w-auto min-w-[112px] py-1 text-[12px]"><option value="all">Tüm tarihler</option><option value="30">Son 30 gün</option><option value="90">Son 90 gün</option><option value="custom">Özel aralık</option></select></div></div>{dateRange === "custom" && <div className="mb-3 flex flex-wrap gap-2"><input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} className="form-input h-8 text-[12px]" /><input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} className="form-input h-8 text-[12px]" /></div>}<div className="relative h-[220px] border-b border-l border-ink/[0.08] pl-3"><div className="absolute inset-x-0 top-0 border-t border-dashed border-ink/[0.06]" /><div className="absolute inset-x-0 top-1/2 border-t border-dashed border-ink/[0.06]" /><div className="absolute inset-x-0 bottom-0 border-t border-dashed border-ink/[0.06]" /><div className="flex h-full items-end gap-3 px-3 pb-0 pt-4 sm:gap-8">{chartExams.map((exam, index) => <div key={exam.id} className="flex h-full flex-1 flex-col items-center justify-end gap-3"><div className="flex w-full max-w-[76px] flex-1 items-end"><div className="relative w-full rounded-t-xl bg-brand" style={{ height: `${Math.max(18, (chartValues[index] / maxChartNet) * 100)}%` }}><span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[12px] font-bold text-brand">{chartValues[index].toFixed(2)}</span></div></div><span className="text-center text-[12px] font-medium text-ink-4">{formatExamDate(exam.date)}</span></div>)}</div></div>{demoTarget !== null && <div className="mt-5 flex items-center justify-between rounded-xl bg-paper px-4 py-3 text-[13px]"><span className="text-ink-3">Hedefe kalan</span><span className="font-semibold text-pencil-ink">{(demoTarget - (latestExam?.net || 0)).toFixed(2)} net</span></div>}</Card><Card className="soft-card p-6 sm:p-7"><SectionHeading eyebrow="Sonuç özeti" title="Ders bazında" copy="Son denemendeki netlerin." /><div className="space-y-5">{subjectBreakdown.map((subject) => <div key={subject.label}><div className="mb-2 flex items-center justify-between text-[13px]"><span className="font-semibold text-ink">{subject.label}</span><span className="font-semibold" style={{ color: subject.color }}>{latestExam?.subjects[subject.label] ?? 0} / {subject.total}</span></div><ProgressBar value={((latestExam?.subjects[subject.label] ?? 0) / subject.total) * 100} color={subject.color} /></div>)}</div><div className="mt-7 rounded-2xl border border-success/15 bg-success-soft p-4"><div className="flex items-start gap-3"><TrendingUp size={16} className="mt-0.5 text-success" /><p className="text-[13px] leading-5 text-ink-2">{chartExams.length > 1 ? `Seçili ${chartExams.length} denemede` : "Bu denemede"} toplam <strong>{(latestExam?.net || 0) - (firstChartExam?.net || 0) > 0 ? "+" : ""}{((latestExam?.net || 0) - (firstChartExam?.net || 0)).toFixed(2)} net</strong> değişim var.</p></div></div></Card></div>
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[0.95fr_1.05fr]"><Card className="soft-card p-6 sm:p-7"><SectionHeading eyebrow="Zaman analizi" title="Süreyi nereye harcadın?" copy={latestExam ? `${latestExam.title} · toplam ${totalTime} dakika` : "Deneme süresi girişi bekleniyor."} /><div className="space-y-4">{timeRows.map((item) => <div key={item.subject}><div className="mb-1.5 flex items-center justify-between text-[13px]"><span className="font-semibold text-ink">{item.subject}</span><span className="text-[12px] text-ink-3">{item.minutes} dk · {formatPercent(totalTime ? (item.minutes / totalTime) * 100 : 0)}</span></div><div className="h-3 overflow-hidden rounded-full bg-rule"><div className="h-full rounded-full" style={{ width: `${totalTime ? (item.minutes / totalTime) * 100 : 0}%`, backgroundColor: item.color }} /></div></div>)}</div><div className="mt-6 rounded-2xl bg-paper p-4 text-[13px] text-ink-3">En uzun süre: <strong className="text-ink">{[...timeRows].sort((a, b) => b.minutes - a.minutes)[0]?.subject || "—"}</strong></div></Card><Card className="soft-card p-6 sm:p-7"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><SectionHeading eyebrow="Konu bazlı trend" title="Hangi başlık yükseliyor?" copy="İlk ve son deneme arasındaki net farkı izle." /><div className="flex items-center gap-1.5 overflow-x-auto">{["Tümü", "Türkçe", "Matematik", "Fen", "Sosyal"].map((item) => <button key={item} onClick={() => setTopicFilter(item)} className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[12px] font-semibold ${topicFilter === item ? "bg-ink text-white" : "bg-paper text-ink-3"}`}>{item}</button>)}</div></div><div className="space-y-3">{topicTrends.map((topic) => { const max = Math.max(topic.max, ...topic.values); const points = topic.values.map((value, index) => `${(index / Math.max(topic.values.length - 1, 1)) * 100},${30 - (value / max) * 24 - 3}`).join(" "); return <div key={topic.topic} className="rounded-2xl border border-ink/[0.06] p-3"><div className="flex items-center justify-between"><span className="text-[13px] font-semibold text-ink-2">{topic.topic}</span><span className={topic.delta >= 0 ? "text-[12px] font-bold text-success" : "text-[12px] font-bold text-danger"}>{topic.delta > 0 ? "+" : ""}{topic.delta.toFixed(2)}</span></div><div className="mt-2 flex items-center gap-3"><svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-8 flex-1"><polyline points={points} fill="none" stroke={topic.color} strokeWidth="2.5" strokeLinecap="round" /></svg><span className="w-20 text-right text-[12px] text-ink-4">{topic.values[0]} → {topic.values.at(-1)}</span></div></div>; })}</div></Card></div>
    <Card className="soft-card overflow-hidden"><div className="border-b border-ink/[0.06] px-6 py-5"><div className="flex items-center justify-between"><div><h2 className="text-[16px] font-semibold text-ink">Deneme geçmişi</h2><p className="mt-1 text-[12px] text-ink-4">Belgeden aktarılmış konu ayrıntıları da burada saklanır.</p></div><span className="rounded-full bg-brand-soft px-2.5 py-1.5 text-[12px] font-bold text-brand">{filteredExams.length} / {exams.length} kayıt</span></div></div><div className="divide-y divide-ink/[0.06]">{filteredExams.map((exam) => <div key={exam.id} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand"><BarChart3 size={16} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><div className="text-[14px] font-semibold text-ink">{exam.title}</div>{exam.importedFrom && exam.importedFrom !== "manual" && <span className="rounded-full bg-warn-soft px-2 py-0.5 text-[11px] font-bold text-warn">{exam.importedFrom === "pdf" ? "PDF" : exam.importedFrom === "csv" ? "CSV" : exam.importedFrom === "xlsx" ? "Excel" : "OCR"} aktarımı</span>}</div><div className="mt-1 text-[12px] text-ink-4">{formatExamDate(exam.date)} · {exam.topicDetails?.length || 0} konu satırı · {Object.values(exam.timeSpent || {}).reduce((sum, value) => sum + value, 0)} dk</div></div><div className="text-right"><div className="text-[22px] font-semibold text-ink font-display">{totalNet(exam).toFixed(2)}</div><div className="text-[12px] text-ink-4">net · {exam.delta > 0 ? "+" : ""}{exam.delta.toFixed(2)}</div></div></div>)}</div></Card>
    {open && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}><div className="modal-card max-w-[1180px]!"><div className="flex items-start justify-between gap-4"><div><div className="eyebrow mb-2">Yeni kayıt · TYT/AYT dershane denemesi</div><h2 className="text-[25px] font-semibold text-ink font-display">Eksiklerini doğru tespit edelim.</h2><p className="mt-1 text-[13px] text-ink-3">Konu satırları sınav türüne göre (TYT/AYT) Konu Haritan'dan otomatik geldi; her satıra soru sayısı, doğru, yanlış ve boş değerlerini gir. PDF/görsel yüklediğinde tablo otomatik dolar.</p></div><button onClick={() => setOpen(false)} className="rounded-lg p-2 text-ink-4 hover:bg-paper"><X size={17} /></button></div><input ref={fileRef} type="file" accept="application/pdf,image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => handleDocument(event.target.files?.[0])} />{extractDocument.isPending && <div className="mt-5 rounded-xl border border-brand/15 bg-brand-soft px-4 py-3 text-[13px] text-brand">Belge okunuyor; konu satırları ayrıştırılıyor...</div>}<div className="mt-5 grid gap-4 sm:grid-cols-[1fr_130px_110px]"><label className="block"><span className="form-label">Deneme adı</span><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Örn. Dershane TYT · 04" className="form-input" /></label><label className="block"><span className="form-label">Tarih</span><input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className="form-input" /></label><label className="block"><span className="form-label">Sınav</span><select value={form.exam} onChange={(event) => changeExamType(event.target.value as "TYT" | "AYT")} className="form-input"><option value="TYT">TYT</option><option value="AYT">AYT</option></select></label></div><div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]"><Card className="border-ink/[0.06] bg-paper p-4"><div className="form-label">Ders netleri</div><div className="mt-2 grid grid-cols-2 gap-3">{Object.entries(fieldLabels).map(([key, label]) => <label key={key} className="block"><span className="mb-1 block text-[12px] text-ink-4">{label}</span><input type="number" min="0" step="0.25" value={form[key as keyof ExamForm] as string} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className="form-input" /></label>)}</div></Card><Card className="border-ink/[0.06] bg-paper p-4"><div className="flex items-center justify-between"><span className="form-label mb-0">Ders süreleri</span><span className="text-[12px] text-ink-4">dakika</span></div><div className="mt-2 grid grid-cols-2 gap-3">{Object.entries(timeFieldLabels).map(([key, label]) => <label key={key} className="block"><span className="mb-1 block text-[12px] text-ink-4">{label}</span><input type="number" min="0" max="240" value={form[key as keyof ExamForm] as string} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className="form-input" /></label>)}</div></Card></div><div className="mt-5 overflow-hidden rounded-2xl border border-ink/[0.08]"><div className="flex flex-col gap-2 border-b border-ink/[0.08] bg-paper px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="text-[14px] font-semibold text-ink-2">Konu konu sonuç tablosu</div><div className="text-[12px] text-ink-4">{form.exam === "TYT" ? "Satırlar ve soru sayıları (S) dershane analiz raporundaki gerçek TYT dağılımından geldi; sen sadece doğru/yanlış/boş gir." : `Satırlar ${form.exam} konu haritandan geldi; denemede olmayan bir konuyu "Sil" ile çıkarabilirsin.`}</div></div><button onClick={() => setForm((current) => ({ ...current, topicDetails: [...current.topicDetails, { subject: "", topic: "", questionCount: 0, correct: 0, wrong: 0, blank: 0, accuracy: 0, net: 0 }] }))} className="inline-flex items-center gap-1 text-[12px] font-bold text-brand"><Plus size={13} /> Konu satırı ekle</button></div>{form.exam === "TYT" && <div className="border-b border-ink/[0.06] bg-warn-soft px-4 py-2 text-[12px] leading-4 text-warn">{TYT_TEMPLATE_MISSING_NOTE}</div>}<div className="max-h-[360px] overflow-auto">{form.exam === "TYT" ? <TytTopicTemplateTable topicDetails={form.topicDetails} updateDetail={updateDetail} removeRow={removeTopicRow} /> : <table className="w-full min-w-[820px] text-left"><thead className="sticky top-0 bg-white text-[12px] text-ink-4"><tr><th className="px-3 py-2">Ders</th><th className="px-3 py-2">Konu adı</th><th className="px-3 py-2">Sayı</th><th className="px-3 py-2">Doğ</th><th className="px-3 py-2">Yan</th><th className="px-3 py-2">Boş</th><th className="px-3 py-2">%</th><th className="px-3 py-2">Net</th><th className="px-3 py-2" /></tr></thead><tbody className="divide-y divide-ink/[0.06]">{form.topicDetails.map((row, index) => <tr key={`${row.topic}-${index}`}><td className="px-3 py-2"><input value={row.subject} onChange={(event) => updateDetail(index, "subject", event.target.value)} placeholder="Matematik" className="form-input w-28" /></td><td className="px-3 py-2"><input value={row.topic} onChange={(event) => updateDetail(index, "topic", event.target.value)} placeholder="Problemler" className="form-input w-48" /></td>{(["questionCount", "correct", "wrong", "blank"] as const).map((field) => <td key={field} className="px-3 py-2"><input type="number" min="0" value={row[field]} onChange={(event) => updateDetail(index, field, event.target.value)} className="form-input w-16" /></td>)}<td className="px-3 py-2 text-[12px] font-semibold text-ink-3">{row.accuracy}</td><td className="px-3 py-2 text-[12px] font-bold text-brand">{row.net.toFixed(2)}</td><td className="px-3 py-2"><button onClick={() => removeTopicRow(index)} aria-label="Konu satırını sil" className="rounded-lg p-1.5 text-rule-strong hover:bg-danger-soft hover:text-danger"><X size={14} /></button></td></tr>)}</tbody></table>}</div></div><label className="mt-4 block"><span className="form-label">Koç notu / belge notu</span><textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={2} placeholder="Örn. Süre yetmedi, son 10 soruda zorlandım..." className="form-input min-h-16 resize-none" /></label><div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button onClick={() => setOpen(false)} className="h-10 rounded-xl border border-ink/10 px-4 text-[13px] font-semibold text-ink-3">Vazgeç</button><Button onClick={() => fileRef.current?.click()} variant="outline" className="h-10 rounded-xl border-brand/20 text-[13px] font-semibold text-brand"><Upload className="mr-2" size={14} /> Belgeden doldur</Button><Button onClick={addExam} className="h-10 rounded-xl bg-brand px-5 text-[13px] font-semibold text-white hover:bg-brand">Kaydet ve çalışma planına aktar</Button></div></div></div>}
    {openTopicScan && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setOpenTopicScan(false)}><div className="modal-card max-w-[440px]"><div className="flex items-start justify-between gap-4"><div><div className="eyebrow mb-2">Yeni kayıt · konu tarama testi</div><h2 className="text-[23px] font-semibold text-ink font-display">Tek konuyu hızlıca kaydet.</h2><p className="mt-1 text-[13px] text-ink-3">Ders ve konu seç, doğru/yanlış/boş sayısını gir; konu haritan anında güncellensin.</p></div><button onClick={() => setOpenTopicScan(false)} className="rounded-lg p-2 text-ink-4 hover:bg-paper"><X size={17} /></button></div><div className="mt-5 grid gap-3"><label className="block"><span className="form-label">Ders</span><select value={scanForm.subject} onChange={(event) => setScanForm({ ...scanForm, subject: event.target.value, topic: "" })} className="form-input">{subjectOrder.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label className="block"><span className="form-label">Konu</span><select value={scanForm.topic} onChange={(event) => setScanForm({ ...scanForm, topic: event.target.value })} className="form-input"><option value="">{scanTopicOptions[0] ? `${scanTopicOptions[0]} (varsayılan)` : "Bu derste kayıtlı konu yok"}</option>{scanTopicOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><div className="grid grid-cols-3 gap-3"><label className="block"><span className="mb-1 block text-[12px] text-ink-4">Doğru</span><input type="number" min="0" value={scanForm.correct} onChange={(event) => setScanForm({ ...scanForm, correct: event.target.value })} className="form-input" /></label><label className="block"><span className="mb-1 block text-[12px] text-ink-4">Yanlış</span><input type="number" min="0" value={scanForm.wrong} onChange={(event) => setScanForm({ ...scanForm, wrong: event.target.value })} className="form-input" /></label><label className="block"><span className="mb-1 block text-[12px] text-ink-4">Boş</span><input type="number" min="0" value={scanForm.blank} onChange={(event) => setScanForm({ ...scanForm, blank: event.target.value })} className="form-input" /></label></div><label className="block"><span className="mb-1 block text-[12px] text-ink-4">Süre (dk, opsiyonel)</span><input type="number" min="1" value={scanForm.minutes} onChange={(event) => setScanForm({ ...scanForm, minutes: event.target.value })} className="form-input" /></label></div><div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button onClick={() => setOpenTopicScan(false)} className="h-10 rounded-xl border border-ink/10 px-4 text-[13px] font-semibold text-ink-3">Vazgeç</button><Button onClick={addTopicScan} disabled={addFocusLog.isPending} className="h-10 rounded-xl bg-brand px-5 text-[13px] font-semibold text-white hover:bg-brand">{addFocusLog.isPending ? "Kaydediliyor..." : "Kaydet"}</Button></div></div></div>}
  </div>;
}
type CatalogLibraryEntry = { bookId: number; name: string; publisher: string | null; subject: string | null; examScope: string; difficultyLabel: string };
// Kaynak Kataloğu'ndan (DB'den, kitapisler.com senkronizasyonuyla sürekli
// güncellenen) "Kütüphaneme ekle" ile eklenen kitapları, eski statik
// ResourceBook şekline çevirir — hem Kaynaklar sayfasındaki kişisel raf hem
// de AI Planım aynı kitap listesini görsün diye.
function catalogLibraryBookToResourceBook(book: CatalogLibraryEntry): ResourceBook {
  return {
    id: String(book.bookId),
    title: book.name,
    publisher: book.publisher ?? "Yayıncı belirtilmemiş",
    subject: book.subject ?? "Genel",
    exam: book.examScope === "AYT" ? "AYT" : "TYT",
    level: book.difficultyLabel === "easy" ? "Kolay" : book.difficultyLabel === "hard" ? "Zor" : "Orta",
    format: "Kaynak Kataloğu",
    reason: "Kütüphanene Kaynak Kataloğu'ndan eklendi.",
    sourceUrl: "",
    pageCount: undefined,
    tone: "blue",
  };
}
function Resources({ topics, exams, onSection }: { topics: Topic[]; exams: MockExam[]; onSection: (section: DashboardSection) => void }) {
  const { user } = useAuth();
  const [inventory, setInventory] = useState<string[]>(() => getStoredValue<string[]>(localStorageKeys.bookInventory, []));
  const [logs, setLogs] = useState<BookStudyLog[]>(() => getStoredValue<BookStudyLog[]>(localStorageKeys.bookLogs, []));
  const [switches, setSwitches] = useState<SourceSwitch[]>(() => getStoredValue<SourceSwitch[]>(localStorageKeys.sourceSwitches, []));
  const [mappings, setMappings] = useState<BookTopicMapping[]>([]);
  const [importedBooks, setImportedBooks] = useState<ResourceBook[]>(() => getStoredValue<ResourceBook[]>(localStorageKeys.customBooks, []));
  const bulkFileRef = useRef<HTMLInputElement>(null);
  const [logBookId, setLogBookId] = useState("");
  const [logForm, setLogForm] = useState({ topic: "", minutes: "45", questions: "20", correct: "12", wrong: "5", blank: "3", pageStart: "", pageEnd: "", testStart: "", testEnd: "" });
  const resourcesSnapshot = trpc.resources.snapshot.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const catalogLibrary = trpc.catalog.myLibrary.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const addBookMutation = trpc.resources.addBook.useMutation();
  const removeBookMutation = trpc.resources.removeBook.useMutation();
  const bookUtils = trpc.useUtils();
  // Çözüm kaydı sayfa içeriyorsa kitabın tamamlanma oranı ve önerileri değişir.
  const addLogMutation = trpc.resources.addLog.useMutation({ onSuccess: () => { void bookUtils.bookContent.summaries.invalidate(); void bookUtils.bookContent.recommendations.invalidate(); } });
  const addSwitchMutation = trpc.resources.addSwitch.useMutation();
  const mappingMutation = trpc.resources.upsertMapping.useMutation();
  const importBooksMutation = trpc.resources.importBooks.useMutation({ onSuccess: () => toast.success("Kitap kataloğu hesabına aktarıldı.") });
  const migratedLocalData = useRef(false);
  // "Kitap ekle" sihirbazı: 1) kapak → bilgiler 2) içindekiler → konular
  // (bkz. components/books/AddBookWizard.tsx). OCR yalnızca öneri üretir;
  // öğrenci onaylamadan hiçbir şey kütüphaneye yazılmaz.
  const [showAddBook, setShowAddBook] = useState(false);
  // Kitap detayı (içindekiler + zayıf konu eşleşmeleri) — bkz. components/books/BookLibrary.tsx.
  const [openBook, setOpenBook] = useState<ScannerBook | null>(null);
  const savePhotoBookMutation = trpc.resources.importBooks.useMutation();
  const asScannerBook = (book: Pick<ResourceBook, "id" | "title" | "publisher" | "subject" | "exam">): ScannerBook => ({ id: book.id, title: book.title, publisher: book.publisher, subject: book.subject, exam: book.exam });
  // Aynı kitap (OCR'ın farklı yazımlarıyla bile) ikinci kez eklenmesin: ISBN varsa ona, yoksa
  // yayınevi + ad (+ yazar) ile bakılır; büyük/küçük harf ve Türkçe karakter farkı yok sayılır.
  const findDuplicateBook = (draft: CoverDraft) => {
    const duplicate = myBooks.find((existing) => isSameBook(existing, { title: draft.title, publisher: draft.publisher.trim() || "Yayınevi belirtilmemiş", authors: draft.authors, isbn: draft.isbn }));
    return duplicate ? asScannerBook(duplicate) : null;
  };
  // Kitap sunucuya ve rafa KAYDEDİLDİKTEN sonra döner: içindekiler adımı kitabın
  // rafta olmasını (sunucudaki sahiplik kontrolü) şart koşar.
  const createBookFromCover = async (draft: CoverDraft): Promise<ScannerBook> => {
    if (!user) throw new Error("Kitap eklemek için giriş yapmalısın.");
    const id = `photo-book-${Date.now()}`;
    const book: ResourceBook = { id, title: draft.title, publisher: draft.publisher || "Yayınevi belirtilmemiş", subject: draft.subject || "Genel", exam: draft.exam, level: draft.level, format: "Kaynak", reason: `Öğrencinin kendi kütüphanesinden, fotoğrafla eklendi.${draft.edition.trim() ? ` Baskı: ${draft.edition.trim()}.` : ""}`, sourceUrl: "", tone: "blue", authors: draft.authors.trim() || undefined, isbn: draft.isbn.trim() || undefined };
    await savePhotoBookMutation.mutateAsync({ books: [{ id: book.id, title: book.title, publisher: book.publisher, subject: book.subject, exam: book.exam, level: book.level, format: book.format, reason: book.reason, tone: book.tone, authors: book.authors, isbn: book.isbn }] });
    await addBookMutation.mutateAsync({ bookId: id });
    setImportedBooks((items) => [book, ...items]);
    setInventory((items) => (items.includes(id) ? items : [...items, id]));
    void bookUtils.bookContent.summaries.invalidate();
    return asScannerBook(book);
  };

  useEffect(() => { localStorage.setItem(localStorageKeys.bookInventory, JSON.stringify(inventory)); }, [inventory]);
  useEffect(() => { localStorage.setItem(localStorageKeys.bookLogs, JSON.stringify(logs)); }, [logs]);
  useEffect(() => { localStorage.setItem(localStorageKeys.sourceSwitches, JSON.stringify(switches)); }, [switches]);
  useEffect(() => { localStorage.setItem(localStorageKeys.customBooks, JSON.stringify(importedBooks)); }, [importedBooks]);
  useEffect(() => { if (!resourcesSnapshot.data) return; setInventory(resourcesSnapshot.data.inventory.map((row) => row.bookId)); setLogs(resourcesSnapshot.data.logs.map((row) => ({ id: String(row.id), bookId: row.bookId, date: toLocalDateKey(row.sessionDate), minutes: row.minutes, questions: row.questions, correct: row.correct, wrong: row.wrong, blank: row.blank, topic: row.topic ?? undefined, pageStart: row.pageStart ?? undefined, pageEnd: row.pageEnd ?? undefined, testStart: row.testStart ?? undefined, testEnd: row.testEnd ?? undefined }))); setMappings(resourcesSnapshot.data.mappings.map((row) => ({ id: String(row.id), bookId: row.bookId, topic: row.topic, subject: row.subject, pageStart: row.pageStart, pageEnd: row.pageEnd, testStart: row.testStart, testEnd: row.testEnd }))); setSwitches(resourcesSnapshot.data.switches.map((row) => ({ id: String(row.id), fromBookId: row.fromBookId ?? undefined, toBookId: row.toBookId, date: toLocalDateKey(row.switchedAt), reason: row.reason }))); if (resourcesSnapshot.data.customBooks.length > 0) setImportedBooks(resourcesSnapshot.data.customBooks as ResourceBook[]); }, [resourcesSnapshot.data]);
  useEffect(() => { if (!user || !resourcesSnapshot.data || migratedLocalData.current) return; migratedLocalData.current = true; if (resourcesSnapshot.data.inventory.length === 0) inventory.forEach((bookId) => addBookMutation.mutate({ bookId })); if (resourcesSnapshot.data.logs.length === 0) logs.forEach((log) => addLogMutation.mutate({ bookId: log.bookId, topic: log.topic, sessionDate: log.date, minutes: log.minutes, questions: log.questions, correct: log.correct, wrong: log.wrong, blank: log.blank, pageStart: log.pageStart, pageEnd: log.pageEnd, testStart: log.testStart, testEnd: log.testEnd })); if (resourcesSnapshot.data.mappings.length === 0) mappings.forEach((mapping) => mappingMutation.mutate({ bookId: mapping.bookId, topic: mapping.topic, subject: mapping.subject, pageStart: mapping.pageStart ?? undefined, pageEnd: mapping.pageEnd ?? undefined, testStart: mapping.testStart ?? undefined, testEnd: mapping.testEnd ?? undefined })); if (resourcesSnapshot.data.switches.length === 0) switches.forEach((item) => addSwitchMutation.mutate({ fromBookId: item.fromBookId, toBookId: item.toBookId, reason: item.reason })); }, [user, resourcesSnapshot.data]);

  const catalogLibraryAsResourceBooks = useMemo(() => (catalogLibrary.data ?? []).map(catalogLibraryBookToResourceBook), [catalogLibrary.data]);
  const catalog = useMemo(() => {
    const base = [...resourceBookCatalog, ...importedBooks.filter((book) => !resourceBookCatalog.some((existing) => existing.id === book.id))];
    return [...base, ...catalogLibraryAsResourceBooks.filter((book) => !base.some((existing) => existing.id === book.id))];
  }, [importedBooks, catalogLibraryAsResourceBooks]);
  const myBooks = catalog.filter((book) => inventory.includes(book.id));
  const levelMeta: Record<BookLevel, { label: string; className: string }> = { Kolay: { label: "Temel", className: "bg-success-soft text-success" }, Orta: { label: "Dengeli", className: "bg-warn-soft text-warn" }, Zor: { label: "İleri", className: "bg-danger-soft text-danger" } };
  const getBookStats = (bookId: string) => {
    const rows = logs.filter((log) => log.bookId === bookId);
    const total = rows.reduce((sum, row) => sum + row.questions, 0);
    const correct = rows.reduce((sum, row) => sum + row.correct, 0);
    const activeDays = new Set(rows.map((row) => row.date)).size;
    const accuracy = total ? Math.round((correct / total) * 100) : 0;
    const lastDate = rows.map((row) => row.date).sort().at(-1);
    const daysSince = lastDate ? Math.max(0, Math.floor((Date.now() - new Date(lastDate).getTime()) / 86400000)) : null;
    return { rows, total, activeDays, accuracy, daysSince };
  };
  const getSuggestion = (book: (typeof catalog)[number]) => {
    const stats = getBookStats(book.id);
    if (!stats.total) return { tone: "blue", title: "İlk çözüm kaydını ekle", body: "Bu kaynağın sana uygunluğunu görmek için en az bir soru çözüm oturumu kaydet." };
    if (stats.accuracy < 55) return { tone: "coral", title: "Tekrar etmelisin", body: `%${stats.accuracy} doğrulukla önce ${book.subject} konularını kısa tekrarlarla güçlendir; aynı kaynağın kolay testlerini tamamla.` };
    if (stats.accuracy >= 85 && stats.activeDays >= 3) { const next = catalog.find((candidate) => candidate.subject === book.subject && candidate.level === (book.level === "Kolay" ? "Orta" : "Zor")); return { tone: "mint", title: "Bir üst seviyeye geçebilirsin", body: `${book.title} artık sana kolay geliyor. ${next ? `${next.publisher} ${next.title} kaynağına geçmeyi` : "daha seçici bir kaynağa geçmeyi"} düşün.` }; }
    if (stats.daysSince !== null && stats.daysSince > 5) return { tone: "yellow", title: "Ritmi geri kazan", body: `Son çözümünün üzerinden ${stats.daysSince} gün geçti. Haftada en az 3 kısa oturumla aralığı koru.` };
    return { tone: "blue", title: "Bu kaynakla devam et", body: `%${stats.accuracy} doğruluk ve ${stats.activeDays} aktif gün iyi bir ritim gösteriyor. Soru sayısını düzenli artır.` };
  };
  const addLog = () => {
    if (!logBookId) { toast.error("Önce çalıştığın kaynağı seç."); return; }
    const today = toLocalDateKey();
    const pageStart = Number(logForm.pageStart) || undefined;
    const pageEnd = Number(logForm.pageEnd) || undefined;
    const testStart = Number(logForm.testStart) || undefined;
    const testEnd = Number(logForm.testEnd) || undefined;
    const row: BookStudyLog = { id: `book-log-${Date.now()}`, bookId: logBookId, date: today, topic: logForm.topic || undefined, minutes: Number(logForm.minutes) || 0, questions: Number(logForm.questions) || 0, correct: Number(logForm.correct) || 0, wrong: Number(logForm.wrong) || 0, blank: Number(logForm.blank) || 0, pageStart, pageEnd, testStart, testEnd };
    setLogs((items) => [row, ...items]);
    if (user) addLogMutation.mutate({ bookId: logBookId, topic: logForm.topic || undefined, sessionDate: today, minutes: row.minutes, questions: row.questions, correct: row.correct, wrong: row.wrong, blank: row.blank, pageStart, pageEnd, testStart, testEnd });
    if (logForm.topic) { const book = catalog.find((item) => item.id === logBookId); const subjectName = book?.subject || topics.find((item) => item.topic === logForm.topic)?.subject || "Genel"; const mapping = { id: `mapping-${Date.now()}`, bookId: logBookId, topic: logForm.topic, subject: subjectName, pageStart, pageEnd, testStart, testEnd }; setMappings((items) => [mapping, ...items.filter((item) => !(item.bookId === logBookId && item.topic === logForm.topic))]); if (user) mappingMutation.mutate({ bookId: logBookId, topic: logForm.topic, subject: subjectName, pageStart, pageEnd, testStart, testEnd }); }
    setLogForm({ topic: "", minutes: "45", questions: "20", correct: "12", wrong: "5", blank: "3", pageStart: "", pageEnd: "", testStart: "", testEnd: "" }); toast.success(user ? "Çözüm kaydı hesabına kaydedildi; eşleştirme güncellendi." : "Çözüm oturumu kaydedildi; giriş yaptığında hesabına da aktarılır.");
  };
  const weakTopics = topics.filter((item) => item.status === "Zayıf").sort((a, b) => a.progress - b.progress).slice(0, 4);
  const topicOptions = Array.from(new Set([...topics.map((item) => item.topic), ...trackedTopics.map((item) => item.topic)]));
  // Seçilen kaynağın GERÇEK içeriğinden gelen konular; kitap seçilince "Konu
  // eşleştir" listesi bunlarla sınırlanır ve ilk konu otomatik dolar. Öncelik:
  // 1) Kaynak Kataloğu'nun book_curriculum_topics eşlemesi (en kesin, ama
  //    sync henüz her kitabı eşlemediği için çoğu kitapta boş olabilir),
  // 2) bu kitaba daha önce girilmiş konu eşleştirmeleri,
  // 3) kitabın dersiyle aynı derse ait Konu Haritası konuları (her kitapta
  //    dolu olan, güvenilir bir yedek — ilk ikisi boşsa buraya düşer),
  // 4) hiçbiri yoksa genel konu listesi.
  const catalogTopicsForBook = (bookId: string): string[] => {
    if (!/^\d+$/.test(bookId)) return [];
    const book = (catalogLibrary.data ?? []).find((item) => String(item.bookId) === bookId);
    return book ? Array.from(new Set(book.topics.map((item) => item.topic))) : [];
  };
  const loggedTopicsForBook = (bookId: string): string[] => Array.from(new Set(mappings.filter((item) => item.bookId === bookId).map((item) => item.topic)));
  const subjectTopicsForBook = (bookId: string): string[] => { const book = catalog.find((item) => item.id === bookId); return book ? Array.from(new Set(topics.filter((item) => item.subject === book.subject).map((item) => item.topic))) : []; };
  const specificTopicsForBook = (bookId: string): string[] => { if (!bookId) return []; const catalogTopics = catalogTopicsForBook(bookId); if (catalogTopics.length > 0) return catalogTopics; const logged = loggedTopicsForBook(bookId); if (logged.length > 0) return logged; return subjectTopicsForBook(bookId); };
  const bookTopicOptions = logBookId && specificTopicsForBook(logBookId).length > 0 ? specificTopicsForBook(logBookId) : topicOptions;
  const selectLogBook = (bookId: string) => {
    setLogBookId(bookId);
    const specificTopics = specificTopicsForBook(bookId);
    setLogForm((current) => ({ ...current, topic: specificTopics[0] ?? "" }));
  };
  const recommendedBooks = weakTopics.flatMap((topic) => catalog.filter((book) => book.subject === topic.subject && book.level === (topic.progress < 35 ? "Kolay" : "Orta")).slice(0, 1).map((book) => ({ book, topic })));
  const weeklyStats = Array.from({ length: 6 }, (_, index) => { const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - ((5 - index) * 7 + start.getDay())); const end = new Date(start); end.setDate(start.getDate() + 7); const rows = logs.filter((log) => { const date = new Date(log.date); return date >= start && date < end; }); const examRows = exams.filter((exam) => { const date = new Date(exam.date); return date >= start && date < end; }); const questions = rows.reduce((sum, row) => sum + row.questions, 0); const total = rows.reduce((sum, row) => sum + row.questions, 0); const correct = rows.reduce((sum, row) => sum + row.correct, 0); const topicValues = examRows.flatMap((exam) => Object.entries(exam.topicNets || {}).map(([topic, net]) => { const max = trackedTopics.find((item) => item.topic === topic)?.max || 10; return Math.max(0, Math.min(100, Math.round((net / max) * 100))); })); return { label: `${start.getDate()}/${start.getMonth() + 1}`, questions, accuracy: total ? Math.round((correct / total) * 100) : 0, net: examRows.length ? Number((examRows.reduce((sum, exam) => sum + exam.net, 0) / examRows.length).toFixed(1)) : null, topicProgress: topicValues.length ? Math.round(topicValues.reduce((sum, value) => sum + value, 0) / topicValues.length) : null }; });
  const toggleInventory = (id: string) => setInventory((items) => { if (items.includes(id)) { if (user) removeBookMutation.mutate({ bookId: id }); return items.filter((item) => item !== id); } const previous = items.at(-1); if (user) { addBookMutation.mutate({ bookId: id }); if (previous && previous !== id) addSwitchMutation.mutate({ fromBookId: previous, toBookId: id, reason: "Kişisel raf güncellemesi" }); } if (previous && previous !== id) setSwitches((history) => [{ id: `switch-${Date.now()}`, fromBookId: previous, toBookId: id, date: toLocalDateKey(), reason: "Kişisel raf güncellemesi" }, ...history]); return [...items, id]; });
  const importBookFile = async (file?: File) => {
    if (!file) return;
    if (!/\.(csv|xlsx|xls)$/i.test(file.name)) { toast.error("CSV veya Excel dosyası seçmelisin."); return; }
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      const normalize = (value: string) => value.toLocaleLowerCase("tr").replace(/[ıİ]/g, "i").replace(/[^a-z0-9]/g, "");
      const valueOf = (row: Record<string, unknown>, aliases: string[]) => { const key = Object.keys(row).find((candidate) => aliases.includes(normalize(candidate))); return key ? String(row[key] ?? "").trim() : ""; };
      const imported: ResourceBook[] = rows.map((row, index) => {
        const title = valueOf(row, ["id", "kitapid", "kitapadi", "kitap", "title", "kaynakadi"]);
        const subjectName = valueOf(row, ["subject", "ders", "dersadi"]) || "Genel";
        const exam: "TYT" | "AYT" = valueOf(row, ["exam", "sinav", "sinavtur" ]).toUpperCase() === "AYT" ? "AYT" : "TYT";
        const rawLevel = valueOf(row, ["level", "seviye", "zorluk"]).toLocaleLowerCase("tr");
        const level: BookLevel = rawLevel.includes("zor") || rawLevel.includes("ileri") ? "Zor" : rawLevel.includes("orta") ? "Orta" : "Kolay";
        const id = valueOf(row, ["bookid", "kitapid", "id"]) || `custom-book-${Date.now()}-${index}`;
        return { id, title: title || `İçe aktarılan kaynak ${index + 1}`, publisher: valueOf(row, ["publisher", "yayinevi", "yayıncı"]) || "Özel katalog", subject: subjectName, exam, level, format: valueOf(row, ["format", "tur", "kaynakformat"]) || "Soru bankası", reason: valueOf(row, ["reason", "aciklama", "açıklama"]) || "Öğrenci kataloğundan içe aktarıldı.", sourceUrl: valueOf(row, ["sourceurl", "url", "link"]), pageCount: Number(valueOf(row, ["pagecount", "sayfasayisi", "sayfa"])) || undefined, tone: "lilac" as const };
      }).filter((book) => book.title.trim().length > 0);
      if (!imported.length) { toast.error("Dosyada kitap satırı bulunamadı."); return; }
      const uniqueBooks = imported.filter((book, index, all) => all.findIndex((candidate) => candidate.id === book.id) === index);
      setImportedBooks((items) => [...uniqueBooks, ...items.filter((item) => !uniqueBooks.some((book) => book.id === item.id))]);
      if (user) importBooksMutation.mutate({ books: uniqueBooks });
      const importedMappings: BookTopicMapping[] = rows.flatMap((row, index) => { const topic = valueOf(row, ["topic", "konu", "konuadi"]); if (!topic) return []; const bookId = valueOf(row, ["bookid", "kitapid", "id"]) || uniqueBooks[index]?.id; if (!bookId) return []; return [{ id: `mapping-${Date.now()}-${index}`, bookId, topic, subject: valueOf(row, ["subject", "ders", "dersadi"]) || "Genel", pageStart: Number(valueOf(row, ["pagestart", "sayfabaslangic", "sayfailk"])) || undefined, pageEnd: Number(valueOf(row, ["pageend", "sayfabitis", "sayfason"])) || undefined, testStart: Number(valueOf(row, ["teststart", "testbaslangic", "testilk"])) || undefined, testEnd: Number(valueOf(row, ["testend", "testbitis", "testson"])) || undefined }]; });
      if (importedMappings.length) { setMappings((items) => [...importedMappings, ...items]); if (user) importedMappings.forEach((mapping) => mappingMutation.mutate({ bookId: mapping.bookId, topic: mapping.topic, subject: mapping.subject, pageStart: mapping.pageStart ?? undefined, pageEnd: mapping.pageEnd ?? undefined, testStart: mapping.testStart ?? undefined, testEnd: mapping.testEnd ?? undefined })); }
      toast.success(`${uniqueBooks.length} kaynak${importedMappings.length ? ` ve ${importedMappings.length} konu eşleştirmesi` : ""} içe aktarıldı.`);
    } catch { toast.error("Dosya okunamadı. İlk satırda sütun başlıkları olduğundan emin ol."); }
  };
  return <div id="resources" className="space-y-7 animate-page-in">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="eyebrow mb-2">Kişisel rafın</div><h1 className="page-heading">Elindeki kaynaklarla doğru ritmi kur.</h1><p className="page-subtitle">Rafındaki kitaplarla çöz, ilerlemeni izle ve koç önerisi al. Yeni kaynak eklemek için Kaynak Kataloğu'nu kullan.</p></div><div className="flex items-center gap-2"><span className="demo-chip"><BookOpen size={12} /> {myBooks.length} kaynak rafında</span><Button onClick={() => onSection("catalog")} variant="outline" className="h-9 shrink-0 rounded-xl border-brand/20 bg-white text-[12px] font-semibold text-brand">Kaynak Kataloğu'na git</Button></div></div>
    {myBooks.length === 0 && <Card className="soft-card border-brand/15 bg-brand-soft p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><div className="resource-icon bg-brand-soft text-brand"><Library size={18} /></div><div><h2 className="text-[15px] font-semibold text-ink">Rafın henüz boş — önce elindeki kaynakları seç.</h2><p className="mt-1 max-w-xl text-[13px] leading-5 text-ink-2">Kaynak Kataloğu'ndan gerçekten kullandığın kitapları "Elimde" olarak işaretle; çözüm ritmi, konu eşleştirme ve önerilerin buna göre kişiselleşsin.</p></div></div><Button onClick={() => onSection("catalog")} className="h-10 shrink-0 rounded-xl bg-brand px-4 text-[13px] font-semibold text-white hover:bg-brand"><BookOpen className="mr-2" size={14} /> Kaynaklarımı seç</Button></div></Card>}
    <div className="grid gap-5 lg:grid-cols-[0.75fr_1.25fr]"><Card className="soft-card relative overflow-hidden bg-ink! p-6 text-white sm:p-8"><div className="absolute -bottom-16 -right-16 h-48 w-48 rounded-full border border-white/10" /><div className="relative"><div className="hero-pill bg-white/10 text-white"><Sparkles size={13} /> Verine göre yönlendirici</div><h2 className="mt-7 max-w-[320px] text-[32px] font-semibold leading-[1.05] font-display">Kaynak seçimini şansa bırakma.</h2><p className="mt-5 max-w-[310px] text-[14px] leading-6 text-white/55">Önce kolay kaynakla temeli kur, sonra orta ve zor kaynaklara geçişi çözüm doğruluğun belirlesin.</p><div className="mt-6 flex items-center gap-2 text-[12px] font-semibold text-pencil"><Target size={14} /> {myBooks.length} kaynak kişisel rafında</div><div className="mt-3 max-h-[230px] space-y-1.5 overflow-y-auto pr-1">{myBooks.length === 0 ? <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-[12px] leading-5 text-white/50">Henüz rafında kaynak yok. Aşağıdan bir kaynağı "Elimde" işaretle ya da Kaynak Kataloğu'ndan ekle.</div> : myBooks.map((book) => <div key={book.id} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2"><span className="h-2 w-2 shrink-0 rounded-full" style={{ background: subjectColors[book.subject] ?? palette.ink3 }} /><div className="min-w-0 flex-1"><div className="truncate text-[12px] font-semibold text-white">{book.title}</div><div className="text-[12px] text-white/45">{book.subject} · {book.level}</div></div></div>)}</div></div></Card><Card className="soft-card p-5 sm:p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="eyebrow">Çözüm ritmi</div><h2 className="mt-1 text-[21px] font-semibold text-ink font-display">Bugün hangi kaynakla çalıştın?</h2></div><span className="rounded-full bg-success-soft px-2.5 py-1 text-[12px] font-bold text-success">Öneri motoru açık</span></div><div className="mt-5 grid gap-3 sm:grid-cols-[1fr_90px_90px]"><select value={logBookId} onChange={(event) => selectLogBook(event.target.value)} className="form-input"><option value="">Kaynak seç</option>{myBooks.map((book) => <option key={book.id} value={book.id}>{book.subject} · {book.title}</option>)}</select><input type="number" min="1" value={logForm.minutes} onChange={(event) => setLogForm({ ...logForm, minutes: event.target.value })} className="form-input" placeholder="dk" /><input type="number" min="1" value={logForm.questions} onChange={(event) => setLogForm({ ...logForm, questions: event.target.value })} className="form-input" placeholder="soru" /></div><div className="mt-3 grid gap-3 sm:grid-cols-[1.4fr_repeat(4,1fr)]"><select value={logForm.topic} onChange={(event) => setLogForm({ ...logForm, topic: event.target.value })} className="form-input"><option value="">Konu eşleştir (opsiyonel)</option>{bookTopicOptions.map((topic) => <option key={topic} value={topic}>{topic}</option>)}</select><input type="number" min="0" value={logForm.pageStart} onChange={(event) => setLogForm({ ...logForm, pageStart: event.target.value })} className="form-input" placeholder="sf. ilk" /><input type="number" min="0" value={logForm.pageEnd} onChange={(event) => setLogForm({ ...logForm, pageEnd: event.target.value })} className="form-input" placeholder="sf. son" /><input type="number" min="0" value={logForm.testStart} onChange={(event) => setLogForm({ ...logForm, testStart: event.target.value })} className="form-input" placeholder="test ilk" /><input type="number" min="0" value={logForm.testEnd} onChange={(event) => setLogForm({ ...logForm, testEnd: event.target.value })} className="form-input" placeholder="test son" /></div><div className="mt-3 grid grid-cols-3 gap-3"><input type="number" min="0" value={logForm.correct} onChange={(event) => setLogForm({ ...logForm, correct: event.target.value })} className="form-input" placeholder="Doğru" /><input type="number" min="0" value={logForm.wrong} onChange={(event) => setLogForm({ ...logForm, wrong: event.target.value })} className="form-input" placeholder="Yanlış" /><input type="number" min="0" value={logForm.blank} onChange={(event) => setLogForm({ ...logForm, blank: event.target.value })} className="form-input" placeholder="Boş" /></div><Button onClick={addLog} className="mt-3 h-10 rounded-xl bg-pencil px-4 text-[13px] font-semibold text-ink hover:bg-pencil-strong"><Plus className="mr-2" size={14} /> Oturumu kaydet</Button></Card></div>
    <Card className="soft-card border-brand/10 bg-brand-soft p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="eyebrow text-brand">Toplu katalog aktarımı</div><h2 className="mt-1 text-[21px] font-semibold text-ink font-display">Kitap ve eşleştirmeleri tek dosyada yükle.</h2><p className="mt-1 max-w-2xl text-[12px] leading-5 text-ink-3">CSV, XLSX veya XLS dosyasında kitap adı, yayınevi, ders, sınav, seviye ve istersen konu, sayfa/test aralığı sütunlarını kullan. Giriş yaptıysan kayıtlar hesabına yazılır.</p></div><input ref={bulkFileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(event) => { void importBookFile(event.target.files?.[0]); event.currentTarget.value = ""; }} /><Button onClick={() => bulkFileRef.current?.click()} variant="outline" className="h-10 shrink-0 rounded-xl border-brand/20 bg-white text-[12px] font-semibold text-brand"><Upload className="mr-2" size={14} /> CSV / Excel yükle</Button></div><div className="mt-4 flex flex-wrap gap-2 text-[12px] text-ink-3"><span className="rounded-lg bg-white px-2.5 py-1.5">Zorunlu: kitap adı · ders</span><span className="rounded-lg bg-white px-2.5 py-1.5">Opsiyonel: konu · sayfa ilk/son · test ilk/son</span><span className="rounded-lg bg-white px-2.5 py-1.5">Aynı dosya kitap + eşleştirme içerebilir</span></div></Card>
    {user && <Card className="soft-card border-pencil/15 bg-danger-soft p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="eyebrow text-danger">Kitap Kütüphanem</div><h2 className="mt-1 text-[21px] font-semibold text-ink font-display">Elindeki kitabı fotoğrafla ekle.</h2><p className="mt-1 max-w-2xl text-[12px] leading-5 text-ink-3">1. fotoğraf kapak: kitap adı, yayınevi ve ders okunur. 2. fotoğraf içindekiler: ünite ve testler YKS konularıyla eşleşir, konular kaydedilir. Her adımda sen onaylarsın.</p></div><Button onClick={() => setShowAddBook(true)} variant="outline" className="h-10 shrink-0 rounded-xl border-pencil/25 bg-white text-[12px] font-semibold text-danger"><Camera className="mr-2" size={14} /> Kitap ekle</Button></div></Card>}
    {showAddBook && <AddBookWizard onCreateBook={createBookFromCover} findDuplicate={findDuplicateBook} onOpenExisting={(book) => { setShowAddBook(false); setOpenBook(book); }} onClose={() => setShowAddBook(false)} />}
    {user && <BookRecommendationsCard bookTitles={Object.fromEntries(catalog.map((book) => [book.id, book.title]))} />}
    {recommendedBooks.length > 0 && <Card className="soft-card border-pencil/15 bg-danger-soft p-5 sm:p-6"><div className="flex items-center justify-between"><div><div className="eyebrow text-danger">Deneme sonuçlarına göre</div><h2 className="mt-1 text-[21px] font-semibold text-ink font-display">Zayıf konuların için öneriler</h2></div><span className="rounded-full bg-danger-soft px-2.5 py-1 text-[12px] font-bold text-danger">{recommendedBooks.length} öncelik</span></div><div className="mt-4 grid gap-3 md:grid-cols-2">{recommendedBooks.map(({ book, topic }) => <div key={`${book.id}-${topic.id}`} className="flex items-center gap-3 rounded-2xl border border-pencil/10 bg-white p-3"><div className={`resource-icon ${toneClasses[book.tone]}`}><BookOpen size={16} /></div><div className="min-w-0 flex-1"><div className="text-[13px] font-semibold text-ink-2">{book.title}</div><div className="mt-1 text-[12px] text-ink-3">{topic.topic} · %{topic.progress} ilerleme · {book.level} seviye</div><div className="mt-1 text-[12px] text-ink-3">{book.reason}</div></div><button onClick={() => toggleInventory(book.id)} className={`shrink-0 rounded-lg px-2.5 py-2 text-[12px] font-bold ${inventory.includes(book.id) ? "bg-success-soft text-success" : "bg-ink text-white"}`}>{inventory.includes(book.id) ? "Rafında" : "Rafa ekle"}</button></div>)}</div></Card>}
    {myBooks.length > 0 && <Card className="soft-card p-5 sm:p-6"><div className="flex items-center justify-between"><div><div className="eyebrow">Elindeki kaynaklar</div><h2 className="mt-1 text-[21px] font-semibold text-ink font-display">Kişisel rafın</h2></div><span className="text-[12px] text-ink-4">{myBooks.length} kitap</span></div><div className="mt-4 grid gap-3 md:grid-cols-2">{myBooks.map((book) => { const stats = getBookStats(book.id); const suggestion = getSuggestion(book); return <div key={book.id} className="rounded-2xl border border-ink/[0.07] p-4"><div className="flex items-start justify-between gap-3"><div><div className="text-[14px] font-semibold text-ink">{book.title}</div><div className="mt-1 text-[12px] text-ink-4">{book.publisher} · {book.subject} · {book.level}</div></div><button onClick={() => toggleInventory(book.id)} className="text-[12px] font-semibold text-ink-4">Rafından çıkar</button></div><div className="mt-4 grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-paper px-2 py-2"><div className="text-[16px] font-semibold text-ink">{stats.total}</div><div className="text-[11px] text-ink-4">soru</div></div><div className="rounded-xl bg-paper px-2 py-2"><div className="text-[16px] font-semibold text-ink">%{stats.accuracy}</div><div className="text-[11px] text-ink-4">doğruluk</div></div><div className="rounded-xl bg-paper px-2 py-2"><div className="text-[16px] font-semibold text-ink">{stats.activeDays}</div><div className="text-[11px] text-ink-4">aktif gün</div></div></div><div className={`mt-3 rounded-xl p-3 text-[12px] leading-5 ${suggestion.tone === "coral" ? "bg-danger-soft text-danger" : suggestion.tone === "mint" ? "bg-success-soft text-success" : suggestion.tone === "yellow" ? "bg-warn-soft text-warn" : "bg-brand-soft text-brand"}`}><div className="font-bold">{suggestion.title}</div><div className="mt-0.5">{suggestion.body}</div></div>{user && <BookContentBadge bookId={book.id} onOpen={() => setOpenBook({ id: book.id, title: book.title, publisher: book.publisher, subject: book.subject, exam: book.exam })} />}{mappings.filter((mapping) => mapping.bookId === book.id).length > 0 && <div className="mt-3 rounded-xl bg-brand-soft p-3"><div className="text-[12px] font-bold text-brand">Konu eşleştirmeleri</div><div className="mt-1 space-y-1">{mappings.filter((mapping) => mapping.bookId === book.id).slice(0, 3).map((mapping) => <div key={mapping.id} className="text-[12px] text-ink-2">{mapping.topic} · {mapping.pageStart && mapping.pageEnd ? `sf. ${mapping.pageStart}–${mapping.pageEnd}` : "sayfa yok"}{mapping.testStart && mapping.testEnd ? ` · test ${mapping.testStart}–${mapping.testEnd}` : ""}</div>)}</div></div>}</div>; })}</div></Card>}
    <Card className="soft-card p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="eyebrow">İlerleme analizi</div><h2 className="mt-1 text-[21px] font-semibold text-ink font-display">Soru ritmin ve kaynak yolculuğun.</h2><p className="mt-1 text-[12px] text-ink-4">Haftalık soru hacmi, doğruluk, deneme neti ve konu ilerlemesini aynı yerde izle.</p></div><div className="flex gap-2 text-[12px] font-semibold text-ink-3"><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-brand" /> Soru</span><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-success" /> Doğruluk</span><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-danger" /> Net</span><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-violet" /> Konu</span></div></div><div className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_0.75fr]"><div><div className="flex h-44 items-end gap-2 border-b border-l border-ink/[0.08] px-2 pb-0">{weeklyStats.map((week) => <div key={week.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><div className="flex h-full w-full max-w-10 items-end"><div className="relative w-full rounded-t-lg bg-brand/80" style={{ height: `${Math.max(5, (week.questions / Math.max(...weeklyStats.map((item) => item.questions), 20)) * 100)}%` }}><span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[11px] font-bold text-brand">{week.questions || "—"}</span></div></div><span className="text-[11px] text-ink-4">{week.label}</span></div>)}</div><div className="mt-4 rounded-xl border border-ink/[0.06] bg-white p-3"><div className="mb-2 flex items-center justify-between text-[12px] font-semibold text-ink-3"><span>Deneme neti ve konu ilerlemesi</span><span className="flex gap-2"><span className="text-danger">Net</span><span className="text-violet">Konu %</span></span></div><svg viewBox="0 0 600 110" className="h-24 w-full" role="img" aria-label="Haftalık deneme neti ve konu ilerleme grafiği"><polyline fill="none" stroke={palette.danger} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={weeklyStats.map((item, index) => `${index * 120 + 10},${item.net === null ? 100 : 100 - Math.min(90, (item.net / Math.max(...weeklyStats.map((entry) => entry.net || 1), 1)) * 75)}`).join(" ")} /><polyline fill="none" stroke={palette.violet} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 5" points={weeklyStats.map((item, index) => `${index * 120 + 10},${item.topicProgress === null ? 100 : 100 - item.topicProgress * 0.75}`).join(" ")} />{weeklyStats.map((item, index) => <g key={`trend-${item.label}`}><circle cx={index * 120 + 10} cy={item.net === null ? 100 : 100 - Math.min(90, (item.net / Math.max(...weeklyStats.map((entry) => entry.net || 1), 1)) * 75)} r="3.5" fill={palette.danger} /><circle cx={index * 120 + 10} cy={item.topicProgress === null ? 100 : 100 - item.topicProgress * 0.75} r="3.5" fill={palette.violet} /></g>)}</svg></div><div className="mt-3 rounded-xl bg-paper px-3 py-2 text-[12px] text-ink-3">Son hafta <strong className="text-ink">{weeklyStats.at(-1)?.questions || 0} soru</strong> · doğruluk <strong className="text-success">%{weeklyStats.at(-1)?.accuracy || 0}</strong></div></div><div className="rounded-2xl bg-paper p-4"><div className="text-[12px] font-bold text-ink-4">Kaynak değiştirme geçmişi</div>{switches.length === 0 ? <p className="mt-4 text-[12px] leading-5 text-ink-3">Bir kitabı rafına ekleyip başka bir seviyeye geçtiğinde değişim geçmişin burada görünecek.</p> : <div className="mt-3 space-y-3">{switches.slice(0, 4).map((item) => <div key={item.id} className="flex items-start gap-2"><div className="mt-1 h-2 w-2 rounded-full bg-pencil" /><div><div className="text-[12px] font-semibold text-ink-2">{item.fromBookId ? catalog.find((book) => book.id === item.fromBookId)?.title : "İlk kaynak"} → {catalog.find((book) => book.id === item.toBookId)?.title}</div><div className="mt-0.5 text-[12px] text-ink-4">{item.date} · {item.reason}</div></div></div>)}</div>}</div></div></Card>
    <Card className="soft-card p-6 sm:p-7"><SectionHeading eyebrow="Kaynak geçiş kuralı" title="Önce öğren, sonra hızlan." copy="Öneriler; doğru oranı, soru hacmini ve kaç farklı gün çalıştığını birlikte değerlendirir." /><div className="grid gap-4 md:grid-cols-3">{(["Kolay", "Orta", "Zor"] as BookLevel[]).map((item) => <div key={item} className="rounded-2xl bg-paper p-4"><div className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-bold ${levelMeta[item].className}`}>{item}</div><p className="mt-3 text-[12px] leading-5 text-ink-3">{item === "Kolay" ? "%55 altı doğrulukta tekrar, konu özeti ve kısa test ritmi." : item === "Orta" ? "%55–84 arası doğrulukta düzenli soru çözümü ve haftalık tekrar." : "%85 üzeri doğruluk ve en az 3 aktif günde bir üst seviyeye geçiş."}</p></div>)}</div></Card>
    {openBook && <BookDetailDialog book={openBook} onClose={() => setOpenBook(null)} />}
  </div>;
}
function AiPlan({ topics, exams }: { topics: Topic[]; exams: MockExam[] }) {
  const { user } = useAuth();
  const onboardingProfile = trpc.onboarding.get.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const [plan, setPlan] = useState<AiWeeklyPlan | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [availableMinutes, setAvailableMinutes] = useState(600);
  const [history, setHistory] = useState<StudyHistoryItem[]>(() => getStoredValue(localStorageKeys.studyHistory, []));
  const resourcesSnapshot = trpc.resources.snapshot.useQuery(undefined, { enabled: Boolean(user), retry: false });
  // Kaynak Kataloğu'ndan "Kütüphaneme ekle" ile eklenen kitaplar (sayısal id'li,
  // gerçek zorluk/konu verisiyle) — AI Planım'ın hem statik eski katalogdaki
  // hem de buradaki elindeki/yeni edindiği kaynakları görmesi için.
  const catalogLibrary = trpc.catalog.myLibrary.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const personalBookIds = user && resourcesSnapshot.data ? resourcesSnapshot.data.inventory.map((row) => row.bookId) : getStoredValue<string[]>(localStorageKeys.bookInventory, []);
  const customBooks = (resourcesSnapshot.data?.customBooks as ResourceBook[] | undefined) || getStoredValue<ResourceBook[]>(localStorageKeys.customBooks, []);
  const catalogLibraryAsResourceBooks: ResourceBook[] = (catalogLibrary.data ?? []).map(catalogLibraryBookToResourceBook);
  const catalog = [...resourceBookCatalog, ...customBooks.filter((book) => !resourceBookCatalog.some((base) => base.id === book.id)), ...catalogLibraryAsResourceBooks];
  const personalBooks = catalog.filter((book) => personalBookIds.includes(book.id));
  const personalBookLogs = user && resourcesSnapshot.data ? resourcesSnapshot.data.logs.map((row) => ({ id: String(row.id), bookId: row.bookId, date: toLocalDateKey(row.sessionDate), minutes: row.minutes, questions: row.questions, correct: row.correct, wrong: row.wrong, blank: row.blank, topic: row.topic ?? undefined })) : getStoredValue<BookStudyLog[]>(localStorageKeys.bookLogs, []);
  const enrichPlanWithBooks = (raw: AiWeeklyPlan): AiWeeklyPlan => ({ ...raw, days: raw.days.map((day) => ({ ...day, sessions: day.sessions.map((session) => { const book = personalBooks.find((candidate) => candidate.subject === session.subject); if (!book) return session; const targetQuestions = session.kind === "Soru" ? Math.max(10, Math.round(session.minutes / 3)) : Math.max(5, Math.round(session.minutes / 6)); const { targetPages, targetTests } = resolveBookTarget(resourcesSnapshot.data?.mappings || [], book.id, session.topic); return { ...session, bookId: book.id, bookTitle: book.title, targetQuestions, targetPages, targetTests }; }) })) });
  const saveCalendarPlan = trpc.calendar.savePlan.useMutation({ onSuccess: () => toast.success("Planın takvime de eklendi."), onError: () => toast.error("Plan oluşturuldu ancak takvime kaydedilemedi.") });
  const generatePlan = trpc.aiPlan.generate.useMutation({ onSuccess: (value) => { const enriched = enrichPlanWithBooks(value as AiWeeklyPlan); setPlan(enriched); setSelectedDay(0); if (user) { const monday = new Date(); monday.setHours(12, 0, 0, 0); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7)); const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6); saveCalendarPlan.mutate({ title: "AI haftalık çalışma planı", weekStart: monday.toISOString(), weekEnd: sunday.toISOString(), summary: enriched.summary, sessions: enriched.days.flatMap((day, dayIndex) => day.sessions.map((session) => { const date = day.date && !Number.isNaN(new Date(`${day.date}T12:00:00`).getTime()) ? new Date(`${day.date}T12:00:00`) : new Date(monday.getTime() + dayIndex * 86400000); return { sessionDate: date.toISOString(), title: session.title, subject: session.subject, topic: session.topic, kind: session.kind, plannedMinutes: session.minutes, targetQuestions: session.targetQuestions, targetPages: session.targetPages, targetTests: session.targetTests }; })) }); } toast.success("Haftalık planın hazırlandı; kişisel rafından hedefler eklendi."); }, onError: () => toast.error("Plan oluşturulurken bir sorun oldu. Lütfen tekrar dene.") });
  useEffect(() => { localStorage.setItem(localStorageKeys.studyHistory, JSON.stringify(history)); }, [history]);
  const createPlan = () => {
    const profile = onboardingProfile.data;
    const hasTarget = Boolean(profile && (profile.targetScoreType || profile.targetUniversity || profile.targetDepartment || profile.targetRanking || profile.examYear));
    const hasCoachingContext = Boolean(profile && (profile.dailyStudyDuration || profile.preferredStudyMethods.length || profile.studyObstacles || profile.coachingStyle || profile.mainGoal));
    const studentProfile = profile && (hasTarget || hasCoachingContext)
      ? {
          targetScoreType: profile.targetScoreType || undefined,
          examYear: profile.examYear ?? undefined,
          targetUniversity: profile.targetUniversity || undefined,
          targetDepartment: profile.targetDepartment || undefined,
          targetRanking: profile.targetRanking || undefined,
          dailyStudyDuration: profile.dailyStudyDuration ?? undefined,
          preferredStudyMethods: profile.preferredStudyMethods,
          studyObstacles: profile.studyObstacles ?? undefined,
          coachingStyle: profile.coachingStyle ?? undefined,
          mainGoal: profile.mainGoal ?? undefined,
        }
      : undefined;
    // Onboarding'de hedef bilgisi verildiyse plan başlığı ona göre kişiselleşir;
    // verilmediyse mevcut varsayılan metne düşer.
    const goal = profile?.targetUniversity
      ? `${profile.targetUniversity}${profile.targetDepartment ? ` · ${profile.targetDepartment}` : ""}${profile.examYear ? ` · YKS ${profile.examYear}` : ""}`
      : profile?.targetScoreType
        ? `${TARGET_SCORE_TYPE_LABELS[profile.targetScoreType]}${profile.examYear ? ` · YKS ${profile.examYear}` : ""}`
        : "YKS 2027 · 50.000 hedefi";
    generatePlan.mutate({ topics: topics.map(({ topic, subject, exam, progress, status }) => ({ topic, subject, exam, progress, status })), exams: exams.map(({ title, date, net, subjects, topicDetails }) => ({ title, date, net, subjects, topicDetails })), books: personalBooks.map((book) => { const rows = personalBookLogs.filter((log) => log.bookId === book.id); const totalQuestions = rows.reduce((sum, row) => sum + row.questions, 0); const correct = rows.reduce((sum, row) => sum + row.correct, 0); return { id: book.id, title: book.title, subject: book.subject, exam: book.exam, level: book.level, pageCount: book.pageCount, totalQuestions, accuracy: totalQuestions ? Math.round((correct / totalQuestions) * 100) : 0, activeDays: new Set(rows.map((row) => row.date)).size, mappings: (resourcesSnapshot.data?.mappings || []).filter((mapping) => mapping.bookId === book.id).map((mapping) => ({ topic: mapping.topic, pageStart: mapping.pageStart ?? undefined, pageEnd: mapping.pageEnd ?? undefined, testStart: mapping.testStart ?? undefined, testEnd: mapping.testEnd ?? undefined })) }; }), availableMinutes, goal, studentProfile });
  };
  const activeDay = plan?.days[selectedDay];
  const sessionId = (session: AiStudySession, index: number) => `${plan?.days[selectedDay]?.date || selectedDay}-${index}-${session.title}`;
  const isCompleted = (session: AiStudySession, index: number) => history.some((item) => item.id === sessionId(session, index));
  const toggleSession = (session: AiStudySession, index: number) => {
    const id = sessionId(session, index);
    if (isCompleted(session, index)) { setHistory((items) => items.filter((item) => item.id !== id)); toast("Oturum yeniden plana alındı."); return; }
    setHistory((items) => [{ id, title: session.title, subject: session.subject, topic: session.topic, minutes: session.minutes, kind: session.kind, completedAt: new Date().toISOString(), bookId: session.bookId, bookTitle: session.bookTitle, targetQuestions: session.targetQuestions, targetPages: session.targetPages, targetTests: session.targetTests }, ...items]);
    toast.success("Oturum tamamlandı ve çalışma geçmişine eklendi.");
  };
  return <div className="space-y-7 animate-page-in"><div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><div className="eyebrow mb-2">Yapay zekâlı çalışma koçu</div><h1 className="page-heading">Haftanı birlikte kuralım.</h1><p className="page-subtitle">Son denemelerini ve konu durumlarını analiz edip, her güne uygulanabilir küçük oturumlar yerleştirir.</p></div><Button onClick={createPlan} disabled={generatePlan.isPending} className="h-11 rounded-xl bg-pencil px-5 text-[13px] font-semibold text-ink hover:bg-pencil-strong disabled:opacity-60"><Sparkles className="mr-2" size={15} />{generatePlan.isPending ? "Planın hazırlanıyor..." : plan ? "Planı yeniden oluştur" : "Haftalık plan oluştur"}</Button></div><Card className="soft-card p-4 sm:p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="text-[13px] font-semibold text-ink-2">Haftalık zaman bütçen</div><div className="mt-1 text-[12px] text-ink-3">AI planı günlerine bu süreyi dengeli dağıtır.</div></div><div className="flex items-center gap-3 sm:min-w-[300px]"><input aria-label="Haftalık çalışma süresi" type="range" min="300" max="1200" step="60" value={availableMinutes} onChange={(event) => setAvailableMinutes(Number(event.target.value))} className="w-full accent-brand" /><span className="w-16 text-right text-[14px] font-bold text-brand">{formatMinutes(availableMinutes)}</span></div></div></Card>
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[0.78fr_1.22fr]">{!plan ? <Card className="soft-card relative min-h-[390px] overflow-hidden bg-ink! p-7 text-white sm:p-9"><div className="relative flex h-full flex-col justify-between"><div><div className="hero-pill bg-white/10 text-white"><Sparkles size={13} /> Verinden öğrenir</div><h2 className="mt-8 max-w-[390px] text-[35px] font-semibold leading-[1.04] font-display">Bu haftanın planı senin verinden çıkar.</h2><p className="mt-5 max-w-[355px] text-[14px] leading-6 text-white/55">Zayıf konuların, son deneme sonuçların ve haftalık hedef süren birlikte okunur.</p></div><div className="mt-12 grid max-w-[390px] grid-cols-3 gap-2">{[{ label: "Zayıf konu", value: topics.filter((item) => item.status === "Zayıf").length }, { label: "Son net", value: exams[0]?.net ?? 0 }, { label: "Geçmiş", value: history.length }].map((item) => <div key={item.label} className="rounded-xl border border-white/10 bg-white/[0.05] p-3"><div className="text-[11px] text-white/40">{item.label}</div><div className="mt-2 text-[21px] font-semibold text-white font-display">{item.value}</div></div>)}</div></div></Card> : <Card className="soft-card p-6 sm:p-7"><div className="eyebrow mb-3">Koç özeti</div><h2 className="text-[28px] font-semibold leading-tight text-ink font-display">{plan.summary}</h2><div className="mt-7"><div className="mb-3 flex items-center justify-between"><span className="text-[12px] font-bold text-ink-4">Öncelik sırası</span><span className="text-[12px] text-ink-4">{plan.focus.length} konu</span></div><div className="space-y-2">{plan.focus.slice(0, 4).map((focus, index) => <div key={`${focus.topic}-${index}`} className="flex items-start gap-3 rounded-xl bg-paper p-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-danger-soft text-[12px] font-bold text-danger">{index + 1}</span><div><div className="text-[13px] font-semibold text-ink-2">{focus.topic}</div><div className="mt-0.5 text-[12px] text-ink-3">{focus.subject} · {focus.reason}</div></div></div>)}</div></div><div className="mt-6 rounded-xl border border-brand/10 bg-brand-soft p-4"><div className="flex items-start gap-2.5"><Sparkles size={15} className="mt-0.5 shrink-0 text-brand" /><p className="text-[13px] leading-5 text-ink-2">{plan.coachNote}</p></div></div></Card>}
      <Card className="soft-card p-6 sm:p-7"><div className="mb-5 flex items-end justify-between"><div><div className="eyebrow mb-2">7 günlük akış</div><h2 className="text-[23px] font-semibold text-ink font-display">{plan ? "Her gün için net bir sonraki adım." : "Önce verini oku, sonra planla."}</h2></div>{plan && <span className="rounded-full bg-success-soft px-2.5 py-1 text-[12px] font-bold text-success">{history.length} tamamlandı</span>}</div>{plan ? <><div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">{plan.days.map((day, index) => <button key={`${day.day}-${index}`} onClick={() => setSelectedDay(index)} className={`rounded-xl px-1 py-3 text-center transition ${selectedDay === index ? "bg-ink text-white" : "bg-paper text-ink-3 hover:bg-rule"}`}><div className="text-[12px] font-bold">{day.day.slice(0, 3)}</div><div className="mt-1 text-[13px] font-semibold">{day.date ? day.date.slice(-2) : index + 1}</div></button>)}</div>{activeDay && <div className="mt-5"><div className="mb-4 flex items-center justify-between"><div><div className="text-[14px] font-semibold text-ink-2">{activeDay.day}</div><div className="mt-1 text-[12px] text-ink-4">{activeDay.sessions.length} oturum · toplam {activeDay.totalMinutes} dakika</div></div><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand"><CalendarDays size={17} /></div></div><div className="space-y-2">{activeDay.sessions.map((session, index) => { const done = isCompleted(session, index); return <div key={`${session.title}-${index}`} className={`flex items-start gap-3 rounded-xl border p-3 transition ${done ? "border-success/20 bg-success-soft/50" : "border-ink/[0.07]"}`}><button onClick={() => toggleSession(session, index)} aria-label={done ? "Oturumu geri al" : "Oturumu tamamla"} className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${done ? "bg-success text-white" : toneClasses[index % 2 === 0 ? "blue" : "coral"]}`}>{done ? <CheckCircle2 size={16} /> : <Clock3 size={15} />}</button><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className={`text-[13px] font-semibold ${done ? "text-success line-through" : "text-ink-2"}`}>{session.title}</span><span className="rounded-full bg-paper px-2 py-0.5 text-[11px] font-bold text-ink-3">{done ? "Tamamlandı" : session.kind}</span></div><div className="mt-1 text-[12px] text-ink-3">{session.subject} · {session.topic}</div>{session.bookTitle && <div className="mt-2 flex flex-wrap gap-2 text-[12px] font-semibold text-brand"><span className="rounded-md bg-brand-soft px-2 py-1">{session.bookTitle}</span>{session.targetQuestions && <span className="rounded-md bg-success-soft px-2 py-1">{session.targetQuestions} soru</span>}{session.targetPages ? <span className="rounded-md bg-warn-soft px-2 py-1">sf. {session.targetPages}</span> : <span className="rounded-md bg-paper px-2 py-1">sayfa verisi yok</span>}{session.targetTests && <span className="rounded-md bg-danger-soft px-2 py-1">test {session.targetTests}</span>}</div>}<p className="mt-1.5 text-[12px] leading-4 text-ink-4">{session.rationale}</p></div><span className={`whitespace-nowrap text-[12px] font-bold ${done ? "text-success" : "text-brand"}`}>{session.minutes} dk</span></div>; })}</div></div>}</> : <div className="flex min-h-[290px] flex-col items-center justify-center rounded-2xl bg-paper px-8 text-center"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand"><CalendarDays size={24} /></div><p className="mt-5 max-w-[280px] text-[14px] leading-6 text-ink-3">Butona bastığında zayıf olduğun konular ve son denemelerin için 7 günlük kişisel akış burada görünecek.</p><button onClick={createPlan} className="mt-5 text-[13px] font-bold text-brand">İlk planı oluştur <ArrowRight className="ml-1 inline" size={14} /></button></div>}</Card></div>
    <Card className="soft-card p-6 sm:p-7"><div className="flex items-center justify-between"><div><div className="eyebrow mb-2">Çalışma geçmişi</div><h2 className="text-[23px] font-semibold text-ink font-display">Küçük zaferlerin birikiyor.</h2></div><span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1.5 text-[12px] font-bold text-success"><History size={12} /> {history.length} oturum</span></div>{history.length === 0 ? <div className="mt-5 rounded-2xl bg-paper p-5 text-[13px] leading-5 text-ink-3">Bir AI planı oluşturduktan sonra oturum kartlarındaki daireye tıklayarak tamamladıklarını buraya ekleyebilirsin.</div> : <div className="mt-5 grid gap-2 sm:grid-cols-2">{history.slice(0, 8).map((item) => <div key={`${item.id}-${item.completedAt}`} className="flex items-center gap-3 rounded-xl border border-success/15 bg-success-soft/40 p-3"><CheckCircle2 size={16} className="shrink-0 text-success" /><div className="min-w-0 flex-1"><div className="truncate text-[13px] font-semibold text-ink-2">{item.title}</div><div className="mt-1 text-[12px] text-ink-3">{item.subject} · {item.minutes} dk · {new Date(item.completedAt).toLocaleDateString("tr-TR")}</div></div></div>)}</div>}</Card>
  </div>;
}


type FocusSessionSeed = { sessionId?: number; subject: string; topic: string; plannedMinutes?: number; sessionDate?: string | Date };
type FocusModeProps = { user: ReturnType<typeof useAuth>["user"]; onClose: () => void; initialSession?: FocusSessionSeed | null; onGoToCalendar: () => void; topics: Topic[] };

function FocusMode({ user, onClose, initialSession, onGoToCalendar, topics }: FocusModeProps) {
  const notebook = useNotebook();
  const [subject, setSubject] = useState(initialSession?.subject ?? "Matematik");
  const [topic, setTopic] = useState(initialSession?.topic ?? "Problemler");
  // Takvimden "Odakla başlat" ile açıldıysa bağlı olduğu studyPlanSessions
  // kaydı — tamamlanınca calendar.completeSession çağrılır, böylece takvimdeki
  // oturum da tamamlanmış görünür (spec: Pusula Odak ↔ Takvim eşleşmesi).
  const [linkedSessionId] = useState<number | undefined>(initialSession?.sessionId);
  // Takvimden "Odakla başlat" ile geldiyse süre GERÇEK planlanan dakika olmalı
  // (40 dk Odak, 20 dk Paragraf/Kitap Okuma vb.) — önceden burası hep sabit
  // 30 dk'ya düşüyor ve takvimdeki planı yansıtmıyordu.
  const [duration, setDuration] = useState(initialSession?.plannedMinutes || 30);
  // Hazırlık ekranındaki açık bilgilendirme cümlesi ("bugün bu saatte bu
  // dersin bu konusunu bu kadar dakika çalışacaksın") — takvimden gelen
  // gerçek planlanan saati kullanır; manuel/serbest girişte "şimdi"yi kullanır.
  const briefingMoment = initialSession?.sessionDate ? new Date(initialSession.sessionDate) : new Date();
  const briefingDateLabel = briefingMoment.toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "long" });
  const briefingTimeLabel = briefingMoment.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  // To-do listesi varken elle ders/konu seçimi ikinci plana alınır (araştırma:
  // Focus To-Do gibi uygulamalar görevi her zaman görünür tutup ayrı bir
  // "planlama" adımına geçişi engelliyor) — liste yoksa zaten tek seçenek odur.
  const [showManualPicker, setShowManualPicker] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [result, setResult] = useState({ questions: "", correct: "", wrong: "", blank: "", note: "" });
  const [breakAvailable, setBreakAvailable] = useState(false);
  const [breakMode, setBreakMode] = useState(false);
  const [breakSeconds, setBreakSeconds] = useState(60);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [completionPulse, setCompletionPulse] = useState(false);
  const utils = trpc.useUtils();
  const focusLog = trpc.calendar.addFocusLog.useMutation({ onSuccess: () => { toast.success("Oturum ve konu gelişimin kaydedildi."); onClose(); }, onError: () => toast.error("Oturum kaydedilemedi; tekrar deneyebilirsin.") });
  const completeLinkedSession = trpc.calendar.completeSession.useMutation({ onSuccess: () => { utils.calendar.snapshot.invalidate(); utils.bookContent.summaries.invalidate(); utils.bookContent.recommendations.invalidate(); toast.success("Takvimdeki oturum tamamlandı; konu gelişimin güncellendi."); onClose(); }, onError: () => toast.error("Oturum kaydedilemedi; tekrar deneyebilirsin.") });
  // Takvimden seçilmediyse (genel "Odak oturumu" girişi), bugün çalışılması
  // gereken TÜM oturumları (planlı + tamamlanmış) to-do listesi olarak göster;
  // tamamlanmış olanlar işaretli/tıklanamaz, planlı olanlar seçilip takvimle
  // eşleştirilebilir.
  const todaysPlan = trpc.calendar.snapshot.useQuery(undefined, { enabled: Boolean(user) && !initialSession, retry: false });
  const todaysSessions = (todaysPlan.data?.sessions ?? [])
    .filter((s) => s.status !== "skipped" && new Date(s.sessionDate).toDateString() === new Date().toDateString())
    .sort((a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime());
  const todaysDoneCount = todaysSessions.filter((s) => s.status === "completed").length;
  const [pickedSessionId, setPickedSessionId] = useState<number | undefined>(undefined);
  const effectiveSessionId = linkedSessionId ?? pickedSessionId;
  const pickPlannedSession = (planned: (typeof todaysSessions)[number]) => { if (planned.status === "completed") return; setPickedSessionId(planned.id as number); setSubject(planned.subject); setTopic(planned.topic); if (planned.plannedMinutes > 0) setDuration(planned.plannedMinutes); setShowManualPicker(false); };
  // Manuel Ders/Konu seçim listeleri sabit iki bağımsız dizi DEĞİL, tek bir
  // ders→konu haritasından geliyor (bkz. shared/focusPlan.ts:buildSubjectTopicMap)
  // — böylece "Matematik" seçiliyken "Hücre bölünmeleri" gibi başka bir derse
  // ait konu listede asla görünemez. Öncelik: 1) bugünün gerçek planı,
  // 2) Konu Haritası'ndaki tüm ders/konular, 3) (ikisi de yoksa) doğru
  // eşlenmiş, sabit bir başlangıç haritası.
  const todaysSubjectTopicMap = buildSubjectTopicMap(todaysSessions.map((s) => ({ subject: s.subject, topic: s.topic })));
  const topicMapSubjectTopicMap = buildSubjectTopicMap(topics.map((t) => ({ subject: t.subject, topic: t.topic })));
  const fallbackSubjectTopicMap: SubjectTopicMap = { Matematik: ["Problemler"], Türkçe: ["Paragrafta anlam"], Fen: ["Hücre bölünmeleri"], Sosyal: ["Milli Mücadele"] };
  const activeSubjectTopicMap = Object.keys(todaysSubjectTopicMap).length > 0 ? todaysSubjectTopicMap : Object.keys(topicMapSubjectTopicMap).length > 0 ? topicMapSubjectTopicMap : fallbackSubjectTopicMap;
  const todaysSubjectOptions = Object.keys(activeSubjectTopicMap);
  const todaysTopicOptions = activeSubjectTopicMap[subject] ?? [];
  useEffect(() => { if (initialSession || pickedSessionId || todaysSubjectOptions.length === 0) return; if (!todaysSubjectOptions.includes(subject)) setSubject(todaysSubjectOptions[0]); }, [subject, todaysSubjectOptions.join("|")]);
  useEffect(() => { if (initialSession || pickedSessionId || todaysTopicOptions.length === 0) return; if (!todaysTopicOptions.includes(topic)) setTopic(todaysTopicOptions[0]); }, [subject, todaysTopicOptions.join("|")]);

  const announce = useCallback((text: string) => { if (!soundEnabled || !("speechSynthesis" in window)) return; window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(text); utterance.lang = "tr-TR"; window.speechSynthesis.speak(utterance); }, [soundEnabled]);
  const chime = useCallback(() => { if (!soundEnabled || typeof window === "undefined") return; const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext; if (!AudioContextClass) return; const context = new AudioContextClass(); const oscillator = context.createOscillator(); const gain = context.createGain(); oscillator.frequency.value = 660; gain.gain.setValueAtTime(0.0001, context.currentTime); gain.gain.exponentialRampToValueAtTime(0.11, context.currentTime + 0.03); gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.45); oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + 0.46); }, [soundEnabled]);

  // Focus Aura Engine — the canonical session clock (spec §56). Video
  // playback and aura color are both *derived* from this, never an
  // independent source. `onComplete` runs the existing "oturum tamamlandı"
  // voice cue, then a brief calm completion pulse before revealing the
  // existing (unchanged) result-entry summary panel.
  const handleComplete = useCallback(() => {
    chime();
    announce("Oturum tamamlandı. Sonuçlarını kaydedebilirsin.");
    setCompletionPulse(DEFAULT_FOCUS_AURA_CONFIG.enableCompletionAnimation);
    window.setTimeout(() => { setCompletionPulse(false); setShowSummary(true); }, DEFAULT_FOCUS_AURA_CONFIG.completionAnimationMs);
  }, [chime, announce]);

  const clock = useFocusClock({ totalMs: duration * 60 * 1000, onComplete: handleComplete });
  const { status, remainingMs, progress, auraColor } = clock;

  // Nefes molası da canonical clock'u duraklatır — iki ayrı "ilerliyor mu"
  // mekanizması olmasın diye aynı pause/resume üzerinden yürütülür.
  useEffect(() => { if (!breakMode) return; const id = window.setInterval(() => setBreakSeconds((value) => { if (value <= 1) { window.clearInterval(id); setBreakMode(false); clock.resume(); return 60; } return value - 1; }), 1000); return () => window.clearInterval(id); }, [breakMode, clock]);
  useEffect(() => { if (status === "running") { document.body.classList.add("focus-active"); void document.documentElement.requestFullscreen?.().catch(() => undefined); } else document.body.classList.remove("focus-active"); return () => document.body.classList.remove("focus-active"); }, [status]);
  // Süre yarılandığında (progress ≥ %50) mola önerisi bir kez tetiklenir.
  useEffect(() => { if (status !== "running" || breakAvailable || breakMode || progress < 0.5) return; setBreakAvailable(true); announce("Kısa bir nefes molası zamanı."); }, [status, progress, breakAvailable, breakMode, announce]);

  const startFocus = () => { chime(); announce("Odak başladı. Telefonunu uçak moduna al ve tek konuya odaklan."); clock.start(); toast("Uçak modunu açmayı unutma; Pusula şimdi sessiz bir odak alanı."); };
  const togglePause = () => { if (status === "running") clock.pause(); else if (status === "paused" && !breakMode) clock.resume(); };
  const startBreak = () => { chime(); announce("Nefes molası başladı. Dört saniye nefes al, dört saniye ver."); clock.pause(); setBreakMode(true); setBreakSeconds(60); setBreakAvailable(false); };
  const endBreakEarly = () => { setBreakMode(false); setBreakSeconds(60); clock.resume(); announce("Odak devam ediyor."); };

  const finishFocus = () => {
    const questions = Number(result.questions) || 0;
    const minutes = Math.max(1, Math.round(clock.elapsedMs / 60000));
    const shared = { questions, correct: Number(result.correct) || 0, wrong: Number(result.wrong) || 0, blank: Number(result.blank) || 0, note: result.note || undefined };
    if (user && effectiveSessionId) {
      // Takvimle eşleşmiş bir oturum — kaydı tekrarlamak yerine doğrudan o
      // studyPlanSessions satırını tamamlanmış işaretle (bkz. server/db.ts
      // completeStudySession — bu, konu haritasını da otomatik günceller).
      completeLinkedSession.mutate({ sessionId: effectiveSessionId, actualMinutes: minutes, actualQuestions: questions, correct: shared.correct, wrong: shared.wrong, blank: shared.blank, note: shared.note });
      return;
    }
    const payload = { subject, topic, studyDate: new Date().toISOString(), minutes, ...shared };
    if (user) focusLog.mutate(payload);
    else { const item = { id: `focus-${Date.now()}`, sessionDate: toLocalDateKey(), title: `${topic} · odak oturumu`, subject, topic, kind: "Odak", plannedMinutes: duration, targetQuestions: questions, status: "completed" as const, actualMinutes: payload.minutes, actualQuestions: questions, correct: payload.correct, wrong: payload.wrong, blank: payload.blank }; const current = getStoredValue<unknown[]>(localStorageKeys.calendarSessions, []); localStorage.setItem(localStorageKeys.calendarSessions, JSON.stringify([...current, item])); toast.success("Oturum tamamlandı; konu gelişimin güncellendi."); onClose(); }
  };

  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const minutes = String(Math.floor(remainingSeconds / 60)).padStart(2, "0");
  const seconds = String(remainingSeconds % 60).padStart(2, "0");
  const nodes = useMemo(() => Array.from({ length: 18 }, (_, index) => ({ left: `${12 + ((index * 37) % 76)}%`, top: `${16 + ((index * 53) % 68)}%`, delay: `${(index % 6) * 0.45}s`, size: `${6 + (index % 4) * 3}px` })), []);
  const isPrepare = status === "idle";
  const isCompleted = status === "completed";
  const isPausedExplicitly = status === "paused" && !breakMode;

  // Ekran okuyuculara her saniye değil, yalnızca dakika sınırı değiştiğinde
  // bilgi verilir (spec §28 — anlaşılır ama spam yapmayan semantics).
  const srMinuteRef = useRef<number | null>(null);
  const [srLabel, setSrLabel] = useState("");
  useEffect(() => {
    const currentMinute = Math.floor(remainingSeconds / 60);
    if (srMinuteRef.current === currentMinute) return;
    srMinuteRef.current = currentMinute;
    setSrLabel(`${currentMinute} dakika ${remainingSeconds % 60} saniye kaldı`);
  }, [remainingSeconds]);

  return <div className="focus-overlay" style={{ "--aura-color": auraColor } as CSSProperties}>
    <FocusAuraVideo isPlaying={status === "running"} enabled={DEFAULT_FOCUS_AURA_CONFIG.enableVideo && !isPrepare} />
    {DEFAULT_FOCUS_AURA_CONFIG.enableAura && !isPrepare && <div className="focus-aura-tint" />}
    <span className="sr-only" aria-live="polite">{srLabel}</span>
    <div className="focus-topbar">
      <div className="flex items-center gap-3"><div className="brand-mark">P</div><div><div className="text-[14px] font-bold text-white">pusula odak</div><div className="text-[12px] text-white/45">{subject} · {topic}</div></div></div>
      <div className="flex items-center gap-2">
        {user && <button onClick={() => notebook.open({ prefill: { subject, title: `${topic} · odak notu` } })} className="focus-close" aria-label="Çalışırken not al (zamanlayıcı durmaz)">📝 Not al</button>}
        {(status === "running" || isPausedExplicitly) && <button onClick={togglePause} className="focus-close" aria-label={status === "running" ? "Odağı duraklat" : "Odağa devam et"}>{status === "running" ? <><Pause size={14} /> Duraklat</> : <><Play size={14} /> Devam et</>}</button>}
        <button onClick={() => setSoundEnabled((value) => !value)} className="focus-close">{soundEnabled ? "Ses açık" : "Ses kapalı"}</button>
        <button onClick={() => { document.exitFullscreen?.().catch(() => undefined); onClose(); }} className="focus-close"><X size={16} /> Çıkış</button>
      </div>
    </div>
    <div className="focus-body">
      {isPrepare && <div className="focus-prepare"><div className="focus-kicker"><Zap size={14} /> {duration} dakikalık tek hedef</div><h1>Şimdi yalnızca<br /><span>{topic}</span> ile ilgilen.</h1><p className="focus-briefing">{`Bugün ${briefingDateLabel}, saat ${briefingTimeLabel}'de ${subject} dersinin ${topic} konusunu ${duration} dakika çalışacaksın.`}</p><p>Telefonunu uçak moduna al. Pusula süreyi, küçük adımları ve oturum sonu verilerini senin için takip edecek.</p>
        {!initialSession && todaysSessions.length > 0 && <div className="focus-plan-picker"><div className="focus-kicker">Bugün çalışılması gerekenler · {todaysDoneCount}/{todaysSessions.length} tamamlandı</div><div className="mt-3 flex w-full max-w-md flex-col gap-1.5">{todaysSessions.map((planned) => { const isDone = planned.status === "completed"; return <button key={String(planned.id)} onClick={() => pickPlannedSession(planned)} disabled={isDone} className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-left text-[12px] transition ${isDone ? "cursor-default border-white/5 bg-white/5 text-white/40" : pickedSessionId === planned.id ? "border-pencil bg-white/10 text-white" : "border-white/15 text-white/70 hover:bg-white/10"}`}><span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${isDone ? "bg-success text-white" : "border border-white/25"}`}>{isDone && <Check size={11} />}</span>{!isDone && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: subjectColors[planned.subject] ?? palette.ink3 }} />}<span className="min-w-0 flex-1"><span className={`block font-semibold ${isDone ? "line-through" : ""}`}>{planned.subject} · {planned.topic}</span><span className="text-[12px] text-white/40">{planned.kind} · {planned.plannedMinutes} dk{isDone && planned.actualMinutes ? ` · ${planned.actualMinutes} dk yapıldı` : ""}</span></span></button>; })}</div>{pickedSessionId && <button onClick={() => setPickedSessionId(undefined)} className="mt-2 rounded-xl px-3 py-2 text-[12px] text-white/45 underline">Farklı bir konu çalış</button>}{!showManualPicker && <button onClick={() => setShowManualPicker(true)} className="mt-2 rounded-xl px-3 py-2 text-[12px] text-white/45 underline">Listede yok, elle ders/konu seç</button>}</div>}
        {!initialSession && Boolean(user) && !todaysPlan.isLoading && todaysSessions.length === 0 && <div className="focus-plan-picker"><div className="focus-kicker">Bugün için planlı ders yok</div><p className="mt-2 max-w-xs text-center text-[12px] text-white/45">Takvim sekmesinden bugünün Pusula Odak planını oluşturabilirsin.</p><button onClick={onGoToCalendar} className="mt-3 rounded-xl border border-white/15 px-3 py-2 text-[12px] font-semibold text-white/80 hover:bg-white/10">Takvim'e git</button></div>}
        {(todaysSessions.length === 0 || showManualPicker) && <div className="focus-setup-grid"><label>Ders<select value={subject} onChange={(event) => setSubject(event.target.value)}>{todaysSubjectOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label>Konu<select value={topic} onChange={(event) => setTopic(event.target.value)}>{todaysTopicOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label>Süre<select value={duration} onChange={(event) => setDuration(Number(event.target.value))}><option value="25">25 dakika</option><option value="30">30 dakika</option><option value="45">45 dakika</option><option value="60">60 dakika</option></select></label></div>}<div className="focus-checklist"><div><CheckCircle2 size={16} /> Telefonu uçak moduna al</div><div><CheckCircle2 size={16} /> Masanda yalnızca gerekli kaynak kalsın</div><div><CheckCircle2 size={16} /> Süre bitince soru ve doğruluk verisini gir</div></div><button onClick={startFocus} className="focus-start"><Sparkles size={17} /> Odağı başlat</button></div>}
      {!isPrepare && <div className={`focus-running ${breakMode ? "is-breathing" : ""}`}>
        <div className="focus-orbit focus-orbit-a" /><div className="focus-orbit focus-orbit-b" />
        {isPausedExplicitly && <div className="focus-pause-backdrop"><div className="focus-pause-card"><div className="focus-kicker">Duraklatıldı</div><h2>Odak duraklatıldı.</h2><p>{minutes}:{seconds} kaldığın yerde bekliyor. Hazır olduğunda devam et.</p><button onClick={togglePause} className="focus-start"><Play size={16} /> Devam et</button></div></div>}
        {breakMode && <div className="breath-card"><div className="focus-kicker">Kısa mola · {String(Math.floor(breakSeconds / 60)).padStart(2, "0")}:{String(breakSeconds % 60).padStart(2, "0")}</div><h2>Nefesini yavaşlat.</h2><div className="breath-orb"><span /></div><div className="breath-instruction">{Math.floor((60 - breakSeconds) / 4) % 2 === 0 ? "Nefes al" : "Nefes ver"}</div><p>Omuzlarını bırak. Dört saniye nefes al, dört saniye ver.</p><button onClick={endBreakEarly} className="focus-secondary">Odağa dön</button></div>}
        {completionPulse && <div className="focus-completion-pulse" aria-hidden="true"><div className="focus-completion-ring" /></div>}
        <div className="synapse-field">{nodes.map((node, index) => <span key={index} className="synapse-node" style={{ left: node.left, top: node.top, animationDelay: node.delay, width: node.size, height: node.size }} />)}<div className="synapse-core"><div className="synapse-core-ring" /><div className="focus-time">{minutes}:{seconds}</div><div className="focus-time-label">{isCompleted ? "SÜRE DOLDU" : isPausedExplicitly ? "DURAKLATILDI" : "ODAK SÜRESİ"}</div></div></div>
        <div className="focus-progress"><div className="focus-progress-fill" style={{ width: `${progress * 100}%` }} /></div>
        {breakAvailable && !breakMode && status === "running" && <div className="break-prompt"><div><div className="focus-kicker">Mola önerisi</div><div className="text-[13px] font-semibold text-white">Bir dakikalık nefes molası ister misin?</div></div><button onClick={startBreak} className="focus-secondary">Nefes molası</button></div>}
        <div className="focus-todo"><div className="focus-todo-head"><div><div className="focus-kicker">{isCompleted ? "Oturum tamamlandı" : "Şu anki görev"}</div><h2>{topic} · {isCompleted ? "sonuçlarını kaydet" : "küçük bir adım daha"}</h2></div><div className="focus-percent">%{Math.round(progress * 100)}</div></div><div className="focus-task-list"><div className="is-done"><CheckCircle2 size={16} /> Kaynak ve konu seçildi</div><div className={progress > 0.08 ? "is-done" : ""}><CheckCircle2 size={16} /> Konuyu çalış / özet çıkar</div><div className={progress > 0.45 ? "is-done" : ""}><CheckCircle2 size={16} /> Soruları çöz</div><div className={progress > 0.8 ? "is-done" : ""}><CheckCircle2 size={16} /> Hata notunu hazırla</div></div>{isCompleted ? <button onClick={() => setShowSummary(true)} className="focus-start">Oturum verisini gir <ArrowRight size={16} /></button> : <button onClick={clock.finishNow} className="focus-secondary">Erken bitir ve sonuç gir</button>}</div>
      </div>}
      {showSummary && <div className="focus-summary-backdrop"><div className="focus-summary"><div className="focus-kicker">Konu gelişim günlüğü</div><h2>Bugün ne yaptın?</h2><p>{topic} oturumunu kaydet; koçun bir sonraki öneriyi bu veriye göre ayarlasın.</p><div className="focus-result-grid">{[["questions", "Çözülen soru"], ["correct", "Doğru"], ["wrong", "Yanlış"], ["blank", "Boş"]].map(([key, label]) => <label key={key}>{label}<input type="number" min="0" value={result[key as keyof typeof result]} onChange={(event) => setResult((current) => ({ ...current, [key]: event.target.value }))} /></label>)}</div><textarea value={result.note} onChange={(event) => setResult((current) => ({ ...current, note: event.target.value }))} placeholder="Bir cümlelik hata veya öğrenme notu" /><div className="flex justify-end gap-2"><button onClick={() => setShowSummary(false)} className="focus-secondary">Geri dön</button><button onClick={finishFocus} className="focus-start">Günlüğe kaydet <Check size={16} /></button></div></div></div>}
    </div>
  </div>;
}

type CalendarSession = {
  id: number | string;
  sessionDate: string | Date;
  title: string;
  subject: string;
  topic: string;
  kind: string;
  plannedMinutes: number;
  targetQuestions?: number | null;
  targetPages?: string | null;
  targetTests?: string | null;
  status?: "planned" | "completed" | "skipped";
  actualMinutes?: number | null;
  actualQuestions?: number | null;
  correct?: number | null;
  wrong?: number | null;
  blank?: number | null;
  actualPages?: number | null;
  note?: string | null;
  rescheduledFrom?: string | Date | null;
  rescheduledAt?: string | Date | null;
  rescheduleCount?: number;
};

type TopicLog = { subject: string; topic: string; studyDate: string | Date; minutes: number; questions: number; correct: number; wrong: number; blank: number };
/** Uyum puanı 80–100 yeşil (İyi), 55–79 amber (Orta), 0–54 mercan (Zayıf) — mevcut statusMeta paletiyle birebir aynı mantık. */
const adherenceTone = (value: number) => statusMeta[value >= 80 ? "İyi" : value >= 55 ? "Orta" : "Zayıf"];

function AdherenceRing({ value, color }: { value: number; color: string }) {
  return (
    <div className="relative flex h-[84px] w-[84px] shrink-0 items-center justify-center rounded-full transition-all duration-500" style={{ background: `conic-gradient(${color} ${value * 3.6}deg, #e8e9f0 0deg)` }}>
      <div className="flex h-[64px] w-[64px] flex-col items-center justify-center rounded-full bg-white">
        <span className="text-[21px] font-semibold text-ink font-display">%{value}</span>
      </div>
    </div>
  );
}

const adherenceDecisionCopy: Record<AdherenceDecision, string> = {
  planı_küçült: "Planı küçültelim",
  yöntemi_değiştir: "Yöntemini değiştirelim",
  seviyeyi_artır: "Seviyeni artıralım",
  ritmi_koru: "Ritmini koru",
  veri_topla: "Biraz daha veri toplayalım",
};

type PlanAdherenceCenterProps = {
  result: AdherenceResult;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  /** Kullanıcının gerçek takvim verisi henüz yükleniyorsa true; demo veri flaşlamasını önler. */
  isLoading?: boolean;
  /** Uyum verisi çekilirken hata oluştuysa true. */
  isError?: boolean;
  onRetry?: () => void;
  /** Bu dönem için planlı oturum yoksa gösterilecek boş durumdaki "plan oluştur" aksiyonu. */
  onCreatePlan?: () => void;
};

function PlanAdherenceCenter({ result, onRefresh, isRefreshing, isLoading, isError, onRetry, onCreatePlan }: PlanAdherenceCenterProps) {
  if (isLoading) {
    return <Card className="soft-card overflow-hidden p-5" aria-busy="true">
      <div className="eyebrow flex items-center gap-2"><Target size={13} /> Plan Uyum Merkezi</div>
      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">{[0, 1, 2, 3].map((key) => <div key={key} className="h-20 animate-pulse rounded-2xl bg-paper" />)}</div>
      <div className="mt-3 text-[12px] text-ink-4">Uyum puanın hesaplanıyor...</div>
    </Card>;
  }

  if (isError) {
    return <Card className="soft-card overflow-hidden p-5"><div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="eyebrow flex items-center gap-2"><Target size={13} /> Plan Uyum Merkezi</div><p className="mt-2 max-w-md text-[13px] leading-5 text-ink-3">Uyum verilerin şu anda yüklenemedi. Bağlantını kontrol edip tekrar dene.</p></div>{onRetry && <button onClick={onRetry} className="shrink-0 rounded-xl bg-ink px-3 py-2 text-[12px] font-bold text-white">Tekrar dene</button>}</div></Card>;
  }

  if (result.plannedSessions === 0) {
    return <Card className="soft-card overflow-hidden p-5"><div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"><Target size={18} /></div><div><div className="eyebrow">Plan Uyum Merkezi</div><h2 className="mt-1 text-[16px] font-semibold text-ink">Henüz bu hafta için bir planın yok.</h2><p className="mt-1 max-w-md text-[13px] leading-5 text-ink-3">Bir haftalık plan oluşturduğunda oturum, süre, soru ve zamanında çalışma uyumun burada canlanacak.</p></div></div>{onCreatePlan && <button onClick={onCreatePlan} className="shrink-0 rounded-xl bg-pencil px-4 py-2.5 text-[12px] font-bold text-ink hover:bg-pencil-strong">Haftalık plan oluştur</button>}</div></Card>;
  }

  const scores = [{ label: "Oturum", value: result.sessionScore, detail: `${result.completedSessions}/${result.plannedSessions}` }, { label: "Süre", value: result.timeScore, detail: `${result.actualMinutes}/${result.plannedMinutes} dk` }, { label: "Soru", value: result.questionScore, detail: `${result.actualQuestions}/${result.targetQuestions}` }, { label: "Zamanında", value: result.punctualityScore, detail: `${result.rescheduledSessions} erteleme` }];
  const overallTone = adherenceTone(result.overallScore);

  return <div className="space-y-4">
    <Card className="soft-card overflow-hidden p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div><div className="eyebrow flex items-center gap-2"><Target size={13} /> Plan Uyum Merkezi</div><h2 className="mt-1 text-[23px] font-semibold text-ink font-display">Koçun ritmini izliyor.</h2><p className="mt-1 max-w-xl text-[12px] leading-5 text-ink-3">Uyum puanı sadece “kaç gün çalıştın” değil; oturum, süre, soru hedefi ve zamanında başlama davranışını birlikte değerlendirir.</p></div>
        <div className="flex items-center gap-4"><AdherenceRing value={result.overallScore} color={overallTone.color} />{onRefresh && <button onClick={onRefresh} disabled={isRefreshing} className="rounded-xl bg-ink px-3 py-2 text-[12px] font-bold text-white disabled:opacity-50">{isRefreshing ? "Analiz ediliyor" : "Koçu güncelle"}</button>}</div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4">{scores.map((score) => { const tone = adherenceTone(score.value); return <div key={score.label} className="rounded-2xl p-3 transition-colors" style={{ backgroundColor: tone.bg }}><div className="flex items-center justify-between"><span className="text-[12px] font-semibold text-ink-3">{score.label}</span><span className="text-[13px] font-bold" style={{ color: tone.color }}>%{score.value}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/60"><div className="h-full rounded-full transition-all" style={{ width: `${score.value}%`, background: tone.color }} /></div><div className="mt-2 text-[12px] text-ink-3">{score.detail}</div></div>; })}</div>
    </Card>
    <Card className="soft-card overflow-hidden p-5" style={{ borderLeft: `4px solid ${overallTone.color}` }}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundColor: overallTone.color }}><Sparkles size={16} /></div>
          <div className="min-w-0"><div className="eyebrow">AI koç kararı</div><h3 className="mt-1 text-[16px] font-semibold text-ink">{adherenceDecisionCopy[result.decision]}</h3><p className="mt-1.5 max-w-xl text-[13px] leading-5 text-ink-3">{result.summary}</p>{result.alerts[0] && <p className="mt-2 text-[12px] font-semibold text-ink-2">{result.alerts[0].title} — {result.alerts[0].message}</p>}</div>
        </div>
        <button onClick={() => toast(result.alerts[0]?.message || result.summary)} className="shrink-0 self-start rounded-lg px-3 py-2 text-[12px] font-bold text-white transition hover:opacity-90" style={{ backgroundColor: overallTone.color }}>{result.alerts[0]?.actionLabel || "Öneriyi gör"}</button>
      </div>
    </Card>
  </div>;
}
type LibraryBookOption = { key: string; title: string; subject: string; exam: string; topics: string[] };

/**
 * "Kütüphanemden oturum ekle" — takvime yeni, tek seferlik bir oturum
 * eklerken ders/konuyu elle yazdırmak yerine öğrencinin zaten sahip olduğu
 * kitaplardan (hem yeni kaynak kataloğu hem de eski statik katalog) türetir.
 * Konu bilgisi zaten veritabanında olduğu için (book_curriculum_topics /
 * bookTopicMappings) burada yeniden girilmesine gerek kalmaz.
 */
function LibrarySessionForm({ onClose, onCreatedLocal }: { onClose: () => void; onCreatedLocal: (session: CalendarSession) => void }) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const resourcesSnapshot = trpc.resources.snapshot.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const myLibrary = trpc.catalog.myLibrary.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const savePlan = trpc.calendar.savePlan.useMutation({ onSuccess: () => { utils.calendar.snapshot.invalidate(); toast.success("Oturum takvime eklendi."); onClose(); }, onError: () => toast.error("Oturum eklenemedi, tekrar dener misin?") });

  const legacyInventoryIds = user
    ? (resourcesSnapshot.data?.inventory ?? []).map((row) => row.bookId).filter((id) => !/^\d+$/.test(id))
    : getStoredValue<string[]>(localStorageKeys.bookInventory, []);
  const legacyOptions: LibraryBookOption[] = resourceBookCatalog
    .filter((book) => legacyInventoryIds.includes(book.id))
    .map((book) => ({ key: `legacy:${book.id}`, title: book.title, subject: book.subject, exam: book.exam, topics: (resourcesSnapshot.data?.mappings ?? []).filter((m) => m.bookId === book.id).map((m) => m.topic) }));
  const catalogOptions: LibraryBookOption[] = (myLibrary.data ?? []).map((book) => ({ key: `catalog:${book.bookId}`, title: book.name, subject: book.subject ?? "Genel", exam: book.examScope, topics: Array.from(new Set(book.topics.map((t) => t.topic))) }));
  const options = [...legacyOptions, ...catalogOptions];

  const [selectedKey, setSelectedKey] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [date, setDate] = useState(() => toLocalDateKey());
  const [minutes, setMinutes] = useState("40");
  const [kind, setKind] = useState("Soru");
  const selected = options.find((option) => option.key === selectedKey);

  const selectBook = (key: string) => {
    setSelectedKey(key);
    const book = options.find((option) => option.key === key);
    if (book) { setSubject(book.subject); setTopic(book.topics[0] ?? ""); }
  };

  const submit = () => {
    if (!selected || !subject.trim() || !topic.trim()) { toast.error("Kitap, ders ve konu seçmelisin."); return; }
    const plannedMinutes = Math.max(5, Number(minutes) || 40);
    const sessionDateIso = new Date(`${date}T09:00:00`).toISOString();
    const title = `${selected.title} · ${topic}`;
    if (user) {
      const weekStart = new Date(`${date}T00:00:00`);
      const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 1);
      savePlan.mutate({ title: "Kütüphanemden oturum", weekStart: weekStart.toISOString(), weekEnd: weekEnd.toISOString(), summary: `${selected.title} kaynağından manuel oturum.`, source: "manual", sessions: [{ sessionDate: sessionDateIso, title, subject, topic, kind, plannedMinutes }] });
    } else {
      onCreatedLocal({ id: `manual-${Date.now()}`, sessionDate: date, title, subject, topic, kind, plannedMinutes, status: "planned" });
      toast.success("Oturum takvime eklendi (demo modu).");
      onClose();
    }
  };

  return (
    <Card className="soft-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div><div className="eyebrow">Kütüphanemden oturum ekle</div><h2 className="mt-1 text-[16px] font-semibold text-ink">Sahip olduğun bir kaynaktan oturum oluştur.</h2></div>
        <button onClick={onClose} aria-label="Formu kapat" className="rounded-lg p-2 text-ink-3 hover:bg-paper"><X size={16} /></button>
      </div>
      {options.length === 0 ? (
        <div className="mt-4 rounded-2xl bg-paper p-5 text-[13px] leading-5 text-ink-3">Henüz kütüphanende kitap yok. Önce <strong className="font-semibold text-ink">Kaynak Kataloğu</strong>'ndan "Kütüphaneme ekle" ile birkaç kaynak seç.</div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-[12px] font-semibold text-ink-3">Kaynak
            <select value={selectedKey} onChange={(event) => selectBook(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-ink/10 px-3 text-[13px] text-ink-2">
              <option value="">Kitap seç…</option>
              {options.map((option) => <option key={option.key} value={option.key}>{option.title}</option>)}
            </select>
          </label>
          <label className="text-[12px] font-semibold text-ink-3">Ders
            <input value={subject} onChange={(event) => setSubject(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-ink/10 px-3 text-[13px] text-ink-2" />
          </label>
          {selected && selected.topics.length > 0 ? (
            <label className="text-[12px] font-semibold text-ink-3">Konu
              <select value={topic} onChange={(event) => setTopic(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-ink/10 px-3 text-[13px] text-ink-2">
                {selected.topics.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
          ) : (
            <label className="text-[12px] font-semibold text-ink-3">Konu
              <input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="Örn. Problemler" className="mt-1 h-10 w-full rounded-xl border border-ink/10 px-3 text-[13px] text-ink-2" />
            </label>
          )}
          <label className="text-[12px] font-semibold text-ink-3">Tarih
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-ink/10 px-3 text-[13px] text-ink-2" />
          </label>
          <label className="text-[12px] font-semibold text-ink-3">Süre (dk)
            <input type="number" min="5" value={minutes} onChange={(event) => setMinutes(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-ink/10 px-3 text-[13px] text-ink-2" />
          </label>
          <label className="text-[12px] font-semibold text-ink-3">Tür
            <select value={kind} onChange={(event) => setKind(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-ink/10 px-3 text-[13px] text-ink-2">
              <option value="Konu anlatımı">Konu anlatımı</option>
              <option value="Soru">Soru</option>
              <option value="Tekrar">Tekrar</option>
              <option value="Deneme analizi">Deneme analizi</option>
            </select>
          </label>
        </div>
      )}
      {options.length > 0 && <div className="mt-4 flex justify-end"><Button onClick={submit} disabled={savePlan.isPending} className="rounded-xl bg-pencil text-[12px] text-ink">{savePlan.isPending ? "Ekleniyor..." : "Takvime ekle"}</Button></div>}
    </Card>
  );
}

type RoutineHabitCardProps = {
  kind: string;
  icon: typeof Grid2X2;
  eyebrow: string;
  title: string;
  description: string;
  defaultMinutes: number;
  amountLabel: string;
  amountUnit: string;
  isPages?: boolean;
  showBookTitle?: boolean;
  todaysSession?: CalendarSession;
  onLoggedLocal: (session: CalendarSession) => void;
};

/**
 * Günlük alışkanlık kartı (paragraf pratiği / gece okuması) — "şimdi yaptım"
 * tarzı, tek adımda tamamlanmış bir oturum kaydeder (bkz. calendar.logRoutine).
 * İkisi de aynı yapıyı paylaştığı için parametreli tek bileşen olarak yazıldı.
 */
function RoutineHabitCard({ kind, icon: Icon, eyebrow, title, description, defaultMinutes, amountLabel, amountUnit, isPages, showBookTitle, todaysSession, onLoggedLocal }: RoutineHabitCardProps) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  // Süre alanı hedef dakikayla (defaultMinutes) ÖN DOLDURULMAZ — aksi halde
  // hiç yapılmadan "kaydet"e basmak bile plan uyum skoruna tam süre kredisi
  // yazardı. Boş bırakılırsa kayıt reddedilir (bkz. submit).
  const [minutes, setMinutes] = useState("");
  const [amount, setAmount] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const logRoutine = trpc.calendar.logRoutine.useMutation({ onSuccess: () => { utils.calendar.snapshot.invalidate(); toast.success("Kaydedildi; bugünkü rutin tamamlandı."); }, onError: () => toast.error("Kaydedilemedi, tekrar dener misin?") });
  const isDone = todaysSession?.status === "completed";

  const submit = () => {
    const parsedMinutes = Number(minutes);
    if (!minutes.trim() || !Number.isFinite(parsedMinutes) || parsedMinutes <= 0) { toast.error("Gerçekte kaç dakika yaptığını gir."); return; }
    const mins = Math.round(parsedMinutes);
    const value = Math.max(0, Number(amount) || 0);
    const topic = showBookTitle && bookTitle.trim() ? bookTitle.trim() : title;
    const note = showBookTitle && bookTitle.trim() ? `${bookTitle.trim()} · ${value} ${amountUnit}.` : `${value} ${amountUnit}.`;
    if (user) {
      logRoutine.mutate({ title, subject: "Rutin", topic, kind, plannedMinutes: defaultMinutes, actualMinutes: mins, actualPages: isPages ? value : undefined, note });
    } else {
      onLoggedLocal({ id: `routine-${kind}-${Date.now()}`, sessionDate: toLocalDateKey(), title, subject: "Rutin", topic, kind, plannedMinutes: defaultMinutes, status: "completed", actualMinutes: mins, actualPages: isPages ? value : undefined, note });
      toast.success("Kaydedildi (demo modu).");
    }
    setAmount(""); setBookTitle("");
  };

  return <Card className="soft-card p-5">
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"><Icon size={18} /></div>
      <div className="min-w-0 flex-1"><div className="eyebrow">{eyebrow}</div><h2 className="mt-1 text-[16px] font-semibold text-ink">{title}</h2><p className="mt-1 text-[12px] leading-5 text-ink-3">{description}</p></div>
    </div>
    {isDone ? (
      <div className="mt-4 flex items-center gap-2 rounded-2xl bg-success-soft p-4 text-[13px] font-semibold text-success"><CheckCircle2 size={16} className="shrink-0" /> Bugün tamamlandı — {todaysSession?.actualMinutes ?? 0} dk{typeof todaysSession?.actualPages === "number" ? ` · ${todaysSession.actualPages} sayfa` : ""}</div>
    ) : (
      <div className="mt-4 grid grid-cols-2 gap-3">
        {showBookTitle && <label className="col-span-2 text-[12px] font-semibold text-ink-3">Kitap adı (opsiyonel)<input value={bookTitle} onChange={(event) => setBookTitle(event.target.value)} placeholder="Şu an okuduğun kitap" className="mt-1 h-10 w-full rounded-xl border border-ink/10 px-3 text-[13px] text-ink-2" /></label>}
        <label className="text-[12px] font-semibold text-ink-3">Süre (dk) · hedef: {defaultMinutes}<input type="number" min="1" value={minutes} onChange={(event) => setMinutes(event.target.value)} placeholder="Gerçekte kaç dk?" className="mt-1 h-10 w-full rounded-xl border border-ink/10 px-3 text-[13px] text-ink-2" /></label>
        <label className="text-[12px] font-semibold text-ink-3">{amountLabel}<input type="number" min="0" value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-ink/10 px-3 text-[13px] text-ink-2" /></label>
        <Button onClick={submit} disabled={logRoutine.isPending} className="col-span-2 h-10 rounded-xl bg-pencil text-[12px] text-ink">{logRoutine.isPending ? "Kaydediliyor..." : "Bugün yaptım, kaydet"}</Button>
      </div>
    )}
  </Card>;
}

function CalendarView({ topics, onSection, onStartFocusSession }: { topics: Topic[]; onSection: (section: DashboardSection) => void; onStartFocusSession: (seed: FocusSessionSeed) => void }) {
  const { user } = useAuth();
  const [view, setView] = useState<"day" | "week" | "month">("week");
  const [selectedDate, setSelectedDate] = useState(() => toLocalDateKey());
  const [localSessions, setLocalSessions] = useState<CalendarSession[]>(() => getStoredValue<CalendarSession[]>(localStorageKeys.calendarSessions, [
    { id: "demo-1", sessionDate: toLocalDateKey(), title: "Problemler · temel tur", subject: "Matematik", topic: "Problemler", kind: "Soru", plannedMinutes: 40, targetQuestions: 20, status: "completed", actualMinutes: 42, actualQuestions: 20, correct: 13, wrong: 5, blank: 2 },
    { id: "demo-2", sessionDate: toLocalDateKey(Date.now() + 86400000), title: "Paragraf hız turu", subject: "Türkçe", topic: "Paragrafta anlam", kind: "Soru", plannedMinutes: 35, targetQuestions: 20, status: "planned" },
    { id: "demo-3", sessionDate: toLocalDateKey(Date.now() + 2 * 86400000), title: "İntegral tekrar", subject: "Matematik", topic: "İntegral", kind: "Tekrar", plannedMinutes: 30, targetQuestions: 10, status: "planned" },
  ]));
  const snapshot = trpc.calendar.snapshot.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const coachPeriod = useMemo(() => { const date = new Date(`${selectedDate}T12:00:00`); const mondayOffset = (date.getDay() + 6) % 7; const start = new Date(date); start.setDate(date.getDate() - mondayOffset); start.setHours(0, 0, 0, 0); const end = new Date(start); end.setDate(start.getDate() + 7); return { periodStart: start.toISOString(), periodEnd: end.toISOString() }; }, [selectedDate]);
  const coachSnapshot = trpc.calendar.coachSnapshot.useQuery(coachPeriod, { enabled: Boolean(user), retry: false });
  const refreshCoach = trpc.calendar.refreshCoach.useMutation({ onSuccess: () => { coachSnapshot.refetch(); toast.success("Koç kararı güncellendi; yeni önerilerin hazır."); }, onError: () => toast.error("Koç analizi şu an yenilenemedi.") });
  const utils = trpc.useUtils();
  const [completion, setCompletion] = useState<{ session: CalendarSession; actualMinutes: string; actualQuestions: string; correct: string; wrong: string; blank: string; note: string } | null>(null);
  const [showLibraryForm, setShowLibraryForm] = useState(false);
  const completeMutation = trpc.calendar.completeSession.useMutation({ onSuccess: () => { setCompletion(null); utils.calendar.snapshot.invalidate(); utils.bookContent.summaries.invalidate(); utils.bookContent.recommendations.invalidate(); coachSnapshot.refetch(); toast.success("Oturum tamamlandı; konu gelişim günlüğün ve uyum puanın güncellendi."); }, onError: () => toast.error("Oturum kaydedilemedi.") });
  // Bugünün Pusula Odak planı (8x40 dk) — günlük çalışma süresi hedefi ve
  // zayıf konu haritasından üretilir; ikisi de eksikse kütüphanedeki
  // kitapların derslerine düşer (spec: bkz. shared/focusPlan.ts).
  const onboardingProfile = trpc.onboarding.get.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const resourcesSnapshot = trpc.resources.snapshot.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const myLibrary = trpc.catalog.myLibrary.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const dailyPlanMutation = trpc.calendar.savePlan.useMutation({ onSuccess: () => { utils.calendar.snapshot.invalidate(); toast.success("Bugünün Pusula Odak planı oluşturuldu."); }, onError: () => toast.error("Plan oluşturulamadı, tekrar dener misin?") });
  const routineMutation = trpc.calendar.logRoutine.useMutation({ onSuccess: () => { utils.calendar.snapshot.invalidate(); toast.success("Kaydedildi; bugünkü rutin tamamlandı."); }, onError: () => toast.error("Kaydedilemedi, tekrar dener misin?") });
  const sessions = (user && snapshot.data ? snapshot.data.sessions : localSessions) as CalendarSession[];
  const logs = (user && snapshot.data ? snapshot.data.logs : localSessions.filter((session) => session.status === "completed").map((session) => ({ subject: session.subject, topic: session.topic, studyDate: session.sessionDate, minutes: session.actualMinutes || session.plannedMinutes, questions: session.actualQuestions || session.targetQuestions || 0, correct: session.correct || 0, wrong: session.wrong || 0, blank: session.blank || 0 }))) as TopicLog[];
  useEffect(() => { if (user) return; const today = new Date(); today.setHours(0, 0, 0, 0); const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1); const overdue = localSessions.some((session) => session.status === "planned" && new Date(`${dateKey(session.sessionDate)}T12:00:00`) < today); if (overdue) setLocalSessions((items) => items.map((session) => session.status === "planned" && new Date(`${dateKey(session.sessionDate)}T12:00:00`) < today ? { ...session, sessionDate: toLocalDateKey(tomorrow), rescheduledFrom: session.sessionDate, rescheduledAt: new Date().toISOString(), rescheduleCount: (session.rescheduleCount || 0) + 1 } : session)); }, [localSessions, user]);
  useEffect(() => { if (!user) localStorage.setItem(localStorageKeys.calendarSessions, JSON.stringify(localSessions)); }, [localSessions, user]);
  const dateKey = (value: string | Date) => toLocalDateKey(value);
  const todayKey = dateKey(new Date());
  const weakTopics = topics.filter((item) => item.status === "Zayıf").sort((a, b) => a.progress - b.progress);
  const legacyLibraryInventoryIds = user ? (resourcesSnapshot.data?.inventory ?? []).map((row) => row.bookId).filter((id) => !/^\d+$/.test(id)) : getStoredValue<string[]>(localStorageKeys.bookInventory, []);
  const libraryBooks = [
    ...resourceBookCatalog.filter((book) => legacyLibraryInventoryIds.includes(book.id)).map((book) => ({ subject: book.subject, title: book.title })),
    ...(myLibrary.data ?? []).map((book) => ({ subject: book.subject ?? "Genel", title: book.name })),
  ];
  const dailyStudyMinutes = onboardingProfile.data?.dailyStudyDuration ?? 240;
  // Profilde saat belirtilmediyse makul bir varsayılana (16:00) düşer — bu bir
  // "resmi" veri değil, salt UX varsayılanı; öğrenci onboarding'de gerçek
  // saatini girdiğinde plan onu kullanır (bkz. shared/onboarding.ts).
  const studyStartTime = onboardingProfile.data?.preferredStudyStartTime || "16:00";
  const generatedPlan = generateDailyFocusPlan(dailyStudyMinutes, weakTopics.map((item) => ({ subject: item.subject, topic: item.topic, progress: item.progress })), libraryBooks, { date: new Date(), startTime: studyStartTime });
  const todaysOdakSessions = sessions.filter((session) => session.kind === "Odak" && dateKey(session.sessionDate) === todayKey);
  const todaysParagraphSession = sessions.find((session) => session.kind === "Paragraf" && dateKey(session.sessionDate) === todayKey);
  const todaysReadingSession = sessions.find((session) => session.kind === "Kitap Okuma" && dateKey(session.sessionDate) === todayKey);
  const todaysAllSessions = sessions.filter((session) => dateKey(session.sessionDate) === todayKey);
  const { current: currentSession, next: nextSession } = findCurrentAndNextSession(todaysAllSessions, new Date());
  const formatTimeRange = (session: CalendarSession) => { const start = new Date(session.sessionDate); const end = new Date(start.getTime() + session.plannedMinutes * 60000); const fmt = (date: Date) => date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }); return `${fmt(start)}–${fmt(end)}`; };
  const generateTodaysPlan = () => {
    if (todaysOdakSessions.length > 0) { toast("Bugün için zaten bir Pusula Odak planın var."); return; }
    if (generatedPlan.length === 0) { toast.error("Plan oluşturmak için önce Konu Haritası'ndan birkaç konu değerlendir ya da Kaynak Kataloğu'ndan kitap ekle."); return; }
    if (user) {
      const weekStart = new Date(); weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 1);
      dailyPlanMutation.mutate({ title: "Günlük Pusula Odak Planı", weekStart: weekStart.toISOString(), weekEnd: weekEnd.toISOString(), summary: `${generatedPlan.length} oturum · günlük ${dailyStudyMinutes} dk hedefine göre, saat ${studyStartTime}'ten başlayarak otomatik oluşturuldu.`, source: "ai", sessions: generatedPlan.map((item, index) => ({ sessionDate: item.startsAt ?? new Date(Date.now() + index * 60000).toISOString(), title: item.title, subject: item.subject, topic: item.topic, kind: item.kind, plannedMinutes: item.plannedMinutes })) });
    } else {
      const created: CalendarSession[] = generatedPlan.map((item, index) => ({ id: `focus-plan-${Date.now()}-${index}`, sessionDate: item.startsAt ?? new Date().toISOString(), title: item.title, subject: item.subject, topic: item.topic, kind: item.kind, plannedMinutes: item.plannedMinutes, status: "planned" }));
      setLocalSessions((items) => [...items, ...created]);
      toast.success("Bugünün Pusula Odak planı oluşturuldu (demo modu).");
    }
  };
  const [showExtraForm, setShowExtraForm] = useState(false);
  const [extraSubject, setExtraSubject] = useState<string>(subjectOrder[0] ?? "Matematik");
  const [extraTopic, setExtraTopic] = useState("");
  const [extraMinutes, setExtraMinutes] = useState("30");
  const addExtraSession = () => {
    if (!extraTopic.trim()) { toast.error("Fazladan çalışmak istediğin konuyu yaz."); return; }
    const minutes = Math.max(5, Number(extraMinutes) || 30);
    const title = `${extraSubject} · ${extraTopic.trim()} (ekstra)`;
    if (user) {
      const weekStart = new Date(); weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 1);
      dailyPlanMutation.mutate({ title: "Fazladan oturum", weekStart: weekStart.toISOString(), weekEnd: weekEnd.toISOString(), summary: "Öğrencinin kendi eklediği ekstra oturum.", source: "manual", sessions: [{ sessionDate: new Date().toISOString(), title, subject: extraSubject, topic: extraTopic.trim(), kind: "Ekstra", plannedMinutes: minutes }] });
    } else {
      setLocalSessions((items) => [...items, { id: `extra-${Date.now()}`, sessionDate: toLocalDateKey(), title, subject: extraSubject, topic: extraTopic.trim(), kind: "Ekstra", plannedMinutes: minutes, status: "planned" }]);
      toast.success("Ekstra oturum eklendi (demo modu).");
    }
    setExtraTopic(""); setExtraMinutes("30"); setShowExtraForm(false);
  };
  const selected = new Date(`${selectedDate}T12:00:00`);
  const startOfWeek = new Date(selected); const mondayOffset = (startOfWeek.getDay() + 6) % 7; startOfWeek.setDate(startOfWeek.getDate() - mondayOffset); startOfWeek.setHours(12, 0, 0, 0);
  const weekDates = Array.from({ length: 7 }, (_, index) => { const date = new Date(startOfWeek); date.setDate(startOfWeek.getDate() + index); return date; });
  const startOfMonth = new Date(selected.getFullYear(), selected.getMonth(), 1, 12); const monthOffset = (startOfMonth.getDay() + 6) % 7; startOfMonth.setDate(startOfMonth.getDate() - monthOffset);
  const monthDates = Array.from({ length: 42 }, (_, index) => { const date = new Date(startOfMonth); date.setDate(startOfMonth.getDate() + index); return date; });
  const sessionsFor = (date: Date) => sessions.filter((session) => dateKey(session.sessionDate) === toLocalDateKey(date));
  // Akıllı Defter: görünen hafta + ay aralığındaki notlar ve tekrar tarihleri (yerel gün anahtarıyla).
  const notebook = useNotebook();
  const localDayKey = toLocalDateKey;
  const noteRange = useMemo(() => { const first = new Date(Math.min(monthDates[0].getTime(), weekDates[0].getTime())); first.setHours(0, 0, 0, 0); const last = new Date(Math.max(monthDates[41].getTime(), weekDates[6].getTime())); last.setHours(23, 59, 59, 999); return { from: first.toISOString(), to: last.toISOString() }; }, [selectedDate]);
  const noteCalendar = trpc.notes.calendar.useQuery(noteRange, { enabled: Boolean(user), retry: false });
  const noteCounts = useMemo(() => { const counts = new globalThis.Map<string, { notes: number; reviews: number }>(); /* "Map" burada lucide ikonu */ for (const date of noteCalendar.data?.notes ?? []) { const key = localDayKey(date); counts.set(key, { notes: (counts.get(key)?.notes ?? 0) + 1, reviews: counts.get(key)?.reviews ?? 0 }); } for (const date of noteCalendar.data?.reviews ?? []) { const key = localDayKey(date); counts.set(key, { notes: counts.get(key)?.notes ?? 0, reviews: (counts.get(key)?.reviews ?? 0) + 1 }); } return counts; }, [noteCalendar.data]);
  const noteBadge = (date: Date, compact = false) => { const count = noteCounts.get(localDayKey(date)); if (!count) return null; return <div className={`mt-1 flex flex-wrap gap-1 ${compact ? "text-[11px]" : "text-[12px]"}`}>{count.notes > 0 && <span className="rounded-md bg-warn-soft px-1.5 py-0.5 font-semibold text-warn" aria-label={`${count.notes} not`}>📒 {count.notes}{compact ? "" : " not"}</span>}{count.reviews > 0 && <span className="rounded-md bg-success-soft px-1.5 py-0.5 font-semibold text-success" aria-label={`${count.reviews} not tekrarı`}>🔁 {count.reviews}</span>}</div>; };
  const weekSessions = sessions.filter((session) => weekDates.some((date) => dateKey(session.sessionDate) === toLocalDateKey(date)));
  const weeklyLogs = logs.filter((log) => weekDates.some((date) => dateKey(log.studyDate) === toLocalDateKey(date)));
  const weeklyQuestions = weeklyLogs.reduce((sum, log) => sum + log.questions, 0);
  const weeklyAccuracy = weeklyQuestions ? Math.round(weeklyLogs.reduce((sum, log) => sum + log.correct, 0) / weeklyQuestions * 100) : 0;
  const adherence = calculatePlanAdherence(weekSessions, user && coachSnapshot.data ? coachSnapshot.data.averageAccuracy : weeklyAccuracy);
  const periodSessions = view === "day" ? sessionsFor(selected) : view === "week" ? weekSessions : sessions.filter((session) => { const date = new Date(session.sessionDate); return date.getFullYear() === selected.getFullYear() && date.getMonth() === selected.getMonth(); });
  const completedCount = periodSessions.filter((session) => session.status === "completed").length;
  const plannedMinutes = periodSessions.reduce((sum, session) => sum + session.plannedMinutes, 0);
  const actualMinutes = periodSessions.reduce((sum, session) => sum + (session.actualMinutes || 0), 0);
  const periodLogs = logs.filter((log) => periodSessions.some((session) => dateKey(session.sessionDate) === dateKey(log.studyDate) && session.topic === log.topic));
  const totalQuestions = periodLogs.reduce((sum, log) => sum + log.questions, 0);
  const accuracy = totalQuestions ? Math.round(periodLogs.reduce((sum, log) => sum + log.correct, 0) / totalQuestions * 100) : 0;
  const topicStats = Array.from(new Set(periodLogs.map((log) => `${log.subject}::${log.topic}`))).map((key) => { const [subject, topic] = key.split("::"); const rows = periodLogs.filter((log) => log.subject === subject && log.topic === topic); const questions = rows.reduce((sum, log) => sum + log.questions, 0); const correct = rows.reduce((sum, log) => sum + log.correct, 0); return { subject, topic, questions, accuracy: questions ? Math.round(correct / questions * 100) : 0, minutes: rows.reduce((sum, log) => sum + log.minutes, 0) }; }).sort((a, b) => b.questions - a.questions);
  const weeklyFocusLogs = logs.filter((log) => weekDates.some((date) => dateKey(log.studyDate) === toLocalDateKey(date)));
  const focusPalette = categoricalPalette;
  const focusSlices = Array.from(new Set(weeklyFocusLogs.map((log) => `${log.subject}::${log.topic}`))).map((key, index) => { const [subject, topic] = key.split("::"); const minutes = weeklyFocusLogs.filter((log) => log.subject === subject && log.topic === topic).reduce((sum, log) => sum + log.minutes, 0); return { subject, topic, minutes, color: focusPalette[index % focusPalette.length] }; }).filter((slice) => slice.minutes > 0).sort((a, b) => b.minutes - a.minutes);
  const focusTotal = focusSlices.reduce((sum, slice) => sum + slice.minutes, 0);
  const focusGradient = focusTotal ? `conic-gradient(${focusSlices.reduce((parts, slice, index) => { const start = focusSlices.slice(0, index).reduce((sum, item) => sum + item.minutes, 0) / focusTotal * 100; const end = (start + slice.minutes / focusTotal * 100); parts.push(`${slice.color} ${start}% ${end}%`); return parts; }, [] as string[]).join(", ")})` : palette.ink;
  // Süre alanı planlanan dakikayla ÖN DOLDURULMAZ — aksi halde formu hiç
  // değiştirmeden kaydetmek, hiç çalışılmamış bir oturuma bile plan uyum
  // skorunda %100 süre kredisi verir. Kullanıcı gerçekte kaç dakika
  // çalıştığını girmek zorunda (0 bırakırsa süre kredisi de 0 olur).
  const openCompletion = (session: CalendarSession) => { if (session.status === "completed") return; setCompletion({ session, actualMinutes: "", actualQuestions: String(session.targetQuestions || ""), correct: "", wrong: "", blank: "", note: "" }); };
  const saveCompletion = () => { if (!completion) return; const payload = { actualMinutes: Number(completion.actualMinutes) || 0, actualQuestions: Number(completion.actualQuestions) || 0, correct: Number(completion.correct) || 0, wrong: Number(completion.wrong) || 0, blank: Number(completion.blank) || 0, note: completion.note || undefined }; if (user && typeof completion.session.id === "number") completeMutation.mutate({ sessionId: completion.session.id, ...payload }); else { setLocalSessions((items) => items.map((item) => item.id === completion.session.id ? { ...item, status: "completed", ...payload } : item)); setCompletion(null); toast.success("Oturum tamamlandı; günlük istatistiklerin güncellendi."); } };
  const sessionTiming = (session: CalendarSession): "Şimdi" | "Sırada" | "Gecikti" | null => {
    if (session.status === "completed" || dateKey(session.sessionDate) !== todayKey) return null;
    if (currentSession?.id === session.id) return "Şimdi";
    if (nextSession?.id === session.id) return "Sırada";
    const end = new Date(session.sessionDate).getTime() + session.plannedMinutes * 60000;
    if (end < Date.now()) return "Gecikti";
    return null;
  };
  const timingBadgeClass: Record<string, string> = { Şimdi: "bg-success-soft text-success", Sırada: "bg-brand-soft text-brand", Gecikti: "bg-danger-soft text-danger" };
  const sessionCard = (session: CalendarSession) => { const timing = sessionTiming(session); return <div key={String(session.id)} className={`rounded-2xl border p-3 transition ${session.status === "completed" ? "border-success/20 bg-success-soft/60" : timing === "Şimdi" ? "border-brand/30 bg-brand-soft" : "border-ink/[0.07] bg-white"}`}><div className="flex items-start gap-3"><div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${session.status === "completed" ? "bg-success text-white" : "bg-brand-soft text-brand"}`}>{session.status === "completed" ? <CheckCircle2 size={16} /> : <Clock3 size={15} />}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-1.5"><div className={`text-[13px] font-semibold ${session.status === "completed" ? "text-success" : "text-ink-2"}`}>{session.title}</div>{timing && <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold ${timingBadgeClass[timing]}`}>{timing}</span>}{user && typeof session.id === "number" && <button type="button" onClick={(event) => { event.stopPropagation(); notebook.open({ prefill: { studySessionId: session.id as number, subject: session.subject, title: `${session.topic} notu` } }); }} className="rounded-full bg-warn-soft px-1.5 py-0.5 text-[11px] font-bold text-warn" aria-label="Bu oturum için not al">📝 Not al</button>}</div><div className="mt-1 text-[12px] text-ink-3">{formatTimeRange(session)} · {session.subject} · {session.topic} · {session.plannedMinutes} dk</div><div className="mt-2 flex flex-wrap gap-1.5 text-[12px] font-semibold text-brand">{session.targetQuestions ? <span className="rounded-md bg-brand-soft px-2 py-1">{session.targetQuestions} soru</span> : null}{session.targetPages ? <span className="rounded-md bg-warn-soft px-2 py-1">sf. {session.targetPages}</span> : null}{session.targetTests ? <span className="rounded-md bg-danger-soft px-2 py-1">test {session.targetTests}</span> : null}</div>{session.status === "completed" && <div className="mt-2 text-[12px] font-medium text-success">{session.actualQuestions || 0} soru · %{session.actualQuestions ? Math.round(((session.correct || 0) / session.actualQuestions) * 100) : 0} doğruluk</div>}{session.rescheduledFrom && session.status !== "completed" && <div className="mt-2 flex items-center gap-1 text-[12px] font-semibold text-warn"><History size={12} /> Ertelendi · yarına taşındı</div>}</div>{session.status !== "completed" && <div className="flex shrink-0 flex-col gap-1.5"><button onClick={() => onStartFocusSession({ sessionId: typeof session.id === "number" ? session.id : undefined, subject: session.subject, topic: session.topic, plannedMinutes: session.plannedMinutes, sessionDate: session.sessionDate })} className="rounded-lg bg-ink px-2.5 py-2 text-[12px] font-bold text-white">Odakla başlat</button><button onClick={() => openCompletion(session)} className="rounded-lg bg-pencil px-2.5 py-2 text-[12px] font-bold text-ink">Tamamla</button></div>}</div></div>; };
  return <div className="space-y-6 animate-page-in"><div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><div className="eyebrow mb-2">Çalışma takvimi</div><h1 className="page-heading">Ritmini gün gün gör.</h1><p className="page-subtitle">Planlanan oturumları tamamla; süre, soru ve doğruluk verilerin konu gelişim günlüğüne otomatik işlensin.</p></div><div className="flex flex-wrap items-center gap-2"><button onClick={() => setShowLibraryForm((value) => !value)} className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-ink/10 bg-white px-3 text-[12px] font-semibold text-ink-2 hover:bg-paper"><Library size={14} /> Kütüphanemden oturum ekle</button><div className="flex items-center gap-2 rounded-2xl bg-ink p-1"><button onClick={() => setView("day")} className={`rounded-xl px-3 py-2 text-[12px] font-semibold ${view === "day" ? "bg-white text-ink" : "text-white/60"}`}>Günlük</button><button onClick={() => setView("week")} className={`rounded-xl px-3 py-2 text-[12px] font-semibold ${view === "week" ? "bg-white text-ink" : "text-white/60"}`}>Haftalık</button><button onClick={() => setView("month")} className={`rounded-xl px-3 py-2 text-[12px] font-semibold ${view === "month" ? "bg-white text-ink" : "text-white/60"}`}>Aylık</button></div></div></div><div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Card className="soft-card p-4"><div className="text-[12px] text-ink-4">Tamamlanma</div><div className="mt-2 text-[28px] font-semibold text-ink font-display">{completedCount}/{periodSessions.length}</div><div className="mt-1 text-[12px] text-success">{periodSessions.length ? Math.round(completedCount / periodSessions.length * 100) : 0}% ritim</div></Card><Card className="soft-card p-4"><div className="text-[12px] text-ink-4">Çalışma süresi</div><div className="mt-2 text-[28px] font-semibold text-ink font-display">{formatMinutes(actualMinutes || plannedMinutes)}</div><div className="mt-1 text-[12px] text-ink-3">{actualMinutes ? "gerçekleşen" : "planlanan"}</div></Card><Card className="soft-card p-4"><div className="text-[12px] text-ink-4">Çözülen soru</div><div className="mt-2 text-[28px] font-semibold text-ink font-display">{totalQuestions}</div><div className="mt-1 text-[12px] text-brand">%{accuracy} doğruluk</div></Card><Card className="soft-card p-4"><div className="text-[12px] text-ink-4">Gelişim günlüğü</div><div className="mt-2 text-[28px] font-semibold text-ink font-display">{topicStats.length}</div><div className="mt-1 text-[12px] text-ink-3">konu kaydı</div></Card></div><Card className="soft-card p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="eyebrow flex items-center gap-2"><Zap size={13} /> Bugünün Pusula Odak Planı</div><h2 className="mt-1 text-[21px] font-semibold text-ink font-display">Günlük {dailyStudyMinutes} dk hedefin, {Math.max(1, Math.round(dailyStudyMinutes / 40))} oturuma bölünsün.</h2><p className="mt-1 max-w-xl text-[12px] leading-5 text-ink-3">Zayıf konularından ve kütüphanendeki kaynaklardan otomatik oluşturulur; her biri {40} dk. İstersen "Odakla başlat" ile doğrudan Pusula Odak'ı aç.</p></div>{todaysOdakSessions.length === 0 && <Button onClick={generateTodaysPlan} disabled={dailyPlanMutation.isPending} className="h-10 shrink-0 rounded-xl bg-ink px-4 text-[12px] font-semibold text-white">{dailyPlanMutation.isPending ? "Oluşturuluyor..." : "Bugünün planını oluştur"}</Button>}</div>{todaysOdakSessions.length > 0 && <div className="mt-4 grid gap-3 md:grid-cols-2">{todaysOdakSessions.map(sessionCard)}</div>}<div className="mt-5 border-t border-ink/[0.06] pt-4">{!showExtraForm ? <button onClick={() => setShowExtraForm(true)} className="inline-flex items-center gap-1.5 text-[12px] font-bold text-brand"><Plus size={14} /> Fazladan çalışmak istersen ders/konu seç</button> : <div className="grid gap-3 sm:grid-cols-[1fr_1.4fr_100px_auto]"><select value={extraSubject} onChange={(event) => setExtraSubject(event.target.value)} className="h-10 rounded-xl border border-ink/10 px-3 text-[13px] text-ink-2">{subjectOrder.map((subject) => <option key={subject} value={subject}>{subject}</option>)}</select><input value={extraTopic} onChange={(event) => setExtraTopic(event.target.value)} placeholder="Konu (örn. İntegral)" className="h-10 rounded-xl border border-ink/10 px-3 text-[13px] text-ink-2" /><input type="number" min="5" value={extraMinutes} onChange={(event) => setExtraMinutes(event.target.value)} className="h-10 rounded-xl border border-ink/10 px-3 text-[13px] text-ink-2" /><Button onClick={addExtraSession} className="h-10 rounded-xl bg-pencil text-[12px] text-ink">Ekle</Button></div>}</div></Card>
    {user && view === "day" && <DayNotes date={selectedDate} />}
    <PlanAdherenceCenter result={adherence} onRefresh={user ? () => refreshCoach.mutate(coachPeriod) : undefined} isRefreshing={refreshCoach.isPending} isLoading={Boolean(user) && snapshot.isLoading} isError={Boolean(user) && snapshot.isError} onRetry={() => snapshot.refetch()} onCreatePlan={() => onSection("plan")} />{showLibraryForm && <LibrarySessionForm onClose={() => setShowLibraryForm(false)} onCreatedLocal={(newSession) => setLocalSessions((items) => [...items, newSession])} />}{view === "day" && <Card className="soft-card p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="eyebrow">Günlük plan</div><h2 className="mt-1 text-[23px] font-semibold text-ink font-display">{selected.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })}</h2></div><input aria-label="Takvim günü" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="h-10 rounded-xl border border-ink/10 bg-white px-3 text-[12px] text-ink-2" /></div><div className="mt-5 space-y-2">{periodSessions.length ? periodSessions.map(sessionCard) : <div className="rounded-2xl bg-paper p-7 text-center text-[13px] text-ink-3">Bu gün için planlı oturum yok. AI Planım ekranından haftalık plan oluşturabilirsin.</div>}</div></Card>}{view === "week" && <Card className="soft-card p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="eyebrow">Haftalık ritim</div><h2 className="mt-1 text-[23px] font-semibold text-ink font-display">{weekDates[0].toLocaleDateString("tr-TR", { day: "numeric", month: "short" })} – {weekDates[6].toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}</h2></div><input aria-label="Takvim haftası" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="h-10 rounded-xl border border-ink/10 bg-white px-3 text-[12px] text-ink-2" /></div><div className="mt-5 grid gap-3 md:grid-cols-7">{weekDates.map((date) => { const daySessions = sessionsFor(date); return <button key={date.toISOString()} onClick={() => { setSelectedDate(toLocalDateKey(date)); setView("day"); }} className={`min-h-[170px] rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 ${toLocalDateKey(date) === selectedDate ? "border-brand/30 bg-brand-soft" : "border-ink/[0.07] bg-white"}`}><div className="flex items-center justify-between"><span className="text-[12px] font-bold text-ink-3">{date.toLocaleDateString("tr-TR", { weekday: "short" })}</span><span className="text-[12px] font-semibold text-ink">{date.getDate()}</span></div>{noteBadge(date)}<div className="mt-4 space-y-1.5">{daySessions.slice(0, 3).map((session) => <div key={String(session.id)} className={`rounded-lg px-2 py-1.5 text-[12px] ${session.status === "completed" ? "bg-success-soft text-success" : "bg-brand-soft text-brand"}`}><div className="truncate font-semibold">{session.topic}</div><div className="mt-0.5">{formatTimeRange(session)}</div></div>)}{daySessions.length > 3 && <div className="text-[12px] text-ink-4">+{daySessions.length - 3} oturum</div>}</div></button>; })}</div></Card>}{view === "month" && <Card className="soft-card p-5"><div className="flex items-center justify-between"><div><div className="eyebrow">Aylık görünüm</div><h2 className="mt-1 text-[23px] font-semibold capitalize text-ink font-display">{selected.toLocaleDateString("tr-TR", { month: "long", year: "numeric" })}</h2></div><input aria-label="Takvim ayı" type="month" value={selectedDate.slice(0, 7)} onChange={(event) => setSelectedDate(`${event.target.value}-01`)} className="h-10 rounded-xl border border-ink/10 bg-white px-3 text-[12px] text-ink-2" /></div><div className="mt-5 grid grid-cols-7 gap-1.5">{["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map((day) => <div key={day} className="p-2 text-center text-[12px] font-bold text-ink-4">{day}</div>)}{monthDates.map((date) => { const daySessions = sessionsFor(date); const inMonth = date.getMonth() === selected.getMonth(); return <button key={date.toISOString()} onClick={() => { setSelectedDate(toLocalDateKey(date)); setView("day"); }} className={`min-h-[80px] rounded-xl border p-2 text-left ${inMonth ? "border-ink/[0.07] bg-white" : "border-transparent bg-paper/60"}`}><div className={`text-[12px] font-semibold ${inMonth ? "text-ink-2" : "text-rule-strong"}`}>{date.getDate()}</div>{noteBadge(date, true)}<div className="mt-2 space-y-1">{daySessions.slice(0, 2).map((session) => <div key={String(session.id)} className={`h-1.5 rounded-full ${session.status === "completed" ? "bg-success" : "bg-brand"}`} />)}</div></button>; })}</div></Card>}<Card className="soft-card p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><div className="eyebrow">Odak geçmişi</div><h2 className="mt-1 text-[23px] font-semibold text-ink font-display">Bu hafta zamanın nereye gitti?</h2><p className="mt-1 text-[12px] text-ink-3">Ders ve konu bazında tamamlanan odak oturumlarının süre dağılımı.</p></div><div className="rounded-xl bg-paper px-3 py-2 text-right"><div className="text-[21px] font-semibold text-ink font-display">{focusTotal} dk</div><div className="text-[12px] text-ink-3">toplam odak</div></div></div>{focusSlices.length ? <div className="mt-5 grid items-center gap-6 md:grid-cols-[190px_1fr]"><div className="mx-auto flex h-44 w-44 items-center justify-center rounded-full" style={{ background: focusGradient }}><div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white"><div className="text-[21px] font-semibold text-ink font-display">{focusSlices.length}</div><div className="text-[12px] text-ink-3">konu</div></div></div><div className="grid gap-3 sm:grid-cols-2">{focusSlices.slice(0, 8).map((slice) => <div key={`${slice.subject}-${slice.topic}`} className="flex items-center gap-2"><span className="h-3 w-3 shrink-0 rounded-full" style={{ background: slice.color }} /><div className="min-w-0 flex-1"><div className="truncate text-[12px] font-semibold text-ink-2">{slice.topic}</div><div className="text-[12px] text-ink-3">{slice.subject}</div></div><span className="text-[12px] font-bold text-ink">{slice.minutes} dk</span></div>)}</div></div> : <div className="mt-5 rounded-2xl bg-paper p-8 text-center text-[13px] text-ink-3">Bu hafta odak oturumu tamamladığında ders ve konu süre dağılımını burada göreceksin.</div>}</Card><div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]"><Card className="soft-card p-5"><div className="eyebrow">Konu gelişim günlüğü</div><h2 className="mt-1 text-[23px] font-semibold text-ink font-display">Çalıştıkça netleşen ilerleme.</h2><div className="mt-5 space-y-3">{topicStats.length ? topicStats.slice(0, 6).map((stat) => <div key={`${stat.subject}-${stat.topic}`} className="rounded-2xl bg-paper p-3"><div className="flex items-center justify-between"><div><div className="text-[13px] font-semibold text-ink-2">{stat.topic}</div><div className="mt-1 text-[12px] text-ink-3">{stat.subject} · {stat.minutes} dk · {stat.questions} soru</div></div><span className={`rounded-full px-2 py-1 text-[12px] font-bold ${stat.accuracy >= 75 ? "bg-success-soft text-success" : stat.accuracy >= 55 ? "bg-warn-soft text-warn" : "bg-danger-soft text-danger"}`}>%{stat.accuracy}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, stat.accuracy)}%` }} /></div></div>) : <div className="rounded-2xl bg-paper p-5 text-[13px] text-ink-3">Oturum tamamladığında konu bazlı süre, soru ve doğruluk grafikleri burada oluşacak.</div>}</div></Card><Card className="soft-card p-5"><div className="eyebrow">Takip özeti</div><h2 className="mt-1 text-[23px] font-semibold text-ink font-display">Bu dönemde ne değişti?</h2><div className="mt-5 space-y-3"><div className="rounded-2xl border border-success/15 bg-success-soft/60 p-4"><div className="text-[12px] font-bold text-success">Gelişim sinyali</div><p className="mt-2 text-[13px] leading-5 text-ink-2">{completedCount ? `${completedCount} oturum tamamlandı ve konu günlüğüne işlendi.` : "İlk oturumunu tamamladığında gelişim sinyalini burada göreceksin."}</p></div><div className="rounded-2xl border border-brand/10 bg-brand-soft p-4"><div className="text-[12px] font-bold text-brand">Plan uyumu</div><p className="mt-2 text-[13px] leading-5 text-ink-2">{plannedMinutes ? `${formatMinutes(actualMinutes)} gerçekleşen süre / ${formatMinutes(plannedMinutes)} planlanan süre.` : "Takvimine AI planından oturum ekle."}</p></div></div></Card></div><div className="grid gap-5 lg:grid-cols-2">
      <RoutineHabitCard kind="Paragraf" icon={PenLine} eyebrow="Günlük alışkanlık" title="Paragraf pratiği" description="Her gün en az 20 dk paragraf sorusu çöz; okuduğunu anlama hızın YKS Türkçe ve sınav genelinde en çok fark yaratan beceri." defaultMinutes={20} amountLabel="Kaç paragraf çözdün?" amountUnit="paragraf çözüldü" todaysSession={todaysParagraphSession} onLoggedLocal={(session) => setLocalSessions((items) => [...items, session])} />
      <RoutineHabitCard kind="Kitap Okuma" icon={Moon} eyebrow="Günlük alışkanlık" title="Gece okuması" description="Her gece yatmadan önce mutlaka birkaç sayfa kitap oku; ekran molası ver ve okuduğun süre ile sayfayı bizimle paylaş." defaultMinutes={20} amountLabel="Kaç sayfa okudun?" amountUnit="sayfa okundu" isPages showBookTitle todaysSession={todaysReadingSession} onLoggedLocal={(session) => setLocalSessions((items) => [...items, session])} />
    </div>
    {completion && <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4"><Card className="w-full max-w-lg p-6 shadow-2xl"><div className="flex items-start justify-between"><div><div className="eyebrow">Oturumu kapat</div><h2 className="mt-1 text-[23px] font-semibold text-ink font-display">{completion.session.title}</h2><p className="mt-1 text-[12px] text-ink-3">Sonuçlarını gir; konu gelişim günlüğü otomatik güncellensin.</p></div><button onClick={() => setCompletion(null)} aria-label="Formu kapat" className="rounded-lg p-2 text-ink-3 hover:bg-paper"><X size={16} /></button></div><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">{[["actualMinutes", "Süre (dk)"], ["actualQuestions", "Çözülen soru"], ["correct", "Doğru"], ["wrong", "Yanlış"], ["blank", "Boş"]].map(([key, label]) => <label key={key} className="text-[12px] font-semibold text-ink-3">{label}{key === "actualMinutes" ? ` · plan: ${completion.session.plannedMinutes} dk` : ""}<input type="number" min="0" value={completion[key as keyof typeof completion] as string} onChange={(event) => setCompletion((current) => current ? { ...current, [key]: event.target.value } : current)} placeholder={key === "actualMinutes" ? "Gerçekte kaç dk çalıştın?" : undefined} className="mt-1 h-10 w-full rounded-xl border border-ink/10 px-3 text-[13px] text-ink-2" /></label>)}</div><label className="mt-3 block text-[12px] font-semibold text-ink-3">Kısa not<textarea value={completion.note} onChange={(event) => setCompletion((current) => current ? { ...current, note: event.target.value } : current)} placeholder="Bugün neyi daha iyi anladın?" className="mt-1 min-h-20 w-full rounded-xl border border-ink/10 p-3 text-[13px] text-ink-2" /></label><div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setCompletion(null)} className="rounded-xl text-[12px]">Vazgeç</Button><Button onClick={saveCompletion} disabled={completeMutation.isPending} className="rounded-xl bg-pencil text-[12px] text-ink">{completeMutation.isPending ? "Kaydediliyor..." : "Gelişime ekle"}</Button></div></Card></div>}</div>;
}

function Sidebar({ section, onSection, userName, onStartSession, isAdmin, weakTopicCount, signedIn }: { section: DashboardSection; onSection: (section: DashboardSection) => void; userName?: string | null; onStartSession: () => void; isAdmin?: boolean; weakTopicCount: number; signedIn: boolean }) {
  const navItems = isAdmin ? [...appNavSections, adminNavSection] : appNavSections;
  const onboarding = trpc.onboarding.get.useQuery(undefined, { enabled: signedIn, retry: false });
  const targetLine = signedIn
    ? [onboarding.data?.targetScoreType ? TARGET_SCORE_TYPE_LABELS[onboarding.data.targetScoreType] : null, onboarding.data?.targetRanking ? `İlk ${onboarding.data.targetRanking}` : null].filter(Boolean).join(", ")
    : defaultDashboardUser.target;
  return (
    <aside className="app-sidebar">
      <Brand />
      <nav className="mt-8 space-y-0.5" aria-label="Bölümler">
        {navItems.map((item) => { const Icon = sectionIcons[item.key]; const active = section === item.key; return (
          <button key={item.key} onClick={() => onSection(item.key)} aria-current={active ? "page" : undefined} className={`nav-item ${active ? "is-active" : ""}`}>
            <Icon size={18} strokeWidth={active ? 2.2 : 1.8} /><span>{item.label}</span>
            {item.key === "topics" && weakTopicCount > 0 && <span className="ml-auto rounded-full bg-danger-soft px-2 py-0.5 text-[12px] font-semibold text-danger" title={`${weakTopicCount} zayıf konu`}>{weakTopicCount}</span>}
          </button>
        ); })}
      </nav>
      <div className="mt-6 space-y-0.5 border-t border-rule pt-6">
        <button onClick={() => onSection("exams")} className="quick-nav"><Plus size={17} /> Deneme sonucu ekle</button>
        <button onClick={onStartSession} className="quick-nav"><Clock3 size={17} /> Odak oturumu başlat</button>
      </div>
      <div className="sidebar-bottom pt-6">
        {signedIn ? (
          <div className="flex items-center gap-3 px-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-[13px] font-semibold text-surface">{getInitials(userName)}</div>
            <div className="min-w-0">
              <div className="truncate text-[14px] font-semibold text-ink">{getDisplayName(userName)}</div>
              {targetLine && <div className="truncate text-[13px] text-ink-3">{targetLine}</div>}
            </div>
          </div>
        ) : (
          <div className="rounded-[10px] bg-pencil-soft p-4">
            <p className="text-[14px] leading-5 text-ink-2">Şu an demo verisini görüyorsun. Giriş yapınca kendi planın ve denemelerin görünür.</p>
            <button onClick={() => startLogin()} className="mt-3 h-9 w-full rounded-[10px] bg-ink text-[14px] font-semibold text-surface hover:bg-ink-2">Giriş yap</button>
          </div>
        )}
      </div>
    </aside>
  );
}

export default function Home() {
  const { user, logout } = useAuth();
  // Anket (onboarding) bitince App.tsx bir kerelik sessionStorage bayrağı
  // bırakır; burada onu tüketip kullanıcıyı doğrudan Kaynaklar sekmesine
  // yönlendiriyoruz ki elindeki kitapları seçmesi istensin (bkz. Resources).
  const [section, setSection] = useState<DashboardSection>(() => {
    if (typeof window === "undefined") return "overview";
    try {
      if (window.sessionStorage.getItem(postOnboardingNudgeKey)) {
        window.sessionStorage.removeItem(postOnboardingNudgeKey);
        return "resources";
      }
    } catch {}
    return "overview";
  });
  const [topics, setTopics] = useState<Topic[]>(() => getStoredValue(localStorageKeys.topics, initialTopics));
  const [exams, setExams] = useState<MockExam[]>(() => getStoredValue(localStorageKeys.exams, initialExams));
  const [mobileMenu, setMobileMenu] = useState(false);
  const [session, setSession] = useState(false);
  const [focusSeed, setFocusSeed] = useState<FocusSessionSeed | null>(null);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  // `initialExams` (demo/örnek veri) yalnızca ÇIKIŞ YAPMAMIŞ ziyaretçi için bir
  // önizleme. Bu bayrak, mount anında localStorage'da GERÇEKTEN misafir olarak
  // birikmiş veri olup olmadığını — aşağıdaki "her değişiklikte localStorage'a
  // yaz" efektinden ÖNCE, tek seferlik — yakalar; aksi halde her yeni oturum
  // demo veriyi "misafirin kendi verisi" sanıp hesaba yükler (bkz. aşağıdaki
  // exam migrasyon efekti).
  const hadPersistedExamsRef = useRef(typeof window !== "undefined" && window.localStorage.getItem(localStorageKeys.exams) !== null);
  const examSnapshot = trpc.exams.snapshot.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const importExams = trpc.exams.importMany.useMutation();
  const migratedExams = useRef(false);
  const topicProgressSnapshot = trpc.topics.progress.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const appliedTopicProgress = useRef(false);

  useEffect(() => { localStorage.setItem(localStorageKeys.topics, JSON.stringify(topics)); }, [topics]);
  useEffect(() => { localStorage.setItem(localStorageKeys.exams, JSON.stringify(exams)); }, [exams]);
  // Hesabın hiç denemesi yoksa VE tarayıcıda gerçekten misafirken birikmiş
  // (demo sabiti DEĞİL) yerel deneme varsa, o gerçek veriyi hesaba taşı;
  // aksi halde (yeni hesap + taze tarayıcı) sıfır deneme olarak kalsın —
  // demo sabitini asla hesaba yazma.
  useEffect(() => {
    if (!user || !examSnapshot.data || migratedExams.current) return;
    migratedExams.current = true;
    if (examSnapshot.data.length > 0) { setExams(examSnapshot.data as MockExam[]); return; }
    if (hadPersistedExamsRef.current && exams.length > 0) { importExams.mutate({ exams: exams.map(examToPersistenceInput) }); return; }
    setExams([]);
  }, [user, examSnapshot.data]);
  // Konu ilerlemesi tamamen sunucudan gelir (misafir konu durumu hiçbir
  // zaman hesaba yüklenmez — böyle bir mutation da yok) — bu yüzden giriş
  // yapan her kullanıcı için, ne kadar boş olursa olsun (yeni hesap = tüm
  // konular %0/"veri yetersiz"), `topics` TAMAMEN sunucu verisiyle
  // değiştirilir; demo sabitindeki uydurma yüzdeler asla görünmez.
  useEffect(() => {
    if (!user || !topicProgressSnapshot.data || appliedTopicProgress.current) return;
    appliedTopicProgress.current = true;
    const accentBySubject: Record<string, Topic["accent"]> = { Türkçe: "coral", Matematik: "blue", Fen: "mint", Sosyal: "yellow", Fizik: "lilac", Kimya: "mint", Biyoloji: "mint" };
    setTopics(topicProgressSnapshot.data.map((row) => ({ id: row.slug, exam: row.exam, subject: row.subject, topic: row.topic, unit: row.unit, progress: row.progress, status: row.status, insufficientData: row.insufficientData, accent: accentBySubject[row.subject] ?? "blue" })));
  }, [user, topicProgressSnapshot.data]);
  useEffect(() => { document.title = "Pusula YKS · Kişisel çalışma koçu"; }, []);

  const navigate = (next: DashboardSection) => { setSection(next); setMobileMenu(false); window.setTimeout(() => document.getElementById(next)?.scrollIntoView({ behavior: "smooth", block: "start" }), 30); };
  const startSession = (seed?: FocusSessionSeed) => { setFocusSeed(seed ?? null); setSession(true); };
  const displayName = user?.name || defaultDashboardUser.name;

  const isAdmin = user?.role === "admin";
  const weakTopicCount = topics.filter((item) => item.status === "Zayıf" && !item.insufficientData).length;
  const navSectionsForUser = isAdmin ? [...appNavSections, adminNavSection] : appNavSections;
  return <NotebookProvider enabled={Boolean(user)}><div className="app-shell"><Sidebar section={section} onSection={navigate} userName={displayName} onStartSession={() => startSession()} isAdmin={isAdmin} weakTopicCount={weakTopicCount} signedIn={Boolean(user)} /><main className="app-main"><header className="topbar"><button onClick={() => setMobileMenu((value) => !value)} className="mobile-menu-button" aria-label="Menüyü aç"><Menu size={18} /></button><div className="topbar-context"><span className="topbar-title">{navSectionsForUser.find((item) => item.key === section)?.label}</span></div><div className="topbar-actions">{!user && <span className="demo-chip">Demo verisi</span>}{user ? <DropdownMenu><DropdownMenuTrigger asChild><button className="profile-button"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-[12px] font-bold text-white">{getInitials(displayName)}</span><span className="hidden text-[14px] font-semibold text-ink-2 md:block">{getDisplayName(displayName)}</span><ChevronDown size={14} className="hidden text-ink-4 md:block" /></button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => setShowProfileEdit(true)}><UserRound size={14} className="mr-2" /> Profili düzenle</DropdownMenuItem>{user.loginMethod?.startsWith("dev") && <DropdownMenuItem onClick={() => setShowPasswordChange(true)}><KeyRound size={14} className="mr-2" /> Şifre değiştir</DropdownMenuItem>}<DropdownMenuItem onClick={() => logout()}><LogOut size={14} className="mr-2" /> Çıkış yap</DropdownMenuItem></DropdownMenuContent></DropdownMenu> : <button onClick={() => startLogin()} className="h-9 rounded-[10px] bg-ink px-4 text-[14px] font-semibold text-surface hover:bg-ink-2">Giriş yap</button>}</div></header>{mobileMenu && <div className="mobile-nav">{navSectionsForUser.map((item) => <button key={item.key} onClick={() => navigate(item.key)} className={section === item.key ? "is-active" : ""}>{item.label}</button>)}</div>}<div className="content-wrap">{section === "overview" && <Overview topics={topics} exams={exams} onSection={navigate} onStartSession={startSession} />}{section === "topics" && <Topics topics={topics} setTopics={setTopics} onSection={navigate} />}{section === "exams" && <Exams topics={topics} exams={exams} setExams={setExams} setTopics={setTopics} persistExams={importExams.mutate} />}{section === "resources" && <Resources topics={topics} exams={exams} onSection={navigate} />}{section === "catalog" && <ResourceCatalogSection />}{section === "plan" && <AiPlan topics={topics} exams={exams} />}{section === "calendar" && <CalendarView topics={topics} onSection={navigate} onStartFocusSession={startSession} />}{section === "notebook" && (user ? <NotebookSection /> : <div className="soft-card p-8 text-center text-[14px] text-ink-3">Defteri kullanmak için giriş yapmalısın.</div>)}{section === "premium" && <PaywallSection />}{section === "admin" && isAdmin && <AdminPanel />}<footer className="mt-12 flex flex-col gap-3 border-t border-ink/[0.06] py-6 text-[12px] text-ink-4 sm:flex-row sm:items-center sm:justify-between"><span>{footerDisclaimer}</span><span>Konu kapsamı ÖSYM ve MEB programlarına dayanır.</span></footer></div></main>{session && <FocusMode user={user} topics={topics} initialSession={focusSeed} onClose={() => { setSession(false); setFocusSeed(null); }} onGoToCalendar={() => { setSession(false); setFocusSeed(null); navigate("calendar"); }} />}{showPasswordChange && <ChangePasswordDialog onClose={() => setShowPasswordChange(false)} />}{showProfileEdit && <Dialog open onOpenChange={(open) => !open && setShowProfileEdit(false)}><DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl"><DialogTitle>Profilini güncelle</DialogTitle><DialogDescription>Onboarding sırasında verdiğin yanıtları buradan gözden geçirip güncelleyebilirsin.</DialogDescription><OnboardingFlow userName={displayName} startAtStep={0} onClose={() => setShowProfileEdit(false)} onComplete={() => setShowProfileEdit(false)} /></DialogContent></Dialog>} </div></NotebookProvider>;
}
