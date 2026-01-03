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

  private get rpcURL(): string {
    return `${this.baseURL}/rpc`;
  }

  /**
   * Make an RPC call to the API
   */
  private async rpc<T>(method: string, params?: object): Promise<T> {
    const response = await this.request.post(`${this.rpcURL}/${method}`, {
      data: params ?? {},
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok()) {
      const text = await response.text();
      throw new Error(`API call ${method} failed: ${response.status()} ${text}`);
    }

    return response.json() as Promise<T>;
  }

  // Documents

  /**
   * List all documents
   */
  async listDocuments(): Promise<Document[]> {
    return this.rpc<Document[]>('documents.list');
  }

  /**
   * Get a document by ID
   */
  async getDocument(id: string): Promise<Document> {
    return this.rpc<Document>('documents.get', { id });
  }

  /**
   * Delete a document by ID
   */
  async deleteDocument(id: string): Promise<void> {
    await this.rpc<{ success: boolean }>('documents.delete', { id });
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
    return this.rpc<Podcast[]>('podcasts.list');
  }

  /**
   * Get a podcast by ID
   */
  async getPodcast(id: string): Promise<Podcast> {
    return this.rpc<Podcast>('podcasts.get', { id });
  }

  /**
   * Create a podcast
   */
  async createPodcast(data: {
    title: string;
    format?: 'conversation' | 'monologue';
  }): Promise<Podcast> {
    return this.rpc<Podcast>('podcasts.create', {
      title: data.title,
      format: data.format ?? 'conversation',
    });
  }

  /**
   * Delete a podcast by ID
   */
  async deletePodcast(id: string): Promise<void> {
    await this.rpc<{ success: boolean }>('podcasts.delete', { id });
  }

  /**
   * Delete all podcasts (useful for test cleanup)
   */
  async deleteAllPodcasts(): Promise<void> {
    const podcasts = await this.listPodcasts();
    for (const podcast of podcasts) {
      await this.deletePodcast(podcast.id);
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
