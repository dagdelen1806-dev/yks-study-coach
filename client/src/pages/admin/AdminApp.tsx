import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { BadgeCheck, BookOpen, Building2, ClipboardList, CreditCard, LayoutDashboard, LogOut, Menu, MessageSquareQuote, Package, ShieldCheck, TriangleAlert, UserCheck, Users, X } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import { useLocation } from "wouter";

const AdminDashboard = lazy(() => import("@/components/subscription/AdminPanel").then((module) => ({ default: module.AdminDashboard })));
const AdminUsersPage = lazy(() => import("@/components/subscription/AdminUsersPage"));
const AdminPendingPage = lazy(() => import("@/components/subscription/AdminPendingPage"));
const AdminSubscriptionsPage = lazy(() => import("@/components/subscription/AdminSubscriptionsPage"));
const AdminPaymentsPage = lazy(() => import("@/components/subscription/AdminPaymentsPage"));
const AdminCatalogPage = lazy(() => import("@/components/subscription/AdminCatalogPage"));
const AdminOrgsPage = lazy(() => import("@/components/subscription/AdminOrgsPage"));
const AdminTestimonialsPage = lazy(() => import("@/components/subscription/AdminTestimonialsPage"));
const AdminAuditPage = lazy(() => import("@/components/subscription/AdminAuditPage"));
const AdminErrorsPage = lazy(() => import("@/components/subscription/AdminErrorsPage"));
const AdminPackagesPage = lazy(() => import("./AdminPackagesPage"));
const AdminOrgDetail = lazy(() => import("./AdminOrgDetail"));

export const ADMIN_PATHS = {
  dashboard: "/yonetim",
  users: "/yonetim/uyeler",
  pending: "/yonetim/onay",
  subscriptions: "/yonetim/abonelikler",
  packages: "/yonetim/paketler",
  orgs: "/yonetim/kurumlar",
  payments: "/yonetim/odemeler",
  catalog: "/yonetim/katalog",
  testimonials: "/yonetim/yorumlar",
  audit: "/yonetim/kayitlar",
  errors: "/yonetim/hatalar",
} as const;
export type AdminSection = keyof typeof ADMIN_PATHS;
export const adminOrgPath = (orgId: number) => `/yonetim/kurum/${orgId}`;

const NAV: Array<{ key: AdminSection; label: string; icon: typeof Users; group: string }> = [
  { key: "dashboard", label: "Genel bakış", icon: LayoutDashboard, group: "" },
  { key: "users", label: "Üyeler", icon: Users, group: "Üyelik" },
  { key: "pending", label: "Onay bekleyenler", icon: UserCheck, group: "Üyelik" },
  { key: "subscriptions", label: "Abonelikler", icon: BadgeCheck, group: "Üyelik" },
  { key: "packages", label: "Paketler ve fiyatlar", icon: Package, group: "Üyelik" },
  { key: "payments", label: "Ödemeler", icon: CreditCard, group: "Üyelik" },
  { key: "orgs", label: "Kurumlar", icon: Building2, group: "Kurumsal" },
  { key: "catalog", label: "Kaynak kataloğu", icon: BookOpen, group: "İçerik" },
  { key: "testimonials", label: "Yorumlar", icon: MessageSquareQuote, group: "İçerik" },
  { key: "audit", label: "Denetim kayıtları", icon: ClipboardList, group: "Sistem" },
  { key: "errors", label: "Hatalar", icon: TriangleAlert, group: "Sistem" },
];

