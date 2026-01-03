/**
 * API Helper for E2E Tests
 *
 * Direct API calls for test data setup/teardown.
 * Use this to create or delete data without going through the UI.
 */

import { type APIRequestContext } from '@playwright/test';

interface Document {
  id: string;
  title: string;
  mimeType: string;
  wordCount: number;
}

interface Podcast {
  id: string;
  title: string;
  status: string;
  format: string;
}

export class ApiHelper {
  private request: APIRequestContext;
  private baseURL: string;

  constructor(request: APIRequestContext, baseURL: string) {
    this.request = request;
    this.baseURL = baseURL;
  }

  private get apiURL(): string {
    return `${this.baseURL}/api`;
  }

  /**
   * Make a GET request to the API
   */
  private async get<T>(path: string): Promise<T> {
    const response = await this.request.get(`${this.apiURL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok()) {
      const text = await response.text();
      throw new Error(`GET ${path} failed: ${response.status()} ${text}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Make a POST request to the API
   */
  private async post<T>(path: string, data?: object): Promise<T> {
    const response = await this.request.post(`${this.apiURL}${path}`, {
      data: data ?? {},
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok()) {
      const text = await response.text();
      throw new Error(`POST ${path} failed: ${response.status()} ${text}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Make a DELETE request to the API
   * Returns true if deleted, false if not found (already deleted)
   */
  private async delete(path: string): Promise<boolean> {
    const response = await this.request.delete(`${this.apiURL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
    });

    // 404 means already deleted, which is fine
    if (response.status() === 404) {
      return false;
    }

    if (!response.ok()) {
      const text = await response.text();
      throw new Error(`DELETE ${path} failed: ${response.status()} ${text}`);
    }

    return true;
  }

  // Documents

  /**
   * List all documents
   */
  async listDocuments(): Promise<Document[]> {
    return this.get<Document[]>('/documents');
  }

  /**
   * Get a document by ID
   */
  async getDocument(id: string): Promise<Document> {
    return this.get<Document>(`/documents/${id}`);
  }

  /**
   * Delete a document by ID
   */
  async deleteDocument(id: string): Promise<void> {
    await this.delete(`/documents/${id}`);
  }

  /**
   * Delete all documents (useful for test cleanup)
   */
  async deleteAllDocuments(): Promise<void> {
    const documents = await this.listDocuments();
    for (const doc of documents) {
      await this.deleteDocument(doc.id);
    }
  }

  // Podcasts

  /**
   * List all podcasts
   */
  async listPodcasts(): Promise<Podcast[]> {
    return this.get<Podcast[]>('/podcasts');
  }

  /**
   * Get a podcast by ID
   */
  async getPodcast(id: string): Promise<Podcast> {
    return this.get<Podcast>(`/podcasts/${id}`);
  }

  /**
   * Create a podcast
   */
  async createPodcast(data: {
    title: string;
    format?: 'conversation' | 'monologue';
  }): Promise<Podcast> {
    return this.post<Podcast>('/podcasts', {
      title: data.title,
      format: data.format ?? 'conversation',
    });
  }

  /**
   * Delete a podcast by ID
   */
  async deletePodcast(id: string): Promise<void> {
    await this.delete(`/podcasts/${id}`);
  }

  /**
   * Delete all podcasts (useful for test cleanup)
   * Ignores errors for individual podcast deletions (race conditions)
   */
  async deleteAllPodcasts(): Promise<void> {
    const podcasts = await this.listPodcasts();
    for (const podcast of podcasts) {
      try {
        await this.deletePodcast(podcast.id);
      } catch {
        // Ignore errors - podcast may have been deleted by another test
      }
    }
  }

  // Cleanup

  /**
   * Clean up all test data
   * Call this in afterEach or afterAll to reset state
   */
  async cleanupAll(): Promise<void> {
    await this.deleteAllPodcasts();
    await this.deleteAllDocuments();
  }
}
