// Telefon fotoğrafları 5–10 MB olabilir; Vercel'de bir isteğin gövdesi ~4.5 MB
// ile sınırlı ve OCR için bu çözünürlüğe gerek yok. Fotoğraf tarayıcıda
// küçültülüp JPEG'e çevrilir (sunucu yine de boyut + magic bytes doğrular).

export type CompressedImage = { dataUrl: string; mimeType: "image/jpeg"; bytes: number };

const dataUrlBytes = (dataUrl: string) => Math.floor((dataUrl.length - dataUrl.indexOf(",") - 1) * 0.75);

async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("decode"));
      image.src = url;
    });
  } finally {
    // onload tetiklendiyse görsel belleğe alınmıştır; URL'yi hemen bırakmak güvenli.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

/** Görselin kenarlarından kırpılacak oranlar (0–0.45). */
export type CropInsets = { top: number; right: number; bottom: number; left: number };
export const NO_CROP: CropInsets = { top: 0, right: 0, bottom: 0, left: 0 };

/**
 * OCR öncesi görüntü iyileştirme (tarayıcıda, piksel düzeyinde):
 *  - "document": yazılı sayfa (içindekiler). Gri tona çevrilir, sayfanın aydınlatması
 *    (gölge, lamba parlaması, kâğıdın sararması) yerel arka plan tahminiyle bölünerek
 *    düzleştirilir, sonra kontrast gerilir → beyaz zemin üzerinde koyu, net yazı.
 *  - "photo": renkli kapak. Yalnızca kanal başına otomatik seviye (soluk/parlamalı
 *    fotoğrafın kontrastı açılır, renkler korunur).
 */
export type EnhanceMode = "none" | "document" | "photo";

const percentile = (histogram: Uint32Array, total: number, fraction: number) => {
  let seen = 0;
  for (let value = 0; value < histogram.length; value++) { seen += histogram[value]; if (seen >= total * fraction) return value; }
  return histogram.length - 1;
};

export function enhanceDocument(pixels: Uint8ClampedArray, width: number, height: number): void {
  const count = width * height;
  const gray = new Float32Array(count);
  for (let index = 0, offset = 0; index < count; index++, offset += 4) gray[index] = 0.299 * pixels[offset] + 0.587 * pixels[offset + 1] + 0.114 * pixels[offset + 2];

  // Arka plan (kâğıt aydınlığı): blok başına en parlak değer (yazı koyu olduğu için
  // blok maksimumu kâğıdı verir), 3x3 yumuşatma, sonra çift doğrusal büyütme.
  const block = Math.max(16, Math.round(Math.max(width, height) / 60));
  const gw = Math.ceil(width / block);
  const gh = Math.ceil(height / block);
  const grid = new Float32Array(gw * gh);
  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      // Tek bir parlak lekenin (yansıma) tüm bloğu yönetmemesi için maksimum yerine %95'lik değer.
      const values: number[] = [];
      for (let y = gy * block; y < Math.min(height, (gy + 1) * block); y += 2) for (let x = gx * block; x < Math.min(width, (gx + 1) * block); x += 2) values.push(gray[y * width + x]);
      values.sort((a, b) => a - b);
      grid[gy * gw + gx] = values[Math.floor(values.length * 0.95)] ?? 255;
    }
  }
  const smooth = new Float32Array(gw * gh);
  for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
    let sum = 0, n = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const x = gx + dx, y = gy + dy; if (x >= 0 && y >= 0 && x < gw && y < gh) { sum += grid[y * gw + x]; n++; } }
    smooth[gy * gw + gx] = sum / n;
  }
  const background = (x: number, y: number) => {
    const fx = Math.min(gw - 1, Math.max(0, x / block - 0.5)), fy = Math.min(gh - 1, Math.max(0, y / block - 0.5));
    const x0 = Math.floor(fx), y0 = Math.floor(fy), x1 = Math.min(gw - 1, x0 + 1), y1 = Math.min(gh - 1, y0 + 1);
    const tx = fx - x0, ty = fy - y0;
    const top = smooth[y0 * gw + x0] * (1 - tx) + smooth[y0 * gw + x1] * tx;
    const bottom = smooth[y1 * gw + x0] * (1 - tx) + smooth[y1 * gw + x1] * tx;
    return top * (1 - ty) + bottom * ty;
  };

  const flat = new Uint8ClampedArray(count);
  const histogram = new Uint32Array(256);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const index = y * width + x;
    const value = Math.min(255, (gray[index] / Math.max(24, background(x, y))) * 255);
    flat[index] = value;
    histogram[flat[index]]++;
  }
  // Kontrast germe: en koyu %1 siyah, kâğıt beyaz. Kâğıda yakın soluk tonlar (arka
  // sayfadan sızan yazı, kâğıt dokusu) beyaza itilir; gama asıl yazıyı koyulaştırır.
  const low = percentile(histogram, count, 0.01);
  const high = Math.max(low + 30, percentile(histogram, count, 0.9));
  for (let index = 0, offset = 0; index < count; index++, offset += 4) {
    const normalized = Math.min(1, Math.max(0, (flat[index] - low) / (high - low) / 0.8));
    const value = Math.round(255 * normalized ** 1.6);
    pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = value;
  }
}

