import { useAuth } from "@/_core/hooks/useAuth";
import { Bar100, EmptyNote, PageHeader, Panel, Segmented, StatCard, primaryButton, secondaryButton } from "@/components/app/kit";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { EXAM_TRACK_DEFS, GRADE_LEVEL_LABELS, kindsOf, targetSummary, type ExamKind } from "@shared/exams";
import { PARENT_CONSENT_TEXT } from "@shared/parent";
import { statusMeta } from "@shared/yksData";
import { CalendarCheck, Clock3, Eye, Gauge, KeyRound, ListChecks, LogOut, Target, TrendingUp, Trophy, UserRound } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const NetTrendChart = lazy(() => import("@/pages/overview/OverviewCharts").then((module) => ({ default: module.NetTrendChart })));
const CODE_KEY = "pusula:parent-code";

/** Davet bağlantısındaki ?kod= değeri: girişten sonra da kaybolmasın diye oturum deposunda tutulur. */
function useInviteCode() {
  return useMemo(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("kod");
    try {
      if (fromUrl) sessionStorage.setItem(CODE_KEY, fromUrl);
      return fromUrl ?? sessionStorage.getItem(CODE_KEY) ?? "";
    } catch {
      return fromUrl ?? "";
    }
  }, []);
}

/** Giriş yapmamış veli: ne göreceğini anlatır, giriş/kayıt penceresini açar. */
export function ParentSignIn() {
  useInviteCode();
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper p-6">
      <div className="soft-card max-w-sm p-7 text-center">
        <h1 className="text-[20px] font-extrabold text-ink">Veli paneli</h1>
        <p className="mt-2 text-[14px] leading-6 text-ink-3">Çocuğunun çalışmasını, denemelerini ve zayıf konularını izlemek için giriş yap ya da ücretsiz hesap aç. Sonra öğrencinin verdiği veli kodunu gireceksin.</p>
        <div className="mt-5 flex flex-col gap-2">
          <button onClick={() => startLogin("register")} className={primaryButton}>Hesap oluştur</button>
          <button onClick={() => startLogin("login")} className={secondaryButton}>Giriş yap</button>
        </div>
      </div>
    </div>
  );
}

/** Veli kodu + rıza metni onayı. */
function JoinForm({ onJoined }: { onJoined: () => void }) {
  const initial = useInviteCode();
  const [code, setCode] = useState(initial);
  const [consent, setConsent] = useState(false);
  const redeem = trpc.parent.redeem.useMutation({
    onSuccess: () => { try { sessionStorage.removeItem(CODE_KEY); } catch {} toast.success("İsteğin öğrenciye iletildi; onayladığında özetini görebileceksin."); onJoined(); },
    onError: (error) => toast.error(error.message),
  });
  return (
    <Panel icon={<KeyRound size={18} />} title="Öğrenci bağla" subtitle="Öğrenci, Pusula'da profil menüsü → Veli erişimi'nden sana bir kod verir.">
      <label className="block"><span className="form-label">Veli kodu</span><input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="ABCD-EFGH" maxLength={12} className="form-input max-w-[220px] tracking-wider" aria-label="Veli kodu" /></label>
      <div className="mt-4 max-h-[220px] overflow-y-auto whitespace-pre-line rounded-xl border border-rule bg-paper/50 p-3 text-[12px] leading-5 text-ink-2">{PARENT_CONSENT_TEXT}</div>
      <label className="mt-3 flex items-start gap-2 text-[13px] text-ink-2"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-0.5" /> Metni okudum; öğrencinin velisi ya da yasal temsilcisi olduğumu beyan eder, onaylarım.</label>
      <button onClick={() => consent && redeem.mutate({ code: code.trim(), consent: true })} disabled={!consent || code.trim().length < 4 || redeem.isPending} className={`${primaryButton} mt-4 self-start`}>{redeem.isPending ? "Gönderiliyor…" : "Bağlan"}</button>
    </Panel>
  );
}

const sessionState = (session: { sessionDate: string | Date; status: string; abandonedAt: string | Date | null }) => {
  if (session.status === "completed") return { label: "Tamamlandı", className: "bg-success-soft text-success" };
  if (session.abandonedAt) return { label: "Yarım kaldı", className: "bg-warn-soft text-warn" };
  if (session.status === "skipped") return { label: "Atlandı", className: "bg-paper text-ink-3" };
  return new Date(session.sessionDate).getTime() < Date.now() ? { label: "Yapılmadı", className: "bg-danger-soft text-danger" } : { label: "Planlandı", className: "bg-brand-soft text-brand" };
};

