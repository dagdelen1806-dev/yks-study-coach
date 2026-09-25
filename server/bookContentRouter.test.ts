import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "../drizzle/schema";
import { CURRICULUM } from "../shared/curriculum";
import type { TocRawPage } from "./bookContent/tocParser";

const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/books/paragraf-soru-bankasi/toc-raw.json"), "utf8")) as { pages: TocRawPage[] };
const coverJpeg = `data:image/jpeg;base64,${fs.readFileSync(path.join(__dirname, "fixtures/books/paragraf-soru-bankasi/icindekiler-1.jpeg")).toString("base64")}`;

// Kitap sahipliği: kullanıcı 1'in rafında yalnızca "book-a" var.
const shelves: Record<number, string[]> = { 1: ["book-a"], 2: [] };
const savedCalls: unknown[] = [];
vi.mock("./bookContent/bookContentDb", () => ({
  userOwnsBook: vi.fn(async (userId: number, bookId: string) => (shelves[userId] ?? []).includes(bookId)),
  getMatchableTopics: vi.fn(async () => CURRICULUM.map((def, index) => ({ id: index + 1, ...def }))),
  replaceBookContents: vi.fn(async (...args: unknown[]) => { savedCalls.push(args); return []; }),
  getBookContents: vi.fn(async () => []),
  getBookContentSummaries: vi.fn(async () => []),
  getWeakTopicBookRecommendations: vi.fn(async () => []),
  addRecommendationToPlan: vi.fn(async () => ({ date: "2026-09-25", title: "t", minutes: 30 })),
}));

// OCR sağlayıcısı: gerçek AI yerine fikstürün doğru okuması (sayfa sırasıyla).
const ocrCalls: string[] = [];
vi.mock("./bookContent/ocrProvider", () => ({
  getOcrProvider: () => ({ name: "fixture", extractTableOfContentsPage: vi.fn(async (dataUrl: string) => { ocrCalls.push(dataUrl); return fixture.pages[ocrCalls.length - 1] ?? { items: [] }; }) }),
}));

// Belirsiz başlıklar için AI danışmanı: gerçek LLM yerine, çağrıldığı başlıkları kaydeden sahte.
const aiCalls: string[][] = [];
vi.mock("./bookContent/aiMapper", () => ({
  suggestTopicsWithAi: vi.fn(async (titles: { key: number; text: string }[], candidates: { id: number; topic: string }[]) => {
    aiCalls.push(titles.map((title) => title.text));
    const target = candidates.find((topic) => topic.topic === "Paragrafta Anlam ve Yorum")!;
    return titles.filter((title) => title.text === "Metnin Bütününden Çıkarım").map((title) => ({ key: title.key, topicId: target.id, confidence: 0.8, reason: "Çıkarım soruları." }));
  }),
}));

// Kota/abonelik bu dosyanın konusu değil: premium gibi davran.
vi.mock("./subscriptions/entitlementService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./subscriptions/entitlementService")>()),
  assertUsageAvailable: vi.fn(async () => undefined),
  recordFeatureUsage: vi.fn(async () => undefined),
}));

const { appRouter } = await import("./routers");
import type { TrpcContext } from "./_core/context";

const makeUser = (id: number): User => ({ id, openId: `u-${id}`, email: null, name: null, loginMethod: null, passwordHash: null, emailVerifiedAt: null, emailVerificationSentAt: null, role: "user", approvalStatus: "approved", approvedAt: null, approvedBy: null, rejectedAt: null, rejectionReason: null, accountStatus: "active", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }) as User;
const callerFor = (user: User | null) => appRouter.createCaller({ user, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] } as TrpcContext);
const image = { dataUrl: coverJpeg, mimeType: "image/jpeg" as const };

beforeEach(() => {
  ocrCalls.length = 0;
  savedCalls.length = 0;
});

describe("bookContent router — isolation and authorization", () => {
  it("rejects anonymous callers", async () => {
    await expect(callerFor(null).bookContent.recommendations()).rejects.toThrow(/login/i);
  });

  it("does not let a student read another student's book contents", async () => {
    await expect(callerFor(makeUser(2)).bookContent.contents({ bookId: "book-a" })).rejects.toThrow(/kütüphanende bulunmuyor/);
  });

  it("checks book ownership before spending an OCR call", async () => {
    await expect(callerFor(makeUser(2)).bookContent.readTableOfContents({ bookId: "book-a", subject: "Türkçe", images: [image] })).rejects.toThrow(/kütüphanende bulunmuyor/);
    expect(ocrCalls).toHaveLength(0);
  });

  it("rejects a file that is not really an image", async () => {
    const fake = { dataUrl: `data:image/jpeg;base64,${Buffer.from("not an image at all").toString("base64")}`, mimeType: "image/jpeg" as const };
    await expect(callerFor(makeUser(1)).bookContent.readTableOfContents({ bookId: "book-a", subject: "Türkçe", images: [fake] })).rejects.toThrow(/magic bytes/);
    expect(ocrCalls).toHaveLength(0);
  });

  it("refuses to save contents into a book the student does not own", async () => {
    await expect(callerFor(makeUser(2)).bookContent.save({ bookId: "book-a", subject: "Türkçe", source: "manual", items: [] })).rejects.toThrow(/kütüphanende bulunmuyor/);
    expect(savedCalls).toHaveLength(0);
  });
});

describe("bookContent.readTableOfContents — fixture book end to end", () => {
  it("returns a structured, curriculum-matched preview and saves nothing", async () => {
    const preview = await callerFor(makeUser(1)).bookContent.readTableOfContents({ bookId: "book-a", subject: "Türkçe", images: [image, image] });
    expect(ocrCalls).toHaveLength(2);
    expect(preview.warnings).toEqual([]);
    const unit2 = preview.entries.filter((entry) => entry.unitNumber === 2);
    expect(unit2).toHaveLength(6);
    expect(unit2.every((entry) => entry.suggestion?.topic === "Paragrafta Konu ve Ana Düşünce" && entry.tier === "auto")).toBe(true);
    expect(preview.entries.filter((entry) => entry.contentType === "simulation").every((entry) => entry.tier === "not_applicable")).toBe(true);
    expect(savedCalls).toHaveLength(0);
    // Fikstürdeki her başlık kurallarla çözüldü: AI'ya hiç sorulmadı.
    expect(aiCalls).toHaveLength(0);
  });

  it("asks AI only for headings the rules could not map, and keeps its answer at 'confirm'", async () => {
    aiCalls.length = 0;
    ocrCalls.length = 0;
    fixture.pages.push({ items: [
      { type: "unit", unitNumber: 6, title: "YORUM", label: null, page: null },
      { type: "entry", unitNumber: 6, title: "Metnin Bütününden Çıkarım", label: "Test 1", page: 300 },
      { type: "entry", unitNumber: 6, title: "Zzz Qqq", label: "Test 2", page: 303 },
    ] });
    try {
      const preview = await callerFor(makeUser(1)).bookContent.readTableOfContents({ bookId: "book-a", subject: "Türkçe", images: [image, image, image] });
      expect(aiCalls).toEqual([["Metnin Bütününden Çıkarım", "Zzz Qqq"]]);
      const [inferred, unknown] = preview.entries.filter((entry) => entry.unitNumber === 6);
      expect(inferred).toMatchObject({ tier: "confirm", suggestion: { topic: "Paragrafta Anlam ve Yorum", method: "ai", reason: "Çıkarım soruları." } });
      expect(unknown).toMatchObject({ tier: "manual", suggestion: null });
    } finally {
      fixture.pages.pop();
    }
  });
});
