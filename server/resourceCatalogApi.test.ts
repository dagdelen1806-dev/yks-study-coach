import { beforeEach, describe, expect, it, vi } from "vitest";

type FakeBook = { id: number; name: string; slug: string; publisher: string | null; examScope: string; subject: string | null; bookType: string; imageUrl: string | null; difficultyLabel: string; difficultyScore: number; difficultyConfidence: number; price: number | null; productUrl: string | null };

const allBooks: FakeBook[] = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  name: `Kitap ${i + 1}`,
  slug: `kitap-${i + 1}`,
  publisher: "Test Yayınları",
  examScope: i % 2 === 0 ? "TYT" : "AYT",
  subject: "Matematik",
  bookType: "question_bank",
  imageUrl: null,
  difficultyLabel: i % 3 === 0 ? "easy" : i % 3 === 1 ? "medium" : "hard",
  difficultyScore: 50,
  difficultyConfidence: 0.8,
  price: null,
  productUrl: null,
}));

vi.mock("./resourceCatalog/catalogQueries", () => ({
  listCatalogBooks: vi.fn(async (filters: { exam?: string }, page: { page: number; pageSize: number }) => {
    const filtered = filters.exam ? allBooks.filter((b) => b.examScope === filters.exam) : allBooks;
    const start = (page.page - 1) * page.pageSize;
    return { items: filtered.slice(start, start + page.pageSize), total: filtered.length };
  }),
  getCatalogBookBySlug: vi.fn(async (slug: string) => allBooks.find((b) => b.slug === slug) ?? null),
  listPublishersForFilter: vi.fn(async () => [{ id: 1, name: "Test Yayınları" }]),
  listCatalogBooksForRecommendation: vi.fn(async () => []),
}));

vi.mock("./resourceCatalog/catalogDb", () => ({
  listNeedsReviewBooks: vi.fn(async () => []),
  listResourceCatalogSyncLogs: vi.fn(async () => []),
  approveCatalogBookClassification: vi.fn(async () => undefined),
  setManualDifficulty: vi.fn(async () => undefined),
  markCatalogBookNeedsReview: vi.fn(async () => undefined),
}));

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, getUserTopicProgress: vi.fn(async () => []) };
});

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function callerFor(role: "user" | "admin") {
  const ctx = {
    user: { id: 1, openId: "user-1", email: null, name: null, loginMethod: null, role, approvalStatus: "approved" as const, approvedAt: null, approvedBy: null, rejectedAt: null, rejectionReason: null, accountStatus: "active" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as unknown as TrpcContext["res"],
  } as TrpcContext;
  return appRouter.createCaller(ctx);
}

function anonymousCaller() {
  const ctx = { user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] } as TrpcContext;
  return appRouter.createCaller(ctx);
}

describe("catalog.list", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sayfalama uygular, 4.000+ satırı tek seferde döndürmez", async () => {
    const caller = anonymousCaller();
    const page1 = await caller.catalog.list({ page: 1, pageSize: 10 });
    expect(page1.items).toHaveLength(10);
    expect(page1.total).toBe(25);
    expect(page1.totalPages).toBe(3);
  });

  it("giriş yapmamış kullanıcı da katalogu görebilir (public procedure)", async () => {
    const caller = anonymousCaller();
    await expect(caller.catalog.list({ page: 1, pageSize: 5 })).resolves.toBeDefined();
  });

  it("exam filtresini uygular", async () => {
    const caller = anonymousCaller();
    const result = await caller.catalog.list({ page: 1, pageSize: 50, exam: "AYT" });
    expect(result.items.every((item) => item.examScope === "AYT")).toBe(true);
  });

  it("sayfa boyutu üst sınırın (60) üzerine çıkamaz", async () => {
    const caller = anonymousCaller();
    await expect(caller.catalog.list({ page: 1, pageSize: 500 })).rejects.toThrow();
  });
});

describe("catalog.admin — yetkilendirme", () => {
  it("admin olmayan kullanıcı review kuyruğuna erişemez (FORBIDDEN)", async () => {
    const caller = callerFor("user");
    await expect(caller.catalog.admin.needsReview()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("admin olmayan kullanıcı zorluk override yapamaz", async () => {
    const caller = callerFor("user");
    await expect(caller.catalog.admin.setDifficulty({ bookId: 1, label: "hard", score: 90 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("giriş yapmamış kullanıcı admin uçlarına erişemez", async () => {
    const caller = anonymousCaller();
    await expect(caller.catalog.admin.needsReview()).rejects.toBeDefined();
  });

  it("admin kullanıcı review kuyruğuna erişebilir", async () => {
    const caller = callerFor("admin");
    await expect(caller.catalog.admin.needsReview()).resolves.toEqual([]);
  });

  it("admin kullanıcı zorluğu manuel override edebilir", async () => {
    const caller = callerFor("admin");
    await expect(caller.catalog.admin.setDifficulty({ bookId: 1, label: "hard", score: 90 })).resolves.toBeUndefined();
  });
});

describe("catalog.recommendations", () => {
  it("giriş yapmamış kullanıcı öneri alamaz (protected procedure)", async () => {
    const caller = anonymousCaller();
    await expect(caller.catalog.recommendations({})).rejects.toBeDefined();
  });

  it("giriş yapmış kullanıcı boş performans verisiyle boş/geçerli bir dizi alır", async () => {
    const caller = callerFor("user");
    const result = await caller.catalog.recommendations({});
    expect(Array.isArray(result)).toBe(true);
  });
});
