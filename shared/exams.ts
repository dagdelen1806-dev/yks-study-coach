// Sınav tanımları — tek kaynak. Uygulama birden çok sınava hazırlanan öğrenciye hizmet eder;
// bugün YKS (TYT + AYT oturumları) ve LGS (8. sınıf, liselere geçiş). Bir öğrencinin "track"i
// (student_profiles.examTrack) hangi sınav türlerini, dersleri, net formülünü, hedef alanlarını,
// tarihleri ve AI tonunu göreceğini belirler.
//
// YENİ SINAV EKLEMEK (ör. KPSS, DGS):
//  1. EXAM_TRACKS'e track'i, EXAM_KINDS'e oturumlarını ekle (ör. "KPSS" → "KPSS_GYGK", "KPSS_EB").
//  2. EXAM_KIND_DEFS ve EXAM_TRACK_DEFS'e tanımlarını yaz (gerekirse GRADE_LEVELS'e sınıf/durum).
//  3. TypeScript eksik kalan her yeri gösterir: shared/curriculum.ts (konu ağacı),
//     shared/yksCalendar.ts (sınav tarihleri), shared/classSchedule.ts (ders programı dersleri),
//     server/schedule/scheduleImport.ts (okul ders adı eşlemesi). Hepsi Record<ExamTrack|ExamKind,…>.
//     Elle bakılacak tek metin: server/routers.ts extractBookFromPhoto istemindeki kapakta sınavı
//     tanıma ipucu (ör. "kapakta KPSS yazıyorsa exam 'KPSS_GYGK'") ve tanıtım sayfası metinleri.
//  4. Veritabanı değişikliği gerekmez: sınav sütunları metin; yalnızca yeni migration ile tip
//     anlık görüntüsü güncellenir (drizzle-kit generate boş/tek satır üretir).
//  5. server/exams.test.ts'teki "her sınav eksiksiz tanımlı" testi tanımları denetler.

export const EXAM_TRACKS = ["YKS", "LGS", "KPSS", "DGS"] as const;
export type ExamTrack = (typeof EXAM_TRACKS)[number];

// KPSS_GYGK: Genel Yetenek–Genel Kültür (lisans/önlisans/ortaöğretim adaylarının ortak oturumu).
// Öğretmenlik (MEB-AGS) ve A grubu alan bilgisi oturumları henüz yok.
export const EXAM_KINDS = ["TYT", "AYT", "LGS", "KPSS_GYGK", "DGS"] as const;
export type ExamKind = (typeof EXAM_KINDS)[number];

/** Kaynak kataloğundaki kitap kapsamları: tek bir oturum ya da bir sınavın tamamını kapsayan geniş etiketler. */
export const CATALOG_EXAM_SCOPES = [...EXAM_KINDS, "TYT_AYT", "YKS", "GENEL"] as const;
export type CatalogExamScope = (typeof CATALOG_EXAM_SCOPES)[number];

/** Öğrencinin sınıfı/durumu (anket). Her sınav kendi listesini EXAM_TRACK_DEFS.gradeLevels ile seçer. */
export const GRADE_LEVELS = ["7", "8", "9", "10", "11", "12", "mezun", "onlisans", "onlisans_mezun", "lisans", "lisans_mezun", "ortaogretim_mezun"] as const;
export type GradeLevel = (typeof GRADE_LEVELS)[number];
export const GRADE_LEVEL_LABELS: Record<GradeLevel, string> = {
  "7": "7. sınıf",
  "8": "8. sınıf",
  "9": "9. sınıf",
  "10": "10. sınıf",
  "11": "11. sınıf",
  "12": "12. sınıf",
  mezun: "Mezun",
  onlisans: "Önlisans öğrencisi",
  onlisans_mezun: "Önlisans mezunu",
  lisans: "Lisans öğrencisi",
  lisans_mezun: "Lisans mezunu",
  ortaogretim_mezun: "Lise mezunu",
};

export type ExamSubjectDef = {
  /** Deneme/özet ekranlarındaki ders adı (net kayıtlarının anahtarı). */
  name: string;
  /** Bu derste sorulan soru sayısı = alınabilecek en yüksek net. */
  questions: number;
  /** Puan katsayısı (yalnız tahmini puanı olan sınavlarda kullanılır). */
  weight: number;
  /** Oturum/bölüm adı (ör. LGS sözel/sayısal). */
  session?: string;
};

