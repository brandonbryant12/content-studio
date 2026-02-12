import { oc } from '@orpc/contract';
import {
  CreatePodcastSchema,
  UpdatePodcastFields,
  PodcastOutputSchema,
  PodcastFullOutputSchema,
  PodcastListItemOutputSchema,
  ScriptSegmentSchema,
  JobOutputSchema,
  JobStatusSchema,
  PodcastIdSchema,
  JobIdSchema,
} from '@repo/db/schema';
import { Schema } from 'effect';
import { std, PaginationFields, authErrors, jobErrors } from './shared';

const podcastErrors = {
  PODCAST_NOT_FOUND: {
    status: 404,
    data: std(Schema.Struct({ podcastId: Schema.String })),
  },
  SCRIPT_NOT_FOUND: {
    status: 404,
    data: std(Schema.Struct({ podcastId: Schema.String })),
  },
  DOCUMENT_NOT_FOUND: {
    status: 404,
    data: std(Schema.Struct({ documentId: Schema.String })),
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
      .input(std(Schema.Struct(PaginationFields)))
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
  });

export default podcastContract;
