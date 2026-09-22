import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  COACHING_EXPECTATION_LABELS,
  COACHING_EXPECTATIONS,
  COACHING_STYLE_LABELS,
  COACHING_STYLES,
  emptyOnboardingDraft,
  GRADE_LEVEL_LABELS,
  GRADE_LEVELS,
  MOCK_EXAM_FREQUENCY_LABELS,
  MOCK_EXAM_FREQUENCIES,
  NOTIFICATION_PREFERENCE_LABELS,
  NOTIFICATION_PREFERENCES,
  ONBOARDING_STEP_META,
  STUDY_DAYS,
  STUDY_METHOD_LABELS,
  STUDY_METHODS,
  STUDY_TIME_LABELS,
  STUDY_TIMES,
  SUBJECT_OPTIONS,
  TARGET_SCORE_TYPE_LABELS,
  TARGET_SCORE_TYPES,
  TOTAL_ONBOARDING_STEPS,
  validateOnboardingStep,
  type FieldErrors,
  type OnboardingDraft,
} from "@shared/onboarding";
import { getStoredValue, localStorageKeys, storeValue } from "@shared/yksData";
import type { AppRouter } from "../../../../server/routers";
import type { inferRouterOutputs } from "@trpc/server";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const LOCAL_DRAFT_KEY = localStorageKeys.onboardingDraft;

type StepKey = (typeof ONBOARDING_STEP_META)[number]["key"];
type Update = <K extends keyof OnboardingDraft>(field: K, value: OnboardingDraft[K]) => void;

function Field({ label, hint, required, error, htmlFor, children }: { label: string; hint?: string; required?: boolean; error?: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="flex items-baseline gap-1 text-[13px] font-semibold text-[#1f2333]">
        {label}
        {required && <span className="text-[#d95d4d]" aria-hidden="true">*</span>}
        {!required && <span className="text-[10px] font-medium text-[#a2a3ab]">(isteğe bağlı)</span>}
      </label>
      {hint && <p className="text-[11px] leading-4 text-[#9a9ba3]">{hint}</p>}
      {children}
      {error && <p role="alert" className="text-[11px] font-medium text-[#d95d4d]">{error}</p>}
    </div>
  );
}

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      onClick={onClick}
      className={`rounded-full border px-3.5 py-2 text-[12.5px] font-medium transition ${
        selected ? "border-[#3b5ccc] bg-[#3b5ccc] text-white" : "border-[#e5e4dd] bg-white text-[#52535e] hover:border-[#3b5ccc]/40"
      }`}
    >
      {label}
    </button>
  );
}

function ChipGroup<T extends string>({ options, labels, value, onChange, multi, id }: { options: readonly T[]; labels?: Record<T, string>; value: T[]; onChange: (next: T[]) => void; multi?: boolean; id: string }) {
  const toggle = (option: T) => {
    if (multi) {
      onChange(value.includes(option) ? value.filter((v) => v !== option) : [...value, option]);
    } else {
      onChange(value.includes(option) ? [] : [option]);
    }
  };
  return (
    <div id={id} className="flex flex-wrap gap-2">
      {options.map((option) => (
        <Chip key={option} label={labels?.[option] ?? option} selected={value.includes(option)} onClick={() => toggle(option)} />
      ))}
    </div>
  );
}

