import { type APIRequestContext, type Page } from '@playwright/test';

/**
 * API client for E2E tests.
 * Used to set up test data before UI interactions.
 *
 * IMPORTANT: Use `page.request` (not the `request` fixture) to share
 * authentication cookies with the browser context.
 */

const API_BASE_URL = process.env.E2E_API_URL ?? 'http://localhost:3035';

/**
 * Get the request context from a page.
 * This ensures cookies are shared between browser and API requests.
 */
export const getRequest = (page: Page): APIRequestContext => page.request;

/**
 * Options for creating a test podcast via API.
 */
export interface CreatePodcastOptions {
  title?: string;
  description?: string;
  format?: 'conversation' | 'voice_over';
  documentIds?: string[];
}

/**
 * Create a podcast via API for testing.
 *
 * @param request - Playwright API request context
 * @param options - Podcast creation options
 * @returns Created podcast data
 *
 * @example
 * ```ts
 * test('podcast generation', async ({ page, request }) => {
 *   const podcast = await createPodcast(request, {
 *     title: 'Test Podcast',
 *     format: 'conversation',
 *   });
 *
 *   await page.goto(`/podcasts/${podcast.id}`);
 * });
 * ```
 */
export const createPodcast = async (
  request: APIRequestContext,
  options: CreatePodcastOptions = {},
): Promise<{ id: string; title: string; status: string }> => {
  const response = await request.post(`${API_BASE_URL}/api/podcasts`, {
    data: {
      title: options.title ?? 'E2E Test Podcast',
      description: options.description ?? 'Created by E2E tests',
      format: options.format ?? 'conversation',
      documentIds: options.documentIds ?? [],
    },
  });

  if (!response.ok()) {
    const text = await response.text();
    throw new Error(`Failed to create podcast: ${response.status()} ${text}`);
  }

  return response.json();
};

/**
 * Options for creating a test document via API.
 */
export interface CreateDocumentOptions {
  title?: string;
  content?: string;
}

/**
 * Create a document via API for testing.
 */
export const createDocument = async (
  request: APIRequestContext,
  options: CreateDocumentOptions = {},
): Promise<{ id: string; title: string }> => {
  const response = await request.post(`${API_BASE_URL}/api/documents`, {
    data: {
      title: options.title ?? 'E2E Test Document',
      content:
        options.content ??
        'This is test content for E2E testing. It contains enough text to generate a podcast script.',
    },
  });

  if (!response.ok()) {
    const text = await response.text();
    throw new Error(`Failed to create document: ${response.status()} ${text}`);
  }

  return response.json();
};

/**
 * Get a podcast by ID via API.
 */
export const getPodcast = async (
  request: APIRequestContext,
  podcastId: string,
): Promise<{
  id: string;
  title: string;
  status: string;
  audioUrl?: string;
}> => {
  const response = await request.get(
    `${API_BASE_URL}/api/podcasts/${podcastId}`,
  );

  if (!response.ok()) {
    const text = await response.text();
    throw new Error(`Failed to get podcast: ${response.status()} ${text}`);
  }

  return response.json();
};

/**
 * Delete a podcast via API (cleanup).
 */
export const deletePodcast = async (
  request: APIRequestContext,
  podcastId: string,
): Promise<void> => {
  const response = await request.delete(
    `${API_BASE_URL}/api/podcasts/${podcastId}`,
  );

  if (!response.ok()) {
    // Ignore 404s during cleanup
    if (response.status() !== 404) {
      const text = await response.text();
      throw new Error(`Failed to delete podcast: ${response.status()} ${text}`);
    }
  }
};

/**
 * Delete a document via API (cleanup).
 */
export const deleteDocument = async (
  request: APIRequestContext,
  documentId: string,
): Promise<void> => {
  const response = await request.delete(
    `${API_BASE_URL}/api/documents/${documentId}`,
  );

  if (!response.ok()) {
    // Ignore 404s during cleanup
    if (response.status() !== 404) {
      const text = await response.text();
      throw new Error(
        `Failed to delete document: ${response.status()} ${text}`,
      );
    }
  }
};

/**
 * Poll for podcast status to reach a target state.
 */
export const waitForPodcastStatus = async (
  request: APIRequestContext,
  podcastId: string,
  targetStatus: string,
  options: { timeout?: number; interval?: number } = {},
): Promise<{ id: string; title: string; status: string }> => {
  const timeout = options.timeout ?? 30000;
  const interval = options.interval ?? 1000;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const podcast = await getPodcast(request, podcastId);

    if (podcast.status === targetStatus) {
      return podcast;
    }

    if (podcast.status === 'failed') {
      throw new Error(`Podcast generation failed: ${podcastId}`);
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(
    `Timed out waiting for podcast ${podcastId} to reach status ${targetStatus}`,
  );
};
