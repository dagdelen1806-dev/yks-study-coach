import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "../drizzle/schema";
import { CURRICULUM } from "../shared/curriculum";
import type { TocRawPage } from "./bookContent/tocParser";

const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/books/paragraf-soru-bankasi/toc-raw.json"), "utf8")) as { pages: TocRawPage[] };
// Router mantığı testleri PNG kullanır: PNG'de ön işleme yapılmaz, her görsel tek okumadan geçer ve sahte
// sağlayıcı hangi sayfanın okunduğunu görselin kendisinden anlar. Çoklu okuma zinciri (gerçek JPEG) aşağıda ayrıca test edilir.
const pngPage = (index: number) => `data:image/png;base64,${Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from(`page-${index}-padding-bytes`)]).toString("base64")}`;
const pageIndexOf = (dataUrl: string) => { const match = /page-(\d+)/.exec(Buffer.from(dataUrl.split(",")[1], "base64").toString("latin1")); return match ? Number(match[1]) : -1; };
const tocJpeg = `data:image/jpeg;base64,${fs.readFileSync(path.join(__dirname, "fixtures/books/paragraf-soru-bankasi/icindekiler-1.jpeg")).toString("base64")}`;
// Fikstür satırlarına sağlayıcının net okuma güveni eklenir (gerçek sağlayıcı her satır için döndürür).
const confident = (page: TocRawPage): TocRawPage => ({ ...page, items: page.items.map((item) => ({ ...item, confidence: 0.95 })) });

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
const ocrHints: Array<{ issues: string[] } | undefined> = [];
// Varsayılan: görseldeki n. sayfa → fikstürün n. sayfası; testler kendi cevaplayıcısını koyabilir.
let ocrResponder: (pageIndex: number, hint?: { issues: string[] }, callIndex?: number) => TocRawPage = (pageIndex) => confident(fixture.pages[pageIndex] ?? { items: [] });
vi.mock("./bookContent/ocrProvider", () => ({
  getOcrProvider: () => ({ name: "fixture", extractTableOfContentsPage: vi.fn(async (dataUrl: string, hint?: { issues: string[] }) => { ocrCalls.push(dataUrl); ocrHints.push(hint); return ocrResponder(pageIndexOf(dataUrl), hint, ocrCalls.length - 1); }) }),
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

// Dakikalık hız sınırı da bu dosyanın konusu değil (aynı kullanıcı çok sayıda tarama yapıyor).
// Önbellek veritabanı bu testlerin konusu değil.
vi.mock("./bookContent/ocrCache", () => ({ imageHash: () => "hash", readOcrCache: vi.fn(async () => null), writeOcrCache: vi.fn(async () => undefined) }));

vi.mock("./_core/rateLimit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./_core/rateLimit")>()),
  checkRateLimit: vi.fn(() => undefined),
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
const image = { dataUrl: pngPage(0), mimeType: "image/png" as const };
const imageAt = (index: number) => ({ dataUrl: pngPage(index), mimeType: "image/png" as const });

beforeEach(() => {
  ocrCalls.length = 0;
  ocrHints.length = 0;
  savedCalls.length = 0;
  ocrResponder = (pageIndex) => confident(fixture.pages[pageIndex] ?? { items: [] });
});

describe("bookContent.readTableOfContents — wrong photos and corrective re-read", () => {
  const unit1 = (pages: Array<number | null>): TocRawPage => ({ pageKind: "table_of_contents", items: [
    { type: "unit", unitNumber: 1, title: "PARAGRAFTA ANLATIM", label: null, page: null },
    ...pages.map((page, index) => ({ type: "entry" as const, unitNumber: 1, title: "Paragrafta Anlatım", label: `Test ${index + 1}`, page, pageText: page === null ? null : String(page), confidence: 0.95 })),
  ] });

  it("tells the student when only the cover was photographed instead of the contents", async () => {
    ocrResponder = () => ({ pageKind: "cover", items: [] });
    await expect(callerFor(makeUser(1)).bookContent.readTableOfContents({ bookId: "book-a", subject: "Türkçe", images: [image] })).rejects.toThrow(/kapağı.*İÇİNDEKİLER/);
  });

  it("skips a cover photo mixed into the contents photos and says so", async () => {
    ocrResponder = (pageIndex) => (pageIndex === 0 ? { pageKind: "cover", items: [] } : unit1([9, 12, 15]));
    const preview = await callerFor(makeUser(1)).bookContent.readTableOfContents({ bookId: "book-a", subject: "Türkçe", images: [imageAt(0), imageAt(1)] });
    expect(preview.warnings).toContain("1. fotoğraf kitap kapağı gibi görünüyor; atlandı.");
    expect(preview.entries).toHaveLength(3);
  });

  it("re-reads a page whose page numbers came out inconsistent and uses the corrected read", async () => {
    // İlk okuma: eğik fotoğraf yüzünden numaralar kaymış (12, 9) ve biri eksik.
    ocrResponder = (_pageIndex, hint) => (hint ? unit1([9, 12, 15]) : unit1([12, 9, null]));
    const preview = await callerFor(makeUser(1)).bookContent.readTableOfContents({ bookId: "book-a", subject: "Türkçe", images: [image] });
    expect(ocrCalls).toHaveLength(2);
    expect(ocrHints[1]?.issues.join(" ")).toMatch(/artmalı/);
    expect(preview.warnings).toContain("1. sayfa: Sayfa numarası tutarsızlığı yeniden okunarak düzeltildi.");
    expect(preview.entries.map((entry) => entry.pageStart)).toEqual([9, 12, 15]);
  });

  it("keeps the first read when the re-read is not better", async () => {
    ocrResponder = () => unit1([12, 9, 15]);
    const preview = await callerFor(makeUser(1)).bookContent.readTableOfContents({ bookId: "book-a", subject: "Türkçe", images: [image] });
    expect(ocrCalls).toHaveLength(2);
    expect(preview.warnings.some((warning) => warning.includes("Sayfa sırası tutarsız"))).toBe(true);
  });
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
    const preview = await callerFor(makeUser(1)).bookContent.readTableOfContents({ bookId: "book-a", subject: "Türkçe", images: [imageAt(0), imageAt(1)] });
    expect(ocrCalls).toHaveLength(2);
    expect(preview.warnings).toEqual([]);
    expect(preview.confidence.needsReview).toBe(false);
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
      const preview = await callerFor(makeUser(1)).bookContent.readTableOfContents({ bookId: "book-a", subject: "Türkçe", images: [imageAt(0), imageAt(1), imageAt(2)] });
      expect(aiCalls).toEqual([["Metnin Bütününden Çıkarım", "Zzz Qqq"]]);
      const [inferred, unknown] = preview.entries.filter((entry) => entry.unitNumber === 6);
      expect(inferred).toMatchObject({ tier: "confirm", suggestion: { topic: "Paragrafta Anlam ve Yorum", method: "ai", reason: "Çıkarım soruları." } });
      expect(unknown).toMatchObject({ tier: "manual", suggestion: null });
    } finally {
      fixture.pages.pop();
    }
  });
});

