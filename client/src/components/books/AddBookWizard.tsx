import { trpc } from "@/lib/trpc";
import { Camera, ImagePlus, Loader2, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import BookContentScanner, { type ScannerBook } from "./BookContentScanner";
import { compressImage } from "./imageCompression";

export type CoverDraft = { title: string; publisher: string; subject: string; exam: "TYT" | "AYT"; level: "Kolay" | "Orta" | "Zor"; authors: string; isbn: string; edition: string };
type FieldConfidence = Record<"title" | "publisher" | "subject" | "exam" | "isbn", number>;

const EMPTY_DRAFT: CoverDraft = { title: "", publisher: "", subject: "", exam: "TYT", level: "Orta", authors: "", isbn: "", edition: "" };
const FULL_CONFIDENCE: FieldConfidence = { title: 1, publisher: 1, subject: 1, exam: 1, isbn: 1 };
const LOW = 0.7;

/**
 * "Kitap ekle" sihirbazı — tek akış:
 *   1. Kapak fotoğrafı → kitap adı/yayınevi/ders okunur, öğrenci düzeltip onaylar.
 *   2. Kitap rafa eklenir (aynısı varsa mevcut kitaba yönlenir).
 *   3. "Şimdi içindekiler sayfasını ekle" → ikinci fotoğraf(lar) → konular
 *      eşleşir, onaylanır, kaydedilir; yarım kalan okuma cihazda hafızada tutulur.
 */
export default function AddBookWizard({
  onCreateBook,
  findDuplicate,
  onOpenExisting,
  onClose,
}: {
  onCreateBook: (draft: CoverDraft) => Promise<ScannerBook>;
  findDuplicate: (draft: CoverDraft) => ScannerBook | null;
  onOpenExisting: (book: ScannerBook) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<"cover" | "review" | "contents">("cover");
  const [draft, setDraft] = useState<CoverDraft>(EMPTY_DRAFT);
  const [confidence, setConfidence] = useState<FieldConfidence>(FULL_CONFIDENCE);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [book, setBook] = useState<ScannerBook | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const readCover = trpc.resources.extractBookFromPhoto.useMutation();

  const handleCover = async (file?: File) => {
    if (!file || readCover.isPending) return;
    setError("");
    setCoverPreview(URL.createObjectURL(file));
    try {
      const image = await compressImage(file);
      const data = await readCover.mutateAsync({ dataUrl: image.dataUrl, mimeType: image.mimeType });
      if (data.imageKind === "table_of_contents") {
        setError("Bu fotoğraf kitabın içindekiler sayfası gibi görünüyor. Önce kitabın KAPAĞINI çek; içindekiler sayfasını bir sonraki adımda ekleyeceksin.");
        return;
      }
      if (data.imageKind === "other" && !data.title) {
        setError("Fotoğrafta bir kitap kapağı bulunamadı. Kapağın tamamı görünecek şekilde, ışıklı bir yerde tekrar çeker misin?");
        return;
      }
      setDraft({ title: data.title, publisher: data.publisher, subject: data.subject || "Genel", exam: data.exam === "AYT" ? "AYT" : "TYT", level: "Orta", authors: data.authors.join(", "), isbn: data.isbn, edition: data.edition });
      setConfidence(data.fieldConfidence);
      setStep("review");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "";
      setError(/fetch|network/i.test(message) ? "Sunucuya ulaşılamadı. İnternet bağlantını kontrol edip tekrar dener misin?" : message || "Kapak okunamadı.");
    }
  };

  const confirmCover = async () => {
    if (creating) return;
    if (!draft.title.trim()) { toast.error("Kitap adını gir."); return; }
    const duplicate = findDuplicate(draft);
    if (duplicate) {
      toast.error("Bu kitap kütüphanende zaten bulunuyor.");
      onOpenExisting(duplicate);
      return;
    }
    setCreating(true);
    try {
      const created = await onCreateBook({ ...draft, title: draft.title.trim(), publisher: draft.publisher.trim(), subject: draft.subject.trim() || "Genel" });
      setBook(created);
      setStep("contents");
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Kitap eklenemedi.");
    } finally {
      setCreating(false);
    }
  };

  if (step === "contents" && book) {
    return (
      <BookContentScanner
        book={book}
        withCoverStep
        intro={`✓ "${book.title}" kütüphanene eklendi. Şimdi içindekiler sayfasının fotoğrafını ekle (2. resim) — ünite ve testleri okuyup YKS konularıyla eşleştireceğiz. Birden fazla içindekiler sayfası varsa hepsini ekle.`}
        onClose={onClose}
        onAddAnother={() => { setBook(null); setDraft(EMPTY_DRAFT); setConfidence(FULL_CONFIDENCE); setCoverPreview(null); setStep("cover"); }}
      />
    );
  }

  const hint = (field: keyof FieldConfidence) => confidence[field] < LOW && <span className="ml-1.5 rounded bg-[#fff8df] px-1 py-px text-[9px] font-bold text-[#a1711d]">kontrol et</span>;
  const lowClass = (field: keyof FieldConfidence) => (confidence[field] < LOW ? "border-[#e0b44c]" : "");

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !readCover.isPending && onClose()}>
      <div className="modal-card max-w-[520px]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="eyebrow mb-2">Kitap ekle · 1. adım</div>
            <h2 className="text-[20px] font-semibold tracking-[-0.04em] text-[#1f2333]">{step === "cover" ? "Kitabın kapağını çek" : "Kitap bilgilerini kontrol et"}</h2>
          </div>
          {!readCover.isPending && <button onClick={onClose} className="rounded-lg p-2 text-[#8b8c95] hover:bg-[#f7f5ef]" aria-label="Kapat"><X size={16} /></button>}
        </div>

        <div className="mt-4 flex gap-1.5" aria-hidden>
          {["Kapak", "İçindekiler", "Onay", "Tamam"].map((label, index) => (
            <div key={label} className="flex-1">
              <div className={`h-1.5 rounded-full ${index === 0 ? "bg-[#3b5ccc]" : "bg-[#eceae3]"}`} />
              <div className={`mt-1 text-[9px] font-semibold ${index === 0 ? "text-[#3b5ccc]" : "text-[#b0b1b8]"}`}>{label}</div>
            </div>
          ))}
        </div>

        {step === "cover" && (
          <div className="mt-5">
            <p className="text-[12px] leading-5 text-[#6d7390]">İlk fotoğraf kitabın <strong>kapağı</strong> olsun: kitap adı, yayınevi ve dersi buradan okuyacağız. Kapağın tamamı görünsün, parlama olmasın.</p>
            {error && <div role="alert" className="mt-3 rounded-xl bg-[#fff0ed] p-3 text-[12px] font-medium text-[#d95d4d]">{error}</div>}
            {readCover.isPending ? (
              <div className="flex flex-col items-center py-10 text-center">
                {coverPreview && <img src={coverPreview} alt="Kapak" className="mb-4 h-32 rounded-lg object-contain" />}
                <Loader2 className="animate-spin text-[#3b5ccc]" size={24} />
                <p className="mt-3 text-[12px] font-semibold text-[#1f2333]">Kapak okunuyor…</p>
              </div>
            ) : (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button onClick={() => cameraRef.current?.click()} className="flex h-28 flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-[#3b5ccc]/30 text-[12px] font-semibold text-[#3b5ccc] hover:bg-[#f4f6ff]"><Camera size={22} /> Kapağı çek</button>
                <button onClick={() => galleryRef.current?.click()} className="flex h-28 flex-col items-center justify-center gap-1.5 rounded-2xl border border-[#1f2333]/10 text-[12px] font-semibold text-[#545661] hover:bg-[#f7f5ef]"><ImagePlus size={22} /> Galeriden seç</button>
              </div>
            )}
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => { void handleCover(event.target.files?.[0]); event.target.value = ""; }} />
            <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={(event) => { void handleCover(event.target.files?.[0]); event.target.value = ""; }} />
            {!readCover.isPending && <button onClick={() => { setDraft(EMPTY_DRAFT); setConfidence(FULL_CONFIDENCE); setStep("review"); }} className="mt-3 text-[11px] font-semibold text-[#8b8c95] hover:text-[#343643]">Fotoğraf olmadan, bilgileri elle gir</button>}
          </div>
        )}

        {step === "review" && (
          <div className="mt-5">
            <div className="flex gap-4">
              {coverPreview && <img src={coverPreview} alt="Kapak" className="hidden h-36 w-24 shrink-0 rounded-lg object-cover sm:block" />}
              <div className="grid flex-1 gap-3">
                <label className="block"><span className="form-label">Kitap adı{hint("title")}</span><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className={`form-input ${lowClass("title")}`} autoFocus={!draft.title} /></label>
                <label className="block"><span className="form-label">Yayınevi{hint("publisher")}</span><input value={draft.publisher} onChange={(event) => setDraft({ ...draft, publisher: event.target.value })} className={`form-input ${lowClass("publisher")}`} /></label>
              </div>
            </div>
            <div className="mt-3 grid gap-3">
              <label className="block"><span className="form-label">Yazar(lar)</span><input value={draft.authors} onChange={(event) => setDraft({ ...draft, authors: event.target.value })} placeholder="Virgülle ayır" className="form-input" /></label>
              <div className="grid grid-cols-3 gap-3">
                <label className="block"><span className="form-label">Ders{hint("subject")}</span><input value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} className={`form-input ${lowClass("subject")}`} /></label>
                <label className="block"><span className="form-label">Sınav</span><select value={draft.exam} onChange={(event) => setDraft({ ...draft, exam: event.target.value as "TYT" | "AYT" })} className="form-input"><option value="TYT">TYT</option><option value="AYT">AYT</option></select></label>
                <label className="block"><span className="form-label">Seviye</span><select value={draft.level} onChange={(event) => setDraft({ ...draft, level: event.target.value as CoverDraft["level"] })} className="form-input"><option value="Kolay">Kolay</option><option value="Orta">Orta</option><option value="Zor">Zor</option></select></label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><span className="form-label">ISBN{draft.isbn && hint("isbn")}</span><input value={draft.isbn} onChange={(event) => setDraft({ ...draft, isbn: event.target.value })} placeholder="Varsa" inputMode="numeric" className="form-input" /></label>
                <label className="block"><span className="form-label">Baskı</span><input value={draft.edition} onChange={(event) => setDraft({ ...draft, edition: event.target.value })} placeholder="Varsa" className="form-input" /></label>
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <button onClick={() => { setStep("cover"); setError(""); }} className="h-10 rounded-xl px-3 text-[12px] font-semibold text-[#8b8c95] hover:text-[#343643]">Kapağı yeniden çek</button>
              <button onClick={confirmCover} disabled={creating} className="h-10 rounded-xl bg-[#3b5ccc] px-5 text-[12px] font-semibold text-white disabled:opacity-50">{creating ? "Ekleniyor…" : "Kaydet ve içindekilere geç →"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
