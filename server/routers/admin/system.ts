import { ENV } from "../../_core/env";
import { invokeLLM, LlmUnavailableError, resolveLlmTarget } from "../../_core/llm";
import { adminProcedure, router } from "../../_core/trpc";
import { encodeGrayToJpegDataUrl } from "../../bookContent/imageCodec";
import { createGray } from "../../../shared/imaging/image";

type CheckResult = { ok: boolean; ms: number; status: number | null; error: string | null };

const redact = (text: string) => text.replace(/\b(sk-[A-Za-z0-9_*.\-]{4,}|AIza[0-9A-Za-z_\-]{10,}|Bearer\s+\S+)/g, "[redacted]");

async function check(run: () => Promise<unknown>): Promise<CheckResult> {
  const started = Date.now();
  try {
    await run();
    return { ok: true, ms: Date.now() - started, status: null, error: null };
  } catch (error) {
    return { ok: false, ms: Date.now() - started, status: error instanceof LlmUnavailableError ? error.status ?? null : null, error: redact(error instanceof Error ? error.message : String(error)).slice(0, 400) };
  }
}

/** Yaygın ayar hataları için ipuçları (anahtarın kendisi hiçbir zaman döndürülmez). */
function configHints(baseUrl: string, model: string): string[] {
  const hints: string[] = [];
  if (/\/chat\/completions\/?$/.test(baseUrl)) hints.push("LLM_API_URL '/chat/completions' ile bitmemeli; yalnızca kök adres (ör. https://api.openai.com/v1).");
  if (!/^https:\/\//.test(baseUrl)) hints.push("LLM_API_URL https:// ile başlamalı.");
  if (baseUrl.includes("generativelanguage.googleapis.com")) {
    if (!baseUrl.endsWith("/v1beta/openai")) hints.push("Gemini için LLM_API_URL tam olarak https://generativelanguage.googleapis.com/v1beta/openai olmalı.");
    if (!model.startsWith("gemini")) hints.push(`Gemini adresiyle '${model}' modeli kullanılamaz; LLM_MODEL örn. gemini-2.5-flash olmalı.`);
  }
  if (baseUrl.includes("api.openai.com") && model.startsWith("gemini")) hints.push("OpenAI adresiyle Gemini modeli kullanılamaz; LLM_MODEL örn. gpt-4o-mini olmalı.");
  if (/\s/.test(model)) hints.push("LLM_MODEL değerinde boşluk var.");
  return hints;
}

/**
 * Yapay zekâ bağlantı testi (yalnızca admin): ayarların özeti + üç küçük gerçek
 * çağrı (düz metin, JSON şema, görsel). Hata kodu ve sağlayıcının açıklaması
 * (anahtar parçaları maskelenmiş) gösterilir; anahtarın kendisi asla döndürülmez.
 */
export const adminSystemRouter = router({
  llmHealth: adminProcedure.mutation(async () => {
    const target = resolveLlmTarget();
    const config = {
      configured: Boolean(target),
      keyLength: ENV.llmApiKey ? ENV.llmApiKey.trim().length : 0,
      keyHasWhitespace: ENV.llmApiKey !== ENV.llmApiKey.trim() || /\s/.test(ENV.llmApiKey.trim()),
      baseUrl: target?.baseUrl ?? null,
      model: target?.model ?? null,
      usingDefaultUrl: !ENV.llmApiUrl,
      usingDefaultModel: !ENV.llmModel,
      transcribeModel: ENV.transcribeModel || "whisper-1",
    };
    if (!target) return { config, hints: ["LLM_API_KEY (ya da OPENAI_API_KEY) tanımlı değil ya da bu deploy'a ulaşmadı — Vercel'de ekledikten sonra Redeploy gerekir."], checks: null };
    const hints = configHints(target.baseUrl, target.model);
    if (config.keyHasWhitespace) hints.push("LLM_API_KEY değerinde boşluk/satır sonu var; Vercel'de yeniden, boşluksuz yapıştır.");

    const text = await check(() => invokeLLM({ messages: [{ role: "user", content: "Yalnızca OK yaz." }], max_tokens: 5 }));
    const json = await check(() => invokeLLM({
      messages: [{ role: "user", content: "{\"sonuc\": \"tamam\", \"sayi\": null} döndür." }],
      response_format: { type: "json_schema", json_schema: { name: "health", strict: true, schema: { type: "object", properties: { sonuc: { type: "string" }, sayi: { type: ["integer", "null"] } }, required: ["sonuc", "sayi"], additionalProperties: false } } },
    }));
    const image = encodeGrayToJpegDataUrl(createGray(64, 64, 230), 80);
    const vision = await check(() => invokeLLM({ messages: [{ role: "user", content: [{ type: "text", text: "Bu görselin rengi ne? Tek kelime." }, { type: "image_url", image_url: { url: image, detail: "low" } }] }], max_tokens: 10 }));
    return { config, hints, checks: { text, json, vision } };
  }),
});
