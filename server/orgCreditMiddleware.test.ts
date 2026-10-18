import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "../drizzle/schema";

// metredFeatureProcedure: kurum havuzu varsa öğrencinin kişisel kotasına hiç bakılmaz ve harcama
// kuruma yazılır; havuz yoksa eski akış (kişisel kota). İşlem başarısızsa hiçbir şey yazılmaz.
const findOrgCreditSource = vi.fn();
const recordOrgCredit = vi.fn();
const assertUsageAvailable = vi.fn();
const recordFeatureUsage = vi.fn();
vi.mock("./org/orgCredits", () => ({ findOrgCreditSource: (...args: unknown[]) => findOrgCreditSource(...args), recordOrgCredit: (...args: unknown[]) => recordOrgCredit(...args) }));
vi.mock("./subscriptions/entitlementService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./subscriptions/entitlementService")>()),
  assertUsageAvailable: (...args: unknown[]) => assertUsageAvailable(...args),
  recordFeatureUsage: (...args: unknown[]) => recordFeatureUsage(...args),
}));

const { metredFeatureProcedure, router } = await import("./_core/trpc");
const { PremiumRequiredError } = await import("./subscriptions/entitlementService");
import type { TrpcContext } from "./_core/context";

let fail = false;
const testRouter = router({ run: metredFeatureProcedure("NOTE_AI", { maxRequests: 1000, windowMs: 60_000 }).mutation(() => { if (fail) throw new Error("LLM hata"); return "ok"; }) });
const user = { id: 7, openId: "u-7", role: "user", approvalStatus: "approved", accountStatus: "active", emailVerifiedAt: new Date(), loginMethod: "dev_email" } as unknown as User;
const caller = () => testRouter.createCaller({ user, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] } as TrpcContext);

describe("kurum AI kredi havuzu ara katmanı", () => {
  beforeEach(() => { vi.clearAllMocks(); fail = false; });

  it("havuz karşılıyorsa kişisel kotaya bakmaz, kuruma yazar", async () => {
    findOrgCreditSource.mockResolvedValue({ orgId: 3, cost: 2 });
    await expect(caller().run()).resolves.toBe("ok");
    expect(assertUsageAvailable).not.toHaveBeenCalled();
    expect(recordOrgCredit).toHaveBeenCalledWith({ orgId: 3, cost: 2 }, 7, "NOTE_AI");
    expect(recordFeatureUsage).not.toHaveBeenCalled();
  });

  it("havuz yoksa kişisel kota geçerli (free kullanıcı premium özelliğe giremez)", async () => {
    findOrgCreditSource.mockResolvedValue(null);
    assertUsageAvailable.mockRejectedValue(new PremiumRequiredError("NOTE_AI"));
    await expect(caller().run()).rejects.toMatchObject({ code: "FORBIDDEN" });
    assertUsageAvailable.mockResolvedValue({ isPremium: true });
    await expect(caller().run()).resolves.toBe("ok");
    expect(recordFeatureUsage).toHaveBeenCalledWith(7, "NOTE_AI");
    expect(recordOrgCredit).not.toHaveBeenCalled();
  });

  it("işlem başarısızsa kredi düşmez", async () => {
    findOrgCreditSource.mockResolvedValue({ orgId: 3, cost: 2 });
    fail = true;
    await expect(caller().run()).rejects.toThrow();
    expect(recordOrgCredit).not.toHaveBeenCalled();
  });
});
