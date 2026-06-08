import { AGENCY_SERVICES } from '@/lib/constants';

const agencyContext = `
You are assisting a branding, marketing, and AI workflow agency that helps small and medium-sized businesses with:
${AGENCY_SERVICES.map(s => `- ${s}`).join('\n')}
`;

// ---- Prompt 1: Query Generation ----
export function buildQueryGenerationPrompt(params: {
  brandType: string;
  location: string;
  companySize: string;
  leadCount: number;
  extraInstructions: string;
  queryCount: number;
}): string {
  return `${agencyContext}

Generate ${params.queryCount} diverse search queries to find real ${params.brandType} companies in ${params.location}.

Requirements:
- Company size preference: ${params.companySize}
- Target lead count: ${params.leadCount}
- Generate queries that will find official websites, contact pages, business directories, and social profiles
- Include variations like:
  - "{brand type} in {location}"
  - "best {brand type} {location}"
  - "{brand type} contact {location}"
  - "{brand type} owner founder {location}"
  - "{brand type} official website {location}"
  - Industry-specific directory searches
${params.extraInstructions ? `\nExtra instructions from user: ${params.extraInstructions}` : ''}

IMPORTANT: Return ONLY valid JSON in this exact format:
{
  "queries": [
    {
      "query": "the actual search query text",
      "purpose": "what this query aims to discover"
    }
  ]
}`;
}

export function buildDecisionMakerExtractorPrompt(data: {
  companyName: string;
  websiteUrl: string | null;
  location: string | null;
  industry: string | null;
  sourceSnippets: { url: string; snippet: string }[];
}): string {
  return `
Extract possible decision makers ONLY from the provided source snippets.
You are a strict deterministic extractor. Do NOT invent names. Do NOT infer names not present in the snippets.

COMPANY CONTEXT:
Name: ${data.companyName}
Website: ${data.websiteUrl || 'Unknown'}
Location: ${data.location || 'Unknown'}
Industry: ${data.industry || 'Unknown'}

SOURCE SNIPPETS:
${data.sourceSnippets.map((s, i) => `[Source ${i+1}: ${s.url}]\n${s.snippet}\n`).join('\n')}

RULES:
1. Return JSON only.
2. Every candidate MUST quote the exact source snippet where they were found.
3. If no person is found, return an empty array for decisionMakers.
4. roleCategory must be one of: "Founder", "CEO", "Director", "Owner", "Marketing", "Sales", "Operations", "Compliance", "Support", "Unknown"

OUTPUT FORMAT:
{
  "decisionMakers": [
    {
      "personName": "Exact name from text",
      "role": "Exact role from text",
      "roleCategory": "Category",
      "companyAssociationReason": "Why this person is associated with ${data.companyName}",
      "isOutreachRelevant": true/false,
      "sourceUrl": "URL of the source",
      "sourceSnippet": "Exact text containing the person's name",
      "confidence": 0-100
    }
  ],
  "warnings": ["Any warnings about ambiguous data"]
}
  `;
}

export function buildDecisionMakerVerifierPrompt(data: {
  candidateName: string;
  companyName: string;
  sourceSnippets: { url: string; snippet: string }[];
  possibleContacts: { type: string; value: string; sourceUrl: string }[];
}): string {
  return `
Verify if the person "${data.candidateName}" is actually associated with the company "${data.companyName}" based ONLY on the evidence provided.

SOURCE SNIPPETS:
${data.sourceSnippets.map((s, i) => `[Source ${i+1}: ${s.url}]\n${s.snippet}\n`).join('\n')}

POSSIBLE CONTACTS FOUND:
${data.possibleContacts.map(c => `- ${c.type}: ${c.value} (Source: ${c.sourceUrl})`).join('\n') || 'None'}

RULES:
1. Do not add new contact details. Do not guess emails or phone numbers.
2. Mark conflicts clearly (e.g. person works for a different company with a similar name).
3. Set verificationStatus to one of: "Verified", "Likely", "Conflict", "Rejected"
4. Assign bestAvailableContacts only if they belong to THIS SPECIFIC PERSON.

OUTPUT FORMAT:
{
  "verificationStatus": "Verified | Likely | Conflict | Rejected",
  "role": "Verified role",
  "roleCategory": "Category",
  "companyAssociationConfidence": 0-100,
  "roleConfidence": 0-100,
  "outreachRelevance": 0-100,
  "reasons": ["Why you made this decision"],
  "conflicts": ["Any conflicting data found"],
  "bestAvailableContacts": [
    {
      "type": "email | phone | linkedin",
      "value": "Value",
      "sourceUrl": "Source URL",
      "confidence": 0-100,
      "notes": "Why this belongs to the person"
    }
  ]
}
  `;
}

