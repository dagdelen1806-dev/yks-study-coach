import { z } from "zod";
import { adminProcedure, router } from "../../_core/trpc";
import { listAllPaymentsForAdmin } from "../../subscriptions/subscriptionDb";

const maskId = (value: string | null): string | null => (!value ? value : value.length <= 8 ? `${value.slice(0, 2)}••••` : `${value.slice(0, 4)}••••${value.slice(-4)}`);

export const adminPaymentsRouter = router({
  // Kart numarası/CVV gibi bir alan şemada zaten hiç yok (spec §27/§37 — "ASLA saklanmamalı"); providerPaymentId yine de maskelenir.
  list: adminProcedure.input(z.object({ limit: z.number().int().min(1).max(500).default(100) })).query(async ({ input }) => {
    const rows = await listAllPaymentsForAdmin(input.limit);
    return rows.map((row) => ({ ...row, providerPaymentId: maskId(row.providerPaymentId) }));
  }),
});
