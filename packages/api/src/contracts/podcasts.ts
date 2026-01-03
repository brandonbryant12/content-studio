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
  // Job schemas
  JobOutputSchema,
  JobStatusSchema,
  // Branded ID schemas
  PodcastIdSchema,
  JobIdSchema,
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
  });

export default podcastContract;
