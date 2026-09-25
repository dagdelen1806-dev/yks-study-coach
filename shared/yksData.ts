import { deriveTopicStatus, MIN_RELIABLE_QUESTION_COUNT } from "./topicStatus";

export type ExamType = "TYT" | "AYT";
export type TopicStatus = "Zayıf" | "Orta" | "İyi";

export type Topic = {
  id: string;
  exam: ExamType;
  subject: string;
  topic: string;
  unit: string;
  progress: number;
  status: TopicStatus;
  accent: "coral" | "blue" | "mint" | "yellow" | "lilac";
  /** Soru hacmi az olduğunda true; arayüz kesin bir durum yerine "veri yetersiz" göstermeli. */
  insufficientData?: boolean;
};

export type Resource = {
  id: string;
  title: string;
  publisher: string;
  subject: string;
  level: "Başlangıç" | "Orta" | "İleri";
  reason: string;
  tone: "blue" | "coral" | "lilac";
};

export type BookLevel = "Kolay" | "Orta" | "Zor";
export type BookExam = "TYT" | "AYT";

export type ResourceBook = {
  id: string;
  title: string;
  publisher: string;
  subject: string;
  exam: BookExam;
  level: BookLevel;
  format: string;
  reason: string;
  sourceUrl: string;
  pageCount?: number;
  tone: "blue" | "coral" | "lilac" | "mint" | "yellow";
  /** Kapak OCR'ından (öğrencinin kendi eklediği kitaplarda); mükerrer tespitinde kullanılır. */
  authors?: string;
  isbn?: string;
};

export type BookStudyLog = {
  id: string;
  bookId: string;
  date: string;
  minutes: number;
  questions: number;
  correct: number;
  wrong: number;
  blank: number;
  topic?: string;
  pageStart?: number;
  pageEnd?: number;
  testStart?: number;
  testEnd?: number;
};

export type SourceSwitch = {
  id: string;
  fromBookId?: string;
  toBookId: string;
  date: string;
  reason: string;
};

export type BookTopicMapping = {
  id: string;
  bookId: string;
  topic: string;
  subject: string;
  pageStart?: number | null;
  pageEnd?: number | null;
  testStart?: number | null;
  testEnd?: number | null;
};

export type MockExam = {
  id: string;
  title: string;
  date: string;
  exam?: ExamType;
  net: number;
  delta: number;
  tag: string;
  subjects: Record<string, number>;
  /** Deneme sırasında derslere ayrılan yaklaşık süre (dakika). */
  timeSpent?: Record<string, number>;
  /** Deneme içinde takip edilen öncelikli konuların netleri. */
  topicNets?: Record<string, number>;
  /** Belgeden veya ayrıntılı girişten gelen konu bazlı doğru/yanlış satırları. */
  topicDetails?: ExamTopicResult[];
  importedFrom?: "manual" | "ocr" | "pdf" | "csv" | "xlsx";
};

export type ExamTopicResult = {
  subject: string;
  topic: string;
  /** TYT dershane denemesi şablonundaki alt kategori (ör. "Fizik", "Matematik-1") — bkz. shared/tytExamTemplate.ts. AYT/manuel satırlarda boş kalabilir. */
  category?: string;
  questionCount: number;
  correct: number;
  wrong: number;
  blank: number;
  accuracy: number;
  net: number;
};

export type ExamDocumentExtraction = {
  title: string;
  date: string;
  exam: ExamType;
  subjects: Record<string, number>;
  timeSpent: Record<string, number>;
  topics: ExamTopicResult[];
  notes: string;
};

export type StudyHistoryItem = {
  id: string;
  title: string;
  subject: string;
  topic: string;
  minutes: number;
  kind: AiStudySession["kind"];
  completedAt: string;
  bookId?: string;
  bookTitle?: string;
  targetQuestions?: number;
  targetPages?: string | null;
  targetTests?: string | null;
};

export const calculateTopicResult = (input: Pick<ExamTopicResult, "subject" | "topic" | "questionCount" | "correct" | "wrong" | "blank">): ExamTopicResult => {
  const questionCount = input.questionCount || input.correct + input.wrong + input.blank;
  const net = Number((input.correct - input.wrong / 4).toFixed(2));
  return { ...input, questionCount, accuracy: questionCount ? Math.round((input.correct / questionCount) * 100) : 0, net };
};

