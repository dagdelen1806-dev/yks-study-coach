import type { ExamTrack } from "./exams";

/**
 * Sınav takvimi (YKS, LGS, KPSS, DGS) ve buna bağlı abonelik süresi. Yıllık plan "sınavına kadar" sürer
 * (Ekim 2026 kararı): öğrencinin başlangıç anketinde seçtiği sınavın (student_profiles.examTrack)
 * ve sınav yılının (student_profiles.examYear) son günü sona erer; sınav yılı yoksa ya da o sınav
 * geçmişse o sınavın bir sonraki tarihi esas alınır.
 *
 * ÖSYM (YKS, KPSS, DGS) / MEB (LGS) yeni yılın tarihini açıklayınca listeye eklenmeli. Listede olmayan bir yıl
 * için son bilinen tarihin aynı günü varsayılır (`estimated: true`) — ödeme ekranı bunu belirtir.
 */
export const YKS_EXAMS: ReadonlyArray<{ year: number; firstDay: string; lastDay: string }> = [
  { year: 2026, firstDay: "2026-06-20", lastDay: "2026-06-21" },
  { year: 2027, firstDay: "2027-06-19", lastDay: "2027-06-20" },
];

/** LGS tek gün (sözel + sayısal oturum). 2026: MEB 14 Haziran'dan 13 Haziran'a aldı. 2027 henüz açıklanmadı. */
export const LGS_EXAMS: ReadonlyArray<{ year: number; firstDay: string; lastDay: string }> = [
  { year: 2026, firstDay: "2026-06-13", lastDay: "2026-06-13" },
];

/** KPSS lisans Genel Yetenek–Genel Kültür: iki yılda bir (çift yıllar). 2026: 6 Eylül. */
export const KPSS_EXAMS: ReadonlyArray<{ year: number; firstDay: string; lastDay: string }> = [
  { year: 2026, firstDay: "2026-09-06", lastDay: "2026-09-06" },
];

/** DGS her yıl, temmuzda. 2026: 19 Temmuz. 2027 henüz açıklanmadı. */
export const DGS_EXAMS: ReadonlyArray<{ year: number; firstDay: string; lastDay: string }> = [
  { year: 2026, firstDay: "2026-07-19", lastDay: "2026-07-19" },
];

/** MEB-AGS her yıl (ilki 2025). 2026: 26 Temmuz (ÖSYM kılavuzu). */
export const MEB_AGS_EXAMS: ReadonlyArray<{ year: number; firstDay: string; lastDay: string }> = [
  { year: 2026, firstDay: "2026-07-26", lastDay: "2026-07-26" },
];

/** KPSS A grubu alan bilgisi: lisans KPSS ile aynı döngüde (iki yılda bir). 2026: 12–13 Eylül. */
export const KPSS_A_EXAMS: ReadonlyArray<{ year: number; firstDay: string; lastDay: string }> = [
  { year: 2026, firstDay: "2026-09-12", lastDay: "2026-09-13" },
];

const EXAMS_BY_TRACK: Record<ExamTrack, ReadonlyArray<{ year: number; firstDay: string; lastDay: string }>> = { YKS: YKS_EXAMS, LGS: LGS_EXAMS, KPSS: KPSS_EXAMS, DGS: DGS_EXAMS, MEB_AGS: MEB_AGS_EXAMS, KPSS_A: KPSS_A_EXAMS };
/** Sınav kaç yılda bir yapılır (tahmin yalnızca bu döngüdeki yıllara yapılır). */
const EXAM_CYCLE_YEARS: Record<ExamTrack, number> = { YKS: 1, LGS: 1, KPSS: 2, DGS: 1, MEB_AGS: 1, KPSS_A: 2 };

/** Bu yıl ya da sonrasındaki ilk sınav yılı (iki yılda bir yapılan KPSS'de tek yıl bir sonrakine kayar). */
function cycleYearFrom(year: number, track: ExamTrack): number {
  const cycle = EXAM_CYCLE_YEARS[track];
  const anchor = EXAMS_BY_TRACK[track][0].year;
  const offset = (((year - anchor) % cycle) + cycle) % cycle;
  return offset === 0 ? year : year + (cycle - offset);
}

