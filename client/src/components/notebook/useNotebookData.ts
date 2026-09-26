import { trpc } from "@/lib/trpc";
import { resourceBookCatalog } from "@shared/yksData";
import { useMemo } from "react";

export type MyBook = { id: string; title: string; subject: string };

/**
 * Öğrencinin rafındaki kitaplar (not bağlama için). Kitap kaynakları farklı
 * yerlerde: raf (bookInventory) + öğrencinin eklediği kitaplar + katalog
 * kitapları + statik vitrin kitapları — burada tek listeye indirgenir.
 */
export function useMyBooks(enabled = true): MyBook[] {
  const snapshot = trpc.resources.snapshot.useQuery(undefined, { enabled, retry: false, staleTime: 60_000 });
  const library = trpc.catalog.myLibrary.useQuery(undefined, { enabled, retry: false, staleTime: 60_000 });
  return useMemo(() => {
    const titles = new Map<string, MyBook>();
    for (const book of resourceBookCatalog) titles.set(book.id, { id: book.id, title: book.title, subject: book.subject });
    for (const book of snapshot.data?.customBooks ?? []) titles.set(book.id, { id: book.id, title: book.title, subject: book.subject });
    for (const book of library.data ?? []) titles.set(String(book.bookId), { id: String(book.bookId), title: book.name, subject: book.subject ?? "Genel" });
    const active = new Set((snapshot.data?.inventory ?? []).map((row) => row.bookId));
    return Array.from(titles.values()).filter((book) => active.has(book.id)).sort((a, b) => a.title.localeCompare(b.title, "tr"));
  }, [snapshot.data, library.data]);
}

/** Müfredat konuları (ders → konu seçimi için); kitap eşleştirmesiyle aynı liste. */
export function useCurriculumTopics(enabled = true) {
  const topics = trpc.bookContent.topicOptions.useQuery(undefined, { enabled, retry: false, staleTime: 5 * 60_000 });
  return useMemo(() => {
    const list = topics.data ?? [];
    const subjects = Array.from(new Set(list.map((topic) => topic.subject))).sort((a, b) => a.localeCompare(b, "tr"));
    return { topics: list, subjects };
  }, [topics.data]);
}
