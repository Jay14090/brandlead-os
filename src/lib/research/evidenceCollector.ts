import { performGoogleSearch } from '../providers/searchApi';
import { searchWithExa } from '../providers/exa';
import { prisma } from '../prisma';

export interface EvidenceInput {
  jobId: string;
  query: string;
  resultType: string;
  maxResults?: number;
}

export async function collectSearchEvidence(inputs: EvidenceInput[]) {
  const promises = inputs.map(input => fetchAndStoreEvidence(input));
  await Promise.allSettled(promises);
}

async function fetchAndStoreEvidence(input: EvidenceInput) {
  const limit = input.maxResults || 5;
  const rawEvidences: any[] = [];
  
  // 1. Try Google Search Providers (SearchAPI.io / SerpAPI)
  try {
    const googleResults = await performGoogleSearch(input.query, limit);
    googleResults.forEach((res, index) => {
      rawEvidences.push({
        jobId: input.jobId,
        provider: res.provider,
        query: input.query,
        resultType: input.resultType,
        title: res.title,
        url: res.url,
        snippet: res.snippet,
        rank: index + 1,
        providerConfidence: 90
      });
    });
  } catch (err) {
    console.error(`Google search failed for query: ${input.query}`, err);
  }
  
  // 2. Try Exa as a supplementary search
  try {
    const exaResults = await searchWithExa(input.query, limit);
    if (exaResults && Array.isArray(exaResults)) {
      exaResults.forEach((res: any, index: number) => {
        rawEvidences.push({
          jobId: input.jobId,
          provider: 'exa',
          query: input.query,
          resultType: input.resultType,
          title: res.title || '',
          url: res.url || '',
          snippet: res.text || res.highlight || '',
          rank: index + 1,
          providerConfidence: Math.round((res.score || 0.8) * 100)
        });
      });
    }
  } catch (err) {
    console.error(`Exa search failed for query: ${input.query}`, err);
  }
  
  // Save all evidence to DB
  if (rawEvidences.length > 0) {
    await prisma.rawEvidence.createMany({
      data: rawEvidences
    });
  }
}
