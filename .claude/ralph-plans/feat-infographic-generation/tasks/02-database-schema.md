# Task 02: Database Schema

## Standards Checklist

Before starting implementation, read and understand:
- [ ] `standards/patterns/repository.md`
- [ ] `standards/patterns/serialization.md`
- [ ] `packages/db/src/schemas/podcasts.ts` - Reference for schema patterns
- [ ] `packages/db/src/schemas/voiceovers.ts` - Reference for simpler entity

## Context

The database layer uses:
- **Drizzle ORM** for schema definition and queries
- **PostgreSQL** as the database
- **Branded ID types** with prefixes (e.g., `pod_xxx`, `doc_xxx`)
- **Effect-based serializers** for converting DB entities to API responses
- **JSONB** for flexible nested data (like styleOptions, generationContext)

Status enum for infographics: `drafting` → `generating` → `ready` / `failed`

## Key Files

### Create New Files:
- `packages/db/src/schemas/infographics.ts` - Schema + serializers

### Modify Existing Files:
- `packages/db/src/schemas/index.ts` - Export infographic schema
- `packages/db/src/index.ts` - Re-export types

### Create Migration:
- Run `pnpm --filter @repo/db db:generate` after schema creation

## Implementation Notes

### Branded ID Type

```typescript
import { generateId } from '../id';

export type InfographicId = string & { readonly _brand: 'InfographicId' };
export type InfographicSelectionId = string & { readonly _brand: 'InfographicSelectionId' };

export const generateInfographicId = (): InfographicId =>
  generateId('inf') as InfographicId;

export const generateInfographicSelectionId = (): InfographicSelectionId =>
  generateId('sel') as InfographicSelectionId;
```

### Status Enum

```typescript
export const infographicStatusEnum = pgEnum('infographic_status', [
  'drafting',
  'generating',
  'ready',
  'failed',
]);

export const InfographicStatus = {
  DRAFTING: 'drafting',
  GENERATING: 'generating',
  READY: 'ready',
  FAILED: 'failed',
} as const;
```

### Infographic Table

```typescript
export const infographic = pgTable(
  'infographic',
  {
    id: varchar('id', { length: 20 }).$type<InfographicId>().$default(generateInfographicId).primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    status: infographicStatusEnum('status').notNull().default('drafting'),

    // Type and style
    infographicType: varchar('infographic_type', { length: 50 }).notNull(),  // timeline, comparison, etc.
    aspectRatio: varchar('aspect_ratio', { length: 10 }).notNull().default('1:1'),
    customInstructions: text('custom_instructions'),
    feedbackInstructions: text('feedback_instructions'),  // For regeneration
    styleOptions: jsonb('style_options').$type<StyleOptions>(),

    // Generated output
    imageUrl: text('image_url'),
    errorMessage: text('error_message'),

    // Source tracking
    sourceDocumentIds: jsonb('source_document_ids').$type<string[]>().notNull().default([]),
    generationContext: jsonb('generation_context').$type<GenerationContext>(),

    // Audit
    createdBy: text('created_by').notNull().references(() => user.id),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('infographic_created_by_idx').on(table.createdBy),
    index('infographic_status_idx').on(table.status),
  ],
);
```

### Selection Table

```typescript
export const infographicSelection = pgTable(
  'infographic_selection',
  {
    id: varchar('id', { length: 20 }).$type<InfographicSelectionId>().$default(generateInfographicSelectionId).primaryKey(),
    infographicId: varchar('infographic_id', { length: 20 })
      .$type<InfographicId>()
      .notNull()
      .references(() => infographic.id, { onDelete: 'cascade' }),
    documentId: varchar('document_id', { length: 20 })
      .$type<DocumentId>()
      .notNull()
      .references(() => document.id),

    // Selection data
    selectedText: text('selected_text').notNull(),
    startOffset: integer('start_offset'),  // Optional: character position in document
    endOffset: integer('end_offset'),
    orderIndex: integer('order_index').notNull().default(0),

    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('infographic_selection_infographic_id_idx').on(table.infographicId),
    index('infographic_selection_order_idx').on(table.infographicId, table.orderIndex),
  ],
);
```

### Type Definitions

```typescript
export interface StyleOptions {
  colorScheme?: string;  // e.g., 'vibrant', 'muted', 'monochrome'
  emphasis?: string[];   // e.g., ['bold-headers', 'icons']
  layout?: string;       // e.g., 'compact', 'spacious'
}

export interface GenerationContext {
  promptUsed: string;
  selectionsAtGeneration: Array<{
    id: string;
    text: string;
    documentId: string;
  }>;
  modelId: string;
  aspectRatio: string;
  generatedAt: string;  // ISO timestamp
}
```

### Serializers

Follow the pattern from `packages/db/src/schemas/podcasts.ts`:

```typescript
import { Effect } from 'effect';
import { createSerializer } from './serialization';

// Effect-based serializer with tracing
export const serializeInfographicEffect = createSerializer(
  'infographic',
  (row: typeof infographic.$inferSelect) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    infographicType: row.infographicType,
    aspectRatio: row.aspectRatio,
    customInstructions: row.customInstructions,
    feedbackInstructions: row.feedbackInstructions,
    styleOptions: row.styleOptions,
    imageUrl: row.imageUrl,
    errorMessage: row.errorMessage,
    sourceDocumentIds: row.sourceDocumentIds,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }),
);

// List item serializer (lighter weight)
export const serializeInfographicListItemEffect = createSerializer(
  'infographic-list-item',
  (row: typeof infographic.$inferSelect) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    infographicType: row.infographicType,
    imageUrl: row.imageUrl,
    createdAt: row.createdAt.toISOString(),
  }),
);

// Selection serializer
export const serializeSelectionEffect = createSerializer(
  'infographic-selection',
  (row: typeof infographicSelection.$inferSelect) => ({
    id: row.id,
    documentId: row.documentId,
    selectedText: row.selectedText,
    startOffset: row.startOffset,
    endOffset: row.endOffset,
    orderIndex: row.orderIndex,
    createdAt: row.createdAt.toISOString(),
  }),
);
```

## Verification Log

<!-- Agent writes verification results here -->
