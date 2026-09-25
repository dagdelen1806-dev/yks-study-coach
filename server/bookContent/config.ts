// Kitap içeriği (içindekiler OCR'ı → müfredat eşleştirme → zayıf konu önerisi)
// için ayarlanabilir değerler. Sabitler kod içine gömülmez; hepsi buradan
// okunur. Gizli anahtar içermez (OCR, mevcut LLM altyapısının anahtarlarını
// ortam değişkenlerinden kullanır — bkz. server/_core/llm.ts).

export const bookContentConfig = {
  mapping: {
    /** Bu güvenin üstü: eşleşme otomatik önerilir (öğrenci yine görür, değiştirebilir). */
    autoSuggestMin: 0.9,
    /** Bu aralık: öğrencinin açıkça onaylaması istenir. Altı: manuel eşleştirme gerekli. */
    confirmMin: 0.7,
    /** Eşleşme adımlarının verdiği güven (tam eşleşme > alias > kapsama > benzerlik). */
    scores: { exactTopic: 1, exactAlias: 0.95, containsTopic: 0.88, containsAlias: 0.85, fuzzyMax: 0.8 },
    /** Kelime kökü yaklaşımı: Türkçe ekleri tolere etmek için kelimenin ilk N harfi karşılaştırılır. */
    stemLength: 5,
    maxAlternatives: 3,
  },
  ocr: {
    /** Tek istekte gönderilebilecek en büyük görsel (Vercel istek gövdesi sınırı ~4.5 MB). */
    maxImageBytes: 3.5 * 1024 * 1024,
    /** Bir kitap için en fazla içindekiler sayfası. */
    maxTocPages: 8,
  },
  allocation: {
    /** Zayıflık (0-1) → önerilen çalışma süresi (dk). Aralık alt sınırı dahil; ilk eşleşen kullanılır. */
    weaknessMinutes: [
      { min: 0.85, minutes: 60 },
      { min: 0.7, minutes: 45 },
      { min: 0.5, minutes: 30 },
      { min: 0.3, minutes: 20 },
    ],
    /** Bir kitap testinin ortalama çözüm süresi (dk) — öneride kaç test verileceğini belirler. */
    minutesPerTest: 15,
    /** Bir günde kitap görevlerine ayrılabilecek en fazla süre (dk). */
    maxDailyBookMinutes: 90,
    /** Öğrencinin tercihi yoksa varsayılan: kitap görevleri otomatik planlanmaz, yalnızca önerilir. */
    autoScheduleDefault: false,
  },
} as const;

export type BookContentConfig = typeof bookContentConfig;
