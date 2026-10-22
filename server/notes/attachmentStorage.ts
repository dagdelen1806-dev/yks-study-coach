import { randomUUID } from "node:crypto";
import { and, eq, inArray, isNull, lt, sql, type SQL } from "drizzle-orm";
import { noteAttachments } from "../../drizzle/schema";
import { getDb } from "../db";
import { getMediaBlobStore } from "../storage/supabaseStorage";
import { notesConfig } from "./config";

/**
 * Defter ve Duvarım eklerinin (fotoğraf/ses) depolaması. Ekin kaydı (sahip, tür, boyut, bağlı
 * olduğu not/duvar kaydı) her zaman veritabanında; baytlar Supabase Storage ayarlıysa oradaki özel
 * bucket'ta (`storageKey`), değilse veritabanında (`data`). Her işlem `userId` ile kapsamlıdır —
 * bir öğrenci başka öğrencinin ekini okuyamaz/silemez. Kota iki modda da aynı.
 */
export interface AttachmentStorage {
  put(userId: number, input: { kind: "image" | "audio"; mimeType: string; data: Buffer; durationSec?: number | null }): Promise<{ id: number }>;
  /** Baytlarıyla (AI okuması, ses → metin için); Supabase'deyse indirilir. */
  get(userId: number, id: number): Promise<{ mimeType: string; data: Buffer; kind: "image" | "audio"; noteId: number | null } | null>;
  /** Tarayıcıya sunmak için: Supabase'deyse kısa süreli imzalı bağlantı, değilse baytlar. */
  locate(userId: number, id: number): Promise<{ mimeType: string; url: string } | { mimeType: string; data: Buffer } | null>;
  setOcrText(userId: number, id: number, text: string): Promise<void>;
  /** İçerikte hâlâ geçen ekleri nota bağlar, artık geçmeyenleri ayırır (sonra yetim temizliğiyle silinir). */
  syncNoteLinks(userId: number, noteId: number, referencedIds: number[]): Promise<void>;
  deleteForNote(userId: number, noteId: number): Promise<void>;
  /** Duvarım kaydı için aynı bağlama/silme. */
  syncWallPostLinks(userId: number, wallPostId: number, referencedIds: number[]): Promise<void>;
  deleteForWallPost(userId: number, wallPostId: number): Promise<void>;
  usageBytes(userId: number): Promise<number>;
  cleanupOrphans(userId: number): Promise<void>;
}

/** İmzalı bağlantının ömrü (sn). Tarayıcı önbelleği bundan kısa tutulur. */
export const SIGNED_URL_TTL_SEC = 600;

export class AttachmentError extends Error {}

type Signature = { mime: string; test: (bytes: Buffer) => boolean };
const ascii = (bytes: Buffer, start: number, end: number) => bytes.subarray(start, end).toString("ascii");
const SIGNATURES: Signature[] = [
  { mime: "image/jpeg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/png", test: (b) => b[0] === 0x89 && ascii(b, 1, 4) === "PNG" },
  { mime: "image/webp", test: (b) => ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WEBP" },
  { mime: "audio/webm", test: (b) => b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3 },
  { mime: "audio/ogg", test: (b) => ascii(b, 0, 4) === "OggS" },
  { mime: "audio/mp4", test: (b) => ascii(b, 4, 8) === "ftyp" },
  { mime: "audio/mpeg", test: (b) => ascii(b, 0, 3) === "ID3" || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0) },
  { mime: "audio/wav", test: (b) => ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WAVE" },
];

/**
 * data URL'yi çözer; beyan edilen tür izinli mi ve baytlar GERÇEKTEN o türe mi
 * ait (magic bytes), boyut sınırın altında mı — hepsini sunucuda doğrular.
 */
export function decodeAttachment(dataUrl: string, kind: "image" | "audio"): { mimeType: string; data: Buffer } {
  const match = /^data:([^;,]+)(?:;[^,]*)?;base64,([\s\S]+)$/.exec(dataUrl);
  if (!match) throw new AttachmentError("Geçersiz dosya biçimi.");
  const mimeType = match[1].toLowerCase();
  const allowed: readonly string[] = kind === "image" ? notesConfig.attachments.imageMimeTypes : notesConfig.attachments.audioMimeTypes;
  if (!allowed.includes(mimeType)) throw new AttachmentError(kind === "image" ? "Yalnızca JPG, PNG veya WEBP fotoğraf eklenebilir." : "Bu ses biçimi desteklenmiyor.");
  const data = Buffer.from(match[2], "base64");
  if (data.byteLength === 0) throw new AttachmentError("Dosya boş.");
  const maxBytes = kind === "image" ? notesConfig.attachments.imageMaxBytes : notesConfig.attachments.audioMaxBytes;
  if (data.byteLength > maxBytes) throw new AttachmentError(kind === "image" ? "Fotoğraf çok büyük; daha küçük bir fotoğraf dener misin?" : "Ses kaydı çok uzun; daha kısa bir kayıt dener misin?");
  const signature = SIGNATURES.find((item) => item.mime === mimeType);
  if (!signature || !signature.test(data)) throw new AttachmentError("Dosya içeriği bildirilen türle eşleşmiyor.");
  return { mimeType, data };
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new AttachmentError("Veritabanı bağlantısı yok.");
  return db;
}

const EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "audio/webm": "webm", "audio/ogg": "ogg", "audio/mp4": "m4a", "audio/mpeg": "mp3", "audio/wav": "wav" };

