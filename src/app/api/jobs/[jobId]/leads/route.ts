import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const { jobId } = await params;
    const leads = await prisma.lead.findMany({
      where: { jobId },
      orderBy: { overallConfidence: 'desc' },
    });

    return NextResponse.json(leads.map(lead => ({
      ...lead,
      overallConfidence: lead.overallConfidence,
      painPoints: JSON.parse(lead.painPoints || '[]'),
      sourceUrls: JSON.parse(lead.sourceUrls || '[]'),
    })));
  } catch (error) {
    console.error('Get job leads error:', error);
    return NextResponse.json({ error: 'Failed to get leads' }, { status: 500 });
  }
}
