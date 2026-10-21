import { trpc } from "@/lib/trpc";
import { EmptyNote, PageHeader, Segmented, secondaryButton } from "@/components/app/kit";
import { Mail, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import type { OrgScope } from "./OrgApp";
import { StudentDetail } from "./StudentDetail";
import { ORG_PATHS, Initials, RiskBadges, deltaText, formatNet, relativeTime } from "./orgShared";

type RiskFilter = "all" | "any" | "inactive" | "low_adherence" | "net_drop";

/** Öğrenci listesi: arama + sınıf/öğretmen/risk filtresi; satıra tıklayınca sağdan detay çekmecesi. */
export default function OrgStudents({ scope }: { scope: OrgScope }) {
  const [, setLocation] = useLocation();
  const initialRisk = (() => { try { return (new URLSearchParams(window.location.search).get("risk") as RiskFilter) || "all"; } catch { return "all"; } })();
  const [risk, setRisk] = useState<RiskFilter>(initialRisk);
  const [classId, setClassId] = useState<number | undefined>();
  const [teacherUserId, setTeacherUserId] = useState<number | undefined>();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const classes = trpc.org.classes.list.useQuery({ orgId: scope.orgId }, { retry: false });
  const teachers = trpc.org.members.list.useQuery({ orgId: scope.orgId }, { retry: false, enabled: scope.role !== "teacher" });
  const students = trpc.org.students.useQuery({ orgId: scope.orgId, risk: risk === "all" ? undefined : risk, classId, teacherUserId, q: q.trim() || undefined }, { retry: false });

  useEffect(() => {
    if (selected === null) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setSelected(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  return (
    <div className="space-y-5">
      <PageHeader eyebrow={scope.orgName} title="Öğrenciler" description={scope.role === "teacher" ? "Sana atanan öğrenciler. Bir öğrenciye tıklayarak çalışma ayrıntılarını gör, görev ata ya da not ekle." : "Kurumundaki öğrenciler. Bir öğrenciye tıklayarak çalışma ayrıntılarını gör, görev ata ya da not ekle."} actions={<button onClick={() => setLocation(ORG_PATHS.invitations)} className={secondaryButton}><Mail size={16} /> Öğrenci davet et</button>} />

      <section className="soft-card space-y-3 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" size={16} /><input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Öğrenci ara…" aria-label="Öğrenci ara" className="form-input pl-9" /></div>
          <select value={classId ?? ""} onChange={(event) => setClassId(event.target.value ? Number(event.target.value) : undefined)} className="form-input h-10 lg:w-44" aria-label="Sınıf"><option value="">Tüm sınıflar</option>{classes.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          {scope.role !== "teacher" && <select value={teacherUserId ?? ""} onChange={(event) => setTeacherUserId(event.target.value ? Number(event.target.value) : undefined)} className="form-input h-10 lg:w-48" aria-label="Öğretmen"><option value="">Tüm öğretmenler</option>{teachers.data?.filter((member) => member.role === "teacher").map((member) => <option key={member.userId} value={member.userId}>{member.name}</option>)}</select>}
        </div>
        <div className="overflow-x-auto pb-0.5"><Segmented value={risk} options={[{ value: "all", label: "Tümü" }, { value: "any", label: "Takip gereken" }, { value: "inactive", label: "Etkinlik yok" }, { value: "low_adherence", label: "Uyum düşük" }, { value: "net_drop", label: "Net düştü" }]} onChange={setRisk} label="Risk" /></div>
      </section>

      {students.isError ? <EmptyNote>Öğrenciler yüklenemedi.</EmptyNote> : !students.data ? <EmptyNote>Yükleniyor…</EmptyNote> : students.data.length === 0 ? (
        <EmptyNote>{risk === "all" && !q && !classId && !teacherUserId ? "Henüz öğrenci yok. Davetler sayfasından bir öğrenci davet kodu oluştur; öğrenci kodu uygulamada girip onay verdiğinde burada görünür." : "Bu filtrelerle eşleşen öğrenci yok."}</EmptyNote>
      ) : (
        <section className="soft-card overflow-hidden">
          <div className="hidden grid-cols-[1.6fr_0.8fr_0.8fr_0.8fr_0.7fr_1.2fr] gap-3 border-b border-rule bg-paper/70 px-5 py-2.5 text-[12px] font-semibold text-ink-3 lg:grid"><span>Öğrenci</span><span>Son TYT / LGS</span><span>Son AYT</span><span>Plan uyumu</span><span>7 gün</span><span>Durum</span></div>
          <ul className="divide-y divide-rule">
            {students.data.map((student) => (
              <li key={student.userId}>
                <button onClick={() => setSelected(student.userId)} className="grid w-full grid-cols-1 gap-2 px-5 py-3 text-left hover:bg-paper/60 lg:grid-cols-[1.6fr_0.8fr_0.8fr_0.8fr_0.7fr_1.2fr] lg:items-center lg:gap-3">
                  <span className="flex min-w-0 items-center gap-3"><Initials name={student.name} /><span className="min-w-0"><span className="block truncate text-[13.5px] font-semibold text-ink">{student.name}</span><span className="block truncate text-[12px] text-ink-3">{[student.classes.map((item) => item.name).join(", "), student.teachers.map((teacher) => teacher.name).join(", ")].filter(Boolean).join(" · ") || "Sınıf yok"} · {relativeTime(student.summary.lastActivityAt)}</span></span></span>
                  {(() => {
                    // LGS öğrencisinin TYT'si olmaz: aynı sütunda son LGS neti "LGS" etiketiyle gösterilir.
                    const first = student.summary.lastTyt ?? student.summary.lastLgs;
                    const isLgs = !student.summary.lastTyt && Boolean(student.summary.lastLgs);
                    return <span className="text-[13px] text-ink"><span className={`text-[11px] text-ink-4 ${isLgs ? "" : "lg:hidden"}`}>{isLgs ? "LGS " : "TYT "}</span>{formatNet(first?.net)} <span className={`text-[11px] font-bold ${(first?.delta ?? 0) < 0 ? "text-danger" : "text-success"}`}>{deltaText(first?.delta)}</span></span>;
                  })()}
                  <span className="text-[13px] text-ink"><span className="text-[11px] text-ink-4 lg:hidden">AYT </span>{formatNet(student.summary.lastAyt?.net)} <span className={`text-[11px] font-bold ${(student.summary.lastAyt?.delta ?? 0) < 0 ? "text-danger" : "text-success"}`}>{deltaText(student.summary.lastAyt?.delta)}</span></span>
                  <span className="text-[13px] text-ink"><span className="text-[11px] text-ink-4 lg:hidden">Uyum </span>{student.summary.adherence !== null ? `%${student.summary.adherence}` : "plan yok"}</span>
                  <span className="text-[13px] text-ink"><span className="text-[11px] text-ink-4 lg:hidden">7 gün </span>{student.summary.weekMinutes} dk</span>
                  <RiskBadges risks={student.summary.risks} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {selected !== null && (
        <>
          <div className="fixed inset-0 z-[70] bg-ink/30" onClick={() => setSelected(null)} aria-hidden="true" style={{ animation: "fade-in .2s ease-out" }} />
          <aside className="fixed inset-y-0 right-0 z-[75] flex w-full max-w-[640px] flex-col bg-paper shadow-[var(--shadow-overlay)]" role="dialog" aria-modal="true" aria-label="Öğrenci detayı" style={{ animation: "drawer-right .22s ease-out" }}>
            <div className="flex items-center justify-between border-b border-rule bg-surface px-5 py-3">
              <button onClick={() => setLocation(`/kurum/ogrenci/${selected}`)} className="text-[12px] font-semibold text-brand hover:text-brand-strong">Tam sayfada aç</button>
              <button onClick={() => setSelected(null)} className="rounded-lg p-2 text-ink-4 hover:bg-paper" aria-label="Kapat"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5"><StudentDetail scope={scope} studentUserId={selected} compact /></div>
          </aside>
        </>
      )}
    </div>
  );
}
