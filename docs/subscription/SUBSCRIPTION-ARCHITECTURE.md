# Subscription / Entitlement / Payment Architecture

Provider-agnostic subscription system for Pusula YKS. Stack: Express + tRPC 11 + Drizzle ORM + MySQL (backend), React 19 + TanStack Query (frontend) — same stack as the rest of the app, no new runtime dependencies were added.

## Domain model

`USER` → `SUBSCRIPTION` (one row per user, mutated in place) → `PLAN` (code-referenced, never a hard-coded ID) → `PAYMENT`s (history) ← `PAYMENT_EVENT`s (webhook idempotency ledger). `ENTITLEMENT` is not a table — it's *computed* on every request by `server/subscriptions/entitlementService.ts` from the subscription's current (DB-fresh) status + the plan's tier, against the feature matrix in `shared/entitlements.ts`.

A user is never without a subscription row: `ensureFreeSubscription()` lazily provisions a `FREE` row on first access.

## State machine

`shared/subscriptionStateMachine.ts` — pure functions, no I/O:

```
incomplete → active | canceled | expired
trialing   → active | canceled | expired
active     → trialing | past_due | canceled | paused | expired
past_due   → active | grace_period | canceled | expired
grace_period → active | expired | canceled
paused     → active | canceled
canceled   → active   (resume, before period end)
expired    → active | trialing
```

`resolveEffectiveStatus(snapshot, now)` computes what the status *should* be from elapsed time alone (trial/period/grace expiry) — `entitlementService.getCurrentSubscription()` calls this on every read and persists the correction if it drifted, so a missed webhook or cron never leaves a user in a stale state for long. `statusGrantsPremiumAccess()` is the single source of truth for which statuses count as premium: `trialing`, `active`, `grace_period` — **not** `past_due` (first payment failure), by design.

## Entitlements

`shared/entitlements.ts` is the *only* place feature access is defined — no `if (plan === "premium")` scattered through components. Two enforcement shapes:

1. **Hard-gated** (`entitlementProcedure(feature)` / `hasEntitlement()`): all-or-nothing, free tier gets zero access. Defined for `ADVANCED_ANALYTICS`, `RESOURCE_RECOMMENDATIONS`, `ADVANCED_REPORTS`, `FOCUS_AURA_PREMIUM`, `MOCK_EXAM_ANALYTICS`, `PLAN_ADHERENCE` — **not yet wired to any existing endpoint** (see Known Limitations; these already worked for free users before this phase and gating them now would be a breaking regression).
2. **Usage-metered** (`metredFeatureProcedure(feature)` / `checkAndRecordUsage()`): both tiers get access, different rolling-window quotas (`FREE_TIER_LIMITS` vs `FEATURE_USAGE_LIMITS`). Used for `AI_STUDY_PLAN` (`aiPlan.generate`) and `OCR_EXAM_IMPORT` (`examDocument.extract`) — the two endpoints the audit flagged as unprotected and costly.

## Trial

10 days, `subscriptionPlans.trialDays`. Started once via `checkout.completed`: eligible only if `plan.trialDays > 0 AND subscription.trialStartedAt IS NULL`. Because the subscription row is never deleted, `trialStartedAt` is a permanent mark — a second "purchase" on the same account converts straight to `active`, never re-enters `trialing`. All timestamps (`trialStartedAt`/`trialEndsAt`) are set server-side from `new Date()`; the client never sends or controls a duration.

## Payment provider abstraction

`server/subscriptions/paymentProviders/types.ts` defines `PaymentProvider`; `factory.ts` selects an implementation from `PAYMENT_PROVIDER` env var — subscription/payment routers never import a concrete provider class directly.

- **`MockPaymentProvider`** (default, `PAYMENT_PROVIDER=mock`): sandbox only, never real money. `createSubscription()` does **not** itself activate anything — activation only happens through `handleWebhook()` → `processWebhookEvent()`, the same path a real provider would use, so the full idempotent flow is exercised even without a real vendor. HMAC-SHA256 signed (`PAYMENT_MOCK_WEBHOOK_SECRET`).
- **`AppleAppStoreProvider`** / **`GooglePlayProvider`**: architecture stubs. Every method throws `ProviderConfigRequiredError` — no fake success path. Class-level comments document exactly what a real implementation needs (App Store Server API JWT signing / Google Play Developer API service account, receipt & purchaseToken verification, notification webhook signature schemes).

