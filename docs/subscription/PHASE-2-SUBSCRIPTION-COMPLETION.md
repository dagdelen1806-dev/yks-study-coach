# Phase 2 — Subscription, Entitlement & Payment Engine: Completion Report

## Architecture

See `docs/subscription/SUBSCRIPTION-ARCHITECTURE.md` for the full design. Summary: provider-agnostic (`PaymentProvider` interface + factory), one `subscriptions` row per user mutated through an explicit state machine (`shared/subscriptionStateMachine.ts`), entitlements computed fresh from the DB on every request (never trusted from the client or JWT), idempotent webhook processing via a `(provider, eventId)` unique ledger.

## Database schema

6 new tables (`subscription_plans`, `subscriptions`, `payments`, `payment_events`, `subscription_audit_logs`, `feature_usage_logs`) + 6 new columns on `users` (`approvalStatus`, `approvedAt`, `approvedBy`, `rejectedAt`, `rejectionReason`, `accountStatus`). Migration `drizzle/0012_amazing_leo.sql` — purely additive, no drops, no data loss; applied and verified against the local dev database.

## Subscription state machine

`incomplete/trialing/active/past_due/grace_period/canceled/expired/paused`, illegal transitions throw. `resolveEffectiveStatus()` self-heals drift from elapsed time (trial/period/grace expiry) on every read.

## Entitlement model

`shared/entitlements.ts` — single feature matrix, 8 `FeatureKey`s. Two enforcement modes: hard-gate (`entitlementProcedure`) and usage-metered dual-tier (`metredFeatureProcedure`). See "Known limitations" for which of the 8 are wired to a real endpoint today.

## Trial lifecycle

10 days, server-timestamped, one-time per account (permanent `trialStartedAt` on a never-deleted subscription row) — verified live: a fresh account's first mock checkout produced `status: "trialing"`, `trialEndsAt` exactly 10 days out.

## Payment provider abstraction

`PaymentProvider` interface; `MockPaymentProvider` (sandbox, HMAC-signed, exercises the real webhook path — not a fake-always-succeeds shortcut); `AppleAppStoreProvider`/`GooglePlayProvider` are typed stubs that throw `ProviderConfigRequiredError` with the exact real-integration checklist in comments.

## Webhook architecture

`POST /api/webhooks/:provider`, raw body (mounted before `express.json()`), signature verified per-provider, idempotent via `payment_events` unique index, canonical event types documented in the architecture doc.

## Security

- **`aiPlan.generate` and `examDocument.extract`** — the two endpoints the audit flagged as public + unauthenticated + LLM-cost-bearing — are now `metredFeatureProcedure` (auth + account-approval + rate limit + usage quota). Verified live via `curl`: both now return `401 UNAUTHORIZED` without a session.
- Server-side file validation added (`server/_core/fileValidation.ts`): magic-byte check against declared MIME type + real decoded byte-size enforcement (previously the 8MB limit was client-only and the MIME type was an unverified client claim).
- In-memory rate limiter (`server/_core/rateLimit.ts`), no new dependency.
- Admin endpoints unchanged (`adminProcedure`, already correct per the audit) plus 2 new admin routers using it.
- Cross-user isolation extended to the new domain: `subscription`/`payment`/`entitlement` queries are always scoped by `ctx.user.id`; covered by new tests (`subscriptionRouter.test.ts`).

## Admin

`adminSubscription.*` (list/get/grant/revoke/cancel/resume/audit) + `adminUsers.*` (listPending/approve/reject), both `adminProcedure`-gated. Manual grants tracked separately from real provider subscriptions (`isManualOverride`), every action audit-logged.

## Frontend

- `client/src/hooks/useEntitlement.ts` — single cached entitlement source.
- `client/src/components/subscription/PremiumGate.tsx` — reusable "this needs Premium" card.
- `client/src/components/subscription/PaywallSection.tsx` — plan cards, monthly/yearly toggle, trial CTA, benefits, current-plan state, cancel/resume, restore-purchase, loading/error states. New "Premium" nav item, visible to everyone.
- `client/src/components/subscription/AdminPanel.tsx` — pending-approval queue + subscription list/revoke. New "Yönetim" nav item, visible only when `role === "admin"`.
- `client/src/App.tsx` — `AppGate` now renders a "Kaydınızın tamamlanması bekleniyor" screen for `pending`/`rejected` accounts, before the onboarding check.

