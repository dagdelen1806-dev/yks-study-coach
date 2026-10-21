// Sınav tanımları — tek kaynak. Uygulama iki sınava hazırlanan öğrenciye hizmet eder:
// YKS (TYT + AYT oturumları) ve LGS (8. sınıf, liselere geçiş). Bir öğrencinin "track"i
// (student_profiles.examTrack) hangi sınav türlerini, dersleri, net formülünü ve AI tonunu
// göreceğini belirler. Ders adı, soru sayısı ya da net kuralı gereken her yer buradan okur.

export const EXAM_TRACKS = ["YKS", "LGS"] as const;
export type ExamTrack = (typeof EXAM_TRACKS)[number];

export const EXAM_KINDS = ["TYT", "AYT", "LGS"] as const;
export type ExamKind = (typeof EXAM_KINDS)[number];

export type ExamSubjectDef = {
  /** Deneme/özet ekranlarındaki ders adı (net kayıtlarının anahtarı). */
  name: string;
  /** Bu derste sorulan soru sayısı = alınabilecek en yüksek net. */
  questions: number;
  /** Puan katsayısı (yalnız LGS tahmini puanında kullanılır). */
  weight: number;
  /** LGS'de oturum: sözel / sayısal. */
  session?: "Sözel" | "Sayısal";
};

export type ExamKindDef = {
  kind: ExamKind;
  track: ExamTrack;
  label: string;
  /** Şık sayısı: YKS 5, LGS 4. */
  optionCount: 4 | 5;
  /** Kaç yanlış bir doğruyu götürür: YKS 4, LGS 3. */
  wrongsPerCorrect: 3 | 4;
  subjects: ExamSubjectDef[];
};

export const EXAM_KIND_DEFS: Record<ExamKind, ExamKindDef> = {
  TYT: {
    kind: "TYT", track: "YKS", label: "TYT", optionCount: 5, wrongsPerCorrect: 4,
    subjects: [
      { name: "Türkçe", questions: 40, weight: 1 },
      { name: "Matematik", questions: 40, weight: 1 },
      { name: "Fen", questions: 20, weight: 1 },
      { name: "Sosyal", questions: 20, weight: 1 },
    ],
  },
  AYT: {
    kind: "AYT", track: "YKS", label: "AYT", optionCount: 5, wrongsPerCorrect: 4,
    subjects: [
      { name: "Türkçe", questions: 40, weight: 1 },
      { name: "Matematik", questions: 40, weight: 1 },
      { name: "Fen", questions: 40, weight: 1 },
      { name: "Sosyal", questions: 46, weight: 1 },
    ],
  },
  // MEB LGS: sözel oturum 50 soru / 75 dk, sayısal oturum 40 soru / 80 dk.
  LGS: {
    kind: "LGS", track: "LGS", label: "LGS", optionCount: 4, wrongsPerCorrect: 3,
    subjects: [
      { name: "Türkçe", questions: 20, weight: 4, session: "Sözel" },
      { name: "İnkılap Tarihi", questions: 10, weight: 1, session: "Sözel" },
      { name: "Din Kültürü", questions: 10, weight: 1, session: "Sözel" },
      { name: "İngilizce", questions: 10, weight: 1, session: "Sözel" },
      { name: "Matematik", questions: 20, weight: 4, session: "Sayısal" },
      { name: "Fen Bilimleri", questions: 20, weight: 4, session: "Sayısal" },
    ],
  },
};

export const EXAM_TRACK_LABELS: Record<ExamTrack, string> = { YKS: "YKS", LGS: "LGS" };

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

/** Net = doğru − yanlış / (kaç yanlış bir doğruyu götürüyorsa). YKS: /4, LGS: /3. */
export function netFor(kind: ExamKind | null | undefined, correct: number, wrong: number): number {
  const divisor = EXAM_KIND_DEFS[kind ?? "TYT"].wrongsPerCorrect;
  return Number((correct - wrong / divisor).toFixed(2));
}

/**
 * Tahmini LGS puanı (100–500). MEB gerçek puanı standart puanla (o yılki tüm öğrencilerin
 * ortalaması ve sapmasıyla) hesaplar; bu yalnızca ağırlıklı netin doğrusal ölçeğidir ve
 * arayüzde her zaman "tahmini" diye gösterilir. Ağırlık: Türkçe/Mat/Fen 4, diğerleri 1.
 */
export function estimateLgsScore(nets: Record<string, number>): number {
  const subjects = EXAM_KIND_DEFS.LGS.subjects;
  const max = subjects.reduce((sum, subject) => sum + subject.questions * subject.weight, 0);
  const weighted = subjects.reduce((sum, subject) => {
    const net = Math.min(subject.questions, Math.max(0, Number(nets[subject.name]) || 0));
    return sum + net * subject.weight;
  }, 0);
  return Math.round((100 + (400 * weighted) / max) * 100) / 100;
}

/** AI istemlerine eklenen sınav bağlamı (sınav adı, dersler, şık sayısı, yaş grubu tonu). */
export function examPromptContext(track: ExamTrack): string {
  if (track === "LGS") {
    return "Öğrenci LGS'ye (MEB Liselere Geçiş Sistemi, 8. sınıf) hazırlanıyor; 13-14 yaşında. Dersler: Türkçe, Matematik, Fen Bilimleri, T.C. İnkılap Tarihi ve Atatürkçülük, Din Kültürü ve Ahlak Bilgisi, İngilizce. Sorular 4 şıklı (A-D), 3 yanlış 1 doğruyu götürür; MEB örnek soru tarzı, beceri temelli. Kısa ve açık cümleler kur, sakin ve cesaretlendirici ol, sınav kaygısını artıracak dil kullanma.";
  }
  return "Öğrenci YKS'ye (ÖSYM; TYT ve AYT oturumları) hazırlanıyor. Sorular 5 şıklı (A-E), 4 yanlış 1 doğruyu götürür; ÖSYM tarzı.";
}
