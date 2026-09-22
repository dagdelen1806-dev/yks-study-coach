# FAZ 4A — Resource Catalog + Difficulty Engine + Recommendation Engine

**Status:** complete, adapted to this repo's actual stack. **Not committed to
git** — see "Git" below.

## Architecture note (read first)

The original FAZ 4A brief was written against a Laravel + Flutter stack with
an existing "FAZ 3 Question Tracking" git history (`550075b`, tag `v0.4.0`).
Neither exists in this repository: `C:\laragon\www\yks-study-coach` has no
`.git` directory at all, no `artisan`/`composer.json`, and no
`pubspec.yaml`/Flutter app. The actual stack is **Node.js + Express + tRPC +
Drizzle/MySQL** on the backend and **React 19 + Vite** on the frontend. Every
deliverable below is the same FAZ 4A scope, redesigned onto that real stack —
see `docs/resource-catalog/ARCHITECTURE.md` for the full mapping.

## Architecture

- Source-agnostic importer (`BookSourceAdapter`), pipeline broken into 8+
  independently-testable steps, `CatalogDbPort` dependency injection so the
  whole pipeline is unit-tested without a live database.
- Zero changes to any FAZ 1–3 table, router, or component. All 6 new tables
  are additive.

## Database

6 new tables via `drizzle/0008_shallow_wolf_cub.sql`: `publishers`,
`catalog_books`, `external_book_sources`, `book_offers`,
`book_curriculum_topics`, `resource_catalog_sync_logs`. 17 new indexes
matching the actual filter/query patterns. Details:
`docs/resource-catalog/DATA-MODEL.md`.

## Importer

`FixtureBookSource` (offline, seeded from the project's own pre-existing
`resourceBookCatalog`, 19 real books) + `KitapIslerSource` (real HTTP,
rate-limited, robots.txt-checked — extraction logic is a documented
best-effort, not verified against the live DOM; see
`docs/resource-catalog/IMPORTER.md`). CLI: `pnpm resource-catalog` with
`--source`, `--limit`, `--dry-run`, `--force`, `--no-ai`, `--only-new`,
`--review-needed`.

## Kitapİşler

`robots.txt` checked 2026-09-18 (`Allow: /`, no restrictions). Category
structure explored (YKS hub → TYT/AYT sub-categories, publisher filters).
Leaf-category product markup could not be fully inspected in this
environment — documented as a known limitation with a verification
checklist in `OPERATIONS.md`, rather than shipped as unverified "working"
code.

## Normalization

