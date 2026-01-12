# Task 10: API Contract

## Standards Checklist

Before starting implementation, read and understand:
- [ ] `standards/patterns/router-handler.md`
- [ ] `standards/patterns/serialization.md`
- [ ] `packages/api/src/contracts/podcasts.ts` - Reference contract
- [ ] `packages/api/src/contracts/voiceovers.ts` - Simpler reference

## Context

API contracts define the oRPC routes, input/output schemas, and error types. They are used by both the server (router implementation) and client (type-safe API calls).

## Key Files

### Create New Files:
- `packages/api/src/contracts/infographics.ts`

### Modify Existing Files:
- `packages/api/src/contracts/index.ts` - Export new contract

## Implementation Notes

### Contract Structure

```typescript
// packages/api/src/contracts/infographics.ts
import { oc } from '@orpc/contract';
import { Schema } from 'effect';

// ============= Input Schemas =============

const CreateInfographicSchema = Schema.Struct({
  title: Schema.String,
  infographicType: Schema.String,
  aspectRatio: Schema.optional(Schema.String),
  documentIds: Schema.Array(Schema.String),
});

const UpdateInfographicSchema = Schema.Struct({
  id: Schema.String,
  title: Schema.optional(Schema.String),
  infographicType: Schema.optional(Schema.String),
  aspectRatio: Schema.optional(Schema.String),
  customInstructions: Schema.optional(Schema.NullOr(Schema.String)),
  feedbackInstructions: Schema.optional(Schema.NullOr(Schema.String)),
  styleOptions: Schema.optional(Schema.Unknown),
  documentIds: Schema.optional(Schema.Array(Schema.String)),
});

const AddSelectionSchema = Schema.Struct({
  infographicId: Schema.String,
  documentId: Schema.String,
  selectedText: Schema.String,
  startOffset: Schema.optional(Schema.Number),
  endOffset: Schema.optional(Schema.Number),
});

const UpdateSelectionSchema = Schema.Struct({
  infographicId: Schema.String,
  selectionId: Schema.String,
  selectedText: Schema.optional(Schema.String),
});

const ReorderSelectionsSchema = Schema.Struct({
  infographicId: Schema.String,
  orderedSelectionIds: Schema.Array(Schema.String),
});

const GenerateSchema = Schema.Struct({
  id: Schema.String,
  feedbackInstructions: Schema.optional(Schema.String),
});

// ============= Output Schemas =============

const InfographicSchema = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  status: Schema.String,
  infographicType: Schema.String,
  aspectRatio: Schema.String,
  customInstructions: Schema.NullOr(Schema.String),
  feedbackInstructions: Schema.NullOr(Schema.String),
  styleOptions: Schema.NullOr(Schema.Unknown),
  imageUrl: Schema.NullOr(Schema.String),
  errorMessage: Schema.NullOr(Schema.String),
  sourceDocumentIds: Schema.Array(Schema.String),
  createdAt: Schema.String,
  updatedAt: Schema.String,
});

const SelectionSchema = Schema.Struct({
  id: Schema.String,
  documentId: Schema.String,
  selectedText: Schema.String,
  startOffset: Schema.NullOr(Schema.Number),
  endOffset: Schema.NullOr(Schema.Number),
  orderIndex: Schema.Number,
  createdAt: Schema.String,
});

const InfographicFullSchema = Schema.Struct({
  ...InfographicSchema.fields,
  selections: Schema.Array(SelectionSchema),
});

const InfographicListItemSchema = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  status: Schema.String,
  infographicType: Schema.String,
  imageUrl: Schema.NullOr(Schema.String),
  createdAt: Schema.String,
});

const KeyPointSuggestionSchema = Schema.Struct({
  text: Schema.String,
  documentId: Schema.String,
  documentTitle: Schema.String,
  relevance: Schema.Literal('high', 'medium'),
  category: Schema.optional(Schema.String),
});

const AddSelectionResultSchema = Schema.Struct({
  selection: SelectionSchema,
  warningMessage: Schema.optional(Schema.String),
});

const JobSchema = Schema.Struct({
  id: Schema.String,
  type: Schema.String,
  status: Schema.String,
  result: Schema.optional(Schema.Unknown),
  error: Schema.NullOr(Schema.String),
  createdAt: Schema.String,
  startedAt: Schema.NullOr(Schema.String),
  completedAt: Schema.NullOr(Schema.String),
});

// ============= Error Definitions =============

export const INFOGRAPHIC_NOT_FOUND = {
  status: 404,
  code: 'INFOGRAPHIC_NOT_FOUND',
  message: 'Infographic not found',
} as const;

export const NOT_INFOGRAPHIC_OWNER = {
  status: 403,
  code: 'NOT_INFOGRAPHIC_OWNER',
  message: 'Not the owner of this infographic',
} as const;

export const SELECTION_NOT_FOUND = {
  status: 404,
  code: 'SELECTION_NOT_FOUND',
  message: 'Selection not found',
} as const;

export const SELECTION_TOO_LONG = {
  status: 400,
  code: 'SELECTION_TOO_LONG',
  message: 'Selection exceeds character limit',
} as const;

export const INVALID_INFOGRAPHIC_GENERATION = {
  status: 400,
  code: 'INVALID_INFOGRAPHIC_GENERATION',
  message: 'Cannot generate infographic',
} as const;

export const DOCUMENT_NOT_FOUND = {
  status: 404,
  code: 'DOCUMENT_NOT_FOUND',
  message: 'Document not found',
} as const;

// ============= Contract Definition =============

export const infographicsContract = oc.router({
  // List infographics
  list: oc
    .input(Schema.Struct({
      limit: Schema.optional(Schema.Number),
      offset: Schema.optional(Schema.Number),
    }))
    .output(Schema.Struct({
      items: Schema.Array(InfographicListItemSchema),
      total: Schema.Number,
      limit: Schema.Number,
      offset: Schema.Number,
    }))
    .errors([]),

  // Get single infographic with selections
  get: oc
    .input(Schema.Struct({ id: Schema.String }))
    .output(InfographicFullSchema)
    .errors([INFOGRAPHIC_NOT_FOUND, NOT_INFOGRAPHIC_OWNER]),

  // Create infographic
  create: oc
    .input(CreateInfographicSchema)
    .output(InfographicFullSchema)
    .errors([DOCUMENT_NOT_FOUND]),

  // Update infographic
  update: oc
    .input(UpdateInfographicSchema)
    .output(InfographicSchema)
    .errors([INFOGRAPHIC_NOT_FOUND, NOT_INFOGRAPHIC_OWNER]),

  // Delete infographic
  delete: oc
    .input(Schema.Struct({ id: Schema.String }))
    .output(Schema.Struct({ deleted: Schema.Boolean }))
    .errors([INFOGRAPHIC_NOT_FOUND, NOT_INFOGRAPHIC_OWNER]),

  // === Selection Management ===

  // Add selection
  addSelection: oc
    .input(AddSelectionSchema)
    .output(AddSelectionResultSchema)
    .errors([
      INFOGRAPHIC_NOT_FOUND,
      NOT_INFOGRAPHIC_OWNER,
      DOCUMENT_NOT_FOUND,
      SELECTION_TOO_LONG,
    ]),

  // Remove selection
  removeSelection: oc
    .input(Schema.Struct({
      infographicId: Schema.String,
      selectionId: Schema.String,
    }))
    .output(Schema.Struct({ deleted: Schema.Boolean }))
    .errors([INFOGRAPHIC_NOT_FOUND, NOT_INFOGRAPHIC_OWNER, SELECTION_NOT_FOUND]),

  // Update selection
  updateSelection: oc
    .input(UpdateSelectionSchema)
    .output(Schema.Struct({ selection: SelectionSchema }))
    .errors([
      INFOGRAPHIC_NOT_FOUND,
      NOT_INFOGRAPHIC_OWNER,
      SELECTION_NOT_FOUND,
      SELECTION_TOO_LONG,
    ]),

  // Reorder selections
  reorderSelections: oc
    .input(ReorderSelectionsSchema)
    .output(Schema.Struct({ selections: Schema.Array(SelectionSchema) }))
    .errors([INFOGRAPHIC_NOT_FOUND, NOT_INFOGRAPHIC_OWNER]),

  // === AI Extraction ===

  extractKeyPoints: oc
    .input(Schema.Struct({ infographicId: Schema.String }))
    .output(Schema.Struct({
      suggestions: Schema.Array(KeyPointSuggestionSchema),
    }))
    .errors([INFOGRAPHIC_NOT_FOUND, NOT_INFOGRAPHIC_OWNER]),

  // === Generation ===

  generate: oc
    .input(GenerateSchema)
    .output(Schema.Struct({
      jobId: Schema.String,
      status: Schema.String,
    }))
    .errors([
      INFOGRAPHIC_NOT_FOUND,
      NOT_INFOGRAPHIC_OWNER,
      INVALID_INFOGRAPHIC_GENERATION,
    ]),

  getJob: oc
    .input(Schema.Struct({ jobId: Schema.String }))
    .output(JobSchema)
    .errors([{ status: 404, code: 'JOB_NOT_FOUND', message: 'Job not found' }]),
});
```

### Export from Index

```typescript
// In packages/api/src/contracts/index.ts
export * from './infographics';
```

## Verification Log

<!-- Agent writes verification results here -->
