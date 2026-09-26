import { trpc } from "@/lib/trpc";
import { NOTE_TEMPLATES } from "@shared/noteContent";
import { Camera, CloudOff, LayoutList, Loader2, Mic, PenLine, Plus, Search, Sigma, SquarePen, Star, Waypoints } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { listUnsyncedDrafts, removeDraft, saveDraft, type StoredDraft } from "./drafts";
import { NoteCard, NoteTimeline } from "./NoteList";
import { useNotebook } from "./NotebookProvider";
import { useCurriculumTopics, useMyBooks } from "./useNotebookData";

type Range = "today" | "week" | "month" | "all";

/** Yerel saatle aralık sınırları (sunucuya ISO olarak gider). */
export function rangeBounds(range: Range, reference = new Date()): { from: string | null; to: string | null } {
  if (range === "all") return { from: null, to: null };
  const start = new Date(reference);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  if (range === "today") end.setDate(end.getDate() + 1);
  if (range === "week") { start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); end.setTime(start.getTime()); end.setDate(end.getDate() + 7); }
  if (range === "month") { start.setDate(1); end.setTime(start.getTime()); end.setMonth(end.getMonth() + 1); }
  return { from: start.toISOString(), to: new Date(end.getTime() - 1).toISOString() };
}

/**
 * 📒 Defter — öğrencinin kişisel çalışma alanı: zaman filtreleri, ders/konu/
 * kitap/etiket/tür filtreleri, arama, liste ve zaman çizelgesi görünümü,
 * sabitlenenler, tekrar zamanı gelenler ve eşitlenmemiş taslaklar.
 */
