import "dotenv/config";
import { catalogDb, listNeedsReviewBooks } from "./catalogDb";
import { LlmDifficultyClassifier } from "./difficulty/aiClassifier";
import { HybridDifficultyClassifier } from "./difficulty/hybridClassifier";
import { RuleBasedDifficultyClassifier } from "./difficulty/ruleBasedClassifier";
import { ResourceCatalogImportPipeline } from "./pipeline/orchestrator";
import { FixtureBookSource } from "./sources/fixtureSource";
import { KitapIslerSource } from "./sources/kitapIslerSource";
import type { ImportResultStats } from "./types";

/**
 * `pnpm resource-catalog [--source=fixture|kitapisler] [--limit=N] [--dry-run]
 *   [--force] [--no-ai] [--only-new] [--review-needed]`
 *
 * `--source=fixture` (default) is the tested, offline path — safe to run
 * anytime. `--source=kitapisler` performs a real, rate-limited HTTP crawl;
 * see `docs/resource-catalog/OPERATIONS.md` before running it without
 * `--dry-run`. The server also runs this same crawl on a timer (see
 * `scheduler.ts`) so the catalog keeps itself fresh; this CLI remains for
 * one-off/manual runs (backfills, `--dry-run` checks, `--review-needed`).
 */
type CliArgs = { source: string; limit?: number; dryRun: boolean; force: boolean; noAi: boolean; onlyNew: boolean; reviewNeeded: boolean };

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { source: "fixture", dryRun: false, force: false, noAi: false, onlyNew: false, reviewNeeded: false };
  for (const arg of argv) {
    if (arg.startsWith("--source=")) args.source = arg.slice("--source=".length);
    else if (arg.startsWith("--limit=")) args.limit = Number.parseInt(arg.slice("--limit=".length), 10);
    else if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--force") args.force = true;
    else if (arg === "--no-ai") args.noAi = true;
    else if (arg === "--only-new") args.onlyNew = true;
    else if (arg === "--review-needed") args.reviewNeeded = true;
  }
  return args;
}

function printReport(stats: ImportResultStats): void {
  console.log("\nRESOURCE CATALOG SYNC REPORT");
  console.log(`Kaynak: ${stats.source}`);
  console.log(`Dry run: ${stats.dryRun ? "evet" : "hayır"}`);
  console.log(`Taranan: ${stats.fetched}`);
  console.log(`Oluşturulan: ${stats.created}`);
  console.log(`Güncellenen: ${stats.updated}`);
  console.log(`Atlanan: ${stats.skipped}`);
  console.log(`Başarısız: ${stats.failed}`);
  console.log(`İncelemesi gereken: ${stats.needsReview}`);
  console.log("\nZorluk dağılımı:");
  console.log(`  Kolay: ${stats.difficulty.easy}`);
  console.log(`  Orta: ${stats.difficulty.medium}`);
  console.log(`  Zor: ${stats.difficulty.hard}`);
  console.log(`  İnceleme gereken: ${stats.difficulty.needsReview}`);
  console.log(`\nMüfredat eşleşmesi: ${stats.curriculumMapped} kitap eşleşti, ${stats.curriculumUnmapped} kitap eşleşmedi`);
  console.log(
    `Eksik alanlar: isbn=${stats.missing.isbn}, publisher=${stats.missing.publisher}, subject=${stats.missing.subject}, examScope=${stats.missing.examScope}, bookType=${stats.missing.bookType}, image=${stats.missing.image}, price=${stats.missing.price}`
  );
  if (stats.errors.length) {
    console.log(`\nHatalar (${stats.errors.length}):`);
    for (const error of stats.errors.slice(0, 20)) console.log(`  - ${error.sourceProductId ?? "?"}: ${error.message}`);
  }
  console.log(`\nBaşlangıç: ${stats.startedAt}\nBitiş: ${stats.finishedAt}\n`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.reviewNeeded) {
    const rows = await listNeedsReviewBooks();
    console.log(`RESOURCE CATALOG — İNCELEME KUYRUĞU (${rows.length} kayıt)`);
    for (const row of rows) {
      console.log(`- #${row.id} ${row.name} (skor ${row.difficultyScore}, güven ${row.difficultyConfidence}, yöntem ${row.classificationMethod})`);
    }
    return;
  }

  const source = args.source === "kitapisler" ? new KitapIslerSource() : new FixtureBookSource();
  const classifier = new HybridDifficultyClassifier(new RuleBasedDifficultyClassifier(), new LlmDifficultyClassifier());
  const pipeline = new ResourceCatalogImportPipeline(source, catalogDb, classifier);

  const stats = await pipeline.run({
    limit: args.limit,
    dryRun: args.dryRun,
    force: args.force,
    noAi: args.noAi,
    onlyNew: args.onlyNew,
  });

  printReport(stats);
}

main().catch((error) => {
  console.error("[ResourceCatalog CLI] Fatal:", error);
  process.exitCode = 1;
});