export function buildPersonContactAuditPrompt(data: {
  personName: string;
  companyName: string;
  contactCandidates: { type: string; value: string; context: string }[];
}): string {
  return `
Audit the following contact details to determine if they belong to "${data.personName}" or if they are general company contacts for "${data.companyName}".

CONTACT CANDIDATES:
${data.contactCandidates.map(c => `- Type: ${c.type}, Value: ${c.value}\n  Context: "${c.context}"\n`).join('\n')}

RULES:
1. A contact is a "validPersonContact" only if the context strongly implies it belongs to ${data.personName} (e.g. personal name in email, or phone number listed directly next to the person's name).
2. A contact is "companyGeneralContact" if it is info@, contact@, support@, or a general board line.
3. A contact is "roleBasedContact" if it is ceo@, founder@, etc.
4. Reject guesses or contacts that belong to someone else.

OUTPUT FORMAT:
{
  "validPersonContacts": [ { "value": "", "type": "" } ],
  "companyGeneralContacts": [ { "value": "", "type": "" } ],
  "roleBasedContacts": [ { "value": "", "type": "" } ],
  "rejectedContacts": [
    {
      "value": "",
      "reason": "Why it was rejected"
    }
  ],
  "warnings": ["Any notes"]
}
  `;
}

// ---- Prompt 2: Company Extraction ----
export function buildCompanyExtractionPrompt(params: {
  searchResults: string;
  brandType: string;
  location: string;
}): string {
  return `${agencyContext}

From the following search results, extract ONLY real company candidates that match:
- Type: ${params.brandType}
- Location: ${params.location}

Search results:
${params.searchResults}

RULES:
- Only extract companies that appear to be real businesses
- Do NOT invent or guess company names, websites, or LinkedIn URLs
- Only include information explicitly present in the search results
- If a website URL is shown, include it exactly as found
- If a LinkedIn URL is shown, include it exactly as found
- Include the source URL where you found each company

Return ONLY valid JSON array:
[
  {
    "companyName": "exact name as found",
    "possibleWebsite": "URL if found, empty string if not",
    "possibleLinkedIn": "LinkedIn URL if found, empty string if not",
    "possibleLocation": "location mentioned, empty string if not",
    "reasonFound": "brief reason why this matches the search criteria",
    "sourceUrl": "URL where this was found"
  }
]`;
}

// ---- Prompt 3: Website Verification ----
export function buildWebsiteVerificationPrompt(params: {
  companyName: string;
  possibleWebsite: string;
  scrapedContent: string;
  sourceUrls: string[];
  location: string;
  brandType: string;
}): string {
  return `You are a strict data verification agent. Your job is to determine if a website is the OFFICIAL website of a specific company.

Company to verify: "${params.companyName}"
Expected location: ${params.location}
Expected industry: ${params.brandType}
Candidate website: ${params.possibleWebsite}
Source URLs that referenced this company: ${params.sourceUrls.join(', ')}

Scraped website content:
${params.scrapedContent.substring(0, 4000)}

VERIFICATION CRITERIA - Score each:
1. Name match (0-25): Does the website title, about page, footer, or meta tags contain the company name?
2. Location match (0-15): Does the website show an address or service area matching "${params.location}"?
3. Industry match (0-15): Do the services/products match "${params.brandType}"?
4. Website officialness (0-20): Is this an official company website (not a directory listing, review site, or social media page)? Does it have a proper domain, SSL, schema.org, professional design?
5. Contact data quality (0-10): Does it have email, phone, or contact form on the website?
6. Cross-source support (0-15): Do multiple independent sources confirm this is the right company+website?

RULES:
- Never guess. If evidence is insufficient, say so.
- A directory listing is NOT a verified official website.
- Domain must make sense for the company name.

Return ONLY valid JSON:
{
  "status": "Verified" | "Likely" | "Not found" | "Conflict found",
  "confidence": 0-100,
  "reasons": ["reason1", "reason2"],
  "matchedFields": ["field1", "field2"],
  "conflicts": ["any conflicts found"],
  "sourceUrls": ["verified source URLs"],
  "scores": {
    "nameMatch": 0,
    "locationMatch": 0,
    "industryMatch": 0,
    "websiteOfficialness": 0,
    "contactDataQuality": 0,
    "crossSourceSupport": 0
  }
}`;
}

