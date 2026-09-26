/**
 * OCR ön işleme için en temel görüntü tipleri ve dönüşümler. Saf TypeScript:
 * aynı kod sunucuda (Node, jpeg-js ile çözülmüş piksel) ve tarayıcıda (canvas
 * piksel verisi) çalışır. Gri tonlama 0–255 aralığında Float32 tutulur ki ara
 * adımlarda yuvarlama kaybı olmasın.
 */

export type RgbaImage = { width: number; height: number; data: Uint8ClampedArray | Uint8Array };
export type GrayImage = { width: number; height: number; data: Float32Array };

export const createGray = (width: number, height: number, fill = 0): GrayImage => {
  const data = new Float32Array(width * height);
  if (fill) data.fill(fill);
  return { width, height, data };
};

export function toGray(image: RgbaImage): GrayImage {
  const out = createGray(image.width, image.height);
  const source = image.data;
  for (let index = 0, offset = 0; index < out.data.length; index++, offset += 4) {
    out.data[index] = 0.299 * source[offset] + 0.587 * source[offset + 1] + 0.114 * source[offset + 2];
  }
  return out;
}

export function grayToRgba(image: GrayImage): Uint8ClampedArray {
  const out = new Uint8ClampedArray(image.width * image.height * 4);
  for (let index = 0, offset = 0; index < image.data.length; index++, offset += 4) {
    const value = image.data[index];
    out[offset] = out[offset + 1] = out[offset + 2] = value;
    out[offset + 3] = 255;
  }
  return out;
}

const sample = (image: GrayImage, x: number, y: number, fill: number) => {
  if (x < 0 || y < 0 || x > image.width - 1 || y > image.height - 1) return fill;
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const x1 = Math.min(image.width - 1, x0 + 1), y1 = Math.min(image.height - 1, y0 + 1);
  const tx = x - x0, ty = y - y0;
  const row0 = y0 * image.width, row1 = y1 * image.width;
  const top = image.data[row0 + x0] * (1 - tx) + image.data[row0 + x1] * tx;
  const bottom = image.data[row1 + x0] * (1 - tx) + image.data[row1 + x1] * tx;
  return top * (1 - ty) + bottom * ty;
};
export { sample as sampleBilinear };

/** Küçültmede alan ortalaması (yazı titremesin), büyütmede çift doğrusal. */
export function resizeGray(image: GrayImage, width: number, height: number): GrayImage {
  width = Math.max(1, Math.round(width));
  height = Math.max(1, Math.round(height));
  const out = createGray(width, height);
  const scaleX = image.width / width, scaleY = image.height / height;
  if (scaleX <= 1 && scaleY <= 1) {
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) out.data[y * width + x] = sample(image, (x + 0.5) * scaleX - 0.5, (y + 0.5) * scaleY - 0.5, 255);
    return out;
  }
  for (let y = 0; y < height; y++) {
    const sy0 = Math.floor(y * scaleY), sy1 = Math.max(sy0 + 1, Math.min(image.height, Math.floor((y + 1) * scaleY)));
    for (let x = 0; x < width; x++) {
      const sx0 = Math.floor(x * scaleX), sx1 = Math.max(sx0 + 1, Math.min(image.width, Math.floor((x + 1) * scaleX)));
      let sum = 0;
      for (let sy = sy0; sy < sy1; sy++) for (let sx = sx0; sx < sx1; sx++) sum += image.data[sy * image.width + sx];
      out.data[y * width + x] = sum / ((sy1 - sy0) * (sx1 - sx0));
    }
  }
  return out;
}

/** Uzun kenarı `maxDimension`'ı aşıyorsa oranı koruyarak küçültür. */
export function limitSize(image: GrayImage, maxDimension: number): GrayImage {
  const longest = Math.max(image.width, image.height);
  if (longest <= maxDimension) return image;
  const scale = maxDimension / longest;
  return resizeGray(image, image.width * scale, image.height * scale);
}

/** Saat yönünde 90° katları. */
export function rotateQuarter(image: GrayImage, degrees: 0 | 90 | 180 | 270): GrayImage {
  if (degrees === 0) return image;
  const { width, height, data } = image;
  const swap = degrees !== 180;
  const out = createGray(swap ? height : width, swap ? width : height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const value = data[y * width + x];
      let nx: number, ny: number;
      if (degrees === 90) { nx = height - 1 - y; ny = x; }
      else if (degrees === 180) { nx = width - 1 - x; ny = height - 1 - y; }
      else { nx = y; ny = width - 1 - x; }
      out.data[ny * out.width + nx] = value;
    }
  }
  return out;
}

/** Küçük açılı döndürme (eğim düzeltme); boyut korunur, taşan köşeler beyazla dolar. Pozitif açı = saat yönü. */
export function rotateSmall(image: GrayImage, degrees: number, fill = 255): GrayImage {
  if (Math.abs(degrees) < 1e-3) return image;
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians), sin = Math.sin(radians);
  const cx = (image.width - 1) / 2, cy = (image.height - 1) / 2;
  const out = createGray(image.width, image.height);
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      // Hedef pikselden kaynağa ters dönüşüm.
      const dx = x - cx, dy = y - cy;
      out.data[y * image.width + x] = sample(image, cx + dx * cos + dy * sin, cy - dx * sin + dy * cos, fill);
    }
  }
  return out;
}

export function cropGray(image: GrayImage, left: number, top: number, width: number, height: number): GrayImage {
  left = Math.max(0, Math.round(left));
  top = Math.max(0, Math.round(top));
  width = Math.max(1, Math.min(image.width - left, Math.round(width)));
  height = Math.max(1, Math.min(image.height - top, Math.round(height)));
  const out = createGray(width, height);
  for (let y = 0; y < height; y++) out.data.set(image.data.subarray((top + y) * image.width + left, (top + y) * image.width + left + width), y * width);
  return out;
}

/** Sıralı kopya üzerinden yüzdelik (0–1). Büyük görüntülerde örnekleme yapar. */
export function percentileOf(values: Float32Array | number[], fraction: number, maxSamples = 200_000): number {
  const length = values.length;
  if (!length) return 0;
  const step = Math.max(1, Math.floor(length / maxSamples));
  const picked: number[] = [];
  for (let index = 0; index < length; index += step) picked.push(values[index]);
  picked.sort((a, b) => a - b);
  return picked[Math.min(picked.length - 1, Math.max(0, Math.floor(picked.length * fraction)))];
}

export function meanAndStd(values: Float32Array): { mean: number; std: number } {
  let sum = 0, sumSq = 0;
  for (let index = 0; index < values.length; index++) { sum += values[index]; sumSq += values[index] * values[index]; }
  const mean = sum / Math.max(1, values.length);
  return { mean, std: Math.sqrt(Math.max(0, sumSq / Math.max(1, values.length) - mean * mean)) };
}
