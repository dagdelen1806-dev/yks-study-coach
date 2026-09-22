import { beforeEach, describe, expect, it, vi } from "vitest";

// Regression coverage for the Kaynak Kataloğu → Kütüphane → Takvim → Pusula
// Odak → AI Planım wiring: "Kütüphaneme ekle" reuses the existing
// resources.addBook/removeBook mutations (no new library model), calendar
// sessions can be created manually with `source: "manual"`, and
// `catalog.myLibrary` is auth-gated like every other per-user endpoint.

const savePlanCalls: unknown[] = [];

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    saveStudyPlan: vi.fn(async (userId: number, input: unknown) => {
      savePlanCalls.push({ userId, input });
      return { plans: [], sessions: [], logs: [] };
    }),
    getBookInventory: vi.fn(async () => []),
    addBookToInventory: vi.fn(async (userId: number, bookId: string) => ({ id: 1, userId, bookId, addedAt: new Date(), removedAt: null })),
    removeBookFromInventory: vi.fn(async () => undefined),
  };
});

vi.mock("./resourceCatalog/catalogQueries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./resourceCatalog/catalogQueries")>();
  return { ...actual, listMyLibraryCatalogBooks: vi.fn(async () => []) };
});

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function callerFor(userId: number) {
  const ctx = {
    user: { id: userId, openId: `user-${userId}`, email: null, name: null, loginMethod: null, role: "user" as const, approvalStatus: "approved" as const, approvedAt: null, approvedBy: null, rejectedAt: null, rejectionReason: null, accountStatus: "active" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as unknown as TrpcContext["res"],
  } as TrpcContext;
  return appRouter.createCaller(ctx);
}

function anonymousCaller() {
  const ctx = { user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] } as TrpcContext;
  return appRouter.createCaller(ctx);
}

describe("Kaynak Kataloğu → Kütüphane (resources.addBook reuse)", () => {
  it("kataloğdan seçilen kitap mevcut resources.addBook mutasyonuyla kütüphaneye eklenir (yeni model yok)", async () => {
    const caller = callerFor(1);
    const result = await caller.resources.addBook({ bookId: "482" });
    expect(result).toMatchObject({ bookId: "482" });
  });

  it("giriş yapmamış kullanıcı kütüphaneme ekleyemez", async () => {
    await expect(anonymousCaller().resources.addBook({ bookId: "482" })).rejects.toBeDefined();
  });
});

describe("catalog.myLibrary — auth gating", () => {
  it("giriş yapmamış kullanıcı erişemez", async () => {
    await expect(anonymousCaller().catalog.myLibrary()).rejects.toBeDefined();
  });

  it("giriş yapmış kullanıcı boş kütüphane için boş dizi alır", async () => {
    await expect(callerFor(1).catalog.myLibrary()).resolves.toEqual([]);
  });
});

describe("Kütüphanemden oturum ekle → calendar.savePlan(source: manual)", () => {
  beforeEach(() => savePlanCalls.length = 0);

  it("manuel oturum eklerken source='manual' olarak db katmanına iletilir", async () => {
    const caller = callerFor(1);
    await caller.calendar.savePlan({
      title: "Kütüphanemden oturum",
      weekStart: new Date().toISOString(),
      weekEnd: new Date(Date.now() + 86400000).toISOString(),
      summary: "Test kaynağından manuel oturum.",
      source: "manual",
      sessions: [{ sessionDate: new Date().toISOString(), title: "Problemler", subject: "Matematik", topic: "Problemler", kind: "Soru", plannedMinutes: 40 }],
    });
    expect(savePlanCalls).toHaveLength(1);
    expect((savePlanCalls[0] as { input: { source?: string } }).input.source).toBe("manual");
  });

  it("source belirtilmezse (AI planı gibi) db katmanına undefined geçer — mevcut davranış bozulmaz", async () => {
    const caller = callerFor(1);
    await caller.calendar.savePlan({
      title: "AI planı",
      weekStart: new Date().toISOString(),
      weekEnd: new Date(Date.now() + 86400000).toISOString(),
      summary: "AI tarafından oluşturuldu.",
      sessions: [],
    });
    expect((savePlanCalls[0] as { input: { source?: string } }).input.source).toBeUndefined();
  });

  it("giriş yapmamış kullanıcı oturum ekleyemez (yalnızca kendi takvimini yazabilir)", async () => {
    await expect(
      anonymousCaller().calendar.savePlan({ title: "x", weekStart: new Date().toISOString(), weekEnd: new Date().toISOString(), summary: "x", sessions: [] })
    ).rejects.toBeDefined();
  });
});
