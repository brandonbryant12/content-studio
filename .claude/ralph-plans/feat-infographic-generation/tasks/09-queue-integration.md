# Task 09: Queue Integration

## Standards Checklist

Before starting implementation, read and understand:
- [ ] `packages/queue/src/types.ts` - Job type definitions
- [ ] `packages/queue/src/service.ts` - Queue service interface
- [ ] `packages/queue/src/repository.ts` - Repository implementation

## Context

The queue system uses typed job payloads and results. Adding a new job type requires:
1. Adding to the `JobType` union
2. Defining payload and result types
3. Adding finder method for idempotency checks

## Key Files

### Modify Existing Files:
- `packages/queue/src/types.ts` - Add job type and payload/result types
- `packages/queue/src/service.ts` - Add finder method to interface
- `packages/queue/src/repository.ts` - Implement finder method

## Implementation Notes

### Add Job Type (types.ts)

```typescript
// In packages/queue/src/types.ts

// Add to JobType union
export type JobType =
  | 'generate-podcast'
  | 'generate-script'
  | 'generate-audio'
  | 'generate-voiceover'
  | 'generate-infographic';  // ADD THIS

// Add payload type
export interface GenerateInfographicPayload {
  readonly infographicId: string;
  readonly userId: string;
}

// Add result type
export interface GenerateInfographicResult {
  readonly infographicId: string;
  readonly imageUrl: string;
}

// Update payload union type if exists
export type JobPayload =
  | GeneratePodcastPayload
  | GenerateScriptPayload
  | GenerateAudioPayload
  | GenerateVoiceoverPayload
  | GenerateInfographicPayload;

// Update result union type if exists
export type JobResult =
  | GeneratePodcastResult
  | GenerateScriptResult
  | GenerateAudioResult
  | GenerateVoiceoverResult
  | GenerateInfographicResult;
```

### Add Service Method (service.ts)

```typescript
// In packages/queue/src/service.ts

export interface QueueService {
  // ... existing methods

  readonly findPendingJobForInfographic: (
    infographicId: string,
  ) => Effect.Effect<Job | null, QueueError>;
}
```

### Implement Repository Method (repository.ts)

```typescript
// In packages/queue/src/repository.ts

const findPendingJobForInfographic: QueueService['findPendingJobForInfographic'] = (
  infographicId,
) =>
  runQuery(
    'findPendingJobForInfographic',
    async () => {
      const [row] = await db
        .select()
        .from(job)
        .where(
          and(
            eq(job.type, 'generate-infographic'),
            inArray(job.status, ['pending', 'processing']),
            sql`${job.payload}->>'infographicId' = ${infographicId}`,
          ),
        )
        .limit(1);

      return row ? mapRowToJob(row) : null;
    },
    'Failed to find pending job for infographic',
  );

// Add to the returned object from makeQueueRepository
return {
  // ... existing methods
  findPendingJobForInfographic,
};
```

### Type Guard (optional, in types.ts)

```typescript
// Type guard for job type checking
export const isGenerateInfographicJob = (
  job: Job,
): job is Job<GenerateInfographicPayload, GenerateInfographicResult> =>
  job.type === 'generate-infographic';
```

### Export Updates

Make sure new types are exported from `packages/queue/src/index.ts`:

```typescript
export type {
  // ... existing exports
  GenerateInfographicPayload,
  GenerateInfographicResult,
} from './types';
```

## Verification Log

<!-- Agent writes verification results here -->
