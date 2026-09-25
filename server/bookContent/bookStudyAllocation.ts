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

    for (const [bookId, rows] of Array.from(byBook)) {
      const skip = [...(input.donePages[bookId] ?? []), ...(input.scheduledPages[bookId] ?? [])];
      const open = rows.sort((a, b) => a.sortOrder - b.sortOrder).filter((row) => !overlaps(row, skip));
      if (open.length === 0) continue;
      const first = open[0];
      const count = Math.max(1, Math.floor(minutes / minutesPerTest));
      const picked = open.filter((row) => row.unitNumber === first.unitNumber && row.unitTitle === first.unitTitle).slice(0, count);
      const numbers = picked.map((row) => row.testNumber).filter((value): value is number => value !== null);
      const allTopicTests = picked.every((row) => row.contentType === "topic_test");
      recommendations.push({
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
