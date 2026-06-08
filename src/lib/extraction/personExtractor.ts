import { generateWithOpenAI } from '../ai/openai';
import { buildDecisionMakerExtractorPrompt, buildDecisionMakerVerifierPrompt, buildPersonContactAuditPrompt } from '../ai/prompts';

export interface ExtractedPersonCandidate {
  personName: string;
  role: string | null;
  roleCategory: string | null;
  companyAssociationReason: string | null;
  isOutreachRelevant: boolean;
  sourceUrl: string;
  sourceSnippet: string;
  confidence: number;
}

export async function extractDecisionMakersFromPages(
  companyName: string,
  websiteUrl: string | null,
  pages: { url: string, title: string, textContent?: string, text?: string }[]
): Promise<ExtractedPersonCandidate[]> {
  const snippets = pages.map(p => {
    const text = p.textContent || p.text || '';
    return {
      url: p.url,
      snippet: text.substring(0, 4000) // Truncate to avoid massive prompts, prefer first 4k chars where team usually is
    };
  });

  const prompt = buildDecisionMakerExtractorPrompt({
    companyName,
    websiteUrl,
    location: null,
    industry: null,
    sourceSnippets: snippets
  });

  try {
    const result = await generateWithOpenAI(prompt, {
      systemPrompt: 'You are a deterministic data extractor. Only output valid JSON.',
      reasoningEffort: 'low'
    });

    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];

    const data = JSON.parse(jsonMatch[0]);
    return data.decisionMakers || [];
  } catch (error) {
    console.error('Failed to extract decision makers:', error);
    return [];
  }
}

export async function verifyPersonCandidate(
  candidateName: string,
  companyName: string,
  snippets: { url: string; snippet: string }[],
  possibleContacts: { type: string; value: string; sourceUrl: string }[]
) {
  const prompt = buildDecisionMakerVerifierPrompt({
    candidateName,
    companyName,
    sourceSnippets: snippets,
    possibleContacts
  });

  try {
    const result = await generateWithOpenAI(prompt, {
      systemPrompt: 'You are a strict data verification auditor.',
      reasoningEffort: 'low'
    });

    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Failed to verify person:', error);
    return null;
  }
}

export async function auditPersonContacts(
  personName: string,
  companyName: string,
  contactCandidates: { type: string; value: string; context: string }[]
) {
  const prompt = buildPersonContactAuditPrompt({
    personName,
    companyName,
    contactCandidates
  });

  try {
    const result = await generateWithOpenAI(prompt, {
      systemPrompt: 'You are a strict contact audit evaluator.',
      reasoningEffort: 'low'
    });

    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Failed to audit contacts:', error);
    return null;
  }
}
