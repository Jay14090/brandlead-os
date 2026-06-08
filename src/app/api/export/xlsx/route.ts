import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { generateXLSX } from '@/lib/export/xlsx';

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

    const buffer = generateXLSX(leads);

    return new NextResponse(buffer as any, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="brandlead-leads-${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('XLSX export error:', error);
    return NextResponse.json({ error: 'Failed to export XLSX' }, { status: 500 });
  }
}
