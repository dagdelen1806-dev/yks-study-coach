// Akıllı Defter içerik modeli — sunucu ve istemci ortak.
//
// Not içeriği HTML değil, blok tabanlı JSON belgedir (ProseMirror/TipTap
// biçimi): { type: "doc", content: [ { type: "paragraph", content: [...] }, ... ] }.
// Standart bloklar: paragraph, heading, bulletList, orderedList, listItem,
// taskList, taskItem, blockquote, horizontalRule. Özel bloklar:
//   formula   { latex }                    — LaTeX olarak saklanır, KaTeX ile çizilir
//   drawing   { strokes, width, height }   — vektör çizim (bitmap değil)
//   noteImage { attachmentId, ocrText? }   — fotoğraf eki (+ çıkarılan metin)
//   voiceClip { attachmentId?, duration }  — ses kaydı eki (metni ayrıca paragraf olarak)
// Yeni blok türü eklemek veritabanı değişikliği gerektirmez.

export type NoteNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: NoteNode[];
  text?: string;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
};
export type NoteDoc = { type: "doc"; content: NoteNode[] };

export const EMPTY_NOTE_DOC: NoteDoc = { type: "doc", content: [{ type: "paragraph" }] };

const BLOCK_TYPES = new Set(["paragraph", "heading", "listItem", "taskItem", "blockquote", "formula", "noteImage", "voiceClip", "drawing", "horizontalRule"]);

/**
 * Aramada kullanılacak düz metin: yazılar, formüllerin LaTeX'i ve fotoğraflardan
 * çıkarılan metin. Blok sınırları satır sonu olur. Zengin JSON'a bağımlı olmadan
 * arama yapılabilsin diye sunucuda üretilir.
 */
