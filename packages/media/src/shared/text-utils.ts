/**
 * Calculate word count from content.
 */
export const calculateWordCount = (content: string): number =>
  content
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
