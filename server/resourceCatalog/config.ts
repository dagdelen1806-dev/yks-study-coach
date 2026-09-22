// Config-driven tuning for the Resource Catalog module (FAZ 4A). This is the
// equivalent of a Laravel `config/resource_catalog.php`: every threshold and
// weight below is read from `process.env` with a sane default, never
// hard-coded in the engine/pipeline code itself. Secrets (API keys) live in
// `server/_core/env.ts` / `.env`, never here.
const int = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const float = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) ? parsed : fallback;
};

const bool = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) return fallback;
  return value === "1" || value.toLowerCase() === "true";
};

export const resourceCatalogConfig = {
  difficulty: {
    // 0-100 score thresholds. Score <= easyMax -> easy, <= mediumMax -> medium, else hard.
    thresholds: {
      easyMax: int(process.env.RESOURCE_CATALOG_DIFFICULTY_EASY_MAX, 39),
      mediumMax: int(process.env.RESOURCE_CATALOG_DIFFICULTY_MEDIUM_MAX, 69),
    },
    // Hybrid engine weights. Renormalized at runtime if a layer is unavailable
    // (e.g. no AI signal), so they don't need to sum to 1 here.
    weights: {
      rule: float(process.env.RESOURCE_CATALOG_WEIGHT_RULE, 0.45),
      ai: float(process.env.RESOURCE_CATALOG_WEIGHT_AI, 0.4),
      metadata: float(process.env.RESOURCE_CATALOG_WEIGHT_METADATA, 0.15),
    },
    aiEnabled: bool(process.env.RESOURCE_CATALOG_AI_ENABLED, false),
    // Below this confidence, classification is flagged needsReview = true.
    reviewConfidenceThreshold: float(process.env.RESOURCE_CATALOG_REVIEW_CONFIDENCE_THRESHOLD, 0.55),
  },
  recommendation: {
    weights: {
      difficultyFit: float(process.env.RESOURCE_CATALOG_REC_WEIGHT_DIFFICULTY_FIT, 0.35),
      subjectMatch: float(process.env.RESOURCE_CATALOG_REC_WEIGHT_SUBJECT_MATCH, 0.2),
      examMatch: float(process.env.RESOURCE_CATALOG_REC_WEIGHT_EXAM_MATCH, 0.15),
      topicMatch: float(process.env.RESOURCE_CATALOG_REC_WEIGHT_TOPIC_MATCH, 0.15),
      bookTypeMatch: float(process.env.RESOURCE_CATALOG_REC_WEIGHT_BOOK_TYPE_MATCH, 0.05),
      performanceMatch: float(process.env.RESOURCE_CATALOG_REC_WEIGHT_PERFORMANCE_MATCH, 0.1),
    },
  },
  importer: {
    concurrency: int(process.env.RESOURCE_CATALOG_IMPORT_CONCURRENCY, 1),
    delayMs: int(process.env.RESOURCE_CATALOG_IMPORT_DELAY_MS, 800),
    timeoutMs: int(process.env.RESOURCE_CATALOG_IMPORT_TIMEOUT_MS, 15_000),
    maxRetries: int(process.env.RESOURCE_CATALOG_IMPORT_MAX_RETRIES, 3),
    maxPages: int(process.env.RESOURCE_CATALOG_IMPORT_MAX_PAGES, 50),
    maxProducts: int(process.env.RESOURCE_CATALOG_IMPORT_MAX_PRODUCTS, 5000),
  },
  // In-process background sync (spec: kaynak kataloğu kitapisler.com'dan
  // sürekli güncellenen bir yapı olmalı) — periodically re-runs the same
  // KitapIslerSource pipeline the CLI uses, so the catalog stays fresh
  // without a human running `pnpm resource-catalog` by hand. Off by default
  // under `NODE_ENV=test` so the test suite never makes network calls.
  scheduler: {
    enabled: bool(process.env.RESOURCE_CATALOG_SCHEDULER_ENABLED, process.env.NODE_ENV !== "test"),
    intervalMs: int(process.env.RESOURCE_CATALOG_SCHEDULER_INTERVAL_MS, 6 * 60 * 60 * 1000),
    initialDelayMs: int(process.env.RESOURCE_CATALOG_SCHEDULER_INITIAL_DELAY_MS, 30_000),
    limitPerRun: int(process.env.RESOURCE_CATALOG_SCHEDULER_LIMIT_PER_RUN, 300),
  },
} as const;

export type ResourceCatalogConfig = typeof resourceCatalogConfig;
