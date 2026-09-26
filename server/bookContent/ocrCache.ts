import { createHash } from "node:crypto";
import { and, eq, lt } from "drizzle-orm";
import { ocrPageCache } from "../../drizzle/schema";
import { getDb } from "../db";

/**
 * İçindekiler OCR önbelleği (migration 0017). Anahtar: öğrenci + görüntünün
 * SHA-256'sı + işlem hattı sürümü. Tablo henüz oluşturulmamışsa (migration
 * uygulanmadan deploy) önbellek sessizce devre dışı kalır; OCR yine çalışır.
 */

export const OCR_PIPELINE_VERSION = "toc-2.0";
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
let disabledReason: string | null = null;

export const imageHash = (buffer: Buffer | string) => createHash("sha256").update(buffer).digest("hex");

function disable(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (!disabledReason) console.warn(`[OCR cache] disabled: ${message.slice(0, 200)}`);
  disabledReason = message;
}

export async function readOcrCache<T>(userId: number, hash: string): Promise<T | null> {
  if (disabledReason) return null;
  try {
    const db = await getDb();
    if (!db) return null;
    const [row] = await db.select({ resultJson: ocrPageCache.resultJson, createdAt: ocrPageCache.createdAt }).from(ocrPageCache)
      .where(and(eq(ocrPageCache.userId, userId), eq(ocrPageCache.imageHash, hash), eq(ocrPageCache.pipelineVersion, OCR_PIPELINE_VERSION))).limit(1);
    if (!row || Date.now() - new Date(row.createdAt).getTime() > CACHE_TTL_MS) return null;
    return JSON.parse(row.resultJson) as T;
  } catch (error) {
    disable(error);
    return null;
  }
}

export async function writeOcrCache(userId: number, hash: string, result: unknown): Promise<void> {
  if (disabledReason) return;
  try {
    const db = await getDb();
    if (!db) return;
    const resultJson = JSON.stringify(result);
    await db.insert(ocrPageCache).values({ userId, imageHash: hash, pipelineVersion: OCR_PIPELINE_VERSION, resultJson }).onDuplicateKeyUpdate({ set: { resultJson, createdAt: new Date() } });
    // Eski kayıtlar fırsat buldukça temizlenir.
    await db.delete(ocrPageCache).where(and(eq(ocrPageCache.userId, userId), lt(ocrPageCache.createdAt, new Date(Date.now() - CACHE_TTL_MS))));
  } catch (error) {
    disable(error);
  }
}
