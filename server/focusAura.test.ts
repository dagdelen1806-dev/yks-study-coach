import { describe, expect, it } from "vitest";
import {
  auraColorForProgress,
  clampProgress,
  computeFocusClock,
  DEFAULT_AURA_COLOR_STOPS,
  nextFocusStatus,
} from "../client/src/lib/focusAura";

// Pure-logic tests for the Focus Aura Engine (adapted from the original
// Flutter spec's Test 1–10 list). The engine is deliberately UI-free
// (`shared`-style pure module, same testing convention as
// `server/topicStatus.test.ts` / `server/planAdherence.test.ts`), so it runs
// under this project's existing node-environment Vitest setup with no new
// test infrastructure (jsdom/testing-library) required.

describe("auraColorForProgress — renk interpolasyonu (Test 1-5)", () => {
  it("0% → RED", () => {
    expect(auraColorForProgress(0)).toBe(DEFAULT_AURA_COLOR_STOPS[0].color);
  });

  it("25% → MAGENTA", () => {
    expect(auraColorForProgress(0.25)).toBe(DEFAULT_AURA_COLOR_STOPS[1].color);
  });

  it("50% → PURPLE", () => {
    expect(auraColorForProgress(0.5)).toBe(DEFAULT_AURA_COLOR_STOPS[2].color);
  });

  it("75% → BLUE", () => {
    expect(auraColorForProgress(0.75)).toBe(DEFAULT_AURA_COLOR_STOPS[3].color);
  });

  it("100% → CYAN", () => {
    expect(auraColorForProgress(1)).toBe(DEFAULT_AURA_COLOR_STOPS[4].color);
  });

  it("ani renk sıçraması yapmaz — iki komşu durağın ortasında ara bir renk üretir", () => {
    const magenta = auraColorForProgress(0.25);
    const purple = auraColorForProgress(0.5);
    const mid = auraColorForProgress(0.37);
    expect(mid).not.toBe(magenta);
    expect(mid).not.toBe(purple);
    // Ara renk her iki komşu durağın da geçerli bir hex string'i olmalı.
    expect(mid).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("sürekliliği korur: progress arttıkça renk kademeli değişir (aynı komşu aralıkta monoton)", () => {
    const a = auraColorForProgress(0.1);
    const b = auraColorForProgress(0.2);
    const c = auraColorForProgress(0.24);
    expect(new Set([a, b, c]).size).toBe(3);
  });
});

describe("clampProgress", () => {
  it("0'ın altını 0'a sabitler", () => {
    expect(clampProgress(-0.4)).toBe(0);
  });

  it("1'in üstünü 1'e sabitler", () => {
    expect(clampProgress(1.8)).toBe(1);
  });

  it("NaN/sonsuz değerleri güvenli şekilde ele alır", () => {
    expect(clampProgress(Number.NaN)).toBe(0);
    expect(clampProgress(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe("computeFocusClock — drift-free elapsed hesabı", () => {
  const totalMs = 30 * 60 * 1000; // 30 dakika

  it("başlangıçta elapsed=0, progress=0", () => {
    const start = 1_000_000;
    const result = computeFocusClock({ sessionStartAt: start, now: start, totalPausedMs: 0, pausedAt: null, totalMs });
    expect(result.elapsedMs).toBe(0);
    expect(result.progress).toBe(0);
  });

  it("tick birikimi yerine gerçek zaman damgasından hesaplar (drift oluşmaz)", () => {
    const start = 1_000_000;
    // Tek tek 1000ms'lik "tick"ler yerine gerçek geçen süreyi doğrudan veriyoruz —
    // yani hesap gecikmeli/atlanan tick'lerden etkilenmemeli.
    const laggedNow = start + 17 * 1000 + 342; // düzensiz bir gecikme
    const result = computeFocusClock({ sessionStartAt: start, now: laggedNow, totalPausedMs: 0, pausedAt: null, totalMs });
    expect(result.elapsedMs).toBe(17 * 1000 + 342);
  });

  it("Test 6 — pause sırasında ilerlemez, resume sonrası kaldığı noktadan devam eder", () => {
    const start = 1_000_000;
    // 25%'e kadar ilerle.
    const at25 = start + totalMs * 0.25;
    const beforePause = computeFocusClock({ sessionStartAt: start, now: at25, totalPausedMs: 0, pausedAt: null, totalMs });
    expect(Math.round(beforePause.progress * 100)).toBe(25);

    // Pause başlat, 5 dakika bekle.
    const pausedAt = at25;
    const duringPause = pausedAt + 5 * 60 * 1000;
    const whilePaused = computeFocusClock({ sessionStartAt: start, now: duringPause, totalPausedMs: 0, pausedAt, totalMs });
    // Pause sırasında progress %25'te donmuş kalmalı.
    expect(Math.round(whilePaused.progress * 100)).toBe(25);

    // Resume: toplam pause süresi kaydedilir, pausedAt sıfırlanır.
    const totalPausedMs = duringPause - pausedAt;
    const resumeNow = duringPause + 1000; // resume'dan 1 saniye sonra
    const afterResume = computeFocusClock({ sessionStartAt: start, now: resumeNow, totalPausedMs, pausedAt: null, totalMs });
    // %25 + 1 saniyelik ilerleme kadar artmış olmalı, pause süresi düşülmüş olmalı.
    expect(afterResume.elapsedMs).toBe(totalMs * 0.25 + 1000);
  });

  it("Test 8 — progress hiçbir zaman 0'ın altına veya 1'in üstüne çıkmaz", () => {
    const start = 1_000_000;
    const beforeStart = computeFocusClock({ sessionStartAt: start, now: start - 5000, totalPausedMs: 0, pausedAt: null, totalMs });
    expect(beforeStart.progress).toBeGreaterThanOrEqual(0);
    const wayPastEnd = computeFocusClock({ sessionStartAt: start, now: start + totalMs * 5, totalPausedMs: 0, pausedAt: null, totalMs });
    expect(wayPastEnd.progress).toBeLessThanOrEqual(1);
    expect(wayPastEnd.remainingMs).toBe(0);
  });

  it("Test 9 — sıfır süreli oturumu güvenli şekilde ele alır (bölme hatası yok)", () => {
    const result = computeFocusClock({ sessionStartAt: 1000, now: 1000, totalPausedMs: 0, pausedAt: null, totalMs: 0 });
    expect(result.progress).toBe(1);
    expect(result.remainingMs).toBe(0);
    expect(Number.isFinite(result.elapsedMs)).toBe(true);
  });

  it("oturum henüz başlamadıysa (sessionStartAt=null) elapsed=0 döner", () => {
    const result = computeFocusClock({ sessionStartAt: null, now: 999_999, totalPausedMs: 0, pausedAt: null, totalMs });
    expect(result.elapsedMs).toBe(0);
    expect(result.progress).toBe(0);
  });

  it("Test 10 — arka plana geçiş/uygulama lifecycle sıçraması drift oluşturmaz", () => {
    // "Arka plana atılıp 10 dakika sonra geri dönme" senaryosu: tek bir büyük
    // zaman sıçraması, elapsed'i her zaman doğru (gerçek geçen süre) verir —
    // tick sayısına değil zaman damgasına dayandığı için.
    const start = 1_000_000;
    const backgroundedFor = 10 * 60 * 1000;
    const result = computeFocusClock({ sessionStartAt: start, now: start + backgroundedFor, totalPausedMs: 0, pausedAt: null, totalMs });
    expect(result.elapsedMs).toBe(backgroundedFor);
  });
});

describe("nextFocusStatus — state machine (Test 7 ile ilişkili: geçersiz geçişler sessizce kabul edilmez)", () => {
  it("idle → running (start)", () => {
    expect(nextFocusStatus("idle", "start")).toBe("running");
  });

  it("running → paused (pause)", () => {
    expect(nextFocusStatus("running", "pause")).toBe("paused");
  });

  it("paused → running (resume)", () => {
    expect(nextFocusStatus("paused", "resume")).toBe("running");
  });

  it("running → completed (complete)", () => {
    expect(nextFocusStatus("running", "complete")).toBe("completed");
  });

  it("paused → completed (erken bitirme) geçerlidir", () => {
    expect(nextFocusStatus("paused", "complete")).toBe("completed");
  });

  it("geçersiz geçişleri reddeder (durum değişmez): idle → pause", () => {
    expect(nextFocusStatus("idle", "pause")).toBe("idle");
  });

  it("geçersiz geçişleri reddeder: completed → resume", () => {
    expect(nextFocusStatus("completed", "resume")).toBe("completed");
  });

  it("geçersiz geçişleri reddeder: idle → resume", () => {
    expect(nextFocusStatus("idle", "resume")).toBe("idle");
  });

  it("completed durumdan cancel ile geri dönülemez (tamamlanmış oturum korunur)", () => {
    expect(nextFocusStatus("completed", "cancel")).toBe("completed");
  });

  it("running/paused durumdan cancel idle'a döner", () => {
    expect(nextFocusStatus("running", "cancel")).toBe("idle");
    expect(nextFocusStatus("paused", "cancel")).toBe("idle");
  });
});
