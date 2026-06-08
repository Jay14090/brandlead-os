import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { searchJobSchema } from '@/lib/schemas';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = searchJobSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid search parameters', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    let costPerLead = 0.0144; // Default to Balanced
    if (data.searchDepth === 'Fast') costPerLead = 0.0052;
    else if (data.searchDepth === 'Balanced') costPerLead = 0.0144;
    else if (data.searchDepth === 'Deep') costPerLead = 0.036;

    const estimatedCost = costPerLead * data.leadCount;

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user || user.credits < estimatedCost) {
      return NextResponse.json({ error: 'Your credits are over. Contact admin for top up.' }, { status: 403 });
    }

    await prisma.user.update({
      where: { id: session.userId },
      data: { credits: { decrement: estimatedCost } }
    });

    const job = await prisma.searchJob.create({
      data: {
        userId: session.userId,
        brandType: data.brandType,
        location: data.location,
        leadCount: data.leadCount,
        companySize: data.companySize,
        businessMaturity: data.businessMaturity,
        contactPreference: JSON.stringify(data.contactPreference),
        extraInstructions: data.extraInstructions,
        strictnessMode: data.strictnessMode,
        searchDepth: data.searchDepth,
        status: 'pending',
        progress: JSON.stringify({ stage: 'pending', stageIndex: -1, totalStages: 8, message: 'Waiting to start...' }),
      },
    });

    return NextResponse.json({ id: job.id, status: job.status });
  } catch (error) {
    console.error('Create job error:', error);
    return NextResponse.json({ error: 'Failed to create search job' }, { status: 500 });
  }
}
