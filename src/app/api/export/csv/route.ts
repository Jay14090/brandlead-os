import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { generateCSV } from '@/lib/export/csv';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    const where: Record<string, unknown> = {};
    if (session.role !== 'admin') {
      where.userId = session.userId;
    }
    if (jobId) where.jobId = jobId;

    const leads = await prisma.lead.findMany({
      where,
      orderBy: { overallConfidence: 'desc' },
      include: { contacts: { orderBy: { confidence: 'desc' } } },
    });

    const csv = generateCSV(leads);

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="brandlead-leads-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('CSV export error:', error);
    return NextResponse.json({ error: 'Failed to export CSV' }, { status: 500 });
  }
}
