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
  StylePresetOutputSchema,
  CreateStylePresetSchema,
  InfographicStylePresetIdSchema,
} from '@repo/db/schema';
import { Schema } from 'effect';
import { std, PaginationFields, authErrors, jobErrors } from './shared';

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

const stylePresetErrors = {
  STYLE_PRESET_NOT_FOUND: {
    status: 404,
    data: std(
      Schema.Struct({
        presetId: Schema.String,
      }),
    ),
  },
} as const;

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
      .input(std(Schema.Struct(PaginationFields)))
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

    // Style preset sub-routes
    stylePresets: oc.prefix('/style-presets').router({
      list: oc
        .route({
          method: 'GET',
          path: '/',
          summary: 'List style presets',
          description: 'List built-in and user-owned style presets',
        })
        .output(std(Schema.Array(StylePresetOutputSchema))),

      create: oc
        .route({
          method: 'POST',
          path: '/',
          summary: 'Create style preset',
          description: 'Create a new user-owned style preset',
        })
        .input(std(CreateStylePresetSchema))
        .output(std(StylePresetOutputSchema)),

      delete: oc
        .route({
          method: 'DELETE',
          path: '/{id}',
          summary: 'Delete style preset',
          description: 'Delete a user-owned style preset',
        })
        .errors({ ...stylePresetErrors, ...authErrors })
        .input(std(Schema.Struct({ id: InfographicStylePresetIdSchema })))
        .output(std(Schema.Struct({}))),
    }),
  });

export default infographicContract;
