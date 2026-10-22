import { useExamTrack } from "@/hooks/useExamTrack";
import { trpc } from "@/lib/trpc";
import { EXAM_KIND_DEFS, type ExamKind } from "@shared/exams";
import type { inferRouterOutputs } from "@trpc/server";
import { BookCheck, Camera, ImagePlus, Loader2, RotateCcw, RotateCw, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { AppRouter } from "../../../../server/routers";
import BookContentScanner, { type ScannerBook } from "./BookContentScanner";
import { compressImage } from "./imageCompression";

export type CoverDraft = { title: string; publisher: string; subject: string; exam: ExamKind; level: "Kolay" | "Orta" | "Zor"; authors: string; isbn: string; edition: string };
export type SharedBookMatch = inferRouterOutputs<AppRouter>["resources"]["searchSharedBooks"][number];
export type CreatedBook = { book: ScannerBook; contentsCopied: number; topicCount: number; alreadyOwned: boolean };
type FieldConfidence = Record<"title" | "publisher" | "subject" | "exam" | "isbn", number>;

const emptyDraft = (exam: ExamKind): CoverDraft => ({ title: "", publisher: "", subject: "", exam, level: "Orta", authors: "", isbn: "", edition: "" });
const FULL_CONFIDENCE: FieldConfidence = { title: 1, publisher: 1, subject: 1, exam: 1, isbn: 1 };
const LOW = 0.7;

/** Ortak kayıttaki kitabı eklemek için taslak (kimlik ortak kayıttan gelir). */
const draftFromShared = (match: SharedBookMatch): CoverDraft => ({ title: match.title, publisher: match.publisher, subject: match.subject, exam: match.exam, level: "Orta", authors: match.authors ?? "", isbn: match.isbn ?? "", edition: match.edition ?? "" });

/**
 * "Kitap ekle" sihirbazı:
 *   0. Kitabın adını yaz — ortak kayıtta varsa fotoğraf gerekmez (OCR yok).
 *   1. Kapak fotoğrafı → kitap adı/yayınevi/ders okunur. Ortak kayıtta benzeri varsa
 *      "Bu kitabı mı eklemek istiyorsun?" diye sorulur; değilse öğrenci düzeltip onaylar.
 *   2. Kitap rafa eklenir. Ortak kayıttaki kitabın onaylı içindekileri varsa kopyalanır ve
 *      içindekiler fotoğrafı istenmez; yoksa içindekiler sayfası taranır (sonraki öğrenciler için
 *      ortak kayda da yazılır).
 */
export default function AddBookWizard({
  onCreateBook,
  findDuplicate,
  onOpenExisting,
  onClose,
}: {
  onCreateBook: (draft: CoverDraft, shared?: { id: number; useContents: boolean }) => Promise<CreatedBook>;
  findDuplicate: (draft: CoverDraft) => ScannerBook | null;
  onOpenExisting: (book: ScannerBook) => void;
  onClose: () => void;
}) {
  const { kinds } = useExamTrack();
  const defaultExam = kinds[0] ?? "TYT";
  const [step, setStep] = useState<"cover" | "match" | "review" | "added" | "contents">("cover");
  const [draft, setDraft] = useState<CoverDraft>(() => emptyDraft(defaultExam));
  const [confidence, setConfidence] = useState<FieldConfidence>(FULL_CONFIDENCE);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<CreatedBook | null>(null);
  const [matches, setMatches] = useState<SharedBookMatch[]>([]);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const readCover = trpc.resources.extractBookFromPhoto.useMutation();
  useEffect(() => { const timer = setTimeout(() => setDebounced(query.trim()), 300); return () => clearTimeout(timer); }, [query]);
  const search = trpc.resources.searchSharedBooks.useQuery({ q: debounced }, { enabled: step === "cover" && debounced.length >= 2, retry: false, staleTime: 60_000 });

  // Son kapak fotoğrafı ve dönüşü: yan çekilmiş kapak okunamazsa öğrenci yeniden çekmeden döndürüp tekrar deneyebilir.
  const [lastCover, setLastCover] = useState<{ file: File; rotate: 0 | 90 | 180 | 270 } | null>(null);
  const examOf = (exam: string): ExamKind => (kinds as string[]).includes(exam) ? (exam as ExamKind) : defaultExam;
  const reset = () => { setCreated(null); setDraft(emptyDraft(defaultExam)); setConfidence(FULL_CONFIDENCE); setCoverPreview(null); setMatches([]); setQuery(""); setError(""); setStep("cover"); };

  const handleCover = async (file?: File, rotate: 0 | 90 | 180 | 270 = 0) => {
    if (!file || readCover.isPending) return;
    setError("");
    setLastCover({ file, rotate });
    setCoverPreview(URL.createObjectURL(file));
    try {
      const image = await compressImage(file, { rotate, enhance: "photo" });
      const data = await readCover.mutateAsync({ dataUrl: image.dataUrl, mimeType: image.mimeType });
      if (data.imageKind === "table_of_contents") {
        setError("Bu fotoğraf kitabın içindekiler sayfası gibi görünüyor. Önce kitabın KAPAĞINI çek; içindekiler sayfasını bir sonraki adımda ekleyeceksin.");
        return;
      }
      if (data.imageKind === "other" && !data.title) {
        setError("Fotoğrafta bir kitap kapağı bulunamadı. Kapağın tamamı görünecek şekilde, ışıklı bir yerde tekrar çeker misin?");
        return;
      }
      setDraft({ title: data.title, publisher: data.publisher, subject: data.subject || "Genel", exam: examOf(data.exam), level: "Orta", authors: data.authors.join(", "), isbn: data.isbn, edition: data.edition });
      setConfidence(data.fieldConfidence);
      setMatches(data.matches);
      setStep(data.matches.length ? "match" : "review");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "";
      setError(/fetch|network/i.test(message) ? "Sunucuya ulaşılamadı. İnternet bağlantını kontrol edip tekrar dener misin?" : message || "Kapak okunamadı.");
    }
  };

  const create = async (bookDraft: CoverDraft, shared?: SharedBookMatch) => {
    if (creating) return;
    if (!bookDraft.title.trim()) { toast.error("Kitap adını gir."); return; }
    const duplicate = findDuplicate(bookDraft);
    if (duplicate) {
      toast.error("Bu kitap kütüphanende zaten bulunuyor.");
      onOpenExisting(duplicate);
      return;
    }
    setCreating(true);
    try {
      const result = await onCreateBook({ ...bookDraft, title: bookDraft.title.trim(), publisher: bookDraft.publisher.trim(), subject: bookDraft.subject.trim() || "Genel" }, shared ? { id: shared.id, useContents: shared.contentsItemCount > 0 } : undefined);
      if (result.alreadyOwned) {
        toast.error("Bu kitap kütüphanende zaten bulunuyor.");
        onOpenExisting(result.book);
        return;
      }
      setCreated(result);
      setStep(result.contentsCopied > 0 ? "added" : "contents");
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Kitap eklenemedi.");
    } finally {
      setCreating(false);
    }
  };

  if (step === "contents" && created) {
    return (
      <BookContentScanner
        book={created.book}
        withCoverStep
        intro={`✓ "${created.book.title}" kütüphanene eklendi. Şimdi içindekiler sayfasının fotoğrafını ekle (2. resim) — ünite ve testleri okuyup konularla eşleştireceğiz. Birden fazla içindekiler sayfası varsa hepsini ekle.`}
        onClose={onClose}
        onAddAnother={reset}
      />
    );
  }

  const hint = (field: keyof FieldConfidence) => confidence[field] < LOW && <span className="ml-1.5 rounded bg-warn-soft px-1 py-px text-[11px] font-bold text-warn">kontrol et</span>;
  const lowClass = (field: keyof FieldConfidence) => (confidence[field] < LOW ? "border-warn-fill" : "");
  const examLabel = (exam: ExamKind) => EXAM_KIND_DEFS[exam]?.label ?? exam;
  const matchCard = (match: SharedBookMatch) => (
    <div key={match.id} className="rounded-2xl border border-ink/10 p-4">
      <div className="text-[14px] font-semibold text-ink">{match.title}</div>
      <div className="mt-0.5 text-[12.5px] text-ink-3">{[match.publisher, match.subject, examLabel(match.exam), match.authors].filter(Boolean).join(" · ")}</div>
      <div className="mt-2 flex flex-wrap gap-1.5 text-[11.5px] font-semibold">
        <span className="rounded-full bg-paper px-2 py-0.5 text-ink-3">{match.ownerCount} öğrencinin kütüphanesinde</span>
        {match.contentsItemCount > 0 ? <span className="rounded-full bg-success-soft px-2 py-0.5 text-success">İçindekiler hazır · {match.contentsItemCount} bölüm, {match.contentsTopicCount} konu</span> : <span className="rounded-full bg-paper px-2 py-0.5 text-ink-4">İçindekiler henüz yok</span>}
      </div>
      <button onClick={() => void create(draftFromShared(match), match)} disabled={creating} className="mt-3 flex h-9 items-center gap-1.5 rounded-xl bg-brand px-4 text-[12.5px] font-semibold text-white disabled:opacity-50">{creating ? <Loader2 size={14} className="animate-spin" /> : <BookCheck size={14} />} Evet, bu kitap</button>
    </div>
  );

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !readCover.isPending && !creating && onClose()}>
      <div className="modal-card max-w-[520px]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="eyebrow mb-2">Kitap ekle · 1. adım</div>
            <h2 className="text-[23px] font-semibold text-ink font-display">{step === "cover" ? "Kitabını bul ya da kapağını çek" : step === "match" ? "Bu kitabı mı eklemek istiyorsun?" : step === "added" ? "Kütüphanene eklendi ✓" : "Kitap bilgilerini kontrol et"}</h2>
          </div>
          {!readCover.isPending && <button onClick={onClose} className="rounded-lg p-2 text-ink-3 hover:bg-paper" aria-label="Kapat"><X size={16} /></button>}
        </div>

        <div className="mt-4 flex gap-1.5" aria-hidden>
          {["Kapak", "İçindekiler", "Onay", "Tamam"].map((label, index) => {
            const active = step === "added" ? true : index === 0;
            return (
              <div key={label} className="flex-1">
                <div className={`h-1.5 rounded-full ${active ? "bg-brand" : "bg-rule"}`} />
                <div className={`mt-1 text-[11px] font-semibold ${active ? "text-brand" : "text-rule-strong"}`}>{label}</div>
              </div>
            );
          })}
        </div>

        {step === "cover" && (
          <div className="mt-5">
            {!readCover.isPending && (
              <div>
                <label className="form-label" htmlFor="shared-book-search">Kitabın adını yaz</label>
                <div className="relative">
                  <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" />
                  <input id="shared-book-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ör. Paragraf Soru Bankası" className="form-input pl-9" autoComplete="off" />
                </div>
                <p className="mt-1 text-[12px] text-ink-4">Başka bir öğrenci eklediyse fotoğraf çekmene gerek kalmaz.</p>
                {debounced.length >= 2 && (
                  <div className="mt-3 space-y-2">
                    {search.isLoading ? <p className="text-[12.5px] text-ink-3">Aranıyor…</p> : (search.data ?? []).length === 0 ? <p className="text-[12.5px] text-ink-3">Kayıtlı kitap bulunamadı — kapağı fotoğrafla ekle.</p> : (
                      <>
                        <p className="text-[12.5px] font-semibold text-ink-2">Bu kitabı mı eklemek istiyorsun?</p>
                        {(search.data ?? []).slice(0, 4).map(matchCard)}
                      </>
                    )}
                  </div>
                )}
                <div className="my-4 flex items-center gap-3 text-[11.5px] font-semibold uppercase tracking-wide text-ink-4"><span className="h-px flex-1 bg-rule" /> ya da kapağı çek <span className="h-px flex-1 bg-rule" /></div>
              </div>
            )}
            <p className="text-[13px] leading-5 text-ink-3">Fotoğraf kitabın <strong>kapağı</strong> olsun: kitap adı, yayınevi ve dersi buradan okuyacağız. Kapağın tamamı görünsün, parlama olmasın.</p>
            {error && (
              <div role="alert" className="mt-3 rounded-xl bg-danger-soft p-3 text-[13px] font-medium text-danger">
                {error}
                {lastCover && !readCover.isPending && (
                  <div className="mt-2">
                    <div className="text-[12px] font-medium text-warn">Fotoğraf yan mı? Yazının düz duracağı yöne döndürüp tekrar oku:</div>
                    <div className="mt-1.5 flex gap-2">
                      {([[270, "Sola çevir", RotateCcw], [90, "Sağa çevir", RotateCw]] as const).map(([turn, label, Icon]) => (
                        <button key={label} onClick={() => void handleCover(lastCover.file, (((lastCover.rotate + turn) % 360) as 0 | 90 | 180 | 270))} className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[12px] font-semibold text-brand">
                          <Icon size={13} /> {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {readCover.isPending ? (
              <div className="flex flex-col items-center py-10 text-center">
                {coverPreview && <img src={coverPreview} alt="Kapak" style={lastCover?.rotate ? { transform: `rotate(${lastCover.rotate}deg)` } : undefined} className="mb-4 h-32 rounded-lg object-contain" />}
                <Loader2 className="animate-spin text-brand" size={24} />
                <p className="mt-3 text-[13px] font-semibold text-ink">Kapak okunuyor…</p>
              </div>
            ) : (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button onClick={() => cameraRef.current?.click()} className="flex h-28 flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-brand/30 text-[13px] font-semibold text-brand hover:bg-brand-soft"><Camera size={22} /> Kapağı çek</button>
                <button onClick={() => galleryRef.current?.click()} className="flex h-28 flex-col items-center justify-center gap-1.5 rounded-2xl border border-ink/10 text-[13px] font-semibold text-ink-2 hover:bg-paper"><ImagePlus size={22} /> Galeriden seç</button>
              </div>
            )}
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => { void handleCover(event.target.files?.[0]); event.target.value = ""; }} />
            <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={(event) => { void handleCover(event.target.files?.[0]); event.target.value = ""; }} />
            {!readCover.isPending && <button onClick={() => { setDraft({ ...emptyDraft(defaultExam), title: query.trim() }); setConfidence(FULL_CONFIDENCE); setStep("review"); }} className="mt-3 text-[12px] font-semibold text-ink-3 hover:text-ink-2">Fotoğraf olmadan, bilgileri elle gir</button>}
          </div>
        )}

        {step === "match" && (
          <div className="mt-5 space-y-3">
            <p className="text-[13px] leading-5 text-ink-3">Kapaktan <strong className="text-ink-2">"{draft.title}"</strong>{draft.publisher ? ` (${draft.publisher})` : ""} okundu. Bu kitap başka öğrenciler tarafından eklenmiş olabilir:</p>
            {matches.map(matchCard)}
            <button onClick={() => setStep("review")} disabled={creating} className="h-10 w-full rounded-xl border border-ink/10 text-[13px] font-semibold text-ink-2 hover:bg-paper">Hayır, benim kitabım farklı</button>
          </div>
        )}

        {step === "added" && created && (
          <div className="mt-5">
            <div className="rounded-2xl bg-success-soft/60 p-4 text-[13px] leading-5 text-ink-2">
              <strong className="font-semibold text-ink">"{created.book.title}"</strong> kütüphanene eklendi. İçindekiler, kitabı daha önce ekleyen öğrencilerin onayladığı kayıttan hazır geldi: <strong>{created.contentsCopied} bölüm, {created.topicCount} konu</strong>. Fotoğraf çekmene gerek yok.
            </div>
            <p className="mt-3 text-[12px] text-ink-3">Baskın farklıysa ya da bir eşleşme yanlışsa kitabı açıp içindekileri kendi kitabından yeniden tarayabilirsin; düzeltmen yalnızca senin kütüphaneni değiştirir.</p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <button onClick={() => onOpenExisting(created.book)} className="h-10 rounded-xl px-3 text-[13px] font-semibold text-ink-3 hover:text-ink-2">İçindekileri kontrol et</button>
              <div className="flex gap-2">
                <button onClick={reset} className="h-10 rounded-xl border border-ink/10 px-4 text-[13px] font-semibold text-ink-2">Başka kitap ekle</button>
                <button onClick={onClose} className="h-10 rounded-xl bg-brand px-5 text-[13px] font-semibold text-white">Tamam</button>
              </div>
            </div>
          </div>
        )}

        {step === "review" && (
          <div className="mt-5">
            <div className="flex gap-4">
              {coverPreview && <img src={coverPreview} alt="Kapak" style={lastCover?.rotate ? { transform: `rotate(${lastCover.rotate}deg)` } : undefined} className="hidden h-36 w-24 shrink-0 rounded-lg object-cover sm:block" />}
              <div className="grid flex-1 gap-3">
                <label className="block"><span className="form-label">Kitap adı{hint("title")}</span><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className={`form-input ${lowClass("title")}`} autoFocus={!draft.title} /></label>
                <label className="block"><span className="form-label">Yayınevi{hint("publisher")}</span><input value={draft.publisher} onChange={(event) => setDraft({ ...draft, publisher: event.target.value })} className={`form-input ${lowClass("publisher")}`} /></label>
              </div>
            </div>
            <div className="mt-3 grid gap-3">
              <label className="block"><span className="form-label">Yazar(lar)</span><input value={draft.authors} onChange={(event) => setDraft({ ...draft, authors: event.target.value })} placeholder="Virgülle ayır" className="form-input" /></label>
              <div className="grid grid-cols-3 gap-3">
                <label className="block"><span className="form-label">Ders{hint("subject")}</span><input value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} className={`form-input ${lowClass("subject")}`} /></label>
                <label className="block"><span className="form-label">Sınav</span><select value={draft.exam} onChange={(event) => setDraft({ ...draft, exam: event.target.value as ExamKind })} className="form-input">{(kinds.includes(draft.exam) ? kinds : [draft.exam, ...kinds]).map((kind) => <option key={kind} value={kind}>{examLabel(kind)}</option>)}</select></label>
                <label className="block"><span className="form-label">Seviye</span><select value={draft.level} onChange={(event) => setDraft({ ...draft, level: event.target.value as CoverDraft["level"] })} className="form-input"><option value="Kolay">Kolay</option><option value="Orta">Orta</option><option value="Zor">Zor</option></select></label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><span className="form-label">ISBN{draft.isbn && hint("isbn")}</span><input value={draft.isbn} onChange={(event) => setDraft({ ...draft, isbn: event.target.value })} placeholder="Varsa" inputMode="numeric" className="form-input" /></label>
                <label className="block"><span className="form-label">Baskı</span><input value={draft.edition} onChange={(event) => setDraft({ ...draft, edition: event.target.value })} placeholder="Varsa" className="form-input" /></label>
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <button onClick={() => { setStep(matches.length ? "match" : "cover"); setError(""); }} className="h-10 rounded-xl px-3 text-[13px] font-semibold text-ink-3 hover:text-ink-2">{matches.length ? "Önerilen kitaplara dön" : "Kapağı yeniden çek"}</button>
              <button onClick={() => void create(draft)} disabled={creating} className="h-10 rounded-xl bg-brand px-5 text-[13px] font-semibold text-white disabled:opacity-50">{creating ? "Ekleniyor…" : "Kaydet ve içindekilere geç →"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