export type ExamKindDef = {
  kind: ExamKind;
  track: ExamTrack;
  label: string;
  /** Şık sayısı: YKS 5, LGS 4. */
  optionCount: 4 | 5;
  /** Kaç yanlış bir doğruyu götürür: YKS 4, LGS 3. */
  wrongsPerCorrect: number;
  subjects: ExamSubjectDef[];
  /**
   * Deneme formundaki konu satırları:
   *  - dershaneTemplate: gerçek dershane raporundan sabit şablon (shared/tytExamTemplate.ts)
   *  - curriculum: o oturumun müfredat konuları, S öğrenciden (shared/curriculumExamTemplate.ts)
   *  - studentTopics: öğrencinin Konu Haritası'ndaki konular
   */
  formRows: "dershaneTemplate" | "curriculum" | "studentTopics";
  /**
   * Tahmini puan (ağırlıklı netin doğrusal ölçeği, min–max). Resmî puan standart puanla
   * hesaplandığı için arayüzde her zaman "tahmini / resmî değil" diye gösterilir.
   */
  scoreEstimate?: { label: string; min: number; max: number };
};

export const EXAM_KIND_DEFS: Record<ExamKind, ExamKindDef> = {
  TYT: {
    kind: "TYT", track: "YKS", label: "TYT", optionCount: 5, wrongsPerCorrect: 4, formRows: "dershaneTemplate",
    subjects: [
      { name: "Türkçe", questions: 40, weight: 1 },
      { name: "Matematik", questions: 40, weight: 1 },
      { name: "Fen", questions: 20, weight: 1 },
      { name: "Sosyal", questions: 20, weight: 1 },
    ],
  },
  AYT: {
    kind: "AYT", track: "YKS", label: "AYT", optionCount: 5, wrongsPerCorrect: 4, formRows: "studentTopics",
    subjects: [
      { name: "Türkçe", questions: 40, weight: 1 },
      { name: "Matematik", questions: 40, weight: 1 },
      { name: "Fen", questions: 40, weight: 1 },
      { name: "Sosyal", questions: 46, weight: 1 },
    ],
  },
  // MEB LGS: sözel oturum 50 soru / 75 dk, sayısal oturum 40 soru / 80 dk.
  LGS: {
    kind: "LGS", track: "LGS", label: "LGS", optionCount: 4, wrongsPerCorrect: 3, formRows: "curriculum",
    scoreEstimate: { label: "Tahmini LGS puanı", min: 100, max: 500 },
    subjects: [
      { name: "Türkçe", questions: 20, weight: 4, session: "Sözel" },
      { name: "İnkılap Tarihi", questions: 10, weight: 1, session: "Sözel" },
      { name: "Din Kültürü", questions: 10, weight: 1, session: "Sözel" },
      { name: "İngilizce", questions: 10, weight: 1, session: "Sözel" },
      { name: "Matematik", questions: 20, weight: 4, session: "Sayısal" },
      { name: "Fen Bilimleri", questions: 20, weight: 4, session: "Sayısal" },
    ],
  },
  // ÖSYM KPSS Genel Yetenek–Genel Kültür: 120 soru / 130 dk. Puan (P1, P3, P93…) standart puanla
  // hesaplandığı için tahmini puan yok.
  KPSS_GYGK: {
    kind: "KPSS_GYGK", track: "KPSS", label: "KPSS GY-GK", optionCount: 5, wrongsPerCorrect: 4, formRows: "curriculum",
    subjects: [
      { name: "Türkçe", questions: 30, weight: 1, session: "Genel Yetenek" },
      { name: "Matematik", questions: 30, weight: 1, session: "Genel Yetenek" },
      { name: "Tarih", questions: 27, weight: 1, session: "Genel Kültür" },
      { name: "Coğrafya", questions: 18, weight: 1, session: "Genel Kültür" },
      { name: "Vatandaşlık", questions: 9, weight: 1, session: "Genel Kültür" },
      { name: "Güncel Bilgiler", questions: 6, weight: 1, session: "Genel Kültür" },
    ],
  },
  // ÖSYM DGS: 100 soru / 135 dk, sayısal ve sözel bölüm eşit. Puan standart puanla; tahmini puan yok.
  DGS: {
    kind: "DGS", track: "DGS", label: "DGS", optionCount: 5, wrongsPerCorrect: 4, formRows: "curriculum",
    subjects: [
      { name: "Sayısal", questions: 50, weight: 1 },
      { name: "Sözel", questions: 50, weight: 1 },
    ],
  },
};

