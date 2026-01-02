# Router Handler Pattern

This document defines the standard pattern for oRPC router handlers.

## Overview

Every API handler must:
1. Call exactly ONE use case
2. Use Effect-based serialization
3. Include tracing span with attributes
4. Use protocol-based error handling

## Standard Pattern

```typescript
handlerName: protectedProcedure.domain.action.handler(
  async ({ context, input, errors }) => {
    return handleEffectWithProtocol(
      context.runtime,
      context.user,
      useCaseName(input).pipe(
        Effect.flatMap(serializeResultEffect)  // Effect-based serializer
      ),
      errors,
      { span: 'api.domain.action', attributes: { 'domain.id': input.id } },
    );
  }
)
```

## Rules

### 1. One Use Case Per Handler

Handlers orchestrate; they don't contain business logic.

```typescript
// CORRECT - calls use case
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

// WRONG - accesses repo directly
get: protectedProcedure.documents.get.handler(
  async ({ context, input, errors }) => {
    return handleEffectWithProtocol(
      context.runtime,
      context.user,
      Effect.gen(function* () {
        const repo = yield* DocumentRepo;  // Direct repo access!
        return yield* repo.findById(input.id);
      }),
      errors,
      { span: 'api.documents.get' },
    );
  },
),
```

### 2. Effect-Based Serialization

Always use Effect-based serializers for tracing.

```typescript
// CORRECT - Effect-based (traced)
useCaseName(input).pipe(
  Effect.flatMap(serializeDocumentEffect)
)

// CORRECT - batch serialization
useCaseName(input).pipe(
  Effect.flatMap(serializeDocumentsEffect)
)

// WRONG - sync serializer (loses tracing)
useCaseName(input).pipe(
  Effect.map((items) => items.map(serializeDocument))
)
```

### 3. Always Include Tracing

Every handler must have a span with relevant attributes.

```typescript
// CORRECT - span with attributes
{
  span: 'api.documents.get',
  attributes: { 'document.id': input.id }
}

// CORRECT - multiple attributes
{
  span: 'api.podcasts.create',
  attributes: {
    'podcast.title': input.title,
    'document.ids': input.documentIds.join(',')
  }
}

// WRONG - no tracing
handleEffectWithProtocol(runtime, user, effect, errors)  // Missing options!
```

### 4. Protocol-Based Errors

Use `handleEffectWithProtocol()` - errors handle themselves.

```typescript
// CORRECT - protocol handles errors
return handleEffectWithProtocol(
  context.runtime,
  context.user,
  getDocument({ id: input.id }).pipe(
    Effect.flatMap(serializeDocumentEffect)
  ),
  errors,
  { span: 'api.documents.get', attributes: { 'document.id': input.id } },
);

// WRONG - legacy pattern with manual mapping
const handlers = createErrorHandlers(errors);
return handleEffect(runtime, user, effect, {
  ...handlers.common,
  ...handlers.database,
  DocumentNotFound: (e) => { /* redundant */ },
}, { span });
```

## Custom Error Overrides

Custom overrides are **rare** - only for business logic like upsells.

```typescript
// Rare case - override for business logic
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

## Span Naming Convention

Format: `api.{domain}.{action}`

| Handler | Span |
|---------|------|
| documents.list | `api.documents.list` |
| documents.get | `api.documents.get` |
| podcasts.create | `api.podcasts.create` |
| voices.preview | `api.voices.preview` |

## Common Attributes

| Attribute | Usage |
|-----------|-------|
| `document.id` | Single document operations |
| `podcast.id` | Single podcast operations |
| `job.id` | Job-related operations |
| `user.id` | When acting on behalf of user |

## Anti-Patterns

### Don't Access Services Directly

```typescript
// WRONG
const documents = yield* Documents;
const doc = yield* documents.findById(id);

// CORRECT
const result = yield* getDocument({ id });
```

### Don't Mix Patterns

```typescript
// WRONG - inconsistent
someHandler: (
  async ({ context }) => {
    // Some use pipe, some use gen - pick one
    const result = yield* Effect.gen(function* () { ... });
    return result.pipe(Effect.map(...));
  }
)
```

### Don't Skip Serialization

```typescript
// WRONG - returning raw DB entity
return handleEffectWithProtocol(
  runtime, user,
  getDocument({ id: input.id }),  // Raw entity!
  errors,
  { span }
);

// CORRECT - always serialize
return handleEffectWithProtocol(
  runtime, user,
  getDocument({ id: input.id }).pipe(
    Effect.flatMap(serializeDocumentEffect)
  ),
  errors,
  { span }
);
```
