export interface KeyState {
  key: string;
  failures: number;
  lastUsed: number;
  blacklistedUntil: number;
}

class KeyPoolManager {
  private pools: Record<string, KeyState[]> = {};

  constructor() {
    this.initPools();
  }

  private loadKeyPool(envVar: string, fallbackKeys: string[] = []): string[] {
    const raw = process.env[envVar];
    if (!raw) {
      // Fallback in case environment variables aren't loaded in some scripting environments
      return fallbackKeys;
    }
    return raw.split(',').map(k => k.trim()).filter(Boolean);
  }

  private initPools() {
    this.pools['football_data'] = this.loadKeyPool('FOOTBALL_DATA_KEYS').map(k => this.createKeyState(k));
    this.pools['api_football'] = this.loadKeyPool('API_FOOTBALL_KEYS').map(k => this.createKeyState(k));
    this.pools['news_api'] = this.loadKeyPool('NEWS_API_KEYS').map(k => this.createKeyState(k));
    this.pools['tavily'] = this.loadKeyPool('TAVILY_KEYS').map(k => this.createKeyState(k));
    this.pools['gemini'] = this.loadKeyPool('GEMINI_KEYS').map(k => this.createKeyState(k));
    this.pools['groq'] = this.loadKeyPool('GROQ_KEYS').map(k => this.createKeyState(k));
    this.pools['cerebras'] = this.loadKeyPool('CEREBRAS_KEYS').map(k => this.createKeyState(k));
    this.pools['openrouter'] = this.loadKeyPool('OPENROUTER_KEYS').map(k => this.createKeyState(k));
  }

  private createKeyState(key: string): KeyState {
    return {
      key,
      failures: 0,
      lastUsed: 0,
      blacklistedUntil: 0
    };
  }

  public getPool(service: string): string[] {
    return (this.pools[service] || []).map(k => k.key);
  }

  /**
   * Get an active key for the specified service.
   */
  public getKey(service: string): string {
    const pool = this.pools[service];
    if (!pool || pool.length === 0) {
      throw new Error(`No key pool found for service: ${service}`);
    }

    const now = Date.now();
    let available = pool.filter(k => k.blacklistedUntil < now);

    if (available.length === 0) {
      console.warn(`All keys for service "${service}" are blacklisted. Resetting blacklists.`);
      pool.forEach(k => {
        k.blacklistedUntil = 0;
      });
      available = pool;
    }

    available.sort((a, b) => {
      if (a.failures !== b.failures) {
        return a.failures - b.failures;
      }
      return a.lastUsed - b.lastUsed;
    });

    const selected = available[0];
    selected.lastUsed = now;
    return selected.key;
  }

  /**
   * Mark a key as failed (e.g. rate limit, auth error).
   */
  public reportFailure(service: string, key: string) {
    const pool = this.pools[service];
    if (!pool) return;

    const state = pool.find(k => k.key === key);
    if (state) {
      state.failures += 1;
      const duration = Math.min(10 * 60 * 1000 * Math.pow(2, state.failures - 1), 60 * 60 * 1000);
      state.blacklistedUntil = Date.now() + duration;
      console.warn(`Key failed for "${service}". Blacklisted for ${duration / 60000} minutes. Total failures: ${state.failures}`);
    }
  }

  /**
   * Report success for a key, resetting its failures.
   */
  public reportSuccess(service: string, key: string) {
    const pool = this.pools[service];
    if (!pool) return;

    const state = pool.find(k => k.key === key);
    if (state) {
      state.failures = 0;
      state.blacklistedUntil = 0;
    }
  }
}

export const keyPool = new KeyPoolManager();
