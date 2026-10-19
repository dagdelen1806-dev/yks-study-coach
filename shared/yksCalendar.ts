/**
 * YKS sınav takvimi ve buna bağlı abonelik süresi. Yıllık plan "sınavına kadar" sürer
 * (Ekim 2026 kararı): öğrencinin başlangıç anketinde seçtiği sınav yılının (student_profiles.examYear)
 * YKS'sinin son günü sona erer; sınav yılı yoksa ya da o sınav geçmişse bir sonraki YKS esas alınır.
 *
 * ÖSYM yeni yılın tarihini açıklayınca listeye eklenmeli. Listede olmayan bir yıl için
 * son bilinen tarihin aynı günü varsayılır (`estimated: true`) — ödeme ekranı bunu belirtir.
 */
export const YKS_EXAMS: ReadonlyArray<{ year: number; firstDay: string; lastDay: string }> = [
  { year: 2026, firstDay: "2026-06-20", lastDay: "2026-06-21" },
  { year: 2027, firstDay: "2027-06-19", lastDay: "2027-06-20" },
];

const DAY_MS = 24 * 60 * 60 * 1000;
// Türkiye sabit UTC+3: sınavın son günü İstanbul saatiyle 23:59:59'da biter.
const endOfIstanbulDay = (isoDate: string) => new Date(`${isoDate}T23:59:59.999+03:00`);

export type YksPeriodEnd = { year: number; endsAt: Date; estimated: boolean };

/** Bir yılın YKS bitişi (takvimde yoksa son bilinen tarihin aynı günü, tahmini). */
export function yksEndOf(year: number): YksPeriodEnd {
  const known = YKS_EXAMS.find((exam) => exam.year === year);
  if (known) return { year, endsAt: endOfIstanbulDay(known.lastDay), estimated: false };
  const last = YKS_EXAMS[YKS_EXAMS.length - 1];
  return { year, endsAt: endOfIstanbulDay(`${year}${last.lastDay.slice(4)}`), estimated: true };
}

/**
 * Yıllık planın biteceği sınav: öğrencinin seçtiği sınav yılı (henüz geçmediyse), yoksa
 * şu andan sonraki ilk YKS.
 */
export function nextYksEnd(now: Date, examYear?: number | null): YksPeriodEnd {
  if (examYear) {
    const chosen = yksEndOf(examYear);
    if (chosen.endsAt.getTime() > now.getTime()) return chosen;
  }
  let year = Math.min(...YKS_EXAMS.map((exam) => exam.year));
  let end = yksEndOf(year);
  while (end.endsAt.getTime() <= now.getTime()) end = yksEndOf(++year);
  return end;
}

/** Bir planın yeni dönem bitişi: aylık 30 gün, yıllık öğrencinin sınavının sonu. */
export function planPeriodEnd(billingPeriod: "none" | "monthly" | "yearly", now: Date, examYear?: number | null): Date {
  return billingPeriod === "yearly" ? nextYksEnd(now, examYear).endsAt : new Date(now.getTime() + 30 * DAY_MS);
}

export const YKS_TERM_DISCOUNT = 0.2;

/**
 * Yıllık ("sınavına kadar") planın o günkü fiyatı (Ekim 2026 kararı): öğrencinin sınavına kalan
 * süreyi aylık ödemek kaç ödeme tutuyorsa onun %20 eksiği, sonu "…99" olacak şekilde en yakın
 * değere yuvarlanır. Üst sınır yoktur: sınavı birkaç yıl sonra olan öğrenci o sürenin tamamını
 * öder. Hem ödeme ekranı hem tahsilat bunu kullanır. Tutarlar kuruş.
 */
export function yksTermPrice(input: { monthlyPrice: number; now: Date; examYear?: number | null }) {
  const yks = nextYksEnd(input.now, input.examYear);
  const months = Math.max(1, Math.ceil((yks.endsAt.getTime() - input.now.getTime()) / (30 * DAY_MS)));
  const monthlyTotal = input.monthlyPrice * months;
  const discountedLira = (monthlyTotal * (1 - YKS_TERM_DISCOUNT)) / 100;
  let price = (Math.round((discountedLira + 1) / 100) * 100 - 1) * 100;
  // Yuvarlama indirimi yok etmesin (çok küçük tutarlarda olabilir).
  if (price <= 0 || price >= monthlyTotal) price = Math.floor(monthlyTotal * (1 - YKS_TERM_DISCOUNT));
  return { price, months, monthlyTotal, yks };
}
