// Student onboarding: shared types, option lists (Turkish labels) and pure
// validation used by both the client (step-by-step form) and the server
// (`onboarding` router). Keeping validation here — instead of only on the
// server — lets the UI show inline Turkish error messages before a network
// round-trip, the same way `shared/topicStatus.ts` / `shared/planTargets.ts`
// back both sides of existing features.

export const GRADE_LEVELS = ["9", "10", "11", "12", "mezun"] as const;
export type GradeLevel = (typeof GRADE_LEVELS)[number];
export const GRADE_LEVEL_LABELS: Record<GradeLevel, string> = {
  "9": "9. sınıf",
  "10": "10. sınıf",
  "11": "11. sınıf",
  "12": "12. sınıf",
  mezun: "Mezun",
};

export const TARGET_SCORE_TYPES = ["SAY", "EA", "SOZ", "DIL", "TYT", "belirsiz"] as const;
export type TargetScoreType = (typeof TARGET_SCORE_TYPES)[number];
export const TARGET_SCORE_TYPE_LABELS: Record<TargetScoreType, string> = {
  SAY: "Sayısal (SAY)",
  EA: "Eşit Ağırlık (EA)",
  SOZ: "Sözel (SÖZ)",
  DIL: "Dil",
  TYT: "Yalnızca TYT",
  belirsiz: "Henüz karar vermedim",
};

export const MOCK_EXAM_FREQUENCIES = ["haftada_birkac", "haftada_bir", "ayda_birkac", "nadiren", "henuz_cozmedim"] as const;
export type MockExamFrequency = (typeof MOCK_EXAM_FREQUENCIES)[number];
export const MOCK_EXAM_FREQUENCY_LABELS: Record<MockExamFrequency, string> = {
  haftada_birkac: "Haftada birkaç kez",
  haftada_bir: "Haftada bir",
  ayda_birkac: "Ayda birkaç kez",
  nadiren: "Nadiren",
  henuz_cozmedim: "Henüz deneme çözmedim",
};

export const SUBJECT_OPTIONS = ["Türkçe", "Matematik", "Fizik", "Kimya", "Biyoloji", "Tarih", "Coğrafya", "Felsefe", "Din Kültürü", "Edebiyat"] as const;

export const STUDY_DAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"] as const;

export const STUDY_TIMES = ["sabah", "oglen", "aksam", "gece"] as const;
export type StudyTime = (typeof STUDY_TIMES)[number];
export const STUDY_TIME_LABELS: Record<StudyTime, string> = { sabah: "Sabah", oglen: "Öğlen", aksam: "Akşam", gece: "Gece" };

export const STUDY_METHODS = ["konu_anlatimi", "soru_cozumu", "deneme", "tekrar", "karisik"] as const;
export type StudyMethod = (typeof STUDY_METHODS)[number];
export const STUDY_METHOD_LABELS: Record<StudyMethod, string> = {
  konu_anlatimi: "Konu anlatımı",
  soru_cozumu: "Soru çözümü",
  deneme: "Deneme",
  tekrar: "Tekrar",
  karisik: "Karışık",
};

export const COACHING_EXPECTATIONS = ["gunluk_plan", "haftalik_plan", "konu_takibi", "deneme_analizi", "motivasyon", "eksik_konu_tespiti", "hepsi"] as const;
export type CoachingExpectation = (typeof COACHING_EXPECTATIONS)[number];
export const COACHING_EXPECTATION_LABELS: Record<CoachingExpectation, string> = {
  gunluk_plan: "Günlük plan",
  haftalik_plan: "Haftalık plan",
  konu_takibi: "Konu takibi",
  deneme_analizi: "Deneme analizi",
  motivasyon: "Motivasyon desteği",
  eksik_konu_tespiti: "Eksik konu tespiti",
  hepsi: "Hepsi",
};

export const NOTIFICATION_PREFERENCES = ["gunluk", "haftalik", "onemli_anlarda", "kapali"] as const;
export type NotificationPreference = (typeof NOTIFICATION_PREFERENCES)[number];
export const NOTIFICATION_PREFERENCE_LABELS: Record<NotificationPreference, string> = {
  gunluk: "Günlük hatırlatma",
  haftalik: "Haftalık özet",
  onemli_anlarda: "Sadece önemli anlarda",
  kapali: "Bildirim istemiyorum",
};

export const COACHING_STYLES = ["destekleyici", "disiplinli", "kisa_net", "detayli", "dengeli"] as const;
export type CoachingStyle = (typeof COACHING_STYLES)[number];
export const COACHING_STYLE_LABELS: Record<CoachingStyle, string> = {
  destekleyici: "Destekleyici",
  disiplinli: "Disiplinli",
  kisa_net: "Kısa ve net",
  detayli: "Detaylı ve açıklayıcı",
  dengeli: "Dengeli",
};

