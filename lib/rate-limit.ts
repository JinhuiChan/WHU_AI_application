type RateLimitEntry = {
  timestamps: number[];
  expiresAt: number;
};

const entries = new Map<string, RateLimitEntry>();

function removeExpiredEntries(now: number) {
  for (const [entryKey, entry] of entries) {
    if (entry.expiresAt <= now) entries.delete(entryKey);
  }
}

export function isBlocked(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  removeExpiredEntries(now);
  const timestamps = (entries.get(key)?.timestamps ?? []).filter(
    (timestamp) => timestamp > now - windowMs,
  );
  return timestamps.length >= limit;
}

export function record(key: string, windowMs: number): void {
  const now = Date.now();
  removeExpiredEntries(now);
  const timestamps = (entries.get(key)?.timestamps ?? []).filter(
    (timestamp) => timestamp > now - windowMs,
  );
  timestamps.push(now);
  entries.set(key, { timestamps, expiresAt: now + windowMs });
}

export function reset(key: string): void {
  entries.delete(key);
}