const TITLES: Record<AdminSection, { title: string; description: string }> = {
  dashboard: { title: "Genel bakış", description: "Üyelik, abonelik ve kullanım sayıları; yapay zekâ bağlantısı." },
  users: { title: "Üyeler", description: "Hesapları ara, ayrıntısına bak; onay, askıya alma, abonelik ve kurum bağları." },
  pending: { title: "Onay bekleyenler", description: "Yeni kayıtları onayla ya da reddet." },
  subscriptions: { title: "Abonelikler", description: "Sınav başına abonelikler; tanımla, iptal et, devam ettir." },
  packages: { title: "Paketler ve fiyatlar", description: "Bireysel sınav paketlerinin ve kurum paketlerinin fiyatları." },
  orgs: { title: "Kurumlar", description: "Kurumları oluştur, paket ve süresini yönet; üyelerini ve bağlarını gör." },
  payments: { title: "Ödemeler", description: "Ödeme kayıtları." },
  catalog: { title: "Kaynak kataloğu", description: "Kitap kataloğu ve senkron." },
  testimonials: { title: "Yorumlar", description: "Tanıtım sayfasındaki öğrenci yorumlarını onayla." },
  audit: { title: "Denetim kayıtları", description: "Yönetim işlemlerinin kaydı." },
  errors: { title: "Hatalar", description: "Uygulamada yakalanan hatalar." },
};

function routeOf(path: string): { section: AdminSection | "org"; orgId?: number } {
  const orgMatch = path.match(/^\/yonetim\/kurum\/(\d+)/);
  if (orgMatch) return { section: "org", orgId: Number(orgMatch[1]) };
  const entry = (Object.entries(ADMIN_PATHS) as Array<[AdminSection, string]>).filter(([, value]) => value !== "/yonetim").find(([, value]) => path.startsWith(value));
  return { section: entry?.[0] ?? "dashboard" };
}

/**
 * Yönetim Paneli (/yonetim): platformun genel yöneticisi için Kurum Paneli gibi ayrı bir arayüz.
 * Yalnızca `role === "admin"` hesaplar açar; her uç nokta sunucuda `adminProcedure` ile korunur.
 */
