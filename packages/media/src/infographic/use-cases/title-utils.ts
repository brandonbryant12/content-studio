const DEFAULT_INFOGRAPHIC_TITLE = 'Untitled Infographic';
const GENERIC_INFOGRAPHIC_TITLE = 'Infographic Overview';
const MAX_TITLE_WORDS = 6;

const SMALL_WORDS = new Set([
  'a',
  'an',
  'and',
  'as',
  'at',
  'by',
  'for',
  'from',
  'in',
  'of',
  'on',
  'or',
  'the',
  'to',
  'with',
]);

interface PromptLike {
  prompt: string | null;
}

interface SelectOriginalPromptInput {
  currentPrompt: string | null;
  existingVersions: readonly PromptLike[];
}

/**
 * Select the earliest non-empty generation prompt as the "original query".
 * Falls back to the currently saved prompt when no historical prompt exists.
 */
export function selectOriginalTitlePrompt({
  currentPrompt,
  existingVersions,
}: SelectOriginalPromptInput): string {
  for (const version of existingVersions) {
    const prompt = version.prompt?.trim();
    if (prompt) {
      return prompt;
    }
  }

  return currentPrompt?.trim() ?? '';
}

function stripInstructionPrefix(prompt: string): string {
  return prompt
    .replace(/\s+/g, ' ')
    .trim()
    .replace(
      /^(please\s+)?(create|generate|make|design|build|draft)\s+(an?\s+)?(infographic|visual|graphic)\s*(about|of|for)?\s*/i,
      '',
    )
    .replace(/^(about|on|for)\s+/i, '')
    .trim();
}

function toWords(input: string): string[] {
  return input.match(/[A-Za-z0-9][A-Za-z0-9'/-]*/g) ?? [];
}

function toTitleCase(words: readonly string[]): string {
  return words
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (index > 0 && SMALL_WORDS.has(lower)) return lower;
      return `${lower.charAt(0).toUpperCase()}${lower.slice(1)}`;
    })
    .join(' ');
}

const stripWrappingQuotes = (value: string): string =>
  value.replace(/^["'`]+|["'`]+$/g, '');

/**
 * Deterministic fallback used when the LLM title call fails.
 */
export function buildFallbackInfographicTitle(prompt: string): string {
  const cleanedPrompt = stripInstructionPrefix(prompt);
  const words = toWords(cleanedPrompt);
  if (words.length === 0) return GENERIC_INFOGRAPHIC_TITLE;

  return toTitleCase(words.slice(0, MAX_TITLE_WORDS));
}

export function normalizeInfographicTitleCandidate(candidate: string): string {
  const normalized = stripWrappingQuotes(candidate.replace(/\s+/g, ' ').trim())
    .replace(/[.!?]+$/g, '')
    .trim();

  return stripWrappingQuotes(normalized).trim();
}

/**
 * Normalize a model candidate and safely fallback to a prompt-derived title.
 */
export function resolveInfographicTitle(
  candidate: string,
  sourcePrompt: string,
): string {
  const normalized = normalizeInfographicTitleCandidate(candidate);
  if (!normalized) return buildFallbackInfographicTitle(sourcePrompt);
  if (normalized.toLowerCase() === DEFAULT_INFOGRAPHIC_TITLE.toLowerCase()) {
    return buildFallbackInfographicTitle(sourcePrompt);
  }
  return normalized;
}

export const UNTITLED_INFOGRAPHIC_TITLE = DEFAULT_INFOGRAPHIC_TITLE;