export type AiStudySession = {
  title: string;
  subject: string;
  topic: string;
  minutes: number;
  kind: "Öğrenme" | "Soru" | "Tekrar" | "Deneme analizi";
  rationale: string;
  bookId?: string;
  bookTitle?: string;
  targetQuestions?: number;
  targetPages?: string | null;
  targetTests?: string | null;
};

export type AiStudyDay = {
  day: string;
  date: string;
  totalMinutes: number;
  sessions: AiStudySession[];
};

export type AiWeeklyPlan = {
  summary: string;
  focus: Array<{ topic: string; subject: string; reason: string }>;
  days: AiStudyDay[];
  coachNote: string;
};

export const subjectOrder = ["Türkçe", "Matematik", "Fen", "Sosyal"] as const;

export const trackedTopics = [
  { topic: "Paragrafta anlam", subject: "Türkçe", max: 12, color: "#f07d69" },
  { topic: "Problemler", subject: "Matematik", max: 12, color: "#3b5ccc" },
  { topic: "Maddenin halleri", subject: "Fen", max: 6, color: "#55a98b" },
  { topic: "Milli Mücadele", subject: "Sosyal", max: 6, color: "#d49a33" },
  { topic: "Fonksiyonlar", subject: "Matematik", max: 10, color: "#8b7bd8" },
];

export const topicSeeds: Topic[] = [
  { id: "tyt-tr-paragraf", exam: "TYT", subject: "Türkçe", topic: "Paragrafta anlam", unit: "Anlam bilgisi", progress: 38, status: "Zayıf", accent: "coral" },
  { id: "tyt-tr-dilbilgisi", exam: "TYT", subject: "Türkçe", topic: "Fiilimsi ve cümlenin ögeleri", unit: "Dil bilgisi", progress: 64, status: "Orta", accent: "coral" },
  { id: "tyt-mat-problem", exam: "TYT", subject: "Matematik", topic: "Problemler", unit: "Temel matematik", progress: 31, status: "Zayıf", accent: "blue" },
  { id: "tyt-mat-sayilar", exam: "TYT", subject: "Matematik", topic: "Sayılar ve bölünebilme", unit: "Temel matematik", progress: 78, status: "Orta", accent: "blue" },
  { id: "tyt-fen-kimya", exam: "TYT", subject: "Fen", topic: "Maddenin halleri", unit: "Kimya", progress: 71, status: "Orta", accent: "mint" },
  { id: "tyt-sos-tarih", exam: "TYT", subject: "Sosyal", topic: "Milli Mücadele", unit: "Tarih", progress: 88, status: "İyi", accent: "yellow" },
  { id: "ayt-mat-fonksiyon", exam: "AYT", subject: "Matematik", topic: "Fonksiyonlar", unit: "Cebir", progress: 46, status: "Zayıf", accent: "blue" },
  { id: "ayt-mat-integral", exam: "AYT", subject: "Matematik", topic: "İntegral", unit: "Analiz", progress: 22, status: "Zayıf", accent: "blue" },
  { id: "ayt-fizik-elektrik", exam: "AYT", subject: "Fizik", topic: "Elektrik ve manyetizma", unit: "Elektrik", progress: 58, status: "Orta", accent: "lilac" },
  { id: "ayt-biyo-sistem", exam: "AYT", subject: "Biyoloji", topic: "Sistemler", unit: "İnsan fizyolojisi", progress: 67, status: "Orta", accent: "mint" },
];

export const resourceSeeds: Resource[] = [
  { id: "resource-1", title: "TYT Matematik Soru Bankası", publisher: "345 Yayınları", subject: "Problemler", level: "Orta", reason: "Son 3 denemede bu başlıkta net kaybı var.", tone: "blue" },
  { id: "resource-2", title: "Paragrafın Ritmi", publisher: "Hız ve Renk", subject: "Paragrafta anlam", level: "Başlangıç", reason: "Günlük 20 soru ile hız kazanman için.", tone: "coral" },
  { id: "resource-3", title: "AYT Matematik Fasikülleri", publisher: "Orijinal", subject: "İntegral", level: "İleri", reason: "Temel oturduğunda ikinci tur için.", tone: "lilac" },
];