// ---- Prompt 4: Lead Enrichment ----
export function buildLeadEnrichmentPrompt(params: {
  companyName: string;
  websiteContent: string;
  contactPageContent: string;
  aboutPageContent: string;
  servicesPageContent: string;
  industry: string;
  location: string;
  contactsJson: string;
}): string {
  return `${agencyContext}

Analyze this company's online presence and create a detailed lead profile.

Company: ${params.companyName}
Industry: ${params.industry}
Location: ${params.location}

WEBSITE HOMEPAGE:
${params.websiteContent.substring(0, 2000)}

ABOUT PAGE:
${params.aboutPageContent.substring(0, 1500)}

CONTACT PAGE:
${params.contactPageContent.substring(0, 1000)}

SERVICES PAGE:
${params.servicesPageContent.substring(0, 1500)}

EXTRACTED CONTACTS:
${params.contactsJson}

RULES:
- Pain points MUST be specific and based on what you can observe from the scraped content
- Do NOT create generic pain points like "needs marketing" or "can improve branding"
- Each pain point should reference something specific you noticed
- The pitch must directly address the observed pain points
- The outreach first line should be personalized and non-generic
- If evidence is insufficient for a field, write "Insufficient evidence"

GOOD pain point examples:
- "Website has services listed but no clear lead capture CTA"
- "Instagram exists but posting is inconsistent (last post appears old)"
- "No visible case studies or testimonials on website"
- "Contact process is manual; AI chatbot/CRM could reduce friction"
- "Brand positioning unclear; homepage doesn't explain unique value"

BAD pain point examples (do NOT use these):
- "Needs marketing"
- "Can improve branding"
- "Needs AI"

Return ONLY valid JSON:
{
  "bestOutreachContact": {
    "normalizedValue": "must match an extracted contact normalizedValue or null",
    "reason": "why this is the best contact"
  },
  "whatTheyDo": "1-2 sentence description based on website content",
  "industry": "specific industry/category",
  "hasClearCTA": true | false | null,
  "hasContactForm": true | false | null,
  "hasSocialLinks": true | false | null,
  "hasClearServices": true | false | null,
  "websiteIssues": ["specific issue 1"],
  "marketingIssues": ["specific issue 1"],
  "automationOpportunities": ["specific opportunity 1"],
  "painPoints": ["evidence-backed pain point 1"],
  "pitch": "specific pitch based on observed pain points, 2-3 sentences",
  "outreachFirstLine": "personalized first line for cold email/DM",
  "dataQualityNotes": "any quality concerns or limitations"
}`;
}

// ---- Prompt 5: Final Lead Audit ----
export function buildFinalAuditPrompt(params: {
  leadData: Record<string, unknown>;
  sourceUrls: string[];
}): string {
  return `You are a strict data quality auditor. Review this lead record and remove any fields that are not supported by the provided sources.

Lead data:
${JSON.stringify(params.leadData, null, 2)}

Source URLs: ${params.sourceUrls.join(', ')}

STRICT RULES:
1. NEVER invent or keep an email address unless it was found on an official website, contact page, footer, or reputable business listing
2. NEVER invent or keep a phone number unless found on official website or business listing
3. NEVER invent or keep a website URL unless verified through search results
4. NEVER invent or keep a LinkedIn URL unless found from search results or official website
5. NEVER invent or keep decision maker names unless found from public sources
6. Remove any field that appears to be AI-hallucinated
7. If a field has no source backing it, set it to null/empty
8. Add honest data quality notes

Return ONLY valid JSON with the cleaned lead data:
{
  "companyName": "...",
  "websiteUrl": "... or null",
  "websiteVerificationStatus": "Verified|Likely|Not found|Conflict found",
  "whatTheyDo": "... or null",
  "industry": "... or null",
  "location": "... or null",
  "websiteConfidence": 0-100,
  "contactConfidence": 0-100,
  "businessFitScore": 0-100,
  "outreachReadinessScore": 0-100,
  "overallConfidence": 0-100,
  "dataQualityNotes": "honest assessment",
  "fieldsRemoved": ["list of fields that were cleared due to no evidence"]
}`;
}
