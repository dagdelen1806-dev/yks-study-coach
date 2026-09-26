import { describe, expect, it } from "vitest";
import { NOTE_TEMPLATES, aiResultToNodes, computeNoteStats, deriveNoteTitle, extractPlainText, isValidNoteDoc, noteKinds, normalizeTag, suggestsStudyTask, templateDoc, type NoteDoc } from "../shared/noteContent";
import { AttachmentError, decodeAttachment } from "./notes/attachmentStorage";
import { referencedAttachmentIds } from "./notes/notesDb";
import { runNoteAi } from "./notes/noteAi";

// Uçtan uca senaryodaki not: ses metni + konu + fotoğraf + renkli formül.
const doc: NoteDoc = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Ana düşünce" }] },
    { type: "voiceClip", attrs: { attachmentId: 11, duration: 32 } },
    { type: "paragraph", content: [{ type: "text", text: "Paragrafta ana düşünce sorularında önce paragrafın " }, { type: "text", text: "genel mesajını", marks: [{ type: "textStyle", attrs: { color: "#c62828" } }, { type: "bold" }] }, { type: "text", text: " bulmalıyım." }] },
    { type: "noteImage", attrs: { attachmentId: 12, ocrText: "Giriş ve sonuç cümlelerine dikkat" } },
    { type: "formula", attrs: { latex: "a^{2} + b^{2} = c^{2}" } },
    { type: "drawing", attrs: { strokes: [{ tool: "pen", color: "#d93b3b", width: 4, points: [0, 0, 10, 10] }] } },
    { type: "taskList", content: [{ type: "taskItem", attrs: { checked: true }, content: [{ type: "paragraph", content: [{ type: "text", text: "Test 4'ü bitir" }] }] }, { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Yanlışları not et" }] }] }] },
  ],
};

describe("note content model", () => {
  it("builds searchable plain text from text, formula LaTeX and photo OCR text", () => {
    const text = extractPlainText(doc);
    expect(text).toContain("Ana düşünce");
    expect(text).toContain("önce paragrafın genel mesajını bulmalıyım.");
    expect(text).toContain("Giriş ve sonuç cümlelerine dikkat");
    expect(text).toContain("a^{2} + b^{2} = c^{2}");
    expect(text.split("\n")[0]).toBe("Ana düşünce");
  });

  it("computes list-preview stats and note kinds", () => {
    const stats = computeNoteStats(doc);
    expect(stats).toMatchObject({ images: 1, voice: 1, voiceSeconds: 32, formulas: 1, drawings: 1, checklist: 2, checklistDone: 1, firstFormula: "a^{2} + b^{2} = c^{2}" });
    expect(noteKinds(stats, extractPlainText(doc))).toEqual(["text", "voice", "image", "formula", "drawing"]);
  });

  it("finds attachment ids referenced in the content", () => {
    expect(referencedAttachmentIds(doc).sort()).toEqual([11, 12]);
  });

  it("derives a title for quick notes without one", () => {
    const date = new Date("2026-09-18T20:42:00");
    expect(deriveNoteTitle("  ", "Paragrafta ana düşünce\nikinci satır", date)).toBe("Paragrafta ana düşünce");
    expect(deriveNoteTitle("", "", date)).toBe("Not · 18 Eylül");
    expect(deriveNoteTitle("Kendi başlığım", "x", date)).toBe("Kendi başlığım");
  });

  it("normalizes tags", () => {
    expect(normalizeTag("#Önemli")).toBe("önemli");
    expect(normalizeTag("  Yanlış Sorularım ")).toBe("yanlış-sorularım");
    expect(normalizeTag("#")).toBeNull();
  });

  it("accepts only well-formed documents (root doc, bounded size/depth)", () => {
    expect(isValidNoteDoc(doc)).toBe(true);
    expect(isValidNoteDoc({ type: "paragraph", content: [] })).toBe(false);
    expect(isValidNoteDoc("<p>html</p>")).toBe(false);
    let deep: Record<string, unknown> = { type: "paragraph" };
    for (let index = 0; index < 40; index++) deep = { type: "blockquote", content: [deep] };
    expect(isValidNoteDoc({ type: "doc", content: [deep] })).toBe(false);
  });

  it("suggests a study task only for 'I need to review / I struggle' notes", () => {
    expect(suggestsStudyTask("Paragrafın yapısını tekrar etmeliyim.")).toBe(true);
    expect(suggestsStudyTask("Bu konuda çok zorlanıyorum")).toBe(true);
    expect(suggestsStudyTask("Fotosentez ışık enerjisinin kimyasal enerjiye dönüşümüdür.")).toBe(false);
  });

  it("turns AI output into a separate labelled block (never replacing the note)", () => {
    const [block] = aiResultToNodes("flashcards", [{ front: "Fotosentez nedir?", back: "Işık enerjisinin kimyasal enerjiye dönüşümü." }]);
    expect(block.type).toBe("blockquote");
    expect(extractPlainText(block)).toContain("✨ AI · Flashcard");
    expect(extractPlainText(block)).toContain("S: Fotosentez nedir?");
    expect(extractPlainText(block)).toContain("C: Işık enerjisinin kimyasal enerjiye dönüşümü.");
  });

  it("templates produce valid documents with their section headings", () => {
    for (const template of NOTE_TEMPLATES) {
      const templateContent = templateDoc(template);
      expect(isValidNoteDoc(templateContent)).toBe(true);
      expect(extractPlainText(templateContent)).toContain(template.sections[0]);
    }
  });
});

describe("attachment validation", () => {
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
  const webmAudio = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 1, 2, 3, 4]);

  it("accepts a real JPEG and a WebM recording (with codec parameters)", () => {
    expect(decodeAttachment(`data:image/jpeg;base64,${jpeg.toString("base64")}`, "image").mimeType).toBe("image/jpeg");
    expect(decodeAttachment(`data:audio/webm;codecs=opus;base64,${webmAudio.toString("base64")}`, "audio").mimeType).toBe("audio/webm");
  });

  it("rejects content that does not match the declared type", () => {
    expect(() => decodeAttachment(`data:image/png;base64,${jpeg.toString("base64")}`, "image")).toThrow(AttachmentError);
    expect(() => decodeAttachment(`data:audio/webm;base64,${jpeg.toString("base64")}`, "audio")).toThrow(/eşleşmiyor/);
  });

  it("rejects disallowed types and oversized files", () => {
    expect(() => decodeAttachment(`data:image/svg+xml;base64,${Buffer.from("<svg/>").toString("base64")}`, "image")).toThrow(/JPG, PNG veya WEBP/);
    const huge = Buffer.concat([jpeg, Buffer.alloc(1024 * 1024)]);
    expect(() => decodeAttachment(`data:image/jpeg;base64,${huge.toString("base64")}`, "image")).toThrow(/çok büyük/);
  });
});