export const resourceBookCatalog: ResourceBook[] = [
  { id: "book-tyt-turkce-pegem", title: "TYT Türkçe Ders İşleme Föyü", publisher: "Pegem Akademi", subject: "Türkçe", exam: "TYT", level: "Kolay", format: "Konu anlatımı / föy", pageCount: 272, reason: "Temel oluşturmak ve konuları adım adım öğrenmek isteyenler için.", sourceUrl: "https://pegem.net/urun/TYT-Turkce-Ders-Isleme-Foyu-237769", tone: "coral" },
  { id: "book-tyt-turkce-345", title: "ÜçDörtBeş TYT Türkçe Soru Bankası", publisher: "ÜçDörtBeş", subject: "Türkçe", exam: "TYT", level: "Orta", format: "Soru bankası / video çözümlü", pageCount: 440, reason: "ÖSYM tarzı ve kademeli soru pratiğine geçmek için.", sourceUrl: "https://www.kitapisler.com/ucdortbes-yayinlari-tyt-turkce-soru-bankasi_96721.html", tone: "coral" },
  { id: "book-tyt-turkce-3d", title: "2026 TYT 3D Türkçe Soru Bankası", publisher: "3D Yayınları", subject: "Türkçe", exam: "TYT", level: "Zor", format: "Soru bankası / video çözümlü", pageCount: 360, reason: "Temeli sağlam öğrenciler için seçici, üst net odaklı pratik.", sourceUrl: "https://www.kitapsec.com/Products/2026-TYT-3D-Turkce-Tamami-Video-Cozumlu-Soru-Bankasi-3D-Yayinlari-229824.html", tone: "coral" },
  { id: "book-tyt-mat-karekok", title: "Matematik 0", publisher: "Karekök", subject: "Matematik", exam: "TYT", level: "Kolay", format: "Temel konu + soru çalışması", pageCount: 512, reason: "Sıfırdan başlayanlar için temel konuları sıralı biçimde kurar.", sourceUrl: "https://www.karekok.com.tr/yayinlarimiz/sifir-serisi/matematik-0-297.html", tone: "blue" },
  { id: "book-tyt-mat-345", title: "TYT Matematik Soru Bankası", publisher: "ÜçDörtBeş", subject: "Matematik", exam: "TYT", level: "Orta", format: "Soru bankası / video çözümlü", pageCount: 432, reason: "Kolay-orta-zor testleriyle dengeli sınav pratiği sağlar.", sourceUrl: "https://www.ucdortbes.com/tyt-matematik-soru-bankasi.html", tone: "blue" },
  { id: "book-tyt-mat-bilgi", title: "TYT Matematik Soru Bankası", publisher: "Bilgi Sarmal", subject: "Matematik", exam: "TYT", level: "Zor", format: "Soru bankası", pageCount: 400, reason: "Orta-üst düzey ve geliştirici sorularla neti yukarı taşımak için.", sourceUrl: "https://www.kitapisler.com/bilgi-sarmal-tyt-matematik-soru-bankasi_73711.html", tone: "blue" },
  { id: "book-tyt-fen-paraf", title: "TYT Garanti Konular Fen Bilimleri", publisher: "Paraf", subject: "Fen", exam: "TYT", level: "Kolay", format: "Konu anlatımı + soru bankası", pageCount: 256, reason: "Fen temeli zayıf öğrenciler için konu ve soru çözümünü birlikte sunar.", sourceUrl: "https://www.trendyol.com/paraf-yayinlari/tyt-garanti-konular-fen-bilimleri-soru-bankasi-2026-p-808166841", tone: "mint" },
  { id: "book-tyt-fen-bilgi", title: "TYT Fizik-Kimya-Biyoloji Deneme Seti", publisher: "Bilgi Sarmal", subject: "Fen", exam: "TYT", level: "Zor", format: "Branş denemesi seti", reason: "Konuları bitirenler için hız, dayanıklılık ve seçici soru pratiği.", sourceUrl: "https://www.kitapsec.com/Products/TYT-Fizik-Kimya-Biyoloji-Deneme-Seti-Bilgi-Sarmal-Yayinlari-796978.html", tone: "mint" },
  { id: "book-tyt-fen-rasyonel", title: "TYT Fizik-Kimya-Biyoloji Deneme Setleri", publisher: "Rasyonel", subject: "Fen", exam: "TYT", level: "Zor", format: "Branş denemesi seti", reason: "ÖSYM ayarında yüksek yoğunluklu deneme temposu için.", sourceUrl: "https://www.rasyonelyayinlari.com.tr/urun/avantajli-brans-denemeleri-tyt-ayt/tyt-fizik-kimya-biyoloji-deneme-setleri-3-urun-120-deneme-alpinist-serisi-osym-ayarinda", tone: "mint" },
  { id: "book-tyt-sos-aydin", title: "TYT Sosyal Bilimler Soru Bankası", publisher: "Aydın", subject: "Sosyal", exam: "TYT", level: "Kolay", format: "Soru bankası / video çözümlü", pageCount: 320, reason: "Dört sosyal branşını temel-orta düzeyde birlikte taramak için.", sourceUrl: "https://www.kitapisler.com/aydin-yayinlari-tyt-sosyal-bilimler-soru-bankasi_89813.html", tone: "yellow" },
  { id: "book-tyt-sos-345", title: "1 Ayda Tüm TYT Sosyal Soru Bankası", publisher: "ÜçDörtBeş", subject: "Sosyal", exam: "TYT", level: "Orta", format: "Soru bankası / video çözümlü", pageCount: 320, reason: "Temeli tamamlayan öğrenciler için düzenli ve yönetilebilir tempo.", sourceUrl: "https://www.kitapisler.com/ucdortbes-yayinlari-1-ayda-tum-tyt-sosyal-soru-bankasi_100581.html", tone: "yellow" },
  { id: "book-tyt-sos-3d", title: "TYT 3D Simülasyon Sosyal Bilimler", publisher: "3D Yayınları", subject: "Sosyal", exam: "TYT", level: "Zor", format: "Simülasyon denemeleri", reason: "Sınav koşulunda seçici soru ve süre pratiği için.", sourceUrl: "https://www.3dyayinlari.com/urun/tyt-3d-simulasyon-sosyal-bilimler-denemeleri-1895", tone: "yellow" },
  { id: "book-ayt-mat-sinav", title: "AYT Matematik 24 Adımda Konu Anlatımlı Soru Bankası", publisher: "Sınav Yayınları", subject: "Matematik", exam: "AYT", level: "Kolay", format: "Konu anlatımı + soru bankası", pageCount: 352, reason: "AYT konularını adım adım kurmak ve eksikleri kapatmak için.", sourceUrl: "https://www.sinavyayin.com/urun/sinav-yayinlari-ayt-matematik-24-adimda-konu-anlatimli-soru-bankasi", tone: "lilac" },
  { id: "book-ayt-mat-baris", title: "AYT Matematik Soru Bankası", publisher: "Barış", subject: "Matematik", exam: "AYT", level: "Orta", format: "Soru bankası", pageCount: 324, reason: "Konu bilgisi olan öğrenciyi yoğun sınav pratiğine taşır.", sourceUrl: "https://www.kitapyurdu.com/kitap/ayt-matematik-soru-bankasi/719973.html", tone: "lilac" },
  { id: "book-ayt-mat-orijinal", title: "AYT Orijinal Matematik Soru Bankası", publisher: "Orijinal", subject: "Matematik", exam: "AYT", level: "Zor", format: "Soru bankası", pageCount: 431, reason: "Seçici ve üst düzey AYT matematik soruları için.", sourceUrl: "https://www.kitapsec.com/Products/AYT-Orijinal-Matematik-Soru-Bankasi-Orijinal-Yayinlari-539847.html", tone: "lilac" },
  { id: "book-ayt-fen-345", title: "AYT Biyoloji Konu Özetli Soru Bankası", publisher: "ÜçDörtBeş", subject: "Fen", exam: "AYT", level: "Orta", format: "Konu özetli soru bankası", pageCount: 360, reason: "Kısa özetleri testlerle birleştirerek konu pekiştirmek için.", sourceUrl: "https://www.ucdortbes.com/ayt-biyoloji-soru-bankasi.html", tone: "mint" },
  { id: "book-ayt-fen-3d-fizik", title: "AYT 3D Fizik Soru Bankası", publisher: "3D Yayınları", subject: "Fen", exam: "AYT", level: "Zor", format: "Soru bankası", reason: "Çok adımlı, kavramsal ve yeni nesil fizik soruları için.", sourceUrl: "https://www.3dyayinlari.com/urunlerimiz/ayt", tone: "mint" },
  { id: "book-ayt-fen-3d-kimya", title: "AYT 3D Kimya Soru Bankası", publisher: "3D Yayınları", subject: "Fen", exam: "AYT", level: "Zor", format: "Soru bankası", reason: "Hesaplama ve yorum becerisini seçici sorularla geliştirmek için.", sourceUrl: "https://www.3dyayinlari.com/urunlerimiz/ayt", tone: "mint" },
  { id: "book-ayt-fen-miray", title: "AYT Biyoloji Soru Bankası", publisher: "Miray", subject: "Fen", exam: "AYT", level: "Kolay", format: "Pratik konu özetli soru bankası", pageCount: 240, reason: "MEB kazanımlarını basamaklı testler ve kısa özetlerle çalışmak için.", sourceUrl: "https://www.kitapsec.com/Products/AYT-Biyoloji-Soru-Bankasi-Miray-Yayinlari-568420.html", tone: "mint" },
];

