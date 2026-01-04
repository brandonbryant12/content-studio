// features/voiceovers/__tests__/handlers.ts
// MSW handlers for voiceover endpoint tests

import { http, HttpResponse } from 'msw';
import type {
  VoiceoverOutput,
  VoiceoverListItemOutput,
  VoiceoverCollaboratorWithUserOutput,
  JobOutput,
} from '@repo/db/schema';

// Base URL for API requests
const API_BASE = '/rpc';

// =============================================================================
// Mock Data Factories
// =============================================================================

let idCounter = 1;

/**
 * Create a mock voiceover with sensible defaults.
 * Matches VoiceoverOutput schema from the API contract.
 */
export function createMockVoiceover(
  overrides: Partial<VoiceoverOutput> = {},
): VoiceoverOutput {
  const id = overrides.id ?? (`vo_${idCounter++}` as VoiceoverOutput['id']);
  return {
    id,
    title: 'Test Voiceover',
    text: 'This is the voiceover text content.',
    voice: 'Charon',
    voiceName: 'Charon',
    audioUrl: null,
    duration: null,
    status: 'drafting',
    errorMessage: null,
    ownerHasApproved: false,
    createdBy: 'user-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create a mock voiceover list item.
 * Currently same shape as VoiceoverOutput.
 */
export function createMockVoiceoverListItem(
  overrides: Partial<VoiceoverListItemOutput> = {},
): VoiceoverListItemOutput {
  return createMockVoiceover(overrides);
}

/**
 * Create a mock collaborator with user details.
 * Matches VoiceoverCollaboratorWithUserOutput schema.
 */
export function createMockCollaborator(
  overrides: Partial<VoiceoverCollaboratorWithUserOutput> = {},
): VoiceoverCollaboratorWithUserOutput {
  const id =
    overrides.id ??
    (`voc_${idCounter++}` as VoiceoverCollaboratorWithUserOutput['id']);
  return {
    id,
    voiceoverId:
      overrides.voiceoverId ??
      ('vo_1' as VoiceoverCollaboratorWithUserOutput['voiceoverId']),
    userId: 'user-2',
    email: 'collaborator@example.com',
    hasApproved: false,
    approvedAt: null,
    addedAt: new Date().toISOString(),
    addedBy: 'user-1',
    userName: 'Test Collaborator',
    userImage: null,
    ...overrides,
  };
}

/**
 * Create a mock job.
 * Matches JobOutput schema.
 */
export function createMockJob(overrides: Partial<JobOutput> = {}): JobOutput {
  const id = overrides.id ?? (`job_${idCounter++}` as JobOutput['id']);
  return {
    id,
    type: 'voiceover:generate',
    status: 'pending',
    result: null,
    error: null,
    createdBy: 'user-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
    ...overrides,
  };
}

// =============================================================================
// Sample Mock Data
// =============================================================================

export const mockVoiceovers: VoiceoverListItemOutput[] = [
  createMockVoiceoverListItem({
    id: 'vo_1' as VoiceoverOutput['id'],
    title: 'Product Announcement',
    text: 'Introducing our newest product...',
    status: 'ready',
    audioUrl: 'https://example.com/audio/vo_1.mp3',
    duration: 120,
    ownerHasApproved: true,
  }),
  createMockVoiceoverListItem({
    id: 'vo_2' as VoiceoverOutput['id'],
    title: 'Tutorial Narration',
    text: 'Welcome to this tutorial...',
    status: 'drafting',
    voice: 'Puck',
    voiceName: 'Puck',
  }),
  createMockVoiceoverListItem({
    id: 'vo_3' as VoiceoverOutput['id'],
    title: 'Marketing Video',
    text: 'Transform your workflow...',
    status: 'generating_audio',
  }),
];

export const mockCollaborators: VoiceoverCollaboratorWithUserOutput[] = [
  createMockCollaborator({
    id: 'voc_1' as VoiceoverCollaboratorWithUserOutput['id'],
    voiceoverId: 'vo_1' as VoiceoverCollaboratorWithUserOutput['voiceoverId'],
    userId: 'user-2',
    email: 'alice@example.com',
    userName: 'Alice Smith',
    hasApproved: true,
    approvedAt: new Date().toISOString(),
  }),
  createMockCollaborator({
    id: 'voc_2' as VoiceoverCollaboratorWithUserOutput['id'],
    voiceoverId: 'vo_1' as VoiceoverCollaboratorWithUserOutput['voiceoverId'],
    userId: null,
    email: 'pending@example.com',
    userName: null,
    userImage: null,
    hasApproved: false,
  }),
];

export const mockJobs: JobOutput[] = [
  createMockJob({
    id: 'job_1' as JobOutput['id'],
    status: 'completed',
    result: {
      audioUrl: 'https://example.com/audio/vo_1.mp3',
      duration: 120,
    },
    completedAt: new Date().toISOString(),
  }),
  createMockJob({
    id: 'job_2' as JobOutput['id'],
    status: 'processing',
    startedAt: new Date().toISOString(),
  }),
];

// =============================================================================
// Voiceover Handlers
// =============================================================================

export const voiceoverHandlers = [
  // List voiceovers
  http.get(`${API_BASE}/voiceovers`, () => {
    return HttpResponse.json(mockVoiceovers);
  }),

  // Get single voiceover
  http.get(`${API_BASE}/voiceovers/:id`, ({ params }) => {
    const { id } = params;
    const voiceover = mockVoiceovers.find((v) => v.id === id);
    if (voiceover) {
      return HttpResponse.json(voiceover);
    }
    return HttpResponse.json(
      {
        code: 'VOICEOVER_NOT_FOUND',
        data: { voiceoverId: id },
      },
      { status: 404 },
    );
  }),

  // Create voiceover
  http.post(`${API_BASE}/voiceovers`, async ({ request }) => {
    const body = (await request.json()) as { title?: string };
    return HttpResponse.json(
      createMockVoiceover({
        id: `vo_${Date.now()}` as VoiceoverOutput['id'],
        title: body.title || 'Untitled Voiceover',
        status: 'drafting',
      }),
    );
  }),

  // Update voiceover
  http.patch(`${API_BASE}/voiceovers/:id`, async ({ params, request }) => {
    const { id } = params;
    const body = (await request.json()) as Partial<VoiceoverOutput>;
    const voiceover = mockVoiceovers.find((v) => v.id === id);
    if (voiceover) {
      return HttpResponse.json({
        ...voiceover,
        ...body,
        id: voiceover.id, // Ensure ID cannot be changed
        updatedAt: new Date().toISOString(),
      });
    }
    return HttpResponse.json(
      {
        code: 'VOICEOVER_NOT_FOUND',
        data: { voiceoverId: id },
      },
      { status: 404 },
    );
  }),

  // Delete voiceover
  http.delete(`${API_BASE}/voiceovers/:id`, ({ params }) => {
    const { id } = params;
    const voiceover = mockVoiceovers.find((v) => v.id === id);
    if (voiceover) {
      return HttpResponse.json({});
    }
    return HttpResponse.json(
      {
        code: 'VOICEOVER_NOT_FOUND',
        data: { voiceoverId: id },
      },
      { status: 404 },
    );
  }),

  // Generate audio
  http.post(`${API_BASE}/voiceovers/:id/generate`, ({ params }) => {
    const { id } = params;
    const voiceover = mockVoiceovers.find((v) => v.id === id);
    if (!voiceover) {
      return HttpResponse.json(
        {
          code: 'VOICEOVER_NOT_FOUND',
          data: { voiceoverId: id },
        },
        { status: 404 },
      );
    }
    // Check if voiceover has text
    if (!voiceover.text || voiceover.text.trim() === '') {
      return HttpResponse.json(
        {
          code: 'INVALID_VOICEOVER_AUDIO_GENERATION',
          data: {
            voiceoverId: id,
            reason: 'Voiceover text is empty',
          },
        },
        { status: 400 },
      );
    }
    return HttpResponse.json({
      jobId: `job_${Date.now()}`,
      status: 'pending' as const,
    });
  }),

  // Get job status
  http.get(`${API_BASE}/voiceovers/jobs/:jobId`, ({ params }) => {
    const { jobId } = params;
    const job = mockJobs.find((j) => j.id === jobId);
    if (job) {
      return HttpResponse.json(job);
    }
    return HttpResponse.json(
      {
        code: 'JOB_NOT_FOUND',
        data: { jobId },
      },
      { status: 404 },
    );
  }),

  // List collaborators
  http.get(`${API_BASE}/voiceovers/:id/collaborators`, ({ params }) => {
    const { id } = params;
    const voiceover = mockVoiceovers.find((v) => v.id === id);
    if (!voiceover) {
      return HttpResponse.json(
        {
          code: 'VOICEOVER_NOT_FOUND',
          data: { voiceoverId: id },
        },
        { status: 404 },
      );
    }
    const collaborators = mockCollaborators.filter((c) => c.voiceoverId === id);
    return HttpResponse.json(collaborators);
  }),

  // Add collaborator
  http.post(
    `${API_BASE}/voiceovers/:id/collaborators`,
    async ({ params, request }) => {
      const { id } = params;
      const body = (await request.json()) as { email?: string };
      const voiceover = mockVoiceovers.find((v) => v.id === id);

      if (!voiceover) {
        return HttpResponse.json(
          {
            code: 'VOICEOVER_NOT_FOUND',
            data: { voiceoverId: id },
          },
          { status: 404 },
        );
      }

      const email = body.email || 'new@example.com';

      // Check if collaborator already exists
      const existingCollaborator = mockCollaborators.find(
        (c) => c.voiceoverId === id && c.email === email,
      );
      if (existingCollaborator) {
        return HttpResponse.json(
          {
            code: 'VOICEOVER_COLLABORATOR_ALREADY_EXISTS',
            data: { voiceoverId: id, email },
          },
          { status: 409 },
        );
      }

      return HttpResponse.json(
        createMockCollaborator({
          id: `voc_${Date.now()}` as VoiceoverCollaboratorWithUserOutput['id'],
          voiceoverId: id as VoiceoverCollaboratorWithUserOutput['voiceoverId'],
          email,
          userId: null, // Pending invite
          userName: null,
          userImage: null,
        }),
      );
    },
  ),

  // Remove collaborator
  http.delete(
    `${API_BASE}/voiceovers/:id/collaborators/:collaboratorId`,
    ({ params }) => {
      const { id, collaboratorId } = params;
      const voiceover = mockVoiceovers.find((v) => v.id === id);

      if (!voiceover) {
        return HttpResponse.json(
          {
            code: 'VOICEOVER_NOT_FOUND',
            data: { voiceoverId: id },
          },
          { status: 404 },
        );
      }

      const collaborator = mockCollaborators.find(
        (c) => c.id === collaboratorId && c.voiceoverId === id,
      );
      if (!collaborator) {
        return HttpResponse.json(
          {
            code: 'VOICEOVER_COLLABORATOR_NOT_FOUND',
            data: { id: collaboratorId },
          },
          { status: 404 },
        );
      }

      return HttpResponse.json({});
    },
  ),

  // Approve voiceover
  http.post(`${API_BASE}/voiceovers/:id/approve`, ({ params }) => {
    const { id } = params;
    const voiceover = mockVoiceovers.find((v) => v.id === id);

    if (!voiceover) {
      return HttpResponse.json(
        {
          code: 'VOICEOVER_NOT_FOUND',
          data: { voiceoverId: id },
        },
        { status: 404 },
      );
    }

    // Simulate owner approval
    return HttpResponse.json({
      isOwner: true,
    });
  }),

  // Revoke approval
  http.delete(`${API_BASE}/voiceovers/:id/approve`, ({ params }) => {
    const { id } = params;
    const voiceover = mockVoiceovers.find((v) => v.id === id);

    if (!voiceover) {
      return HttpResponse.json(
        {
          code: 'VOICEOVER_NOT_FOUND',
          data: { voiceoverId: id },
        },
        { status: 404 },
      );
    }

    return HttpResponse.json({
      isOwner: true,
    });
  }),

  // Claim invites
  http.post(`${API_BASE}/voiceovers/claim-invites`, () => {
    return HttpResponse.json({
      claimedCount: 0,
    });
  }),
];

// =============================================================================
// Error Handlers - for testing error states
// =============================================================================

/**
 * Create a handler that returns a 404 for voiceover.get
 */
export function createVoiceoverNotFoundHandler(voiceoverId: string) {
  return http.get(`${API_BASE}/voiceovers/:id`, ({ params }) => {
    if (params.id === voiceoverId) {
      return HttpResponse.json(
        {
          code: 'VOICEOVER_NOT_FOUND',
          data: { voiceoverId },
        },
        { status: 404 },
      );
    }
    // Fall through to default handler
    const voiceover = mockVoiceovers.find((v) => v.id === params.id);
    if (voiceover) {
      return HttpResponse.json(voiceover);
    }
    return HttpResponse.json(
      {
        code: 'VOICEOVER_NOT_FOUND',
        data: { voiceoverId: params.id },
      },
      { status: 404 },
    );
  });
}

/**
 * Create a handler that returns a 403 for non-owner operations
 */
export function createNotOwnerHandler(voiceoverId: string) {
  return http.post(`${API_BASE}/voiceovers/:id/collaborators`, ({ params }) => {
    if (params.id === voiceoverId) {
      return HttpResponse.json(
        {
          code: 'NOT_VOICEOVER_OWNER',
          data: { voiceoverId },
        },
        { status: 403 },
      );
    }
    // Fall through
    return HttpResponse.json(
      createMockCollaborator({
        voiceoverId:
          params.id as VoiceoverCollaboratorWithUserOutput['voiceoverId'],
      }),
    );
  });
}

/**
 * Create a handler that returns a 403 for non-collaborator operations
 */
export function createNotCollaboratorHandler(voiceoverId: string) {
  return http.post(`${API_BASE}/voiceovers/:id/approve`, ({ params }) => {
    if (params.id === voiceoverId) {
      return HttpResponse.json(
        {
          code: 'NOT_VOICEOVER_COLLABORATOR',
          data: { voiceoverId },
        },
        { status: 403 },
      );
    }
    return HttpResponse.json({ isOwner: false });
  });
}

/**
 * Create a handler that returns a job not found error
 */
export function createJobNotFoundHandler(jobId: string) {
  return http.get(`${API_BASE}/voiceovers/jobs/:jobId`, ({ params }) => {
    if (params.jobId === jobId) {
      return HttpResponse.json(
        {
          code: 'JOB_NOT_FOUND',
          data: { jobId },
        },
        { status: 404 },
      );
    }
    const job = mockJobs.find((j) => j.id === params.jobId);
    if (job) {
      return HttpResponse.json(job);
    }
    return HttpResponse.json(
      {
        code: 'JOB_NOT_FOUND',
        data: { jobId: params.jobId },
      },
      { status: 404 },
    );
  });
}

/**
 * Create a handler that returns generation validation error
 */
export function createInvalidGenerationHandler(
  voiceoverId: string,
  reason: string,
) {
  return http.post(`${API_BASE}/voiceovers/:id/generate`, ({ params }) => {
    if (params.id === voiceoverId) {
      return HttpResponse.json(
        {
          code: 'INVALID_VOICEOVER_AUDIO_GENERATION',
          data: { voiceoverId, reason },
        },
        { status: 400 },
      );
    }
    return HttpResponse.json({
      jobId: `job_${Date.now()}`,
      status: 'pending' as const,
    });
  });
}

/**
 * Create a handler that simulates a network error
 */
export function createNetworkErrorHandler() {
  return http.get(`${API_BASE}/voiceovers`, () => {
    return HttpResponse.error();
  });
}

/**
 * Create a handler that returns a completed job with audio result
 */
export function createCompletedJobHandler(
  jobId: string,
  audioUrl: string,
  duration: number,
) {
  return http.get(`${API_BASE}/voiceovers/jobs/:jobId`, ({ params }) => {
    if (params.jobId === jobId) {
      return HttpResponse.json(
        createMockJob({
          id: jobId as JobOutput['id'],
          status: 'completed',
          result: {
            audioUrl,
            duration,
          },
          completedAt: new Date().toISOString(),
        }),
      );
    }
    return HttpResponse.json(
      {
        code: 'JOB_NOT_FOUND',
        data: { jobId: params.jobId },
      },
      { status: 404 },
    );
  });
}

/**
 * Create a handler that returns a failed job
 */
export function createFailedJobHandler(jobId: string, error: string) {
  return http.get(`${API_BASE}/voiceovers/jobs/:jobId`, ({ params }) => {
    if (params.jobId === jobId) {
      return HttpResponse.json(
        createMockJob({
          id: jobId as JobOutput['id'],
          status: 'failed',
          error,
          completedAt: new Date().toISOString(),
        }),
      );
    }
    return HttpResponse.json(
      {
        code: 'JOB_NOT_FOUND',
        data: { jobId: params.jobId },
      },
      { status: 404 },
    );
  });
}

// =============================================================================
// Exports
// =============================================================================

// Re-export all handlers as a single array for easy use
export const handlers = voiceoverHandlers;
