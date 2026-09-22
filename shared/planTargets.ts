export type BookTopicMappingLike = {
  bookId: string;
  topic: string;
  pageStart?: number | null;
  pageEnd?: number | null;
  testStart?: number | null;
  testEnd?: number | null;
};

export type ResolvedBookTarget = {
  targetPages: string | null;
  targetTests: string | null;
};

const normalize = (value: string) => value.trim().toLocaleLowerCase("tr");

/**
 * Bir kitap-konu eşleştirmesi veritabanında yoksa sayfa/test aralığı UYDURULMAZ; null döner.
 * Kaynak: kitabın toplam sayfa sayısından tahmini aralık türetmek spec'e aykırıdır.
 */
export function resolveBookTarget(
  mappings: BookTopicMappingLike[],
  bookId: string,
  topic: string
): ResolvedBookTarget {
  const mapping = mappings.find((item) => item.bookId === bookId && normalize(item.topic) === normalize(topic));
  const targetPages = mapping?.pageStart != null && mapping?.pageEnd != null ? `${mapping.pageStart}–${mapping.pageEnd}` : null;
  const targetTests = mapping?.testStart != null && mapping?.testEnd != null ? `${mapping.testStart}–${mapping.testEnd}` : null;
  return { targetPages, targetTests };
}
