import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../../server/routers";
import { EmptyNote, PageHeader, primaryButton, secondaryButton } from "@/components/app/kit";
import EditorToolbar, { type InsertAction } from "@/components/notebook/EditorToolbar";
import NoteImageDialog from "@/components/notebook/NoteImageDialog";
import VoiceRecorder from "@/components/notebook/VoiceRecorder";
import { noteExtensions } from "@/components/notebook/extensions";
import { newEditorToken } from "@/components/notebook/nodes";
import { useCurriculumTopics } from "@/components/notebook/useNotebookData";
import { trpc } from "@/lib/trpc";
import { EMPTY_NOTE_DOC, normalizeTag, type NoteDoc } from "@shared/noteContent";
import { NodeSelection } from "@tiptap/pm/state";
import { EditorContent, useEditor, type Editor, type JSONContent } from "@tiptap/react";
import { BookmarkCheck, BookmarkPlus, ExternalLink, Link2, Loader2, Pencil, Pin, PinOff, Plus, Quote, Search, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Post = inferRouterOutputs<AppRouter>["wall"]["list"]["posts"][number];
type Kind = Post["kind"];
type Filter = "all" | "unread" | "pinned";

const KINDS: Array<{ value: Kind; label: string; icon: typeof Pencil }> = [
  { value: "note", label: "Yazı", icon: Pencil },
  { value: "link", label: "Bağlantı", icon: Link2 },
  { value: "quote", label: "Alıntı", icon: Quote },
];

const dayKey = (value: Date | string) => { const date = new Date(value); return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`; };
function dayLabel(value: Date | string) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (dayKey(date) === dayKey(today)) return "Bugün";
  if (dayKey(date) === dayKey(yesterday)) return "Dün";
  return date.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", ...(date.getFullYear() !== today.getFullYear() ? { year: "numeric" as const } : {}) });
}
const timeLabel = (value: Date | string) => new Date(value).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
/** Yazı da blok (fotoğraf, ses, formül, çizim) da yoksa gövde gösterilmez. */
const isEmptyDoc = (doc: NoteDoc, plainText: string) => !plainText.trim() && !/"type":"(noteImage|voiceClip|formula|drawing)"/.test(JSON.stringify(doc));

/**
 * Duvarım: öğrencinin kişisel, zaman sıralı akışı — yazılar, sonra okumak için kaydedilen bağlantı ve
 * alıntılar. İçerik defterle aynı editörde (fotoğraf, ses, formül, çizim). Yalnızca öğrencinin kendisi görür.
 */
export default function WallSection() {
  const [filter, setFilter] = useState<Filter>("all");
  const [tag, setTag] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [q, setQ] = useState("");
  const [composer, setComposer] = useState<{ post: Post | null; kind: Kind } | null>(null);
  useEffect(() => { const timer = setTimeout(() => setQ(query.trim()), 300); return () => clearTimeout(timer); }, [query]);
  const utils = trpc.useUtils();
  const summary = trpc.wall.summary.useQuery(undefined, { retry: false });
  const feed = trpc.wall.list.useInfiniteQuery({ filter, tag, q: q || null }, { getNextPageParam: (page) => page.nextCursor ?? undefined, retry: false });
  const refresh = () => { void utils.wall.list.invalidate(); void utils.wall.summary.invalidate(); };
  const posts = feed.data?.pages.flatMap((page) => page.posts) ?? [];
  const groups = useMemo(() => {
    const result: Array<{ key: string; label: string; posts: Post[] }> = [];
    for (const post of posts) {
      const key = dayKey(post.postedAt);
      const group = result.at(-1)?.key === key ? result.at(-1)! : (result.push({ key, label: dayLabel(post.postedAt), posts: [] }), result.at(-1)!);
      group.posts.push(post);
    }
    return result;
  }, [posts]);
  const counts = summary.data;
  const filters: Array<{ value: Filter; label: string; count?: number }> = [
    { value: "all", label: "Tümü", count: counts?.total },
    { value: "unread", label: "Okunacaklar", count: counts?.unread },
    { value: "pinned", label: "Sabitlenenler", count: counts?.pinned },
  ];

  return (
    <div className="space-y-5 animate-page-in">
      <PageHeader eyebrow="Kişisel" title="Duvarım" description="Yazıların, sonra okumak için kaydettiğin bağlantılar ve alıntılar zaman sırasıyla burada. Fotoğraf, ses, formül ve çizim ekleyebilirsin. Duvarını yalnızca sen görürsün."
        actions={<>{KINDS.map((kind) => <button key={kind.value} onClick={() => setComposer({ post: null, kind: kind.value })} className={kind.value === "note" ? primaryButton : secondaryButton}><kind.icon size={15} /> {kind.value === "note" ? "Yeni yazı" : kind.label}</button>)}</>} />

      {counts && counts.unread > 0 && filter !== "unread" && (
        <button onClick={() => setFilter("unread")} className="flex w-full items-center justify-between gap-3 rounded-2xl bg-warn-soft/70 px-4 py-3 text-left text-[13px] text-ink-2">
          <span><BookmarkPlus size={15} className="mr-1.5 inline text-warn" /> Sonra okumak için kaydettiğin <strong>{counts.unread} kayıt</strong> seni bekliyor.</span>
          <span className="font-semibold text-warn">Göster →</span>
        </button>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-fit gap-1 rounded-2xl bg-paper p-1" role="tablist" aria-label="Duvar süzgeci">
          {filters.map((item) => (
            <button key={item.value} role="tab" aria-selected={filter === item.value} onClick={() => setFilter(item.value)} className={`rounded-xl px-3 py-1.5 text-[13px] font-semibold ${filter === item.value ? "bg-white text-ink shadow-sm" : "text-ink-3"}`}>{item.label}{item.count ? <span className="ml-1 text-ink-4">{item.count}</span> : null}</button>
          ))}
        </div>
        <label className="relative block sm:w-72">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Duvarında ara" className="form-input pl-9" aria-label="Duvarında ara" />
        </label>
      </div>
      {(counts?.tags.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {counts!.tags.map((item) => <button key={item.tag} onClick={() => setTag(tag === item.tag ? null : item.tag)} className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${tag === item.tag ? "bg-ink text-white" : "bg-paper text-ink-3 hover:text-ink-2"}`}>#{item.tag} <span className="opacity-60">{item.count}</span></button>)}
        </div>
      )}

      {feed.isLoading ? <EmptyNote>Yükleniyor…</EmptyNote> : posts.length === 0 ? (
        <EmptyNote>{q || tag || filter !== "all" ? "Bu süzgeçte kayıt yok." : "Duvarın boş. İlk yazını yaz ya da sonra okumak istediğin bir bağlantıyı kaydet."}</EmptyNote>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.key} aria-label={group.label}>
              <h2 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-ink-4">{group.label}</h2>
              <div className="space-y-3">{group.posts.map((post) => <PostCard key={post.id} post={post} onEdit={() => setComposer({ post, kind: post.kind })} onChanged={refresh} />)}</div>
            </section>
          ))}
          {feed.hasNextPage && <div className="text-center"><button onClick={() => void feed.fetchNextPage()} disabled={feed.isFetchingNextPage} className={secondaryButton}>{feed.isFetchingNextPage ? "Yükleniyor…" : "Daha eski kayıtlar"}</button></div>}
        </div>
      )}

      {composer && <WallComposer post={composer.post} initialKind={composer.kind} onClose={() => setComposer(null)} onSaved={() => { setComposer(null); refresh(); }} />}
    </div>
  );
}

