# Task 01: Database Schema

## Standards Checklist

Before starting implementation, read and understand:
- [x] `standards/patterns/repository.md`
- [x] `standards/patterns/serialization.md`

## Context

The brand table stores all brand-related data including embedded personas and segments as JSONB arrays. This follows the pattern established in `podcasts.ts` which uses JSONB for `generationContext`, `segments`, and `tags`.

Reference files:
- `packages/db/src/schemas/podcasts.ts` - Pattern for JSONB columns and serialization
- `packages/db/src/schemas/brands.ts` - Where BrandId type should be added
- `packages/db/src/schemas/serialization.ts` - Serializer factory functions

## Key Files

- `packages/db/src/schemas/brands.ts` - Add BrandId type alongside PodcastId, DocumentId
- `packages/db/src/schemas/brands-table.ts` - NEW: Create brand table and Effect schemas
- `packages/db/src/schema.ts` - Add export for brands-table

## Implementation Details

### BrandId Type (in brands.ts)
```typescript
export const BrandIdSchema = Schema.String.pipe(
  Schema.pattern(/^brd_[0-9a-hjkmnp-tv-z]{16}$/, {
    message: () => 'Invalid brand ID format',
  }),
  Schema.brand('BrandId'),
);

export type BrandId = typeof BrandIdSchema.Type;

export const generateBrandId = (): BrandId =>
  `brd_${generateRandomBase32()}` as BrandId;
```

### JSONB Interfaces
```typescript
interface BrandChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface BrandPersona {
  id: string;
  name: string;
  role: string;
  voiceId: string;  // Maps to TTS voices
  personalityDescription: string;
  speakingStyle: string;
  exampleQuotes: string[];
}

interface BrandSegment {
  id: string;
  name: string;
  description: string;
  messagingTone: string;
  keyBenefits: string[];
}

interface BrandColors {
  primary: string;
  secondary?: string;
  accent?: string;
}
```

### Table Schema
```typescript
export const brand = pgTable('brand', {
  id: varchar('id', { length: 20 }).$type<BrandId>().$default(generateBrandId).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  mission: text('mission'),
  values: jsonb('values').$type<string[]>().default([]),
  colors: jsonb('colors').$type<BrandColors>(),
  brandGuide: text('brand_guide'),
  chatMessages: jsonb('chat_messages').$type<BrandChatMessage[]>().default([]),
  personas: jsonb('personas').$type<BrandPersona[]>().default([]),
  segments: jsonb('segments').$type<BrandSegment[]>().default([]),
  createdBy: text('created_by').notNull().references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('brand_createdBy_idx').on(table.createdBy),
]);
```

### Effect Schemas
Create input/output schemas following podcasts.ts pattern:
- CreateBrandSchema
- UpdateBrandSchema
- BrandOutputSchema
- BrandListItemOutputSchema

### Serializers
```typescript
export const serializeBrandEffect = createEffectSerializer('brand', brandTransform);
export const serializeBrand = createSyncSerializer(brandTransform);
```

## Implementation Notes

- Added `BrandIdSchema` and `generateBrandId` to `packages/db/src/schemas/brands.ts` using the existing `generateRandomBase32` helper
- Created `packages/db/src/schemas/brands-table.ts` with:
  - JSONB interfaces: `BrandChatMessage`, `BrandPersona`, `BrandSegment`, `BrandColors`
  - Table definition with all required fields including JSONB arrays
  - Input schemas: `CreateBrandSchema`, `UpdateBrandSchema`, `UpdateBrandFields`
  - Output schemas: `BrandOutputSchema`, `BrandListItemOutputSchema` (includes persona/segment counts)
  - Serializers: Effect-based and sync variants following podcasts.ts pattern
- Exported `brands-table` from `packages/db/src/schema.ts`
- Note: `db:push` requires interactive confirmation; run manually with `pnpm push` in packages/db

## Verification Log

```
✅ pnpm --filter @repo/db typecheck - PASS
✅ pnpm typecheck - PASS
✅ pnpm build - PASS
✅ pnpm test - PASS
```
