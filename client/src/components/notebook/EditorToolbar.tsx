import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import {
  AlignCenter, AlignLeft, AlignRight, Bold, Camera, CheckSquare, Heading1, Heading2, Heading3, Highlighter, Italic, List, ListOrdered, Mic, Minus,
  PenLine, Quote, Redo2, Sigma, Strikethrough, Type, Underline, Undo2,
} from "lucide-react";
import { useState } from "react";
// Eklentilerin komut tipleri (setColor, toggleTaskList...) import ile tanımlanır.
import "./extensions";

// Renk paleti: beyaz zeminde okunaklı (WCAG AA'ya yakın koyu tonlar). Sarı yazı
// açık zeminde okunmadığı için koyu hardal tonu kullanılır.
export const TEXT_COLORS = [
  { name: "Varsayılan", value: null },
  { name: "Kırmızı", value: "#c62828" },
  { name: "Turuncu", value: "#c25e00" },
  { name: "Sarı", value: "#8a6d00" },
  { name: "Yeşil", value: "#2e7d4f" },
  { name: "Mavi", value: "#2f5fd0" },
  { name: "Mor", value: "#6f42c1" },
  { name: "Pembe", value: "#b83280" },
];
export const HIGHLIGHT_COLORS = [
  { name: "Sarı", value: "#fff3a3" },
  { name: "Yeşil", value: "#c9f2d7" },
  { name: "Mavi", value: "#cfe0ff" },
  { name: "Pembe", value: "#ffd6e7" },
  { name: "Turuncu", value: "#ffe0c2" },
];
// Cihazda her zaman bulunan font aileleri (dış font indirilmez → performans korunur).
export const FONT_FAMILIES = [
  { name: "Normal", value: null },
  { name: "Serif", value: "Georgia, 'Times New Roman', serif" },
  { name: "Sans", value: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" },
  { name: "Mono", value: "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace" },
];
export const FONT_SIZES = [
  { name: "Küçük", value: "13px" },
  { name: "Normal", value: null },
  { name: "Büyük", value: "18px" },
  { name: "Çok büyük", value: "22px" },
];

export type InsertAction = "voice" | "photo" | "formula" | "drawing";

const Btn = ({ label, active, onClick, disabled, children }: { label: string; active?: boolean; onClick: () => void; disabled?: boolean; children: React.ReactNode }) => (
  <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={onClick} disabled={disabled} aria-label={label} title={label} aria-pressed={active} className={`flex h-10 min-w-10 shrink-0 items-center justify-center rounded-lg px-2 text-[#343643] transition disabled:opacity-30 ${active ? "bg-[#e3e9ff] text-[#3b5ccc]" : "hover:bg-[#f7f5ef]"}`}>{children}</button>
);

/**
 * Bağlamsal araç çubuğu: üstte her zaman "Ekle" (ses/fotoğraf/formül/çizim) ve
 * geri al/yinele; biçimlendirme sekmeleri (Yazı / Paragraf / Renk) tek satırda
 * açılır — mobilde ekranı kalabalıklaştırmadan her şeye iki dokunuşla erişilir.
 */
export default function EditorToolbar({ editor, onInsert }: { editor: Editor; onInsert: (action: InsertAction) => void }) {
  const [panel, setPanel] = useState<"text" | "paragraph" | "color" | null>("text");
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current.isActive("bold"),
      italic: current.isActive("italic"),
      underline: current.isActive("underline"),
      strike: current.isActive("strike"),
      h1: current.isActive("heading", { level: 1 }),
      h2: current.isActive("heading", { level: 2 }),
      h3: current.isActive("heading", { level: 3 }),
      bullet: current.isActive("bulletList"),
      ordered: current.isActive("orderedList"),
      task: current.isActive("taskList"),
      quote: current.isActive("blockquote"),
      left: current.isActive({ textAlign: "left" }),
      center: current.isActive({ textAlign: "center" }),
      right: current.isActive({ textAlign: "right" }),
      color: (current.getAttributes("textStyle").color as string | undefined) ?? null,
      highlight: (current.getAttributes("highlight").color as string | undefined) ?? null,
      fontFamily: (current.getAttributes("textStyle").fontFamily as string | undefined) ?? null,
      fontSize: (current.getAttributes("textStyle").fontSize as string | undefined) ?? null,
      canUndo: current.can().undo(),
      canRedo: current.can().redo(),
    }),
  });
  const chain = () => editor.chain().focus();

  return (
    <div className="border-b border-[#1f2333]/[0.07] bg-white/95 backdrop-blur" role="toolbar" aria-label="Not araç çubuğu">
      <div className="flex items-center gap-1 overflow-x-auto px-2 py-1.5">
        <Btn label="Sesli not" onClick={() => onInsert("voice")}><Mic size={17} className="text-[#d95d4d]" /></Btn>
        <Btn label="Fotoğraf ekle" onClick={() => onInsert("photo")}><Camera size={17} /></Btn>
        <Btn label="Formül ekle" onClick={() => onInsert("formula")}><Sigma size={17} /></Btn>
        <Btn label="Kalemle çiz" onClick={() => onInsert("drawing")}><PenLine size={17} /></Btn>
        <span className="mx-1 h-6 w-px shrink-0 bg-[#1f2333]/10" />
        {(["text", "paragraph", "color"] as const).map((key) => (
          <button key={key} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => setPanel(panel === key ? null : key)} aria-expanded={panel === key} className={`h-9 shrink-0 rounded-lg px-2.5 text-[11px] font-semibold ${panel === key ? "bg-[#1f2333] text-white" : "text-[#545661] hover:bg-[#f7f5ef]"}`}>
            {key === "text" ? "Yazı" : key === "paragraph" ? "Paragraf" : "Renk"}
          </button>
        ))}
        <span className="mx-1 h-6 w-px shrink-0 bg-[#1f2333]/10" />
        <Btn label="Geri al" disabled={!state.canUndo} onClick={() => chain().undo().run()}><Undo2 size={16} /></Btn>
        <Btn label="Yinele" disabled={!state.canRedo} onClick={() => chain().redo().run()}><Redo2 size={16} /></Btn>
      </div>

      {panel === "text" && (
        <div className="flex items-center gap-1 overflow-x-auto border-t border-[#1f2333]/[0.05] px-2 py-1.5">
          <Btn label="Kalın" active={state.bold} onClick={() => chain().toggleBold().run()}><Bold size={16} /></Btn>
          <Btn label="İtalik" active={state.italic} onClick={() => chain().toggleItalic().run()}><Italic size={16} /></Btn>
          <Btn label="Altı çizili" active={state.underline} onClick={() => chain().toggleUnderline().run()}><Underline size={16} /></Btn>
          <Btn label="Üstü çizili" active={state.strike} onClick={() => chain().toggleStrike().run()}><Strikethrough size={16} /></Btn>
          <span className="mx-1 h-6 w-px shrink-0 bg-[#1f2333]/10" />
          <Btn label="Başlık 1" active={state.h1} onClick={() => chain().toggleHeading({ level: 1 }).run()}><Heading1 size={17} /></Btn>
          <Btn label="Başlık 2" active={state.h2} onClick={() => chain().toggleHeading({ level: 2 }).run()}><Heading2 size={17} /></Btn>
          <Btn label="Başlık 3" active={state.h3} onClick={() => chain().toggleHeading({ level: 3 }).run()}><Heading3 size={17} /></Btn>
          <span className="mx-1 h-6 w-px shrink-0 bg-[#1f2333]/10" />
          <label className="flex shrink-0 items-center gap-1 text-[11px] text-[#545661]"><Type size={14} aria-hidden />
            <select aria-label="Yazı tipi" value={state.fontFamily ?? ""} onChange={(event) => (event.target.value ? chain().setFontFamily(event.target.value).run() : chain().unsetFontFamily().run())} className="h-9 rounded-lg border border-[#1f2333]/10 bg-white px-1.5 text-[11px]">
              {FONT_FAMILIES.map((font) => <option key={font.name} value={font.value ?? ""}>{font.name}</option>)}
            </select>
          </label>
          <select aria-label="Yazı boyutu" value={state.fontSize ?? ""} onChange={(event) => (event.target.value ? chain().setFontSize(event.target.value).run() : chain().unsetFontSize().run())} className="h-9 shrink-0 rounded-lg border border-[#1f2333]/10 bg-white px-1.5 text-[11px]">
            {FONT_SIZES.map((size) => <option key={size.name} value={size.value ?? ""}>{size.name}</option>)}
          </select>
        </div>
      )}

      {panel === "paragraph" && (
        <div className="flex items-center gap-1 overflow-x-auto border-t border-[#1f2333]/[0.05] px-2 py-1.5">
          <Btn label="Madde listesi" active={state.bullet} onClick={() => chain().toggleBulletList().run()}><List size={16} /></Btn>
          <Btn label="Numaralı liste" active={state.ordered} onClick={() => chain().toggleOrderedList().run()}><ListOrdered size={16} /></Btn>
          <Btn label="Yapılacaklar listesi" active={state.task} onClick={() => chain().toggleTaskList().run()}><CheckSquare size={16} /></Btn>
          <Btn label="Alıntı" active={state.quote} onClick={() => chain().toggleBlockquote().run()}><Quote size={16} /></Btn>
          <Btn label="Ayırıcı çizgi" onClick={() => chain().setHorizontalRule().run()}><Minus size={16} /></Btn>
          <span className="mx-1 h-6 w-px shrink-0 bg-[#1f2333]/10" />
          <Btn label="Sola hizala" active={state.left} onClick={() => chain().setTextAlign("left").run()}><AlignLeft size={16} /></Btn>
          <Btn label="Ortala" active={state.center} onClick={() => chain().setTextAlign("center").run()}><AlignCenter size={16} /></Btn>
          <Btn label="Sağa hizala" active={state.right} onClick={() => chain().setTextAlign("right").run()}><AlignRight size={16} /></Btn>
        </div>
      )}

      {panel === "color" && (
        <div className="flex items-center gap-1.5 overflow-x-auto border-t border-[#1f2333]/[0.05] px-2 py-1.5">
          <span className="shrink-0 text-[10px] font-semibold text-[#8b8c95]">Yazı</span>
          {TEXT_COLORS.map((color) => (
            <button key={color.name} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => (color.value ? chain().setColor(color.value).run() : chain().unsetColor().run())} aria-label={`Yazı rengi: ${color.name}`} aria-pressed={state.color === color.value} className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-[14px] font-bold ${state.color === color.value ? "border-[#1f2333]" : "border-[#1f2333]/10"}`} style={{ color: color.value ?? "#1f2333" }}>A</button>
          ))}
          <span className="mx-1 h-6 w-px shrink-0 bg-[#1f2333]/10" />
          <Highlighter size={14} className="shrink-0 text-[#8b8c95]" aria-hidden />
          {HIGHLIGHT_COLORS.map((color) => (
            <button key={color.name} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => chain().toggleHighlight({ color: color.value }).run()} aria-label={`Vurgu: ${color.name}`} aria-pressed={state.highlight === color.value} className={`h-9 w-9 shrink-0 rounded-lg border ${state.highlight === color.value ? "border-[#1f2333]" : "border-[#1f2333]/10"}`} style={{ background: color.value }} />
          ))}
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => chain().unsetHighlight().run()} className="h-9 shrink-0 rounded-lg px-2 text-[11px] text-[#8b8c95]">Vurguyu kaldır</button>
        </div>
      )}
    </div>
  );
}
