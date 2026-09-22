# Resource Catalog — Recommendation Engine

## Inputs

`ResourceRecommendationService` (`server/resourceCatalog/recommendationService.ts`)
reuses the project's **existing** topic-performance data —
`getUserTopicProgress(userId)` from `server/db.ts`, the same function the
Konu Haritası section already uses — instead of inventing a parallel
performance model. Each topic carries `subject`, `topic`, `exam`,
`accuracy` (0–100, from `topicProgress.progress`) and `status`
(`Zayıf`/`Orta`/`İyi`).

## Scoring (spec §21/§22)

For a given topic and candidate book, six signals in `[0, 1]` are combined
with config-driven weights (`resourceCatalogConfig.recommendation.weights`,
`server/resourceCatalog/config.ts`):

| signal | what it measures |
|---|---|
| `difficultyFit` | how well the book's difficulty matches the *ideal* difficulty for this status — `Zayıf` prefers easy first (medium second, hard low priority), `Orta` prefers medium, `İyi` prefers hard |
| `subjectMatch` | book subject vs topic subject (partial credit for a subject-agnostic book) |
| `examMatch` | book exam scope covers the topic's exam (`TYT_AYT`/`YKS`/`GENEL` always match) |
| `topicMatch` | book has a `book_curriculum_topics` mapping to this exact topic |
| `bookTypeMatch` | learning-type books (topic explanations) fit `Zayıf`, practice books fit `Orta`, exam-stage books (mock exams, past questions) fit `İyi` |
| `performanceMatch` | how close the book's difficulty score is to the student's accuracy + a small stretch margin |

The weighted sum is then **damped by the book's own difficulty
classification confidence** (`score *= 0.5 + 0.5 * confidence`) — an
uncertain auto-classification can never outrank a confidently-classified
alternative, and books for a different subject are excluded outright (books
missing a subject match, i.e. `subjectMatch === 0`, are filtered from the
result entirely).

## Labels, not sales pitches (spec §22/§34)

`recommendationService.ts` only ever returns one of:
`"Temel tekrar kaynağı"`, `"Seviyene uygun"`,
`"Bir sonraki seviyeye geçiş"`, `"İleri seviye"` — never "kesinlikle bunu al"
or any other commercial imperative. The `reason` string is always the same
explainable template: *"Mevcut performansına (%X doğruluk, {durum}) ve
seçtiğin konuya ({konu}) göre."* — and appends *"(zorluk otomatik tahmin,
düşük güven)"* whenever the underlying difficulty classification is below the
review-confidence threshold, so an uncertain auto-classification is never
presented as settled fact.

## Aggregation across a student's whole profile

`recommendForStudent(topics, books, { limitPerTopic, overallLimit })` sorts
topics `Zayıf` → `Orta` → `İyi` (weak topics are never crowded out by strong
ones) and takes the top N per topic, capped to `overallLimit` (default 12).
Exposed as `catalog.recommendations` (protected tRPC procedure).

## Deliberately out of scope for v1

No AI is involved in recommendation scoring — every subscore and the final
label are derivable from the inputs (spec: "motor ilk sürümde
açıklanabilir/deterministic olmalıdır"). Covered by
`server/resourceCatalog/recommendationService.test.ts`.
