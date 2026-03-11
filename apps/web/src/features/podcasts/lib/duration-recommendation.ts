const DEFAULT_MIN_DURATION = 1;
const DEFAULT_MAX_DURATION = 10;
const SOURCE_WORDS_PER_MINUTE = 550;

const clampMinutes = (value: number, minMinutes: number, maxMinutes: number) =>
  Math.min(maxMinutes, Math.max(minMinutes, value));

export function recommendPodcastTargetDurationMinutes({
  totalSourceWords,
  sourceCount,
  minMinutes = DEFAULT_MIN_DURATION,
  maxMinutes = DEFAULT_MAX_DURATION,
}: {
  totalSourceWords: number;
  sourceCount: number;
  minMinutes?: number;
  maxMinutes?: number;
}): number | null {
  const normalizedWordCount = Math.max(0, Math.round(totalSourceWords));
  const normalizedSourceCount = Math.max(0, Math.round(sourceCount));

  if (normalizedWordCount === 0 || normalizedSourceCount === 0) {
    return null;
  }

  const baseMinutes = Math.round(normalizedWordCount / SOURCE_WORDS_PER_MINUTE);
  const breadthBoost =
    normalizedSourceCount >= 3 && normalizedWordCount >= 1200 ? 1 : 0;
  const minimumSuggestedMinutes = normalizedSourceCount >= 2 ? 2 : 1;

  return clampMinutes(
    Math.max(baseMinutes + breadthBoost, minimumSuggestedMinutes),
    minMinutes,
    maxMinutes,
  );
}