export type ExamTrackDef = {
  track: ExamTrack;
  label: string;
  /** Sınavı yapan kurum (kapsam notu, "tarih açıklanınca" metinleri). */
  authority: { name: string; url: string };
  /** Konu Haritası'ndaki kapsam notu (konu listesinin dayanağı). */
  scopeNote: string;
  /** Anketin ilk adımındaki seçim kartı. */
  onboarding: { title: string; description: string };
  gradeLevels: readonly GradeLevel[];
  /** Anketteki sınıf sorusunun başlığı (öğrenciye "Sınıf düzeyin", yetişkine "Eğitim durumun"). */
  gradeQuestion: string;
  /** YKS'ye özgü puan türü sorusu (SAY/EA/SÖZ/DİL). */
  asksScoreType: boolean;
  /** Hedef: üniversite+bölüm+sıralama (YKS alanları) ya da tek bir serbest hedef (lise, kadro…). */
  goal:
    | { kind: "university" }
    | { kind: "custom"; label: string; placeholder: string; options: readonly string[]; emptyText: string };
  /** Hedef puan alanı (yoksa sorulmaz). */
  targetScore?: { label: string; placeholder: string; min: number; max: number };
  /** Mevcut net sorusu: YKS iki oturum (TYT/AYT), diğerleri tek alan. */
  currentNet: { kind: "tytAyt" } | { kind: "single"; hint: string; placeholder: string };
  /** İstemlerde: "Bir YKS öğrencisi" / "LGS'ye hazırlanan bir ortaokul öğrencisi". */
  studentNoun: string;
  /** İstemlerde -in hâli: "Bir YKS öğrencisinin". */
  studentPhrase: string;
  /** AI istemlerine eklenen sınav bağlamı (sınav adı, dersler, şık sayısı, yaş grubu tonu). */
  promptContext: string;
  /** Benzer soru üslubu. */
  questionStyle: string;
  /** Haftalık plan isteminde günlük yük cümlesi. */
  dailyPlanRule: string;
  /** Ders programı fotoğrafı okunurken okul türü. */
  schoolKind: string;
  /** Bu sınavın tüm oturumlarını kapsayan geniş katalog etiketleri (tek oturum etiketi zaten kapsar). */
  catalogBroadScopes: readonly CatalogExamScope[];
};

