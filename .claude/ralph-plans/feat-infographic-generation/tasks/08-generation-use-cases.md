# Task 08: Generation Use Cases

## Standards Checklist

Before starting implementation, read and understand:
- [ ] `standards/patterns/use-case.md`
- [ ] `packages/media/src/podcast/use-cases/start-generation.ts` - Queue pattern
- [ ] `packages/media/src/podcast/use-cases/generate-script.ts` - AI generation pattern
- [ ] `packages/media/src/podcast/use-cases/generate-audio.ts` - Storage upload pattern

## Context

Generation follows the same pattern as podcasts:
1. `startGeneration` - Validates, clears old image, enqueues job
2. `generateInfographic` - Called by worker, does actual generation

The generation flow:
1. Build prompt from selections + type + instructions
2. Call Image service
3. Upload to storage
4. Update infographic with imageUrl

## Key Files

### Create New Files:
- `packages/media/src/infographic/use-cases/start-generation.ts`
- `packages/media/src/infographic/use-cases/generate-infographic.ts`
- `packages/media/src/infographic/use-cases/get-job.ts`

### Update:
- `packages/media/src/infographic/use-cases/index.ts` - Export

## Implementation Notes

### Additional Errors

```typescript
// Add to packages/media/src/infographic/errors.ts

export class InvalidInfographicGenerationError extends Schema.TaggedError<InvalidInfographicGenerationError>()(
  'InvalidInfographicGenerationError',
  {
    infographicId: Schema.String,
    reason: Schema.String,
  },
) {
  static readonly httpStatus = 400 as const;
  static readonly httpCode = 'INVALID_INFOGRAPHIC_GENERATION' as const;
  static readonly httpMessage = 'Cannot generate infographic';
  static readonly logLevel = 'warning' as const;
}
```

### Start Generation

```typescript
// packages/media/src/infographic/use-cases/start-generation.ts
import { Effect } from 'effect';
import { getCurrentUser } from '@repo/auth/policy';
import { Queue, type JobStatus } from '@repo/queue';
import { InfographicRepo, SelectionRepo } from '../repos';
import {
  InfographicNotFoundError,
  NotInfographicOwnerError,
  InvalidInfographicGenerationError,
} from '../errors';
import type { GenerateInfographicPayload } from '@repo/queue/types';

export interface StartGenerationInput {
  infographicId: string;
  feedbackInstructions?: string;  // For regeneration
}

export interface StartGenerationResult {
  jobId: string;
  status: JobStatus;
}

export const startGeneration = (input: StartGenerationInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const infographicRepo = yield* InfographicRepo;
    const selectionRepo = yield* SelectionRepo;
    const queue = yield* Queue;

    // Get infographic
    const infographic = yield* infographicRepo.findById(input.infographicId);

    if (!infographic) {
      return yield* Effect.fail(
        new InfographicNotFoundError({ infographicId: input.infographicId }),
      );
    }

    if (infographic.createdBy !== user.id) {
      return yield* Effect.fail(
        new NotInfographicOwnerError({
          infographicId: input.infographicId,
          userId: user.id,
        }),
      );
    }

    // Validate has selections
    const selectionCount = yield* selectionRepo.count(input.infographicId);

    if (selectionCount === 0) {
      return yield* Effect.fail(
        new InvalidInfographicGenerationError({
          infographicId: input.infographicId,
          reason: 'No content selected. Add text selections before generating.',
        }),
      );
    }

    // Check for existing pending/processing job (idempotency)
    const existingJob = yield* queue.findPendingJobForInfographic(infographic.id);

    if (existingJob) {
      return { jobId: existingJob.id, status: existingJob.status };
    }

    // Update feedback instructions if provided (for regeneration)
    if (input.feedbackInstructions !== undefined) {
      yield* infographicRepo.update(infographic.id, {
        feedbackInstructions: input.feedbackInstructions,
      });
    }

    // Clear existing image and reset to drafting
    yield* infographicRepo.clearImage(infographic.id);
    yield* infographicRepo.updateStatus(infographic.id, 'drafting');

    // Enqueue job
    const payload: GenerateInfographicPayload = {
      infographicId: infographic.id,
      userId: user.id,
    };

    const job = yield* queue.enqueue(
      'generate-infographic',
      payload,
      user.id,
    );

    return { jobId: job.id, status: job.status };
  }).pipe(
    Effect.withSpan('useCase.startInfographicGeneration', {
      attributes: {
        'infographic.id': input.infographicId,
      },
    }),
  );
```

### Generate Infographic (Worker Logic)

