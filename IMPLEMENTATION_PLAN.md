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

### Error Handling Gap (Post-Phase 0 Audit)

> **Grade: 68/100** - Excellent architecture, incomplete adoption.

**Infrastructure Ready (Phase 0 Complete):**
- ✅ `HttpErrorProtocol` interface defined
- ✅ `handleTaggedError()` generic handler implemented
- ✅ `handleEffectWithProtocol()` ready to use
- ✅ All 30+ errors have static HTTP metadata

**Routers NOT Migrated (Current State):**
- ❌ All routers still use deprecated `createErrorHandlers()` + `handleEffect()`
- ❌ Manual `getErrorProp()` extraction duplicates what error classes already define
- ❌ Document router has **zero tracing spans**
- ❌ ~200 lines of boilerplate error mapping that protocol should eliminate

**Example of Current Waste:**
```typescript
// document.ts:41-48 - This is redundant!
DocumentNotFound: (e: unknown) => {
  const id = getErrorProp(e, 'id', 'unknown');           // Already on class
  const message = getErrorProp(e, 'message', undefined); // Already on class
  throw errors.DOCUMENT_NOT_FOUND({
    message: message ?? `Document ${id} not found`,      // Class has httpMessage
    data: { documentId: id },                            // Class has getData()
  });
},
```

**Target State:**
```typescript
// Zero error mapping - protocol handles it
return handleEffectWithProtocol(context.runtime, context.user, effect, errors, { span });
```

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

> ⚠️ **REMINDER:** Use `handleEffectWithProtocol()`, NOT the legacy `handleEffect()` + `createErrorHandlers()` pattern. The infrastructure is ready (Phase 0 complete) but routers haven't been migrated yet.

Every handler MUST follow this structure:

```typescript
handlerName: protectedProcedure.domain.action.handler(
  async ({ context, input, errors }) => {
    // ✅ USE THIS - protocol handles all error mapping automatically
    return handleEffectWithProtocol(
      context.runtime,
      context.user,
      useCaseName(input).pipe(
        Effect.flatMap(serializeResultEffect)  // Effect-based serializer
      ),
      errors,
      { span: 'api.domain.action', attributes: { 'domain.id': input.id } },
      // Optional: custom overrides only when truly needed
    );
  }
)
```

**❌ DO NOT USE (Legacy Pattern):**
```typescript
// This is the OLD pattern - creates unnecessary boilerplate
const handlers = createErrorHandlers(errors);
return handleEffect(runtime, user, effect, {
  ...handlers.common,
  ...handlers.database,
  DocumentNotFound: (e) => { /* redundant extraction */ },
}, { span });
```

**Rules:**
1. Call ONE use case per handler (no direct repo access)
2. Use Effect-based serializers via `Effect.flatMap()` or `Effect.map()`
3. Always provide tracing span and attributes
4. Use `handleEffectWithProtocol()` - only add custom handlers for truly special cases

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

#### Handler Usage

