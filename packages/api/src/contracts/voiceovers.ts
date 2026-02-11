import { oc } from '@orpc/contract';
import {
  // Input schemas
  CreateVoiceoverSchema,
  UpdateVoiceoverFields,
  // Output schemas
  VoiceoverOutputSchema,
  VoiceoverListItemOutputSchema,
  // Job schemas
  JobOutputSchema,
  JobStatusSchema,
  // Branded ID schemas
  VoiceoverIdSchema,
  JobIdSchema,
} from '@repo/db/schema';
import { Schema } from 'effect';

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

const voiceoverErrors = {
  VOICEOVER_NOT_FOUND: {
    status: 404,
    data: std(
      Schema.Struct({
        voiceoverId: Schema.String,
      }),
    ),
  },
} as const;

const authErrors = {
  FORBIDDEN: {
    status: 403,
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

const generationErrors = {
  INVALID_VOICEOVER_AUDIO_GENERATION: {
    status: 400,
    data: std(
      Schema.Struct({
        voiceoverId: Schema.String,
        reason: Schema.String,
      }),
    ),
  },
} as const;

// =============================================================================
// Contract Definition
// =============================================================================

const voiceoverContract = oc
  .prefix('/voiceovers')
  .tag('voiceover')
  .router({
    // List all voiceovers for current user
    list: oc
      .route({
        method: 'GET',
        path: '/',
        summary: 'List voiceovers',
        description: 'Retrieve all voiceovers for the current user',
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
      .output(std(Schema.Array(VoiceoverListItemOutputSchema))),

    // Get a single voiceover by ID
    get: oc
      .route({
        method: 'GET',
        path: '/{id}',
        summary: 'Get voiceover',
        description: 'Retrieve a voiceover by ID',
      })
      .errors(voiceoverErrors)
      .input(std(Schema.Struct({ id: VoiceoverIdSchema })))
      .output(std(VoiceoverOutputSchema)),

    // Create a new voiceover
    create: oc
      .route({
        method: 'POST',
        path: '/',
        summary: 'Create voiceover',
        description: 'Create a new voiceover',
      })
      .input(std(CreateVoiceoverSchema))
      .output(std(VoiceoverOutputSchema)),

    // Update a voiceover
    update: oc
      .route({
        method: 'PATCH',
        path: '/{id}',
        summary: 'Update voiceover',
        description: 'Update voiceover settings',
      })
      .errors(voiceoverErrors)
      .input(
        std(
          Schema.Struct({
            id: VoiceoverIdSchema,
            ...UpdateVoiceoverFields,
          }),
        ),
      )
      .output(std(VoiceoverOutputSchema)),

    // Delete a voiceover
    delete: oc
      .route({
        method: 'DELETE',
        path: '/{id}',
        summary: 'Delete voiceover',
        description: 'Permanently delete a voiceover',
      })
      .errors(voiceoverErrors)
      .input(std(Schema.Struct({ id: VoiceoverIdSchema })))
      .output(std(Schema.Struct({}))),

    // Generate audio for a voiceover
    generate: oc
      .route({
        method: 'POST',
        path: '/{id}/generate',
        summary: 'Generate audio',
        description:
          'Generate audio for the voiceover text. Returns a job ID to poll for status.',
      })
      .errors({ ...voiceoverErrors, ...jobErrors, ...generationErrors })
      .input(std(Schema.Struct({ id: VoiceoverIdSchema })))
      .output(
        std(
          Schema.Struct({
            jobId: Schema.String,
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

    // Approve a voiceover (admin-only)
    approve: oc
      .route({
        method: 'POST',
        path: '/{id}/approve',
        summary: 'Approve voiceover',
        description: 'Approve the current voiceover content. Admin-only.',
      })
      .errors({ ...voiceoverErrors, ...authErrors })
      .input(std(Schema.Struct({ id: VoiceoverIdSchema })))
      .output(std(VoiceoverOutputSchema)),

    // Revoke approval on a voiceover (admin-only)
    revokeApproval: oc
      .route({
        method: 'DELETE',
        path: '/{id}/approve',
        summary: 'Revoke approval',
        description: 'Revoke approval on a voiceover. Admin-only.',
      })
      .errors({ ...voiceoverErrors, ...authErrors })
      .input(std(Schema.Struct({ id: VoiceoverIdSchema })))
      .output(std(VoiceoverOutputSchema)),
  });

export default voiceoverContract;
