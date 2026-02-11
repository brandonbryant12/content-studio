import { oc } from '@orpc/contract';
import { Schema } from 'effect';
import {
  // Input schemas
  CreatePodcastSchema,
  UpdatePodcastFields,
  // Output schemas (single source of truth from db)
  PodcastOutputSchema,
  PodcastFullOutputSchema,
  PodcastListItemOutputSchema,
  ScriptSegmentSchema,
  CollaboratorWithUserOutputSchema,
  // Job schemas
  JobOutputSchema,
  JobStatusSchema,
  // Branded ID schemas
  PodcastIdSchema,
  JobIdSchema,
  CollaboratorIdSchema,
} from '@repo/db/schema';

// Helper to convert Effect Schema to Standard Schema for oRPC
const std = Schema.standardSchemaV1;

// Helper for query params that may come in as strings
const CoerceNumber = Schema.Union(
  Schema.Number,
  Schema.String.pipe(
    Schema.transform(Schema.Number, { decode: Number, encode: String }),
  ),
).pipe(Schema.compose(Schema.Number));

// =============================================================================
// Error Definitions
// =============================================================================

const podcastErrors = {
  PODCAST_NOT_FOUND: {
    status: 404,
    data: std(
      Schema.Struct({
        podcastId: Schema.String,
      }),
    ),
  },
  SCRIPT_NOT_FOUND: {
    status: 404,
    data: std(
      Schema.Struct({
        podcastId: Schema.String,
      }),
    ),
  },
  DOCUMENT_NOT_FOUND: {
    status: 404,
    data: std(
      Schema.Struct({
        documentId: Schema.String,
      }),
    ),
  },
  MEDIA_NOT_FOUND: {
    status: 404,
    data: std(
      Schema.Struct({
        mediaType: Schema.String,
        mediaId: Schema.String,
      }),
    ),
  },
} as const;

const jobErrors = {
  JOB_NOT_FOUND: {
    status: 404,
    data: std(
      Schema.Struct({
        jobId: Schema.String,
      }),
    ),
  },
} as const;

const authErrors = {
  FORBIDDEN: {
    status: 403,
  },
} as const;

const collaboratorErrors = {
  NOT_PODCAST_OWNER: {
    status: 403,
    data: std(
      Schema.Struct({
        podcastId: Schema.String,
        userId: Schema.String,
      }),
    ),
  },
  NOT_PODCAST_COLLABORATOR: {
    status: 403,
    data: std(
      Schema.Struct({
        podcastId: Schema.String,
        userId: Schema.String,
      }),
    ),
  },
  COLLABORATOR_ALREADY_EXISTS: {
    status: 409,
    data: std(
      Schema.Struct({
        podcastId: Schema.String,
        email: Schema.String,
      }),
    ),
  },
  COLLABORATOR_NOT_FOUND: {
    status: 404,
    data: std(
      Schema.Struct({
        id: Schema.String,
      }),
    ),
  },
  CANNOT_ADD_OWNER_AS_COLLABORATOR: {
    status: 400,
    data: std(
      Schema.Struct({
        podcastId: Schema.String,
        email: Schema.String,
      }),
    ),
  },
} as const;

// =============================================================================
// Contract Definition
// =============================================================================