function StepIdentity({ draft, errors, update }: { draft: OnboardingDraft; errors: FieldErrors; update: Update }) {
  return (
    <div className="space-y-6">
      <Field label="Sana nasıl hitap edelim?" required error={errors.preferredName} htmlFor="onboarding-name">
        <Input id="onboarding-name" value={draft.preferredName} onChange={(e) => update("preferredName", e.target.value)} placeholder="Örn. Ece" maxLength={120} aria-invalid={Boolean(errors.preferredName)} />
      </Field>
      <Field label="Sınıf düzeyin" hint="Sana uygun konu haritasını hazırlamamız için gerekli." required error={errors.gradeLevel} htmlFor="onboarding-grade">
        <ChipGroup id="onboarding-grade" options={GRADE_LEVELS} labels={GRADE_LEVEL_LABELS} value={draft.gradeLevel ? [draft.gradeLevel] : []} onChange={(next) => update("gradeLevel", (next[0] ?? "") as OnboardingDraft["gradeLevel"])} />
      </Field>
      <Field label="Hedef sınav yılın" hint="Örn. 2027" required error={errors.examYear} htmlFor="onboarding-year">
        <Input id="onboarding-year" inputMode="numeric" value={draft.examYear} onChange={(e) => update("examYear", e.target.value.replace(/[^0-9]/g, ""))} placeholder={String(new Date().getFullYear() + 1)} maxLength={4} aria-invalid={Boolean(errors.examYear)} className="max-w-[140px]" />
      </Field>
      <Field label="Hedef puan türün" hint="Henüz karar vermediysen sorun değil, sonra değiştirebilirsin." required error={errors.targetScoreType} htmlFor="onboarding-score-type">
        <ChipGroup id="onboarding-score-type" options={TARGET_SCORE_TYPES} labels={TARGET_SCORE_TYPE_LABELS} value={draft.targetScoreType ? [draft.targetScoreType] : []} onChange={(next) => update("targetScoreType", (next[0] ?? "") as OnboardingDraft["targetScoreType"])} />
      </Field>
    </div>
  );
}

function StepAcademic({ draft, update }: { draft: OnboardingDraft; errors: FieldErrors; update: Update }) {
  return (
    <div className="space-y-6">
      <Field label="Mevcut TYT netin" hint="Yaklaşık bir sayı ya da aralık yazabilirsin (örn. 45-50)." htmlFor="onboarding-tyt-net">
        <div className="flex flex-wrap items-center gap-2">
          <Input id="onboarding-tyt-net" value={draft.currentTytNet} onChange={(e) => update("currentTytNet", e.target.value)} placeholder="Örn. 45-50" maxLength={40} className="max-w-[200px]" />
          <Button type="button" variant="outline" size="sm" onClick={() => update("currentTytNet", "Bilmiyorum")}>Bilmiyorum</Button>
        </div>
      </Field>
      <Field label="Mevcut AYT netin" hint="Henüz deneme çözmediysen belirtmen yeterli." htmlFor="onboarding-ayt-net">
        <div className="flex flex-wrap items-center gap-2">
          <Input id="onboarding-ayt-net" value={draft.currentAytNet} onChange={(e) => update("currentAytNet", e.target.value)} placeholder="Örn. 30-35" maxLength={40} className="max-w-[200px]" />
          <Button type="button" variant="outline" size="sm" onClick={() => update("currentAytNet", "Henüz deneme çözmedim")}>Henüz deneme çözmedim</Button>
        </div>
      </Field>
      <Field label="Deneme sınavı çözme sıklığın" htmlFor="onboarding-mock-frequency">
        <ChipGroup id="onboarding-mock-frequency" options={MOCK_EXAM_FREQUENCIES} labels={MOCK_EXAM_FREQUENCY_LABELS} value={draft.mockExamFrequency ? [draft.mockExamFrequency] : []} onChange={(next) => update("mockExamFrequency", (next[0] ?? "") as OnboardingDraft["mockExamFrequency"])} />
      </Field>
      <Field label="En güçlü olduğun dersler" htmlFor="onboarding-strong-subjects">
        <ChipGroup id="onboarding-strong-subjects" options={SUBJECT_OPTIONS} value={draft.strongSubjects} onChange={(next) => update("strongSubjects", next)} multi />
      </Field>
      <Field label="En çok zorlandığın dersler" htmlFor="onboarding-weak-subjects">
        <ChipGroup id="onboarding-weak-subjects" options={SUBJECT_OPTIONS} value={draft.weakSubjects} onChange={(next) => update("weakSubjects", next)} multi />
      </Field>
      <Field label="Daha önce bir çalışma programın oldu mu?" htmlFor="onboarding-prior-plan">
        <div className="flex gap-2">
          <Chip label="Evet" selected={draft.hasPriorStudyPlan === "yes"} onClick={() => update("hasPriorStudyPlan", draft.hasPriorStudyPlan === "yes" ? "" : "yes")} />
          <Chip label="Hayır" selected={draft.hasPriorStudyPlan === "no"} onClick={() => update("hasPriorStudyPlan", draft.hasPriorStudyPlan === "no" ? "" : "no")} />
        </div>
      </Field>
    </div>
  );
}

