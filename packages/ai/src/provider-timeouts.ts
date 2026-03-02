/**
 * Timeout budgets for external provider calls.
 * Each retry attempt gets a fresh budget because retries re-run the full effect.
 */
export const PROVIDER_TIMEOUTS_MS = {
  llmGenerate: 30_000,
  ttsGenerate: 45_000,
  imageGenerate: 45_000,
  deepResearchStart: 60_000,
  deepResearchGet: 30_000,
} as const;
