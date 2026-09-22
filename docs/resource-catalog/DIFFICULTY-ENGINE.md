# Resource Catalog — Difficulty Engine

## Storage

`catalog_books` never stores a bare `easy|medium|hard` alone:

```
difficultyScore      int      (0–100)
difficultyLabel       enum    easy | medium | hard   (derived from score via config thresholds)
difficultyConfidence  decimal (0–1)
classificationMethod  enum    rule | ai | hybrid | manual
manualOverride        boolean
needsReview           boolean
classifiedAt          timestamp
```

Thresholds are config-driven (`server/resourceCatalog/config.ts`,
`RESOURCE_CATALOG_DIFFICULTY_EASY_MAX` / `_MEDIUM_MAX`, default 39/69) — not
hard-coded in the classifiers.

## Layers

1. **Rule-based** (`difficulty/ruleBasedClassifier.ts`) — Turkish keyword
   signals (spec §14), matched on whole-phrase boundaries so "Zorunlu Din
   Kültürü" never triggers the "zor" (hard) signal — `RuleBasedDifficultyClassifier`
   pads the normalized text with spaces and does substring matching on
   ` phrase `, not a raw `includes("zor")`. Book type also nudges the score
   (spec §15) but never decides it alone — `topic_explanation` biases easier,
   `past_questions` biases harder, `question_bank` is neutral.
2. **Metadata** (`difficulty/hybridClassifier.ts` → `scoreFromMetadata`) — a
   source-provided hint (e.g. the legacy `resourceBookCatalog` seed's
   `Kolay/Orta/Zor` label, carried through as `rawMetadata.legacyLevel`) or a
   weak page-count heuristic. Returns `null` (no signal) rather than
   guessing when neither is available.
3. **AI** (`difficulty/aiClassifier.ts`, `LlmDifficultyClassifier`) — uses the
   project's existing `invokeLLM` (`server/_core/llm.ts`, same client the AI
   weekly plan and exam-document extraction routers already use — no new
   provider dependency), structured JSON-schema output
   (`{difficulty_label, difficulty_score, confidence, reason}`). Disabled by
   default (`RESOURCE_CATALOG_AI_ENABLED=false`); any failure (no API key,
   network error, malformed response) degrades to a zero-confidence
   "unavailable" result instead of throwing — `--no-ai` and a missing API key
   behave identically to the hybrid layer.
4. **Hybrid** (`difficulty/hybridClassifier.ts`) — combines whichever layers
   produced a signal. Each layer's *configured* weight
   (`RESOURCE_CATALOG_WEIGHT_RULE` / `_AI` / `_METADATA`, default
   0.45/0.4/0.15) is scaled by that layer's own confidence before averaging,
   so a failed/low-confidence AI call can't outvote a confident rule match,
   and a layer that produced no signal is simply excluded rather than
   defaulting to a fabricated neutral value.
5. **Manual review** — `needsReview = true` whenever the hybrid confidence is
   below `RESOURCE_CATALOG_REVIEW_CONFIDENCE_THRESHOLD` (default 0.55), or a
   duplicate match was ambiguous. The admin review queue
   (`catalog.admin.needsReview`) surfaces these; `Approve` clears the flag,
   `Change Difficulty` sets `manualOverride = true` and
   `classificationMethod = "manual"`.

## Manual override is permanent (spec §47)

`ResourceCatalogImportPipeline` checks `book.manualOverride` before ever
calling the classifier again:

```ts
if (!book.manualOverride && (isNewBook || options.force)) { /* reclassify */ }
```

An automatic sync — with or without `--force` — never touches a
manually-overridden book's difficulty. Covered by
`server/resourceCatalog/pipeline.test.ts` ("manuel override edilmiş zorluk
bilgisini bir sonraki sync ezmiyor").

## Tests

`server/resourceCatalog/difficulty.test.ts` — keyword signal detection, the
"Zorunlu" false-positive guard, book-type nudging, hybrid fallback when AI is
disabled/unavailable, metadata-hint influence, and confidence-threshold
behavior.
