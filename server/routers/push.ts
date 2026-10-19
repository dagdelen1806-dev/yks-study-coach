import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { hasSubscription, pushPublicKey, removeSubscription, saveSubscription, sendToUser } from "../push/push";

const subscriptionInput = z.object({
  endpoint: z.string().url().max(600),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

/** Oturum hatırlatmaları (Web Push). Her uç `ctx.user.id` ile kapsamlı. */
export const pushRouter = router({
  // VAPID anahtarı yoksa null: istemci hatırlatma seçeneğini hiç göstermez.
  config: publicProcedure.query(() => ({ publicKey: pushPublicKey() })),
  // Bu cihazın aboneliği sunucuda kayıtlı mı (tarayıcıda abonelik olup sunucuda silinmiş olabilir).
  status: protectedProcedure.input(z.object({ endpoint: z.string().max(600) })).query(async ({ ctx, input }) => ({ subscribed: await hasSubscription(ctx.user.id, input.endpoint) })),
  subscribe: protectedProcedure.input(subscriptionInput).mutation(async ({ ctx, input }) => {
    if (!pushPublicKey()) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Bildirimler şu an kullanılamıyor." });
    await saveSubscription(ctx.user.id, input, ctx.req.headers["user-agent"] ?? null);
    return { subscribed: true };
  }),
  unsubscribe: protectedProcedure.input(z.object({ endpoint: z.string().max(600) })).mutation(async ({ ctx, input }) => {
    await removeSubscription(ctx.user.id, input.endpoint);
    return { subscribed: false };
  }),
  test: protectedProcedure.mutation(async ({ ctx }) => {
    const outcome = await sendToUser(ctx.user.id, { title: "Hatırlatmalar açık", body: "Planındaki her oturumdan birkaç dakika önce burada haber vereceğim.", url: "/takvim", tag: "test" });
    if (!outcome.delivered) throw new TRPCError({ code: "BAD_REQUEST", message: "Bildirim gönderilemedi. Bildirim iznini kontrol edip tekrar dener misin?" });
    return outcome;
  }),
});
