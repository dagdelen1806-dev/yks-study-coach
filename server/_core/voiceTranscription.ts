import { ENV } from "./env";
import { resolveLlmTarget } from "./llm";

/**
 * Ses → metin: yapay zekâ sağlayıcısının OpenAI uyumlu `/audio/transcriptions`
 * uç noktası (OpenAI Whisper). Anahtar ve adres LLM_* ortam değişkenlerinden
 * gelir (bkz. env.ts); model TRANSCRIBE_MODEL ile değiştirilebilir.
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

export async function transcribeAudioBuffer(audio: Buffer, mimeType: string, options: { language?: string; prompt?: string } = {}): Promise<TranscriptionResponse | TranscriptionError> {
  const target = resolveLlmTarget();
  if (!target) return { error: "Voice transcription service is not configured", code: "SERVICE_ERROR", details: "LLM_API_KEY is not set" };
  if (audio.length > MAX_AUDIO_BYTES) return { error: "Audio file exceeds maximum size limit", code: "FILE_TOO_LARGE" };
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

    const response = await fetch(`${target.baseUrl}/audio/transcriptions`, {
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
