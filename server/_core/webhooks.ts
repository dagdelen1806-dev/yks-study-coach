import express, { type Express } from "express";
import { paymentProviderFactory } from "../subscriptions/paymentProviders/factory";
import { processWebhookEvent } from "../subscriptions/webhookProcessor";

/**
 * Ödeme sağlayıcısı webhook uç noktası (spec §17): POST /api/webhooks/:provider.
 *
 * Bu route'un `express.raw()` ile HAM body alması gerekiyor — imza
 * doğrulaması (HMAC/JWS) sunucunun body'yi parse ettiği ŞEKLE değil, tam
 * olarak sağlayıcının gönderdiği bayt dizisine bakar. Bu yüzden bu fonksiyon
 * `server/_core/index.ts`'te global `express.json()` middleware'inden
 * ÖNCE çağrılmalı — aksi halde body zaten JSON'a çevrilmiş, ham imza
 * doğrulaması bozulmuş olur.
 */
export function registerWebhookRoutes(app: Express) {
  app.post("/api/webhooks/:provider", express.raw({ type: "*/*", limit: "2mb" }), async (req, res) => {
    const providerName = req.params.provider;
    const provider = paymentProviderFactory(providerName);

    try {
      const verification = await provider.handleWebhook({ rawBody: req.body, headers: req.headers as Record<string, string | string[] | undefined> });
      if (!verification.valid) {
        console.warn(`[Webhook] ${providerName} imza doğrulaması başarısız: ${verification.reason}`);
        res.status(401).json({ error: "invalid_signature" });
        return;
      }
      if (!verification.eventId || !verification.eventType || !verification.payload || typeof verification.payload !== "object") {
        res.status(400).json({ error: "invalid_payload" });
        return;
      }

      const result = await processWebhookEvent({
        provider: providerName,
        eventId: verification.eventId,
        eventType: verification.eventType,
        payload: verification.payload,
        rawPayloadForAudit: verification.payload,
      });

      console.log(`[Webhook] ${providerName}/${verification.eventType} -> ${result.status}${result.reason ? ` (${result.reason})` : ""}`);
      res.status(200).json({ received: true, status: result.status });
    } catch (error) {
      // ProviderConfigRequiredError (Apple/Google henüz yapılandırılmadıysa)
      // dahil her hata burada yakalanır — sağlayıcıya asla 5xx dışında bir
      // "başarılı" yanıt dönmeyiz ki provider event'i tekrar denesin.
      console.error(`[Webhook] ${providerName} işlenirken hata:`, error);
      res.status(500).json({ error: "processing_failed" });
    }
  });
}
