# Error Handling Pattern

This document defines the standard pattern for defining and handling errors.

## Overview

Errors in this codebase use a **protocol-based** approach:
1. Each error class defines its HTTP behavior via static properties
2. A generic handler reads these properties automatically
3. No boilerplate error mapping in handlers

## Error Definition

Every error extends `Schema.TaggedError` with HTTP protocol properties.

### Required Properties

| Property | Type | Description |
|----------|------|-------------|
| `httpStatus` | number | HTTP status code (404, 500, etc.) |
| `httpCode` | string | Error code for clients (DOCUMENT_NOT_FOUND) |
| `httpMessage` | string \| function | Message for response |
| `logLevel` | string | Logging behavior |

### Optional Properties

| Property | Type | Description |
|----------|------|-------------|
| `getData()` | function | Extract structured data for response body |

### Standard Template

```typescript
// packages/db/src/errors.ts
import { Schema } from 'effect';

export class DocumentNotFound extends Schema.TaggedError<DocumentNotFound>()(
  'DocumentNotFound',
  {
    id: Schema.String,
    message: Schema.optional(Schema.String)
  },
) {
  // HTTP Protocol - co-located with error definition
  static readonly httpStatus = 404 as const;
  static readonly httpCode = 'DOCUMENT_NOT_FOUND' as const;
  static readonly httpMessage = (e: DocumentNotFound) =>
    e.message ?? `Document ${e.id} not found`;
  static readonly logLevel = 'silent' as const;

  // Optional: extract data for response body
  static getData(e: DocumentNotFound) {
    return { documentId: e.id };
  }
}
```

## Log Levels

| Level | When to Use | Example Errors |
|-------|-------------|----------------|
| `silent` | Expected errors, user mistakes | NotFound, Unauthorized, ValidationError |
| `warn` | Unusual but not critical | RateLimited, QuotaExceeded |
| `error` | Unexpected errors | DatabaseError, ExternalServiceError |
| `error-with-stack` | Internal errors needing debug | UnexpectedError, InternalError |

## HTTP Status Codes

| Status | When to Use | Example Errors |
|--------|-------------|----------------|
| 400 | Bad request, validation | ValidationError, InvalidInput |
| 401 | Not authenticated | Unauthorized |
| 403 | Not authorized | Forbidden, AccessDenied |
| 404 | Resource not found | DocumentNotFound, PodcastNotFound |
| 409 | Conflict | AlreadyExists, VersionConflict |
| 429 | Rate limited | RateLimited |
| 500 | Internal error | DatabaseError, UnexpectedError |
| 503 | Service unavailable | ExternalServiceError |

## Error Examples

### Not Found Error

```typescript
export class DocumentNotFound extends Schema.TaggedError<DocumentNotFound>()(
  'DocumentNotFound',
  { id: Schema.String, message: Schema.optional(Schema.String) },
) {
  static readonly httpStatus = 404 as const;
  static readonly httpCode = 'DOCUMENT_NOT_FOUND' as const;
  static readonly httpMessage = (e: DocumentNotFound) =>
    e.message ?? `Document ${e.id} not found`;
  static readonly logLevel = 'silent' as const;

  static getData(e: DocumentNotFound) {
    return { documentId: e.id };
  }
}
```

### Validation Error

```typescript
export class DocumentTooLarge extends Schema.TaggedError<DocumentTooLarge>()(
  'DocumentTooLarge',
  {
    fileName: Schema.String,
    fileSize: Schema.Number,
    maxSize: Schema.Number,
  },
) {
  static readonly httpStatus = 400 as const;
  static readonly httpCode = 'DOCUMENT_TOO_LARGE' as const;
  static readonly httpMessage = (e: DocumentTooLarge) =>
    `File ${e.fileName} exceeds maximum size`;
  static readonly logLevel = 'silent' as const;

  static getData(e: DocumentTooLarge) {
    return {
      fileName: e.fileName,
      fileSize: e.fileSize,
      maxSize: e.maxSize,
    };
  }
}
```

### Internal Error

```typescript
export class DatabaseError extends Schema.TaggedError<DatabaseError>()(
  'DatabaseError',
  {
    operation: Schema.String,
    cause: Schema.optional(Schema.Unknown),
  },
) {
  static readonly httpStatus = 500 as const;
  static readonly httpCode = 'INTERNAL_ERROR' as const;
  static readonly httpMessage = 'An unexpected error occurred';
  static readonly logLevel = 'error-with-stack' as const;
}
```

## HTTP Protocol Interface

