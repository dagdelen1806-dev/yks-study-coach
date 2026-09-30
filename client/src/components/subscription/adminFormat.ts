export const approvalLabel: Record<string, string> = { pending: "Onay bekliyor", approved: "Onaylı", rejected: "Reddedildi" };
export const approvalTone: Record<string, string> = { pending: "bg-warn-soft text-warn", approved: "bg-success-soft text-success", rejected: "bg-danger-soft text-danger" };

export const accountStatusLabel: Record<string, string> = { active: "Aktif", suspended: "Askıya alındı", deleted: "Silindi" };
export const accountStatusTone: Record<string, string> = { active: "bg-success-soft text-success", suspended: "bg-danger-soft text-danger", deleted: "bg-paper text-ink-3" };

export const subscriptionStatusLabel: Record<string, string> = {
  trialing: "Deneme", active: "Aktif", past_due: "Ödeme gecikti", grace_period: "Ek süre", canceled: "İptal", expired: "Süresi doldu", paused: "Duraklatıldı", incomplete: "Tamamlanmadı",
};
export const subscriptionStatusTone: Record<string, string> = {
  trialing: "bg-warn-soft text-warn", active: "bg-success-soft text-success", past_due: "bg-danger-soft text-danger", grace_period: "bg-warn-soft text-warn", canceled: "bg-paper text-ink-3", expired: "bg-paper text-ink-3", paused: "bg-brand-soft text-brand", incomplete: "bg-paper text-ink-3",
};

export const paymentStatusLabel: Record<string, string> = { pending: "Bekliyor", authorized: "Onaylandı", paid: "Ödendi", failed: "Başarısız", refunded: "İade edildi", partially_refunded: "Kısmi iade", canceled: "İptal" };

export const formatDate = (value: string | Date | null | undefined) => (value ? new Date(value).toLocaleDateString("tr-TR") : "—");
export const formatDateTime = (value: string | Date | null | undefined) => (value ? new Date(value).toLocaleString("tr-TR") : "—");
export const formatMoney = (minorUnits: number, currency: string) => `${(minorUnits / 100).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency === "TRY" ? "₺" : currency}`;
