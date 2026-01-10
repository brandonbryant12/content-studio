# Task 05: Core Use Cases (CRUD)

## Standards Checklist

Before starting implementation, read and understand:
- [ ] `standards/patterns/use-case.md`
- [ ] `standards/patterns/error-handling.md`
- [ ] `packages/media/src/podcast/use-cases/create-podcast.ts` - Reference
- [ ] `packages/media/src/podcast/use-cases/get-podcast.ts` - Reference

## Context

Use cases in this codebase:
- Are pure business logic functions
- Return Effect types
- Use `yield*` to access services via Context.Tag
- Include tracing spans with relevant attributes
- Don't have explicit error type annotations (let Effect infer)
- Validate permissions using the current user from FiberRef

## Key Files

### Create New Files:
- `packages/media/src/infographic/use-cases/create-infographic.ts`
- `packages/media/src/infographic/use-cases/get-infographic.ts`
- `packages/media/src/infographic/use-cases/update-infographic.ts`
- `packages/media/src/infographic/use-cases/delete-infographic.ts`
- `packages/media/src/infographic/use-cases/list-infographics.ts`
- `packages/media/src/infographic/use-cases/index.ts`

### Also Need:
- `packages/media/src/infographic/errors.ts` - Domain errors

## Implementation Notes

### Domain Errors

```typescript
// packages/media/src/infographic/errors.ts
import { Schema } from 'effect';

export class InfographicNotFoundError extends Schema.TaggedError<InfographicNotFoundError>()(
  'InfographicNotFoundError',
  {
    infographicId: Schema.String,
  },
) {
  static readonly httpStatus = 404 as const;
  static readonly httpCode = 'INFOGRAPHIC_NOT_FOUND' as const;
  static readonly httpMessage = 'Infographic not found';
  static readonly logLevel = 'warning' as const;
}

export class NotInfographicOwnerError extends Schema.TaggedError<NotInfographicOwnerError>()(
  'NotInfographicOwnerError',
  {
    infographicId: Schema.String,
    userId: Schema.String,
  },
) {
  static readonly httpStatus = 403 as const;
  static readonly httpCode = 'NOT_INFOGRAPHIC_OWNER' as const;
  static readonly httpMessage = 'Not the owner of this infographic';
  static readonly logLevel = 'warning' as const;
}

export class DocumentNotFoundError extends Schema.TaggedError<DocumentNotFoundError>()(
  'DocumentNotFoundError',
  {
    documentId: Schema.String,
  },
) {
  static readonly httpStatus = 404 as const;
  static readonly httpCode = 'DOCUMENT_NOT_FOUND' as const;
  static readonly httpMessage = 'Document not found';
  static readonly logLevel = 'warning' as const;
}
```

### Create Infographic

```typescript
// packages/media/src/infographic/use-cases/create-infographic.ts
import { Effect } from 'effect';
import { getCurrentUser } from '@repo/auth/policy';
import { InfographicRepo } from '../repos';
import { DocumentRepo } from '@repo/media/document';
import type { InfographicType } from '../prompts';

export interface CreateInfographicInput {
  title: string;
  infographicType: InfographicType;
  aspectRatio?: string;
  documentIds: string[];
}

export const createInfographic = (input: CreateInfographicInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const infographicRepo = yield* InfographicRepo;
    const documentRepo = yield* DocumentRepo;

    // Validate all documents exist and are owned by user
    for (const docId of input.documentIds) {
      const doc = yield* documentRepo.findById(docId);
      if (!doc) {
        return yield* Effect.fail(new DocumentNotFoundError({ documentId: docId }));
      }
      if (doc.createdBy !== user.id) {
        return yield* Effect.fail(new DocumentNotFoundError({ documentId: docId }));
      }
    }

    // Create infographic
    const infographic = yield* infographicRepo.insert({
      title: input.title,
      infographicType: input.infographicType,
      aspectRatio: input.aspectRatio ?? '1:1',
      sourceDocumentIds: input.documentIds,
      createdBy: user.id,
    });

    return infographic;
  }).pipe(
    Effect.withSpan('useCase.createInfographic', {
      attributes: {
        'infographic.type': input.infographicType,
        'document.count': input.documentIds.length,
      },
    }),
  );
```

### Get Infographic

