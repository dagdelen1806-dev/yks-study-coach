import { normalizeForComparison } from "../resourceCatalog/normalizers/turkishText";
import { textSimilarity, turkishCharCount, turkishPlausibility } from "./ocrText";
import type { TocRawItem, TocRawPage } from "./tocParser";

/**
 * Çoklu okuma (multi-pass OCR) puanlama ve uzlaşı motoru. Aynı fotoğrafın
 * farklı ön işlenmiş varyantlarından gelen okumalar puanlanır; en iyi okuma
 * omurga olur, satırlar diğer okumalarla karşılaştırılarak oylanır. Birden çok
 * okumanın doğruladığı satırın güveni artar, tek okumanın söylediği düşer.
 * Sağlayıcının kendi güven beyanı tek başına belirleyici değildir.
 */

export const ocrScoringConfig = {
  weights: {
    ocrConfidence: 0.2,
    completeness: 0.2,
    language: 0.1,
    structure: 0.15,
    numberConsistency: 0.15,
    layout: 0.05,
    agreement: 0.15,
  },
  /** İki satırın "aynı satır" sayılması için etiket+başlık benzerliği (normalize). */
  matchSimilarity: 0.8,
  /** Bu güvenin altındaki satır öğrenciye "kontrol et" diye gösterilir. */
  needsReviewBelow: 0.7,
  /** Tek okuma varsa (doğrulanamaz) satır güveni bu katsayıyla düşürülür. */
  singlePassPenalty: 0.85,
  /** İlk dalganın uzlaşısı bunun üstündeyse ikinci dalga çalıştırılmaz (maliyet). */
  earlyStopAgreement: 0.85,
  earlyStopScore: 0.8,
};
export type OcrScoringConfig = typeof ocrScoringConfig;

export type OcrPass = { variantId: string; page: TocRawPage; applied: string[]; rotation: 0 | 90 | 270; elapsedMs: number };
export type PassBreakdown = Record<keyof OcrScoringConfig["weights"], number>;
export type PassScore = { variantId: string; total: number; breakdown: PassBreakdown; entries: number };

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const mean = (values: number[], fallback = 0) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : fallback);
const entriesOf = (page: TocRawPage) => page.items.filter((item) => item.type === "entry");
const lineText = (item: TocRawItem) => `${item.label ?? ""} ${item.title}`.trim();

export function itemsMatch(a: TocRawItem, b: TocRawItem, config = ocrScoringConfig): boolean {
  if (a.type !== b.type) return false;
  if (a.type === "unit" && a.unitNumber !== null && a.unitNumber === b.unitNumber) return true;
  return textSimilarity(lineText(a), lineText(b)) >= config.matchSimilarity;
}

function structureScore(page: TocRawPage): number {
  const entries = entriesOf(page);
  if (!entries.length) return 0;
  const usable = entries.filter((item) => (item.label || item.title) && item.page !== null).length / entries.length;
  // Ünite numaraları 1, 2, 3… ve ünite içindeki "Test n" sıraları ardışık olmalı.
  const units = page.items.filter((item) => item.type === "unit" && item.unitNumber !== null).map((item) => item.unitNumber!);
  let unitBreaks = 0;
  for (let index = 1; index < units.length; index++) if (units[index] !== units[index - 1] + 1) unitBreaks++;
  let testPairs = 0, testBreaks = 0, lastTest: number | null = null;
  for (const item of page.items) {
    if (item.type === "unit") { lastTest = null; continue; }
    const match = item.type === "entry" ? /^test\s*(\d+)/.exec(normalizeForComparison(item.label ?? "")) : null;
    if (!match) continue;
    const number = Number(match[1]);
    if (lastTest !== null) { testPairs++; if (number !== lastTest + 1 && number !== 1) testBreaks++; }
    lastTest = number;
  }
  const sequence = 1 - (unitBreaks + testBreaks) / Math.max(1, units.length - 1 + testPairs);
  return clamp01(0.6 * usable + 0.4 * sequence);
}

function numberConsistency(page: TocRawPage): number {
  const entries = entriesOf(page);
  if (!entries.length) return 0;
  const withPage = entries.filter((item) => item.page !== null);
  let decreasing = 0;
  for (let index = 1; index < withPage.length; index++) if (withPage[index].page! < withPage[index - 1].page!) decreasing++;
  return clamp01((withPage.length / entries.length) * (1 - decreasing / Math.max(1, withPage.length - 1)));
}

function languageScore(page: TocRawPage): number {
  const texts = page.items.map((item) => item.title).filter((title) => title.trim());
  return mean(texts.map(turkishPlausibility), 0);
}

function layoutScore(page: TocRawPage): number {
  if (!page.items.length) return 0;
  if (page.pageKind === "table_of_contents" || page.pageKind === undefined) return 1;
  return entriesOf(page).filter((item) => item.page !== null).length >= 3 ? 0.7 : 0.2;
}

/** Her okumanın, diğer okumalarca doğrulanan satır oranı. */
function agreementScores(passes: OcrPass[], config: OcrScoringConfig): number[] {
  return passes.map((pass, index) => {
    const others = passes.filter((_, other) => other !== index);
    if (!others.length) return 0.5;
    const entries = pass.page.items;
    if (!entries.length) return 0;
    return mean(entries.map((item) => others.filter((other) => other.page.items.some((candidate) => itemsMatch(item, candidate, config))).length / others.length));
  });
}

