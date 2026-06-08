import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const status = searchParams.get('status');
    const verification = searchParams.get('verification');
    const minConfidence = searchParams.get('minConfidence');
    const hasEmail = searchParams.get('hasEmail');
    const hasPhone = searchParams.get('hasPhone');
    const hasLinkedIn = searchParams.get('hasLinkedIn');
    const search = searchParams.get('search');

    const where: Record<string, unknown> = {};

    if (session.role !== 'admin') {
      where.userId = session.userId;
    }

    if (jobId) where.jobId = jobId;
    if (status) where.status = status;
    if (verification) where.websiteVerificationStatus = verification;
    if (minConfidence) where.overallConfidence = { gte: parseInt(minConfidence) };
    if (hasEmail === 'true') {
      where.OR = [
        { companyGeneralEmail: { not: null } },
        { bestDecisionMakerEmail: { not: null } }
      ];
    }
    
    if (hasPhone === 'true') {
      const phoneOr = [
        { companyGeneralPhone: { not: null } },
        { bestDecisionMakerPhone: { not: null } }
      ];
      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: phoneOr }];
        delete where.OR;
      } else {
        where.OR = phoneOr;
      }
    }
    
    if (hasLinkedIn === 'true') {
      const liOr = [
        { linkedinCompanyUrl: { not: null } },
        { bestDecisionMakerLinkedIn: { not: null } }
      ];
      if (where.AND) {
        where.AND = [...(where.AND as any[]), { OR: liOr }];
      } else if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: liOr }];
        delete where.OR;
      } else {
        where.OR = liOr;
      }
    }
    if (search) where.companyName = { contains: search };

    const leads = await prisma.lead.findMany({
      where,
      orderBy: { overallConfidence: 'desc' },
      include: {
        job: { select: { brandType: true, location: true } },
      },
    });

    return NextResponse.json(leads.map(lead => ({
      ...lead,
      painPoints: JSON.parse(lead.painPoints || '[]'),
      sourceUrls: JSON.parse(lead.sourceUrls || '[]'),
    })));
  } catch (error) {
    console.error('Get leads error:', error);
    return NextResponse.json({ error: 'Failed to get leads' }, { status: 500 });
  }
}
