// Simple in-memory rate limiter. Good enough for a single-instance deploy.
// If ClipAI ever runs on multiple server instances, swap this for Redis
// (counts here are NOT shared across processes/instances).

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

// Periodic cleanup so the Map doesn't grow forever.
setInterval(() => {
  const now = Date.now()
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key)
  }
}, 5 * 60 * 1000).unref?.()

/**
 * Returns { allowed, remaining, retryAfterSec }.
 * Call `recordFailure(key)` only on failed attempts; call `reset(key)` on success.
 */
export function checkRateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt < now) {
    return { allowed: true, remaining: max, retryAfterSec: 0 }
  }

  if (bucket.count >= max) {
    return { allowed: false, remaining: 0, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) }
  }

  return { allowed: true, remaining: max - bucket.count, retryAfterSec: 0 }
}

export function recordFailure(key: string, windowMs: number) {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return
  }

  bucket.count += 1
}

export function resetRateLimit(key: string) {
  buckets.delete(key)
}
