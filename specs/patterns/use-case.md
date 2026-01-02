# Use Case Pattern

This document defines the standard pattern for business logic use cases.

## Overview

Use cases encapsulate a single business operation. They:
1. Live in domain-specific directories
2. Return raw domain data (not serialized)
3. Have explicit error types
4. Include tracing spans

## File Location

```
packages/media/src/{domain}/use-cases/{action}.ts
packages/ai/src/{domain}/use-cases/{action}.ts
```

Examples:
- `packages/media/src/document/use-cases/create-document.ts`
- `packages/media/src/podcast/use-cases/generate-script.ts`
- `packages/ai/src/tts/use-cases/preview-voice.ts`

## Standard Template

```typescript
// packages/media/src/{domain}/use-cases/{action}.ts
import { Effect } from 'effect';
import { DomainRepo } from '../repos';
import { DatabaseError, DomainNotFound } from '@repo/db/errors';

// ============================================================================
// Types
// ============================================================================

export interface ActionInput {
  id: string;
  // Other input fields...
}

export interface ActionResult {
  // Raw domain data, NOT serialized
}

export type ActionError =
  | DomainNotFound
  | DatabaseError;

// ============================================================================
// Use Case
// ============================================================================

export const actionName = (
  input: ActionInput
): Effect.Effect<ActionResult, ActionError, DomainRepo> =>
  Effect.gen(function* () {
    const repo = yield* DomainRepo;

    // Business logic here
    const result = yield* repo.findById(input.id);

    return result;
  }).pipe(
    Effect.withSpan('useCase.action', {
      attributes: { 'domain.id': input.id }
    })
  );
```

## Rules

### 1. One File Per Use Case

Each use case gets its own file. This enables:
- Clear ownership
- Focused testing
- Easy navigation

```
packages/media/src/document/use-cases/
├── index.ts
├── list-documents.ts
├── get-document.ts
├── get-document-content.ts
├── create-document.ts
├── upload-document.ts
├── update-document.ts
└── delete-document.ts
```

### 2. Explicit Error Types

Always define and export the error union.

```typescript
// CORRECT - explicit union
export type CreateDocumentError =
  | DocumentQuotaExceeded
  | UnsupportedFormat
  | DatabaseError;

export const createDocument = (
  input: CreateDocumentInput
): Effect.Effect<Document, CreateDocumentError, DocumentRepo> => ...

// WRONG - inferred errors
export const createDocument = (input: CreateDocumentInput) =>
  Effect.gen(function* () { ... });  // Error type not explicit!
```

### 3. Return Raw Domain Data

Serialization happens in the handler, not the use case.

```typescript
// CORRECT - returns DB entity
export const getDocument = (
  input: GetDocumentInput
): Effect.Effect<Document, GetDocumentError, DocumentRepo> =>
  Effect.gen(function* () {
    const repo = yield* DocumentRepo;
    return yield* repo.findById(input.id);
  });

// WRONG - returns serialized data
export const getDocument = (
  input: GetDocumentInput
): Effect.Effect<SerializedDocument, GetDocumentError, DocumentRepo> =>
  Effect.gen(function* () {
    const repo = yield* DocumentRepo;
    const doc = yield* repo.findById(input.id);
    return serializeDocument(doc);  // Don't serialize here!
  });
```

### 4. Always Add Tracing Span

Every use case must have a span with relevant attributes.

```typescript
export const createDocument = (
  input: CreateDocumentInput
): Effect.Effect<Document, CreateDocumentError, DocumentRepo> =>
  Effect.gen(function* () {
    // ... implementation
  }).pipe(
    Effect.withSpan('useCase.createDocument', {
      attributes: {
        'document.title': input.title,
        'document.type': input.type,
      }
    })
  );
```

### 5. Dependencies Explicit in Effect Type

```typescript
// Dependencies listed in R position
export const generateScript = (
  input: GenerateScriptInput
): Effect.Effect<Script, GenerateScriptError, PodcastRepo | LLMService | Storage> =>
  ...
```

## Span Naming Convention

Format: `useCase.{actionName}`

| Use Case | Span |
|----------|------|
| createDocument | `useCase.createDocument` |
| listDocuments | `useCase.listDocuments` |
| generateScript | `useCase.generateScript` |
| previewVoice | `useCase.previewVoice` |

## Common Attributes

| Attribute | Usage |
|-----------|-------|
| `document.id` | Document operations |
| `document.title` | Document creation/update |
| `podcast.id` | Podcast operations |
| `voice.id` | Voice operations |
| `job.id` | Background job operations |

## Input/Output Interfaces

### Input Interface

```typescript
export interface CreateDocumentInput {
  title: string;
  content: string;
  // Input is already validated by oRPC schema
}
```

### Result Interface

```typescript
export interface CreateDocumentResult {
  // Can be the entity itself or a custom shape
  document: Document;
  wordCount: number;
}
```

## Getting User Context

Use FiberRef, not Context.Tag:

```typescript
import { getCurrentUser } from '@repo/auth/policy';

export const createDocument = (
  input: CreateDocumentInput
): Effect.Effect<Document, CreateDocumentError, DocumentRepo> =>
  Effect.gen(function* () {
    // Get user from FiberRef
    const user = yield* getCurrentUser;

    const repo = yield* DocumentRepo;
    return yield* repo.create({
      ...input,
      userId: user.id,
    });
  });
```

## Composing Use Cases

Use cases can call other use cases:

```typescript
export const deleteDocument = (
  input: DeleteDocumentInput
): Effect.Effect<void, DeleteDocumentError, DocumentRepo | PodcastRepo> =>
  Effect.gen(function* () {
    // Check if document is used by podcasts
    const usages = yield* getDocumentUsages({ documentId: input.id });

    if (usages.length > 0) {
      return yield* Effect.fail(
        new DocumentInUse({ id: input.id, podcastIds: usages.map(p => p.id) })
      );
    }

    const repo = yield* DocumentRepo;
    yield* repo.delete(input.id);
  });
```

## Index File

Export all use cases from the index:

```typescript
// packages/media/src/document/use-cases/index.ts
export * from './list-documents';
export * from './get-document';
export * from './get-document-content';
export * from './create-document';
export * from './upload-document';
export * from './update-document';
export * from './delete-document';
```

## Anti-Patterns

### Don't Include User Context in Dependencies

```typescript
// WRONG
export type CreateDocumentContext = DocumentRepo | CurrentUser;

// CORRECT - read from FiberRef inside
export type CreateDocumentContext = DocumentRepo;
```

### Don't Create Effects in Loops

```typescript
// WRONG - sequential, slow
for (const id of ids) {
  yield* processDocument(id);
}

// CORRECT - parallel
yield* Effect.all(ids.map(id => processDocument(id)), { concurrency: 10 });
```

### Don't Swallow Errors

```typescript
// WRONG - hides error
const doc = yield* repo.findById(id).pipe(
  Effect.catchAll(() => Effect.succeed(null))
);

// CORRECT - propagate or handle explicitly
const doc = yield* repo.findById(id);
```
