# Error Handling Patterns

## Overview

All errors use Effect's `TaggedError` pattern for type-safe, exhaustive error handling.

## Effect Error Types

Errors are defined in `packages/effect/src/errors.ts`:

```typescript
export class DocumentNotFound extends Schema.TaggedError<DocumentNotFound>()(
  'DocumentNotFound',
  {
    id: Schema.String,
    message: Schema.optional(Schema.String)
  },
) {
  static readonly status = 404 as const;
}
```

## API Error Mapping

Use `handleEffect` with `createErrorHandlers` for consistent error handling:

```typescript
import { createErrorHandlers, handleEffect } from '../effect-handler';

const handler = async ({ context, input, errors }) => {
  const handlers = createErrorHandlers(errors);

  return handleEffect(
    Effect.gen(function* () {
      const documents = yield* Documents;
      return yield* documents.findById(input.id);
    }).pipe(Effect.provide(context.layers)),
    {
      ...handlers.common,      // DbError, PolicyError, ForbiddenError
      ...handlers.database,    // ConstraintViolation, Deadlock, Connection
      DocumentNotFound: (e) => {
        throw errors.DOCUMENT_NOT_FOUND({
          message: e.message ?? `Document ${e.id} not found`,
          data: { documentId: e.id },
        });
      },
    },
  );
};
```

TypeScript enforces handling ALL possible errors at compile time.

## Error Handler Factory

`createErrorHandlers(errors)` returns grouped handlers:

| Group | Handles | Use Case |
|-------|---------|----------|
| `common` | DbError, PolicyError, ForbiddenError, UnauthorizedError, NotFoundError | All routes |
| `database` | ConstraintViolationError, DeadlockError, ConnectionError | DB operations |
| `storage` | StorageError, StorageUploadError, StorageNotFoundError | File operations |
| `queue` | QueueError, JobNotFoundError, JobProcessingError | Job queue |
| `tts` | TTSError, TTSQuotaExceededError | Text-to-speech |
| `llm` | LLMError, LLMRateLimitError | AI operations |

## Stack Trace Preservation

All error handlers preserve stack traces in logs:

```typescript
const logAndThrowInternal = (tag, e, errors, publicMessage) => {
  const stack = e.cause instanceof Error ? e.cause.stack : undefined;
  console.error(`[${tag}]`, e.message, { cause: e.cause, stack });
  throw errors.INTERNAL_ERROR({ message: publicMessage });
};
```

## Creating New Error Types

1. Define in `packages/effect/src/errors.ts`:

```typescript
export class MyNewError extends Schema.TaggedError<MyNewError>()(
  'MyNewError',
  {
    id: Schema.String,
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown),
  },
) {
  static readonly status = 400 as const;
  static readonly code = 'MY_NEW_ERROR' as const;
}
```

2. Add to `ApiError` union type
3. Add handler to appropriate group in `createErrorHandlers`
4. Handle in API routes

## Worker Error Handling

Workers should never silently suppress errors:

```typescript
// Good - logs the error
yield* podcasts.setStatus(podcastId, 'failed', String(error)).pipe(
  Effect.catchAll((statusError) =>
    Effect.sync(() => {
      console.error('[Worker] Failed to update status:', {
        podcastId,
        originalError: formatError(error),
        statusError: formatError(statusError),
      });
    }),
  ),
);

// Bad - silently ignores
yield* podcasts.setStatus(...).pipe(
  Effect.catchAll(() => Effect.void), // Never do this!
);
```
