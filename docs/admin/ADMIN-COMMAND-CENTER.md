# Admin Command Center (PHASE 3)

## Architecture

No real URL router exists in this app (single-page, in-app `DashboardSection` state — confirmed in the Phase 1 audit). Per the spec's own allowance ("Eğer projede gerçek URL router yoksa mevcut routing architecture'ını kontrollü şekilde geliştir"), admin navigation is a tab-state shell (`client/src/components/subscription/AdminPanel.tsx`) rather than `/admin/users/:id`-style routes. The information architecture (Dashboard / Users / Pending / Subscriptions / Payments / Audit, with a per-user detail overlay carrying Overview/Subscription/Usage/Progress/Exams/Topics/Payments/Audit tabs) is preserved exactly as specified.

Backend: `server/routers/admin/{users,subscriptions,usage,analytics,audit,payments}.ts`, combined in `server/routers/admin/index.ts` and mounted once as `admin` on `appRouter` (spec §47 — no single giant admin router). Services live in `server/admin/` (`adminUserDb.ts`, `analyticsService.ts`, `progressService.ts`) and reuse the Phase 2 subscription domain (`server/subscriptions/`) rather than duplicating it.

## Permission model

Every `admin.*` procedure uses the pre-existing `adminProcedure` (`server/_core/trpc.ts`), which checks `ctx.user.role === "admin"` server-side — the client never sends a role and cannot make itself admin. Verified live and in tests (`server/subscriptionRouter.test.ts`): a normal user calling any `admin.*` endpoint gets `FORBIDDEN`; an admin succeeds.

## User approval lifecycle

Unchanged from Phase 2, extended with suspend/reactivate:

```
REGISTER → approvalStatus=pending → admin.users.approve → approved (requireUser now lets them through)
                                   → admin.users.reject  → rejected
approved (accountStatus=active) → admin.users.suspend → suspended
suspended                        → admin.users.reactivate → active
```

