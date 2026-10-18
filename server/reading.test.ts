import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "../drizzle/schema";
import { applyReadingProgress, readingProgressLabel } from "../shared/reading";

describe("applyReadingProgress", () => {
  it("adds pages and finishes the book at its last page", () => {
    expect(applyReadingProgress({ totalPages: 200, pagesRead: 150, status: "reading" }, 30)).toEqual({ pagesRead: 180, status: "reading", justFinished: false });
    expect(applyReadingProgress({ totalPages: 200, pagesRead: 180, status: "reading" }, 40)).toEqual({ pagesRead: 200, status: "finished", justFinished: true });
  });

  it("never finishes a book without a page count and ignores negative pages", () => {
    expect(applyReadingProgress({ totalPages: null, pagesRead: 900, status: "reading" }, 50)).toEqual({ pagesRead: 950, status: "reading", justFinished: false });
    expect(applyReadingProgress({ totalPages: 100, pagesRead: 10, status: "reading" }, -5).pagesRead).toBe(10);
    expect(applyReadingProgress({ totalPages: 100, pagesRead: 100, status: "finished" }, 5).justFinished).toBe(false);
  });

  it("labels progress with or without a page count", () => {
    expect(readingProgressLabel({ totalPages: 320, pagesRead: 120 })).toBe("120 / 320 sayfa · %38");
    expect(readingProgressLabel({ totalPages: null, pagesRead: 45 })).toBe("45 sayfa okundu");
  });
});

// Router: okuma kitapları ve gece okuması bağlantısı yalnızca kendi kitabına yazar.
const calls: Array<{ fn: string; userId: number; args: unknown[] }> = [];
vi.mock("./reading/readingDb", async (importOriginal) => {
  const original = await importOriginal<typeof import("./reading/readingDb")>();
  const book = { id: 7, title: "Kürk Mantolu Madonna", author: "Sabahattin Ali", totalPages: 160, pagesRead: 150, status: "reading" as const, finishedAt: null };
  return {
    ...original,
    listReadingBooks: vi.fn(async (userId: number) => { calls.push({ fn: "list", userId, args: [] }); return userId === 1 ? [book] : []; }),
    addReadingBook: vi.fn(async (userId: number, input: unknown) => { calls.push({ fn: "add", userId, args: [input] }); return { ...book, id: 8 }; }),
    updateReadingBook: vi.fn(async (userId: number, id: number) => { calls.push({ fn: "update", userId, args: [id] }); return book; }),
    removeReadingBook: vi.fn(async (userId: number, id: number) => { calls.push({ fn: "remove", userId, args: [id] }); }),
    recordReadingPages: vi.fn(async (userId: number, id: number, pages: number) => { calls.push({ fn: "record", userId, args: [id, pages] }); return userId === 1 && id === 7 ? { ...book, pagesRead: 160, status: "finished" as const, justFinished: true } : null; }),
  };
});
vi.mock("./db", async (importOriginal) => ({ ...(await importOriginal<typeof import("./db")>()), logCompletedRoutineSession: vi.fn(async () => ({ plans: [], sessions: [], logs: [] })) }));

const { appRouter } = await import("./routers");
import type { TrpcContext } from "./_core/context";

const makeUser = (id: number): User => ({ id, openId: `u-${id}`, email: null, name: null, loginMethod: "dev_email", passwordHash: null, emailVerifiedAt: new Date(), emailVerificationSentAt: null, role: "user", approvalStatus: "approved", approvedAt: null, approvedBy: null, rejectedAt: null, rejectionReason: null, accountStatus: "active", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }) as User;
const callerFor = (user: User | null) => appRouter.createCaller({ user, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] } as TrpcContext);
const routine = { title: "Gece okuması", subject: "Rutin", topic: "Kürk Mantolu Madonna", kind: "Kitap Okuma", plannedMinutes: 20, actualMinutes: 25, actualPages: 10 };

beforeEach(() => { calls.length = 0; });

describe("reading router", () => {
  it("rejects anonymous callers", async () => {
    await expect(callerFor(null).reading.list()).rejects.toThrow(/login/i);
    await expect(callerFor(null).reading.add({ title: "x" })).rejects.toThrow(/login/i);
  });

  it("scopes every call to the signed-in student and validates input", async () => {
    const caller = callerFor(makeUser(3));
    await caller.reading.list();
    await caller.reading.add({ title: "Sefiller", totalPages: 500 });
    await caller.reading.update({ id: 7, status: "finished" });
    await caller.reading.remove({ id: 7 });
    expect(calls.map((call) => [call.fn, call.userId])).toEqual([["list", 3], ["add", 3], ["update", 3], ["remove", 3]]);
    await expect(caller.reading.add({ title: "   " })).rejects.toThrow();
    await expect(caller.reading.add({ title: "x", totalPages: 0 })).rejects.toThrow();
  });

  it("adds night-reading pages to the student's own book and reports when it is finished", async () => {
    const result = await callerFor(makeUser(1)).calendar.logRoutine({ ...routine, readingBookId: 7 });
    expect(calls).toEqual([{ fn: "record", userId: 1, args: [7, 10] }]);
    expect(result.readingBook?.justFinished).toBe(true);
  });

  it("does not touch another student's book and logs a routine without a book as before", async () => {
    const other = await callerFor(makeUser(2)).calendar.logRoutine({ ...routine, readingBookId: 7 });
    expect(other.readingBook).toBeNull();
    expect(calls).toEqual([{ fn: "record", userId: 2, args: [7, 10] }]);
    calls.length = 0;
    const plain = await callerFor(makeUser(1)).calendar.logRoutine(routine);
    expect(plain.readingBook).toBeNull();
    expect(calls).toEqual([]);
  });
});
