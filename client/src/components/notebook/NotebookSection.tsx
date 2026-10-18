import { trpc } from "@/lib/trpc";
import { CloudOff, LayoutList, Loader2, Plus, Search, Star, Waypoints } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { listUnsyncedDrafts, removeDraft, saveDraft, type StoredDraft } from "./drafts";
import MoveToSubject from "./MoveToSubject";
import { NewNoteDialog } from "./NewNoteDialog";
import { NoteCard, NoteTimeline } from "./NoteList";
import { useNotebook } from "./NotebookProvider";
import QuestionsPanel, { QuestionReviewCard } from "./QuestionsPanel";
import SubjectNotebook from "./SubjectNotebook";
import { orderedSubjects, parseTabKey, subjectIcon, tabKey, type NotebookTab } from "./subjects";
import { useCurriculumTopics, useMyBooks } from "./useNotebookData";

type Range = "today" | "week" | "month" | "all";
const TAB_KEY = "pusula:notebook-tab";
const SUBJECT_TAB_KEY = "pusula:notebook-subject-tab";

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
 * 📒 Defterim — her ders bir sekme (ders defteri). "📚 Tümü" bütün defteri
 * (Sorularım / Notlarım) gösterir; ders sekmesi o dersin soruları ve notları;
 * "Genel" henüz bir derse konmamış olanlar. Seçili sekme cihazda hatırlanır.
 */
export default function NotebookSection() {
  const [tab, setTab] = useState<NotebookTab>(() => { try { return parseTabKey(localStorage.getItem(SUBJECT_TAB_KEY)); } catch { return { kind: "all" }; } });
  const selectTab = (value: NotebookTab) => { setTab(value); try { localStorage.setItem(SUBJECT_TAB_KEY, tabKey(value)); } catch {} };
  const summary = trpc.questions.subjectSummary.useQuery(undefined, { retry: false });
  const counts = new Map((summary.data ?? []).map((row) => [row.subject, row]));
  const general = counts.get(null);
  const subjectsWithContent = (summary.data ?? []).map((row) => row.subject).filter((subject): subject is string => Boolean(subject));
  const subjectTabs = orderedSubjects(subjectsWithContent);
  const activeKey = tabKey(tab);
  const tabButton = (value: NotebookTab, label: React.ReactNode, badge?: { total: number; due: number }) => {
    const active = tabKey(value) === activeKey;
    return (
      <button key={tabKey(value)} role="tab" aria-selected={active} onClick={() => selectTab(value)} className={`flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-[13px] font-semibold transition ${active ? "bg-brand text-white shadow-sm" : "bg-white text-ink-2 hover:bg-paper"}`}>
        {label}
        {badge && badge.total > 0 && <span className={`rounded-full px-1.5 text-[11px] ${active ? "bg-white/20" : "bg-paper text-ink-3"}`}>{badge.total}</span>}
        {badge && badge.due > 0 && <span className="h-2 w-2 rounded-full bg-success" aria-label={`${badge.due} soru tekrar bekliyor`} />}
      </button>
    );
  };

  return (
    <div className="space-y-5 animate-page-in">
      <div>
        <div className="eyebrow mb-2">Akıllı Defter</div>
        <h1 className="page-heading">📒 Benim Defterim</h1>
        <p className="page-subtitle">Her ders için bir defterin var: çözemediğin soruları ve kendi notlarını ilgili dersin defterine ekle, zamanı gelince tekrar et.</p>
      </div>

      {/* Telefonda yatay kaydırılır (çubuk gizli), geniş ekranda satır kırar. */}
      <div className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Ders defterleri">
        <div className="flex w-max gap-1.5 sm:w-auto sm:flex-wrap">
          {tabButton({ kind: "all" }, "📚 Tümü")}
          {subjectTabs.map((subject) => { const row = counts.get(subject); return tabButton({ kind: "subject", subject }, <><span aria-hidden>{subjectIcon(subject)}</span> {subject}</>, row && { total: row.notes + row.questions, due: row.due }); })}
          {general && general.notes + general.questions > 0 && tabButton({ kind: "general" }, "📒 Genel", { total: general.notes + general.questions, due: general.due })}
        </div>
      </div>

      {tab.kind === "all" ? <AllNotebook /> : <SubjectNotebook key={activeKey} subject={tab.kind === "subject" ? tab.subject : null} counts={tab.kind === "subject" ? counts.get(tab.subject) : general} />}
    </div>
  );
}

