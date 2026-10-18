// Okuma kitapları (gece okuması alışkanlığı). Saf hesaplar: sunucu ve arayüz aynı kuralı kullanır.

export type ReadingBook = {
  id: number;
  title: string;
  author: string | null;
  totalPages: number | null;
  pagesRead: number;
  status: "reading" | "finished";
  finishedAt: Date | string | null;
};

export const MAX_READING_BOOKS = 50;

/**
 * Bir okuma kaydının kitaba etkisi: okunan sayfa eklenir, toplam sayfa biliniyorsa onu aşamaz;
 * toplam sayfaya ulaşınca kitap "bitti" olur. Sayfa sayısı bilinmiyorsa kitap kendiliğinden bitmez.
 */
export function applyReadingProgress(book: Pick<ReadingBook, "totalPages" | "pagesRead" | "status">, pages: number): { pagesRead: number; status: "reading" | "finished"; justFinished: boolean } {
  const added = Math.max(0, Math.round(pages));
  const raw = book.pagesRead + added;
  const pagesRead = book.totalPages ? Math.min(book.totalPages, raw) : raw;
  const finished = book.status === "finished" || (book.totalPages !== null && book.totalPages > 0 && pagesRead >= book.totalPages);
  return { pagesRead, status: finished ? "finished" : "reading", justFinished: finished && book.status !== "finished" };
}

/** "120 / 320 sayfa · %38" ya da sayfa sayısı bilinmiyorsa "120 sayfa okundu". */
export function readingProgressLabel(book: Pick<ReadingBook, "totalPages" | "pagesRead">): string {
  if (!book.totalPages) return `${book.pagesRead} sayfa okundu`;
  return `${book.pagesRead} / ${book.totalPages} sayfa · %${Math.round((book.pagesRead / book.totalPages) * 100)}`;
}
