import { ENV } from "./env";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4" ;
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  model?: string;
  thinking?: Record<string, unknown>;
  reasoning?: Record<string, unknown>;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

const ensureArray = (
  value: MessageContent | MessageContent[]
): MessageContent[] => (Array.isArray(value) ? value : [value]);

const normalizeContentPart = (
  part: MessageContent
): TextContent | ImageContent | FileContent => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }

  if (part.type === "text") {
    return part;
  }

  if (part.type === "image_url") {
    return part;
  }

  if (part.type === "file_url") {
    return part;
  }

  throw new Error("Unsupported message content part");
};

const normalizeMessage = (message: Message) => {
  const { role, name, tool_call_id } = message;

  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content)
      .map(part => (typeof part === "string" ? part : JSON.stringify(part)))
      .join("\n");

    return {
      role,
      name,
      tool_call_id,
      content,
    };
  }

  const contentParts = ensureArray(message.content).map(normalizeContentPart);

  // If there's only text content, collapse to a single string for compatibility
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text,
    };
  }

  return {
    role,
    name,
    content: contentParts,
  };
};

const normalizeToolChoice = (
  toolChoice: ToolChoice | undefined,
  tools: Tool[] | undefined
): "none" | "auto" | ToolChoiceExplicit | undefined => {
  if (!toolChoice) return undefined;

  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }

  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }

    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }

    return {
      type: "function",
      function: { name: tools[0].function.name },
    };
  }

  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name },
    };
  }

  return toolChoice;
};

/**
 * Yapay zekâ servisine ulaşılamadığında atılır. `reason` kullanıcıya doğru mesajı
 * göstermek için: "fotoğraf net değil" demek yalnızca görsel gerçekten
 * okunamadıysa doğru — servis kapalı/anahtar hatalıysa öğrenciyi boşuna yeniden çektirir.
 */
export class LlmUnavailableError extends Error {
  constructor(readonly reason: "not_configured" | "auth" | "quota" | "too_large" | "provider", message: string, readonly status?: number) {
    super(message);
    this.name = "LlmUnavailableError";
  }
}

/** OpenAI uyumlu sağlayıcı: `baseUrl` + /chat/completions, /models, /audio/transcriptions. */
export type LlmTarget = { baseUrl: string; chatUrl: string; modelsUrl: string; key: string; model: string };

export const DEFAULT_LLM_API_URL = "https://api.openai.com/v1";
export const DEFAULT_LLM_MODEL = "gpt-4o-mini";

/** LLM_API_KEY / OPENAI_API_KEY tanımlı değilse null (yapay zekâ özellikleri kapalı). */
export const GEMINI_OPENAI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";
export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

/**
 * Ayarlardaki yaygın hatalar düzeltilir (404'e yol açanlar): adresin sonuna
 * yapıştırılmış "/chat/completions", Gemini adresinde eksik "/v1beta/openai",
 * "models/" önekli model adı, Gemini anahtarı / adresiyle Gemini olmayan model.
 */
