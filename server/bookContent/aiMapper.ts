import { invokeLLM } from "../_core/llm";
import { bookContentConfig } from "./config";
import type { MatchableTopic } from "./curriculumMatcher";

export type AmbiguousTitle = { key: number; text: string; unitTitle: string };
export type AiSuggestion = { key: number; topicId: number; confidence: number; reason: string };

type LlmAnswer = { answers: Array<{ key: number; candidateTopicId: number | null; confidence: number; reason: string }> };

/**
 * Deterministik eşleştirmenin karar veremediği başlıklar için AI'dan aday
 * listesinden seçim ister. AI çıktısı GÜVENİLİR VERİ SAYILMAZ:
 *  - yalnızca verilen aday ID'lerinden biri kabul edilir (yeni konu imkânsız),
 *  - güven `maxConfidence` ile sınırlanır → otomatik öneri eşiğine hiç ulaşmaz,
 *    öğrenci onayı her durumda zorunlu,
 *  - hata/zaman aşımında sessizce boş döner (akış deterministik sonuçla sürer).
 */
export async function suggestTopicsWithAi(titles: AmbiguousTitle[], candidates: MatchableTopic[], invoke: typeof invokeLLM = invokeLLM): Promise<AiSuggestion[]> {
  const { enabled, maxCandidates, maxConfidence, minConfidence } = bookContentConfig.aiMapping;
  if (!enabled || titles.length === 0 || candidates.length === 0) return [];
  const pool = candidates.slice(0, maxCandidates);
  const allowed = new Set(pool.map((topic) => topic.id));

  try {
    const response = await invoke({
      messages: [
        { role: "system", content: "Bir YKS kitabının içindekiler başlıklarını, verilen müfredat konu listesindeki EN UYGUN konuyla eşleştiriyorsun. Yalnızca listedeki id'lerden birini seç; hiçbiri gerçekten uymuyorsa candidateTopicId null ver. Yeni konu önerme. confidence 0-1 arası, emin değilsen düşük ver. reason tek kısa Türkçe cümle." },
        { role: "user", content: JSON.stringify({ topics: pool.map((topic) => ({ id: topic.id, subject: topic.subject, unit: topic.unit, topic: topic.topic })), titles: titles.map((title) => ({ key: title.key, title: title.text, unit: title.unitTitle })) }) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "yks_topic_mapping",
          strict: true,
          schema: {
            type: "object",
            properties: { answers: { type: "array", items: { type: "object", properties: { key: { type: "integer" }, candidateTopicId: { type: ["integer", "null"] }, confidence: { type: "number" }, reason: { type: "string" } }, required: ["key", "candidateTopicId", "confidence", "reason"], additionalProperties: false } } },
            required: ["answers"],
            additionalProperties: false,
          },
        },
      },
    });
    const raw = response.choices[0]?.message?.content;
    const jsonText = typeof raw === "string" ? raw : raw?.map((part) => (part.type === "text" ? part.text : "")).join("");
    if (!jsonText) return [];
    const parsed = JSON.parse(jsonText) as LlmAnswer;
    const keys = new Set(titles.map((title) => title.key));
    return (parsed.answers ?? [])
      .filter((answer) => keys.has(answer.key) && answer.candidateTopicId !== null && allowed.has(answer.candidateTopicId) && Number.isFinite(answer.confidence))
      .map((answer) => ({ key: answer.key, topicId: answer.candidateTopicId!, confidence: Math.min(maxConfidence, Math.max(0, answer.confidence)), reason: String(answer.reason ?? "").slice(0, 200) }))
      .filter((answer) => answer.confidence >= minConfidence);
  } catch (error) {
    console.warn("[BookContent] AI mapping skipped:", error instanceof Error ? error.message : error);
    return [];
  }
}
