import fs from "node:fs";
import path from "node:path";
import { limitSize, type GrayImage } from "../../shared/imaging/image";
import { planPreprocessing, renderVariant, type VariantSpec } from "../../shared/imaging/pipeline";
import { analyzeImageQuality, type ImageQualityReport, type QualityIssue } from "../../shared/imaging/quality";
import { ENV } from "../_core/env";
import { LlmUnavailableError } from "../_core/llm";
import { normalizeForComparison } from "../resourceCatalog/normalizers/turkishText";
import { decodeJpegToGray, encodeGrayToJpegDataUrl, parseDataUrl } from "./imageCodec";
import { buildConsensus, ocrScoringConfig, scorePasses, type OcrPass, type PassScore } from "./ocrConsensus";
import type { OcrProvider } from "./ocrProvider";
import { rawTextOf } from "./tocPostprocess";
import { pageIssues, type TocRawPage } from "./tocParser";

/**
 * OcrOrchestrator — bir içindekiler fotoğrafı için:
 *   1. görüntü kalitesi analizi  2. ön işleme planı  3. varyant üretimi
 *   4. her varyantı OCR'dan geçirme (dalgalar hâlinde)  5. puanlama
 *   6. uzlaşı / en iyi sonuç  7. tutarsızlık varsa ipuçlu düzeltme okuması
 *   8. güven değerleri + ham/normalize metin.
 * Arayüz bu karmaşıklığı bilmez; sonuç tek bir rapor nesnesidir.
 *
 * Sunucusuz ortam (Vercel, 60 sn) için bütçe bilinçlidir: süre azalınca yeni
 * dalga başlatılmaz, her okuma zaman aşımına bağlıdır, ilk dalga yeterince
 * tutarlıysa ikinci dalga hiç çalışmaz (maliyet kontrolü).
 */

export const ocrOrchestratorConfig = {
  /** Tek bir fotoğraf için toplam süre bütçesi (isteğin tamamı 60 sn ile sınırlı). */
  timeBudgetMs: 48_000,
  /** Tek bir okuma geçişinin zaman aşımı. */
  passTimeoutMs: 28_000,
  /** Yeni bir dalga başlatmak için kalması gereken en az süre. */
  minRemainingForWaveMs: 16_000,
  maxWorkingDimension: 2400,
  jpegQuality: 85,
  /** Düzeltme okuması (sayfa numarası tutarsızlığı ipucuyla) yapılsın mı. */
  correctiveReread: true,
};

export type PassReport = { variantId: string; applied: string[]; rotation: 0 | 90 | 270; status: "ok" | "failed" | "timeout" | "skipped"; elapsedMs: number; score?: number; breakdown?: PassScore["breakdown"]; entries?: number; error?: string };

export type TocReadReport = {
  page: TocRawPage;
  rawText: string;
  normalizedText: string;
  quality: (Omit<ImageQualityReport, "documentQuad"> & { issues: QualityIssue[] }) | null;
  plan: { level: string; variants: string[]; geometry: { perspective: boolean; deskew: boolean; sideways: boolean } } | null;
  passes: PassReport[];
  chosenVariant: string;
  agreement: number;
  confidence: { image: number; ocr: number; structure: number };
  waves: number;
  elapsedMs: number;
  notes: string[];
};

class PassTimeoutError extends Error {}
const withTimeout = <T,>(promise: Promise<T>, ms: number) => new Promise<T>((resolve, reject) => {
  const timer = setTimeout(() => reject(new PassTimeoutError(`timeout after ${ms}ms`)), ms);
  promise.then((value) => { clearTimeout(timer); resolve(value); }, (error) => { clearTimeout(timer); reject(error); });
});

/** Servis kapalı / anahtar geçersiz gibi kalıcı hatalar: diğer varyantları denemek anlamsız. */
const isPermanent = (error: unknown) => error instanceof LlmUnavailableError && error.reason !== "provider";

