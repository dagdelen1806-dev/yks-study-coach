import { useEffect, useState } from "react";

// Tarayıcının "uygulamayı yükle" olayı sayfa açılır açılmaz gelir; Genel Bakış daha sonra
// yüklendiği için olay burada, main.tsx içe aktarırken yakalanıp saklanır.
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event as InstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => { deferred = null; notify(); });
}

export const isStandalone = () =>
  typeof window !== "undefined" && (window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);

export const isIos = () => typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);

/** Yükleme isteği varsa `install` onu açar; yoksa null (iOS ya da zaten yüklü). */
export function useInstallPrompt() {
  const [, rerender] = useState(0);
  useEffect(() => {
    const listener = () => rerender((value) => value + 1);
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);
  const install = deferred
    ? async () => {
        const event = deferred;
        if (!event) return false;
        await event.prompt();
        const { outcome } = await event.userChoice;
        deferred = null;
        notify();
        return outcome === "accepted";
      }
    : null;
  return { install, installed: isStandalone() };
}
