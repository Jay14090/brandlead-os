import { generateWithOpenAI } from './openai';

export const FINAL_JUDGE_SYSTEM_PROMPT = `You are the Final Lead Research Judge for a B2B branding, marketing, and AI workflow agency.
Your job is to review all collected evidence from search APIs, scraping APIs, and AI-grounded sources, then produce the best final lead record.

You are not a strict validator that rejects everything. You are a practical research analyst.
Use the evidence to decide:
- which company is real
- which website is most likely official
- what the company does
- where it is located
- who the decision maker is
- which contact is best for outreach
- which data is verified, likely, possible, or conflicting
- what pain points the agency can pitch

Rules:
1. You may only use values present in the provided evidence.
2. You must not invent websites, emails, phone numbers, LinkedIn URLs, names, or roles.
3. You may choose the best likely value if evidence is imperfect.
4. Mark uncertain values as Likely or Possible.
5. Do not delete useful data just because it is not perfect.
6. Prefer official website sources.
7. Prefer multiple source agreement.
8. Prefer founder/owner/CEO/MD/director as outreach decision maker.
9. Do not treat compliance/grievance contacts as primary marketing contacts unless no better contact exists.
10. If direct decision maker contact is not available, use company general email/phone as the best outreach route.
11. Every important field should cite source URL and snippet.
12. Remove obvious phone/email garbage.
13. Do not output long unstructured contact blobs.
14. Return JSON only conforming to the requested schema.`;

export async function executeFinalLeadJudge(searchRequest: string, evidencePack: any) {
  const prompt = `User Search Request: ${searchRequest}
  
Evidence Pack:
${JSON.stringify(evidencePack, null, 2)}

Output JSON EXACTLY matching this schema (with no markdown wrapping if possible, just the raw JSON object):
{
  "companyName": "",
  "companyNameStatus": "Verified | Strongly Likely | Likely | Possible | Conflicting | Not Found",
  "websiteUrl": "",
  "websiteStatus": "Verified | Strongly Likely | Likely | Possible | Conflicting | Not Found",
  "whatTheyDo": "",
  "industry": "",
  "location": "",
  "locationStatus": "Verified | Strongly Likely | Likely | Possible | Not Found",
  "companySizeEstimate": "",
  "companySizeStatus": "Verified | Strongly Likely | Likely | Possible | Not Found",
  "linkedinCompanyUrl": "",
  "linkedinStatus": "Verified | Strongly Likely | Likely | Possible | Not Found",
  "instagramUrl": "",
  "bestDecisionMakerName": "",
  "bestDecisionMakerRole": "",
  "bestDecisionMakerStatus": "Verified | Strongly Likely | Likely | Possible | Not Found",
  "bestDecisionMakerLinkedIn": "",
  "bestDecisionMakerEmail": "",
  "bestDecisionMakerPhone": "",
  "decisionMakerContactStatus": "Verified | Strongly Likely | Likely | Possible | Not Found",
  "companyGeneralEmail": "",
  "companyGeneralPhone": "",
  "bestOutreachRoute": "",
  "painPoints": [],
  "whatWeCanPitch": "",
  "suggestedOutreachAngle": "",
  "personalizedFirstLine": "",
  "companyIdentityConfidence": 0,
  "websiteConfidence": 0,
  "contactsConfidence": 0,
  "decisionMakerConfidence": 0,
  "businessFitConfidence": 0,
  "overallConfidence": 0,
  "dataQualityNotes": "",
  "needsManualReview": true,
  "sourceUrls": [],
  "warnings": [],
  "conflicts": []
}`;

  try {
    const result = await generateWithOpenAI(prompt, {
      systemPrompt: FINAL_JUDGE_SYSTEM_PROMPT,
      reasoningEffort: 'medium'
    });

    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Final LLM Judge failed:', error);
    return null;
  }
}
