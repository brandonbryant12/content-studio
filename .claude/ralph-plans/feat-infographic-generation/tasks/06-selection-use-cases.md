# Task 06: Selection Use Cases

## Standards Checklist

Before starting implementation, read and understand:
- [ ] `standards/patterns/use-case.md`
- [ ] Task 04 (Repository implementation)
- [ ] Task 05 (Core use cases pattern)

## Context

Selection use cases manage the text snippets that users extract from documents for their infographics. Key requirements:
- Character limit per selection: 500 characters
- Soft limit warning: > 10 selections
- Store exact selected text for audit trail
- Track document source for each selection
- Support reordering

## Key Files

### Create New Files:
- `packages/media/src/infographic/use-cases/add-selection.ts`
- `packages/media/src/infographic/use-cases/remove-selection.ts`
- `packages/media/src/infographic/use-cases/update-selection.ts`
- `packages/media/src/infographic/use-cases/reorder-selections.ts`

### Update:
- `packages/media/src/infographic/use-cases/index.ts` - Export new use cases
- `packages/media/src/infographic/errors.ts` - Add selection errors

## Implementation Notes

### Additional Errors

```typescript
// Add to packages/media/src/infographic/errors.ts

export class SelectionNotFoundError extends Schema.TaggedError<SelectionNotFoundError>()(
  'SelectionNotFoundError',
  {
    selectionId: Schema.String,
  },
) {
  static readonly httpStatus = 404 as const;
  static readonly httpCode = 'SELECTION_NOT_FOUND' as const;
  static readonly httpMessage = 'Selection not found';
  static readonly logLevel = 'warning' as const;
}

export class SelectionTooLongError extends Schema.TaggedError<SelectionTooLongError>()(
  'SelectionTooLongError',
  {
    length: Schema.Number,
    maxLength: Schema.Number,
  },
) {
  static readonly httpStatus = 400 as const;
  static readonly httpCode = 'SELECTION_TOO_LONG' as const;
  static readonly httpMessage = 'Selection exceeds maximum character limit';
  static readonly logLevel = 'warning' as const;
}
```

### Constants

```typescript
// packages/media/src/infographic/constants.ts
export const SELECTION_MAX_LENGTH = 500;
export const SELECTION_SOFT_LIMIT = 10;
```

### Add Selection

```typescript
// packages/media/src/infographic/use-cases/add-selection.ts
import { Effect } from 'effect';
import { getCurrentUser } from '@repo/auth/policy';
import { InfographicRepo, SelectionRepo } from '../repos';
import { DocumentRepo } from '@repo/media/document';
import {
  InfographicNotFoundError,
  NotInfographicOwnerError,
  DocumentNotFoundError,
  SelectionTooLongError,
} from '../errors';
import { SELECTION_MAX_LENGTH, SELECTION_SOFT_LIMIT } from '../constants';

export interface AddSelectionInput {
  infographicId: string;
  documentId: string;
  selectedText: string;
  startOffset?: number;
  endOffset?: number;
}

export interface AddSelectionResult {
  selection: Selection;
  warningMessage?: string;
}

export const addSelection = (input: AddSelectionInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const infographicRepo = yield* InfographicRepo;
    const selectionRepo = yield* SelectionRepo;
    const documentRepo = yield* DocumentRepo;

    // Validate infographic exists and user owns it
    const infographic = yield* infographicRepo.findById(input.infographicId);

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

    // Validate document exists and user owns it
    const document = yield* documentRepo.findById(input.documentId);

    if (!document || document.createdBy !== user.id) {
      return yield* Effect.fail(
        new DocumentNotFoundError({ documentId: input.documentId }),
      );
    }

    // Validate text length
    if (input.selectedText.length > SELECTION_MAX_LENGTH) {
      return yield* Effect.fail(
        new SelectionTooLongError({
          length: input.selectedText.length,
          maxLength: SELECTION_MAX_LENGTH,
        }),
      );
    }

    // Get current selection count for ordering
    const currentCount = yield* selectionRepo.count(input.infographicId);

    // Insert selection
    const selection = yield* selectionRepo.insert({
      infographicId: input.infographicId,
      documentId: input.documentId,
      selectedText: input.selectedText,
      startOffset: input.startOffset,
      endOffset: input.endOffset,
      orderIndex: currentCount,  // Add to end
    });

    // Check soft limit
    const newCount = currentCount + 1;
    const warningMessage =
      newCount > SELECTION_SOFT_LIMIT
        ? `You have ${newCount} selections. Consider condensing for a cleaner infographic.`
        : undefined;

    return { selection, warningMessage };
  }).pipe(
    Effect.withSpan('useCase.addSelection', {
      attributes: {
        'infographic.id': input.infographicId,
        'document.id': input.documentId,
        'selection.length': input.selectedText.length,
      },
    }),
  );
```

