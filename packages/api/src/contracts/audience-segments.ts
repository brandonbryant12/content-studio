import { oc } from '@orpc/contract';
import { Schema } from 'effect';
import {
  AudienceSegmentIdSchema,
  AudienceSegmentOutputSchema,
  CreateAudienceSegmentSchema,
  UpdateAudienceSegmentSchema,
} from '@repo/db/schema';

const std = Schema.standardSchemaV1;

// =============================================================================
// Error Definitions
// =============================================================================

const audienceSegmentErrors = {
  AUDIENCE_SEGMENT_NOT_FOUND: {
    status: 404,
    data: std(
      Schema.Struct({
        audienceSegmentId: Schema.String,
      }),
    ),
  },
} as const;

// =============================================================================
// Contract Definition
// =============================================================================

const audienceSegmentContract = oc
  .prefix('/audience-segments')
  .tag('audienceSegment')
  .router({
    list: oc
      .route({
        method: 'GET',
        path: '/',
        summary: 'List audience segments',
        description: 'Retrieve all audience segments for the current user',
      })
      .input(
        std(
          Schema.Struct({
            limit: Schema.optional(Schema.Number),
            offset: Schema.optional(Schema.Number),
          }),
        ),
      )
      .output(std(Schema.Array(AudienceSegmentOutputSchema))),

    get: oc
      .route({
        method: 'GET',
        path: '/{id}',
        summary: 'Get audience segment',
        description: 'Retrieve an audience segment by ID',
      })
      .errors(audienceSegmentErrors)
      .input(std(Schema.Struct({ id: AudienceSegmentIdSchema })))
      .output(std(AudienceSegmentOutputSchema)),

    create: oc
      .route({
        method: 'POST',
        path: '/',
        summary: 'Create audience segment',
        description: 'Create a new audience segment',
      })
      .input(std(CreateAudienceSegmentSchema))
      .output(std(AudienceSegmentOutputSchema)),

    update: oc
      .route({
        method: 'PATCH',
        path: '/{id}',
        summary: 'Update audience segment',
        description: 'Update an existing audience segment',
      })
      .errors(audienceSegmentErrors)
      .input(
        std(
          Schema.Struct({
            id: AudienceSegmentIdSchema,
            ...UpdateAudienceSegmentSchema.fields,
          }),
        ),
      )
      .output(std(AudienceSegmentOutputSchema)),

    delete: oc
      .route({
        method: 'DELETE',
        path: '/{id}',
        summary: 'Delete audience segment',
        description: 'Delete an audience segment',
      })
      .errors(audienceSegmentErrors)
      .input(std(Schema.Struct({ id: AudienceSegmentIdSchema })))
      .output(std(Schema.Struct({}))),
  });

export default audienceSegmentContract;
