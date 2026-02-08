# Task 01: DB Schema + Branded IDs

## Standards Checklist

Before starting implementation, read and understand:
- [ ] `standards/patterns/repository.md`
- [ ] `standards/overview.md`

## Context

Follow the exact patterns in:
- `packages/db/src/schemas/brands.ts` — branded ID generation with Crockford base32
- `packages/db/src/schemas/podcasts.ts` — table definition, pgEnum, jsonb fields, timestamps, Output schemas, serializers
- `packages/db/src/schemas/voiceovers.ts` — another entity schema reference
- `packages/db/src/schemas/serialization.ts` — `createEffectSerializer`, `createBatchEffectSerializer`
- `packages/db/src/schema.ts` — star-export index

## Key Files

### Modify
- `packages/db/src/schemas/brands.ts` — Add `InfographicId` (`inf_`) and `InfographicVersionId` (`inv_`)
- `packages/db/src/schema.ts` — Add `export * from './schemas/infographics'`

### Create
- `packages/db/src/schemas/infographics.ts` — Full schema file

## Implementation Notes

### Branded IDs
```typescript
// InfographicId: inf_ prefix
export const InfographicIdSchema = Schema.String.pipe(
  Schema.pattern(/^inf_[0-9a-hjkmnp-tv-z]{16}$/, {
    message: () => 'Invalid infographic ID format',
  }),
  Schema.brand('InfographicId'),
);
export type InfographicId = typeof InfographicIdSchema.Type;
export const generateInfographicId = (): InfographicId =>
  `inf_${generateRandomBase32()}` as InfographicId;

// InfographicVersionId: inv_ prefix
export const InfographicVersionIdSchema = Schema.String.pipe(
  Schema.pattern(/^inv_[0-9a-hjkmnp-tv-z]{16}$/, {
    message: () => 'Invalid infographic version ID format',
  }),
  Schema.brand('InfographicVersionId'),
);
export type InfographicVersionId = typeof InfographicVersionIdSchema.Type;
export const generateInfographicVersionId = (): InfographicVersionId =>
  `inv_${generateRandomBase32()}` as InfographicVersionId;
```

### pgEnums
```typescript
export const infographicTypeEnum = pgEnum('infographic_type', [
  'timeline',
  'comparison',
  'stats_dashboard',
  'key_takeaways',
]);

export const infographicStyleEnum = pgEnum('infographic_style', [
  'modern_minimal',
  'bold_colorful',
  'corporate',
  'playful',
  'dark_mode',
  'editorial',
]);

export const infographicFormatEnum = pgEnum('infographic_format', [
  'portrait',    // 1080x1920
  'square',      // 1080x1080
  'landscape',   // 1920x1080
  'og_card',     // 1200x630
]);

export const infographicStatusEnum = pgEnum('infographic_status', [
  'draft',
  'generating',
  'ready',
  'failed',
]);
```

### Tables
- `infographic` table with: id (PK, text), title (text), prompt (text), infographicType (enum), stylePreset (enum), format (enum), sourceDocumentIds (jsonb array of strings), imageStorageKey (text, nullable), thumbnailStorageKey (text, nullable), status (enum, default 'draft'), errorMessage (text, nullable), createdBy (text, FK to user), createdAt (timestamp), updatedAt (timestamp)
- `infographic_version` table with: id (PK, text), infographicId (text, FK to infographic, cascade delete), versionNumber (integer), prompt (text), infographicType (enum), stylePreset (enum), format (enum), imageStorageKey (text), thumbnailStorageKey (text, nullable), createdAt (timestamp)
- Indexes: infographic.createdBy, infographic.status, infographic_version.infographicId

### Output Schemas + Serializers
Follow the pattern in `podcasts.ts`:
- `InfographicOutput` schema with `Schema.Struct`
- `InfographicVersionOutput` schema
- `serializeInfographicEffect` using `createEffectSerializer`
- `serializeInfographicListEffect` using `createBatchEffectSerializer`
- `serializeInfographicVersionEffect` / batch version

### Migration
After creating the schema, run `pnpm db:generate` to create the Drizzle migration.

## Verification Log

<!-- Agent writes verification results here -->
