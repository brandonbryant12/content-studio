# Error Handling Pattern

```mermaid
flowchart LR
  R[Repo] -->|"EntityNotFound"| UC[Use Case]
  UC -->|"error union<br/>(auto-inferred)"| H[Handler]
  H -->|"handleEffectWithProtocol"| P[HTTP Protocol]
  P -->|"httpStatus + httpCode"| C[oRPC Client]
  style P fill:#fef3cd
```

## Golden Principles

1. **All errors extend `Schema.TaggedError`** with HTTP protocol static properties <!-- enforced-by: invariant-test -->
2. **Each package owns its errors** -- import from the owning package <!-- enforced-by: eslint -->
3. **Use `handleEffectWithProtocol`** -- never legacy `handleEffect` with manual mapping <!-- enforced-by: invariant-test -->
4. **Let Effect infer the error union**; export derived alias for consumers/tests <!-- enforced-by: types -->

## Error Template

```typescript
// packages/{package}/src/errors.ts
import { Schema } from 'effect';

export class EntityNotFound extends Schema.TaggedError<EntityNotFound>()(
  'EntityNotFound',
  { id: Schema.String, message: Schema.optional(Schema.String) },
) {
  static readonly httpStatus = 404 as const;
  static readonly httpCode = 'ENTITY_NOT_FOUND' as const;
  static readonly httpMessage = (e: EntityNotFound) =>
    e.message ?? `Entity ${e.id} not found`;
  static readonly logLevel = 'silent' as const;

  static getData(e: EntityNotFound) {
    return { entityId: e.id };
  }
}
```

### Required Static Properties <!-- enforced-by: invariant-test -->

| Property | Type | Description |
|---|---|---|
| `httpStatus` | `number` | HTTP status code (404, 500, etc.) |
| `httpCode` | `string` | Client error code (`DOCUMENT_NOT_FOUND`) |
| `httpMessage` | `string \| (e) => string` | Response message |
| `logLevel` | `LogLevel` | Logging behavior |

### Optional: `getData(e)` <!-- enforced-by: manual-review -->

Returns structured data for the response body. Include it when the frontend needs details (file sizes, limits, IDs).

## Error Location Rules <!-- enforced-by: eslint -->

| Error Type | Package | Example |
|---|---|---|
| Base / infrastructure | `@repo/db/errors` | `DbError`, `ForbiddenError`, `ValidationError` |
| Document / Podcast | `@repo/media/errors` | `DocumentNotFound`, `PodcastNotFound` |
| AI / LLM / TTS | `@repo/ai/errors` | `LLMError`, `TTSError` |
| Storage | `@repo/storage/errors` | `StorageError` |
| Queue / jobs | `@repo/queue/errors` | `QueueError`, `JobNotFoundError` |
| Auth / policy | `@repo/auth/errors` | `PolicyError` |

Import from the owning package, never cross-import domain errors through `@repo/db`.

## Log Levels <!-- enforced-by: manual-review -->

| Level | When | Examples |
|---|---|---|
| `silent` | Expected -- user mistakes, not-found | `NotFound`, `Unauthorized`, `ValidationError` |
| `warn` | Unusual but not critical | `RateLimited`, `QuotaExceeded` |
| `error` | Unexpected failures | `DatabaseError`, `ExternalServiceError` |
| `error-with-stack` | Internal errors needing debug | `UnexpectedError` |

## HTTP Status Decision Table <!-- enforced-by: manual-review -->

| Status | When | Typical Errors |
|---|---|---|
| 400 | Bad request / validation | `ValidationError` |
| 401 | Not authenticated | `Unauthorized` |
| 403 | Not authorized | `Forbidden` |
| 404 | Resource not found | `DocumentNotFound`, `PodcastNotFound` |
| 409 | Conflict | `AlreadyExists`, `VersionConflict` |
| 429 | Rate limited | `RateLimited` |
| 500 | Internal | `DatabaseError` |
| 503 | Service unavailable | `ExternalServiceError` |

## Error Type Inference <!-- enforced-by: types -->

Use cases must NOT manually annotate error types. Let Effect infer, then export a derived alias:

```typescript
// In the use case file -- return type is inferred
export const createDocument = (input: CreateDocumentInput) =>
  Effect.gen(function* () { /* ... */ }).pipe(Effect.withSpan('useCase.createDocument'));

// Derived alias for consumers / tests
export type CreateDocumentError = Effect.Effect.Error<ReturnType<typeof createDocument>>;
```

## Protocol Interface

> See `packages/db/src/error-protocol.ts`

```typescript
export interface HttpErrorProtocol {
  readonly httpStatus: number;
  readonly httpCode: string;
  readonly httpMessage: string | ((error: any) => string);
  readonly logLevel: 'silent' | 'warn' | 'error' | 'error-with-stack';
  getData?: (error: any) => Record<string, unknown>;
}
```

## Adding a New Error <!-- enforced-by: types -->

1. Define the class with all HTTP protocol statics in the owning package's `errors.ts`
2. Export it
3. Done -- `handleEffectWithProtocol` reads the protocol automatically; no handler updates needed
