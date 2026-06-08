import { scrapePage, scrapeCompanyPages, type ScrapedPage } from '@/lib/providers/scraper';
import { isFirecrawlAvailable, scrapeWithFirecrawl } from '@/lib/providers/firecrawl';
export interface CompanyCandidate {
  companyName: string;
  possibleWebsite: string;
  possibleLinkedIn: string;
  possibleLocation: string;
  searchResultTitle: string;
  searchResultSnippet: string;
  evidenceUrl: string;
  reasonFound: string;
  sourceUrl: string;
}

export interface ScrapedCompanyData {
  candidate: CompanyCandidate;
  homepage: ScrapedPage | null;
  aboutPage: ScrapedPage | null;
  contactPage: ScrapedPage | null;
  servicesPage: ScrapedPage | null;
  firecrawlMarkdown?: string;
  allEmails: string[];
  allPhones: string[];
  allSocialLinks: {
    linkedin?: string;
    instagram?: string;
    facebook?: string;
    twitter?: string;
  };
}

/**
 * Scrape company websites for each candidate
 */
export async function scrapeCompanyWebsites(
  candidates: CompanyCandidate[],
  options: {
    maxPagesPerLead: number;
    requestDelay: number;
  }
): Promise<ScrapedCompanyData[]> {
  const results: ScrapedCompanyData[] = [];
  const firecrawlAvailable = await isFirecrawlAvailable();

  for (const candidate of candidates) {
    if (!candidate.possibleWebsite) {
      results.push({
        candidate,
        homepage: null,
        aboutPage: null,
        contactPage: null,
        servicesPage: null,
        allEmails: [],
        allPhones: [],
        allSocialLinks: {},
      });
      continue;
    }

    try {
      let firecrawlMarkdown: string | undefined;

      if (firecrawlAvailable) {
        // Use Firecrawl for better scraping
        try {
          const result = await scrapeWithFirecrawl(candidate.possibleWebsite);
          firecrawlMarkdown = result.markdown;
        } catch (error) {
          console.warn(`Firecrawl failed for ${candidate.possibleWebsite}, falling back to built-in scraper`, error);
        }
      }

      // Always use built-in scraper for structured extraction
      const pages = await scrapeCompanyPages(
        candidate.possibleWebsite,
        options.maxPagesPerLead,
        options.requestDelay
      );

      // Aggregate all emails and phones from all pages
      const allEmails = new Set<string>();
      const allPhones = new Set<string>();
      const allSocialLinks: ScrapedCompanyData['allSocialLinks'] = {};

      for (const page of [pages.homepage, pages.aboutPage, pages.contactPage, pages.servicesPage]) {
        if (!page) continue;
        page.emails.forEach(e => allEmails.add(e));
        page.phones.forEach(p => allPhones.add(p));
        if (page.socialLinks.linkedin) allSocialLinks.linkedin = page.socialLinks.linkedin;
        if (page.socialLinks.instagram) allSocialLinks.instagram = page.socialLinks.instagram;
        if (page.socialLinks.facebook) allSocialLinks.facebook = page.socialLinks.facebook;
        if (page.socialLinks.twitter) allSocialLinks.twitter = page.socialLinks.twitter;
      }

      results.push({
        candidate,
        homepage: pages.homepage,
        aboutPage: pages.aboutPage,
        contactPage: pages.contactPage,
        servicesPage: pages.servicesPage,
        firecrawlMarkdown,
        allEmails: [...allEmails],
        allPhones: [...allPhones],
        allSocialLinks,
      });

      // Delay between companies
      await new Promise(resolve => setTimeout(resolve, options.requestDelay));
    } catch (error) {
      console.error(`Error scraping ${candidate.possibleWebsite}:`, error);
      results.push({
        candidate,
        homepage: null,
        aboutPage: null,
        contactPage: null,
        servicesPage: null,
        allEmails: [],
        allPhones: [],
        allSocialLinks: {},
      });
    }
  }

  return results;
}