```typescript
// Standard handler - protocol handles all error mapping automatically
get: protectedProcedure.documents.get.handler(
  async ({ context, input, errors }) => {
    return handleEffectWithProtocol(
      context.runtime,
      context.user,
      getDocument({ id: input.id }).pipe(
        Effect.flatMap(serializeDocumentEffect)
      ),
      errors,
      { span: 'api.documents.get', attributes: { 'document.id': input.id } },
    );
  },
),

// Rare case - custom override for business logic (e.g., upsell)
create: protectedProcedure.documents.create.handler(
  async ({ context, input, errors }) => {
    return handleEffectWithProtocol(
      context.runtime,
      context.user,
      createDocument(input).pipe(
        Effect.flatMap(serializeDocumentEffect)
      ),
      errors,
      { span: 'api.documents.create' },
      {
        // Override ONLY when business logic requires different response
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
3. Use `handleEffectWithProtocol()` - NEVER use legacy `handleEffect()` + `createErrorHandlers()`
4. Custom overrides are RARE - only for business logic (e.g., upsell, special redirects)
5. ALWAYS include `{ span, attributes }` for tracing

**Benefits:**
- Add new error = 1 file change (error definition with static props)
- Zero boilerplate error handlers in routers
- Consistent tracing across all endpoints
- Type-safe via protocol interface

---

## Implementation Plan

> ⚠️ **FULL REFACTOR - NO BACKWARDS COMPATIBILITY REQUIRED**
>
> This is a clean migration. Delete legacy code immediately - do not maintain both patterns.
> - Remove `createErrorHandlers()` usage as you migrate each router
> - Remove `getErrorProp()` calls - protocol handles property extraction
> - Delete deprecated files, don't deprecate-and-keep 

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
- [ ] All routers use `handleEffectWithProtocol()` (NOT legacy `handleEffect()`)
- [ ] Zero `createErrorHandlers()` calls remain in codebase
- [ ] Zero `getErrorProp()` calls remain in codebase
- [ ] All errors have static HTTP protocol properties (`httpStatus`, `httpCode`, `httpMessage`, `logLevel`)
- [ ] Custom error overrides only used when truly necessary (rare)
- [ ] Legacy error handling code deleted from `effect-handler.ts`

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

### Frontend Error Handling
- [ ] All `onError` handlers use `isDefinedError` or centralized error utility
- [ ] Document errors show structured data (`DOCUMENT_TOO_LARGE` shows file size details)
- [ ] Format errors show supported formats list (`UNSUPPORTED_FORMAT`)
- [ ] Rate limit errors show retry timing when available (`RATE_LIMITED`)
- [ ] No `error.message ?? 'fallback'` patterns remain in codebase
- [ ] Error formatting utility created with tests (`apps/web/src/lib/errors.ts`)

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

### Frontend Files (Sprint 5)
```
apps/web/src/lib/errors.ts                    # Error formatting utilities (new)
apps/web/src/lib/errors.test.ts               # Tests for error formatting (new)

# Files to modify (add isDefinedError usage):
apps/web/src/routes/_protected/documents/-components/upload-document.tsx
apps/web/src/routes/_protected/documents/index.tsx
apps/web/src/routes/_protected/podcasts/index.tsx
apps/web/src/routes/_protected/podcasts/$podcastId.tsx
apps/web/src/routes/_protected/podcasts/-components/setup/setup-wizard.tsx
apps/web/src/routes/_protected/podcasts/-components/setup/steps/step-documents.tsx
apps/web/src/routes/_protected/dashboard.tsx
apps/web/src/hooks/use-podcast-generation.ts
apps/web/src/hooks/use-podcast-settings.ts
apps/web/src/hooks/use-script-editor.ts
apps/web/src/hooks/use-optimistic-podcast-mutation.ts
```

### Deprecated/Removed Files
```
packages/media/src/document/service.ts        # Documents service → replaced by use cases
packages/media/src/document/live.ts           # DocumentsLive layer → replaced by DocumentRepoLive
packages/media/src/document/repository.ts     # Rename to repos/document-repo.ts with Context.Tag

# Legacy error handling code to DELETE from effect-handler.ts:
packages/api/src/server/effect-handler.ts:
  - createErrorHandlers()                     # DELETE - replaced by handleEffectWithProtocol
  - getErrorProp()                            # DELETE - unsafe, protocol handles property extraction
  - logAndThrowInternal()                     # DELETE - protocol handles logging
  - LegacyErrorFactoryConfig interface        # DELETE - not needed
  - ErrorHandler type                         # DELETE - not needed

# KEEP in effect-handler.ts:
  - handleEffectWithProtocol()                # Main API handler
  - handleTaggedError()                       # Generic protocol handler
  - handleORPCError()                         # Validation error handler
  - ErrorFactory interface                    # Used by handlers
  - HandleEffectOptions interface             # Used by handlers