/** "📚 Tümü": bütün defter — Sorularım (soru kartları) ve Notlarım (filtreli not listesi). */
function AllNotebook() {
  const notebook = useNotebook();
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<"questions" | "notes">(() => { try { return localStorage.getItem(TAB_KEY) === "notes" ? "notes" : "questions"; } catch { return "questions"; } });
  const selectTab = (value: "questions" | "notes") => { setTab(value); try { localStorage.setItem(TAB_KEY, value); } catch {} };
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
  // Soru kartları "Sorularım"da yaşar; "Notlarım" yalnızca serbest notları listeler.
  const filters = { ...bounds, subject: subject || null, topicId, bookId: bookId || null, tag: tag || null, kind: kind || null, q: q || null, favorite: favorite || undefined, questions: "exclude" as const };
  const notesTab = tab === "notes";
  const list = trpc.notes.list.useInfiniteQuery(filters, { getNextPageParam: (page) => page.nextCursor ?? undefined, retry: false, enabled: notesTab });
  const pinned = trpc.notes.list.useQuery({ pinned: true, limit: 6, questions: "exclude" }, { retry: false, enabled: notesTab });
  const reviewDue = trpc.notes.list.useQuery({ reviewDue: true, limit: 6, questions: "exclude" }, { retry: false, enabled: notesTab });
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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 rounded-2xl bg-paper p-1 sm:flex-none" role="tablist" aria-label="Defter bölümü">
          {([["questions", "❓ Sorularım"], ["notes", "📝 Notlarım"]] as const).map(([key, label]) => (
            <button key={key} role="tab" aria-selected={tab === key} onClick={() => selectTab(key)} className={`h-10 flex-1 rounded-xl px-5 text-[14px] font-semibold sm:flex-none ${tab === key ? "bg-white text-ink shadow-sm" : "text-ink-3"}`}>{label}</button>
          ))}
        </div>
        {tab === "notes" && <button onClick={() => setShowNew(true)} className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-brand hover:bg-brand-strong px-5 text-[14px] font-semibold text-white shadow-lg"><Plus size={17} /> Yeni Not</button>}
      </div>

      {tab === "questions" ? <QuestionsPanel /> : (<>

      {unsynced.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-warn-fill/40 bg-warn-soft px-4 py-3 text-[13px] text-warn">
          <span className="flex items-center gap-2"><CloudOff size={15} /> {unsynced.length} not bu cihazda saklandı ama henüz hesabına kaydedilmedi.</span>
          <span className="flex gap-2">
            <button onClick={() => void syncAll()} disabled={syncing} className="rounded-lg bg-brand hover:bg-brand-strong px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50">{syncing ? "Eşitleniyor…" : "Şimdi eşitle"}</button>
            <button onClick={() => notebook.open({ draftClientId: unsynced[0].payload.clientId })} className="px-2 text-[12px] font-semibold">Aç</button>
          </span>
        </div>
      )}

      {Boolean(reviewDue.data?.items.length) && (
        <div className="rounded-2xl border border-success/25 bg-success-soft p-4">
          <div className="text-[13px] font-bold text-success">🔁 Tekrar zamanı</div>
          <div className="mt-2 grid gap-2 md:grid-cols-2">{reviewDue.data!.items.map((note) => <NoteCard key={note.id} note={note} onOpen={(id) => notebook.open({ noteId: id })} />)}</div>
        </div>
      )}

      {Boolean(pinned.data?.items.length) && !hasFilters && (
        <div>
          <div className="mb-2 text-[13px] font-bold text-ink">📌 Sabitlenen notlar</div>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{pinned.data!.items.map((note) => <NoteCard key={note.id} note={note} onOpen={(id) => notebook.open({ noteId: id })} />)}</div>
        </div>
      )}

      <div className="soft-card space-y-3 p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl bg-paper p-1" role="tablist" aria-label="Zaman aralığı">
            {([["today", "Bugün"], ["week", "Bu Hafta"], ["month", "Bu Ay"], ["all", "Tümü"]] as const).map(([key, label]) => (
              <button key={key} role="tab" aria-selected={range === key} onClick={() => setRange(key)} className={`h-9 rounded-lg px-3 text-[13px] font-semibold ${range === key ? "bg-white text-ink shadow-sm" : "text-ink-3"}`}>{label}</button>
            ))}
          </div>
          <div className="relative min-w-[200px] flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" aria-hidden />
            <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Notlarında ara (başlık, metin, etiket, konu, kitap)…" className="form-input h-10" style={{ paddingLeft: 36 }} aria-label="Notlarda ara" />
          </div>
          <div className="flex rounded-xl bg-paper p-1">
            <button onClick={() => setView("list")} aria-pressed={view === "list"} aria-label="Liste görünümü" className={`flex h-9 w-9 items-center justify-center rounded-lg ${view === "list" ? "bg-white shadow-sm" : ""}`}><LayoutList size={15} /></button>
            <button onClick={() => setView("timeline")} aria-pressed={view === "timeline"} aria-label="Zaman çizelgesi" className={`flex h-9 w-9 items-center justify-center rounded-lg ${view === "timeline" ? "bg-white shadow-sm" : ""}`}><Waypoints size={15} /></button>
          </div>
        </div>
        {/* .form-input genişliği %100 sabitler: filtreler ızgarada eşit hücrelere yerleşir. */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <select aria-label="Ders" value={subject} onChange={(event) => { setSubject(event.target.value); setTopicId(null); }} className="form-input h-9 text-[12px]"><option value="">Tüm dersler</option>{subjects.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <select aria-label="Konu" value={topicId ?? ""} onChange={(event) => setTopicId(event.target.value ? Number(event.target.value) : null)} className="form-input h-9 text-[12px]"><option value="">Tüm konular</option>{topics.filter((item) => !subject || item.subject === subject).map((item) => <option key={item.id} value={item.id}>{subject ? "" : `${item.subject} · `}{item.topic}</option>)}</select>
          <select aria-label="Kitap" value={bookId} onChange={(event) => setBookId(event.target.value)} className="form-input h-9 text-[12px]"><option value="">Tüm kitaplar</option>{books.map((book) => <option key={book.id} value={book.id}>{book.title}</option>)}</select>
          <select aria-label="Etiket" value={tag} onChange={(event) => setTag(event.target.value)} className="form-input h-9 text-[12px]"><option value="">Tüm etiketler</option>{tags.data?.map((item) => <option key={item.tag} value={item.tag}>#{item.tag} ({item.count})</option>)}</select>
          <select aria-label="Not türü" value={kind} onChange={(event) => setKind(event.target.value as typeof kind)} className="form-input h-9 text-[12px]"><option value="">Tüm türler</option><option value="text">✍️ Yazı</option><option value="voice">🎙️ Ses</option><option value="image">📷 Fotoğraf</option><option value="formula">∑ Formül</option><option value="drawing">🖊 Çizim</option></select>
          <button onClick={() => setFavorite((value) => !value)} aria-pressed={favorite} className={`flex h-9 items-center gap-1 rounded-xl border px-3 text-[12px] font-semibold ${favorite ? "border-warn-fill bg-warn-soft text-warn" : "border-ink/10 text-ink-2"}`}><Star size={13} className={favorite ? "fill-warn-fill text-warn-fill" : ""} /> Favoriler</button>
                  </div>
        {hasFilters && <button onClick={() => { setSubject(""); setTopicId(null); setBookId(""); setTag(""); setKind(""); setFavorite(false); setSearchInput(""); }} className="h-8 px-1 text-[12px] font-semibold text-ink-3">Filtreleri temizle</button>}
      </div>

      {list.isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-brand" size={22} /></div>
      ) : list.isError ? (
        <div className="rounded-2xl bg-danger-soft p-4 text-[13px] text-danger">Notlar yüklenemedi. <button onClick={() => void list.refetch()} className="font-semibold underline">Tekrar dene</button></div>
      ) : notes.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink/15 p-10 text-center">
          <div className="text-[34px]" aria-hidden>📒</div>
          <p className="mt-2 text-[14px] font-semibold text-ink">{hasFilters || range !== "all" ? "Bu filtrelerle not yok." : "Henüz not almadın."}</p>
          <p className="mt-1 text-[13px] text-ink-3">Ders çalışırken aklına geleni hemen yaz ya da mikrofona söyle.</p>
          <button onClick={() => setShowNew(true)} className="mt-4 h-10 rounded-xl bg-brand hover:bg-brand-strong px-4 text-[13px] font-semibold text-white">+ Yeni Not</button>
        </div>
      ) : view === "timeline" ? (
        <NoteTimeline notes={notes} onOpen={(id) => notebook.open({ noteId: id })} />
      ) : (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{notes.map((note) => <NoteCard key={note.id} note={note} onOpen={(id) => notebook.open({ noteId: id })} footer={!note.subject && <MoveToSubject noteId={note.id} />} />)}</div>
      )}
      {list.hasNextPage && <div className="text-center"><button onClick={() => void list.fetchNextPage()} disabled={list.isFetchingNextPage} className="h-10 rounded-xl border border-ink/10 px-5 text-[13px] font-semibold text-ink-2">{list.isFetchingNextPage ? "Yükleniyor…" : "Daha fazla göster"}</button></div>}
      </>)}

      {showNew && <NewNoteDialog onClose={() => setShowNew(false)} />}
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
        <div className="text-[14px] font-semibold text-ink">📒 Bu günün notları {items.length ? `(${items.length})` : ""}</div>
        <button onClick={() => notebook.open({ prefill: {} })} className="text-[12px] font-semibold text-brand">+ Not al</button>
      </div>
      {items.length === 0 ? <p className="mt-2 text-[13px] text-ink-3">Bu gün için not yok.</p> : <div className="mt-3 grid gap-2 md:grid-cols-2">{items.map((note) => <NoteCard key={note.id} note={note} onOpen={(id) => notebook.open({ noteId: id })} />)}</div>}
    </div>
  );
}

/** Genel Bakış: tekrar zamanı gelen sorular ve notlar (bildirim sistemi olmadığı için panoda gösterilir). */
export function ReviewDueNotes() {
  return <><QuestionReviewCard compact /><ReviewDueNoteList /></>;
}

function ReviewDueNoteList() {
  const notebook = useNotebook();
  const due = trpc.notes.list.useQuery({ reviewDue: true, limit: 4, questions: "exclude" }, { retry: false });
  if (!due.data?.items.length) return null;
  return (
    <div className="soft-card border-success/20 bg-success-soft p-4 sm:p-5">
      <div className="text-[14px] font-semibold text-success">📒 Tekrar zamanı</div>
      <div className="mt-3 grid gap-2 md:grid-cols-2">{due.data.items.map((note) => <NoteCard key={note.id} note={note} onOpen={(id) => notebook.open({ noteId: id })} />)}</div>
    </div>
  );
}