/** Kayıt içeriği salt okunur (defterin blokları: fotoğraf, ses, formül, çizim aynen görünür). */
function ReadOnlyDoc({ content }: { content: NoteDoc }) {
  const editor = useEditor({ extensions: noteExtensions(""), content, editable: false, immediatelyRender: true, editorProps: { attributes: { class: "note-content prose-note outline-none" } } }, [JSON.stringify(content)]);
  return <EditorContent editor={editor} />;
}

function PostCard({ post, onEdit, onChanged }: { post: Post; onEdit: () => void; onChanged: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const flags = trpc.wall.setFlags.useMutation({ onSuccess: onChanged, onError: (error) => toast.error(error.message) });
  const remove = trpc.wall.delete.useMutation({ onSuccess: () => { toast.success("Kayıt silindi."); onChanged(); }, onError: (error) => toast.error(error.message) });
  const unread = post.readLater && !post.readAt;
  const hasBody = !isEmptyDoc(post.content, post.plainText);
  const long = post.plainText.length > 600 || JSON.stringify(post.content).includes('"noteImage"') || JSON.stringify(post.content).includes('"drawing"');
  const KindIcon = KINDS.find((kind) => kind.value === post.kind)?.icon ?? Pencil;

  return (
    <article className={`rounded-2xl border bg-white p-4 shadow-[var(--shadow-card)] sm:p-5 ${unread ? "border-warn/40" : "border-rule"}`} aria-label={post.title}>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 text-[11.5px] font-semibold text-ink-4">
            <KindIcon size={12} /> {KINDS.find((kind) => kind.value === post.kind)?.label} · {timeLabel(post.postedAt)}
            {post.isPinned && <span className="rounded-full bg-brand-soft px-1.5 py-px text-brand">Sabit</span>}
            {unread && <span className="rounded-full bg-warn-soft px-1.5 py-px text-warn">Okunacak</span>}
            {post.readLater && post.readAt && <span className="rounded-full bg-success-soft px-1.5 py-px text-success">Okundu</span>}
          </div>
          <h3 className="mt-1 text-[16px] font-semibold text-ink">{post.title}</h3>
        </div>
        <div className="flex shrink-0 gap-0.5">
          {post.readLater && <button onClick={() => flags.mutate({ id: post.id, read: !post.readAt })} className="rounded-lg p-2 text-ink-3 hover:bg-paper" aria-label={post.readAt ? "Okunmadı yap" : "Okundu işaretle"} title={post.readAt ? "Okunmadı yap" : "Okundu işaretle"}><BookmarkCheck size={16} /></button>}
          <button onClick={() => flags.mutate({ id: post.id, pinned: !post.isPinned })} className="rounded-lg p-2 text-ink-3 hover:bg-paper" aria-label={post.isPinned ? "Sabitlemeyi kaldır" : "Sabitle"} title={post.isPinned ? "Sabitlemeyi kaldır" : "Sabitle"}>{post.isPinned ? <PinOff size={16} /> : <Pin size={16} />}</button>
          <button onClick={onEdit} className="rounded-lg p-2 text-ink-3 hover:bg-paper" aria-label="Düzenle" title="Düzenle"><Pencil size={16} /></button>
          <button onClick={() => { if (window.confirm("Bu kayıt ve içindeki fotoğraf/ses silinsin mi?")) remove.mutate({ id: post.id }); }} className="rounded-lg p-2 text-ink-3 hover:bg-danger-soft hover:text-danger" aria-label="Sil" title="Sil"><Trash2 size={16} /></button>
        </div>
      </header>

      {post.sourceUrl && (
        <a href={post.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" onClick={() => { if (unread) flags.mutate({ id: post.id, read: true }); }} className="mt-3 block rounded-xl border border-rule bg-paper/60 p-3 transition hover:border-brand/40">
          <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-ink-4"><ExternalLink size={12} /> {post.sourceSite ?? new URL(post.sourceUrl).hostname}</div>
          {post.sourceTitle && post.sourceTitle !== post.title && <div className="mt-0.5 text-[13.5px] font-semibold text-ink">{post.sourceTitle}</div>}
          {post.sourceDescription && <div className="mt-0.5 line-clamp-2 text-[12.5px] text-ink-3">{post.sourceDescription}</div>}
        </a>
      )}
      {post.kind === "quote" && post.sourceTitle && !post.sourceUrl && <div className="mt-2 text-[12px] font-semibold text-ink-3">— {post.sourceTitle}</div>}

      {hasBody && (
        <div className={`relative mt-3 ${post.kind === "quote" ? "border-l-4 border-brand/40 pl-3 italic" : ""}`}>
          <div className={!expanded && long ? "max-h-72 overflow-hidden" : ""}><ReadOnlyDoc content={post.content} /></div>
          {!expanded && long && <div className="absolute inset-x-0 bottom-0 flex h-16 items-end justify-center bg-gradient-to-t from-white to-transparent"><button onClick={() => setExpanded(true)} className="rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-brand shadow">Devamını göster</button></div>}
        </div>
      )}

      {(post.tags.length > 0 || post.topic) && (
        <div className="mt-3 flex flex-wrap gap-1.5 text-[11.5px] font-semibold">
          {post.topic && <span className="rounded-full bg-brand-soft px-2 py-0.5 text-brand">{post.subject} · {post.topic}</span>}
          {post.tags.map((item) => <span key={item} className="rounded-full bg-paper px-2 py-0.5 text-ink-3">#{item}</span>)}
        </div>
      )}
    </article>
  );
}

/** Seçili bir blok varsa içerik onun arkasına eklenir (defterdeki gibi; seçili blok ezilmesin). */
function insertBlocks(editor: Editor, nodes: JSONContent[]) {
  const content = [...nodes, { type: "paragraph" }];
  if (!editor.isFocused) editor.chain().focus("end").insertContent(content).run();
  else if (editor.state.selection instanceof NodeSelection) editor.chain().focus().insertContentAt(editor.state.selection.to, content).run();
  else editor.chain().focus().insertContent(content).run();
}

function WallComposer({ post, initialKind, onClose, onSaved }: { post: Post | null; initialKind: Kind; onClose: () => void; onSaved: () => void }) {
  const [kind, setKind] = useState<Kind>(initialKind);
  const [title, setTitle] = useState(post?.title ?? "");
  const [url, setUrl] = useState(post?.sourceUrl ?? "");
  const [preview, setPreview] = useState<{ title: string | null; description: string | null; site: string | null } | null>(post?.sourceUrl ? { title: post.sourceTitle, description: post.sourceDescription, site: post.sourceSite } : null);
  const [quoteSource, setQuoteSource] = useState(post?.kind === "quote" && !post.sourceUrl ? post.sourceTitle ?? "" : "");
  const [tags, setTags] = useState(post?.tags.join(", ") ?? "");
  const [topicId, setTopicId] = useState<number | null>(post?.topicId ?? null);
  const [readLater, setReadLater] = useState(post ? post.readLater : initialKind === "link");
  const [insert, setInsert] = useState<InsertAction | null>(null);
  const { topics, subjects } = useCurriculumTopics();
  const linkPreview = trpc.wall.linkPreview.useMutation();
  const create = trpc.wall.create.useMutation();
  const update = trpc.wall.update.useMutation();
  const saving = create.isPending || update.isPending;
  const placeholder = kind === "link" ? "Bu bağlantı hakkında notun (isteğe bağlı)…" : kind === "quote" ? "Alıntıladığın cümle ya da paragraf…" : "Yazmaya başla… Fotoğraf, ses, formül ve çizim ekleyebilirsin.";
  const editor = useEditor({ extensions: noteExtensions(placeholder), content: post?.content ?? EMPTY_NOTE_DOC, immediatelyRender: true, editorProps: { attributes: { class: "note-content prose-note min-h-[160px] px-4 py-3 outline-none", "aria-label": "Kayıt içeriği" } } });

  const fetchPreview = async () => {
    if (!url.trim()) return;
    try {
      const result = await linkPreview.mutateAsync({ url: url.trim() });
      setUrl(result.url);
      setPreview({ title: result.title, description: result.description, site: result.site });
    } catch (error) {
      setPreview(null);
      toast.error(error instanceof Error ? error.message : "Önizleme alınamadı.");
    }
  };

  const save = async () => {
    if (!editor || saving) return;
    if (kind === "link" && !url.trim()) { toast.error("Bağlantı adresini yapıştır."); return; }
    const payload = {
      kind,
      title,
      content: editor.getJSON() as NoteDoc,
      sourceUrl: kind === "link" ? url.trim() : null,
      sourceTitle: kind === "link" ? preview?.title ?? null : kind === "quote" ? quoteSource.trim() || null : null,
      sourceDescription: kind === "link" ? preview?.description ?? null : null,
      sourceSite: kind === "link" ? preview?.site ?? null : null,
      tags: tags.split(/[,#\s]+/).map((value) => normalizeTag(value)).filter((value): value is string => Boolean(value)),
      topicId,
      readLater,
    };
    try {
      if (post) await update.mutateAsync({ id: post.id, ...payload });
      else await create.mutateAsync(payload);
      toast.success(post ? "Kayıt güncellendi." : "Duvarına eklendi.");
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kaydedilemedi.");
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !saving && onClose()}>
      <div className="modal-card max-h-[92vh] max-w-[680px] overflow-y-auto" role="dialog" aria-label={post ? "Kaydı düzenle" : "Duvara ekle"}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-1 rounded-2xl bg-paper p-1">
            {KINDS.map((item) => <button key={item.value} onClick={() => { setKind(item.value); if (!post && item.value === "link") setReadLater(true); }} aria-pressed={kind === item.value} className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[13px] font-semibold ${kind === item.value ? "bg-white text-ink shadow-sm" : "text-ink-3"}`}><item.icon size={14} /> {item.label}</button>)}
          </div>
          <button onClick={onClose} disabled={saving} className="rounded-lg p-2 text-ink-3 hover:bg-paper" aria-label="Kapat"><X size={16} /></button>
        </div>

        {kind === "link" && (
          <div className="mt-4">
            <label className="form-label" htmlFor="wall-url">Bağlantı</label>
            <div className="flex gap-2">
              <input id="wall-url" value={url} onChange={(event) => { setUrl(event.target.value); setPreview(null); }} onBlur={() => { if (url.trim() && !preview) void fetchPreview(); }} placeholder="https://…" inputMode="url" className="form-input flex-1" />
              <button onClick={() => void fetchPreview()} disabled={!url.trim() || linkPreview.isPending} className={secondaryButton}>{linkPreview.isPending ? <Loader2 size={15} className="animate-spin" /> : "Önizle"}</button>
            </div>
            {preview && (preview.title || preview.description) && (
              <div className="mt-2 rounded-xl border border-rule bg-paper/60 p-3">
                <div className="text-[11.5px] font-semibold text-ink-4">{preview.site}</div>
                {preview.title && <div className="text-[13.5px] font-semibold text-ink">{preview.title}</div>}
                {preview.description && <div className="line-clamp-2 text-[12.5px] text-ink-3">{preview.description}</div>}
              </div>
            )}
          </div>
        )}

        <label className="mt-4 block"><span className="form-label">Başlık {kind !== "note" && <span className="font-normal text-ink-4">(boş bırakırsan otomatik)</span>}</span><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} placeholder={kind === "link" ? preview?.title ?? "Bağlantının başlığı" : "Başlık"} className="form-input" aria-label="Kayıt başlığı" /></label>

        <div className="mt-4 overflow-hidden rounded-2xl border border-rule">
          {editor && <EditorToolbar editor={editor} onInsert={(action) => {
            if (action === "formula") insertBlocks(editor, [{ type: "formula", attrs: { latex: "", openToken: newEditorToken() } }]);
            else if (action === "drawing") insertBlocks(editor, [{ type: "drawing", attrs: { strokes: [], openToken: newEditorToken() } }]);
            else setInsert(action);
          }} />}
          <EditorContent editor={editor} />
        </div>

        {kind === "quote" && <label className="mt-3 block"><span className="form-label">Kaynak</span><input value={quoteSource} onChange={(event) => setQuoteSource(event.target.value)} maxLength={300} placeholder="Ör. Sabahattin Ali, Kürk Mantolu Madonna" className="form-input" /></label>}

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block"><span className="form-label">Etiketler</span><input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="Ör. motivasyon, tarih" className="form-input" /></label>
          <label className="block"><span className="form-label">Konu (isteğe bağlı)</span>
            <select value={topicId ?? ""} onChange={(event) => setTopicId(event.target.value ? Number(event.target.value) : null)} className="form-input" aria-label="Konu">
              <option value="">Konuya bağlama</option>
              {subjects.map((subject) => <optgroup key={subject} label={subject}>{topics.filter((topic) => topic.subject === subject).map((topic) => <option key={topic.id} value={topic.id}>{topic.topic}</option>)}</optgroup>)}
            </select>
          </label>
        </div>
        <label className="mt-3 inline-flex items-center gap-2 text-[13px] text-ink-2"><input type="checkbox" checked={readLater} onChange={(event) => setReadLater(event.target.checked)} className="accent-brand" /> Sonra okumak için işaretle</label>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} disabled={saving} className={secondaryButton}>Vazgeç</button>
          <button onClick={() => void save()} disabled={saving} className={primaryButton}>{saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} {post ? "Kaydet" : "Duvara ekle"}</button>
        </div>
      </div>

      {insert === "voice" && <VoiceRecorder audioOnly onClose={() => setInsert(null)} onDone={(result) => { setInsert(null); if (editor && result.attachmentId) insertBlocks(editor, [{ type: "voiceClip", attrs: { attachmentId: result.attachmentId, duration: result.durationSec } }]); }} />}
      {insert === "photo" && <NoteImageDialog confirmLabel="Ekle" defaultScan={false} onClose={() => setInsert(null)} onDone={(attachmentId) => { setInsert(null); if (editor) insertBlocks(editor, [{ type: "noteImage", attrs: { attachmentId } }]); }} />}
    </div>
  );
}
