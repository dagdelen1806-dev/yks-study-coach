import { binarizeGlobal, binarizeSauvola, flattenIllumination, median3, otsuThreshold, stretchContrast, unsharpMask } from "./enhance";
import { estimateSkew, warpPerspective } from "./geometry";
import { limitSize, resizeGray, rotateQuarter, rotateSmall, type GrayImage } from "./image";
import type { ImageQualityReport, QualityLevel } from "./quality";

/**
 * Uyarlamalı ön işleme. Her fotoğrafa bütün filtreler UYGULANMAZ: kalite
 * raporuna göre (1) hangi adımların gerekli olduğu, (2) kaç okuma varyantı
 * üretileceği seçilir. Varyantlar iki dalgada okunur; ilk dalga yeterince
 * tutarlıysa ikinci dalga hiç çalışmaz (maliyet + Vercel süre sınırı).
 *
 * Kitap sırtı kıvrımı düzeltme (dewarp) bilinçli olarak sonraki faza bırakıldı;
 * `PreprocessStep` listesine yeni bir adım olarak eklenebilecek şekilde tasarlandı.
 */

export type PreprocessStep =
  | "perspective" | "rotate" | "deskew" | "grayscale" | "denoise" | "illumination" | "contrast" | "contrast_mild" | "upscale" | "sharpen" | "sauvola" | "otsu";

export type VariantKind = "original" | "enhanced" | "adaptive" | "otsu" | "geometry_gray";

export type VariantSpec = {
  id: string;
  kind: VariantKind;
  /** "auto": ilk dalgada iki yön denendikten sonra seçilen yön kullanılır. */
  rotate: 0 | 90 | 270 | "auto";
  steps: PreprocessStep[];
  upscale: number;
  wave: 1 | 2;
};

export type PreprocessPlan = { level: QualityLevel; variants: VariantSpec[]; geometry: { perspective: boolean; deskew: boolean; sideways: boolean } };

export const preprocessingConfig = {
  /** Kalite seviyesine göre en fazla okuma geçişi (ilk dalga + ikinci dalga). */
  passBudget: { GOOD: 2, ACCEPTABLE: 4, POOR: 6 } as Record<QualityLevel, number>,
  perspective: { minConfidence: 0.7, maxCoverage: 0.9 },
  deskew: { minAngle: 0.5, minConfidence: 0.35, maxAngle: 8 },
  /** Satır yüksekliği bunun altındaysa büyüt (1.5x); yarısının altındaysa 2x. */
  upscaleBelowTextPx: 18,
  maxOutputDimension: 2600,
  /** Bu değerlerin üstü ilgili düzeltmeyi tetikler. */
  triggers: { illuminationShadow: 0.25, illuminationBrightness: 0.5, lowContrast: 0.55, denoiseNoise: 0.5, sharpenBlur: 0.3 },
};

