export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class LruCache<T> {
  private map = new Map<string, CacheEntry<T>>();
  private readonly maxEntries: number;
  private readonly defaultTtlMs: number;

  constructor(maxEntries = 64, defaultTtlMs = 15 * 60 * 1000) {
    this.maxEntries = maxEntries;
    this.defaultTtlMs = defaultTtlMs;
  }

  public get(key: string): T | null {
    const entry = this.map.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return null;
    }
    // Refresh LRU order
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  public set(key: string, value: T, ttlMs = this.defaultTtlMs): void {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.maxEntries) {
      const oldestKey = this.map.keys().next().value;
      if (oldestKey !== undefined) {
        this.map.delete(oldestKey);
      }
    }
    this.map.set(key, {
      value,
      expiresAt: Date.now() + ttlMs
    });
  }

  public clear(): void {
    this.map.clear();
  }
}
