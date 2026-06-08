-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "encryptedOpenAIKey" TEXT NOT NULL DEFAULT '',
    "openAIModel" TEXT NOT NULL DEFAULT 'gpt-5.5',
    "encryptedGeminiKey" TEXT NOT NULL DEFAULT '',
    "geminiModel" TEXT NOT NULL DEFAULT 'gemini-3.1-pro-preview',
    "geminiFastModel" TEXT NOT NULL DEFAULT 'gemini-3.5-flash',
    "encryptedFirecrawlKey" TEXT NOT NULL DEFAULT '',
    "encryptedExaKey" TEXT NOT NULL DEFAULT '',
    "strictModeDefault" BOOLEAN NOT NULL DEFAULT false,
    "maxLeadsPerSearch" INTEGER NOT NULL DEFAULT 50,
    "maxPagesPerLead" INTEGER NOT NULL DEFAULT 4,
    "requestDelay" INTEGER NOT NULL DEFAULT 1500,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SearchJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "brandType" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "leadCount" INTEGER NOT NULL,
    "companySize" TEXT NOT NULL DEFAULT 'Any',
    "businessMaturity" TEXT NOT NULL DEFAULT 'Any',
    "contactPreference" TEXT NOT NULL DEFAULT '[]',
    "extraInstructions" TEXT NOT NULL DEFAULT '',
    "strictValidation" BOOLEAN NOT NULL DEFAULT false,
    "searchDepth" TEXT NOT NULL DEFAULT 'Balanced',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "progress" TEXT NOT NULL DEFAULT '{}',
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "websiteVerificationStatus" TEXT NOT NULL DEFAULT 'Not found',
    "whatTheyDo" TEXT,
    "industry" TEXT,
    "location" TEXT,
    "companySizeEstimate" TEXT,
    "companySizeSource" TEXT,
    "linkedinUrl" TEXT,
    "instagramUrl" TEXT,
    "publicEmail" TEXT,
    "emailSourceUrl" TEXT,
    "phone" TEXT,
    "phoneSourceUrl" TEXT,
    "decisionMakerName" TEXT,
    "decisionMakerRole" TEXT,
    "decisionMakerSourceUrl" TEXT,
    "painPoints" TEXT NOT NULL DEFAULT '[]',
    "pitch" TEXT,
    "outreachFirstLine" TEXT,
    "confidenceScore" INTEGER NOT NULL DEFAULT 0,
    "dataQualityNotes" TEXT,
    "sourceUrls" TEXT NOT NULL DEFAULT '[]',
    "lastVerifiedDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'New',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Lead_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "SearchJob" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SourceEvidence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "extractedTextSnippet" TEXT,
    "supportsFields" TEXT NOT NULL DEFAULT '[]',
    "confidence" INTEGER NOT NULL DEFAULT 50,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SourceEvidence_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
