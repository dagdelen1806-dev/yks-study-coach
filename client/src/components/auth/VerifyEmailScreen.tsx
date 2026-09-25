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
    <div className="flex min-h-screen items-center justify-center bg-[#f7f5ef] p-4 sm:p-6">
      <div className="w-full max-w-md rounded-3xl border border-[#1f2333]/[0.07] bg-white p-6 shadow-[0_20px_50px_rgba(31,35,51,0.08)] sm:p-7">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef1fc] text-[22px]">✉️</div>
        <h1 className="mt-5 text-center text-[18px] font-semibold tracking-[-0.03em] text-[#1f2333]">Pusula YKS'ye hoş geldin{name ? `, ${name}` : ""}!</h1>
        <p className="mt-2.5 text-center text-[13px] leading-6 text-[#777983]">Devam etmek için e-posta adresini doğrulaman gerekiyor. Doğrulama bağlantısını şu adrese gönderdik:</p>
        <p className="mt-2 break-all text-center text-[14px] font-semibold text-[#1f2333]">{email}</p>

        {sendState === "sent" && <p role="status" className="mt-4 rounded-xl bg-[#eaf6f0] p-3 text-center text-[12px] font-medium text-[#3c8a6d]">Mail gönderildi ✓ Gelen kutunu kontrol et.</p>}
        {message && <p role="alert" className={`mt-4 rounded-xl p-3 text-center text-[12px] font-medium ${sendState === "error" ? "bg-[#fff0ed] text-[#d95d4d]" : "bg-[#f7f5ef] text-[#6b6d77]"}`}>{message}</p>}

        <div className="mt-5 space-y-2">
          <button onClick={handleResend} disabled={resendDisabled} className="h-11 w-full rounded-xl bg-[#3b5ccc] text-[13px] font-semibold text-white transition hover:bg-[#3350b5] disabled:cursor-not-allowed disabled:opacity-50">
            {resendLabel}
          </button>
          <button onClick={handleCheck} disabled={checking} className="h-10 w-full rounded-xl border border-[#1f2333]/10 text-[12px] font-semibold text-[#343643] hover:bg-[#f7f5ef] disabled:opacity-50">
            {checking ? "Kontrol ediliyor…" : "Doğruladım, devam et"}
          </button>
        </div>

        {!changing ? (
          <button onClick={() => { setChanging(true); setChangeError(""); }} className="mt-3 w-full text-center text-[12px] font-semibold text-[#3b5ccc] hover:underline">E-posta adresimi değiştirmek istiyorum</button>
        ) : (
          <div className="mt-4 space-y-2 rounded-2xl border border-[#1f2333]/[0.07] p-3">
            <label htmlFor="verify-new-email" className="text-[12px] font-semibold text-[#1f2333]">Yeni e-posta adresi</label>
            <input
              id="verify-new-email"
              type="email"
              value={newEmail}
              onChange={(event) => { setNewEmail(event.target.value); setChangeError(""); }}
              onKeyDown={(event) => { if (event.key === "Enter") void handleChangeEmail(); }}
              placeholder="ece@ornek.com"
              autoComplete="email"
              maxLength={320}
              className="form-input h-10 w-full text-[13px]"
              aria-invalid={Boolean(changeError)}
            />
            {changeError && <p role="alert" className="text-[11px] font-medium text-[#d95d4d]">{changeError}</p>}
            <div className="flex gap-2">
              <button onClick={() => setChanging(false)} className="h-9 flex-1 rounded-lg border border-[#1f2333]/10 text-[12px] font-semibold text-[#777983]">Vazgeç</button>
              <button onClick={handleChangeEmail} disabled={changeSubmitting} className="h-9 flex-1 rounded-lg bg-[#1f2333] text-[12px] font-semibold text-white disabled:opacity-50">{changeSubmitting ? "Kaydediliyor…" : "Kaydet ve gönder"}</button>
            </div>
          </div>
        )}

        <div className="mt-6 rounded-2xl bg-[#f7f5ef] p-4">
          <div className="text-[12px] font-semibold text-[#1f2333]">Mail gelmedi mi?</div>
          <ul className="mt-2 space-y-1 text-[12px] leading-5 text-[#6b6d77]">
            <li>• Spam / Gereksiz klasörünü kontrol et</li>
            <li>• Birkaç dakika bekle</li>
            <li>• Hâlâ gelmediyse tekrar gönder</li>
          </ul>
        </div>

        <button onClick={onLogout} className="mt-4 w-full text-center text-[12px] font-semibold text-[#8b8c95] hover:text-[#343643]">Çıkış yap</button>
      </div>
    </div>
  );
}
