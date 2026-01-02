# Serialization Pattern

This document defines the standard pattern for converting database entities to API responses.

## Overview

Serialization converts internal DB entities to external API representations:
- Transforms Date objects to ISO strings
- Removes internal fields
- Adds computed fields
- Enables tracing through Effect-based variants

## Serializer Variants

Each entity has three serializer variants:

| Variant | Use Case | Tracing |
|---------|----------|---------|
| `serializeXxxEffect` | Single item in handlers | Yes |
| `serializeXxxsEffect` | Batch items in handlers | Yes (parallel) |
| `serializeXxx` | Simple map callbacks | No |

## File Location

```
packages/db/src/schemas/{entity}.ts
```

Each entity schema file exports its serializers.

## Standard Implementation

```typescript
// packages/db/src/schemas/document.ts
import { Effect } from 'effect';

// ============================================================================
// Types
// ============================================================================

export interface Document {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SerializedDocument {
  id: string;
  title: string;
  content: string;
  createdAt: string;  // ISO string
  updatedAt: string;  // ISO string
}

// ============================================================================
// Serializers
// ============================================================================

/**
 * Sync serializer for simple map callbacks.
 * Use Effect variants in handlers for tracing.
 */
export const serializeDocument = (doc: Document): SerializedDocument => ({
  id: doc.id,
  title: doc.title,
  content: doc.content,
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt.toISOString(),
});

/**
 * Effect-based serializer with tracing.
 * Use in handlers via Effect.flatMap.
 */
export const serializeDocumentEffect = (
  doc: Document
): Effect.Effect<SerializedDocument> =>
  Effect.sync(() => serializeDocument(doc)).pipe(
    Effect.withSpan('serialize.document', {
      attributes: { 'document.id': doc.id }
    })
  );

/**
 * Batch serializer with parallel execution.
 * Use for list endpoints.
 */
export const serializeDocumentsEffect = (
  docs: Document[]
): Effect.Effect<SerializedDocument[]> =>
  Effect.all(
    docs.map(serializeDocumentEffect),
    { concurrency: 'unbounded' }
  ).pipe(
    Effect.withSpan('serialize.documents', {
      attributes: { count: docs.length }
    })
  );
```

## Usage in Handlers

### Single Item

```typescript
// In router handler
getDocument({ id: input.id }).pipe(
  Effect.flatMap(serializeDocumentEffect)
)
```

### Multiple Items

```typescript
// In router handler
listDocuments(input).pipe(
  Effect.flatMap(serializeDocumentsEffect)
)
```

### With Additional Transformation

```typescript
// In router handler - adding computed field
getDocument({ id: input.id }).pipe(
  Effect.flatMap(doc =>
    serializeDocumentEffect(doc).pipe(
      Effect.map(serialized => ({
        ...serialized,
        isOwner: doc.userId === context.user.id,
      }))
    )
  )
)
```

## When to Use Each Variant

### Use `serializeXxxEffect` When:
- In handlers (always)
- Single item operations
- When tracing is needed

```typescript
// Handler - always use Effect variant
return handleEffectWithProtocol(
  context.runtime,
  context.user,
  getDocument({ id: input.id }).pipe(
    Effect.flatMap(serializeDocumentEffect)
  ),
  errors,
  { span: 'api.documents.get' },
);
```

### Use `serializeXxxsEffect` When:
- Returning lists
- Need parallel serialization
- In handlers with batch results

```typescript
// List handler - use batch variant
return handleEffectWithProtocol(
  context.runtime,
  context.user,
  listDocuments(input).pipe(
    Effect.flatMap(serializeDocumentsEffect)
  ),
  errors,
  { span: 'api.documents.list' },
);
```

### Use `serializeXxx` (sync) When:
- Inside use cases for intermediate transforms
- In tests
- Simple callbacks where tracing isn't needed

```typescript
// In a use case (not handler)
const summaries = docs.map(doc => ({
  id: doc.id,
  title: serializeDocument(doc).title,
}));
```

## Transformation Guidelines

### Date Fields

Always convert to ISO strings:

```typescript
createdAt: doc.createdAt.toISOString(),
updatedAt: doc.updatedAt.toISOString(),
```

### Optional Fields

Handle null/undefined:

```typescript
description: doc.description ?? null,
publishedAt: doc.publishedAt?.toISOString() ?? null,
```

### Nested Entities

Serialize nested entities:

```typescript
export const serializePodcast = (podcast: PodcastWithDocuments): SerializedPodcast => ({
  id: podcast.id,
  title: podcast.title,
  documents: podcast.documents.map(serializeDocument),  // Nested serialization
});
```

### Computed Fields

Add fields that don't exist in DB:

```typescript
export const serializeDocument = (doc: Document): SerializedDocument => ({
  ...baseFields,
  wordCount: countWords(doc.content),  // Computed
  estimatedReadTime: Math.ceil(countWords(doc.content) / 200),  // Computed
});
```

### Excluded Fields

Don't expose internal fields:

```typescript
// Document entity has userId, but we don't expose it
export const serializeDocument = (doc: Document): SerializedDocument => ({
  id: doc.id,
  title: doc.title,
  content: doc.content,
  // userId NOT included - internal only
  createdAt: doc.createdAt.toISOString(),
});
```

## Span Naming Convention

Format: `serialize.{entity}` or `serialize.{entities}`

| Serializer | Span |
|------------|------|
| `serializeDocumentEffect` | `serialize.document` |
| `serializeDocumentsEffect` | `serialize.documents` |
| `serializePodcastEffect` | `serialize.podcast` |

## Anti-Patterns

### Don't Use Sync Serializer in Handlers

```typescript
// WRONG - loses tracing
getDocument({ id: input.id }).pipe(
  Effect.map(serializeDocument)  // Sync, no tracing!
)

// CORRECT - Effect-based with tracing
getDocument({ id: input.id }).pipe(
  Effect.flatMap(serializeDocumentEffect)
)
```

### Don't Serialize in Use Cases

```typescript
// WRONG - serialization in use case
export const getDocument = (input: GetDocumentInput) =>
  Effect.gen(function* () {
    const repo = yield* DocumentRepo;
    const doc = yield* repo.findById(input.id);
    return serializeDocument(doc);  // Don't do this!
  });

// CORRECT - return raw entity
export const getDocument = (input: GetDocumentInput) =>
  Effect.gen(function* () {
    const repo = yield* DocumentRepo;
    return yield* repo.findById(input.id);  // Raw entity
  });
```

### Don't Skip Batch Serializer for Lists

```typescript
// WRONG - sequential, no batch tracing
listDocuments(input).pipe(
  Effect.flatMap(docs =>
    Effect.all(docs.map(serializeDocumentEffect))
  )
)

// CORRECT - use batch serializer
listDocuments(input).pipe(
  Effect.flatMap(serializeDocumentsEffect)
)
```
