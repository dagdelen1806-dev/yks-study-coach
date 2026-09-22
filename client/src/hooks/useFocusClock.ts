import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { auraColorForProgress, computeFocusClock, nextFocusStatus, type AuraColorStop, type FocusSessionStatus } from "@/lib/focusAura";

export type UseFocusClockOptions = {
  totalMs: number;
  /** UI tick cadence — this is a re-render cadence, not the time source. */
  tickMs?: number;
  onComplete?: () => void;
  colorStops?: AuraColorStop[];
};

export type FocusClock = {
  status: FocusSessionStatus;
  elapsedMs: number;
  remainingMs: number;
  progress: number;
  auraColor: string;
  start: () => void;
  pause: () => void;
  resume: () => void;
  /** Ends the session immediately as completed (student finishes early). */
  finishNow: () => void;
  cancel: () => void;
};

/**
 * React binding for the Focus Aura Engine (`lib/focusAura.ts`). This is the
 * project's single canonical session clock — video playback and aura color
 * are both derived from `progress` here, never an independent timer (spec §56).
 *
 * Uses the project's existing state primitive (plain hooks / `useState`,
 * same as every other component in `Home.tsx` — no new state-management
 * library introduced) and timestamp refs so ticks never accumulate drift.
 */
export function useFocusClock({ totalMs, tickMs = 1000, onComplete, colorStops }: UseFocusClockOptions): FocusClock {
  const [status, setStatus] = useState<FocusSessionStatus>("idle");
  const [, forceRender] = useState(0);
  const bump = useCallback(() => forceRender((n) => n + 1), []);

  const sessionStartAtRef = useRef<number | null>(null);
  const totalPausedMsRef = useRef(0);
  const pausedAtRef = useRef<number | null>(null);
  const completedRef = useRef(false);
  // Freezes the clock's `now` the instant the session completes — without
  // this, `elapsedMs` would keep silently growing in the background (using
  // real `Date.now()`) every time something else re-renders the component
  // after completion, even though the session is over.
  const completedAtRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const start = useCallback(() => {
    setStatus((current) => {
      const next = nextFocusStatus(current, "start");
      if (next === "running") {
        sessionStartAtRef.current = Date.now();
        totalPausedMsRef.current = 0;
        pausedAtRef.current = null;
        completedRef.current = false;
        completedAtRef.current = null;
      }
      return next;
    });
  }, []);

  const pause = useCallback(() => {
    setStatus((current) => {
      const next = nextFocusStatus(current, "pause");
      if (next === "paused" && pausedAtRef.current === null) pausedAtRef.current = Date.now();
      return next;
    });
  }, []);

  const resume = useCallback(() => {
    setStatus((current) => {
      const next = nextFocusStatus(current, "resume");
      if (next === "running" && pausedAtRef.current !== null) {
        totalPausedMsRef.current += Date.now() - pausedAtRef.current;
        pausedAtRef.current = null;
      }
      return next;
    });
  }, []);

  const finishNow = useCallback(() => {
    setStatus((current) => {
      const next = nextFocusStatus(current, "complete");
      if (next === "completed" && !completedRef.current) {
        completedRef.current = true;
        completedAtRef.current = Date.now();
        onCompleteRef.current?.();
      }
      return next;
    });
  }, []);

  const cancel = useCallback(() => {
    sessionStartAtRef.current = null;
    totalPausedMsRef.current = 0;
    pausedAtRef.current = null;
    completedRef.current = false;
    completedAtRef.current = null;
    setStatus((current) => nextFocusStatus(current, "cancel"));
  }, []);

  // Only ticks while running — paused/idle/completed do no work at all, and
  // the interval is always cleared on cleanup (no leaked timers).
  useEffect(() => {
    if (status !== "running") return;
    const id = window.setInterval(bump, tickMs);
    return () => window.clearInterval(id);
  }, [status, tickMs, bump]);

  // Backgrounded tabs throttle/pause `setInterval`; re-sync immediately on
  // return instead of waiting for the next tick, so the shown time is never
  // stale (spec §22 — app lifecycle correctness, adapted from Flutter's
  // AppLifecycleState to the web's Page Visibility API).
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && status === "running") bump();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [status, bump]);

  const now = status === "completed" && completedAtRef.current !== null ? completedAtRef.current : Date.now();
  const clock = computeFocusClock({
    sessionStartAt: sessionStartAtRef.current,
    now,
    totalPausedMs: totalPausedMsRef.current,
    pausedAt: pausedAtRef.current,
    totalMs,
  });

  // Completion guard: fires the callback exactly once, the instant progress
  // reaches 1 while running (spec §17 — no duplicate completion events).
  useEffect(() => {
    if (status === "running" && clock.progress >= 1 && !completedRef.current) {
      completedRef.current = true;
      completedAtRef.current = now;
      setStatus("completed");
      onCompleteRef.current?.();
    }
  }, [status, clock.progress, now]);

  const auraColor = useMemo(() => auraColorForProgress(clock.progress, colorStops), [clock.progress, colorStops]);

  return { status, ...clock, auraColor, start, pause, resume, finishNow, cancel };
}
