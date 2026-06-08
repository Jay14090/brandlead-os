import * as cheerio from 'cheerio';

export interface RawContactEntity {
  type: 'email' | 'phone' | 'person' | 'social';
  value: string;
  normalizedValue: string;
  label?: string;
  personName?: string;
  role?: string;
  department?: string;
  contactPurpose?: string;
  sourceUrl: string;
  sourcePageTitle?: string;
  sourceSnippet: string;
  isOutreachRelevant: boolean;
}

interface ScrapedPageData {
  url: string;
  title: string;
  html?: string;
  text?: string;
}

const INDIAN_PHONE_REGEX = /(?:\+91[\s-]?)?(?:(?:[0]?[789]\d{9})|(?:0\d{2,4}[\s-]?\d{6,8}))/g;
const GENERAL_PHONE_REGEX = /(?:\+?\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/g;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const RELEVANT_ROLES = [
  'ceo', 'founder', 'co-founder', 'owner', 'managing director', 'md', 
  'director', 'partner', 'proprietor', 'key management', 'marketing', 'sales'
];

const COMPLIANCE_ROLES = [
  'compliance officer', 'grievance', 'nodal officer', 'dp head', 'support', 'customer care', 'investor'
];

function normalizePhone(phone: string): string {
  // Remove all non-digits, keep leading 0 or +91 if needed, but for deduplication just raw digits.
  return phone.replace(/\D/g, '');
}

function isValidPhone(phoneStr: string, normalized: string): boolean {
  if (normalized.length < 10) return false;
  if (normalized.length > 15) return false;
  if (normalized.startsWith('000')) return false;

  // Reject if looks like date or long ID (e.g., 00060340004686)
  if (/^000/.test(normalized)) return false;
  
  // Reject if part of a URL or time
  if (phoneStr.includes('am') || phoneStr.includes('pm')) return false;
  
  return true;
}

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim().replace(/[.,;:]+$/, '');
}

function isValidEmail(email: string): boolean {
  if (email.includes('example.com')) return false;
  if (email.includes('sentry.io')) return false;
  if (email.includes('sentry.wixpress')) return false;
  if (email.endsWith('.png') || email.endsWith('.jpg')) return false;
  return true;
}

function classifyRole(text: string): { role: string | undefined, purpose: string, relevant: boolean } {
  const lower = text.toLowerCase();
  
  for (const role of RELEVANT_ROLES) {
    if (lower.includes(role)) {
      return { role: text.trim(), purpose: 'Business outreach', relevant: true };
    }
  }

  for (const role of COMPLIANCE_ROLES) {
    if (lower.includes(role)) {
      if (lower.includes('customer care') || lower.includes('support')) {
        return { role: text.trim(), purpose: 'Customer support', relevant: true }; // still relevant but lower prio
      }
      return { role: text.trim(), purpose: 'Compliance/grievance only', relevant: false };
    }
  }

  return { role: undefined, purpose: 'Unclear', relevant: true }; // Default to true if unclear
}

