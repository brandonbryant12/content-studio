# Task 11: API Router

## Standards Checklist

Before starting implementation, read and understand:
- [ ] `standards/patterns/router-handler.md`
- [ ] `packages/api/src/server/router/podcast.ts` - Reference router
- [ ] `packages/api/src/server/router/voiceover.ts` - Simpler reference

## Context

Routers implement the API contract by connecting endpoints to use cases. Key patterns:
- All endpoints use `protectedProcedure` (requires authentication)
- Use `handleEffectWithProtocol` for error handling
- Apply serializers to responses
- Add tracing spans with relevant attributes

## Key Files

### Create New Files:
- `packages/api/src/server/router/infographic.ts`

### Modify Existing Files:
- `packages/api/src/server/router/index.ts` - Register new router

## Implementation Notes

### Router Structure

```typescript
// packages/api/src/server/router/infographic.ts
import { Effect } from 'effect';
import { protectedProcedure } from '../procedure';
import { handleEffectWithProtocol, type ErrorFactory } from '../error-handler';
import {
  serializeInfographicEffect,
  serializeInfographicListItemsEffect,
  serializeInfographicFullEffect,
  serializeSelectionEffect,
  serializeSelectionsEffect,
} from '@repo/db/schemas';
import { serializeJob } from '@repo/queue';
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
  startGeneration,
  getJob,
} from '@repo/media/infographic';

export const infographicRouter = {
  // List infographics
  list: protectedProcedure.infographics.list.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        listInfographics({
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
        { span: 'api.infographics.list' },
      );
    },
  ),

  // Get single infographic
  get: protectedProcedure.infographics.get.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        getInfographic({ infographicId: input.id }).pipe(
          Effect.flatMap(serializeInfographicFullEffect),
        ),
        errors as unknown as ErrorFactory,
        {
          span: 'api.infographics.get',
          attributes: { 'infographic.id': input.id },
        },
      );
    },
  ),

  // Create infographic
  create: protectedProcedure.infographics.create.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        createInfographic({
          title: input.title,
          infographicType: input.infographicType,
          aspectRatio: input.aspectRatio,
          documentIds: input.documentIds,
        }).pipe(
          Effect.flatMap((infographic) =>
            // Return with empty selections
            Effect.succeed({
              ...infographic,
              selections: [],
            }),
          ),
          Effect.flatMap(serializeInfographicFullEffect),
        ),
        errors as unknown as ErrorFactory,
        { span: 'api.infographics.create' },
      );
    },
  ),

  // Update infographic
  update: protectedProcedure.infographics.update.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        updateInfographic({
          infographicId: input.id,
          title: input.title,
          infographicType: input.infographicType,
          aspectRatio: input.aspectRatio,
          customInstructions: input.customInstructions,
          feedbackInstructions: input.feedbackInstructions,
          styleOptions: input.styleOptions,
          documentIds: input.documentIds,
        }).pipe(Effect.flatMap(serializeInfographicEffect)),
        errors as unknown as ErrorFactory,
        {
          span: 'api.infographics.update',
          attributes: { 'infographic.id': input.id },
        },
      );
    },
  ),

  // Delete infographic
  delete: protectedProcedure.infographics.delete.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        deleteInfographic({ infographicId: input.id }),
        errors as unknown as ErrorFactory,
        {
          span: 'api.infographics.delete',
          attributes: { 'infographic.id': input.id },
        },
      );
    },
  ),

  // === Selection Management ===

  addSelection: protectedProcedure.infographics.addSelection.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        addSelection({
          infographicId: input.infographicId,
          documentId: input.documentId,
          selectedText: input.selectedText,
          startOffset: input.startOffset,
          endOffset: input.endOffset,
        }).pipe(
          Effect.flatMap((result) =>
            serializeSelectionEffect(result.selection).pipe(
              Effect.map((selection) => ({
                selection,
                warningMessage: result.warningMessage,
              })),
            ),
          ),
        ),
        errors as unknown as ErrorFactory,
        {
          span: 'api.infographics.addSelection',
          attributes: { 'infographic.id': input.infographicId },
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
          infographicId: input.infographicId,
          selectionId: input.selectionId,
        }),
        errors as unknown as ErrorFactory,
        {
          span: 'api.infographics.removeSelection',
          attributes: {
            'infographic.id': input.infographicId,
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
          infographicId: input.infographicId,
          selectionId: input.selectionId,
          selectedText: input.selectedText,
        }).pipe(
          Effect.flatMap((result) =>
            serializeSelectionEffect(result.selection).pipe(
              Effect.map((selection) => ({ selection })),
            ),
          ),
        ),
        errors as unknown as ErrorFactory,
        {
          span: 'api.infographics.updateSelection',
          attributes: {
            'infographic.id': input.infographicId,
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
          infographicId: input.infographicId,
          orderedSelectionIds: input.orderedSelectionIds,
        }).pipe(
          Effect.flatMap((result) =>
            serializeSelectionsEffect(result.selections).pipe(
              Effect.map((selections) => ({ selections })),
            ),
          ),
        ),
        errors as unknown as ErrorFactory,
        {
          span: 'api.infographics.reorderSelections',
          attributes: { 'infographic.id': input.infographicId },
        },
      );
    },
  ),

  // === AI Extraction ===

  extractKeyPoints: protectedProcedure.infographics.extractKeyPoints.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        extractKeyPoints({ infographicId: input.infographicId }),
        errors as unknown as ErrorFactory,
        {
          span: 'api.infographics.extractKeyPoints',
          attributes: { 'infographic.id': input.infographicId },
        },
      );
    },
  ),

  // === Generation ===

  generate: protectedProcedure.infographics.generate.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        startGeneration({
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
        getJob({ jobId: input.jobId }).pipe(Effect.map(serializeJob)),
        errors as unknown as ErrorFactory,
        {
          span: 'api.infographics.getJob',
          attributes: { 'job.id': input.jobId },
        },
      );
    },
  ),
};
```

### Register Router

```typescript
// In packages/api/src/server/router/index.ts

import { infographicRouter } from './infographic';

export const appRouter = {
  // ... existing routers
  infographics: infographicRouter,
};
```

## Verification Log

<!-- Agent writes verification results here -->
