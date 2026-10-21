import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";
import type { User } from "../drizzle/schema";
import { parentLinks, users } from "../drizzle/schema";
import { parentCanView, parentInviteProblem } from "../shared/parent";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";
import { getDb } from "./db";

describe("veli kodu kuralları", () => {
  const now = new Date("2026-10-21T12:00:00Z");
  const base = { status: "invited" as const, expiresAt: new Date("2026-10-25T12:00:00Z"), parentUserId: null };
  it("geçerli, kullanılmamış kod kabul edilir", () => expect(parentInviteProblem(base, now)).toBeNull());
  it("süresi dolmuş, kullanılmış ya da iptal edilmiş kod reddedilir", () => {
    expect(parentInviteProblem({ ...base, expiresAt: new Date("2026-10-20T00:00:00Z") }, now)).toMatch(/süresi/);
    expect(parentInviteProblem({ ...base, status: "pending", parentUserId: 5 }, now)).toMatch(/kullanılmış/);
    expect(parentInviteProblem({ ...base, status: "revoked" }, now)).toMatch(/iptal/);
    expect(parentInviteProblem(null, now)).toMatch(/geçerli değil/);
  });
  it("veli yalnızca aktif (öğrencinin onayladığı) bağlantıda görür", () => {
    expect(parentCanView({ status: "active" })).toBe(true);
    expect(parentCanView({ status: "pending" })).toBe(false);
    expect(parentCanView({ status: "revoked" })).toBe(false);
    expect(parentCanView(null)).toBe(false);
  });
});

// Gerçek veritabanıyla uçtan uca yetki: CI'da (ve yerelde DATABASE_URL varsa) çalışır.
const hasDb = Boolean(process.env.DATABASE_URL);
describe.skipIf(!hasDb)("veli erişimi (router + veritabanı)", () => {
  const stamp = Date.now() % 1_000_000;
  const ids = { student: 0, otherStudent: 0, parent: 0, stranger: 0 };
  const caller = (id: number) => appRouter.createCaller({ user: { id, role: "user", approvalStatus: "approved", accountStatus: "active", emailVerifiedAt: new Date(), loginMethod: "dev_email" } as unknown as User, req: { protocol: "https", headers: { host: "localhost" } } as TrpcContext["req"], res: {} as TrpcContext["res"] } as TrpcContext);

  beforeAll(async () => {
    const db = (await getDb())!;
    for (const key of Object.keys(ids) as Array<keyof typeof ids>) {
      const [row] = await db.insert(users).values({ openId: `parent-test-${key}-${stamp}`, name: `${key} ${stamp}`, email: null, loginMethod: "dev_email" }).returning({ id: users.id });
      ids[key] = row.id;
    }
  });
  afterAll(async () => {
    const db = (await getDb())!;
    const all = Object.values(ids);
    await db.delete(parentLinks).where(inArray(parentLinks.studentUserId, all));
    await db.delete(users).where(inArray(users.id, all));
  });

  it("kod → veli isteği → öğrenci onayı → veli özeti görür; başka öğrenciyi göremez; iptalden sonra göremez", async () => {
    const { code } = await caller(ids.student).parent.createInvite();
    expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);

    // Öğrenci kendi kodunu kullanamaz; rıza onayı olmadan kod kullanılamaz.
    await expect(caller(ids.student).parent.redeem({ code, consent: true })).rejects.toThrow(/Kendi kodunu/);
    await expect(caller(ids.parent).parent.redeem({ code, consent: false as unknown as true })).rejects.toThrow();

    await caller(ids.parent).parent.redeem({ code: code.toLowerCase().replace("-", " "), consent: true });
    // Aynı kod ikinci kez kullanılamaz.
    await expect(caller(ids.stranger).parent.redeem({ code, consent: true })).rejects.toThrow(/kullanılmış/);

    // Öğrenci onaylamadan veli hiçbir şey göremez.
    await expect(caller(ids.parent).parent.student({ studentUserId: ids.student })).rejects.toThrow(/izni/);
    const [request] = (await caller(ids.student).parent.myParents()).filter((row) => row.status === "pending");
    expect(request).toBeTruthy();
    // Başka bir öğrenci bu isteği onaylayamaz.
    await expect(caller(ids.otherStudent).parent.decide({ linkId: request.id, approve: true })).rejects.toThrow();
    await caller(ids.student).parent.decide({ linkId: request.id, approve: true });

    const view = await caller(ids.parent).parent.student({ studentUserId: ids.student });
    expect(view.name).toBeTruthy();
    expect(view).not.toHaveProperty("notes");
    // Bağlı olmadığı öğrenciyi ve yabancı bir veli bu öğrenciyi göremez.
    await expect(caller(ids.parent).parent.student({ studentUserId: ids.otherStudent })).rejects.toThrow(/izni/);
    await expect(caller(ids.stranger).parent.student({ studentUserId: ids.student })).rejects.toThrow(/izni/);

    // Yabancı biri bağlantıyı kaldıramaz; öğrenci kaldırınca veli erişimi biter.
    await expect(caller(ids.stranger).parent.unlink({ linkId: request.id })).rejects.toThrow();
    await caller(ids.student).parent.removeParent({ linkId: request.id });
    await expect(caller(ids.parent).parent.student({ studentUserId: ids.student })).rejects.toThrow(/izni/);
    expect(await caller(ids.parent).parent.myStudents()).toHaveLength(0);
  });

  it("yeni kod eski kullanılmamış kodu geçersiz kılar", async () => {
    const first = await caller(ids.otherStudent).parent.createInvite();
    await caller(ids.otherStudent).parent.createInvite();
    await expect(caller(ids.parent).parent.redeem({ code: first.code, consent: true })).rejects.toThrow(/iptal/);
  });
});
