import { estimateBackground } from "./enhance";
import { percentileOf, toGray, type RgbaImage } from "./image";

/**
 * Telefon tarayıcısı filtresi (defter soruları için): fotoğraftaki gölge, lamba sarısı ve
 * kâğıdın üstüne düşen karartı ("siyah katman") kaldırılır, kâğıt beyaza, yazı koyuya çekilir.
 * İçindekiler OCR'ındaki gri tonlu düzleştirmenin (flattenIllumination) renkli hâli: her piksel
 * yerel kâğıt aydınlığına bölünür — kalem/işaretleyici renkleri korunur.
 *
 * Girdiyi YERİNDE değiştirir (canvas ImageData'sı doğrudan verilir).
 */
export const scanFilterConfig = {
  /** Kâğıt aydınlığı bunun altındaysa (çok karanlık bölge) bölme bu değerle sınırlanır — gürültü patlamasın. */
  minBackground: 40,
  /** Düzleştirmeden sonra parlaklığı bu oranın üstündeki tonlar beyaza itilir (kâğıt dokusu, arka sayfa izi). */
  whitePoint: 0.88,
  /** Yazıyı koyulaştırma (1 = yok). */
  gamma: 1.35,
};

export function applyScanFilter(image: RgbaImage, config = scanFilterConfig): void {
  const { width, height, data } = image;
  const gray = toGray(image);
  const background = estimateBackground(gray);
  // Düzleştirilmiş parlaklığın en koyu %1'i siyah kabul edilir (soluk kurşun kalem bile okunur kalsın diye üst sınırlı).
  const flat = new Float32Array(width * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const index = y * width + x;
    flat[index] = Math.min(255, (gray.data[index] / Math.max(config.minBackground, background.at(x, y))) * 255);
  }
  const black = Math.min(90, percentileOf(flat, 0.01));
  const white = Math.max(black + 40, 255 * config.whitePoint);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const index = y * width + x;
    const gain = 255 / Math.max(config.minBackground, background.at(x, y));
    const offset = index * 4;
    for (let channel = 0; channel < 3; channel++) {
      const value = Math.min(255, data[offset + channel] * gain);
      const normalized = Math.min(1, Math.max(0, (value - black) / (white - black)));
      data[offset + channel] = Math.round(255 * normalized ** config.gamma);
    }
  }
}
