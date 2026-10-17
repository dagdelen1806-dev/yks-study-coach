import { invokeLLM } from "../_core/llm";
import { parseAiSolution, type AiSolution } from "../../shared/questionNotebook";

export type SolveInput = { imageDataUrl: string | null; ocrText: string | null; stuckPoint: string | null; subject: string | null; topic: string | null };

/** Derse göre çözüm yaklaşımı: sayısal derslerde sağlama, sözel derslerde gerekçe ve çeldiriciler. */
export function subjectGuidance(subject: string | null): string {
  const name = (subject ?? "").toLocaleLowerCase("tr-TR");
  if (/geometri/.test(name)) return "Şekildeki verileri önce listele, hangi teoremi/bağıntıyı neden kullandığını söyle, en sonda sonucu sağla.";
  if (/matematik/.test(name)) return "Bilinmeyeni ve verilenleri yaz, denklemi kur, her işlemin nedenini söyle; en sonda bulduğun değeri yerine koyarak sağla.";
  if (/fizik/.test(name)) return "Verilenleri birimleriyle yaz, doğru formülü NEDEN seçtiğini söyle, birim kontrolü yap.";
  if (/kimya/.test(name)) return "Mol / kütle / derişim ilişkisini kur, gerekiyorsa denklemi denkleştir, birim ve korunum kontrolü yap.";
  if (/biyoloji/.test(name)) return "Sorunun hangi kavramı ölçtüğünü söyle, doğru seçeneğin gerekçesini ve en güçlü çeldiricinin neden yanlış olduğunu açıkla.";
  if (subject) return "Sorunun neyi ölçtüğünü söyle, metinden/bilgiden kanıtla doğru seçeneğe ulaş ve en güçlü çeldiricinin neden yanlış olduğunu açıkla.";
  return "Sorunun türünü belirle ve ona uygun yöntemle çöz; sayısal ise sağla, sözel ise çeldiricileri açıkla.";
}

/**
 * ✨ Adım adım çöz: soru kartını bir öğretmen gibi Türkçe, adım adım çözer.
 * Amaç cevabı vermek değil yöntemi öğretmek: her adımda işlem + neden, sonunda
 * sağlama ve tekrar oturumunda kullanılacak, cevabı ele vermeyen bir ipucu.
 * Yalnızca öğrenci açıkça istediğinde çağrılır.
 */
export async function solveQuestion(input: SolveInput, invoke: typeof invokeLLM = invokeLLM): Promise<AiSolution> {
  const questionText = input.ocrText?.trim();
  if (!input.imageDataUrl && !questionText) throw new Error("Çözülecek soru yok: kartta soru fotoğrafı olmalı.");
  const system = [
    "Bir YKS öğrencisinin çözemediği soruyu sabırlı bir öğretmen gibi ADIM ADIM Türkçe çözüyorsun. Amaç cevabı değil yöntemi öğretmek.",
    `Ders: ${input.subject ?? "belirtilmemiş"}${input.topic ? ` · Konu: ${input.topic}` : ""}. ${subjectGuidance(input.subject)}`,
    "Kurallar:",
    "- method: bu soru tipinde kullanılacak yöntemi tek cümleyle söyle.",
    "- steps: 2–8 adım. work = o adımda yapılan işlem (matematiği düz yazıyla, ör. x^2, √, π); why = bunu NEDEN yaptığın, tek kısa cümle.",
    "- answer: kısa sonuç (çoktan seçmeliyse şık + değer).",
    "- check: sağlama ya da kontrol, tek cümle.",
    "- hint: cevabı ve sonucu ELE VERMEYEN, öğrenciyi doğru yönteme yönelten tek cümle ipucu.",
    "- Öğrenci takıldığı yeri yazdıysa o adımı özellikle açık anlat.",
    "- Soru okunamıyorsa ya da eksikse uydurma: steps içine tek adım olarak neyin okunamadığını yaz, answer boş string.",
  ].join("\n");
  const userText = [
    questionText ? `Sorunun metni (OCR, hatalı olabilir; görsel varsa görsel esastır):\n${questionText.slice(0, 4000)}` : null,
    input.stuckPoint?.trim() ? `Öğrencinin takıldığı yer: "${input.stuckPoint.trim().slice(0, 1500)}"` : null,
  ].filter(Boolean).join("\n\n") || "Soruyu görselden oku ve çöz.";
  const response = await invoke({
    messages: [
      { role: "system", content: system },
      { role: "user", content: input.imageDataUrl ? [{ type: "text" as const, text: userText }, { type: "image_url" as const, image_url: { url: input.imageDataUrl, detail: "high" as const } }] : userText },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "question_solution",
        strict: true,
        schema: {
          type: "object",
          properties: {
            method: { type: "string" },
            steps: { type: "array", items: { type: "object", properties: { work: { type: "string" }, why: { type: "string" } }, required: ["work", "why"], additionalProperties: false } },
            answer: { type: "string" },
            check: { type: "string" },
            hint: { type: "string" },
          },
          required: ["method", "steps", "answer", "check", "hint"],
          additionalProperties: false,
        },
      },
    },
  });
  const raw = response.choices[0]?.message?.content;
  const jsonText = typeof raw === "string" ? raw : raw?.map((part) => (part.type === "text" ? part.text : "")).join("");
  if (!jsonText) throw new Error("AI yanıtı boş döndü.");
  const solution = parseAiSolution(jsonText.replace(/```json|```/g, "").trim());
  if (!solution) throw new Error("AI çözümü okunamadı.");
  return solution;
}
