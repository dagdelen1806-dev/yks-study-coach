import express from "express";
import type { AddressInfo } from "node:net";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "../drizzle/schema";

// notesDb: her çağrının hangi kullanıcıyla yapıldığını kaydeden sahte.
const calls: Array<{ fn: string; userId: number; args: unknown[] }> = [];
const record = (fn: string, result: unknown) => vi.fn(async (userId: number, ...args: unknown[]) => { calls.push({ fn, userId, args }); return result; });
vi.mock("./notes/notesDb", () => ({
  NoteError: class NoteError extends Error {},
  saveNote: record("saveNote", { id: 5, clientId: "n_abcdefgh", version: 1, title: "t", updatedAt: new Date() }),
  getNote: vi.fn(async (userId: number, id: number) => (userId === 1 && id === 5 ? { id: 5, plainText: "Fotosentez ışık enerjisini kimyasal enerjiye dönüştürür." } : null)),
  listNotes: record("listNotes", { items: [], nextCursor: null }),
  updateNoteFlags: record("updateNoteFlags", undefined),
  deleteNote: record("deleteNote", undefined),
  getNoteCalendar: record("getNoteCalendar", { notes: [], reviews: [] }),
  listTags: record("listTags", []),
  createTaskFromNote: record("createTaskFromNote", { date: "2026-09-26", title: "t", minutes: 30 }),
}));

// Ek deposu: kullanıcıya göre kapsamlı bellek-içi sahte.
const stored = new Map<number, { userId: number; mimeType: string; data: Buffer; kind: "image" | "audio"; durationSec?: number | null }>();
let nextAttachmentId = 100;
vi.mock("./notes/attachmentStorage", async (importOriginal) => {
  const original = await importOriginal<typeof import("./notes/attachmentStorage")>();
  const storage = {
    put: vi.fn(async (userId: number, input: { kind: "image" | "audio"; mimeType: string; data: Buffer; durationSec?: number | null }) => { const id = nextAttachmentId++; stored.set(id, { userId, ...input }); return { id }; }),
    get: vi.fn(async (userId: number, id: number) => { const row = stored.get(id); return row && row.userId === userId ? { mimeType: row.mimeType, data: row.data, kind: row.kind, noteId: null } : null; }),
    setOcrText: vi.fn(async () => undefined),
    syncNoteLinks: vi.fn(async () => undefined),
    deleteForNote: vi.fn(async () => undefined),
    usageBytes: vi.fn(async () => 0),
    cleanupOrphans: vi.fn(async () => undefined),
  };
  return { ...original, getAttachmentStorage: () => storage };
});

let speechMode: "ok" | "unconfigured" = "ok";
vi.mock("./notes/speechProvider", async (importOriginal) => {
  const original = await importOriginal<typeof import("./notes/speechProvider")>();
  return {
    ...original,
    getSpeechProvider: () => ({
      name: "fake",
      transcribe: vi.fn(async () => {
        if (speechMode === "unconfigured") throw new original.SpeechToTextError("Ses → metin servisi şu an yapılandırılmamış.", false);
        return { text: "Paragrafta ana düşünce sorularında önce genel mesajı bul.", durationSec: 4 };
      }),
    }),
  };
});

const aiInvoke = vi.fn(async () => ({ choices: [{ message: { content: JSON.stringify({ items: [{ front: "Fotosentez nedir?", back: "Işık → kimyasal enerji" }] }) } }] }));
vi.mock("./_core/llm", async (importOriginal) => ({ ...(await importOriginal<typeof import("./_core/llm")>()), invokeLLM: (...args: unknown[]) => (aiInvoke as (...a: unknown[]) => unknown)(...args) }));
vi.mock("./subscriptions/entitlementService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./subscriptions/entitlementService")>()),
  assertUsageAvailable: vi.fn(async () => undefined),
  recordFeatureUsage: vi.fn(async () => undefined),
}));

// Ek ucu için oturum: "x-test-user" başlığındaki kullanıcı.
vi.mock("./_core/sdk", () => ({ sdk: { authenticateRequest: vi.fn(async (req: { headers: Record<string, string | undefined> }) => { const id = Number(req.headers["x-test-user"]); if (!id) throw new Error("no session"); return { id }; }) } }));

const { appRouter } = await import("./routers");
const { registerNoteAttachmentRoutes } = await import("./notes/attachmentRoutes");
import type { TrpcContext } from "./_core/context";

const makeUser = (id: number): User => ({ id, openId: `u-${id}`, email: null, name: null, loginMethod: "dev_email", passwordHash: null, emailVerifiedAt: new Date(), emailVerificationSentAt: null, role: "user", approvalStatus: "approved", approvedAt: null, approvedBy: null, rejectedAt: null, rejectionReason: null, accountStatus: "active", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }) as User;
const callerFor = (user: User | null) => appRouter.createCaller({ user, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] } as TrpcContext);
const webm = `data:audio/webm;codecs=opus;base64,${Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 9, 9, 9]).toString("base64")}`;
const jpeg = `data:image/jpeg;base64,${Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2]).toString("base64")}`;
const doc = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "not" }] }] };

