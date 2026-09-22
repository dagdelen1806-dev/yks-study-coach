import { FEATURE_KEYS, FEATURE_USAGE_LIMITS, FREE_TIER_LIMITS, featuresForTier, type FeatureKey, type PlanTier } from "../../shared/entitlements";
import { resolveEffectiveStatus, statusGrantsPremiumAccess, type SubscriptionStatus } from "../../shared/subscriptionStateMachine";
import { countFeatureUsage, ensureFreeSubscription, getPlanById, getSubscriptionByUserId, recordFeatureUsage, updateSubscription, writeAuditLog } from "./subscriptionDb";

export type EntitlementSnapshot = {
  tier: PlanTier;
  planCode: string;
  status: SubscriptionStatus;
  isPremium: boolean;
  isTrial: boolean;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  gracePeriodEndsAt: string | null;
  entitlements: FeatureKey[];
};

/**
 * Abonelik satırını okur ve — DB'ye yazmadan önce — salt geçen zamana göre
 * "olması gereken" duruma (resolveEffectiveStatus) senkronize eder. Bu, bir
 * cron/webhook gelmese bile dönem/trial/grace bitişinin bir sonraki
 * istekte otomatik yansımasını sağlar (spec §7: "Fresh Subscription Query").
 */
export async function getCurrentSubscription(userId: number) {
  const subscription = await ensureFreeSubscription(userId);
  const now = new Date();
  const effectiveStatus = resolveEffectiveStatus(
    {
      status: subscription.status,
      trialEndsAt: subscription.trialEndsAt,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: Boolean(subscription.cancelAtPeriodEnd),
      gracePeriodEndsAt: subscription.gracePeriodEndsAt,
    },
    now
  );

  if (effectiveStatus !== subscription.status) {
    const oldState = { status: subscription.status };
    const updated = await updateSubscription(userId, { status: effectiveStatus });
    await writeAuditLog({ userId, action: "status_auto_transitioned", oldState, newState: { status: effectiveStatus }, reason: "resolveEffectiveStatus (zaman bazlı otomatik geçiş)" });
    return updated;
  }

  return subscription;
}

export async function getEntitlements(userId: number): Promise<EntitlementSnapshot> {
  const subscription = await getCurrentSubscription(userId);
  const plan = await getPlanById(subscription.planId);
  const tier: PlanTier = plan?.tier ?? "free";
  const status = subscription.status as SubscriptionStatus;
  const isPremium = tier !== "free" && statusGrantsPremiumAccess(status);

  return {
    tier,
    planCode: plan?.code ?? "FREE",
    status,
    isPremium,
    isTrial: status === "trialing",
    trialEndsAt: subscription.trialEndsAt ? subscription.trialEndsAt.toISOString() : null,
    currentPeriodEnd: subscription.currentPeriodEnd ? subscription.currentPeriodEnd.toISOString() : null,
    cancelAtPeriodEnd: Boolean(subscription.cancelAtPeriodEnd),
    gracePeriodEndsAt: subscription.gracePeriodEndsAt ? subscription.gracePeriodEndsAt.toISOString() : null,
    entitlements: isPremium ? featuresForTier(tier) : [],
  };
}

export async function isPremium(userId: number): Promise<boolean> {
  const snapshot = await getEntitlements(userId);
  return snapshot.isPremium;
}

export async function isTrialing(userId: number): Promise<boolean> {
  const snapshot = await getEntitlements(userId);
  return snapshot.isTrial;
}

export async function isInGracePeriod(userId: number): Promise<boolean> {
  const subscription = await getCurrentSubscription(userId);
  return subscription.status === "grace_period";
}

export async function getSubscriptionState(userId: number): Promise<SubscriptionStatus> {
  const subscription = await getCurrentSubscription(userId);
  return subscription.status as SubscriptionStatus;
}

export async function hasEntitlement(userId: number, feature: FeatureKey): Promise<boolean> {
  const snapshot = await getEntitlements(userId);
  return snapshot.entitlements.includes(feature);
}

export class PremiumRequiredError extends Error {
  constructor(feature: FeatureKey) {
    super(`PREMIUM_REQUIRED: ${feature}`);
    this.name = "PremiumRequiredError";
  }
}

