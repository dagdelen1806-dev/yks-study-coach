import { ENV } from "./env";
import { resolveLlmTarget } from "./llm";

/**
 * Ses → metin: OpenAI uyumlu sağlayıcıda `/audio/transcriptions` (Whisper); Gemini'de
 * `generateContent` ile ses anlama (bkz. transcribeWithGemini). Anahtar ve adres LLM_*
 * ortam değişkenlerinden gelir (bkz. env.ts); model TRANSCRIBE_MODEL ile değiştirilebilir.
 */

export type WhisperSegment = {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
};

export type WhisperResponse = {
  task?: "transcribe";
  language?: string;
  duration?: number;
  text: string;
  segments?: WhisperSegment[];
};

export type TranscriptionResponse = WhisperResponse;

export type TranscriptionError = {
  error: string;
  code: "FILE_TOO_LARGE" | "INVALID_FORMAT" | "TRANSCRIPTION_FAILED" | "UPLOAD_FAILED" | "SERVICE_ERROR";
  details?: string;
};

const MAX_AUDIO_BYTES = 16 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  "audio/webm": "webm",
  "audio/mp3": "mp3",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/wave": "wav",
  "audio/ogg": "ogg",
  "audio/m4a": "m4a",
  "audio/mp4": "m4a",
};

/**
 * Gemini'de OpenAI uyumlu `/audio/transcriptions` (Whisper) ucu yok: ses, Gemini'nin kendi
 * `generateContent` ucuna satır içi veri olarak gönderilir ve modelden kelimesi kelimesine
 * döküm istenir. Süre bilgisi dönmez (istemci kaydın süresini zaten biliyor).
 */
async function transcribeWithGemini(audio: Buffer, mimeType: string, key: string, model: string, options: { language?: string; prompt?: string }, fetchImpl: typeof fetch = fetch): Promise<TranscriptionResponse | TranscriptionError> {
  const language = options.language === "tr" || !options.language ? "Türkçe" : options.language;
  // Whisper'a verilen "bağlam" ipucu (options.prompt) Gemini'ye BİLEREK gönderilmez: konuşma
  // olmayan bir kayıtta model o bağlama uygun bir cümle uyduruyordu (canlı testte bip sesi →
  // "Özne yüklem ilişkisi."). Model önce konuşma olup olmadığını söyler; yoksa metin boş kalır.
  const instruction = [
    `Bu ses kaydını dinle. İçinde anlaşılır ${language} konuşma varsa kelimesi kelimesine yazıya dök.`,
    "Yalnızca gerçekten duyduğun sözleri yaz; tahmin etme, tamamlama, özetleme. Matematik ifadelerini düz yazıyla yaz (ör. x kare → x^2).",
    "Kayıtta konuşma yoksa (sessizlik, gürültü, müzik, bip sesi) hasSpeech=false ve text boş olsun.",
  ].join(" ");
  const response = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: instruction }, { inline_data: { mime_type: mimeType, data: audio.toString("base64") } }] }],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: { type: "OBJECT", properties: { hasSpeech: { type: "BOOLEAN" }, text: { type: "STRING" } }, required: ["hasSpeech", "text"] },
      },
    }),
  });
  if (!response.ok) {
    const errorText = (await response.text().catch(() => "")).replace(/AIza[0-9A-Za-z_\-]{10,}/g, "[redacted]");
    return { error: "Transcription service request failed", code: "TRANSCRIPTION_FAILED", details: `${response.status} ${response.statusText}${errorText ? `: ${errorText.slice(0, 300)}` : ""}` };
  }
  const result = (await response.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> } }> };
  const parts = result.candidates?.[0]?.content?.parts ?? [];
  const raw = parts.filter((part) => !part.thought && typeof part.text === "string").map((part) => part.text).join("").trim();
  let parsed: { hasSpeech?: unknown; text?: unknown };
  try { parsed = JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, "")); } catch { return { error: "Invalid transcription response", code: "SERVICE_ERROR" }; }
  const text = parsed.hasSpeech === true && typeof parsed.text === "string" ? parsed.text.trim() : "";
  return { task: "transcribe", language: options.language, text };
}

export async function transcribeAudioBuffer(audio: Buffer, mimeType: string, options: { language?: string; prompt?: string } = {}, fetchImpl: typeof fetch = fetch): Promise<TranscriptionResponse | TranscriptionError> {
  const target = resolveLlmTarget();
  if (!target) return { error: "Voice transcription service is not configured", code: "SERVICE_ERROR", details: "LLM_API_KEY is not set" };
  if (audio.length > MAX_AUDIO_BYTES) return { error: "Audio file exceeds maximum size limit", code: "FILE_TOO_LARGE" };
  if (target.baseUrl.includes("generativelanguage.googleapis.com")) {
    try {
      return await transcribeWithGemini(audio, mimeType.split(";")[0].trim() || "audio/webm", target.key, ENV.transcribeModel?.startsWith("gemini") ? ENV.transcribeModel : target.model, options, fetchImpl);
    } catch (error) {
      return { error: "Voice transcription failed", code: "SERVICE_ERROR", details: error instanceof Error ? error.message : "Unknown error" };
    }
  }
  try {
    const baseMime = mimeType.split(";")[0].trim();
    const formData = new FormData();
    formData.append("file", new Blob([new Uint8Array(audio)], { type: baseMime }), `audio.${EXTENSIONS[baseMime] ?? "webm"}`);
    const model = ENV.transcribeModel || "whisper-1";
    formData.append("model", model);
    // verbose_json süreyi de döndürür; yalnızca whisper-1 destekliyor.
    formData.append("response_format", model === "whisper-1" ? "verbose_json" : "json");
    if (options.language) formData.append("language", options.language);
    if (options.prompt) formData.append("prompt", options.prompt);

    const response = await fetchImpl(`${target.baseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: { authorization: `Bearer ${target.key}` },
      body: formData,
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return { error: "Transcription service request failed", code: "TRANSCRIPTION_FAILED", details: `${response.status} ${response.statusText}${errorText ? `: ${errorText.slice(0, 300)}` : ""}` };
    }
    const result = (await response.json()) as WhisperResponse;
    if (typeof result.text !== "string") return { error: "Invalid transcription response", code: "SERVICE_ERROR" };
    return result;
  } catch (error) {
    return { error: "Voice transcription failed", code: "SERVICE_ERROR", details: error instanceof Error ? error.message : "Unknown error" };
  }
}