export const EXAM_TRACK_DEFS: Record<ExamTrack, ExamTrackDef> = {
  YKS: {
    track: "YKS",
    label: "YKS",
    authority: { name: "ÖSYM", url: "https://www.osym.gov.tr" },
    scopeNote: "Konu listesi ÖSYM TYT/AYT kapsamına ve MEB programına dayanır",
    onboarding: { title: "YKS", description: "Üniversite sınavı (TYT + AYT) · lise öğrencisi ya da mezun" },
    gradeLevels: ["9", "10", "11", "12", "mezun"],
    gradeQuestion: "Sınıf düzeyin",
    asksScoreType: true,
    goal: { kind: "university" },
    currentNet: { kind: "tytAyt" },
    studentNoun: "Bir YKS öğrencisi",
    studentPhrase: "Bir YKS öğrencisinin",
    promptContext: "Öğrenci YKS'ye (ÖSYM; TYT ve AYT oturumları) hazırlanıyor. Sorular 5 şıklı (A-E), 4 yanlış 1 doğruyu götürür; ÖSYM tarzı.",
    questionStyle: "YKS (ÖSYM) üslubunda",
    dailyPlanRule: "Her gün toplam 60-150 dakika ve 2-4 oturum planla.",
    schoolKind: "lise",
    catalogBroadScopes: ["TYT_AYT", "YKS", "GENEL"],
  },
  LGS: {
    track: "LGS",
    label: "LGS",
    authority: { name: "MEB", url: "https://www.meb.gov.tr" },
    scopeNote: "Konu listesi MEB 8. sınıf öğretim programına dayanır",
    onboarding: { title: "LGS", description: "Liselere geçiş sınavı · 7. ya da 8. sınıf" },
    gradeLevels: ["7", "8"],
    gradeQuestion: "Sınıf düzeyin",
    asksScoreType: false,
    goal: { kind: "custom", label: "Hedef lise", placeholder: "Örn. Kabataş Erkek Lisesi", options: ["Fen Lisesi", "Sosyal Bilimler Lisesi", "Anadolu Lisesi", "Proje Okulu", "Mesleki ve Teknik Anadolu Lisesi", "İmam Hatip Lisesi", "Henüz karar vermedim"], emptyText: "Hedef liseni henüz yazmadın." },
    targetScore: { label: "Hedef LGS puanın", placeholder: "Örn. 450", min: 100, max: 500 },
    currentNet: { kind: "single", hint: "90 soru üzerinden yaklaşık bir sayı ya da aralık yazabilirsin (örn. 60-65).", placeholder: "Örn. 60-65" },
    studentNoun: "LGS'ye hazırlanan bir ortaokul öğrencisi",
    studentPhrase: "LGS'ye hazırlanan bir ortaokul öğrencisinin",
    promptContext: "Öğrenci LGS'ye (MEB Liselere Geçiş Sistemi, 8. sınıf) hazırlanıyor; 13-14 yaşında. Dersler: Türkçe, Matematik, Fen Bilimleri, T.C. İnkılap Tarihi ve Atatürkçülük, Din Kültürü ve Ahlak Bilgisi, İngilizce. Sorular 4 şıklı (A-D), 3 yanlış 1 doğruyu götürür; MEB örnek soru tarzı, beceri temelli. Kısa ve açık cümleler kur, sakin ve cesaretlendirici ol, sınav kaygısını artıracak dil kullanma.",
    questionStyle: "LGS (MEB) üslubunda, beceri temelli",
    dailyPlanRule: "Her gün toplam 45-120 dakika ve 2-4 kısa oturum planla (okul ve ödevlerle birlikte yorucu olmasın).",
    schoolKind: "ortaokul",
    catalogBroadScopes: [],
  },
  KPSS: {
    track: "KPSS",
    label: "KPSS",
    authority: { name: "ÖSYM", url: "https://www.osym.gov.tr" },
    scopeNote: "Konu listesi ÖSYM KPSS Genel Yetenek–Genel Kültür kapsamına dayanır",
    onboarding: { title: "KPSS", description: "Kamu personel seçme sınavı · Genel Yetenek–Genel Kültür" },
    gradeLevels: ["lisans", "lisans_mezun", "onlisans_mezun", "ortaogretim_mezun"],
    gradeQuestion: "Eğitim durumun",
    asksScoreType: false,
    goal: { kind: "custom", label: "Hedef kadro", placeholder: "Örn. Vergi müfettiş yardımcılığı", options: ["Memurluk (B grubu)", "A grubu kadro", "Sözleşmeli personel", "Henüz karar vermedim"], emptyText: "Hedef kadronu henüz yazmadın." },
    targetScore: { label: "Hedef KPSS puanın", placeholder: "Örn. 85", min: 40, max: 100 },
    currentNet: { kind: "single", hint: "120 soru üzerinden (Genel Yetenek + Genel Kültür) yaklaşık bir sayı ya da aralık yazabilirsin (örn. 70-75).", placeholder: "Örn. 70-75" },
    studentNoun: "Bir KPSS adayı",
    studentPhrase: "Bir KPSS adayının",
    promptContext: "Aday KPSS Genel Yetenek–Genel Kültür'e (ÖSYM) hazırlanıyor; yetişkin, çoğu zaman çalışıyor ya da okuyor. Dersler: Türkçe ve Matematik (Genel Yetenek), Tarih, Coğrafya, Vatandaşlık ve Güncel Bilgiler (Genel Kültür). Sorular 5 şıklı (A-E), 4 yanlış 1 doğruyu götürür; ÖSYM tarzı. Bir yetişkine hitap et; gerçekçi, iş/okul temposuna uyan öneriler ver.",
    questionStyle: "KPSS (ÖSYM) üslubunda",
    dailyPlanRule: "Her gün toplam 60-180 dakika ve 2-4 oturum planla; adayın iş/okul saatlerini zorlamayan, hafta sonu daha yoğun bir tempo kur.",
    schoolKind: "kurs",
    catalogBroadScopes: [],
  },
  DGS: {
    track: "DGS",
    label: "DGS",
    authority: { name: "ÖSYM", url: "https://www.osym.gov.tr" },
    scopeNote: "Konu listesi ÖSYM DGS sayısal ve sözel bölüm kapsamına dayanır",
    onboarding: { title: "DGS", description: "Dikey geçiş sınavı · önlisans öğrencisi ya da mezun" },
    gradeLevels: ["onlisans", "onlisans_mezun"],
    gradeQuestion: "Eğitim durumun",
    asksScoreType: false,
    goal: { kind: "custom", label: "Hedef lisans bölümü", placeholder: "Örn. Bilgisayar Mühendisliği", options: [], emptyText: "Hedef lisans bölümünü henüz yazmadın." },
    targetScore: { label: "Hedef DGS puanın", placeholder: "Örn. 300", min: 100, max: 500 },
    currentNet: { kind: "single", hint: "100 soru üzerinden (sayısal + sözel) yaklaşık bir sayı ya da aralık yazabilirsin (örn. 55-60).", placeholder: "Örn. 55-60" },
    studentNoun: "Bir DGS adayı",
    studentPhrase: "Bir DGS adayının",
    promptContext: "Aday DGS'ye (ÖSYM Dikey Geçiş Sınavı; önlisanstan lisansa geçiş) hazırlanıyor. Bölümler: Sayısal (matematik, geometri, sayısal mantık) ve Sözel (Türkçe, paragraf, sözel mantık), 50'şer soru. Sorular 5 şıklı (A-E), 4 yanlış 1 doğruyu götürür; ÖSYM tarzı. Bir yetişkine hitap et.",
    questionStyle: "DGS (ÖSYM) üslubunda",
    dailyPlanRule: "Her gün toplam 60-150 dakika ve 2-4 oturum planla; önlisans dersleri ve sınavlarıyla çakışmayan bir tempo kur.",
    schoolKind: "önlisans",
    catalogBroadScopes: [],
  },
};

