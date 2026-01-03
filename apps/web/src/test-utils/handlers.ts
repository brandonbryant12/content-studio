// test-utils/handlers.ts
// Base MSW handlers for component tests

import { http, HttpResponse } from 'msw';

// Base URL for API requests
const API_BASE = '/rpc';

// Mock data factories
export const createMockPodcast = (overrides = {}) => ({
  id: 'podcast-1',
  title: 'Test Podcast',
  status: 'draft',
  format: 'conversation',
  voice: 'alloy',
  targetDuration: 300,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  documents: [],
  script: null,
  audioUrl: null,
  errorMessage: null,
  generationProgress: null,
  ...overrides,
});

export const createMockDocument = (overrides = {}) => ({
  id: 'doc-1',
  title: 'Test Document',
  mimeType: 'text/plain',
  wordCount: 1000,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

// Default handlers
export const handlers = [
  // Podcasts
  http.post(`${API_BASE}/podcasts.list`, () => {
    return HttpResponse.json([createMockPodcast()]);
  }),

  http.post(`${API_BASE}/podcasts.get`, async ({ request }) => {
    const body = (await request.json()) as { id?: string };
    return HttpResponse.json(createMockPodcast({ id: body.id || 'podcast-1' }));
  }),

  http.post(`${API_BASE}/podcasts.create`, async ({ request }) => {
    const body = (await request.json()) as { title?: string; format?: string };
    return HttpResponse.json(
      createMockPodcast({
        id: `podcast-${Date.now()}`,
        title: body.title || 'Untitled Podcast',
        format: body.format || 'conversation',
      }),
    );
  }),

  http.post(`${API_BASE}/podcasts.delete`, () => {
    return HttpResponse.json({ success: true });
  }),

  // Documents
  http.post(`${API_BASE}/documents.list`, () => {
    return HttpResponse.json([createMockDocument()]);
  }),

  http.post(`${API_BASE}/documents.get`, async ({ request }) => {
    const body = (await request.json()) as { id?: string };
    return HttpResponse.json(createMockDocument({ id: body.id || 'doc-1' }));
  }),

  http.post(`${API_BASE}/documents.upload`, () => {
    return HttpResponse.json(createMockDocument({ id: `doc-${Date.now()}` }));
  }),

  http.post(`${API_BASE}/documents.delete`, () => {
    return HttpResponse.json({ success: true });
  }),

  // Auth - session endpoint
  http.get('/api/auth/get-session', () => {
    return HttpResponse.json({
      session: {
        id: 'session-1',
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      },
      user: {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
      },
    });
  }),
];
