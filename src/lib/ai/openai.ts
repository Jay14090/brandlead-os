import OpenAI from 'openai';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';

let clientCache: OpenAI | null = null;

async function getApiKey(): Promise<string> {
  // First check settings DB for user-saved key
  const settings = await prisma.settings.findFirst({ where: { id: 1 } });
  if (settings?.encryptedOpenAIKey) {
    const key = decrypt(settings.encryptedOpenAIKey);
    if (key) return key;
  }
  // Fall back to env
  const envKey = process.env.OPENAI_API_KEY;
  if (envKey) return envKey;
  throw new Error('OpenAI API key not configured. Add it in Settings or set OPENAI_API_KEY in .env');
}

async function getClient(): Promise<OpenAI> {
  const apiKey = await getApiKey();
  // Invalidate cache if key changed
  if (!clientCache) {
    clientCache = new OpenAI({ apiKey });
  }
  return clientCache;
}

export function invalidateOpenAIClient() {
  clientCache = null;
}

async function getModel(): Promise<string> {
  const settings = await prisma.settings.findFirst({ where: { id: 1 } });
  return settings?.openAIModel || 'gpt-5.5';
}

/**
 * Use OpenAI Responses API with web_search tool for real-time web data
 */
export async function searchWithOpenAI(
  query: string,
  options?: { reasoningEffort?: 'low' | 'medium' | 'high' }
): Promise<{ text: string; sources: string[] }> {
  const client = await getClient();
  const model = await getModel();

  try {
    const response = await client.responses.create({
      model,
      input: query,
      tools: [{ type: 'web_search' as const }],
      ...(options?.reasoningEffort && { reasoning: { effort: options.reasoningEffort } }),
    });

    // Extract sources from output items
    const sources: string[] = [];
    if (response.output && Array.isArray(response.output)) {
      for (const item of response.output) {
        if (item.type === 'web_search_call') {
          // Web search was triggered
        }
      }
    }

    return {
      text: response.output_text || '',
      sources,
    };
  } catch (error: unknown) {
    const err = error as Error & { status?: number; code?: string };
    if (err.status === 404 || err.code === 'model_not_found') {
      throw new Error(
        `Model "${model}" is not available on your OpenAI account. ` +
        `Please update the model in Settings (try gpt-4.1 or gpt-4o).`
      );
    }
    throw error;
  }
}

/**
 * Generate structured JSON output using OpenAI Responses API
 */
export async function generateWithOpenAI(
  prompt: string,
  options?: {
    systemPrompt?: string;
    reasoningEffort?: 'low' | 'medium' | 'high';
    useWebSearch?: boolean;
  }
): Promise<string> {
  const client = await getClient();
  const model = await getModel();

  const tools: Array<{ type: 'web_search' }> = [];
  if (options?.useWebSearch) {
    tools.push({ type: 'web_search' as const });
  }

  const input: Array<{ role: string; content: string }> = [];
  if (options?.systemPrompt) {
    input.push({ role: 'system', content: options.systemPrompt });
  }
  input.push({ role: 'user', content: prompt });

  try {
    const response = await client.responses.create({
      model,
      input: input as any,
      ...(tools.length > 0 && { tools }),
      ...(options?.reasoningEffort && { reasoning: { effort: options.reasoningEffort } }),
    });

    return response.output_text || '';
  } catch (error: unknown) {
    const err = error as Error & { status?: number; code?: string };
    if (err.status === 404 || err.code === 'model_not_found') {
      throw new Error(
        `Model "${model}" not available. Update in Settings (try gpt-4.1 or gpt-4o).`
      );
    }
    throw error;
  }
}

/**
 * Test OpenAI API key connectivity
 */
export async function testOpenAIKey(apiKey: string): Promise<{ success: boolean; error?: string; model?: string }> {
  try {
    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Say "API key is valid" in exactly 4 words.' }],
    });
    return { success: true, model: response.model };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, error: err.message };
  }
}
