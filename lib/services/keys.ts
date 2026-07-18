import { kv } from '@vercel/kv';

export interface KeyState {
  key: string;
  failures: number;
  lastUsed: number;
  blacklistedUntil: number;
}

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

class KeyPoolManager {
  private inMemoryPools: Record<string, KeyState[]> = {};

  constructor() {
    this.initPools();
  }

  private loadKeyPool(envVar: string, fallbackKeys: string[] = []): string[] {
    const raw = process.env[envVar];
    if (!raw) {
      return fallbackKeys;
    }
    return raw.split(',').map(k => k.trim()).filter(Boolean);
  }

  private initPools() {
    this.inMemoryPools['football_data'] = this.loadKeyPool('FOOTBALL_DATA_KEYS').map(k => this.createKeyState(k));
    this.inMemoryPools['api_football'] = this.loadKeyPool('API_FOOTBALL_KEYS').map(k => this.createKeyState(k));
    this.inMemoryPools['news_api'] = this.loadKeyPool('NEWS_API_KEYS').map(k => this.createKeyState(k));
    this.inMemoryPools['tavily'] = this.loadKeyPool('TAVILY_KEYS').map(k => this.createKeyState(k));
    this.inMemoryPools['gemini'] = this.loadKeyPool('GEMINI_KEYS').map(k => this.createKeyState(k));
    this.inMemoryPools['groq'] = this.loadKeyPool('GROQ_KEYS').map(k => this.createKeyState(k));
    this.inMemoryPools['cerebras'] = this.loadKeyPool('CEREBRAS_KEYS').map(k => this.createKeyState(k));
    this.inMemoryPools['openrouter'] = this.loadKeyPool('OPENROUTER_KEYS').map(k => this.createKeyState(k));
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
    return (this.inMemoryPools[service] || []).map(k => k.key);
  }

  public async getAvailableKeyCount(service: string): Promise<number> {
    const pool = await this.getStates(service);
    const now = Date.now();
    return pool.filter(k => k.blacklistedUntil < now).length;
  }

  private async getStates(service: string): Promise<KeyState[]> {
    if (process.env.KV_REST_API_URL) {
      try {
        const data = await kv.get<KeyState[]>(`key_pool:${service}`);
        if (data) {
          // Merge missing keys from memory to handle newly added env var keys
          const memoryKeys = this.inMemoryPools[service] || [];
          const memoryKeyMap = new Map(memoryKeys.map(k => [k.key, k]));
          data.forEach(k => memoryKeyMap.set(k.key, k));
          return Array.from(memoryKeyMap.values());
        }
      } catch (e) {
        console.warn(`Failed to fetch KV states for ${service}:`, e);
      }
    }
    return this.inMemoryPools[service] || [];
  }

  private async saveStates(service: string, states: KeyState[]) {
    this.inMemoryPools[service] = states;
    if (process.env.KV_REST_API_URL) {
      try {
        await kv.set(`key_pool:${service}`, states);
      } catch (e) {
        console.warn(`Failed to save KV states for ${service}:`, e);
      }
    }
  }

  /**
   * Get an active key for the specified service.
   */
  public async getKey(service: string): Promise<string> {
    const pool = await this.getStates(service);
    if (!pool || pool.length === 0) {
      throw new Error(`No key pool found for service: ${service}`);
    }

    const now = Date.now();
    const available = pool.filter(k => k.blacklistedUntil < now);

    if (available.length === 0) {
      throw new RateLimitError(`All keys for service "${service}" are rate-limited/blacklisted.`);
    }

    available.sort((a, b) => {
      if (a.failures !== b.failures) {
        return a.failures - b.failures;
      }
      return a.lastUsed - b.lastUsed;
    });

    const selected = available[0];
    selected.lastUsed = now;
    await this.saveStates(service, pool);

    return selected.key;
  }

  /**
   * Mark a key as failed (e.g. rate limit, auth error).
   */
  public async reportFailure(service: string, key: string) {
    const pool = await this.getStates(service);
    if (!pool) return;

    const state = pool.find(k => k.key === key);
    if (state) {
      state.failures += 1;
      const duration = Math.min(10 * 60 * 1000 * Math.pow(2, state.failures - 1), 60 * 60 * 1000);
      state.blacklistedUntil = Date.now() + duration;
      console.warn(`Key failed for "${service}". Blacklisted for ${duration / 60000} minutes. Total failures: ${state.failures}`);
      await this.saveStates(service, pool);
    }
  }

  /**
   * Report success for a key, resetting its failures.
   */
  public async reportSuccess(service: string, key: string) {
    const pool = await this.getStates(service);
    if (!pool) return;

    const state = pool.find(k => k.key === key);
    if (state) {
      if (state.failures > 0 || state.blacklistedUntil > 0) {
        state.failures = 0;
        state.blacklistedUntil = 0;
        await this.saveStates(service, pool);
      }
    }
  }
}

export const keyPool = new KeyPoolManager();
