import * as cheerio from 'cheerio';
import { SCRAPER_CONFIG } from '@/lib/constants';

export interface ScrapedPage {
  url: string;
  title: string;
  metaDescription: string;
  headings: string[];
  bodyText: string;
  html: string;
  footerText: string;
  emails: string[];
  phones: string[];
  socialLinks: {
    linkedin?: string;
    instagram?: string;
    facebook?: string;
    twitter?: string;
  };
  schemaOrgData: Record<string, unknown>[];
  internalLinks: string[];
}

/**
 * Check robots.txt for a domain
 */
async function checkRobotsTxt(baseUrl: string): Promise<boolean> {
  try {
    const robotsUrl = new URL('/robots.txt', baseUrl).toString();
    const response = await fetch(robotsUrl, {
      headers: { 'User-Agent': SCRAPER_CONFIG.userAgent },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return true; // If no robots.txt, allow

    const text = await response.text();
    // Simple check — if User-agent: * has Disallow: /, don't scrape
    const lines = text.split('\n');
    let isForUs = false;
    for (const line of lines) {
      const trimmed = line.trim().toLowerCase();
      if (trimmed.startsWith('user-agent: *')) {
        isForUs = true;
      } else if (isForUs && trimmed.startsWith('user-agent:')) {
        isForUs = false;
      } else if (isForUs && trimmed === 'disallow: /') {
        return false; // Blocked
      }
    }
    return true;
  } catch {
    return true; // If we can't check, allow
  }
}

/**
 * Scrape a single page using fetch + Cheerio
 */
export async function scrapePage(url: string): Promise<ScrapedPage | null> {
  try {
    // Check robots.txt first
    const baseUrl = new URL(url).origin;
    const allowed = await checkRobotsTxt(baseUrl);
    if (!allowed) {
      console.warn(`Blocked by robots.txt: ${url}`);
      return null;
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': SCRAPER_CONFIG.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: AbortSignal.timeout(SCRAPER_CONFIG.timeout),
      redirect: 'follow',
    });

    if (!response.ok) {
      console.warn(`Failed to scrape ${url}: ${response.status}`);
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return null;
    }

    const html = await response.text();
    if (html.length > SCRAPER_CONFIG.maxContentLength) {
      return null;
    }

    const $ = cheerio.load(html);

    // Remove script/style/nav elements for cleaner text
    $('script, style, noscript, svg, iframe').remove();

    // Title
    const title = $('title').text().trim();

    // Meta description
    const metaDescription = $('meta[name="description"]').attr('content')?.trim() || '';

    // Headings
    const headings: string[] = [];
    $('h1, h2, h3').each((_, el) => {
      const text = $(el).text().trim();
      if (text) headings.push(text);
    });

    // Body text (limit to reasonable amount)
    const bodyText = $('body').text()
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 5000);

    // Footer text
    const footerText = $('footer').text()
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 1000);

    // Extract emails
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const fullText = $('body').text();
    const emailsFromText = fullText.match(emailRegex) || [];
    const emailsFromHref: string[] = [];
    $('a[href^="mailto:"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) {
        const email = href.replace('mailto:', '').split('?')[0].trim();
        emailsFromHref.push(email);
      }
    });
    const emails = [...new Set([...emailsFromHref, ...emailsFromText])].filter(
      e => !e.includes('example.com') && !e.includes('sentry') && !e.includes('wixpress')
    );

    // Extract phone numbers
    const phoneRegex = /(?:\+?\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/g;
    const phones = [...new Set(fullText.match(phoneRegex) || [])].filter(
      p => p.replace(/\D/g, '').length >= 7 && p.replace(/\D/g, '').length <= 15
    );

    // Extract social links
    const socialLinks: ScrapedPage['socialLinks'] = {};
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || '';
      if (href.includes('linkedin.com/company') || href.includes('linkedin.com/in/')) {
        socialLinks.linkedin = href;
      } else if (href.includes('instagram.com/')) {
        socialLinks.instagram = href;
      } else if (href.includes('facebook.com/')) {
        socialLinks.facebook = href;
      } else if (href.includes('twitter.com/') || href.includes('x.com/')) {
        socialLinks.twitter = href;
      }
    });

    // Extract schema.org JSON-LD
    const schemaOrgData: Record<string, unknown>[] = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).html() || '');
        schemaOrgData.push(data);
      } catch {
        // Invalid JSON-LD, skip
      }
    });

    // Extract internal links for further crawling
    const internalLinks: string[] = [];
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || '';
      try {
        const linkUrl = new URL(href, url);
        if (linkUrl.origin === baseUrl) {
          const path = linkUrl.pathname.toLowerCase();
          if (
            path.includes('about') ||
            path.includes('contact') ||
            path.includes('service') ||
            path.includes('team') ||
            path.includes('career')
          ) {
            internalLinks.push(linkUrl.toString());
          }
        }
      } catch {
        // Invalid URL, skip
      }
    });

    return {
      url,
      title,
      metaDescription,
      headings,
      bodyText,
      html,
      footerText,
      emails,
      phones,
      socialLinks,
      schemaOrgData,
      internalLinks: [...new Set(internalLinks)],
    };
  } catch (error) {
    console.warn(`Error scraping ${url}:`, error);
    return null;
  }
}

/**
 * Scrape multiple pages for a company (homepage + about + contact + services)
 */
export async function scrapeCompanyPages(
  websiteUrl: string,
  maxPages: number = 4,
  delayMs: number = 1500
): Promise<{
  homepage: ScrapedPage | null;
  aboutPage: ScrapedPage | null;
  contactPage: ScrapedPage | null;
  servicesPage: ScrapedPage | null;
}> {
  const homepage = await scrapePage(websiteUrl);
  const result = {
    homepage,
    aboutPage: null as ScrapedPage | null,
    contactPage: null as ScrapedPage | null,
    servicesPage: null as ScrapedPage | null,
  };

  if (!homepage || maxPages <= 1) return result;

  // Find relevant internal links
  const links = homepage.internalLinks;
  let pagesScraped = 1;

  for (const link of links) {
    if (pagesScraped >= maxPages) break;
    const path = new URL(link).pathname.toLowerCase();

    await new Promise(resolve => setTimeout(resolve, delayMs));

    if ((path.includes('about') || path.includes('who-we-are')) && !result.aboutPage) {
      result.aboutPage = await scrapePage(link);
      pagesScraped++;
    } else if ((path.includes('contact') || path.includes('get-in-touch')) && !result.contactPage) {
      result.contactPage = await scrapePage(link);
      pagesScraped++;
    } else if ((path.includes('service') || path.includes('what-we-do') || path.includes('solution')) && !result.servicesPage) {
      result.servicesPage = await scrapePage(link);
      pagesScraped++;
    }
  }

  // Try common paths if not found
  const baseUrl = new URL(websiteUrl).origin;

  if (!result.aboutPage && pagesScraped < maxPages) {
    await new Promise(resolve => setTimeout(resolve, delayMs));
    result.aboutPage = await scrapePage(`${baseUrl}/about`);
    pagesScraped++;
  }

  if (!result.contactPage && pagesScraped < maxPages) {
    await new Promise(resolve => setTimeout(resolve, delayMs));
    result.contactPage = await scrapePage(`${baseUrl}/contact`);
    pagesScraped++;
  }

  return result;
}
