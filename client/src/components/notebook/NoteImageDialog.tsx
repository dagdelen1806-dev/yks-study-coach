import { trpc } from "@/lib/trpc";
import { Camera, ImagePlus, Loader2, RotateCw, ScanLine, X } from "lucide-react";
import { useRef, useState } from "react";
import { NO_CROP, compressImage, type CropInsets } from "../books/imageCompression";

type Rotation = 0 | 90 | 180 | 270;

/**
 * 📷 Fotoğraf ekle: kamera/galeri → döndür / kırp / önizle → küçültülüp yüklenir.
 * (Küçültme kitap taramasıyla ortak yardımcıdan; yükleme sunucuda tür/boyut/kota doğrulanır.)
 * Tarayıcı filtresi varsayılan açık: gölge ve karartı kalkar, kâğıt beyazlar; öğrenci kapatabilir.
 */
export default function NoteImageDialog({ onDone, onClose, confirmLabel = "Nota ekle", defaultScan = true }: { onDone: (attachmentId: number) => void; onClose: () => void; confirmLabel?: string; /** Duvarım'daki genel fotoğraflarda kapalı başlar. */ defaultScan?: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const [original, setOriginal] = useState<string | null>(null);
  const [scanned, setScanned] = useState<string | null>(null);
  const [scan, setScan] = useState(defaultScan);
  const preview = scan && scanned ? scanned : original;
  const [rotate, setRotate] = useState<Rotation>(0);
  const [crop, setCrop] = useState<CropInsets>(NO_CROP);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const latestFile = useRef<File | null>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const upload = trpc.notes.uploadImage.useMutation();

  const choose = (picked?: File) => {
    if (!picked) return;
    if (!picked.type.startsWith("image/")) { setError("Yalnızca fotoğraf ekleyebilirsin."); return; }
    setFile(picked);
    setOriginal(URL.createObjectURL(picked));
    setScanned(null);
    setRotate(0);
    setCrop(NO_CROP);
    setError("");
    // Filtreli önizleme küçük boyutta hazırlanır; kayıtta tam boyutta yeniden uygulanır.
    latestFile.current = picked;
    compressImage(picked, { maxDimension: 900, maxBytes: 700 * 1024, enhance: "scan" }).then((image) => { if (latestFile.current === picked) setScanned(image.dataUrl); }).catch(() => undefined);
  };

  const save = async () => {
    if (!file || busy) return;
    setBusy(true);
    setError("");
    try {
      const image = await compressImage(file, { maxDimension: 1600, maxBytes: 800 * 1024, rotate, crop, enhance: scan ? "scan" : "none" });
      const { id } = await upload.mutateAsync({ dataUrl: image.dataUrl });
      onDone(id);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "";
      setError(/fetch|network/i.test(message) ? "İnternet bağlantısı yok. Fotoğraf eklemek için bağlantı gerekli." : message || "Fotoğraf eklenemedi.");
    } finally {
      setBusy(false);
    }
  };

  const sides: Array<[keyof CropInsets, string]> = [["top", "Üst"], ["bottom", "Alt"], ["left", "Sol"], ["right", "Sağ"]];

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}>
      <div className="modal-card max-w-[520px]">
        <div className="flex items-center justify-between">
          <div className="text-[15px] font-semibold text-ink">📷 Fotoğraf ekle</div>
          <button onClick={onClose} disabled={busy} className="rounded-lg p-2 text-ink-3 hover:bg-paper" aria-label="Kapat"><X size={16} /></button>
        </div>
        {error && <p role="alert" className="mt-3 rounded-xl bg-danger-soft p-3 text-[13px] font-medium text-danger">{error}</p>}
        {!preview ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button onClick={() => cameraRef.current?.click()} className="flex h-28 flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-brand/30 text-[13px] font-semibold text-brand hover:bg-brand-soft"><Camera size={22} /> Kamera</button>
            <button onClick={() => galleryRef.current?.click()} className="flex h-28 flex-col items-center justify-center gap-1.5 rounded-2xl border border-ink/10 text-[13px] font-semibold text-ink-2 hover:bg-paper"><ImagePlus size={22} /> Galeri</button>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-[200px_1fr]">
            <div className="flex h-56 items-center justify-center overflow-hidden rounded-xl bg-paper">
              <img src={preview} alt="Önizleme" className="max-h-full max-w-full object-contain" style={{ transform: `rotate(${rotate}deg)`, clipPath: `inset(${crop.top * 100}% ${crop.right * 100}% ${crop.bottom * 100}% ${crop.left * 100}%)` }} />
            </div>
            <div className="space-y-2">
              <label className="flex items-start gap-2 rounded-lg bg-paper px-3 py-2 text-[12px] text-ink-2">
                <input type="checkbox" checked={scan} onChange={(event) => setScan(event.target.checked)} className="mt-0.5 accent-brand" />
                <span><span className="flex items-center gap-1 font-semibold text-ink"><ScanLine size={13} /> Tarayıcı filtresi</span>Gölge ve karartı kalkar, kâğıt beyazlar.</span>
              </label>
              <button onClick={() => setRotate((value) => (((value + 90) % 360) as Rotation))} className="flex h-9 items-center gap-1.5 rounded-lg border border-ink/10 px-3 text-[12px] font-semibold text-ink-2"><RotateCw size={14} /> Döndür</button>
              {sides.map(([side, label]) => (
                <label key={side} className="block text-[12px] text-ink-2">
                  <span className="flex justify-between"><span>Kırp · {label}</span><span>%{Math.round(crop[side] * 100)}</span></span>
                  <input type="range" min={0} max={45} value={Math.round(crop[side] * 100)} onChange={(event) => setCrop({ ...crop, [side]: Number(event.target.value) / 100 })} className="w-full accent-brand" />
                </label>
              ))}
              <button onClick={() => { setFile(null); setOriginal(null); setScanned(null); }} className="text-[12px] font-semibold text-ink-3">Başka fotoğraf seç</button>
            </div>
          </div>
        )}
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => { choose(event.target.files?.[0]); event.target.value = ""; }} />
        <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={(event) => { choose(event.target.files?.[0]); event.target.value = ""; }} />
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} disabled={busy} className="h-10 rounded-xl border border-ink/10 px-4 text-[13px] font-semibold text-ink-3">Vazgeç</button>
          <button onClick={save} disabled={!file || busy} className="flex h-10 items-center gap-1.5 rounded-xl bg-brand hover:bg-brand-strong px-4 text-[13px] font-semibold text-white disabled:opacity-40">{busy && <Loader2 size={14} className="animate-spin" />} {confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
