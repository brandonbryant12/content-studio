import {
  serializeInfographicEffect,
  serializeInfographicsEffect,
  serializeInfographicVersionsEffect,
  serializeJobEffect,
  serializeStylePresetEffect,
  serializeStylePresetsEffect,
} from '@repo/db/schema';
import {
  listInfographics,
  getInfographic,
  createInfographic,
  updateInfographic,
  deleteInfographic,
  generateInfographic,
  getInfographicJob,
  getInfographicVersions,
  approveInfographic,
  revokeInfographicApproval,
  listStylePresets,
  createStylePreset,
  deleteStylePreset,
} from '@repo/media';
import { Effect } from 'effect';
import { bindEffectProtocol } from '../effect-handler';
import { protectedProcedure } from '../orpc';
import { tapLogActivity, tapSyncTitle } from './log-activity';

const infographicRouter = {
  list: protectedProcedure.infographics.list.handler(
    async ({ context, input, errors }) =>
      bindEffectProtocol({ context, errors }).run(
        listInfographics(input).pipe(
          Effect.flatMap((result) => serializeInfographicsEffect([...result])),
        ),
        {
          attributes: {
            'pagination.limit': input.limit ?? 50,
            'pagination.offset': input.offset ?? 0,
          },
        },
      ),
  ),

  get: protectedProcedure.infographics.get.handler(
    async ({ context, input, errors }) =>
      bindEffectProtocol({ context, errors }).run(
        getInfographic({ id: input.id }).pipe(
          Effect.flatMap(serializeInfographicEffect),
        ),
        {
          attributes: { 'infographic.id': input.id },
        },
      ),
  ),

  create: protectedProcedure.infographics.create.handler(
    async ({ context, input, errors }) =>
      bindEffectProtocol({ context, errors }).run(
        createInfographic(input).pipe(
          Effect.flatMap(serializeInfographicEffect),
          tapLogActivity(
            context.runtime,
            context.user,
            'created',
            'infographic',
          ),
        ),
        {
          attributes: { 'infographic.title': input.title },
        },
      ),
  ),

  update: protectedProcedure.infographics.update.handler(
    async ({ context, input, errors }) =>
      bindEffectProtocol({ context, errors }).run(
        updateInfographic(input).pipe(
          Effect.flatMap(serializeInfographicEffect),
          tapSyncTitle(context.runtime, context.user),
        ),
        {
          attributes: { 'infographic.id': input.id },
        },
      ),
  ),

  delete: protectedProcedure.infographics.delete.handler(
    async ({ context, input, errors }) =>
      bindEffectProtocol({ context, errors }).run(
        deleteInfographic({ id: input.id }).pipe(
          Effect.as({}),
          tapLogActivity(
            context.runtime,
            context.user,
            'deleted',
            'infographic',
            input.id,
          ),
        ),
        {
          attributes: { 'infographic.id': input.id },
        },
      ),
  ),

  generate: protectedProcedure.infographics.generate.handler(
    async ({ context, input, errors }) =>
      bindEffectProtocol({ context, errors }).run(
        generateInfographic({ id: input.id }),
        {
          attributes: { 'infographic.id': input.id },
        },
      ),
  ),

  getJob: protectedProcedure.infographics.getJob.handler(
    async ({ context, input, errors }) =>
      bindEffectProtocol({ context, errors }).run(
        getInfographicJob({ jobId: input.jobId }).pipe(
          Effect.flatMap(serializeJobEffect),
        ),
        {
          attributes: { 'job.id': input.jobId },
        },
      ),
  ),

  approve: protectedProcedure.infographics.approve.handler(
    async ({ context, input, errors }) =>
      bindEffectProtocol({ context, errors }).run(
        approveInfographic({ infographicId: input.id }).pipe(
          Effect.flatMap((result) =>
            serializeInfographicEffect(result.infographic),
          ),
        ),
        {
          attributes: { 'infographic.id': input.id },
        },
      ),
  ),

  revokeApproval: protectedProcedure.infographics.revokeApproval.handler(
    async ({ context, input, errors }) =>
      bindEffectProtocol({ context, errors }).run(
        revokeInfographicApproval({ infographicId: input.id }).pipe(
          Effect.flatMap((result) =>
            serializeInfographicEffect(result.infographic),
          ),
        ),
        {
          attributes: { 'infographic.id': input.id },
        },
      ),
  ),

  listVersions: protectedProcedure.infographics.listVersions.handler(
    async ({ context, input, errors }) =>
      bindEffectProtocol({ context, errors }).run(
        getInfographicVersions({ infographicId: input.id }).pipe(
          Effect.flatMap((result) =>
            serializeInfographicVersionsEffect([...result]),
          ),
        ),
        {
          attributes: { 'infographic.id': input.id },
        },
      ),
  ),

  stylePresets: {
    list: protectedProcedure.infographics.stylePresets.list.handler(
      async ({ context, errors }) =>
        bindEffectProtocol({ context, errors }).run(
          listStylePresets().pipe(
            Effect.flatMap((result) =>
              serializeStylePresetsEffect([...result]),
            ),
          ),
        ),
    ),

    create: protectedProcedure.infographics.stylePresets.create.handler(
      async ({ context, input, errors }) =>
        bindEffectProtocol({ context, errors }).run(
          createStylePreset(input).pipe(
            Effect.flatMap(serializeStylePresetEffect),
          ),
        ),
    ),

    delete: protectedProcedure.infographics.stylePresets.delete.handler(
      async ({ context, input, errors }) =>
        bindEffectProtocol({ context, errors }).run(
          deleteStylePreset({ id: input.id }).pipe(Effect.as({})),
          {
            attributes: { 'preset.id': input.id },
          },
        ),
    ),
  },
};

export default infographicRouter;
