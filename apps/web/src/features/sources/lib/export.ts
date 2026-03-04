import type { RouterOutput } from '@repo/api/client';

type Source = RouterOutput['sources']['get'];

interface BuildSourceExportInput {
  source: Source;
  title: string;
  content: string;
}

function getExportTitle(title: string): string {
  const trimmed = title.trim();
  return trimmed.length > 0 ? trimmed : 'Untitled Source';
}

function buildResearchSourcesMarkdown(source: Source): string[] {
  const sources = source.researchConfig?.sources ?? [];
  if (sources.length === 0) return [];

  return [
    '## Sources',
    '',
    ...sources.map((s) => `- [${s.title}](${s.url})`),
    '',
  ];
}

function buildResearchSourcesText(source: Source): string[] {
  const sources = source.researchConfig?.sources ?? [];
  if (sources.length === 0) return [];

  return ['Sources:', ...sources.map((s) => `- ${s.title}: ${s.url}`), ''];
}

export function buildSourceMarkdownExport({
  source,
  title,
  content,
}: BuildSourceExportInput): string {
  const lines: string[] = [
    `# ${getExportTitle(title)}`,
    '',
    `Exported: ${new Date().toISOString()}`,
  ];

  if (source.source === 'research' && source.researchConfig?.query) {
    lines.push('', '## Research Query', '', source.researchConfig.query, '');
    lines.push(...buildResearchSourcesMarkdown(source));
  } else if (source.source === 'url' && source.sourceUrl) {
    lines.push('', `Source URL: ${source.sourceUrl}`);
  }

  lines.push('---', '', content.trim());
  return lines.join('\n');
}

export function buildSourceTextExport({
  source,
  title,
  content,
}: BuildSourceExportInput): string {
  const lines: string[] = [
    `${getExportTitle(title)}`,
    `Exported: ${new Date().toISOString()}`,
  ];

  if (source.source === 'research' && source.researchConfig?.query) {
    lines.push('', `Research Query: ${source.researchConfig.query}`);
    lines.push(...buildResearchSourcesText(source));
  } else if (source.source === 'url' && source.sourceUrl) {
    lines.push('', `Source URL: ${source.sourceUrl}`, '');
  }

  lines.push('Content:', '', content.trim());
  return lines.join('\n');
}
