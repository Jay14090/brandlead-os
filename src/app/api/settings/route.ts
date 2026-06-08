import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { encrypt, decrypt, maskKey } from '@/lib/crypto';
import { getSession } from '@/lib/auth';
import { settingsSchema } from '@/lib/schemas';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let settings = await prisma.settings.findFirst({ where: { id: 1 } });
    if (!settings) {
      settings = await prisma.settings.create({
        data: { id: 1 },
      });
    }

    // Return masked keys
    return NextResponse.json({
      openAIKey: settings.encryptedOpenAIKey ? maskKey(decrypt(settings.encryptedOpenAIKey)) : '',
      openAIModel: settings.openAIModel,
      geminiKey: settings.encryptedGeminiKey ? maskKey(decrypt(settings.encryptedGeminiKey)) : '',
      geminiModel: settings.geminiModel,
      geminiFastModel: settings.geminiFastModel,
      firecrawlKey: settings.encryptedFirecrawlKey ? maskKey(decrypt(settings.encryptedFirecrawlKey)) : '',
      exaKey: settings.encryptedExaKey ? maskKey(decrypt(settings.encryptedExaKey)) : '',
      strictnessModeDefault: settings.strictnessModeDefault,
      maxLeadsPerSearch: settings.maxLeadsPerSearch,
      maxPagesPerLead: settings.maxPagesPerLead,
      requestDelay: settings.requestDelay,
      hasOpenAIKey: !!settings.encryptedOpenAIKey || !!process.env.OPENAI_API_KEY,
      hasGeminiKey: !!settings.encryptedGeminiKey || !!process.env.GEMINI_API_KEY,
      hasFirecrawlKey: !!settings.encryptedFirecrawlKey || !!process.env.FIRECRAWL_API_KEY,
      hasExaKey: !!settings.encryptedExaKey || !!process.env.EXA_API_KEY,
    });
  } catch (error) {
    console.error('Get settings error:', error);
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = settingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid settings', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Build update data — only encrypt non-empty, non-masked keys
    const updateData: Record<string, unknown> = {
      openAIModel: data.openAIModel,
      geminiModel: data.geminiModel,
      geminiFastModel: data.geminiFastModel,
      strictnessModeDefault: data.strictnessModeDefault,
      maxLeadsPerSearch: data.maxLeadsPerSearch,
      maxPagesPerLead: data.maxPagesPerLead,
      requestDelay: data.requestDelay,
    };

    // Only update keys if they don't contain mask characters
    if (data.openAIKey && !data.openAIKey.includes('••')) {
      updateData.encryptedOpenAIKey = encrypt(data.openAIKey);
    }
    if (data.geminiKey && !data.geminiKey.includes('••')) {
      updateData.encryptedGeminiKey = encrypt(data.geminiKey);
    }
    if (data.firecrawlKey && !data.firecrawlKey.includes('••')) {
      updateData.encryptedFirecrawlKey = encrypt(data.firecrawlKey);
    }
    if (data.exaKey && !data.exaKey.includes('••')) {
      updateData.encryptedExaKey = encrypt(data.exaKey);
    }

    // Clear keys if empty string provided
    if (data.openAIKey === '') updateData.encryptedOpenAIKey = '';
    if (data.geminiKey === '') updateData.encryptedGeminiKey = '';
    if (data.firecrawlKey === '') updateData.encryptedFirecrawlKey = '';
    if (data.exaKey === '') updateData.encryptedExaKey = '';

    await prisma.settings.upsert({
      where: { id: 1 },
      create: { id: 1, ...updateData },
      update: updateData,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Save settings error:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
