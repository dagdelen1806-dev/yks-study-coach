import { useAuth } from "@/_core/hooks/useAuth";
import { TARGET_SCORE_TYPE_LABELS } from "@shared/onboarding";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BookContentBadge, BookDetailDialog, BookRecommendationsCard } from "@/components/books/BookLibrary";
import type { ScannerBook } from "@/components/books/BookContentScanner";
import type { CoverDraft } from "@/components/books/AddBookWizard";
import { isSameBook } from "@shared/bookIdentity";
import ChangePasswordDialog from "@/components/auth/ChangePasswordDialog";
import NotebookSection, { DayNotes, ReviewDueNotes } from "@/components/notebook/NotebookSection";
import { AmbientSoundControl } from "@/components/focusAura/AmbientSoundControl";
import { useAmbientSound } from "@/components/focusAura/useAmbientSound";
import { NotebookProvider, useNotebook } from "@/components/notebook/NotebookProvider";
import { NOTEBOOK_REVIEW_TASK_KIND } from "@shared/questionNotebook";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  CalendarClock,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  Flame,
  Grid2X2,
  GraduationCap,
  Library,
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
  ShieldCheck,
  Sparkles,
  Target,
  Upload,
  History,
  TrendingDown,
  Trophy,
  UserRound,
  Users,
  X,
  Zap,
  Building2,
  MessageSquareQuote,
} from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { SECTION_PATHS, sectionFromPath } from "@/lib/sections";
import Illustration, { ILLUSTRATIONS } from "@/components/app/Illustration";
import NotificationBell from "@/components/app/NotificationBell";
import { StudentAvatar } from "@/components/app/Avatar";
import Overview, { type FocusSessionSeed } from "@/pages/overview/Overview";
import { Bar100, PageHeader, Segmented, StatCard, primaryButton, secondaryButton } from "@/components/app/kit";
import ReadingBookDialog from "@/components/app/ReadingBookDialog";
import MyOrganizationDialog from "@/components/app/MyOrganizationDialog";
import ParentAccessDialog from "@/components/app/ParentAccessDialog";
import TestimonialDialog from "@/components/app/TestimonialDialog";
import { readingProgressLabel } from "@shared/reading";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DEFAULT_FOCUS_AURA_CONFIG } from "@/lib/focusAura";
import { useFocusClock } from "@/hooks/useFocusClock";
import { calculatePlanAdherence, type AdherenceDecision, type AdherenceResult } from "../../../shared/planAdherence";
import { buildTytTemplateTopicDetails, groupTopicDetailsBySubject, TYT_TEMPLATE_MISSING_NOTE } from "../../../shared/tytExamTemplate";
import { buildLgsTemplateTopicDetails } from "@shared/lgsExamTemplate";
import { kindsOf, subjectNamesOf, trackSubjects, type ExamKind } from "@shared/exams";
import { useExamTrack } from "@/hooks/useExamTrack";
import { FOCUS_BREAK_MINUTES, selectTopicsForAiPlan, buildSubjectTopicMap, findCurrentAndNextSession, generateDailyFocusPlan, type SubjectTopicMap } from "../../../shared/focusPlan";
import { scheduleSubjectsFor, computeFreeSlots, findClassConflict, freeMinutes, fromMinutes, placeVariableSessions, toMinutes } from "@shared/classSchedule";
import TimeGrid, { type TimelineSession } from "@/components/calendar/TimeGrid";
import { resolveBookTarget } from "../../../shared/planTargets";
import { deriveTopicStatus, statusAfterAbandonedSession } from "../../../shared/topicStatus";
import { palette, categoricalPalette } from "@shared/palette";
import {
  appNavSections,
  calculateTopicResult,
  footerDisclaimer,
  formatDayRange,
  formatExamDate,
  formatPercent,
  formatMinutes,
  getColorForSubject,
  getDisplayName,
  getInitials,
  getStatusFromProgress,
  getStoredValue,
  localStorageKeys,
  netDeltaLabel,
  postOnboardingNudgeKey,
  resourceBookCatalog,
  scopeSources,
  statusLegend,
  statusMeta,
  adminNavSection,
  chartLabels,
  subjectColors,
  subjectOrder,
  trackedTopics,
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
} from "@shared/yksData";

// İlk açılışta gerekmeyen bölüm ve pencereler ayrı parçalar halinde, ihtiyaç anında yüklenir.
const ExamsDashboard = lazy(() => import("@/pages/exams/ExamsDashboard"));
const TopicMap = lazy(() => import("@/pages/topics/TopicMap"));
const ResourceCatalogSection = lazy(() => import("@/components/resourceCatalog/ResourceCatalogSection"));
const PaywallSection = lazy(() => import("@/components/subscription/PaywallSection"));
const AdminPanel = lazy(() => import("@/components/subscription/AdminPanel"));
const OnboardingFlow = lazy(() => import("@/components/onboarding/OnboardingFlow"));
const FocusAuraVideo = lazy(() => import("@/components/focusAura/FocusAuraVideo"));
const ClassScheduleEditor = lazy(() => import("@/components/calendar/ClassScheduleEditor"));
const AddBookWizard = lazy(() => import("@/components/books/AddBookWizard"));
const ReminderSettingsDialog = lazy(() => import("@/components/app/ReminderSettingsDialog"));
const SectionLoading = () => <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-label="Yükleniyor"><span className="h-7 w-7 animate-spin rounded-full border-2 border-brand border-t-transparent" /></div>;