const DAY_MS = 24 * 60 * 60 * 1000;
// Türkiye sabit UTC+3: sınavın son günü İstanbul saatiyle 23:59:59'da biter.
const endOfIstanbulDay = (isoDate: string) => new Date(`${isoDate}T23:59:59.999+03:00`);

export type YksPeriodEnd = { year: number; endsAt: Date; estimated: boolean };

/**
 * Bir yılın sınav bitişi (takvimde yoksa son bilinen tarihin aynı günü, tahmini). O yıl sınav
 * yapılmıyorsa (KPSS tek yıl) döngüdeki bir sonraki sınav yılı döner.
 */
export function examEndOf(requestedYear: number, track: ExamTrack = "YKS"): YksPeriodEnd {
  const exams = EXAMS_BY_TRACK[track];
  const year = cycleYearFrom(requestedYear, track);
  const known = exams.find((exam) => exam.year === year);
  if (known) return { year, endsAt: endOfIstanbulDay(known.lastDay), estimated: false };
  const last = exams[exams.length - 1];
  return { year, endsAt: endOfIstanbulDay(`${year}${last.lastDay.slice(4)}`), estimated: true };
}
export const yksEndOf = (year: number) => examEndOf(year, "YKS");

/**
 * Yıllık planın biteceği sınav: öğrencinin seçtiği sınav yılı (henüz geçmediyse), yoksa
 * şu andan sonraki ilk sınav.
 */
export function nextExamEnd(now: Date, examYear?: number | null, track: ExamTrack = "YKS"): YksPeriodEnd {
  if (examYear) {
    const chosen = examEndOf(examYear, track);
    if (chosen.endsAt.getTime() > now.getTime()) return chosen;
  }
  let year = Math.min(...EXAMS_BY_TRACK[track].map((exam) => exam.year));
  let end = examEndOf(year, track);
  while (end.endsAt.getTime() <= now.getTime()) { year = end.year + EXAM_CYCLE_YEARS[track]; end = examEndOf(year, track); }
  return end;
}
export const nextYksEnd = (now: Date, examYear?: number | null) => nextExamEnd(now, examYear, "YKS");

/** Bir planın yeni dönem bitişi: aylık 30 gün, yıllık öğrencinin sınavının sonu. */
export function planPeriodEnd(billingPeriod: "none" | "monthly" | "yearly", now: Date, examYear?: number | null, track: ExamTrack = "YKS"): Date {
  return billingPeriod === "yearly" ? nextExamEnd(now, examYear, track).endsAt : new Date(now.getTime() + 30 * DAY_MS);
}

export const YKS_TERM_DISCOUNT = 0.2;

/**
 * Yıllık ("sınavına kadar") planın o günkü fiyatı (Ekim 2026 kararı): öğrencinin sınavına kalan
 * süreyi aylık ödemek kaç ödeme tutuyorsa onun %20 eksiği, sonu "…99" olacak şekilde en yakın
 * değere yuvarlanır. Üst sınır yoktur: sınavı birkaç yıl sonra olan öğrenci o sürenin tamamını
 * öder. Hem ödeme ekranı hem tahsilat bunu kullanır. Tutarlar kuruş. LGS öğrencisi aynı kademeleri
 * öder; yalnız süre LGS tarihine göre hesaplanır.
 */
export function yksTermPrice(input: { monthlyPrice: number; now: Date; examYear?: number | null; track?: ExamTrack }) {
  const yks = nextExamEnd(input.now, input.examYear, input.track ?? "YKS");
  const months = Math.max(1, Math.ceil((yks.endsAt.getTime() - input.now.getTime()) / (30 * DAY_MS)));
  const monthlyTotal = input.monthlyPrice * months;
  const discountedLira = (monthlyTotal * (1 - YKS_TERM_DISCOUNT)) / 100;
  let price = (Math.round((discountedLira + 1) / 100) * 100 - 1) * 100;
  // Yuvarlama indirimi yok etmesin (çok küçük tutarlarda olabilir).
  if (price <= 0 || price >= monthlyTotal) price = Math.floor(monthlyTotal * (1 - YKS_TERM_DISCOUNT));
  return { price, months, monthlyTotal, yks };
}
