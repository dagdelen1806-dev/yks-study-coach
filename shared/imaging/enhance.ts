import { createGray, percentileOf, type GrayImage } from "./image";

/**
 * Aydınlatma / gölge / kontrast / ikili hâle getirme / gürültü / keskinlik.
 * Her fonksiyon girdiyi değiştirmez, yeni bir görüntü döndürür (orijinal korunur).
 */

export type BackgroundMap = { block: number; gw: number; gh: number; grid: Float32Array; at(x: number, y: number): number };

/**
 * Kâğıdın yerel aydınlığı (arka plan). Blok başına %95'lik parlaklık alınır —
 * yazı koyu olduğu için bloğun en parlak kısmı kâğıttır; tek bir yansıma
 * lekesinin bloğu yönetmemesi için maksimum yerine %95. 3x3 yumuşatılıp çift
 * doğrusal olarak her piksele yayılır.
 */
export function estimateBackground(image: GrayImage): BackgroundMap {
  const { width, height, data } = image;
  const block = Math.max(16, Math.round(Math.max(width, height) / 60));
  const gw = Math.ceil(width / block), gh = Math.ceil(height / block);
  const raw = new Float32Array(gw * gh);
  const values: number[] = [];
  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      values.length = 0;
      for (let y = gy * block; y < Math.min(height, (gy + 1) * block); y += 2) for (let x = gx * block; x < Math.min(width, (gx + 1) * block); x += 2) values.push(data[y * width + x]);
      values.sort((a, b) => a - b);
      raw[gy * gw + gx] = values.length ? values[Math.floor(values.length * 0.95)] : 255;
    }
  }
  const grid = new Float32Array(gw * gh);
  for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
    let sum = 0, count = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const x = gx + dx, y = gy + dy;
      if (x >= 0 && y >= 0 && x < gw && y < gh) { sum += raw[y * gw + x]; count++; }
    }
    grid[gy * gw + gx] = sum / count;
  }
  const at = (x: number, y: number) => {
    const fx = Math.min(gw - 1, Math.max(0, x / block - 0.5)), fy = Math.min(gh - 1, Math.max(0, y / block - 0.5));
    const x0 = Math.floor(fx), y0 = Math.floor(fy), x1 = Math.min(gw - 1, x0 + 1), y1 = Math.min(gh - 1, y0 + 1);
    const tx = fx - x0, ty = fy - y0;
    const top = grid[y0 * gw + x0] * (1 - tx) + grid[y0 * gw + x1] * tx;
    const bottom = grid[y1 * gw + x0] * (1 - tx) + grid[y1 * gw + x1] * tx;
    return top * (1 - ty) + bottom * ty;
  };
  return { block, gw, gh, grid, at };
}

/** ShadowRemover: piksel / yerel kâğıt aydınlığı → gölge, lamba ışığı, sararma düzleşir (kâğıt ≈ 255). */
export function flattenIllumination(image: GrayImage, background: BackgroundMap = estimateBackground(image)): GrayImage {
  const out = createGray(image.width, image.height);
  for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
    const index = y * image.width + x;
    out.data[index] = Math.min(255, (image.data[index] / Math.max(24, background.at(x, y))) * 255);
  }
  return out;
}

/**
 * ContrastEnhancer: en koyu `lowPct` siyah, kâğıt beyaz. `knee` altında kalan
 * soluk tonlar (arka sayfa izi, kâğıt dokusu) beyaza itilir; `gamma` ince
 * yazıyı koyulaştırır. Aşırıya kaçmasın diye (ç→c, ğ→g gibi nokta/çengel
 * kayıpları) değerler ölçülü tutulur ve beyaza itme yalnızca açık tonlara uygulanır.
 */
export function stretchContrast(image: GrayImage, options: { lowPct?: number; highPct?: number; knee?: number; gamma?: number } = {}): GrayImage {
  const low = percentileOf(image.data, options.lowPct ?? 0.01);
  const high = Math.max(low + 30, percentileOf(image.data, options.highPct ?? 0.9));
  const knee = options.knee ?? 0.8;
  const gamma = options.gamma ?? 1.6;
  const out = createGray(image.width, image.height);
  for (let index = 0; index < image.data.length; index++) {
    const normalized = Math.min(1, Math.max(0, (image.data[index] - low) / (high - low) / knee));
    out.data[index] = 255 * normalized ** gamma;
  }
  return out;
}