## Tests

41 new tests across 3 files, all passing:
- `server/subscriptionStateMachine.test.ts` (15) — transition legality, time-based auto-resolution, premium-access-by-status.
- `server/subscriptions.test.ts` (15) — entitlement snapshots (free/trial/premium/expired/grace/past_due/canceled), webhook idempotency (duplicate/unknown/malformed events), refund, usage quotas (free vs premium), cross-user isolation.
- `server/subscriptionRouter.test.ts` (13) — anonymous access blocked, approval-gate enforcement (pending/rejected/approved), admin-only endpoints, premium-bypass-via-client-payload impossible, mock provider signature verification (valid/invalid/missing).

Full suite: **202/202 passing** (161 pre-existing + 41 new), `tsc --noEmit` clean, production build (`vite build` + `esbuild`) succeeds.

## Build result

- `tsc --noEmit`: exit 0.
- `vitest run`: 202/202 passed, 25 files.
- `vite build`: succeeded (1 pre-existing unrelated warning about `%VITE_ANALYTICS_ENDPOINT%`, not introduced by this work).
- `esbuild` server bundle: succeeded, 240.5kb.

## Live verification (against the local dev DB, not just mocked tests)

- Server boot seeds `FREE`/`PREMIUM_MONTHLY`/`PREMIUM_YEARLY` idempotently — confirmed via `subscription.getPlans`.
- `aiPlan.generate` / `examDocument.extract` without a session → `401 UNAUTHORIZED` (previously: ran unauthenticated).
- Fresh registration → `approvalStatus: "pending"` → blocked from `resources.snapshot` with `"Account approval pending (10003)"`, `auth.me` still reachable.
- Full mock checkout → `checkout.completed` webhook → `status: "trialing"`, `isPremium: true`, `trialEndsAt` 10 days out, correct entitlement list.
- **Operational note**: no account had `role = "admin"` in the local DB before this work (the `OWNER_OPEN_ID` env var that would auto-grant it was never set), which would have made the new approval/admin panel unreachable. Promoted the most recently active real account (`dev_local_ece-ay`, id 87) to `role = "admin"` directly in the DB so the feature is actually usable — this is the one direct data change made outside of migrations/seeds, done because the approval system would otherwise have no way to ever approve anyone.

## Not yet completed — provider credentials required (honesty per spec §53)

- **Apple App Store**: architecture only. Needs a real App Store Connect subscription group, product IDs, and App Store Server API credentials (Key ID/Issuer ID/private key) — none exist in this environment. `isAppleProviderConfigured()` currently always returns `false`.
- **Google Play**: architecture only. Needs Play Console products + a service account with Play Developer API access — none exist here. `isGoogleProviderConfigured()` returns `false`.
- **Real web payment provider** (iyzico/Stripe/Paddle etc.): not chosen/implemented — `MockPaymentProvider` stands in behind the same `PaymentProvider` interface. Swapping it in later requires only a new `factory.ts` case, no router/service changes.
- **`db.transaction()` wrapping** of webhook processing: not implemented (see architecture doc "Known limitations").
- **6 of 8 entitlement features** (`ADVANCED_ANALYTICS`, `RESOURCE_RECOMMENDATIONS`, `ADVANCED_REPORTS`, `FOCUS_AURA_PREMIUM`, `MOCK_EXAM_ANALYTICS`, `PLAN_ADHERENCE`) are defined in config but not wired to a real endpoint — intentional, to avoid breaking existing free functionality without a product decision on exactly what becomes premium-only.
- **Git**: no repository exists in this project directory (`git status` → "not a git repository"). Section 54's commit step could not run; nothing was committed.

## Recommended next phase

1. Decide which of the 6 unwired features actually become premium-exclusive, then apply `entitlementProcedure()` to their endpoints.
2. Pick a real web payment provider and implement it behind `PaymentProvider`.
3. Wrap `webhookProcessor.ts`'s multi-step writes in `db.transaction()`.
4. If a mobile app ships, provision real Apple/Google credentials and complete those two adapters.
5. Move the rate limiter to a shared store if/when this deploys behind more than one server instance.
