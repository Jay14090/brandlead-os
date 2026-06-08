import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const maxConfidenceParam = searchParams.get('maxConfidence');
    const maxConfidence = maxConfidenceParam ? parseInt(maxConfidenceParam) : 49;

    const result = await prisma.lead.deleteMany({
      where: {
        overallConfidence: {
          lte: maxConfidence
        }
      }
    });

    return NextResponse.json({ success: true, deletedCount: result.count });
  } catch (error) {
    console.error('Scrap leads error:', error);
    return NextResponse.json({ error: 'Failed to scrap leads' }, { status: 500 });
  }
}
