# Resource Catalog — API

tRPC (not a Flutter-facing REST API — this repo's frontend is React + Vite,
consuming the project's existing `AppRouter` via `@trpc/react-query`), mounted
as `catalog` on the root router (`server/routers.ts`).

## Public / protected

### `catalog.list` (public query)

```ts
trpc.catalog.list.useQuery({
  page?: number;         // default 1
  pageSize?: number;     // default 24, max 60 — the ~4,000-row catalog is never returned in one response
  exam?: "TYT" | "AYT" | "TYT_AYT" | "YKS" | "GENEL";
  subject?: string;
  publisherId?: number;
  bookType?: "question_bank" | "topic_explanation" | ... | "other";
  difficulty?: "easy" | "medium" | "hard";
  minPrice?: number;
  maxPrice?: number;
  search?: string;       // matches book name
  topic?: string;        // matches a mapped yks_topics.topic
});
// => { items: CatalogListItem[]; total; page; pageSize; totalPages }
```

`CatalogListItem` only exposes public fields (spec §31): `id`, `name`,
`slug`, `publisher`, `examScope`, `subject`, `bookType`, `imageUrl`,
`difficultyLabel`/`difficultyScore`/`difficultyConfidence`, `price`,
`productUrl`. Internal fields (`classificationMethod`, `manualOverride`,
`needsReview`, raw metadata) are never sent to the client.

### `catalog.get` (public query)

`{ slug }` → full book detail incl. `offers[]` and `relatedTopics[]`
(curriculum mappings with `confidence`/`verified`). Throws `NOT_FOUND` for an
unknown slug.

### `catalog.publishers` (public query)

`{ id, name }[]` — for a filter dropdown.

### `catalog.recommendations` (protected query)

`{ subject?, limit? }` → the current user's deterministic recommendations
(see `RECOMMENDATION.md`). Requires login (`protectedProcedure`), same as
every other personal-data endpoint in this project.

## Admin-only (`catalog.admin.*`)

Gated by the project's existing `adminProcedure` (`ctx.user.role === "admin"`)
— no new authorization system introduced.

| procedure | effect |
|---|---|
| `needsReview` (query) | current review queue |
| `syncLogs` (query, `{ limit? }`) | recent `resource_catalog_sync_logs` rows |
| `approve` (mutation, `{ bookId }`) | clears `needsReview` |
| `setDifficulty` (mutation, `{ bookId, label, score }`) | manual override — sets `manualOverride = true`, `classificationMethod = "manual"` |
| `markNeedsReview` (mutation, `{ bookId, needsReview }`) | manually flag/unflag |

A non-admin (or anonymous) caller gets `FORBIDDEN`/`UNAUTHORIZED` — covered by
`server/resourceCatalogApi.test.ts`.

## Performance (spec §36)

`listCatalogBooks` (`catalogQueries.ts`) batches publisher names and offers
with two `IN (...)` queries per page, not one query per row. Pagination is
mandatory (`pageSize` capped at 60 server-side regardless of what the client
requests).
