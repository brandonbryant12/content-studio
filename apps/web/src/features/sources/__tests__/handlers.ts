// features/sources/__tests__/handlers.ts
// MSW handlers for source feature tests

import { http, HttpResponse } from 'msw';

const API_BASE = '/rpc';

// Source mock data factory
export interface MockSourceListItem {
  id: string;
  title: string;
  source: string;
  wordCount: number;
  originalFileSize: number | null;
  createdAt: string;
}

export const createMockSourceListItem = (
  overrides: Partial<MockSourceListItem> = {},
): MockSourceListItem => ({
  id: `doc-${Date.now()}`,
  title: 'Test Source',
  source: 'text/plain',
  wordCount: 1000,
  originalFileSize: 5000,
  createdAt: new Date().toISOString(),
  ...overrides,
});

// Default mock sources for tests
export const mockSources: MockSourceListItem[] = [
  createMockSourceListItem({
    id: 'doc-1',
    title: 'Getting Started Guide',
    source: 'application/pdf',
    wordCount: 2500,
    originalFileSize: 150000,
    createdAt: '2024-01-15T10:00:00Z',
  }),
  createMockSourceListItem({
    id: 'doc-2',
    title: 'API Documentation',
    source: 'text/plain',
    wordCount: 5000,
    originalFileSize: 25000,
    createdAt: '2024-01-16T14:30:00Z',
  }),
  createMockSourceListItem({
    id: 'doc-3',
    title: 'Project Roadmap',
    source:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    wordCount: 1200,
    originalFileSize: 45000,
    createdAt: '2024-01-17T09:15:00Z',
  }),
];

// Chat mock handler — returns a simple SSE stream
export const chatHandlers = [
  http.post(`${API_BASE}/chat.research`, () => {
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(
          encoder.encode(
            'data: {"type":"text-delta","textDelta":"I can help refine your topic."}\n\n',
          ),
        );
        controller.close();
      },
    });
    return new HttpResponse(stream, {
      headers: { 'Content-Type': 'text/event-stream' },
    });
  }),
];

// Source feature handlers
export const sourceHandlers = [
  http.post(`${API_BASE}/sources.list`, () => {
    return HttpResponse.json(mockSources);
  }),

  http.post(`${API_BASE}/sources.get`, async ({ request }) => {
    const body = (await request.json()) as { id?: string };
    const doc = mockSources.find((d) => d.id === body.id);
    if (doc) {
      return HttpResponse.json(doc);
    }
    return HttpResponse.json({ error: 'Source not found' }, { status: 404 });
  }),

  http.post(`${API_BASE}/sources.upload`, async ({ request }) => {
    const body = (await request.json()) as {
      title?: string;
      fileName?: string;
    };
    return HttpResponse.json(
      createMockSourceListItem({
        id: `doc-${Date.now()}`,
        title: body.title || body.fileName || 'Uploaded Source',
      }),
    );
  }),

  http.post(`${API_BASE}/sources.delete`, async ({ request }) => {
    const body = (await request.json()) as { id?: string };
    const doc = mockSources.find((d) => d.id === body.id);
    if (doc) {
      return HttpResponse.json({ success: true });
    }
    return HttpResponse.json({ error: 'Source not found' }, { status: 404 });
  }),
];
