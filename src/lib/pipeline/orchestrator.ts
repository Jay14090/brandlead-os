import { prisma } from '@/lib/prisma';
import { buildCompanyDiscoveryQueries, buildWebsiteResolutionQueries } from '../research/queryPlanner';
import { collectSearchEvidence } from '../research/evidenceCollector';
import { mergeCompanyCandidates } from '../research/companyMerger';
import { resolveOfficialWebsites } from '../research/websiteResolver';
import { scrapeCompanyWebsites } from './stage4-scrape'; // We can adapt the existing crawler to work with company candidates
import { extractContactCandidates } from '../research/contactCandidateExtractor';
import { extractDecisionMakers } from '../research/decisionMakerDiscovery';
import { runPersonContactSearches } from '../research/personContactSearch';
import { buildEvidencePack } from '../research/evidencePackBuilder';
import { lightCleaning } from '../research/lightCleaning';
import { executeFinalLeadJudge } from '../ai/finalLeadJudge';
import { executeGeminiReviewer } from '../ai/geminiReviewer';
import { SEARCH_DEPTH_CONFIG } from '@/lib/constants';

interface PipelineProgress {
  stage: string;
  stageIndex: number;
  totalStages: number;
  message: string;
  details?: string;
}

async function updateJobProgress(jobId: string, progress: PipelineProgress) {
  await prisma.searchJob.update({
    where: { id: jobId },
    data: {
      progress: JSON.stringify(progress),
      status: 'running',
    },
  });
}

/**
 * Main pipeline orchestrator — runs the 14 evidence-first stages
 */
