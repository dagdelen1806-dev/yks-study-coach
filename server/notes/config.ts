// Akıllı Defter ayarları. Gizli anahtar içermez: ses → metin ve AI/OCR,
// mevcut Forge altyapısının ortam değişkenlerini kullanır (BUILT_IN_FORGE_*).

export const notesConfig = {
  content: {
    /** Tek bir notun JSON içeriğinin en büyük boyutu (çizim noktaları dahil). */
    maxContentBytes: 900 * 1024,
    maxTitleLength: 200,
    maxTagsPerNote: 12,
  },
  attachments: {
    /** İstemci fotoğrafı ~1600 px JPEG'e küçültür; sunucu yine de sınırlar. */
    imageMaxBytes: 900 * 1024,
    /** ~10 dk Opus/WebM ses kaydı. */
    audioMaxBytes: 3 * 1024 * 1024,
    /** Kullanıcı başına toplam ek boyutu (veritabanında tutulduğu için sıkı). */
    perUserQuotaBytes: 60 * 1024 * 1024,
    /** Hiçbir nota bağlanmamış (kaydedilmeden bırakılmış) ek bu süreden sonra silinir. */
    orphanTtlMs: 24 * 60 * 60 * 1000,
    imageMimeTypes: ["image/jpeg", "image/png", "image/webp"] as const,
    audioMimeTypes: ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav"] as const,
  },
  speech: {
    /** "whisper": sunucudaki Forge Whisper servisi. İstemci, sunucu kullanılamazsa tarayıcının kendi dikte özelliğine düşebilir. */
    provider: "whisper" as "whisper" | "none",
    language: "tr",
    prompt: "Türkçe bir YKS öğrencisinin ders notu. Noktalama işaretlerini doğru kullan.",
    maxAudioSeconds: 600,
  },
  ai: {
    /** AI'ya gönderilen not metninin üst sınırı (gizlilik + maliyet: yalnızca gerekenden fazlası gitmesin). */
    maxInputChars: 6000,
  },
  list: {
    pageSize: 30,
    snippetLength: 160,
  },
  review: {
    /** "Tekrar tarihi" hızlı seçenekleri (gün). */
    presetsDays: [0, 3, 7, 14],
  },
  task: {
    defaultMinutes: 30,
  },
} as const;
