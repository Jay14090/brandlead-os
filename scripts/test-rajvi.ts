import { scrapeCompanyPages } from '../src/lib/providers/scraper';
import { extractContactsFromPage } from '../src/lib/extraction/contactExtractor';
import { validateAndCleanContacts } from '../src/lib/extraction/contactValidator';

async function main() {
  const url = 'https://rajvistockbroking.com';
  console.log(`Starting developer test on ${url}...\n`);

  // 1. Scrape
  console.log(`[1] Crawling official website: ${url}`);
  const scraped = await scrapeCompanyPages(url, 5); // scrape up to 5 pages
  
  const pages = [scraped.homepage, scraped.aboutPage, scraped.contactPage, scraped.servicesPage].filter(Boolean);
  console.log(`    Successfully crawled ${pages.length} key pages.\n`);

  // 2. Extract
  console.log(`[2] Running Deterministic Contact Extraction...`);
  const allRawContacts = [];
  
  for (const page of pages) {
    if (!page) continue;
    const raw = extractContactsFromPage({
      url: page.url,
      title: page.title,
      html: page.html,
      text: page.bodyText + '\n' + page.footerText,
    });
    console.log(`    Extracted ${raw.length} raw contacts from ${page.url}`);
    allRawContacts.push(...raw);
  }

  console.log(`\n    Total Raw Entities Found: ${allRawContacts.length}`);

  // 3. Clean & Validate
  console.log(`\n[3] Cleaning, Deduplicating & Validating...`);
  const validated = validateAndCleanContacts(allRawContacts);
  
  console.log(`    Validation output: ${validated.length} high-confidence contacts.\n`);

  // 4. Output Results
  console.log(`==================================================`);
  console.log(`FINAL STRUCTURED CONTACTS:`);
  console.log(`==================================================\n`);

  for (const contact of validated) {
    const isRel = contact.isOutreachRelevant ? '✅ Outreach' : '❌ Compliance/Support';
    console.log(`[${contact.type.toUpperCase()}] ${contact.value}`);
    console.log(`  Role:    ${contact.role || 'Unspecified'} (${isRel})`);
    console.log(`  Conf:    ${contact.confidence}%`);
    console.log(`  Source:  ${contact.sourceUrl}`);
    console.log(`  Snippet: "${contact.sourceSnippet.replace(/\n/g, ' ')}"`);
    console.log(`--------------------------------------------------`);
  }

}

main().catch(console.error);
