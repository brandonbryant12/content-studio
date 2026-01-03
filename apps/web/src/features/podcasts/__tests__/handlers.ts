// features/podcasts/__tests__/handlers.ts
// MSW handlers for podcast endpoint tests

import { http, HttpResponse } from 'msw';
import { VersionStatus } from '@repo/db/schema';
import type { PodcastListItem } from '../components/podcast-item';

// Base URL for API requests
const API_BASE = '/rpc';

// Mock data factory for PodcastListItem
export function createMockPodcastListItem(
  overrides: Partial<PodcastListItem> = {},
): PodcastListItem {
  return {
    id: 'podcast-1',
    title: 'Test Podcast',
    description: 'A test podcast description',
    format: 'conversation',
    createdAt: new Date().toISOString(),
    status: VersionStatus.READY,
    duration: 300,
    ...overrides,
  };
}

// Sample mock podcasts for tests
export const mockPodcasts: PodcastListItem[] = [
  createMockPodcastListItem({
    id: 'podcast-1',
    title: 'Tech Talk Episode 1',
    description: 'Discussion about latest tech trends',
    format: 'conversation',
    status: VersionStatus.READY,
    duration: 1800,
  }),
  createMockPodcastListItem({
    id: 'podcast-2',
    title: 'AI Weekly',
    description: 'Weekly AI news roundup',
    format: 'conversation',
    status: VersionStatus.GENERATING_SCRIPT,
    duration: null,
  }),
  createMockPodcastListItem({
    id: 'podcast-3',
    title: 'Product Update',
    description: 'Voice over for product announcement',
    format: 'voice_over',
    status: VersionStatus.DRAFTING,
    duration: null,
  }),
];

// Podcast handlers for MSW
export const podcastHandlers = [
  // List podcasts
  http.post(`${API_BASE}/podcasts.list`, () => {
    return HttpResponse.json(mockPodcasts);
  }),

  // Get single podcast
  http.post(`${API_BASE}/podcasts.get`, async ({ request }) => {
    const body = (await request.json()) as { id?: string };
    const podcast = mockPodcasts.find((p) => p.id === body.id);
    if (podcast) {
      return HttpResponse.json(podcast);
    }
    return HttpResponse.json({ error: 'Podcast not found' }, { status: 404 });
  }),

  // Create podcast
  http.post(`${API_BASE}/podcasts.create`, async ({ request }) => {
    const body = (await request.json()) as {
      title?: string;
      format?: 'voice_over' | 'conversation';
    };
    return HttpResponse.json(
      createMockPodcastListItem({
        id: `podcast-${Date.now()}`,
        title: body.title || 'Untitled Podcast',
        format: body.format || 'conversation',
        status: VersionStatus.DRAFTING,
        duration: null,
      }),
    );
  }),

  // Delete podcast
  http.post(`${API_BASE}/podcasts.delete`, async ({ request }) => {
    const body = (await request.json()) as { id?: string };
    const podcast = mockPodcasts.find((p) => p.id === body.id);
    if (podcast) {
      return HttpResponse.json({ success: true });
    }
    return HttpResponse.json({ error: 'Podcast not found' }, { status: 404 });
  }),
];