export function extractPlainText(doc: NoteDoc | NoteNode): string {
  const parts: string[] = [];
  const walk = (node: NoteNode) => {
    if (node.type === "text" && typeof node.text === "string") parts.push(node.text);
    else if (node.type === "hardBreak") parts.push("\n");
    else if (node.type === "formula" && typeof node.attrs?.latex === "string") parts.push(` ${node.attrs.latex} `);
    else if (node.type === "noteImage" && typeof node.attrs?.ocrText === "string") parts.push(node.attrs.ocrText);
    for (const child of node.content ?? []) walk(child);
    if (BLOCK_TYPES.has(node.type)) parts.push("\n");
  };
  walk(doc);
  return parts.join("").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export type NoteStats = { images: number; voice: number; voiceSeconds: number; formulas: number; drawings: number; checklist: number; checklistDone: number; firstFormula: string | null };

/** Liste kartındaki küçük göstergeler (📷 2 görsel · 🎙️ 00:32 · ∑ x²). */
export function computeNoteStats(doc: NoteDoc | NoteNode): NoteStats {
  const stats: NoteStats = { images: 0, voice: 0, voiceSeconds: 0, formulas: 0, drawings: 0, checklist: 0, checklistDone: 0, firstFormula: null };
  const walk = (node: NoteNode) => {
    if (node.type === "noteImage") stats.images += 1;
    if (node.type === "voiceClip") { stats.voice += 1; stats.voiceSeconds += Number(node.attrs?.duration) || 0; }
    if (node.type === "formula") { stats.formulas += 1; if (!stats.firstFormula && typeof node.attrs?.latex === "string") stats.firstFormula = node.attrs.latex.slice(0, 60); }
    if (node.type === "drawing") stats.drawings += 1;
    if (node.type === "taskItem") { stats.checklist += 1; if (node.attrs?.checked) stats.checklistDone += 1; }
    for (const child of node.content ?? []) walk(child);
  };
  walk(doc);
  return stats;
}

/** Not tipi (filtre için) içerikten türetilir: bir not aynı anda birden çok türü içerebilir. */
export const NOTE_KINDS = ["text", "voice", "image", "formula", "drawing"] as const;
export type NoteKind = (typeof NOTE_KINDS)[number];
export const noteKinds = (stats: NoteStats, plainText: string): NoteKind[] => [
  ...(plainText.trim() ? ["text" as const] : []),
  ...(stats.voice ? ["voice" as const] : []),
  ...(stats.images ? ["image" as const] : []),
  ...(stats.formulas ? ["formula" as const] : []),
  ...(stats.drawings ? ["drawing" as const] : []),
];

/** Boş başlıkta ilk anlamlı satırdan başlık üretir (Hızlı Not başlık istemez). */
export function deriveNoteTitle(title: string, plainText: string, noteDate: Date): string {
  const clean = title.trim();
  if (clean) return clean.slice(0, 200);
  const firstLine = plainText.split("\n").map((line) => line.trim()).find(Boolean);
  if (firstLine) return firstLine.length > 60 ? `${firstLine.slice(0, 57)}…` : firstLine;
  return `Not · ${noteDate.toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}`;
}

/** Etiket biçimi: küçük harf, # yok, boşluk yerine tire, en çok 40 karakter. */
export function normalizeTag(value: string): string | null {
  const tag = value.trim().replace(/^#+/, "").replace(/İ/g, "i").replace(/I/g, "ı").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9çğıöşü_-]/g, "").slice(0, 40);
  return tag.length >= 2 ? tag : null;
}

export const SUGGESTED_TAGS = ["önemli", "tekrar", "formül", "sınav", "dikkat", "yanlışlarım"];

/** Basit belge doğrulaması: kök "doc", derinlik ve düğüm sayısı sınırlı. */
export function isValidNoteDoc(value: unknown, limits = { maxNodes: 20_000, maxDepth: 30 }): value is NoteDoc {
  if (!value || typeof value !== "object" || (value as NoteNode).type !== "doc" || !Array.isArray((value as NoteNode).content)) return false;
  let count = 0;
  const check = (node: unknown, depth: number): boolean => {
    if (!node || typeof node !== "object" || typeof (node as NoteNode).type !== "string") return false;
    if (++count > limits.maxNodes || depth > limits.maxDepth) return false;
    const children = (node as NoteNode).content;
    if (children !== undefined && !Array.isArray(children)) return false;
    return (children ?? []).every((child) => check(child, depth + 1));
  };
  return check(value, 0);
}

/**
 * Not "bu konuyu çalışmalıyım / zorlanıyorum" diyor mu? Yalnızca bir ÖNERİ
 * tetikler ("Çalışma planına ekle?"); zayıflık hesabını değiştirmez (o, deneme
 * ve çözüm verisinden mevcut sistemle hesaplanır).
 */
export function suggestsStudyTask(plainText: string): boolean {
  const text = plainText.replace(/İ/g, "i").replace(/I/g, "ı").toLowerCase();
  return /(tekrar (etmeliyim|etmem lazım|çalış|çalışmalıyım|bakmalıyım)|zorlan(ıyorum|dım)|anlamadım|anlamıyorum|eksi[ğk]im|çalışmam (lazım|gerek)|unutmuşum|karıştırıyorum)/.test(text);
}

// ---------------------------------------------------------------------------
// AI araçları (opsiyonel): çıktı notun üzerine YAZILMAZ; ayrı bir blok olarak eklenir.
// ---------------------------------------------------------------------------
export const NOTE_AI_ACTIONS = {
  summarize: { label: "Özet", menu: "Özetle" },
  keypoints: { label: "Önemli noktalar", menu: "Önemli noktaları çıkar" },
  questions: { label: "Sorular", menu: "Soru oluştur" },
  flashcards: { label: "Flashcard", menu: "Flashcard oluştur" },
  simplify: { label: "Basitleştirilmiş", menu: "Basitleştir" },
  review: { label: "Tekrar etmem gerekenler", menu: "Tekrar etmem gerekenleri bul" },
} as const;
export type NoteAiAction = keyof typeof NOTE_AI_ACTIONS;
export type NoteAiItem = { front: string; back?: string };

/** AI sonucunu nota eklenecek bloğa çevirir: "✨ AI · Özet" başlıklı alıntı bloğu içinde liste. */
export function aiResultToNodes(action: NoteAiAction, items: NoteAiItem[]): NoteNode[] {
  const text = (value: string): NoteNode[] => (value.trim() ? [{ type: "text", text: value.trim() }] : []);
  const listType = action === "questions" ? "orderedList" : "bulletList";
  const list: NoteNode = {
    type: listType,
    content: items.map((item) => ({
      type: "listItem",
      content: action === "flashcards" && item.back
        ? [{ type: "paragraph", content: [{ type: "text", text: "S: ", marks: [{ type: "bold" }] }, ...text(item.front)] }, { type: "paragraph", content: [{ type: "text", text: "C: ", marks: [{ type: "bold" }] }, ...text(item.back)] }]
        : [{ type: "paragraph", content: text(item.front) }],
    })),
  };
  return [{ type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text: `✨ AI · ${NOTE_AI_ACTIONS[action].label}`, marks: [{ type: "bold" }] }] }, list] }];
}

// ---------------------------------------------------------------------------
// Not şablonları (config): başlık + boş bırakılmış bölümler.
// ---------------------------------------------------------------------------
const heading = (text: string): NoteNode => ({ type: "heading", attrs: { level: 3 }, content: [{ type: "text", text }] });
const empty = (): NoteNode => ({ type: "paragraph" });

export type NoteTemplate = { key: string; icon: string; label: string; title: string; tags: string[]; sections: string[] };

export const NOTE_TEMPLATES: NoteTemplate[] = [
  { key: "lesson", icon: "📘", label: "Ders Notu", title: "Ders notu", tags: [], sections: ["Ana fikir", "Önemli bilgiler", "Formüller", "Dikkat", "Tekrar tarihi"] },
  { key: "wrong-question", icon: "❌", label: "Yanlış Soru Notu", title: "Yanlış soru", tags: ["yanlışlarım"], sections: ["Ders / konu", "Soruyu neden yanlış yaptım?", "Doğru yaklaşım", "Bir daha dikkat edeceğim"] },
  { key: "after-exam", icon: "📝", label: "Deneme Sonrası", title: "Deneme sonrası", tags: ["sınav"], sections: ["Deneme", "Yanlışlarım", "Eksiklerim", "Tekrar etmem gerekenler"] },
  { key: "day-end", icon: "🎯", label: "Gün Sonu", title: "Gün sonu", tags: [], sections: ["Bugün ne öğrendim?", "Nerede zorlandım?", "Yarın ne yapacağım?"] },
];

export const templateDoc = (template: NoteTemplate): NoteDoc => ({ type: "doc", content: template.sections.flatMap((section) => [heading(section), empty()]) });
