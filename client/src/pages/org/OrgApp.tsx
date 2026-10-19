import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { ROLE_LABELS, isStaffRole, type MembershipState, type OrgRole } from "@shared/org";
import { Building2, ClipboardList, GraduationCap, LayoutDashboard, LogOut, Mail, Menu, School, Settings, Users, X } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { ORG_PATHS, type OrgSection } from "./orgShared";

const OrgDashboard = lazy(() => import("./OrgDashboard"));
const OrgStudents = lazy(() => import("./OrgStudents"));
const StudentDetailPage = lazy(() => import("./StudentDetail").then((module) => ({ default: module.StudentDetailPage })));
const OrgClasses = lazy(() => import("./OrgManage").then((module) => ({ default: module.OrgClasses })));
const OrgTeachers = lazy(() => import("./OrgManage").then((module) => ({ default: module.OrgTeachers })));
const OrgInvitations = lazy(() => import("./OrgManage").then((module) => ({ default: module.OrgInvitations })));
const OrgAudit = lazy(() => import("./OrgManage").then((module) => ({ default: module.OrgAudit })));
const OrgSettings = lazy(() => import("./OrgSettings"));

export type OrgScope = { orgId: number; orgName: string; role: OrgRole; state?: MembershipState };

const NAV: Array<{ key: OrgSection; label: string; icon: typeof Users; minRole?: "coordinator" | "admin" }> = [
  { key: "dashboard", label: "Kurum Paneli", icon: LayoutDashboard },
  { key: "students", label: "Öğrenciler", icon: GraduationCap },
  { key: "classes", label: "Sınıflar", icon: School },
  { key: "teachers", label: "Öğretmenler", icon: Users, minRole: "coordinator" },
  { key: "invitations", label: "Davetler", icon: Mail },
  { key: "audit", label: "İşlem kayıtları", icon: ClipboardList, minRole: "admin" },
  { key: "settings", label: "Ayarlar", icon: Settings, minRole: "coordinator" },
];
const RANK: Record<OrgRole, number> = { student: 0, teacher: 1, coordinator: 2, admin: 3, owner: 4 };
const ORG_CHOICE_KEY = "pusula:org-choice";

function sectionOf(path: string): { section: OrgSection | "student"; studentId?: number } {
  const studentMatch = path.match(/^\/kurum\/ogrenci\/(\d+)/);
  if (studentMatch) return { section: "student", studentId: Number(studentMatch[1]) };
  const entry = (Object.entries(ORG_PATHS) as Array<[OrgSection, string]>).filter(([, value]) => value !== "/kurum").find(([, value]) => path.startsWith(value));
  return { section: entry?.[0] ?? "dashboard" };
}

/** Kurum Paneli kabuğu: öğrenci uygulamasından ayrı menü, kurum seçici ve sayfalar. */
/** Pazar akşamı gelen sınıf özeti e-postası (üyelik başına); yalnızca e-postalı hesapta görünür. */
function DigestToggle({ orgId }: { orgId: number }) {
  const utils = trpc.useUtils();
  const digest = trpc.org.myDigest.useQuery({ orgId }, { retry: false });
  // İyimser: kutu tıklanınca hemen değişir; kayıt başarısız olursa sunucudaki değere döner.
  const update = trpc.org.setMyDigest.useMutation({
    onMutate: ({ enabled }) => utils.org.myDigest.setData({ orgId }, { enabled }),
    onSuccess: (next) => toast.success(next.enabled ? "Sınıf özeti her pazar e-postana gelecek." : "Sınıf özeti e-postası kapatıldı."),
    onError: () => { void utils.org.myDigest.invalidate({ orgId }); toast.error("Ayar kaydedilemedi, tekrar dener misin?"); },
  });
  if (!digest.data) return null;
  return (
    <label className="mt-3 flex cursor-pointer items-center gap-2 text-[12px] text-ink-2">
      <input type="checkbox" checked={digest.data.enabled} disabled={update.isPending} onChange={(event) => update.mutate({ orgId, enabled: event.target.checked })} className="h-4 w-4 accent-brand" />
      Haftalık sınıf özeti e-postası
    </label>
  );
}

