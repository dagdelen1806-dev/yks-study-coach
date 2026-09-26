import { flattenIllumination, otsuThreshold } from "./enhance";
import { createGray, limitSize, sampleBilinear, type GrayImage } from "./image";

/**
 * Sayfa geometrisi: eğim (deskew), yan çekilmiş fotoğraf (orientation),
 * sayfa sınırı (document detection) ve perspektif düzeltme.
 * Hepsi küçültülmüş kopya üzerinde ölçer, sonucu tam çözünürlüğe ölçekler.
 */

export type Point = { x: number; y: number };
export type Quad = { topLeft: Point; topRight: Point; bottomRight: Point; bottomLeft: Point };

/** Koyu (mürekkep) piksellerin koordinatları; en fazla `maxPoints` örnek. */
function inkPoints(image: GrayImage, options: { textOnly?: boolean; maxPoints?: number } = {}): { xs: Float32Array; ys: Float32Array; count: number; ratio: number } {
  const flat = flattenIllumination(image);
  const threshold = Math.min(200, otsuThreshold(flat));
  let total = 0;
  for (let index = 0; index < flat.data.length; index++) if (flat.data[index] < threshold) total++;
  // `textOnly` (eğim ölçümü): yalnızca "yazı gibi" mürekkep: yazı çizgileri seyrektir. Yerel yoğunluğu
  // yüksek koyu kütleler (el, parmak, gölgeli masa, fotoğraf/çizim) satır
  // yapısı taşımaz ve eğim ölçümünü saptırır → yoğunluk integral görüntüsüyle ayıklanır.
  const { width, height } = flat;
  const stride = width + 1;
  const integral = new Float64Array(stride * (height + 1));
  for (let y = 0; y < height; y++) {
    let row = 0;
    for (let x = 0; x < width; x++) {
      row += flat.data[y * width + x] < threshold ? 1 : 0;
      integral[(y + 1) * stride + x + 1] = integral[y * stride + x + 1] + row;
    }
  }
  const radius = Math.max(6, Math.round(Math.max(width, height) / 70));
  const density = (x: number, y: number) => {
    const x0 = Math.max(0, x - radius), x1 = Math.min(width, x + radius + 1), y0 = Math.max(0, y - radius), y1 = Math.min(height, y + radius + 1);
    return (integral[y1 * stride + x1] - integral[y0 * stride + x1] - integral[y1 * stride + x0] + integral[y0 * stride + x0]) / ((x1 - x0) * (y1 - y0));
  };
  const step = Math.max(1, Math.ceil(total / (options.maxPoints ?? 60_000)));
  const xs = new Float32Array(Math.ceil(total / step) + 1), ys = new Float32Array(xs.length);
  let seen = 0, count = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (flat.data[y * width + x] >= threshold) continue;
    if (seen++ % step !== 0) continue;
    if (options.textOnly && density(x, y) > 0.35) continue;
    xs[count] = x; ys[count] = y; count++;
  }
  return { xs, ys, count, ratio: total / flat.data.length };
}

/** Projeksiyon keskinliği: satır histogramının kareler toplamı, düzgün dağılıma göre (1 = hiç yapı yok). */
function projectionPeakiness(values: Float32Array, count: number, bins: number, offset: number, shear: Float32Array | null, shearFactor: number): number {
  const histogram = new Float64Array(bins);
  for (let index = 0; index < count; index++) {
    const bin = Math.round(values[index] - (shear ? shear[index] * shearFactor : 0)) + offset;
    if (bin >= 0 && bin < bins) histogram[bin]++;
  }
  let sumSq = 0;
  for (let bin = 0; bin < bins; bin++) sumSq += histogram[bin] * histogram[bin];
  return sumSq / ((count * count) / bins);
}

export type SkewEstimate = { angle: number; confidence: number };

/**
 * Metin satırlarının eğimi (derece; pozitif = içerik saat yönünde dönmüş).
 * Yöntem: mürekkep noktalarının satır projeksiyonu, açı taranarak en keskin
 * olduğu yer bulunur (Hough benzeri, ama belge için daha kararlı).
 */