beforeEach(() => { calls.length = 0; speechMode = "ok"; });

describe("notes router — authorization and student isolation", () => {
  it("rejects anonymous callers on every endpoint", async () => {
    await expect(callerFor(null).notes.list({})).rejects.toThrow(/login/i);
    await expect(callerFor(null).notes.save({ clientId: "n_abcdefgh", title: "", content: doc, noteDate: new Date().toISOString(), tags: [] })).rejects.toThrow(/login/i);
  });

  it("always scopes data access to the signed-in student", async () => {
    await callerFor(makeUser(2)).notes.list({ q: "ana düşünce" });
    await callerFor(makeUser(2)).notes.save({ clientId: "n_abcdefgh", title: "", content: doc, noteDate: new Date().toISOString(), tags: ["önemli"], topicId: 7 });
    await callerFor(makeUser(2)).notes.delete({ id: 5 });
    await callerFor(makeUser(2)).notes.createTask({ id: 5, when: "auto" });
    expect(calls.map((call) => [call.fn, call.userId])).toEqual([["listNotes", 2], ["saveNote", 2], ["deleteNote", 2], ["createTaskFromNote", 2]]);
  });

  it("another student's note is simply not found", async () => {
    await expect(callerFor(makeUser(2)).notes.get({ id: 5 })).rejects.toThrow(/bulunamadı/);
    await expect(callerFor(makeUser(2)).notes.ai({ id: 5, action: "summarize" })).rejects.toThrow(/bulunamadı/);
    expect(aiInvoke).not.toHaveBeenCalled();
  });

  it("rejects a malformed client id (duplicate-prevention key)", async () => {
    await expect(callerFor(makeUser(1)).notes.save({ clientId: "../../etc", title: "", content: doc, noteDate: new Date().toISOString(), tags: [] })).rejects.toThrow();
  });
});

describe("notes router — voice, image, AI", () => {
  it("transcribes Turkish speech and keeps the audio only when asked", async () => {
    const kept = await callerFor(makeUser(1)).notes.transcribe({ dataUrl: webm, durationSec: 4.2, keepAudio: true });
    expect(kept).toMatchObject({ text: expect.stringContaining("ana düşünce"), durationSec: 4, attachmentId: expect.any(Number) });
    const notKept = await callerFor(makeUser(1)).notes.transcribe({ dataUrl: webm, durationSec: 4, keepAudio: false });
    expect(notKept.attachmentId).toBeNull();
  });

  it("gives a clear message when speech-to-text is not configured", async () => {
    speechMode = "unconfigured";
    await expect(callerFor(makeUser(1)).notes.transcribe({ dataUrl: webm, durationSec: 3, keepAudio: false })).rejects.toThrow(/yapılandırılmamış/);
  });

  it("stores an uploaded photo for its owner only", async () => {
    const { id } = await callerFor(makeUser(1)).notes.uploadImage({ dataUrl: jpeg });
    expect(stored.get(id)?.userId).toBe(1);
    await expect(callerFor(makeUser(2)).notes.extractText({ attachmentId: id })).rejects.toThrow(/Fotoğraf bulunamadı/);
  });

  it("AI output comes back as a block to append, never overwriting the note", async () => {
    const result = await callerFor(makeUser(1)).notes.ai({ id: 5, action: "flashcards" });
    expect(result.items).toEqual([{ front: "Fotosentez nedir?", back: "Işık → kimyasal enerji" }]);
    expect(result.nodes[0].type).toBe("blockquote");
  });
});

describe("GET /api/notes/attachments/:id", () => {
  const serve = async () => {
    const app = express();
    registerNoteAttachmentRoutes(app);
    const server = app.listen(0);
    const { port } = server.address() as AddressInfo;
    return { base: `http://127.0.0.1:${port}`, close: () => new Promise((resolve) => server.close(resolve)) };
  };

  it("serves the file to its owner, 404 to others, 401 without a session", async () => {
    const id = nextAttachmentId++;
    stored.set(id, { userId: 1, mimeType: "image/jpeg", data: Buffer.from([0xff, 0xd8, 0xff]), kind: "image" });
    const { base, close } = await serve();
    try {
      const owner = await fetch(`${base}/api/notes/attachments/${id}`, { headers: { "x-test-user": "1" } });
      expect(owner.status).toBe(200);
      expect(owner.headers.get("content-type")).toBe("image/jpeg");
      expect(owner.headers.get("cache-control")).toContain("private");
      expect((await fetch(`${base}/api/notes/attachments/${id}`, { headers: { "x-test-user": "2" } })).status).toBe(404);
      expect((await fetch(`${base}/api/notes/attachments/${id}`)).status).toBe(401);
    } finally {
      await close();
    }
  });
});