export class UsageLimitExceededError extends Error {
  constructor(feature: FeatureKey, limit: number, windowDays: number) {
    super(`USAGE_LIMIT_EXCEEDED: ${feature} (son ${windowDays} günde en fazla ${limit} kullanım)`);
    this.name = "UsageLimitExceededError";
  }
}

export async function requireEntitlement(userId: number, feature: FeatureKey): Promise<void> {
  const has = await hasEntitlement(userId, feature);
  if (!has) throw new PremiumRequiredError(feature);
}

function limitForTier(feature: FeatureKey, isPremium: boolean) {
  return isPremium ? FEATURE_USAGE_LIMITS[feature] : FREE_TIER_LIMITS[feature];
}

/**
 * Maliyetli ama "hem free hem premium'da erişilebilir, sadece kotası farklı"
 * özellikler için kota KONTROLÜ (spec §32) — kayıt YAPMAZ. AI_STUDY_PLAN ve
 * OCR_EXAM_IMPORT bu kategoridedir (free kullanıcıda da zaten var olan bir
 * özelliği tamamen kapatmak spec §46 "no big-bang damage" ile çelişir).
 *
 * Kayıt BİLEREK burada değil, çağıran tarafın gerçek işlem (ör. LLM çağrısı)
 * BAŞARIYLA bittikten SONRA `recordFeatureUsage`'ı kendisi çağırmasıyla olur
 * (spec §50/§51: "LLM çağrısı başarısız olursa usage yanlışlıkla
 * artırılmamalı"). Bu iki adımlı akış (`assertUsageAvailable` →
 * gerçek çağrı → `recordFeatureUsage`) check-then-act için küçük bir yarış
 * penceresi bırakır (spec §51 "atomic usage") — bu uygulamanın gerçek trafik
 * profilinde (tek kullanıcı, art arda hızlı çift istek olasılığı düşük)
 * kabul edilebilir bir risk; satır kilitleme/transaction eklemek tek
 * kullanıcı senaryosu için orantısız karmaşıklık katar, bkz.
 * docs/admin/ADMIN-COMMAND-CENTER.md "Known limitations".
 */
export async function assertUsageAvailable(userId: number, feature: FeatureKey): Promise<{ isPremium: boolean }> {
  const snapshot = await getEntitlements(userId);
  if (!snapshot.isPremium && !FREE_TIER_LIMITS[feature]) {
    throw new PremiumRequiredError(feature);
  }
  const limit = limitForTier(feature, snapshot.isPremium);
  if (limit) {
    const used = await countFeatureUsage(userId, feature, limit.windowDays);
    if (used >= limit.maxUses) throw new UsageLimitExceededError(feature, limit.maxUses, limit.windowDays);
  }
  return { isPremium: snapshot.isPremium };
}

export type FeatureUsageSummary = {
  feature: FeatureKey;
  used: number;
  limit: number | null; // null = sınırsız
  remaining: number | null;
  windowDays: number | null;
  periodStart: string | null;
  periodEnd: string | null;
};

/** Admin "Usage" kartı ve olası müşteri-yüzü kota göstergesi için — her feature'ın kullanım/kalan/sınırsız durumu. */
export async function getUsageSummaryForUser(userId: number): Promise<FeatureUsageSummary[]> {
  const snapshot = await getEntitlements(userId);
  const summaries: FeatureUsageSummary[] = [];
  for (const feature of FEATURE_KEYS) {
    const limit = limitForTier(feature, snapshot.isPremium);
    if (!limit) {
      // Ya bu tier'da hiç erişimi yok (premium-exclusive + free) ya da gerçekten sınırsız.
      const hasAccess = snapshot.isPremium ? snapshot.entitlements.includes(feature) : Boolean(FREE_TIER_LIMITS[feature]);
      if (!hasAccess) continue;
      summaries.push({ feature, used: 0, limit: null, remaining: null, windowDays: null, periodStart: null, periodEnd: null });
      continue;
    }
    const used = await countFeatureUsage(userId, feature, limit.windowDays);
    const periodStart = new Date(Date.now() - limit.windowDays * 24 * 60 * 60 * 1000);
    summaries.push({ feature, used, limit: limit.maxUses, remaining: Math.max(0, limit.maxUses - used), windowDays: limit.windowDays, periodStart: periodStart.toISOString(), periodEnd: new Date().toISOString() });
  }
  return summaries;
}

export { recordFeatureUsage } from "./subscriptionDb";
