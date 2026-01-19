type Hit = {
  count: number;
  resetAt: number; // epoch ms
};

const STORE = new Map<string, Hit>();

export type RateLimitOptions = {
  windowMs: number;
  maxRequests: number;
};

export type RateLimitResult =
  | { ok: true; remaining: number; resetAt: number }
  | { ok: false; remaining: 0; resetAt: number };

function getWindowMs(): number {
  const raw = process.env.RATE_LIMIT_WINDOW_MS;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 60_000;
}

function getMaxRequests(): number {
  const raw = process.env.RATE_LIMIT_REQUESTS;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 20;
}

function maybePrune(now: number) {
  // Opportunistic cleanup to keep memory bounded.
  if (STORE.size < 5_000) return;
  for (const [key, hit] of STORE) {
    if (hit.resetAt <= now) {
      STORE.delete(key);
    }
  }
}

export function rateLimit(key: string, opts?: Partial<RateLimitOptions>): RateLimitResult {
  const windowMs = opts?.windowMs ?? getWindowMs();
  const maxRequests = opts?.maxRequests ?? getMaxRequests();

  const now = Date.now();
  maybePrune(now);
  const existing = STORE.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    STORE.set(key, { count: 1, resetAt });
    return { ok: true, remaining: Math.max(0, maxRequests - 1), resetAt };
  }

  if (existing.count >= maxRequests) {
    return { ok: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  STORE.set(key, existing);

  return { ok: true, remaining: Math.max(0, maxRequests - existing.count), resetAt: existing.resetAt };
}