```typescript
// packages/media/src/infographic/use-cases/generate-infographic.ts
import { Effect } from 'effect';
import { Image } from '@repo/ai';
import { Storage } from '@repo/storage';
import { InfographicRepo, SelectionRepo } from '../repos';
import { DocumentRepo } from '@repo/media/document';
import { buildInfographicPrompt, type InfographicType } from '../prompts';
import {
  InfographicNotFoundError,
  InvalidInfographicGenerationError,
} from '../errors';
import type { GenerationContext } from '@repo/db/schemas';

export interface GenerateInfographicInput {
  infographicId: string;
}

export interface GenerateInfographicResult {
  infographicId: string;
  imageUrl: string;
}

export const generateInfographic = (input: GenerateInfographicInput) =>
  Effect.gen(function* () {
    const infographicRepo = yield* InfographicRepo;
    const selectionRepo = yield* SelectionRepo;
    const documentRepo = yield* DocumentRepo;
    const image = yield* Image;
    const storage = yield* Storage;

    // Get infographic with full data
    const infographic = yield* infographicRepo.findById(input.infographicId);

    if (!infographic) {
      return yield* Effect.fail(
        new InfographicNotFoundError({ infographicId: input.infographicId }),
      );
    }

    // Update status to generating
    yield* infographicRepo.updateStatus(infographic.id, 'generating');

    // Get selections
    const selections = yield* selectionRepo.findByInfographic(infographic.id);

    if (selections.length === 0) {
      yield* infographicRepo.updateStatus(
        infographic.id,
        'failed',
        'No content selected',
      );
      return yield* Effect.fail(
        new InvalidInfographicGenerationError({
          infographicId: input.infographicId,
          reason: 'No content selected',
        }),
      );
    }

    // Get document titles for prompt context
    const documentTitles = new Map<string, string>();
    for (const docId of infographic.sourceDocumentIds) {
      const doc = yield* documentRepo.findById(docId);
      if (doc) {
        documentTitles.set(docId, doc.title);
      }
    }

    // Build prompt
    const prompt = buildInfographicPrompt({
      type: infographic.infographicType as InfographicType,
      selections: selections.map((s) => ({
        text: s.selectedText,
        documentTitle: documentTitles.get(s.documentId),
      })),
      customInstructions: infographic.customInstructions ?? undefined,
      feedbackInstructions: infographic.feedbackInstructions ?? undefined,
      aspectRatio: infographic.aspectRatio,
    });

    // Generate image
    const result = yield* image.generate({
      prompt,
      aspectRatio: infographic.aspectRatio as any,
    }).pipe(
      Effect.catchAll((error) => {
        // Update status to failed
        return Effect.flatMap(
          infographicRepo.updateStatus(
            infographic.id,
            'failed',
            error.message,
          ),
          () => Effect.fail(error),
        );
      }),
    );

    // Upload to storage
    const fileName = `infographics/${infographic.id}/${Date.now()}.png`;
    const uploadResult = yield* storage.upload({
      key: fileName,
      content: result.imageContent,
      contentType: result.mimeType,
    });

    const imageUrl = yield* storage.getSignedUrl(fileName);

    // Store generation context for audit
    const generationContext: GenerationContext = {
      promptUsed: prompt,
      selectionsAtGeneration: selections.map((s) => ({
        id: s.id,
        text: s.selectedText,
        documentId: s.documentId,
      })),
      modelId: 'gemini-2.5-flash-image',
      aspectRatio: infographic.aspectRatio,
      generatedAt: new Date().toISOString(),
    };

    yield* infographicRepo.updateGenerationContext(infographic.id, generationContext);

    // Update with image URL and ready status
    yield* infographicRepo.updateImage(infographic.id, imageUrl);
    yield* infographicRepo.updateStatus(infographic.id, 'ready');

    return {
      infographicId: infographic.id,
      imageUrl,
    };
  }).pipe(
    Effect.withSpan('useCase.generateInfographic', {
      attributes: {
        'infographic.id': input.infographicId,
      },
    }),
  );
```

### Get Job

```typescript
// packages/media/src/infographic/use-cases/get-job.ts
import { Effect } from 'effect';
import { getCurrentUser } from '@repo/auth/policy';
import { Queue, JobNotFoundError } from '@repo/queue';
import type { JobId } from '@repo/queue/types';

export interface GetJobInput {
  jobId: string;
}

export const getJob = (input: GetJobInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const queue = yield* Queue;

    const job = yield* queue.getJob(input.jobId as JobId);

    // Verify job belongs to user
    if (job.createdBy !== user.id) {
      return yield* Effect.fail(
        new JobNotFoundError({ jobId: input.jobId }),
      );
    }

    return job;
  }).pipe(
    Effect.withSpan('useCase.getInfographicJob', {
      attributes: { 'job.id': input.jobId },
    }),
  );
```

### Update Index

```typescript
// Add to packages/media/src/infographic/use-cases/index.ts
export * from './start-generation';
export * from './generate-infographic';
export * from './get-job';
```

## Verification Log

<!-- Agent writes verification results here -->
