import { createHash } from "node:crypto";
import { and, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import type { Express, NextFunction, Request, Response } from "express";
import { z } from "zod";
import { appErrors } from "../../drizzle/schema";
import { clampMessage, clampStack, errorFingerprintKey, isIgnoredClientError, type ErrorSource } from "../../shared/errorLog";
import { checkRateLimit } from "../_core/rateLimit";
import { authenticateRequest } from "../_core/session";
import { getDb } from "../db";

/**
 * Hata kaydı (Admin → Hatalar). Kayıt asla uygulamayı bozmaz: veritabanı yoksa ya da
 * yazma başarısız olursa yalnızca konsola düşer.
 */
export async function recordAppError(input: { source: ErrorSource; message: string; stack?: string | null; path?: string | null; userId?: number | null; userAgent?: string | null }) {
  try {
    const db = await getDb();
    if (!db) return;
    const message = clampMessage(input.message);
    const stack = clampStack(input.stack);
    const fingerprint = createHash("sha256").update(errorFingerprintKey(input.source, message, stack)).digest("hex");
    const now = new Date();
    const latest = { message, stack, path: input.path?.slice(0, 300) ?? null, lastUserId: input.userId ?? null, userAgent: input.userAgent?.slice(0, 300) ?? null };
    await db
      .insert(appErrors)
      .values({ fingerprint, source: input.source, ...latest, firstSeenAt: now, lastSeenAt: now })
      // Tekrar: sayaç artar, son görülen bilgiler güncellenir, çözülmüşse yeniden açılır.
      .onConflictDoUpdate({ target: appErrors.fingerprint, set: { ...latest, count: sql`${appErrors.count} + 1`, lastSeenAt: now, resolvedAt: null } });
  } catch (error) {
    console.error("[ErrorLog] could not record:", error instanceof Error ? error.message : error);
  }
}

export async function listAppErrors(status: "open" | "resolved", limit = 200) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(appErrors).where(status === "open" ? isNull(appErrors.resolvedAt) : isNotNull(appErrors.resolvedAt)).orderBy(desc(appErrors.lastSeenAt)).limit(limit);
}

export async function resolveAppError(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(appErrors).set({ resolvedAt: new Date() }).where(and(eq(appErrors.id, id), isNull(appErrors.resolvedAt)));
}

const clientReport = z.object({
  message: z.string().min(1).max(2000),
  stack: z.string().max(20000).nullish(),
  path: z.string().max(300).nullish(),
});

const clientIp = (req: Request) => (typeof req.headers["x-forwarded-for"] === "string" ? req.headers["x-forwarded-for"].split(",")[0].trim() : req.socket.remoteAddress ?? "unknown");

export function registerErrorLogRoutes(app: Express) {
  // Tarayıcıdan gelen hata raporu. Oturum varsa kullanıcı eklenir; yoksa da kabul edilir
  // (giriş ekranındaki hata da önemli). IP başına sınırlı; yanıt her durumda boş.
  app.post("/api/errors", async (req, res) => {
    try {
      checkRateLimit(`client-error:${clientIp(req)}`, 30, 10 * 60 * 1000);
    } catch {
      res.status(429).end();
      return;
    }
    const parsed = clientReport.safeParse(req.body);
    if (!parsed.success || isIgnoredClientError(parsed.data.message, parsed.data.stack)) {
      res.status(204).end();
      return;
    }
    const user = await authenticateRequest(req).catch(() => null);
    await recordAppError({ source: "client", message: parsed.data.message, stack: parsed.data.stack, path: parsed.data.path, userId: user?.id ?? null, userAgent: typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : null });
    res.status(204).end();
  });
}

/** Express rotalarında yakalanmamış hata: kaydedilir, kullanıcıya genel bir mesaj döner. */
export function errorLogMiddleware(error: unknown, req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) { next(error); return; }
  // Bozuk JSON, çok büyük gövde gibi istemci hataları (4xx) kod hatası değildir: kaydedilmez.
  const status = (error as { status?: number; statusCode?: number } | null)?.status ?? (error as { statusCode?: number } | null)?.statusCode;
  if (typeof status === "number" && status >= 400 && status < 500) { res.status(status).json({ error: "Geçersiz istek." }); return; }
  const err = error instanceof Error ? error : new Error(String(error));
  console.error(`[Express] ${req.method} ${req.path}:`, err.message);
  void recordAppError({ source: "server", message: err.message, stack: err.stack, path: `${req.method} ${req.path}` });
  res.status(500).json({ error: "Beklenmeyen bir hata oluştu." });
}
