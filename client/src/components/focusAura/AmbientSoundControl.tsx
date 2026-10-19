import { Headphones } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AMBIENT_SOUNDS, type AmbientChoice, type useAmbientSound } from "./useAmbientSound";

/**
 * Odak ekranının üst çubuğundaki "Ses" düğmesi ve paneli: ortam sesi, ses seviyesi ve
 * başlangıç/bitiş zili ile sesli uyarılar tek yerde (mobilde üst çubuk dar).
 */
export function AmbientSoundControl({ ambient, cuesEnabled, onToggleCues }: { ambient: ReturnType<typeof useAmbientSound>; cuesEnabled: boolean; onToggleCues: () => void }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const active = AMBIENT_SOUNDS.find((item) => item.key === ambient.sound);

  // Panel dışına tıklayınca ya da Escape ile kapanır.
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => { if (!panelRef.current?.contains(event.target as Node)) setOpen(false); };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <div ref={panelRef} className="sm:relative">
      <button onClick={() => setOpen((value) => !value)} className="focus-close" aria-expanded={open} aria-haspopup="dialog" aria-label="Ses ayarları">
        <Headphones size={14} /> <span className="hidden sm:inline">{active ? active.label : "Ses"}</span>
      </button>
      {ambient.blocked && <button onClick={() => void ambient.resume()} className="focus-close ml-2">Sesi başlat</button>}
      {open && (
        <div role="dialog" aria-label="Ses ayarları" className="fixed inset-x-4 top-[72px] z-20 rounded-2xl border border-white/15 bg-[#151c24] p-4 text-left shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-64">
          <label className="block text-[12px] font-semibold text-white/70" htmlFor="ambient-sound">Ortam sesi</label>
          <select id="ambient-sound" value={ambient.sound} onChange={(event) => ambient.setSound(event.target.value as AmbientChoice)} className="mt-1.5 h-10 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-[13px] text-white">
            <option value="off" className="text-ink">Kapalı</option>
            {AMBIENT_SOUNDS.map((item) => <option key={item.key} value={item.key} className="text-ink">{item.label}</option>)}
          </select>
          <label className="mt-3 block text-[12px] font-semibold text-white/70" htmlFor="ambient-volume">Ses seviyesi · %{ambient.volume}</label>
          <input id="ambient-volume" type="range" min="0" max="100" step="1" value={ambient.volume} onChange={(event) => ambient.setVolume(Number(event.target.value))} disabled={ambient.sound === "off"} className="mt-1.5 w-full accent-[#f2b934]" />
          <p className="mt-2 text-[11px] leading-4 text-white/45">Odak sürerken çalar, molada kısılır, duraklatınca susar. Seçimin hatırlanır.</p>
          <label className="mt-3 flex cursor-pointer items-center gap-2 border-t border-white/10 pt-3 text-[12px] font-semibold text-white/80">
            <input type="checkbox" checked={cuesEnabled} onChange={onToggleCues} className="h-4 w-4 accent-[#f2b934]" />
            Zil ve sesli uyarılar
          </label>
        </div>
      )}
    </div>
  );
}
