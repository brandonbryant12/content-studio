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

interface Infographic {
  id: string;
  title: string;
  status: string;
  infographicType: string;
  aspectRatio: string;
  customInstructions: string | null;
  feedbackInstructions: string | null;
  styleOptions: object | null;
  imageUrl: string | null;
  errorMessage: string | null;
  sourceDocumentIds: string[];
  createdAt: string;
  updatedAt: string;
  selections: InfographicSelection[];
}

interface InfographicListItem {
  id: string;
  title: string;
  status: string;
  infographicType: string;
  aspectRatio: string;
  imageUrl: string | null;
  createdAt: string;
}

interface InfographicSelection {
  id: string;
  infographicId: string;
  documentId: string;
  documentTitle: string;
  selectedText: string;
  startOffset: number | null;
  endOffset: number | null;
  orderIndex: number;
  createdAt: string;
}

interface AddSelectionResult {
  selection: InfographicSelection;
  warningMessage: string | null;
}

interface KeyPointSuggestion {
  text: string;
  documentId: string;
  documentTitle: string;
  relevance: 'high' | 'medium';
  category?: string;
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

  // Infographics

  /**
   * List all infographics
   */
  async listInfographics(): Promise<InfographicListItem[]> {
    const result = await this.get<{ items: InfographicListItem[] }>(
      '/infographics',
    );
    return result.items;
  }

  /**
   * Get an infographic by ID
   */
  async getInfographic(id: string): Promise<Infographic> {
    return this.get<Infographic>(`/infographics/${id}`);
  }

  /**
   * Create an infographic
   */
  async createInfographic(data: {
    title: string;
    infographicType: string;
    documentIds: string[];
    aspectRatio?: string;
  }): Promise<Infographic> {
    return this.post<Infographic>('/infographics', {
      title: data.title,
      infographicType: data.infographicType,
      documentIds: data.documentIds,
      aspectRatio: data.aspectRatio ?? '16:9',
    });
  }

  /**
   * Update an infographic
   */
  async updateInfographic(
    id: string,
    data: {
      title?: string;
      infographicType?: string;
      aspectRatio?: string;
      customInstructions?: string;
      styleOptions?: object;
      documentIds?: string[];
    },
  ): Promise<Infographic> {
    const response = await this.request.patch(
      `${this.apiURL}/infographics/${id}`,
      {
        data,
        headers: { 'Content-Type': 'application/json' },
      },
    );

    if (!response.ok()) {
      const text = await response.text();
      throw new Error(
        `PATCH /infographics/${id} failed: ${response.status()} ${text}`,
      );
    }

    return response.json() as Promise<Infographic>;
  }

  /**
   * Delete an infographic by ID
   */
  async deleteInfographic(id: string): Promise<void> {
    await this.delete(`/infographics/${id}`);
  }

  /**
   * Delete all infographics (useful for test cleanup)
   * Ignores errors for individual deletions (race conditions)
   */
  async deleteAllInfographics(): Promise<void> {
    const infographics = await this.listInfographics();
    for (const infographic of infographics) {
      try {
        await this.deleteInfographic(infographic.id);
      } catch {
        // Ignore errors - infographic may have been deleted by another test
      }
    }
  }

  // Infographic Selections

  /**
   * Add a selection to an infographic
   */
  async addSelection(
    infographicId: string,
    data: {
      documentId: string;
      selectedText: string;
      startOffset?: number;
      endOffset?: number;
    },
  ): Promise<AddSelectionResult> {
    return this.post<AddSelectionResult>(
      `/infographics/${infographicId}/selections`,
      data,
    );
  }

  /**
   * Remove a selection from an infographic
   */
  async removeSelection(
    infographicId: string,
    selectionId: string,
  ): Promise<void> {
    await this.delete(
      `/infographics/${infographicId}/selections/${selectionId}`,
    );
  }

  /**
   * Reorder selections
   */
  async reorderSelections(
    infographicId: string,
    orderedSelectionIds: string[],
  ): Promise<{ selections: InfographicSelection[] }> {
    return this.post<{ selections: InfographicSelection[] }>(
      `/infographics/${infographicId}/selections/reorder`,
      { orderedSelectionIds },
    );
  }

  // Infographic AI & Generation

  /**
   * Extract key points using AI
   */
  async extractKeyPoints(
    infographicId: string,
  ): Promise<{ suggestions: KeyPointSuggestion[] }> {
    return this.post<{ suggestions: KeyPointSuggestion[] }>(
      `/infographics/${infographicId}/extract-key-points`,
    );
  }

  /**
   * Trigger infographic generation
   */
  async generateInfographic(
    id: string,
    data?: { feedbackInstructions?: string },
  ): Promise<{ jobId: string; status: string }> {
    return this.post<{ jobId: string; status: string }>(
      `/infographics/${id}/generate`,
      data ?? {},
    );
  }

  /**
   * Get job status
   */
  async getInfographicJob(
    jobId: string,
  ): Promise<{ id: string; status: string; result?: object; error?: string }> {
    return this.get<{
      id: string;
      status: string;
      result?: object;
      error?: string;
    }>(`/infographics/jobs/${jobId}`);
  }

  /**
   * Poll job until completion
   */
  async waitForInfographicJob(
    jobId: string,
    timeout = 60000,
  ): Promise<{ id: string; status: string; result?: object; error?: string }> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const job = await this.getInfographicJob(jobId);
      if (job.status === 'completed' || job.status === 'failed') {
        return job;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    throw new Error(`Job ${jobId} timed out after ${timeout}ms`);
  }

  // Cleanup

  /**
   * Clean up all test data
   * Call this in afterEach or afterAll to reset state
   */
  async cleanupAll(): Promise<void> {
    await this.deleteAllInfographics();
    await this.deleteAllPodcasts();
    await this.deleteAllVoiceovers();
    await this.deleteAllDocuments();
  }
}
