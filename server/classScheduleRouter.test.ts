import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "../drizzle/schema";

// classScheduleDb: her çağrının hangi kullanıcıyla yapıldığını kaydeden sahte; doğrulama gerçek.
const calls: Array<{ fn: string; userId: number }> = [];
vi.mock("./schedule/classScheduleDb", async (importOriginal) => {
  const original = await importOriginal<typeof import("./schedule/classScheduleDb")>();
  const { validateSchedule } = await import("../shared/classSchedule");
  return {
    ...original,
    getClassSchedule: vi.fn(async (userId: number) => { calls.push({ fn: "get", userId }); return { periods: [], blocks: [] }; }),
    saveClassSchedule: vi.fn(async (userId: number, schedule: { periods: never[]; blocks: never[] }) => {
      calls.push({ fn: "save", userId });
      const problem = validateSchedule(schedule);
      if (problem) throw new original.ScheduleError(problem);
      return schedule;
    }),
  };
});

const { appRouter } = await import("./routers");
import type { TrpcContext } from "./_core/context";

const makeUser = (id: number): User => ({ id, openId: `u-${id}`, email: null, name: null, loginMethod: "dev_email", passwordHash: null, emailVerifiedAt: new Date(), emailVerificationSentAt: null, role: "user", approvalStatus: "approved", approvedAt: null, approvedBy: null, rejectedAt: null, rejectionReason: null, accountStatus: "active", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }) as User;
const callerFor = (user: User | null) => appRouter.createCaller({ user, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] } as TrpcContext);
const fizik = { source: "school" as const, dayOfWeek: 1, startTime: "08:30", endTime: "09:10", subject: "Fizik" as const, label: "Fizik" };

beforeEach(() => { calls.length = 0; });

describe("classSchedule router", () => {
  it("rejects anonymous callers", async () => {
    await expect(callerFor(null).classSchedule.get()).rejects.toThrow(/login/i);
    await expect(callerFor(null).classSchedule.save({ periods: [], blocks: [] })).rejects.toThrow(/login/i);
  });

  it("scopes reads and writes to the signed-in student", async () => {
    await callerFor(makeUser(5)).classSchedule.get();
    await callerFor(makeUser(5)).classSchedule.save({ periods: [{ start: "08:30", end: "09:10" }], blocks: [fizik, { ...fizik, dayOfWeek: 2, subject: null, label: "Din Kültürü" }] });
    expect(calls).toEqual([{ fn: "get", userId: 5 }, { fn: "save", userId: 5 }]);
  });

  it("rejects bad times, unknown subjects and overlapping blocks with a readable message", async () => {
    const caller = callerFor(makeUser(5));
    await expect(caller.classSchedule.save({ periods: [], blocks: [{ ...fizik, startTime: "8:30" }] })).rejects.toThrow();
    await expect(caller.classSchedule.save({ periods: [], blocks: [{ ...fizik, subject: "Astroloji" as never }] })).rejects.toThrow();
    await expect(caller.classSchedule.save({ periods: [], blocks: [{ ...fizik, dayOfWeek: 8 }] })).rejects.toThrow();
    await expect(caller.classSchedule.save({ periods: [], blocks: [fizik, { ...fizik, startTime: "09:00", endTime: "09:40", label: "Kimya", subject: "Kimya" }] })).rejects.toThrow(/çakışıyor/);
  });
});