export default function NotebookSection() {
  const notebook = useNotebook();
  const utils = trpc.useUtils();
  const [range, setRange] = useState<Range>("week");
  const [subject, setSubject] = useState("");
  const [topicId, setTopicId] = useState<number | null>(null);
  const [bookId, setBookId] = useState("");
  const [tag, setTag] = useState("");
  const [kind, setKind] = useState<"" | "text" | "voice" | "image" | "formula" | "drawing">("");
  const [favorite, setFavorite] = useState(false);
  const [view, setView] = useState<"list" | "timeline">("list");
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [unsynced, setUnsynced] = useState<StoredDraft[]>(() => listUnsyncedDrafts());
  const [syncing, setSyncing] = useState(false);
  const { topics, subjects } = useCurriculumTopics();
  const books = useMyBooks();
  const tags = trpc.notes.tags.useQuery(undefined, { retry: false });
  const save = trpc.notes.save.useMutation();

  useEffect(() => { const timer = window.setTimeout(() => setQ(searchInput.trim()), 300); return () => window.clearTimeout(timer); }, [searchInput]);

  const bounds = useMemo(() => rangeBounds(range), [range]);
  const filters = { ...bounds, subject: subject || null, topicId, bookId: bookId || null, tag: tag || null, kind: kind || null, q: q || null, favorite: favorite || undefined };
  const list = trpc.notes.list.useInfiniteQuery(filters, { getNextPageParam: (page) => page.nextCursor ?? undefined, retry: false });
  const pinned = trpc.notes.list.useQuery({ pinned: true, limit: 6 }, { retry: false });
  const reviewDue = trpc.notes.list.useQuery({ reviewDue: true, limit: 6 }, { retry: false });
  const notes = list.data?.pages.flatMap((page) => page.items) ?? [];
  const hasFilters = Boolean(subject || topicId || bookId || tag || kind || favorite || q);

  const syncAll = async () => {
    setSyncing(true);
    let ok = 0;
    for (const draft of unsynced) {
      try {
        await save.mutateAsync(draft.payload);
        removeDraft(draft.payload.clientId);
        ok += 1;
      } catch {
        saveDraft({ ...draft, status: "failed", updatedAt: Date.now() });
      }
    }
    setSyncing(false);
    setUnsynced(listUnsyncedDrafts());
    void utils.notes.list.invalidate();
    toast[ok === unsynced.length ? "success" : "error"](ok === unsynced.length ? `${ok} not eşitlendi.` : "Bazı notlar eşitlenemedi; bağlantını kontrol et.");
  };

  const openNew = (options: Parameters<typeof notebook.open>[0]) => { setShowNew(false); notebook.open(options); };

  return (
    <div className="space-y-5 animate-page-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="eyebrow mb-2">Akıllı Defter</div>
          <h1 className="page-heading">📒 Benim Defterim</h1>
          <p className="page-subtitle">Konuşarak, yazarak, fotoğraf, formül ve çizimle not al; notlarını ders, konu ve kitaplarınla eşle, zamanı gelince tekrar et.</p>
        </div>
        <button onClick={() => setShowNew(true)} className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#1f2333] px-5 text-[13px] font-semibold text-white shadow-lg"><Plus size={17} /> Yeni Not</button>
      </div>

      {unsynced.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#e0b44c]/40 bg-[#fff8df] px-4 py-3 text-[12px] text-[#8a6116]">
          <span className="flex items-center gap-2"><CloudOff size={15} /> {unsynced.length} not bu cihazda saklandı ama henüz hesabına kaydedilmedi.</span>
          <span className="flex gap-2">
            <button onClick={() => void syncAll()} disabled={syncing} className="rounded-lg bg-[#1f2333] px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50">{syncing ? "Eşitleniyor…" : "Şimdi eşitle"}</button>
            <button onClick={() => notebook.open({ draftClientId: unsynced[0].payload.clientId })} className="px-2 text-[11px] font-semibold">Aç</button>
          </span>
        </div>
      )}

      {Boolean(reviewDue.data?.items.length) && (
        <div className="rounded-2xl border border-[#55a98b]/25 bg-[#f1faf5] p-4">
          <div className="text-[12px] font-bold text-[#2e7d4f]">🔁 Tekrar zamanı</div>
          <div className="mt-2 grid gap-2 md:grid-cols-2">{reviewDue.data!.items.map((note) => <NoteCard key={note.id} note={note} onOpen={(id) => notebook.open({ noteId: id })} />)}</div>
        </div>
      )}

      {Boolean(pinned.data?.items.length) && !hasFilters && (
        <div>
          <div className="mb-2 text-[12px] font-bold text-[#1f2333]">📌 Sabitlenen notlar</div>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{pinned.data!.items.map((note) => <NoteCard key={note.id} note={note} onOpen={(id) => notebook.open({ noteId: id })} />)}</div>
        </div>
      )}

      <div className="soft-card space-y-3 p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl bg-[#f7f5ef] p-1" role="tablist" aria-label="Zaman aralığı">
            {([["today", "Bugün"], ["week", "Bu Hafta"], ["month", "Bu Ay"], ["all", "Tümü"]] as const).map(([key, label]) => (
              <button key={key} role="tab" aria-selected={range === key} onClick={() => setRange(key)} className={`h-9 rounded-lg px-3 text-[12px] font-semibold ${range === key ? "bg-white text-[#1f2333] shadow-sm" : "text-[#8b8c95]"}`}>{label}</button>
            ))}
          </div>
          <div className="relative min-w-[200px] flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a2a3aa]" aria-hidden />
            <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Notlarında ara (başlık, metin, etiket, konu, kitap)…" className="form-input h-10" style={{ paddingLeft: 36 }} aria-label="Notlarda ara" />
          </div>
          <div className="flex rounded-xl bg-[#f7f5ef] p-1">
            <button onClick={() => setView("list")} aria-pressed={view === "list"} aria-label="Liste görünümü" className={`flex h-9 w-9 items-center justify-center rounded-lg ${view === "list" ? "bg-white shadow-sm" : ""}`}><LayoutList size={15} /></button>
            <button onClick={() => setView("timeline")} aria-pressed={view === "timeline"} aria-label="Zaman çizelgesi" className={`flex h-9 w-9 items-center justify-center rounded-lg ${view === "timeline" ? "bg-white shadow-sm" : ""}`}><Waypoints size={15} /></button>
          </div>
        </div>
        {/* .form-input genişliği %100 sabitler: filtreler ızgarada eşit hücrelere yerleşir. */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <select aria-label="Ders" value={subject} onChange={(event) => { setSubject(event.target.value); setTopicId(null); }} className="form-input h-9 text-[11px]"><option value="">Tüm dersler</option>{subjects.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <select aria-label="Konu" value={topicId ?? ""} onChange={(event) => setTopicId(event.target.value ? Number(event.target.value) : null)} className="form-input h-9 text-[11px]"><option value="">Tüm konular</option>{topics.filter((item) => !subject || item.subject === subject).map((item) => <option key={item.id} value={item.id}>{subject ? "" : `${item.subject} · `}{item.topic}</option>)}</select>
          <select aria-label="Kitap" value={bookId} onChange={(event) => setBookId(event.target.value)} className="form-input h-9 text-[11px]"><option value="">Tüm kitaplar</option>{books.map((book) => <option key={book.id} value={book.id}>{book.title}</option>)}</select>
          <select aria-label="Etiket" value={tag} onChange={(event) => setTag(event.target.value)} className="form-input h-9 text-[11px]"><option value="">Tüm etiketler</option>{tags.data?.map((item) => <option key={item.tag} value={item.tag}>#{item.tag} ({item.count})</option>)}</select>
          <select aria-label="Not türü" value={kind} onChange={(event) => setKind(event.target.value as typeof kind)} className="form-input h-9 text-[11px]"><option value="">Tüm türler</option><option value="text">✍️ Yazı</option><option value="voice">🎙️ Ses</option><option value="image">📷 Fotoğraf</option><option value="formula">∑ Formül</option><option value="drawing">🖊 Çizim</option></select>
          <button onClick={() => setFavorite((value) => !value)} aria-pressed={favorite} className={`flex h-9 items-center gap-1 rounded-xl border px-3 text-[11px] font-semibold ${favorite ? "border-[#f5b301] bg-[#fff8df] text-[#8a6116]" : "border-[#1f2333]/10 text-[#545661]"}`}><Star size={13} className={favorite ? "fill-[#f5b301] text-[#f5b301]" : ""} /> Favoriler</button>
                  </div>
        {hasFilters && <button onClick={() => { setSubject(""); setTopicId(null); setBookId(""); setTag(""); setKind(""); setFavorite(false); setSearchInput(""); }} className="h-8 px-1 text-[11px] font-semibold text-[#8b8c95]">Filtreleri temizle</button>}
      </div>

      {list.isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#3b5ccc]" size={22} /></div>
      ) : list.isError ? (
        <div className="rounded-2xl bg-[#fff0ed] p-4 text-[12px] text-[#d95d4d]">Notlar yüklenemedi. <button onClick={() => void list.refetch()} className="font-semibold underline">Tekrar dene</button></div>
      ) : notes.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#1f2333]/15 p-10 text-center">
          <div className="text-[34px]" aria-hidden>📒</div>
          <p className="mt-2 text-[13px] font-semibold text-[#1f2333]">{hasFilters || range !== "all" ? "Bu filtrelerle not yok." : "Henüz not almadın."}</p>
          <p className="mt-1 text-[12px] text-[#8b8c95]">Ders çalışırken aklına geleni hemen yaz ya da mikrofona söyle.</p>
          <button onClick={() => setShowNew(true)} className="mt-4 h-10 rounded-xl bg-[#1f2333] px-4 text-[12px] font-semibold text-white">+ Yeni Not</button>
        </div>
      ) : view === "timeline" ? (
        <NoteTimeline notes={notes} onOpen={(id) => notebook.open({ noteId: id })} />
      ) : (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{notes.map((note) => <NoteCard key={note.id} note={note} onOpen={(id) => notebook.open({ noteId: id })} />)}</div>
      )}
      {list.hasNextPage && <div className="text-center"><button onClick={() => void list.fetchNextPage()} disabled={list.isFetchingNextPage} className="h-10 rounded-xl border border-[#1f2333]/10 px-5 text-[12px] font-semibold text-[#545661]">{list.isFetchingNextPage ? "Yükleniyor…" : "Daha fazla göster"}</button></div>}

      {showNew && (
        <div className="modal-backdrop items-end sm:items-center" onMouseDown={(event) => event.target === event.currentTarget && setShowNew(false)}>
          <div className="modal-card max-w-[480px]">
            <div className="text-[15px] font-semibold text-[#1f2333]">➕ Yeni Not</div>
            <div className="mt-4 grid grid-cols-5 gap-2">
              {([["Yaz", <SquarePen key="t" size={20} />, undefined], ["Ses", <Mic key="v" size={20} className="text-[#d95d4d]" />, "voice"], ["Fotoğraf", <Camera key="p" size={20} />, "photo"], ["Formül", <Sigma key="f" size={20} />, "formula"], ["Çiz", <PenLine key="d" size={20} />, "drawing"]] as const).map(([label, icon, startWith]) => (
                <button key={label} onClick={() => openNew({ prefill: { startWith } })} className="flex h-20 flex-col items-center justify-center gap-1.5 rounded-2xl border border-[#1f2333]/10 text-[11px] font-semibold text-[#343643] hover:bg-[#f4f6ff]">{icon}{label}</button>
              ))}
            </div>
            <div className="mt-5 text-[11px] font-bold uppercase tracking-[.08em] text-[#9a9ba3]">Şablonlar</div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {NOTE_TEMPLATES.map((template) => (
                <button key={template.key} onClick={() => openNew({ prefill: { templateKey: template.key } })} className="rounded-xl border border-[#1f2333]/10 px-3 py-2.5 text-left text-[12px] hover:bg-[#f7f5ef]"><span className="font-semibold text-[#1f2333]">{template.icon} {template.label}</span><span className="mt-0.5 block text-[10px] text-[#8b8c95]">{template.sections.slice(0, 3).join(" · ")}…</span></button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Takvimdeki gün görünümü için: o günün notları. */
export function DayNotes({ date }: { date: string }) {
  const notebook = useNotebook();
  const start = new Date(`${date}T00:00:00`);
  const end = new Date(start.getTime() + 86_400_000 - 1);
  const list = trpc.notes.list.useQuery({ from: start.toISOString(), to: end.toISOString(), limit: 20 }, { retry: false });
  const items = list.data?.items ?? [];
  return (
    <div className="soft-card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[13px] font-semibold text-[#1f2333]">📒 Bu günün notları {items.length ? `(${items.length})` : ""}</div>
        <button onClick={() => notebook.open({ prefill: {} })} className="text-[11px] font-semibold text-[#3b5ccc]">+ Not al</button>
      </div>
      {items.length === 0 ? <p className="mt-2 text-[12px] text-[#8b8c95]">Bu gün için not yok.</p> : <div className="mt-3 grid gap-2 md:grid-cols-2">{items.map((note) => <NoteCard key={note.id} note={note} onOpen={(id) => notebook.open({ noteId: id })} />)}</div>}
    </div>
  );
}

/** Genel Bakış: tekrar tarihi gelen notlar (bildirim sistemi olmadığı için panoda gösterilir). */
export function ReviewDueNotes() {
  const notebook = useNotebook();
  const due = trpc.notes.list.useQuery({ reviewDue: true, limit: 4 }, { retry: false });
  if (!due.data?.items.length) return null;
  return (
    <div className="soft-card border-[#55a98b]/20 bg-[#f1faf5] p-4 sm:p-5">
      <div className="text-[13px] font-semibold text-[#2e7d4f]">📒 Tekrar zamanı</div>
      <div className="mt-3 grid gap-2 md:grid-cols-2">{due.data.items.map((note) => <NoteCard key={note.id} note={note} onOpen={(id) => notebook.open({ noteId: id })} />)}</div>
    </div>
  );
}