export function normalizeLlmSettings(rawUrl: string, rawModel: string, key: string): { baseUrl: string; model: string } {
  let baseUrl = (rawUrl || "").trim().replace(/\/+$/, "").replace(/\/chat\/completions$/, "").replace(/\/+$/, "");
  let model = (rawModel || "").trim().replace(/^models\//, "");
  // Google AI Studio anahtarları "AIza" ile başlar; adres verilmediyse Gemini'ye yönlen.
  const geminiKey = key.trim().startsWith("AIza");
  if (!baseUrl) baseUrl = geminiKey ? GEMINI_OPENAI_BASE_URL : DEFAULT_LLM_API_URL;
  if (baseUrl.includes("generativelanguage.googleapis.com")) {
    baseUrl = GEMINI_OPENAI_BASE_URL;
    // Gemini'de olmayan (gpt-…) ya da kullanımdan kalkmış (gemini-1.0/1.5, gemini-pro) model → güncel varsayılan.
    if (!model.startsWith("gemini") || /^gemini-(1\.0|1\.5|pro($|-))/.test(model)) model = DEFAULT_GEMINI_MODEL;
  }
  return { baseUrl, model: model || DEFAULT_LLM_MODEL };
}

export const resolveLlmTarget = (): LlmTarget | null => {
  if (!ENV.llmApiKey) return null;
  const { baseUrl, model } = normalizeLlmSettings(ENV.llmApiUrl, ENV.llmModel, ENV.llmApiKey);
  return { baseUrl, chatUrl: `${baseUrl}/chat/completions`, modelsUrl: `${baseUrl}/models`, key: ENV.llmApiKey.trim(), model };
};

export const isLlmConfigured = () => resolveLlmTarget() !== null;

const requireTarget = (): LlmTarget => {
  const target = resolveLlmTarget();
  if (!target) throw new LlmUnavailableError("not_configured", "LLM is not configured (set LLM_API_KEY or OPENAI_API_KEY)");
  return target;
};

/** Servis kaynaklı hatalar için öğrenciye gösterilecek Türkçe mesaj; görselle ilgili bir hataysa null. */
export function llmUnavailableMessage(error: unknown): string | null {
  if (!(error instanceof LlmUnavailableError)) return null;
  switch (error.reason) {
    case "not_configured": return "Fotoğraf okuma (yapay zekâ) servisi sunucuda henüz açılmamış. Sorun fotoğrafında değil — yönetici LLM_API_KEY ayarını yapınca çalışacak. Şimdilik bilgileri elle girebilirsin.";
    case "auth": return "Fotoğraf okuma servisinin anahtarı geçersiz. Sorun fotoğrafında değil; yöneticiye haber ver.";
    case "quota": return "Fotoğraf okuma servisi şu an yoğun ya da kotası doldu. Birkaç dakika sonra tekrar dener misin?";
    case "too_large": return "Fotoğraf servis için çok büyük. Daha küçük bir fotoğrafla ya da kırparak tekrar dener misin?";
    default:
      // 400/404: istek reddedildi → çoğunlukla model adı ya da LLM_API_URL hatalı (yönetici ayarı). Kod, teşhis için gösterilir.
      if (error.status === 400 || error.status === 404 || error.status === 422) return `Yapay zekâ sağlayıcısı isteği reddetti (kod ${error.status}). Sorun fotoğrafında değil; yönetici LLM_MODEL / LLM_API_URL ayarını kontrol etmeli (Admin → Yapay zekâ bağlantı testi).`;
      return `Fotoğraf okuma servisine şu an ulaşılamıyor${error.status ? ` (kod ${error.status})` : ""}. Sorun fotoğrafında değil; biraz sonra tekrar dener misin?`;
  }
}

const errorForStatus =(status: number, detail: string) => {
  const reason = status === 401 || status === 403 ? "auth" : status === 402 || status === 429 ? "quota" : status === 413 ? "too_large" : "provider";
  // Sağlayıcı hata metni (ör. 401'de maskelenmiş anahtar "sk-...abcd") loglara/yanıtlara anahtar parçası taşımasın.
  const safeDetail = detail.replace(/\b(sk-[A-Za-z0-9_*.\-]{4,}|AIza[0-9A-Za-z_\-]{10,}|Bearer\s+\S+)/g, "[redacted]");
  return new LlmUnavailableError(reason, `LLM invoke failed: ${status} – ${safeDetail.slice(0, 500)}`, status);
};

const normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema,
}: {
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
}):
  | { type: "json_schema"; json_schema: JsonSchema }
  | { type: "text" }
  | { type: "json_object" }
  | undefined => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (
      explicitFormat.type === "json_schema" &&
      !explicitFormat.json_schema?.schema
    ) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }

  const schema = outputSchema || output_schema;
  if (!schema) return undefined;

  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }

  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...(typeof schema.strict === "boolean" ? { strict: schema.strict } : {}),
    },
  };
};

const RETRY_MAX_RETRIES = 4;
const RETRY_BASE_DELAY_MS = 500;
const RETRY_MAX_DELAY_MS = 30_000;

type FetchInit = NonNullable<Parameters<typeof fetch>[1]>;

const sleep = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms));

const parseRetryAfter = (value: string | null): number | undefined => {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const at = Date.parse(value);
  return Number.isNaN(at) ? undefined : Math.max(0, at - Date.now());
};

// Equal-jitter exponential backoff. The cap/2 floor guarantees a minimum
// delay so a misbehaving caller loop slows down instead of hammering the
// upstream while it keeps returning errors.
const computeBackoffDelay = (
  attempt: number,
  retryAfterMs?: number
): number => {
  const cap = Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt, RETRY_MAX_DELAY_MS);
  const jittered = cap / 2 + Math.random() * (cap / 2);
  return Math.min(Math.max(jittered, retryAfterMs ?? 0), RETRY_MAX_DELAY_MS);
};

