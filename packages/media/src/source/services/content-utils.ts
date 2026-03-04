import { Effect } from 'effect';

/**
 * Truncate document content at a word boundary for use in LLM prompts.
 * Adds a [truncated] marker if content was cut.
 */
export function truncateForPrompt(content: string, maxChars = 100_000): string {
  if (content.length <= maxChars) return content;

  // Find the last space before the limit to avoid splitting words
  const cutoff = content.lastIndexOf(' ', maxChars);
  const breakpoint = cutoff > 0 ? cutoff : maxChars;

  return content.slice(0, breakpoint) + '\n\n[truncated]';
}

export const calculateContentHash = (content: string) =>
  Effect.promise(async () => {
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest(
      'SHA-256',
      encoder.encode(content),
    );
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  });
