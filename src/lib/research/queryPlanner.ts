export interface QueryPlanInput {
  brandType: string;
  location: string;
  companySize: string;
  businessMaturity: string;
  contactPreference: string;
  extraInstructions: string;
  searchDepth: string;
}

export function buildCompanyDiscoveryQueries(input: QueryPlanInput): string[] {
  const queries = [
    `${input.brandType} in ${input.location}`,
    `${input.brandType} companies ${input.location}`,
    `${input.brandType} official website ${input.location}`,
    `${input.brandType} contact ${input.location}`,
    `${input.brandType} owner founder ${input.location}`,
    `${input.brandType} LinkedIn ${input.location}`
  ];
  
  if (input.extraInstructions) {
    queries.push(`${input.brandType} ${input.location} ${input.extraInstructions}`);
  }
  
  return queries;
}

export function buildWebsiteResolutionQueries(companyName: string, location: string | null): string[] {
  const queries = [
    `${companyName} official website`,
    `${companyName} contact`,
    `${companyName} about`,
    `${companyName} LinkedIn`
  ];
  
  if (location) {
    queries.splice(1, 0, `${companyName} ${location} official website`);
  }
  
  return queries;
}

export function buildDecisionMakerQueries(companyName: string, industry: string | null): string[] {
  const baseQueries = [
    `${companyName} founder`,
    `${companyName} owner`,
    `${companyName} CEO`,
    `${companyName} managing director`,
    `${companyName} director`,
    `${companyName} leadership`,
    `${companyName} management team`,
    `${companyName} key management people`,
    `${companyName} contact person`
  ];
  
  const ind = industry?.toLowerCase() || '';
  
  if (ind.includes('finance') || ind.includes('broker') || ind.includes('stock') || ind.includes('insurance') || ind.includes('nbfc')) {
    baseQueries.push(
      `${companyName} key management people`,
      `${companyName} investor grievance escalation matrix`,
      `${companyName} CEO managing director`,
      `${companyName} compliance officer`,
      `${companyName} SEBI registration contact`,
      `${companyName} NSE member contact`,
      `${companyName} BSE member contact`
    );
  } else if (ind.includes('real estate')) {
    baseQueries.push(
      `${companyName} founder`,
      `${companyName} owner`,
      `${companyName} director`,
      `${companyName} RERA director`
    );
  } else if (ind.includes('cafe') || ind.includes('hotel') || ind.includes('restaurant')) {
    baseQueries.push(
      `${companyName} owner`,
      `${companyName} founder`,
      `${companyName} manager`,
      `${companyName} general manager`
    );
  } else if (ind.includes('clinic')) {
    baseQueries.push(
      `${companyName} founder doctor`,
      `${companyName} clinic owner`,
      `${companyName} chief doctor`,
      `${companyName} director`
    );
  } else if (ind.includes('coach') || ind.includes('education')) {
    baseQueries.push(
      `${companyName} founder`,
      `${companyName} director`,
      `${companyName} owner`,
      `${companyName} principal`
    );
  }
  
  // Deduplicate
  return Array.from(new Set(baseQueries));
}

export function buildPersonContactQueries(personName: string, companyName: string, websiteDomain: string | null): string[] {
  const queries = [
    `${personName} ${companyName} contact`,
    `${personName} ${companyName} email`,
    `${personName} ${companyName} phone`,
    `${personName} ${companyName} LinkedIn`,
    `${personName} founder ${companyName}`,
    `${personName} director ${companyName}`
  ];
  
  if (websiteDomain) {
    // Strip http/www for site query
    let cleanDomain = websiteDomain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    if (cleanDomain) {
      queries.push(`site:${cleanDomain} "${personName}"`);
      queries.push(`site:${cleanDomain} "${personName}" email`);
      queries.push(`site:${cleanDomain} "${personName}" phone`);
    }
  }
  
  return queries;
}
