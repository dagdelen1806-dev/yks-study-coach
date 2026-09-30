import { trpc } from "@/lib/trpc";
import { EMAIL_VERIFICATION_RESEND_COOLDOWN_MS } from "@shared/const";
import { useEffect, useState } from "react";

type SendState = "idle" | "sending" | "sent" | "error";

/** Sunucudaki son gönderim zamanından kalan bekleme (ms). Kayıt anında mail
 * zaten gittiği için ekran ilk açıldığında da geri sayım doğru başlar. */
const remainingCooldown = (sentAt: Date | string | null | undefined) =>
  sentAt ? Math.max(0, EMAIL_VERIFICATION_RESEND_COOLDOWN_MS - (Date.now() - new Date(sentAt).getTime())) : 0;

/**
 * "E-postanı doğrula" ekranı. Asıl kilit backend'de (trpc.ts requireUser —
 * doğrulanmamış e-posta hesabı hiçbir korumalı uca erişemez); bu ekran
 * kullanıcıyı kilitlemeden ne yapacağını anlatan UX katmanı: tekrar gönder
 * (60 sn geri sayımlı), adresi düzelt, başka cihazda doğruladıysa "devam et".
 */
export default function VerifyEmailScreen({
  email,
  name,
  sentAt,
  onVerifiedCheck,
  onLogout,
}: {
  email: string;
  name: string | null;
  sentAt: Date | string | null;
  onVerifiedCheck: () => Promise<unknown>;
  onLogout: () => void;
}) {
  const [cooldownMs, setCooldownMs] = useState(() => remainingCooldown(sentAt));
  const [sendState, setSendState] = useState<SendState>("idle");
  const [message, setMessage] = useState("");
  const [checking, setChecking] = useState(false);
  const [changing, setChanging] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [changeError, setChangeError] = useState("");
  const [changeSubmitting, setChangeSubmitting] = useState(false);

  const resend = trpc.auth.resendVerificationEmail.useMutation();

  useEffect(() => {
    if (cooldownMs <= 0) return;
    const timer = window.setInterval(() => setCooldownMs((value) => Math.max(0, value - 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldownMs > 0]);

  // Link başka bir sekmede/cihazda açıldıysa, bu sekmeye dönünce kendiliğinden ilerle.
  useEffect(() => {
    const onFocus = () => void onVerifiedCheck();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [onVerifiedCheck]);

  const handleResend = async () => {
    setSendState("sending");
    setMessage("");
    try {
      const result = await resend.mutateAsync();
      if (result.status === "sent") {
        setSendState("sent");
        setCooldownMs(EMAIL_VERIFICATION_RESEND_COOLDOWN_MS);
      } else if (result.status === "cooldown") {
        setSendState("idle");
        setCooldownMs(result.retryAfterMs);
        setMessage(result.retryAfterMs > EMAIL_VERIFICATION_RESEND_COOLDOWN_MS ? "Kısa sürede çok fazla mail istedin. Biraz bekledikten sonra tekrar deneyebilirsin." : "");
      } else {
        // already_verified / not_required: ekranın açık kalması için sebep yok.
        await onVerifiedCheck();
      }
    } catch (error) {
      setSendState("error");
      const isNetwork = error instanceof Error && /fetch|network/i.test(error.message);
      setMessage(isNetwork ? "Sunucuya ulaşılamadı. İnternet bağlantını kontrol edip tekrar dener misin?" : error instanceof Error ? error.message : "Doğrulama maili gönderilemedi.");
    }
  };

  const handleCheck = async () => {
    setChecking(true);
    setMessage("");
    await onVerifiedCheck();
    setChecking(false);
    setMessage("E-postan henüz doğrulanmamış görünüyor. Maildeki bağlantıya tıkladıktan sonra tekrar dene.");
  };

  const handleChangeEmail = async () => {
    if (!newEmail.trim()) { setChangeError("Yeni e-posta adresini yaz."); return; }
    setChangeSubmitting(true);
    setChangeError("");
    try {
      const response = await fetch("/api/email/change", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: newEmail.trim() }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setChangeError((body && typeof body.error === "string" && body.error) || "E-posta adresi değiştirilemedi.");
        setChangeSubmitting(false);
        return;
      }
      // Oturum çerezi yeni adresle yeniden verildi; en temiz yol baştan yüklemek.
      window.location.reload();
    } catch {
      setChangeError("Sunucuya ulaşılamadı. İnternet bağlantını kontrol edip tekrar dener misin?");
      setChangeSubmitting(false);
    }
  };

  const cooldownSeconds = Math.ceil(cooldownMs / 1000);
  const resendDisabled = sendState === "sending" || cooldownSeconds > 0;
  const resendLabel = sendState === "sending" ? "Mail gönderiliyor…" : cooldownSeconds > 0 ? `Tekrar gönder ${cooldownSeconds} sn` : "Doğrulama Mailini Tekrar Gönder";

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper p-4 sm:p-6">
      <div className="w-full max-w-md rounded-3xl border border-ink/[0.07] bg-white p-6 shadow-overlay sm:p-7">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-[22px]">✉️</div>
        <h1 className="mt-5 text-center text-[21px] font-semibold text-ink font-display">Pusula YKS'ye hoş geldin{name ? `, ${name}` : ""}!</h1>
        <p className="mt-2.5 text-center text-[14px] leading-6 text-ink-3">Devam etmek için e-posta adresini doğrulaman gerekiyor. Doğrulama bağlantısını şu adrese gönderdik:</p>
        <p className="mt-2 break-all text-center text-[14px] font-semibold text-ink">{email}</p>

        {sendState === "sent" && <p role="status" className="mt-4 rounded-xl bg-success-soft p-3 text-center text-[13px] font-medium text-success">Mail gönderildi ✓ Gelen kutunu kontrol et.</p>}
        {message && <p role="alert" className={`mt-4 rounded-xl p-3 text-center text-[13px] font-medium ${sendState === "error" ? "bg-danger-soft text-danger" : "bg-paper text-ink-3"}`}>{message}</p>}

        <div className="mt-5 space-y-2">
          <button onClick={handleResend} disabled={resendDisabled} className="h-11 w-full rounded-xl bg-brand text-[14px] font-semibold text-white transition hover:bg-brand disabled:cursor-not-allowed disabled:opacity-50">
            {resendLabel}
          </button>
          <button onClick={handleCheck} disabled={checking} className="h-10 w-full rounded-xl border border-ink/10 text-[13px] font-semibold text-ink-2 hover:bg-paper disabled:opacity-50">
            {checking ? "Kontrol ediliyor…" : "Doğruladım, devam et"}
          </button>
        </div>

        {!changing ? (
          <button onClick={() => { setChanging(true); setChangeError(""); }} className="mt-3 w-full text-center text-[13px] font-semibold text-brand hover:underline">E-posta adresimi değiştirmek istiyorum</button>
        ) : (
          <div className="mt-4 space-y-2 rounded-2xl border border-ink/[0.07] p-3">
            <label htmlFor="verify-new-email" className="text-[13px] font-semibold text-ink">Yeni e-posta adresi</label>
            <input
              id="verify-new-email"
              type="email"
              value={newEmail}
              onChange={(event) => { setNewEmail(event.target.value); setChangeError(""); }}
              onKeyDown={(event) => { if (event.key === "Enter") void handleChangeEmail(); }}
              placeholder="ece@ornek.com"
              autoComplete="email"
              maxLength={320}
              className="form-input h-10 w-full text-[14px]"
              aria-invalid={Boolean(changeError)}
            />
            {changeError && <p role="alert" className="text-[12px] font-medium text-danger">{changeError}</p>}
            <div className="flex gap-2">
              <button onClick={() => setChanging(false)} className="h-9 flex-1 rounded-lg border border-ink/10 text-[13px] font-semibold text-ink-3">Vazgeç</button>
              <button onClick={handleChangeEmail} disabled={changeSubmitting} className="h-9 flex-1 rounded-lg bg-ink text-[13px] font-semibold text-white disabled:opacity-50">{changeSubmitting ? "Kaydediliyor…" : "Kaydet ve gönder"}</button>
            </div>
          </div>
        )}

        <div className="mt-6 rounded-2xl bg-paper p-4">
          <div className="text-[13px] font-semibold text-ink">Mail gelmedi mi?</div>
          <ul className="mt-2 space-y-1 text-[13px] leading-5 text-ink-3">
            <li>• Spam / Gereksiz klasörünü kontrol et</li>
            <li>• Birkaç dakika bekle</li>
            <li>• Hâlâ gelmediyse tekrar gönder</li>
          </ul>
        </div>

        <button onClick={onLogout} className="mt-4 w-full text-center text-[13px] font-semibold text-ink-3 hover:text-ink-2">Çıkış yap</button>
      </div>
    </div>
  );
}