describe("runNoteAi", () => {
  const invokeReturning = (items: unknown) => {
    const calls: Array<{ messages: Array<{ role: string; content: unknown }> }> = [];
    const invoke = (async (params: { messages: Array<{ role: string; content: unknown }> }) => { calls.push(params); return { choices: [{ message: { content: JSON.stringify({ items }) } }] }; }) as never;
    return { invoke, calls };
  };

  it("sends only the (capped) note text and keeps flashcard answers", async () => {
    const { invoke, calls } = invokeReturning([{ front: "Fotosentez nedir?", back: "Işık → kimyasal enerji" }, { front: "", back: "boş" }]);
    const items = await runNoteAi("flashcards", "x".repeat(10_000), invoke);
    expect(items).toEqual([{ front: "Fotosentez nedir?", back: "Işık → kimyasal enerji" }]);
    expect(String(calls[0].messages[1].content).length).toBe(6000);
  });

  it("drops answers for non-flashcard actions and refuses empty notes", async () => {
    const { invoke } = invokeReturning([{ front: "Madde 1", back: "gereksiz" }]);
    expect(await runNoteAi("summarize", "Kısa not", invoke)).toEqual([{ front: "Madde 1" }]);
    await expect(runNoteAi("summarize", "   ", invoke)).rejects.toThrow(/yazı yok/);
  });
});
