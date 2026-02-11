import { oc } from '@orpc/contract';
import {
  CreateInfographicSchema,
  UpdateInfographicFields,
  InfographicOutputSchema,
  InfographicVersionOutputSchema,
  InfographicIdSchema,
  JobOutputSchema,
  JobStatusSchema,
  JobIdSchema,
} from '@repo/db/schema';
import { Schema } from 'effect';

const std = Schema.standardSchemaV1;

const CoerceNumber = Schema.Union(
  Schema.Number,
  Schema.String.pipe(
    Schema.transform(Schema.Number, { decode: Number, encode: String }),
  ),
).pipe(Schema.compose(Schema.Number));

// =============================================================================
// Error Definitions
// =============================================================================

const infographicErrors = {
  INFOGRAPHIC_NOT_FOUND: {
    status: 404,
    data: std(
      Schema.Struct({
        infographicId: Schema.String,
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

// =============================================================================
// Contract Definition
// =============================================================================

const infographicContract = oc
  .prefix('/infographics')
  .tag('infographic')
  .router({
    list: oc
      .route({
        method: 'GET',
        path: '/',
        summary: 'List infographics',
        description: 'Retrieve all infographics for the current user',
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
      .output(std(Schema.Array(InfographicOutputSchema))),

    get: oc
      .route({
        method: 'GET',
        path: '/{id}',
        summary: 'Get infographic',
        description: 'Retrieve an infographic by ID',
      })
      .errors(infographicErrors)
      .input(std(Schema.Struct({ id: InfographicIdSchema })))
      .output(std(InfographicOutputSchema)),

    create: oc
      .route({
        method: 'POST',
        path: '/',
        summary: 'Create infographic',
        description: 'Create a new infographic',
      })
      .input(std(CreateInfographicSchema))
      .output(std(InfographicOutputSchema)),

    update: oc
      .route({
        method: 'PATCH',
        path: '/{id}',
        summary: 'Update infographic',
        description: 'Update infographic settings',
      })
      .errors(infographicErrors)
      .input(
        std(
          Schema.Struct({
            id: InfographicIdSchema,
            ...UpdateInfographicFields,
          }),
        ),
      )
      .output(std(InfographicOutputSchema)),

    delete: oc
      .route({
        method: 'DELETE',
        path: '/{id}',
        summary: 'Delete infographic',
        description: 'Permanently delete an infographic',
      })
      .errors(infographicErrors)
      .input(std(Schema.Struct({ id: InfographicIdSchema })))
      .output(std(Schema.Struct({}))),

    generate: oc
      .route({
        method: 'POST',
        path: '/{id}/generate',
        summary: 'Generate infographic',
        description:
          'Generate an image for the infographic. Returns a job ID to poll for status.',
      })
      .errors({ ...infographicErrors, ...jobErrors })
      .input(std(Schema.Struct({ id: InfographicIdSchema })))
      .output(
        std(
          Schema.Struct({
            jobId: Schema.String,
            status: JobStatusSchema,
          }),
        ),
      ),

    getJob: oc
      .route({
        method: 'GET',
        path: '/jobs/{jobId}',
        summary: 'Get job status',
        description: 'Get the status of an infographic generation job',
      })
      .errors(jobErrors)
      .input(std(Schema.Struct({ jobId: JobIdSchema })))
      .output(std(JobOutputSchema)),

    listVersions: oc
      .route({
        method: 'GET',
        path: '/{id}/versions',
        summary: 'List versions',
        description: 'List all generated versions of an infographic',
      })
      .errors(infographicErrors)
      .input(std(Schema.Struct({ id: InfographicIdSchema })))
      .output(std(Schema.Array(InfographicVersionOutputSchema))),

    // Approve an infographic (admin-only)
    approve: oc
      .route({
        method: 'POST',
        path: '/{id}/approve',
        summary: 'Approve infographic',
        description: 'Approve the current infographic content. Admin-only.',
      })
      .errors({ ...infographicErrors, ...authErrors })
      .input(std(Schema.Struct({ id: InfographicIdSchema })))
      .output(std(InfographicOutputSchema)),

    // Revoke approval on an infographic (admin-only)
    revokeApproval: oc
      .route({
        method: 'DELETE',
        path: '/{id}/approve',
        summary: 'Revoke approval',
        description: 'Revoke approval on an infographic. Admin-only.',
      })
      .errors({ ...infographicErrors, ...authErrors })
      .input(std(Schema.Struct({ id: InfographicIdSchema })))
      .output(std(InfographicOutputSchema)),
  });

export default infographicContract;
