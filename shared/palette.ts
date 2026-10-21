// Pusula renk sistemi — tek kaynak.
//
// Arayüz sınıfları bu değerleri `client/src/index.css` içindeki CSS
// değişkenleri üzerinden kullanır (`text-ink`, `bg-brand-soft`...). Bu dosya,
// değerin JS'te gerektiği yerler içindir: grafik/SVG renkleri, inline
// `style`, canvas. İki tarafı birlikte güncelle.
//
// Fikir: optik form. Basılı form mürekkebi (petrol) yapıyı ve eylemi, kurşun
// kalem (grafit + kalem sarısı) öğrencinin kendi işaretlerini taşır.
export const palette = {
  paper: "#f3f6f5",
  surface: "#ffffff",
  ink: "#18202a",
  ink2: "#3f4753",
  ink3: "#5f6671",
  ink4: "#7b818b",
  ruleStrong: "#c5ccd0",
  rule: "#e3e9e7",
  brand: "#17625f",
  brandStrong: "#0f4a48",
  brandSoft: "#e3f0ee",
  pencil: "#f2b934",
  pencilStrong: "#e0a514",
  pencilInk: "#7a5600",
  pencilSoft: "#fdf3d8",
  danger: "#bf3a2b",
  dangerStrong: "#962c20",
  dangerSoft: "#fae6e2",
  success: "#2b7a4b",
  successSoft: "#e3f1e7",
  warn: "#9a6400",
  warnFill: "#d99a1e",
  warnSoft: "#fbf0d6",
  violet: "#6a4fb0",
  violetSoft: "#efebfa",
} as const;

/** Ders renkleri: durum renkleriyle (kırmızı/yeşil/amber) karışmayacak şekilde seçildi. */
export const subjectPalette: Record<string, string> = {
  Türkçe: "#8a4fb0",
  Matematik: "#2a5db0",
  Fen: "#2e8b6e",
  Sosyal: "#b8741a",
  Fizik: "#b0476e",
  Kimya: "#4a8f9c",
  Biyoloji: "#5e8a2e",
  // LGS dersleri
  "Fen Bilimleri": "#2e8b6e",
  "İnkılap Tarihi": "#b8741a",
  "Din Kültürü": "#8a6a3a",
  İngilizce: "#3a7ab8",
};

/** Sırası önemli olmayan kategori listeleri için (ör. haftalık konu dağılımı). */
export const categoricalPalette = ["#2a5db0", "#8a4fb0", "#2e8b6e", "#b8741a", "#b0476e", "#4a8f9c"] as const;
