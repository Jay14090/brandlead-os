export function generatePersonContactQueries(
  personName: string,
  companyName: string,
  websiteDomain: string | null,
  location: string | null
): string[] {
  const queries: string[] = [];

  // Remove titles for better search results
  let cleanName = personName;
  const titles = ['Mr.', 'Ms.', 'Mrs.', 'Dr.', 'CA', 'Adv.', 'Prof.'];
  for (const title of titles) {
    if (cleanName.startsWith(title + ' ')) {
      cleanName = cleanName.substring(title.length + 1).trim();
    } else if (cleanName.startsWith(title.replace('.', '') + ' ')) {
      cleanName = cleanName.substring(title.length).trim();
    }
  }

  // Basic variants
  queries.push(
    `"${cleanName}" "${companyName}" email`,
    `"${cleanName}" "${companyName}" phone`,
    `"${cleanName}" "${companyName}" contact`,
    `"${cleanName}" "${companyName}" LinkedIn`,
    `"${cleanName}" founder "${companyName}"`,
    `"${cleanName}" director "${companyName}"`,
    `"${cleanName}" CEO "${companyName}"`
  );

  if (location && location.trim() !== '') {
    queries.push(`"${cleanName}" ${location} "${companyName}"`);
  }

  // Domain specific
  if (websiteDomain && websiteDomain.trim() !== '') {
    let domain = websiteDomain.replace(/^https?:\/\//, '').replace(/^www\./, '');
    domain = domain.split('/')[0];

    queries.push(
      `site:${domain} "${cleanName}"`,
      `site:${domain} "${cleanName}" email`,
      `site:${domain} "${cleanName}" phone`,
      `site:${domain} "${cleanName}" contact`,
      `site:${domain} CEO "${cleanName}"`
    );
  }

  return [...new Set(queries)];
}
