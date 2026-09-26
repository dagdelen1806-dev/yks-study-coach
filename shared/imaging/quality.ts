import { estimateBackground, flattenIllumination, median3, otsuThreshold } from "./enhance";
import { detectDocument, detectOrientation, estimateSkew, type DocumentDetection, type Quad } from "./geometry";
import { limitSize, percentileOf, type GrayImage } from "./image";

/**
 * ImageQualityAnalyzer — fotoğraf OCR'a gitmeden önce ölçülür. Bu ölçümler
 * hem öğrenciye "tekrar çek" önerisi (kalite kapısı) hem de hangi ön işleme
 * adımlarının ve kaç okuma geçişinin yapılacağı için kullanılır.
 * Değerler mümkün olduğunca 0–1 aralığındadır (skew derece cinsindendir).
 */

export type QualityLevel = "GOOD" | "ACCEPTABLE" | "POOR";
export type QualityIssueCode = "low_resolution" | "blurry" | "dark" | "low_contrast" | "shadow" | "glare" | "skewed" | "perspective" | "partial_page" | "sideways" | "noisy" | "small_text";
export type QualityIssue = { code: QualityIssueCode; severity: "info" | "warning" | "critical"; message: string };

export type ImageQualityReport = {
  width: number;
  height: number;
  megapixels: number;
  resolution: "good" | "low" | "very_low";
  brightness: number;
  contrast: number;
  blur: number;
  noise: number;
  shadow: number;
  glare: number;
  skew: number;
  skewConfidence: number;
  perspective: number;
  documentCoverage: number;
  documentConfidence: number;
  documentQuad: Quad | null;
  orientation: "upright" | "sideways";
  orientationConfidence: number;
  /** Tahmini satır yüksekliği (tam çözünürlük pikseli); bilinmiyorsa null. */
  estimatedTextHeight: number | null;
  level: QualityLevel;
  /** 0–1: görüntünün okunabilirliğine duyulan güven (imageConfidence). */
  score: number;
  issues: QualityIssue[];
};

export const qualityThresholds = {
  resolution: { goodLongSide: 1600, lowLongSide: 900 },
  blur: { warning: 0.45, critical: 0.75 },
  brightness: { dark: 0.3, veryDark: 0.18 },
  contrast: { low: 0.35, veryLow: 0.2 },
  shadow: { warning: 0.45, critical: 0.7 },
  glare: { warning: 0.04, critical: 0.12 },
  skew: { warning: 3, critical: 8 },
  perspective: { warning: 0.12, critical: 0.3 },
  noise: { warning: 0.5 },
  /** Bu satır yüksekliğinin altı "küçük yazı" (büyütme yararlı). */
  smallTextPx: 18,
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const round = (value: number, digits = 2) => Math.round(value * 10 ** digits) / 10 ** digits;

/**
 * Laplace varyansı → bulanıklık (0 net … 1 çok bulanık), ~1000 px'lik kopyada.
 * Kalibrasyon (gerçek kitap fotoğrafları): net 660–900, 3x küçültülüp
 * büyütülmüş 140–230, kutu bulanıklığı 3–15. Logaritmik ölçek: 600 → 0, 30 → 1.
 */
function blurScore(image: GrayImage): number {
  const { width, height, data } = image;
  let sum = 0, sumSq = 0, count = 0;
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
    const index = y * width + x;
    const laplacian = 4 * data[index] - data[index - 1] - data[index + 1] - data[index - width] - data[index + width];
    sum += laplacian; sumSq += laplacian * laplacian; count++;
  }
  const variance = sumSq / Math.max(1, count) - (sum / Math.max(1, count)) ** 2;
  return clamp01((Math.log(600) - Math.log(Math.max(1, variance))) / (Math.log(600) - Math.log(30)));
}

/** Gürültü: pikselin 3x3 medyandan ortalama sapması (yalnızca düz, yazısız bölgelerde anlamlı → medyan alınır). */
function noiseScore(image: GrayImage): number {
  const filtered = median3(image);
  const diffs = new Float32Array(image.data.length);
  for (let index = 0; index < diffs.length; index++) diffs[index] = Math.abs(image.data[index] - filtered.data[index]);
  return clamp01(percentileOf(diffs, 0.5) / 6);
}

