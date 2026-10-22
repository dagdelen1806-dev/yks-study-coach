import { EmptyNote, PageHeader, Panel, Segmented, StatCard } from "@/components/app/kit";
import { trpc } from "@/lib/trpc";
import { hasRole } from "@shared/org";
import { AlertTriangle, ClipboardCheck, FolderOpen, Hourglass, Inbox } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { CASE_STATUS_LABELS } from "./CaseFile";
import type { OrgScope } from "./OrgApp";
import { ORG_PATHS, relativeTime, studentPath } from "./orgShared";

type StatusFilter = "active" | "closed";
const CONFIDENCE = { high: "Yüksek güven", medium: "Orta güven", low: "Düşük güven" } as const;

/**
 * Kurum Paneli → Akademik takip. Öğretmen kendi öğrencilerinin inceleme önerilerini ve takip dosyalarını,
 * koordinatör ve yönetici kurumun tamamını görür; yönetici özeti yalnızca sayılardır (notlar mahrem).
 */
export default function OrgCases({ scope }: { scope: OrgScope }) {
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState<StatusFilter>("active");
  const status = trpc.org.cases.status.useQuery({ orgId: scope.orgId }, { retry: false });
  const enabled = Boolean(status.data?.enabled);
  const signals = trpc.org.cases.signals.useQuery({ orgId: scope.orgId }, { enabled, retry: false });
  const queue = trpc.org.cases.queue.useQuery({ orgId: scope.orgId }, { enabled, retry: false });
  const canSummary = hasRole(scope.role, "coordinator");
  const summary = trpc.org.cases.summary.useQuery({ orgId: scope.orgId }, { enabled: enabled && canSummary, retry: false });
  const openFile = (studentUserId: number) => setLocation(`${studentPath(studentUserId)}#takip`);

  const header = <PageHeader eyebrow={scope.orgName} title="Akademik takip" description="Karşılaştırılabilir denemelerde düşüş eğilimi görülen öğrenciler için inceleme önerileri ve takip dosyaları. Öneri bir teşhis değildir; sonucu her zaman öğretmen değerlendirir." />;
  if (!status.data) return <div className="space-y-5">{header}<EmptyNote>Yükleniyor…</EmptyNote></div>;
  if (!enabled) {
    return (
      <div className="space-y-5">
        {header}
        <EmptyNote>Akademik takip dosyaları bu kurumda kapalı.{hasRole(scope.role, "admin") ? <> <button onClick={() => setLocation(ORG_PATHS.settings)} className="font-semibold text-brand">Ayarlar → Kurum bilgileri</button> bölümünden açabilirsin.</> : " Kurum yöneticisi Ayarlar'dan açabilir."}</EmptyNote>
      </div>
    );
  }

  const suggestions = (signals.data ?? []).filter((signal) => signal.status === "signal" && !signal.openCaseId);
  const insufficient = (signals.data ?? []).filter((signal) => signal.status === "insufficient");
  const cases = (queue.data ?? []).filter((row) => (filter === "closed" ? row.status === "closed" : row.status !== "closed"));

  return (
    <div className="space-y-5">
      {header}
      {canSummary && summary.data && (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard icon={<Inbox size={18} />} label="Açık" value={String(summary.data.open)} foot={<span>henüz işlem yok</span>} />
          <StatCard icon={<FolderOpen size={18} />} label="Devam eden" value={String(summary.data.inProgress)} foot={<span>inceleme, plan ya da görüşme</span>} />
          <StatCard tone={summary.data.overdue ? "warn" : "plain"} icon={<Hourglass size={18} />} label="Geciken takip" value={String(summary.data.overdue)} foot={<span>7 günden uzun işlemsiz</span>} />
          <StatCard icon={<ClipboardCheck size={18} />} label="Son 30 günde sonuçlanan" value={String(summary.data.closedLast30)} foot={<span>öğretmen kararıyla</span>} />
        </div>
      )}

      <Panel icon={<AlertTriangle size={18} />} title="İnceleme önerileri" subtitle={`${suggestions.length} öğrenci${insufficient.length ? ` · ${insufficient.length} öğrencide karşılaştırma için yeterli deneme yok` : ""}`}>
        {suggestions.length === 0 ? <EmptyNote>Şu an yeni inceleme önerisi yok.</EmptyNote> : (
          <ul className="divide-y divide-rule">
            {suggestions.map((signal) => (
              <li key={`${signal.studentUserId}-${signal.examKind}`} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold text-ink">{signal.studentName}</div>
                  <div className="text-[13px] text-ink-3">{signal.description} · {CONFIDENCE[(signal.confidence ?? "medium") as keyof typeof CONFIDENCE]}</div>
                </div>
                <button onClick={() => openFile(signal.studentUserId)} className="rounded-xl border border-rule px-3 py-1.5 text-[13px] font-semibold text-brand hover:bg-brand-soft">İncele</button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel icon={<FolderOpen size={18} />} title="Takip dosyaları" action={<Segmented value={filter} options={[{ value: "active", label: "Süren" }, { value: "closed", label: "Sonuçlanan" }]} onChange={setFilter} label="Dosya durumu" />}>
        {cases.length === 0 ? <EmptyNote>{filter === "closed" ? "Sonuçlanmış dosya yok." : "Süren dosya yok."}</EmptyNote> : (
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-[13px]">
              <thead><tr className="border-y border-rule bg-paper/70 text-[12px] text-ink-3"><th className="px-5 py-2 font-semibold">Öğrenci</th><th className="px-3 py-2 font-semibold">Durum</th><th className="px-3 py-2 font-semibold">Güven</th><th className="px-3 py-2 font-semibold">Açılış</th><th className="px-3 py-2 font-semibold">Son işlem</th></tr></thead>
              <tbody className="divide-y divide-rule">
                {cases.map((row) => (
                  <tr key={row.id} onClick={() => openFile(row.studentUserId)} className="cursor-pointer hover:bg-paper/60">
                    <td className="px-5 py-2.5 font-semibold text-ink"><button onClick={(event) => { event.stopPropagation(); openFile(row.studentUserId); }} className="text-left hover:text-brand">{row.studentName}</button></td>
                    <td className="px-3 py-2.5 text-ink-2">{CASE_STATUS_LABELS[row.status]}</td>
                    <td className="px-3 py-2.5 text-ink-3">{CONFIDENCE[row.confidence]}</td>
                    <td className="px-3 py-2.5 text-ink-3">{new Date(row.openedAt).toLocaleDateString("tr-TR")}</td>
                    <td className="px-3 py-2.5 text-ink-3">{relativeTime(row.lastActionAt ?? row.openedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
