# Project Overview

Content Studio is a podcast generation platform that converts documents into AI-generated podcasts.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + TanStack Router + TanStack Query |
| Backend | Hono + oRPC + Effect |
| Database | PostgreSQL + Drizzle ORM |
| AI | Google Gemini (LLM + TTS) |
| Storage | S3-compatible (R2/MinIO) |

## Package Structure

```
packages/
├── api/          # oRPC contracts + server implementation
├── auth/         # Authentication + authorization (better-auth + policies)
├── db/           # Drizzle schema + Effect layer
├── media/        # Document + Podcast business logic
├── queue/        # Job queue implementation
├── storage/      # S3/filesystem abstraction
├── ai/           # LLM + TTS services
├── testing/      # Test utilities + factories
└── ui/           # Shared React components

apps/
├── web/          # React frontend
└── server/       # Hono API server + workers
```

## Key Files

| File | Purpose |
|------|---------|
| `packages/api/src/server/runtime.ts` | Shared runtime creation |
| `packages/auth/src/policy/user.ts` | FiberRef user context |
| `packages/db/src/schemas/serialization.ts` | Serialization utilities |
| `packages/db/src/schemas/*.ts` | Entity schemas + serializers |
| `apps/server/src/workers/podcast-worker.ts` | Background job processing |

## Common Commands

```bash
# Development
pnpm dev                # Start dev servers
pnpm typecheck          # Type check all packages
pnpm build              # Build all packages
pnpm test               # Run tests

# Package-specific
pnpm --filter @repo/db typecheck
pnpm --filter @repo/api typecheck
pnpm --filter web dev
pnpm --filter web build

# Testing
pnpm test               # Run all tests
pnpm test:live          # Run live integration tests (requires env vars)
```

## Branded ID Types

All entity IDs use branded types with prefixes:

```typescript
type PodcastId = string & Brand<"PodcastId">;      // pod_xxx
type DocumentId = string & Brand<"DocumentId">;    // doc_xxx
type ScriptVersionId = string & Brand<"ScriptVersionId">; // ver_xxx
type JobId = string & Brand<"JobId">;              // job_xxx
```

When accepting IDs from external sources (API params, job payloads), cast to branded type:

```typescript
const job = yield* queue.getJob(jobId as JobId);
```

## Testing Utilities

### Effect Tests

Use `withTestUser` for user context in tests:

```typescript
import { withTestUser } from '@repo/testing';

const result = await Effect.runPromise(
  withTestUser(testUser)(myEffect)
);
```

### Factories

Use factories from `@repo/testing` for test data:

```typescript
import { DocumentFactory, PodcastFactory } from '@repo/testing';

const doc = DocumentFactory.build({ title: 'Test Doc' });
```