// Retries non-2xx responses and network errors with exponential backoff, then
// returns the final Response so callers keep their existing error handling.
const fetchWithBackoff = async (
  url: string,
  init: FetchInit
): Promise<Response> => {
  let lastError: unknown;

  for (let attempt = 0; attempt <= RETRY_MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, init);
      // 400/401/403/413 gibi hatalar tekrar denemekle düzelmez; yalnızca geçici olanlar (408/409/429/5xx) denenir.
      // (Vercel fonksiyonu 60 sn ile sınırlı — boşuna bekleme zaman aşımına yol açıyordu.)
      const transient = response.status === 408 || response.status === 409 || response.status === 429 || response.status >= 500;
      if (response.ok || !transient || attempt === RETRY_MAX_RETRIES) {
        return response;
      }

      const retryAfterMs = parseRetryAfter(
        response.headers.get("retry-after")
      );
      try {
        await response.body?.cancel();
      } catch {
        // Body already settled; nothing to clean up.
      }
      console.warn(
        `LLM request retry ${attempt + 1}/${RETRY_MAX_RETRIES} after status ${response.status}`
      );
      await sleep(computeBackoffDelay(attempt, retryAfterMs));
    } catch (error) {
      lastError = error;
      if (attempt === RETRY_MAX_RETRIES) throw error;
      console.warn(
        `LLM request retry ${attempt + 1}/${RETRY_MAX_RETRIES} after network error`
      );
      await sleep(computeBackoffDelay(attempt));
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("LLM request failed after exhausting retries");
};

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const target = requireTarget();

  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
    model,
    thinking,
    reasoning,
    maxTokens,
    max_tokens,
  } = params;

  const payload: Record<string, unknown> = {
    messages: messages.map(normalizeMessage),
  };

  payload.model = model || target.model;

  if (tools && tools.length > 0) {
    payload.tools = tools;
  }

  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }

  const resolvedMaxTokens = max_tokens ?? maxTokens;
  if (typeof resolvedMaxTokens === "number") {
    payload.max_tokens = resolvedMaxTokens;
  }

  if (thinking) {
    payload.thinking = thinking;
  }
  if (reasoning) {
    payload.reasoning = reasoning;
  }

  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema,
  });

  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }

  const send = async (body: Record<string, unknown>) => {
    try {
      return await fetchWithBackoff(target.chatUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${target.key}`,
        },
        body: JSON.stringify(body),
      });
    } catch (error) {
      throw new LlmUnavailableError("provider", `LLM request failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  let response = await send(payload);

  // Bazı OpenAI uyumlu sağlayıcılar (ör. Gemini) katı `json_schema` biçimini ya da
  // şemadaki bazı yapıları (["string","null"] birleşik tipleri) kabul etmez ve 400 döner.
  // Bu durumda bir kez `json_object` moduna geçilir; şema talimat olarak verilir.
  const format = payload.response_format as { type?: string; json_schema?: { schema?: unknown } } | undefined;
  if (response.status === 400 && format?.type === "json_schema") {
    const firstError = await response.text().catch(() => "");
    console.warn(`[LLM] json_schema rejected (400), retrying with json_object: ${firstError.slice(0, 200).replace(/\b(sk-[A-Za-z0-9_*.\-]{4,}|AIza[0-9A-Za-z_\-]{10,})/g, "[redacted]")}`);
    const schemaHint = { role: "system", content: `Yanıtı YALNIZCA şu JSON şemasına uyan geçerli bir JSON nesnesi olarak ver (açıklama, kod bloğu yok): ${JSON.stringify(format.json_schema?.schema ?? {})}` };
    response = await send({ ...payload, messages: [schemaHint, ...(payload.messages as unknown[])], response_format: { type: "json_object" } });
  }

  if (!response.ok) {
    throw errorForStatus(response.status, await response.text().catch(() => ""));
  }

  const result = (await response.json()) as InvokeResult;
  // JSON istendiyse, yanıtı ```json … ``` bloğuna saran sağlayıcılar için bloğu soy.
  if (payload.response_format) {
    for (const choice of result.choices ?? []) {
      const content = choice.message?.content;
      if (typeof content === "string") choice.message.content = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    }
  }
  return result;
}

export type ModelInfo = {
  id: string;
  object: string;
  created: number;
  owned_by: string;
};

export type ModelsResponse = {
  object: string;
  data: ModelInfo[];
};

export async function listLLMModels(): Promise<ModelsResponse> {
  const target = requireTarget();

  const response = await fetchWithBackoff(target.modelsUrl, {
    headers: { authorization: `Bearer ${target.key}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `List LLM models failed: ${response.status} ${response.statusText} – ${errorText}`
    );
  }

  return (await response.json()) as ModelsResponse;
}
