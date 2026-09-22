import { useAuth } from "@/_core/hooks/useAuth";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";
import { DashboardLayoutSkeleton } from "@/components/DashboardLayoutSkeleton";
import { trpc } from "@/lib/trpc";
import { LOCAL_SIGNIN_REQUEST_EVENT, performLocalSignIn } from "@/const";
import { ensureLocalCacheMatchesAccount, postOnboardingNudgeKey } from "@shared/yksData";
import { useEffect, useState } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

// This deployment runs standalone (no real Manus OAuth app id/portal
// available here), so `startLogin()` can't do a real OAuth redirect. It
// dispatches `LOCAL_SIGNIN_REQUEST_EVENT` instead, which this dialog listens
// for — collecting the student's actual name rather than silently signing
// everyone in as the same placeholder test account.
function LocalSignInDialog() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(LOCAL_SIGNIN_REQUEST_EVENT, handler);
    return () => window.removeEventListener(LOCAL_SIGNIN_REQUEST_EVENT, handler);
  }, []);

  const submit = async () => {
    if (!name.trim()) { setError("Adını yazmalısın."); return; }
    if (password.length < 4) { setError("Şifre en az 4 karakter olmalı."); return; }
    setSubmitting(true);
    setError("");
    const result = await performLocalSignIn(name.trim(), password, tab);
    if (result.error) { setError(result.error); setSubmitting(false); }
    // Başarılıysa `performLocalSignIn` sayfayı zaten yeniden yüklüyor.
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) { setPassword(""); setError(""); } }}>
      <DialogContent className="sm:max-w-sm">
        <DialogTitle>{tab === "login" ? "Giriş yap" : "Kayıt ol"}</DialogTitle>
        <DialogDescription>
          {tab === "login"
            ? "Bu, uygulamanın yerel test ortamındaki girişidir. Daha önce oluşturduğun ad + şifreyle giriş yap."
            : "Yeni bir hesap oluştur. Kayıt sonrası hesabın bir yönetici tarafından onaylanana kadar panele erişemezsin."}
        </DialogDescription>
        <div className="mt-1 flex rounded-xl bg-[#f7f5ef] p-1">
          <button type="button" onClick={() => { setTab("login"); setError(""); }} className={`h-9 flex-1 rounded-lg text-[12px] font-semibold transition ${tab === "login" ? "bg-white text-[#1f2333] shadow-sm" : "text-[#8b8c95]"}`}>Giriş yap</button>
          <button type="button" onClick={() => { setTab("register"); setError(""); }} className={`h-9 flex-1 rounded-lg text-[12px] font-semibold transition ${tab === "register" ? "bg-white text-[#1f2333] shadow-sm" : "text-[#8b8c95]"}`}>Kayıt ol</button>
        </div>
        <div className="mt-3 space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="local-signin-name" className="text-[12px] font-semibold text-[#1f2333]">Adın</label>
            <Input
              id="local-signin-name"
              value={name}
              onChange={(event) => { setName(event.target.value); setError(""); }}
              onKeyDown={(event) => { if (event.key === "Enter") submit(); }}
              placeholder="Örn. Ece Yılmaz"
              maxLength={120}
              autoFocus
              aria-invalid={Boolean(error)}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="local-signin-password" className="text-[12px] font-semibold text-[#1f2333]">Şifre</label>
            <Input
              id="local-signin-password"
              type="password"
              value={password}
              onChange={(event) => { setPassword(event.target.value); setError(""); }}
              onKeyDown={(event) => { if (event.key === "Enter") submit(); }}
              placeholder="En az 4 karakter"
              maxLength={120}
              aria-invalid={Boolean(error)}
            />
          </div>
          {error && <p role="alert" className="text-[11px] font-medium text-[#d95d4d]">{error}</p>}
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={submit} disabled={submitting}>{submitting ? (tab === "login" ? "Giriş yapılıyor…" : "Kayıt oluşturuluyor…") : tab === "login" ? "Giriş yap" : "Kayıt ol"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Yeni kayıt olan her kullanıcı admin onayı bekler (approvalStatus başlangıçta
// "pending" — bkz. server/db.ts upsertUser / server/_core/devAuth.ts). Onay
// gelmeden gerçek dashboard verisine hiç erişilemez: backend zaten
// `requireUser` middleware'inde (server/_core/trpc.ts) TÜM protectedProcedure
// çağrılarını reddediyor — bu ekran yalnızca kullanıcıya NEDEN göremediğini
// açıklayan UX katmanı, asıl güvenlik backend'de.
function PendingApprovalScreen({ status, onLogout }: { status: "pending" | "rejected"; onLogout: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f5ef] p-6">
      <div className="w-full max-w-sm rounded-3xl border border-[#1f2333]/[0.07] bg-white p-7 text-center shadow-[0_20px_50px_rgba(31,35,51,0.08)]">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff8df] text-[22px]">{status === "pending" ? "⏳" : "🚫"}</div>
        <h1 className="mt-5 text-[18px] font-semibold tracking-[-0.03em] text-[#1f2333]">{status === "pending" ? "Kaydınızın tamamlanması bekleniyor" : "Kaydınız onaylanmadı"}</h1>
        <p className="mt-2.5 text-[13px] leading-6 text-[#777983]">
          {status === "pending"
            ? "Hesabın oluşturuldu ama panele erişmeden önce bir yönetici tarafından onaylanması gerekiyor. Onaylandığında bu sayfayı yenilemen yeterli."
            : "Hesabınız için üyelik onayı verilmedi. Bir hata olduğunu düşünüyorsan yönetimle iletişime geç."}
        </p>
        <button onClick={onLogout} className="mt-6 h-10 w-full rounded-xl border border-[#1f2333]/10 text-[12px] font-semibold text-[#777983] hover:bg-[#f7f5ef]">
          Çıkış yap
        </button>
      </div>
    </div>
  );
}

// Gates the app behind onboarding for a signed-in user who hasn't finished
// it yet. Anonymous visitors go straight to `Home` (which already renders a
// demo experience + login prompt) — onboarding only ever applies once a
// real account exists to attach the profile to.
function AppGate() {
  const { user, loading: authLoading, logout } = useAuth();
  const onboarding = trpc.onboarding.get.useQuery(undefined, { enabled: Boolean(user) && user?.approvalStatus === "approved", retry: false });
  const [cacheReady, setCacheReady] = useState(false);

  // Home/OnboardingFlow mount olmadan ÖNCE, aynı tarayıcıda önceki bir
  // hesaptan kalmış olabilecek yerel önbelleği (kitap rafı, konular,
  // denemeler...) temizle — aksi halde state initializer'ları o eski veriyi
  // okur ve "misafir verisini hesaba taşı" efektleri yanlış hesaba yükler.
  useEffect(() => {
    if (authLoading) return;
    ensureLocalCacheMatchesAccount(user ? user.id : null);
    setCacheReady(true);
  }, [authLoading, user?.id]);

  if (authLoading || !cacheReady) return <DashboardLayoutSkeleton />;

  if (user && (user.approvalStatus === "pending" || user.approvalStatus === "rejected")) {
    return <PendingApprovalScreen status={user.approvalStatus} onLogout={() => void logout()} />;
  }

  if (user && (onboarding.isLoading || !onboarding.data)) return <DashboardLayoutSkeleton />;

  if (user && onboarding.data && !onboarding.data.onboardingCompleted) {
    return (
      <OnboardingFlow
        userName={user.name}
        onComplete={() => {
          try { sessionStorage.setItem(postOnboardingNudgeKey, "1"); } catch {}
          onboarding.refetch();
        }}
      />
    );
  }

  return <Home />;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster position="bottom-right" />
          <LocalSignInDialog />
          <AppGate />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
