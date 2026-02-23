import { oc } from '@orpc/contract';
import {
  CreateSlideDeckSchema,
  UpdateSlideDeckFields,
  SlideDeckOutputSchema,
  SlideDeckVersionOutputSchema,
  SlideDeckIdSchema,
  JobOutputSchema,
  JobStatusSchema,
  JobIdSchema,
} from '@repo/db/schema';
import { Schema } from 'effect';
import { std, PaginationFields, jobErrors } from './shared';

const slideDeckErrors = {
  SLIDE_DECK_NOT_FOUND: {
    status: 404,
    data: std(
      Schema.Struct({
        slideDeckId: Schema.String,
      }),
    ),
  },
} as const;

const slideDeckContract = oc
  .prefix('/slide-decks')
  .tag('slideDeck')
  .router({
    list: oc
      .route({
        method: 'GET',
        path: '/',
        summary: 'List slide decks',
      })
      .input(std(Schema.Struct(PaginationFields)))
      .output(std(Schema.Array(SlideDeckOutputSchema))),

    get: oc
      .route({
        method: 'GET',
        path: '/{id}',
        summary: 'Get slide deck',
      })
      .errors(slideDeckErrors)
      .input(std(Schema.Struct({ id: SlideDeckIdSchema })))
      .output(std(SlideDeckOutputSchema)),

    create: oc
      .route({
        method: 'POST',
        path: '/',
        summary: 'Create slide deck',
      })
      .input(std(CreateSlideDeckSchema))
      .output(std(SlideDeckOutputSchema)),

    update: oc
      .route({
        method: 'PATCH',
        path: '/{id}',
        summary: 'Update slide deck',
      })
      .errors(slideDeckErrors)
      .input(
        std(
          Schema.Struct({
            id: SlideDeckIdSchema,
            ...UpdateSlideDeckFields,
          }),
        ),
      )
      .output(std(SlideDeckOutputSchema)),

    delete: oc
      .route({
        method: 'DELETE',
        path: '/{id}',
        summary: 'Delete slide deck',
      })
      .errors(slideDeckErrors)
      .input(std(Schema.Struct({ id: SlideDeckIdSchema })))
      .output(std(Schema.Struct({}))),

    generate: oc
      .route({
        method: 'POST',
        path: '/{id}/generate',
        summary: 'Generate slide deck',
      })
      .errors({ ...slideDeckErrors, ...jobErrors })
      .input(std(Schema.Struct({ id: SlideDeckIdSchema })))
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
        summary: 'Get generation job',
      })
      .errors(jobErrors)
      .input(std(Schema.Struct({ jobId: JobIdSchema })))
      .output(std(JobOutputSchema)),

    listVersions: oc
      .route({
        method: 'GET',
        path: '/{id}/versions',
        summary: 'List slide deck versions',
      })
      .errors(slideDeckErrors)
      .input(std(Schema.Struct({ id: SlideDeckIdSchema })))
      .output(std(Schema.Array(SlideDeckVersionOutputSchema))),
  });

export default slideDeckContract;
