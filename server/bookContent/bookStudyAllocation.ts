import { TOPIC_STATUS_THRESHOLDS } from "../../shared/topicStatus";
import { bookContentConfig } from "./config";

// Zayıf konu × kitap içeriği → kitap bazlı çalışma önerisi. Zayıflığı KENDİSİ
// HESAPLAMAZ: mevcut sistemin konu durumunu (topic_progress → "Zayıf" +
// doğruluk yüzdesi, bkz. shared/topicStatus.ts) girdi olarak alır ve yalnızca
// süreye/test sayısına çevirir. Plan motorunun yerine geçmez; ürettiği şey
// öğrencinin onayına sunulan bir ÖNERİdir.

export type WeakTopicInput = { topicId: number; topic: string; subject: string; exam: "TYT" | "AYT"; accuracy: number };

export type ContentRow = {
  id: number;
  bookId: string;
  sortOrder: number;
  unitNumber: number | null;
  unitTitle: string;
  contentType: "topic_test" | "osym_type" | "review" | "simulation" | "topic";
  label: string;
  testNumber: number | null;
  pageStart: number | null;
  pageEnd: number | null;
  topicId: number | null;
  mappingConfidence: number;
};

export type PageRange = { pageStart: number; pageEnd: number };

export type BookRecommendation = {
  /** practice: zayıf konu, yeni konu testleri · review: "Orta" konu, önce ÖSYM tipi/karma testlerle tekrar. */
  purpose: "practice" | "review";
  topicId: number;
  topic: string;
  subject: string;
  exam: "TYT" | "AYT";
  weakness: number;
  minutes: number;
  bookId: string;
  unitNumber: number | null;
  unitTitle: string;
  contentIds: number[];
  labels: string[];
  testRange: string | null;
  pageStart: number | null;
  pageEnd: number | null;
  match: "HIGH" | "MEDIUM";
  remainingTests: number;
};

/** Doğruluk yüzdesinden (0-100) zayıflık skoru (0-1). */
export const weaknessFromAccuracy = (accuracy: number) => Math.round((1 - Math.max(0, Math.min(100, accuracy)) / 100) * 100) / 100;

/** Zayıflık → önerilen süre (dk); düşük öncelik aralığında null. */
export function minutesForWeakness(weakness: number, bands = bookContentConfig.allocation.weaknessMinutes): number | null {
  const band = [...bands].sort((a, b) => b.min - a.min).find((item) => weakness >= item.min);
  return band ? band.minutes : null;
}

const overlaps = (row: ContentRow, ranges: PageRange[]) =>
  row.pageStart !== null && ranges.some((range) => row.pageStart! >= range.pageStart && row.pageStart! <= range.pageEnd);

const PRACTICE_TYPES = new Set<ContentRow["contentType"]>(["topic_test", "topic", "osym_type"]);

/**
 * Her zayıf konu için, o konuya eşlenmiş içeriği olan her kitaptan bir öneri:
 * henüz çözülmemiş (kitap çözüm kaydı sayfalarıyla örtüşmeyen) ve zaten
 * planlanmamış testlerden, süreye sığan kadarını — aynı ünite içinde, kitap
 * sırasıyla — seçer. Zayıflığı yüksek olan önce gelir.
 */
export function buildBookRecommendations(input: {
  weakTopics: WeakTopicInput[];
  contents: ContentRow[];
  donePages: Record<string, PageRange[]>;
  scheduledPages: Record<string, PageRange[]>;
}): BookRecommendation[] {
  const { minutesPerTest, weaknessMinutes } = bookContentConfig.allocation;
  const recommendations: BookRecommendation[] = [];

  for (const weak of input.weakTopics) {
    const weakness = weaknessFromAccuracy(weak.accuracy);
    const minutes = minutesForWeakness(weakness, weaknessMinutes);
    if (minutes === null) continue;

    const byBook = new Map<string, ContentRow[]>();
    for (const row of input.contents) {
      if (row.topicId !== weak.topicId || !PRACTICE_TYPES.has(row.contentType)) continue;
      byBook.set(row.bookId, [...(byBook.get(row.bookId) ?? []), row]);
    }

    const purpose = weak.accuracy < TOPIC_STATUS_THRESHOLDS.weak ? "practice" : "review";
    for (const [bookId, rows] of Array.from(byBook)) {
      const skip = [...(input.donePages[bookId] ?? []), ...(input.scheduledPages[bookId] ?? [])];
      const open = rows.sort((a, b) => a.sortOrder - b.sortOrder).filter((row) => !overlaps(row, skip));
      if (open.length === 0) continue;
      // Tekrarda önce sınav tipi (ÖSYM tipi / eğitim kontrol) testler: konuyu karışık, sınav formatında yoklar.
      if (purpose === "review") open.sort((a, b) => Number(b.contentType === "osym_type") - Number(a.contentType === "osym_type") || a.sortOrder - b.sortOrder);
      const first = open[0];
      const count = Math.max(1, Math.floor(minutes / minutesPerTest));
      const picked = open.filter((row) => row.unitNumber === first.unitNumber && row.unitTitle === first.unitTitle).slice(0, count);
      const numbers = picked.map((row) => row.testNumber).filter((value): value is number => value !== null);
      const allTopicTests = picked.every((row) => row.contentType === "topic_test");
      recommendations.push({
        purpose,
        topicId: weak.topicId,
        topic: weak.topic,
        subject: weak.subject,
        exam: weak.exam,
        weakness,
        minutes,
        bookId,
        unitNumber: first.unitNumber,
        unitTitle: first.unitTitle,
        contentIds: picked.map((row) => row.id),
        labels: picked.map((row) => row.label),
        testRange: allTopicTests && numbers.length ? (numbers.length === 1 ? String(numbers[0]) : `${Math.min(...numbers)}-${Math.max(...numbers)}`) : null,
        pageStart: picked[0].pageStart,
        pageEnd: picked[picked.length - 1].pageEnd ?? picked[picked.length - 1].pageStart,
        match: Math.min(...picked.map((row) => row.mappingConfidence)) >= bookContentConfig.mapping.autoSuggestMin ? "HIGH" : "MEDIUM",
        remainingTests: open.length,
      });
    }
  }

  return recommendations.sort((a, b) => b.weakness - a.weakness || a.bookId.localeCompare(b.bookId));
}