## Webhook engine

`POST /api/webhooks/:provider`, registered in `server/_core/index.ts` **before** the global `express.json()` middleware — it needs the raw body for signature verification. Flow: `provider.handleWebhook()` verifies signature → `processWebhookEvent()` (in `server/subscriptions/webhookProcessor.ts`) checks `(provider, eventId)` against `payment_events` (unique index) → if new, applies the canonical event to `subscriptions`/`payments` → marks the event row `processed`/`failed`. A duplicate delivery is detected and `ignored` before any state mutation runs.

Canonical event types (provider-specific event names map to these inside each adapter's `handleWebhook`): `checkout.completed`, `subscription.renewed`, `subscription.payment_failed`, `subscription.grace_period_started`, `subscription.canceled`, `payment.refunded`.

## Admin

`adminSubscription.*` / `adminUsers.*` routers, gated by the pre-existing `adminProcedure` (`ctx.user.role === "admin"`). Manual grants (`adminSubscription.grant`) set `isManualOverride = 1` and leave `provider`/`providerSubscriptionId` null — deliberately kept distinct from real provider subscriptions so a `revoke` never accidentally cancels a real payment. Every admin action writes a `subscription_audit_logs` row (`adminId`, `oldState`, `newState`, `reason`).

## Manual account approval (this phase's second request)

Independent of subscriptions: `users.approvalStatus` (`pending`/`approved`/`rejected`), defaults to `approved` at the **column** level (so the migration doesn't lock out pre-existing accounts) but is explicitly forced to `pending` in the **application** insert path (`server/db.ts:upsertUser`, `server/_core/devAuth.ts`) for every genuinely new registration. Enforced in `requireUser` (the middleware every `protectedProcedure` uses), with a two-path allowlist (`auth.me`, `auth.logout`) so a pending user can still see *why* they're blocked and sign out. `client/src/App.tsx`'s `AppGate` renders a "Kaydınızın tamamlanması bekleniyor" screen instead of the dashboard for pending/rejected users — UX only, the real block is server-side.

## Security posture

- `aiPlan.generate` / `examDocument.extract`: were `publicProcedure`, now `metredFeatureProcedure` (auth + approval + rate limit + usage quota).
- File uploads: `server/_core/fileValidation.ts` checks magic bytes against the declared MIME type and enforces the real decoded byte size server-side (previously only a client-side 8MB check + an unverified `mimeType` string).
- Rate limiting: `server/_core/rateLimit.ts`, in-memory fixed-window, keyed per `userId:procedurePath`. **Known limitation**: in-memory means a multi-instance deployment needs a shared store (Redis) instead — noted below.
- No secret is logged; webhook payloads are redacted (`server/subscriptions/webhookRedaction.ts`) before being stored in `payment_events.payload`.
- JWT session payload is unchanged (`openId`/`appId`/`name`) — `isPremium` is never embedded in a token; every check re-reads `subscriptions` from the DB.

## Known limitations / not production-ready as-is

- **Rate limiter is single-instance** (in-memory). Fine for this deployment; needs Redis (or similar) behind a load balancer.
- **No `db.transaction()` wrapping** in `webhookProcessor.ts` — Drizzle's mysql2 driver supports it, but wiring it through the existing `subscriptionDb.ts` helper functions (which each open their own implicit statement) was out of scope for this pass. A crash mid-`applyCanonicalEvent` could leave a payment row created without the matching subscription update. The idempotency ledger (`payment_events`) still prevents re-processing on retry, limiting the blast radius.
- **Apple/Google adapters are architecture only** — see `appleProvider.ts`/`googleProvider.ts` doc comments for the exact real-world integration checklist. No App Store Connect / Google Play Console access exists in this environment.
- **`ADVANCED_ANALYTICS`/`RESOURCE_RECOMMENDATIONS`/`ADVANCED_REPORTS`/`FOCUS_AURA_PREMIUM`/`MOCK_EXAM_ANALYTICS`/`PLAN_ADHERENCE`** are defined in the entitlement config and the service layer can already answer `hasEntitlement()` for them, but no existing endpoint calls `entitlementProcedure()` for them yet — deliberately, to avoid breaking features free users already rely on today (audit + spec §46 "no big-bang damage"). Wiring them is a scoped follow-up once product decides exactly which of today's free features become premium-only.
