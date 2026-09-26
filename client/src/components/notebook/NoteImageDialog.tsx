import { trpc } from "@/lib/trpc";
import { Camera, ImagePlus, Loader2, RotateCw, X } from "lucide-react";
import { useRef, useState } from "react";
import { NO_CROP, compressImage, type CropInsets } from "../books/imageCompression";

type Rotation = 0 | 90 | 180 | 270;

/**
 * 📷 Fotoğraf ekle: kamera/galeri → döndür / kırp / önizle → küçültülüp yüklenir.
 * (Küçültme kitap taramasıyla ortak yardımcıdan; yükleme sunucuda tür/boyut/kota doğrulanır.)
 */
export default function NoteImageDialog({ onDone, onClose }: { onDone: (attachmentId: number) => void; onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [rotate, setRotate] = useState<Rotation>(0);
  const [crop, setCrop] = useState<CropInsets>(NO_CROP);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const upload = trpc.notes.uploadImage.useMutation();

  const choose = (picked?: File) => {
    if (!picked) return;
    if (!picked.type.startsWith("image/")) { setError("Yalnızca fotoğraf ekleyebilirsin."); return; }
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
    setRotate(0);
    setCrop(NO_CROP);
    setError("");
  };

  const save = async () => {
    if (!file || busy) return;
    setBusy(true);
    setError("");
    try {
      const image = await compressImage(file, { maxDimension: 1600, maxBytes: 800 * 1024, rotate, crop });
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
          <div className="text-[15px] font-semibold text-[#1f2333]">📷 Fotoğraf ekle</div>
          <button onClick={onClose} disabled={busy} className="rounded-lg p-2 text-[#8b8c95] hover:bg-[#f7f5ef]" aria-label="Kapat"><X size={16} /></button>
        </div>
        {error && <p role="alert" className="mt-3 rounded-xl bg-[#fff0ed] p-3 text-[12px] font-medium text-[#d95d4d]">{error}</p>}
        {!preview ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button onClick={() => cameraRef.current?.click()} className="flex h-28 flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-[#3b5ccc]/30 text-[12px] font-semibold text-[#3b5ccc] hover:bg-[#f4f6ff]"><Camera size={22} /> Kamera</button>
            <button onClick={() => galleryRef.current?.click()} className="flex h-28 flex-col items-center justify-center gap-1.5 rounded-2xl border border-[#1f2333]/10 text-[12px] font-semibold text-[#545661] hover:bg-[#f7f5ef]"><ImagePlus size={22} /> Galeri</button>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-[200px_1fr]">
            <div className="flex h-56 items-center justify-center overflow-hidden rounded-xl bg-[#f7f5ef]">
              <img src={preview} alt="Önizleme" className="max-h-full max-w-full object-contain" style={{ transform: `rotate(${rotate}deg)`, clipPath: `inset(${crop.top * 100}% ${crop.right * 100}% ${crop.bottom * 100}% ${crop.left * 100}%)` }} />
            </div>
            <div className="space-y-2">
              <button onClick={() => setRotate((value) => (((value + 90) % 360) as Rotation))} className="flex h-9 items-center gap-1.5 rounded-lg border border-[#1f2333]/10 px-3 text-[11px] font-semibold text-[#343643]"><RotateCw size={14} /> Döndür</button>
              {sides.map(([side, label]) => (
                <label key={side} className="block text-[11px] text-[#545661]">
                  <span className="flex justify-between"><span>Kırp · {label}</span><span>%{Math.round(crop[side] * 100)}</span></span>
                  <input type="range" min={0} max={45} value={Math.round(crop[side] * 100)} onChange={(event) => setCrop({ ...crop, [side]: Number(event.target.value) / 100 })} className="w-full accent-[#3b5ccc]" />
                </label>
              ))}
              <button onClick={() => { setFile(null); setPreview(null); }} className="text-[11px] font-semibold text-[#8b8c95]">Başka fotoğraf seç</button>
            </div>
          </div>
        )}
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => { choose(event.target.files?.[0]); event.target.value = ""; }} />
        <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={(event) => { choose(event.target.files?.[0]); event.target.value = ""; }} />
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} disabled={busy} className="h-10 rounded-xl border border-[#1f2333]/10 px-4 text-[12px] font-semibold text-[#777983]">Vazgeç</button>
          <button onClick={save} disabled={!file || busy} className="flex h-10 items-center gap-1.5 rounded-xl bg-[#1f2333] px-4 text-[12px] font-semibold text-white disabled:opacity-40">{busy && <Loader2 size={14} className="animate-spin" />} Nota ekle</button>
        </div>
      </div>
    </div>
  );
}