type ExamForm = {
  title: string;
  date: string;
  exam: ExamKind;
  /** Ders adı → net / dakika (dersler sınav türünden: shared/exams.ts). */
  subjectNets: Record<string, string>;
  subjectTimes: Record<string, string>;
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
// Haritası'ndan, sabit S olmadan) korunuyor. LGS'de satırlar 8. sınıf
// müfredatından gelir (shared/lgsExamTemplate.ts); S'yi öğrenci girer.
const buildTopicDetailsForExam = (examType: ExamKind, allTopics: Topic[]): ExamTopicResult[] =>
  examType === "TYT"
    ? buildTytTemplateTopicDetails()
    : examType === "LGS"
      ? buildLgsTemplateTopicDetails()
      : allTopics.filter((item) => item.exam === examType).map(({ subject, topic }) => ({ subject, topic, questionCount: 0, correct: 0, wrong: 0, blank: 0, accuracy: 0, net: 0 }));
/** TYT ve LGS satırları ders > kategori > konu gruplu tabloda gösterilir. */
const usesGroupedTemplate = (exam: ExamKind) => exam === "TYT" || exam === "LGS";

const emptySubjectFields = (exam: ExamKind) => Object.fromEntries(subjectNamesOf(exam).map((subject) => [subject, ""]));

const createBlankExamForm = (allTopics: Topic[], exam: ExamKind = "TYT"): ExamForm => {
  const topicDetails = buildTopicDetailsForExam(exam, allTopics);
  return {
    title: "",
    date: toLocalDateKey(),
    exam,
    subjectNets: emptySubjectFields(exam),
    subjectTimes: emptySubjectFields(exam),
    topicNets: Object.fromEntries(topicDetails.map(({ topic }) => [topic, ""])),
    topicDetails,
    notes: "",
    importedFrom: "manual",
  };
};

const examToPersistenceInput = (exam: MockExam) => ({
  title: exam.title,
  exam: exam.exam || "TYT",
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
  const { track } = useExamTrack();
  return (
    <div className="flex items-center gap-3 px-1.5">
      <div className="brand-tile"><GraduationCap size={22} strokeWidth={2} /></div>
      <div className="min-w-0">
        <div className="font-display text-[20px] font-extrabold leading-none text-ink">Pusula</div>
        <div className="mt-1 text-[12px] font-medium text-ink-3">Kişisel {track} koçun</div>
      </div>
    </div>
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

function TytTopicTemplateTable({ exam, topicDetails, updateDetail, removeRow }: { exam: ExamKind; topicDetails: ExamTopicResult[]; updateDetail: (index: number, field: keyof ExamTopicResult, value: string) => void; removeRow: (index: number) => void }) {
  const grouped = useMemo(() => groupTopicDetailsBySubject(topicDetails, exam), [topicDetails, exam]);
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
            <td className="px-3 py-2 text-[12px] font-bold text-white">{exam} {subjectGroup.subject}</td>
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
  const logTopicResult = trpc.topics.logResult.useMutation();
  const [open, setOpen] = useState(false);
  const { track: examTrack, kinds: examKinds } = useExamTrack();
  const scanSubjects = trackSubjects(examTrack);
  const [form, setForm] = useState<ExamForm>(() => createBlankExamForm(topics, examKinds[0]));
  // Profil (YKS/LGS) sonradan yüklenirse boş form o sınava göre yeniden kurulur.
  useEffect(() => { if (!examKinds.includes(form.exam)) setForm(createBlankExamForm(topics, examKinds[0])); }, [examKinds[0]]);
  // Sınav türü değişince konu satırları o türün (TYT/AYT) gerçek konularıyla
  // yeniden kurulur — henüz hiçbir satıra veri girilmediyse (sıfırdan
  // başlıyorsa) veri kaybı olmaz.
  const changeExamType = (nextExam: ExamKind) => {
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
  const [scanForm, setScanForm] = useState<{ subject: string; topic: string; correct: string; wrong: string; blank: string; minutes: string }>({ subject: "Matematik", topic: "", correct: "", wrong: "", blank: "", minutes: "20" });
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
    const examType = topics.find((item) => item.subject === scanForm.subject && item.topic === topic)?.exam ?? examKinds[0];
    setTopics((items) => items.map((item) => item.subject === scanForm.subject && item.topic === topic ? { ...item, progress: accuracy, status, insufficientData } : item));
    addFocusLog.mutate({ subject: scanForm.subject, topic, studyDate, minutes, questions: questionCount, correct, wrong, blank, note: "Konu tarama testi" });
    logTopicResult.mutate({ exam: examType, subject: scanForm.subject, topic, accuracy, questionCount, studyDate });
    setScanForm({ subject: scanForm.subject, topic: "", correct: "", wrong: "", blank: "", minutes: "20" });
    setOpenTopicScan(false);
  };
  const fileRef = useRef<HTMLInputElement>(null);
  const extractDocument = trpc.examDocument.extract.useMutation({
    onSuccess: (value) => {
      const data = value as ExamDocumentExtraction;
      setForm((current) => {
        const exam = data.exam && examKinds.includes(data.exam) ? data.exam : current.exam;
        const subjects = subjectNamesOf(exam);
        return { ...current, title: data.title || current.title, date: data.date || current.date, exam, subjectNets: Object.fromEntries(subjects.map((subject) => [subject, String(data.subjects[subject] ?? current.subjectNets[subject] ?? "")])), subjectTimes: Object.fromEntries(subjects.map((subject) => [subject, String(data.timeSpent[subject] ?? 0)])), topicDetails: data.topics, topicNets: Object.fromEntries(data.topics.map((item) => [item.topic, String(item.net)])), notes: data.notes, importedFrom: fileRef.current?.files?.[0]?.type === "application/pdf" ? "pdf" : "ocr" };
      });
      toast.success(`${data.topics.length} konu satırı belgeden aktarıldı.`);
    },
    onError: (error) => toast.error(error.message || "Belge okunamadı."),
  });
  const updateDetail = (index: number, field: keyof ExamTopicResult, value: string) => {
    setForm((current) => {
      const next = [...current.topicDetails];
      const numeric = ["questionCount", "correct", "wrong", "blank", "accuracy", "net"].includes(field);
      next[index] = { ...next[index], [field]: numeric ? Number(value) || 0 : value };
      if (["questionCount", "correct", "wrong", "blank"].includes(field)) {
        next[index] = calculateTopicResult(next[index], current.exam);
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
    const subjectNames = subjectNamesOf(form.exam);
    const subjects = Object.fromEntries(subjectNames.map((subject) => [subject, Number(form.subjectNets[subject]) || 0]));
    const net = Number(Object.values(subjects).reduce((sum, value) => sum + value, 0).toFixed(2));
    // Fark yalnızca aynı türden (TYT/AYT) son denemeye göre.
    const previous = [...exams].filter((item) => (item.exam ?? "TYT") === form.exam).sort((a, b) => b.date.localeCompare(a.date))[0]?.net ?? net;
    const newExam: MockExam = { id: `mock-${Date.now()}`, title: form.title, date: form.date, exam: form.exam, net, delta: Number((net - previous).toFixed(2)), tag: net >= previous ? "Yükseliş" : "Tekrar bak", subjects, timeSpent: Object.fromEntries(subjectNames.map((subject) => [subject, Number(form.subjectTimes[subject]) || 0])), topicNets: Object.fromEntries(form.topicDetails.map(({ topic, net: topicNet }) => [topic, topicNet])), topicDetails: form.topicDetails, importedFrom: form.importedFrom };
    setExams((items) => [newExam, ...items]);
    persistExams?.({ exams: [examToPersistenceInput(newExam)] });
    const meaningfulDetails = form.topicDetails.filter((detail) => detail.topic.trim() && detail.questionCount > 0);
    setTopics((items) => items.map((item) => {
      const detail = meaningfulDetails.find((row) => row.topic.trim().toLocaleLowerCase("tr") === item.topic.trim().toLocaleLowerCase("tr"));
      if (!detail) return item;
      const { status, insufficientData } = deriveTopicStatus(detail.accuracy, detail.questionCount);
      return { ...item, progress: detail.accuracy, status, insufficientData };
    }));
    meaningfulDetails.forEach((detail) => logTopicResult.mutate({ exam: form.exam, subject: detail.subject || "Genel", topic: detail.topic, accuracy: detail.accuracy, questionCount: detail.questionCount, studyDate: form.date }));
    setOpen(false); setForm(createBlankExamForm(topics, examKinds[0]));
    toast.success("Deneme eklendi. Zayıf konu analizin güncellendi.");
  };
  return <div id="exams" className="space-y-7 animate-page-in">
    <ExamsDashboard exams={exams} onAddExam={() => setOpen(true)} onAddScan={() => setOpenTopicScan(true)} onUpload={() => { setOpen(true); window.setTimeout(() => fileRef.current?.click(), 120); }} />
    {open && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}><div className="modal-card max-w-[1180px]!"><div className="flex items-start justify-between gap-4"><div><div className="eyebrow mb-2">Yeni kayıt · {examKinds.join("/")} denemesi</div><h2 className="text-[25px] font-semibold text-ink font-display">Eksiklerini doğru tespit edelim.</h2><p className="mt-1 text-[13px] text-ink-3">Konu satırları sınav türüne göre otomatik geldi; her satıra soru sayısı, doğru, yanlış ve boş değerlerini gir. PDF/görsel yüklediğinde tablo otomatik dolar.</p></div><button onClick={() => setOpen(false)} className="rounded-lg p-2 text-ink-4 hover:bg-paper"><X size={17} /></button></div><input ref={fileRef} type="file" accept="application/pdf,image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => handleDocument(event.target.files?.[0])} />{extractDocument.isPending && <div className="mt-5 rounded-xl border border-brand/15 bg-brand-soft px-4 py-3 text-[13px] text-brand">Belge okunuyor; konu satırları ayrıştırılıyor...</div>}<div className="mt-5 grid gap-4 sm:grid-cols-[1fr_130px_110px]"><label className="block"><span className="form-label">Deneme adı</span><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder={`Örn. Dershane ${examKinds[0]} · 04`} className="form-input" /></label><label className="block"><span className="form-label">Tarih</span><input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className="form-input" /></label><label className="block"><span className="form-label">Sınav</span><select value={form.exam} onChange={(event) => changeExamType(event.target.value as ExamKind)} className="form-input">{examKinds.map((kind) => <option key={kind} value={kind}>{kind}</option>)}</select></label></div><div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]"><Card className="border-ink/[0.06] bg-paper p-4"><div className="form-label">Ders netleri{form.exam === "LGS" && <span className="ml-1 font-normal text-ink-4">(3 yanlış 1 doğruyu götürür)</span>}</div><div className="mt-2 grid grid-cols-2 gap-3">{subjectNamesOf(form.exam).map((subject) => <label key={subject} className="block"><span className="mb-1 block text-[12px] text-ink-4">{subject} neti</span><input type="number" min="0" step="0.25" value={form.subjectNets[subject] ?? ""} onChange={(event) => setForm({ ...form, subjectNets: { ...form.subjectNets, [subject]: event.target.value } })} className="form-input" /></label>)}</div></Card><Card className="border-ink/[0.06] bg-paper p-4"><div className="flex items-center justify-between"><span className="form-label mb-0">Ders süreleri</span><span className="text-[12px] text-ink-4">dakika</span></div><div className="mt-2 grid grid-cols-2 gap-3">{subjectNamesOf(form.exam).map((subject) => <label key={subject} className="block"><span className="mb-1 block text-[12px] text-ink-4">{subject} dk</span><input type="number" min="0" max="240" value={form.subjectTimes[subject] ?? ""} onChange={(event) => setForm({ ...form, subjectTimes: { ...form.subjectTimes, [subject]: event.target.value } })} className="form-input" /></label>)}</div></Card></div><div className="mt-5 overflow-hidden rounded-2xl border border-ink/[0.08]"><div className="flex flex-col gap-2 border-b border-ink/[0.08] bg-paper px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="text-[14px] font-semibold text-ink-2">Konu konu sonuç tablosu</div><div className="text-[12px] text-ink-4">{form.exam === "TYT" ? "Satırlar ve soru sayıları (S) dershane analiz raporundaki gerçek TYT dağılımından geldi; sen sadece doğru/yanlış/boş gir." : form.exam === "LGS" ? "Satırlar 8. sınıf müfredatından geldi; denemedeki her konu için soru sayısını (S), doğru, yanlış ve boşu gir. Boş bıraktığın konular kaydedilmez." : `Satırlar ${form.exam} konu haritandan geldi; denemede olmayan bir konuyu "Sil" ile çıkarabilirsin.`}</div></div><button onClick={() => setForm((current) => ({ ...current, topicDetails: [...current.topicDetails, { subject: "", topic: "", questionCount: 0, correct: 0, wrong: 0, blank: 0, accuracy: 0, net: 0 }] }))} className="inline-flex items-center gap-1 text-[12px] font-bold text-brand"><Plus size={13} /> Konu satırı ekle</button></div>{form.exam === "TYT" && <div className="border-b border-ink/[0.06] bg-warn-soft px-4 py-2 text-[12px] leading-4 text-warn">{TYT_TEMPLATE_MISSING_NOTE}</div>}<div className="max-h-[360px] overflow-auto">{usesGroupedTemplate(form.exam) ? <TytTopicTemplateTable exam={form.exam} topicDetails={form.topicDetails} updateDetail={updateDetail} removeRow={removeTopicRow} /> : <table className="w-full min-w-[820px] text-left"><thead className="sticky top-0 bg-white text-[12px] text-ink-4"><tr><th className="px-3 py-2">Ders</th><th className="px-3 py-2">Konu adı</th><th className="px-3 py-2">Sayı</th><th className="px-3 py-2">Doğ</th><th className="px-3 py-2">Yan</th><th className="px-3 py-2">Boş</th><th className="px-3 py-2">%</th><th className="px-3 py-2">Net</th><th className="px-3 py-2" /></tr></thead><tbody className="divide-y divide-ink/[0.06]">{form.topicDetails.map((row, index) => <tr key={`${row.topic}-${index}`}><td className="px-3 py-2"><input value={row.subject} onChange={(event) => updateDetail(index, "subject", event.target.value)} placeholder="Matematik" className="form-input w-28" /></td><td className="px-3 py-2"><input value={row.topic} onChange={(event) => updateDetail(index, "topic", event.target.value)} placeholder="Problemler" className="form-input w-48" /></td>{(["questionCount", "correct", "wrong", "blank"] as const).map((field) => <td key={field} className="px-3 py-2"><input type="number" min="0" value={row[field]} onChange={(event) => updateDetail(index, field, event.target.value)} className="form-input w-16" /></td>)}<td className="px-3 py-2 text-[12px] font-semibold text-ink-3">{row.accuracy}</td><td className="px-3 py-2 text-[12px] font-bold text-brand">{row.net.toFixed(2)}</td><td className="px-3 py-2"><button onClick={() => removeTopicRow(index)} aria-label="Konu satırını sil" className="rounded-lg p-1.5 text-rule-strong hover:bg-danger-soft hover:text-danger"><X size={14} /></button></td></tr>)}</tbody></table>}</div></div><label className="mt-4 block"><span className="form-label">Koç notu / belge notu</span><textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={2} placeholder="Örn. Süre yetmedi, son 10 soruda zorlandım..." className="form-input min-h-16 resize-none" /></label><div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button onClick={() => setOpen(false)} className="h-10 rounded-xl border border-ink/10 px-4 text-[13px] font-semibold text-ink-3">Vazgeç</button><Button onClick={() => fileRef.current?.click()} variant="outline" className="h-10 rounded-xl border-brand/20 text-[13px] font-semibold text-brand"><Upload className="mr-2" size={14} /> Belgeden doldur</Button><Button onClick={addExam} className="h-10 rounded-xl bg-brand px-5 text-[13px] font-semibold text-white hover:bg-brand">Kaydet ve çalışma planına aktar</Button></div></div></div>}
    {openTopicScan && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setOpenTopicScan(false)}><div className="modal-card max-w-[440px]"><div className="flex items-start justify-between gap-4"><div><div className="eyebrow mb-2">Yeni kayıt · konu tarama testi</div><h2 className="text-[23px] font-semibold text-ink font-display">Tek konuyu hızlıca kaydet.</h2><p className="mt-1 text-[13px] text-ink-3">Ders ve konu seç, doğru/yanlış/boş sayısını gir; konu haritan anında güncellensin.</p></div><button onClick={() => setOpenTopicScan(false)} className="rounded-lg p-2 text-ink-4 hover:bg-paper"><X size={17} /></button></div><div className="mt-5 grid gap-3"><label className="block"><span className="form-label">Ders</span><select value={scanForm.subject} onChange={(event) => setScanForm({ ...scanForm, subject: event.target.value, topic: "" })} className="form-input">{scanSubjects.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label className="block"><span className="form-label">Konu</span><select value={scanForm.topic} onChange={(event) => setScanForm({ ...scanForm, topic: event.target.value })} className="form-input"><option value="">{scanTopicOptions[0] ? `${scanTopicOptions[0]} (varsayılan)` : "Bu derste kayıtlı konu yok"}</option>{scanTopicOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><div className="grid grid-cols-3 gap-3"><label className="block"><span className="mb-1 block text-[12px] text-ink-4">Doğru</span><input type="number" min="0" value={scanForm.correct} onChange={(event) => setScanForm({ ...scanForm, correct: event.target.value })} className="form-input" /></label><label className="block"><span className="mb-1 block text-[12px] text-ink-4">Yanlış</span><input type="number" min="0" value={scanForm.wrong} onChange={(event) => setScanForm({ ...scanForm, wrong: event.target.value })} className="form-input" /></label><label className="block"><span className="mb-1 block text-[12px] text-ink-4">Boş</span><input type="number" min="0" value={scanForm.blank} onChange={(event) => setScanForm({ ...scanForm, blank: event.target.value })} className="form-input" /></label></div><label className="block"><span className="mb-1 block text-[12px] text-ink-4">Süre (dk, opsiyonel)</span><input type="number" min="1" value={scanForm.minutes} onChange={(event) => setScanForm({ ...scanForm, minutes: event.target.value })} className="form-input" /></label></div><div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button onClick={() => setOpenTopicScan(false)} className="h-10 rounded-xl border border-ink/10 px-4 text-[13px] font-semibold text-ink-3">Vazgeç</button><Button onClick={addTopicScan} disabled={addFocusLog.isPending} className="h-10 rounded-xl bg-brand px-5 text-[13px] font-semibold text-white hover:bg-brand">{addFocusLog.isPending ? "Kaydediliyor..." : "Kaydet"}</Button></div></div></div>}
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
    exam: book.examScope === "AYT" ? "AYT" : book.examScope === "LGS" ? "LGS" : "TYT",
    level: book.difficultyLabel === "easy" ? "Kolay" : book.difficultyLabel === "hard" ? "Zor" : "Orta",
    format: "Kaynak Kataloğu",
    reason: "Kütüphanene Kaynak Kataloğu'ndan eklendi.",
    sourceUrl: "",
    pageCount: undefined,
    tone: "blue",
  };
}
function Resources({ topics, exams, onSection, addBookRequest = 0, onAddBookHandled }: { topics: Topic[]; exams: MockExam[]; onSection: (section: DashboardSection) => void; addBookRequest?: number; onAddBookHandled?: () => void }) {
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
  // "Kitap ekle" sihirbazı: 1) kapak → bilgiler 2) içindekiler → konular
  // (bkz. components/books/AddBookWizard.tsx). OCR yalnızca öneri üretir;
  // öğrenci onaylamadan hiçbir şey kütüphaneye yazılmaz.
  const [showAddBook, setShowAddBook] = useState(false);
  // Kenar çubuğundaki "Kaynak ekle": fotoğrafla kitap ekleme sihirbazını açar.
  useEffect(() => { if (addBookRequest > 0) { setShowAddBook(true); onAddBookHandled?.(); } }, [addBookRequest]);
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
    addLogMutation.mutate({ bookId: logBookId, topic: logForm.topic || undefined, sessionDate: today, minutes: row.minutes, questions: row.questions, correct: row.correct, wrong: row.wrong, blank: row.blank, pageStart, pageEnd, testStart, testEnd });
    if (logForm.topic) { const book = catalog.find((item) => item.id === logBookId); const subjectName = book?.subject || topics.find((item) => item.topic === logForm.topic)?.subject || "Genel"; const mapping = { id: `mapping-${Date.now()}`, bookId: logBookId, topic: logForm.topic, subject: subjectName, pageStart, pageEnd, testStart, testEnd }; setMappings((items) => [mapping, ...items.filter((item) => !(item.bookId === logBookId && item.topic === logForm.topic))]); mappingMutation.mutate({ bookId: logBookId, topic: logForm.topic, subject: subjectName, pageStart, pageEnd, testStart, testEnd }); }
    setLogForm({ topic: "", minutes: "45", questions: "20", correct: "12", wrong: "5", blank: "3", pageStart: "", pageEnd: "", testStart: "", testEnd: "" }); toast.success("Çözüm kaydı hesabına kaydedildi; eşleştirme güncellendi.");
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
  const toggleInventory = (id: string) => setInventory((items) => { if (items.includes(id)) { removeBookMutation.mutate({ bookId: id }); return items.filter((item) => item !== id); } const previous = items.at(-1); addBookMutation.mutate({ bookId: id }); if (previous && previous !== id) addSwitchMutation.mutate({ fromBookId: previous, toBookId: id, reason: "Kişisel raf güncellemesi" }); if (previous && previous !== id) setSwitches((history) => [{ id: `switch-${Date.now()}`, fromBookId: previous, toBookId: id, date: toLocalDateKey(), reason: "Kişisel raf güncellemesi" }, ...history]); return [...items, id]; });
  const importBookFile = async (file?: File) => {
    if (!file) return;
    if (!/\.(csv|xlsx|xls)$/i.test(file.name)) { toast.error("CSV veya Excel dosyası seçmelisin."); return; }
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      const normalize = (value: string) => value.toLocaleLowerCase("tr").replace(/[ıİ]/g, "i").replace(/[^a-z0-9]/g, "");
      const valueOf = (row: Record<string, unknown>, aliases: string[]) => { const key = Object.keys(row).find((candidate) => aliases.includes(normalize(candidate))); return key ? String(row[key] ?? "").trim() : ""; };
      const imported: ResourceBook[] = rows.map((row, index) => {
        const title = valueOf(row, ["id", "kitapid", "kitapadi", "kitap", "title", "kaynakadi"]);
        const subjectName = valueOf(row, ["subject", "ders", "dersadi"]) || "Genel";
        const examCell = valueOf(row, ["exam", "sinav", "sinavtur" ]).toUpperCase();
        const exam: ExamKind = examCell === "AYT" ? "AYT" : examCell === "LGS" ? "LGS" : "TYT";
        const rawLevel = valueOf(row, ["level", "seviye", "zorluk"]).toLocaleLowerCase("tr");
        const level: BookLevel = rawLevel.includes("zor") || rawLevel.includes("ileri") ? "Zor" : rawLevel.includes("orta") ? "Orta" : "Kolay";
        const id = valueOf(row, ["bookid", "kitapid", "id"]) || `custom-book-${Date.now()}-${index}`;
        return { id, title: title || `İçe aktarılan kaynak ${index + 1}`, publisher: valueOf(row, ["publisher", "yayinevi", "yayıncı"]) || "Özel katalog", subject: subjectName, exam, level, format: valueOf(row, ["format", "tur", "kaynakformat"]) || "Soru bankası", reason: valueOf(row, ["reason", "aciklama", "açıklama"]) || "Öğrenci kataloğundan içe aktarıldı.", sourceUrl: valueOf(row, ["sourceurl", "url", "link"]), pageCount: Number(valueOf(row, ["pagecount", "sayfasayisi", "sayfa"])) || undefined, tone: "lilac" as const };
      }).filter((book) => book.title.trim().length > 0);
      if (!imported.length) { toast.error("Dosyada kitap satırı bulunamadı."); return; }
      const uniqueBooks = imported.filter((book, index, all) => all.findIndex((candidate) => candidate.id === book.id) === index);
      setImportedBooks((items) => [...uniqueBooks, ...items.filter((item) => !uniqueBooks.some((book) => book.id === item.id))]);
      importBooksMutation.mutate({ books: uniqueBooks });
      const importedMappings: BookTopicMapping[] = rows.flatMap((row, index) => { const topic = valueOf(row, ["topic", "konu", "konuadi"]); if (!topic) return []; const bookId = valueOf(row, ["bookid", "kitapid", "id"]) || uniqueBooks[index]?.id; if (!bookId) return []; return [{ id: `mapping-${Date.now()}-${index}`, bookId, topic, subject: valueOf(row, ["subject", "ders", "dersadi"]) || "Genel", pageStart: Number(valueOf(row, ["pagestart", "sayfabaslangic", "sayfailk"])) || undefined, pageEnd: Number(valueOf(row, ["pageend", "sayfabitis", "sayfason"])) || undefined, testStart: Number(valueOf(row, ["teststart", "testbaslangic", "testilk"])) || undefined, testEnd: Number(valueOf(row, ["testend", "testbitis", "testson"])) || undefined }]; });
      if (importedMappings.length) { setMappings((items) => [...importedMappings, ...items]); importedMappings.forEach((mapping) => mappingMutation.mutate({ bookId: mapping.bookId, topic: mapping.topic, subject: mapping.subject, pageStart: mapping.pageStart ?? undefined, pageEnd: mapping.pageEnd ?? undefined, testStart: mapping.testStart ?? undefined, testEnd: mapping.testEnd ?? undefined })); }
      toast.success(`${uniqueBooks.length} kaynak${importedMappings.length ? ` ve ${importedMappings.length} konu eşleştirmesi` : ""} içe aktarıldı.`);
    } catch { toast.error("Dosya okunamadı. İlk satırda sütun başlıkları olduğundan emin ol."); }
  };
  return <div id="resources" className="space-y-7 animate-page-in">
    <PageHeader eyebrow="Kişisel rafın" title="Kaynaklar" description="Elindeki kitaplarla çöz, ilerlemeni izle ve koç önerisi al. Yeni kaynak eklemek için fotoğrafla ekleyebilir ya da Kaynak Kataloğu'nu kullanabilirsin." actions={<><span className="demo-chip"><BookOpen size={12} /> {myBooks.length} kaynak rafında</span><button onClick={() => onSection("catalog")} className={secondaryButton}><Library size={16} /> Kaynak Kataloğu</button>{user && <button onClick={() => setShowAddBook(true)} className={primaryButton}><Camera size={16} /> Fotoğrafla kitap ekle</button>}</>} />
    {myBooks.length === 0 && <Card className="soft-card border-brand/15 bg-brand-soft p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><div className="resource-icon bg-brand-soft text-brand"><Library size={18} /></div><div><h2 className="text-[15px] font-semibold text-ink">Rafın henüz boş — önce elindeki kaynakları seç.</h2><p className="mt-1 max-w-xl text-[13px] leading-5 text-ink-2">Kaynak Kataloğu'ndan gerçekten kullandığın kitapları "Elimde" olarak işaretle; çözüm ritmi, konu eşleştirme ve önerilerin buna göre kişiselleşsin.</p></div></div><Button onClick={() => onSection("catalog")} className="h-10 shrink-0 rounded-xl bg-brand px-4 text-[13px] font-semibold text-white hover:bg-brand"><BookOpen className="mr-2" size={14} /> Kaynaklarımı seç</Button></div></Card>}
    <div className="grid gap-5 lg:grid-cols-[0.75fr_1.25fr]"><section className="coach-hero p-6 sm:p-7"><span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-brand shadow-[var(--shadow-card)]"><Sparkles size={13} /> Verine göre yönlendirici</span><h2 className="mt-5 max-w-[340px] text-[24px] font-extrabold leading-tight text-ink">Kaynak seçimini şansa bırakma.</h2><p className="mt-2 max-w-[340px] text-[14px] leading-6 text-ink-2">Önce kolay kaynakla temeli kur; orta ve zor kaynaklara geçişi çözüm doğruluğun belirlesin.</p><div className="mt-5 flex items-center gap-2 text-[13px] font-semibold text-brand-strong"><Target size={15} /> {myBooks.length} kaynak kişisel rafında</div><div className="mt-3 max-h-[230px] space-y-1.5 overflow-y-auto pr-1">{myBooks.length === 0 ? <div className="rounded-xl border border-rule bg-white p-3 text-[13px] leading-5 text-ink-3">Henüz rafında kaynak yok. Fotoğrafla ekleyebilir ya da Kaynak Kataloğu'ndan seçebilirsin.</div> : myBooks.map((book) => <div key={book.id} className="flex items-center gap-2 rounded-xl border border-rule bg-white px-3 py-2"><span className="h-2 w-2 shrink-0 rounded-full" style={{ background: subjectColors[book.subject] ?? palette.ink3 }} /><div className="min-w-0 flex-1"><div className="truncate text-[13px] font-semibold text-ink">{book.title}</div><div className="text-[12px] text-ink-3">{book.subject} · {book.level}</div></div></div>)}</div></section><Card className="soft-card p-5 sm:p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="eyebrow">Çözüm ritmi</div><h2 className="mt-1 text-[21px] font-semibold text-ink font-display">Bugün hangi kaynakla çalıştın?</h2></div><span className="rounded-full bg-success-soft px-2.5 py-1 text-[12px] font-bold text-success">Öneri motoru açık</span></div><div className="mt-5 grid gap-3 sm:grid-cols-[1fr_90px_90px]"><select value={logBookId} onChange={(event) => selectLogBook(event.target.value)} className="form-input"><option value="">Kaynak seç</option>{myBooks.map((book) => <option key={book.id} value={book.id}>{book.subject} · {book.title}</option>)}</select><input type="number" min="1" value={logForm.minutes} onChange={(event) => setLogForm({ ...logForm, minutes: event.target.value })} className="form-input" placeholder="dk" /><input type="number" min="1" value={logForm.questions} onChange={(event) => setLogForm({ ...logForm, questions: event.target.value })} className="form-input" placeholder="soru" /></div><div className="mt-3 grid gap-3 sm:grid-cols-[1.4fr_repeat(4,1fr)]"><select value={logForm.topic} onChange={(event) => setLogForm({ ...logForm, topic: event.target.value })} className="form-input"><option value="">Konu eşleştir (opsiyonel)</option>{bookTopicOptions.map((topic) => <option key={topic} value={topic}>{topic}</option>)}</select><input type="number" min="0" value={logForm.pageStart} onChange={(event) => setLogForm({ ...logForm, pageStart: event.target.value })} className="form-input" placeholder="sf. ilk" /><input type="number" min="0" value={logForm.pageEnd} onChange={(event) => setLogForm({ ...logForm, pageEnd: event.target.value })} className="form-input" placeholder="sf. son" /><input type="number" min="0" value={logForm.testStart} onChange={(event) => setLogForm({ ...logForm, testStart: event.target.value })} className="form-input" placeholder="test ilk" /><input type="number" min="0" value={logForm.testEnd} onChange={(event) => setLogForm({ ...logForm, testEnd: event.target.value })} className="form-input" placeholder="test son" /></div><div className="mt-3 grid grid-cols-3 gap-3"><input type="number" min="0" value={logForm.correct} onChange={(event) => setLogForm({ ...logForm, correct: event.target.value })} className="form-input" placeholder="Doğru" /><input type="number" min="0" value={logForm.wrong} onChange={(event) => setLogForm({ ...logForm, wrong: event.target.value })} className="form-input" placeholder="Yanlış" /><input type="number" min="0" value={logForm.blank} onChange={(event) => setLogForm({ ...logForm, blank: event.target.value })} className="form-input" placeholder="Boş" /></div><Button onClick={addLog} className="mt-3 h-10 rounded-xl bg-pencil px-4 text-[13px] font-semibold text-ink hover:bg-pencil-strong"><Plus className="mr-2" size={14} /> Oturumu kaydet</Button></Card></div>
    <Card className="soft-card border-brand/10 bg-brand-soft p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="eyebrow text-brand">Toplu katalog aktarımı</div><h2 className="mt-1 text-[21px] font-semibold text-ink font-display">Kitap ve eşleştirmeleri tek dosyada yükle.</h2><p className="mt-1 max-w-2xl text-[12px] leading-5 text-ink-3">CSV, XLSX veya XLS dosyasında kitap adı, yayınevi, ders, sınav, seviye ve istersen konu, sayfa/test aralığı sütunlarını kullan. Giriş yaptıysan kayıtlar hesabına yazılır.</p></div><input ref={bulkFileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(event) => { void importBookFile(event.target.files?.[0]); event.currentTarget.value = ""; }} /><Button onClick={() => bulkFileRef.current?.click()} variant="outline" className="h-10 shrink-0 rounded-xl border-brand/20 bg-white text-[12px] font-semibold text-brand"><Upload className="mr-2" size={14} /> CSV / Excel yükle</Button></div><div className="mt-4 flex flex-wrap gap-2 text-[12px] text-ink-3"><span className="rounded-lg bg-white px-2.5 py-1.5">Zorunlu: kitap adı · ders</span><span className="rounded-lg bg-white px-2.5 py-1.5">Opsiyonel: konu · sayfa ilk/son · test ilk/son</span><span className="rounded-lg bg-white px-2.5 py-1.5">Aynı dosya kitap + eşleştirme içerebilir</span></div></Card>
    <Card className="soft-card border-[#f3dc9b] bg-pencil-soft/60 p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="eyebrow text-pencil-ink">Kitap Kütüphanem</div><h2 className="mt-1 text-[21px] font-semibold text-ink font-display">Elindeki kitabı fotoğrafla ekle.</h2><p className="mt-1 max-w-2xl text-[12px] leading-5 text-ink-3">1. fotoğraf kapak: kitap adı, yayınevi ve ders okunur. 2. fotoğraf içindekiler: ünite ve testler YKS konularıyla eşleşir, konular kaydedilir. Her adımda sen onaylarsın.</p></div><Button onClick={() => setShowAddBook(true)} variant="outline" className="h-10 shrink-0 rounded-xl border-[#f3dc9b] bg-white text-[12px] font-semibold text-pencil-ink"><Camera className="mr-2" size={14} /> Kitap ekle</Button></div></Card>
    {showAddBook && <Suspense fallback={null}><AddBookWizard onCreateBook={createBookFromCover} findDuplicate={findDuplicateBook} onOpenExisting={(book) => { setShowAddBook(false); setOpenBook(book); }} onClose={() => setShowAddBook(false)} /></Suspense>}
    <BookRecommendationsCard bookTitles={Object.fromEntries(catalog.map((book) => [book.id, book.title]))} />
    {recommendedBooks.length > 0 && <Card className="soft-card border-[#f3dc9b] bg-pencil-soft/60 p-5 sm:p-6"><div className="flex items-center justify-between"><div><div className="eyebrow text-pencil-ink">Deneme sonuçlarına göre</div><h2 className="mt-1 text-[21px] font-semibold text-ink font-display">Zayıf konuların için öneriler</h2></div><span className="rounded-full bg-danger-soft px-2.5 py-1 text-[12px] font-bold text-danger">{recommendedBooks.length} öncelik</span></div><div className="mt-4 grid gap-3 md:grid-cols-2">{recommendedBooks.map(({ book, topic }) => <div key={`${book.id}-${topic.id}`} className="flex items-center gap-3 rounded-2xl border border-pencil/10 bg-white p-3"><div className={`resource-icon ${toneClasses[book.tone]}`}><BookOpen size={16} /></div><div className="min-w-0 flex-1"><div className="text-[13px] font-semibold text-ink-2">{book.title}</div><div className="mt-1 text-[12px] text-ink-3">{topic.topic} · %{topic.progress} ilerleme · {book.level} seviye</div><div className="mt-1 text-[12px] text-ink-3">{book.reason}</div></div><button onClick={() => toggleInventory(book.id)} className={`shrink-0 rounded-lg px-2.5 py-2 text-[12px] font-bold ${inventory.includes(book.id) ? "bg-success-soft text-success" : "bg-brand text-white hover:bg-brand-strong"}`}>{inventory.includes(book.id) ? "Rafında" : "Rafa ekle"}</button></div>)}</div></Card>}
    {myBooks.length > 0 && <Card className="soft-card p-5 sm:p-6"><div className="flex items-center justify-between"><div><div className="eyebrow">Elindeki kaynaklar</div><h2 className="mt-1 text-[21px] font-semibold text-ink font-display">Kişisel rafın</h2></div><span className="text-[12px] text-ink-4">{myBooks.length} kitap</span></div><div className="mt-4 grid gap-3 md:grid-cols-2">{myBooks.map((book) => { const stats = getBookStats(book.id); const suggestion = getSuggestion(book); return <div key={book.id} className="rounded-2xl border border-ink/[0.07] p-4"><div className="flex items-start justify-between gap-3"><div><div className="text-[14px] font-semibold text-ink">{book.title}</div><div className="mt-1 text-[12px] text-ink-4">{book.publisher} · {book.subject} · {book.level}</div></div><button onClick={() => toggleInventory(book.id)} className="text-[12px] font-semibold text-ink-4">Rafından çıkar</button></div><div className="mt-4 grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-paper px-2 py-2"><div className="text-[16px] font-semibold text-ink">{stats.total}</div><div className="text-[11px] text-ink-4">soru</div></div><div className="rounded-xl bg-paper px-2 py-2"><div className="text-[16px] font-semibold text-ink">%{stats.accuracy}</div><div className="text-[11px] text-ink-4">doğruluk</div></div><div className="rounded-xl bg-paper px-2 py-2"><div className="text-[16px] font-semibold text-ink">{stats.activeDays}</div><div className="text-[11px] text-ink-4">aktif gün</div></div></div><div className={`mt-3 rounded-xl p-3 text-[12px] leading-5 ${suggestion.tone === "coral" ? "bg-danger-soft text-danger" : suggestion.tone === "mint" ? "bg-success-soft text-success" : suggestion.tone === "yellow" ? "bg-warn-soft text-warn" : "bg-brand-soft text-brand"}`}><div className="font-bold">{suggestion.title}</div><div className="mt-0.5">{suggestion.body}</div></div>{user && <BookContentBadge bookId={book.id} onOpen={() => setOpenBook({ id: book.id, title: book.title, publisher: book.publisher, subject: book.subject, exam: book.exam })} />}{mappings.filter((mapping) => mapping.bookId === book.id).length > 0 && <div className="mt-3 rounded-xl bg-brand-soft p-3"><div className="text-[12px] font-bold text-brand">Konu eşleştirmeleri</div><div className="mt-1 space-y-1">{mappings.filter((mapping) => mapping.bookId === book.id).slice(0, 3).map((mapping) => <div key={mapping.id} className="text-[12px] text-ink-2">{mapping.topic} · {mapping.pageStart && mapping.pageEnd ? `sf. ${mapping.pageStart}–${mapping.pageEnd}` : "sayfa yok"}{mapping.testStart && mapping.testEnd ? ` · test ${mapping.testStart}–${mapping.testEnd}` : ""}</div>)}</div></div>}</div>; })}</div></Card>}
    <Card className="soft-card p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="eyebrow">İlerleme analizi</div><h2 className="mt-1 text-[21px] font-semibold text-ink font-display">Soru ritmin ve kaynak yolculuğun.</h2><p className="mt-1 text-[12px] text-ink-4">Haftalık soru hacmi, doğruluk, deneme neti ve konu ilerlemesini aynı yerde izle.</p></div><div className="flex gap-2 text-[12px] font-semibold text-ink-3"><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-brand" /> Soru</span><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-success" /> Doğruluk</span><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-danger" /> Net</span><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-violet" /> Konu</span></div></div><div className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_0.75fr]"><div><div className="flex h-44 items-end gap-2 border-b border-l border-ink/[0.08] px-2 pb-0">{weeklyStats.map((week) => <div key={week.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><div className="flex h-full w-full max-w-10 items-end"><div className="relative w-full rounded-t-lg bg-brand/80" style={{ height: `${Math.max(5, (week.questions / Math.max(...weeklyStats.map((item) => item.questions), 20)) * 100)}%` }}><span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[11px] font-bold text-brand">{week.questions || "—"}</span></div></div><span className="text-[11px] text-ink-4">{week.label}</span></div>)}</div><div className="mt-4 rounded-xl border border-ink/[0.06] bg-white p-3"><div className="mb-2 flex items-center justify-between text-[12px] font-semibold text-ink-3"><span>Deneme neti ve konu ilerlemesi</span><span className="flex gap-2"><span className="text-danger">Net</span><span className="text-violet">Konu %</span></span></div><svg viewBox="0 0 600 110" className="h-24 w-full" role="img" aria-label="Haftalık deneme neti ve konu ilerleme grafiği"><polyline fill="none" stroke={palette.danger} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={weeklyStats.map((item, index) => `${index * 120 + 10},${item.net === null ? 100 : 100 - Math.min(90, (item.net / Math.max(...weeklyStats.map((entry) => entry.net || 1), 1)) * 75)}`).join(" ")} /><polyline fill="none" stroke={palette.violet} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 5" points={weeklyStats.map((item, index) => `${index * 120 + 10},${item.topicProgress === null ? 100 : 100 - item.topicProgress * 0.75}`).join(" ")} />{weeklyStats.map((item, index) => <g key={`trend-${item.label}`}><circle cx={index * 120 + 10} cy={item.net === null ? 100 : 100 - Math.min(90, (item.net / Math.max(...weeklyStats.map((entry) => entry.net || 1), 1)) * 75)} r="3.5" fill={palette.danger} /><circle cx={index * 120 + 10} cy={item.topicProgress === null ? 100 : 100 - item.topicProgress * 0.75} r="3.5" fill={palette.violet} /></g>)}</svg></div><div className="mt-3 rounded-xl bg-paper px-3 py-2 text-[12px] text-ink-3">Son hafta <strong className="text-ink">{weeklyStats.at(-1)?.questions || 0} soru</strong> · doğruluk <strong className="text-success">%{weeklyStats.at(-1)?.accuracy || 0}</strong></div></div><div className="rounded-2xl bg-paper p-4"><div className="text-[12px] font-bold text-ink-4">Kaynak değiştirme geçmişi</div>{switches.length === 0 ? <p className="mt-4 text-[12px] leading-5 text-ink-3">Bir kitabı rafına ekleyip başka bir seviyeye geçtiğinde değişim geçmişin burada görünecek.</p> : <div className="mt-3 space-y-3">{switches.slice(0, 4).map((item) => <div key={item.id} className="flex items-start gap-2"><div className="mt-1 h-2 w-2 rounded-full bg-pencil" /><div><div className="text-[12px] font-semibold text-ink-2">{item.fromBookId ? catalog.find((book) => book.id === item.fromBookId)?.title : "İlk kaynak"} → {catalog.find((book) => book.id === item.toBookId)?.title}</div><div className="mt-0.5 text-[12px] text-ink-4">{item.date} · {item.reason}</div></div></div>)}</div>}</div></div></Card>
    <Card className="soft-card p-6 sm:p-7"><SectionHeading eyebrow="Kaynak geçiş kuralı" title="Önce öğren, sonra hızlan." copy="Öneriler; doğru oranı, soru hacmini ve kaç farklı gün çalıştığını birlikte değerlendirir." /><div className="grid gap-4 md:grid-cols-3">{(["Kolay", "Orta", "Zor"] as BookLevel[]).map((item) => <div key={item} className="rounded-2xl bg-paper p-4"><div className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-bold ${levelMeta[item].className}`}>{item}</div><p className="mt-3 text-[12px] leading-5 text-ink-3">{item === "Kolay" ? "%55 altı doğrulukta tekrar, konu özeti ve kısa test ritmi." : item === "Orta" ? "%55–84 arası doğrulukta düzenli soru çözümü ve haftalık tekrar." : "%85 üzeri doğruluk ve en az 3 aktif günde bir üst seviyeye geçiş."}</p></div>)}</div></Card>
    {openBook && <BookDetailDialog book={openBook} onClose={() => setOpenBook(null)} />}
  </div>;
}
function AiPlan({ topics, exams, onSection }: { topics: Topic[]; exams: MockExam[]; onSection: (section: DashboardSection) => void }) {
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
  const personalBookIds = resourcesSnapshot.data ? resourcesSnapshot.data.inventory.map((row) => row.bookId) : getStoredValue<string[]>(localStorageKeys.bookInventory, []);
  const customBooks = (resourcesSnapshot.data?.customBooks as ResourceBook[] | undefined) || getStoredValue<ResourceBook[]>(localStorageKeys.customBooks, []);
  const catalogLibraryAsResourceBooks: ResourceBook[] = (catalogLibrary.data ?? []).map(catalogLibraryBookToResourceBook);
  const catalog = [...resourceBookCatalog, ...customBooks.filter((book) => !resourceBookCatalog.some((base) => base.id === book.id)), ...catalogLibraryAsResourceBooks];
  const planExamKinds = kindsOf(onboardingProfile.data?.examTrack ?? "YKS");
  // AI planına yalnızca öğrencinin sınavına ait kitaplar gider (LGS öğrencisine YKS kitabı önerilmez).
  const personalBooks = catalog.filter((book) => personalBookIds.includes(book.id) && planExamKinds.includes(book.exam));
  const personalBookLogs = resourcesSnapshot.data ? resourcesSnapshot.data.logs.map((row) => ({ id: String(row.id), bookId: row.bookId, date: toLocalDateKey(row.sessionDate), minutes: row.minutes, questions: row.questions, correct: row.correct, wrong: row.wrong, blank: row.blank, topic: row.topic ?? undefined })) : getStoredValue<BookStudyLog[]>(localStorageKeys.bookLogs, []);
  const enrichPlanWithBooks = (raw: AiWeeklyPlan): AiWeeklyPlan => ({ ...raw, days: raw.days.map((day) => ({ ...day, sessions: day.sessions.map((session) => { const book = personalBooks.find((candidate) => candidate.subject === session.subject); if (!book) return session; const targetQuestions = session.kind === "Soru" ? Math.max(10, Math.round(session.minutes / 3)) : Math.max(5, Math.round(session.minutes / 6)); const { targetPages, targetTests } = resolveBookTarget(resourcesSnapshot.data?.mappings || [], book.id, session.topic); return { ...session, bookId: book.id, bookTitle: book.title, targetQuestions, targetPages, targetTests }; }) })) });
  const saveCalendarPlan = trpc.calendar.savePlan.useMutation({ onSuccess: () => toast.success("Planın takvime de eklendi."), onError: () => toast.error("Plan oluşturuldu ancak takvime kaydedilemedi.") });
  // AI planı saat üretmez: takvime kaydederken her günün oturumları Ders programım'daki boş
  // aralıklara sırayla yerleşir (ders çıkışı +30 dk, 23:30 sınırı, bugünse geçmiş saatler hariç).
  const classSchedule = trpc.classSchedule.get.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const planSlotsFor = (date: Date) => {
    const preferred = onboardingProfile.data?.preferredStudyStartTime || "16:00";
    const now = new Date();
    const isToday = toLocalDateKey(date) === toLocalDateKey(now);
    const from = isToday ? fromMinutes(Math.min(23 * 60 + 30, Math.max(toMinutes(preferred) || 16 * 60, Math.ceil((now.getHours() * 60 + now.getMinutes()) / 5) * 5))) : preferred;
    return computeFreeSlots(classSchedule.data?.blocks ?? [], date, { from });
  };
  const generatePlan = trpc.aiPlan.generate.useMutation({ onSuccess: (value) => { let unplaced = 0; const enriched = enrichPlanWithBooks(value as AiWeeklyPlan); setPlan(enriched); setSelectedDay(0); if (user) { /* Plan bugünden başlar; AI'ın verdiği tarih geçmişteyse ya da geçersizse sıradaki güne düşer — geçmiş güne oturum yazılmaz. */ const planStart = new Date(); planStart.setHours(12, 0, 0, 0); const planEnd = new Date(planStart); planEnd.setDate(planStart.getDate() + 6); const todayKey = toLocalDateKey(planStart); const weekStart = new Date(planStart); weekStart.setHours(0, 0, 0, 0); saveCalendarPlan.mutate({ title: "AI haftalık çalışma planı", weekStart: weekStart.toISOString(), weekEnd: planEnd.toISOString(), summary: enriched.summary, replacePrevious: true, sessions: enriched.days.flatMap((day, dayIndex) => { const aiDate = /^\d{4}-\d{2}-\d{2}$/.test(day.date ?? "") && day.date >= todayKey ? new Date(`${day.date}T12:00:00`) : null; const date = aiDate ?? new Date(planStart.getFullYear(), planStart.getMonth(), planStart.getDate() + dayIndex, 12); const starts = placeVariableSessions(planSlotsFor(date), day.sessions.map((session) => session.minutes), FOCUS_BREAK_MINUTES); return day.sessions.flatMap((session, index) => { const start = starts[index]; if (start === null) { unplaced += 1; return []; } const startsAt = new Date(date); startsAt.setHours(0, start, 0, 0); return [{ sessionDate: startsAt.toISOString(), title: session.title, subject: session.subject, topic: session.topic, kind: session.kind, plannedMinutes: session.minutes, targetQuestions: session.targetQuestions, targetPages: session.targetPages, targetTests: session.targetTests }]; }); }) }); } toast.success("Haftalık planın hazırlandı; kişisel rafından hedefler eklendi."); if (unplaced) toast.warning(`${unplaced} oturum ders programındaki boş zamana sığmadığı için takvime eklenmedi; planda görünmeye devam ediyor.`); }, onError: (error) => toast.error(error.message.startsWith("USAGE_LIMIT_EXCEEDED") ? `AI plan hakkın doldu (${error.message.match(/\(([^)]+)\)/)?.[1] ?? "kota"}). Premium ile daha fazla plan oluşturabilirsin.` : error.message || "Plan oluşturulurken bir sorun oldu. Lütfen tekrar dene.") });
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
    const goal = profile?.examTrack === "LGS"
      ? [profile.targetHighSchool, profile.targetLgsScore ? `${profile.targetLgsScore} puan` : "", `LGS ${profile.examYear ?? ""}`.trim()].filter(Boolean).join(" · ")
      : profile?.targetUniversity
      ? `${profile.targetUniversity}${profile.targetDepartment ? ` · ${profile.targetDepartment}` : ""}${profile.examYear ? ` · YKS ${profile.examYear}` : ""}`
      : profile?.targetScoreType
        ? `${TARGET_SCORE_TYPE_LABELS[profile.targetScoreType]}${profile.examYear ? ` · YKS ${profile.examYear}` : ""}`
        : "YKS 2027 · 50.000 hedefi";
    // Sunucu sınırları: en fazla 50 konu (öncelikli olanlar), son 10 deneme, 30 kitap.
    const recentExams = [...exams].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 10);
    generatePlan.mutate({ topics: selectTopicsForAiPlan(topics).map(({ topic, subject, exam, progress, status }) => ({ topic, subject, exam, progress, status })), exams: recentExams.map(({ title, date, net, subjects, topicDetails }) => ({ title, date, net, subjects, topicDetails })), books: personalBooks.slice(0, 30).map((book) => { const rows = personalBookLogs.filter((log) => log.bookId === book.id); const totalQuestions = rows.reduce((sum, row) => sum + row.questions, 0); const correct = rows.reduce((sum, row) => sum + row.correct, 0); return { id: book.id, title: book.title, subject: book.subject, exam: book.exam, level: book.level, pageCount: book.pageCount, totalQuestions, accuracy: totalQuestions ? Math.round((correct / totalQuestions) * 100) : 0, activeDays: new Set(rows.map((row) => row.date)).size, mappings: (resourcesSnapshot.data?.mappings || []).filter((mapping) => mapping.bookId === book.id).slice(0, 50).map((mapping) => ({ topic: mapping.topic, pageStart: mapping.pageStart ?? undefined, pageEnd: mapping.pageEnd ?? undefined, testStart: mapping.testStart ?? undefined, testEnd: mapping.testEnd ?? undefined })) }; }), availableMinutes, goal, studentProfile, startDate: toLocalDateKey() });
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
  return <div className="space-y-7 animate-page-in"><PageHeader eyebrow="Yapay zekâlı çalışma koçu" title="AI Planım" description="Profilin, son denemelerin, konu durumların ve ders programındaki boş zamanların okunur; her güne uygulanabilir küçük oturumlar yerleştirilir ve takvimine eklenir." actions={<>{plan && <button onClick={() => onSection("calendar")} className={secondaryButton}><CalendarDays size={16} /> Takvimde düzenle</button>}<Button onClick={createPlan} disabled={generatePlan.isPending} className="h-10 rounded-xl bg-pencil px-4 text-[14px] font-semibold text-ink shadow-[var(--shadow-card)] hover:bg-pencil-strong disabled:opacity-60"><Sparkles className="mr-2" size={16} />{generatePlan.isPending ? "Planın hazırlanıyor..." : plan ? "Planı yeniden oluştur" : "Haftalık plan oluştur"}</Button></>} /><Card className="soft-card p-4 sm:p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="text-[13px] font-semibold text-ink-2">Haftalık zaman bütçen</div><div className="mt-1 text-[12px] text-ink-3">AI planı günlerine bu süreyi dengeli dağıtır.</div></div><div className="flex items-center gap-3 sm:min-w-[300px]"><input aria-label="Haftalık çalışma süresi" type="range" min="300" max="1200" step="60" value={availableMinutes} onChange={(event) => setAvailableMinutes(Number(event.target.value))} className="w-full accent-brand" /><span className="w-16 text-right text-[14px] font-bold text-brand">{formatMinutes(availableMinutes)}</span></div></div></Card>
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[0.78fr_1.22fr]">{!plan ? <section className="coach-hero flex min-h-[360px] flex-col justify-between p-6 sm:p-7"><div><span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-brand shadow-[var(--shadow-card)]"><Sparkles size={13} /> Verinden öğrenir</span><h2 className="mt-6 max-w-[420px] text-[26px] font-extrabold leading-tight text-ink">Bu haftanın planı senin verinden çıkar.</h2><p className="mt-3 max-w-[420px] text-[14px] leading-6 text-ink-2">Plan, aşağıdaki gerçek verilerinle kurulur. Veri arttıkça öneriler kişiselleşir; planın nedenleri her oturumda yazılır.</p></div><div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2">{[{ label: "Zayıf konu", value: String(topics.filter((item) => item.status === "Zayıf" && !item.insufficientData).length) }, { label: `Son ${planExamKinds[0]} neti`, value: exams.find((item) => (item.exam ?? "TYT") === planExamKinds[0])?.net.toFixed(2) ?? "—" }, { label: "Haftalık bütçe", value: formatMinutes(availableMinutes) }, { label: "Ders programı", value: classSchedule.data?.blocks.length ? "Var" : "Yok" }].map((item) => <div key={item.label} className="rounded-xl border border-rule bg-white p-3"><div className="text-[12px] text-ink-3">{item.label}</div><div className="mt-1 text-[20px] font-extrabold text-ink">{item.value}</div></div>)}</div></section> : <Card className="soft-card p-6 sm:p-7"><div className="eyebrow mb-3">Koç özeti</div><h2 className="text-[28px] font-semibold leading-tight text-ink font-display">{plan.summary}</h2><div className="mt-7"><div className="mb-3 flex items-center justify-between"><span className="text-[12px] font-bold text-ink-4">Öncelik sırası</span><span className="text-[12px] text-ink-4">{plan.focus.length} konu</span></div><div className="space-y-2">{plan.focus.slice(0, 4).map((focus, index) => <div key={`${focus.topic}-${index}`} className="flex items-start gap-3 rounded-xl bg-paper p-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-danger-soft text-[12px] font-bold text-danger">{index + 1}</span><div><div className="text-[13px] font-semibold text-ink-2">{focus.topic}</div><div className="mt-0.5 text-[12px] text-ink-3">{focus.subject} · {focus.reason}</div></div></div>)}</div></div><div className="mt-6 rounded-xl border border-brand/10 bg-brand-soft p-4"><div className="flex items-start gap-2.5"><Sparkles size={15} className="mt-0.5 shrink-0 text-brand" /><p className="text-[13px] leading-5 text-ink-2">{plan.coachNote}</p></div></div></Card>}
      <Card className="soft-card p-6 sm:p-7"><div className="mb-5 flex items-end justify-between"><div><div className="eyebrow mb-2">7 günlük akış</div><h2 className="text-[23px] font-semibold text-ink font-display">{plan ? "Her gün için net bir sonraki adım." : "Önce verini oku, sonra planla."}</h2></div>{plan && <span className="rounded-full bg-success-soft px-2.5 py-1 text-[12px] font-bold text-success">{history.length} tamamlandı</span>}</div>{plan ? <><div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">{plan.days.map((day, index) => <button key={`${day.day}-${index}`} onClick={() => setSelectedDay(index)} className={`rounded-xl px-1 py-3 text-center transition ${selectedDay === index ? "bg-brand text-white" : "bg-paper text-ink-3 hover:bg-rule"}`}><div className="text-[12px] font-bold">{day.day.slice(0, 3)}</div><div className="mt-1 text-[13px] font-semibold">{day.date ? day.date.slice(-2) : index + 1}</div></button>)}</div>{activeDay && <div className="mt-5"><div className="mb-4 flex items-center justify-between"><div><div className="text-[14px] font-semibold text-ink-2">{activeDay.day}</div><div className="mt-1 text-[12px] text-ink-4">{activeDay.sessions.length} oturum · toplam {activeDay.totalMinutes} dakika</div></div><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand"><CalendarDays size={17} /></div></div><div className="space-y-2">{activeDay.sessions.map((session, index) => { const done = isCompleted(session, index); return <div key={`${session.title}-${index}`} className={`flex items-start gap-3 rounded-xl border p-3 transition ${done ? "border-success/20 bg-success-soft/50" : "border-ink/[0.07]"}`}><button onClick={() => toggleSession(session, index)} aria-label={done ? "Oturumu geri al" : "Oturumu tamamla"} className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${done ? "bg-success text-white" : toneClasses[index % 2 === 0 ? "blue" : "coral"]}`}>{done ? <CheckCircle2 size={16} /> : <Clock3 size={15} />}</button><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className={`text-[13px] font-semibold ${done ? "text-success line-through" : "text-ink-2"}`}>{session.title}</span><span className="rounded-full bg-paper px-2 py-0.5 text-[11px] font-bold text-ink-3">{done ? "Tamamlandı" : session.kind}</span></div><div className="mt-1 text-[12px] text-ink-3">{session.subject} · {session.topic}</div>{session.bookTitle && <div className="mt-2 flex flex-wrap gap-2 text-[12px] font-semibold text-brand"><span className="rounded-md bg-brand-soft px-2 py-1">{session.bookTitle}</span>{session.targetQuestions && <span className="rounded-md bg-success-soft px-2 py-1">{session.targetQuestions} soru</span>}{session.targetPages ? <span className="rounded-md bg-warn-soft px-2 py-1">sf. {session.targetPages}</span> : <span className="rounded-md bg-paper px-2 py-1">sayfa verisi yok</span>}{session.targetTests && <span className="rounded-md bg-danger-soft px-2 py-1">test {session.targetTests}</span>}</div>}<p className="mt-1.5 text-[12px] leading-4 text-ink-4">{session.rationale}</p></div><span className={`whitespace-nowrap text-[12px] font-bold ${done ? "text-success" : "text-brand"}`}>{session.minutes} dk</span></div>; })}</div></div>}</> : <div className="flex min-h-[290px] flex-col items-center justify-center rounded-2xl bg-paper px-8 text-center"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand"><CalendarDays size={24} /></div><p className="mt-5 max-w-[280px] text-[14px] leading-6 text-ink-3">Butona bastığında zayıf olduğun konular ve son denemelerin için 7 günlük kişisel akış burada görünecek.</p><button onClick={createPlan} className="mt-5 text-[13px] font-bold text-brand">İlk planı oluştur <ArrowRight className="ml-1 inline" size={14} /></button></div>}</Card></div>
    <Card className="soft-card p-6 sm:p-7"><div className="flex items-center justify-between"><div><div className="eyebrow mb-2">Çalışma geçmişi</div><h2 className="text-[23px] font-semibold text-ink font-display">Küçük zaferlerin birikiyor.</h2></div><span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1.5 text-[12px] font-bold text-success"><History size={12} /> {history.length} oturum</span></div>{history.length === 0 ? <div className="mt-5 rounded-2xl bg-paper p-5 text-[13px] leading-5 text-ink-3">Bir AI planı oluşturduktan sonra oturum kartlarındaki daireye tıklayarak tamamladıklarını buraya ekleyebilirsin.</div> : <div className="mt-5 grid gap-2 sm:grid-cols-2">{history.slice(0, 8).map((item) => <div key={`${item.id}-${item.completedAt}`} className="flex items-center gap-3 rounded-xl border border-success/15 bg-success-soft/40 p-3"><CheckCircle2 size={16} className="shrink-0 text-success" /><div className="min-w-0 flex-1"><div className="truncate text-[13px] font-semibold text-ink-2">{item.title}</div><div className="mt-1 text-[12px] text-ink-3">{item.subject} · {item.minutes} dk · {new Date(item.completedAt).toLocaleDateString("tr-TR")}</div></div></div>)}</div>}</Card>
  </div>;
}


type FocusModeProps = { onClose: () => void; initialSession?: FocusSessionSeed | null; onGoToCalendar: () => void; topics: Topic[]; onMarkedForReview?: (marked: { slug: string; exam: ExamKind; subject: string; topic: string }) => void };

function FocusMode({ onClose, initialSession, onGoToCalendar, topics, onMarkedForReview }: FocusModeProps) {
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
  const todaysPlan = trpc.calendar.snapshot.useQuery(undefined, { enabled: !initialSession, retry: false });
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
  // Ortam sesi saate bağlı: odak sürerken tam, nefes molasında yarım, aksi halde susar.
  const ambient = useAmbientSound(breakMode ? "half" : status === "running" ? "full" : "off");

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

  // Süre doldurulmak zorunda: başlamış ama bitmemiş oturumdan çıkış yarım sayılır ve konu
  // Konu Haritası'nda tekrar gerektiren konulara eklenir (topics.markForReview). Duraklatma
  // ve nefes molası yarım sayılmaz. Onay kartı açıkken süre durur, vazgeçilirse kaldığı yerden sürer.
  const [confirmExit, setConfirmExit] = useState<{ resume: boolean } | null>(null);
  // Geri çağırmalar mutate() yerine burada: odak ekranı yanıt gelmeden kapanır, mutate() seviyesindekiler o zaman çalışmaz.
  const markForReview = trpc.topics.markForReview.useMutation({
    onSuccess: (marked, { sessionId, ...input }) => { if (sessionId) void utils.calendar.snapshot.invalidate(); if (marked) onMarkedForReview?.({ slug: marked.slug, ...input }); toast(`Oturum yarım kaldı; ${input.topic} tekrar gerektiren konulara eklendi.`); },
    onError: () => toast.error("Oturum yarım kaldı ama konu tekrar listesine eklenemedi."),
  });
  const leave = () => { document.exitFullscreen?.().catch(() => undefined); onClose(); };
  const requestExit = () => {
    if (status !== "running" && status !== "paused") { leave(); return; }
    const resume = status === "running";
    if (resume) clock.pause();
    if (breakMode) { setBreakMode(false); setBreakSeconds(60); }
    setConfirmExit({ resume: resume || breakMode });
  };
  const cancelExit = () => { if (confirmExit?.resume) clock.resume(); setConfirmExit(null); };
  const { kinds: focusExamKinds } = useExamTrack();
  const abandonSession = () => {
    const exam = topics.find((item) => item.subject === subject && item.topic === topic)?.exam ?? focusExamKinds[0];
    markForReview.mutate({ exam, subject, topic, sessionId: effectiveSessionId });
    leave();
  };

  const finishFocus = () => {
    const questions = Number(result.questions) || 0;
    const minutes = Math.max(1, Math.round(clock.elapsedMs / 60000));
    const shared = { questions, correct: Number(result.correct) || 0, wrong: Number(result.wrong) || 0, blank: Number(result.blank) || 0, note: result.note || undefined };
    if (effectiveSessionId) {
      // Takvimle eşleşmiş bir oturum — kaydı tekrarlamak yerine doğrudan o
      // studyPlanSessions satırını tamamlanmış işaretle (bkz. server/db.ts
      // completeStudySession — bu, konu haritasını da otomatik günceller).
      completeLinkedSession.mutate({ sessionId: effectiveSessionId, actualMinutes: minutes, actualQuestions: questions, correct: shared.correct, wrong: shared.wrong, blank: shared.blank, note: shared.note });
      return;
    }
    const payload = { subject, topic, studyDate: new Date().toISOString(), minutes, ...shared };
    focusLog.mutate(payload);
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
    <Suspense fallback={null}><FocusAuraVideo isPlaying={status === "running"} enabled={DEFAULT_FOCUS_AURA_CONFIG.enableVideo && !isPrepare} /></Suspense>
    {DEFAULT_FOCUS_AURA_CONFIG.enableAura && !isPrepare && <div className="focus-aura-tint" />}
    <span className="sr-only" aria-live="polite">{srLabel}</span>
    <div className="focus-topbar">
      <div className="flex items-center gap-3"><div className="brand-mark">P</div><div className="focus-brand-text"><div className="text-[14px] font-bold text-white">pusula odak</div><div className="text-[12px] text-white/45">{subject} · {topic}</div></div></div>
      <div className="flex items-center gap-2">
        <button onClick={() => notebook.open({ prefill: { subject, title: `${topic} · odak notu` } })} className="focus-close" aria-label="Çalışırken not al (zamanlayıcı durmaz)">📝 Not al</button>
        {(status === "running" || isPausedExplicitly) && <button onClick={togglePause} className="focus-close" aria-label={status === "running" ? "Odağı duraklat" : "Odağa devam et"}>{status === "running" ? <><Pause size={14} /> Duraklat</> : <><Play size={14} /> Devam et</>}</button>}
        <AmbientSoundControl ambient={ambient} cuesEnabled={soundEnabled} onToggleCues={() => setSoundEnabled((value) => !value)} />
        <button onClick={requestExit} className="focus-close"><X size={16} /> Çıkış</button>
      </div>
    </div>
    <div className="focus-body">
      {isPrepare && <div className="focus-prepare"><div className="focus-kicker"><Zap size={14} /> {duration} dakikalık tek hedef</div><h1>Şimdi yalnızca<br /><span>{topic}</span> ile ilgilen.</h1><p className="focus-briefing">{`Bugün ${briefingDateLabel}, saat ${briefingTimeLabel}'de ${subject} dersinin ${topic} konusunu ${duration} dakika çalışacaksın.`}</p><p>Telefonunu uçak moduna al. Pusula süreyi, küçük adımları ve oturum sonu verilerini senin için takip edecek.</p>
        {!initialSession && todaysSessions.length > 0 && <div className="focus-plan-picker"><div className="focus-kicker">Bugün çalışılması gerekenler · {todaysDoneCount}/{todaysSessions.length} tamamlandı</div><div className="mt-3 flex w-full max-w-md flex-col gap-1.5">{todaysSessions.map((planned) => { const isDone = planned.status === "completed"; return <button key={String(planned.id)} onClick={() => pickPlannedSession(planned)} disabled={isDone} className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-left text-[12px] transition ${isDone ? "cursor-default border-white/5 bg-white/5 text-white/40" : pickedSessionId === planned.id ? "border-pencil bg-white/10 text-white" : "border-white/15 text-white/70 hover:bg-white/10"}`}><span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${isDone ? "bg-success text-white" : "border border-white/25"}`}>{isDone && <Check size={11} />}</span>{!isDone && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: subjectColors[planned.subject] ?? palette.ink3 }} />}<span className="min-w-0 flex-1"><span className={`block font-semibold ${isDone ? "line-through" : ""}`}>{planned.subject} · {planned.topic}</span><span className="text-[12px] text-white/40">{planned.kind} · {planned.plannedMinutes} dk{isDone && planned.actualMinutes ? ` · ${planned.actualMinutes} dk yapıldı` : ""}</span></span></button>; })}</div>{pickedSessionId && <button onClick={() => setPickedSessionId(undefined)} className="mt-2 rounded-xl px-3 py-2 text-[12px] text-white/45 underline">Farklı bir konu çalış</button>}{!showManualPicker && <button onClick={() => setShowManualPicker(true)} className="mt-2 rounded-xl px-3 py-2 text-[12px] text-white/45 underline">Listede yok, elle ders/konu seç</button>}</div>}
        {!initialSession && !todaysPlan.isLoading && todaysSessions.length === 0 && <div className="focus-plan-picker"><div className="focus-kicker">Bugün için planlı ders yok</div><p className="mt-2 max-w-xs text-center text-[12px] text-white/45">Takvim sekmesinden bugünün Pusula Odak planını oluşturabilirsin.</p><button onClick={onGoToCalendar} className="mt-3 rounded-xl border border-white/15 px-3 py-2 text-[12px] font-semibold text-white/80 hover:bg-white/10">Takvim'e git</button></div>}
        {(todaysSessions.length === 0 || showManualPicker) && <div className="focus-setup-grid"><label>Ders<select value={subject} onChange={(event) => setSubject(event.target.value)}>{todaysSubjectOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label>Konu<select value={topic} onChange={(event) => setTopic(event.target.value)}>{todaysTopicOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label>Süre<select value={duration} onChange={(event) => setDuration(Number(event.target.value))}><option value="25">25 dakika</option><option value="30">30 dakika</option><option value="45">45 dakika</option><option value="60">60 dakika</option></select></label></div>}<div className="focus-checklist"><div><CheckCircle2 size={16} /> Telefonu uçak moduna al</div><div><CheckCircle2 size={16} /> Masanda yalnızca gerekli kaynak kalsın</div><div><CheckCircle2 size={16} /> Süre bitince soru ve doğruluk verisini gir</div></div><button onClick={startFocus} className="focus-start"><Sparkles size={17} /> Odağı başlat</button></div>}
      {!isPrepare && <div className={`focus-running ${breakMode ? "is-breathing" : ""}`}>
        <div className="focus-orbit focus-orbit-a" /><div className="focus-orbit focus-orbit-b" />
        {confirmExit && <div className="focus-pause-backdrop" style={{ zIndex: 7 }}><div className="focus-pause-card" role="alertdialog" aria-label="Oturumdan çık"><div className="focus-kicker">Süre dolmadı</div><h2>Oturumu yarım mı bırakıyorsun?</h2><p>{minutes}:{seconds} kaldı. Şimdi çıkarsan bu oturum kaydedilmez ve <strong className="text-white">{topic}</strong> Konu Haritası'nda tekrar gerektiren konulara eklenir.</p><button onClick={cancelExit} className="focus-start"><Play size={16} /> Odağa devam et</button><button onClick={abandonSession} className="focus-secondary">Yarım bırak ve çık</button></div></div>}
        {isPausedExplicitly && !confirmExit && <div className="focus-pause-backdrop"><div className="focus-pause-card"><div className="focus-kicker">Duraklatıldı</div><h2>Odak duraklatıldı.</h2><p>{minutes}:{seconds} kaldığın yerde bekliyor. Hazır olduğunda devam et.</p><button onClick={togglePause} className="focus-start"><Play size={16} /> Devam et</button></div></div>}
        {breakMode && <div className="breath-card"><div className="focus-kicker">Kısa mola · {String(Math.floor(breakSeconds / 60)).padStart(2, "0")}:{String(breakSeconds % 60).padStart(2, "0")}</div><h2>Nefesini yavaşlat.</h2><div className="breath-orb"><span /></div><div className="breath-instruction">{Math.floor((60 - breakSeconds) / 4) % 2 === 0 ? "Nefes al" : "Nefes ver"}</div><p>Omuzlarını bırak. Dört saniye nefes al, dört saniye ver.</p><button onClick={endBreakEarly} className="focus-secondary">Odağa dön</button></div>}
        {completionPulse && <div className="focus-completion-pulse" aria-hidden="true"><div className="focus-completion-ring" /></div>}
        <div className="synapse-field">{nodes.map((node, index) => <span key={index} className="synapse-node" style={{ left: node.left, top: node.top, animationDelay: node.delay, width: node.size, height: node.size }} />)}<div className="synapse-core"><div className="synapse-core-ring" /><div className="focus-time">{minutes}:{seconds}</div><div className="focus-time-label">{isCompleted ? "SÜRE DOLDU" : isPausedExplicitly ? "DURAKLATILDI" : "ODAK SÜRESİ"}</div></div></div>
        <div className="focus-progress"><div className="focus-progress-fill" style={{ width: `${progress * 100}%` }} /></div>
        {breakAvailable && !breakMode && status === "running" && <div className="break-prompt"><div><div className="focus-kicker">Mola önerisi</div><div className="text-[13px] font-semibold text-white">Bir dakikalık nefes molası ister misin?</div></div><button onClick={startBreak} className="focus-secondary">Nefes molası</button></div>}
        <div className="focus-todo"><div className="focus-todo-head"><div><div className="focus-kicker">{isCompleted ? "Oturum tamamlandı" : "Şu anki görev"}</div><h2>{topic} · {isCompleted ? "sonuçlarını kaydet" : "küçük bir adım daha"}</h2></div><div className="focus-percent">%{Math.round(progress * 100)}</div></div><div className="focus-task-list"><div className="is-done"><CheckCircle2 size={16} /> Kaynak ve konu seçildi</div><div className={progress > 0.08 ? "is-done" : ""}><CheckCircle2 size={16} /> Konuyu çalış / özet çıkar</div><div className={progress > 0.45 ? "is-done" : ""}><CheckCircle2 size={16} /> Soruları çöz</div><div className={progress > 0.8 ? "is-done" : ""}><CheckCircle2 size={16} /> Hata notunu hazırla</div></div>{isCompleted ? <button onClick={() => setShowSummary(true)} className="focus-start">Oturum verisini gir <ArrowRight size={16} /></button> : <p className="text-[12px] text-white/45">Sonuçlarını süre dolunca girersin.</p>}</div>
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
  /** Bu oturumdan açılan odak süre dolmadan bırakıldı. */
  abandonedAt?: string | Date | null;
  actualMinutes?: number | null;
  actualQuestions?: number | null;
  correct?: number | null;
  wrong?: number | null;
  blank?: number | null;
  actualPages?: number | null;
  note?: string | null;
  /** Kurum öğretmeninin atadığı görev. */
  assignedByUserId?: number | null;
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
  /** Kullanıcının takvim verisi henüz yükleniyorsa true; boş durumun bir an görünmesini önler. */
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
    return <Card className="soft-card overflow-hidden p-5"><div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="eyebrow flex items-center gap-2"><Target size={13} /> Plan Uyum Merkezi</div><p className="mt-2 max-w-md text-[13px] leading-5 text-ink-3">Uyum verilerin şu anda yüklenemedi. Bağlantını kontrol edip tekrar dene.</p></div>{onRetry && <button onClick={onRetry} className="shrink-0 rounded-xl bg-brand px-3 py-2 text-[12px] font-bold text-white hover:bg-brand-strong">Tekrar dene</button>}</div></Card>;
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
        <div className="flex items-center gap-4"><AdherenceRing value={result.overallScore} color={overallTone.color} />{onRefresh && <button onClick={onRefresh} disabled={isRefreshing} className="rounded-xl bg-brand px-3 py-2 text-[12px] font-bold text-white hover:bg-brand-strong disabled:opacity-50">{isRefreshing ? "Analiz ediliyor" : "Koçu güncelle"}</button>}</div>
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
function LibrarySessionForm({ onClose }: { onClose: () => void }) {
  const utils = trpc.useUtils();
  const resourcesSnapshot = trpc.resources.snapshot.useQuery(undefined, { retry: false });
  const myLibrary = trpc.catalog.myLibrary.useQuery(undefined, { retry: false });
  const savePlan = trpc.calendar.savePlan.useMutation({ onSuccess: () => { utils.calendar.snapshot.invalidate(); toast.success("Oturum takvime eklendi."); onClose(); }, onError: () => toast.error("Oturum eklenemedi, tekrar dener misin?") });

  const legacyInventoryIds = (resourcesSnapshot.data?.inventory ?? []).map((row) => row.bookId).filter((id) => !/^\d+$/.test(id));
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
    const weekStart = new Date(`${date}T00:00:00`);
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 1);
    savePlan.mutate({ title: "Kütüphanemden oturum", weekStart: weekStart.toISOString(), weekEnd: weekEnd.toISOString(), summary: `${selected.title} kaynağından manuel oturum.`, source: "manual", sessions: [{ sessionDate: sessionDateIso, title, subject, topic, kind, plannedMinutes }] });
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
};

/**
 * Günlük alışkanlık kartı (paragraf pratiği / gece okuması) — "şimdi yaptım"
 * tarzı, tek adımda tamamlanmış bir oturum kaydeder (bkz. calendar.logRoutine).
 * İkisi de aynı yapıyı paylaştığı için parametreli tek bileşen olarak yazıldı.
 */
function RoutineHabitCard({ kind, icon: Icon, eyebrow, title, description, defaultMinutes, amountLabel, amountUnit, isPages, showBookTitle, todaysSession }: RoutineHabitCardProps) {
  const utils = trpc.useUtils();
  // Süre alanı hedef dakikayla (defaultMinutes) ÖN DOLDURULMAZ — aksi halde
  // hiç yapılmadan "kaydet"e basmak bile plan uyum skoruna tam süre kredisi
  // yazardı. Boş bırakılırsa kayıt reddedilir (bkz. submit).
  const [minutes, setMinutes] = useState("");
  const [amount, setAmount] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  // Gece okuması: okuma listesinden kitap seçilir; okunan sayfalar o kitabın ilerlemesine eklenir.
  const readingBooks = trpc.reading.list.useQuery(undefined, { enabled: Boolean(showBookTitle), retry: false });
  const activeBooks = (readingBooks.data ?? []).filter((book) => book.status === "reading");
  const [bookChoice, setBookChoice] = useState<string>("");
  const [showReadingDialog, setShowReadingDialog] = useState(false);
  const chosenBook = activeBooks.find((book) => String(book.id) === (bookChoice || String(activeBooks[0]?.id ?? "")));
  // Bugünkü kayıt bir okuma kitabına aitse (konu = kitap adı) tamamlandı ekranında da ilerlemesi görünür.
  const loggedBook = showBookTitle && todaysSession ? (readingBooks.data ?? []).find((book) => book.title === todaysSession.topic) : undefined;
  const logRoutine = trpc.calendar.logRoutine.useMutation({ onSuccess: (result) => { utils.calendar.snapshot.invalidate(); utils.reading.list.invalidate(); toast.success(result?.readingBook?.justFinished ? `Tebrikler, "${result.readingBook.title}" bitti!` : "Kaydedildi; bugünkü rutin tamamlandı."); }, onError: () => toast.error("Kaydedilemedi, tekrar dener misin?") });
  const isDone = todaysSession?.status === "completed";

  const submit = () => {
    const parsedMinutes = Number(minutes);
    if (!minutes.trim() || !Number.isFinite(parsedMinutes) || parsedMinutes <= 0) { toast.error("Gerçekte kaç dakika yaptığını gir."); return; }
    const mins = Math.round(parsedMinutes);
    const value = Math.max(0, Number(amount) || 0);
    const linkedBook = showBookTitle && bookChoice !== "other" ? chosenBook : undefined;
    const typedTitle = linkedBook ? linkedBook.title : bookTitle.trim();
    const topic = showBookTitle && typedTitle ? typedTitle : title;
    const note = showBookTitle && typedTitle ? `${typedTitle} · ${value} ${amountUnit}.` : `${value} ${amountUnit}.`;
    logRoutine.mutate({ title, subject: "Rutin", topic, kind, plannedMinutes: defaultMinutes, actualMinutes: mins, actualPages: isPages ? value : undefined, note, ...(linkedBook ? { readingBookId: linkedBook.id } : {}) });
    setAmount(""); setBookTitle("");
  };

  return <Card className="soft-card p-5">
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"><Icon size={18} /></div>
      <div className="min-w-0 flex-1"><div className="eyebrow">{eyebrow}</div><h2 className="mt-1 text-[16px] font-semibold text-ink">{title}</h2><p className="mt-1 text-[12px] leading-5 text-ink-3">{description}</p></div>
    </div>
    {isDone ? (
      <div className="mt-4 space-y-3">
        <div className="flex items-center gap-2 rounded-2xl bg-success-soft p-4 text-[13px] font-semibold text-success"><CheckCircle2 size={16} className="shrink-0" /> Bugün tamamlandı — {todaysSession?.actualMinutes ?? 0} dk{typeof todaysSession?.actualPages === "number" ? ` · ${todaysSession.actualPages} sayfa` : todaysSession?.note ? ` · ${todaysSession.note.replace(/\.$/, "")}` : ""}</div>
        {loggedBook && (
          <div className="rounded-2xl border border-rule p-3">
            <div className="mb-1.5 flex items-baseline justify-between gap-2 text-[12px]"><span className="truncate font-semibold text-ink">{loggedBook.title}{loggedBook.status === "finished" && <span className="ml-2 rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-bold text-success">Bitti</span>}</span><span className="shrink-0 text-ink-3">{readingProgressLabel(loggedBook)}</span></div>
            {loggedBook.totalPages ? <Bar100 value={(loggedBook.pagesRead / loggedBook.totalPages) * 100} /> : null}
          </div>
        )}
        {showBookTitle && <button type="button" onClick={() => setShowReadingDialog(true)} className="text-[12px] font-semibold text-brand hover:text-brand-strong">Okuma listemi gör</button>}
      </div>
    ) : (
      <div className="mt-4 grid grid-cols-2 gap-3">
        {showBookTitle && activeBooks.length > 0 && (
          <div className="col-span-2">
            <label className="text-[12px] font-semibold text-ink-3">Okuduğun kitap
              <select value={bookChoice || String(activeBooks[0].id)} onChange={(event) => setBookChoice(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-ink/10 bg-white px-3 text-[13px] text-ink-2">
                {activeBooks.map((book) => <option key={book.id} value={String(book.id)}>{book.title}{book.author ? ` — ${book.author}` : ""}</option>)}
                <option value="other">Listede olmayan bir kitap</option>
              </select>
            </label>
            {chosenBook && bookChoice !== "other" && <div className="mt-2"><div className="mb-1 flex justify-between text-[12px] text-ink-3"><span>İlerleme</span><span>{readingProgressLabel(chosenBook)}</span></div>{chosenBook.totalPages ? <Bar100 value={(chosenBook.pagesRead / chosenBook.totalPages) * 100} /> : null}</div>}
          </div>
        )}
        {showBookTitle && (activeBooks.length === 0 || bookChoice === "other") && <label className="col-span-2 text-[12px] font-semibold text-ink-3">Kitap adı (opsiyonel)<input value={bookTitle} onChange={(event) => setBookTitle(event.target.value)} placeholder="Şu an okuduğun kitap" className="mt-1 h-10 w-full rounded-xl border border-ink/10 px-3 text-[13px] text-ink-2" /></label>}
        {showBookTitle && <button type="button" onClick={() => setShowReadingDialog(true)} className="col-span-2 -mt-1 justify-self-start text-[12px] font-semibold text-brand hover:text-brand-strong">+ Okuma kitabı ekle {activeBooks.length > 0 ? "/ listemi gör" : "(ilerlemen kitapta tutulsun)"}</button>}
        <label className="text-[12px] font-semibold text-ink-3">Süre (dk) · hedef: {defaultMinutes}<input type="number" min="1" value={minutes} onChange={(event) => setMinutes(event.target.value)} placeholder="Gerçekte kaç dk?" className="mt-1 h-10 w-full rounded-xl border border-ink/10 px-3 text-[13px] text-ink-2" /></label>
        <label className="text-[12px] font-semibold text-ink-3">{amountLabel}<input type="number" min="0" value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-ink/10 px-3 text-[13px] text-ink-2" /></label>
        <Button onClick={submit} disabled={logRoutine.isPending} className="col-span-2 h-10 rounded-xl bg-pencil text-[12px] text-ink">{logRoutine.isPending ? "Kaydediliyor..." : "Bugün yaptım, kaydet"}</Button>
      </div>
    )}
    {showReadingDialog && <ReadingBookDialog onClose={() => setShowReadingDialog(false)} onAdded={(book) => setBookChoice(String(book.id))} />}
  </Card>;
}

function CalendarView({ topics, onSection, onStartFocusSession }: { topics: Topic[]; onSection: (section: DashboardSection) => void; onStartFocusSession: (seed: FocusSessionSeed) => void }) {
  const { user } = useAuth();
  const [view, setView] = useState<"day" | "week" | "month">("week");
  const [selectedDate, setSelectedDate] = useState(() => toLocalDateKey());
  // Ders programım: okul/dershane blokları takvimde sabit arka plan; plan yalnızca boş zamana yerleşir.
  const classSchedule = trpc.classSchedule.get.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const classBlocks = classSchedule.data?.blocks ?? [];
  const [showScheduleEditor, setShowScheduleEditor] = useState(false);
  const [weekMode, setWeekMode] = useState<"timeline" | "cards" | null>(null);
  const activeWeekMode = weekMode ?? (classBlocks.length > 0 ? "timeline" : "cards");
  const [slotDraft, setSlotDraft] = useState<{ date: Date; start: number; max: number; subject: string; topic: string; minutes: string } | null>(null);
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
  const extraSessionMutation = trpc.calendar.savePlan.useMutation({ onSuccess: () => { utils.calendar.snapshot.invalidate(); toast.success("Fazladan oturum bugünün planına eklendi."); }, onError: () => toast.error("Oturum eklenemedi, tekrar dener misin?") });
  const routineMutation = trpc.calendar.logRoutine.useMutation({ onSuccess: () => { utils.calendar.snapshot.invalidate(); toast.success("Kaydedildi; bugünkü rutin tamamlandı."); }, onError: () => toast.error("Kaydedilemedi, tekrar dener misin?") });
  const sessions = (snapshot.data?.sessions ?? []) as CalendarSession[];
  const logs = (snapshot.data?.logs ?? []) as TopicLog[];
  const dateKey = (value: string | Date) => toLocalDateKey(value);
  const todayKey = dateKey(new Date());
  const weakTopics = topics.filter((item) => item.status === "Zayıf").sort((a, b) => a.progress - b.progress);
  const legacyLibraryInventoryIds = (resourcesSnapshot.data?.inventory ?? []).map((row) => row.bookId).filter((id) => !/^\d+$/.test(id));
  const libraryBooks = [
    ...resourceBookCatalog.filter((book) => legacyLibraryInventoryIds.includes(book.id)).map((book) => ({ subject: book.subject, title: book.title })),
    ...(myLibrary.data ?? []).map((book) => ({ subject: book.subject ?? "Genel", title: book.name })),
  ];
  const dailyStudyMinutes = onboardingProfile.data?.dailyStudyDuration ?? 240;
  // Profilde saat belirtilmediyse makul bir varsayılana (16:00) düşer — bu bir
  // "resmi" veri değil, salt UX varsayılanı; öğrenci onboarding'de gerçek
  // saatini girdiğinde plan onu kullanır (bkz. shared/onboarding.ts).
  const studyStartTime = onboardingProfile.data?.preferredStudyStartTime || "16:00";
  // Bugünün boş zamanı: ders programı (+30 dk çıkış payı), zaten saatli planlanmış oturumlar ve
  // geçmiş saatler düşülür; 23:30'dan sonra plan yok (bkz. shared/classSchedule.ts).
  const now = new Date();
  const todayFrom = fromMinutes(Math.min(23 * 60 + 30, Math.max(toMinutes(studyStartTime) || 16 * 60, Math.ceil((now.getHours() * 60 + now.getMinutes()) / 5) * 5)));
  const todaysTimedBusy = sessions.filter((session) => dateKey(session.sessionDate) === todayKey && !(typeof session.sessionDate === "string" && session.sessionDate.length === 10) && session.status !== "skipped").map((session) => { const start = new Date(session.sessionDate); const minutes = start.getHours() * 60 + start.getMinutes(); return { source: "other" as const, dayOfWeek: ((now.getDay() + 6) % 7) + 1, startTime: fromMinutes(minutes), endTime: fromMinutes(Math.min(minutes + session.plannedMinutes, 23 * 60 + 59)), subject: null, label: session.title }; });
  const todaysFreeSlots = computeFreeSlots([...classBlocks.map((block) => ({ ...block, endTime: fromMinutes(Math.min(toMinutes(block.endTime) + 30, 23 * 60 + 59)) })), ...todaysTimedBusy], now, { from: todayFrom, buffer: 0 });
  const generatedPlan = generateDailyFocusPlan(dailyStudyMinutes, weakTopics.map((item) => ({ subject: item.subject, topic: item.topic, progress: item.progress })), libraryBooks, { date: now, startTime: studyStartTime, freeSlots: todaysFreeSlots });
  const targetSessionCount = Math.max(1, Math.round(dailyStudyMinutes / 40));
  const todaysOdakSessions = sessions.filter((session) => session.kind === "Odak" && dateKey(session.sessionDate) === todayKey);
  const todaysParagraphSession = sessions.find((session) => session.kind === "Paragraf" && dateKey(session.sessionDate) === todayKey);
  const todaysReadingSession = sessions.find((session) => session.kind === "Kitap Okuma" && dateKey(session.sessionDate) === todayKey);
  const todaysAllSessions = sessions.filter((session) => dateKey(session.sessionDate) === todayKey);
  const { current: currentSession, next: nextSession } = findCurrentAndNextSession(todaysAllSessions, new Date());
  const formatTimeRange = (session: CalendarSession) => { const start = new Date(session.sessionDate); const end = new Date(start.getTime() + session.plannedMinutes * 60000); const fmt = (date: Date) => date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }); return `${fmt(start)}–${fmt(end)}`; };
  const generateTodaysPlan = () => {
    if (todaysOdakSessions.length > 0) { toast("Bugün için zaten bir Pusula Odak planın var."); return; }
    if (generatedPlan.length === 0 && (weakTopics.length > 0 || libraryBooks.length > 0)) { toast.error("Bugün 23:30'a kadar 40 dk'lık bir oturum sığacak boş zamanın kalmadı. Yarın için planla ya da Ders programım'ı kontrol et."); return; }
    if (generatedPlan.length === 0) { toast.error("Plan oluşturmak için önce Konu Haritası'ndan birkaç konu değerlendir ya da Kaynak Kataloğu'ndan kitap ekle."); return; }
    const weekStart = new Date(); weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 1);
    dailyPlanMutation.mutate({ title: "Günlük Pusula Odak Planı", weekStart: weekStart.toISOString(), weekEnd: weekEnd.toISOString(), summary: `${generatedPlan.length} oturum · günlük ${dailyStudyMinutes} dk hedefine göre, saat ${studyStartTime}'ten başlayarak otomatik oluşturuldu.`, source: "ai", sessions: generatedPlan.map((item, index) => ({ sessionDate: item.startsAt ?? new Date(Date.now() + index * 60000).toISOString(), title: item.title, subject: item.subject, topic: item.topic, kind: item.kind, plannedMinutes: item.plannedMinutes })) });
  };
  const [showExtraForm, setShowExtraForm] = useState(false);
  const { track: examTrack } = useExamTrack();
  const extraSubjects = trackSubjects(examTrack);
  const slotSubjects = scheduleSubjectsFor(examTrack);
  const [extraSubject, setExtraSubject] = useState<string>("Türkçe");
  const [extraTopic, setExtraTopic] = useState("");
  const [extraMinutes, setExtraMinutes] = useState("30");
  const addExtraSession = () => {
    if (!extraTopic.trim()) { toast.error("Fazladan çalışmak istediğin konuyu yaz."); return; }
    const minutes = Math.max(5, Number(extraMinutes) || 30);
    const title = `${extraSubject} · ${extraTopic.trim()} (ekstra)`;
    const weekStart = new Date(); weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 1);
    extraSessionMutation.mutate({ title: "Fazladan oturum", weekStart: weekStart.toISOString(), weekEnd: weekEnd.toISOString(), summary: "Öğrencinin kendi eklediği ekstra oturum.", source: "manual", sessions: [{ sessionDate: new Date().toISOString(), title, subject: extraSubject, topic: extraTopic.trim(), kind: "Ekstra", plannedMinutes: minutes }] });
    setExtraTopic(""); setExtraMinutes("30"); setShowExtraForm(false);
  };
  const slotMutation = trpc.calendar.savePlan.useMutation({ onSuccess: () => { utils.calendar.snapshot.invalidate(); setSlotDraft(null); toast.success("Oturum boş zamanına eklendi."); }, onError: () => toast.error("Oturum eklenemedi, tekrar dener misin?") });
  const openSlot = (date: Date, start: number, max: number) => setSlotDraft({ date, start, max, subject: slotDraft?.subject ?? "Matematik", topic: "", minutes: String(Math.min(40, max)) });
  const addSlotSession = () => {
    if (!slotDraft) return;
    const topic = slotDraft.topic.trim();
    if (!topic) { toast.error("Çalışacağın konuyu yaz."); return; }
    const minutes = Math.max(5, Math.min(Number(slotDraft.minutes) || 40, 23 * 60 + 30 - slotDraft.start));
    const conflict = findClassConflict(classBlocks, slotDraft.date, slotDraft.start, minutes);
    if (conflict) { toast.error(`Bu saat ${conflict.label} (${conflict.startTime}–${conflict.endTime}) ile çakışıyor.`); return; }
    const startsAt = new Date(slotDraft.date); startsAt.setHours(0, slotDraft.start, 0, 0);
    const title = `${slotDraft.subject} · ${topic}`;
    const dayStart = new Date(startsAt); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
    slotMutation.mutate({ title: "Boş zamana eklenen oturum", weekStart: dayStart.toISOString(), weekEnd: dayEnd.toISOString(), summary: "Öğrencinin takvimdeki boş zamanına eklediği oturum.", source: "manual", sessions: [{ sessionDate: startsAt.toISOString(), title, subject: slotDraft.subject, topic, kind: "Ekstra", plannedMinutes: minutes }] });
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
  const adherence = calculatePlanAdherence(weekSessions, coachSnapshot.data ? coachSnapshot.data.averageAccuracy : weeklyAccuracy);
  const periodSessions = view === "day" ? sessionsFor(selected) : view === "week" ? weekSessions : sessions.filter((session) => { const date = new Date(session.sessionDate); return date.getFullYear() === selected.getFullYear() && date.getMonth() === selected.getMonth(); });
  const completedCount = periodSessions.filter((session) => session.status === "completed").length;
  const plannedMinutes = periodSessions.reduce((sum, session) => sum + session.plannedMinutes, 0);
  const actualMinutes = periodSessions.reduce((sum, session) => sum + (session.actualMinutes || 0), 0);
  const periodLogs = logs.filter((log) => periodSessions.some((session) => dateKey(session.sessionDate) === dateKey(log.studyDate) && session.topic === log.topic));
  const totalQuestions = periodLogs.reduce((sum, log) => sum + log.questions, 0);
  const accuracy = totalQuestions ? Math.round(periodLogs.reduce((sum, log) => sum + log.correct, 0) / totalQuestions * 100) : 0;
  const topicStats = Array.from(new Set(periodLogs.map((log) => `${log.subject}::${log.topic}`))).map((key) => { const [subject, topic] = key.split("::"); const rows = periodLogs.filter((log) => log.subject === subject && log.topic === topic); const questions = rows.reduce((sum, log) => sum + log.questions, 0); const correct = rows.reduce((sum, log) => sum + log.correct, 0); const minutes = rows.reduce((sum, log) => sum + log.minutes, 0); const sessionsOfTopic = periodSessions.filter((session) => session.subject === subject && session.topic === topic && session.status === "completed"); const planned = sessionsOfTopic.reduce((sum, session) => sum + (session.plannedMinutes || 0), 0); const latestNote = [...sessionsOfTopic].reverse().find((session) => session.note)?.note?.replace(`${topic} · `, "") ?? null; /* Alışkanlık kayıtlarında soru yok: doğruluk yerine süre hedefi ve girilen miktar (sayfa/paragraf) gösterilir. */ return { subject, topic, questions, accuracy: questions ? Math.round(correct / questions * 100) : 0, minutes, isHabit: questions === 0, timeGoal: planned ? Math.min(100, Math.round((minutes / planned) * 100)) : null, detail: latestNote }; }).sort((a, b) => Number(a.isHabit) - Number(b.isHabit) || b.questions - a.questions);
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
  const saveCompletion = () => { if (!completion) return; const payload = { actualMinutes: Number(completion.actualMinutes) || 0, actualQuestions: Number(completion.actualQuestions) || 0, correct: Number(completion.correct) || 0, wrong: Number(completion.wrong) || 0, blank: Number(completion.blank) || 0, note: completion.note || undefined }; if (typeof completion.session.id === "number") completeMutation.mutate({ sessionId: completion.session.id, ...payload }); };
  const sessionTiming = (session: CalendarSession): "Yarım kaldı" | "Şimdi" | "Sırada" | "Gecikti" | null => {
    if (session.status === "completed" || dateKey(session.sessionDate) !== todayKey) return null;
    if (session.abandonedAt) return "Yarım kaldı";
    if (currentSession?.id === session.id) return "Şimdi";
    if (nextSession?.id === session.id) return "Sırada";
    const end = new Date(session.sessionDate).getTime() + session.plannedMinutes * 60000;
    if (end < Date.now()) return "Gecikti";
    return null;
  };
  const timingBadgeClass: Record<string, string> = { "Yarım kaldı": "bg-warn-soft text-warn", Şimdi: "bg-success-soft text-success", Sırada: "bg-brand-soft text-brand", Gecikti: "bg-danger-soft text-danger" };
  const sessionCard = (session: CalendarSession) => { const timing = sessionTiming(session); return <div key={String(session.id)} className={`rounded-2xl border p-3 transition ${session.status === "completed" ? "border-success/20 bg-success-soft/60" : timing === "Şimdi" ? "border-brand/30 bg-brand-soft" : "border-ink/[0.07] bg-white"}`}><div className="flex items-start gap-3"><div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${session.status === "completed" ? "bg-success text-white" : "bg-brand-soft text-brand"}`}>{session.status === "completed" ? <CheckCircle2 size={16} /> : <Clock3 size={15} />}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-1.5"><div className={`text-[13px] font-semibold ${session.status === "completed" ? "text-success" : "text-ink-2"}`}>{session.title}</div>{session.assignedByUserId && <span className="rounded-full bg-violet-soft px-2 py-0.5 text-[11px] font-bold text-violet">Öğretmenin atadı</span>}{timing && <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold ${timingBadgeClass[timing]}`}>{timing}</span>}{typeof session.id === "number" && <button type="button" onClick={(event) => { event.stopPropagation(); notebook.open({ prefill: { studySessionId: session.id as number, subject: session.subject, title: `${session.topic} notu` } }); }} className="rounded-full bg-warn-soft px-1.5 py-0.5 text-[11px] font-bold text-warn" aria-label="Bu oturum için not al">📝 Not al</button>}</div><div className="mt-1 text-[12px] text-ink-3">{formatTimeRange(session)} · {session.subject} · {session.topic} · {session.plannedMinutes} dk</div><div className="mt-2 flex flex-wrap gap-1.5 text-[12px] font-semibold text-brand">{session.targetQuestions ? <span className="rounded-md bg-brand-soft px-2 py-1">{session.targetQuestions} soru</span> : null}{session.targetPages ? <span className="rounded-md bg-warn-soft px-2 py-1">sf. {session.targetPages}</span> : null}{session.targetTests ? <span className="rounded-md bg-danger-soft px-2 py-1">test {session.targetTests}</span> : null}</div>{session.status === "completed" && <div className="mt-2 text-[12px] font-medium text-success">{session.actualQuestions || 0} soru · %{session.actualQuestions ? Math.round(((session.correct || 0) / session.actualQuestions) * 100) : 0} doğruluk</div>}{session.rescheduledFrom && session.status !== "completed" && <div className="mt-2 flex items-center gap-1 text-[12px] font-semibold text-warn"><History size={12} /> Ertelendi · yarına taşındı</div>}</div>{session.status !== "completed" && <div className="flex shrink-0 flex-col gap-1.5">{session.kind === NOTEBOOK_REVIEW_TASK_KIND ? <button onClick={() => notebook.startReview()} className="rounded-lg bg-brand px-2.5 py-2 text-[12px] font-bold text-white hover:bg-brand-strong">Tekrar çöz</button> : <button onClick={() => onStartFocusSession({ sessionId: typeof session.id === "number" ? session.id : undefined, subject: session.subject, topic: session.topic, plannedMinutes: session.plannedMinutes, sessionDate: session.sessionDate })} className="rounded-lg bg-brand px-2.5 py-2 text-[12px] font-bold text-white hover:bg-brand-strong">Odakla başlat</button>}<button onClick={() => openCompletion(session)} className="rounded-lg bg-pencil px-2.5 py-2 text-[12px] font-bold text-ink">Tamamla</button></div>}</div></div>; };
  return <div className="space-y-6 animate-page-in"><PageHeader eyebrow="Çalışma takvimi" title="Takvim" description="Planlanan görevlerini gün, hafta ve ay olarak gör; tamamladıklarını işaretle, süre ve soru verilerin konu gelişimine otomatik işlensin." actions={<><button onClick={() => setShowScheduleEditor((value) => !value)} className={secondaryButton}><CalendarClock size={16} /> Ders programım{classBlocks.length > 0 && <span className="rounded-full bg-success-soft px-1.5 text-[11px] text-success">✓</span>}</button><button onClick={() => setShowLibraryForm((value) => !value)} className={secondaryButton}><Library size={16} /> Kütüphanemden oturum</button></>} /><div className="flex flex-wrap items-center justify-between gap-2"><Segmented value={view} options={[{ value: "day", label: "Günlük" }, { value: "week", label: "Haftalık" }, { value: "month", label: "Aylık" }]} onChange={setView} label="Takvim görünümü" /><span className="text-[12px] text-ink-3">{view === "day" ? selected.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" }) : view === "week" ? "Bu haftanın görevleri" : "Bu ayın görevleri"}</span></div><div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4"><StatCard icon={<CheckCircle2 size={18} />} tone="good" label="Tamamlanan görev" value={`${completedCount}/${periodSessions.length}`} progress={periodSessions.length ? (completedCount / periodSessions.length) * 100 : 0} foot={<><span>Planlanan / tamamlanan</span><span>%{periodSessions.length ? Math.round(completedCount / periodSessions.length * 100) : 0}</span></>} /><StatCard icon={<Clock3 size={18} />} label="Çalışma süresi" value={formatMinutes(actualMinutes || plannedMinutes)} foot={<span>{actualMinutes ? "gerçekleşen" : "planlanan"}</span>} /><StatCard icon={<PenLine size={18} />} label="Çözülen soru" value={String(totalQuestions)} foot={<span>%{accuracy} doğruluk</span>} /><StatCard icon={<NotebookPen size={18} />} label="Gelişim günlüğü" value={String(topicStats.length)} unit="konu" foot={<span>bu dönemde çalışılan konu</span>} /></div><Card className="soft-card p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="eyebrow flex items-center gap-2"><Zap size={13} /> Bugünün Pusula Odak Planı</div><h2 className="mt-1 text-[21px] font-semibold text-ink font-display">Günlük {dailyStudyMinutes} dk hedefin, {Math.max(1, Math.round(dailyStudyMinutes / 40))} oturuma bölünsün.</h2><p className="mt-1 max-w-xl text-[12px] leading-5 text-ink-3">Zayıf konularından ve kütüphanendeki kaynaklardan otomatik oluşturulur; her biri {40} dk. İstersen "Odakla başlat" ile doğrudan Pusula Odak'ı aç.</p>{todaysOdakSessions.length === 0 && <p className="mt-2 max-w-xl text-[12px] leading-5 text-ink-2">Bugün kalan boş zamanın: <strong>{formatMinutes(freeMinutes(todaysFreeSlots))}</strong>{todaysFreeSlots.length > 0 && ` (${todaysFreeSlots.slice(0, 3).map((slot) => `${fromMinutes(slot.start)}–${fromMinutes(slot.end)}`).join(", ")})`}.{generatedPlan.length > 0 && generatedPlan.length < targetSessionCount && <span className="text-warn"> Programına bugün {generatedPlan.length} oturum sığıyor.</span>}{classBlocks.length === 0 && <button onClick={() => setShowScheduleEditor(true)} className="ml-1 font-semibold text-brand">Okul/dershane saatlerini ekle →</button>}</p>}</div>{todaysOdakSessions.length === 0 && <Button onClick={generateTodaysPlan} disabled={dailyPlanMutation.isPending} className="h-10 shrink-0 rounded-xl bg-brand px-4 text-[13px] font-semibold text-white hover:bg-brand-strong">{dailyPlanMutation.isPending ? "Oluşturuluyor..." : "Bugünün planını oluştur"}</Button>}</div>{todaysOdakSessions.length > 0 && <div className="mt-4 grid gap-3 md:grid-cols-2">{todaysOdakSessions.map(sessionCard)}</div>}<div className="mt-5 border-t border-ink/[0.06] pt-4">{!showExtraForm ? <button onClick={() => setShowExtraForm(true)} className="inline-flex items-center gap-1.5 text-[12px] font-bold text-brand"><Plus size={14} /> Fazladan çalışmak istersen ders/konu seç</button> : <div className="grid gap-3 sm:grid-cols-[1fr_1.4fr_100px_auto]"><select value={extraSubject} onChange={(event) => setExtraSubject(event.target.value)} className="h-10 rounded-xl border border-ink/10 px-3 text-[13px] text-ink-2">{extraSubjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}</select><input value={extraTopic} onChange={(event) => setExtraTopic(event.target.value)} placeholder="Konu (örn. İntegral)" className="h-10 rounded-xl border border-ink/10 px-3 text-[13px] text-ink-2" /><input type="number" min="5" value={extraMinutes} onChange={(event) => setExtraMinutes(event.target.value)} className="h-10 rounded-xl border border-ink/10 px-3 text-[13px] text-ink-2" /><Button onClick={addExtraSession} className="h-10 rounded-xl bg-pencil text-[12px] text-ink">Ekle</Button></div>}</div></Card>
    {view === "day" && <DayNotes date={selectedDate} />}
    <PlanAdherenceCenter result={adherence} onRefresh={() => refreshCoach.mutate(coachPeriod)} isRefreshing={refreshCoach.isPending} isLoading={snapshot.isLoading} isError={snapshot.isError} onRetry={() => snapshot.refetch()} onCreatePlan={() => onSection("plan")} />{showLibraryForm && <LibrarySessionForm onClose={() => setShowLibraryForm(false)} />}{showScheduleEditor && <Suspense fallback={null}><ClassScheduleEditor onClose={() => setShowScheduleEditor(false)} /></Suspense>}{view === "day" && <Card className="soft-card p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="eyebrow">Günlük plan</div><h2 className="mt-1 text-[23px] font-semibold text-ink font-display">{selected.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })}</h2></div><input aria-label="Takvim günü" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="h-10 rounded-xl border border-ink/10 bg-white px-3 text-[12px] text-ink-2" /></div>{slotDraft && <div className="mt-4 rounded-2xl border border-success/30 bg-success-soft/50 p-3"><div className="flex items-center justify-between"><div className="text-[13px] font-semibold text-ink-2">{fromMinutes(slotDraft.start)} için oturum ekle <span className="font-normal text-ink-4">· en fazla {slotDraft.max} dk boş</span></div><button onClick={() => setSlotDraft(null)} aria-label="Oturum ekleme formunu kapat" className="rounded-lg p-1 text-ink-3 hover:bg-white"><X size={14} /></button></div><div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1.4fr_90px_auto]"><select aria-label="Ders" value={slotDraft.subject} onChange={(event) => setSlotDraft((draft) => draft && { ...draft, subject: event.target.value })} className="h-10 rounded-xl border border-ink/10 bg-white px-3 text-[13px] text-ink-2">{slotSubjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}</select><input value={slotDraft.topic} onChange={(event) => setSlotDraft((draft) => draft && { ...draft, topic: event.target.value })} placeholder="Konu (örn. Türev)" className="h-10 rounded-xl border border-ink/10 bg-white px-3 text-[13px] text-ink-2" /><input aria-label="Süre (dk)" type="number" min="5" max={slotDraft.max} value={slotDraft.minutes} onChange={(event) => setSlotDraft((draft) => draft && { ...draft, minutes: event.target.value })} className="h-10 rounded-xl border border-ink/10 bg-white px-3 text-[13px] text-ink-2" /><Button onClick={addSlotSession} disabled={slotMutation.isPending} className="h-10 rounded-xl bg-pencil text-[12px] text-ink">{slotMutation.isPending ? "Ekleniyor..." : "Ekle"}</Button></div></div>}<div className="mt-5"><TimeGrid dates={[selected]} blocks={classBlocks} sessions={periodSessions as TimelineSession[]} freeFrom={studyStartTime} onAddAt={openSlot} onSessionClick={(session) => openCompletion(session as CalendarSession)} /></div><div className="mt-5 space-y-2">{periodSessions.length ? periodSessions.map(sessionCard) : <div className="rounded-2xl bg-paper p-7 text-center text-[13px] text-ink-3">Bu gün için planlı oturum yok. Zaman çizelgesindeki boş bir aralığa dokunarak ekleyebilir ya da AI Planım ekranından haftalık plan oluşturabilirsin.</div>}</div></Card>}{view === "week" && <Card className="soft-card p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="eyebrow">Haftalık ritim</div><h2 className="mt-1 text-[23px] font-semibold text-ink font-display">{weekDates[0].toLocaleDateString("tr-TR", { day: "numeric", month: "short" })} – {weekDates[6].toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}</h2></div><div className="flex items-center gap-2"><div className="flex rounded-xl bg-paper p-1">{(["timeline", "cards"] as const).map((mode) => <button key={mode} onClick={() => setWeekMode(mode)} className={`rounded-lg px-2.5 py-1.5 text-[12px] font-semibold ${activeWeekMode === mode ? "bg-white text-ink shadow-sm" : "text-ink-3"}`}>{mode === "timeline" ? "Çizelge" : "Kartlar"}</button>)}</div><input aria-label="Takvim haftası" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="h-10 rounded-xl border border-ink/10 bg-white px-3 text-[12px] text-ink-2" /></div></div>{activeWeekMode === "timeline" ? <div className="mt-5"><TimeGrid dates={weekDates} blocks={classBlocks} sessions={weekSessions as TimelineSession[]} onSessionClick={(session) => { setSelectedDate(dateKey(session.sessionDate)); setView("day"); }} />{classBlocks.length === 0 && <p className="mt-3 text-[12px] text-ink-3">Okul ve dershane saatlerin çizelgede görünsün mü? <button onClick={() => setShowScheduleEditor(true)} className="font-semibold text-brand">Ders programını gir →</button></p>}</div> : <div className="mt-5 grid gap-3 md:grid-cols-7">{weekDates.map((date) => { const daySessions = sessionsFor(date); return <button key={date.toISOString()} onClick={() => { setSelectedDate(toLocalDateKey(date)); setView("day"); }} className={`min-h-[170px] rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 ${toLocalDateKey(date) === selectedDate ? "border-brand/30 bg-brand-soft" : "border-ink/[0.07] bg-white"}`}><div className="flex items-center justify-between"><span className="text-[12px] font-bold text-ink-3">{date.toLocaleDateString("tr-TR", { weekday: "short" })}</span><span className="text-[12px] font-semibold text-ink">{date.getDate()}</span></div>{noteBadge(date)}<div className="mt-4 space-y-1.5">{daySessions.slice(0, 3).map((session) => <div key={String(session.id)} className={`rounded-lg px-2 py-1.5 text-[12px] ${session.status === "completed" ? "bg-success-soft text-success" : "bg-brand-soft text-brand"}`}><div className="truncate font-semibold">{session.topic}</div><div className="mt-0.5">{formatTimeRange(session)}</div></div>)}{daySessions.length > 3 && <div className="text-[12px] text-ink-4">+{daySessions.length - 3} oturum</div>}</div></button>; })}</div>}</Card>}{view === "month" && <Card className="soft-card p-5"><div className="flex items-center justify-between"><div><div className="eyebrow">Aylık görünüm</div><h2 className="mt-1 text-[23px] font-semibold capitalize text-ink font-display">{selected.toLocaleDateString("tr-TR", { month: "long", year: "numeric" })}</h2></div><input aria-label="Takvim ayı" type="month" value={selectedDate.slice(0, 7)} onChange={(event) => setSelectedDate(`${event.target.value}-01`)} className="h-10 rounded-xl border border-ink/10 bg-white px-3 text-[12px] text-ink-2" /></div><div className="mt-5 grid grid-cols-7 gap-1.5">{["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map((day) => <div key={day} className="p-2 text-center text-[12px] font-bold text-ink-4">{day}</div>)}{monthDates.map((date) => { const daySessions = sessionsFor(date); const inMonth = date.getMonth() === selected.getMonth(); return <button key={date.toISOString()} onClick={() => { setSelectedDate(toLocalDateKey(date)); setView("day"); }} className={`min-h-[80px] rounded-xl border p-2 text-left ${inMonth ? "border-ink/[0.07] bg-white" : "border-transparent bg-paper/60"}`}><div className={`text-[12px] font-semibold ${inMonth ? "text-ink-2" : "text-rule-strong"}`}>{date.getDate()}</div>{noteBadge(date, true)}<div className="mt-2 space-y-1">{daySessions.slice(0, 2).map((session) => <div key={String(session.id)} className={`h-1.5 rounded-full ${session.status === "completed" ? "bg-success" : "bg-brand"}`} />)}</div></button>; })}</div></Card>}<Card className="soft-card p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><div className="eyebrow">Odak geçmişi</div><h2 className="mt-1 text-[23px] font-semibold text-ink font-display">Bu hafta zamanın nereye gitti?</h2><p className="mt-1 text-[12px] text-ink-3">Ders ve konu bazında tamamlanan odak oturumlarının süre dağılımı.</p></div><div className="rounded-xl bg-paper px-3 py-2 text-right"><div className="text-[21px] font-semibold text-ink font-display">{focusTotal} dk</div><div className="text-[12px] text-ink-3">toplam odak</div></div></div>{focusSlices.length ? <div className="mt-5 grid items-center gap-6 md:grid-cols-[190px_1fr]"><div className="mx-auto flex h-44 w-44 items-center justify-center rounded-full" style={{ background: focusGradient }}><div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white"><div className="text-[21px] font-semibold text-ink font-display">{focusSlices.length}</div><div className="text-[12px] text-ink-3">konu</div></div></div><div className="grid gap-3 sm:grid-cols-2">{focusSlices.slice(0, 8).map((slice) => <div key={`${slice.subject}-${slice.topic}`} className="flex items-center gap-2"><span className="h-3 w-3 shrink-0 rounded-full" style={{ background: slice.color }} /><div className="min-w-0 flex-1"><div className="truncate text-[12px] font-semibold text-ink-2">{slice.topic}</div><div className="text-[12px] text-ink-3">{slice.subject}</div></div><span className="text-[12px] font-bold text-ink">{slice.minutes} dk</span></div>)}</div></div> : <div className="mt-5 rounded-2xl bg-paper p-8 text-center text-[13px] text-ink-3">Bu hafta odak oturumu tamamladığında ders ve konu süre dağılımını burada göreceksin.</div>}</Card><div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]"><Card className="soft-card p-5"><div className="eyebrow">Konu gelişim günlüğü</div><h2 className="mt-1 text-[23px] font-semibold text-ink font-display">Çalıştıkça netleşen ilerleme.</h2><div className="mt-5 space-y-3">{topicStats.length ? topicStats.slice(0, 6).map((stat) => <div key={`${stat.subject}-${stat.topic}`} className="rounded-2xl bg-paper p-3"><div className="flex items-center justify-between"><div><div className="text-[13px] font-semibold text-ink-2">{stat.topic}</div><div className="mt-1 text-[12px] text-ink-3">{stat.isHabit ? <>Günlük alışkanlık · {stat.minutes} dk{stat.detail ? ` · ${stat.detail.replace(/\.$/, "")}` : ""}</> : <>{stat.subject} · {stat.minutes} dk · {stat.questions} soru</>}</div></div>{stat.isHabit ? <span className="shrink-0 rounded-full bg-brand-soft px-2 py-1 text-[12px] font-bold text-brand">{stat.timeGoal !== null ? `Süre %${stat.timeGoal}` : `${stat.minutes} dk`}</span> : <span className={`shrink-0 rounded-full px-2 py-1 text-[12px] font-bold ${stat.accuracy >= 75 ? "bg-success-soft text-success" : stat.accuracy >= 55 ? "bg-warn-soft text-warn" : "bg-danger-soft text-danger"}`}>%{stat.accuracy}</span>}</div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white" title={stat.isHabit ? "Hedef süreye göre" : "Doğruluk oranı"}><div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, stat.isHabit ? stat.timeGoal ?? 100 : stat.accuracy)}%` }} /></div></div>) : <div className="rounded-2xl bg-paper p-5 text-[13px] text-ink-3">Oturum tamamladığında konu bazlı süre, soru ve doğruluk grafikleri burada oluşacak.</div>}</div></Card><Card className="soft-card p-5"><div className="eyebrow">Takip özeti</div><h2 className="mt-1 text-[23px] font-semibold text-ink font-display">Bu dönemde ne değişti?</h2><div className="mt-5 space-y-3"><div className="rounded-2xl border border-success/15 bg-success-soft/60 p-4"><div className="text-[12px] font-bold text-success">Gelişim sinyali</div><p className="mt-2 text-[13px] leading-5 text-ink-2">{completedCount ? `${completedCount} oturum tamamlandı ve konu günlüğüne işlendi.` : "İlk oturumunu tamamladığında gelişim sinyalini burada göreceksin."}</p></div><div className="rounded-2xl border border-brand/10 bg-brand-soft p-4"><div className="text-[12px] font-bold text-brand">Plan uyumu</div><p className="mt-2 text-[13px] leading-5 text-ink-2">{plannedMinutes ? `${formatMinutes(actualMinutes)} gerçekleşen süre / ${formatMinutes(plannedMinutes)} planlanan süre.` : "Takvimine AI planından oturum ekle."}</p></div></div></Card></div><div className="grid gap-5 lg:grid-cols-2">
      <RoutineHabitCard kind="Paragraf" icon={PenLine} eyebrow="Günlük alışkanlık" title="Paragraf pratiği" description="Her gün en az 20 dk paragraf sorusu çöz; okuduğunu anlama hızın YKS Türkçe ve sınav genelinde en çok fark yaratan beceri." defaultMinutes={20} amountLabel="Kaç paragraf çözdün?" amountUnit="paragraf çözüldü" todaysSession={todaysParagraphSession} />
      <RoutineHabitCard kind="Kitap Okuma" icon={Moon} eyebrow="Günlük alışkanlık" title="Gece okuması" description="Her gece yatmadan önce mutlaka birkaç sayfa kitap oku; ekran molası ver ve okuduğun süre ile sayfayı bizimle paylaş." defaultMinutes={20} amountLabel="Kaç sayfa okudun?" amountUnit="sayfa okundu" isPages showBookTitle todaysSession={todaysReadingSession} />
    </div>
    {completion && <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4"><Card className="w-full max-w-lg p-6 shadow-2xl"><div className="flex items-start justify-between"><div><div className="eyebrow">Oturumu kapat</div><h2 className="mt-1 text-[23px] font-semibold text-ink font-display">{completion.session.title}</h2><p className="mt-1 text-[12px] text-ink-3">Sonuçlarını gir; konu gelişim günlüğü otomatik güncellensin.</p></div><button onClick={() => setCompletion(null)} aria-label="Formu kapat" className="rounded-lg p-2 text-ink-3 hover:bg-paper"><X size={16} /></button></div><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">{[["actualMinutes", "Süre (dk)"], ["actualQuestions", "Çözülen soru"], ["correct", "Doğru"], ["wrong", "Yanlış"], ["blank", "Boş"]].map(([key, label]) => <label key={key} className="text-[12px] font-semibold text-ink-3">{label}{key === "actualMinutes" ? ` · plan: ${completion.session.plannedMinutes} dk` : ""}<input type="number" min="0" value={completion[key as keyof typeof completion] as string} onChange={(event) => setCompletion((current) => current ? { ...current, [key]: event.target.value } : current)} placeholder={key === "actualMinutes" ? "Gerçekte kaç dk çalıştın?" : undefined} className="mt-1 h-10 w-full rounded-xl border border-ink/10 px-3 text-[13px] text-ink-2" /></label>)}</div><label className="mt-3 block text-[12px] font-semibold text-ink-3">Kısa not<textarea value={completion.note} onChange={(event) => setCompletion((current) => current ? { ...current, note: event.target.value } : current)} placeholder="Bugün neyi daha iyi anladın?" className="mt-1 min-h-20 w-full rounded-xl border border-ink/10 p-3 text-[13px] text-ink-2" /></label><div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setCompletion(null)} className="rounded-xl text-[12px]">Vazgeç</Button><Button onClick={saveCompletion} disabled={completeMutation.isPending} className="rounded-xl bg-pencil text-[12px] text-ink">{completeMutation.isPending ? "Kaydediliyor..." : "Gelişime ekle"}</Button></div></Card></div>}</div>;
}

/** Masaüstünde sabit kenar çubuğu; `onClose` verilirse mobilde soldan kayan çekmece olarak aynısı. */
function Sidebar({ section, onSection, userName, onStartSession, onAddResource, onAddReadingBook, isAdmin, weakTopicCount, onClose }: { section: DashboardSection; onSection: (section: DashboardSection) => void; userName?: string | null; onStartSession: () => void; onAddResource: () => void; onAddReadingBook: () => void; isAdmin?: boolean; weakTopicCount: number; onClose?: () => void }) {
  const drawer = Boolean(onClose);
  useEffect(() => {
    if (!onClose) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    // Ekran masaüstü genişliğine büyürse çekmece kapanır (orada kenar çubuğu zaten görünür).
    const desktop = window.matchMedia("(min-width: 801px)");
    const onWide = () => { if (desktop.matches) onClose(); };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    desktop.addEventListener("change", onWide);
    return () => { document.body.style.overflow = overflow; window.removeEventListener("keydown", onKey); desktop.removeEventListener("change", onWide); };
  }, [onClose]);
  const navItems = isAdmin ? [...appNavSections, adminNavSection] : appNavSections;
  const onboarding = trpc.onboarding.get.useQuery(undefined, { retry: false });
  const targetLine = [onboarding.data?.targetScoreType ? TARGET_SCORE_TYPE_LABELS[onboarding.data.targetScoreType] : null, onboarding.data?.targetRanking ? `İlk ${onboarding.data.targetRanking}` : null].filter(Boolean).join(", ");
  // Hedef kartı yalnızca profilde gerçekten yazılı olanı gösterir (uydurma ilerleme yüzdesi yok).
  const targetSchool = [onboarding.data?.targetUniversity, onboarding.data?.targetDepartment].filter(Boolean) as string[];
  return (
    <aside className={`app-sidebar ${drawer ? "is-drawer" : ""}`} role={drawer ? "dialog" : undefined} aria-modal={drawer || undefined} aria-label={drawer ? "Menü" : undefined}>
      <div className="flex items-center justify-between"><Brand />{drawer && <button onClick={onClose} className="drawer-close" aria-label="Menüyü kapat"><X size={18} /></button>}</div>
      <nav className="mt-8 space-y-0.5" aria-label="Bölümler">
        {navItems.map((item) => { const Icon = sectionIcons[item.key]; const active = section === item.key; return (
          <button key={item.key} onClick={() => onSection(item.key)} aria-current={active ? "page" : undefined} className={`nav-item ${active ? "is-active" : ""}`}>
            <Icon size={18} strokeWidth={active ? 2.2 : 1.8} /><span>{item.label}</span>
            {item.key === "topics" && weakTopicCount > 0 && <span className="ml-auto rounded-full bg-danger-soft px-2 py-0.5 text-[12px] font-semibold text-danger" title={`${weakTopicCount} zayıf konu`}>{weakTopicCount}</span>}
          </button>
        ); })}
      </nav>
      <div className="mt-6 space-y-0.5 border-t border-rule pt-6">
        <button onClick={onStartSession} className="quick-nav"><Clock3 size={17} /> Odak oturumu başlat</button>
        <button onClick={() => onSection("exams")} className="quick-nav"><Plus size={17} /> Deneme sonucu ekle</button>
        <button onClick={onAddResource} className="quick-nav"><Camera size={17} /> Kaynak ekle</button>
        <button onClick={onAddReadingBook} className="quick-nav"><BookOpen size={17} /> Okuma kitabı ekle</button>
      </div>
      <div className="sidebar-bottom pt-6">
        <div>
            {(targetSchool.length > 0 || targetLine) && (
              <div className="rounded-2xl border border-rule bg-surface p-3.5 shadow-[var(--shadow-card)]">
                <div className="flex items-center gap-2 text-[13px] font-semibold text-brand"><Target size={16} /> Hedefin</div>
                {targetSchool.length > 0 && <p className="mt-1.5 text-[13px] font-semibold leading-5 text-ink">{targetSchool.join(" · ")}</p>}
                {targetLine && <p className="mt-1 text-[12px] text-ink-3">{targetLine}</p>}
              </div>
            )}
            {/* Erkek/nötr tasarımda zirve görseli zaten Genel Bakış'ın karşılama alanında. */}
            {onboarding.data?.avatarStyle === "girl" && <Illustration src={ILLUSTRATIONS.summit} className="mt-4 h-[120px] w-full rounded-2xl object-cover object-[50%_18%]" />}
            <p className="mt-3 px-1 text-[13px] font-medium leading-5 text-ink-2">Hayallerine giden yolda yalnız değilsin. Pusula hep yanında.</p>
        </div>
      </div>
    </aside>
  );
}

export default function Home() {
  const { user, logout } = useAuth();
  // Anket (onboarding) bitince App.tsx bir kerelik sessionStorage bayrağı
  // bırakır; burada onu tüketip kullanıcıyı doğrudan Kaynaklar sekmesine
  // yönlendiriyoruz ki elindeki kitapları seçmesi istensin (bkz. Resources).
  // Bölüm adresten okunur (bkz. lib/sections.ts): /denemeler, /takvim…
  const [location, setLocation] = useLocation();
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(postOnboardingNudgeKey)) {
        window.sessionStorage.removeItem(postOnboardingNudgeKey);
        setLocation(SECTION_PATHS.resources, { replace: true });
      }
    } catch {}
  }, []);
  // Uygulama yalnızca giriş yapmış hesaba açılır (App.tsx): demo veri yok, yeni hesap boş başlar
  // ve sunucudaki konu/deneme verisi gelince bunların yerini alır.
  const [topics, setTopics] = useState<Topic[]>(() => getStoredValue(localStorageKeys.topics, []));
  const [exams, setExams] = useState<MockExam[]>(() => getStoredValue(localStorageKeys.exams, []));
  const [mobileMenu, setMobileMenu] = useState(false);
  const closeMobileMenu = useCallback(() => setMobileMenu(false), []);
  const [session, setSession] = useState(false);
  const [focusSeed, setFocusSeed] = useState<FocusSessionSeed | null>(null);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const examSnapshot = trpc.exams.snapshot.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const importExams = trpc.exams.importMany.useMutation();
  const migratedExams = useRef(false);
  const topicProgressSnapshot = trpc.topics.progress.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const profileQuery = trpc.onboarding.get.useQuery(undefined, { enabled: Boolean(user), retry: false });
  // Haftalık özet e-postası yalnızca e-postayla kayıtlı hesaba gider; seçenek de yalnızca orada görünür.
  const weeklyDigest = trpc.onboarding.weeklyDigest.useQuery(undefined, { enabled: Boolean(user?.email), retry: false });
  const trpcUtils = trpc.useUtils();
  const setWeeklyDigest = trpc.onboarding.setWeeklyDigest.useMutation({
    onSuccess: (next) => { trpcUtils.onboarding.weeklyDigest.setData(undefined, next); toast.success(next.enabled ? "Haftalık özet her pazar e-postana gelecek." : "Haftalık özet e-postası kapatıldı."); },
    onError: () => toast.error("Ayar kaydedilemedi, tekrar dener misin?"),
  });
  const appliedTopicProgress = useRef(false);

  useEffect(() => { localStorage.setItem(localStorageKeys.topics, JSON.stringify(topics)); }, [topics]);
  useEffect(() => { localStorage.setItem(localStorageKeys.exams, JSON.stringify(exams)); }, [exams]);
  // Denemeler her zaman sunucudan gelir; yerel liste yalnızca sayfa açılırken gösterilen önbellek.
  useEffect(() => {
    if (!user || !examSnapshot.data || migratedExams.current) return;
    migratedExams.current = true;
    setExams(examSnapshot.data as MockExam[]);
  }, [user, examSnapshot.data]);
  // Konu ilerlemesi tamamen sunucudan gelir: ne kadar boş olursa olsun (yeni hesap = tüm
  // konular %0/"veri yetersiz"), `topics` TAMAMEN sunucu verisiyle değiştirilir.
  useEffect(() => {
    if (!user || !topicProgressSnapshot.data || appliedTopicProgress.current) return;
    appliedTopicProgress.current = true;
    const accentBySubject: Record<string, Topic["accent"]> = { Türkçe: "coral", Matematik: "blue", Fen: "mint", Sosyal: "yellow", Fizik: "lilac", Kimya: "mint", Biyoloji: "mint" };
    setTopics(topicProgressSnapshot.data.map((row) => ({ id: row.slug, exam: row.exam, subject: row.subject, topic: row.topic, unit: row.unit, progress: row.progress, status: row.status, insufficientData: row.insufficientData, accent: accentBySubject[row.subject] ?? "blue" })));
  }, [user, topicProgressSnapshot.data]);
  useEffect(() => { document.title = "Pusula YKS · Kişisel çalışma koçu"; }, []);

  const navigate = (next: DashboardSection) => { setLocation(SECTION_PATHS[next]); setMobileMenu(false); window.scrollTo({ top: 0 }); };
  const startSession = (seed?: FocusSessionSeed) => { setFocusSeed(seed ?? null); setSession(true); };
  // Yarım bırakılan odak oturumu: sunucudaki kural (statusAfterAbandonedSession) Konu Haritası'na hemen yansır.
  const markTopicForReviewLocally = ({ slug, exam, subject, topic }: { slug: string; exam: ExamKind; subject: string; topic: string }) => setTopics((items) => {
    const match = items.find((item) => item.id === slug || (item.subject === subject && item.topic === topic));
    if (!match) return [...items, { id: slug, exam, subject, topic, unit: "", progress: 0, status: statusAfterAbandonedSession(null), insufficientData: false, accent: "blue" }];
    if (match.insufficientData) return items.map((item) => (item === match ? { ...item, progress: 0, status: statusAfterAbandonedSession(null), insufficientData: false } : item));
    return items.map((item) => (item === match ? { ...item, status: statusAfterAbandonedSession(item.status) } : item));
  });
  const [showReminders, setShowReminders] = useState(false);
  // Oturum hatırlatma bildirimine dokununca `/?odak=<oturumId>` açılır: o oturumun odak ekranı başlar.
  const focusParam = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("odak") : null;
  const reminderCalendar = trpc.calendar.snapshot.useQuery(undefined, { enabled: Boolean(user) && Boolean(focusParam), retry: false });
  useEffect(() => {
    if (!focusParam || !reminderCalendar.data) return;
    window.history.replaceState(null, "", window.location.pathname);
    const target = reminderCalendar.data.sessions.find((item) => item.id === Number(focusParam));
    if (!target || target.status !== "planned") { toast("Bu oturum artık planında yok ya da tamamlanmış."); return; }
    startSession({ sessionId: target.id, subject: target.subject, topic: target.topic, plannedMinutes: target.plannedMinutes, sessionDate: target.sessionDate });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusParam, reminderCalendar.data]);
  // Kenar çubuğu: "Kaynak ekle" → Kaynaklar + fotoğrafla ekleme (girişsizse katalog); "Okuma kitabı ekle" → okuma listesi.
  const [addBookRequest, setAddBookRequest] = useState(0);
  const [showReadingDialog, setShowReadingDialog] = useState(false);
  const [showOrgDialog, setShowOrgDialog] = useState(false);
  const [showParentDialog, setShowParentDialog] = useState(false);
  const [showTestimonial, setShowTestimonial] = useState(false);
  const orgMemberships = trpc.org.mine.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const isOrgStaff = (orgMemberships.data ?? []).some((membership) => membership.role !== "student");
  const addResource = () => { navigate("resources"); setAddBookRequest((value) => value + 1); };
  const addReadingBook = () => { setMobileMenu(false); setShowReadingDialog(true); };
  const displayName = user?.name ?? "";

  const isAdmin = user?.role === "admin";
  // Yönetim adresi yalnızca admine açılır; diğerleri Genel Bakış'ı görür.
  const requested = sectionFromPath(location);
  const section: DashboardSection = requested === "admin" && !isAdmin ? "overview" : requested;
  const weakTopicCount = topics.filter((item) => item.status === "Zayıf" && !item.insufficientData).length;
  const navSectionsForUser = isAdmin ? [...appNavSections, adminNavSection] : appNavSections;
  // App.tsx bu sayfayı yalnızca giriş yapmış hesaba açar; tüm hook'lardan sonra tür daraltması için.
  if (!user) return null;
  return <NotebookProvider enabled><div className="app-shell"><Sidebar section={section} onSection={navigate} userName={displayName} onStartSession={() => startSession()} onAddResource={addResource} onAddReadingBook={addReadingBook} isAdmin={isAdmin} weakTopicCount={weakTopicCount} /><main className="app-main"><header className="topbar"><button onClick={() => setMobileMenu((value) => !value)} className="mobile-menu-button" aria-label="Menüyü aç"><Menu size={18} /></button><div className="topbar-context"><span className="topbar-title">{navSectionsForUser.find((item) => item.key === section)?.label}</span></div><div className="topbar-actions"><NotificationBell /><DropdownMenu><DropdownMenuTrigger asChild><button className="profile-button"><StudentAvatar style={profileQuery.data?.avatarStyle} name={profileQuery.data?.preferredName || getDisplayName(displayName)} size={36} /><span className="hidden text-[14px] font-semibold text-ink-2 md:block">{getDisplayName(displayName)}</span><ChevronDown size={14} className="hidden text-ink-4 md:block" /></button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => setShowProfileEdit(true)}><UserRound size={14} className="mr-2" /> Profili düzenle</DropdownMenuItem><DropdownMenuItem onClick={() => setShowOrgDialog(true)}><Building2 size={14} className="mr-2" /> Kurumum</DropdownMenuItem><DropdownMenuItem onClick={() => setShowParentDialog(true)}><Users size={14} className="mr-2" /> Veli erişimi</DropdownMenuItem><DropdownMenuItem onClick={() => setShowTestimonial(true)}><MessageSquareQuote size={14} className="mr-2" /> Yorum bırak</DropdownMenuItem><DropdownMenuItem onClick={() => setShowReminders(true)}><Bell size={14} className="mr-2" /> Oturum hatırlatmaları</DropdownMenuItem>{weeklyDigest.data && <DropdownMenuCheckboxItem checked={weeklyDigest.data.enabled} disabled={setWeeklyDigest.isPending} onSelect={(event) => event.preventDefault()} onCheckedChange={(checked) => setWeeklyDigest.mutate({ enabled: checked === true })}>Haftalık özet e-postası</DropdownMenuCheckboxItem>}{isOrgStaff && <DropdownMenuItem onClick={() => setLocation("/kurum")}><Building2 size={14} className="mr-2" /> Kurum Paneli</DropdownMenuItem>}{user.loginMethod?.startsWith("dev") && <DropdownMenuItem onClick={() => setShowPasswordChange(true)}><KeyRound size={14} className="mr-2" /> Şifre değiştir</DropdownMenuItem>}<DropdownMenuItem onClick={() => logout()}><LogOut size={14} className="mr-2" /> Çıkış yap</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></header>{mobileMenu && <><div className="drawer-backdrop" onClick={() => setMobileMenu(false)} aria-hidden="true" /><Sidebar section={section} onSection={navigate} userName={displayName} onStartSession={() => { setMobileMenu(false); startSession(); }} onAddResource={addResource} onAddReadingBook={addReadingBook} isAdmin={isAdmin} weakTopicCount={weakTopicCount} onClose={closeMobileMenu} /></>}<div className="content-wrap"><Suspense fallback={<SectionLoading />}>{section === "overview" && <Overview topics={topics} exams={exams} onSection={navigate} onStartSession={startSession} onEditProfile={() => setShowProfileEdit(true)} />}{section === "topics" && <TopicMap topics={topics} onSection={navigate} onStartSession={(seed) => startSession(seed)} />}{section === "exams" && <Exams topics={topics} exams={exams} setExams={setExams} setTopics={setTopics} persistExams={importExams.mutate} />}{section === "resources" && <Resources topics={topics} exams={exams} onSection={navigate} addBookRequest={addBookRequest} onAddBookHandled={() => setAddBookRequest(0)} />}{section === "catalog" && <ResourceCatalogSection />}{section === "plan" && <AiPlan topics={topics} exams={exams} onSection={navigate} />}{section === "calendar" && <CalendarView topics={topics} onSection={navigate} onStartFocusSession={startSession} />}{section === "notebook" && <NotebookSection />}{section === "premium" && <PaywallSection />}{section === "admin" && isAdmin && <AdminPanel />}</Suspense><footer className="mt-12 flex flex-col gap-3 border-t border-ink/[0.06] py-6 text-[12px] text-ink-4 sm:flex-row sm:items-center sm:justify-between"><span>{footerDisclaimer}</span><span>Konu kapsamı ÖSYM ve MEB programlarına dayanır.</span></footer></div></main>{session && <FocusMode topics={topics} onMarkedForReview={markTopicForReviewLocally} initialSession={focusSeed} onClose={() => { setSession(false); setFocusSeed(null); }} onGoToCalendar={() => { setSession(false); setFocusSeed(null); navigate("calendar"); }} />}{showReadingDialog && <ReadingBookDialog onClose={() => setShowReadingDialog(false)} />}{showOrgDialog && <MyOrganizationDialog onClose={() => setShowOrgDialog(false)} />}{showParentDialog && <ParentAccessDialog onClose={() => setShowParentDialog(false)} />}{showTestimonial && <TestimonialDialog userName={profileQuery.data?.preferredName || user?.name} onClose={() => setShowTestimonial(false)} />}{showReminders && <Suspense fallback={null}><ReminderSettingsDialog onClose={() => setShowReminders(false)} /></Suspense>}{showPasswordChange && <ChangePasswordDialog onClose={() => setShowPasswordChange(false)} />}{showProfileEdit && <Dialog open onOpenChange={(open) => !open && setShowProfileEdit(false)}><DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl"><DialogTitle>Profilini güncelle</DialogTitle><DialogDescription>Onboarding sırasında verdiğin yanıtları buradan gözden geçirip güncelleyebilirsin.</DialogDescription><Suspense fallback={<SectionLoading />}><OnboardingFlow userName={displayName} startAtStep={0} onClose={() => setShowProfileEdit(false)} onComplete={() => setShowProfileEdit(false)} /></Suspense></DialogContent></Dialog>} </div></NotebookProvider>;
}
