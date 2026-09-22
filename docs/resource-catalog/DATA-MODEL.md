# Resource Catalog — Data Model

All tables below are additive migrations (`drizzle/0008_shallow_wolf_cub.sql`,
generated from `drizzle/schema.ts`). Nothing in FAZ 1–3's schema was altered.

## `publishers`

Canonical publisher identity. `slug` is unique; `normalizedName` (indexed) is
the deterministic dedup key produced by `PublisherNormalizer` — "3D
YAYINLARI", "3D Yayınları" and "3D Yayinlari" all resolve to the same row.

## `catalog_books`

The canonical book. Key fields:

| field | notes |
|---|---|
| `publisherId` | nullable FK to `publishers.id` |
| `slug` | unique |
| `isbn` | nullable, indexed (MySQL allows multiple `NULL`s under a plain index) |
| `bookType` | enum: `question_bank`, `topic_explanation`, `topic_explanation_question_bank`, `mock_exam`, `fasikul`, `past_questions`, `camp`, `test_book`, `reference`, `other` |
| `examScope` | enum: `TYT`, `AYT`, `TYT_AYT`, `YKS`, `GENEL` |
| `subject` | free-text, same convention as `yks_topics.subject` / `resources.subject` — no parallel subject table |
| `difficultyScore` / `difficultyLabel` / `difficultyConfidence` / `classificationMethod` | see `DIFFICULTY-ENGINE.md` |
| `manualOverride` | set by an admin "Change Difficulty" action; the pipeline never reclassifies while this is `1` |
| `needsReview` | true when confidence is below `RESOURCE_CATALOG_REVIEW_CONFIDENCE_THRESHOLD`, or a duplicate match was ambiguous |

Indexes: `publisherId`, `isbn`, `bookType`, `examScope`, `subject`,
`difficultyLabel`, `active`, `needsReview`, `createdAt` — matching the actual
filters `catalog.list` supports (spec §37: no blind indexing).

## `external_book_sources`

Raw, untouched snapshot of what a source returned — the audit trail that lets
canonical data survive a source outage or format change (spec §5). Unique on
`(source, sourceProductId)`; `matchedBookId` links it back to the canonical
row once the pipeline resolves it. `syncStatus`: `pending` | `processed` |
`needs_review` | `failed`.

## `book_offers`

Variable commercial data kept separate from the canonical row: `price`,
`currency`, `stockStatus`, `productUrl`, and (unused today, reserved)
`affiliateUrl`/`affiliateEnabled` for a future affiliate integration. Unique
on `(bookId, source)` — one offer row per source per book.

## `book_curriculum_topics`

Pivot to the **existing** `yks_topics` table (no parallel curriculum system).
`mappingMethod`: `rule` | `ai` | `manual`. `confidence` (0–1) and
`isVerified` (0/1) — a row is only ever created with `isVerified = 0`; an
admin action is what verifies it. A verified mapping is never silently
downgraded by a later automatic sync (`catalogDb.upsertBookCurriculumMapping`
early-returns if `isVerified = 1`).

## `resource_catalog_sync_logs`

One row per non-dry-run import invocation: `fetched`/`created`/`updated`/
`skipped`/`failed`/`needsReview` counts, `statsJson` (the full
`ImportResultStats`), `errorLog`, and `triggeredBy` (nullable admin user id).
Dry runs never write a log row.

## Why no new `subjects`/`exam_subjects` table

The project's curriculum is already canonical in `yks_topics`
(`exam`/`subject`/`topic`/`unit`). `catalog_books.subject` and `.examScope`
are free-text/enum fields that mirror that same convention; the *link* to
real curriculum entries is `book_curriculum_topics`, not a second subject
hierarchy.
