import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await getSession();
  console.log('Activity route session:', session);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized', session }, { status: 401 });
  }

  try {
    const userId = (await params).userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const jobs = await prisma.searchJob.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { leads: true } }
      }
    });

    const leads = await prisma.lead.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50, // Limit to 50 recent leads for the activity view
      select: {
        id: true,
        companyName: true,
        overallConfidence: true,
        status: true,
        createdAt: true,
        websiteStatus: true,
      }
    });

    return NextResponse.json({ username: user.username, jobs, leads });
  } catch (error) {
    console.error('Get user activity error:', error);
    return NextResponse.json({ error: 'Failed to fetch user activity' }, { status: 500 });
  }
}
