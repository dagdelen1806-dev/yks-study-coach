import { trpc } from "@/lib/trpc";
import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import { Loader2, Pencil, ScanText, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import DrawingEditor, { StrokesSvg, type Stroke } from "./DrawingEditor";
import FormulaEditor, { renderLatex } from "./FormulaEditor";

// Akıllı Defter'in özel blokları. İçerikte JSON olarak saklanır (bkz.
// shared/noteContent.ts); burada editörde nasıl görüneceği tanımlıdır.

export const attachmentUrl = (id: number) => `/api/notes/attachments/${id}`;

// Yeni eklenen formül/çizim bloğunun düzenleyicisi KENDİLİĞİNDEN açılır — ama yalnızca
// bu oturumda az önce eklendiyse. (Boş bir blok kaydedilmişse, not her açıldığında
// düzenleyici açılmasın.) Ekleyen taraf bir jeton üretir, blok ilk çizildiğinde tüketir.
const pendingEditorTokens = new Set<string>();
export function newEditorToken(): string {
  const token = Math.random().toString(36).slice(2, 10);
  pendingEditorTokens.add(token);
  return token;
}
const consumeEditorToken = (token: unknown) => typeof token === "string" && pendingEditorTokens.delete(token);

const blockActions = (props: ReactNodeViewProps, extra?: React.ReactNode) =>
  props.editor.isEditable ? (
    <div className="absolute right-2 top-2 flex gap-1 opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100">
      {extra}
      <button type="button" onClick={() => props.deleteNode()} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-[#d95d4d] shadow-sm" aria-label="Bloğu sil"><Trash2 size={14} /></button>
    </div>
  ) : null;

function FormulaView(props: ReactNodeViewProps) {
  const latex = String(props.node.attrs.latex ?? "");
  const [editing, setEditing] = useState(() => props.editor.isEditable && consumeEditorToken(props.node.attrs.openToken));
  const html = useMemo(() => renderLatex(latex), [latex]);
  return (
    <NodeViewWrapper className={`group relative my-2 rounded-xl border px-3 py-2 ${props.selected ? "border-[#3b5ccc]" : "border-transparent hover:border-[#1f2333]/10"}`} data-formula="">
      <button type="button" onClick={() => props.editor.isEditable && setEditing(true)} className="block w-full overflow-x-auto text-left text-[#1f2333]" aria-label={`Formül: ${latex}. Düzenlemek için dokun.`} dangerouslySetInnerHTML={{ __html: html }} />
      {blockActions(props, <button type="button" onClick={() => setEditing(true)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-[#3b5ccc] shadow-sm" aria-label="Formülü düzenle"><Pencil size={14} /></button>)}
      {editing && <FormulaEditor initial={latex} onCancel={() => { setEditing(false); if (!latex) props.deleteNode(); }} onSave={(value) => { props.updateAttributes({ latex: value }); setEditing(false); }} />}
    </NodeViewWrapper>
  );
}

export const FormulaNode = Node.create({
  name: "formula",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes: () => ({ latex: { default: "" }, openToken: { default: null, rendered: false } }),
  parseHTML: () => [{ tag: "div[data-formula]", getAttrs: (element) => ({ latex: (element as HTMLElement).getAttribute("data-latex") ?? "" }) }],
  renderHTML: ({ HTMLAttributes, node }) => ["div", mergeAttributes(HTMLAttributes, { "data-formula": "", "data-latex": node.attrs.latex })],
  addNodeView: () => ReactNodeViewRenderer(FormulaView),
});

function DrawingView(props: ReactNodeViewProps) {
  const strokes = (Array.isArray(props.node.attrs.strokes) ? props.node.attrs.strokes : []) as Stroke[];
  const [editing, setEditing] = useState(() => props.editor.isEditable && consumeEditorToken(props.node.attrs.openToken));
  return (
    <NodeViewWrapper className={`group relative my-2 overflow-hidden rounded-xl border bg-white ${props.selected ? "border-[#3b5ccc]" : "border-[#1f2333]/10"}`}>
      <button type="button" onClick={() => props.editor.isEditable && setEditing(true)} className="block w-full" aria-label="Çizimi düzenle"><StrokesSvg strokes={strokes} className="block h-auto max-h-64 w-full" /></button>
      {blockActions(props, <button type="button" onClick={() => setEditing(true)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-[#3b5ccc] shadow-sm" aria-label="Çizimi düzenle"><Pencil size={14} /></button>)}
      {editing && <DrawingEditor initial={strokes} onCancel={() => { setEditing(false); if (!strokes.length) props.deleteNode(); }} onSave={(value) => { props.updateAttributes({ strokes: value }); setEditing(false); }} />}
    </NodeViewWrapper>
  );
}

export const DrawingNode = Node.create({
  name: "drawing",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes: () => ({ strokes: { default: [] }, openToken: { default: null, rendered: false } }),
  parseHTML: () => [{ tag: "div[data-drawing]" }],
  renderHTML: ({ HTMLAttributes }) => ["div", mergeAttributes(HTMLAttributes, { "data-drawing": "" })],
  addNodeView: () => ReactNodeViewRenderer(DrawingView),
});

function NoteImageView(props: ReactNodeViewProps) {
  const attachmentId = Number(props.node.attrs.attachmentId);
  const ocrText = String(props.node.attrs.ocrText ?? "");
  const extract = trpc.notes.extractText.useMutation({
    onSuccess: ({ text }) => {
      props.updateAttributes({ ocrText: text });
      // Çıkarılan metin, fotoğrafın hemen altına düzenlenebilir paragraflar olarak eklenir.
      const position = props.getPos();
      if (typeof position === "number") {
        props.editor.chain().insertContentAt(position + props.node.nodeSize, text.split(/\n{2,}/).filter(Boolean).map((paragraph) => ({ type: "paragraph", content: [{ type: "text", text: paragraph }] }))).run();
      }
      toast.success("Metin nota eklendi; düzenleyebilirsin.");
    },
    onError: (error) => toast.error(error.message),
  });
  return (
    <NodeViewWrapper className={`group relative my-2 overflow-hidden rounded-xl border bg-[#fafafa] ${props.selected ? "border-[#3b5ccc]" : "border-[#1f2333]/10"}`}>
      <img src={attachmentUrl(attachmentId)} alt={ocrText ? `Fotoğraf: ${ocrText.slice(0, 80)}` : "Nota eklenen fotoğraf"} loading="lazy" className="mx-auto block max-h-[420px] w-auto max-w-full object-contain" />
      {blockActions(props, !ocrText ? (
        <button type="button" onClick={() => extract.mutate({ attachmentId })} disabled={extract.isPending} className="flex h-8 items-center gap-1 rounded-lg bg-white/90 px-2 text-[11px] font-semibold text-[#3b5ccc] shadow-sm" aria-label="Fotoğraftaki metni çıkar">
          {extract.isPending ? <Loader2 size={13} className="animate-spin" /> : <ScanText size={13} />} Metni çıkar
        </button>
      ) : undefined)}
      {ocrText && <div className="border-t border-[#1f2333]/[0.06] px-3 py-1.5 text-[10px] text-[#8b8c95]">✓ Metin çıkarıldı (aramada bulunur)</div>}
    </NodeViewWrapper>
  );
}

export const NoteImageNode = Node.create({
  name: "noteImage",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes: () => ({ attachmentId: { default: null }, ocrText: { default: "" } }),
  parseHTML: () => [{ tag: "figure[data-note-image]" }],
  renderHTML: ({ HTMLAttributes }) => ["figure", mergeAttributes(HTMLAttributes, { "data-note-image": "" })],
  addNodeView: () => ReactNodeViewRenderer(NoteImageView),
});

export const formatDuration = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;

function VoiceClipView(props: ReactNodeViewProps) {
  const attachmentId = props.node.attrs.attachmentId ? Number(props.node.attrs.attachmentId) : null;
  const duration = Number(props.node.attrs.duration) || 0;
  return (
    <NodeViewWrapper className={`group relative my-2 flex items-center gap-3 rounded-xl border bg-[#f4f6ff] px-3 py-2 ${props.selected ? "border-[#3b5ccc]" : "border-[#3b5ccc]/15"}`}>
      <span className="text-[13px] font-semibold text-[#3b5ccc]">🎙️ {formatDuration(duration)}</span>
      {attachmentId ? <audio controls preload="none" src={attachmentUrl(attachmentId)} className="h-9 max-w-full flex-1" aria-label="Ses kaydı" /> : <span className="text-[11px] text-[#8b8c95]">Ses kaydı saklanmadı (yalnızca metni).</span>}
      {blockActions(props)}
    </NodeViewWrapper>
  );
}

export const VoiceClipNode = Node.create({
  name: "voiceClip",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes: () => ({ attachmentId: { default: null }, duration: { default: 0 } }),
  parseHTML: () => [{ tag: "div[data-voice-clip]" }],
  renderHTML: ({ HTMLAttributes }) => ["div", mergeAttributes(HTMLAttributes, { "data-voice-clip": "" })],
  addNodeView: () => ReactNodeViewRenderer(VoiceClipView),
});
