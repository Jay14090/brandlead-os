import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { runPipeline } from '@/lib/pipeline/orchestrator';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const { jobId } = await params;
    const job = await prisma.searchJob.findUnique({ where: { id: jobId } });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.status === 'running') {
      return NextResponse.json({ error: 'Job is already running' }, { status: 409 });
    }

    // Update status to running
    await prisma.searchJob.update({
      where: { id: jobId },
      data: { status: 'running' },
    });

    // Run pipeline in background (don't await)
    runPipeline(jobId).catch((error) => {
      console.error(`Pipeline error for job ${jobId}:`, error);
    });

    return NextResponse.json({ status: 'running', message: 'Pipeline started' });
  } catch (error) {
    console.error('Run job error:', error);
    return NextResponse.json({ error: 'Failed to start job' }, { status: 500 });
  }
}