describe("bookContent.readTableOfContents — real photo through the multi-pass pipeline", () => {
  it("photo → quality → adaptive preprocessing → multi-pass OCR → consensus → structure → curriculum", async () => {
    // Gerçek içindekiler fotoğrafı (JPEG). Sahte sağlayıcı her geçişte aynı sayfayı okur ama
    // ikinci geçiş Türkçe karakterleri kaybetmiş gibi davranır ("Düşünce" → "Dusunce") ve
    // bir sayfa numarasını yanlış okur; uzlaşı doğru metni korumalı ve belirsiz sayfayı işaretlemeli.
    const truth = fixture.pages[0];
    ocrResponder = (_pageIndex, _hint, callIndex) => {
      if (callIndex !== 1) return confident(truth);
      return confident({ ...truth, items: truth.items.map((item) => ({ ...item, title: item.title.replace(/Düşünce/g, "Dusunce").replace(/DÜŞÜNCE/g, "DUSUNCE"), page: item.label === "Test 3" && item.unitNumber === 1 ? 81 : item.page })) });
    };
    const preview = await callerFor(makeUser(1)).bookContent.readTableOfContents({ bookId: "book-a", subject: "Türkçe", images: [{ dataUrl: tocJpeg, mimeType: "image/jpeg" }] });
    const page = preview.report.pages[0];
    expect(page.quality).not.toBeNull();
    expect(page.passes.filter((pass) => pass.status === "ok").length).toBeGreaterThanOrEqual(2);
    expect(page.passes.find((pass) => pass.variantId === "B_enhanced")?.applied).toContain("illumination");
    expect(page.rawText.length).toBeGreaterThan(50);
    // Türkçe karakterler korundu (oyda eşitlik → Türkçe karakterli okuma).
    const unit2 = preview.entries.filter((entry) => entry.unitNumber === 2);
    expect(unit2.length).toBeGreaterThan(0);
    expect(unit2.every((entry) => entry.title.includes("Düşünce"))).toBe(true);
    expect(unit2.every((entry) => entry.suggestion?.topic === "Paragrafta Konu ve Ana Düşünce")).toBe(true);
    // Geçişler arasında çelişen sayfa numarası doğrulamaya düşer.
    const disputed = preview.entries.find((entry) => entry.unitNumber === 1 && entry.label === "Test 3");
    expect(disputed?.review.page).toBe(true);
    expect(disputed?.needsReview).toBe(true);
    expect(preview.confidence.finalConfidence).toBeGreaterThan(0);
  }, 60_000);
});