export const initialExams: MockExam[] = [
  {
    id: "mock-3",
    title: "Türkiye Geneli TYT · 03",
    date: "2026-09-14",
    net: 68.25,
    delta: 4.5,
    tag: "Yükseliş",
    subjects: { Türkçe: 28.5, Matematik: 18.75, Fen: 12.5, Sosyal: 8.5 },
    timeSpent: { Türkçe: 48, Matematik: 74, Fen: 31, Sosyal: 27 },
    topicNets: { "Paragrafta anlam": 10, Problemler: 6, "Maddenin halleri": 2.5, "Milli Mücadele": 4.5, Fonksiyonlar: 6.5 },
  },
  {
    id: "mock-2",
    title: "Kurum İçi TYT · 02",
    date: "2026-09-07",
    net: 63.75,
    delta: 2.25,
    tag: "Yükseliş",
    subjects: { Türkçe: 27, Matematik: 16.5, Fen: 11.75, Sosyal: 8.5 },
    timeSpent: { Türkçe: 51, Matematik: 69, Fen: 34, Sosyal: 26 },
    topicNets: { "Paragrafta anlam": 8, Problemler: 5.25, "Maddenin halleri": 3.25, "Milli Mücadele": 4, Fonksiyonlar: 5.5 },
  },
  {
    id: "mock-1",
    title: "Başlangıç Denemesi",
    date: "2026-08-31",
    net: 61.5,
    delta: 0,
    tag: "Başlangıç",
    subjects: { Türkçe: 26, Matematik: 15.25, Fen: 11.25, Sosyal: 9 },
    timeSpent: { Türkçe: 56, Matematik: 63, Fen: 36, Sosyal: 25 },
    topicNets: { "Paragrafta anlam": 7.5, Problemler: 4, "Maddenin halleri": 3.5, "Milli Mücadele": 4.5, Fonksiyonlar: 5 },
  },
];

