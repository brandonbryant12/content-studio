import type { ScriptSegment } from '../hooks/use-script-editor';

const normalizeLine = (value: string) =>
  value
    .replace(/\r\n/g, '\n')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function buildSpeakerNames(
  format: 'voice_over' | 'conversation',
  speakerNames?: readonly string[],
): string[] {
  const unique: string[] = [];

  for (const speaker of speakerNames ?? []) {
    const trimmed = speaker.trim();
    if (!trimmed) continue;

    if (
      unique.some((existingSpeaker) => {
        return existingSpeaker.toLowerCase() === trimmed.toLowerCase();
      })
    ) {
      continue;
    }

    unique.push(trimmed);
  }

  if (format === 'conversation') {
    if (unique.length === 0) {
      return ['Host', 'Co-host'];
    }

    if (unique.length === 1) {
      return [unique[0]!, 'Co-host'];
    }

    return unique.slice(0, 2);
  }

  return unique.length > 0 ? [unique[0]!] : ['Host'];
}

export function getPodcastAssistantSpeakerNames({
  segments,
  format,
}: {
  segments: readonly ScriptSegment[];
  format: 'voice_over' | 'conversation';
}): string[] {
  const discoveredSpeakers: string[] = [];

  for (const segment of segments) {
    const speaker = segment.speaker.trim();
    if (!speaker) continue;

    if (
      discoveredSpeakers.some(
        (existingSpeaker) =>
          existingSpeaker.toLowerCase() === speaker.toLowerCase(),
      )
    ) {
      continue;
    }

    discoveredSpeakers.push(speaker);

    if (format === 'voice_over' || discoveredSpeakers.length === 2) {
      break;
    }
  }

  return buildSpeakerNames(format, discoveredSpeakers);
}

export function formatPodcastAssistantDraft(
  segments: readonly ScriptSegment[],
): string {
  return segments
    .map((segment) => {
      const speaker = segment.speaker.trim() || 'Host';
      const line = normalizeLine(segment.line);
      if (!line) {
        return null;
      }

      return `[${speaker}]\n${line}`;
    })
    .filter((segment): segment is string => segment !== null)
    .join('\n\n');
}
