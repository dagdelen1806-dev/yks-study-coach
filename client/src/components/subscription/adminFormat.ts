export const approvalLabel: Record<string, string> = { pending: "Onay bekliyor", approved: "Onaylı", rejected: "Reddedildi" };
export const approvalTone: Record<string, string> = { pending: "bg-[#fff8df] text-[#a1711d]", approved: "bg-[#e9f7f0] text-[#2e8666]", rejected: "bg-[#fff0ed] text-[#d95d4d]" };

export const accountStatusLabel: Record<string, string> = { active: "Aktif", suspended: "Askıya alındı", deleted: "Silindi" };
export const accountStatusTone: Record<string, string> = { active: "bg-[#e9f7f0] text-[#2e8666]", suspended: "bg-[#fff0ed] text-[#d95d4d]", deleted: "bg-[#f7f5ef] text-[#858690]" };

export const subscriptionStatusLabel: Record<string, string> = {
  trialing: "Deneme", active: "Aktif", past_due: "Ödeme gecikti", grace_period: "Ek süre", canceled: "İptal", expired: "Süresi doldu", paused: "Duraklatıldı", incomplete: "Tamamlanmadı",
};
export const subscriptionStatusTone: Record<string, string> = {
  trialing: "bg-[#fff8df] text-[#a1711d]", active: "bg-[#e9f7f0] text-[#2e8666]", past_due: "bg-[#fff0ed] text-[#d95d4d]", grace_period: "bg-[#fff8df] text-[#a1711d]", canceled: "bg-[#f7f5ef] text-[#858690]", expired: "bg-[#f7f5ef] text-[#858690]", paused: "bg-[#edf1ff] text-[#3b5ccc]", incomplete: "bg-[#f7f5ef] text-[#858690]",
};

export const paymentStatusLabel: Record<string, string> = { pending: "Bekliyor", authorized: "Onaylandı", paid: "Ödendi", failed: "Başarısız", refunded: "İade edildi", partially_refunded: "Kısmi iade", canceled: "İptal" };

export const formatDate = (value: string | Date | null | undefined) => (value ? new Date(value).toLocaleDateString("tr-TR") : "—");
export const formatDateTime = (value: string | Date | null | undefined) => (value ? new Date(value).toLocaleString("tr-TR") : "—");
export const formatMoney = (minorUnits: number, currency: string) => `${(minorUnits / 100).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency === "TRY" ? "₺" : currency}`;
