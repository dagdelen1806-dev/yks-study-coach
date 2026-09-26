import type { NoteDoc } from "@shared/noteContent";

// Çevrimdışı taslak deposu: not düzenlenirken her değişiklik ÖNCE burada
// (localStorage) saklanır, sonra sunucuya gönderilir. İnternet kesilir ya da
// sekme kapanırsa not kaybolmaz; bağlantı gelince/defter açılınca eşitlenir.
// Taslak, sunucunun kabul ettiği kayıt biçimini (save girdisi) aynen tutar.

export type NoteDraftPayload = {
  clientId: string;
  title: string;
  content: NoteDoc;
  noteDate: string;
  tags: string[];
  isFavorite?: boolean;
  isPinned?: boolean;
  reviewAt?: string | null;
  templateKey?: string | null;
  subject?: string | null;
  topicId?: number | null;
  bookId?: string | null;
  bookContentId?: number | null;
  studySessionId?: number | null;
  mockExamId?: number | null;
};

export type SyncStatus = "draft" | "syncing" | "synced" | "failed";
export type StoredDraft = { payload: NoteDraftPayload; status: SyncStatus; updatedAt: number; serverId?: number | null };

const PREFIX = "pusula:note-draft:";

export function newClientId(): string {
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().replace(/-/g, "") : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  return `n_${random.slice(0, 30)}`;
}

export function saveDraft(draft: StoredDraft) {
  try { localStorage.setItem(PREFIX + draft.payload.clientId, JSON.stringify(draft)); } catch {}
}

export function readDraft(clientId: string): StoredDraft | null {
  try { return JSON.parse(localStorage.getItem(PREFIX + clientId) ?? "null") as StoredDraft | null; } catch { return null; }
}

export function removeDraft(clientId: string) {
  try { localStorage.removeItem(PREFIX + clientId); } catch {}
}

/** Sunucuya henüz ulaşmamış taslaklar (defter açılınca "eşitlenmemiş not" olarak gösterilir). */
export function listUnsyncedDrafts(): StoredDraft[] {
  const drafts: StoredDraft[] = [];
  try {
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (!key?.startsWith(PREFIX)) continue;
      const draft = JSON.parse(localStorage.getItem(key) ?? "null") as StoredDraft | null;
      if (draft && draft.status !== "synced") drafts.push(draft);
    }
  } catch {}
  return drafts.sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Boş (başlıksız ve içeriksiz) not sunucuya gönderilmez. */
export function isEmptyDraft(payload: NoteDraftPayload): boolean {
  if (payload.title.trim()) return false;
  const hasContent = (node: { type: string; text?: string; content?: unknown[] }): boolean =>
    (node.type === "text" && Boolean(node.text?.trim())) || ["formula", "drawing", "noteImage", "voiceClip", "horizontalRule"].includes(node.type) || (Array.isArray(node.content) && (node.content as typeof node[]).some(hasContent));
  return !hasContent(payload.content as unknown as { type: string; content?: unknown[] });
}
