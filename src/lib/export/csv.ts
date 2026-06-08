import type { Lead, ContactCandidate } from '@/generated/prisma/client';

type LeadWithContacts = Lead & { contacts?: ContactCandidate[] };

const CSV_HEADERS = [
  'Company Name', 'Company Name Status', 'Website', 'Website Status', 'Location', 'Location Status', 'Industry', 'What They Do', 
  'Company Size Estimate', 'Company Size Status', 'LinkedIn URL', 'LinkedIn Status', 'Instagram URL',
  
  // Best Decision Maker
  'Best Decision Maker Name', 'Best Decision Maker Role', 'Best Decision Maker LinkedIn', 'Best Decision Maker Email', 'Best Decision Maker Phone', 'Best Decision Maker Status', 'Decision Maker Contact Status',
  
  // General Contacts
  'Company General Email', 'Company General Phone', 'Best Outreach Route',
  
  // Pitch
  'Pain Points', 'What We Can Pitch', 'Suggested Outreach Angle', 'Personalized First Line',
  
  // Confidence Scores
  'Company Identity Confidence', 'Website Confidence', 'Contacts Confidence', 'Decision Maker Confidence', 'Business Fit Confidence', 'Overall Confidence',
  
  // Quality & Status
  'Needs Manual Review', 'Status', 'Data Quality Notes', 'Source URLs', 'Warnings', 'Conflicts'
];

function escapeCSV(value: string | null | undefined | number | boolean): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function parseJSON(value: string, fallback: unknown = []): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function generateCSV(leads: LeadWithContacts[]): string {
  const BOM = '\uFEFF'; // UTF-8 BOM for Excel
  const headerRow = CSV_HEADERS.map(h => escapeCSV(h)).join(',');

  const rows = leads.map(lead => {
    const painPoints = parseJSON(lead.painPoints, []) as string[];
    const sourceUrls = parseJSON(lead.sourceUrls, []) as string[];
    const warnings = parseJSON(lead.warnings, []) as string[];
    const conflicts = parseJSON(lead.conflicts, []) as string[];

    return [
      lead.companyName,
      lead.companyNameStatus,
      lead.websiteUrl,
      lead.websiteStatus,
      lead.location,
      lead.locationStatus,
      lead.industry,
      lead.whatTheyDo,
      lead.companySizeEstimate,
      lead.companySizeStatus,
      lead.linkedinCompanyUrl,
      lead.linkedinStatus,
      lead.instagramUrl,
      
      lead.bestDecisionMakerName,
      lead.bestDecisionMakerRole,
      lead.bestDecisionMakerLinkedIn,
      lead.bestDecisionMakerEmail,
      lead.bestDecisionMakerPhone,
      lead.bestDecisionMakerStatus,
      lead.decisionMakerContactStatus,
      
      lead.companyGeneralEmail,
      lead.companyGeneralPhone,
      lead.bestOutreachRoute,
      
      painPoints.join('; '),
      lead.whatWeCanPitch,
      lead.suggestedOutreachAngle,
      lead.personalizedFirstLine,
      
      lead.companyIdentityConfidence,
      lead.websiteConfidence,
      lead.contactsConfidence,
      lead.decisionMakerConfidence,
      lead.businessFitConfidence,
      lead.overallConfidence,
      
      lead.needsManualReview,
      lead.status,
      lead.dataQualityNotes,
      sourceUrls.join('; '),
      warnings.join('; '),
      conflicts.join('; ')
    ].map(v => escapeCSV(v)).join(',');
  });

  return BOM + [headerRow, ...rows].join('\r\n');
}