export type BookLog = { pageStart: number | null; pageEnd: number | null; questions: number; correct: number };

export type BookCompletion = {
  /** 0-100; hesaplanamıyorsa (içerik de sayfa sayısı da yok) null. */
  percent: number | null;
  basis: "contents" | "pages" | "none";
  done: number;
  total: number;
  /** Kitaptaki tüm çözümlerin doğruluğu (%); hiç soru yoksa null. */
  accuracy: number | null;
  questions: number;
  units: Array<{ unitNumber: number | null; unitTitle: string; done: number; total: number }>;
};

/**
 * Kitabın tamamlanma oranı. İçindekiler kayıtlıysa: içerik satırlarından
 * (test/ÖSYM tipi/sarmal/simülasyon) başlangıç sayfası bir çözüm kaydının
 * sayfa aralığına düşenlerin oranı. Değilse ve sayfa sayısı biliniyorsa:
 * çözüm kayıtlarının kapsadığı farklı sayfaların oranı. Kitap görevleri
 * tamamlanınca çözüm kaydı düştüğü için oran kendiliğinden ilerler.
 */
export function computeBookCompletion(input: { contents: Pick<ContentRow, "unitNumber" | "unitTitle" | "pageStart">[]; logs: BookLog[]; pageCount?: number | null }): BookCompletion {
  const ranges: PageRange[] = input.logs.filter((log) => log.pageStart !== null).map((log) => ({ pageStart: log.pageStart!, pageEnd: Math.max(log.pageStart!, log.pageEnd ?? log.pageStart!) }));
  const questions = input.logs.reduce((sum, log) => sum + log.questions, 0);
  const correct = input.logs.reduce((sum, log) => sum + log.correct, 0);
  const accuracy = questions > 0 ? Math.round((correct / questions) * 100) : null;
  const isDone = (row: { pageStart: number | null }) => row.pageStart !== null && ranges.some((range) => row.pageStart! >= range.pageStart && row.pageStart! <= range.pageEnd);

  if (input.contents.length > 0) {
    const units: BookCompletion["units"] = [];
    for (const row of input.contents) {
      let unit = units[units.length - 1];
      if (!unit || unit.unitNumber !== row.unitNumber || unit.unitTitle !== row.unitTitle) {
        unit = { unitNumber: row.unitNumber, unitTitle: row.unitTitle, done: 0, total: 0 };
        units.push(unit);
      }
      unit.total += 1;
      if (isDone(row)) unit.done += 1;
    }
    const total = input.contents.length;
    const done = units.reduce((sum, unit) => sum + unit.done, 0);
    return { percent: Math.round((done / total) * 100), basis: "contents", done, total, accuracy, questions, units };
  }

  if (input.pageCount && input.pageCount > 0) {
    const covered = new Set<number>();
    for (const range of ranges) for (let page = range.pageStart; page <= Math.min(range.pageEnd, input.pageCount); page++) covered.add(page);
    return { percent: Math.min(100, Math.round((covered.size / input.pageCount) * 100)), basis: "pages", done: covered.size, total: input.pageCount, accuracy, questions, units: [] };
  }

  return { percent: null, basis: "none", done: 0, total: 0, accuracy, questions, units: [] };
}

export type PlannedLoad = { date: string; minutes: number; isBook: boolean };

/**
 * Görevin konacağı günü seçer: bugünden başlayarak, o günün mevcut planlı
 * süresi + yeni görev günlük kapasiteyi ve kitap görevleri günlük kitap
 * sınırını aşmayan ilk gün. Uygun gün yoksa null (plan ezilmez).
 */
export function pickStudyDay(input: { today: string; minutes: number; load: PlannedLoad[]; dailyCapacity: number; horizonDays?: number }): string | null {
  const { maxDailyBookMinutes } = bookContentConfig.allocation;
  const start = new Date(`${input.today}T00:00:00Z`);
  for (let offset = 0; offset < (input.horizonDays ?? 7); offset++) {
    const date = new Date(start.getTime() + offset * 86_400_000).toISOString().slice(0, 10);
    const dayLoad = input.load.filter((item) => item.date === date);
    const total = dayLoad.reduce((sum, item) => sum + item.minutes, 0);
    const bookTotal = dayLoad.filter((item) => item.isBook).reduce((sum, item) => sum + item.minutes, 0);
    if (total + input.minutes <= input.dailyCapacity && bookTotal + input.minutes <= maxDailyBookMinutes) return date;
  }
  return null;
}
