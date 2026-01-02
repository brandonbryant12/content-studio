# PRD: Router Pattern Standardization

## Overview

Standardize the oRPC router pattern across all routers to ensure consistent architecture, testability, and maintainability. Each router handler should call a single use case, use Effect-based serialization, and have comprehensive unit and integration tests.

## Key Decisions

| Decision | Choice |
|----------|--------|
| Documents architecture | Convert service to use cases + DocumentRepo (like podcast) |
| Voices router | Create use cases for full consistency |
| Integration tests | Direct handler calls (faster than HTTP) |
| Error handling | Hybrid approach: HTTP protocol on errors + optional custom overrides |

## Validation Commands

After each change, run these commands to validate:

```bash
# Type check all packages
pnpm typecheck

# Run all tests
pnpm test

# Build all packages
pnpm build
```

**Per-package validation:**
```bash
# Type check specific package
pnpm --filter @repo/media typecheck
pnpm --filter @repo/api typecheck
pnpm --filter @repo/ai typecheck

# Run tests for specific package
pnpm --filter @repo/media test
pnpm --filter @repo/api test

# Build specific package
pnpm --filter @repo/media build
```

**Validation checkpoints:**
- After creating DocumentRepo: `pnpm --filter @repo/media typecheck`
- After each use case: `pnpm --filter @repo/media test`
- After router refactor: `pnpm --filter @repo/api typecheck && pnpm --filter @repo/api test`
- Before committing: `pnpm typecheck && pnpm test && pnpm build`

---

## Current State Analysis

### Inconsistencies Found

| Area | Issue |
|------|-------|
| **Use Cases** | Some handlers call use cases, others access repos directly |
| **Serialization** | Sync serializers used instead of Effect-based (loses tracing) |
| **Tracing** | Inconsistent - some handlers have `{ span, attributes }`, others don't |
| **Pattern** | Mixed `Effect.pipe()` vs `Effect.gen()` in same router |
| **Testing** | No integration tests for routers exist |

### Current Files

**Routers:**
- `packages/api/src/server/router/document.ts` - 6 handlers, accesses Documents service directly
- `packages/api/src/server/router/podcast.ts` - 8 handlers, mixed patterns
- `packages/api/src/server/router/voices.ts` - 2 handlers, accesses TTS directly

**Use Cases (good examples):**
- `packages/media/src/podcast/use-cases/*.ts` - 12 use cases, well-structured

**Missing:**
- Document use cases (handlers access service directly)
- Router integration tests

---

## Standardized Pattern

### 1. Router Handler Pattern

Every handler MUST follow this structure:

```typescript
handlerName: protectedProcedure.domain.action.handler(
  async ({ context, input, errors }) => {
    const handlers = createErrorHandlers(errors);

    return handleEffect(
      context.runtime,
      context.user,
      useCaseName(input).pipe(
        Effect.flatMap(serializeResultEffect)  // Effect-based serializer
      ),
      {
        ...handlers.common,
        ...handlers.database,
        // Domain-specific handlers
        DomainNotFound: (e) => { throw errors.DOMAIN_NOT_FOUND({ ... }); },
      },
      {
        span: 'api.domain.action',
        attributes: { 'domain.id': input.id }
      }
    );
  }
)
```

**Rules:**
1. Call ONE use case per handler (no direct repo access)
2. Use Effect-based serializers via `Effect.flatMap()` or `Effect.map()`
3. Always provide tracing span and attributes
4. Spread common error handlers, add domain-specific overrides

### 2. Use Case Pattern

Every use case MUST follow this structure:

```typescript
// packages/media/src/{domain}/use-cases/{action}.ts

// ============================================================================
// Types
// ============================================================================

export interface ActionInput {
  // Input fields (validated by oRPC schema before reaching here)
}

export interface ActionResult {
  // Output fields (raw domain data, NOT serialized)
}

export type ActionError =
  | DomainNotFound
  | DatabaseError
  // ... explicit error union

// ============================================================================
// Use Case
// ============================================================================

export const actionName = (
  input: ActionInput
): Effect.Effect<ActionResult, ActionError, Dependencies> =>
  Effect.gen(function* () {
    // 1. Yield dependencies
    const repo = yield* DomainRepo;

    // 2. Business logic
    const result = yield* repo.findById(input.id);

    // 3. Return raw domain data
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
5. Dependencies explicit in Effect type signature

### 3. Serialization Pattern

Use Effect-based serializers for tracing:

```typescript
// In handler - batch serialization
useCase(input).pipe(
  Effect.flatMap((items) => serializeItemsEffect(items))
)

