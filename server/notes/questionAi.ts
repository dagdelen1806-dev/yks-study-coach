import { invokeLLM } from "../_core/llm";
import { examStudentPhrase, type ExamTrack } from "../../shared/exams";
import { DIFFICULTY_KEYS, ERROR_TYPES, ERROR_TYPE_KEYS, type Difficulty, type ErrorType } from "../../shared/questionNotebook";

export type TopicCandidate = { id: number; subject: string; unit: string; topic: string };
export type QuestionSuggestion = { ocrText: string; topicId: number | null; subject: string | null; difficulty: Difficulty | null; errorType: ErrorType | null };

/**
 * Soru fotoğrafını tek bir görsel çağrısıyla okur ve ÖNERİ üretir: ders/konu
 * (yalnızca verilen müfredat listesinden — uydurma konu kabul edilmez), zorluk
 * ve öğrencinin kendi anlatımından olası hata türü. Hiçbiri kesin teşhis
 * değildir; öğrenci [Doğru] / [Düzelt] ile onaylar. Yalnızca öğrenci
 * açıkça istediğinde çağrılır.
 */
export async function suggestQuestionDetails(
  input: { imageDataUrl: string | null; stuckPoint: string | null; topics: TopicCandidate[]; track?: ExamTrack },
  invoke: typeof invokeLLM = invokeLLM
): Promise<QuestionSuggestion> {
  if (!input.imageDataUrl && !input.stuckPoint?.trim()) throw new Error("Önerilecek bir şey yok: fotoğraf ya da açıklama ekle.");
  const topicList = input.topics.map((topic) => `${topic.id}|${topic.subject}|${topic.unit}|${topic.topic}`).join("\n");
  const errorList = ERROR_TYPE_KEYS.map((key) => `${key} = ${ERROR_TYPES[key].label}`).join("; ");
  const system = [
    `${examStudentPhrase(input.track ?? "YKS")} çözemediği soruyu sınıflandıran yardımcısın. Türkçe çalış.`,
    "1) Görselde soru varsa metnini olduğu gibi çıkar (matematiği düz yazıyla, ör. x^2). Görsel yoksa ocrText boş string.",
    "2) Sorunun konusunu YALNIZCA aşağıdaki listeden seç ve topicId olarak o satırın numarasını yaz. Emin değilsen topicId = 0.",
    `3) Zorluk: ${DIFFICULTY_KEYS.join(", ")} (emin değilsen medium).`,
    `4) Öğrencinin takıldığı yeri anlatan metinden OLASI hata türünü seç: ${errorList}. Metin yoksa ya da açık değilse "none". Teşhis koyma; yalnızca öğrencinin söylediğine dayan.`,
    "Konu listesi (id|ders|ünite|konu):",
    topicList,
  ].join("\n");
  const userText = input.stuckPoint?.trim() ? `Öğrencinin takıldığı yer: "${input.stuckPoint.trim().slice(0, 1500)}"` : "Öğrenci takıldığı yeri yazmadı.";
  const response = await invoke({
    messages: [
      { role: "system", content: system },
      { role: "user", content: input.imageDataUrl ? [{ type: "text" as const, text: userText }, { type: "image_url" as const, image_url: { url: input.imageDataUrl, detail: "high" as const } }] : userText },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "question_suggestion",
        strict: true,
        schema: {
          type: "object",
          properties: {
            ocrText: { type: "string" },
            topicId: { type: "integer" },
            difficulty: { type: "string", enum: [...DIFFICULTY_KEYS] },
            errorType: { type: "string", enum: [...ERROR_TYPE_KEYS, "none"] },
          },
          required: ["ocrText", "topicId", "difficulty", "errorType"],
          additionalProperties: false,
        },
      },
    },
  });
  const raw = response.choices[0]?.message?.content;
  const jsonText = typeof raw === "string" ? raw : raw?.map((part) => (part.type === "text" ? part.text : "")).join("");
  if (!jsonText) throw new Error("AI yanıtı boş döndü.");
  const parsed = JSON.parse(jsonText) as { ocrText?: unknown; topicId?: unknown; difficulty?: unknown; errorType?: unknown };
  const topic = input.topics.find((item) => item.id === Number(parsed.topicId)) ?? null;
  return {
    ocrText: String(parsed.ocrText ?? "").trim().slice(0, 5000),
    topicId: topic?.id ?? null,
    subject: topic?.subject ?? null,
    difficulty: (DIFFICULTY_KEYS as readonly string[]).includes(String(parsed.difficulty)) ? (parsed.difficulty as Difficulty) : null,
    errorType: (ERROR_TYPE_KEYS as readonly string[]).includes(String(parsed.errorType)) ? (parsed.errorType as ErrorType) : null,
  };
}
