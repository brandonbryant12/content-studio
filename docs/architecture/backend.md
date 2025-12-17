# Backend Architecture

## Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Runtime | Node.js + Effect-TS | Typed errors, dependency injection |
| API | oRPC | Type-safe RPC with contracts |
| Database | PostgreSQL + Drizzle | Relational data, migrations |
| Auth | Better Auth | Session management |
| Storage | S3 / Filesystem | Binary file storage |
| AI | Google Gemini | LLM + TTS |
| Queue | Database-backed | Background job processing |

## Core Entities

```
User
 └── owns → Project (content hub)
              ├── contains → Document (source content)
              └── produces → Podcast (generated output)
                              └── has → Script (intermediate)
```

**User**: Authentication identity. All entities have `createdBy` for ownership.

**Project**: Container that groups source documents and tracks generated outputs. The central organizing entity.

**Document**: Source text content. Can be manually created or uploaded (PDF, DOCX, etc.). Stored in binary storage with metadata in DB.

**Podcast**: Generated audio output. Created from documents via AI pipeline (script generation → audio synthesis).

**Script**: Intermediate artifact. Speaker-tagged segments that become audio.

## Architectural Patterns

### Service Layer Pattern

Each domain has a service that encapsulates business logic:

```
Service Interface (service.ts)
    ↓
Repository (repository.ts) ─── Database operations
    ↓
Layer (live.ts) ─── Dependency injection wiring
```

Services are accessed via Effect's Context.Tag system, enabling:
- Compile-time dependency verification
- Easy testing with mock layers
- Clean separation of interface from implementation

### Error Handling

All errors are typed and tagged. At the API boundary, Effect errors map to HTTP responses:

```
Effect Error          →  HTTP Response
────────────────────────────────────────
EntityNotFound        →  404
ForbiddenError        →  403
DbError, PolicyError  →  500
ValidationError       →  422
ExternalServiceError  →  502
RateLimitError        →  429
```

The `handleEffect` utility enforces exhaustive error handling—TypeScript errors if any error type is unhandled.

### Authorization

**Ownership model**: Entities have `createdBy` field. Operations verify the current user owns the entity before proceeding.

**Tenant isolation**: List operations automatically filter by current user. No query can return another user's data.

### Storage

Binary content (documents, audio files) stored in pluggable storage backend:
- Database (development)
- Filesystem (local)
- S3 (production)

Metadata lives in PostgreSQL. Storage keys reference the binary content.

## Request Flow

```
HTTP Request
    │
    ▼
API Contract ─── Validates input schema
    │
    ▼
Auth Middleware ─── Verifies session, builds user context
    │
    ▼
Effect Layers ─── Provides all service dependencies
    │
    ▼
Service Method ─── Business logic, ownership checks
    │
    ▼
Repository ─── Database operations
    │
    ▼
Error Mapping ─── Effect errors → HTTP errors
    │
    ▼
HTTP Response
```

## Background Processing

Long-running operations (AI generation) use a job queue:

1. API enqueues job with payload
2. Worker polls for pending jobs
3. Worker processes job, updates status
4. Client polls job status until complete

Job states: `pending` → `processing` → `completed` | `failed`

## Compliance Layer

Generated content passes through compliance gates before publishing:

```
Content Ready
    │
    ▼
Compliance Check ─── Ownership, readiness, constraints
    │
    ├── FAIL → Return blockers
    │
    ▼ PASS
Publish ─── Update status, record audit trail
```

Gates are pluggable—new checks can be added without changing core logic.

## Adding New Entities

1. **Schema**: Define table and types in db package
2. **Errors**: Add domain-specific error classes
3. **Service**: Create service interface, repository, layer
4. **API**: Define contract and handler
5. **Wire**: Register layer in API context

The pattern is consistent across all entities. Copy an existing domain as a template.
