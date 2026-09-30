import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import AdminUsersPage from "./AdminUsersPage";
import AdminPendingPage from "./AdminPendingPage";
import AdminSubscriptionsPage from "./AdminSubscriptionsPage";
import AdminPaymentsPage from "./AdminPaymentsPage";
import AdminAuditPage from "./AdminAuditPage";
import AdminCatalogPage from "./AdminCatalogPage";

const TABS = [
  { key: "dashboard", label: "Panel" },
  { key: "users", label: "Üyeler" },
  { key: "pending", label: "Onay Bekleyenler" },
  { key: "subscriptions", label: "Abonelikler" },
  { key: "payments", label: "Ödemeler" },
  { key: "catalog", label: "Kaynak Kataloğu" },
  { key: "audit", label: "Denetim Kayıtları" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

/**
 * Admin Command Center (PHASE 3) — yalnızca `role === "admin"` kullanıcılara
 * Sidebar'da görünür (bkz. Home.tsx) ve her uç nokta zaten `adminProcedure`
 * ile korunuyor (server/_core/trpc.ts: ctx.user.role — client "admin"
 * göndererek kendini admin yapamaz). Gerçek URL router olmadığı için
 * (bkz. audit) alt sayfalar burada sekme durumu olarak yönetiliyor —
 * spec §2'nin izin verdiği şekilde mevcut mimariye uyarlandı.
 */
export default function AdminPanel() {
  const [tab, setTab] = useState<TabKey>("dashboard");

  return (
    <div className="space-y-6 animate-page-in">
      <div><div className="eyebrow mb-2 flex items-center gap-1.5"><ShieldCheck size={13} /> Yönetim</div><h1 className="page-heading">Admin Command Center</h1><p className="page-subtitle">Üyelik onayı, abonelik yönetimi ve gerçek kullanım/ilerleme verisi tek merkezde.</p></div>

      <div className="flex gap-1 overflow-x-auto rounded-2xl bg-paper p-1">
        {TABS.map((item) => <button key={item.key} onClick={() => setTab(item.key)} className={`whitespace-nowrap rounded-xl px-3.5 py-2 text-[12px] font-semibold transition ${tab === item.key ? "bg-white text-ink shadow-sm" : "text-ink-3"}`}>{item.label}</button>)}
      </div>

      {tab === "dashboard" && <AdminDashboard />}
      {tab === "users" && <AdminUsersPage />}
      {tab === "pending" && <AdminPendingPage />}
      {tab === "subscriptions" && <AdminSubscriptionsPage />}
      {tab === "payments" && <AdminPaymentsPage />}
      {tab === "catalog" && <AdminCatalogPage />}
      {tab === "audit" && <AdminAuditPage />}
    </div>
  );
}

const KPI_CARDS: Array<{ key: string; label: string; tone: string }> = [
  { key: "totalUsers", label: "Toplam Üye", tone: "bg-brand-soft text-brand" },
  { key: "pendingApproval", label: "Onay Bekleyen", tone: "bg-warn-soft text-warn" },
  { key: "activeAccounts", label: "Aktif Hesap", tone: "bg-success-soft text-success" },
  { key: "freeUsers", label: "Free Üye", tone: "bg-paper text-ink-2" },
  { key: "trialUsers", label: "Trial Üye", tone: "bg-warn-soft text-warn" },
  { key: "premiumUsers", label: "Premium Üye", tone: "bg-brand-soft text-brand" },
  { key: "monthlySubscribers", label: "Aylık Abone", tone: "bg-brand-soft text-brand" },
  { key: "yearlySubscribers", label: "Yıllık Abone", tone: "bg-brand-soft text-brand" },
  { key: "pastDue", label: "Ödeme Gecikmiş", tone: "bg-danger-soft text-danger" },
  { key: "gracePeriod", label: "Ek Süre (Grace)", tone: "bg-warn-soft text-warn" },
  { key: "expiredSubscriptions", label: "Süresi Dolmuş", tone: "bg-paper text-ink-3" },
  { key: "canceledSubscriptions", label: "İptal Edilmiş", tone: "bg-paper text-ink-3" },
];

function AdminDashboard() {
  const kpis = trpc.admin.analytics.overview.useQuery();

  if (kpis.isLoading) return <Card className="soft-card p-10"><div className="flex justify-center"><Loader2 className="animate-spin text-brand" size={22} /></div></Card>;
  if (kpis.isError || !kpis.data) return <Card className="soft-card p-8 text-center text-[13px] text-danger">KPI'lar yüklenemedi. <button onClick={() => kpis.refetch()} className="font-semibold underline">Tekrar dene</button></Card>;

  const data = kpis.data as unknown as Record<string, number>;

  return (
    <div className="space-y-5">
      <LlmHealthCard />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {KPI_CARDS.map((card) => (
          <div key={card.key} className={`rounded-2xl p-4 ${card.tone}`}>
            <div className="text-[12px] font-medium opacity-75">{card.label}</div>
            <div className="mt-2 text-[30px] font-semibold font-display">{data[card.key] ?? 0}</div>
          </div>
        ))}
      </div>

      <Card className="soft-card p-5 sm:p-6">
        <h2 className="text-[15px] font-semibold text-ink">Üye Aktivitesi</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat label="Bugün aktif" value={kpis.data.activeToday} />
          <MiniStat label="Bu hafta aktif" value={kpis.data.activeThisWeek} />
          <MiniStat label="7+ gün pasif" value={kpis.data.inactive7Plus} />
          <MiniStat label="30+ gün pasif" value={kpis.data.inactive30Plus} />
        </div>
      </Card>

      <Card className="soft-card p-5 sm:p-6">
        <h2 className="text-[15px] font-semibold text-ink">Trial → Premium Dönüşümü</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat label="Başlatılan trial" value={kpis.data.trialConversion.started} />
          <MiniStat label="Hâlâ deneme sürüyor" value={kpis.data.trialConversion.stillTrialing} />
          <MiniStat label="Premium'a dönüştü" value={kpis.data.trialConversion.converted} />
          <MiniStat label="Dönüşüm oranı" value={kpis.data.trialConversion.conversionRate === null ? "N/A" : `%${kpis.data.trialConversion.conversionRate}`} />
        </div>
      </Card>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return <div className="rounded-xl bg-paper p-3 text-center"><div className="text-[21px] font-semibold text-ink font-display">{value}</div><div className="mt-0.5 text-[12px] text-ink-3">{label}</div></div>;
}

/** Yapay zekâ bağlantı testi: ayar özeti + düz metin / JSON şema / görsel çağrıları. Anahtarın kendisi hiç gösterilmez. */
function LlmHealthCard() {
  const health = trpc.admin.system.llmHealth.useMutation();
  const data = health.data;
  const row = (label: string, result: { ok: boolean; ms: number; status: number | null; error: string | null } | undefined) => result && (
    <div className={`rounded-xl p-3 text-[12px] ${result.ok ? "bg-success-soft text-success" : "bg-danger-soft text-danger-strong"}`}>
      <div className="font-semibold">{result.ok ? "✓" : "✗"} {label} · {result.ms} ms{result.status ? ` · kod ${result.status}` : ""}</div>
      {result.error && <div className="mt-1 break-words font-mono text-[12px] leading-4">{result.error}</div>}
    </div>
  );
  return (
    <Card className="soft-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">Yapay zekâ bağlantı testi</h2>
          <p className="mt-1 text-[13px] text-ink-3">Fotoğraf okuma, AI plan ve not AI'nın kullandığı sağlayıcıyı (LLM_API_KEY / LLM_API_URL / LLM_MODEL) üç küçük gerçek çağrıyla dener.</p>
        </div>
        <button onClick={() => health.mutate()} disabled={health.isPending} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand px-4 text-[13px] font-semibold text-white disabled:opacity-50">{health.isPending ? <><Loader2 size={14} className="animate-spin" /> Deneniyor…</> : "Bağlantıyı test et"}</button>
      </div>
      {health.error && <p className="mt-3 text-[13px] text-danger">{health.error.message}</p>}
      {data && (
        <div className="mt-4 space-y-2">
          <div className="rounded-xl bg-paper p-3 text-[12px] leading-5 text-ink-2">
            <div>Anahtar: {data.config.configured ? `tanımlı (${data.config.keyLength} karakter)` : "TANIMLI DEĞİL"}</div>
            <div>Adres: <span className="font-mono">{data.config.baseUrl ?? "—"}</span>{data.config.usingDefaultUrl ? " (varsayılan)" : ""}</div>
            <div>Model: <span className="font-mono">{data.config.model ?? "—"}</span>{data.config.usingDefaultModel ? " (varsayılan)" : ""} · Ses: <span className="font-mono">{data.config.transcribeModel}</span></div>
            {(data.config.rawUrl && data.config.rawUrl !== data.config.baseUrl) || (data.config.rawModel && data.config.rawModel !== data.config.model) ? (
              <div className="mt-1 text-warn">Vercel'deki değer otomatik düzeltildi: {data.config.rawUrl !== data.config.baseUrl && <span className="font-mono">LLM_API_URL "{data.config.rawUrl}" </span>}{data.config.rawModel !== data.config.model && <span className="font-mono">LLM_MODEL "{data.config.rawModel}"</span>} — Vercel'de de düzeltmen önerilir.</div>
            ) : null}
          </div>
          {data.hints.map((hint) => <div key={hint} className="rounded-xl bg-warn-soft p-3 text-[12px] font-medium text-warn">⚠ {hint}</div>)}
          {data.checks && (
            <div className="grid gap-2 sm:grid-cols-3">
              {row("Düz metin", data.checks.text)}
              {row("JSON şema", data.checks.json)}
              {row("Görsel okuma", data.checks.vision)}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
