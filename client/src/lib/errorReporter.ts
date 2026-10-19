import { isIgnoredClientError } from "@shared/errorLog";

// Tarayıcıdaki yakalanmamış hatalar Admin → Hatalar'a gider. Aynı hata bir oturumda bir kez,
// oturum başına en fazla 20 rapor: döngüye giren bir hata sunucuyu doldurmasın.
const MAX_REPORTS = 20;
const seen = new Set<string>();

export function reportClientError(error: unknown, extraStack?: string) {
  try {
    const err = error instanceof Error ? error : new Error(typeof error === "string" ? error : JSON.stringify(error) ?? "Bilinmeyen hata");
    const stack = [err.stack, extraStack].filter(Boolean).join("\n--- component stack ---\n") || null;
    const message = err.message || String(error);
    if (isIgnoredClientError(message, stack)) return;
    const key = `${message}|${stack?.split("\n")[1] ?? ""}`;
    if (seen.has(key) || seen.size >= MAX_REPORTS) return;
    seen.add(key);
    void fetch("/api/errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      keepalive: true,
      body: JSON.stringify({ message: message.slice(0, 2000), stack: stack?.slice(0, 20000) ?? null, path: `${window.location.pathname}${window.location.search}`.slice(0, 300) }),
    }).catch(() => undefined);
  } catch {
    // Raporlama asla yeni bir hata üretmemeli.
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("error", (event) => reportClientError(event.error ?? event.message));
  window.addEventListener("unhandledrejection", (event) => reportClientError(event.reason));
}
