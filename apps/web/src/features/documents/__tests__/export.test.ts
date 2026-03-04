import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RouterOutput } from '@repo/api/client';
import {
  buildDocumentMarkdownExport,
  buildDocumentTextExport,
} from '../lib/export';

type Document = RouterOutput['sources']['get'];

function createMockDocument(overrides: Partial<Document> = {}): Document {
  return {
    id: 'doc_1' as Document['id'],
    title: 'Market Trends',
    contentKey: 'docs/doc_1.txt',
    mimeType: 'text/plain',
    wordCount: 1250,
    source: 'manual',
    originalFileName: null,
    originalFileSize: null,
    metadata: null,
    status: 'ready',
    errorMessage: null,
    sourceUrl: null,
    researchConfig: null,
    jobId: null,
    extractedText: null,
    contentHash: null,
    createdBy: 'user_1',
    createdAt: '2026-02-01T12:00:00.000Z',
    updatedAt: '2026-02-01T12:00:00.000Z',
    ...overrides,
  };
}

describe('document export formatting', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-18T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('includes research query and sources in markdown export', () => {
    const document = createMockDocument({
      source: 'research',
      researchConfig: {
        query: 'AI infrastructure forecasts',
        sources: [
          { title: 'Example A', url: 'https://example.com/a' },
          { title: 'Example B', url: 'https://example.com/b' },
        ],
      },
    });

    const output = buildDocumentMarkdownExport({
      document,
      title: 'AI Infra Brief',
      content: 'Final synthesized analysis.',
    });

    expect(output).toContain('# AI Infra Brief');
    expect(output).toContain('## Research Query');
    expect(output).toContain('AI infrastructure forecasts');
    expect(output).toContain('- [Example A](https://example.com/a)');
    expect(output).toContain('- [Example B](https://example.com/b)');
    expect(output).toContain('Exported: 2026-02-18T10:00:00.000Z');
    expect(output).toContain('Final synthesized analysis.');
  });

  it('includes source url in text export for url documents', () => {
    const document = createMockDocument({
      source: 'url',
      sourceUrl: 'https://example.com/research',
    });

    const output = buildDocumentTextExport({
      document,
      title: 'Web Capture',
      content: 'Captured article body.',
    });

    expect(output).toContain('Web Capture');
    expect(output).toContain('Source URL: https://example.com/research');
    expect(output).toContain('Content:');
    expect(output).toContain('Captured article body.');
  });
});