/** Satırları siler; Supabase'deki dosyaları da kaldırır (dosya silinemezse kayıt yine silinir, hata günlüğe düşer). */
async function deleteRows(where: SQL | undefined) {
  const db = await requireDb();
  const removed = await db.delete(noteAttachments).where(where).returning({ storageKey: noteAttachments.storageKey });
  const keys = removed.map((row) => row.storageKey).filter((key): key is string => Boolean(key));
  const store = getMediaBlobStore();
  if (keys.length && store) await store.remove(keys).catch((error) => console.error("[Attachments] storage delete failed:", error instanceof Error ? error.message : error));
}

export const databaseAttachmentStorage: AttachmentStorage = {
  async put(userId, input) {
    const db = await requireDb();
    const used = await this.usageBytes(userId);
    if (used + input.data.byteLength > notesConfig.attachments.perUserQuotaBytes) {
      throw new AttachmentError("Ek alanın doldu. Eski not ya da duvar kayıtlarındaki bazı fotoğraf/ses kayıtlarını silip tekrar dener misin?");
    }
    const store = getMediaBlobStore();
    let storageKey: string | null = null;
    if (store) {
      storageKey = `u${userId}/${input.kind}/${randomUUID()}.${EXTENSIONS[input.mimeType] ?? "bin"}`;
      try {
        await store.put(storageKey, input.mimeType, input.data);
      } catch (error) {
        console.error("[Attachments] storage upload failed:", error instanceof Error ? error.message : error);
        throw new AttachmentError("Dosya yüklenemedi. Biraz sonra tekrar dener misin?");
      }
    }
    const result = await db.insert(noteAttachments).values({ userId, kind: input.kind, mimeType: input.mimeType, byteSize: input.data.byteLength, data: storageKey ? null : input.data, storageKey, durationSec: input.durationSec ?? null }).returning({ id: noteAttachments.id });
    return { id: Number(result[0].id) };
  },
  async get(userId, id) {
    const db = await requireDb();
    const [row] = await db.select({ mimeType: noteAttachments.mimeType, data: noteAttachments.data, storageKey: noteAttachments.storageKey, kind: noteAttachments.kind, noteId: noteAttachments.noteId }).from(noteAttachments).where(and(eq(noteAttachments.id, id), eq(noteAttachments.userId, userId))).limit(1);
    if (!row) return null;
    const store = getMediaBlobStore();
    const data = row.data ?? (row.storageKey && store ? await store.get(row.storageKey) : null);
    if (!data) return null;
    return { mimeType: row.mimeType, data, kind: row.kind, noteId: row.noteId };
  },
  async locate(userId, id) {
    const db = await requireDb();
    const [row] = await db.select({ mimeType: noteAttachments.mimeType, data: noteAttachments.data, storageKey: noteAttachments.storageKey }).from(noteAttachments).where(and(eq(noteAttachments.id, id), eq(noteAttachments.userId, userId))).limit(1);
    if (!row) return null;
    if (row.data) return { mimeType: row.mimeType, data: row.data };
    const store = getMediaBlobStore();
    if (!row.storageKey || !store) return null;
    return { mimeType: row.mimeType, url: await store.signedUrl(row.storageKey, SIGNED_URL_TTL_SEC) };
  },
  async setOcrText(userId, id, text) {
    const db = await requireDb();
    await db.update(noteAttachments).set({ ocrText: text }).where(and(eq(noteAttachments.id, id), eq(noteAttachments.userId, userId)));
  },
  async syncNoteLinks(userId, noteId, referencedIds) {
    const db = await requireDb();
    // Bu notta olup artık içerikte geçmeyenler ayrılır (geri al ile geri gelirse bir sonraki kayıtta yeniden bağlanır).
    await db.update(noteAttachments).set({ noteId: null }).where(and(eq(noteAttachments.userId, userId), eq(noteAttachments.noteId, noteId)));
    if (referencedIds.length) {
      await db.update(noteAttachments).set({ noteId }).where(and(eq(noteAttachments.userId, userId), inArray(noteAttachments.id, referencedIds)));
    }
  },
  async deleteForNote(userId, noteId) {
    await deleteRows(and(eq(noteAttachments.userId, userId), eq(noteAttachments.noteId, noteId)));
  },
  async syncWallPostLinks(userId, wallPostId, referencedIds) {
    const db = await requireDb();
    await db.update(noteAttachments).set({ wallPostId: null }).where(and(eq(noteAttachments.userId, userId), eq(noteAttachments.wallPostId, wallPostId)));
    if (referencedIds.length) {
      await db.update(noteAttachments).set({ wallPostId }).where(and(eq(noteAttachments.userId, userId), inArray(noteAttachments.id, referencedIds)));
    }
  },
  async deleteForWallPost(userId, wallPostId) {
    // Aynı ek bir deftere notunda da kullanılıyorsa silinmez, yalnızca duvardan ayrılır.
    const db = await requireDb();
    await db.update(noteAttachments).set({ wallPostId: null }).where(and(eq(noteAttachments.userId, userId), eq(noteAttachments.wallPostId, wallPostId), sql`${noteAttachments.noteId} IS NOT NULL`));
    await deleteRows(and(eq(noteAttachments.userId, userId), eq(noteAttachments.wallPostId, wallPostId)));
  },
  async usageBytes(userId) {
    const db = await requireDb();
    const [row] = await db.select({ total: sql<string>`COALESCE(SUM(${noteAttachments.byteSize}), 0)` }).from(noteAttachments).where(eq(noteAttachments.userId, userId));
    return Number(row?.total ?? 0);
  },
  async cleanupOrphans(userId) {
    await deleteRows(and(eq(noteAttachments.userId, userId), isNull(noteAttachments.noteId), isNull(noteAttachments.wallPostId), lt(noteAttachments.createdAt, new Date(Date.now() - notesConfig.attachments.orphanTtlMs))));
  },
};

export const getAttachmentStorage = (): AttachmentStorage => databaseAttachmentStorage;
