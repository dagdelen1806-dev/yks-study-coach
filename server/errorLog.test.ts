import { describe, expect, it } from "vitest";
import { errorFingerprintKey, firstStackFrame, isIgnoredClientError, normalizeMessage } from "../shared/errorLog";

describe("error log fingerprint", () => {
  it("groups messages that differ only in ids and numbers", () => {
    expect(normalizeMessage("Session 412 not found for user 9")).toBe(normalizeMessage("Session 77 not found for user 1203"));
    expect(normalizeMessage("note 3f2a9c1e-1b2c-4d5e-8f90-123456789abc missing")).toBe("note <uuid> missing");
  });

  it("keeps the same frame across deploys (bundle hash, line and column stripped)", () => {
    const before = "TypeError: x is undefined\n    at renderPlan (https://yks.example/assets/Home-AbC123xy.js:12:3456)";
    const after = "TypeError: x is undefined\n    at renderPlan (https://yks.example/assets/Home-Zz9Yy8Xx.js:14:99)";
    expect(firstStackFrame(before)).toBe("at renderPlan (/assets/Home.js)");
    expect(errorFingerprintKey("client", "x is undefined", before)).toBe(errorFingerprintKey("client", "x is undefined", after));
  });

  it("separates client and server errors with the same message", () => {
    expect(errorFingerprintKey("client", "boom", null)).not.toBe(errorFingerprintKey("server", "boom", null));
  });

  it("reads Safari/Firefox style frames", () => {
    expect(firstStackFrame("renderPlan@https://yks.example/assets/Home-AbC123xy.js:12:34")).toBe("renderPlan@/assets/Home.js");
  });
});

describe("isIgnoredClientError", () => {
  it("drops network drops, ResizeObserver noise and extension errors", () => {
    expect(isIgnoredClientError("TypeError: Failed to fetch", null)).toBe(true);
    expect(isIgnoredClientError("Load failed", null)).toBe(true);
    expect(isIgnoredClientError("ResizeObserver loop completed with undelivered notifications.", null)).toBe(true);
    expect(isIgnoredClientError("Script error.", null)).toBe(true);
    expect(isIgnoredClientError("x is not a function", "at foo (chrome-extension://abc/content.js:1:1)")).toBe(true);
  });

  it("keeps real code errors, including stale lazy chunks after a deploy", () => {
    expect(isIgnoredClientError("Cannot read properties of undefined (reading 'map')", "at Plan (/assets/Home.js:1:1)")).toBe(false);
    expect(isIgnoredClientError("Failed to fetch dynamically imported module: /assets/NoteEditor-AbC123xy.js", null)).toBe(false);
  });
});