export function estimateSkew(image: GrayImage, options: { maxAngle?: number; step?: number } = {}): SkewEstimate {
  const work = limitSize(image, 900);
  const points = inkPoints(work, { textOnly: true });
  if (points.count < 200 || points.ratio > 0.45) return { angle: 0, confidence: 0 };
  const maxAngle = options.maxAngle ?? 8, step = options.step ?? 0.25;
  const margin = Math.ceil(work.width * Math.tan((maxAngle * Math.PI) / 180)) + 2;
  const bins = work.height + 2 * margin;
  const scores: { angle: number; score: number }[] = [];
  for (let angle = -maxAngle; angle <= maxAngle + 1e-9; angle += step) {
    scores.push({ angle, score: projectionPeakiness(points.ys, points.count, bins, margin, points.xs, Math.tan((angle * Math.PI) / 180)) });
  }
  const best = scores.reduce((a, b) => (b.score > a.score ? b : a));
  const sorted = scores.map((item) => item.score).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  // Belirgin bir tepe yoksa (fotoğraf, çizim, çok az yazı) güven düşük.
  const confidence = Math.max(0, Math.min(1, (best.score / Math.max(1e-9, median) - 1) / 0.6));
  return { angle: Math.round(best.angle * 100) / 100, confidence: Math.round(confidence * 100) / 100 };
}

export type OrientationEstimate = { sideways: boolean; confidence: number; horizontalScore: number; verticalScore: number };

/**
 * Yan (90°/270°) çekilmiş mi? Yatay metin satırları satır projeksiyonunu,
 * dikey (yan dönmüş) satırlar sütun projeksiyonunu keskinleştirir. 90° ile
 * 270° arasındaki fark buradan anlaşılamaz; orkestratör iki yönü de dener ve
 * okuma puanı yüksek olanı seçer.
 */
export function detectOrientation(image: GrayImage): OrientationEstimate {
  const work = limitSize(image, 900);
  const points = inkPoints(work);
  if (points.count < 200) return { sideways: false, confidence: 0, horizontalScore: 1, verticalScore: 1 };
  const best = (values: Float32Array, other: Float32Array, length: number, otherLength: number) => {
    let top = 0;
    for (let angle = -6; angle <= 6; angle += 1) {
      const margin = Math.ceil(otherLength * Math.tan((6 * Math.PI) / 180)) + 2;
      top = Math.max(top, projectionPeakiness(values, points.count, length + 2 * margin, margin, other, Math.tan((angle * Math.PI) / 180)));
    }
    return top;
  };
  const horizontalScore = best(points.ys, points.xs, work.height, work.width);
  const verticalScore = best(points.xs, points.ys, work.width, work.height);
  const ratio = verticalScore / Math.max(1e-9, horizontalScore);
  return { sideways: ratio > 1.25, confidence: Math.max(0, Math.min(1, Math.abs(Math.log(ratio)) / Math.log(2))), horizontalScore, verticalScore };
}

export type DocumentDetection = {
  /** Tam çözünürlükte sayfa köşeleri; bulunamadıysa null. */
  quad: Quad | null;
  /** Sayfanın kadrajdaki alanı (0–1). */
  coverage: number;
  /** Tespitin güveni (0–1). Düşükse kırpma/perspektif uygulanmaz. */
  confidence: number;
  /** 0 = tam karşıdan çekilmiş dikdörtgen, 1'e yaklaştıkça eğik/yamuk. */
  perspectiveDistortion: number;
  /** Sayfa kadrajın bir kenarına değiyor mu (kısmen kadraj dışında olabilir). */
  touchesEdges: number;
};

const quadArea = (quad: Quad) => {
  const points = [quad.topLeft, quad.topRight, quad.bottomRight, quad.bottomLeft];
  let area = 0;
  for (let index = 0; index < 4; index++) { const a = points[index], b = points[(index + 1) % 4]; area += a.x * b.y - b.x * a.y; }
  return Math.abs(area) / 2;
};
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