export function planPreprocessing(quality: ImageQualityReport, config = preprocessingConfig): PreprocessPlan {
  const perspective = quality.documentConfidence >= config.perspective.minConfidence && quality.documentCoverage <= config.perspective.maxCoverage && quality.documentQuad !== null;
  const sideways = quality.orientation === "sideways";
  const deskew = sideways || (Math.abs(quality.skew) >= config.deskew.minAngle && quality.skewConfidence >= config.deskew.minConfidence);
  const geometry: PreprocessStep[] = [...(perspective ? ["perspective" as const] : []), ...(sideways ? ["rotate" as const] : []), ...(deskew ? ["deskew" as const] : [])];

  // Fotometrik adımlar yalnızca sorun varsa.
  const photometric: PreprocessStep[] = ["grayscale"];
  if (quality.noise >= config.triggers.denoiseNoise) photometric.push("denoise");
  const needsIllumination = quality.shadow >= config.triggers.illuminationShadow || quality.brightness < config.triggers.illuminationBrightness || quality.glare > 0;
  if (needsIllumination) photometric.push("illumination");
  photometric.push(needsIllumination || quality.contrast < config.triggers.lowContrast ? "contrast" : "contrast_mild");
  const textHeight = quality.estimatedTextHeight;
  const upscale = textHeight !== null && textHeight < config.upscaleBelowTextPx ? (textHeight < config.upscaleBelowTextPx / 2 ? 2 : 1.5) : 1;
  if (upscale > 1) photometric.push("upscale");
  if (quality.blur >= config.triggers.sharpenBlur || upscale > 1) photometric.push("sharpen");

  const rotation = sideways ? ("auto" as const) : 0;
  const variants: VariantSpec[] = [{ id: "A_original", kind: "original", rotate: 0, steps: [], upscale: 1, wave: 1 }];
  if (sideways) {
    // 90° ile 270° görüntüden ayırt edilemez: ikisi de okunur, puanı yüksek olan yön seçilir.
    variants.push({ id: "B_enhanced_r90", kind: "enhanced", rotate: 90, steps: [...geometry, ...photometric], upscale, wave: 1 });
    variants.push({ id: "B_enhanced_r270", kind: "enhanced", rotate: 270, steps: [...geometry, ...photometric], upscale, wave: 1 });
  } else {
    variants.push({ id: "B_enhanced", kind: "enhanced", rotate: 0, steps: [...geometry, ...photometric], upscale, wave: 1 });
  }
  const binarizeBase: PreprocessStep[] = [...geometry, "grayscale", ...(photometric.includes("denoise") ? ["denoise" as const] : []), "illumination", ...(upscale > 1 ? ["upscale" as const] : [])];
  // Yön "auto" ise ilk dalgada bilinmiyor → bu varyant ikinci dalgaya kalır.
  variants.push({ id: "C_adaptive", kind: "adaptive", rotate: rotation, steps: [...binarizeBase, "sauvola"], upscale, wave: quality.level === "POOR" && !sideways ? 1 : 2 });
  variants.push({ id: "D_otsu", kind: "otsu", rotate: rotation, steps: [...binarizeBase, "otsu"], upscale, wave: 2 });
  if (geometry.length) variants.push({ id: "E_geometry_gray", kind: "geometry_gray", rotate: rotation, steps: [...geometry, "grayscale"], upscale: 1, wave: 2 });

  const budget = config.passBudget[quality.level] + (sideways ? 1 : 0);
  return { level: quality.level, variants: variants.slice(0, budget), geometry: { perspective, deskew, sideways } };
}

/**
 * Bir varyantı üretir. Sıra: perspektif (orijinal koordinatlarla) → 90° döndürme
 * → eğim (döndürülmüş görüntüde yeniden ölçülür) → gürültü → aydınlatma →
 * kontrast → büyütme → keskinleştirme → eşikleme. Uygulanan adımlar döner
 * (debug/rapor için); ölçüm yetersizse adım atlanır ve listede görünmez.
 */
export function renderVariant(source: GrayImage, spec: VariantSpec, quality: ImageQualityReport, rotation: 0 | 90 | 270 = spec.rotate === "auto" ? 0 : spec.rotate, config = preprocessingConfig): { image: GrayImage; applied: string[] } {
  let image = source;
  const applied: string[] = [];
  const has = (step: PreprocessStep) => spec.steps.includes(step);
  if (has("perspective") && quality.documentQuad) {
    try { image = warpPerspective(image, quality.documentQuad, config.maxOutputDimension); applied.push("perspective"); } catch { /* dejenere köşeler: atla */ }
  }
  if (rotation) { image = rotateQuarter(image, rotation); applied.push(`rotate${rotation}`); }
  if (has("deskew")) {
    const skew = estimateSkew(image, { maxAngle: config.deskew.maxAngle });
    if (Math.abs(skew.angle) >= config.deskew.minAngle && skew.confidence >= config.deskew.minConfidence) { image = rotateSmall(image, -skew.angle); applied.push(`deskew(${skew.angle}°)`); }
  }
  if (has("grayscale")) applied.push("grayscale");
  if (has("denoise")) { image = median3(image); applied.push("denoise"); }
  if (has("illumination")) { image = flattenIllumination(image); applied.push("illumination"); }
  if (has("contrast")) { image = stretchContrast(image); applied.push("contrast"); }
  else if (has("contrast_mild")) { image = stretchContrast(image, { lowPct: 0.005, highPct: 0.97, knee: 0.95, gamma: 1.15 }); applied.push("contrast_mild"); }
  if (has("upscale") && spec.upscale > 1) {
    const factor = Math.min(spec.upscale, config.maxOutputDimension / Math.max(image.width, image.height));
    if (factor > 1.05) { image = resizeGray(image, image.width * factor, image.height * factor); applied.push(`upscale(${Math.round(factor * 10) / 10}x)`); }
  }
  if (has("sharpen")) { image = unsharpMask(image, 0.5); applied.push("sharpen"); }
  if (has("sauvola")) { image = binarizeSauvola(image); applied.push("sauvola"); }
  if (has("otsu")) { image = binarizeGlobal(image, otsuThreshold(image)); applied.push("otsu"); }
  return { image: limitSize(image, config.maxOutputDimension), applied };
}