function StepGoals({ draft, update }: { draft: OnboardingDraft; errors: FieldErrors; update: Update }) {
  return (
    <div className="space-y-6">
      <Field label="Hedef üniversite" hint="Bilmiyorsan boş bırakabilirsin." htmlFor="onboarding-university">
        <Input id="onboarding-university" value={draft.targetUniversity} onChange={(e) => update("targetUniversity", e.target.value)} placeholder="Örn. Boğaziçi Üniversitesi" maxLength={180} />
      </Field>
      <Field label="Hedef bölüm" htmlFor="onboarding-department">
        <Input id="onboarding-department" value={draft.targetDepartment} onChange={(e) => update("targetDepartment", e.target.value)} placeholder="Örn. Bilgisayar Mühendisliği" maxLength={180} />
      </Field>
      <Field label="Tahmini hedef sıralaman" htmlFor="onboarding-ranking">
        <Input id="onboarding-ranking" value={draft.targetRanking} onChange={(e) => update("targetRanking", e.target.value)} placeholder="Örn. 50.000-70.000" maxLength={60} />
      </Field>
      <Field label="YKS'ye hazırlanmadaki en önemli amacın" htmlFor="onboarding-main-goal">
        <Textarea id="onboarding-main-goal" value={draft.mainGoal} onChange={(e) => update("mainGoal", e.target.value)} maxLength={500} rows={2} />
      </Field>
      <Field label="Kısa vadeli hedefin" htmlFor="onboarding-short-goal">
        <Textarea id="onboarding-short-goal" value={draft.shortTermGoal} onChange={(e) => update("shortTermGoal", e.target.value)} maxLength={500} rows={2} />
      </Field>
      <Field label="Uzun vadeli hedefin" htmlFor="onboarding-long-goal">
        <Textarea id="onboarding-long-goal" value={draft.longTermGoal} onChange={(e) => update("longTermGoal", e.target.value)} maxLength={500} rows={2} />
      </Field>
    </div>
  );
}

function StepRoutine({ draft, errors, update }: { draft: OnboardingDraft; errors: FieldErrors; update: Update }) {
  return (
    <div className="space-y-6">
      <Field label="Günlük ortalama ayırabileceğin süre (dakika)" error={errors.dailyStudyDuration} htmlFor="onboarding-daily-duration">
        <Input id="onboarding-daily-duration" inputMode="numeric" value={draft.dailyStudyDuration} onChange={(e) => update("dailyStudyDuration", e.target.value.replace(/[^0-9]/g, ""))} placeholder="Örn. 180" maxLength={4} className="max-w-[140px]" aria-invalid={Boolean(errors.dailyStudyDuration)} />
      </Field>
      <Field label="Genelde saat kaçta ders çalışmaya başlarsın?" error={errors.preferredStudyStartTime} htmlFor="onboarding-start-time">
        <Input id="onboarding-start-time" type="time" value={draft.preferredStudyStartTime} onChange={(e) => update("preferredStudyStartTime", e.target.value)} className="max-w-[140px]" aria-invalid={Boolean(errors.preferredStudyStartTime)} />
        <p className="mt-1.5 text-[11px] text-[#8b8c95]">Pusula Odak, günlük planını bu saatten başlayarak gerçek saat dilimlerine böler (ör. 16:00–16:40, 16:50–17:30...).</p>
      </Field>
      <Field label="Haftanın hangi günleri çalışabilirsin?" htmlFor="onboarding-study-days">
        <ChipGroup id="onboarding-study-days" options={STUDY_DAYS} value={draft.availableStudyDays} onChange={(next) => update("availableStudyDays", next)} multi />
      </Field>
      <Field label="Tercih ettiğin çalışma saatleri" htmlFor="onboarding-study-times">
        <ChipGroup id="onboarding-study-times" options={STUDY_TIMES} labels={STUDY_TIME_LABELS} value={draft.preferredStudyTimes} onChange={(next) => update("preferredStudyTimes", next)} multi />
      </Field>
      <Field label="Tercih ettiğin çalışma yöntemi" htmlFor="onboarding-study-methods">
        <ChipGroup id="onboarding-study-methods" options={STUDY_METHODS} labels={STUDY_METHOD_LABELS} value={draft.preferredStudyMethods} onChange={(next) => update("preferredStudyMethods", next)} multi />
      </Field>
      <Field label="Çalışma düzenini en çok bozan faktörler" htmlFor="onboarding-obstacles">
        <Textarea id="onboarding-obstacles" value={draft.studyObstacles} onChange={(e) => update("studyObstacles", e.target.value)} maxLength={500} rows={2} placeholder="Örn. telefon bildirimleri, yorgunluk, ders çalışacak sessiz yer bulamamak…" />
      </Field>
    </div>
  );
}

