import type { RouterOutput } from '@repo/api/client';

type Segment = NonNullable<RouterOutput['podcasts']['get']['segments']>[number];

interface BuildPodcastScriptMarkdownInput {
  title: string;
  summary: string | null;
  segments: Segment[];
}

function getExportTitle(title: string): string {
  const trimmed = title.trim();
  return trimmed.length > 0 ? trimmed : 'Untitled Podcast';
}

export function buildPodcastScriptMarkdown({
  title,
  summary,
  segments,
}: BuildPodcastScriptMarkdownInput): string {
  const sortedSegments = [...segments].sort((a, b) => a.index - b.index);

  const lines: string[] = [
    `# ${getExportTitle(title)}`,
    '',
    `Exported: ${new Date().toISOString()}`,
  ];

  if (summary?.trim()) {
    lines.push('', '## Summary', '', summary.trim());
  }

  lines.push('', '## Script', '');

  if (sortedSegments.length === 0) {
    lines.push('_No script available._');
    return lines.join('\n');
  }

  for (const segment of sortedSegments) {
    const speaker = segment.speaker.trim() || 'Speaker';
    const line = segment.line.trim();
    lines.push(`**${speaker}:** ${line}`, '');
  }

  return lines.join('\n').trimEnd();
}

export function buildPodcastTranscriptMarkdown(
  input: BuildPodcastScriptMarkdownInput,
): string {
  const script = buildPodcastScriptMarkdown(input);
  return script.replace('## Script', '## Transcript');
}
