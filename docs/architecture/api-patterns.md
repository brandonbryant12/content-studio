# API Patterns

Type-safe RPC with contracts, validation, and error handling.

## Stack

| Component | Technology | Role |
|-----------|------------|------|
| Contract | oRPC | Define routes, input/output types |
| Validation | Valibot | Schema validation |
| Implementation | Effect-TS | Typed business logic |
| Transport | HTTP/JSON | Client-server communication |

## Architecture

```
Contract (shared)
    ├── Route definitions
    ├── Input schemas
    ├── Output schemas
    └── Error definitions
           │
           ▼
Router (server)
    ├── Handler functions
    ├── Effect execution
    └── Error mapping
           │
           ▼
Client (generated)
    └── Type-safe calls
```

## Contract Design

Contracts define the API surface. They're shared between client and server.

**Input**: What the client sends. Validated before reaching handlers.

**Output**: What the server returns. Serialized to JSON.

**Errors**: Domain-specific failures. Mapped to HTTP status codes.

### Grouping

Routes group by domain:

```
/documents  - CRUD for documents
/projects   - Project management
/podcasts   - Podcast operations
/export     - Publishing workflow
```

### Naming Conventions

| Operation | Verb | Example |
|-----------|------|---------|
| List | GET | list documents |
| Get single | GET | get document by id |
| Create | POST | create document |
| Update | PATCH | update document |
| Delete | DELETE | delete document |
| Action | POST | publish, generate |

## Error Handling

### Domain Errors

Each domain defines its error cases:

- Not found: Entity doesn't exist
- Forbidden: User lacks permission
- Validation: Invalid input
- External: Upstream service failed
- Rate limit: Too many requests

### HTTP Mapping

| Error Type | HTTP Status |
|------------|-------------|
| Not found | 404 |
| Forbidden | 403 |
| Unauthorized | 401 |
| Validation | 422 |
| External failure | 502 |
| Rate limited | 429 |
| Server error | 500 |

### Exhaustive Handling

The `handleEffect` utility requires mapping every possible error. TypeScript fails compilation if any error type is unhandled.

## Handler Pattern

Handlers bridge contracts to services:

1. Extract input from request
2. Build Effect with service calls
3. Provide dependencies (layers)
4. Map errors to HTTP responses
5. Serialize output

```typescript
handler: (input, context) => {
  const effect = service.operation(input)
  return handleEffect(
    effect.pipe(Effect.provide(context.layers)),
    errorMapping
  )
}
```

## Type Safety: DB → API → Client

The type chain must be unbroken from database to client. Breaking this chain leads to runtime validation failures that TypeScript should have caught.

### The Type Flow

```
DB Schema (Drizzle)
    │
    ├──▶ Type: Document = typeof document.$inferSelect
    │         (has Date fields, enum values)
    │
    └──▶ Valibot Schema: DocumentSchema = createSelectSchema(document)
                │
                ▼
API Contract (oRPC + Valibot)
    │
    ├──▶ REUSE DocumentOutputSchema from @repo/db/schema
    │         (Date → string, enums preserved)
    │
    └──▶ DO NOT manually duplicate schemas
                │
                ▼
Router Serializer
    │
    ├──▶ Typed input: (doc: Document) → DocumentOutput
    │
    └──▶ NEVER use `any` types
                │
                ▼
Client
    └──▶ Gets typed response inferred from contract
```

### Common Mistake: Schema Drift

❌ **BAD**: Manually duplicating enum values

```typescript
// In contract - WRONG!
const documentSchema = v.object({
  source: v.picklist(['manual', 'api', 'import']),  // Made-up values!
  // ...
});
```

The database might have `['manual', 'upload_pdf', 'upload_docx']` while the contract has different values. TypeScript can't catch this because the schemas are separate.

✅ **GOOD**: Import shared schemas from DB package

```typescript
// In @repo/db/schema
export const DocumentSourceSchema = v.picklist([
  'manual', 'upload_txt', 'upload_pdf', 'upload_docx', 'upload_pptx'
]);

export const DocumentOutputSchema = v.object({
  id: v.string(),
  source: DocumentSourceSchema,  // Single source of truth
  // ...
});

// In contract
import { DocumentOutputSchema } from '@repo/db/schema';
// Use DocumentOutputSchema directly
```

### Serializer Pattern

Serializers convert DB types to API output types. They must be typed, not `any`.

❌ **BAD**: Using `any` breaks type safety

```typescript
// eslint-disable @typescript-eslint/no-explicit-any
const serialize = (doc: any): any => ({ ...doc });  // No type checking!
```

✅ **GOOD**: Explicitly typed serializers

```typescript
// In serializers.ts
export interface DocumentOutput extends Omit<Document, 'createdAt' | 'updatedAt'> {
  createdAt: string;  // Date → string
  updatedAt: string;
}

export const serializeDocument = (doc: Document): DocumentOutput => ({
  id: doc.id,
  title: doc.title,
  source: doc.source,  // Type checked against DB enum!
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt.toISOString(),
});
```

### Adding New Output Fields

When the DB schema changes, follow this checklist:

1. **Update DB schema** (`@repo/db/schema`)
   - Add field to table definition
   - Run migration

2. **Update output schema** (`@repo/db/schema`)
   - Add field to `*OutputSchema` (e.g., `DocumentOutputSchema`)
   - Export any new enum schemas

3. **Update serializer** (`@repo/api/server/serializers.ts`)
   - Add field to output interface
   - Add serialization logic (especially for Date → string)

4. **TypeScript verifies the chain**
   - If contract output doesn't match serializer output, build fails
   - If serializer input doesn't match service output, build fails

### Handling Nullable Fields

DB fields may be nullable but API should normalize:

```typescript
// DB: tags can be null (JSONB column)
// API: always return array (never null)

export const serializePodcast = (podcast: Podcast): PodcastOutput => ({
  tags: podcast.tags ?? [],  // Normalize null → []
  // ...
});

// Output interface reflects the normalized type
export interface PodcastOutput {
  tags: string[];  // Not `string[] | null`
}
```

## Serialization

Database types don't always match API types:

- Dates: Convert to ISO strings
- UUIDs: Keep as strings
- Nested objects: Transform shape as needed
- Nulls: Match schema expectations

Keep serialization at the handler level, not in services.

## Conventions

**Consistency**: Same patterns across all domains. One shape for similar operations.

**Flat responses**: Avoid deep nesting. Prefer `{ entity, relatedCounts }` over `{ entity: { nested: { deep } } }`.

**Predictable errors**: Same error types mean same HTTP codes everywhere.

**Versioning**: Not currently implemented. Breaking changes require client updates.
