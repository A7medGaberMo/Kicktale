import { keyPool } from './keys';

// Helpers to clean markdown JSON blocks
export function cleanJSON(text: string): string {
  let cleaned = text.trim();
  // Remove markdown code fence if present
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\n/, '');
    cleaned = cleaned.replace(/\n```$/, '');
  }
  return cleaned.trim();
}

async function callGroqWithRotation(systemPrompt: string, userPrompt: string, responseFormatJson = false): Promise<string> {
  const keys = keyPool.getPool('groq');
  let lastError: any = null;

  // Try up to 5 keys in the pool sequentially
  const maxAttempts = Math.min(keys.length, 5);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const key = keyPool.getKey('groq');
    try {
      const body: any = {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
      };

      if (responseFormatJson) {
        body.response_format = { type: 'json_object' };
      }

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify(body)
      });

      if (res.status === 429 || res.status === 401) {
        throw new Error(`HTTP Status ${res.status} (Rate limited/Unauthorized)`);
      }

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Groq HTTP Error ${res.status}: ${errText}`);
      }

      const data = await res.json();
      keyPool.reportSuccess('groq', key);
      return data.choices[0].message.content;
    } catch (err: any) {
      console.warn(`Groq key attempt ${attempt + 1} failed (key starting with: ${key.substring(0, 8)}): ${err.message}`);
      keyPool.reportFailure('groq', key);
      lastError = err;
      // Wait a short delay before trying the next key
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  throw lastError || new Error('All Groq keys failed in rotation');
}

async function callOpenRouterWithRotation(systemPrompt: string, userPrompt: string, responseFormatJson = false): Promise<string> {
  const keys = keyPool.getPool('openrouter');
  let lastError: any = null;

  for (let attempt = 0; attempt < keys.length; attempt++) {
    const key = keyPool.getKey('openrouter');
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
          'HTTP-Referer': 'https://kicktale.com',
          'X-Title': 'Kicktale'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.3,
          response_format: responseFormatJson ? { type: 'json_object' } : undefined
        })
      });

      if (res.status === 429 || res.status === 401) {
        throw new Error(`HTTP Status ${res.status} (Rate limited/Unauthorized)`);
      }

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`OpenRouter HTTP Error ${res.status}: ${errText}`);
      }

      const data = await res.json();
      keyPool.reportSuccess('openrouter', key);
      return data.choices[0].message.content;
    } catch (err: any) {
      console.warn(`OpenRouter key attempt ${attempt + 1} failed (key starting with: ${key.substring(0, 8)}): ${err.message}`);
      keyPool.reportFailure('openrouter', key);
      lastError = err;
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  throw lastError || new Error('All OpenRouter keys failed in rotation');
}

/**
 * Execute LLM call with fallback: first Groq, then OpenRouter.
 */
export async function generateText(systemPrompt: string, userPrompt: string, responseFormatJson = false): Promise<string> {
  try {
    // Try Groq first with rotation
    return await callGroqWithRotation(systemPrompt, userPrompt, responseFormatJson);
  } catch (groqError: any) {
    console.warn('Groq key pool failed. Falling back to OpenRouter key pool...', groqError.message);
    try {
      // Fallback to OpenRouter with rotation
      return await callOpenRouterWithRotation(systemPrompt, userPrompt, responseFormatJson);
    } catch (orError: any) {
      console.error('All LLM providers and key rotation systems failed.');
      throw new Error(`LLM Fallback Failure. Groq: ${groqError.message}. OpenRouter: ${orError.message}`);
    }
  }
}

/**
 * Generate JSON structure from LLM with automatic parsing.
 */
export async function generateJSON<T>(systemPrompt: string, userPrompt: string): Promise<T> {
  const rawText = await generateText(systemPrompt, userPrompt, true);
  try {
    const cleaned = cleanJSON(rawText);
    return JSON.parse(cleaned) as T;
  } catch (err: any) {
    console.error('Failed to parse JSON from LLM output. Raw text was:', rawText);
    throw new Error(`JSON Parse Error: ${err.message}`);
  }
}
