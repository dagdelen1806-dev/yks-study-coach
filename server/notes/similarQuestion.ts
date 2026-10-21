import { invokeLLM } from "../_core/llm";
import { OPTION_LETTERS, parseSimilarQuestion, type AiSolution, type SimilarQuestion } from "../../shared/questionNotebook";
import { examPromptContext, examStudentPhrase, optionCountOf } from "../../shared/exams";
import { subjectGuidance, type SolveInput } from "./questionSolver";

/**
 * 🔁 Benzer soru: kartdaki soruyla AYNI kazanımı/yöntemi ölçen ama sayıları ve bağlamı farklı,
 * öğrencinin sınavının biçiminde (YKS 5, LGS 4 şıklı) yeni bir alıştırma sorusu üretir. Öğrenci yöntemi gerçekten öğrendi mi,
 * kopyalamadan dener. Kayıtlı AI çözümü varsa yöntem oradan alınır. Yalnızca öğrenci isteyince çağrılır.
 */
export async function generateSimilarQuestion(input: SolveInput & { solution: AiSolution | null }, invoke: typeof invokeLLM = invokeLLM, options: { model?: string } = {}): Promise<SimilarQuestion> {
  const questionText = input.ocrText?.trim();
  if (!input.imageDataUrl && !questionText) throw new Error("Benzer soru için kartta soru fotoğrafı olmalı.");
  const track = input.track ?? "YKS";
  const optionCount = optionCountOf(track);
  const letters = OPTION_LETTERS.slice(0, optionCount);
  const style = track === "LGS" ? "LGS (MEB) üslubunda, beceri temelli" : "YKS (ÖSYM) üslubunda";
  const system = [
    `${examStudentPhrase(track)} çözemediği soruya BENZER yeni bir alıştırma sorusu yazıyorsun (Türkçe).`,
    examPromptContext(track),
    `Ders: ${input.subject ?? "belirtilmemiş"}${input.topic ? ` · Konu: ${input.topic}` : ""}.`,
    "Kurallar:",
    "- Aynı kazanımı ve aynı çözüm yöntemini ölçsün; sayılar, isimler ve bağlam FARKLI olsun. Orijinal soruyu kopyalama.",
    `- Zorluk orijinale yakın olsun; ${style}, tek doğru cevaplı, ${optionCount} şıklı (${letters[0]}–${letters[optionCount - 1]}).`,
    "- question: soru metni (matematiği düz yazıyla, ör. x^2, √, π). Şekil gerekiyorsa şekli kelimelerle eksiksiz tarif et.",
    `- options: tam ${optionCount} şık, harfsiz (yalnızca şık içeriği). Çeldiriciler tipik öğrenci hatalarından gelsin.`,
    `- answer: doğru şıkkın harfi (${letters.join(", ")}). Cevabı yazmadan önce soruyu kendin çözüp doğrula.`,
    `- steps: 2–6 adım çözüm; work = işlem, why = neden. ${subjectGuidance(input.subject)}`,
    "- hint: cevabı ele vermeyen tek cümle ipucu.",
  ].join("\n");
  const userText = [
    questionText ? `Orijinal soru (OCR, hatalı olabilir; görsel varsa görsel esastır):\n${questionText.slice(0, 4000)}` : null,
    input.solution ? `Orijinal sorunun çözüm yöntemi: ${input.solution.method}\n${input.solution.steps.map((step, index) => `${index + 1}) ${step.work}`).join("\n")}` : null,
    input.stuckPoint?.trim() ? `Öğrencinin takıldığı yer: "${input.stuckPoint.trim().slice(0, 1000)}" — yeni soru bu adımı da çalıştırsın.` : null,
  ].filter(Boolean).join("\n\n") || "Orijinal soruyu görselden oku ve ona benzer yeni bir soru yaz.";
  const response = await invoke({
    ...(options.model ? { model: options.model } : {}),
    messages: [
      { role: "system", content: system },
      { role: "user", content: input.imageDataUrl ? [{ type: "text" as const, text: userText }, { type: "image_url" as const, image_url: { url: input.imageDataUrl, detail: "high" as const } }] : userText },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "similar_question",
        strict: true,
        schema: {
          type: "object",
          properties: {
            question: { type: "string" },
            options: { type: "array", items: { type: "string" } },
            answer: { type: "string", enum: letters },
            steps: { type: "array", items: { type: "object", properties: { work: { type: "string" }, why: { type: "string" } }, required: ["work", "why"], additionalProperties: false } },
            hint: { type: "string" },
          },
          required: ["question", "options", "answer", "steps", "hint"],
          additionalProperties: false,
        },
      },
    },
  });
  const raw = response.choices[0]?.message?.content;
  const jsonText = typeof raw === "string" ? raw : raw?.map((part) => (part.type === "text" ? part.text : "")).join("");
  if (!jsonText) throw new Error("AI yanıtı boş döndü.");
  const similar = parseSimilarQuestion(jsonText.replace(/```json|```/g, "").trim(), optionCount);
  if (!similar) throw new Error("Benzer soru okunamadı.");
  return similar;
}
