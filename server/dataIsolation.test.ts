import { beforeEach, describe, expect, it, vi } from "vitest";

type FakeExam = { id: string; title: string; userId: number };

const store = new Map<number, FakeExam[]>();

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getUserMockExams: vi.fn(async (userId: number) => store.get(userId) ?? []),
    addUserMockExams: vi.fn(async (userId: number, inputs: Array<{ title: string }>) => {
      const existing = store.get(userId) ?? [];
      const added = inputs.map((input, index) => ({ id: `${userId}-${existing.length + index}`, title: input.title, userId }));
      const updated = [...added, ...existing];
      store.set(userId, updated);
      return updated;
    }),
  };
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

describe("kullanıcı verilerinin userId ile izolasyonu", () => {
  beforeEach(() => store.clear());

  it("bir kullanıcının eklediği deneme başka bir kullanıcıya görünmez", async () => {
    const userOne = callerFor(1);
    const userTwo = callerFor(2);

    await userOne.exams.importMany({
      exams: [{
        title: "Kullanıcı 1 denemesi",
        exam: "TYT",
        date: "2026-09-15",
        net: 60,
        delta: 0,
        subjects: { Türkçe: 20 },
        timeSpent: { Türkçe: 40 },
        topicNets: {},
        topicDetails: [],
        importedFrom: "manual",
      }],
    });

    const userTwoExams = await userTwo.exams.snapshot();
    expect(userTwoExams).toEqual([]);

    const userOneExams = await userOne.exams.snapshot();
    expect(userOneExams).toHaveLength(1);
    expect((userOneExams[0] as { title: string }).title).toBe("Kullanıcı 1 denemesi");
  });

  it("her çağrı yalnızca ctx.user.id'sine ait veriyi ister", async () => {
    const userTwo = callerFor(2);
    await userTwo.exams.importMany({
      exams: [{
        title: "Kullanıcı 2 denemesi",
        exam: "TYT",
        date: "2026-09-16",
        net: 55,
        delta: 0,
        subjects: { Türkçe: 18 },
        timeSpent: {},
        topicNets: {},
        topicDetails: [],
        importedFrom: "manual",
      }],
    });

    const userOneExams = await callerFor(1).exams.snapshot();
    const userTwoExams = await callerFor(2).exams.snapshot();
    expect(userOneExams).toEqual([]);
    expect(userTwoExams).toHaveLength(1);
  });
});
