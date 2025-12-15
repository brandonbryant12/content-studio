# Media Architecture

## Overview

Media types represent the different content formats that can be created, stored, and bundled within the content studio. This document describes the media type hierarchy and how they interact with projects.

## Media Type Hierarchy

```
                    ┌─────────────────┐
                    │    Document     │
                    │ (Base Content)  │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
       ┌──────────┐   ┌──────────┐   ┌──────────┐
       │ Podcast  │   │ (Graphic)│   │(Voiceover)│
       │ (Audio)  │   │ (Image)  │   │  (Audio)  │
       └──────────┘   └──────────┘   └──────────┘
              │              │              │
              └──────────────┼──────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │    Project      │
                    │ (Bundle/Group)  │
                    └─────────────────┘
```

## Media Types

### Documents (Base Layer)

Documents are the foundational content type. They represent text-based content that can be:
- Manually created
- Uploaded from files (TXT, PDF, DOCX, PPTX)

**Package:** `@repo/documents`

**Key Fields:**
- `title` - Display name
- `contentKey` - Storage path for content
- `mimeType` - Content type
- `wordCount` - Text statistics
- `source` - Origin (manual, upload_txt, etc.)

### Podcasts (Audio Derivative)

Podcasts are audio content derived from documents. They support:
- Voice-over (single speaker)
- Conversation (multi-speaker)

**Package:** `@repo/podcast`

**Key Fields:**
- `format` - voice_over | conversation
- `status` - draft → generating_script → script_ready → generating_audio → ready
- `audioUrl` - Generated audio location
- `duration` - Audio length in seconds

**Relationships:**
- Links to source documents via `podcastDocument` junction table
- Contains scripts via `podcastScript` table

### Graphics (Image Derivative) - Future

Graphics are visual content generated from documents:
- Infographics
- Charts
- Thumbnails
- Social media images

**Package:** `@repo/graphic` (not yet implemented)

**Planned Fields:**
- `type` - image | infographic | chart | thumbnail
- `status` - draft | generating | ready | failed
- `imageUrl` - Generated image location
- `dimensions` - width, height, format

### Voiceover (Audio Derivative) - Future

Standalone audio narration (distinct from podcasts):
- Single voice narration
- Short-form audio clips

Currently handled within podcast package as `format: 'voice_over'`.

## Project Integration

Projects bundle multiple media items using a **polymorphic junction pattern**:

```
┌─────────────┐       ┌─────────────────────────┐       ┌─────────────┐
│   Project   │──────<│     projectMedia        │>──────│   Document  │
│             │       │  - mediaType: document  │       │             │
│             │       │  - mediaType: podcast   │       ├─────────────┤
│             │       │  - order: 0, 1, 2...    │       │   Podcast   │
└─────────────┘       └─────────────────────────┘       └─────────────┘
```

See [Projects Architecture](./projects.md) for details.

## Storage Architecture

All media files are stored via the `@repo/storage` package:

```
Storage Providers
├── Database (default dev)
├── Filesystem (local)
└── S3 (production)

File Types
├── Documents: text/plain, application/pdf, etc.
├── Audio: audio/mpeg (MP3)
└── Images: image/png, image/jpeg
```

## Generation Pipeline

### Podcast Generation

```
1. User creates podcast with documents
2. Script generation (LLM)
   - Documents → Script segments
   - Speaker assignments
3. Audio generation (TTS)
   - Script → Multi-speaker audio
   - Voice synthesis via Google Gemini TTS
   - Output: WAV (24kHz, 16-bit, mono)
4. Storage upload
   - Audio file → S3/storage
```

See [TTS Architecture](./tts.md) for audio format details and gotchas.

### Graphics Generation (Planned)

```
1. User creates graphic with documents
2. Content analysis (LLM)
   - Extract key points
   - Suggest visual style
3. Image generation
   - Text → Image via AI
4. Storage upload
```

## Adding New Media Types

Follow this pattern to add a new media type:

### 1. Database Schema

```typescript
// packages/db/src/schemas/{type}.ts
export const {type}StatusEnum = pgEnum('{type}_status', [...]);

export const {type} = pgTable('{type}', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  status: {type}StatusEnum('status').notNull().default('draft'),
  // ... type-specific fields
  createdBy: text('created_by').references(() => user.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

### 2. Package Structure

```
packages/{type}/
├── src/
│   ├── index.ts      # Exports
│   ├── service.ts    # Service interface
│   ├── repository.ts # DB operations
│   └── live.ts       # Effect layer
├── package.json
└── tsconfig.json
```

### 3. Service Pattern

```typescript
interface {Type}Service {
  create(input): Effect<{Type}, {Type}Error>;
  findById(id): Effect<{Type}, {Type}Error>;
  list(options): Effect<{Type}[], {Type}Error>;
  update(id, input): Effect<{Type}, {Type}Error>;
  delete(id): Effect<void, {Type}Error>;
  setStatus(id, status): Effect<{Type}, {Type}Error>;
}
```

### 4. Project Integration

1. Add to `mediaTypeEnum` in `packages/db/src/schemas/projects.ts`
2. Add `{Type}MediaItem` to discriminated union in `packages/project/src/types.ts`
3. Update `MediaResolver` in `packages/project/src/media-resolver.ts`
4. Add API contract and router for {type} CRUD

## Error Handling

Each media type defines domain-specific errors:

```typescript
// packages/effect/src/errors.ts
export class DocumentNotFound extends Schema.TaggedError<...>() {}
export class PodcastNotFound extends Schema.TaggedError<...>() {}
export class MediaNotFound extends Schema.TaggedError<...>() {}
// Add: GraphicNotFound, VoiceoverNotFound, etc.
```

## Best Practices

1. **Tenant Isolation**: Always filter by `createdBy` in list queries
2. **Ownership Verification**: Check ownership before update/delete
3. **Status Tracking**: Use status enums for workflow states
4. **Batch Queries**: Group media resolution by type for efficiency
5. **Error Specificity**: Use domain-specific error types
