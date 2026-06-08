// ---- Agency Services ----
export const AGENCY_SERVICES = [
  'Branding',
  'Social media marketing',
  'Content strategy',
  'Website improvement',
  'AI workflow automation',
  'Lead generation automation',
  'CRM/workflow systems',
  'Brand positioning',
  'Better online presence',
  'Marketing funnels',
] as const;

// ---- Search Depth Config ----
export const SEARCH_DEPTH_CONFIG = {
  Fast: {
    queryCount: 5,
    candidateMultiplier: 2,
    pagesPerLead: 2,
    enrichmentLevel: 'basic' as const,
  },
  Balanced: {
    queryCount: 10,
    candidateMultiplier: 3,
    pagesPerLead: 3,
    enrichmentLevel: 'full' as const,
  },
  Deep: {
    queryCount: 15,
    candidateMultiplier: 5,
    pagesPerLead: 4,
    enrichmentLevel: 'full-verify' as const,
  },
} as const;

// ---- Pipeline Stages ----
export const PIPELINE_STAGES = [
  { id: 'queries', label: 'Generating search queries', icon: '🔍' },
  { id: 'discover', label: 'Searching the web', icon: '🌐' },
  { id: 'dedup', label: 'Deduplicating candidates', icon: '🔄' },
  { id: 'scrape', label: 'Scraping websites', icon: '📄' },
  { id: 'verify', label: 'Verifying companies', icon: '✅' },
  { id: 'enrich', label: 'Analyzing & enriching', icon: '🧠' },
  { id: 'validate', label: 'Final validation', icon: '🛡️' },
  { id: 'save', label: 'Saving results', icon: '💾' },
] as const;

// ---- Cost Estimates (approx API calls) ----
export const COST_ESTIMATES = {
  Fast: { description: 'Fewer API calls, faster results', apiCalls: '~15-30' },
  Balanced: { description: 'Moderate API usage, good coverage', apiCalls: '~40-80' },
  Deep: { description: 'More API calls, thorough verification', apiCalls: '~100-200+' },
} as const;

// ---- Default Model Names ----
export const DEFAULT_MODELS = {
  openai: 'gpt-5.5',
  gemini: 'gemini-3.1-pro-preview',
  geminiFast: 'gemini-3.5-flash',
} as const;

// ---- Scraper Config ----
export const SCRAPER_CONFIG = {
  timeout: 10000, // 10 seconds
  userAgent: 'BrandLeadOS/1.0 (Lead Research Bot; +https://brandlead.os)',
  maxContentLength: 500000, // 500KB
} as const;

// ---- Verification Score Weights ----
export const VERIFICATION_WEIGHTS = {
  nameMatch: 25,
  locationMatch: 15,
  industryMatch: 15,
  websiteOfficialness: 20,
  contactDataQuality: 10,
  crossSourceSupport: 15,
} as const;
