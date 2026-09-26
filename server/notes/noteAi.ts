import { invokeLLM } from "../_core/llm";
import type { NoteAiAction, NoteAiItem } from "../../shared/noteContent";
import { notesConfig } from "./config";

const INSTRUCTIONS: Record<NoteAiAction, string> = {
  summarize: "Notu 3-6 maddelik kısa bir özete çevir.",
  keypoints: "Nottaki sınav için önemli bilgileri madde madde çıkar (en fazla 8).",
  questions: "Nottaki bilgiyi yoklayan 3-6 kısa YKS tarzı soru yaz (cevapsız, yalnız soru).",
  flashcards: "Nottan 3-8 flashcard üret: front = kısa soru, back = kısa net cevap.",
  simplify: "Notu bir lise öğrencisinin hemen anlayacağı sade cümlelerle, madde madde yeniden anlat.",
  review: "Nottan öğrencinin tekrar etmesi gereken kavram/konuları madde madde çıkar (en fazla 6).",
};

/**
 * Not üzerinde AI aracı. Yalnızca öğrenci açıkça tetiklediğinde çağrılır;
 * sağlayıcıya yalnızca o notun düz metni (üst sınırlı) gider. Sonuç notun
 * üzerine yazılmaz — çağıran onu ayrı bir blok olarak ekler.
 */
export async function runNoteAi(action: NoteAiAction, plainText: string, invoke: typeof invokeLLM = invokeLLM): Promise<NoteAiItem[]> {
  const input = plainText.trim().slice(0, notesConfig.ai.maxInputChars);
  if (!input) throw new Error("Bu notta işlenecek yazı yok.");
  const response = await invoke({
    messages: [
      { role: "system", content: `Sen bir YKS öğrencisinin kendi ders notunu işleyen yardımcı bir asistansın. Yalnızca nottaki bilgiye dayan, not dışı bilgi uydurma; Türkçe yaz. ${INSTRUCTIONS[action]} Her maddeyi 'front' alanına yaz; yalnızca flashcard'larda 'back' doldur, diğerlerinde boş string bırak.` },
      { role: "user", content: input },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "note_ai_items", strict: true, schema: { type: "object", properties: { items: { type: "array", items: { type: "object", properties: { front: { type: "string" }, back: { type: "string" } }, required: ["front", "back"], additionalProperties: false } } }, required: ["items"], additionalProperties: false } },
    },
  });
  const raw = response.choices[0]?.message?.content;
  const jsonText = typeof raw === "string" ? raw : raw?.map((part) => (part.type === "text" ? part.text : "")).join("");
  if (!jsonText) throw new Error("AI yanıtı boş döndü.");
  const items = ((JSON.parse(jsonText) as { items?: NoteAiItem[] }).items ?? [])
    .map((item) => ({ front: String(item.front ?? "").trim().slice(0, 500), back: String(item.back ?? "").trim().slice(0, 500) }))
    .filter((item) => item.front)
    .slice(0, 10);
  if (items.length === 0) throw new Error("AI bu nottan bir sonuç çıkaramadı.");
  return items.map((item) => (action === "flashcards" && item.back ? item : { front: item.front }));
}
