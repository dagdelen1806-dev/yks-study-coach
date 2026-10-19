import { and, eq, inArray } from "drizzle-orm";
import webpush from "web-push";
import { pushSubscriptions } from "../../drizzle/schema";
import { getDb } from "../db";

/**
 * Web Push (oturum hatırlatmaları). VAPID anahtarları env'den gelir; tanımlı değilse özellik
 * kapalıdır ve istemci seçeneği hiç göstermez. Anahtar üretmek: `npx web-push generate-vapid-keys`.
 *   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:… ya da https://… iletişim adresi)
 */
const publicKey = process.env.VAPID_PUBLIC_KEY ?? "";
const privateKey = process.env.VAPID_PRIVATE_KEY ?? "";
const subject = process.env.VAPID_SUBJECT || process.env.APP_URL || "https://yks-study-coach.vercel.app";

export const pushConfigured = () => Boolean(publicKey && privateKey);
export const pushPublicKey = () => (pushConfigured() ? publicKey : null);

let vapidSet = false;
const ensureVapid = () => {
  if (!vapidSet) { webpush.setVapidDetails(subject, publicKey, privateKey); vapidSet = true; }
};

export type PushPayload = { title: string; body: string; url: string; tag?: string };
export type BrowserSubscription = { endpoint: string; keys: { p256dh: string; auth: string } };

/** Aynı tarayıcı (endpoint) başka hesapla giriş yaptıysa abonelik o hesaba geçer. */
export async function saveSubscription(userId: number, subscription: BrowserSubscription, userAgent: string | null) {
  const db = await getDb();
  if (!db) return;
  const values = { userId, endpoint: subscription.endpoint, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth, userAgent: userAgent?.slice(0, 300) ?? null };
  await db.insert(pushSubscriptions).values(values).onDuplicateKeyUpdate({ set: { userId, p256dh: values.p256dh, auth: values.auth, userAgent: values.userAgent } });
}

export async function removeSubscription(userId: number, endpoint: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(pushSubscriptions).where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)));
}

export async function hasSubscription(userId: number, endpoint: string) {
  const db = await getDb();
  if (!db) return false;
  const rows = await db.select({ id: pushSubscriptions.id }).from(pushSubscriptions).where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint))).limit(1);
  return rows.length > 0;
}

/** Kullanıcının tüm cihazlarına gönderir; tarayıcının iptal ettiği abonelikleri (404/410) siler. */
export async function sendToUser(userId: number, payload: PushPayload): Promise<{ delivered: number; removed: number; failed: number }> {
  const result = { delivered: 0, removed: 0, failed: 0 };
  const db = await getDb();
  if (!db || !pushConfigured()) return result;
  ensureVapid();
  const subscriptions = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  const gone: number[] = [];
  const delivered: number[] = [];
  await Promise.all(subscriptions.map(async (row) => {
    try {
      // TTL: hatırlatma oturumdan sonra anlamsız; 15 dk içinde teslim edilemezse düşsün.
      await webpush.sendNotification({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, JSON.stringify(payload), { TTL: 15 * 60, urgency: "high" });
      delivered.push(row.id);
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) gone.push(row.id);
      else { result.failed++; console.error(`[Push] subscription ${row.id} failed (${status ?? "?"}):`, error instanceof Error ? error.message : error); }
    }
  }));
  if (gone.length) await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.id, gone));
  if (delivered.length) await db.update(pushSubscriptions).set({ lastSentAt: new Date() }).where(inArray(pushSubscriptions.id, delivered));
  result.delivered = delivered.length;
  result.removed = gone.length;
  return result;
}
