import { resourceCatalogConfig } from "../config";
import type { DifficultyLabel } from "../types";
import type { BookClassificationInput, DifficultyClassificationResult, DifficultyClassifierInterface } from "./types";

export type MetadataHint = { legacyLevel?: "Kolay" | "Orta" | "Zor" | null; pageCount?: number | null };

type MetadataScore = { score: number; confidence: number; rationale: string };

/**
 * Layer 2 (spec §13) — non-textual signals. Currently: a source-provided
 * difficulty hint (e.g. the legacy `resourceBookCatalog` seed's `level`
 * field, carried through `external_book_sources.rawMetadata`) and a weak
 * page-count heuristic. Returns `null` when no metadata signal exists —
 * the hybrid engine must degrade gracefully, not invent a signal.
 */
export function scoreFromMetadata(hint: MetadataHint): MetadataScore | null {
  if (hint.legacyLevel) {
    const score = { Kolay: 22, Orta: 50, Zor: 80 }[hint.legacyLevel];
    return { score, confidence: 0.6, rationale: `kaynak meta verisinde seviye etiketi: ${hint.legacyLevel}` };
  }
  if (typeof hint.pageCount === "number") {
    if (hint.pageCount >= 450) return { score: 60, confidence: 0.25, rationale: `yüksek sayfa sayısı (${hint.pageCount})` };
    if (hint.pageCount > 0 && hint.pageCount <= 260) return { score: 42, confidence: 0.2, rationale: `düşük sayfa sayısı (${hint.pageCount})` };
  }
  return null;
}

export type HybridClassifyOptions = { useAi: boolean; metadata?: MetadataHint };

/**
 * Combines the rule-based, AI and metadata layers into one score using
 * config-driven weights (spec §18). Each layer's *configured* weight is
 * scaled by that layer's own confidence before averaging, so a low-
 * confidence AI call (or one that failed and returned confidence 0) can't
 * outvote a high-confidence rule match — and a missing layer simply isn't
 * included, it never defaults to a fabricated neutral score.
 */
export class HybridDifficultyClassifier {
  constructor(
    private readonly rule: DifficultyClassifierInterface,
    private readonly ai: DifficultyClassifierInterface,
    private readonly config = resourceCatalogConfig
  ) {}

  async classify(input: BookClassificationInput, options: HybridClassifyOptions): Promise<DifficultyClassificationResult> {
    const ruleResult = await this.rule.classify(input);
    const aiResult = options.useAi ? await this.ai.classify(input) : null;
    const metaSignal = scoreFromMetadata(options.metadata ?? {});

    const weights = this.config.difficulty.weights;
    const layers: Array<{ score: number; confidence: number; weight: number }> = [
      { score: ruleResult.score, confidence: ruleResult.confidence, weight: weights.rule },
    ];
    if (aiResult && aiResult.confidence > 0) layers.push({ score: aiResult.score, confidence: aiResult.confidence, weight: weights.ai });
    if (metaSignal) layers.push({ score: metaSignal.score, confidence: metaSignal.confidence, weight: weights.metadata });

    const effectiveWeightOf = (l: (typeof layers)[number]) => l.weight * l.confidence;
    const totalEffectiveWeight = layers.reduce((sum, l) => sum + effectiveWeightOf(l), 0);
    const finalScore =
      totalEffectiveWeight > 0
        ? Math.round(layers.reduce((sum, l) => sum + l.score * effectiveWeightOf(l), 0) / totalEffectiveWeight)
        : ruleResult.score;

    const totalConfiguredWeight = layers.reduce((sum, l) => sum + l.weight, 0);
    const aggregateConfidence =
      totalConfiguredWeight > 0 ? layers.reduce((sum, l) => sum + l.confidence * l.weight, 0) / totalConfiguredWeight : ruleResult.confidence;

    const { easyMax, mediumMax } = this.config.difficulty.thresholds;
    const label: DifficultyLabel = finalScore <= easyMax ? "easy" : finalScore <= mediumMax ? "medium" : "hard";

    const rationale = [
      `kural: ${ruleResult.rationale} (skor ${ruleResult.score}, güven ${ruleResult.confidence.toFixed(2)})`,
      aiResult ? `AI: ${aiResult.rationale || "-"} (skor ${aiResult.score}, güven ${aiResult.confidence.toFixed(2)})` : "AI: kullanılmadı",
      metaSignal ? `metadata: ${metaSignal.rationale} (skor ${metaSignal.score}, güven ${metaSignal.confidence.toFixed(2)})` : "metadata: sinyal yok",
    ].join(" | ");

    return {
      label,
      score: Math.max(0, Math.min(100, finalScore)),
      confidence: Number(Math.max(0, Math.min(1, aggregateConfidence)).toFixed(3)),
      rationale,
      model: "hybrid-v1",
      classifiedAt: new Date().toISOString(),
    };
  }
}
