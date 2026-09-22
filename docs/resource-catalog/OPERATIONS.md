# Resource Catalog — Operations

## Applying the migration

```bash
pnpm db:push   # drizzle-kit generate && drizzle-kit migrate, needs DATABASE_URL
```

Adds 6 tables (`publishers`, `catalog_books`, `external_book_sources`,
`book_offers`, `book_curriculum_topics`, `resource_catalog_sync_logs`) via
`drizzle/0008_shallow_wolf_cub.sql`. No existing table is modified. Safe to
roll back (`DROP TABLE` the 6 new tables) with zero effect on FAZ 1–3 data.

## Running a sync

```bash
pnpm resource-catalog --source=fixture --dry-run       # safe, offline, no writes
pnpm resource-catalog --source=fixture                 # real writes, offline data
pnpm resource-catalog --review-needed                   # inspect the review queue
```

See `IMPORTER.md` for the full flag list and the report format.

### Before running `--source=kitapisler` for real

`KitapIslerSource`'s product extraction is unverified against the live DOM
(see `IMPORTER.md`'s "Known limitation"). Checklist:

1. Confirm `https://www.kitapisler.com/robots.txt` still allows crawling
   (`Allow: /`, no blanket `Disallow: /` for `User-agent: *`).
2. Fetch one real category page and check the product-link markup against
   `HeuristicHtmlExtractor.extractProducts`'s pattern
   (`-slug_<id>.html`) — adjust the regex if the site's markup differs.
3. `pnpm resource-catalog --source=kitapisler --dry-run --limit=5` and read
   the printed report before ever running without `--dry-run`.
4. Start a real sync with a small `--limit`, check
   `catalog.admin.syncLogs`/`--review-needed`, then scale up.

Never remove the rate limiting (`RESOURCE_CATALOG_IMPORT_DELAY_MS`,
`_TIMEOUT_MS`, `_MAX_RETRIES`) or the `robots.txt` check in
`server/resourceCatalog/sources/kitapIslerSource.ts`.

## Config reference (`server/resourceCatalog/config.ts`)

All overridable via env, all optional (defaults shown):

```
RESOURCE_CATALOG_AI_ENABLED=false
RESOURCE_CATALOG_DIFFICULTY_EASY_MAX=39
RESOURCE_CATALOG_DIFFICULTY_MEDIUM_MAX=69
RESOURCE_CATALOG_WEIGHT_RULE=0.45
RESOURCE_CATALOG_WEIGHT_AI=0.4
RESOURCE_CATALOG_WEIGHT_METADATA=0.15
RESOURCE_CATALOG_REVIEW_CONFIDENCE_THRESHOLD=0.55
RESOURCE_CATALOG_REC_WEIGHT_DIFFICULTY_FIT=0.35
RESOURCE_CATALOG_REC_WEIGHT_SUBJECT_MATCH=0.2
RESOURCE_CATALOG_REC_WEIGHT_EXAM_MATCH=0.15
RESOURCE_CATALOG_REC_WEIGHT_TOPIC_MATCH=0.15
RESOURCE_CATALOG_REC_WEIGHT_BOOK_TYPE_MATCH=0.05
RESOURCE_CATALOG_REC_WEIGHT_PERFORMANCE_MATCH=0.1
RESOURCE_CATALOG_IMPORT_CONCURRENCY=1
RESOURCE_CATALOG_IMPORT_DELAY_MS=800
RESOURCE_CATALOG_IMPORT_TIMEOUT_MS=15000
RESOURCE_CATALOG_IMPORT_MAX_RETRIES=3
RESOURCE_CATALOG_IMPORT_MAX_PAGES=50
RESOURCE_CATALOG_IMPORT_MAX_PRODUCTS=5000
```

No API keys live in this module's config — AI classification reuses
`BUILT_IN_FORGE_API_KEY` (already in `.env`, `server/_core/env.ts`).

## Admin review

`Kaynaklar` → `Kaynak Kataloğu` in the sidebar shows an "İnceleme bekleyen
kaynaklar" panel to admins (role `admin`, same role column FAZ 1–3 already
uses) with Approve / Yoksay actions, backed by `catalog.admin.*`.

## Monitoring a sync

`resource_catalog_sync_logs` (or `catalog.admin.syncLogs`) has one row per
non-dry-run invocation with the full stats + error list. There is no
scheduled/cron sync wired up in this phase — `pnpm resource-catalog` is a
manual CLI operation, matching spec §50 ("Canlı sync: manuel CLI
operasyonudur. CI sırasında çalıştırma.").
