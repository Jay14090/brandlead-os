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
    const job = await prisma.searchJob.findUnique({
      where: { id: jobId },
      include: {
        leads: {
          select: { id: true, companyName: true, overallConfidence: true, status: true, websiteStatus: true },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...job,
      progress: JSON.parse(job.progress || '{}'),
      contactPreference: JSON.parse(job.contactPreference || '[]'),
    });
  } catch (error) {
    console.error('Get job error:', error);
    return NextResponse.json({ error: 'Failed to get job' }, { status: 500 });
  }
}
