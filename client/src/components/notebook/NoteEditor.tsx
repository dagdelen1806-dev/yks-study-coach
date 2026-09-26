import { trpc } from "@/lib/trpc";
import { EMPTY_NOTE_DOC, NOTE_AI_ACTIONS, NOTE_TEMPLATES, SUGGESTED_TAGS, normalizeTag, suggestsStudyTask, templateDoc, type NoteAiAction, type NoteDoc } from "@shared/noteContent";
import { NodeSelection } from "@tiptap/pm/state";
import { EditorContent, useEditor, type Editor, type JSONContent } from "@tiptap/react";
import { ArrowLeft, CalendarClock, ChevronDown, Loader2, MoreHorizontal, Pin, Sparkles, Star, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import EditorToolbar, { type InsertAction } from "./EditorToolbar";
import NoteImageDialog from "./NoteImageDialog";
import VoiceRecorder from "./VoiceRecorder";
import { isEmptyDraft, newClientId, readDraft, removeDraft, saveDraft, type NoteDraftPayload, type SyncStatus } from "./drafts";
import { noteExtensions } from "./extensions";
import { newEditorToken } from "./nodes";
import { useCurriculumTopics, useMyBooks } from "./useNotebookData";

export type NotePrefill = Partial<Pick<NoteDraftPayload, "subject" | "topicId" | "bookId" | "bookContentId" | "studySessionId" | "mockExamId" | "title" | "tags">> & { templateKey?: string | null; startWith?: InsertAction };

const AUTOSAVE_DELAY_MS = 800;
const RETRY_DELAY_MS = 15_000;
const AI_CONSENT_KEY = "pusula:note-ai-consent";

/**
 * Blok ekle (formül, çizim, fotoğraf, ses). Yeni eklenen blok "seçili" kalır;
 * bir sonraki ekleme ya da yazı onu DEĞİŞTİRİRDİ (içerik kaybı). Bu yüzden seçili
 * bir blok varsa içerik onun ARKASINA eklenir ve imleç alttaki yeni satıra geçer.
 */
function insertBlocks(editor: Editor, nodes: JSONContent[]) {
  const { selection } = editor.state;
  const content = [...nodes, { type: "paragraph" }];
  // Öğrenci editöre hiç tıklamadıysa (imleç notun başında) blok notun SONUNA eklenir.
  if (!editor.isFocused) editor.chain().focus("end").insertContent(content).run();
  else if (selection instanceof NodeSelection) editor.chain().focus().insertContentAt(selection.to, content).run();
  else editor.chain().focus().insertContent(content).run();
}

const toLocalInput = (iso: string) => { const date = new Date(iso); const offset = date.getTimezoneOffset() * 60_000; return new Date(date.getTime() - offset).toISOString().slice(0, 16); };
const fromLocalInput = (value: string) => new Date(value).toISOString();
const daysFromToday = (days: number) => { const date = new Date(); date.setHours(9, 0, 0, 0); date.setDate(date.getDate() + days); return date.toISOString(); };

/**
 * Not düzenleyici (yeni not, mevcut not ya da taslaktan devam). Açılışta
 * içeriği hazırlar, sonra NoteEditorBody'yi çizer.
 */
export default function NoteEditor({ noteId, draftClientId, prefill, onClose }: { noteId?: number | null; draftClientId?: string | null; prefill?: NotePrefill; onClose: () => void }) {
  const existing = trpc.notes.get.useQuery({ id: noteId ?? 0 }, { enabled: Boolean(noteId), retry: false });
  const initial = useMemo<{ payload: NoteDraftPayload; serverId: number | null; status: SyncStatus } | null>(() => {
    if (noteId) {
      if (!existing.data) return null;
      const note = existing.data;
      const draft = readDraft(note.clientId);
      // Cihazda eşitlenmemiş, daha yeni bir taslak varsa o kazanır (çevrimdışı yazılanlar kaybolmasın).
      if (draft && draft.status !== "synced" && draft.updatedAt > new Date(note.updatedAt).getTime()) return { payload: draft.payload, serverId: note.id, status: draft.status };
      return {
        serverId: note.id,
        status: "synced",
        payload: { clientId: note.clientId, title: note.title, content: note.content, noteDate: new Date(note.noteDate).toISOString(), tags: note.tags, isFavorite: note.isFavorite, isPinned: note.isPinned, reviewAt: note.reviewAt ? new Date(note.reviewAt).toISOString() : null, templateKey: note.templateKey, subject: note.subject, topicId: note.topicId, bookId: note.bookId, bookContentId: note.bookContentId, studySessionId: note.studySessionId, mockExamId: note.mockExamId },
      };
    }
    if (draftClientId) {
      const draft = readDraft(draftClientId);
      if (draft) return { payload: draft.payload, serverId: draft.serverId ?? null, status: draft.status };
    }
    const template = NOTE_TEMPLATES.find((item) => item.key === prefill?.templateKey);
    return {
      serverId: null,
      status: "draft",
      payload: {
        clientId: newClientId(),
        title: prefill?.title ?? (template ? template.title : ""),
        content: template ? templateDoc(template) : EMPTY_NOTE_DOC,
        noteDate: new Date().toISOString(),
        tags: prefill?.tags ?? template?.tags ?? [],
        templateKey: template?.key ?? null,
        subject: prefill?.subject ?? null,
        topicId: prefill?.topicId ?? null,
        bookId: prefill?.bookId ?? null,
        bookContentId: prefill?.bookContentId ?? null,
        studySessionId: prefill?.studySessionId ?? null,
        mockExamId: prefill?.mockExamId ?? null,
        reviewAt: null,
      },
    };
    // Açılışta bir kez hesaplanır; sonraki değişiklikler gövdede tutulur.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId, draftClientId, existing.data]);

  if (noteId && existing.isError) {
    return (
      <div className="modal-backdrop" style={{ zIndex: 300 }}><div className="modal-card max-w-[380px] text-center"><p className="text-[13px] text-[#d95d4d]">{existing.error.message}</p><button onClick={onClose} className="mt-4 h-10 rounded-xl border border-[#1f2333]/10 px-4 text-[12px] font-semibold">Kapat</button></div></div>
    );
  }
  if (!initial) {
    return <div className="modal-backdrop" style={{ zIndex: 300 }}><Loader2 className="animate-spin text-white" size={28} /></div>;
  }
  return <NoteEditorBody initial={initial} startWith={noteId ? undefined : prefill?.startWith} onClose={onClose} />;
}

function NoteEditorBody({ initial, startWith, onClose }: { initial: { payload: NoteDraftPayload; serverId: number | null; status: SyncStatus }; startWith?: InsertAction; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [meta, setMeta] = useState<Omit<NoteDraftPayload, "content">>(() => { const { content: _content, ...rest } = initial.payload; return rest; });
  const [status, setStatus] = useState<SyncStatus>(initial.status);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(initial.status === "synced" ? Date.now() : null);
  const [insert, setInsert] = useState<InsertAction | null>(startWith === "voice" || startWith === "photo" ? startWith : null);
  const [showMeta, setShowMeta] = useState(false);
  const [menu, setMenu] = useState(false);
  const [aiPending, setAiPending] = useState<NoteAiAction | null>(null);
  const [consentFor, setConsentFor] = useState<NoteAiAction | null>(null);
  const [taskDialog, setTaskDialog] = useState(false);
  const [plainText, setPlainText] = useState("");
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const docRef = useRef<NoteDoc>(initial.payload.content);
  const metaRef = useRef(meta);
  metaRef.current = meta;
  const serverId = useRef<number | null>(initial.serverId);
  const revision = useRef(0);
  const timer = useRef<number | null>(null);
  const saving = useRef<Promise<unknown> | null>(null);

  const save = trpc.notes.save.useMutation();
  const aiMutation = trpc.notes.ai.useMutation();
  const deleteMutation = trpc.notes.delete.useMutation();
  const { topics, subjects } = useCurriculumTopics();
  const books = useMyBooks();
  const bookContents = trpc.bookContent.contents.useQuery({ bookId: meta.bookId ?? "" }, { enabled: Boolean(meta.bookId), retry: false });

  const payload = useCallback((): NoteDraftPayload => ({ ...metaRef.current, content: docRef.current }), []);

  /** Sunucuya gönder. Bu sırada yeni değişiklik olursa taslak silinmez; bir sonraki kayıt onu gönderir. */
  const sync = useCallback(async () => {
    if (timer.current) { window.clearTimeout(timer.current); timer.current = null; }
    const current = payload();
    if (isEmptyDraft(current)) { removeDraft(current.clientId); return; }
    const startedAt = revision.current;
    saveDraft({ payload: current, status: "syncing", updatedAt: Date.now(), serverId: serverId.current });
    setStatus("syncing");
    const attempt = save.mutateAsync(current);
    saving.current = attempt;
    try {
      const result = await attempt;
      serverId.current = result.id;
      setLastSavedAt(Date.now());
      if (revision.current === startedAt) { removeDraft(current.clientId); setStatus("synced"); }
    } catch (error) {
      saveDraft({ payload: current, status: "failed", updatedAt: Date.now(), serverId: serverId.current });
      setStatus("failed");
      const message = error instanceof Error ? error.message : "";
      // Ağ hatası: sessizce yeniden dene. Doğrulama hatası: öğrenciye söyle.
      if (!/fetch|network|timeout/i.test(message)) toast.error(message || "Not kaydedilemedi.");
      timer.current = window.setTimeout(() => void sync(), RETRY_DELAY_MS);
    } finally {
      saving.current = null;
    }
  }, [payload, save]);

  /** Her değişiklik: önce cihaza yaz (hemen), sonra gecikmeli olarak sunucuya. */
  const changed = useCallback(() => {
    revision.current += 1;
    saveDraft({ payload: payload(), status: "draft", updatedAt: Date.now(), serverId: serverId.current });
    setStatus("draft");
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void sync(), AUTOSAVE_DELAY_MS);
  }, [payload, sync]);

  const updateMeta = (patch: Partial<typeof meta>) => { setMeta((current) => ({ ...current, ...patch })); metaRef.current = { ...metaRef.current, ...patch }; changed(); };

  const editor = useEditor({
    extensions: noteExtensions("Yazmaya başla… (🎙️ ile konuşarak da not alabilirsin)"),
    content: initial.payload.content,
    immediatelyRender: true,
    editorProps: { attributes: { class: "note-content prose-note min-h-[40vh] px-4 py-4 outline-none sm:px-6", "aria-label": "Not içeriği" } },
    onUpdate: ({ editor: current }) => { docRef.current = current.getJSON() as NoteDoc; setPlainText(current.getText()); changed(); },
    onCreate: ({ editor: current }) => setPlainText(current.getText()),
  });

  // Bağlantı gelince bekleyen kaydı gönder.
  useEffect(() => {
    const online = () => { if (status === "failed" || status === "draft") void sync(); };
    window.addEventListener("online", online);
    return () => window.removeEventListener("online", online);
  }, [status, sync]);
  // Açılışta cihazda eşitlenmemiş taslak varsa hemen gönder; formül/çizim ile başlandıysa bloğu ekle.
  useEffect(() => {
    if (initial.status === "failed" || initial.status === "syncing" || (initial.status === "draft" && initial.serverId)) void sync();
    if (startWith === "formula" && editor) insertBlocks(editor, [{ type: "formula", attrs: { latex: "", openToken: newEditorToken() } }]);
    if (startWith === "drawing" && editor) insertBlocks(editor, [{ type: "drawing", attrs: { strokes: [], openToken: newEditorToken() } }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = async () => {
    if (timer.current || status === "draft") await sync().catch(() => undefined);
    else if (saving.current) await saving.current.catch(() => undefined);
    void utils.notes.list.invalidate();
    void utils.notes.calendar.invalidate();
    onClose();
  };

  const ensureSaved = async (): Promise<number | null> => {
    if (timer.current || status !== "synced" || !serverId.current) await sync();
    return serverId.current;
  };

  const runAi = async (action: NoteAiAction) => {
    setMenu(false);
    let consent = false;
    try { consent = localStorage.getItem(AI_CONSENT_KEY) === "1"; } catch {}
    if (!consent) { setConsentFor(action); return; }
    const id = await ensureSaved();
    if (!id) { toast.error("AI için önce notuna biraz yazı ekle."); return; }
    setAiPending(action);
    try {
      const result = await aiMutation.mutateAsync({ id, action });
      editor?.chain().focus("end").insertContent(result.nodes).run();
      toast.success(`✨ ${NOTE_AI_ACTIONS[action].label} notun sonuna eklendi (asıl metnin değişmedi).`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "AI şu an yanıt veremedi.");
    } finally {
      setAiPending(null);
    }
  };

  const remove = async () => {
    setMenu(false);
    if (!window.confirm("Bu not ve içindeki fotoğraf/ses kayıtları silinsin mi? Bu işlem geri alınamaz.")) return;
    if (timer.current) { window.clearTimeout(timer.current); timer.current = null; }
    try {
      if (serverId.current) await deleteMutation.mutateAsync({ id: serverId.current });
      removeDraft(meta.clientId);
      void utils.notes.list.invalidate();
      void utils.notes.calendar.invalidate();
      toast.success("Not silindi.");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Not silinemedi.");
    }
  };

  const addTag = (value: string) => {
    const tag = normalizeTag(value);
    if (!tag || meta.tags.includes(tag)) return;
    updateMeta({ tags: [...meta.tags, tag].slice(0, 12) });
    setTagInput("");
  };

  const subjectTopics = topics.filter((topic) => !meta.subject || topic.subject === meta.subject);
  const selectedTopic = topics.find((topic) => topic.id === meta.topicId);
  const pristine = !serverId.current && revision.current === 0;
  const statusLabel = pristine ? "Yazdıkların otomatik kaydedilir." : status === "syncing" ? "Kaydediliyor…" : status === "failed" ? "Çevrimdışı — cihazında saklandı, bağlantı gelince kaydedilecek" : status === "draft" ? "Değişiklikler kaydedilecek…" : lastSavedAt ? `Kaydedildi · ${new Date(lastSavedAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}` : "Kaydedildi";
  const showSuggestion = !suggestionDismissed && suggestsStudyTask(plainText);

  return (
    <div className="fixed inset-0 z-[300] flex items-stretch justify-center bg-[#1f2333]/40 sm:p-4" role="dialog" aria-modal="true" aria-label="Not düzenleyici">
      <div className="flex w-full max-w-3xl flex-col overflow-hidden bg-white sm:rounded-3xl sm:shadow-2xl">
        {/* Üst bölüm: ← başlık ⭐ 📌 ••• */}
        <div className="flex items-center gap-1 border-b border-[#1f2333]/[0.07] px-2 py-2 sm:px-3">
          <button onClick={() => void close()} className="flex h-10 w-10 items-center justify-center rounded-xl text-[#545661] hover:bg-[#f7f5ef]" aria-label="Kaydet ve kapat"><ArrowLeft size={18} /></button>
          <input value={meta.title} onChange={(event) => updateMeta({ title: event.target.value })} placeholder="Başlık (isteğe bağlı)" maxLength={200} className="h-10 min-w-0 flex-1 bg-transparent px-1 text-[16px] font-semibold text-[#1f2333] outline-none placeholder:text-[#b0b1b8]" aria-label="Not başlığı" />
          <button onClick={() => updateMeta({ isFavorite: !meta.isFavorite })} aria-pressed={Boolean(meta.isFavorite)} aria-label={meta.isFavorite ? "Favorilerden çıkar" : "Favorilere ekle"} className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-[#f7f5ef]"><Star size={18} className={meta.isFavorite ? "fill-[#f5b301] text-[#f5b301]" : "text-[#8b8c95]"} /></button>
          <button onClick={() => updateMeta({ isPinned: !meta.isPinned })} aria-pressed={Boolean(meta.isPinned)} aria-label={meta.isPinned ? "Sabitlemeyi kaldır" : "Sabitle"} className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-[#f7f5ef]"><Pin size={18} className={meta.isPinned ? "fill-[#3b5ccc] text-[#3b5ccc]" : "text-[#8b8c95]"} /></button>
          <div className="relative">
            <button onClick={() => setMenu((value) => !value)} aria-expanded={menu} aria-label="Diğer işlemler" className="flex h-10 w-10 items-center justify-center rounded-xl text-[#545661] hover:bg-[#f7f5ef]"><MoreHorizontal size={18} /></button>
            {menu && (
              <div className="absolute right-0 top-11 z-10 w-64 overflow-hidden rounded-2xl border border-[#1f2333]/10 bg-white py-1 text-[13px] shadow-xl" role="menu">
                <div className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[.08em] text-[#9a9ba3]">✨ AI (not metni AI servisine gönderilir)</div>
                {(Object.keys(NOTE_AI_ACTIONS) as NoteAiAction[]).map((action) => (
                  <button key={action} role="menuitem" disabled={Boolean(aiPending)} onClick={() => void runAi(action)} className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-[#f7f5ef] disabled:opacity-50"><Sparkles size={14} className="text-[#7a55c9]" />{NOTE_AI_ACTIONS[action].menu}</button>
                ))}
                <div className="my-1 h-px bg-[#1f2333]/[0.07]" />
                <button role="menuitem" onClick={() => { setMenu(false); setTaskDialog(true); }} className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-[#f7f5ef]"><CalendarClock size={14} className="text-[#3b5ccc]" /> Çalışma Planına Ekle</button>
                <button role="menuitem" onClick={() => void remove()} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[#d95d4d] hover:bg-[#fff0ed]"><Trash2 size={14} /> Notu sil</button>
              </div>
            )}
          </div>
        </div>

        {/* Ders / konu / kitap / etiket / tarih bilgileri */}
        <div className="border-b border-[#1f2333]/[0.07] px-3 py-2 sm:px-4">
          <button onClick={() => setShowMeta((value) => !value)} aria-expanded={showMeta} className="flex w-full flex-wrap items-center gap-1.5 text-left text-[11px]">
            {meta.subject && <span className="rounded-full bg-[#edf1ff] px-2 py-0.5 font-semibold text-[#3b5ccc]">{meta.subject}{selectedTopic ? ` · ${selectedTopic.topic}` : ""}</span>}
            {meta.bookId && <span className="rounded-full bg-[#fff4ea] px-2 py-0.5 font-semibold text-[#c25e00]">📚 {books.find((book) => book.id === meta.bookId)?.title ?? "Kitap"}</span>}
            {meta.tags.map((tag) => <span key={tag} className="rounded-full bg-[#f7f5ef] px-2 py-0.5 text-[#545661]">#{tag}</span>)}
            {meta.reviewAt && <span className="rounded-full bg-[#eaf6f0] px-2 py-0.5 text-[#2e7d4f]">🔁 {new Date(meta.reviewAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}</span>}
            <span className="text-[#8b8c95]">📅 {new Date(meta.noteDate).toLocaleString("tr-TR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}</span>
            <span className="ml-auto flex items-center gap-1 font-semibold text-[#3b5ccc]">{showMeta ? "Gizle" : "Ders, konu, kitap, etiket"} <ChevronDown size={13} className={showMeta ? "rotate-180" : ""} /></span>
          </button>
          {showMeta && (
            <div className="mt-2 grid gap-2 pb-1 sm:grid-cols-2">
              <label className="block text-[11px]"><span className="form-label">Ders</span>
                <select value={meta.subject ?? ""} onChange={(event) => updateMeta({ subject: event.target.value || null, topicId: null })} className="form-input h-10"><option value="">Genel (ders yok)</option>{subjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}</select>
              </label>
              <label className="block text-[11px]"><span className="form-label">Konu</span>
                <select value={meta.topicId ?? ""} onChange={(event) => { const topicId = event.target.value ? Number(event.target.value) : null; const topic = topics.find((item) => item.id === topicId); updateMeta({ topicId, subject: topic?.subject ?? meta.subject }); }} className="form-input h-10"><option value="">Konu seç…</option>{subjectTopics.map((topic) => <option key={topic.id} value={topic.id}>{meta.subject ? "" : `${topic.subject} · `}{topic.unit !== topic.subject ? `${topic.unit} → ` : ""}{topic.topic}</option>)}</select>
              </label>
              <label className="block text-[11px]"><span className="form-label">Kitap</span>
                <select value={meta.bookId ?? ""} onChange={(event) => updateMeta({ bookId: event.target.value || null, bookContentId: null })} className="form-input h-10"><option value="">Kitap yok</option>{books.map((book) => <option key={book.id} value={book.id}>{book.title}</option>)}</select>
              </label>
              <label className="block text-[11px]"><span className="form-label">Ünite / test</span>
                <select value={meta.bookContentId ?? ""} disabled={!meta.bookId || !bookContents.data?.length} onChange={(event) => { const content = bookContents.data?.find((row) => row.id === Number(event.target.value)); updateMeta({ bookContentId: content?.id ?? null, ...(content?.topicId && !meta.topicId ? { topicId: content.topicId, subject: content.topic?.subject ?? meta.subject } : {}) }); }} className="form-input h-10 disabled:opacity-50">
                  <option value="">{meta.bookId && !bookContents.data?.length ? "İçindekiler taranmamış" : "Bölüm seç…"}</option>
                  {bookContents.data?.map((row) => <option key={row.id} value={row.id}>{row.unitNumber !== null ? `${row.unitNumber}. Ünite · ` : ""}{row.label}{row.pageStart ? ` · sf. ${row.pageStart}` : ""}</option>)}
                </select>
              </label>
              <div className="sm:col-span-2">
                <span className="form-label">Etiketler</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {meta.tags.map((tag) => <button key={tag} onClick={() => updateMeta({ tags: meta.tags.filter((item) => item !== tag) })} className="rounded-full bg-[#f7f5ef] px-2 py-1 text-[11px] text-[#545661]" aria-label={`${tag} etiketini kaldır`}>#{tag} ×</button>)}
                  <input value={tagInput} onChange={(event) => setTagInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === ",") { event.preventDefault(); addTag(tagInput); } }} placeholder="#etiket" className="h-8 w-28 rounded-lg border border-[#1f2333]/10 px-2 text-[11px]" aria-label="Etiket ekle" />
                  {SUGGESTED_TAGS.filter((tag) => !meta.tags.includes(tag)).map((tag) => <button key={tag} onClick={() => addTag(tag)} className="rounded-full border border-dashed border-[#1f2333]/15 px-2 py-1 text-[11px] text-[#8b8c95]">+#{tag}</button>)}
                </div>
              </div>
              <label className="block text-[11px]"><span className="form-label">Tarih</span>
                <input type="datetime-local" value={toLocalInput(meta.noteDate)} onChange={(event) => event.target.value && updateMeta({ noteDate: fromLocalInput(event.target.value) })} className="form-input h-10" />
              </label>
              <div className="text-[11px]"><span className="form-label">Tekrar tarihi</span>
                <div className="flex flex-wrap gap-1.5">
                  {[[0, "Bugün"], [3, "3 gün"], [7, "7 gün"], [14, "14 gün"]].map(([days, label]) => <button key={label} onClick={() => updateMeta({ reviewAt: daysFromToday(Number(days)) })} className="h-8 rounded-lg border border-[#1f2333]/10 px-2.5 text-[11px] text-[#343643] hover:bg-[#f4f6ff]">{label}</button>)}
                  {meta.reviewAt && <button onClick={() => updateMeta({ reviewAt: null })} className="h-8 rounded-lg px-2 text-[11px] text-[#8b8c95]">Kaldır</button>}
                </div>
              </div>
            </div>
          )}
        </div>

        {editor && <EditorToolbar editor={editor} onInsert={(action) => {
          if (action === "formula") insertBlocks(editor, [{ type: "formula", attrs: { latex: "", openToken: newEditorToken() } }]);
          else if (action === "drawing") insertBlocks(editor, [{ type: "drawing", attrs: { strokes: [], openToken: newEditorToken() } }]);
          else setInsert(action);
        }} />}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {showSuggestion && (
            <div className="mx-4 mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#fff8df] px-3 py-2 text-[12px] text-[#8a6116]">
              <span>Bu konuyu tekrar etmen gerektiğini yazmışsın. Çalışma planına ekleyelim mi?</span>
              <span className="flex gap-2"><button onClick={() => setTaskDialog(true)} className="rounded-lg bg-[#1f2333] px-2.5 py-1 text-[11px] font-semibold text-white">Plana ekle</button><button onClick={() => setSuggestionDismissed(true)} className="px-1 text-[11px] font-semibold">Hayır</button></span>
            </div>
          )}
          {aiPending && <div className="mx-4 mt-3 flex items-center gap-2 rounded-xl bg-[#f3edff] px-3 py-2 text-[12px] text-[#6f42c1]"><Loader2 size={14} className="animate-spin" /> ✨ {NOTE_AI_ACTIONS[aiPending].menu}…</div>}
          <EditorContent editor={editor} />
        </div>

        <div className={`border-t border-[#1f2333]/[0.07] px-4 py-2 text-[11px] ${status === "failed" ? "text-[#a1711d]" : "text-[#8b8c95]"}`} aria-live="polite">{statusLabel}</div>
      </div>

      {insert === "voice" && <VoiceRecorder onClose={() => setInsert(null)} onDone={(result) => {
        setInsert(null);
        if (editor) insertBlocks(editor, [{ type: "voiceClip", attrs: { attachmentId: result.attachmentId, duration: result.durationSec } }, { type: "paragraph", content: [{ type: "text", text: result.text }] }]);
      }} />}
      {insert === "photo" && <NoteImageDialog onClose={() => setInsert(null)} onDone={(attachmentId) => { setInsert(null); if (editor) insertBlocks(editor, [{ type: "noteImage", attrs: { attachmentId } }]); }} />}
      {consentFor && (
        <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setConsentFor(null)}>
          <div className="modal-card max-w-[400px]">
            <h2 className="text-[16px] font-semibold text-[#1f2333]">✨ AI kullanımı</h2>
            <p className="mt-2 text-[12px] leading-5 text-[#545661]">Bu işlem için <strong>bu notun metni</strong> AI servisine gönderilecek (fotoğraflar ve ses kayıtları gönderilmez). Sonuç notunun sonuna ayrı bir blok olarak eklenir; asıl metnin değişmez.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setConsentFor(null)} className="h-10 rounded-xl border border-[#1f2333]/10 px-4 text-[12px] font-semibold text-[#777983]">Vazgeç</button>
              <button onClick={() => { try { localStorage.setItem(AI_CONSENT_KEY, "1"); } catch {} const action = consentFor; setConsentFor(null); void runAi(action); }} className="h-10 rounded-xl bg-[#6f42c1] px-4 text-[12px] font-semibold text-white">Anladım, devam et</button>
            </div>
          </div>
        </div>
      )}
      {taskDialog && <CreateTaskDialog topics={topics} initialTopicId={meta.topicId ?? null} ensureSaved={ensureSaved} onTopicChosen={(topicId) => { if (!meta.topicId) { const topic = topics.find((item) => item.id === topicId); updateMeta({ topicId, subject: topic?.subject ?? meta.subject }); } }} onClose={() => setTaskDialog(false)} />}
    </div>
  );
}

function CreateTaskDialog({ topics, initialTopicId, ensureSaved, onTopicChosen, onClose }: { topics: Array<{ id: number; subject: string; topic: string }>; initialTopicId: number | null; ensureSaved: () => Promise<number | null>; onTopicChosen: (topicId: number) => void; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [topicId, setTopicId] = useState<number | null>(initialTopicId);
  const [minutes, setMinutes] = useState(30);
  const createTask = trpc.notes.createTask.useMutation();
  const submit = async (when: "today" | "auto") => {
    if (!topicId) { toast.error("Önce bir konu seç."); return; }
    onTopicChosen(topicId);
    const id = await ensureSaved();
    if (!id) { toast.error("Not kaydedilemedi; tekrar dener misin?"); return; }
    try {
      const result = await createTask.mutateAsync({ id, topicId, minutes, when });
      toast.success(`Çalışma planına eklendi: ${new Date(`${result.date}T12:00:00Z`).toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })} · ${result.minutes} dk`);
      void utils.calendar.snapshot.invalidate();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Görev oluşturulamadı.");
    }
  };
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal-card max-w-[420px]">
        <div className="flex items-center justify-between"><h2 className="text-[16px] font-semibold text-[#1f2333]">Çalışma Planına Ekle</h2><button onClick={onClose} className="rounded-lg p-2 text-[#8b8c95]" aria-label="Kapat"><X size={16} /></button></div>
        <p className="mt-1 text-[12px] text-[#6d7390]">Plan motoru, günlük kapasitene göre uygun günü bulur; mevcut planın değişmez.</p>
        <label className="mt-4 block text-[11px]"><span className="form-label">Konu</span>
          <select value={topicId ?? ""} onChange={(event) => setTopicId(event.target.value ? Number(event.target.value) : null)} className="form-input h-10"><option value="">Konu seç…</option>{topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.subject} · {topic.topic}</option>)}</select>
        </label>
        <label className="mt-3 block text-[11px]"><span className="form-label">Süre</span>
          <select value={minutes} onChange={(event) => setMinutes(Number(event.target.value))} className="form-input h-10">{[20, 30, 45, 60].map((value) => <option key={value} value={value}>{value} dk</option>)}</select>
        </label>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={() => void submit("today")} disabled={createTask.isPending} className="h-10 rounded-xl border border-[#3b5ccc]/25 px-4 text-[12px] font-semibold text-[#3b5ccc] disabled:opacity-50">Bugün çalış</button>
          <button onClick={() => void submit("auto")} disabled={createTask.isPending} className="h-10 rounded-xl bg-[#3b5ccc] px-4 text-[12px] font-semibold text-white disabled:opacity-50">Uygun güne ekle</button>
        </div>
      </div>
    </div>
  );
}