`approvalStatus` (pending/approved/rejected) and `accountStatus` (active/suspended/deleted) are intentionally two separate fields on `users` — a canceled subscription never touches either (spec §5/§23: don't conflate subscription cancellation with account status).

## Subscription management

Reuses Phase 2's `subscriptions`/`subscriptionPlans` tables and state machine unchanged. `admin.subscriptions.grant` sets `isManualOverride=1` and leaves `provider`/`providerSubscriptionId` null, so a manual grant is never confused with (or revoked as if it were) a real payment-provider subscription. Every grant/revoke/cancel/resume writes a `subscription_audit_logs` row.

**Deliberate scoping decision**: spec §28/§29 describes a separate `manual_entitlements` table (per-feature grants with `grantedBy`/`startsAt`/`endsAt`). This was **not** built as a second table — the existing `subscriptions.isManualOverride` flag (whole-plan grant, not per-feature) was reused instead, per spec §58's own instruction ("mevcut schema'yı yeniden tasarlama, duplicate logic oluşturma"). A true per-feature entitlement source model is a reasonable follow-up if product needs "give this one user OCR import only, nothing else."

## Usage system

`feature_usage_logs` (Phase 2) is append-only; `server/subscriptions/entitlementService.ts` computes rolling-window usage on read (`countFeatureUsage`), no cron needed (spec §15). **Correctness fix this phase**: usage used to be recorded *before* the metered call ran (in the old `checkAndRecordUsage`). It's now split:

- `assertUsageAvailable(userId, feature)` — check only, throws if over quota. Runs in `metredFeatureProcedure`'s middleware *before* the real handler.
- `recordFeatureUsage(userId, feature)` — called *only* if the tRPC middleware's `next()` result is `.ok === true`.

Verified with a dedicated test: `examDocument.extract` with a mocked failing LLM call throws, and `recordFeatureUsage` is never invoked.

**Known limitation — atomicity (spec §51)**: the check-then-act sequence (`assertUsageAvailable` → real call → `recordFeatureUsage`) has a small race window under truly concurrent double-requests from the same user. Given this app's real traffic shape (one browser tab per student, not a high-concurrency API client), row-level locking / `SELECT ... FOR UPDATE` was judged disproportionate complexity for this phase and was not added. If usage-based billing ever becomes revenue-critical, wrap the window in a transaction with a row lock on the user's usage counter.

`admin.usage.reset` deletes the log rows within the current window (not the entire history) and audit-logs the action.

## Progress score

`shared/progressScore.ts` (pure, unit-tested, config-driven weights) + `server/admin/progressService.ts` (pulls real data: `topic_study_logs`, `topic_progress`, `user_mock_exams`, and — reused, not reimplemented — `shared/planAdherence.ts`'s existing, already-tested adherence algorithm).

Five components, each independently gated by a minimum-sample-size threshold (`PROGRESS_SCORE_CONFIG`); below threshold → `insufficientData: true`, `score: null` — **never a fabricated 0**. The overall score re-normalizes weights across whatever components *are* available, so a new account isn't punished for missing history in one dimension. The function takes **zero subscription/plan input** — verified by construction (its signature has no such parameter) and by the completion report's "not automatically higher for premium users" requirement.

## Dashboard KPIs

`server/admin/analyticsService.ts` computes all dashboard numbers in ~11 grouped `COUNT`/`GROUP BY` queries (not per-row client counting) — total/pending/active/free/trial/premium/monthly/yearly/past_due/grace/expired/canceled, activity buckets (today/week/7+/30+ inactive), and trial→premium conversion (started/still-trialing/converted, `N/A` if zero trials have ended yet — never a fabricated percentage).

## Security

- `passwordHash`, JWT contents, OAuth tokens, and payment-provider secrets are never sent to the client. `getUserDetailForAdmin` explicitly strips `passwordHash` before returning; provider subscription/customer/payment IDs are masked (`xxxx••••xxxx`) in both the subscriptions and payments admin views.
- No card numbers/CVV exist anywhere in this schema — there was never anything to redact there.
- Server-side pagination/filtering/search (`admin.users.list`) — verified to use SQL `LIMIT`/`OFFSET` with a bounded page-scoped aggregate query, not a full-table fetch; `search` goes through Drizzle's parameterized `like()` (no raw string concatenation, no SQL injection surface).

## Testing

`server/progressScore.test.ts` (8), plus additions to `server/subscriptionRouter.test.ts` (now 16: admin-only enforcement for `subscriptions.list`/`users.listPending`/`analytics.overview`, and the usage-not-consumed-on-failure test) and `server/subscriptions.test.ts` (updated for the new `assertUsageAvailable`/`recordFeatureUsage` split). Full suite: **213/213 passing**.

**Coverage note**: tests touching `admin.analytics.overview`, `admin.users.list`, and `admin.users.get` exercise the real local dev database (these services query `getDb()` directly, not through the already-mocked `subscriptionDb.ts` module) — they are integration tests, not isolated unit tests. This mirrors an existing tradeoff already present in this codebase (several `*Api.test.ts` files do the same); fully isolating them would mean mocking `../db` too, which was out of scope for this pass.

## Not built this phase (disclosed, not silently skipped)

- Real `/admin/...` URL routes (uses in-app tab state instead — see Architecture).
- CSV export (spec explicitly marks this optional for MVP).
- Notification center (architecture-ready via existing audit log + KPI queries; no UI built).
- Runtime-editable admin Settings page (trial days / limits / grace policy remain compile-time config in `shared/entitlements.ts` and `server/subscriptions/seedPlans.ts`, consistent with how the rest of this app already does config).
- Bulk actions (spec explicitly discourages risky bulk payment/subscription changes for MVP; not built at all, including the "safe" ones, to keep scope bounded).
- Server-side pagination on the Subscriptions/Payments admin pages specifically (Users page has full pagination; Subscriptions/Payments currently fetch up to 100/500 rows unpaginated — fine at this app's real scale, flagged for follow-up if it grows).
