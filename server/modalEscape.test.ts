import { describe, expect, it } from "vitest";
import { topmostBackdrop } from "../client/src/lib/modalEscape";

const el = (name: string, z: number) => ({ name, z }) as unknown as HTMLElement & { name: string; z: number };
const zOf = (element: HTMLElement) => (element as unknown as { z: number }).z;

describe("topmostBackdrop", () => {
  it("picks the highest z-index", () => {
    const capture = el("capture", 310);
    expect(topmostBackdrop([el("editor", 300), capture, el("base", 0)], zOf)).toBe(capture);
  });

  it("prefers the later one on a tie (nested dialog rendered after its parent)", () => {
    const inner = el("inner", 320);
    expect(topmostBackdrop([el("outer", 320), inner], zOf)).toBe(inner);
  });

  it("returns null when there is no backdrop", () => {
    expect(topmostBackdrop([], zOf)).toBeNull();
  });
});