function StepCoaching({ draft, update }: { draft: OnboardingDraft; errors: FieldErrors; update: Update }) {
  return (
    <div className="space-y-6">
      <Field label="Koçtan beklentin" htmlFor="onboarding-expectations">
        <ChipGroup id="onboarding-expectations" options={COACHING_EXPECTATIONS} labels={COACHING_EXPECTATION_LABELS} value={draft.coachingExpectations} onChange={(next) => update("coachingExpectations", next)} multi />
      </Field>
      <Field label="Hatırlatma ve bildirim tercihin" htmlFor="onboarding-notifications">
        <ChipGroup id="onboarding-notifications" options={NOTIFICATION_PREFERENCES} labels={NOTIFICATION_PREFERENCE_LABELS} value={draft.notificationPreference ? [draft.notificationPreference] : []} onChange={(next) => update("notificationPreference", (next[0] ?? "") as OnboardingDraft["notificationPreference"])} />
      </Field>
      <Field label="Koçun iletişim tarzı nasıl olsun?" htmlFor="onboarding-style">
        <ChipGroup id="onboarding-style" options={COACHING_STYLES} labels={COACHING_STYLE_LABELS} value={draft.coachingStyle ? [draft.coachingStyle] : []} onChange={(next) => update("coachingStyle", (next[0] ?? "") as OnboardingDraft["coachingStyle"])} />
      </Field>
      <Field label="Paylaşmak istediğin başka bir şey var mı?" htmlFor="onboarding-notes">
        <Textarea id="onboarding-notes" value={draft.additionalNotes} onChange={(e) => update("additionalNotes", e.target.value)} maxLength={1000} rows={3} />
      </Field>
    </div>
  );
}

const STEP_INTRO: Record<StepKey, string> = {
  identity: "Seni tanımamız, konu haritanı ve önerilerini kişiselleştirmemiz için gerekli — bu bilgileri istediğin zaman güncelleyebilirsin.",
  academic: "Şu anki durumunu bilmek, sana nereden başlayacağımızı doğru belirlememizi sağlar. Emin olmadığın yerler için 'Bilmiyorum' demen tamamen normal.",
  goals: "Hedeflerini bilmek, planını doğru önceliklerle kurmamıza yardımcı olur. Netleşmemiş olanları boş bırakabilirsin.",
  routine: "Çalışma düzenini bilmek, sana gerçekten uygulanabilir bir plan hazırlamamızı sağlar.",
  coaching: "Son olarak, koçluk deneyimini nasıl istediğini öğrenelim.",
};

const STEP_COMPONENTS: Record<StepKey, typeof StepIdentity> = {
  identity: StepIdentity,
  academic: StepAcademic,
  goals: StepGoals,
  routine: StepRoutine,
  coaching: StepCoaching,
};

type OnboardingProfile = inferRouterOutputs<AppRouter>["onboarding"]["get"] | undefined;

