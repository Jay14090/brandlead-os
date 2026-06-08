import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { testOpenAIKey } from '@/lib/ai/openai';
import { testGeminiKey } from '@/lib/ai/gemini';
import { testExaKey } from '@/lib/providers/exa';
import { testFirecrawlKey } from '@/lib/providers/firecrawl';

export async function POST(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const results: Record<string, { success: boolean; error?: string; model?: string }> = {};

    if (body.openAIKey) {
      results.openai = await testOpenAIKey(body.openAIKey);
    }

    if (body.geminiKey) {
      results.gemini = await testGeminiKey(body.geminiKey);
    }

    if (body.exaKey) {
      results.exa = await testExaKey(body.exaKey);
    }

    if (body.firecrawlKey) {
      results.firecrawl = await testFirecrawlKey(body.firecrawlKey);
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Test API keys error:', error);
    return NextResponse.json({ error: 'Failed to test keys' }, { status: 500 });
  }
}
