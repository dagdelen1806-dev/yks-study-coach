import { describe, expect, it } from "vitest";
import { calculatePlanAdherence, dedupeAlerts } from "../shared/planAdherence";

const session = (overrides: Record<string, unknown> = {}) => ({
  status: "planned" as const,
  plannedMinutes: 40,
  actualMinutes: 0,
  targetQuestions: 20,
  actualQuestions: 0,
  sessionDate: "2026-09-14",
  ...overrides,
});

describe("plan adherence decision engine", () => {
  it("flags a reduced plan when sessions are frequently missed", () => {
    const result = calculatePlanAdherence([session(), session(), session({ status: "completed", actualMinutes: 20, actualQuestions: 8 })], 40);
    expect(result.overallScore).toBeLessThan(55);
    expect(result.decision).toBe("planı_küçült");
    expect(result.alerts.some((alert) => alert.ruleKey === "low_adherence")).toBe(true);
  });

  it("recommends a higher level when rhythm and accuracy are strong", () => {
    const result = calculatePlanAdherence([
      session({ status: "completed", actualMinutes: 40, actualQuestions: 20 }),
      session({ status: "completed", actualMinutes: 42, actualQuestions: 22 }),
      session({ status: "completed", actualMinutes: 38, actualQuestions: 20 }),
    ], 90);
    expect(result.overallScore).toBeGreaterThanOrEqual(80);
    expect(result.decision).toBe("seviyeyi_artır");
    expect(result.alerts.some((alert) => alert.ruleKey === "ready_for_next_level")).toBe(true);
  });

  it("asks for more data before making a strong recommendation", () => {
    const result = calculatePlanAdherence([session({ status: "completed", actualMinutes: 40, actualQuestions: 20 })], 90);
    expect(result.decision).toBe("veri_topla");
    expect(result.alerts[0]?.ruleKey).toBe("no_plan_data");
  });

  it("suggests changing method when time is spent but accuracy stays low", () => {
    const result = calculatePlanAdherence([
      session({ status: "completed", actualMinutes: 40, actualQuestions: 0 }),
      session({ status: "completed", actualMinutes: 40, actualQuestions: 0 }),
      session({ status: "completed", actualMinutes: 40, actualQuestions: 0 }),
    ], 40);
    expect(result.timeScore).toBeGreaterThanOrEqual(75);
    expect(result.decision).toBe("yöntemi_değiştir");
    expect(result.alerts.some((alert) => alert.ruleKey === "low_accuracy_high_time")).toBe(true);
  });

  it("does not repeat an alert for a rule that already has one", () => {
    const alerts = [
      { level: "warning" as const, ruleKey: "low_adherence", title: "t", message: "m", actionLabel: "a" },
      { level: "success" as const, ruleKey: "keep_rhythm", title: "t2", message: "m2", actionLabel: "a2" },
    ];
    expect(dedupeAlerts(alerts, ["low_adherence"])).toEqual([alerts[1]]);
    expect(dedupeAlerts(alerts, [])).toEqual(alerts);
    expect(dedupeAlerts(alerts, ["low_adherence", "keep_rhythm"])).toEqual([]);
  });
});