export function extractContactsFromPage(page: ScrapedPageData): RawContactEntity[] {
  const contacts: RawContactEntity[] = [];
  const url = page.url;
  const title = page.title;

  if (!page.html && !page.text) return contacts;

  let $: cheerio.CheerioAPI;
  
  if (page.html) {
    $ = cheerio.load(page.html);
    
    // Convert <br> to newline
    $('br').replaceWith('\n');
    
    // Process text nodes to keep snippets intact
    const extractFromText = (text: string, snippetContext: string) => {
      // Find emails
      const emails = text.match(EMAIL_REGEX) || [];
      for (let email of emails) {
        email = normalizeEmail(email);
        if (isValidEmail(email)) {
          contacts.push({
            type: 'email',
            value: email,
            normalizedValue: email,
            sourceUrl: url,
            sourcePageTitle: title,
            sourceSnippet: snippetContext.trim().substring(0, 300),
            isOutreachRelevant: true
          });
        }
      }

      // Find phones (use Indian first, fallback to general)
      const textParts = text.split(/[\n/|;,\t]+/);
      for (const part of textParts) {
        let phones = part.match(INDIAN_PHONE_REGEX);
        if (!phones || phones.length === 0) {
          phones = part.match(GENERAL_PHONE_REGEX);
        }

        if (phones) {
          for (const phone of phones) {
            const cleanPhone = phone.trim();
            const normalized = normalizePhone(cleanPhone);
            if (isValidPhone(cleanPhone, normalized)) {
              contacts.push({
                type: 'phone',
                value: cleanPhone,
                normalizedValue: normalized,
                sourceUrl: url,
                sourcePageTitle: title,
                sourceSnippet: snippetContext.trim().substring(0, 300),
                isOutreachRelevant: true
              });
            }
          }
        }
      }
    };

    // 1. Process Structured Blocks (Tables, Cards, List items)
    $('tr, li, .card, .profile, .team-member, .contact-block').each((_, el) => {
      const blockText = $(el).text().replace(/\s+/g, ' ').trim();
      if (!blockText) return;

      const { role, purpose, relevant } = classifyRole(blockText);
      const isPersonBlock = role !== undefined || /(mr\.|ms\.|mrs\.|shri)/i.test(blockText);

      // Find emails in block
      const emails = blockText.match(EMAIL_REGEX) || [];
      for (let email of emails) {
        email = normalizeEmail(email);
        if (isValidEmail(email)) {
          contacts.push({
            type: 'email',
            value: email,
            normalizedValue: email,
            role,
            contactPurpose: purpose,
            isOutreachRelevant: relevant,
            sourceUrl: url,
            sourcePageTitle: title,
            sourceSnippet: blockText.substring(0, 300),
          });
        }
      }

      // Find phones in block
      const blockParts = blockText.split(/[\n/|;,\t]+/);
      for (const part of blockParts) {
        let phones = part.match(INDIAN_PHONE_REGEX);
        if (!phones || phones.length === 0) phones = part.match(GENERAL_PHONE_REGEX);
        
        if (phones) {
          for (const phone of phones) {
            const cleanPhone = phone.trim();
            const normalized = normalizePhone(cleanPhone);
            if (isValidPhone(cleanPhone, normalized)) {
              contacts.push({
                type: 'phone',
                value: cleanPhone,
                normalizedValue: normalized,
                role,
                contactPurpose: purpose,
                isOutreachRelevant: relevant,
                sourceUrl: url,
                sourcePageTitle: title,
                sourceSnippet: blockText.substring(0, 300),
              });
            }
          }
        }
      }

      // If we extracted from a structured block, we remove it from the DOM so we don't double-extract
      if (emails.length > 0 || blockText.match(INDIAN_PHONE_REGEX) || blockText.match(GENERAL_PHONE_REGEX)) {
         $(el).remove();
      }
    });

    // 2. Process remaining body text
    const bodyText = $('body').text().replace(/\s+/g, ' ');
    extractFromText(bodyText, bodyText);

    // 3. Process mailto links explicitly
    $('a[href^="mailto:"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) {
        const email = normalizeEmail(href.replace('mailto:', '').split('?')[0]);
        if (isValidEmail(email)) {
          const parentText = $(el).parent().text().replace(/\s+/g, ' ').trim() || email;
          contacts.push({
            type: 'email',
            value: email,
            normalizedValue: email,
            sourceUrl: url,
            sourcePageTitle: title,
            sourceSnippet: parentText.substring(0, 300),
            isOutreachRelevant: true
          });
        }
      }
    });

  } else if (page.text) {
    // Fallback for markdown/text only
    const emails = page.text.match(EMAIL_REGEX) || [];
    for (let email of emails) {
      email = normalizeEmail(email);
      if (isValidEmail(email)) {
        contacts.push({
          type: 'email',
          value: email,
          normalizedValue: email,
          sourceUrl: url,
          sourcePageTitle: title,
          sourceSnippet: 'Extracted from text content',
          isOutreachRelevant: true
        });
      }
    }

    const textParts = page.text.split(/[\n/|;,\t]+/);
    for (const part of textParts) {
      let phones = part.match(INDIAN_PHONE_REGEX);
      if (!phones || phones.length === 0) phones = part.match(GENERAL_PHONE_REGEX);
      if (phones) {
        for (const phone of phones) {
          const cleanPhone = phone.trim();
          const normalized = normalizePhone(cleanPhone);
          if (isValidPhone(cleanPhone, normalized)) {
            contacts.push({
              type: 'phone',
              value: cleanPhone,
              normalizedValue: normalized,
              sourceUrl: url,
              sourcePageTitle: title,
              sourceSnippet: part.trim().substring(0, 300),
              isOutreachRelevant: true
            });
          }
        }
      }
    }
  }

  return contacts;
}
