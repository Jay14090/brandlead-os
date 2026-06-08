import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { updateLeadSchema } from '@/lib/schemas';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const { leadId } = await params;
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        crawledPages: { select: { id: true, url: true, title: true, statusCode: true } },
        contacts: { orderBy: { confidence: 'desc' } },
        decisionMakers: {
          include: { contactEvidences: { orderBy: { confidence: 'desc' } } },
          orderBy: { confidence: 'desc' }
        },
        job: { select: { brandType: true, location: true, searchDepth: true } },
        finalLeadDecision: true,
      },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...lead,
      painPoints: JSON.parse(lead.painPoints || '[]'),
      sourceUrls: JSON.parse(lead.sourceUrls || '[]'),
      auditJson: lead.finalLeadDecision ? JSON.parse(lead.finalLeadDecision.finalJson) : null,
      geminiReview: lead.finalLeadDecision?.geminiReviewJson ? JSON.parse(lead.finalLeadDecision.geminiReviewJson) : null,
    });
  } catch (error) {
    console.error('Get lead error:', error);
    return NextResponse.json({ error: 'Failed to get lead' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const { leadId } = await params;
    const body = await request.json();
    const parsed = updateLeadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid update data', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value !== undefined) {
        updateData[key] = value;
      }
    }

    const lead = await prisma.lead.update({
      where: { id: leadId },
      data: updateData,
    });

    return NextResponse.json(lead);
  } catch (error) {
    console.error('Update lead error:', error);
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const { leadId } = await params;
    await prisma.lead.delete({ where: { id: leadId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete lead error:', error);
    return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 });
  }
}
