import { catalogDb } from "./catalogDb";
import { resourceCatalogConfig } from "./config";
import { LlmDifficultyClassifier } from "./difficulty/aiClassifier";
import { HybridDifficultyClassifier } from "./difficulty/hybridClassifier";
import { RuleBasedDifficultyClassifier } from "./difficulty/ruleBasedClassifier";
import { ResourceCatalogImportPipeline } from "./pipeline/orchestrator";
import { KitapIslerSource } from "./sources/kitapIslerSource";

let intervalHandle: ReturnType<typeof setInterval> | null = null;
let initialTimeoutHandle: ReturnType<typeof setTimeout> | null = null;
let runInFlight = false;

/**
 * Tek bir senkron döngüsü çalıştırır ve istatistikleri döner. Hem sürekli
 * çalışan bir süreçteki interval'dan (bkz. `startResourceCatalogScheduler`,
 * geleneksel/kalıcı sunucu barındırmasında) hem de sunucusuz (Vercel)
 * barındırmada bir Cron Job'un tetiklediği HTTP uç noktasından (bkz.
 * server/_core/app.ts `/api/cron/resource-catalog-sync`) çağrılabilir —
 * sunucusuz ortamda `setInterval` kalıcı olmadığı için bu paylaşılan
 * tek-döngü fonksiyonu şart.
 */
export async function runResourceCatalogSyncOnce(): Promise<{ alreadyRunning: true } | ({ alreadyRunning: false } & Awaited<ReturnType<ResourceCatalogImportPipeline["run"]>>)> {
  if (runInFlight) return { alreadyRunning: true }; // a slow crawl must never overlap with the next tick
  runInFlight = true;
  try {
    const source = new KitapIslerSource();
    const classifier = new HybridDifficultyClassifier(new RuleBasedDifficultyClassifier(), new LlmDifficultyClassifier());
    const pipeline = new ResourceCatalogImportPipeline(source, catalogDb, classifier);
    const stats = await pipeline.run({ limit: resourceCatalogConfig.scheduler.limitPerRun });
    console.log(
      `[ResourceCatalog Scheduler] kitapisler.com senkronu tamamlandı: ${stats.fetched} taranan, ${stats.created} yeni, ${stats.updated} güncellendi, ${stats.failed} hata.`
    );
    return { alreadyRunning: false, ...stats };
  } catch (error) {
    console.error("[ResourceCatalog Scheduler] senkron başarısız:", error);
    throw error;
  } finally {
    runInFlight = false;
  }
}

/**
 * Starts the periodic kitapisler.com -> catalog sync (spec: resource catalog
 * must be a continuously-updating structure, not a manually-triggered-only
 * CLI operation). Idempotent — a second call is a no-op unless `stopResourceCatalogScheduler`
 * ran first. `KitapIslerSource` already owns robots.txt checks, per-request
 * delay/timeout/retry and hard page/product ceilings, so this module only
 * owns the "when to run" concern.
 */
export function startResourceCatalogScheduler(): void {
  if (!resourceCatalogConfig.scheduler.enabled || intervalHandle) return;
  // Hata zaten runResourceCatalogSyncOnce içinde loglanıyor; burada yalnızca
  // interval'ın bir sonraki tick'te sağ kalması için yutuluyor.
  const runAndSwallow = () => void runResourceCatalogSyncOnce().catch(() => undefined);
  initialTimeoutHandle = setTimeout(runAndSwallow, resourceCatalogConfig.scheduler.initialDelayMs);
  initialTimeoutHandle.unref?.();
  intervalHandle = setInterval(runAndSwallow, resourceCatalogConfig.scheduler.intervalMs);
  intervalHandle.unref?.();
}

export function stopResourceCatalogScheduler(): void {
  if (initialTimeoutHandle) { clearTimeout(initialTimeoutHandle); initialTimeoutHandle = null; }
  if (intervalHandle) { clearInterval(intervalHandle); intervalHandle = null; }
}