export function perspectiveDistortionOf(quad: Quad): number {
  const top = distance(quad.topLeft, quad.topRight), bottom = distance(quad.bottomLeft, quad.bottomRight);
  const left = distance(quad.topLeft, quad.bottomLeft), right = distance(quad.topRight, quad.bottomRight);
  const horizontal = 1 - Math.min(top, bottom) / Math.max(top, bottom, 1e-9);
  const vertical = 1 - Math.min(left, right) / Math.max(left, right, 1e-9);
  return Math.round(Math.min(1, (horizontal + vertical) * 2) * 100) / 100;
}

/**
 * Sayfa sınırı: sayfa, arka plandan (masa, halı, yatak) daha açık renklidir.
 * Küçük kopyada Otsu ile açık bölge maskesi → en büyük bağlı bileşen → içindeki
 * yazı delikleri doldurulur → köşeler (x+y ve x−y uç noktaları). Dikdörtgene
 * uymayan ya da kadrajı zaten dolduran sonuçlarda güven düşük döner.
 */
export function detectDocument(image: GrayImage): DocumentDetection {
  const work = limitSize(image, 320);
  const { width, height, data } = work;
  const scale = image.width / width;
  const threshold = otsuThreshold(work);
  const total = width * height;
  const label = new Int32Array(total).fill(-1);
  const stack = new Int32Array(total);
  let bestLabel = -1, bestCount = 0, current = 0;
  for (let start = 0; start < total; start++) {
    if (label[start] !== -1 || data[start] <= threshold) continue;
    let top = 0, count = 0;
    stack[top++] = start; label[start] = current;
    while (top) {
      const index = stack[--top]; count++;
      const x = index % width, y = (index - x) / width;
      const neighbours = [x > 0 ? index - 1 : -1, x < width - 1 ? index + 1 : -1, y > 0 ? index - width : -1, y < height - 1 ? index + width : -1];
      for (const next of neighbours) if (next >= 0 && label[next] === -1 && data[next] > threshold) { label[next] = current; stack[top++] = next; }
    }
    if (count > bestCount) { bestCount = count; bestLabel = current; }
    current++;
  }
  const none: DocumentDetection = { quad: null, coverage: 1, confidence: 0, perspectiveDistortion: 0, touchesEdges: 0 };
  if (bestLabel < 0 || bestCount < total * 0.05) return none;

  // Delik doldurma: kenardan ulaşılamayan, bileşene ait olmayan pikseller = sayfa içi (yazı).
  const outside = new Uint8Array(total);
  let top = 0;
  const pushOutside = (index: number) => { if (!outside[index] && label[index] !== bestLabel) { outside[index] = 1; stack[top++] = index; } };
  for (let x = 0; x < width; x++) { pushOutside(x); pushOutside((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { pushOutside(y * width); pushOutside(y * width + width - 1); }
  while (top) {
    const index = stack[--top];
    const x = index % width, y = (index - x) / width;
    if (x > 0) pushOutside(index - 1);
    if (x < width - 1) pushOutside(index + 1);
    if (y > 0) pushOutside(index - width);
    if (y < height - 1) pushOutside(index + width);
  }
  let filled = 0;
  let tl = { x: 0, y: 0, v: Infinity }, br = { x: 0, y: 0, v: -Infinity }, tr = { x: 0, y: 0, v: -Infinity }, bl = { x: 0, y: 0, v: Infinity };
  let touchLeft = false, touchRight = false, touchTop = false, touchBottom = false;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (outside[y * width + x]) continue;
    filled++;
    if (x === 0) touchLeft = true;
    if (x === width - 1) touchRight = true;
    if (y === 0) touchTop = true;
    if (y === height - 1) touchBottom = true;
    const sum = x + y, diff = x - y;
    if (sum < tl.v) tl = { x, y, v: sum };
    if (sum > br.v) br = { x, y, v: sum };
    if (diff > tr.v) tr = { x, y, v: diff };
    if (diff < bl.v) bl = { x, y, v: diff };
  }
  const quadSmall: Quad = { topLeft: tl, topRight: tr, bottomRight: br, bottomLeft: bl };
  const area = quadArea(quadSmall);
  const coverage = Math.min(1, area / total);
  const rectangularity = area > 0 ? Math.min(1, filled / area) : 0;
  const touchesEdges = [touchLeft, touchRight, touchTop, touchBottom].filter(Boolean).length;
  const quad: Quad = {
    topLeft: { x: tl.x * scale, y: tl.y * scale },
    topRight: { x: (tr.x + 1) * scale, y: tr.y * scale },
    bottomRight: { x: (br.x + 1) * scale, y: (br.y + 1) * scale },
    bottomLeft: { x: bl.x * scale, y: (bl.y + 1) * scale },
  };
  // Güven: dikdörtgene uygunluk (dolu alan / dörtgen alanı ≈ 1), makul kapsama ve
  // kenarlara az değme. Kadrajın neredeyse tamamı "sayfa" ise ayırt edilecek bir
  // arka plan yoktur (ör. beyaz masa) → kırpma için güven 0.
  let confidence = Math.max(0, (rectangularity - 0.8) / 0.18);
  if (coverage > 0.93 || coverage < 0.15) confidence = 0;
  confidence *= touchesEdges >= 3 ? 0.3 : touchesEdges === 2 ? 0.7 : 1;
  return { quad, coverage: Math.round(coverage * 100) / 100, confidence: Math.round(Math.min(1, confidence) * 100) / 100, perspectiveDistortion: perspectiveDistortionOf(quad), touchesEdges };
}

/** 4 nokta eşlemesinden homografi (8 bilinmeyen, Gauss eliminasyonu). */
export function solveHomography(from: Point[], to: Point[]): number[] {
  const matrix: number[][] = [];
  for (let index = 0; index < 4; index++) {
    const { x, y } = from[index], { x: u, y: v } = to[index];
    matrix.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
    matrix.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  }
  for (let column = 0; column < 8; column++) {
    let pivot = column;
    for (let row = column + 1; row < 8; row++) if (Math.abs(matrix[row][column]) > Math.abs(matrix[pivot][column])) pivot = row;
    [matrix[column], matrix[pivot]] = [matrix[pivot], matrix[column]];
    const divisor = matrix[column][column];
    if (Math.abs(divisor) < 1e-12) throw new Error("degenerate quad");
    for (let k = column; k < 9; k++) matrix[column][k] /= divisor;
    for (let row = 0; row < 8; row++) {
      if (row === column) continue;
      const factor = matrix[row][column];
      for (let k = column; k < 9; k++) matrix[row][k] -= factor * matrix[column][k];
    }
  }
  return [...matrix.map((row) => row[8]), 1];
}

/** PerspectiveCorrector: yamuk sayfayı düz dikdörtgene açar (ters eşleme + çift doğrusal örnekleme). */
export function warpPerspective(image: GrayImage, quad: Quad, maxDimension = 2600): GrayImage {
  const widthTop = distance(quad.topLeft, quad.topRight), widthBottom = distance(quad.bottomLeft, quad.bottomRight);
  const heightLeft = distance(quad.topLeft, quad.bottomLeft), heightRight = distance(quad.topRight, quad.bottomRight);
  let outWidth = Math.max(widthTop, widthBottom), outHeight = Math.max(heightLeft, heightRight);
  const scale = Math.min(1, maxDimension / Math.max(outWidth, outHeight));
  outWidth = Math.max(1, Math.round(outWidth * scale));
  outHeight = Math.max(1, Math.round(outHeight * scale));
  const h = solveHomography(
    [{ x: 0, y: 0 }, { x: outWidth - 1, y: 0 }, { x: outWidth - 1, y: outHeight - 1 }, { x: 0, y: outHeight - 1 }],
    [quad.topLeft, quad.topRight, quad.bottomRight, quad.bottomLeft],
  );
  const out = createGray(outWidth, outHeight);
  for (let y = 0; y < outHeight; y++) for (let x = 0; x < outWidth; x++) {
    const w = h[6] * x + h[7] * y + h[8];
    out.data[y * outWidth + x] = sampleBilinear(image, (h[0] * x + h[1] * y + h[2]) / w, (h[3] * x + h[4] * y + h[5]) / w, 255);
  }
  return out;
}
