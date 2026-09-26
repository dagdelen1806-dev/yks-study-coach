import { and, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { noteAttachments } from "../../drizzle/schema";
import { getDb } from "../db";
import { notesConfig } from "./config";

/**
 * Not eki depolaması. Şu anki uygulama: veritabanı (MEDIUMBLOB), kullanıcı
 * kotasıyla. Nesne depolamaya (S3/R2) geçmek için bu arayüzün yeni bir
 * uygulamasını yazmak yeterli; çağıranlar değişmez. Her işlem `userId` ile
 * kapsamlıdır — bir öğrenci başka öğrencinin ekini okuyamaz/silemez.
 */
export interface AttachmentStorage {
  put(userId: number, input: { kind: "image" | "audio"; mimeType: string; data: Buffer; durationSec?: number | null }): Promise<{ id: number }>;
  get(userId: number, id: number): Promise<{ mimeType: string; data: Buffer; kind: "image" | "audio"; noteId: number | null } | null>;
  setOcrText(userId: number, id: number, text: string): Promise<void>;
  /** İçerikte hâlâ geçen ekleri nota bağlar, artık geçmeyenleri ayırır (sonra yetim temizliğiyle silinir). */
  syncNoteLinks(userId: number, noteId: number, referencedIds: number[]): Promise<void>;
  deleteForNote(userId: number, noteId: number): Promise<void>;
  usageBytes(userId: number): Promise<number>;
  cleanupOrphans(userId: number): Promise<void>;
}

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

export const databaseAttachmentStorage: AttachmentStorage = {
  async put(userId, input) {
    const db = await requireDb();
    const used = await this.usageBytes(userId);
    if (used + input.data.byteLength > notesConfig.attachments.perUserQuotaBytes) {
      throw new AttachmentError("Defterindeki ek alanı doldu. Eski notlardaki bazı fotoğraf/ses kayıtlarını silip tekrar dener misin?");
    }
    const result = await db.insert(noteAttachments).values({ userId, kind: input.kind, mimeType: input.mimeType, byteSize: input.data.byteLength, data: input.data, durationSec: input.durationSec ?? null });
    return { id: Number(result[0].insertId) };
  },
  async get(userId, id) {
    const db = await requireDb();
    const [row] = await db.select({ mimeType: noteAttachments.mimeType, data: noteAttachments.data, kind: noteAttachments.kind, noteId: noteAttachments.noteId }).from(noteAttachments).where(and(eq(noteAttachments.id, id), eq(noteAttachments.userId, userId))).limit(1);
    return row ?? null;
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
    const db = await requireDb();
    await db.delete(noteAttachments).where(and(eq(noteAttachments.userId, userId), eq(noteAttachments.noteId, noteId)));
  },
  async usageBytes(userId) {
    const db = await requireDb();
    const [row] = await db.select({ total: sql<string>`COALESCE(SUM(${noteAttachments.byteSize}), 0)` }).from(noteAttachments).where(eq(noteAttachments.userId, userId));
    return Number(row?.total ?? 0);
  },
  async cleanupOrphans(userId) {
    const db = await requireDb();
    await db.delete(noteAttachments).where(and(eq(noteAttachments.userId, userId), isNull(noteAttachments.noteId), lt(noteAttachments.createdAt, new Date(Date.now() - notesConfig.attachments.orphanTtlMs))));
  },
};

export const getAttachmentStorage = (): AttachmentStorage => databaseAttachmentStorage;