export const trackDef = (track: ExamTrack): ExamTrackDef => EXAM_TRACK_DEFS[track];
export const EXAM_TRACK_LABELS: Record<ExamTrack, string> = Object.fromEntries(EXAM_TRACKS.map((track) => [track, EXAM_TRACK_DEFS[track].label])) as Record<ExamTrack, string>;

export const isExamKind = (value: unknown): value is ExamKind => typeof value === "string" && (EXAM_KINDS as readonly string[]).includes(value);
export const isExamTrack = (value: unknown): value is ExamTrack => typeof value === "string" && (EXAM_TRACKS as readonly string[]).includes(value);

export const trackOf = (kind: ExamKind): ExamTrack => EXAM_KIND_DEFS[kind].track;
export const kindsOf = (track: ExamTrack): ExamKind[] => EXAM_KINDS.filter((kind) => EXAM_KIND_DEFS[kind].track === track);
/** Bir track'in varsayılan (ilk) sınav türü: YKS → TYT, LGS → LGS. */
export const defaultKindOf = (track: ExamTrack): ExamKind => kindsOf(track)[0];

export const subjectNamesOf = (kind: ExamKind): string[] => EXAM_KIND_DEFS[kind].subjects.map((subject) => subject.name);
export const subjectTotalsOf = (kind: ExamKind): Record<string, number> =>
  Object.fromEntries(EXAM_KIND_DEFS[kind].subjects.map((subject) => [subject.name, subject.questions]));