```typescript
// packages/db/src/error-protocol.ts
export interface HttpErrorProtocol {
  readonly httpStatus: number;
  readonly httpCode: string;
  readonly httpMessage: string | ((error: any) => string);
  readonly logLevel: 'silent' | 'warn' | 'error' | 'error-with-stack';
  getData?: (error: any) => Record<string, unknown>;
}
```

## Generic Handler

The generic handler reads HTTP protocol from error classes:

```typescript
// packages/api/src/server/effect-handler.ts
export const handleTaggedError = <E extends { _tag: string }>(
  error: E,
  errors: ErrorFactory,
): never => {
  const ErrorClass = error.constructor as {
    new (...args: any[]): E
  } & Partial<HttpErrorProtocol>;

  // Log based on level
  const logLevel = ErrorClass.logLevel ?? 'error';
  switch (logLevel) {
    case 'error-with-stack':
      console.error(`[${error._tag}]`, error);
      break;
    case 'error':
      console.error(`[${error._tag}]`, error.message);
      break;
    case 'warn':
      console.warn(`[${error._tag}]`, error.message);
      break;
    // 'silent' - no logging
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

## Handler Usage

### Standard (No Overrides)

```typescript
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
```

### With Custom Override (Rare)

Only override when business logic requires different response:

```typescript
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
        // Override for upsell flow
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

## Explicit Error Types

Error channels must be explicit in Effect types:

```typescript
// Type signature includes all possible errors
export const createDocument = (
  input: CreateDocumentInput
): Effect.Effect<
  Document,
  DocumentQuotaExceeded | UnsupportedFormat | DatabaseError,  // Explicit!
  DocumentRepo
> => ...

// Type union exported for consumers
export type CreateDocumentError =
  | DocumentQuotaExceeded
  | UnsupportedFormat
  | DatabaseError;
```

## Adding New Errors

When adding a new error:

1. **Define the error class** with all HTTP protocol properties
2. **Export from errors file** (`packages/db/src/errors.ts`)
3. **That's it** - no handler updates needed!

```typescript
// 1. Define with protocol
export class NewError extends Schema.TaggedError<NewError>()(
  'NewError',
  { field: Schema.String },
) {
  static readonly httpStatus = 400;
  static readonly httpCode = 'NEW_ERROR';
  static readonly httpMessage = (e: NewError) => `Error with ${e.field}`;
  static readonly logLevel = 'silent' as const;
}

// 2. Export (if in shared errors file)
export { NewError } from './errors';

// 3. Use in use case - handler automatically handles it
export const myUseCase = (): Effect.Effect<Result, NewError, Deps> => ...
```

## Anti-Patterns

### Don't Use Legacy Pattern

```typescript
// WRONG - legacy manual mapping
const handlers = createErrorHandlers(errors);
return handleEffect(runtime, user, effect, {
  ...handlers.common,
  DocumentNotFound: (e) => { /* redundant */ },
}, { span });

// CORRECT - protocol handles it
return handleEffectWithProtocol(runtime, user, effect, errors, { span });
```

### Don't Duplicate Error Logic

```typescript
// WRONG - extracting props manually
DocumentNotFound: (e) => {
  const id = getErrorProp(e, 'id', 'unknown');  // Already on class!
  throw errors.DOCUMENT_NOT_FOUND({
    message: `Document ${id} not found`,  // httpMessage already defines this!
  });
}

// CORRECT - let protocol handle it
// No handler needed - protocol reads from class
```

### Don't Skip getData()

```typescript
// WRONG - no structured data
export class DocumentTooLarge extends Schema.TaggedError<DocumentTooLarge>()(
  'DocumentTooLarge',
  { fileSize: Schema.Number, maxSize: Schema.Number },
) {
  static readonly httpStatus = 400;
  static readonly httpCode = 'DOCUMENT_TOO_LARGE';
  static readonly httpMessage = 'File too large';
  static readonly logLevel = 'silent';
  // Missing getData! Frontend can't show details
}

// CORRECT - include structured data
export class DocumentTooLarge extends Schema.TaggedError<DocumentTooLarge>()(
  'DocumentTooLarge',
  { fileSize: Schema.Number, maxSize: Schema.Number },
) {
  static readonly httpStatus = 400;
  static readonly httpCode = 'DOCUMENT_TOO_LARGE';
  static readonly httpMessage = 'File too large';
  static readonly logLevel = 'silent';

  static getData(e: DocumentTooLarge) {
    return { fileSize: e.fileSize, maxSize: e.maxSize };
  }
}
```
