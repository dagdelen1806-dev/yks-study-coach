import { afterEach, describe, expect, it, vi } from "vitest";
import { enhanceDocument, enhancePhoto } from "../client/src/components/books/imageCompression";
import { ENV } from "./_core/env";
import { invokeLLM, LlmUnavailableError, llmUnavailableMessage } from "./_core/llm";

// Yapay zekâ servisi hatası ≠ kötü fotoğraf. Öğrenciye "daha net çek" yalnızca
// görsel gerçekten okunamadığında denmeli.
describe("LLM availability errors", () => {
  const saved = { llmApiKey: ENV.llmApiKey, forgeApiKey: ENV.forgeApiKey, llmApiUrl: ENV.llmApiUrl, llmModel: ENV.llmModel };
  afterEach(() => { Object.assign(ENV, saved); vi.unstubAllGlobals(); });

  it("reports a missing key as a configuration problem, not a photo problem", async () => {
    Object.assign(ENV, { llmApiKey: "", forgeApiKey: "" });
    const error = await invokeLLM({ messages: [{ role: "user", content: "x" }] }).catch((caught) => caught);
    expect(error).toBeInstanceOf(LlmUnavailableError);
    expect(error.reason).toBe("not_configured");
    expect(llmUnavailableMessage(error)).toMatch(/Sorun fotoğrafında değil/);
  });

  it("uses an OpenAI-compatible provider with a default vision model when LLM_API_KEY is set", async () => {
    Object.assign(ENV, { llmApiKey: "test-key", forgeApiKey: "", llmApiUrl: "https://example.test/v1", llmModel: "" });
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: "1", created: 0, model: "m", choices: [{ index: 0, message: { role: "assistant", content: "{}" }, finish_reason: "stop" }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await invokeLLM({ messages: [{ role: "user", content: "x" }] });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://example.test/v1/chat/completions");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer test-key");
    expect(JSON.parse(String(init.body)).model).toBe("gpt-4o-mini");
  });

  it("does not retry a rejected key and maps it to an auth message", async () => {
    Object.assign(ENV, { llmApiKey: "bad", llmApiUrl: "https://example.test/v1" });
    const fetchMock = vi.fn(async () => new Response("invalid key", { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);
    const error = await invokeLLM({ messages: [{ role: "user", content: "x" }] }).catch((caught) => caught);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(error.reason).toBe("auth");
    expect(llmUnavailableMessage(new Error("json parse"))).toBeNull();
  });
});

describe("OCR image enhancement", () => {
  // 480x480 sayfa: soldan sağa kararan aydınlatma (gölge), ortada ince koyu "yazı"
  // satırı, bir köşede soluk arka sayfa izi.
  const makePage = () => {
    const width = 480, height = 480, pixels = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const light = 230 - x * 0.25; // gölge: 230 → 110
      let value = light;
      if (y >= 238 && y < 242) value = light * 0.25; // yazı
      else if (x >= 20 && x < 60 && y >= 20 && y < 60 && (x + y) % 6 < 2) value = light * 0.85; // arka sayfa izi
      const offset = (y * width + x) * 4;
      pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = value;
      pixels[offset + 3] = 255;
    }
    return { pixels, width, height };
  };
  const at = (pixels: Uint8ClampedArray, width: number, x: number, y: number) => pixels[(y * width + x) * 4];

  it("flattens shadows, keeps text dark and drops bleed-through", () => {
    const { pixels, width, height } = makePage();
    enhanceDocument(pixels, width, height);
    // Gölgeli sağ kenardaki kâğıt, aydınlık sol kenar kadar beyaz.
    expect(at(pixels, width, 460, 120)).toBeGreaterThan(240);
    expect(at(pixels, width, 100, 120)).toBeGreaterThan(240);
    // Yazı hem aydınlık hem gölgeli bölgede koyu.
    expect(at(pixels, width, 60, 240)).toBeLessThan(60);
    expect(at(pixels, width, 420, 240)).toBeLessThan(60);
    // Soluk arka sayfa izi beyaza itildi.
    expect(at(pixels, width, 40, 40)).toBeGreaterThan(200);
  });

  it("stretches a washed-out colour photo without touching flat images", () => {
    const pixels = new Uint8ClampedArray(100 * 4);
    for (let index = 0; index < 100; index++) { pixels[index * 4] = 100 + index; pixels[index * 4 + 1] = 150; pixels[index * 4 + 2] = 150; pixels[index * 4 + 3] = 255; }
    enhancePhoto(pixels, 10, 10);
    expect(pixels[0]).toBeLessThan(5);
    expect(pixels[99 * 4]).toBeGreaterThan(250);
    expect(pixels[1]).toBe(150); // düz kanal değişmedi
  });
});
