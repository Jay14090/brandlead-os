import { prisma } from '../prisma';

export async function resolveOfficialWebsites(jobId: string) {
  const candidates = await prisma.companyCandidate.findMany({ where: { jobId } });
  
  for (const candidate of candidates) {
    const websites = JSON.parse(candidate.possibleWebsites || '[]');
    let resolvedWebsite = null;
    let status = 'Not Found';
    let confidence = 0;
    
    if (websites.length > 0) {
      // Simplistic resolution: just take the most frequently occurring one or the first one.
      // In reality, this would check against directories or use an LLM.
      // For now, if we have a website from search results, it's Likely.
      resolvedWebsite = websites[0];
      status = 'Likely';
      confidence = 60;
      
      // If multiple sources suggested it
      const votes = JSON.parse(candidate.providerVotes || '{}');
      const totalVotes = Object.values(votes).reduce((a: any, b: any) => a + b, 0) as number;
      
      if (totalVotes > 2) {
        status = 'Strongly Likely';
        confidence = 80;
      }
    }
    
    // We update the candidate score based on resolution
    await prisma.companyCandidate.update({
      where: { id: candidate.id },
      data: {
        candidateScore: candidate.candidateScore + confidence,
        notes: candidate.notes + `\nWebsite resolved to ${resolvedWebsite} with status ${status}`
      }
    });
  }
}
