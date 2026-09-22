# Resource Catalog — Importer

## Source abstraction

```ts
interface BookSourceAdapter {
  readonly name: string;
  fetchPage(page: number): Promise<{ products: RawExternalProduct[]; hasMore: boolean }>;
}
```

Two implementations ship today:

- **`FixtureBookSource`** (`server/resourceCatalog/sources/fixtureSource.ts`)
  — reads `__fixtures__/kitapisler/sample-products.json` (19 real books,
  converted 1:1 from the project's pre-existing `resourceBookCatalog`, real
  Kitapİşler/Kitapsec/publisher URLs included). Fully offline. This is the
  default source (`--source=fixture`) and the only one tests ever touch.
- **`KitapIslerSource`** (`server/resourceCatalog/sources/kitapIslerSource.ts`)
  — a real, rate-limited HTTP adapter. See the "Known limitation" note below
  before using it for anything but `--dry-run`.

Adding a new source (a publisher feed, a CSV/JSON upload, an affiliate feed,
an official API) means implementing this one interface — the pipeline and
every downstream step is unchanged.

## Running it

```bash
pnpm resource-catalog                          # fixture source, real writes
pnpm resource-catalog --source=fixture --dry-run
pnpm resource-catalog --limit=5 --dry-run
pnpm resource-catalog --force --no-ai
pnpm resource-catalog --only-new
pnpm resource-catalog --review-needed           # prints the current review queue, does not sync
pnpm resource-catalog --source=kitapisler --dry-run   # see OPERATIONS.md first
```

| flag | effect |
|---|---|
| `--source=fixture\|kitapisler` | which `BookSourceAdapter` to use (default `fixture`) |
| `--limit=N` | stop after N fetched products |
| `--dry-run` | runs the full pipeline (including difficulty classification) but performs **zero** writes |
| `--force` | reclassify difficulty even for books that already exist (still skipped if `manualOverride`) |
| `--no-ai` | skip the AI difficulty layer even if `RESOURCE_CATALOG_AI_ENABLED=true` |
| `--only-new` | skip any product already linked to a catalog book |
| `--review-needed` | read-only: lists the current `needsReview` queue instead of syncing |

## Safety (spec §29)

`config.importer` (`server/resourceCatalog/config.ts`) — all overridable via
env, none hard-coded: `concurrency` (fixed at 1 request at a time),
`delayMs` between requests, `timeoutMs` per request, `maxRetries` with
exponential backoff, `maxPages`, `maxProducts`. `KitapIslerSource` also checks
`robots.txt` once per run before crawling and aborts if it finds a blanket
`Disallow: /`.

## Idempotency (spec §27)

Re-running the same source multiple times never creates duplicate canonical
rows: `external_book_sources` is keyed on `(source, sourceProductId)`, and
once a row's `matchedBookId` is set, every later sync of that same product
goes straight to `UPDATE`, not `INSERT`. A manually-overridden difficulty
(`manualOverride = 1`) is never touched by a later sync, `--force` included.
Covered by `server/resourceCatalog/pipeline.test.ts`.

## Failure isolation (spec §28)

One malformed product (missing name, missing source id, invalid price) is
validated, stored raw with `syncStatus = "failed"`, and skipped — it never
aborts the run. `ImportResultStats.errors` collects every failure with its
`sourceProductId` and reason; `resource_catalog_sync_logs.errorLog` persists
the same list.

## Known limitation — Kitapİşler live selectors are unverified

`robots.txt` for kitapisler.com was checked (`Allow: /`, no `Crawl-delay`,
2026-09-18) and the category hub page is server-rendered. The actual
product-grid markup for a leaf category could not be fully inspected in this
environment (the page is large and uses JS-driven publisher filters), so
`HeuristicHtmlExtractor`'s regex (`-slug_<id>.html` link pattern) is a
best-effort starting point, **not a verified production scraper**. Before
running `--source=kitapisler` without `--dry-run`:

1. `curl` or fetch a real category page and confirm the product link pattern
   matches `HeuristicHtmlExtractor.extractProducts`.
2. Run with `--dry-run --limit=5` first and inspect the resulting stats/log
   output for sane `created`/`skipped` counts.
3. Only then run a real (non-dry-run) sync, starting with a small `--limit`.

This is also why every automated test in this repo uses `FixtureBookSource`
— spec §50 explicitly requires tests never depend on the live site.
