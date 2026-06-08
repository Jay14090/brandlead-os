import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';

async function getApiKey(): Promise<string | null> {
  const settings = await prisma.settings.findFirst({ where: { id: 1 } });
  if (settings?.encryptedFirecrawlKey) {
    const key = decrypt(settings.encryptedFirecrawlKey);
    if (key) return key;
  }
  return process.env.FIRECRAWL_API_KEY || null;
}

export async function isFirecrawlAvailable(): Promise<boolean> {
  const key = await getApiKey();
  return !!key;
}

export async function scrapeWithFirecrawl(
  url: string
): Promise<{ markdown: string; metadata: Record<string, unknown> }> {
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error('Firecrawl API key not configured');

  // Use the REST API directly to avoid SDK version issues
  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      url,
      formats: ['markdown'],
    }),
  });

  if (!response.ok) {
    throw new Error(`Firecrawl scrape failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return {
    markdown: data.data?.markdown || '',
    metadata: data.data?.metadata || {},
  };
}

export async function testFirecrawlKey(apiKey: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url: 'https://example.com',
        formats: ['markdown'],
      }),
    });

    if (response.ok) {
      return { success: true };
    }
    const errorData = await response.json().catch(() => ({}));
    return { success: false, error: (errorData as Record<string, string>).error || `HTTP ${response.status}` };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, error: err.message };
  }
}
