type CacheEntry = {
  translatedText: string;
  provider: string;
  detectedSourceLang: string | null;
  expiresAt: number;
};

const CACHE = new Map<string, CacheEntry>();

function getCacheTtlMs(): number {
  const raw = process.env.TRANSLATION_CACHE_TTL_MS;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5 * 60_000;
}

function getMaxEntries(): number {
  const raw = process.env.TRANSLATION_CACHE_MAX_ENTRIES;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 500;
}

function prune(now: number) {
  // Remove expired first.
  for (const [key, entry] of CACHE) {
    if (entry.expiresAt <= now) {
      CACHE.delete(key);
    }
  }

  // If still too big, drop oldest-ish by iteration order.
  const max = getMaxEntries();
  while (CACHE.size > max) {
    const firstKey = CACHE.keys().next().value as string | undefined;
    if (!firstKey) break;
    CACHE.delete(firstKey);
  }
}

export function getCachedTranslation(key: string): Omit<CacheEntry, "expiresAt"> | null {
  const now = Date.now();
  const entry = CACHE.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= now) {
    CACHE.delete(key);
    return null;
  }
  return {
    translatedText: entry.translatedText,
    provider: entry.provider,
    detectedSourceLang: entry.detectedSourceLang,
  };
}

export function setCachedTranslation(key: string, value: Omit<CacheEntry, "expiresAt">) {
  const now = Date.now();
  const ttlMs = getCacheTtlMs();
  CACHE.set(key, { ...value, expiresAt: now + ttlMs });

  // Opportunistic prune.
  if (CACHE.size > getMaxEntries()) {
    prune(now);
  }
}