function debugDir(): string | null {
  if (ENV.isProduction || process.env.OCR_DEBUG !== "1") return null;
  const dir = path.join(process.cwd(), ".ocr-debug", new Date().toISOString().replace(/[:.]/g, "-"));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export async function readTocImage(dataUrl: string, options: { provider: OcrProvider; deadline?: number; maxPasses?: number; config?: typeof ocrOrchestratorConfig; scoring?: typeof ocrScoringConfig }): Promise<TocReadReport> {
  const config = options.config ?? ocrOrchestratorConfig;
  const scoring = options.scoring ?? ocrScoringConfig;
  const started = Date.now();
  const deadline = Math.min(options.deadline ?? Infinity, started + config.timeBudgetMs);
  const notes: string[] = [];
  const debug = debugDir();

  // 1–2) Kalite + plan. JPEG değilse (PNG/WebP) ön işleme yapılamaz → tek okuma.
  let gray: GrayImage | null = null;
  let quality: ImageQualityReport | null = null;
  const parsed = parseDataUrl(dataUrl);
  if (parsed && parsed.mimeType === "image/jpeg") {
    try {
      gray = limitSize(decodeJpegToGray(parsed.buffer), config.maxWorkingDimension);
      quality = analyzeImageQuality(gray);
    } catch (error) {
      notes.push("Görüntü çözülemedi; ön işleme yapılmadan okundu.");
      console.warn("[OCR] decode failed:", error instanceof Error ? error.message : error);
    }
  }
  const fullPlan = quality ? planPreprocessing(quality) : { level: "ACCEPTABLE" as const, variants: [{ id: "A_original", kind: "original" as const, rotate: 0 as const, steps: [], upscale: 1, wave: 1 as const }], geometry: { perspective: false, deskew: false, sideways: false } };

  // Çok sayfalı taramada sayfa başına geçiş kısılır (ilk dalga korunur).
  const plan = options.maxPasses ? { ...fullPlan, variants: fullPlan.variants.slice(0, Math.max(options.maxPasses, fullPlan.variants.filter((variant) => variant.wave === 1).length)) } : fullPlan;

  const passes: OcrPass[] = [];
  const reports: PassReport[] = [];
  let chosenRotation: 0 | 90 | 270 = 0;
  let lastError: unknown = null;

  const runVariants = async (variants: VariantSpec[]) => {
    await Promise.all(variants.map(async (spec) => {
      const rotation: 0 | 90 | 270 = spec.rotate === "auto" ? chosenRotation : spec.rotate;
      const passStart = Date.now();
      let url = dataUrl, applied: string[] = [];
      try {
        if (spec.kind !== "original" && gray && quality) {
          const rendered = renderVariant(gray, spec, quality, rotation);
          applied = rendered.applied;
          url = encodeGrayToJpegDataUrl(rendered.image, config.jpegQuality);
          if (debug) fs.writeFileSync(path.join(debug, `${spec.id}.jpg`), Buffer.from(url.split(",")[1], "base64"));
        }
        const remaining = deadline - Date.now();
        if (remaining < 3_000) { reports.push({ variantId: spec.id, applied, rotation, status: "skipped", elapsedMs: 0 }); return; }
        const page = await withTimeout(options.provider.extractTableOfContentsPage(url), Math.min(config.passTimeoutMs, remaining));
        passes.push({ variantId: spec.id, page, applied, rotation, elapsedMs: Date.now() - passStart });
        reports.push({ variantId: spec.id, applied, rotation, status: "ok", elapsedMs: Date.now() - passStart });
      } catch (error) {
        if (isPermanent(error)) throw error;
        lastError = error;
        reports.push({ variantId: spec.id, applied, rotation, status: error instanceof PassTimeoutError ? "timeout" : "failed", elapsedMs: Date.now() - passStart, error: error instanceof Error ? error.message.slice(0, 160) : "error" });
      }
    }));
  };

  // 3–4) Birinci dalga.
  const waveOne = plan.variants.filter((variant) => variant.wave === 1);
  await runVariants(waveOne);
  let waves = 1;
  let scores = scorePasses(passes, scoring);

  // Yan çekilmiş fotoğraf: 90° ve 270° okumalarından puanı yüksek olan yön seçilir.
  if (plan.geometry.sideways) {
    const byRotation = (rotation: 90 | 270) => Math.max(0, ...scores.filter((score, index) => passes[index].rotation === rotation).map((score) => score.total));
    chosenRotation = byRotation(270) > byRotation(90) ? 270 : 90;
    notes.push(`Fotoğraf yan çekilmiş; ${chosenRotation}° döndürülerek okundu.`);
  }

  // 5) İkinci dalga — yalnızca ilk dalga yeterince tutarlı değilse ve süre varsa.
  const waveTwo = plan.variants.filter((variant) => variant.wave === 2);
  if (waveTwo.length && passes.length) {
    const consensus = buildConsensus(passes, scores, scoring);
    const best = Math.max(...scores.map((score) => score.total));
    const confident = passes.length >= 2 && consensus.agreement >= scoring.earlyStopAgreement && best >= scoring.earlyStopScore;
    if (confident) notes.push("İlk okumalar birbirini doğruladı; ek okuma gerekmedi.");
    else if (deadline - Date.now() >= config.minRemainingForWaveMs) { await runVariants(waveTwo); waves = 2; scores = scorePasses(passes, scoring); }
    else waveTwo.forEach((variant) => reports.push({ variantId: variant.id, applied: [], rotation: chosenRotation, status: "skipped", elapsedMs: 0 }));
  } else if (waveTwo.length && !passes.length && deadline - Date.now() >= config.minRemainingForWaveMs) {
    await runVariants(waveTwo); waves = 2; scores = scorePasses(passes, scoring);
  }

  if (!passes.length) throw lastError instanceof Error ? lastError : new Error("OCR okuması başarısız oldu");

  // 6) Uzlaşı.
  let consensus = buildConsensus(passes, scores, scoring);

  // 7) Tutarsız sayfa numaraları: en iyi varyant, bulunan sorunlar ipucu verilerek bir kez yeniden okunur.
  const issues = pageIssues(consensus.page);
  if (config.correctiveReread && issues.length && deadline - Date.now() >= config.minRemainingForWaveMs) {
    const backbone = passes.find((pass) => pass.variantId === consensus.backboneVariant)!;
    const spec = plan.variants.find((variant) => variant.id === backbone.variantId)!;
    const url = spec.kind === "original" || !gray || !quality ? dataUrl : encodeGrayToJpegDataUrl(renderVariant(gray, spec, quality, backbone.rotation).image, config.jpegQuality);
    const rereadStart = Date.now();
    try {
      const page = await withTimeout(options.provider.extractTableOfContentsPage(url, { previous: consensus.page, issues }), Math.min(config.passTimeoutMs, deadline - Date.now()));
      passes.push({ variantId: `${backbone.variantId}_reread`, page, applied: backbone.applied, rotation: backbone.rotation, elapsedMs: Date.now() - rereadStart });
      reports.push({ variantId: `${backbone.variantId}_reread`, applied: backbone.applied, rotation: backbone.rotation, status: "ok", elapsedMs: Date.now() - rereadStart });
      scores = scorePasses(passes, scoring);
      const rebuilt = buildConsensus(passes, scores, scoring);
      if (pageIssues(rebuilt.page).length < issues.length) { consensus = rebuilt; notes.push("Sayfa numarası tutarsızlığı yeniden okunarak düzeltildi."); }
    } catch (error) {
      if (isPermanent(error)) throw error;
      reports.push({ variantId: `${backbone.variantId}_reread`, applied: backbone.applied, rotation: backbone.rotation, status: error instanceof PassTimeoutError ? "timeout" : "failed", elapsedMs: Date.now() - rereadStart });
    }
  }

  for (const report of reports) {
    const index = passes.findIndex((pass) => pass.variantId === report.variantId);
    if (index >= 0) Object.assign(report, { score: scores[index].total, breakdown: scores[index].breakdown, entries: scores[index].entries });
  }
  const backboneScore = scores[passes.findIndex((pass) => pass.variantId === consensus.backboneVariant)];
  const rawText = rawTextOf(passes.find((pass) => pass.variantId === consensus.backboneVariant)!.page);
  const { documentQuad: _quad, ...qualitySummary } = quality ?? ({} as ImageQualityReport);
  return {
    page: consensus.page,
    rawText,
    normalizedText: normalizeForComparison(rawText),
    quality: quality ? qualitySummary : null,
    plan: { level: plan.level, variants: plan.variants.map((variant) => variant.id), geometry: plan.geometry },
    passes: reports,
    chosenVariant: consensus.backboneVariant,
    agreement: consensus.agreement,
    confidence: {
      image: quality ? quality.score : 0.75,
      ocr: backboneScore.total,
      structure: Math.round(((backboneScore.breakdown.structure + backboneScore.breakdown.numberConsistency) / 2) * 100) / 100,
    },
    waves,
    elapsedMs: Date.now() - started,
    notes,
  };
}