export async function runPipeline(jobId: string): Promise<void> {
  const job = await prisma.searchJob.findUnique({ where: { id: jobId } });
  if (!job) throw new Error(`Job ${jobId} not found`);

  try {
    // ---- Stage 1: Query Planning ----
    await updateJobProgress(jobId, { stage: 'queries', stageIndex: 1, totalStages: 14, message: 'Generating multi-source search queries...' });
    const discoveryQueries = buildCompanyDiscoveryQueries({
      brandType: job.brandType,
      location: job.location,
      companySize: job.companySize,
      businessMaturity: job.businessMaturity,
      contactPreference: job.contactPreference,
      extraInstructions: job.extraInstructions,
      searchDepth: job.searchDepth
    });

    // ---- Stage 2: Multi-API Evidence Collection ----
    await updateJobProgress(jobId, { stage: 'evidence_collection', stageIndex: 2, totalStages: 14, message: 'Collecting raw search evidence from all APIs...' });
    const evidenceInputs = discoveryQueries.map(q => ({
      jobId,
      query: q,
      resultType: 'company_discovery',
      maxResults: job.searchDepth === 'Deep' ? 10 : 5
    }));
    await collectSearchEvidence(evidenceInputs);

    // ---- Stage 3: Candidate Company Merge ----
    await updateJobProgress(jobId, { stage: 'company_merge', stageIndex: 3, totalStages: 14, message: 'Merging evidence into company candidates...' });
    const companyCandidates = await mergeCompanyCandidates(jobId, job.searchDepth);
    
    if (companyCandidates.length === 0) {
      throw new Error('No company candidates discovered from search evidence.');
    }

    // Initialize Lead records for top candidates (limit by leadCount * multiplier)
    const multiplier = job.searchDepth === 'Deep' ? 3 : 2;
    const topCandidates = companyCandidates.slice(0, job.leadCount * multiplier);
    
    // Create base leads
    const baseLeads = topCandidates.map(c => ({
      jobId: job.id,
      userId: job.userId,
      companyName: c.companyName,
      status: 'Processing'
    }));
    await prisma.lead.createMany({ data: baseLeads });

    // ---- Stage 4: Official Website Resolution ----
    await updateJobProgress(jobId, { stage: 'website_resolution', stageIndex: 4, totalStages: 14, message: 'Resolving official websites...' });
    await resolveOfficialWebsites(jobId);
    
    // We update the lead records with the resolved website for crawling
    const updatedCandidates = await prisma.companyCandidate.findMany({ where: { jobId } });
    const allLeads = await prisma.lead.findMany({ where: { jobId } });
    for (const lead of allLeads) {
      const cand = updatedCandidates.find(c => c.companyName === lead.companyName);
      if (cand) {
        const websites = JSON.parse(cand.possibleWebsites || '[]');
        if (websites.length > 0) {
          await prisma.lead.update({ where: { id: lead.id }, data: { websiteUrl: websites[0] } });
        }
      }
    }

    // ---- Stage 5: Website Crawling ----
    await updateJobProgress(jobId, { stage: 'crawling', stageIndex: 5, totalStages: 14, message: 'Crawling official websites and deep pages...' });
    // Note: scrapeCompanyWebsites handles creating CrawledPage records
    const leadsToCrawl = await prisma.lead.findMany({ where: { jobId, websiteUrl: { not: null } } });
    // Transform to expected shape for existing scraper
    const crawlInputs = leadsToCrawl.map(l => ({
      companyName: l.companyName,
      possibleWebsite: l.websiteUrl || '',
      possibleLinkedIn: '',
      possibleLocation: job.location,
      searchResultTitle: '',
      searchResultSnippet: '',
      evidenceUrl: l.websiteUrl || '',
      reasonFound: 'evidence_first_pipeline',
      sourceUrl: l.websiteUrl || ''
    }));
    const scrapedData = await scrapeCompanyWebsites(crawlInputs, { maxPagesPerLead: job.searchDepth === 'Deep' ? 10 : 4, requestDelay: 1500 });
    
    // Save crawled pages to the new schema
    for (const data of scrapedData) {
      const lead = leadsToCrawl.find(l => l.companyName === data.candidate.companyName);
      if (lead) {
        const pagesToSave = [data.homepage, data.aboutPage, data.contactPage, data.servicesPage].filter(p => p !== null) as any[];
        for (const p of pagesToSave) {
          await prisma.crawledPage.create({
            data: {
              leadId: lead.id,
              url: p.url,
              title: p.title,
              textContent: p.bodyText || '',
              markdownContent: p.html || '',
              sourceProvider: 'scraper'
            }
          });
        }
      }
    }

    // ---- Stage 6: Company Contact Extraction ----
    await updateJobProgress(jobId, { stage: 'contact_extraction', stageIndex: 6, totalStages: 14, message: 'Extracting company contacts deterministically...' });
    await extractContactCandidates(jobId);

    // ---- Stage 7: Decision Maker Discovery ----
    await updateJobProgress(jobId, { stage: 'decision_maker_discovery', stageIndex: 7, totalStages: 14, message: 'Discovering key decision makers...' });
    // Gather dm queries
    const dmQueries: any[] = [];
    for (const lead of allLeads) {
      const queries = buildWebsiteResolutionQueries(lead.companyName, job.location);
      dmQueries.push(...queries.map(q => ({ jobId, query: q, resultType: 'decision_maker_discovery', maxResults: 3 })));
    }
    await collectSearchEvidence(dmQueries);
    await extractDecisionMakers(jobId);

    // ---- Stage 8: Person-Specific Contact Search ----
    await updateJobProgress(jobId, { stage: 'person_contact_search', stageIndex: 8, totalStages: 14, message: 'Hunting for direct contact info of decision makers...' });
    await runPersonContactSearches(jobId, job.searchDepth);

    // ---- Stage 10: Light Cleaning ----
    // (We do this before pack building to save context window)
    await updateJobProgress(jobId, { stage: 'light_cleaning', stageIndex: 10, totalStages: 14, message: 'Cleaning up obvious garbage and duplicates...' });
    await lightCleaning(jobId);

    // ---- Stage 9, 11, 12, 13: Final LLM Judge, Gemini Review, Save ----
    await updateJobProgress(jobId, { stage: 'final_judge', stageIndex: 11, totalStages: 14, message: 'Consulting the Final AI Judge and second opinions...' });
    
    const finalLeads = await prisma.lead.findMany({ where: { jobId } });
    let savedCount = 0;

    const chunkSize = 5;
    for (let i = 0; i < finalLeads.length; i += chunkSize) {
      const batch = finalLeads.slice(i, i + chunkSize);
      
      await Promise.all(batch.map(async (lead) => {
        try {
          // Stage 9: Pack Builder
          const pack = await buildEvidencePack(lead.id);
          if (!pack) return;

          // Stage 11: Final Lead Judge (OpenAI)
          const userSearchRequest = `${job.brandType} in ${job.location}, Size: ${job.companySize}`;
          const finalDecision = await executeFinalLeadJudge(userSearchRequest, pack);
          
          if (!finalDecision) return;

          // Stage 12: Gemini Reviewer
          const review = await executeGeminiReviewer(pack, finalDecision);
          
          if (review && review.confidenceAdjustment !== undefined) {
            finalDecision.overallConfidence += review.confidenceAdjustment;
            if (review.issues && review.issues.length > 0) {
              finalDecision.warnings = finalDecision.warnings || [];
              finalDecision.warnings.push(...review.issues);
              finalDecision.needsManualReview = true;
            }
          }

          // Stage 13: Final Lead Save
          await prisma.finalLeadDecision.create({
            data: {
              leadId: lead.id,
              finalJson: JSON.stringify(finalDecision),
              modelUsed: 'gpt-5.5',
              geminiReviewJson: JSON.stringify(review)
            }
          });

          // Update the Lead record directly for the UI
          await prisma.lead.update({
            where: { id: lead.id },
            data: {
              companyName: finalDecision.companyName || lead.companyName,
              companyNameStatus: finalDecision.companyNameStatus || 'Possible',
              websiteUrl: finalDecision.websiteUrl,
              websiteStatus: finalDecision.websiteStatus || 'Not Found',
              whatTheyDo: finalDecision.whatTheyDo,
              industry: finalDecision.industry,
              location: finalDecision.location,
              locationStatus: finalDecision.locationStatus || 'Not Found',
              companySizeEstimate: finalDecision.companySizeEstimate,
              companySizeStatus: finalDecision.companySizeStatus || 'Not Found',
              linkedinCompanyUrl: finalDecision.linkedinCompanyUrl,
              linkedinStatus: finalDecision.linkedinStatus || 'Not Found',
              bestDecisionMakerName: finalDecision.bestDecisionMakerName,
              bestDecisionMakerRole: finalDecision.bestDecisionMakerRole,
              bestDecisionMakerStatus: finalDecision.bestDecisionMakerStatus || 'Not Found',
              bestDecisionMakerLinkedIn: finalDecision.bestDecisionMakerLinkedIn,
              bestDecisionMakerEmail: finalDecision.bestDecisionMakerEmail,
              bestDecisionMakerPhone: finalDecision.bestDecisionMakerPhone,
              decisionMakerContactStatus: finalDecision.decisionMakerContactStatus || 'Not Found',
              companyGeneralEmail: finalDecision.companyGeneralEmail,
              companyGeneralPhone: finalDecision.companyGeneralPhone,
              bestOutreachRoute: finalDecision.bestOutreachRoute,
              painPoints: JSON.stringify(finalDecision.painPoints || []),
              whatWeCanPitch: finalDecision.whatWeCanPitch,
              suggestedOutreachAngle: finalDecision.suggestedOutreachAngle,
              personalizedFirstLine: finalDecision.personalizedFirstLine,
              companyIdentityConfidence: finalDecision.companyIdentityConfidence || 0,
              websiteConfidence: finalDecision.websiteConfidence || 0,
              contactsConfidence: finalDecision.contactsConfidence || 0,
              decisionMakerConfidence: finalDecision.decisionMakerConfidence || 0,
              businessFitConfidence: finalDecision.businessFitConfidence || 0,
              overallConfidence: finalDecision.overallConfidence || 0,
              needsManualReview: finalDecision.needsManualReview || false,
              dataQualityNotes: finalDecision.dataQualityNotes || '',
              sourceUrls: JSON.stringify(finalDecision.sourceUrls || []),
              warnings: JSON.stringify(finalDecision.warnings || []),
              conflicts: JSON.stringify(finalDecision.conflicts || []),
              status: 'Completed'
            }
          });
          
          savedCount++;
        } catch (err) {
          console.error(`Failed to process lead ${lead.id} during judging phase:`, err);
        }
      }));
    }

    // ---- Stage 14: Done ----
    await prisma.searchJob.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        progress: JSON.stringify({
          stage: 'completed',
          stageIndex: 14,
          totalStages: 14,
          message: `Done! ${savedCount} evidence-backed leads processed and judged.`,
        }),
      },
    });

  } catch (error) {
    console.error(`Pipeline failed for job ${jobId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await prisma.searchJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        error: errorMessage,
        progress: JSON.stringify({
          stage: 'error',
          stageIndex: -1,
          totalStages: 14,
          message: `Pipeline failed: ${errorMessage}`,
        }),
      },
    });
  }
}