/** Bir track'teki tüm derslerin (oturumlar birleşik) tekil listesi, sıralı. */
export const trackSubjects = (track: ExamTrack): string[] => Array.from(new Set(kindsOf(track).flatMap(subjectNamesOf)));
/** Bir oturumdaki toplam soru sayısı. */
export const questionTotalOf = (kind: ExamKind): number => EXAM_KIND_DEFS[kind].subjects.reduce((sum, subject) => sum + subject.questions, 0);

/** Net = doğru − yanlış / (kaç yanlış bir doğruyu götürüyorsa). YKS: /4, LGS: /3. */
export function netFor(kind: ExamKind | null | undefined, correct: number, wrong: number): number {
  const divisor = EXAM_KIND_DEFS[kind ?? "TYT"].wrongsPerCorrect;
  return Number((correct - wrong / divisor).toFixed(2));
}

/**
 * Tahmini puan (yalnız scoreEstimate tanımlı oturumlarda; diğerlerinde null). Ders netleri
 * 0..soru sayısı aralığına kırpılır, ağırlıklı toplam min–max aralığına doğrusal ölçeklenir.
 */
export function estimateScore(kind: ExamKind | null | undefined, nets: Record<string, number>): number | null {
  const def = kind ? EXAM_KIND_DEFS[kind] : null;
  if (!def?.scoreEstimate) return null;
  const { min, max } = def.scoreEstimate;
  const ceiling = def.subjects.reduce((sum, subject) => sum + subject.questions * subject.weight, 0);
  const weighted = def.subjects.reduce((sum, subject) => sum + Math.min(subject.questions, Math.max(0, Number(nets[subject.name]) || 0)) * subject.weight, 0);
  return Math.round((min + ((max - min) * weighted) / ceiling) * 100) / 100;
}
/** Tahmini LGS puanı (100–500); bkz. estimateScore. */
export const estimateLgsScore = (nets: Record<string, number>): number => estimateScore("LGS", nets)!;
/** Track'in tahmini puanı olan oturumu (yoksa null). */
export const scoredKindOf = (track: ExamTrack): ExamKind | null => kindsOf(track).find((kind) => EXAM_KIND_DEFS[kind].scoreEstimate) ?? null;

export const examStudentPhrase = (track: ExamTrack): string => EXAM_TRACK_DEFS[track].studentPhrase;
/** Track'in şık sayısı (YKS 5, LGS 4). */
export const optionCountOf = (track: ExamTrack): 4 | 5 => EXAM_KIND_DEFS[defaultKindOf(track)].optionCount;
export const examPromptContext = (track: ExamTrack): string => EXAM_TRACK_DEFS[track].promptContext;

/** Katalogdaki bir kitap kapsamı bu oturumu kapsıyor mu? (tek oturum etiketi ya da o sınavın geniş etiketi) */
export const catalogScopeCovers = (scope: CatalogExamScope, kind: ExamKind): boolean =>
  scope === kind || EXAM_TRACK_DEFS[trackOf(kind)].catalogBroadScopes.includes(scope);

/** Profilden hedefin okunur özeti (Genel Bakış, Kurum Paneli, veli paneli). */
export type TargetFields = { examYear?: number | null; targetUniversity?: string | null; targetDepartment?: string | null; targetRanking?: string | null; targetScoreTypeLabel?: string | null; targetGoal?: string | null; targetScore?: string | null };
export function targetSummary(track: ExamTrack, profile: TargetFields): { goal: string; score: string | null; details: string[]; emptyText: string } {
  const def = EXAM_TRACK_DEFS[track];
  const year = profile.examYear ? `${def.label} ${profile.examYear}` : null;
  if (def.goal.kind === "university") {
    return {
      goal: [profile.targetUniversity, profile.targetDepartment].filter(Boolean).join(" · "),
      score: null,
      details: [profile.targetScoreTypeLabel ?? null, profile.targetRanking ? `İlk ${profile.targetRanking}` : null, year].filter((value): value is string => Boolean(value)),
      emptyText: "Hedef üniversite ve bölümünü henüz yazmadın.",
    };
  }
  const score = profile.targetScore && def.targetScore ? `${profile.targetScore} puan` : null;
  return {
    goal: profile.targetGoal ?? "",
    score,
    details: [score ? `Hedef ${score}` : null, year].filter((value): value is string => Boolean(value)),
    emptyText: def.goal.emptyText,
  };
}