export function scorePasses(passes: OcrPass[], config = ocrScoringConfig): PassScore[] {
  const maxEntries = Math.max(1, ...passes.map((pass) => entriesOf(pass.page).length));
  const agreement = agreementScores(passes, config);
  return passes.map((pass, index) => {
    const breakdown: PassBreakdown = {
      ocrConfidence: mean(pass.page.items.map((item) => item.confidence ?? 0.7), 0),
      completeness: entriesOf(pass.page).length / maxEntries,
      language: languageScore(pass.page),
      structure: structureScore(pass.page),
      numberConsistency: numberConsistency(pass.page),
      layout: layoutScore(pass.page),
      agreement: agreement[index],
    };
    const total = (Object.keys(config.weights) as (keyof PassBreakdown)[]).reduce((sum, key) => sum + config.weights[key] * breakdown[key], 0);
    return { variantId: pass.variantId, total: Math.round(total * 1000) / 1000, breakdown, entries: entriesOf(pass.page).length };
  });
}

/** Oylama: en çok okunan ham metin; eşitlikte Türkçe karakter içeren (ASCII'ye düşmüş okuma daha olası hatadır), sonra omurga. */
function voteText(values: string[]): { value: string; agreement: number } {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  const ranked = Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || turkishCharCount(b[0]) - turkishCharCount(a[0]));
  // Aynı metnin normalize hâli üzerinde uzlaşı: "Düşünce" ve "Dusunce" aynı satırı doğrular.
  const normalizedTop = normalizeForComparison(ranked[0][0]);
  const agreeing = values.filter((value) => normalizeForComparison(value) === normalizedTop).length;
  return { value: ranked[0][0], agreement: agreeing / values.length };
}

export type ConsensusResult = { page: TocRawPage; backboneVariant: string; agreement: number; passCount: number };

export function buildConsensus(passes: OcrPass[], scores: PassScore[], config = ocrScoringConfig): ConsensusResult {
  const order = scores.map((score, index) => ({ score, index })).sort((a, b) => b.score.total - a.score.total);
  const backbone = passes[order[0].index];
  const others = passes.filter((pass) => pass !== backbone && pass.page.items.length > 0);
  const passCount = 1 + others.length;
  const used = others.map(() => new Set<number>());

  const merged: TocRawItem[] = backbone.page.items.map((item) => {
    const matches: TocRawItem[] = [];
    others.forEach((other, otherIndex) => {
      let bestIndex = -1, bestSimilarity = 0;
      other.page.items.forEach((candidate, candidateIndex) => {
        if (used[otherIndex].has(candidateIndex) || !itemsMatch(item, candidate, config)) return;
        const similarity = textSimilarity(lineText(item), lineText(candidate));
        if (similarity > bestSimilarity) { bestSimilarity = similarity; bestIndex = candidateIndex; }
      });
      if (bestIndex >= 0) { used[otherIndex].add(bestIndex); matches.push(other.page.items[bestIndex]); }
    });
    const group = [item, ...matches];
    const support = group.length / passCount;
    const title = voteText(group.map((member) => member.title));
    const label = item.label === null && matches.every((member) => member.label === null) ? { value: null as string | null, agreement: 1 } : voteText(group.map((member) => member.label ?? ""));
    const pages = group.map((member) => member.page).filter((page): page is number => page !== null);
    const pageVotes = new Map<number, number>();
    for (const page of pages) pageVotes.set(page, (pageVotes.get(page) ?? 0) + 1);
    const topPage = Array.from(pageVotes.entries()).sort((a, b) => b[1] - a[1] || (a[0] === item.page ? -1 : b[0] === item.page ? 1 : 0))[0];
    const pageAgreement = topPage ? topPage[1] / group.length : 0;
    const selfConfidence = mean(group.map((member) => member.confidence ?? 0.7));
    const confidence = clamp01(passCount === 1 ? selfConfidence * config.singlePassPenalty : selfConfidence * (0.45 + 0.55 * support) * (0.7 + 0.3 * title.agreement));
    const pageFlag = item.type === "entry" && (topPage === undefined || pageAgreement < 0.5 || (passCount > 1 && pageVotes.size > 1) || group.some((member) => member.review?.page && member.page === (topPage?.[0] ?? null)));
    return {
      ...item,
      title: title.value,
      label: label.value === "" ? null : label.value,
      page: topPage ? topPage[0] : null,
      pageText: group.find((member) => member.page === (topPage?.[0] ?? null))?.pageText ?? item.pageText ?? null,
      confidence: Math.round(confidence * 100) / 100,
      support: Math.round(support * 100) / 100,
      review: { title: confidence < config.needsReviewBelow || title.agreement < 0.5, page: Boolean(pageFlag) },
    };
  });

  // Omurgada olmayan ama okumaların çoğunluğunun gördüğü satırlar (omurga atlamış olabilir) eklenir, doğrulama istenir.
  const majority = Math.ceil(passCount / 2);
  others.forEach((other, otherIndex) => {
    other.page.items.forEach((item, itemIndex) => {
      if (used[otherIndex].has(itemIndex)) return;
      const seenIn = 1 + others.filter((third, thirdIndex) => thirdIndex !== otherIndex && third.page.items.some((candidate, candidateIndex) => !used[thirdIndex].has(candidateIndex) && itemsMatch(item, candidate, config))).length;
      if (seenIn < majority || passCount < 3 || merged.some((existing) => itemsMatch(existing, item, config))) return;
      const previous = other.page.items[itemIndex - 1];
      const anchor = previous ? merged.findIndex((existing) => itemsMatch(existing, previous, config)) : -1;
      const support = seenIn / passCount;
      merged.splice(anchor + 1, 0, { ...item, confidence: Math.round(clamp01((item.confidence ?? 0.7) * support) * 100) / 100, support: Math.round(support * 100) / 100, review: { title: true, page: item.type === "entry" } });
    });
  });

  const agreement = mean(merged.map((item) => item.support ?? 0), 0);
  return { page: { ...backbone.page, items: merged }, backboneVariant: backbone.variantId, agreement: Math.round(agreement * 100) / 100, passCount };
}
