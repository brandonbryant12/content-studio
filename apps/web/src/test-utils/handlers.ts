// test-utils/handlers.ts
// Base MSW handlers for component tests

import { http, HttpResponse } from 'msw';

// Base URL for API requests
const API_BASE = '/rpc';

// Mock data factories
const createMockPodcast = (overrides = {}) => ({
  id: 'podcast-1',
  title: 'Test Podcast',
  status: 'draft',
  format: 'conversation',
  voice: 'alloy',
  targetDuration: 300,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  sources: [],
  script: null,
  audioUrl: null,
  errorMessage: null,
  generationProgress: null,
  ...overrides,
});

const createMockSource = (overrides = {}) => ({
  id: 'src-1',
  title: 'Test Source',
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

  // Sources
  http.post(`${API_BASE}/sources.list`, () => {
    return HttpResponse.json([createMockSource()]);
  }),

  http.post(`${API_BASE}/sources.get`, async ({ request }) => {
    const body = (await request.json()) as { id?: string };
    return HttpResponse.json(createMockSource({ id: body.id || 'src-1' }));
  }),

  http.post(`${API_BASE}/sources.upload`, () => {
    return HttpResponse.json(createMockSource({ id: `src-${Date.now()}` }));
  }),

  http.post(`${API_BASE}/sources.delete`, () => {
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
