# Knowledge Base — Technical Architecture

## Table of Contents

1. [Overview](#overview)
2. [Data Model](#data-model)
3. [API Design (oRPC)](#api-design-orpc)
4. [Service Layer (Effect TS)](#service-layer-effect-ts)
5. [Background Jobs](#background-jobs)
6. [AI Integration](#ai-integration)
7. [External Integrations](#external-integrations)
8. [Error Handling](#error-handling)
9. [Migration Strategy](#migration-strategy)
10. [File & Directory Layout](#file--directory-layout)
11. [Open Questions](#open-questions)

---

## Overview

The Knowledge Base evolves the current "Documents" feature from a simple file-upload store into a unified content hub that supports three source types:

| Source Type | Description | Processing |
|-------------|-------------|------------|
| **File** | Upload TXT, PDF, DOCX, PPTX (existing) | Synchronous parse on upload |
| **URL** | Paste a web URL | Background: fetch, extract, clean |
| **Research** | AI deep research on a topic | Background: initiate Gemini research, poll, process |

All three produce the same core artifact: a **knowledge item** with extracted text content that can be attached to podcasts, voiceovers, and infographics as source material. The current `document` table and `sourceDocumentIds` relationships on other entities continue to work unchanged — knowledge items are a superset of documents.

### Design Principles

- **Additive, not rewrite** — Extend the existing `document` table with new source types and a processing status. No migration of existing data.
- **Same interfaces downstream** — Podcasts, voiceovers, and infographics already reference documents by ID via `sourceDocumentIds`. Knowledge items produce documents, so downstream entities need zero changes.
- **Background-first for IO** — URL scraping and research are long-running. They create a document in `processing` status, do work in a background job, then update to `ready`.
- **Full text, not vectors (Phase 1)** — Start with full-text content injection into prompts (the existing pattern). Vector/RAG is a Phase 2 consideration documented in [AI Integration](#ai-integration).

---

## Data Model

### Strategy: Extend the `document` Table

Rather than creating a separate `knowledge_item` table, we extend the existing `document` table. This keeps the foreign-key relationship from `podcast.sourceDocumentIds` working without a join table migration.

### Schema Changes

#### 1. Extend `documentSourceEnum`

```typescript
// packages/db/src/schemas/documents.ts
export const documentSourceEnum = pgEnum('document_source', [
  'manual',          // existing — typed text
  'upload_txt',      // existing
  'upload_pdf',      // existing
  'upload_docx',     // existing
  'upload_pptx',     // existing
  'url',             // NEW — scraped from web URL
  'research',        // NEW — AI deep research
]);
```

#### 2. Add `documentStatusEnum`

Existing documents have no processing lifecycle — they're synchronously created. URL and research sources need a status.

```typescript
export const documentStatusEnum = pgEnum('document_status', [
  'ready',        // Default for all existing rows and sync uploads
  'processing',   // URL fetch or research in progress
  'failed',       // Processing failed (retryable)
]);

export const DocumentStatus = {
  READY: 'ready',
  PROCESSING: 'processing',
  FAILED: 'failed',
} as const;
```

#### 3. New Columns on `document`

```typescript
export const document = pgTable(
  'document',
  {
    // ... existing columns unchanged ...

    // NEW: Processing status (default 'ready' — backwards compatible)
    status: documentStatusEnum('status').notNull().default('ready'),

    // NEW: Error message when status = 'failed'
    errorMessage: text('errorMessage'),

    // NEW: Source URL for url-type documents
    sourceUrl: text('sourceUrl'),

    // NEW: Research configuration for research-type documents
    researchConfig: jsonb('researchConfig').$type<ResearchConfig>(),

    // NEW: Job ID for background processing (links to job table)
    jobId: varchar('jobId', { length: 20 }).$type<JobId>(),

    // NEW: Extracted plain text content (denormalized for prompt injection)
    // For small docs this avoids re-downloading from storage on every generation.
    // Null for large documents that should be streamed from storage.
    extractedText: text('extractedText'),

    // NEW: Content hash for dedup / cache invalidation
    contentHash: text('contentHash'),
  },
  (table) => [
    index('document_createdBy_idx').on(table.createdBy),
    index('document_createdAt_idx').on(table.createdAt),
    index('document_status_idx').on(table.status),           // NEW
    index('document_sourceUrl_idx').on(table.sourceUrl),     // NEW — dedup URLs per user
  ],
);
```

#### 4. `ResearchConfig` Type

```typescript
export interface ResearchConfig {
  /** The user's research query/topic */
  query: string;
  /** Gemini model used for research */
  model?: string;
  /** External operation ID from Gemini Deep Research API */
  operationId?: string;
  /** Research status from the Gemini API */
  researchStatus?: 'pending' | 'running' | 'completed' | 'failed';
  /** Number of sources found */
  sourceCount?: number;
}
```

#### 5. Updated Schema Exports

```typescript
export const DocumentSourceSchema = Schema.Union(
  Schema.Literal('manual'),
  Schema.Literal('upload_txt'),
  Schema.Literal('upload_pdf'),
  Schema.Literal('upload_docx'),
  Schema.Literal('upload_pptx'),
  Schema.Literal('url'),
  Schema.Literal('research'),
);

export const DocumentStatusSchema = Schema.Union(
  Schema.Literal('ready'),
  Schema.Literal('processing'),
  Schema.Literal('failed'),
);

export const DocumentOutputSchema = Schema.Struct({
  // ... existing fields ...
  status: DocumentStatusSchema,           // NEW
  errorMessage: Schema.NullOr(Schema.String),    // NEW
  sourceUrl: Schema.NullOr(Schema.String),       // NEW
  // Note: researchConfig, extractedText, contentHash are NOT exposed in the output.
  // extractedText is accessed via getContent; researchConfig is internal.
});
```

#### 6. Companion Constants

```typescript
export const DocumentSource = {
  MANUAL: 'manual',
  UPLOAD_TXT: 'upload_txt',
  UPLOAD_PDF: 'upload_pdf',
  UPLOAD_DOCX: 'upload_docx',
  UPLOAD_PPTX: 'upload_pptx',
  URL: 'url',
  RESEARCH: 'research',
} as const;

export const DocumentStatus = {
  READY: 'ready',
  PROCESSING: 'processing',
  FAILED: 'failed',
} as const;
```

### Job Table Additions

New job types in `packages/db/src/schemas/jobs.ts`:

```typescript
export const JobType = {
  // ... existing ...
  GENERATE_PODCAST: 'generate-podcast',
  GENERATE_SCRIPT: 'generate-script',
  GENERATE_AUDIO: 'generate-audio',
  GENERATE_VOICEOVER: 'generate-voiceover',
  GENERATE_INFOGRAPHIC: 'generate-infographic',
  // NEW:
  PROCESS_URL: 'process-url',
  PROCESS_RESEARCH: 'process-research',
} as const;
```

### What Does NOT Change

- `podcast.sourceDocumentIds` — still an array of document IDs
- `infographic.sourceDocumentIds` — same
- `voiceover` — no document references currently
- All existing serializers continue to work; new fields have defaults/nulls

---

## API Design (oRPC)

### New Contract: `knowledge` (or extend `documents`)

We add new endpoints alongside the existing document endpoints. The contract lives in `packages/api/src/contracts/documents.ts` (extend in-place rather than creating a new contract file, since knowledge items ARE documents).

#### New Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/documents/from-url` | Create a document from a web URL |
| `POST` | `/documents/from-research` | Start an AI deep research |
| `POST` | `/documents/{id}/retry` | Retry a failed processing job |
| `GET` | `/documents/{id}/processing-status` | Get detailed processing status |

#### Contract Definitions

```typescript
// Add to packages/api/src/contracts/documents.ts

const knowledgeErrors = {
  ...documentErrors,
  URL_FETCH_FAILED: {
    status: 422,
    data: std(Schema.Struct({
      url: Schema.String,
      reason: Schema.String,
    })),
  },
  RESEARCH_FAILED: {
    status: 422,
    data: std(Schema.Struct({
      query: Schema.String,
      reason: Schema.String,
    })),
  },
  DOCUMENT_ALREADY_PROCESSING: {
    status: 409,
    data: std(Schema.Struct({
      documentId: Schema.String,
    })),
  },
  INVALID_URL: {
    status: 400,
    data: std(Schema.Struct({
      url: Schema.String,
      reason: Schema.String,
    })),
  },
} as const;

// Create document from URL
fromUrl: oc
  .route({
    method: 'POST',
    path: '/from-url',
    summary: 'Create document from URL',
    description: 'Scrape and extract content from a web URL',
  })
  .errors(knowledgeErrors)
  .input(std(Schema.Struct({
    url: Schema.String.pipe(Schema.minLength(1)),
    title: Schema.optional(
      Schema.String.pipe(Schema.minLength(1), Schema.maxLength(256)),
    ),
    metadata: Schema.optional(
      Schema.Record({ key: Schema.String, value: Schema.Unknown }),
    ),
  })))
  .output(std(DocumentOutputSchema)),

// Start AI deep research
fromResearch: oc
  .route({
    method: 'POST',
    path: '/from-research',
    summary: 'Create document from AI research',
    description: 'Start an AI deep research session on a topic',
  })
  .errors(knowledgeErrors)
  .input(std(Schema.Struct({
    query: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(1000)),
    title: Schema.optional(
      Schema.String.pipe(Schema.minLength(1), Schema.maxLength(256)),
    ),
  })))
  .output(std(DocumentOutputSchema)),

// Retry failed processing
retry: oc
  .route({
    method: 'POST',
    path: '/{id}/retry',
    summary: 'Retry document processing',
    description: 'Retry a failed URL fetch or research job',
  })
  .errors(knowledgeErrors)
  .input(std(Schema.Struct({ id: DocumentIdSchema })))
  .output(std(DocumentOutputSchema)),
```

#### Updated List Endpoint

Add optional filter parameters:

```typescript
list: oc
  .route({ method: 'GET', path: '/', ... })
  .input(std(Schema.Struct({
    limit: Schema.optional(CoerceNumber.pipe(...)),
    offset: Schema.optional(CoerceNumber.pipe(...)),
    // NEW filters:
    source: Schema.optional(DocumentSourceSchema),
    status: Schema.optional(DocumentStatusSchema),
  })))
  .output(std(Schema.Array(DocumentOutputSchema))),
```

### SSE Events

New event types for real-time processing updates:

```typescript
// packages/api/src/contracts/events.ts

export interface DocumentProcessingEvent {
  type: 'document_processing';
  documentId: string;
  status: 'processing' | 'ready' | 'failed';
  progress?: number;       // 0-100 for research progress
  errorMessage?: string;
  userId: string;
  timestamp: string;
}

// Add to SSEEvent union and schemas
```

---

## Service Layer (Effect TS)

### Repository Changes

#### Extended `DocumentRepoService`

Add methods to `packages/media/src/document/repos/document-repo.ts`:

```typescript
export interface DocumentRepoService {
  // ... existing methods ...

  /** Update document status (processing lifecycle) */
  readonly updateStatus: (
    id: string,
    status: DocumentStatus,
    errorMessage?: string,
  ) => Effect.Effect<Document, DocumentNotFound | DatabaseError, Db>;

  /** Update extracted text content and mark ready */
  readonly updateContent: (
    id: string,
    data: {
      contentKey: string;
      extractedText?: string;
      contentHash?: string;
      wordCount: number;
      metadata?: Record<string, unknown>;
    },
  ) => Effect.Effect<Document, DocumentNotFound | DatabaseError, Db>;

  /** Find by source URL for a given user (dedup) */
  readonly findBySourceUrl: (
    url: string,
    createdBy: string,
  ) => Effect.Effect<Document | null, DatabaseError, Db>;

  /** Update research config (for polling) */
  readonly updateResearchConfig: (
    id: string,
    config: Partial<ResearchConfig>,
  ) => Effect.Effect<Document, DocumentNotFound | DatabaseError, Db>;
}
```

### New Use Cases

All follow the standard use-case pattern from `standards/patterns/use-case.md`.

#### `create-from-url.ts`

```
packages/media/src/document/use-cases/create-from-url.ts
```

```typescript
export interface CreateFromUrlInput {
  url: string;
  title?: string;
  metadata?: Record<string, unknown>;
}

export const createFromUrl = (input: CreateFromUrlInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const documentRepo = yield* DocumentRepo;
    const queue = yield* Queue;

    // Validate URL format
    yield* validateUrl(input.url);

    // Check for duplicate URL for this user
    const existing = yield* documentRepo.findBySourceUrl(input.url, user.id);
    if (existing && existing.status === 'ready') {
      return existing; // Return existing document
    }

    // Create document placeholder in 'processing' status
    const doc = yield* documentRepo.insert({
      title: input.title || extractTitleFromUrl(input.url),
      contentKey: '', // Will be set when processing completes
      mimeType: 'text/html',
      wordCount: 0,
      source: 'url',
      status: 'processing',
      sourceUrl: input.url,
      metadata: input.metadata,
      createdBy: user.id,
    });

    // Enqueue background job
    const job = yield* queue.enqueue(
      'process-url',
      { documentId: doc.id, url: input.url, userId: user.id },
      user.id,
    );

    // Update document with job reference
    yield* documentRepo.update(doc.id, { jobId: job.id });

    return doc;
  }).pipe(
    Effect.withSpan('useCase.createFromUrl', {
      attributes: { 'document.url': input.url },
    }),
  );
```

#### `create-from-research.ts`

```
packages/media/src/document/use-cases/create-from-research.ts
```

```typescript
export interface CreateFromResearchInput {
  query: string;
  title?: string;
}

export const createFromResearch = (input: CreateFromResearchInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const documentRepo = yield* DocumentRepo;
    const queue = yield* Queue;

    // Create document placeholder
    const doc = yield* documentRepo.insert({
      title: input.title || `Research: ${input.query.slice(0, 100)}`,
      contentKey: '',
      mimeType: 'text/plain',
      wordCount: 0,
      source: 'research',
      status: 'processing',
      researchConfig: { query: input.query },
      createdBy: user.id,
    });

    // Enqueue background job
    const job = yield* queue.enqueue(
      'process-research',
      { documentId: doc.id, query: input.query, userId: user.id },
      user.id,
    );

    yield* documentRepo.update(doc.id, { jobId: job.id });

    return doc;
  }).pipe(
    Effect.withSpan('useCase.createFromResearch', {
      attributes: { 'research.query': input.query },
    }),
  );
```

#### `retry-processing.ts`

```
packages/media/src/document/use-cases/retry-processing.ts
```

```typescript
export interface RetryProcessingInput {
  id: string;
}

export const retryProcessing = (input: RetryProcessingInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const documentRepo = yield* DocumentRepo;
    const queue = yield* Queue;

    const doc = yield* documentRepo.findById(input.id);
    yield* requireOwnership(doc.createdBy);

    if (doc.status !== 'failed') {
      yield* Effect.fail(new DocumentAlreadyProcessing({ id: doc.id }));
    }

    // Reset to processing
    yield* documentRepo.updateStatus(doc.id, 'processing');

    // Re-enqueue based on source type
    if (doc.source === 'url' && doc.sourceUrl) {
      yield* queue.enqueue(
        'process-url',
        { documentId: doc.id, url: doc.sourceUrl, userId: user.id },
        user.id,
      );
    } else if (doc.source === 'research' && doc.researchConfig) {
      yield* queue.enqueue(
        'process-research',
        { documentId: doc.id, query: doc.researchConfig.query, userId: user.id },
        user.id,
      );
    }

    return yield* documentRepo.findById(doc.id);
  }).pipe(
    Effect.withSpan('useCase.retryProcessing', {
      attributes: { 'document.id': input.id },
    }),
  );
```

### Updated Use Cases

#### `get-document-content.ts` — Handle `extractedText`

The existing `getDocumentContent` downloads from storage and parses. For knowledge items, we can use the `extractedText` column directly when available:

```typescript
export const getDocumentContent = (input: GetDocumentContentInput) =>
  Effect.gen(function* () {
    const documentRepo = yield* DocumentRepo;
    const storage = yield* Storage;

    const doc = yield* documentRepo.findById(input.id);
    yield* requireOwnership(doc.createdBy);

    // If we have pre-extracted text, use it directly
    if (doc.extractedText) {
      return { content: doc.extractedText };
    }

    // Fall back to download + parse (existing behavior for file uploads)
    // ... existing logic ...
  });
```

#### `list-documents.ts` — Add Filters

Add optional `source` and `status` filters to the list query.

### New Service: `UrlScraper`

An Effect service for fetching and extracting content from URLs.

```
packages/media/src/document/services/url-scraper.ts
```

```typescript
export interface UrlScraperService {
  readonly fetchAndExtract: (
    url: string,
  ) => Effect.Effect<ScrapedContent, UrlFetchError>;
}

export interface ScrapedContent {
  title: string;
  content: string;        // Clean extracted text
  description?: string;
  author?: string;
  publishedAt?: string;
  wordCount: number;
}

export class UrlScraper extends Context.Tag('@repo/media/UrlScraper')<
  UrlScraper,
  UrlScraperService
>() {}
```

Implementation uses a lightweight HTML-to-text extraction approach:

1. `fetch()` the URL with appropriate headers (User-Agent, timeout)
2. Parse HTML with a library (see [External Integrations](#external-integrations))
3. Extract main content (strip nav, footer, ads)
4. Clean and format as plain text
5. Extract metadata (title, description, author)

### New Service: `DeepResearch`

An Effect service wrapping the Gemini Deep Research API.

```
packages/ai/src/research/service.ts
```

```typescript
export interface DeepResearchService {
  /** Start a research session. Returns an operation ID for polling. */
  readonly startResearch: (
    query: string,
  ) => Effect.Effect<{ operationId: string }, ResearchError>;

  /** Poll for research completion. Returns null if still running. */
  readonly getResearchResult: (
    operationId: string,
  ) => Effect.Effect<ResearchResult | null, ResearchError>;
}

export interface ResearchResult {
  content: string;
  sources: Array<{
    url: string;
    title: string;
    snippet?: string;
  }>;
  status: 'completed' | 'failed';
}

export class DeepResearch extends Context.Tag('@repo/ai/DeepResearch')<
  DeepResearch,
  DeepResearchService
>() {}
```

### Layer Composition

#### `packages/media/src/index.ts`

```typescript
// Add UrlScraper to Media type and MediaLive layer
export type Media =
  | DocumentRepo
  | PodcastRepo
  | VoiceoverRepo
  | InfographicRepo
  | ActivityLogRepo
  | UrlScraper;    // NEW

export const MediaLive: Layer.Layer<Media, never, Db | Storage> =
  Layer.mergeAll(
    DocumentRepoLive,
    PodcastRepoLive,
    VoiceoverRepoLive,
    InfographicRepoLive,
    ActivityLogRepoLive,
    UrlScraperLive,    // NEW
  );
```

#### `packages/ai/src/index.ts`

```typescript
// Add DeepResearch to AI type
export type AI = LLM | TTS | ImageGen | DeepResearch;
```

#### `packages/api/src/server/runtime.ts`

```typescript
// SharedServices picks up DeepResearch through AI, UrlScraper through Media
// No changes needed — the type union updates propagate automatically.
export type SharedServices = Db | Policy | Storage | Queue | AI | Media;
```

---

## Background Jobs

### Job Payloads

```typescript
// packages/queue/src/types.ts

export interface ProcessUrlPayload {
  readonly documentId: string;
  readonly url: string;
  readonly userId: string;
}

export interface ProcessUrlResult {
  readonly documentId: string;
  readonly wordCount: number;
  readonly contentHash: string;
}

export interface ProcessResearchPayload {
  readonly documentId: string;
  readonly query: string;
  readonly userId: string;
}

export interface ProcessResearchResult {
  readonly documentId: string;
  readonly wordCount: number;
  readonly sourceCount: number;
}
```

### Worker: `knowledge-worker.ts`

A new worker in `apps/server/src/workers/` that handles both job types:

```
apps/server/src/workers/knowledge-worker.ts
```

```typescript
export const createKnowledgeWorker = (config: BaseWorkerConfig): Worker =>
  createWorker<ProcessUrlPayload | ProcessResearchPayload>({
    name: 'knowledge-worker',
    jobTypes: ['process-url', 'process-research'],
    config,
    processJob: (job) => {
      switch (job.type) {
        case 'process-url':
          return handleProcessUrl(job as Job<ProcessUrlPayload>);
        case 'process-research':
          return handleProcessResearch(job as Job<ProcessResearchPayload>);
        default:
          return Effect.fail(
            new JobProcessingError({ jobId: job.id, message: `Unknown type: ${job.type}` }),
          );
      }
    },
    onJobComplete: (job) => {
      // Publish SSE event
      const payload = job.payload as { userId: string; documentId: string };
      ssePublisher.publish(payload.userId, {
        type: 'document_processing',
        documentId: payload.documentId,
        status: job.status === 'completed' ? 'ready' : 'failed',
        errorMessage: job.error ?? undefined,
        userId: payload.userId,
        timestamp: new Date().toISOString(),
      });
    },
  });
```

### Job Handler: `handleProcessUrl`

```
apps/server/src/workers/knowledge-handlers.ts
```

```typescript
export const handleProcessUrl = (job: Job<ProcessUrlPayload>) =>
  Effect.gen(function* () {
    const { documentId, url } = job.payload;
    const documentRepo = yield* DocumentRepo;
    const urlScraper = yield* UrlScraper;
    const storage = yield* Storage;

    // 1. Fetch and extract content
    const scraped = yield* urlScraper.fetchAndExtract(url);

    // 2. Upload extracted text to storage
    const contentKey = `documents/${documentId}/content.txt`;
    const textBuffer = Buffer.from(scraped.content, 'utf-8');
    yield* storage.upload(contentKey, textBuffer, 'text/plain');

    // 3. Compute content hash
    const contentHash = computeHash(scraped.content);

    // 4. Update document with results
    yield* documentRepo.updateContent(documentId, {
      contentKey,
      extractedText: scraped.content.length <= MAX_INLINE_TEXT
        ? scraped.content
        : undefined,
      contentHash,
      wordCount: scraped.wordCount,
      metadata: {
        scrapedTitle: scraped.title,
        description: scraped.description,
        author: scraped.author,
        publishedAt: scraped.publishedAt,
      },
    });

    // 5. Update title if auto-generated
    const doc = yield* documentRepo.findById(documentId);
    if (doc.title.startsWith('http') && scraped.title) {
      yield* documentRepo.update(documentId, { title: scraped.title });
    }

    // 6. Mark ready
    yield* documentRepo.updateStatus(documentId, 'ready');

    return { documentId, wordCount: scraped.wordCount, contentHash };
  }).pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        const documentRepo = yield* DocumentRepo;
        const errorMessage = formatError(error);
        yield* documentRepo.updateStatus(job.payload.documentId, 'failed', errorMessage);
        return yield* Effect.fail(
          new JobProcessingError({ jobId: job.id, message: errorMessage, cause: error }),
        );
      }),
    ),
    Effect.withSpan('worker.handleProcessUrl', {
      attributes: { 'job.id': job.id, 'document.url': job.payload.url },
    }),
  );
```

### Job Handler: `handleProcessResearch`

```typescript
export const handleProcessResearch = (job: Job<ProcessResearchPayload>) =>
  Effect.gen(function* () {
    const { documentId, query, userId } = job.payload;
    const documentRepo = yield* DocumentRepo;
    const deepResearch = yield* DeepResearch;
    const storage = yield* Storage;

    // 1. Start research
    const { operationId } = yield* deepResearch.startResearch(query);

    // Update config with operation ID
    yield* documentRepo.updateResearchConfig(documentId, {
      operationId,
      researchStatus: 'running',
    });

    // 2. Poll for completion (with backoff)
    const result = yield* pollForResearchResult(deepResearch, operationId).pipe(
      Effect.tap((progress) => {
        // Publish progress events via SSE
        ssePublisher.publish(userId, {
          type: 'document_processing',
          documentId,
          status: 'processing',
          progress: progress.percent,
          userId,
          timestamp: new Date().toISOString(),
        });
      }),
    );

    // 3. Store results
    const contentKey = `documents/${documentId}/research.txt`;
    const textBuffer = Buffer.from(result.content, 'utf-8');
    yield* storage.upload(contentKey, textBuffer, 'text/plain');

    const wordCount = calculateWordCount(result.content);
    const contentHash = computeHash(result.content);

    yield* documentRepo.updateContent(documentId, {
      contentKey,
      extractedText: result.content.length <= MAX_INLINE_TEXT
        ? result.content
        : undefined,
      contentHash,
      wordCount,
      metadata: {
        sources: result.sources,
        sourceCount: result.sources.length,
      },
    });

    yield* documentRepo.updateResearchConfig(documentId, {
      researchStatus: 'completed',
      sourceCount: result.sources.length,
    });

    yield* documentRepo.updateStatus(documentId, 'ready');

    return { documentId, wordCount, sourceCount: result.sources.length };
  }).pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        const documentRepo = yield* DocumentRepo;
        const errorMessage = formatError(error);
        yield* documentRepo.updateStatus(job.payload.documentId, 'failed', errorMessage);
        yield* documentRepo.updateResearchConfig(job.payload.documentId, {
          researchStatus: 'failed',
        });
        return yield* Effect.fail(
          new JobProcessingError({ jobId: job.id, message: errorMessage, cause: error }),
        );
      }),
    ),
    Effect.withSpan('worker.handleProcessResearch', {
      attributes: { 'job.id': job.id, 'research.query': job.payload.query },
    }),
  );
```

### Research Polling Strategy

```typescript
const pollForResearchResult = (
  deepResearch: DeepResearchService,
  operationId: string,
) =>
  Effect.gen(function* () {
    // Poll with exponential backoff: 2s, 4s, 8s, 16s, 30s (cap)
    // Max total wait: ~10 minutes
    let result = yield* deepResearch.getResearchResult(operationId);
    let attempt = 0;
    const maxAttempts = 40;

    while (!result && attempt < maxAttempts) {
      const delay = Math.min(2000 * Math.pow(2, attempt), 30_000);
      yield* Effect.sleep(delay);
      result = yield* deepResearch.getResearchResult(operationId);
      attempt++;
    }

    if (!result) {
      yield* Effect.fail(new ResearchTimeoutError({ operationId }));
    }

    return result!;
  });
```

### Worker Registration

In `apps/server/src/workers/index.ts`:

```typescript
import { createKnowledgeWorker } from './knowledge-worker';

export const createAllWorkers = (config: BaseWorkerConfig) => [
  createPodcastWorker(config),
  createVoiceoverWorker(config),
  createInfographicWorker(config),
  createKnowledgeWorker(config),  // NEW
];
```

---

## AI Integration

### Phase 1: Full-Text Injection (Current Pattern)

The existing pattern in `generate-script.ts` fetches all source document content and concatenates it into the user prompt. This pattern continues to work for knowledge items because they produce the same `extractedText` / storage content.

```typescript
// Existing pattern — no changes needed
const documentContents = yield* Effect.all(
  podcast.documents.map((doc) =>
    getDocumentContent({ id: doc.id }).pipe(Effect.map((r) => r.content)),
  ),
  { concurrency: 'unbounded' },
);
const combinedContent = documentContents.join('\n\n---\n\n');
```

Key optimization: `getDocumentContent` now reads from `extractedText` column first (an in-DB cache), avoiding a storage round-trip for most knowledge items.

### Content Size Limits

With URL scraping and research, documents may be longer than typical uploads. Add a content truncation strategy:

```typescript
// packages/media/src/shared/text-utils.ts

export const MAX_PROMPT_CONTENT_CHARS = 100_000; // ~25K tokens

export const truncateForPrompt = (content: string): string => {
  if (content.length <= MAX_PROMPT_CONTENT_CHARS) return content;
  return content.slice(0, MAX_PROMPT_CONTENT_CHARS) +
    '\n\n[Content truncated due to length]';
};
```

### Phase 2: RAG / Vector Search (Future)

When full-text injection hits token limits or when users have many knowledge items, consider:

1. **pgvector extension** — Add an `embedding` column to `document` with `vector(1536)` type
2. **Chunking** — Split documents into ~500-token chunks, each stored as a row in `document_chunk`
3. **Embedding generation** — Background job generates embeddings via Gemini's `text-embedding-004`
4. **Retrieval** — At generation time, embed the user prompt, find top-K similar chunks, inject those

This is explicitly out of scope for Phase 1. The architecture is designed so that adding an `embedding` column and a `document_chunk` table later is non-breaking.

---

## External Integrations

### URL Fetching / Scraping

**Recommended library: `@extractus/article-extractor`**

This package is purpose-built for extracting article content from web pages. It handles:
- Main content extraction (strips nav, footer, sidebar, ads)
- Metadata extraction (title, author, date)
- Clean text output

Alternative: `mozilla/readability` (the engine behind Firefox Reader View) via `jsdom`.

**Implementation approach:**

```typescript
// packages/media/src/document/services/url-scraper-impl.ts

const make: UrlScraperService = {
  fetchAndExtract: (url: string) =>
    Effect.tryPromise({
      try: async () => {
        // 1. Fetch with timeout and size limit
        const response = await fetch(url, {
          headers: { 'User-Agent': 'ContentStudio/1.0' },
          signal: AbortSignal.timeout(30_000),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const html = await response.text();

        // 2. Extract article content
        const { extract } = await import('@extractus/article-extractor');
        const article = await extract(url, html);

        if (!article?.content) {
          throw new Error('Could not extract content from URL');
        }

        // 3. Convert HTML content to plain text
        const text = htmlToText(article.content);

        return {
          title: article.title ?? new URL(url).hostname,
          content: text,
          description: article.description,
          author: article.author,
          publishedAt: article.published,
          wordCount: calculateWordCount(text),
        };
      },
      catch: (cause) => new UrlFetchError({ url, cause }),
    }),
};
```

**Safety considerations:**
- Timeout: 30 seconds max
- Size limit: Reject responses > 5MB
- No SSRF: Validate URL is public (not `localhost`, `10.x.x.x`, `192.168.x.x`, etc.)
- Rate limiting: Max 10 concurrent URL fetches per user

### Google Deep Research (Gemini API)

**API integration via Vercel AI SDK's Google provider** (already used for LLM):

The Gemini API exposes deep research as a long-running operation:

```typescript
// packages/ai/src/research/providers/google.ts

const make: DeepResearchService = {
  startResearch: (query) =>
    Effect.tryPromise({
      try: async () => {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey,
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: query }] }],
              tools: [{ googleSearch: {} }],
              generationConfig: {
                // Deep research specific config
              },
            }),
          },
        );
        const data = await response.json();
        return { operationId: data.name ?? data.operationId };
      },
      catch: (cause) => new ResearchError({ query, cause }),
    }),

  getResearchResult: (operationId) =>
    Effect.tryPromise({
      try: async () => {
        // Poll the operation endpoint
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/operations/${operationId}`,
          { headers: { 'x-goog-api-key': apiKey } },
        );
        const data = await response.json();

        if (!data.done) return null;

        // Extract research report from response
        return {
          content: data.response?.candidates?.[0]?.content?.parts
            ?.map((p: any) => p.text)
            .join('\n') ?? '',
          sources: extractSources(data),
          status: 'completed' as const,
        };
      },
      catch: (cause) => new ResearchError({ query: operationId, cause }),
    }),
};
```

> **Note:** The exact Gemini Deep Research API shape may differ. The implementation should be adapted based on the final API documentation. If the Deep Research API is not yet generally available, we can start with a Gemini grounded-generation approach (using Google Search grounding) as a fallback.

### File Parsing (Existing)

The existing `packages/media/src/document/parsers.ts` already handles TXT, PDF, DOCX, PPTX. No new parsing libraries needed for Phase 1. The `extractedText` column ensures we only parse once.

---

## Error Handling

All new errors follow the `Schema.TaggedError` pattern with HTTP protocol properties.

```typescript
// packages/media/src/errors.ts — add these

export class UrlFetchError extends Schema.TaggedError<UrlFetchError>()(
  'UrlFetchError',
  {
    url: Schema.String,
    message: Schema.optional(Schema.String),
    cause: Schema.optional(Schema.Unknown),
  },
) {
  static readonly httpStatus = 422 as const;
  static readonly httpCode = 'URL_FETCH_FAILED' as const;
  static readonly httpMessage = (e: UrlFetchError) =>
    e.message ?? `Failed to fetch content from ${e.url}`;
  static readonly logLevel = 'warn' as const;

  static getData(e: UrlFetchError) {
    return { url: e.url };
  }
}

export class InvalidUrlError extends Schema.TaggedError<InvalidUrlError>()(
  'InvalidUrlError',
  {
    url: Schema.String,
    reason: Schema.String,
  },
) {
  static readonly httpStatus = 400 as const;
  static readonly httpCode = 'INVALID_URL' as const;
  static readonly httpMessage = (e: InvalidUrlError) =>
    `Invalid URL: ${e.reason}`;
  static readonly logLevel = 'silent' as const;

  static getData(e: InvalidUrlError) {
    return { url: e.url, reason: e.reason };
  }
}

export class DocumentAlreadyProcessing extends Schema.TaggedError<DocumentAlreadyProcessing>()(
  'DocumentAlreadyProcessing',
  {
    id: Schema.String,
  },
) {
  static readonly httpStatus = 409 as const;
  static readonly httpCode = 'DOCUMENT_ALREADY_PROCESSING' as const;
  static readonly httpMessage = (e: DocumentAlreadyProcessing) =>
    `Document ${e.id} is already being processed`;
  static readonly logLevel = 'silent' as const;

  static getData(e: DocumentAlreadyProcessing) {
    return { documentId: e.id };
  }
}
```

```typescript
// packages/ai/src/errors.ts — add these

export class ResearchError extends Schema.TaggedError<ResearchError>()(
  'ResearchError',
  {
    query: Schema.String,
    message: Schema.optional(Schema.String),
    cause: Schema.optional(Schema.Unknown),
  },
) {
  static readonly httpStatus = 422 as const;
  static readonly httpCode = 'RESEARCH_FAILED' as const;
  static readonly httpMessage = (e: ResearchError) =>
    e.message ?? `Research failed for query: ${e.query}`;
  static readonly logLevel = 'warn' as const;

  static getData(e: ResearchError) {
    return { query: e.query };
  }
}

export class ResearchTimeoutError extends Schema.TaggedError<ResearchTimeoutError>()(
  'ResearchTimeoutError',
  {
    operationId: Schema.String,
  },
) {
  static readonly httpStatus = 504 as const;
  static readonly httpCode = 'RESEARCH_TIMEOUT' as const;
  static readonly httpMessage = 'Research operation timed out';
  static readonly logLevel = 'warn' as const;
}
```

### Error → User Message Mapping

| Error | User-Facing Message |
|-------|---------------------|
| `UrlFetchError` | "We couldn't fetch content from that URL. Please check the URL and try again." |
| `InvalidUrlError` | "That doesn't look like a valid URL. Please enter a complete URL starting with https://." |
| `DocumentAlreadyProcessing` | "This document is already being processed. Please wait for it to finish." |
| `ResearchError` | "The AI research session encountered an error. You can retry." |
| `ResearchTimeoutError` | "The research is taking longer than expected. Please try again." |

### Retry Strategy

- **URL fetch**: 3 automatic retries with exponential backoff (2s, 4s, 8s) within the job handler
- **Research**: No automatic retry (each research session costs API credits). User-triggered retry via the `retry` endpoint.
- **Transient failures** (network, rate limits): Handled by the worker's built-in retry schedule

---

## Migration Strategy

### Database Migration

```sql
-- Add new enum values
ALTER TYPE document_source ADD VALUE 'url';
ALTER TYPE document_source ADD VALUE 'research';

-- Create new enum
CREATE TYPE document_status AS ENUM ('ready', 'processing', 'failed');

-- Add new columns (all nullable or with defaults for backwards compatibility)
ALTER TABLE document
  ADD COLUMN status document_status NOT NULL DEFAULT 'ready',
  ADD COLUMN "errorMessage" text,
  ADD COLUMN "sourceUrl" text,
  ADD COLUMN "researchConfig" jsonb,
  ADD COLUMN "jobId" varchar(20),
  ADD COLUMN "extractedText" text,
  ADD COLUMN "contentHash" text;

-- Add indexes
CREATE INDEX document_status_idx ON document (status);
CREATE INDEX document_sourceUrl_idx ON document ("sourceUrl");
```

This migration is fully backwards-compatible:
- Existing documents get `status = 'ready'` (the default)
- All new columns are nullable
- No existing data needs transformation

### Drizzle Migration

Using Drizzle's migration system:

```bash
pnpm db:generate   # Generate migration SQL from schema changes
pnpm db:push       # Apply to development DB
```

---

## File & Directory Layout

### New Files

```
packages/db/src/schemas/documents.ts              # MODIFIED — new columns, enums, schemas
packages/db/src/schemas/jobs.ts                    # MODIFIED — new job types

packages/media/src/document/
  repos/document-repo.ts                           # MODIFIED — new methods
  use-cases/
    create-from-url.ts                             # NEW
    create-from-research.ts                        # NEW
    retry-processing.ts                            # NEW
    index.ts                                       # MODIFIED — export new use cases
  services/
    url-scraper.ts                                 # NEW — service interface + tag
    url-scraper-impl.ts                            # NEW — implementation
    url-validator.ts                               # NEW — SSRF protection, URL validation
    index.ts                                       # NEW — exports
  index.ts                                         # MODIFIED — export new services

packages/media/src/errors.ts                       # MODIFIED — new error classes
packages/media/src/shared/text-utils.ts            # MODIFIED — add truncateForPrompt, computeHash
packages/media/src/index.ts                        # MODIFIED — export new types, update Media type

packages/ai/src/
  research/
    service.ts                                     # NEW — DeepResearch service interface
    providers/google.ts                            # NEW — Gemini implementation
    index.ts                                       # NEW — exports
  errors.ts                                        # MODIFIED — new error classes
  index.ts                                         # MODIFIED — export DeepResearch, update AI type

packages/api/src/
  contracts/documents.ts                           # MODIFIED — new endpoints
  contracts/events.ts                              # MODIFIED — new event type
  server/router/document.ts                        # MODIFIED — new handler methods

packages/queue/src/
  types.ts                                         # MODIFIED — new payloads/results

apps/server/src/workers/
  knowledge-worker.ts                              # NEW
  knowledge-handlers.ts                            # NEW
  index.ts                                         # MODIFIED — register new worker
```

### Unchanged Files

- All podcast, voiceover, infographic code — they reference documents by ID and don't care about source type
- Auth, storage, queue service interfaces
- Frontend (separate implementation plan)

---

## Open Questions

1. **Deep Research API availability** — Is the Gemini Deep Research API generally available, or do we need a fallback (e.g., Gemini with Google Search grounding)?

2. **`extractedText` column size** — What's the max size we should inline in the DB vs. always reading from storage? Proposed: 100KB (`MAX_INLINE_TEXT`). Larger content stays in storage only.

3. **URL re-scraping** — Should we support re-fetching a URL to get updated content? If yes, we'd add a `refreshContent` use case that re-enqueues the fetch job. The `contentHash` column enables change detection.

4. **Content deduplication** — If two users paste the same URL, should they share content or each get their own document? Proposed: Each user gets their own document (simpler authorization model), but we can cache the scraped content by URL hash for efficiency.

5. **Research cost tracking** — Deep Research uses significant API credits. Do we need a per-user quota or cost tracking mechanism?

6. **YouTube / Media URLs** — Should URL scraping support YouTube (transcript extraction) or podcast RSS feeds? These would need specialized extractors.