const podcastContract = oc
  .prefix('/podcasts')
  .tag('podcast')
  .router({
    // List all podcasts for current user
    list: oc
      .route({
        method: 'GET',
        path: '/',
        summary: 'List podcasts',
        description: 'Retrieve all podcasts for the current user',
      })
      .input(
        std(
          Schema.Struct({
            limit: Schema.optional(
              CoerceNumber.pipe(
                Schema.greaterThanOrEqualTo(1),
                Schema.lessThanOrEqualTo(100),
              ),
            ),
            offset: Schema.optional(
              CoerceNumber.pipe(Schema.greaterThanOrEqualTo(0)),
            ),
          }),
        ),
      )
      .output(std(Schema.Array(PodcastListItemOutputSchema))),

    // Get a single podcast by ID
    get: oc
      .route({
        method: 'GET',
        path: '/{id}',
        summary: 'Get podcast',
        description: 'Retrieve a podcast with its documents',
      })
      .errors(podcastErrors)
      .input(std(Schema.Struct({ id: PodcastIdSchema })))
      .output(std(PodcastFullOutputSchema)),

    // Create a new podcast
    create: oc
      .route({
        method: 'POST',
        path: '/',
        summary: 'Create podcast',
        description: 'Create a new podcast from documents',
      })
      .errors(podcastErrors)
      .input(std(CreatePodcastSchema))
      .output(std(PodcastFullOutputSchema)),

    // Update a podcast
    update: oc
      .route({
        method: 'PATCH',
        path: '/{id}',
        summary: 'Update podcast',
        description: 'Update podcast settings',
      })
      .errors(podcastErrors)
      .input(
        std(
          Schema.Struct({
            id: PodcastIdSchema,
            ...UpdatePodcastFields,
          }),
        ),
      )
      .output(std(PodcastOutputSchema)),

    // Delete a podcast
    delete: oc
      .route({
        method: 'DELETE',
        path: '/{id}',
        summary: 'Delete podcast',
        description: 'Permanently delete a podcast and all associated data',
      })
      .errors(podcastErrors)
      .input(std(Schema.Struct({ id: PodcastIdSchema })))
      .output(std(Schema.Struct({}))),

    // Get podcast script
    getScript: oc
      .route({
        method: 'GET',
        path: '/{id}/script',
        summary: 'Get script',
        description: 'Get the script for a podcast',
      })
      .errors(podcastErrors)
      .input(std(Schema.Struct({ id: PodcastIdSchema })))
      .output(std(PodcastOutputSchema)),

    // Trigger full podcast generation (script + audio in one job)
    generate: oc
      .route({
        method: 'POST',
        path: '/{id}/generate',
        summary: 'Generate podcast',
        description:
          'Generate complete podcast (script + audio) in a single async job. Returns a job ID to poll for status.',
      })
      .errors({ ...podcastErrors, ...jobErrors })
      .input(
        std(
          Schema.Struct({
            id: PodcastIdSchema,
            promptInstructions: Schema.optional(Schema.String),
          }),
        ),
      )
      .output(
        std(
          Schema.Struct({
            jobId: Schema.String,
            status: JobStatusSchema,
          }),
        ),
      ),

    // Save changes and regenerate audio (requires ready status)
    saveChanges: oc
      .route({
        method: 'POST',
        path: '/{id}/save-changes',
        summary: 'Save changes and regenerate audio',
        description:
          'Update script segments and/or voice settings, then regenerate audio. Only allowed when podcast is in ready status.',
      })
      .errors({ ...podcastErrors, ...jobErrors })
      .input(
        std(
          Schema.Struct({
            id: PodcastIdSchema,
            segments: Schema.optional(Schema.Array(ScriptSegmentSchema)),
            hostVoice: Schema.optional(Schema.String),
            hostVoiceName: Schema.optional(Schema.String),
            coHostVoice: Schema.optional(Schema.String),
            coHostVoiceName: Schema.optional(Schema.String),
          }),
        ),
      )
      .output(
        std(
          Schema.Struct({
            jobId: JobIdSchema,
            status: JobStatusSchema,
          }),
        ),
      ),

    // Get job status
    getJob: oc
      .route({
        method: 'GET',
        path: '/jobs/{jobId}',
        summary: 'Get job status',
        description: 'Get the status of a generation job',
      })
      .errors(jobErrors)
      .input(std(Schema.Struct({ jobId: JobIdSchema })))
      .output(std(JobOutputSchema)),

    // =========================================================================
    // Collaborator Endpoints
    // =========================================================================

    // List collaborators for a podcast
    listCollaborators: oc
      .route({
        method: 'GET',
        path: '/{id}/collaborators',
        summary: 'List collaborators',
        description: 'List all collaborators for a podcast',
      })
      .errors(podcastErrors)
      .input(std(Schema.Struct({ id: PodcastIdSchema })))
      .output(std(Schema.Array(CollaboratorWithUserOutputSchema))),

    // Add a collaborator to a podcast
    addCollaborator: oc
      .route({
        method: 'POST',
        path: '/{id}/collaborators',
        summary: 'Add collaborator',
        description:
          'Add a collaborator by email. Only the podcast owner can add collaborators.',
      })
      .errors({ ...podcastErrors, ...collaboratorErrors })
      .input(
        std(
          Schema.Struct({
            id: PodcastIdSchema,
            email: Schema.String.pipe(
              Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
            ),
          }),
        ),
      )
      .output(std(CollaboratorWithUserOutputSchema)),

    // Remove a collaborator from a podcast
    removeCollaborator: oc
      .route({
        method: 'DELETE',
        path: '/{id}/collaborators/{collaboratorId}',
        summary: 'Remove collaborator',
        description:
          'Remove a collaborator from a podcast. Only the podcast owner can remove collaborators.',
      })
      .errors({ ...podcastErrors, ...collaboratorErrors })
      .input(
        std(
          Schema.Struct({
            id: PodcastIdSchema,
            collaboratorId: CollaboratorIdSchema,
          }),
        ),
      )
      .output(std(Schema.Struct({}))),

    // Approve a podcast (admin-only)
    approve: oc
      .route({
        method: 'POST',
        path: '/{id}/approve',
        summary: 'Approve podcast',
        description: 'Approve the current podcast content. Admin-only.',
      })
      .errors({ ...podcastErrors, ...authErrors })
      .input(std(Schema.Struct({ id: PodcastIdSchema })))
      .output(std(PodcastOutputSchema)),

    // Revoke approval on a podcast (admin-only)
    revokeApproval: oc
      .route({
        method: 'DELETE',
        path: '/{id}/approve',
        summary: 'Revoke approval',
        description: 'Revoke approval on a podcast. Admin-only.',
      })
      .errors({ ...podcastErrors, ...authErrors })
      .input(std(Schema.Struct({ id: PodcastIdSchema })))
      .output(std(PodcastOutputSchema)),

    // Claim pending invites for the current user
    claimInvites: oc
      .route({
        method: 'POST',
        path: '/claim-invites',
        summary: 'Claim pending invites',
        description:
          'Claim any pending podcast collaboration invites for the current user. Should be called after login/registration.',
      })
      .input(std(Schema.Struct({})))
      .output(
        std(
          Schema.Struct({
            claimedCount: Schema.Number,
          }),
        ),
      ),
  });

export default podcastContract;
