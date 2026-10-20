// Öğrenci yorumları: istemci formu ve sunucu doğrulaması aynı sınırları kullanır.
export const TESTIMONIAL_LIMITS = { displayName: 60, detail: 80, bodyMin: 20, body: 600 } as const;
export const TESTIMONIAL_STATUS_LABELS = { pending: "Onay bekliyor", approved: "Yayında", rejected: "Yayınlanmadı" } as const;
export type TestimonialStatus = keyof typeof TESTIMONIAL_STATUS_LABELS;
export type PublicTestimonial = { id: number | string; displayName: string; detail: string | null; rating: number; body: string };

/** "Ece Yılmaz" → "Ece Y." — tanıtım sayfasında soyadın tamamı görünmesin diye öneri olarak doldurulur. */
export function suggestedDisplayName(fullName: string | null | undefined): string {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(" ")} ${parts[parts.length - 1][0].toLocaleUpperCase("tr")}.`;
}

/**
 * Tanıtım sayfasında, onaylanmış gerçek yorum yokken gösterilen ÖRNEK yorumlar. Sayfa bunları
 * "örnek" diye açıkça etiketler; ilk gerçek yorum onaylanınca hiçbiri gösterilmez.
 */
export const SAMPLE_TESTIMONIALS: PublicTestimonial[] = [
  { id: "ornek-1", displayName: "Örnek öğrenci", detail: "12. sınıf · Sayısal", rating: 5, body: "Denemelerimi girdikten sonra hangi konuda net kaybettiğimi ilk kez bu kadar net gördüm; haftalık planım da tam o konulara odaklanıyor." },
  { id: "ornek-2", displayName: "Örnek öğrenci", detail: "Mezun · Eşit ağırlık", rating: 5, body: "Okul saatlerimi girince plan boş zamanlarıma yerleşti. Odak modundaki zamanlayıcı ve arka plan sesiyle günlük hedefimi tutturmak kolaylaştı." },
  { id: "ornek-3", displayName: "Örnek öğrenci", detail: "11. sınıf · Sözel", rating: 4, body: "Çözemediğim soruları fotoğrafla defterime ekliyorum, tekrar listem kendiliğinden oluşuyor. Konu haritası neyi bitirdiğimi gösterdiği için motivasyonum arttı." },
];
