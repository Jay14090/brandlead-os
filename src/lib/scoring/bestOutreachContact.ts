import type { ValidatedContactEntity } from '../extraction/contactValidator';

export interface DecisionMakerCandidateScored {
  id: string;
  personName: string;
  role: string | null;
  roleCategory: string | null;
  confidence: number;
  verificationStatus: string;
  contacts: ValidatedContactEntity[];
  sourceUrl: string;
  sourceSnippet: string | null;
}

export interface BestOutreachResult {
  bestPerson: DecisionMakerCandidateScored | null;
  bestContact: ValidatedContactEntity | null;
  fallbackContact: ValidatedContactEntity | null;
}

export function rankBestOutreachContact(
  candidates: DecisionMakerCandidateScored[],
  companyGeneralContacts: ValidatedContactEntity[]
): BestOutreachResult {
  let highestScore = -999;
  let bestPerson: DecisionMakerCandidateScored | null = null;
  let bestContact: ValidatedContactEntity | null = null;

  for (const candidate of candidates) {
    if (candidate.verificationStatus === 'Rejected' || candidate.verificationStatus === 'Conflict') continue;

    let baseRoleScore = 0;
    const cat = candidate.roleCategory?.toLowerCase() || '';
    
    if (cat.includes('founder') || cat.includes('owner') || cat.includes('proprietor')) baseRoleScore = 40;
    else if (cat.includes('ceo') || cat.includes('director') || cat.includes('partner') || cat.includes('managing director')) baseRoleScore = 35;
    else if (cat.includes('marketing') || cat.includes('sales') || cat.includes('growth') || cat.includes('operations')) baseRoleScore = 30;
    else if (cat.includes('manager')) baseRoleScore = 20;
    else if (cat.includes('support') || cat.includes('customer')) baseRoleScore = 10;
    else if (cat.includes('compliance') || cat.includes('grievance') || cat.includes('nodal')) baseRoleScore = -15;

    for (const contact of candidate.contacts) {
      let contactScore = baseRoleScore;
      
      if (contact.type === 'email') {
        contactScore += 30; // Direct person email
      } else if (contact.type === 'phone') {
        contactScore += 25;
      } else if (contact.type === 'social') {
        contactScore += 15;
      }

      if (contact.confidence >= 90) contactScore += 25; // Official website source
      else if (contact.confidence >= 70) contactScore += 10;
      else if (contact.confidence < 50) contactScore -= 20; // Weak source

      if (contactScore > highestScore && contact.confidence >= 70) {
        highestScore = contactScore;
        bestPerson = candidate;
        bestContact = contact;
      }
    }
  }

  // Fallback to company contacts if no good person contact
  let fallbackContact: ValidatedContactEntity | null = null;
  if (!bestContact) {
    const sortedCompanyContacts = companyGeneralContacts
      .filter(c => c.confidence >= 50)
      .sort((a, b) => {
        const typeScoreA = a.type === 'email' ? 2 : a.type === 'phone' ? 1 : 0;
        const typeScoreB = b.type === 'email' ? 2 : b.type === 'phone' ? 1 : 0;
        return (typeScoreB * 10 + b.confidence) - (typeScoreA * 10 + a.confidence);
      });
    
    if (sortedCompanyContacts.length > 0) {
      fallbackContact = sortedCompanyContacts[0];
    }
  }

  return { bestPerson, bestContact, fallbackContact };
}
