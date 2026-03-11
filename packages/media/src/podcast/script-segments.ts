import type { ScriptSegment } from '@repo/db/schema';

const trimSegmentField = (value: string | null | undefined) =>
  value?.trim() ?? '';

export const sanitizePodcastScriptSegments = (
  segments: readonly ScriptSegment[] | null | undefined,
): ScriptSegment[] =>
  (segments ?? [])
    .map((segment, originalPosition) => {
      const line = trimSegmentField(segment.line);
      if (!line) {
        return null;
      }

      return {
        speaker: trimSegmentField(segment.speaker),
        line,
        index: segment.index,
        startTimeMs: segment.startTimeMs,
        endTimeMs: segment.endTimeMs,
        originalPosition,
      };
    })
    .filter(
      (segment): segment is NonNullable<typeof segment> => segment !== null,
    )
    .sort(
      (left, right) =>
        left.index - right.index ||
        left.originalPosition - right.originalPosition,
    )
    .map(({ originalPosition: _originalPosition, ...segment }, index) => ({
      ...segment,
      index,
    }));
