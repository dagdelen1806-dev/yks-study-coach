import { trpc } from "@/lib/trpc";
import { readingProgressLabel, type ReadingBook } from "@shared/reading";
import { BookOpen, Check, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Bar100, primaryButton, secondaryButton } from "./kit";

/** Okuma kitabı ekle + okunan kitapların listesi. Gece okuması bu kitaplara bağlanır. */
export default function ReadingBookDialog({ onClose, onAdded }: { onClose: () => void; onAdded?: (book: ReadingBook) => void }) {
  const utils = trpc.useUtils();
  const books = trpc.reading.list.useQuery(undefined, { retry: false });
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [totalPages, setTotalPages] = useState("");
  const add = trpc.reading.add.useMutation({
    onSuccess: (book) => { utils.reading.list.invalidate(); toast.success(`"${book.title}" okuma listene eklendi.`); setTitle(""); setAuthor(""); setTotalPages(""); onAdded?.(book); },
    onError: (error) => toast.error(error.message || "Kitap eklenemedi."),
  });
  const update = trpc.reading.update.useMutation({ onSuccess: () => utils.reading.list.invalidate() });
  const remove = trpc.reading.remove.useMutation({ onSuccess: () => utils.reading.list.invalidate() });

  const submit = () => {
    if (!title.trim()) { toast.error("Kitap adını yaz."); return; }
    const pages = Number(totalPages);
    add.mutate({ title: title.trim(), author: author.trim() || null, totalPages: Number.isFinite(pages) && pages > 0 ? Math.round(pages) : null });
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 320 }} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal-card max-w-[460px]" role="dialog" aria-modal="true" aria-label="Okuma kitabı ekle">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-[13px] font-semibold text-brand">Gece okuması</p><h2 className="mt-1 text-[20px] font-extrabold text-ink">Okuma kitabı ekle</h2><p className="mt-1 text-[13px] text-ink-3">Takvimdeki "Gece okuması" alışkanlığında bu kitabı seçersin; okuduğun sayfalar kitabın ilerlemesine eklenir.</p></div>
          <button onClick={onClose} className="rounded-lg p-2 text-ink-4 hover:bg-paper" aria-label="Kapat"><X size={17} /></button>
        </div>
        <div className="mt-5 grid gap-3">
          <label className="block"><span className="form-label">Kitap adı</span><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={180} placeholder="Örn. Kürk Mantolu Madonna" className="form-input" autoFocus /></label>
          <div className="grid grid-cols-[1fr_120px] gap-3">
            <label className="block"><span className="form-label">Yazar (opsiyonel)</span><input value={author} onChange={(event) => setAuthor(event.target.value)} maxLength={120} className="form-input" /></label>
            <label className="block"><span className="form-label">Sayfa sayısı</span><input type="number" min={1} value={totalPages} onChange={(event) => setTotalPages(event.target.value)} placeholder="Ör. 160" className="form-input" /></label>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className={secondaryButton}>Kapat</button>
          <button onClick={submit} disabled={add.isPending} className={primaryButton}><BookOpen size={16} /> {add.isPending ? "Ekleniyor…" : "Ekle"}</button>
        </div>

        {(books.data?.length ?? 0) > 0 && (
          <div className="mt-6 border-t border-rule pt-4">
            <p className="text-[13px] font-bold text-ink">Okuma listem</p>
            <ul className="mt-2 max-h-[240px] space-y-2 overflow-y-auto">
              {books.data!.map((book) => (
                <li key={book.id} className="rounded-xl border border-rule p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><p className="truncate text-[13px] font-semibold text-ink">{book.title}{book.status === "finished" && <span className="ml-2 rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-bold text-success">Bitti</span>}</p><p className="text-[12px] text-ink-3">{[book.author, readingProgressLabel(book)].filter(Boolean).join(" · ")}</p></div>
                    <div className="flex shrink-0 gap-1">
                      {book.status === "reading" && <button onClick={() => update.mutate({ id: book.id, status: "finished" })} className="rounded-lg p-1.5 text-ink-4 hover:bg-success-soft hover:text-success" aria-label={`${book.title} bitti olarak işaretle`} title="Bitirdim"><Check size={15} /></button>}
                      <button onClick={() => { if (window.confirm(`"${book.title}" okuma listenden silinsin mi?`)) remove.mutate({ id: book.id }); }} className="rounded-lg p-1.5 text-ink-4 hover:bg-danger-soft hover:text-danger" aria-label={`${book.title} sil`} title="Sil"><Trash2 size={15} /></button>
                    </div>
                  </div>
                  {book.totalPages ? <div className="mt-2"><Bar100 value={(book.pagesRead / book.totalPages) * 100} /></div> : null}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
