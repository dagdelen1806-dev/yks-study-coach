import { describe, expect, it } from "vitest";
import { DEFAULT_TIMEZONE, resolveTimezone } from "./_core/timezone";

describe("sunucu saat dilimi", () => {
  it("varsayılan Türkiye saati; geçerli APP_TIMEZONE kabul edilir, geçersizi varsayılana düşer", () => {
    expect(resolveTimezone(undefined)).toBe(DEFAULT_TIMEZONE);
    expect(resolveTimezone("  ")).toBe(DEFAULT_TIMEZONE);
    expect(resolveTimezone("Europe/Berlin")).toBe("Europe/Berlin");
    expect(resolveTimezone("Ay/Yıldız")).toBe(DEFAULT_TIMEZONE);
  });

  it("modül yüklenince süreç Türkiye saatinde: 17:00 yerel saat 14:00 UTC'dir (UTC'de çalışan sunucuda 3 saat kayma olmaz)", () => {
    expect(process.env.TZ).toBe("Europe/Istanbul");
    const task = new Date("2026-10-27T17:00:00");
    expect(task.getHours()).toBe(17);
    expect(task.toISOString()).toBe("2026-10-27T14:00:00.000Z");
  });
});
