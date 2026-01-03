// features/documents/__tests__/handlers.ts
// MSW handlers for document feature tests

import { http, HttpResponse } from 'msw';

const API_BASE = '/rpc';

// Document mock data factory
export interface MockDocumentListItem {
  id: string;
  title: string;
  source: string;
  wordCount: number;
  originalFileSize: number | null;
  createdAt: string;
}

export const createMockDocumentListItem = (
  overrides: Partial<MockDocumentListItem> = {},
): MockDocumentListItem => ({
  id: `doc-${Date.now()}`,
  title: 'Test Document',
  source: 'text/plain',
  wordCount: 1000,
  originalFileSize: 5000,
  createdAt: new Date().toISOString(),
  ...overrides,
});

// Default mock documents for tests
export const mockDocuments: MockDocumentListItem[] = [
  createMockDocumentListItem({
    id: 'doc-1',
    title: 'Getting Started Guide',
    source: 'application/pdf',
    wordCount: 2500,
    originalFileSize: 150000,
    createdAt: '2024-01-15T10:00:00Z',
  }),
  createMockDocumentListItem({
    id: 'doc-2',
    title: 'API Documentation',
    source: 'text/plain',
    wordCount: 5000,
    originalFileSize: 25000,
    createdAt: '2024-01-16T14:30:00Z',
  }),
  createMockDocumentListItem({
    id: 'doc-3',
    title: 'Project Roadmap',
    source:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    wordCount: 1200,
    originalFileSize: 45000,
    createdAt: '2024-01-17T09:15:00Z',
  }),
];

// Document feature handlers
export const documentHandlers = [
  http.post(`${API_BASE}/documents.list`, () => {
    return HttpResponse.json(mockDocuments);
  }),

  http.post(`${API_BASE}/documents.get`, async ({ request }) => {
    const body = (await request.json()) as { id?: string };
    const doc = mockDocuments.find((d) => d.id === body.id);
    if (doc) {
      return HttpResponse.json(doc);
    }
    return HttpResponse.json({ error: 'Document not found' }, { status: 404 });
  }),

  http.post(`${API_BASE}/documents.upload`, async ({ request }) => {
    const body = (await request.json()) as {
      title?: string;
      fileName?: string;
    };
    return HttpResponse.json(
      createMockDocumentListItem({
        id: `doc-${Date.now()}`,
        title: body.title || body.fileName || 'Uploaded Document',
      }),
    );
  }),

  http.post(`${API_BASE}/documents.delete`, async ({ request }) => {
    const body = (await request.json()) as { id?: string };
    const doc = mockDocuments.find((d) => d.id === body.id);
    if (doc) {
      return HttpResponse.json({ success: true });
    }
    return HttpResponse.json({ error: 'Document not found' }, { status: 404 });
  }),
];
