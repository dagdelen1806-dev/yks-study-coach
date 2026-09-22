/**
 * Focus Aura Engine — pure, UI-independent domain logic for "Pusula Odak".
 *
 * Adapted from a Flutter/Riverpod spec onto this project's actual stack
 * (React + TypeScript, no Riverpod/Bloc/Flutter here). Kept UI-free on
 * purpose so it's unit-testable without mounting any component, and so the
 * video/CSS layers can stay "dumb" (they just read `auraColor`/`progress`).
 *
 * Canonical rule (unchanged from the spec): the session clock is the single
 * source of truth. Video playback and color are *derived* from it — never
 * the other way around.
 */

export type FocusSessionStatus = "idle" | "running" | "paused" | "completed";

export type AuraColorStop = { stop: number; color: string };

export type FocusAuraConfig = {
  colorStops: AuraColorStop[];
  completionAnimationMs: number;
  enableVideo: boolean;
  muteVideo: boolean;
  loopVideo: boolean;
  enableCompletionAnimation: boolean;
  enableAura: boolean;
};

// RED → MAGENTA → PURPLE → BLUE → CYAN. The purple/blue stops are the exact
// hues Pusula already uses elsewhere (lilac accent `#7566c3`, primary blue
// `#3b5ccc`) so the aura reads as part of the same design system rather than
// an unrelated palette bolted on.
export const DEFAULT_AURA_COLOR_STOPS: AuraColorStop[] = [
  { stop: 0.0, color: "#D8473F" }, // deep red
  { stop: 0.25, color: "#C2478F" }, // magenta
  { stop: 0.5, color: "#7B5CC0" }, // purple (~lilac accent)
  { stop: 0.75, color: "#3B5CCC" }, // blue (exact Pusula accent)
  { stop: 1.0, color: "#3FC2D6" }, // cyan
];

export const DEFAULT_FOCUS_AURA_CONFIG: FocusAuraConfig = {
  colorStops: DEFAULT_AURA_COLOR_STOPS,
  completionAnimationMs: 1100,
  enableVideo: true,
  muteVideo: true,
  loopVideo: true,
  enableCompletionAnimation: true,
  enableAura: true,
};

export const clampProgress = (value: number): number => {
  if (Number.isNaN(value) || !Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
};

const hexToRgb = (hex: string): [number, number, number] => {
  const normalized = hex.replace("#", "");
  const int = Number.parseInt(normalized, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
};

const rgbToHex = (r: number, g: number, b: number): string =>
  `#${[r, g, b].map((channel) => Math.round(Math.min(255, Math.max(0, channel))).toString(16).padStart(2, "0")).join("")}`;

/**
 * Piecewise-linear color interpolation across `stops` (spec §11/§12). No
 * color library needed — a manual RGB lerp between the two bracketing stops
 * is sufficient and cheap enough to call once per timer tick.
 */
export function auraColorForProgress(progress: number, stops: AuraColorStop[] = DEFAULT_AURA_COLOR_STOPS): string {
  const p = clampProgress(progress);
  const sorted = [...stops].sort((a, b) => a.stop - b.stop);
  if (sorted.length === 0) return "#D8473F";
  if (p <= sorted[0].stop) return sorted[0].color;
  if (p >= sorted[sorted.length - 1].stop) return sorted[sorted.length - 1].color;

  for (let i = 0; i < sorted.length - 1; i++) {
    const from = sorted[i];
    const to = sorted[i + 1];
    if (p >= from.stop && p <= to.stop) {
      if (p === from.stop) return from.color;
      if (p === to.stop) return to.color;
      const span = to.stop - from.stop;
      const localT = span === 0 ? 0 : (p - from.stop) / span;
      const [r1, g1, b1] = hexToRgb(from.color);
      const [r2, g2, b2] = hexToRgb(to.color);
      return rgbToHex(r1 + (r2 - r1) * localT, g1 + (g2 - g1) * localT, b1 + (b2 - b1) * localT);
    }
  }
  return sorted[sorted.length - 1].color;
}

export type FocusClockInputs = {
  /** `Date.now()` timestamp the running session's clock started at (before any pausing). `null` when idle. */
  sessionStartAt: number | null;
  /** Wall-clock "now" to evaluate against — pass `Date.now()` from the caller so this stays pure/testable. */
  now: number;
  /** Sum of every *completed* pause's duration, in ms. */
  totalPausedMs: number;
  /** Timestamp the current (in-progress) pause began, or `null` if not currently paused. */
  pausedAt: number | null;
  totalMs: number;
};

export type FocusClockResult = { elapsedMs: number; remainingMs: number; progress: number };

/**
 * Drift-free elapsed/progress calculation (spec §6). Never accumulates
 * `elapsed += tick` — always recomputed from real timestamps, so a delayed
 * interval tick, a throttled background tab, or a dropped frame can never
 * cause cumulative drift. A zero-duration session is handled safely
 * (progress jumps straight to 1 instead of dividing by zero).
 */
export function computeFocusClock(inputs: FocusClockInputs): FocusClockResult {
  const { sessionStartAt, now, totalPausedMs, pausedAt, totalMs } = inputs;
  if (sessionStartAt === null || totalMs <= 0) {
    return { elapsedMs: 0, remainingMs: Math.max(0, totalMs), progress: totalMs <= 0 ? 1 : 0 };
  }

  const activePauseMs = pausedAt !== null ? Math.max(0, now - pausedAt) : 0;
  const pauseOffset = totalPausedMs + activePauseMs;
  const rawElapsed = now - sessionStartAt - pauseOffset;
  const elapsedMs = Math.min(totalMs, Math.max(0, rawElapsed));

  return { elapsedMs, remainingMs: totalMs - elapsedMs, progress: clampProgress(elapsedMs / totalMs) };
}

/** Pure state-transition guard (spec §42). Invalid transitions are rejected
 * (return the unchanged status) rather than silently accepted. */
export function nextFocusStatus(current: FocusSessionStatus, action: "start" | "pause" | "resume" | "complete" | "cancel"): FocusSessionStatus {
  switch (action) {
    case "start":
      return current === "idle" ? "running" : current;
    case "pause":
      return current === "running" ? "paused" : current;
    case "resume":
      return current === "paused" ? "running" : current;
    case "complete":
      // A session can complete whether it ticks over the end while running,
      // or the student finishes early from a paused state.
      return current === "running" || current === "paused" ? "completed" : current;
    case "cancel":
      return current === "completed" ? current : "idle";
    default:
      return current;
  }
}