/** Velinin gördüğü öğrenci özeti (salt okunur). */
function ParentStudentView({ studentUserId }: { studentUserId: number }) {
  const detail = trpc.parent.student.useQuery({ studentUserId }, { retry: false });
  const track = detail.data?.profile.examTrack ?? "YKS";
  const kinds = kindsOf(track);
  const [chosenKind, setKind] = useState<ExamKind>(kinds[0]);
  const kind = kinds.includes(chosenKind) ? chosenKind : kinds[0];
  const series = useMemo(() => (detail.data?.exams ?? []).filter((exam) => (exam.exam ?? "TYT") === kind).slice().sort((a, b) => a.date.localeCompare(b.date)).slice(-10)
    .map((exam) => ({ label: new Date(`${exam.date}T12:00:00`).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" }), net: Number(exam.net.toFixed(2)), title: exam.title })), [detail.data?.exams, kind]);

  if (detail.isError) return <EmptyNote>{detail.error.message || "Öğrenci bilgileri yüklenemedi."}</EmptyNote>;
  if (!detail.data) return <EmptyNote>Yükleniyor…</EmptyNote>;
  const { name, profile, summary, estimatedScore, sessions, weakTopics } = detail.data;
  const lastPrimary = summary.lastByKind[kinds[0]] ?? null;
  const secondKind = kinds[1];
  const lastSecond = secondKind ? summary.lastByKind[secondKind] ?? null : null;
  const target = targetSummary(track, profile);
  const recent = sessions.filter((session) => new Date(session.sessionDate).getTime() <= Date.now() + 7 * 24 * 60 * 60 * 1000).slice(-14).reverse();

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[24px] font-extrabold text-ink">{name}</h2>
        <p className="mt-1 text-[13px] text-ink-3">{[profile.gradeLevel ? GRADE_LEVEL_LABELS[profile.gradeLevel] : null, profile.examYear ? `${EXAM_TRACK_DEFS[track].label} ${profile.examYear}` : EXAM_TRACK_DEFS[track].label].filter(Boolean).join(" · ")}</p>
        {(target.goal || target.score) && <p className="mt-0.5 flex items-center gap-1.5 text-[13px] font-semibold text-ink-2"><Target size={14} className="text-brand" />Hedef: {[target.goal, target.score].filter(Boolean).join(" · ")}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard icon={<Clock3 size={18} />} label="Son 7 gün çalışma" value={`${summary.weekMinutes}`} unit="dk" foot={<span>{profile.dailyStudyDuration ? `Günlük hedefi ${profile.dailyStudyDuration} dk` : "Günlük hedef girilmemiş"}</span>} />
        <StatCard icon={<CalendarCheck size={18} />} label="Bu hafta plan uyumu" value={summary.adherence !== null ? `%${summary.adherence}` : "—"} progress={summary.adherence ?? undefined} foot={<span>{summary.plannedThisWeek} görev planlandı</span>} />
        <StatCard tone="warm" icon={<Trophy size={18} />} label={`Son ${kinds[0]} neti`} value={lastPrimary ? lastPrimary.net.toFixed(2) : "—"} foot={lastPrimary ? <><span>{new Date(lastPrimary.date).toLocaleDateString("tr-TR")}</span>{lastPrimary.delta !== null && <span className={`font-bold ${lastPrimary.delta < 0 ? "text-danger" : "text-success"}`}>{lastPrimary.delta > 0 ? "+" : ""}{lastPrimary.delta.toFixed(2)}</span>}</> : <span>Deneme yok</span>} />
        {estimatedScore
          ? <StatCard icon={<Gauge size={18} />} label={estimatedScore.label} value={estimatedScore.value !== null ? estimatedScore.value.toFixed(1) : "—"} unit={estimatedScore.value !== null ? `/ ${estimatedScore.max}` : undefined} foot={<span>Son denemeden · resmî değil</span>} />
          : secondKind && <StatCard icon={<TrendingUp size={18} />} label={`Son ${secondKind} neti`} value={lastSecond ? lastSecond.net.toFixed(2) : "—"} foot={<span>{lastSecond ? new Date(lastSecond.date).toLocaleDateString("tr-TR") : "Deneme yok"}</span>} />}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel icon={<TrendingUp size={18} />} title="Net gelişimi" action={kinds.length > 1 ? <Segmented value={kind} options={kinds} onChange={setKind} label="Sınav türü" /> : undefined}>
          {series.length === 0 ? <EmptyNote>{kind} denemesi yok.</EmptyNote> : <div className="h-[220px]"><Suspense fallback={<div className="h-full animate-pulse rounded-xl bg-paper" />}><NetTrendChart data={series} /></Suspense></div>}
        </Panel>
        <Panel icon={<Target size={18} />} title="Güçlendirmesi gereken konular" subtitle="Yeterli soru verisi olan konulardan">
          {weakTopics.length === 0 ? <EmptyNote>Zayıf konu yok ya da henüz yeterli veri yok.</EmptyNote> : (
            <ul className="space-y-2.5">{weakTopics.slice(0, 8).map((topic) => <li key={topic.slug}><div className="mb-1 flex justify-between text-[13px]"><span className="truncate font-semibold text-ink">{topic.topic} <span className="font-normal text-ink-4">· {topic.subject}</span></span><span className="text-ink-3">%{topic.progress}</span></div><Bar100 value={topic.progress} color={statusMeta.Zayıf.color} /></li>)}</ul>
          )}
        </Panel>
      </div>

      <Panel icon={<ListChecks size={18} />} title="Çalışma planı" subtitle="Son ve yaklaşan oturumlar">
        {recent.length === 0 ? <EmptyNote>Takviminde oturum yok.</EmptyNote> : (
          <ul className="divide-y divide-rule">
            {recent.map((session) => {
              const state = sessionState(session);
              return (
                <li key={session.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0"><span className="block truncate text-[13.5px] font-semibold text-ink">{session.subject} · {session.topic}</span><span className="block text-[12px] text-ink-4">{new Date(session.sessionDate).toLocaleString("tr-TR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {session.plannedMinutes} dk</span></span>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${state.className}`}>{state.label}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
      <p className="flex items-start gap-2 text-[12px] text-ink-4"><Eye size={14} className="mt-0.5 shrink-0" />Öğrencinin notlarını, soru defterini, fotoğraflarını ve ses kayıtlarını göremezsin; erişimi öğrenci istediği an kaldırabilir.</p>
    </div>
  );
}

/** /veli: velinin bağlı öğrencileri ve salt okunur özetleri. */
export default function ParentApp() {
  const { user, logout } = useAuth();
  const utils = trpc.useUtils();
  const students = trpc.parent.myStudents.useQuery(undefined, { retry: false });
  const [selected, setSelected] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const setDigest = trpc.parent.setDigest.useMutation({ onSuccess: (value) => { toast.success(value.enabled ? "Haftalık özet her pazar e-postana gelecek." : "Haftalık özet kapatıldı."); void utils.parent.myStudents.invalidate(); }, onError: (error) => toast.error(error.message) });
  const unlink = trpc.parent.unlink.useMutation({ onSuccess: () => { toast.success("Bağlantı kaldırıldı."); setSelected(null); void utils.parent.myStudents.invalidate(); }, onError: (error) => toast.error(error.message) });
  useEffect(() => { document.title = "Pusula · Veli paneli"; }, []);

  const rows = students.data ?? [];
  const current = rows.find((row) => row.studentUserId === selected) ?? rows.find((row) => row.status === "active") ?? rows[0];
  const showJoin = adding || (!students.isLoading && rows.length === 0);

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-ink/[0.06] bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <span className="flex items-center gap-2.5"><img src="/icon.svg" alt="" className="h-8 w-8" /><span className="text-[16px] font-extrabold text-ink">Pusula · Veli paneli</span></span>
          <span className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 text-[13px] text-ink-3 sm:flex"><UserRound size={15} />{user?.name}</span>
            <button onClick={() => void logout()} className="rounded-lg p-2 text-ink-4 hover:bg-paper" aria-label="Çıkış yap"><LogOut size={16} /></button>
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6">
        <PageHeader eyebrow="Veli erişimi" title="Öğrencinin gelişimi" description="Öğrencinin onayıyla, çalışma ve deneme özetini salt okunur görürsün." actions={rows.length > 0 && !adding ? <button onClick={() => setAdding(true)} className={secondaryButton}><KeyRound size={15} /> Öğrenci ekle</button> : undefined} />

        {rows.length > 1 && (
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Öğrenciler">
            {rows.map((row) => <button key={row.id} role="tab" aria-selected={current?.id === row.id} onClick={() => setSelected(row.studentUserId)} className={`rounded-full border px-3.5 py-1.5 text-[13px] font-semibold ${current?.id === row.id ? "border-brand bg-brand-soft text-brand-strong" : "border-rule bg-white text-ink-3"}`}>{row.studentName}{row.status === "pending" ? " · onay bekliyor" : ""}</button>)}
          </div>
        )}

        {showJoin && <JoinForm onJoined={() => { setAdding(false); void utils.parent.myStudents.invalidate(); }} />}

        {current && !adding && (current.status === "pending"
          ? <EmptyNote>{current.studentName} isteğini henüz onaylamadı. Pusula'da profil menüsü → Veli erişimi'nden onaylaması gerekiyor.</EmptyNote>
          : <ParentStudentView key={current.studentUserId} studentUserId={current.studentUserId} />)}

        {current && !adding && (
          <div className="flex flex-wrap items-center gap-4 border-t border-rule pt-4 text-[13px]">
            {current.status === "active" && <label className="flex items-center gap-2 text-ink-2"><input type="checkbox" checked={current.weeklyDigest} onChange={(event) => setDigest.mutate({ linkId: current.id, enabled: event.target.checked })} /> Haftalık özet e-postası</label>}
            <button onClick={() => { if (window.confirm(`${current.studentName} ile bağlantını kaldırmak istiyor musun?`)) unlink.mutate({ linkId: current.id }); }} className="font-semibold text-danger hover:underline">Bağlantıyı kaldır</button>
          </div>
        )}
      </main>
    </div>
  );
}
