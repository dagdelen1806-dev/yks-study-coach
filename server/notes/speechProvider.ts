import { transcribeAudioBuffer } from "../_core/voiceTranscription";
import { notesConfig } from "./config";

/**
 * Ses → metin sağlayıcı soyutlaması. Arayüz (UI) sağlayıcıyı bilmez; ayar
 * dosyasından seçilir. Başka bir servise geçmek için yeni bir uygulama yazmak
 * yeterli. Anahtarlar kaynak kodda değil, ortam değişkenlerindedir.
 */
export interface SpeechToTextProvider {
  readonly name: string;
  transcribe(audio: Buffer, mimeType: string): Promise<{ text: string; durationSec: number | null }>;
}

export class SpeechToTextError extends Error {
  constructor(message: string, readonly retryable: boolean) { super(message); }
}

export const whisperSpeechProvider: SpeechToTextProvider = {
  name: "whisper",
  async transcribe(audio, mimeType) {
    const result = await transcribeAudioBuffer(audio, mimeType, { language: notesConfig.speech.language, prompt: notesConfig.speech.prompt });
    if ("error" in result) {
      // Kayıt ya da ses verisi loglanmaz; yalnızca hata kodu.
      console.warn(`[Notes] Transcription failed: ${result.code}`);
      if (result.code === "SERVICE_ERROR" && /not configured|not set/i.test(`${result.error} ${result.details ?? ""}`)) throw new SpeechToTextError("Ses → metin servisi şu an yapılandırılmamış.", false);
      throw new SpeechToTextError("Ses metne çevrilemedi. Tekrar dener misin?", true);
    }
    return { text: result.text.trim(), durationSec: Number.isFinite(result.duration) ? Math.round(result.duration) : null };
  },
};

export const getSpeechProvider = (): SpeechToTextProvider | null => (notesConfig.speech.provider === "whisper" ? whisperSpeechProvider : null);
