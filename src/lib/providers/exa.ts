import Exa from 'exa-js';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';

async function getApiKey(): Promise<string | null> {
  const settings = await prisma.settings.findFirst({ where: { id: 1 } });
  if (settings?.encryptedExaKey) {
    const key = decrypt(settings.encryptedExaKey);
    if (key) return key;
  }
  return process.env.EXA_API_KEY || null;
}

export async function isExaAvailable(): Promise<boolean> {
  const key = await getApiKey();
  return !!key;
}

export async function searchWithExa(
  query: string,
  numResults: number = 10
): Promise<Array<{
  title: string;
  url: string;
  text: string;
  highlights: string[];
}>> {
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error('Exa API key not configured');

  const exa = new Exa(apiKey);

  const result = await exa.search(query, {
    type: 'auto',
    category: 'company',
    numResults,
    contents: {
      highlights: true,
      text: { maxCharacters: 2000 },
    },
  });

  return (result.results || []).map((r: Record<string, unknown>) => ({
    title: (r.title as string) || '',
    url: (r.url as string) || '',
    text: (r.text as string) || '',
    highlights: (r.highlights as string[]) || [],
  }));
}

export async function testExaKey(apiKey: string): Promise<{ success: boolean; error?: string }> {
  try {
    const exa = new Exa(apiKey);
    await exa.search('test', { type: 'auto', numResults: 1 });
    return { success: true };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, error: err.message };
  }
}