/** Otsu eşiği (histogramın sınıflar arası varyansını en büyük yapan değer). */
export function otsuThreshold(image: GrayImage): number {
  const histogram = new Float64Array(256);
  for (let index = 0; index < image.data.length; index++) histogram[Math.max(0, Math.min(255, Math.round(image.data[index])))]++;
  const total = image.data.length;
  let sumAll = 0;
  for (let value = 0; value < 256; value++) sumAll += value * histogram[value];
  let sumBackground = 0, weightBackground = 0, best = 0, threshold = 127;
  for (let value = 0; value < 256; value++) {
    weightBackground += histogram[value];
    if (!weightBackground) continue;
    const weightForeground = total - weightBackground;
    if (!weightForeground) break;
    sumBackground += value * histogram[value];
    const meanBackground = sumBackground / weightBackground;
    const meanForeground = (sumAll - sumBackground) / weightForeground;
    const between = weightBackground * weightForeground * (meanBackground - meanForeground) ** 2;
    if (between > best) { best = between; threshold = value; }
  }
  return threshold;
}

export function binarizeGlobal(image: GrayImage, threshold: number): GrayImage {
  const out = createGray(image.width, image.height);
  for (let index = 0; index < image.data.length; index++) out.data[index] = image.data[index] > threshold ? 255 : 0;
  return out;
}

/**
 * Sauvola uyarlamalı eşikleme (integral görüntülerle O(n)): her piksel kendi
 * komşuluğunun ortalama ve sapmasına göre eşiklenir → düzensiz ışıkta bile
 * ince yazı ve Türkçe karakter noktaları korunur.
 */
export function binarizeSauvola(image: GrayImage, options: { window?: number; k?: number } = {}): GrayImage {
  const { width, height, data } = image;
  const radius = Math.max(4, Math.floor((options.window ?? Math.max(15, Math.round(Math.min(width, height) / 40))) / 2));
  const k = options.k ?? 0.2;
  const stride = width + 1;
  const sum = new Float64Array(stride * (height + 1));
  const sumSq = new Float64Array(stride * (height + 1));
  for (let y = 0; y < height; y++) {
    let rowSum = 0, rowSq = 0;
    for (let x = 0; x < width; x++) {
      const value = data[y * width + x];
      rowSum += value; rowSq += value * value;
      sum[(y + 1) * stride + x + 1] = sum[y * stride + x + 1] + rowSum;
      sumSq[(y + 1) * stride + x + 1] = sumSq[y * stride + x + 1] + rowSq;
    }
  }
  const out = createGray(width, height);
  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - radius), y1 = Math.min(height, y + radius + 1);
    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - radius), x1 = Math.min(width, x + radius + 1);
      const count = (y1 - y0) * (x1 - x0);
      const s = sum[y1 * stride + x1] - sum[y0 * stride + x1] - sum[y1 * stride + x0] + sum[y0 * stride + x0];
      const sq = sumSq[y1 * stride + x1] - sumSq[y0 * stride + x1] - sumSq[y1 * stride + x0] + sumSq[y0 * stride + x0];
      const mean = s / count;
      const std = Math.sqrt(Math.max(0, sq / count - mean * mean));
      const threshold = mean * (1 + k * (std / 128 - 1));
      out.data[y * width + x] = data[y * width + x] > threshold ? 255 : 0;
    }
  }
  return out;
}

/** Denoiser: 3x3 medyan — kenar koruyan; yalnızca gürültü yüksekse kullanılır (ince nokta/virgül kaybolmasın). */
export function median3(image: GrayImage): GrayImage {
  const { width, height, data } = image;
  const out = createGray(width, height);
  const window = new Float32Array(9);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const sx = Math.min(width - 1, Math.max(0, x + dx)), sy = Math.min(height - 1, Math.max(0, y + dy));
      window[count++] = data[sy * width + sx];
    }
    window.sort();
    out.data[y * width + x] = window[4];
  }
  return out;
}

/** 3x3 kutu bulanıklığı (keskinleştirme ve gürültü ölçümü için). */
export function boxBlur3(image: GrayImage): GrayImage {
  const { width, height, data } = image;
  const out = createGray(width, height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    let sum = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) sum += data[Math.min(height - 1, Math.max(0, y + dy)) * width + Math.min(width - 1, Math.max(0, x + dx))];
    out.data[y * width + x] = sum / 9;
  }
  return out;
}

/** Sharpener: hafif maskesiz keskinleştirme (unsharp). Hale oluşturmasın diye miktar düşük tutulur. */
export function unsharpMask(image: GrayImage, amount = 0.6): GrayImage {
  const blurred = boxBlur3(image);
  const out = createGray(image.width, image.height);
  for (let index = 0; index < image.data.length; index++) out.data[index] = Math.max(0, Math.min(255, image.data[index] + amount * (image.data[index] - blurred.data[index])));
  return out;
}
