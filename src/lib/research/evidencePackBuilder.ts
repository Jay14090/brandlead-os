import { prisma } from '../prisma';

export async function buildEvidencePack(leadId: string) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      contacts: {
        where: { status: { not: 'Rejected' } }
      },
      decisionMakers: {
        where: { status: { not: 'Rejected' } },
        include: {
          contactEvidences: {
            where: { status: { not: 'Rejected' } }
          }
        }
      },
      crawledPages: {
        select: { url: true, title: true, textContent: true }
      }
    }
  });

  if (!lead) return null;

  // We also want the company candidates merged from Phase 3 that correspond to this lead
  const candidates = await prisma.companyCandidate.findMany({
    where: { jobId: lead.jobId, companyName: { contains: lead.companyName.split(' ')[0] } }
  });

  const pack = {
    companyCandidates: candidates.map(c => ({
      name: c.companyName,
      aliases: JSON.parse(c.aliases || '[]'),
      possibleWebsites: JSON.parse(c.possibleWebsites || '[]'),
      providerVotes: JSON.parse(c.providerVotes || '{}')
    })),
    contacts: lead.contacts.map(c => ({
      type: c.type,
      value: c.value,
      purpose: c.contactPurpose,
      sourceUrl: c.sourceUrl,
      sourceSnippet: c.sourceSnippet,
      confidence: c.confidence
    })),
    decisionMakers: lead.decisionMakers.map(dm => ({
      name: dm.personName,
      role: dm.role,
      roleCategory: dm.roleCategory,
      sourceUrl: dm.sourceUrl,
      sourceSnippet: dm.sourceSnippet,
      personContacts: dm.contactEvidences.map(ce => ({
        type: ce.contactType,
        value: ce.value,
        associationType: ce.associationType,
        sourceUrl: ce.sourceUrl,
        sourceSnippet: ce.sourceSnippet
      }))
    })),
    // For business description, we just provide the first 500 chars of homepage text
    businessDescriptionEvidence: lead.crawledPages.map(p => ({
      url: p.url,
      snippet: (p.textContent || '').substring(0, 500)
    }))
  };

  return pack;
}
