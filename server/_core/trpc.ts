import { APPROVAL_PENDING_ERR_MSG, APPROVAL_REJECTED_ERR_MSG, EMAIL_UNVERIFIED_ERR_MSG, NOT_ADMIN_ERR_MSG, PREMIUM_REQUIRED_ERR_MSG, RATE_LIMITED_ERR_MSG, UNAUTHED_ERR_MSG, needsEmailVerification } from '@shared/const';
import type { FeatureKey } from '@shared/entitlements';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { RateLimitExceededError, checkRateLimit } from "./rateLimit";
import { PremiumRequiredError, UsageLimitExceededError, assertUsageAvailable, hasEntitlement, recordFeatureUsage } from "../subscriptions/entitlementService";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

// Onay bekleyen/reddedilmiş bir hesabın yine de çağırabilmesi gereken minimum
// yüzey — aksi halde "kaydınız onay bekliyor" ekranını göstermek için gereken
// `auth.me`/`auth.logout` bile bloklanır. Bkz. client/src/App.tsx AppGate.
// E-posta doğrulama ekranının ("E-postanı doğrula") ihtiyaç duyduğu uçlar da
// aynı şekilde kapıdan muaf; bkz. server/_core/emailVerification.ts.
const APPROVAL_GATE_ALLOWLIST = new Set(["auth.me", "auth.logout", "auth.resendVerificationEmail"]);

const requireUser = t.middleware(async opts => {
  const { ctx, next, path } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  // Sıra bilinçli: önce e-posta doğrulaması, sonra admin onayı — doğrulanmamış
  // (belki sahte) bir adresin admin onay kuyruğunda beklemesinin anlamı yok.
  if (!APPROVAL_GATE_ALLOWLIST.has(path) && needsEmailVerification(ctx.user)) {
    throw new TRPCError({ code: "FORBIDDEN", message: EMAIL_UNVERIFIED_ERR_MSG });
  }

  if (!APPROVAL_GATE_ALLOWLIST.has(path) && ctx.user.approvalStatus !== "approved") {
    const message = ctx.user.approvalStatus === "rejected" ? APPROVAL_REJECTED_ERR_MSG : APPROVAL_PENDING_ERR_MSG;
    throw new TRPCError({ code: "FORBIDDEN", message });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    // Doğrulanmamış e-posta hesabı hiçbir koşulda admin uçlarına erişemez
    // (admin rolü zaten doğrulamadan önce verilmiyor; bu ikinci bir emniyet).
    if (!ctx.user || ctx.user.role !== 'admin' || needsEmailVerification(ctx.user)) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

/**
 * Belirli bir premium özelliği gerektiren procedure'lar için (spec §7/§8).
 * `protectedProcedure`'ın üstüne biner (giriş + onay kontrolü zaten var),
 * ayrıca DB'den TAZE entitlement sorgular — JWT'ye "isPremium" gömülü değil,
 * her istekte gerçek subscription durumuna bakılır (spec §33).
 */
export function entitlementProcedure(feature: FeatureKey) {
  return protectedProcedure.use(
    t.middleware(async opts => {
      const { ctx, next } = opts;
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
      const allowed = await hasEntitlement(ctx.user.id, feature);
      if (!allowed) {
        throw new TRPCError({ code: "FORBIDDEN", message: PREMIUM_REQUIRED_ERR_MSG });
      }
      return next({ ctx });
    })
  );
}

/**
 * Hem free hem premium'da erişilebilir ama maliyetli/istismara açık
 * özellikler için (spec §32/§1 — aiPlan.generate, examDocument.extract).
 * Sırasıyla: rate limit (kaba, saniyeler içindeki istek fırtınasına karşı) →
 * kullanım kotası (free/premium farklı, gün bazlı) → procedure çalışır.
 */
export function metredFeatureProcedure(feature: FeatureKey, rateLimit: { maxRequests: number; windowMs: number } = { maxRequests: 5, windowMs: 60_000 }) {
  return protectedProcedure.use(
    t.middleware(async opts => {
      const { ctx, next, path } = opts;
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
      try {
        checkRateLimit(`${ctx.user.id}:${path}`, rateLimit.maxRequests, rateLimit.windowMs);
      } catch (error) {
        if (error instanceof RateLimitExceededError) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: RATE_LIMITED_ERR_MSG });
        throw error;
      }
      try {
        await assertUsageAvailable(ctx.user.id, feature);
      } catch (error) {
        if (error instanceof PremiumRequiredError) throw new TRPCError({ code: "FORBIDDEN", message: PREMIUM_REQUIRED_ERR_MSG });
        if (error instanceof UsageLimitExceededError) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: error.message });
        throw error;
      }
      // Kullanım YALNIZCA gerçek işlem (LLM çağrısı) başarıyla bittiğinde
      // sayılır (spec §50/§51) — `next()` bir hata ile reddederse (örn.
      // LLM çağrısı patlarsa) buraya hiç gelinmez, kota yanlışlıkla tüketilmez.
      const result = await next({ ctx });
      if (result.ok) await recordFeatureUsage(ctx.user.id, feature);
      return result;
    })
  );
}
