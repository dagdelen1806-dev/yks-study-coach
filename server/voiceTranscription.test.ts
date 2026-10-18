import { describe, expect, it, vi } from "vitest";

// Gemini anahtarıyla çalışan ortam: ses Whisper ucuna değil Gemini generateContent'e gider.
vi.stubEnv("GEMINI_API_KEY", "AIzaTEST_KEY_1234567890");
vi.stubEnv("LLM_API_URL", "https://generativelanguage.googleapis.com/v1beta/openai");
vi.stubEnv("LLM_MODEL", "gemini-3.8-flash");
const { transcribeAudioBuffer } = await import("./_core/voiceTranscription");

const okReply = (text: string) => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "düşünce", thought: true }, { text }] } }] }), { status: 200, headers: { "content-type": "application/json" } });

describe("transcribeAudioBuffer on Gemini", () => {
  it("sends the audio inline to generateContent and returns the spoken text only", async () => {
    const fetchImpl = vi.fn(async () => okReply("  Türev konusunu tekrar et.  "));
    const result = await transcribeAudioBuffer(Buffer.from("fake-audio"), "audio/webm;codecs=opus", { language: "tr" }, fetchImpl as unknown as typeof fetch);
    expect(result).toMatchObject({ text: "Türev konusunu tekrar et." });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent");
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("AIzaTEST_KEY_1234567890");
    const body = JSON.parse(String(init.body));
    expect(body.contents[0].parts[1].inline_data).toEqual({ mime_type: "audio/webm", data: Buffer.from("fake-audio").toString("base64") });
    expect(url).not.toContain("audio/transcriptions");
  });

  it("reports a provider error without leaking the key", async () => {
    const fetchImpl = vi.fn(async () => new Response("bad key AIzaTEST_KEY_1234567890", { status: 400, statusText: "Bad Request" }));
    const result = await transcribeAudioBuffer(Buffer.from("x"), "audio/webm", {}, fetchImpl as unknown as typeof fetch);
    expect(result).toMatchObject({ code: "TRANSCRIPTION_FAILED" });
    expect(JSON.stringify(result)).not.toContain("AIzaTEST_KEY");
  });

  it("rejects oversized audio before calling the provider", async () => {
    const fetchImpl = vi.fn();
    const result = await transcribeAudioBuffer(Buffer.alloc(17 * 1024 * 1024), "audio/webm", {}, fetchImpl as unknown as typeof fetch);
    expect(result).toMatchObject({ code: "FILE_TOO_LARGE" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
