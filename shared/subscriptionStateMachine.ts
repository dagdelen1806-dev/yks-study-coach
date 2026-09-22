export type SubscriptionStatus = "trialing" | "active" | "past_due" | "grace_period" | "canceled" | "expired" | "paused" | "incomplete";

/**
 * Geçerli durum geçişleri (spec §4/§21 — "geçersiz state transition'lara izin
 * verme"). Her satır "bu durumdan buraya geçilebilir" listesidir. `incomplete`
 * yalnızca ilk ödeme onayı beklenirken kullanılır (spec §4: provider
 * lifecycle state'leri için ayrı payment state).
 */
const ALLOWED_TRANSITIONS: Record<SubscriptionStatus, SubscriptionStatus[]> = {
  incomplete: ["active", "canceled", "expired"],
  trialing: ["active", "canceled", "expired"],
  // "active" hem "ücretsiz plan, süresiz aktif" hem "premium, ödeme
  // döngüsünde aktif" durumunu temsil eder — FREE'den PREMIUM trial'ına
  // geçiş (spec §10/§11) bu yüzden active->trialing'i içerir.
  active: ["trialing", "past_due", "canceled", "paused", "expired"],
  past_due: ["active", "grace_period", "canceled", "expired"],
  grace_period: ["active", "expired", "canceled"],
  paused: ["active", "canceled"],
  canceled: ["active"], // resume — yalnızca dönem bitmeden önce (bkz. resolveCancellation)
  expired: ["active", "trialing"], // trialing yalnızca hiç trial kullanmamış (yeni) bir abonelik satırı içindir; gerçek "restart" application katmanında engellenir
};

export function canTransitionSubscriptionStatus(from: SubscriptionStatus, to: SubscriptionStatus): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertValidSubscriptionTransition(from: SubscriptionStatus, to: SubscriptionStatus): void {
  if (!canTransitionSubscriptionStatus(from, to)) {
    throw new Error(`Geçersiz abonelik durum geçişi: ${from} -> ${to}`);
  }
}

export type SubscriptionSnapshot = {
  status: SubscriptionStatus;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  gracePeriodEndsAt: Date | null;
};

/**
 * Bir abonelik satırının, dış bir olay (webhook/cron) beklemeden, salt
 * geçen zamana göre ne duruma gelmesi GEREKTİĞİNİ hesaplar (spec §20/§21 —
 * cancelAtPeriodEnd sırasında dönem sonuna kadar ACTIVE kalmalı, grace period
 * sonunda EXPIRED olmalı). Saf fonksiyon — DB'ye yazmaz, yalnızca "olması
 * gereken" durumu döner; çağıran taraf farklıysa günceller.
 */
export function resolveEffectiveStatus(snapshot: SubscriptionSnapshot, now: Date): SubscriptionStatus {
  const { status, trialEndsAt, currentPeriodEnd, cancelAtPeriodEnd, gracePeriodEndsAt } = snapshot;

  if (status === "trialing" && trialEndsAt && now >= trialEndsAt) return "expired";
  if (status === "grace_period" && gracePeriodEndsAt && now >= gracePeriodEndsAt) return "expired";
  if (status === "active" && cancelAtPeriodEnd && currentPeriodEnd && now >= currentPeriodEnd) return "expired";
  if (status === "active" && !cancelAtPeriodEnd && currentPeriodEnd && now >= currentPeriodEnd) return "past_due";

  return status;
}

/**
 * Bu durumda kullanıcı premium erişime sahip mi? (spec §21: grace period
 * politikası config-driven olmalı — burada tek yer.) `past_due` BİLEREK
 * dışarıda: ilk ödeme hatası anında erişim kesilmez ama premium da devam
 * etmez — asıl tolerans penceresi `grace_period`'dur (spec: "GRACE_PERIOD
 * içinde premium entitlement devam edebilir").
 */
export const PREMIUM_ACCESS_STATUSES: readonly SubscriptionStatus[] = ["trialing", "active", "grace_period"];

export function statusGrantsPremiumAccess(status: SubscriptionStatus): boolean {
  return PREMIUM_ACCESS_STATUSES.includes(status);
}
