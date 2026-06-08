import * as XLSX from 'xlsx';
import type { Lead, ContactCandidate } from '@/generated/prisma/client';

type LeadWithContacts = Lead & { contacts?: ContactCandidate[] };

function parseJSON(value: string, fallback: unknown = []): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function generateXLSX(leads: LeadWithContacts[]): Buffer {
  const data = leads.map(lead => {
    const painPoints = parseJSON(lead.painPoints, []) as string[];
    const sourceUrls = parseJSON(lead.sourceUrls, []) as string[];
    const warnings = parseJSON(lead.warnings, []) as string[];
    const conflicts = parseJSON(lead.conflicts, []) as string[];

    return {
      'Company Name': lead.companyName,
      'Company Name Status': lead.companyNameStatus,
      'Website': lead.websiteUrl || '',
      'Website Status': lead.websiteStatus,
      'Location': lead.location || '',
      'Location Status': lead.locationStatus,
      'Industry': lead.industry || '',
      'What They Do': lead.whatTheyDo || '',
      'Company Size Estimate': lead.companySizeEstimate || '',
      'Company Size Status': lead.companySizeStatus,
      'LinkedIn URL': lead.linkedinCompanyUrl || '',
      'LinkedIn Status': lead.linkedinStatus,
      'Instagram URL': lead.instagramUrl || '',
      
      'Best Decision Maker Name': lead.bestDecisionMakerName || '',
      'Best Decision Maker Role': lead.bestDecisionMakerRole || '',
      'Best Decision Maker LinkedIn': lead.bestDecisionMakerLinkedIn || '',
      'Best Decision Maker Email': lead.bestDecisionMakerEmail || '',
      'Best Decision Maker Phone': lead.bestDecisionMakerPhone || '',
      'Best Decision Maker Status': lead.bestDecisionMakerStatus,
      'Decision Maker Contact Status': lead.decisionMakerContactStatus,
      
      'Company General Email': lead.companyGeneralEmail || '',
      'Company General Phone': lead.companyGeneralPhone || '',
      'Best Outreach Route': lead.bestOutreachRoute || '',
      
      'Pain Points': painPoints.join('; '),
      'What We Can Pitch': lead.whatWeCanPitch || '',
      'Suggested Outreach Angle': lead.suggestedOutreachAngle || '',
      'Personalized First Line': lead.personalizedFirstLine || '',
      
      'Company Identity Confidence': lead.companyIdentityConfidence,
      'Website Confidence': lead.websiteConfidence,
      'Contacts Confidence': lead.contactsConfidence,
      'Decision Maker Confidence': lead.decisionMakerConfidence,
      'Business Fit Confidence': lead.businessFitConfidence,
      'Overall Confidence': lead.overallConfidence,
      
      'Needs Manual Review': lead.needsManualReview,
      'Status': lead.status,
      'Data Quality Notes': lead.dataQualityNotes || '',
      'Source URLs': sourceUrls.join('; '),
      'Warnings': warnings.join('; '),
      'Conflicts': conflicts.join('; ')
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads');

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return buffer;
}
