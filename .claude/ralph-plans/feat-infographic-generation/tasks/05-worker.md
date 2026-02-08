# Task 05: Queue Job Type + Worker

## Standards Checklist

Before starting implementation, read and understand:
- [ ] `standards/patterns/use-case.md`

## Context

Follow the exact patterns in:
- `packages/queue/src/types.ts` — JobType union, payload/result interfaces
- `apps/server/src/workers/podcast-worker.ts` — createWorker, processJob, onJobComplete, SSE emission
- `apps/server/src/workers/voiceover-worker.ts` — another worker reference
- `apps/server/src/workers/index.ts` — worker registration

## Key Files

### Modify
- `packages/queue/src/types.ts` — Add `'generate-infographic'` to JobType, payload/result interfaces
- `apps/server/src/workers/index.ts` — Export infographic worker

### Create
- `apps/server/src/workers/infographic-worker.ts`

## Implementation Notes

### Queue Types
```typescript
// Add to JobType union
export type JobType =
  | 'generate-podcast'
  | 'generate-script'
  | 'generate-audio'
  | 'generate-voiceover'
  | 'generate-infographic';  // NEW

export interface GenerateInfographicPayload {
  readonly infographicId: string;
  readonly userId: string;
}

export interface GenerateInfographicResult {
  readonly infographicId: string;
  readonly imageUrl: string;
  readonly versionNumber: number;
}
```

### Worker Implementation

```typescript
export const createInfographicWorker = (config: InfographicWorkerConfig): Worker => {
  const JOB_TYPES: JobType[] = ['generate-infographic'];

  const processJob = (job: Job<GenerateInfographicPayload>) =>
    Effect.gen(function* () {
      yield* Effect.logInfo(`Processing generate-infographic job ${job.id}`);

      const infographicRepo = yield* InfographicRepo;
      const storage = yield* Storage;
      const imageGen = yield* ImageGen;

      // 1. Fetch infographic
      const infographic = yield* infographicRepo.findById(job.payload.infographicId);

      // 2. Optionally extract document content
      let documentContent: string | undefined;
      if (infographic.sourceDocumentIds?.length) {
        const extracted = yield* extractDocumentContent(infographic.sourceDocumentIds);
        documentContent = `${extracted.summary}\n\nKey Points:\n${extracted.keyPoints.join('\n')}\n\nStatistics:\n${extracted.statistics.map(s => `${s.label}: ${s.value}`).join('\n')}`;
      }

      // 3. Build prompt
      const prompt = buildInfographicPrompt({
        infographicType: infographic.infographicType,
        stylePreset: infographic.stylePreset,
        format: infographic.format,
        prompt: infographic.prompt,
        documentContent,
      });

      // 4. Generate image
      const { imageData, mimeType } = yield* imageGen.generateImage({
        prompt,
        format: infographic.format,
      });

      // 5. Upload to storage
      const storageKey = `infographics/${infographic.id}/${Date.now()}.png`;
      const imageUrl = yield* storage.upload(storageKey, imageData, mimeType);

      // 6. Create version record + update infographic
      // Use Effect.acquireRelease pattern for cleanup
      const versions = yield* infographicRepo.listVersions(infographic.id);
      const nextVersion = versions.length > 0 ? Math.max(...versions.map(v => v.versionNumber)) + 1 : 1;

      yield* infographicRepo.insertVersion({
        id: generateInfographicVersionId(),
        infographicId: infographic.id,
        versionNumber: nextVersion,
        prompt: infographic.prompt,
        infographicType: infographic.infographicType,
        stylePreset: infographic.stylePreset,
        format: infographic.format,
        imageStorageKey: storageKey,
      }).pipe(
        Effect.catchAll((err) =>
          // Cleanup: delete uploaded image if DB insert fails
          storage.delete(storageKey).pipe(
            Effect.catchAll(() => Effect.void),
            Effect.flatMap(() => Effect.fail(err)),
          )
        )
      );

      // 7. Update infographic status
      yield* infographicRepo.update(infographic.id, {
        status: 'ready',
        imageStorageKey: storageKey,
        errorMessage: null,
      });

      // 8. Prune old versions (keep max 10)
      yield* infographicRepo.deleteOldVersions(infographic.id, 10);

      return { infographicId: infographic.id, imageUrl, versionNumber: nextVersion };
    }).pipe(
      // Handle safety filter
      Effect.catchTag('ImageGenContentFilteredError', (err) =>
        Effect.gen(function* () {
          const repo = yield* InfographicRepo;
          yield* repo.update(job.payload.infographicId, {
            status: 'failed',
            errorMessage: 'Your infographic could not be generated. Please adjust your prompt and try again.',
          });
          return yield* Effect.fail(err);
        })
      ),
      // Handle other failures
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          const repo = yield* InfographicRepo;
          yield* repo.update(job.payload.infographicId, {
            status: 'failed',
            errorMessage: 'Generation failed. Please try again.',
          }).pipe(Effect.catchAll(() => Effect.void));
          return yield* Effect.fail(wrapJobError(job.id, error));
        })
      ),
      Effect.annotateLogs('worker', 'InfographicWorker'),
    );

  const onJobComplete = (job: Job<GenerateInfographicPayload>) => {
    const userId = job.payload.userId;

    // Emit SSE events
    ssePublisher.publish(userId, {
      type: 'infographic_job_completion',
      jobId: job.id,
      jobType: 'generate-infographic',
      status: job.status === 'completed' ? 'completed' : 'failed',
      infographicId: job.payload.infographicId,
      error: job.error ?? undefined,
    });

    ssePublisher.publish(userId, {
      type: 'entity_change',
      entityType: 'infographic',
      changeType: 'update',
      entityId: job.payload.infographicId,
      userId,
      timestamp: new Date().toISOString(),
    });
  };

  return createWorker({
    name: 'InfographicWorker',
    jobTypes: JOB_TYPES,
    config,
    processJob,
    onJobComplete,
  });
};
```

## Verification Log

<!-- Agent writes verification results here -->
