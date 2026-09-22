// Basit, bağımlılıksız, bellek-içi rate limiter (spec §1/§33). Tek instance
// deployment için yeterli; yatay ölçeklenmiş (çoklu process/sunucu) bir
// deployment'ta bunun yerine Redis-backed bir limiter gerekir — bkz.
// docs/subscription/SUBSCRIPTION-ARCHITECTURE.md "Known Limitations".
type Bucket = { count: number; windowStartedAt: number };

const buckets = new Map<string, Bucket>();

// Bellek sızıntısını önlemek için eski bucket'ları periyodik temizle.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of Array.from(buckets)) {
    if (now - bucket.windowStartedAt > 10 * 60 * 1000) buckets.delete(key);
  }
}, 5 * 60 * 1000).unref?.();

export class RateLimitExceededError extends Error {
  constructor(public readonly retryAfterMs: number) {
    super("RATE_LIMITED");
    this.name = "RateLimitExceededError";
  }
}

/**
 * Sabit pencereli (fixed-window) sayaç. `key` genellikle `${userId}:${procedure}`
 * ya da (kimliksiz istekler için) `${ip}:${procedure}` olur.
 */
export function checkRateLimit(key: string, maxRequests: number, windowMs: number): void {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now - bucket.windowStartedAt >= windowMs) {
    buckets.set(key, { count: 1, windowStartedAt: now });
    return;
  }
  if (bucket.count >= maxRequests) {
    throw new RateLimitExceededError(windowMs - (now - bucket.windowStartedAt));
  }
  bucket.count += 1;
}
