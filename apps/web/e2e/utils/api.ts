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
  documents?: Document[];
  segments?: { speaker: string; line: string; index: number }[];
}

interface Voiceover {
  id: string;
  title: string;
  text: string;
  voice: string;
  voiceName: string | null;
  status: string;
  duration: number | null;
  createdAt: string;
  updatedAt: string;
}

interface VoiceoverCollaborator {
  id: string;
  voiceoverId: string;
  userId: string | null;
  email: string;
  userName: string | null;
  userImage: string | null;
  hasApproved: boolean;
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
   * Ignores errors for individual document deletions (race conditions)
   */
  async deleteAllDocuments(): Promise<void> {
    const documents = await this.listDocuments();
    for (const doc of documents) {
      try {
        await this.deleteDocument(doc.id);
      } catch {
        // Ignore errors - document may have been deleted by another test
      }
    }
  }

  /**
   * Upload a document with text content
   * Creates a simple text document for testing purposes
   */
  async uploadDocument(title: string, content: string): Promise<Document> {
    // Convert content to base64
    const base64 = Buffer.from(content).toString('base64');

    return this.post<Document>('/documents/upload', {
      fileName: `${title.toLowerCase().replace(/\s+/g, '-')}.txt`,
      mimeType: 'text/plain',
      data: base64,
      title,
    });
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
   * Update a podcast
   */
  async updatePodcast(
    id: string,
    data: {
      title?: string;
      documentIds?: string[];
      targetDurationMinutes?: number;
      hostVoice?: string;
      coHostVoice?: string;
      promptInstructions?: string;
    },
  ): Promise<Podcast> {
    return this.post<Podcast>(`/podcasts/${id}`, data);
  }

  /**
   * Trigger podcast generation
   */
  async generatePodcast(
    id: string,
  ): Promise<{ jobId: string; status: string }> {
    return this.post<{ jobId: string; status: string }>(
      `/podcasts/${id}/generate`,
    );
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

  // Voiceovers

  /**
   * List all voiceovers
   */
  async listVoiceovers(): Promise<Voiceover[]> {
    return this.get<Voiceover[]>('/voiceovers');
  }

  /**
   * Get a voiceover by ID
   */
  async getVoiceover(id: string): Promise<Voiceover> {
    return this.get<Voiceover>(`/voiceovers/${id}`);
  }

  /**
   * Create a voiceover
   */
  async createVoiceover(data: {
    title?: string;
    text?: string;
    voice?: string;
  }): Promise<Voiceover> {
    return this.post<Voiceover>('/voiceovers', {
      title: data.title ?? 'Test Voiceover',
      text: data.text ?? '',
      voice: data.voice ?? 'alloy',
    });
  }

  /**
   * Update a voiceover
   */
  async updateVoiceover(
    id: string,
    data: {
      title?: string;
      text?: string;
      voice?: string;
    },
  ): Promise<Voiceover> {
    // Use PATCH method for updates
    const response = await this.request.patch(
      `${this.apiURL}/voiceovers/${id}`,
      {
        data,
        headers: { 'Content-Type': 'application/json' },
      },
    );

    if (!response.ok()) {
      const text = await response.text();
      throw new Error(
        `PATCH /voiceovers/${id} failed: ${response.status()} ${text}`,
      );
    }

    return response.json() as Promise<Voiceover>;
  }

  /**
   * Generate audio for a voiceover
   */
  async generateVoiceover(
    id: string,
  ): Promise<{ jobId: string; status: string }> {
    return this.post<{ jobId: string; status: string }>(
      `/voiceovers/${id}/generate`,
    );
  }

  /**
   * Delete a voiceover by ID
   */
  async deleteVoiceover(id: string): Promise<void> {
    await this.delete(`/voiceovers/${id}`);
  }

  /**
   * Delete all voiceovers (useful for test cleanup)
   * Ignores errors for individual voiceover deletions (race conditions)
   */
  async deleteAllVoiceovers(): Promise<void> {
    const voiceovers = await this.listVoiceovers();
    for (const voiceover of voiceovers) {
      try {
        await this.deleteVoiceover(voiceover.id);
      } catch {
        // Ignore errors - voiceover may have been deleted by another test
      }
    }
  }

  // Voiceover Collaborators

  /**
   * List collaborators for a voiceover
   */
  async listVoiceoverCollaborators(
    voiceoverId: string,
  ): Promise<VoiceoverCollaborator[]> {
    return this.get<VoiceoverCollaborator[]>(
      `/voiceovers/${voiceoverId}/collaborators`,
    );
  }

  /**
   * Add a collaborator to a voiceover
   */
  async addVoiceoverCollaborator(
    voiceoverId: string,
    email: string,
  ): Promise<VoiceoverCollaborator> {
    return this.post<VoiceoverCollaborator>(
      `/voiceovers/${voiceoverId}/collaborators`,
      { email },
    );
  }

  /**
   * Remove a collaborator from a voiceover
   */
  async removeVoiceoverCollaborator(
    voiceoverId: string,
    collaboratorId: string,
  ): Promise<void> {
    await this.delete(
      `/voiceovers/${voiceoverId}/collaborators/${collaboratorId}`,
    );
  }

  /**
   * Approve a voiceover
   */
  async approveVoiceover(voiceoverId: string): Promise<{ isOwner: boolean }> {
    return this.post<{ isOwner: boolean }>(
      `/voiceovers/${voiceoverId}/approve`,
    );
  }

  /**
   * Revoke approval on a voiceover
   */
  async revokeVoiceoverApproval(
    voiceoverId: string,
  ): Promise<{ isOwner: boolean }> {
    await this.delete(`/voiceovers/${voiceoverId}/approve`);
    return { isOwner: true }; // Assume owner for now
  }

  // Cleanup

  /**
   * Clean up all test data
   * Call this in afterEach or afterAll to reset state
   */
  async cleanupAll(): Promise<void> {
    await this.deleteAllPodcasts();
    await this.deleteAllVoiceovers();
    await this.deleteAllDocuments();
  }
}
