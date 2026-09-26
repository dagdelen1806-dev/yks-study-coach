import type { Express } from "express";
import { authenticateRequest } from "../_core/session";
import { getAttachmentStorage } from "./attachmentStorage";

/**
 * Not eklerini (fotoğraf/ses) YALNIZCA sahibine sunar: oturum çerezi doğrulanır,
 * ek o kullanıcıya ait değilse 404 (varlığı da sızdırılmaz). Tarayıcı `<img>` /
 * `<audio>` aynı kökenden çerezi gönderdiği için ek bir imzalı URL gerekmez.
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
      const attachment = await getAttachmentStorage().get(userId, id);
      if (!attachment) { res.status(404).end(); return; }
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
