/**
 * Hata kaydı (Admin → Hatalar) için ortak kurallar: aynı hatanın tek satırda toplanması
 * için parmak izi anahtarı ve tarayıcıdan gelen gürültünün ayıklanması.
 */

export type ErrorSource = "client" | "server";

const MAX_MESSAGE = 500;
const MAX_STACK = 6000;

export const clampMessage = (message: string) => message.trim().slice(0, MAX_MESSAGE) || "(mesajsız hata)";
export const clampStack = (stack: string | null | undefined) => (stack ? stack.slice(0, MAX_STACK) : null);

/** Değişken kısımlar (sayılar, kimlikler) aynı hatayı ayrı satırlara bölmesin. */
export const normalizeMessage = (message: string) =>
  clampMessage(message)
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "<uuid>")
    .replace(/\d+/g, "#");

/**
 * Yığının ilk anlamlı satırı; satır/sütun numarası ve derlemenin dosya adı özeti
 * (index-AbC123xy.js) çıkarılır ki her yayın aynı hatayı yeni bir satır yapmasın.
 */
export function firstStackFrame(stack: string | null | undefined) {
  if (!stack) return "";
  const line = stack.split("\n").map((item) => item.trim()).find((item) => item.startsWith("at ") || item.includes("@")) ?? "";
  return line
    .replace(/https?:\/\/[^/\s)]+/g, "")
    .replace(/\?[^\s):]*/g, "")
    .replace(/-[A-Za-z0-9_]{8}(\.m?js)/g, "$1")
    .replace(/:\d+(:\d+)?/g, "");
}

export const errorFingerprintKey = (source: ErrorSource, message: string, stack: string | null | undefined) =>
  `${source}|${normalizeMessage(message)}|${firstStackFrame(stack)}`;

const IGNORED_MESSAGES = [
  /^ResizeObserver loop/i,
  /^Script error\.?$/i,
  // Ağ kopmaları kod hatası değildir (tRPC/fetch kendi hata mesajını zaten gösterir).
  /^(TypeError: )?(Failed to fetch|Load failed|NetworkError when attempting to fetch resource\.?)$/i,
  /^AbortError/i,
];

/** Tarayıcı eklentilerinden ve ağdan gelen, bizim kodumuzla ilgisi olmayan hatalar. */
export function isIgnoredClientError(message: string, stack: string | null | undefined) {
  if (IGNORED_MESSAGES.some((pattern) => pattern.test(message.trim()))) return true;
  return Boolean(stack && /(chrome|moz|safari(-web)?)-extension:\/\//.test(stack));
}
