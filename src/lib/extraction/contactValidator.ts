import { RawContactEntity } from './contactExtractor';

export interface ValidatedContactEntity extends RawContactEntity {
  confidence: number;
}

export function validateAndCleanContacts(rawContacts: RawContactEntity[]): ValidatedContactEntity[] {
  const validated: ValidatedContactEntity[] = [];
  const seenMap = new Map<string, ValidatedContactEntity>();

  for (const raw of rawContacts) {
    // 1. Calculate base confidence based on source URL
    let confidence = 50;
    const lowerUrl = raw.sourceUrl.toLowerCase();
    
    if (lowerUrl.includes('/contact') || lowerUrl.includes('contact-us')) {
      confidence = raw.role ? 95 : 85;
    } else if (lowerUrl.includes('/about') || lowerUrl.includes('/team')) {
      confidence = raw.role ? 90 : 80;
    } else if (lowerUrl === new URL(raw.sourceUrl).origin + '/') { // Homepage
      confidence = 75;
    } else if (lowerUrl.includes('linkedin.com')) {
      confidence = 80;
    } else if (lowerUrl.includes('grievance') || lowerUrl.includes('compliance')) {
      confidence = 85;
    }

    // Adjust confidence if there's a strong snippet
    if (raw.sourceSnippet && raw.sourceSnippet.length > 5) {
      confidence += 5;
    } else {
      confidence -= 20; // No snippet = low confidence
    }

    // Cap confidence
    confidence = Math.min(100, Math.max(0, confidence));

    const entity: ValidatedContactEntity = { ...raw, confidence };

    // 2. Deduplicate
    const key = `${raw.type}-${raw.normalizedValue}`;
    const existing = seenMap.get(key);

    if (existing) {
      // Merge: keep the higher confidence, and merge role/purpose if it was undefined
      if (confidence > existing.confidence) {
        existing.confidence = confidence;
        existing.sourceUrl = entity.sourceUrl;
        existing.sourcePageTitle = entity.sourcePageTitle;
        existing.sourceSnippet = entity.sourceSnippet;
      }
      if (!existing.role && entity.role) {
        existing.role = entity.role;
        existing.contactPurpose = entity.contactPurpose;
        existing.isOutreachRelevant = entity.isOutreachRelevant;
      }
    } else {
      seenMap.set(key, entity);
    }
  }

  // 3. Filter out contacts that are too low confidence
  // We keep everything >= 50. Things below 50 are discarded.
  for (const entity of seenMap.values()) {
    if (entity.confidence >= 50) {
      validated.push(entity);
    }
  }

  // Sort by confidence DESC
  validated.sort((a, b) => b.confidence - a.confidence);

  return validated;
}
