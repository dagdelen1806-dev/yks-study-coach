import { z } from "zod";

/** Kurumsal fiyat teklifi: kalemler KDV hariç TL; indirim ara toplama, KDV indirimli tutara uygulanır. */
export const QUOTE_STATUSES = ["draft", "sent", "accepted", "rejected"] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];
export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = { draft: "Taslak", sent: "Gönderildi", accepted: "Kabul edildi", rejected: "Reddedildi" };

export const quoteLineSchema = z.object({
  description: z.string().trim().min(1).max(200),
  quantity: z.number().int().min(1).max(100_000),
  unitPriceTry: z.number().int().min(0).max(100_000_000),
});
export type QuoteLine = z.infer<typeof quoteLineSchema>;

export type QuoteTotals = { subtotal: number; discount: number; net: number; vat: number; total: number };

export function computeQuoteTotals(lines: QuoteLine[], discountPercent: number, vatRate: number): QuoteTotals {
  const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.unitPriceTry, 0);
  const discount = Math.round((subtotal * Math.min(100, Math.max(0, discountPercent))) / 100);
  const net = subtotal - discount;
  const vat = Math.round((net * Math.max(0, vatRate)) / 100);
  return { subtotal, discount, net, vat, total: net + vat };
}

/** Okunabilir teklif numarası: T-2026-0007. */
export const quoteNumber = (id: number, createdAt: Date | string) => `T-${new Date(createdAt).getFullYear()}-${String(id).padStart(4, "0")}`;

export const formatTry = (value: number) => `${value.toLocaleString("tr-TR")} TL`;