### Remove Selection

```typescript
// packages/media/src/infographic/use-cases/remove-selection.ts
import { Effect } from 'effect';
import { getCurrentUser } from '@repo/auth/policy';
import { InfographicRepo, SelectionRepo } from '../repos';
import {
  InfographicNotFoundError,
  NotInfographicOwnerError,
  SelectionNotFoundError,
} from '../errors';

export interface RemoveSelectionInput {
  infographicId: string;
  selectionId: string;
}

export const removeSelection = (input: RemoveSelectionInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const infographicRepo = yield* InfographicRepo;
    const selectionRepo = yield* SelectionRepo;

    // Validate infographic exists and user owns it
    const infographic = yield* infographicRepo.findById(input.infographicId);

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

    // Delete selection
    yield* selectionRepo.delete(input.selectionId);

    return { deleted: true };
  }).pipe(
    Effect.withSpan('useCase.removeSelection', {
      attributes: {
        'infographic.id': input.infographicId,
        'selection.id': input.selectionId,
      },
    }),
  );
```

### Update Selection

```typescript
// packages/media/src/infographic/use-cases/update-selection.ts
import { Effect } from 'effect';
import { getCurrentUser } from '@repo/auth/policy';
import { InfographicRepo, SelectionRepo } from '../repos';
import {
  InfographicNotFoundError,
  NotInfographicOwnerError,
  SelectionNotFoundError,
  SelectionTooLongError,
} from '../errors';
import { SELECTION_MAX_LENGTH } from '../constants';

export interface UpdateSelectionInput {
  infographicId: string;
  selectionId: string;
  selectedText?: string;
}

export const updateSelection = (input: UpdateSelectionInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const infographicRepo = yield* InfographicRepo;
    const selectionRepo = yield* SelectionRepo;

    // Validate infographic exists and user owns it
    const infographic = yield* infographicRepo.findById(input.infographicId);

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

    // Validate text length if updating text
    if (input.selectedText !== undefined && input.selectedText.length > SELECTION_MAX_LENGTH) {
      return yield* Effect.fail(
        new SelectionTooLongError({
          length: input.selectedText.length,
          maxLength: SELECTION_MAX_LENGTH,
        }),
      );
    }

    // Build update object
    const updates: Record<string, unknown> = {};
    if (input.selectedText !== undefined) updates.selectedText = input.selectedText;

    const selection = yield* selectionRepo.update(input.selectionId, updates);

    return { selection };
  }).pipe(
    Effect.withSpan('useCase.updateSelection', {
      attributes: {
        'infographic.id': input.infographicId,
        'selection.id': input.selectionId,
      },
    }),
  );
```

### Reorder Selections

```typescript
// packages/media/src/infographic/use-cases/reorder-selections.ts
import { Effect } from 'effect';
import { getCurrentUser } from '@repo/auth/policy';
import { InfographicRepo, SelectionRepo } from '../repos';
import {
  InfographicNotFoundError,
  NotInfographicOwnerError,
} from '../errors';

export interface ReorderSelectionsInput {
  infographicId: string;
  orderedSelectionIds: string[];
}

export const reorderSelections = (input: ReorderSelectionsInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const infographicRepo = yield* InfographicRepo;
    const selectionRepo = yield* SelectionRepo;

    // Validate infographic exists and user owns it
    const infographic = yield* infographicRepo.findById(input.infographicId);

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

    // Reorder in database
    yield* selectionRepo.reorder(input.infographicId, input.orderedSelectionIds);

    // Return updated selections
    const selections = yield* selectionRepo.findByInfographic(input.infographicId);

    return { selections };
  }).pipe(
    Effect.withSpan('useCase.reorderSelections', {
      attributes: {
        'infographic.id': input.infographicId,
        'selection.count': input.orderedSelectionIds.length,
      },
    }),
  );
```

### Update Index

```typescript
// Add to packages/media/src/infographic/use-cases/index.ts
export * from './add-selection';
export * from './remove-selection';
export * from './update-selection';
export * from './reorder-selections';
```

## Verification Log

<!-- Agent writes verification results here -->