export default function OrgApp() {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const memberships = trpc.org.mine.useQuery(undefined, { retry: false });
  const staff = (memberships.data ?? []).filter((membership) => isStaffRole(membership.role));
  const [choice, setChoice] = useState<number | null>(() => { try { return Number(localStorage.getItem(ORG_CHOICE_KEY)) || null; } catch { return null; } });
  const scope: OrgScope | undefined = staff.find((membership) => membership.orgId === choice) ?? staff[0];
  const [drawer, setDrawer] = useState(false);
  const route = sectionOf(location);
  useEffect(() => { document.title = scope ? `${scope.orgName} · Kurum Paneli` : "Kurum Paneli"; }, [scope?.orgName]);
  useEffect(() => { setDrawer(false); window.scrollTo({ top: 0 }); }, [location]);

  if (memberships.isLoading) return <div className="flex min-h-screen items-center justify-center bg-paper"><span className="h-7 w-7 animate-spin rounded-full border-2 border-brand border-t-transparent" /></div>;
  if (!scope) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper p-6">
        <div className="soft-card max-w-sm p-7 text-center">
          <Building2 className="mx-auto text-brand" size={32} />
          <h1 className="mt-4 text-[20px] font-extrabold text-ink">Kurum Paneli</h1>
          <p className="mt-2 text-[14px] leading-6 text-ink-3">Bu hesap henüz bir kurumun personeli değil. Kurumundan aldığın davet kodunu öğrenci uygulamasında profil menüsündeki "Kurumum" bölümüne girebilirsin.</p>
          <button onClick={() => setLocation("/")} className="mt-5 h-10 rounded-xl bg-brand px-4 text-[13px] font-semibold text-white">Uygulamaya dön</button>
        </div>
      </div>
    );
  }
  const visibleNav = NAV.filter((item) => !item.minRole || RANK[scope.role] >= RANK[item.minRole]);
  const go = (section: OrgSection) => setLocation(ORG_PATHS[section]);
  const choose = (orgId: number) => { setChoice(orgId); try { localStorage.setItem(ORG_CHOICE_KEY, String(orgId)); } catch {} setLocation(ORG_PATHS.dashboard); };

  const sidebar = (
    <aside className={`app-sidebar ${drawer ? "is-drawer" : ""}`} aria-label="Kurum menüsü">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3 px-1.5">
          <div className="brand-tile"><Building2 size={20} /></div>
          <div className="min-w-0"><div className="truncate text-[15px] font-extrabold leading-tight text-ink">{scope.orgName}</div><div className="mt-0.5 text-[12px] font-medium text-ink-3">Kurum Paneli</div></div>
        </div>
        {drawer && <button onClick={() => setDrawer(false)} className="drawer-close" aria-label="Menüyü kapat"><X size={18} /></button>}
      </div>
      {staff.length > 1 && (
        <label className="mt-5 block px-1.5 text-[12px] font-semibold text-ink-3">Kurum
          <select value={scope.orgId} onChange={(event) => choose(Number(event.target.value))} className="form-input mt-1 h-9 text-[13px]">{staff.map((membership) => <option key={membership.orgId} value={membership.orgId}>{membership.orgName}</option>)}</select>
        </label>
      )}
      <nav className="mt-6 space-y-0.5" aria-label="Kurum bölümleri">
        {visibleNav.map((item) => {
          const activeItem = route.section === item.key || (route.section === "student" && item.key === "students");
          return <button key={item.key} onClick={() => go(item.key)} aria-current={activeItem ? "page" : undefined} className={`nav-item ${activeItem ? "is-active" : ""}`}><item.icon size={18} /><span>{item.label}</span></button>;
        })}
      </nav>
      <div className="sidebar-bottom pt-6">
        <div className="rounded-2xl border border-rule bg-surface p-3.5">
          <div className="truncate text-[13px] font-semibold text-ink">{user?.name || "Personel"}</div>
          <div className="text-[12px] text-ink-3">{ROLE_LABELS[scope.role]}</div>
          {user?.email && <DigestToggle orgId={scope.orgId} />}
          <div className="mt-3 flex gap-2">
            <button onClick={() => setLocation("/")} className="flex-1 rounded-lg border border-rule px-2 py-1.5 text-[12px] font-semibold text-ink-2 hover:bg-paper">Öğrenci uygulaması</button>
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
          <div className="topbar-context"><span className="topbar-title">{route.section === "student" ? "Öğrenci" : NAV.find((item) => item.key === route.section)?.label}</span></div>
          <div className="topbar-actions"><span className="demo-chip"><Building2 size={12} /> {ROLE_LABELS[scope.role]}</span></div>
        </header>
        <div className="content-wrap">
          {scope.state && scope.state !== "active" && (
            <div className="mb-5 rounded-2xl border border-danger/30 bg-danger-soft/60 px-4 py-3 text-[13px] font-semibold text-danger" role="status">
              {scope.state === "expired" ? "Kurum üyeliğinin süresi doldu. Panel salt okunur: verileri görebilirsin ama değişiklik yapamazsın; öğrencilerin AI işlemleri kendi kotalarından yürür. Yenilemek için kurum yöneticisi Ayarlar → Üyelik ve krediler'den süre uzatma talebi gönderebilir." : "Kurum üyeliği henüz başlamadı; başlangıç tarihine kadar panel salt okunur."}
            </div>
          )}
          <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center"><span className="h-7 w-7 animate-spin rounded-full border-2 border-brand border-t-transparent" /></div>}>
            {route.section === "dashboard" && <OrgDashboard scope={scope} />}
            {route.section === "students" && <OrgStudents scope={scope} />}
            {route.section === "student" && route.studentId && <StudentDetailPage scope={scope} studentUserId={route.studentId} />}
            {route.section === "classes" && <OrgClasses scope={scope} />}
            {route.section === "teachers" && RANK[scope.role] >= RANK.coordinator && <OrgTeachers scope={scope} />}
            {route.section === "invitations" && <OrgInvitations scope={scope} />}
            {route.section === "audit" && RANK[scope.role] >= RANK.admin && <OrgAudit scope={scope} />}
            {route.section === "settings" && RANK[scope.role] >= RANK.coordinator && <OrgSettings scope={scope} />}
          </Suspense>
        </div>
      </main>
    </div>
  );
}
