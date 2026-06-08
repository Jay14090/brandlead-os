export function generateDecisionMakerQueries(
  companyName: string,
  websiteDomain: string | null,
  location: string | null,
  industry: string | null
): string[] {
  const queries: string[] = [];

  // Company-level
  queries.push(
    `"${companyName}" founder`,
    `"${companyName}" owner`,
    `"${companyName}" CEO`,
    `"${companyName}" managing director`,
    `"${companyName}" director`,
    `"${companyName}" leadership`,
    `"${companyName}" management team`,
    `"${companyName}" contact person`,
    `"${companyName}" key management people`,
    `"${companyName}" proprietor`,
    `"${companyName}" partner`
  );

  // Location-aware
  if (location && location.trim() !== '') {
    queries.push(
      `"${companyName}" ${location} founder`,
      `"${companyName}" ${location} director`,
      `"${companyName}" ${location} owner`,
      `"${companyName}" ${location} contact person`
    );
  }

  // Official-domain focused
  if (websiteDomain && websiteDomain.trim() !== '') {
    // Strip http/https and www for site operator
    let domain = websiteDomain.replace(/^https?:\/\//, '').replace(/^www\./, '');
    // Ensure no trailing slashes or paths
    domain = domain.split('/')[0];

    queries.push(
      `site:${domain} founder`,
      `site:${domain} director`,
      `site:${domain} CEO`,
      `site:${domain} managing director`,
      `site:${domain} team`,
      `site:${domain} management`,
      `site:${domain} leadership`,
      `site:${domain} key management`,
      `site:${domain} contact`
    );
  }

  // Industry-specific
  if (industry) {
    const lowerInd = industry.toLowerCase();
    if (lowerInd.includes('finance') || lowerInd.includes('broker') || lowerInd.includes('insurance') || lowerInd.includes('nbfc')) {
      queries.push(
        `"${companyName}" key management people`,
        `"${companyName}" investor grievance escalation matrix`,
        `"${companyName}" compliance officer CEO managing director`,
        `"${companyName}" SEBI registration contact`,
        `"${companyName}" NSE member contact`,
        `"${companyName}" BSE member contact`,
        `"${companyName}" DP head CEO`,
        `"${companyName}" principal officer`,
        `"${companyName}" directors`
      );
    }
    if (lowerInd.includes('real estate') || lowerInd.includes('property') || lowerInd.includes('builder')) {
      queries.push(
        `"${companyName}" founder`,
        `"${companyName}" owner`,
        `"${companyName}" RERA director`,
        `"${companyName}" managing director`
      );
    }
    if (lowerInd.includes('hotel') || lowerInd.includes('restaurant') || lowerInd.includes('cafe')) {
      queries.push(
        `"${companyName}" owner`,
        `"${companyName}" founder`,
        `"${companyName}" manager`,
        `"${companyName}" general manager`,
        `"${companyName}" marketing manager`
      );
    }
    if (lowerInd.includes('clinic') || lowerInd.includes('dentist') || lowerInd.includes('health') || lowerInd.includes('hospital')) {
      queries.push(
        `"${companyName}" founder doctor`,
        `"${companyName}" chief doctor`,
        `"${companyName}" clinic owner`,
        `"${companyName}" director`
      );
    }
    if (lowerInd.includes('coach') || lowerInd.includes('education') || lowerInd.includes('school')) {
      queries.push(
        `"${companyName}" founder`,
        `"${companyName}" director`,
        `"${companyName}" principal`,
        `"${companyName}" owner`
      );
    }
  }

  // Deduplicate and return
  return [...new Set(queries)];
}
