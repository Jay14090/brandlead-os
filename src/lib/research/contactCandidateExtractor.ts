import { prisma } from '../prisma';

export async function extractContactCandidates(jobId: string) {
  // Pull all crawled pages for leads belonging to this job
  const pages = await prisma.crawledPage.findMany({
    where: { lead: { jobId } },
    include: { lead: true }
  });

  const extractedContacts: any[] = [];

  for (const page of pages) {
    const text = page.textContent || '';
    
    // Extract Emails
    const emailMatches = text.match(/[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}/g) || [];
    for (const email of new Set(emailMatches)) {
      if (email.endsWith('.png') || email.endsWith('.jpg') || email.includes('example.com') || email.includes('sentry.io')) continue;
      
      let purpose = 'business_outreach';
      if (email.toLowerCase().includes('support') || email.toLowerCase().includes('help') || email.toLowerCase().includes('care')) purpose = 'support';
      if (email.toLowerCase().includes('compliance') || email.toLowerCase().includes('grievance') || email.toLowerCase().includes('nodal')) purpose = 'compliance';
      if (email.toLowerCase().includes('info') || email.toLowerCase().includes('contact') || email.toLowerCase().includes('hello')) purpose = 'general_enquiry';

      extractedContacts.push({
        leadId: page.leadId,
        type: 'email',
        value: email,
        normalizedValue: email.toLowerCase(),
        contactPurpose: purpose,
        sourceUrl: page.url,
        sourceTitle: page.title,
        extractedBy: 'regex',
        status: 'Candidate',
        confidence: 80
      });
    }

    // Extract Phones (Indian format focused, handling basic +91/0 prefixes, 10 digits)
    // We want to avoid 0000000 blobs and long IDs
    const phoneRegex = /(?:\+91|0)?[ -]?[6-9]\d{2}[ -]?\d{3}[ -]?\d{4}|\b0\d{2,4}[ -]?\d{6,8}\b/g;
    const phoneMatches = text.match(phoneRegex) || [];
    
    for (let phone of new Set(phoneMatches)) {
      phone = phone.replace(/[ -]/g, '');
      if (/000000/.test(phone)) continue; // Obvious garbage
      
      let purpose = 'business_outreach';
      // Look around the phone number in text for context
      const idx = text.indexOf(phone);
      if (idx !== -1) {
        const context = text.substring(Math.max(0, idx - 100), Math.min(text.length, idx + 100)).toLowerCase();
        if (context.includes('support') || context.includes('toll free') || context.includes('care')) purpose = 'support';
        if (context.includes('compliance') || context.includes('grievance')) purpose = 'compliance';
      }

      extractedContacts.push({
        leadId: page.leadId,
        type: 'phone',
        value: phone,
        normalizedValue: phone,
        contactPurpose: purpose,
        sourceUrl: page.url,
        sourceTitle: page.title,
        extractedBy: 'regex',
        status: 'Candidate',
        confidence: 70
      });
    }

    // Extract LinkedIn URLs
    const linkedinMatches = text.match(/https:\/\/(www\.)?linkedin\.com\/(in|company)\/[a-zA-Z0-9_-]+/g) || [];
    for (const li of new Set(linkedinMatches)) {
      extractedContacts.push({
        leadId: page.leadId,
        type: 'linkedin',
        value: li,
        normalizedValue: li,
        contactPurpose: li.includes('/company/') ? 'general_enquiry' : 'business_outreach',
        sourceUrl: page.url,
        sourceTitle: page.title,
        extractedBy: 'regex',
        status: 'Candidate',
        confidence: 90
      });
    }
  }

  // Deduplicate by normalizedValue + leadId before saving
  const uniqueKeys = new Set();
  const toSave = extractedContacts.filter(c => {
    const key = `${c.leadId}-${c.type}-${c.normalizedValue}`;
    if (uniqueKeys.has(key)) return false;
    uniqueKeys.add(key);
    return true;
  });

  if (toSave.length > 0) {
    await prisma.contactCandidate.createMany({
      data: toSave
    });
  }
}
