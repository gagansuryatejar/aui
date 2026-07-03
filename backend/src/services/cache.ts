import NodeCache from 'node-cache';

/**
 * In-memory cache with TTL support.
 * Swap to Redis by replacing this module with an ioredis wrapper.
 */
class CacheService {
  private cache: NodeCache;

  constructor(ttlSeconds = 300) {
    this.cache = new NodeCache({
      stdTTL: ttlSeconds,
      checkperiod: ttlSeconds * 0.2,
      useClones: false,
    });
  }

  get<T>(key: string): T | undefined {
    return this.cache.get<T>(key);
  }

  set<T>(key: string, value: T, ttl?: number): boolean {
    if (ttl !== undefined) {
      return this.cache.set(key, value, ttl);
    }
    return this.cache.set(key, value);
  }

  del(key: string): number {
    return this.cache.del(key);
  }

  flush(): void {
    this.cache.flushAll();
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  keys(): string[] {
    return this.cache.keys();
  }

  stats() {
    return this.cache.getStats();
  }
}

// ── Singleton instances ────────────────────────
/** General-purpose cache (5 min TTL) */
export const appCache = new CacheService(300);

/** Provider health cache (30 sec TTL) */
export const healthCache = new CacheService(30);