/** Satır yüksekliği: eğimi düzeltilmiş satır projeksiyonunda mürekkepli satır bloklarının medyan boyu. */
function textLineHeight(image: GrayImage): number | null {
  const flat = flattenIllumination(image);
  const threshold = Math.min(200, otsuThreshold(flat));
  const rows = new Float32Array(flat.height);
  for (let y = 0; y < flat.height; y++) { let ink = 0; for (let x = 0; x < flat.width; x++) if (flat.data[y * flat.width + x] < threshold) ink++; rows[y] = ink / flat.width; }
  const runs: number[] = [];
  let run = 0;
  for (let y = 0; y < rows.length; y++) {
    if (rows[y] > 0.01) run++;
    else { if (run >= 2) runs.push(run); run = 0; }
  }
  if (run >= 2) runs.push(run);
  if (runs.length < 3) return null;
  runs.sort((a, b) => a - b);
  return runs[Math.floor(runs.length / 2)];
}

export function analyzeImageQuality(image: GrayImage, thresholds = qualityThresholds): ImageQualityReport {
  const work = limitSize(image, 1000);
  const scale = image.width / work.width;
  const longSide = Math.max(image.width, image.height);
  const document: DocumentDetection = detectDocument(image);
  const orientation = detectOrientation(work);
  const skew = orientation.sideways ? { angle: 0, confidence: 0 } : estimateSkew(work);

  const brightness = clamp01(percentileOf(work.data, 0.5) / 255);
  const contrast = clamp01((percentileOf(work.data, 0.98) - percentileOf(work.data, 0.02)) / 255);

  // Gölge ve parlama, sayfanın arka plan (kâğıt) haritasından ölçülür; sayfa
  // güvenle bulunduysa yalnızca sayfa içindeki bloklar sayılır.
  const background = estimateBackground(work);
  const cells: number[] = [];
  const inside = (gx: number, gy: number) => {
    if (!document.quad || document.confidence < 0.5) return true;
    const x = ((gx + 0.5) * background.block * scale), y = ((gy + 0.5) * background.block * scale);
    const q = document.quad;
    return x >= Math.max(q.topLeft.x, q.bottomLeft.x) && x <= Math.min(q.topRight.x, q.bottomRight.x) && y >= Math.max(q.topLeft.y, q.topRight.y) && y <= Math.min(q.bottomLeft.y, q.bottomRight.y);
  };
  for (let gy = 0; gy < background.gh; gy++) for (let gx = 0; gx < background.gw; gx++) if (inside(gx, gy)) cells.push(background.grid[gy * background.gw + gx]);
  cells.sort((a, b) => a - b);
  const bgLow = cells[Math.floor(cells.length * 0.1)] ?? 255, bgHigh = cells[Math.floor(cells.length * 0.9)] ?? 255, bgMedian = cells[Math.floor(cells.length / 2)] ?? 255;
  const shadow = clamp01(1 - bgLow / Math.max(1, bgHigh));
  // Parlama: kâğıdın geri kalanından belirgin şekilde parlak, tamamen doymuş bölgeler.
  const glare = cells.length ? cells.filter((value) => value >= 250 && value >= bgMedian + 18).length / cells.length : 0;

  const blur = blurScore(work);
  const noise = noiseScore(work);
  // Yan çekilmiş sayfada satırlar dikeydir; satır boyu döndürmeden sonra ölçülür (burada bilinmiyor).
  const lineHeight = orientation.sideways ? null : textLineHeight(work);
  const estimatedTextHeight = lineHeight === null ? null : Math.round(lineHeight * scale);

  const issues: QualityIssue[] = [];
  const add = (code: QualityIssueCode, severity: QualityIssue["severity"], message: string) => issues.push({ code, severity, message });
  if (longSide < thresholds.resolution.lowLongSide) add("low_resolution", "critical", "Fotoğrafın çözünürlüğü çok düşük. Sayfaya biraz daha yaklaşıp tekrar çeker misin?");
  else if (longSide < thresholds.resolution.goodLongSide) add("low_resolution", "warning", "Fotoğrafın çözünürlüğü düşük; küçük yazılar zor okunabilir.");
  if (blur >= thresholds.blur.critical) add("blurry", "critical", "Fotoğraf bulanık. Telefonu sabit tutup netleşmesini bekleyerek tekrar çeker misin?");
  else if (blur >= thresholds.blur.warning) add("blurry", "warning", "Fotoğraf biraz bulanık.");
  if (brightness < thresholds.brightness.veryDark) add("dark", "critical", "Sayfa çok karanlık. Daha aydınlık bir yerde çeker misin?");
  else if (brightness < thresholds.brightness.dark) add("dark", "warning", "Sayfa yeterince aydınlık değil.");
  if (contrast < thresholds.contrast.veryLow) add("low_contrast", "critical", "Yazılar zeminden ayırt edilemiyor (kontrast çok düşük).");
  else if (contrast < thresholds.contrast.low) add("low_contrast", "warning", "Kontrast düşük; yazılar soluk görünüyor.");
  if (shadow >= thresholds.shadow.critical) add("shadow", "critical", "Sayfada yoğun gölge var. Işığı sayfanın karşısına alıp tekrar çeker misin?");
  else if (shadow >= thresholds.shadow.warning) add("shadow", "warning", "Sayfanın bir kısmı gölgede.");
  if (glare >= thresholds.glare.critical) add("glare", "critical", "Fotoğrafta parlama var. Sayfayı biraz farklı açıdan çekmen daha iyi sonuç verebilir.");
  else if (glare >= thresholds.glare.warning) add("glare", "warning", "Fotoğrafta hafif parlama var.");
  if (orientation.sideways) add("sideways", "info", "Fotoğraf yan çekilmiş görünüyor; otomatik döndürülecek.");
  if (Math.abs(skew.angle) >= thresholds.skew.critical && skew.confidence > 0.3) add("skewed", "warning", "Sayfa çok eğik görünüyor.");
  else if (Math.abs(skew.angle) >= thresholds.skew.warning && skew.confidence > 0.2) add("skewed", "info", "Sayfa biraz eğik; otomatik düzeltilecek.");
  if (document.confidence >= 0.7 && document.perspectiveDistortion >= thresholds.perspective.critical) add("perspective", "warning", "Sayfa yandan çekilmiş; telefonu sayfaya paralel tutarsan daha iyi okunur.");
  if (document.confidence >= 0.5 && document.touchesEdges >= 2 && document.coverage > 0.6) add("partial_page", "warning", "Sayfanın bir kısmı kadraj dışında olabilir.");
  if (noise >= thresholds.noise.warning) add("noisy", "info", "Fotoğrafta gren (gürültü) var.");
  if (estimatedTextHeight !== null && estimatedTextHeight < thresholds.smallTextPx) add("small_text", "info", "Yazılar küçük; büyütülerek okunacak.");

  const criticals = issues.filter((issue) => issue.severity === "critical").length;
  const warnings = issues.filter((issue) => issue.severity === "warning").length;
  const level: QualityLevel = criticals > 0 || warnings >= 3 ? "POOR" : warnings > 0 ? "ACCEPTABLE" : "GOOD";
  const score = clamp01(1 - 0.28 * criticals - 0.1 * warnings - 0.25 * Math.max(0, blur - 0.4) - 0.5 * glare);

  return {
    width: image.width,
    height: image.height,
    megapixels: round((image.width * image.height) / 1e6),
    resolution: longSide >= thresholds.resolution.goodLongSide ? "good" : longSide >= thresholds.resolution.lowLongSide ? "low" : "very_low",
    brightness: round(brightness),
    contrast: round(contrast),
    blur: round(blur),
    noise: round(noise),
    shadow: round(shadow),
    glare: round(glare, 3),
    skew: skew.angle,
    skewConfidence: skew.confidence,
    perspective: document.perspectiveDistortion,
    documentCoverage: document.coverage,
    documentConfidence: document.confidence,
    documentQuad: document.quad,
    orientation: orientation.sideways ? "sideways" : "upright",
    orientationConfidence: round(orientation.confidence),
    estimatedTextHeight,
    level,
    score: round(score),
    issues,
  };
}
