/**
 * Timeout budgets for external provider calls.
 * Each retry attempt gets a fresh budget because retries re-run the full effect.
 */
export const PROVIDER_TIMEOUTS_MS = {
  llmGenerate: 300_000,
  ttsGenerate: 300_000,
  imageGenerate: 300_000,
  deepResearchStart: 300_000,
  deepResearchGet: 300_000,
} as const;
