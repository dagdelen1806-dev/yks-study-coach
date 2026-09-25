import { normalizeForComparison } from "../resourceCatalog/normalizers/turkishText";
import { bookContentConfig } from "./config";

export type MatchableTopic = { id: number; exam: "TYT" | "AYT"; subject: string; unit: string; topic: string; aliases: string[] };

export type MatchMethod = "exact_topic" | "exact_alias" | "contains_topic" | "contains_alias" | "fuzzy";
export type MatchTier = "auto" | "confirm" | "manual";

export type TopicMatch = { topicId: number; confidence: number; method: MatchMethod; matchedText: string };
export type MatchResult = { best: TopicMatch | null; alternatives: TopicMatch[]; tier: MatchTier };

// İçindekiler başlıklarında konu ayırt etmeyen kelimeler.
const STOPWORDS = new Set(["ve", "ile", "de", "da", "test", "testi", "testleri", "soru", "sorulari", "konu", "konulari", "unite", "bolum", "tyt", "ayt", "yks", "yeni", "nesil"]);

const contentTokens = (text: string) => normalizeForComparison(text).split(" ").filter((token) => token.length > 1 && !STOPWORDS.has(token));

/** Türkçe çekim eklerini tolere etmek için kaba kök: kelimenin ilk N harfi
 * ("paragrafta" / "paragrafın" / "paragrafı" → "parag"). */
const stems = (text: string, length: number) => new Set(contentTokens(text).map((token) => token.slice(0, length)));

function dice(a: Set<string>, b: Set<string>) {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const item of Array.from(a)) if (b.has(item)) shared += 1;
  return (2 * shared) / (a.size + b.size);
}

/** Bir metnin, diğerini kelime sınırlarında içerip içermediği ("paragrafta konu ve ana düşünce testleri" ⊃ "paragrafta konu ve ana düşünce"). */
const containsPhrase = (haystack: string, needle: string) => needle.length >= 4 && ` ${haystack} `.includes(` ${needle} `);

export const tierFor = (confidence: number): MatchTier =>
  confidence >= bookContentConfig.mapping.autoSuggestMin ? "auto" : confidence >= bookContentConfig.mapping.confirmMin ? "confirm" : "manual";

/**
 * OCR'dan gelen bir başlığı mevcut müfredat konusuna eşler:
 * normalizasyon → tam eşleşme → alias → kapsama → benzerlik.
 * Yalnızca verilen `topics` listesinden seçer; yeni konu önermez/oluşturmaz.
 * `subject`/`exam` verilirse aday kümesi o derse/sınava daraltılır.
 */
export function matchTopic(title: string, topics: MatchableTopic[], filter: { subject?: string | null; exam?: "TYT" | "AYT" | null } = {}): MatchResult {
  const { scores, stemLength, maxAlternatives } = bookContentConfig.mapping;
  const normalizedTitle = normalizeForComparison(title);
  if (!normalizedTitle) return { best: null, alternatives: [], tier: "manual" };

  const subjectKey = filter.subject ? normalizeForComparison(filter.subject) : null;
  const pool = topics.filter((topic) => (!subjectKey || normalizeForComparison(topic.subject) === subjectKey) && (!filter.exam || topic.exam === filter.exam));
  const titleStems = stems(title, stemLength);

  const scored: TopicMatch[] = pool.map((topic) => {
    const names = [{ text: topic.topic, isAlias: false }, ...topic.aliases.map((alias) => ({ text: alias, isAlias: true }))];
    let best: TopicMatch = { topicId: topic.id, confidence: 0, method: "fuzzy", matchedText: topic.topic };
    for (const name of names) {
      const normalizedName = normalizeForComparison(name.text);
      let candidate: TopicMatch;
      if (normalizedName === normalizedTitle) {
        candidate = { topicId: topic.id, confidence: name.isAlias ? scores.exactAlias : scores.exactTopic, method: name.isAlias ? "exact_alias" : "exact_topic", matchedText: name.text };
      } else if (containsPhrase(normalizedTitle, normalizedName)) {
        candidate = { topicId: topic.id, confidence: name.isAlias ? scores.containsAlias : scores.containsTopic, method: name.isAlias ? "contains_alias" : "contains_topic", matchedText: name.text };
      } else {
        candidate = { topicId: topic.id, confidence: Math.round(dice(titleStems, stems(name.text, stemLength)) * scores.fuzzyMax * 1000) / 1000, method: "fuzzy", matchedText: name.text };
      }
      if (candidate.confidence > best.confidence) best = candidate;
    }
    return best;
  });

  const ranked = scored.filter((match) => match.confidence > 0).sort((a, b) => b.confidence - a.confidence);
  const best = ranked[0] ?? null;
  // Aynı güvende iki farklı konu = belirsiz; otomatik öneri yapılmaz.
  const ambiguous = Boolean(best && ranked[1] && ranked[1].confidence === best.confidence && ranked[1].topicId !== best.topicId);
  const tier = !best ? "manual" : ambiguous ? (tierFor(best.confidence) === "auto" ? "confirm" : tierFor(best.confidence)) : tierFor(best.confidence);
  return { best, alternatives: ranked.slice(1, 1 + maxAlternatives), tier };
}