`TurkishNormalizer` (İ/I casefolding, diacritic folding, deterministic
slugs), `PublisherNormalizer` (alias table + normalized-name dedup — "3D
YAYINLARI"/"3D Yayınları"/"3D"/"3D Yayinlari" → one row), `BookTypeNormalizer`
+ exam-scope normalizer.

## Duplicate Detection

4 tiers, in order: ISBN → normalized identity (same publisher+name+edition)
→ publisher+name (edition ambiguous → flagged for review, not auto-merged)
→ fuzzy (Levenshtein, same-publisher only). Deterministic, explainable
(`reason` string on every match). Different editions are never silently
collapsed.

## Difficulty Engine

Score (0–100) + label + confidence + method, config-driven thresholds/weights
(`server/resourceCatalog/config.ts`, all env-overridable). Rule-based layer
with word-boundary-safe Turkish keyword matching (the "Zorunlu" false-positive
is explicitly guarded and tested), metadata layer, AI layer (reuses the
existing `invokeLLM`, disabled by default), hybrid combiner that damps by
per-layer confidence. Manual override is permanent — no automatic sync
(`--force` included) ever overwrites an admin's manual classification.

## AI Classification

`DifficultyClassifierInterface` abstraction; `LlmDifficultyClassifier` is the
only concrete AI implementation, built on the project's existing built-in LLM
client — no new provider dependency. `RESOURCE_CATALOG_AI_ENABLED=false` by
default; `--no-ai` and "no API key configured" both degrade to the same
zero-confidence fallback, never a crash.

## Curriculum Mapping

Pivot to the **existing** `yks_topics` (no parallel subject/curriculum
system). Token-overlap scoring with a confidence value; every mapping is
created `isVerified = false` — never auto-confirmed. A verified mapping is
never downgraded by a later sync.

## Recommendation Engine

Deterministic, explainable, no AI required (`docs/resource-catalog/RECOMMENDATION.md`).
Reuses the existing `getUserTopicProgress`. Weak topics prioritized. Labels
are descriptive ("Seviyene uygun", "Bir sonraki seviyeye geçiş", "İleri
seviye", "Temel tekrar kaynağı") — never a commercial imperative.

## API

tRPC (`catalog.*` on the existing `AppRouter`) — this repo has no Flutter app
to build a REST API for; the existing frontend is React and already consumes
tRPC everywhere else. `list` (paginated, filtered, public), `get`,
`publishers`, `recommendations` (protected), `admin.*` (admin-only:
`needsReview`, `syncLogs`, `approve`, `setDifficulty`, `markNeedsReview`).
Details: `docs/resource-catalog/API.md`.

## Frontend

New "Kaynak Kataloğu" sidebar section (`client/src/components/resourceCatalog/ResourceCatalogSection.tsx`),
wired into the existing single-page section-switch pattern in `Home.tsx` —
search/filter (exam, difficulty, book type), 🟢🟡🔴 difficulty badges reusing
the app's existing color values (no new hard-coded palette), pagination,
"Seviyene uygun kaynaklar" recommendation panel, and an admin review panel
(role-gated, same as the rest of the app). Existing `Resources` section/data
is untouched.

## Tests

**Backend:** 97/97 passed, 0 failed (17 test files: 7 pre-existing FAZ 1–3
files / 28 pre-existing tests, untouched and still green, + 10 new files / 69
new tests). New: `turkishNormalizer.test.ts` (6), `publisherNormalizer.test.ts`
(3), `bookTypeNormalizer.test.ts` (8), `duplicateDetector.test.ts` (6),
`difficulty.test.ts` (10), `recommendationService.test.ts` (7),
`curriculumMapper.test.ts` (5), `kitapIslerSource.test.ts` (5),
`pipeline.test.ts` (8, fixture-driven end-to-end incl. idempotency,
publisher-alias merging, manual-override preservation, dry-run no-writes,
`--limit`, per-item failure isolation, `--only-new`),
`resourceCatalogApi.test.ts` (11, pagination cap, exam filter, admin
`FORBIDDEN`/`UNAUTHORIZED` authorization).

`tsc --noEmit`: 0 errors (whole project). `vite build`: succeeds (only
pre-existing, unrelated warnings about analytics env vars and chunk size).

**Frontend:** no Flutter app in this repo — N/A. The new React component
type-checks and builds; not exercised with a browser/Playwright in this
session.

## Data Import (fixture, `--dry-run`)

```
Fetched: 19   Created: 19   Updated: 0   Skipped: 0   Failed: 0
Difficulty — Easy: 6  Medium: 13  Hard: 0  Needs Review: 19
Curriculum — Mapped: 0  Unmapped: 19  (no DATABASE_URL in this session, so
  yks_topics is empty at read time — see "Known Limitations")
```

These are real numbers from an actual `pnpm resource-catalog --dry-run` run
against the 19-book fixture in this environment, not fabricated. "Needs
review: 19/19" is expected and correct for a first run with AI disabled (see
`DIFFICULTY-ENGINE.md`) — everything starts in the review queue until an
admin approves it or an AI key is configured.

## Git

```
git status  →  fatal: not a git repository (or any of the parent directories): .git
```

This repository was never initialized with git. No commit or tag was
created — creating one would require first running `git init`, which is a
repository-level decision outside FAZ 4A's scope. **No push was attempted
(and none would have been possible).** If you want this work committed,
confirm and I'll run `git init`, stage, and commit (still without pushing
anywhere) as a separate, explicit step.

**Working tree:** N/A (no repository).

## Known Limitations

- `KitapIslerSource`'s HTML extraction pattern is unverified against the live
  site's leaf-category DOM (documented, with a pre-flight checklist, in
  `OPERATIONS.md`). Do not run it without `--dry-run` first.
- Curriculum mapping stats above are 0/19 because this session had no
  `DATABASE_URL` — `yks_topics` was read as empty. With a real database
  seeded (existing FAZ 1–3 behavior via `ensureTopicCatalogSeeded`), mapping
  will actually resolve for books whose subject + title tokens overlap a
  seeded topic.
- No live AI classification was run (no API key configured in this
  session) — all difficulty scores above came from the rule + metadata
  layers only.
- Frontend was verified via `tsc`/`vite build`, not a running browser session
  in this environment.
- Admin review UI is intentionally minimal (approve / mark-not-needed +
  a small queue list) rather than a full dashboard — matches the "don't
  overbuild" instruction; `catalog.admin.setDifficulty` (manual override) is
  wired on the backend and callable, but has no dedicated UI form yet.

## Next Recommended Phase

1. Verify `KitapIslerSource` selectors against the live site and run a real
   (rate-limited) sync to populate the catalog beyond the 19-book fixture.
2. Add a small admin form for `catalog.admin.setDifficulty` (manual override)
   in `ResourceCatalogSection.tsx`.
3. Link the student's personal shelf (`user_resource_books`) to
   `catalog_books` via an optional FK, so a student can "add to shelf"
   straight from the new catalog view.