```typescript
// packages/media/src/infographic/use-cases/get-infographic.ts
import { Effect } from 'effect';
import { getCurrentUser } from '@repo/auth/policy';
import { InfographicRepo } from '../repos';
import { InfographicNotFoundError, NotInfographicOwnerError } from '../errors';

export interface GetInfographicInput {
  infographicId: string;
}

export const getInfographic = (input: GetInfographicInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const infographicRepo = yield* InfographicRepo;

    const infographic = yield* infographicRepo.findByIdFull(input.infographicId);

    if (!infographic) {
      return yield* Effect.fail(
        new InfographicNotFoundError({ infographicId: input.infographicId }),
      );
    }

    if (infographic.createdBy !== user.id) {
      return yield* Effect.fail(
        new NotInfographicOwnerError({
          infographicId: input.infographicId,
          userId: user.id,
        }),
      );
    }

    return infographic;
  }).pipe(
    Effect.withSpan('useCase.getInfographic', {
      attributes: { 'infographic.id': input.infographicId },
    }),
  );
```

### Update Infographic

```typescript
// packages/media/src/infographic/use-cases/update-infographic.ts
import { Effect } from 'effect';
import { getCurrentUser } from '@repo/auth/policy';
import { InfographicRepo } from '../repos';
import { InfographicNotFoundError, NotInfographicOwnerError } from '../errors';

export interface UpdateInfographicInput {
  infographicId: string;
  title?: string;
  infographicType?: string;
  aspectRatio?: string;
  customInstructions?: string;
  feedbackInstructions?: string;
  styleOptions?: Record<string, unknown>;
  documentIds?: string[];
}

export const updateInfographic = (input: UpdateInfographicInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const infographicRepo = yield* InfographicRepo;

    const existing = yield* infographicRepo.findById(input.infographicId);

    if (!existing) {
      return yield* Effect.fail(
        new InfographicNotFoundError({ infographicId: input.infographicId }),
      );
    }

    if (existing.createdBy !== user.id) {
      return yield* Effect.fail(
        new NotInfographicOwnerError({
          infographicId: input.infographicId,
          userId: user.id,
        }),
      );
    }

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {};
    if (input.title !== undefined) updates.title = input.title;
    if (input.infographicType !== undefined) updates.infographicType = input.infographicType;
    if (input.aspectRatio !== undefined) updates.aspectRatio = input.aspectRatio;
    if (input.customInstructions !== undefined) updates.customInstructions = input.customInstructions;
    if (input.feedbackInstructions !== undefined) updates.feedbackInstructions = input.feedbackInstructions;
    if (input.styleOptions !== undefined) updates.styleOptions = input.styleOptions;
    if (input.documentIds !== undefined) updates.sourceDocumentIds = input.documentIds;

    const updated = yield* infographicRepo.update(input.infographicId, updates);

    return updated;
  }).pipe(
    Effect.withSpan('useCase.updateInfographic', {
      attributes: { 'infographic.id': input.infographicId },
    }),
  );
```

### Delete Infographic

```typescript
// packages/media/src/infographic/use-cases/delete-infographic.ts
import { Effect } from 'effect';
import { getCurrentUser } from '@repo/auth/policy';
import { InfographicRepo } from '../repos';
import { InfographicNotFoundError, NotInfographicOwnerError } from '../errors';

export interface DeleteInfographicInput {
  infographicId: string;
}

export const deleteInfographic = (input: DeleteInfographicInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const infographicRepo = yield* InfographicRepo;

    const existing = yield* infographicRepo.findById(input.infographicId);

    if (!existing) {
      return yield* Effect.fail(
        new InfographicNotFoundError({ infographicId: input.infographicId }),
      );
    }

    if (existing.createdBy !== user.id) {
      return yield* Effect.fail(
        new NotInfographicOwnerError({
          infographicId: input.infographicId,
          userId: user.id,
        }),
      );
    }

    // Cascade delete handled by FK constraint on selections
    yield* infographicRepo.delete(input.infographicId);

    return { deleted: true };
  }).pipe(
    Effect.withSpan('useCase.deleteInfographic', {
      attributes: { 'infographic.id': input.infographicId },
    }),
  );
```

### List Infographics

```typescript
// packages/media/src/infographic/use-cases/list-infographics.ts
import { Effect } from 'effect';
import { getCurrentUser } from '@repo/auth/policy';
import { InfographicRepo } from '../repos';

export interface ListInfographicsInput {
  limit?: number;
  offset?: number;
}

export const listInfographics = (input: ListInfographicsInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const infographicRepo = yield* InfographicRepo;

    const limit = input.limit ?? 20;
    const offset = input.offset ?? 0;

    const [infographics, total] = yield* Effect.all([
      infographicRepo.list({ userId: user.id, limit, offset }),
      infographicRepo.count(user.id),
    ]);

    return {
      items: infographics,
      total,
      limit,
      offset,
    };
  }).pipe(
    Effect.withSpan('useCase.listInfographics'),
  );
```

### Index Exports

```typescript
// packages/media/src/infographic/use-cases/index.ts
export * from './create-infographic';
export * from './get-infographic';
export * from './update-infographic';
export * from './delete-infographic';
export * from './list-infographics';
```

## Verification Log

<!-- Agent writes verification results here -->
