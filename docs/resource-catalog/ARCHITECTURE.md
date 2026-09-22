# Resource Catalog — Architecture

## Why this exists

The project already had a small, hard-coded book list (`resourceBookCatalog` in
`shared/yksData.ts`) rendered directly in the client. This module adds a real,
database-backed **global catalog layer** underneath it: a canonical book
model, a source-agnostic importer, a difficulty classification engine, a
curriculum mapping layer, and a deterministic recommendation engine — without
touching or duplicating any FAZ 1–3 domain (Curriculum/`yks_topics`, Study
Plan, Study Sessions, or the student's personal shelf in
`resources`/`user_resource_books`/`book_inventory`).

This was originally specced against a Laravel + Flutter stack. The actual
project is **Node.js/Express + tRPC + Drizzle/MySQL on the backend and
React + Vite on the frontend** (there is no Flutter app in this repo) — every
piece below is the same architecture translated into that stack, using the
patterns the codebase already established (lazy `getDb()`, `adminProcedure`,
`invokeLLM`, per-domain router files).

## Module layout

```
server/resourceCatalog/
  config.ts                  # env-driven thresholds/weights (no hard-coded numbers)
  types.ts                   # shared pipeline types
  normalizers/                # TurkishNormalizer, PublisherNormalizer, BookTypeNormalizer
  duplicateDetector.ts        # ISBN → identity → publisher+name → fuzzy, in that order
  curriculumMapper.ts         # book -> yks_topics candidates (never auto-verifies)
  difficulty/                 # RuleBasedDifficultyClassifier, LlmDifficultyClassifier, HybridDifficultyClassifier
  recommendationService.ts    # deterministic per-topic + per-student recommendations
  sources/                    # BookSourceAdapter interface, FixtureBookSource, KitapIslerSource
  pipeline/                   # validate/normalize + ResourceCatalogImportPipeline orchestrator
  catalogDb.ts                # Drizzle-backed CatalogDbPort implementation (+ admin read/write helpers)
  catalogQueries.ts           # public-facing paginated/filterable read queries
  cli.ts                      # `pnpm resource-catalog` entry point
  __fixtures__/kitapisler/    # offline product fixtures (tests + local dry-runs)

server/routers/resourceCatalog.ts        # public/protected tRPC router (`catalog.*`)
server/routers/resourceCatalogAdmin.ts   # admin-only tRPC router (`catalog.admin.*`)

client/src/components/resourceCatalog/ResourceCatalogSection.tsx
```

## Import pipeline (spec §25)

```
FETCH → RAW STORE → VALIDATE → NORMALIZE → DEDUPLICATE → UPSERT CANONICAL BOOK
  → MAP PUBLISHER → MAP EXAM/SUBJECT/BOOK TYPE → CLASSIFY DIFFICULTY
  → MAP CURRICULUM → MARK REVIEW → SYNC COMPLETE
```

Each arrow is a separate, independently testable module
(`pipeline/validate.ts`, `pipeline/normalize.ts`, `duplicateDetector.ts`,
`curriculumMapper.ts`, `difficulty/*`) — `pipeline/orchestrator.ts` only
sequences them and isolates per-item failures (one bad product marks itself
`failed` and the run continues; see `docs/resource-catalog/IMPORTER.md`).

## Dependency injection, not a live DB in tests

`ResourceCatalogImportPipeline` depends on a narrow `CatalogDbPort` interface
(`pipeline/types.ts`), not directly on Drizzle. `catalogDb.ts` is the one real
(MySQL-backed) implementation; `server/resourceCatalog/pipeline.test.ts` uses
a ~120-line in-memory fake instead. This is why the whole pipeline —
including idempotency, manual-override preservation, and duplicate handling —
is unit-tested without any database connection.

## What's intentionally *not* built in this phase

- **Live Kitapİşler scraping is not verified against the real DOM.**
  `KitapIslerSource`/`HeuristicHtmlExtractor` are real, rate-limited,
  robots.txt-respecting HTTP code, but the product-grid markup could not be
  fully inspected in this environment (see `OPERATIONS.md`). The tested,
  default path is `FixtureBookSource`, seeded from the project's own
  pre-existing `resourceBookCatalog` data.
- **No live AI classification by default** (`RESOURCE_CATALOG_AI_ENABLED=false`).
  The hybrid engine runs on the rule + metadata layers alone until an admin
  turns AI on; see `DIFFICULTY-ENGINE.md`.
- **No Flutter UI** — this repo has no mobile app; the catalog ships as a new
  React section instead (`Kaynak Kataloğu` in the sidebar).
