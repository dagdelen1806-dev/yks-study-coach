import { trpc } from "@/lib/trpc";
import { EmptyNote, PageHeader, Panel, StatCard, LinkButton, primaryButton } from "@/components/app/kit";
import { AlertTriangle, CalendarCheck, Clock3, GraduationCap, Mail, School, Trophy } from "lucide-react";
import { useLocation } from "wouter";
import type { OrgScope } from "./OrgApp";
import { ORG_PATHS, Initials, RiskBadges, formatNet, relativeTime, studentPath } from "./orgShared";

/** Kurum Paneli ana ekranı: öğrencilerin Focus'taki verilerinden, salt okunur özet. */
export default function OrgDashboard({ scope }: { scope: OrgScope }) {
  const [, setLocation] = useLocation();
  const overview = trpc.org.overview.useQuery({ orgId: scope.orgId }, { retry: false });
  const data = overview.data;
  const totals = data?.totals;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={scope.orgName}
        title="Kurum Paneli"
        description={scope.role === "teacher" ? "Sana atanan öğrencilerin çalışma, plan uyumu ve deneme gelişimi." : "Öğrencilerinin Focus'taki çalışma, plan uyumu ve deneme gelişimi; takip gerektirenler en üstte."}
        actions={<button onClick={() => setLocation(ORG_PATHS.invitations)} className={primaryButton}><Mail size={16} /> Öğrenci davet et</button>}
      />

      {overview.isError ? <EmptyNote>Kurum verileri yüklenemedi. Sayfayı yenilemeyi dener misin?</EmptyNote> : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatCard icon={<GraduationCap size={18} />} label="Aktif öğrenci" value={totals ? String(totals.students) : "…"} foot={totals ? <span>Bu hafta çalışan: {totals.activeThisWeek}</span> : undefined} />
            <StatCard icon={<CalendarCheck size={18} />} label="Haftalık plan uyumu" value={totals?.averageAdherence !== null && totals?.averageAdherence !== undefined ? `%${Math.round(totals.averageAdherence)}` : "—"} progress={totals?.averageAdherence ?? undefined} foot={<span>Planı olan öğrencilerin ortalaması</span>} />
            <StatCard tone="warm" icon={<Trophy size={18} />} label="Ortalama son TYT" value={formatNet(totals?.averageLastTyt)} unit={totals?.averageLastTyt ? "net" : undefined} foot={<span>Her öğrencinin son TYT denemesi</span>} />
            <StatCard tone={totals?.atRisk ? "warn" : "plain"} icon={<AlertTriangle size={18} />} label="Takip gereken" value={totals ? String(totals.atRisk) : "…"} foot={totals ? <span>Toplam çalışma: {Math.round(totals.weekMinutes / 60)} sa / 7 gün</span> : undefined} />
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.4fr_1fr]">
            <Panel icon={<AlertTriangle size={18} />} title="Takip gerektiren öğrenciler" subtitle="7 gündür etkinlik yok, plan uyumu %40'ın altında ya da aynı türde net düşüşü 5+." action={<LinkButton onClick={() => setLocation(`${ORG_PATHS.students}?risk=any`)}>Tümü</LinkButton>}>
              {!data ? <EmptyNote>Yükleniyor…</EmptyNote> : data.atRisk.length === 0 ? <EmptyNote>Şu an takip gerektiren öğrenci yok.</EmptyNote> : (
                <ul className="divide-y divide-rule">
                  {data.atRisk.map((student) => (
                    <li key={student.userId}>
                      <button onClick={() => setLocation(studentPath(student.userId))} className="flex w-full items-center gap-3 py-3 text-left hover:bg-paper/60">
                        <Initials name={student.name} />
                        <span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-semibold text-ink">{student.name}</span><span className="block text-[12px] text-ink-3"><Clock3 size={11} className="mr-1 inline" />Son etkinlik: {relativeTime(student.lastActivityAt)}{student.adherence !== null ? ` · uyum %${student.adherence}` : ""}</span></span>
                        <RiskBadges risks={student.risks} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel icon={<School size={18} />} title="Sınıflar" action={<LinkButton onClick={() => setLocation(ORG_PATHS.classes)}>Sınıflar</LinkButton>}>
              {!data ? <EmptyNote>Yükleniyor…</EmptyNote> : data.classes.length === 0 ? <EmptyNote>Henüz sınıf yok. Öğrencileri sınıflara ayırınca sınıf karşılaştırması burada görünür.</EmptyNote> : (
                <ul className="space-y-2">
                  {data.classes.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-rule px-3 py-2.5">
                      <span className="min-w-0"><span className="block truncate text-[13.5px] font-semibold text-ink">{item.name}</span><span className="text-[12px] text-ink-3">{item.students} öğrenci</span></span>
                      <span className="text-right text-[12px] text-ink-3">uyum <strong className="text-ink">{item.averageAdherence !== null ? `%${Math.round(item.averageAdherence)}` : "—"}</strong><br />TYT ort. <strong className="text-ink">{formatNet(item.averageLastTyt)}</strong></span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
