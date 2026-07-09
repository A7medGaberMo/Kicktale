export class KeyManager {
  private keys: string[];
  private currentIndex: number = 0;

  constructor(envKeyString: string | undefined) {
    if (!envKeyString) {
      this.keys = [];
    } else {
      this.keys = envKeyString.split(',').map(k => k.trim()).filter(Boolean);
    }
  }

  getKey(): string {
    if (this.keys.length === 0) throw new Error("No keys available in KeyManager");
    return this.keys[this.currentIndex];
  }

  rotate(): string {
    if (this.keys.length === 0) throw new Error("No keys available to rotate");
    this.currentIndex = (this.currentIndex + 1) % this.keys.length;
    console.log(`Rotated key. Now using key index: ${this.currentIndex}`);
    return this.getKey();
  }
}

export const apiFootballKeys = new KeyManager(process.env.API_FOOTBALL_KEYS);
export const newsApiKeys = new KeyManager(process.env.NEWS_API_KEYS);
export const tavilyKeys = new KeyManager(process.env.TAVILY_KEYS);
export const geminiKeys = new KeyManager(process.env.GEMINI_KEYS);
export const groqKeys = new KeyManager(process.env.GROQ_KEYS);