export const weeklyBars = [
  { day: "Pzt", value: 62 }, { day: "Sal", value: 86 }, { day: "Çar", value: 48 },
  { day: "Per", value: 95 }, { day: "Cum", value: 72 }, { day: "Cmt", value: 36 }, { day: "Paz", value: 54 },
];

export const dailyPlan = [
  { time: "09:00", title: "Problemler · 20 soru", meta: "TYT Matematik", done: true, tone: "blue" },
  { time: "11:30", title: "Paragraf · 20 soru", meta: "TYT Türkçe", done: false, tone: "coral" },
  { time: "15:00", title: "İntegral tekrar", meta: "AYT Matematik", done: false, tone: "lilac" },
];

export const subjectBreakdown = [
  { label: "Türkçe", value: 28.5, total: 40, color: "#f07d69" },
  { label: "Matematik", value: 18.75, total: 40, color: "#3b5ccc" },
  { label: "Fen", value: 12.5, total: 20, color: "#55a98b" },
  { label: "Sosyal", value: 8.5, total: 20, color: "#d49a33" },
];

export const curriculumSubjects = [
  { label: "TYT Türkçe", count: 12, progress: 68 }, { label: "TYT Matematik", count: 18, progress: 54 },
  { label: "TYT Fen", count: 14, progress: 73 }, { label: "TYT Sosyal", count: 16, progress: 82 },
  { label: "AYT Matematik", count: 24, progress: 42 }, { label: "AYT Fen", count: 28, progress: 61 },
];

export const scopeSources = [
  { label: "ÖSYM YKS kılavuzları", url: "https://www.osym.gov.tr" },
  { label: "MEB öğretim programları", url: "https://mufredat.meb.gov.tr" },
];

