type Entry = {
  count: number;
  timestamp: number;
};

const RATE_LIMIT = 10; // requests
const WINDOW_MS = 60_000; // 1 minute

const store = new Map<string, Entry>();

export function rateLimit(key: string) {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry) {
    store.set(key, { count: 1, timestamp: now });
    return true;
  }

  if (now - entry.timestamp > WINDOW_MS) {
    store.set(key, { count: 1, timestamp: now });
    return true;
  }

  if (entry.count >= RATE_LIMIT) {
    return false;
  }

  entry.count++;
  return true;
}
