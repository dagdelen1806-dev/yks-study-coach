import { getSchema } from "@tiptap/core";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { describe, expect, it } from "vitest";
import { noteExtensions } from "../client/src/components/notebook/extensions";
import { NOTE_TEMPLATES, aiResultToNodes, templateDoc, type NoteDoc } from "../shared/noteContent";

// İstemcideki editör şeması ile sunucunun ürettiği/beklediği belge biçimi
// (shared/noteContent.ts) aynı olmalı: şema kurulabilmeli (çakışan eklenti
// yok) ve örnek not, şablonlar ve AI bloğu bu şemaya hatasız yüklenebilmeli.
const schema = getSchema(noteExtensions("placeholder"));
const load = (doc: unknown) => ProseMirrorNode.fromJSON(schema, doc);

describe("note editor schema", () => {
  it("builds without conflicting extensions and has every custom block", () => {
    for (const name of ["formula", "drawing", "noteImage", "voiceClip", "taskList", "taskItem", "heading", "blockquote", "horizontalRule"]) expect(schema.nodes[name], name).toBeDefined();
    for (const mark of ["bold", "italic", "underline", "strike", "textStyle", "highlight", "link"]) expect(schema.marks[mark], mark).toBeDefined();
  });

  it("loads a mixed note (voice + coloured text + photo + formula + drawing + checklist) and round-trips it", () => {
    const doc: NoteDoc = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2, textAlign: null }, content: [{ type: "text", text: "Ana düşünce" }] },
        { type: "voiceClip", attrs: { attachmentId: 11, duration: 32 } },
        { type: "paragraph", attrs: { textAlign: "center" }, content: [{ type: "text", text: "genel mesaj", marks: [{ type: "textStyle", attrs: { color: "#c62828", fontFamily: "Georgia, serif", fontSize: "18px" } }, { type: "highlight", attrs: { color: "#fff3a3" } }, { type: "bold" }] }] },
        { type: "noteImage", attrs: { attachmentId: 12, ocrText: "Giriş ve sonuç" } },
        { type: "formula", attrs: { latex: "a^{2} + b^{2} = c^{2}" } },
        { type: "drawing", attrs: { strokes: [{ tool: "pen", color: "#d93b3b", width: 4, points: [0, 0, 10, 10] }] } },
        { type: "taskList", content: [{ type: "taskItem", attrs: { checked: true }, content: [{ type: "paragraph", content: [{ type: "text", text: "Test 4" }] }] }] },
        { type: "horizontalRule" },
      ],
    };
    const node = load(doc);
    node.check();
    const json = node.toJSON();
    expect(json.content[4]).toMatchObject({ type: "formula", attrs: { latex: "a^{2} + b^{2} = c^{2}" } });
    expect(json.content[5].attrs.strokes[0].points).toEqual([0, 0, 10, 10]);
    expect(json.content[3].attrs).toMatchObject({ attachmentId: 12, ocrText: "Giriş ve sonuç" });
  });

  it("accepts every template and every AI result block", () => {
    for (const template of NOTE_TEMPLATES) load(templateDoc(template)).check();
    const doc = { type: "doc", content: [{ type: "paragraph" }, ...aiResultToNodes("flashcards", [{ front: "S", back: "C" }]), ...aiResultToNodes("questions", [{ front: "Soru?" }])] };
    load(doc).check();
  });
});
