import Highlight from "@tiptap/extension-highlight";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import TextAlign from "@tiptap/extension-text-align";
import { Color, FontFamily, FontSize, TextStyle } from "@tiptap/extension-text-style";
import { Placeholder } from "@tiptap/extensions";
import StarterKit from "@tiptap/starter-kit";
import { DrawingNode, FormulaNode, NoteImageNode, VoiceClipNode } from "./nodes";

/**
 * Akıllı Defter editör şeması. Kaydedilen JSON bu şemaya uyar
 * (bkz. shared/noteContent.ts); yeni blok eklemek için buraya bir Node eklemek yeterli.
 */
export function noteExtensions(placeholder: string) {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      codeBlock: false,
      code: false,
      link: { openOnClick: false, autolink: true, protocols: ["http", "https", "mailto"] },
    }),
    TextStyle,
    Color,
    FontFamily,
    FontSize,
    Highlight.configure({ multicolor: true }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Placeholder.configure({ placeholder }),
    FormulaNode,
    DrawingNode,
    NoteImageNode,
    VoiceClipNode,
  ];
}