export const statusMeta: Record<TopicStatus, { color: string; bg: string; description: string }> = {
  Zayıf: { color: "#d95d4d", bg: "#fff0ed", description: "Öncelikli tekrar" },
  Orta: { color: "#bd7c18", bg: "#fff8df", description: "Bir tur daha" },
  İyi: { color: "#2e8666", bg: "#e9f7f0", description: "Koruma turu" },
};

export const topicCounts = {
  total: topicSeeds.length,
  weak: topicSeeds.filter((topic) => topic.status === "Zayıf").length,
  medium: topicSeeds.filter((topic) => topic.status === "Orta").length,
  good: topicSeeds.filter((topic) => topic.status === "İyi").length,
};

export const focusTopics = topicSeeds.filter((topic) => topic.status === "Zayıf");
export const averageProgress = Math.round(topicSeeds.reduce((sum, topic) => sum + topic.progress, 0) / topicSeeds.length);
export const currentNet = initialExams[0].net;
export const targetNet = 85;
export const streakDays = 12;
export const weeklyStudyMinutes = 485;
export const weeklyGoalMinutes = 600;
export const upcomingExam = { date: "2027-06-19", label: "YKS 2027", daysLeft: 275 };
export const officialScopeNote = "Konu haritası, ÖSYM sınav kapsamındaki TYT ve AYT ders başlıklarına göre başlangıç verisi olarak düzenlenmiştir.";
export const motivationalLines = ["Bugün dünden bir adım öndesin.", "Küçük tekrarlar, büyük netler getirir.", "Zorlandığın yer, gelişimin başladığı yerdir."];
export const getMotivationalLine = (seed = new Date().getDate()) => motivationalLines[seed % motivationalLines.length];
export const subjectFilters = ["Tümü", "Türkçe", "Matematik", "Fen", "Sosyal", "Fizik", "Biyoloji"];
export const statusFilters = ["Tümü", "Zayıf", "Orta", "İyi"] as const;
export const getNextStatus = (status: TopicStatus): TopicStatus => status === "Zayıf" ? "Orta" : status === "Orta" ? "İyi" : "Zayıf";
export const formatExamDate = (date: string) => new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" }).format(new Date(`${date}T12:00:00`));
export const formatMinutes = (minutes: number) => `${Math.floor(minutes / 60)}s ${minutes % 60}dk`;
export const getStatusFromProgress = (progress: number): TopicStatus => deriveTopicStatus(progress, MIN_RELIABLE_QUESTION_COUNT).status;
export const getDisplayName = (name?: string | null) => name?.split(" ")[0] || "Ece";
export const getInitials = (name?: string | null) => (name || "Ece Deniz").split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();
export const getColorForSubject = (subject: string) => ({ Türkçe: "#f07d69", Matematik: "#3b5ccc", Fen: "#55a98b", Sosyal: "#d49a33", Fizik: "#8b7bd8", Biyoloji: "#55a98b" }[subject] || "#3b5ccc");
export const getStoredValue = <T,>(key: string, fallback: T): T => { if (typeof window === "undefined") return fallback; try { const value = window.localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; } };
export const storeValue = <T,>(key: string, value: T) => { if (typeof window !== "undefined") window.localStorage.setItem(key, JSON.stringify(value)); };
export const localStorageKeys = { exams: "pusula-yks-exams", topics: "pusula-yks-topics", studyHistory: "pusula-yks-study-history", bookInventory: "pusula-yks-book-inventory", bookLogs: "pusula-yks-book-logs", sourceSwitches: "pusula-yks-source-switches", customBooks: "pusula-yks-custom-books", calendarSessions: "pusula-yks-calendar-sessions", onboardingDraft: "pusula-yks-onboarding-draft" } as const;
const localAccountCacheMarkerKey = "pusula-yks-active-account";
const perAccountCacheKeys = [localStorageKeys.exams, localStorageKeys.topics, localStorageKeys.studyHistory, localStorageKeys.bookInventory, localStorageKeys.bookLogs, localStorageKeys.sourceSwitches, localStorageKeys.customBooks, localStorageKeys.calendarSessions, localStorageKeys.onboardingDraft];
/**
 * Aynı tarayıcıda art arda farklı hesaplarla giriş yapılırsa (ör. test için
 * yeni bir hesap oluşturmak), localStorage'daki kitap rafı/konu/deneme/
 * takvim verisi önceki hesaptan kalmış olabilir — ve "misafir verisini
 * hesaba taşı" efektleri bunu yanlışlıkla yeni hesaba yükler. Bu, hesap
 * kimliğini bir işaretçide tutar; işaretçi değişmişse (misafir->hesap ilk
 * girişi HARİÇ, çünkü o taşıma kasıtlı) önceki hesaba ait yerel önbelleği
 * temizler. `AppGate` bunu `Home`/`OnboardingFlow` hiç mount olmadan önce
 * çağırır ki state initializer'ları temiz localStorage okusun.
 */