```

---

## Execution Order

### Sprint 0: Error Handling Infrastructure (Foundation) ✅ COMPLETED
0. ✅ Create `HttpErrorProtocol` interface in `packages/db/src/error-protocol.ts`
1. ✅ Add `handleTaggedError` to `packages/api/src/server/effect-handler.ts`
2. ✅ Add `handleEffectWithProtocol` (new protocol-based handler, keeps `handleEffect` for backward compatibility)
3. ✅ Add static HTTP props to ALL errors (httpStatus, httpCode, httpMessage, logLevel, getData)
   - **Sprint checkpoint**: `pnpm typecheck && pnpm test && pnpm build` ✅

### Sprint 1: Document Module (Foundation) ✅ COMPLETED

> ⚠️ **Error Handling Reminder:** Document router currently has **zero tracing** and uses legacy pattern. When refactoring (step 5), use `handleEffectWithProtocol()` and add spans to ALL handlers.

1. ✅ Create `DocumentRepo` as Context.Tag service (convert from repository.ts)
   - Created `packages/media/src/document/repos/document-repo.ts`
   - Created `packages/media/src/document/repos/index.ts`
   - Validate: `pnpm --filter @repo/media typecheck` ✅
2. ✅ Create document use cases (7 files)
   - Created `list-documents.ts`, `get-document.ts`, `get-document-content.ts`
   - Created `create-document.ts`, `upload-document.ts`, `update-document.ts`, `delete-document.ts`
   - Created `packages/media/src/document/use-cases/index.ts`
   - Validate: `pnpm --filter @repo/media typecheck` ✅
3. ~~Add HTTP protocol props to document-related errors~~ ✅ Already done in Phase 0
3a. ✅ Create shared utilities module (Issue #5)
   - Created `packages/media/src/shared/text-utils.ts` with `calculateWordCount`
   - Created `packages/media/src/shared/index.ts` barrel export
   - Updated `create-document.ts`, `update-document.ts`, `upload-document.ts` to import from shared
   - Note: `live.ts` still has duplicate (will be removed in Sprint 4)
   - Validate: `pnpm --filter @repo/media typecheck` ✅
4. ✅ Write document use case unit tests
   - Created `packages/media/src/document/use-cases/__tests__/` directory
   - Created test files for all 7 use cases:
     - `list-documents.test.ts` (9 tests)
     - `get-document.test.ts` (5 tests)
     - `get-document-content.test.ts` (6 tests)
     - `create-document.test.ts` (7 tests)
     - `update-document.test.ts` (11 tests)
     - `delete-document.test.ts` (5 tests)
     - `upload-document.test.ts` (12 tests)
   - Total: 55 tests passing
   - Validate: `pnpm --filter @repo/media test` ✅
5. ✅ **Refactor document router** - CRITICAL migration point:
   - Replaced `handleEffect()` → `handleEffectWithProtocol()`
   - Removed all `createErrorHandlers(errors)` calls
   - Removed all `getErrorProp()` calls
   - Added `{ span: 'api.documents.X', attributes: {...} }` to ALL handlers
   - Uses Effect-based serializers (`serializeDocumentEffect`, `serializeDocumentsEffect`)
   - Validate: `pnpm --filter @repo/api typecheck` ✅
6. ✅ Write document router integration tests
   - Created `packages/api/src/server/router/__tests__/document.integration.test.ts` (47 tests)
   - Created `packages/api/src/server/router/__tests__/helpers.ts` (test utilities)
   - Added `test` script to `packages/api/package.json`
   - Created `packages/api/vitest.config.ts`
   - Tests cover all 7 handlers: list, get, getContent, create, upload, update, delete
   - Tests include: success paths, error handling, authorization, serialization format
   - Validate: `pnpm --filter @repo/api test` ✅
   - **Sprint checkpoint**: `pnpm typecheck && pnpm test && pnpm build` ✅
6a. ✅ Export shared `toUser` utility (Issue #6)
   - Exported `toUser` from `@repo/testing/setup/layers.ts`
   - Updated document integration tests to use shared utility
   - Validate: `pnpm --filter @repo/api test` ✅

### Sprint 2: Podcast Module (Standardize)

> ⚠️ **Error Handling Reminder:** Podcast router has inconsistent tracing (some handlers have spans, some don't) and uses legacy error handlers. Migrate ALL handlers to protocol-based pattern.

1. ~~Add HTTP protocol props to podcast-related errors~~ ✅ Already done in Phase 0
2. **Refactor podcast router** - Full migration:
   - Replace `handleEffect()` → `handleEffectWithProtocol()` in ALL handlers
   - Remove all `createErrorHandlers(errors)` calls
   - Remove all `getErrorProp()` calls
   - Ensure ALL handlers have `{ span, attributes }` (currently inconsistent)
   - Validate: `pnpm --filter @repo/api typecheck`
3. Add missing podcast use case tests
   - Validate: `pnpm --filter @repo/media test`
4. Write podcast router integration tests
   - Validate: `pnpm --filter @repo/api test`
   - **Sprint checkpoint**: `pnpm typecheck && pnpm test && pnpm build`

### Sprint 3: Voices Module (Complete)

> ⚠️ **Error Handling Reminder:** Voices router uses legacy pattern. Migrate to `handleEffectWithProtocol()` and add consistent tracing.

1. Create TTS use cases (listVoices, previewVoice)
   - Validate: `pnpm --filter @repo/ai typecheck`
2. ~~Add HTTP protocol props to TTS-related errors~~ ✅ Already done in Phase 0
3. Write TTS use case tests
   - Validate: `pnpm --filter @repo/ai test`
4. **Refactor voices router** - Full migration:
   - Replace `handleEffect()` → `handleEffectWithProtocol()` in ALL handlers
   - Remove all `createErrorHandlers(errors)` calls
   - Add `{ span, attributes }` to ALL handlers
   - Validate: `pnpm --filter @repo/api typecheck`
5. Write voices router integration tests
   - Validate: `pnpm --filter @repo/api test`
   - **Sprint checkpoint**: `pnpm typecheck && pnpm test && pnpm build`

### Sprint 4: Documentation & Cleanup

> ⚠️ **Cleanup Reminder:** By this point, ALL routers should be using `handleEffectWithProtocol()`. Legacy code should be dead and ready to delete.

1. Update CLAUDE.md with standardized patterns (including error handling)
2. Remove deprecated Documents service files
3. **Delete legacy error handling code** from `effect-handler.ts`:
   - Remove `createErrorHandlers()` factory function entirely
   - Remove `getErrorProp()` helper (should have no usages)
   - Remove `logAndThrowInternal()` helper
   - Remove `LegacyErrorFactoryConfig` interface
   - Keep only: `handleEffectWithProtocol()`, `handleTaggedError()`, `handleORPCError()`
4. Update Media type export (remove Documents, add DocumentRepo)
5. Verify no imports of removed functions across codebase
   - **Final validation**: `pnpm typecheck && pnpm test && pnpm build`

### Sprint 5: Frontend Typed Error Handling

> **Goal:** Leverage oRPC's typed error system on the frontend to provide rich, context-aware error messages instead of generic fallbacks.

**Background:** The backend sends structured error data via `getData()` methods on error classes, and contracts define typed `data` schemas. The frontend currently ignores this - all `onError` handlers only use `error.message`.

**Available utilities (already exported from `@repo/api/client`):**
- `isDefinedError(error)` - Type guard that narrows error to defined oRPC errors with typed `code` and `data`
- `safe(promise)` - Wraps call to return `[error, data, isDefined, isSuccess]` tuple (for imperative calls)

#### Implementation Steps

1. **Audit all TanStack Query error handlers** in `apps/web/`:
   ```bash
   grep -r "onError.*=>" apps/web/src --include="*.tsx" --include="*.ts"
   ```

   Files to update:
   - `apps/web/src/routes/_protected/documents/-components/upload-document.tsx`
   - `apps/web/src/routes/_protected/documents/index.tsx`
   - `apps/web/src/routes/_protected/podcasts/index.tsx`
   - `apps/web/src/routes/_protected/podcasts/$podcastId.tsx`
   - `apps/web/src/routes/_protected/podcasts/-components/setup/setup-wizard.tsx`
   - `apps/web/src/routes/_protected/podcasts/-components/setup/steps/step-documents.tsx`
   - `apps/web/src/routes/_protected/dashboard.tsx`
   - `apps/web/src/hooks/use-podcast-generation.ts`
   - `apps/web/src/hooks/use-podcast-settings.ts`
   - `apps/web/src/hooks/use-script-editor.ts`
   - `apps/web/src/hooks/use-optimistic-podcast-mutation.ts`

2. **Create error formatting utilities** in `apps/web/src/lib/errors.ts`:
   ```typescript
   import { isDefinedError } from '@repo/api/client';

   export const formatBytes = (bytes: number): string => {
     if (bytes < 1024) return `${bytes} B`;
     if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
     return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
   };

   export const getErrorMessage = (error: unknown, fallback: string): string => {
     if (!isDefinedError(error)) {
       return (error as Error)?.message ?? fallback;
     }

     switch (error.code) {
       case 'DOCUMENT_TOO_LARGE': {
         const { fileName, fileSize, maxSize } = error.data as { fileName: string; fileSize: number; maxSize: number };
         return `${fileName} (${formatBytes(fileSize)}) exceeds ${formatBytes(maxSize)} limit`;
       }
       case 'UNSUPPORTED_FORMAT': {
         const { mimeType, supportedFormats } = error.data as { mimeType: string; supportedFormats: string[] };
         return `${mimeType} not supported. Use: ${supportedFormats.join(', ')}`;
       }
       case 'RATE_LIMITED': {
         const data = error.data as { retryAfter?: number } | undefined;
         return data?.retryAfter
           ? `Too many requests. Try again in ${data.retryAfter} seconds.`
           : 'Too many requests. Please wait a moment.';
       }
       // Add more cases as needed...
       default:
         return error.message;
     }
   };
   ```

3. **Update error handlers** to use `isDefinedError`:
   ```typescript
   // Before
   onError: (error) => {
     toast.error(error.message ?? 'Failed to upload document');
   }

   // After
   import { isDefinedError } from '@repo/api/client';
   import { getErrorMessage } from '@/lib/errors';

   onError: (error) => {
     toast.error(getErrorMessage(error, 'Failed to upload document'));
   }
   ```

4. **Add typed error handling for specific cases** where richer UX is needed:
   ```typescript
   onError: (error) => {
     if (isDefinedError(error)) {
       switch (error.code) {
         case 'DOCUMENT_TOO_LARGE':
           // Show specific UI (e.g., file size indicator, compression suggestion)
           setFileSizeError(error.data);
           return;
         case 'PODCAST_NOT_FOUND':
           // Navigate away
           navigate({ to: '/podcasts' });
           toast.error('Podcast no longer exists');
           return;
       }
     }
     toast.error(getErrorMessage(error, 'Operation failed'));
   }
   ```

5. **Validate:** `pnpm --filter web typecheck && pnpm --filter web build`

#### Success Criteria

- [ ] All `onError` handlers use `isDefinedError` or `getErrorMessage` utility
- [ ] Document upload errors show file size details (`DOCUMENT_TOO_LARGE`)
- [ ] Format errors show supported formats (`UNSUPPORTED_FORMAT`)
- [ ] Rate limit errors show retry timing when available (`RATE_LIMITED`)
- [ ] No `error.message ?? 'fallback'` patterns remain (use centralized utility)
- [ ] Error utility has tests covering all defined error codes

#### Files to Create

```
apps/web/src/lib/errors.ts           # Error formatting utilities
apps/web/src/lib/errors.test.ts      # Tests for error formatting
```

#### Files to Modify

```
apps/web/src/routes/_protected/documents/-components/upload-document.tsx
apps/web/src/routes/_protected/documents/index.tsx
apps/web/src/routes/_protected/podcasts/index.tsx
apps/web/src/routes/_protected/podcasts/$podcastId.tsx
apps/web/src/routes/_protected/podcasts/-components/setup/setup-wizard.tsx
apps/web/src/routes/_protected/podcasts/-components/setup/steps/step-documents.tsx
apps/web/src/routes/_protected/dashboard.tsx
apps/web/src/hooks/use-podcast-generation.ts
apps/web/src/hooks/use-podcast-settings.ts
apps/web/src/hooks/use-script-editor.ts
apps/web/src/hooks/use-optimistic-podcast-mutation.ts
```
