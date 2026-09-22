import { invokeLLM } from "../../_core/llm";
import type { DifficultyLabel } from "../types";
import type { BookClassificationInput, DifficultyClassificationResult, DifficultyClassifierInterface } from "./types";

const SCHEMA = {
  type: "object",
  properties: {
    difficulty_label: { type: "string", enum: ["easy", "medium", "hard"] },
    difficulty_score: { type: "integer" },
    confidence: { type: "number" },
    reason: { type: "string" },
  },
  required: ["difficulty_label", "difficulty_score", "confidence", "reason"],
  additionalProperties: false,
} as const;

const isDifficultyLabel = (value: unknown): value is DifficultyLabel => value === "easy" || value === "medium" || value === "hard";

const unavailableResult = (reason: string): DifficultyClassificationResult => ({
  label: "medium",
  score: 50,
  confidence: 0,
  rationale: reason,
  model: "ai:unavailable",
  classifiedAt: new Date().toISOString(),
});

/**
 * Real AI classification layer (spec §16/§17), built on the project's
 * existing `invokeLLM` (same built-in Forge client the AI weekly plan and
 * exam-document extraction routers already use — no new provider dependency).
 *
 * Never throws: any failure (no API key, network error, malformed JSON,
 * unparseable label) degrades to a zero-confidence "unavailable" result so
 * `HybridDifficultyClassifier` can fall back to the rule-based layer alone.
 * A hallucinated-but-well-formed response is still just one input into the
 * hybrid score, never taken as ground truth on its own.
 */
export class LlmDifficultyClassifier implements DifficultyClassifierInterface {
  readonly method = "ai" as const;

  async classify(input: BookClassificationInput): Promise<DifficultyClassificationResult> {
    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "Sen bir YKS kaynak kitabının zorluk seviyesini değerlendiren bir sınıflandırıcısın. Yalnızca sana verilen başlık, yayıncı, ders, sınav ve tür bilgisine dayan; kitabın içeriği hakkında bilmediğin hiçbir şeyi uydurma. Emin değilsen confidence değerini düşük tut. JSON şemasına tam uy.",
          },
          {
            role: "user",
            content: `Kitap: ${input.title}\nYayıncı: ${input.publisher ?? "bilinmiyor"}\nDers: ${input.subject ?? "bilinmiyor"}\nSınav: ${input.exam ?? "bilinmiyor"}\nTür: ${input.bookType ?? "bilinmiyor"}\nKategori: ${input.category ?? "bilinmiyor"}\nAçıklama: ${input.description ?? "yok"}`,
          },
        ],
        response_format: { type: "json_schema", json_schema: { name: "book_difficulty", strict: true, schema: SCHEMA } },
      });

      const content = response.choices[0]?.message?.content;
      const jsonText = typeof content === "string" ? content : content?.map((part) => (part.type === "text" ? part.text : "")).join("");
      if (!jsonText) return unavailableResult("AI boş yanıt döndürdü");

      const parsed = JSON.parse(jsonText) as { difficulty_label: unknown; difficulty_score: unknown; confidence: unknown; reason: unknown };
      if (!isDifficultyLabel(parsed.difficulty_label) || typeof parsed.difficulty_score !== "number" || typeof parsed.confidence !== "number") {
        return unavailableResult("AI yanıtı beklenen şemaya uymadı");
      }

      return {
        label: parsed.difficulty_label,
        score: Math.max(0, Math.min(100, Math.round(parsed.difficulty_score))),
        confidence: Math.max(0, Math.min(1, parsed.confidence)),
        rationale: typeof parsed.reason === "string" ? parsed.reason : "",
        model: `ai:${response.model || "unknown"}`,
        classifiedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.warn("[ResourceCatalog] AI difficulty classification unavailable:", error);
      return unavailableResult("AI sınıflandırma kullanılamadı (sağlayıcı hatası ya da API anahtarı yok)");
    }
  }
}