export function ensureLocalCacheMatchesAccount(accountId: number | null): void {
  if (typeof window === "undefined") return;
  const marker = accountId === null ? "guest" : String(accountId);
  try {
    const stored = window.localStorage.getItem(localAccountCacheMarkerKey);
    const isGuestToAccount = stored === "guest" && marker !== "guest";
    const isFirstEverVisit = stored === null;
    if (stored !== marker && !isGuestToAccount && !isFirstEverVisit) {
      for (const key of perAccountCacheKeys) window.localStorage.removeItem(key);
    }
    window.localStorage.setItem(localAccountCacheMarkerKey, marker);
  } catch {}
}
/** Anket bitince bir sonraki `Home` mount'unda Kaynaklar sekmesini açmak için tek seferlik işaret (bkz. App.tsx / Home.tsx). */
export const postOnboardingNudgeKey = "pusula-yks-post-onboarding-nudge";
export const appData = { applicationName: "Pusula YKS", tagline: "Sınava değil, hedefine çalış." };
export const sectionDescriptions = {
  overview: "Bugünün planı, son performansın ve bir sonraki küçük adımın.",
  topics: "ÖSYM kapsamındaki konu haritanı performansına göre üç seviyede izle.",
  exams: "Deneme netlerini kaydet, ders sürelerini ve konu trendini birlikte gör.",
  resources: "Kendi durumuna göre seçilmiş, neden önerildiği açıklanan kaynaklar.",
  catalog: "Yayıncı bağımsız kaynak kataloğu; zorluk seviyesi ve performansına göre filtrele.",
  plan: "Zayıf konularını ve deneme trendini analiz eden kişisel haftalık plan.",
  calendar: "Günlük oturumlarını tamamla, haftalık ritmini ve konu gelişimini izle.",
  premium: "Premium abonelik, deneme süresi ve fatura yönetimi.",
  admin: "Onay bekleyen kayıtlar ve abonelik yönetimi (yalnızca yöneticiler).",
};
export type DashboardSection = keyof typeof sectionDescriptions;
export const appNavSections = [
  { key: "overview" as const, label: "Genel Bakış" }, { key: "topics" as const, label: "Konu Haritası" },
  { key: "exams" as const, label: "Denemeler" }, { key: "resources" as const, label: "Kaynaklar" },
  { key: "catalog" as const, label: "Kaynak Kataloğu" },
  { key: "plan" as const, label: "AI Planım" }, { key: "calendar" as const, label: "Takvim" },
  { key: "premium" as const, label: "Premium" },
];
// "admin" bilerek `appNavSections`'ta değil — yalnızca role==="admin" olan
// kullanıcılarda Sidebar tarafından ayrıca eklenir (bkz. Home.tsx Sidebar).
export const adminNavSection = { key: "admin" as const, label: "Yönetim" };
export const studyTip = "Önce zayıf konudan 25 dakika öğrenme, ardından 15 dakika soru çözme ve 5 dakika hata notu.";
export const demoNotice = "Demo verileriyle başladı — kendi denemelerini ekledikçe koçun kişiselleşir.";
export const currentWeekLabel = "16–22 Eylül";
export const dateInputToday = new Date().toISOString().slice(0, 10);
export const fieldLabels = { turkce: "Türkçe neti", matematik: "Matematik neti", fen: "Fen neti", sosyal: "Sosyal neti" };
export const timeFieldLabels = { turkceTime: "Türkçe dk", matematikTime: "Matematik dk", fenTime: "Fen dk", sosyalTime: "Sosyal dk" };
export const netDeltaLabel = (delta: number) => delta > 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2);
export const sourceCopy = "Veri kaynağı: ÖSYM sınav kapsamı ve MEB öğretim programları referans alınarak hazırlanan başlangıç konu haritası.";
export const subjectColors: Record<string, string> = { Türkçe: "#f07d69", Matematik: "#3b5ccc", Fen: "#55a98b", Sosyal: "#d49a33", Fizik: "#8b7bd8", Biyoloji: "#55a98b" };
export const initialTopics = topicSeeds;
export const initialResources = resourceSeeds;
export const initialWeeklyBars = weeklyBars;
export const initialPlan = dailyPlan;
export const defaultDashboardUser = { name: "Ece", initials: "ED", target: "Sayısal · 50.000 hedefi" };
export const productPromise = "Netlerini değil, sonraki adımını yönet.";
export const footerDisclaimer = "Pusula YKS bir çalışma takip aracıdır; resmi puan veya sıralama tahmini sunmaz.";
export const motivationTitle = "Ritmini koru";
export const motivationBody = "Her gün kusursuz olmak zorunda değil. Bugünün tek bir iyi oturumu bile yarının stresini azaltır.";
export const dataQualityNote = "Konu durumları başlangıç örnekleridir; deneme sonucu girdikçe otomatik olarak güncellenir.";
export const chartLabels = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
export const pageTitle = "Genel Bakış";
export const pageSubtitle = "Bugünün ritmi, yarının neti.";
export const brandMark = "P";
export const appMeta = { title: "Pusula YKS", description: "YKS çalışma sürecini görünür kılan kişisel koçluk paneli." };
export const progressGoalPercent = Math.round((currentNet / targetNet) * 100);
export const weeklyGoalPercent = Math.round((weeklyStudyMinutes / weeklyGoalMinutes) * 100);
export const questionProgress = 1284;
export const questionGoal = 1500;
export const currentGoalText = `${currentNet} netten ${targetNet} nete`;
export const initialDashboardSection: DashboardSection = "overview";
export const searchPlaceholder = "Konu ara...";
export const emptySearchCopy = "Bu filtrelerle eşleşen bir konu yok.";
export const planProgress = 33;
export const studySessionMinutes = 25;
export const toastCopy = { topic: "Konu durumu güncellendi.", exam: "Deneme eklendi. Konu haritanı güncelledik.", start: "Çalışma oturumu başladı. 25 dakika sonra kısa bir nefes molası ver.", resource: "Kaynak listene kaydedildi." };
export const sourceLinks = scopeSources;
export const statusLegend = [
  { label: "Zayıf", copy: "Öncelikli tekrar", color: "#d95d4d" }, { label: "Orta", copy: "Pekiştir", color: "#bd7c18" }, { label: "İyi", copy: "Koru", color: "#2e8666" },
];
export const getStatusTone = (status: TopicStatus) => status === "Zayıf" ? "status-weak" : status === "Orta" ? "status-medium" : "status-good";
export const getTopicAccent = (accent: Topic["accent"]) => ({ coral: "#f07d69", blue: "#3b5ccc", mint: "#55a98b", yellow: "#d49a33", lilac: "#8b7bd8" }[accent]);
export const targetDateLabel = "19 Haziran 2027";
export const dashboardMetrics = [
  { label: "Konu kapsama", value: "68%", change: "+8%", caption: "geçen haftaya göre", tone: "blue" },
  { label: "Son deneme", value: "68.25", change: "+4.5", caption: "net yükselişi", tone: "coral" },
  { label: "Çalışma serisi", value: "12", change: "gün", caption: "ritmini koru", tone: "mint" },
];
export const recentActivity = [
  { text: "TYT Matematik · Problemler", meta: "25 soru çözüldü", time: "bugün", tone: "blue" },
  { text: "Konu durumu güncellendi", meta: "Paragrafta anlam · Zayıf", time: "dün", tone: "coral" },
  { text: "Deneme eklendi", meta: "Türkiye Geneli TYT · 03", time: "14 Eyl", tone: "mint" },
];
export const getGreeting = (hour = new Date().getHours()) => hour < 12 ? "Günaydın" : hour < 18 ? "İyi çalışmalar" : "İyi akşamlar";
export const todayLabel = new Intl.DateTimeFormat("tr-TR", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
export const footerLinks = [{ label: "ÖSYM", url: "https://www.osym.gov.tr" }, { label: "MEB müfredat", url: "https://mufredat.meb.gov.tr" }];
export const appVersion = "0.1.0";
export const demoMode = true;
export const allSubjects = subjectFilters;
export const allStatuses = statusFilters;
export const sourceAttribution = "ÖSYM · MEB";
export const currentDataYear = 2026;
export const ready = true;
