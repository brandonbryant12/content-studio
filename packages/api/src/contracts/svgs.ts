import { oc, eventIterator, type } from '@orpc/contract';
import {
  SvgIdSchema,
  SvgOutputSchema,
  CreateSvgSchema,
  UpdateSvgSchema,
  SvgMessageOutputSchema,
} from '@repo/db/schema';
import { Schema } from 'effect';
import type { UIMessageChunk } from 'ai';
import { std, PaginationFields } from './shared';

const svgErrors = {
  SVG_NOT_FOUND: {
    status: 404,
    data: std(Schema.Struct({ svgId: Schema.String })),
  },
  SVG_GENERATION_IN_PROGRESS: {
    status: 409,
    data: std(Schema.Struct({ svgId: Schema.String })),
  },
} as const;

const svgsContract = oc.prefix('/svgs').tag('svg').router({
  list: oc
    .route({ method: 'GET', path: '/' })
    .input(std(Schema.Struct(PaginationFields)))
    .output(std(Schema.Array(SvgOutputSchema))),

  create: oc
    .route({ method: 'POST', path: '/' })
    .input(std(CreateSvgSchema))
    .output(std(SvgOutputSchema)),

  get: oc
    .route({ method: 'GET', path: '/{id}' })
    .errors(svgErrors)
    .input(std(Schema.Struct({ id: SvgIdSchema })))
    .output(std(SvgOutputSchema)),

  update: oc
    .route({ method: 'PATCH', path: '/{id}' })
    .errors(svgErrors)
    .input(
      std(
        Schema.Struct({
          id: SvgIdSchema,
          ...UpdateSvgSchema.fields,
        }),
      ),
    )
    .output(std(SvgOutputSchema)),

  delete: oc
    .route({ method: 'DELETE', path: '/{id}' })
    .errors(svgErrors)
    .input(std(Schema.Struct({ id: SvgIdSchema })))
    .output(std(Schema.Struct({}))),

  chat: oc
    .route({ method: 'POST', path: '/{id}/chat' })
    .errors(svgErrors)
    .input(std(Schema.Struct({ id: SvgIdSchema, message: Schema.String })))
    .output(eventIterator(type<UIMessageChunk>())),

  messages: oc
    .route({ method: 'GET', path: '/{id}/messages' })
    .errors(svgErrors)
    .input(std(Schema.Struct({ id: SvgIdSchema })))
    .output(std(Schema.Array(SvgMessageOutputSchema))),
});

export default svgsContract;
