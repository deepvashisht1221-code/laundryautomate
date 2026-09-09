const PREFIX = "dhobisb.cache.";

export function saveCache<T>(key: string, data: T) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ data, savedAt: Date.now() }));
  } catch {
    // storage unavailable (private mode, quota) — skip caching
  }
}

export function loadCache<T>(key: string): { data: T; savedAt: number } | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as { data: T; savedAt: number }) : null;
  } catch {
    return null;
  }
}
