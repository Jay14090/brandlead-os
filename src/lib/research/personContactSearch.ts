import { prisma } from '../prisma';
import { buildPersonContactQueries } from './queryPlanner';
import { collectSearchEvidence } from './evidenceCollector';

export async function runPersonContactSearches(jobId: string, searchDepth: string) {
  // Find top decision makers for this job
  const dms = await prisma.decisionMakerCandidate.findMany({
    where: { lead: { jobId } },
    include: { lead: true }
  });

  const evidenceInputs: any[] = [];

  for (const dm of dms) {
    if (!dm.isOutreachRelevant) continue;

    const queries = buildPersonContactQueries(
      dm.personName,
      dm.lead.companyName,
      dm.lead.websiteUrl
    );

    // Limit based on depth
    const maxQueries = searchDepth === 'Deep' ? 6 : searchDepth === 'Balanced' ? 3 : 1;
    const selectedQueries = queries.slice(0, maxQueries);

    for (const q of selectedQueries) {
      evidenceInputs.push({
        jobId,
        query: q,
        resultType: 'person_contact_search',
        maxResults: 3
      });
    }
  }

  // Execute the queries to gather raw evidence
  // We chunk them to avoid rate limits
  for (let i = 0; i < evidenceInputs.length; i += 5) {
    await collectSearchEvidence(evidenceInputs.slice(i, i + 5));
  }

  // After gathering raw evidence, extract emails and phones linked to the person
  await extractPersonContactsFromEvidence(jobId);
}

async function extractPersonContactsFromEvidence(jobId: string) {
  const pcEvidence = await prisma.rawEvidence.findMany({
    where: { jobId, resultType: 'person_contact_search' }
  });

  const dms = await prisma.decisionMakerCandidate.findMany({
    where: { lead: { jobId } },
    include: { lead: true }
  });

  const contactsToSave: any[] = [];

  for (const dm of dms) {
    // Find evidence relevant to this DM
    const relevant = pcEvidence.filter(e => e.query?.toLowerCase().includes(dm.personName.toLowerCase()));
    
    for (const ev of relevant) {
      const text = ev.snippet || '';
      
      // Basic Email Extraction
      const emailMatches = text.match(/[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}/g) || [];
      for (const email of emailMatches) {
        contactsToSave.push({
          decisionMakerCandidateId: dm.id,
          leadId: dm.leadId,
          personName: dm.personName,
          companyName: dm.lead.companyName,
          contactType: 'email',
          value: email,
          normalizedValue: email.toLowerCase(),
          sourceUrl: ev.url || '',
          sourceTitle: ev.title,
          sourceSnippet: text,
          queryUsed: ev.query,
          provider: ev.provider,
          associationType: text.toLowerCase().includes(dm.personName.toLowerCase()) ? 'direct_person' : 'unclear',
          confidence: ev.providerConfidence || 50,
          status: 'Candidate'
        });
      }

      // Basic LinkedIn Extraction
      const liMatches = text.match(/https:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/g) || [];
      for (const li of liMatches) {
        contactsToSave.push({
          decisionMakerCandidateId: dm.id,
          leadId: dm.leadId,
          personName: dm.personName,
          companyName: dm.lead.companyName,
          contactType: 'linkedin',
          value: li,
          normalizedValue: li,
          sourceUrl: ev.url || '',
          sourceTitle: ev.title,
          sourceSnippet: text,
          queryUsed: ev.query,
          provider: ev.provider,
          associationType: 'direct_person',
          confidence: 80,
          status: 'Candidate'
        });
      }
    }
  }

  // Deduplicate and save
  const uniqueKeys = new Set();
  const toSave = contactsToSave.filter(c => {
    const key = `${c.decisionMakerCandidateId}-${c.contactType}-${c.normalizedValue}`;
    if (uniqueKeys.has(key)) return false;
    uniqueKeys.add(key);
    return true;
  });

  if (toSave.length > 0) {
    await prisma.personContactEvidence.createMany({
      data: toSave
    });
  }
}
