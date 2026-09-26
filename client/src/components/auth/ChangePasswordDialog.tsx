import { trpc } from "@/lib/trpc";
import { X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const MIN_LENGTH = 8;

/** Profil menüsünden açılan "Şifre değiştir" — yalnızca şifreyle giriş yapan (yerel) hesaplar için. */
export default function ChangePasswordDialog({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState("");
  const change = trpc.auth.changePassword.useMutation({
    onSuccess: () => { toast.success("Şifren değiştirildi. Bir sonraki girişinde yeni şifreni kullan."); onClose(); },
    onError: (caught) => setError(/fetch|network/i.test(caught.message) ? "Sunucuya ulaşılamadı. İnternet bağlantını kontrol edip tekrar dener misin?" : caught.message),
  });

  const submit = () => {
    if (change.isPending) return;
    if (!current) { setError("Mevcut şifreni yaz."); return; }
    if (next.length < MIN_LENGTH) { setError(`Yeni şifre en az ${MIN_LENGTH} karakter olmalı.`); return; }
    if (next !== repeat) { setError("Yeni şifreler birbirini tutmuyor."); return; }
    if (next === current) { setError("Yeni şifre mevcut şifreyle aynı olamaz."); return; }
    setError("");
    change.mutate({ currentPassword: current, newPassword: next });
  };

  const field = (id: string, label: string, value: string, setValue: (value: string) => void, autoComplete: string, placeholder?: string) => (
    <label htmlFor={id} className="block">
      <span className="form-label">{label}</span>
      <input id={id} type="password" value={value} onChange={(event) => { setValue(event.target.value); setError(""); }} onKeyDown={(event) => { if (event.key === "Enter") submit(); }} autoComplete={autoComplete} placeholder={placeholder} maxLength={200} className="form-input" aria-invalid={Boolean(error)} />
    </label>
  );

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal-card max-w-[400px]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="eyebrow mb-2">Hesap güvenliği</div>
            <h2 className="text-[20px] font-semibold tracking-[-0.04em] text-[#1f2333]">Şifre değiştir</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-[#8b8c95] hover:bg-[#f7f5ef]" aria-label="Kapat"><X size={16} /></button>
        </div>
        <div className="mt-5 space-y-3">
          {field("current-password", "Mevcut şifre", current, setCurrent, "current-password")}
          {field("new-password", "Yeni şifre", next, setNext, "new-password", `En az ${MIN_LENGTH} karakter`)}
          {field("repeat-password", "Yeni şifre (tekrar)", repeat, setRepeat, "new-password")}
          {error && <p role="alert" className="text-[11px] font-medium text-[#d95d4d]">{error}</p>}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="h-10 rounded-xl border border-[#1f2333]/10 px-4 text-[12px] font-semibold text-[#777983]">Vazgeç</button>
          <button onClick={submit} disabled={change.isPending} className="h-10 rounded-xl bg-[#1f2333] px-4 text-[12px] font-semibold text-white disabled:opacity-50">{change.isPending ? "Kaydediliyor…" : "Şifreyi değiştir"}</button>
        </div>
      </div>
    </div>
  );
}