export const ONBOARDING_STEP_META = [
  { step: 0, key: "identity", title: "Seni tanıyalım", eyebrow: "1. Adım · Tanışalım" },
  { step: 1, key: "academic", title: "Akademik durumun", eyebrow: "2. Adım · Koçluk bilgisi" },
  { step: 2, key: "goals", title: "Hedeflerin", eyebrow: "3. Adım · Koçluk bilgisi" },
  { step: 3, key: "routine", title: "Çalışma düzenin", eyebrow: "4. Adım · Koçluk bilgisi" },
  { step: 4, key: "coaching", title: "Koçluk tercihlerin", eyebrow: "5. Adım · Koçluk bilgisi" },
] as const;
export const TOTAL_ONBOARDING_STEPS = ONBOARDING_STEP_META.length;

/** Client-side working shape — always strings/arrays so every input stays a
 * controlled component; converted to the DB's nullable typed columns by the
 * `onboarding` router. */
export type OnboardingDraft = {
  preferredName: string;
  gradeLevel: GradeLevel | "";
  examYear: string;
  targetScoreType: TargetScoreType | "";
  currentTytNet: string;
  currentAytNet: string;
  mockExamFrequency: MockExamFrequency | "";
  strongSubjects: string[];
  weakSubjects: string[];
  hasPriorStudyPlan: "yes" | "no" | "";
  targetUniversity: string;
  targetDepartment: string;
  targetRanking: string;
  mainGoal: string;
  shortTermGoal: string;
  longTermGoal: string;
  dailyStudyDuration: string;
  /** "HH:mm" — genelde ders çalışmaya başladığın saat; Pusula Odak günlük planının gerçek saat dilimlerini buradan türetir. */
  preferredStudyStartTime: string;
  availableStudyDays: (typeof STUDY_DAYS)[number][];
  preferredStudyTimes: StudyTime[];
  preferredStudyMethods: StudyMethod[];
  studyObstacles: string;
  coachingExpectations: CoachingExpectation[];
  notificationPreference: NotificationPreference | "";
  coachingStyle: CoachingStyle | "";
  additionalNotes: string;
};

export const emptyOnboardingDraft = (): OnboardingDraft => ({
  preferredName: "",
  gradeLevel: "",
  examYear: "",
  targetScoreType: "",
  currentTytNet: "",
  currentAytNet: "",
  mockExamFrequency: "",
  strongSubjects: [],
  weakSubjects: [],
  hasPriorStudyPlan: "",
  targetUniversity: "",
  targetDepartment: "",
  targetRanking: "",
  mainGoal: "",
  shortTermGoal: "",
  longTermGoal: "",
  dailyStudyDuration: "",
  preferredStudyStartTime: "",
  availableStudyDays: [],
  preferredStudyTimes: [],
  preferredStudyMethods: [],
  studyObstacles: "",
  coachingExpectations: [],
  notificationPreference: "",
  coachingStyle: "",
  additionalNotes: "",
});

export type FieldErrors = Record<string, string>;

const currentYear = new Date().getFullYear();

/**
 * Required-field validation per step. Only the fields the product spec marks
 * as required are checked here — everything else (net bilgisi, hedef okul,
 * kısıtlayıcı faktörler, ek notlar…) stays optional so the flow never blocks
 * a student who genuinely doesn't know the answer yet.
 */
export function validateOnboardingStep(step: number, draft: OnboardingDraft): FieldErrors {
  const errors: FieldErrors = {};

  if (step === 0) {
    if (!draft.preferredName.trim()) errors.preferredName = "Sana nasıl hitap edelim, yazar mısın?";
    if (!draft.gradeLevel) errors.gradeLevel = "Sınıf düzeyini seç.";
    if (!draft.examYear.trim()) errors.examYear = "Hedef sınav yılını gir.";
    else {
      const year = Number(draft.examYear);
      if (!Number.isInteger(year) || year < currentYear || year > currentYear + 6) {
        errors.examYear = `${currentYear} ile ${currentYear + 6} arasında bir yıl gir.`;
      }
    }
    if (!draft.targetScoreType) errors.targetScoreType = "Hedef puan türünü seç.";
  }

  if (step === 1) {
    // Akademik durum tamamen isteğe bağlı — "Bilmiyorum" her zaman geçerli bir yanıttır.
  }

  if (step === 2) {
    // Hedefler de isteğe bağlı — hedef okul/bölüm bilinmiyorsa boş bırakılabilir.
  }

  if (step === 3) {
    if (draft.dailyStudyDuration.trim()) {
      const minutes = Number(draft.dailyStudyDuration);
      if (!Number.isFinite(minutes) || minutes < 0 || minutes > 960) {
        errors.dailyStudyDuration = "0-960 dakika arasında bir süre gir (isteğe bağlı).";
      }
    }
    if (draft.preferredStudyStartTime.trim() && !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.preferredStudyStartTime.trim())) {
      errors.preferredStudyStartTime = "Saat SS:DD biçiminde olmalı (isteğe bağlı).";
    }
  }

  if (step === 4) {
    // Koçluk tercihleri isteğe bağlı.
  }

  return errors;
}

export const isStepValid = (step: number, draft: OnboardingDraft): boolean => Object.keys(validateOnboardingStep(step, draft)).length === 0;
