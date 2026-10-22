import type { Express } from "express";
import { authenticateRequest } from "../_core/session";
import { SIGNED_URL_TTL_SEC, getAttachmentStorage } from "./attachmentStorage";

/**
 * Defter ve Duvarım eklerini (fotoğraf/ses) YALNIZCA sahibine sunar: oturum çerezi doğrulanır,
 * ek o kullanıcıya ait değilse 404 (varlığı da sızdırılmaz). Dosya veritabanındaysa doğrudan
 * gönderilir; Supabase Storage'daysa sahiplik doğrulandıktan sonra kısa süreli imzalı bağlantıya
 * yönlendirilir (bucket public değildir, bağlantı süresi dolunca geçersizdir).
 */
export function registerNoteAttachmentRoutes(app: Express) {
  app.get("/api/notes/attachments/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) { res.status(400).end(); return; }
    let userId: number;
    try {
      userId = (await authenticateRequest(req)).id;
    } catch {
      res.status(401).end();
      return;
    }
    try {
      const attachment = await getAttachmentStorage().locate(userId, id);
      if (!attachment) { res.status(404).end(); return; }
      if ("url" in attachment) {
        // Supabase Storage: sahiplik doğrulandı, kısa süreli imzalı bağlantıya yönlendirilir.
        res.setHeader("Cache-Control", `private, max-age=${Math.floor(SIGNED_URL_TTL_SEC / 2)}`);
        res.redirect(302, attachment.url);
        return;
      }
      res.setHeader("Content-Type", attachment.mimeType);
      res.setHeader("Content-Length", String(attachment.data.byteLength));
      res.setHeader("Cache-Control", "private, max-age=3600");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Disposition", "inline");
      res.end(attachment.data);
    } catch (error) {
      console.error("[Notes] attachment read failed:", error instanceof Error ? error.message : error);
      res.status(500).end();
    }
  });
}