function profileToDraft(profile: OnboardingProfile, fallbackName?: string | null): OnboardingDraft {
  if (!profile) return { ...emptyOnboardingDraft(), preferredName: fallbackName?.split(" ")[0] ?? "" };
  return {
    preferredName: profile.preferredName ?? fallbackName?.split(" ")[0] ?? "",
    gradeLevel: profile.gradeLevel ?? "",
    examYear: profile.examYear ? String(profile.examYear) : "",
    targetScoreType: profile.targetScoreType ?? "",
    currentTytNet: profile.currentTytNet ?? "",
    currentAytNet: profile.currentAytNet ?? "",
    mockExamFrequency: (profile.mockExamFrequency as OnboardingDraft["mockExamFrequency"]) ?? "",
    strongSubjects: profile.strongSubjects ?? [],
    weakSubjects: profile.weakSubjects ?? [],
    hasPriorStudyPlan: profile.hasPriorStudyPlan === null ? "" : profile.hasPriorStudyPlan ? "yes" : "no",
    targetUniversity: profile.targetUniversity ?? "",
    targetDepartment: profile.targetDepartment ?? "",
    targetRanking: profile.targetRanking ?? "",
    mainGoal: profile.mainGoal ?? "",
    shortTermGoal: profile.shortTermGoal ?? "",
    longTermGoal: profile.longTermGoal ?? "",
    dailyStudyDuration: profile.dailyStudyDuration ? String(profile.dailyStudyDuration) : "",
    preferredStudyStartTime: profile.preferredStudyStartTime ?? "",
    availableStudyDays: (profile.availableStudyDays as OnboardingDraft["availableStudyDays"]) ?? [],
    preferredStudyTimes: (profile.preferredStudyTimes as OnboardingDraft["preferredStudyTimes"]) ?? [],
    preferredStudyMethods: (profile.preferredStudyMethods as OnboardingDraft["preferredStudyMethods"]) ?? [],
    studyObstacles: profile.studyObstacles ?? "",
    coachingExpectations: (profile.coachingExpectations as OnboardingDraft["coachingExpectations"]) ?? [],
    notificationPreference: (profile.notificationPreference as OnboardingDraft["notificationPreference"]) ?? "",
    coachingStyle: profile.coachingStyle ?? "",
    additionalNotes: profile.additionalNotes ?? "",
  };
}

/** Only the fields relevant to one step, so `saveStep` never overwrites another
 * step's already-saved data with a stale/empty local value. */
function pickStepFields(step: number, draft: OnboardingDraft): Partial<OnboardingDraft> {
  switch (step) {
    case 0:
      return { preferredName: draft.preferredName, gradeLevel: draft.gradeLevel, examYear: draft.examYear, targetScoreType: draft.targetScoreType };
    case 1:
      return { currentTytNet: draft.currentTytNet, currentAytNet: draft.currentAytNet, mockExamFrequency: draft.mockExamFrequency, strongSubjects: draft.strongSubjects, weakSubjects: draft.weakSubjects, hasPriorStudyPlan: draft.hasPriorStudyPlan };
    case 2:
      return { targetUniversity: draft.targetUniversity, targetDepartment: draft.targetDepartment, targetRanking: draft.targetRanking, mainGoal: draft.mainGoal, shortTermGoal: draft.shortTermGoal, longTermGoal: draft.longTermGoal };
    case 3:
      return { dailyStudyDuration: draft.dailyStudyDuration, preferredStudyStartTime: draft.preferredStudyStartTime, availableStudyDays: draft.availableStudyDays, preferredStudyTimes: draft.preferredStudyTimes, preferredStudyMethods: draft.preferredStudyMethods, studyObstacles: draft.studyObstacles };
    default:
      return { coachingExpectations: draft.coachingExpectations, notificationPreference: draft.notificationPreference, coachingStyle: draft.coachingStyle, additionalNotes: draft.additionalNotes };
  }
}