// In handler - single item
useCase(input).pipe(
  Effect.flatMap((item) => serializeItemEffect(item))
)
```

**Never use:**
```typescript
// BAD - loses tracing
useCase(input).pipe(
  Effect.map((items) => items.map(serializeItem))
)
```

### 4. Error Handling Pattern (Hybrid Protocol + Overrides)

**Problem:** Currently, adding a new error requires updating two places:
1. Error definition in `packages/db/src/errors.ts`
2. Error handler in `packages/api/src/server/effect-handler.ts` (`createErrorHandlers`)

**Solution:** Each error defines its HTTP behavior via static properties. A generic handler reads these properties automatically. Custom handlers can override when needed.

#### Error Definition with HTTP Protocol

Every error MUST include static HTTP metadata:

```typescript
// packages/db/src/errors.ts (or domain-specific error file)
export class DocumentNotFound extends Schema.TaggedError<DocumentNotFound>()(
  'DocumentNotFound',
  { id: Schema.String, message: Schema.optional(Schema.String) },
) {
  // HTTP Protocol - co-located with error definition
  static readonly httpStatus = 404;
  static readonly httpCode = 'DOCUMENT_NOT_FOUND';
  static readonly httpMessage = (e: DocumentNotFound) =>
    e.message ?? `Document ${e.id} not found`;
  static readonly logLevel = 'silent' as const;

  // Optional: extract data for response body
  static getData(e: DocumentNotFound) {
    return { documentId: e.id };
  }
}
```

#### HTTP Protocol Interface

```typescript
// packages/db/src/error-protocol.ts
export interface HttpErrorProtocol {
  readonly httpStatus: number;
  readonly httpCode: string;
  readonly httpMessage: string | ((error: any) => string);
  readonly logLevel: 'silent' | 'warn' | 'error' | 'error-with-stack';
  getData?: (error: any) => Record<string, unknown>;
}

// Log levels:
// - 'silent': No logging (expected errors like NotFound)
// - 'warn': Warning level (unusual but not critical)
// - 'error': Error level (unexpected errors)
// - 'error-with-stack': Error with full stack trace (internal errors)
```

#### Generic Handler

```typescript
// packages/api/src/server/effect-handler.ts

/**
 * Generic error handler that reads HTTP protocol from error class.
 * Works with any error that implements HttpErrorProtocol.
 */
export const handleTaggedError = <E extends { _tag: string }>(
  error: E,
  errors: ErrorFactory,
): never => {
  const ErrorClass = error.constructor as { new (...args: any[]): E } & Partial<HttpErrorProtocol>;

  // Log based on level
  const logLevel = ErrorClass.logLevel ?? 'error';
  switch (logLevel) {
    case 'error-with-stack':
      console.error(`[${error._tag}]`, error.message, { stack: error.cause?.stack });
      break;
    case 'error':
      console.error(`[${error._tag}]`, error.message);
      break;
    case 'warn':
      console.warn(`[${error._tag}]`, error.message);
      break;
  }

  // Get message
  const httpMessage = ErrorClass.httpMessage;
  const message = typeof httpMessage === 'function'
    ? httpMessage(error)
    : httpMessage ?? 'An error occurred';

  // Get data and throw
  const data = ErrorClass.getData?.(error);
  const code = ErrorClass.httpCode ?? 'INTERNAL_ERROR';
  const factory = errors[code as keyof typeof errors];

  if (factory) {
    throw factory({ message, data });
  }
  throw errors.INTERNAL_ERROR({ message });
};
```

#### Handler Usage (Simplified)

```typescript
// Most handlers - no error mapping needed!
get: protectedProcedure.documents.get.handler(
  async ({ context, input, errors }) => {
    return handleEffect(
      context.runtime,
      context.user,
      getDocument({ id: input.id }).pipe(
        Effect.flatMap(serializeDocumentEffect)
      ),
      errors,  // Just pass errors factory, generic handler does the rest
      { span: 'api.documents.get', attributes: { 'document.id': input.id } },
    );
  },
),

