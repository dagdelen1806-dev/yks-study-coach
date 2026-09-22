import { describe, expect, it } from "vitest";
import { canTransitionSubscriptionStatus, resolveEffectiveStatus, statusGrantsPremiumAccess } from "../shared/subscriptionStateMachine";

describe("canTransitionSubscriptionStatus", () => {
  it("trialing -> active geçerlidir", () => expect(canTransitionSubscriptionStatus("trialing", "active")).toBe(true));
  it("trialing -> expired geçerlidir", () => expect(canTransitionSubscriptionStatus("trialing", "expired")).toBe(true));
  it("aynı duruma geçiş her zaman geçerlidir (no-op)", () => expect(canTransitionSubscriptionStatus("active", "active")).toBe(true));
  it("active -> grace_period DOĞRUDAN geçersizdir (önce past_due'dan geçmeli)", () => expect(canTransitionSubscriptionStatus("active", "grace_period")).toBe(false));
  it("expired -> canceled geçersizdir (zaten bitmiş bir aboneliği iptal edemezsin)", () => expect(canTransitionSubscriptionStatus("expired", "canceled")).toBe(false));
  it("canceled -> active (resume) geçerlidir", () => expect(canTransitionSubscriptionStatus("canceled", "active")).toBe(true));
  it("grace_period -> active (ödeme başarılı) geçerlidir", () => expect(canTransitionSubscriptionStatus("grace_period", "active")).toBe(true));
});

describe("resolveEffectiveStatus", () => {
  const now = new Date("2026-09-21T00:00:00Z");

  it("trial süresi dolmuşsa expired döner", () => {
    const result = resolveEffectiveStatus({ status: "trialing", trialEndsAt: new Date("2026-09-20T00:00:00Z"), currentPeriodEnd: null, cancelAtPeriodEnd: false, gracePeriodEndsAt: null }, now);
    expect(result).toBe("expired");
  });

  it("trial süresi dolmamışsa trialing kalır", () => {
    const result = resolveEffectiveStatus({ status: "trialing", trialEndsAt: new Date("2026-09-25T00:00:00Z"), currentPeriodEnd: null, cancelAtPeriodEnd: false, gracePeriodEndsAt: null }, now);
    expect(result).toBe("trialing");
  });

  it("cancelAtPeriodEnd true ve dönem bittiyse expired döner", () => {
    const result = resolveEffectiveStatus({ status: "active", trialEndsAt: null, currentPeriodEnd: new Date("2026-09-20T00:00:00Z"), cancelAtPeriodEnd: true, gracePeriodEndsAt: null }, now);
    expect(result).toBe("expired");
  });

  it("cancelAtPeriodEnd true ama dönem bitmediyse active kalır", () => {
    const result = resolveEffectiveStatus({ status: "active", trialEndsAt: null, currentPeriodEnd: new Date("2026-09-25T00:00:00Z"), cancelAtPeriodEnd: true, gracePeriodEndsAt: null }, now);
    expect(result).toBe("active");
  });

  it("cancelAtPeriodEnd false ve dönem bittiyse past_due döner (yenileme bekleniyor)", () => {
    const result = resolveEffectiveStatus({ status: "active", trialEndsAt: null, currentPeriodEnd: new Date("2026-09-20T00:00:00Z"), cancelAtPeriodEnd: false, gracePeriodEndsAt: null }, now);
    expect(result).toBe("past_due");
  });

  it("grace period bittiyse expired döner", () => {
    const result = resolveEffectiveStatus({ status: "grace_period", trialEndsAt: null, currentPeriodEnd: null, cancelAtPeriodEnd: false, gracePeriodEndsAt: new Date("2026-09-20T00:00:00Z") }, now);
    expect(result).toBe("expired");
  });
});

describe("statusGrantsPremiumAccess", () => {
  it("trialing/active/grace_period premium erişim verir", () => {
    expect(statusGrantsPremiumAccess("trialing")).toBe(true);
    expect(statusGrantsPremiumAccess("active")).toBe(true);
    expect(statusGrantsPremiumAccess("grace_period")).toBe(true);
  });
  it("past_due/canceled/expired/paused/incomplete premium erişim VERMEZ", () => {
    expect(statusGrantsPremiumAccess("past_due")).toBe(false);
    expect(statusGrantsPremiumAccess("canceled")).toBe(false);
    expect(statusGrantsPremiumAccess("expired")).toBe(false);
    expect(statusGrantsPremiumAccess("paused")).toBe(false);
    expect(statusGrantsPremiumAccess("incomplete")).toBe(false);
  });
});
