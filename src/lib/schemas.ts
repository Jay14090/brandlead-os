import { z } from 'zod';

// ---- Auth ----
export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

// ---- Settings ----
export const settingsSchema = z.object({
  openAIKey: z.string().optional(),
  openAIModel: z.string().min(1).default('gpt-5.5'),
  geminiKey: z.string().optional(),
  geminiModel: z.string().min(1).default('gemini-3.1-pro-preview'),
  geminiFastModel: z.string().min(1).default('gemini-3.5-flash'),
  firecrawlKey: z.string().optional(),
  exaKey: z.string().optional(),
  strictnessModeDefault: z.string().default('Balanced'),
  maxLeadsPerSearch: z.number().min(1).max(100).default(50),
  maxPagesPerLead: z.number().min(1).max(10).default(4),
  requestDelay: z.number().min(500).max(10000).default(1500),
});

// ---- Search Job ----
export const companySizeOptions = [
  'Solo/freelancer',
  '1-10 employees',
  '11-50 employees',
  '51-200 employees',
  '201-500 employees',
  'Any',
] as const;

export const businessMaturityOptions = [
  'New business',
  'Growing business',
  'Established but outdated online presence',
  'Any',
] as const;

export const contactPreferenceOptions = [
  'Website contact form',
  'Public email',
  'Phone',
  'LinkedIn',
  'Instagram',
  'Founder/owner name if public',
] as const;

export const searchDepthOptions = ['Fast', 'Balanced', 'Deep'] as const;

export const searchJobSchema = z.object({
  brandType: z.string().min(1, 'Brand/company type is required'),
  location: z.string().min(1, 'Location is required'),
  leadCount: z.number().min(1).max(100),
  companySize: z.enum(companySizeOptions).default('Any'),
  businessMaturity: z.enum(businessMaturityOptions).default('Any'),
  contactPreference: z.array(z.enum(contactPreferenceOptions)).default([]),
  extraInstructions: z.string().default(''),
  strictnessMode: z.string().default('Balanced'),
  searchDepth: z.enum(searchDepthOptions).default('Balanced'),
});

// ---- Lead Status ----
export const leadStatusOptions = [
  'New',
  'Reviewed',
  'Contacted',
  'Not relevant',
  'Bad data',
] as const;

export const updateLeadSchema = z.object({
  status: z.enum(leadStatusOptions).optional(),
  companyName: z.string().optional(),
  websiteUrl: z.string().url().optional().or(z.literal('')),
  publicEmail: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
  instagramUrl: z.string().url().optional().or(z.literal('')),
  dataQualityNotes: z.string().optional(),
});

// ---- Verification Status ----
export const verificationStatusOptions = [
  'Verified',
  'Likely',
  'Not found',
  'Conflict found',
] as const;

export type SearchJobInput = z.infer<typeof searchJobSchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
