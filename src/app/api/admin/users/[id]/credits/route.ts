import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { amount } = body;
    
    if (typeof amount !== 'number') {
      return NextResponse.json({ error: 'Amount must be a number' }, { status: 400 });
    }

    const { id } = await params;

    const user = await prisma.user.update({
      where: { id },
      data: {
        credits: {
          increment: amount
        }
      },
      select: { id: true, username: true, credits: true }
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('Update credits error:', error);
    return NextResponse.json({ error: 'Failed to update credits' }, { status: 500 });
  }
}