export default function AdminApp() {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [drawer, setDrawer] = useState(false);
  const isAdmin = user?.role === "admin";
  const route = routeOf(location);
  const pending = trpc.admin.users.listPending.useQuery(undefined, { enabled: isAdmin, retry: false, staleTime: 60_000 });
  const upgrades = trpc.admin.orgs.upgradeRequests.useQuery(undefined, { enabled: isAdmin, retry: false, staleTime: 60_000 });
  const errors = trpc.admin.errors.list.useQuery({ status: "open" }, { enabled: isAdmin, retry: false, staleTime: 60_000 });
  const memberships = trpc.org.mine.useQuery(undefined, { enabled: isAdmin, retry: false });
  useEffect(() => { document.title = "Yönetim Paneli · Pusula"; }, []);
  useEffect(() => { setDrawer(false); window.scrollTo({ top: 0 }); }, [location]);

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper p-6">
        <div className="soft-card w-full max-w-md p-7 text-center">
          <ShieldCheck className="mx-auto text-brand" size={32} />
          <h1 className="mt-4 text-[20px] font-extrabold text-ink">Yönetim Paneli</h1>
          <p className="mt-2 text-[14px] leading-6 text-ink-3">Bu bölüm yalnızca platform yöneticisi içindir.</p>
          <button onClick={() => setLocation("/")} className="mt-5 text-[13px] font-semibold text-brand hover:underline">Uygulamaya dön</button>
        </div>
      </div>
    );
  }

  const badges: Partial<Record<AdminSection, number>> = { pending: pending.data?.length ?? 0, orgs: upgrades.data?.length ?? 0, errors: errors.data?.length ?? 0 };
  const isStaff = (memberships.data ?? []).some((membership) => membership.role !== "student");
  const header = route.section === "org" ? { title: "Kurum", description: "" } : TITLES[route.section];
  const activeKey: AdminSection = route.section === "org" ? "orgs" : route.section;

  const sidebar = (
    <aside className={`app-sidebar ${drawer ? "is-drawer" : ""}`} aria-label="Yönetim menüsü">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3 px-1.5">
          <div className="brand-tile"><ShieldCheck size={20} /></div>
          <div className="min-w-0"><div className="truncate text-[15px] font-extrabold leading-tight text-ink">Pusula</div><div className="mt-0.5 text-[12px] font-medium text-ink-3">Yönetim Paneli</div></div>
        </div>
        {drawer && <button onClick={() => setDrawer(false)} className="drawer-close" aria-label="Menüyü kapat"><X size={18} /></button>}
      </div>
      <nav className="mt-6 space-y-0.5" aria-label="Yönetim bölümleri">
        {NAV.map((item, index) => (
          <div key={item.key}>
            {item.group && NAV[index - 1]?.group !== item.group && <div className="mb-1 mt-4 px-3 text-[11px] font-bold uppercase tracking-wide text-ink-4">{item.group}</div>}
            <button onClick={() => setLocation(ADMIN_PATHS[item.key])} aria-current={activeKey === item.key ? "page" : undefined} className={`nav-item ${activeKey === item.key ? "is-active" : ""}`}>
              <item.icon size={18} /><span className="flex-1 text-left">{item.label}</span>
              {(badges[item.key] ?? 0) > 0 && <span className="rounded-full bg-warn-soft px-1.5 text-[11px] font-bold text-warn" aria-label={`${badges[item.key]} bekleyen`}>{badges[item.key]}</span>}
            </button>
          </div>
        ))}
      </nav>
      <div className="sidebar-bottom pt-6">
        <div className="rounded-2xl border border-rule bg-surface p-3.5">
          <div className="truncate text-[13px] font-semibold text-ink">{user?.name || "Yönetici"}</div>
          <div className="truncate text-[12px] text-ink-3">{user?.email ?? "Platform yöneticisi"}</div>
          <div className="mt-3 flex gap-2">
            {isStaff && <button onClick={() => setLocation("/kurum")} className="flex-1 rounded-lg border border-rule px-2 py-1.5 text-[12px] font-semibold text-ink-2 hover:bg-paper">Kurum Paneli</button>}
            <button onClick={() => setLocation("/")} className="flex-1 rounded-lg border border-rule px-2 py-1.5 text-[12px] font-semibold text-ink-2 hover:bg-paper">Uygulama</button>
            <button onClick={() => void logout()} className="rounded-lg border border-rule px-2 py-1.5 text-ink-3 hover:bg-paper" aria-label="Çıkış yap" title="Çıkış yap"><LogOut size={14} /></button>
          </div>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="app-shell">
      {sidebar}
      {drawer && <div className="drawer-backdrop" onClick={() => setDrawer(false)} aria-hidden="true" />}
      <main className="app-main">
        <header className="topbar">
          <button onClick={() => setDrawer((value) => !value)} className="mobile-menu-button" aria-label="Menüyü aç"><Menu size={18} /></button>
          <div className="topbar-context"><span className="topbar-title">{header.title}</span></div>
          <div className="topbar-actions"><span className="demo-chip"><ShieldCheck size={12} /> Platform yöneticisi</span></div>
        </header>
        <div className="content-wrap space-y-5">
          {route.section !== "org" && (
            <div><h1 className="page-heading">{header.title}</h1>{header.description && <p className="page-subtitle">{header.description}</p>}</div>
          )}
          <Suspense fallback={<div className="flex min-h-[30vh] items-center justify-center"><span className="h-7 w-7 animate-spin rounded-full border-2 border-brand border-t-transparent" /></div>}>
            {route.section === "dashboard" && <AdminDashboard />}
            {route.section === "users" && <AdminUsersPage />}
            {route.section === "pending" && <AdminPendingPage />}
            {route.section === "subscriptions" && <AdminSubscriptionsPage />}
            {route.section === "packages" && <AdminPackagesPage />}
            {route.section === "orgs" && <AdminOrgsPage />}
            {route.section === "org" && route.orgId && <AdminOrgDetail orgId={route.orgId} />}
            {route.section === "payments" && <AdminPaymentsPage />}
            {route.section === "catalog" && <AdminCatalogPage />}
            {route.section === "testimonials" && <AdminTestimonialsPage />}
            {route.section === "audit" && <AdminAuditPage />}
            {route.section === "errors" && <AdminErrorsPage />}
          </Suspense>
        </div>
      </main>
    </div>
  );
}
