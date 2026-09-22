import { Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { formatDateTime, paymentStatusLabel } from "./adminFormat";

/** /admin/payments (spec §27) — kart bilgisi gibi hassas veri şemada zaten hiç yok; sağlayıcı ID'leri maskeli gelir. */
export default function AdminPaymentsPage() {
  const list = trpc.admin.payments.list.useQuery({ limit: 100 });

  return (
    <Card className="soft-card overflow-hidden">
      {list.isLoading ? (
        <div className="flex justify-center p-10"><Loader2 className="animate-spin text-[#3b5ccc]" size={20} /></div>
      ) : !list.data?.length ? (
        <div className="p-8 text-center text-[12px] text-[#858690]">Henüz ödeme kaydı yok.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-[12px]">
            <thead className="border-b border-[#1f2333]/[0.06] bg-[#fafafa] text-[10px] uppercase tracking-[.1em] text-[#9a9ba3]"><tr><th className="px-4 py-2.5">Kullanıcı</th><th className="px-4 py-2.5">Tutar</th><th className="px-4 py-2.5">Sağlayıcı</th><th className="px-4 py-2.5">Durum</th><th className="px-4 py-2.5">Tür</th><th className="px-4 py-2.5">İşlem ID</th><th className="px-4 py-2.5">Tarih</th></tr></thead>
            <tbody className="divide-y divide-[#1f2333]/[0.06]">
              {list.data.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-2.5 font-medium text-[#343643]">{row.userName || row.userEmail || `#${row.userId}`}</td>
                  <td className="px-4 py-2.5">{(row.amount / 100).toFixed(2)} {row.currency}</td>
                  <td className="px-4 py-2.5 text-[#8b8c95]">{row.provider}</td>
                  <td className="px-4 py-2.5 text-[#8b8c95]">{paymentStatusLabel[row.status] ?? row.status}</td>
                  <td className="px-4 py-2.5 text-[#8b8c95]">{row.paymentType ?? "—"}</td>
                  <td className="px-4 py-2.5 font-mono text-[10px] text-[#a0a1a9]">{row.providerPaymentId ?? "—"}</td>
                  <td className="px-4 py-2.5 text-[#8b8c95]">{formatDateTime(row.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
