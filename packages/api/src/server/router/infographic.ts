import { Effect } from 'effect';
import type { Job, InfographicStyleOptions } from '@repo/db/schema';
import {
  serializeInfographicEffect,
  serializeInfographicFullEffect,
  serializeInfographicListItemsEffect,
  serializeInfographicSelectionEffect,
  serializeInfographicSelectionsEffect,
} from '@repo/db/schema';
import {
  createInfographic,
  getInfographic,
  updateInfographic,
  deleteInfographic,
  listInfographics,
  addSelection,
  removeSelection,
  updateSelection,
  reorderSelections,
  extractKeyPoints,
  startInfographicGeneration,
  getInfographicJob,
  type InfographicTypeValue,
} from '@repo/media';
import type { GenerateInfographicResult } from '@repo/queue';
import {
  handleEffectWithProtocol,
  type ErrorFactory,
} from '../effect-handler';
import { protectedProcedure } from '../orpc';

// =============================================================================
// Helper: Serialize Job
// =============================================================================

/**
 * Job result type for infographic generation.
 */
type JobResult = GenerateInfographicResult;

/**
 * Serialized job output type.
 */
interface JobOutput {
  id: string;
  type: string;
  status: Job['status'];
  result: JobResult | null;
  error: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

/**
 * Serialize a job for API output.
 */
const serializeJob = (job: {
  id: string;
  type: string;
  status: Job['status'];
  result: unknown;
  error: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}): JobOutput => ({
  id: job.id,
  type: job.type,
  status: job.status,
  result: job.result as JobResult | null,
  error: job.error,
  createdBy: job.createdBy,
  createdAt: job.createdAt.toISOString(),
  updatedAt: job.updatedAt.toISOString(),
  startedAt: job.startedAt?.toISOString() ?? null,
  completedAt: job.completedAt?.toISOString() ?? null,
});

// =============================================================================
// Router
// =============================================================================

const infographicRouter = {
  // ===========================================================================
  // CRUD Operations
  // ===========================================================================

  list: protectedProcedure.infographics.list.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        listInfographics({
          userId: context.session.user.id,
          limit: input.limit,
          offset: input.offset,
        }).pipe(
          Effect.flatMap((result) =>
            serializeInfographicListItemsEffect(result.items).pipe(
              Effect.map((items) => ({
                items,
                total: result.total,
                limit: result.limit,
                offset: result.offset,
              })),
            ),
          ),
        ),
        errors as unknown as ErrorFactory,
        {
          span: 'api.infographics.list',
          attributes: {
            'pagination.limit': input.limit ?? 50,
            'pagination.offset': input.offset ?? 0,
          },
        },
      );
    },
  ),

  get: protectedProcedure.infographics.get.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        getInfographic({
          infographicId: input.id,
          userId: context.session.user.id,
        }).pipe(Effect.flatMap(serializeInfographicFullEffect)),
        errors as unknown as ErrorFactory,
        {
          span: 'api.infographics.get',
          attributes: { 'infographic.id': input.id },
        },
      );
    },
  ),

  create: protectedProcedure.infographics.create.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        createInfographic({
          title: input.title,
          infographicType: input.infographicType as InfographicTypeValue,
          aspectRatio: input.aspectRatio,
          documentIds: [...input.documentIds],
          userId: context.session.user.id,
        }).pipe(
          // Return with empty selections since it's a new infographic
          Effect.map((infographic) => ({
            ...infographic,
            selections: [],
          })),
          Effect.flatMap(serializeInfographicFullEffect),
        ),
        errors as unknown as ErrorFactory,
        {
          span: 'api.infographics.create',
          attributes: { 'infographic.title': input.title },
        },
      );
    },
  ),

  update: protectedProcedure.infographics.update.handler(
    async ({ context, input, errors }) => {
      const { id, ...data } = input;

      // Convert readonly arrays to mutable for style options
      const styleOptions: InfographicStyleOptions | null | undefined =
        data.styleOptions === undefined
          ? undefined
          : data.styleOptions === null
            ? null
            : {
                colorScheme: data.styleOptions.colorScheme,
                emphasis: data.styleOptions.emphasis
                  ? [...data.styleOptions.emphasis]
                  : undefined,
                layout: data.styleOptions.layout,
              };

      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        updateInfographic({
          infographicId: id,
          userId: context.session.user.id,
          title: data.title,
          infographicType: data.infographicType,
          aspectRatio: data.aspectRatio,
          customInstructions: data.customInstructions,
          feedbackInstructions: data.feedbackInstructions,
          styleOptions,
          documentIds: data.documentIds ? [...data.documentIds] : undefined,
        }).pipe(Effect.flatMap(serializeInfographicEffect)),
        errors as unknown as ErrorFactory,
        {
          span: 'api.infographics.update',
          attributes: { 'infographic.id': id },
        },
      );
    },
  ),

  delete: protectedProcedure.infographics.delete.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        deleteInfographic({
          infographicId: input.id,
          userId: context.session.user.id,
        }).pipe(Effect.map(() => ({}))),
        errors as unknown as ErrorFactory,
        {
          span: 'api.infographics.delete',
          attributes: { 'infographic.id': input.id },
        },
      );
    },
  ),

  // ===========================================================================
  // Selection Management
  // ===========================================================================

  addSelection: protectedProcedure.infographics.addSelection.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        addSelection({
          infographicId: input.id,
          documentId: input.documentId,
          selectedText: input.selectedText,
          startOffset: input.startOffset,
          endOffset: input.endOffset,
          userId: context.session.user.id,
        }).pipe(
          Effect.flatMap((result) =>
            serializeInfographicSelectionEffect(result.selection).pipe(
              Effect.map((selection) => ({
                selection,
                warningMessage: result.warningMessage ?? null,
              })),
            ),
          ),
        ),
        errors as unknown as ErrorFactory,
        {
          span: 'api.infographics.addSelection',
          attributes: { 'infographic.id': input.id },
        },
      );
    },
  ),

  removeSelection: protectedProcedure.infographics.removeSelection.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        removeSelection({
          infographicId: input.id,
          selectionId: input.selectionId,
          userId: context.session.user.id,
        }).pipe(Effect.map(() => ({}))),
        errors as unknown as ErrorFactory,
        {
          span: 'api.infographics.removeSelection',
          attributes: {
            'infographic.id': input.id,
            'selection.id': input.selectionId,
          },
        },
      );
    },
  ),

  updateSelection: protectedProcedure.infographics.updateSelection.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        updateSelection({
          infographicId: input.id,
          selectionId: input.selectionId,
          selectedText: input.selectedText,
          userId: context.session.user.id,
        }).pipe(
          Effect.flatMap((selection) =>
            serializeInfographicSelectionEffect(selection).pipe(
              Effect.map((serialized) => ({ selection: serialized })),
            ),
          ),
        ),
        errors as unknown as ErrorFactory,
        {
          span: 'api.infographics.updateSelection',
          attributes: {
            'infographic.id': input.id,
            'selection.id': input.selectionId,
          },
        },
      );
    },
  ),

  reorderSelections: protectedProcedure.infographics.reorderSelections.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        reorderSelections({
          infographicId: input.id,
          orderedSelectionIds: [...input.orderedSelectionIds],
          userId: context.session.user.id,
        }).pipe(
          Effect.flatMap((selections) =>
            serializeInfographicSelectionsEffect(selections).pipe(
              Effect.map((serialized) => ({ selections: serialized })),
            ),
          ),
        ),
        errors as unknown as ErrorFactory,
        {
          span: 'api.infographics.reorderSelections',
          attributes: { 'infographic.id': input.id },
        },
      );
    },
  ),

  // ===========================================================================
  // AI Extraction
  // ===========================================================================

  extractKeyPoints: protectedProcedure.infographics.extractKeyPoints.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        extractKeyPoints({
          infographicId: input.id,
          userId: context.session.user.id,
        }).pipe(
          Effect.map((result) => ({
            suggestions: result.suggestions.map((suggestion) => ({
              text: suggestion.text,
              documentId: suggestion.documentId,
              documentTitle: '', // TODO: Add document title lookup
              relevance: suggestion.relevance,
              category: undefined,
            })),
          })),
        ),
        errors as unknown as ErrorFactory,
        {
          span: 'api.infographics.extractKeyPoints',
          attributes: { 'infographic.id': input.id },
        },
      );
    },
  ),

  // ===========================================================================
  // Generation
  // ===========================================================================

  generate: protectedProcedure.infographics.generate.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        startInfographicGeneration({
          infographicId: input.id,
          feedbackInstructions: input.feedbackInstructions,
        }),
        errors as unknown as ErrorFactory,
        {
          span: 'api.infographics.generate',
          attributes: { 'infographic.id': input.id },
        },
      );
    },
  ),

  getJob: protectedProcedure.infographics.getJob.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        getInfographicJob({ jobId: input.jobId }).pipe(
          Effect.map(serializeJob),
        ),
        errors as unknown as ErrorFactory,
        {
          span: 'api.infographics.getJob',
          attributes: { 'job.id': input.jobId },
        },
      );
    },
  ),
};

export default infographicRouter;
