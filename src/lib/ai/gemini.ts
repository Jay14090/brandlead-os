import { GoogleGenAI } from '@google/genai';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';

let clientCache: GoogleGenAI | null = null;

async function getApiKey(): Promise<string> {
  const settings = await prisma.settings.findFirst({ where: { id: 1 } });
  if (settings?.encryptedGeminiKey) {
    const key = decrypt(settings.encryptedGeminiKey);
    if (key) return key;
  }
  const envKey = process.env.GEMINI_API_KEY;
  if (envKey) return envKey;
  throw new Error('Gemini API key not configured. Add it in Settings or set GEMINI_API_KEY in .env');
}

async function getClient(): Promise<GoogleGenAI> {
  const apiKey = await getApiKey();
  if (!clientCache) {
    clientCache = new GoogleGenAI({ apiKey });
  }
  return clientCache;
}

export function invalidateGeminiClient() {
  clientCache = null;
}

async function getModels(): Promise<{ primary: string; fast: string }> {
  const settings = await prisma.settings.findFirst({ where: { id: 1 } });
  return {
    primary: settings?.geminiModel || 'gemini-3.1-pro-preview',
    fast: settings?.geminiFastModel || 'gemini-3.5-flash',
  };
}

/**
 * Generate content with Gemini, optionally grounded with Google Search
 */
export async function generateWithGemini(
  prompt: string,
  options?: {
    useFastModel?: boolean;
    useGrounding?: boolean;
    systemPrompt?: string;
  }
): Promise<string> {
  const client = await getClient();
  const models = await getModels();
  const model = options?.useFastModel ? models.fast : models.primary;

  try {
    const config: Record<string, unknown> = {};

    if (options?.useGrounding) {
      config.tools = [{ googleSearch: {} }];
    }

    if (options?.systemPrompt) {
      config.systemInstruction = options.systemPrompt;
    }

    const response = await client.models.generateContent({
      model,
      contents: prompt,
      config,
    });

    return response.text || '';
  } catch (error: unknown) {
    const err = error as Error;
    // If grounding fails, retry without it
    if (options?.useGrounding && err.message?.includes('grounding')) {
      console.warn('Gemini grounding unavailable, falling back without grounding');
      return generateWithGemini(prompt, { ...options, useGrounding: false });
    }
    throw error;
  }
}

/**
 * Verify/enrich data using Gemini with Google Search grounding
 */
export async function verifyWithGemini(
  prompt: string
): Promise<string> {
  return generateWithGemini(prompt, {
    useFastModel: true,
    useGrounding: true,
  });
}

/**
 * Test Gemini API key connectivity
 */
export async function testGeminiKey(apiKey: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Say "API key is valid" in exactly 4 words.' }] }]
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `Key Length: ${apiKey.length}. Key Starts With: ${apiKey.substring(0, 5)}. Error: ${errorText}` };
    }

    const data = await response.json();
    if (data.candidates && data.candidates.length > 0) {
      return { success: true };
    }
    return { success: false, error: 'No text generated' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