export function enhancePhoto(pixels: Uint8ClampedArray, width: number, height: number): void {
  const count = width * height;
  for (let channel = 0; channel < 3; channel++) {
    const histogram = new Uint32Array(256);
    for (let offset = channel; offset < pixels.length; offset += 4) histogram[pixels[offset]]++;
    const low = percentile(histogram, count, 0.005);
    const high = percentile(histogram, count, 0.995);
    if (high - low < 40) continue; // Zaten düz renkli/boş — bozma.
    const scale = 255 / (high - low);
    for (let offset = channel; offset < pixels.length; offset += 4) pixels[offset] = (pixels[offset] - low) * scale;
  }
}

export async function compressImage(file: File, options: { maxDimension?: number; maxBytes?: number; rotate?: 0 | 90 | 180 | 270; crop?: CropInsets; enhance?: EnhanceMode } = {}): Promise<CompressedImage> {
  const maxBytes = options.maxBytes ?? 1.5 * 1024 * 1024;
  let maxDimension = options.maxDimension ?? 2000;
  const rotate = options.rotate ?? 0;
  const crop = options.crop ?? NO_CROP;
  let image: HTMLImageElement;
  try {
    image = await loadImage(file);
  } catch {
    throw new Error("Bu fotoğraf açılamadı. JPG veya PNG formatında bir fotoğraf dener misin?");
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Tarayıcın fotoğraf işlemeyi desteklemiyor.");

  // Kaynakta kırpılacak dikdörtgen (piksel).
  const sx = Math.round(image.naturalWidth * crop.left);
  const sy = Math.round(image.naturalHeight * crop.top);
  const sw = Math.max(1, Math.round(image.naturalWidth * (1 - crop.left - crop.right)));
  const sh = Math.max(1, Math.round(image.naturalHeight * (1 - crop.top - crop.bottom)));
  const quarterTurn = rotate === 90 || rotate === 270;

  for (let attempt = 0; attempt < 6; attempt++) {
    const scale = Math.min(1, maxDimension / Math.max(sw, sh));
    const width = Math.max(1, Math.round(sw * scale));
    const height = Math.max(1, Math.round(sh * scale));
    canvas.width = quarterTurn ? height : width;
    canvas.height = quarterTurn ? width : height;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.translate(canvas.width / 2, canvas.height / 2);
    context.rotate((rotate * Math.PI) / 180);
    context.drawImage(image, sx, sy, sw, sh, -width / 2, -height / 2, width, height);
    if (options.enhance && options.enhance !== "none") {
      try {
        context.setTransform(1, 0, 0, 1, 0, 0);
        const frame = context.getImageData(0, 0, canvas.width, canvas.height);
        (options.enhance === "document" ? enhanceDocument : enhancePhoto)(frame.data, canvas.width, canvas.height);
        context.putImageData(frame, 0, 0);
      } catch {
        // İyileştirme başarısız olursa (ör. bellek) fotoğraf olduğu gibi gönderilir.
      }
    }
    for (const quality of [0.85, 0.75, 0.65]) {
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      const bytes = dataUrlBytes(dataUrl);
      if (bytes <= maxBytes) return { dataUrl, mimeType: "image/jpeg", bytes };
    }
    maxDimension = Math.round(maxDimension * 0.8);
  }
  throw new Error("Fotoğraf küçültülemedi. Daha düşük çözünürlüklü bir fotoğraf dener misin?");
}