// Complex cases - override specific errors
create: protectedProcedure.documents.create.handler(
  async ({ context, input, errors }) => {
    return handleEffect(
      context.runtime,
      context.user,
      createDocument(input).pipe(
        Effect.flatMap(serializeDocumentEffect)
      ),
      errors,
      { span: 'api.documents.create' },
      {
        // Override only errors needing custom logic
        DocumentQuotaExceeded: (e) => {
          throw errors.PAYMENT_REQUIRED({
            message: 'Upgrade to create more documents',
            data: { currentCount: e.count, limit: e.limit },
          });
        },
      },
    );
  },
),
```

**Rules:**
1. Every error class MUST have static `httpStatus`, `httpCode`, `httpMessage`, and `logLevel`
2. Use `getData()` for errors that need to return structured data
3. Default to generic handler - only add custom handlers for special cases
4. Keep error definitions and HTTP behavior co-located

**Benefits:**
- Add new error = 1 file change (error definition with static props)
- No need to update central handler factory
- Custom overrides still available when needed
- Type-safe via protocol interface

---

## Implementation Plan

### Phase 0: Error Handling Infrastructure

**Goal:** Implement the hybrid error handling pattern before refactoring routers.

1. Create `HttpErrorProtocol` interface in `packages/db/src/error-protocol.ts`
2. Add `handleTaggedError` generic handler to `packages/api/src/server/effect-handler.ts`
3. Update `handleEffect` signature to support optional custom overrides
4. Migrate existing errors to include static HTTP properties (can be done incrementally)

**Files to create/modify:**
- `packages/db/src/error-protocol.ts` (new)
- `packages/db/src/errors.ts` (add static props to existing errors)
- `packages/api/src/server/effect-handler.ts` (add generic handler, update handleEffect)

**Validation:** `pnpm --filter @repo/db typecheck && pnpm --filter @repo/api typecheck`

### Phase 1: Create Document Use Cases (Convert from Service Pattern)

**Decision:** Convert Documents service to individual use cases that access DocumentRepo directly (matching podcast pattern).

Create use cases in `packages/media/src/document/use-cases/`:

| Use Case | File | Description |
|----------|------|-------------|
| `listDocuments` | `list-documents.ts` | List with pagination |
| `getDocument` | `get-document.ts` | Get single document |
| `getDocumentContent` | `get-document-content.ts` | Get document text content |
| `createDocument` | `create-document.ts` | Create from manual input |
| `uploadDocument` | `upload-document.ts` | Upload file |
| `updateDocument` | `update-document.ts` | Update metadata/content |
| `deleteDocument` | `delete-document.ts` | Delete document |

**Note:** The existing `packages/media/src/document/repository.ts` will become `DocumentRepo` (Context.Tag service like PodcastRepo). The Documents service will be deprecated.

### Phase 2: Refactor Document Router

Update `packages/api/src/server/router/document.ts`:
- Replace direct `Documents` service calls with use cases
- Add tracing to all handlers
- Use Effect-based serializers

### Phase 3: Standardize Podcast Router

Update `packages/api/src/server/router/podcast.ts`:
- Ensure all handlers use use cases (some already do)
- Add tracing to handlers missing it
- Use Effect-based serializers consistently

### Phase 4: Create TTS Use Cases & Standardize Voices Router

**Decision:** Create full use cases for consistency across all routers.

Create use cases in `packages/ai/src/tts/use-cases/`:

| Use Case | File | Description |
|----------|------|-------------|
| `listVoices` | `list-voices.ts` | List available voices with optional gender filter |
| `previewVoice` | `preview-voice.ts` | Generate voice preview audio |

Update `packages/api/src/server/router/voices.ts`:
- Replace direct TTS service calls with use cases
- Add consistent tracing spans
- Standardize error handling pattern

### Phase 5: Unit Tests for Use Cases

Add comprehensive tests in `packages/media/src/document/use-cases/*.test.ts`:

```typescript
describe('listDocuments', () => {
  it('returns paginated documents for user', async () => { ... });
  it('returns empty list when no documents', async () => { ... });
  it('respects limit and offset', async () => { ... });
  it('fails with DatabaseError on db failure', async () => { ... });
});
```

**Test pattern:**
- Use `createTestContext()` for DB isolation
- Use `withTestUser()` for user context
- Use factories for test data
- Test success paths AND error paths

### Phase 6: Integration Tests for Routers

**Decision:** Use direct handler calls (faster, simpler than HTTP testing).

Create `packages/api/src/server/router/__tests__/`:

```typescript
// document.integration.test.ts
import { createTestContext } from '@repo/testing';
import { createServerRuntime } from '../runtime';
import { documentRouter } from '../document';

describe('Document Router Integration', () => {
  let ctx: TestContext;
  let runtime: ServerRuntime;

  beforeEach(async () => {
    ctx = await createTestContext();
    runtime = createServerRuntime({
      db: ctx.db,
      geminiApiKey: 'test-key',
      storageConfig: { type: 'memory' },
      useMockAI: true,
    });
  });

  afterEach(async () => {
    await ctx.rollback();
  });

  describe('documents.create', () => {
    it('creates document and returns serialized response', async () => {
      const testUser = createTestUser();
      const mockContext = createMockContext(runtime, testUser);
      const mockErrors = createMockErrors();

      const result = await documentRouter.create.handler({
        context: mockContext,
        input: { title: 'Test', content: 'Hello world' },
        errors: mockErrors,
      });

      expect(result.id).toMatch(/^doc_/);
      expect(result.title).toBe('Test');
      expect(result.createdAt).toBeDefined(); // Serialized format
    });

    it('throws UNAUTHORIZED when user is null', async () => {
      const mockContext = createMockContext(runtime, null);
      // ... test unauthorized error
    });
  });
});
```

**Test helper utilities to create:**
```typescript
// packages/api/src/server/router/__tests__/helpers.ts
export const createMockContext = (runtime: ServerRuntime, user: User | null) => ({
  runtime,
  user,
  session: user ? { user } : null,
});

export const createMockErrors = () => ({
  DOCUMENT_NOT_FOUND: (opts) => new ORPCError('NOT_FOUND', opts),
  INTERNAL_ERROR: (opts) => new ORPCError('INTERNAL_SERVER_ERROR', opts),
  // ... other error factories
});
```

**Test patterns:**
- Direct handler function calls (no HTTP overhead)
- Mock AI services via `useMockAI: true`
- Use in-memory storage
- Test authentication (null user)
- Test authorization (wrong user)
- Test error responses (not found, validation)
- Verify serialized output format matches API contract

---

## Success Criteria

### Code Quality
- [ ] All routers follow the standardized handler pattern
- [ ] All handlers call exactly one use case
- [ ] All handlers use Effect-based serializers
- [ ] All handlers have tracing spans with attributes
- [ ] No direct repository access from handlers

### Error Handling
- [ ] All errors have static HTTP protocol properties (`httpStatus`, `httpCode`, `httpMessage`, `logLevel`)
- [ ] `handleEffect` uses generic handler by default
- [ ] Custom error overrides only used when necessary
- [ ] No need to update central handler factory when adding new errors

### Test Coverage
- [ ] Every use case has unit tests covering:
  - [ ] Success path
  - [ ] All error conditions
  - [ ] Edge cases (empty results, pagination)
- [ ] Every router has integration tests covering:
  - [ ] All endpoints
  - [ ] Authentication/authorization
  - [ ] Input validation
  - [ ] Error responses
  - [ ] Response serialization format

### Documentation
- [ ] Pattern documented in CLAUDE.md
- [ ] Example use case template available
- [ ] Example test template available

---

## Files to Create/Modify

### New Files
```
packages/db/src/error-protocol.ts     # HttpErrorProtocol interface

packages/media/src/document/use-cases/
├── index.ts
├── list-documents.ts
├── list-documents.test.ts
├── get-document.ts
├── get-document.test.ts
├── get-document-content.ts
├── get-document-content.test.ts
├── create-document.ts
├── create-document.test.ts
├── upload-document.ts
├── upload-document.test.ts
├── update-document.ts
├── update-document.test.ts
├── delete-document.ts
└── delete-document.test.ts

packages/ai/src/tts/use-cases/
├── index.ts
├── list-voices.ts
├── list-voices.test.ts
├── preview-voice.ts
└── preview-voice.test.ts

packages/media/src/document/repos/
├── index.ts
├── document-repo.ts              # Convert from repository.ts to Context.Tag pattern
└── document-repo.test.ts

packages/api/src/server/router/__tests__/
├── document.integration.test.ts
├── podcast.integration.test.ts
└── voices.integration.test.ts
```

### Modified Files
```
packages/db/src/errors.ts (add static HTTP protocol props to all errors)
packages/api/src/server/effect-handler.ts (add handleTaggedError, update handleEffect)
packages/api/src/server/router/document.ts
packages/api/src/server/router/podcast.ts
packages/api/src/server/router/voices.ts
packages/media/src/index.ts (export new use cases)
packages/media/src/document/index.ts (export use cases)
packages/ai/src/index.ts (export TTS use cases)
CLAUDE.md (document pattern)
```

### Deprecated/Removed Files
```
packages/media/src/document/service.ts        # Documents service → replaced by use cases
packages/media/src/document/live.ts           # DocumentsLive layer → replaced by DocumentRepoLive
packages/media/src/document/repository.ts     # Rename to repos/document-repo.ts with Context.Tag

# Error handling (replaced by generic handler + HTTP protocol)
packages/api/src/server/effect-handler.ts:
  - createErrorHandlers()                     # Replaced by handleTaggedError + HTTP protocol on errors
```

---

## Execution Order

### Sprint 0: Error Handling Infrastructure (Foundation) ✅ COMPLETED
0. ✅ Create `HttpErrorProtocol` interface in `packages/db/src/error-protocol.ts`
1. ✅ Add `handleTaggedError` to `packages/api/src/server/effect-handler.ts`
2. ✅ Add `handleEffectWithProtocol` (new protocol-based handler, keeps `handleEffect` for backward compatibility)
3. ✅ Add static HTTP props to ALL errors (httpStatus, httpCode, httpMessage, logLevel, getData)
   - **Sprint checkpoint**: `pnpm typecheck && pnpm test && pnpm build` ✅

### Sprint 1: Document Module (Foundation)
1. Create `DocumentRepo` as Context.Tag service (convert from repository.ts)
   - Validate: `pnpm --filter @repo/media typecheck`
2. Create document use cases (7 files)
   - Validate after each: `pnpm --filter @repo/media typecheck`
3. Add HTTP protocol props to document-related errors (DocumentNotFound, etc.)
   - Validate: `pnpm --filter @repo/db typecheck`
4. Write document use case unit tests
   - Validate: `pnpm --filter @repo/media test`
5. Refactor document router to use use cases (using new simplified error handling)
   - Validate: `pnpm --filter @repo/api typecheck`
6. Write document router integration tests
   - Validate: `pnpm --filter @repo/api test`
   - **Sprint checkpoint**: `pnpm typecheck && pnpm test && pnpm build`

### Sprint 2: Podcast Module (Standardize)
1. Add HTTP protocol props to podcast-related errors (PodcastNotFound, ScriptNotFound, etc.)
   - Validate: `pnpm --filter @repo/db typecheck`
2. Standardize podcast router (using new simplified error handling)
   - Validate: `pnpm --filter @repo/api typecheck`
3. Add missing podcast use case tests
   - Validate: `pnpm --filter @repo/media test`
4. Write podcast router integration tests
   - Validate: `pnpm --filter @repo/api test`
   - **Sprint checkpoint**: `pnpm typecheck && pnpm test && pnpm build`

### Sprint 3: Voices Module (Complete)
1. Create TTS use cases (listVoices, previewVoice)
   - Validate: `pnpm --filter @repo/ai typecheck`
2. Add HTTP protocol props to TTS-related errors (TTSError, TTSQuotaExceededError, etc.)
   - Validate: `pnpm --filter @repo/db typecheck`
3. Write TTS use case tests
   - Validate: `pnpm --filter @repo/ai test`
4. Refactor voices router to use use cases (using new simplified error handling)
   - Validate: `pnpm --filter @repo/api typecheck`
5. Write voices router integration tests
   - Validate: `pnpm --filter @repo/api test`
   - **Sprint checkpoint**: `pnpm typecheck && pnpm test && pnpm build`

### Sprint 4: Documentation & Cleanup
1. Update CLAUDE.md with standardized patterns (including error handling)
2. Remove deprecated Documents service files
3. Remove deprecated `createErrorHandlers` factory (replaced by generic handler)
4. Update Media type export (remove Documents, add DocumentRepo)
   - **Final validation**: `pnpm typecheck && pnpm test && pnpm build`
