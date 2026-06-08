import { prisma } from '../prisma';

export async function extractDecisionMakers(jobId: string) {
  // Pull RawEvidence of type 'decision_maker_discovery'
  const dmEvidence = await prisma.rawEvidence.findMany({
    where: {
      jobId,
      resultType: 'decision_maker_discovery'
    }
  });

  // Pull leads for this job
  const leads = await prisma.lead.findMany({ where: { jobId } });
  
  for (const lead of leads) {
    const candidatesMap = new Map<string, any>();
    
    // Filter evidence matching this lead's companyName loosely
    // In reality, the orchestrator should run query + company correlation
    const relevantEvidence = dmEvidence.filter(e => e.query?.toLowerCase().includes(lead.companyName.toLowerCase().split(' ')[0]));
    
    for (const ev of relevantEvidence) {
      if (!ev.title) continue;
      
      // Extremely basic extraction logic from titles: "John Doe - CEO - XYZ"
      // Real implementation would use OpenAI here on the `ev.snippet`
      // For the sake of the structural pipeline, we'll mock the extraction
      // and assume OpenAI extraction happened or we use a regex/heuristic
      
      const parts = ev.title.split(/[-|]/);
      if (parts.length > 1) {
        const name = parts[0].trim();
        const role = parts[1].trim();
        
        if (name.length < 5 || name.length > 30) continue;
        
        const key = name.toLowerCase();
        
        if (!candidatesMap.has(key)) {
          let roleCat = 'unknown';
          if (/founder|owner/i.test(role)) roleCat = 'founder';
          if (/ceo|chief executive/i.test(role)) roleCat = 'ceo';
          if (/director|md|managing/i.test(role)) roleCat = 'director';
          
          candidatesMap.set(key, {
            leadId: lead.id,
            personName: name,
            normalizedPersonName: key,
            role: role,
            roleCategory: roleCat,
            companyAssociation: lead.companyName,
            sourceUrl: ev.url || '',
            sourceTitle: ev.title,
            sourceSnippet: ev.snippet,
            sourceEvidenceId: ev.id,
            foundByProvider: ev.provider,
            status: 'Candidate',
            confidence: ev.providerConfidence || 50,
            isOutreachRelevant: ['founder', 'ceo', 'director'].includes(roleCat)
          });
        }
      }
    }
    
    const toSave = Array.from(candidatesMap.values());
    if (toSave.length > 0) {
      await prisma.decisionMakerCandidate.createMany({
        data: toSave
      });
    }
  }
}