export default function OnboardingFlow({
  userName,
  onComplete,
  startAtStep,
  onClose,
}: {
  userName?: string | null;
  onComplete: () => void;
  /** Forces the initial step instead of resuming from the server's saved
   * `onboardingStep` — used by the profile/settings "review answers" entry
   * point, which always starts at step 0 regardless of completion state. */
  startAtStep?: number;
  /** Renders a "Kapat" action (profile/settings edit mode); omitted during
   * the first-run gate, where the flow can't be dismissed without finishing. */
  onClose?: () => void;
}) {
  const utils = trpc.useUtils();
  const profileQuery = trpc.onboarding.get.useQuery();
  const saveStep = trpc.onboarding.saveStep.useMutation();

  const [step, setStep] = useState(startAtStep ?? 0);
  const [draft, setDraft] = useState<OnboardingDraft>(() => getStoredValue(LOCAL_DRAFT_KEY, emptyOnboardingDraft()));
  const [errors, setErrors] = useState<FieldErrors>({});
  const initializedFromServer = useRef(false);

  useEffect(() => {
    if (!profileQuery.data || initializedFromServer.current) return;
    initializedFromServer.current = true;
    const resumeStep = startAtStep ?? Math.min(profileQuery.data.onboardingStep, TOTAL_ONBOARDING_STEPS - 1);
    setStep(resumeStep);
    // Local (possibly newer, unsaved) draft wins over the server snapshot for
    // fields the user already typed but hadn't submitted yet.
    setDraft((local) => ({ ...profileToDraft(profileQuery.data, userName), ...local }));
  }, [profileQuery.data, userName, startAtStep]);

  useEffect(() => {
    storeValue(LOCAL_DRAFT_KEY, draft);
  }, [draft]);

  const update: Update = (field, value) => setDraft((prev) => ({ ...prev, [field]: value }));

  const meta = ONBOARDING_STEP_META[step];
  const StepComponent = STEP_COMPONENTS[meta.key];
  const progressPercent = Math.round(((step + 1) / TOTAL_ONBOARDING_STEPS) * 100);

  const goNext = () => {
    const stepErrors = validateOnboardingStep(step, draft);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      toast.error("Devam etmeden önce işaretli alanları tamamlamalısın.");
      return;
    }
    setErrors({});
    const isLastStep = step === TOTAL_ONBOARDING_STEPS - 1;
    saveStep.mutate(
      { step, data: pickStepFields(step, draft), complete: isLastStep || undefined },
      {
        onSuccess: () => {
          utils.onboarding.get.invalidate();
          if (isLastStep) {
            localStorage.removeItem(LOCAL_DRAFT_KEY);
            toast.success("Profilin hazır! Panelin seni bekliyor.");
            onComplete();
          } else {
            setStep((s) => Math.min(s + 1, TOTAL_ONBOARDING_STEPS - 1));
          }
        },
        onError: (error) => toast.error(error.message || "Kaydedilemedi, internet bağlantını kontrol edip tekrar dene."),
      }
    );
  };

  const goBack = () => {
    setErrors({});
    setStep((s) => Math.max(0, s - 1));
  };

  if (profileQuery.isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-2 text-[13px] text-[#9a9ba3]"><Sparkles size={16} className="animate-pulse" /> Profilin hazırlanıyor…</div>
      </div>
    );
  }

  return (
    <div className={`mx-auto flex w-full max-w-xl flex-col justify-center px-5 sm:px-0 ${onClose ? "py-2" : "min-h-screen py-10"}`}>
      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between text-[11px] font-semibold text-[#9a9ba3]">
          <span>{meta.eyebrow}</span>
          <span>{step + 1} / {TOTAL_ONBOARDING_STEPS}</span>
        </div>
        <Progress value={progressPercent} aria-label="Onboarding ilerlemesi" />
      </div>

      <div className={onClose ? "" : "rounded-3xl border border-[#1f2333]/[0.06] bg-white p-6 shadow-sm sm:p-8"}>
        {step === 0 && !onClose && (
          <div className="mb-2">
            <div className="eyebrow mb-2">Hoş geldin{userName ? `, ${userName.split(" ")[0]}` : ""}</div>
            <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-[#1f2333]">YKS çalışma yolculuğunu birlikte planlayalım</h1>
          </div>
        )}
        <h2 className="text-[17px] font-semibold text-[#1f2333]">{meta.title}</h2>
        <p className="mb-6 mt-1 text-[12px] leading-5 text-[#858690]">{STEP_INTRO[meta.key]}</p>

        <StepComponent draft={draft} errors={errors} update={update} />

        <div className="mt-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={goBack} disabled={step === 0 || saveStep.isPending} className="gap-1.5">
              <ArrowLeft size={15} /> Geri
            </Button>
            {onClose && (
              <Button type="button" variant="ghost" onClick={onClose} className="text-[#9a9ba3]">
                Kapat
              </Button>
            )}
          </div>
          <Button type="button" onClick={goNext} disabled={saveStep.isPending} className="gap-1.5">
            {saveStep.isPending ? "Kaydediliyor…" : step === TOTAL_ONBOARDING_STEPS - 1 ? "Bitir" : "Devam et"}
            {step === TOTAL_ONBOARDING_STEPS - 1 ? <Check size={15} /> : <ArrowRight size={15} />}
          </Button>
        </div>
      </div>
      {!onClose && <p className="mt-4 text-center text-[11px] text-[#a2a3ab]">İstediğin zaman profil ayarlarından bu bilgileri güncelleyebilirsin.</p>}
    </div>
  );
}
