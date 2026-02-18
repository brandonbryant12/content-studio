import type { RouterOutput } from '@repo/api/client';

type Document = RouterOutput['documents']['get'];

interface BuildDocumentExportInput {
  document: Document;
  title: string;
  content: string;
}

function getExportTitle(title: string): string {
  const trimmed = title.trim();
  return trimmed.length > 0 ? trimmed : 'Untitled Document';
}

function buildResearchSourcesMarkdown(document: Document): string[] {
  const sources = document.researchConfig?.sources ?? [];
  if (sources.length === 0) return [];

  return [
    '## Sources',
    '',
    ...sources.map((source) => `- [${source.title}](${source.url})`),
    '',
  ];
}

function buildResearchSourcesText(document: Document): string[] {
  const sources = document.researchConfig?.sources ?? [];
  if (sources.length === 0) return [];

  return [
    'Sources:',
    ...sources.map((source) => `- ${source.title}: ${source.url}`),
    '',
  ];
}

export function buildDocumentMarkdownExport({
  document,
  title,
  content,
}: BuildDocumentExportInput): string {
  const lines: string[] = [
    `# ${getExportTitle(title)}`,
    '',
    `Exported: ${new Date().toISOString()}`,
  ];

  if (document.source === 'research' && document.researchConfig?.query) {
    lines.push('', '## Research Query', '', document.researchConfig.query, '');
    lines.push(...buildResearchSourcesMarkdown(document));
  } else if (document.source === 'url' && document.sourceUrl) {
    lines.push('', `Source URL: ${document.sourceUrl}`);
  }

  lines.push('---', '', content.trim());
  return lines.join('\n');
}

export function buildDocumentTextExport({
  document,
  title,
  content,
}: BuildDocumentExportInput): string {
  const lines: string[] = [
    `${getExportTitle(title)}`,
    `Exported: ${new Date().toISOString()}`,
  ];

  if (document.source === 'research' && document.researchConfig?.query) {
    lines.push('', `Research Query: ${document.researchConfig.query}`);
    lines.push(...buildResearchSourcesText(document));
  } else if (document.source === 'url' && document.sourceUrl) {
    lines.push('', `Source URL: ${document.sourceUrl}`, '');
  }

  lines.push('Content:', '', content.trim());
  return lines.join('\n');
}
