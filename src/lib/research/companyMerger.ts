import { prisma } from '../prisma';

export async function mergeCompanyCandidates(jobId: string, searchDepth: string) {
  // Fetch all raw evidence for this job that relates to company discovery
  const evidence = await prisma.rawEvidence.findMany({
    where: {
      jobId,
      resultType: 'company_discovery'
    }
  });

  const candidatesMap = new Map<string, any>();

  // A very simple deterministic heuristic for merging.
  // In a full production system, an LLM pass here would be ideal, 
  // but for speed we merge by normalized domain and title keywords.
  
  for (const item of evidence) {
    if (!item.title) continue;
    
    // Normalize domain
    let domain = '';
    if (item.url) {
      try {
        domain = new URL(item.url).hostname.replace(/^www\./, '');
      } catch (e) {}
    }
    
    // Create a key for merging. Prefer domain if exists, else first 2 words of title
    const cleanTitle = item.title.replace(/\|.*/, '').replace(/-.*/, '').trim().toLowerCase();
    const key = domain || cleanTitle;
    
    if (!key) continue;
    
    if (!candidatesMap.has(key)) {
      candidatesMap.set(key, {
        jobId,
        companyName: item.title.split('|')[0].trim(),
        aliases: new Set([cleanTitle]),
        possibleWebsites: new Set(domain ? [item.url] : []),
        possibleLinkedInUrls: new Set(),
        possibleLocations: new Set(),
        industryHints: new Set(),
        sourceEvidenceIds: new Set([item.id]),
        providerVotes: { [item.provider]: 1 },
        candidateScore: item.providerConfidence || 50,
        notes: ''
      });
    } else {
      const existing = candidatesMap.get(key);
      existing.aliases.add(cleanTitle);
      if (domain && item.url) existing.possibleWebsites.add(item.url);
      existing.sourceEvidenceIds.add(item.id);
      existing.providerVotes[item.provider] = (existing.providerVotes[item.provider] || 0) + 1;
      existing.candidateScore += 10; // Boost score for multiple evidence pieces
    }
  }

  // Convert Sets to Arrays and store
  const candidatesToSave = Array.from(candidatesMap.values()).map(c => ({
    ...c,
    aliases: JSON.stringify(Array.from(c.aliases)),
    possibleWebsites: JSON.stringify(Array.from(c.possibleWebsites)),
    possibleLinkedInUrls: JSON.stringify(Array.from(c.possibleLinkedInUrls)),
    possibleLocations: JSON.stringify(Array.from(c.possibleLocations)),
    industryHints: JSON.stringify(Array.from(c.industryHints)),
    sourceEvidenceIds: JSON.stringify(Array.from(c.sourceEvidenceIds)),
    providerVotes: JSON.stringify(c.providerVotes)
  }));
  
  // Sort by score and apply limits based on depth
  candidatesToSave.sort((a, b) => b.candidateScore - a.candidateScore);
  
  // Actually, wait: We need to respect leadCount requested by user. 
  // Let's just save them all and the orchestrator can pick the top N.
  
  if (candidatesToSave.length > 0) {
    await prisma.companyCandidate.createMany({
      data: candidatesToSave
    });
  }
  
  return candidatesToSave;
}
