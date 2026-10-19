import { isIos, isStandalone } from "./installPrompt";

/**
 * Oturum hatırlatmaları için tarayıcı tarafı: servis çalışanı kaydı ve Web Push aboneliği.
 * iPhone/iPad'de bildirim yalnızca ana ekrana eklenmiş (uygulama gibi açılan) Pusula'da çalışır.
 */
export type PushSupport = "supported" | "ios-needs-install" | "unsupported";

export function pushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported";
  const apis = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (isIos() && !isStandalone()) return "ios-needs-install";
  return apis ? "supported" : "unsupported";
}

export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => { navigator.serviceWorker.register("/sw.js").catch(() => undefined); });
}

const toUint8 = (base64Url: string) => {
  const base64 = (base64Url + "=".repeat((4 - (base64Url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
};

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (pushSupport() !== "supported") return null;
  const registration = await navigator.serviceWorker.getRegistration("/");
  return registration ? registration.pushManager.getSubscription() : null;
}

/** İzin ister ve abone olur. İzin verilmezse "denied" döner (tarayıcı ayarından açılmalı). */
export async function subscribePush(publicKey: string): Promise<PushSubscriptionJSON | "denied"> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied";
  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription = existing ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toUint8(publicKey) });
  return subscription.toJSON();
}

export async function unsubscribePush(): Promise<string | null> {
  const subscription = await currentSubscription();
  if (!subscription) return null;
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe().catch(() => undefined);
  return endpoint;
}
