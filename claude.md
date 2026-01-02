# Claude Code Guide

This document provides context for Claude when working on this codebase.

## Project Overview

Content Studio is a podcast generation platform that converts documents into AI-generated podcasts. The stack is:

- **Frontend**: React + TanStack Router + TanStack Query
- **Backend**: Hono + oRPC + Effect
- **Database**: PostgreSQL + Drizzle ORM
- **AI**: Google Gemini (LLM + TTS)
- **Storage**: S3-compatible (R2/MinIO)

## Architecture Patterns

### Effect-TS Patterns

This codebase uses [Effect](https://effect.website) extensively. Key patterns:

#### 1. Shared ManagedRuntime

A single `ManagedRuntime` is created at server startup and shared across all requests:

```typescript
// packages/api/src/server/runtime.ts
const runtime = createServerRuntime({ db, geminiApiKey, storageConfig });

// Reused for all requests
await runtime.runPromise(effect);
```

**Never** create a new runtime per request.

#### 2. FiberRef for User Context

User context is passed via `FiberRef`, not `Context.Tag`:

```typescript
// Get current user (fails if not authenticated)
const user = yield* getCurrentUser;

// Scope user to a fiber subtree
yield* withCurrentUser(user)(myEffect);
```

**Never** use `CurrentUserLive` layer pattern.

#### 3. Service Dependencies

Services declare dependencies without `CurrentUser`:

```typescript
// Correct - no CurrentUser in type
export type DocumentContext = Db | Storage;

// Inside service methods, read from FiberRef
const user = yield* getCurrentUser;
```

#### 4. Effect-Based Serialization

Use the serialization utilities for DB → API conversion:

```typescript
// Effect-based (with tracing) - preferred in handlers
const output = yield* serializeDocumentEffect(doc);
const outputs = yield* serializeDocumentsEffect(docs);

// Sync (for simple map callbacks)
const outputs = docs.map(serializeDocument);
```

Each entity has three serializer variants:
- `serializeXxxEffect` - Effect with tracing
- `serializeXxxsEffect` - Batch with parallel execution
- `serializeXxx` - Sync for map callbacks

#### 5. Handler Pattern (Protocol-Based)

API handlers use `handleEffectWithProtocol()` which automatically maps errors based on HTTP protocol properties defined on error classes:

```typescript
return handleEffectWithProtocol(
  context.runtime,
  context.user,
  getDocument({ id: input.id }).pipe(
    Effect.flatMap(serializeDocumentEffect)
  ),
  errors,
  { span: 'api.documents.get', attributes: { 'document.id': input.id } },
);
```

**Key points:**
- Call ONE use case per handler (no direct repo access from handlers)
- Use Effect-based serializers via `Effect.flatMap()` or `Effect.map()`
- Always provide tracing span and attributes
- Errors are handled automatically via HTTP protocol on error classes
- Custom error overrides are RARE - only for business logic (e.g., upsell)

### Branded ID Types

All entity IDs use branded types with prefixes:

```typescript
type PodcastId = string & Brand<"PodcastId">;      // pod_xxx
type DocumentId = string & Brand<"DocumentId">;    // doc_xxx
type ScriptVersionId = string & Brand<"ScriptVersionId">; // ver_xxx
type JobId = string & Brand<"JobId">;              // job_xxx
```

When accepting IDs from external sources (API params, job payloads), cast to branded type:

```typescript
const job = yield* queue.getJob(jobId as JobId);
```

### Error Handling

#### Error Definition with HTTP Protocol

Errors extend `Schema.TaggedError` and include static HTTP protocol properties:

```typescript
export class DocumentNotFound extends Schema.TaggedError<DocumentNotFound>()(
  'DocumentNotFound',
  { id: Schema.String, message: Schema.optional(Schema.String) },
) {
  // HTTP Protocol - co-located with error definition
  static readonly httpStatus = 404 as const;
  static readonly httpCode = 'DOCUMENT_NOT_FOUND' as const;
  static readonly httpMessage = (e: DocumentNotFound) =>
    e.message || `Document ${e.id} not found`;
  static readonly logLevel = 'silent' as const;

  // Optional: extract data for response body
  static getData(e: DocumentNotFound) {
    return { documentId: e.id };
  }
}
```

**Required properties:**
- `httpStatus` - HTTP status code (404, 500, etc.)
- `httpCode` - Error code for clients (DOCUMENT_NOT_FOUND, etc.)
- `httpMessage` - Message string or function
- `logLevel` - 'silent' | 'warn' | 'error' | 'error-with-stack'

**Optional:**
- `getData()` - Extract structured data for response body

Error channels must be explicit in Effect types:

```typescript
Effect.Effect<Document, DocumentNotFound | DatabaseError, Db>
```

#### Use Case Pattern

Use cases follow this structure:

```typescript
// packages/media/src/{domain}/use-cases/{action}.ts

export interface ActionInput {
  id: string;
}

export interface ActionResult {
  // Raw domain data, NOT serialized
}

export type ActionError =
  | DomainNotFound
  | DatabaseError;

export const actionName = (
  input: ActionInput
): Effect.Effect<ActionResult, ActionError, Dependencies> =>
  Effect.gen(function* () {
    const repo = yield* DomainRepo;
    const result = yield* repo.findById(input.id);
    return result;
  }).pipe(
    Effect.withSpan('useCase.action', {
      attributes: { 'domain.id': input.id }
    })
  );
```

**Rules:**
1. One file per use case
2. Explicit error type union
3. Return raw domain data (serialization happens in handler)
4. Always add tracing span

## Package Structure

```
packages/
├── api/          # oRPC contracts + server implementation
├── auth/         # Authentication + authorization (better-auth + policies)
├── db/           # Drizzle schema + Effect layer
├── media/        # Document + Podcast business logic
├── queue/        # Job queue implementation
├── storage/      # S3/filesystem abstraction
├── ai/           # LLM + TTS services
├── testing/      # Test utilities + factories
└── ui/           # Shared React components

apps/
├── web/          # React frontend
└── server/       # Hono API server + workers
```

## Key Files

| File | Purpose |
|------|---------|
| `packages/api/src/server/runtime.ts` | Shared runtime creation |
| `packages/auth/src/policy/user.ts` | FiberRef user context |
| `packages/db/src/schemas/serialization.ts` | Serialization utilities |
| `packages/db/src/schemas/*.ts` | Entity schemas + serializers |
| `apps/server/src/workers/podcast-worker.ts` | Background job processing |

## Common Commands

```bash
pnpm typecheck          # Type check all packages
pnpm build              # Build all packages
pnpm dev                # Start dev servers
pnpm test               # Run tests

# Package-specific
pnpm --filter @repo/db typecheck
pnpm --filter web dev
```

## Testing Patterns

### Effect Tests

Use `withTestUser` for user context in tests:

```typescript
import { withTestUser } from '@repo/testing';

const result = await Effect.runPromise(
  withTestUser(testUser)(myEffect)
);
```

### Factories

Use factories from `@repo/testing` for test data:

```typescript
import { DocumentFactory, PodcastFactory } from '@repo/testing';

const doc = DocumentFactory.build({ title: 'Test Doc' });
```

## What NOT to Do

1. **Don't create ManagedRuntime per request** - use shared runtime
2. **Don't use CurrentUserLive layer** - use `withCurrentUser` FiberRef
3. **Don't include CurrentUser in service deps** - read from FiberRef
4. **Don't use plain serializer functions in handlers** - use Effect variants for tracing
5. **Don't access repos directly from handlers** - call use cases instead
6. **Don't use legacy `handleEffect()` with manual error mapping** - use `handleEffectWithProtocol()`

## Documentation

- `docs/retrospective.md` - Detailed explanation of patterns with before/after examples
- `IMPLEMENTATION_PLAN.md` - Router pattern standardization plan with detailed patterns
