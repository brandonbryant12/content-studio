# Task 06: SSE Events + API Contract + Router

## Standards Checklist

Before starting implementation, read and understand:
- [ ] `standards/patterns/router-handler.md`
- [ ] `standards/patterns/serialization.md`

## Context

Follow the exact patterns in:
- `packages/api/src/contracts/podcasts.ts` — oRPC contract with `oc.prefix`, `oc.route`, `Schema.standardSchemaV1`
- `packages/api/src/contracts/events.ts` — SSE event types and schemas
- `packages/api/src/contracts/index.ts` — Contract composition
- `packages/api/src/server/router/podcasts.ts` — Router with `handleEffectWithProtocol`
- `packages/api/src/server/router/index.ts` — Router composition
- `packages/api/src/server/effect-handler.ts` — Effect-to-Promise bridge

## Key Files

### Modify
- `packages/api/src/contracts/events.ts` — Add `'infographic'` to EntityType, add InfographicJobCompletionEvent
- `packages/api/src/contracts/index.ts` — Add `infographics: infographicContract`
- `packages/api/src/server/router/index.ts` — Add `infographics: infographicRouter`
- `apps/web/src/shared/hooks/sse-handlers.ts` — Add infographic event handlers (Task 08 will handle this)

### Create
- `packages/api/src/contracts/infographics.ts`
- `packages/api/src/server/router/infographics.ts`

## Implementation Notes

### SSE Events Update

In `events.ts`, add:
```typescript
export type EntityType = 'podcast' | 'document' | 'voiceover' | 'infographic';

export interface InfographicJobCompletionEvent {
  type: 'infographic_job_completion';
  jobId: string;
  jobType: 'generate-infographic';
  status: 'completed' | 'failed';
  infographicId: string;
  error?: string;
}

export type SSEEvent =
  | EntityChangeEvent
  | JobCompletionEvent
  | VoiceoverJobCompletionEvent
  | InfographicJobCompletionEvent  // NEW
  | ConnectionEvent;
```

Also add the corresponding Effect Schema and update the SSEEventSchema union.

### API Contract

```typescript
const infographicErrors = {
  INFOGRAPHIC_NOT_FOUND: {
    status: 404,
    data: std(Schema.Struct({ infographicId: Schema.String })),
  },
} as const;

const infographicContract = oc
  .prefix('/infographics')
  .tag('infographic')
  .router({
    list: oc
      .route({ method: 'GET', path: '/', summary: 'List infographics' })
      .input(std(Schema.Struct({
        limit: Schema.optional(CoerceNumber),
        offset: Schema.optional(CoerceNumber),
      })))
      .output(std(Schema.Array(InfographicOutputSchema))),

    get: oc
      .route({ method: 'GET', path: '/{id}', summary: 'Get infographic' })
      .errors(infographicErrors)
      .input(std(Schema.Struct({ id: InfographicIdSchema })))
      .output(std(InfographicOutputSchema)),

    create: oc
      .route({ method: 'POST', path: '/', summary: 'Create infographic' })
      .input(std(CreateInfographicSchema))
      .output(std(InfographicOutputSchema)),

    update: oc
      .route({ method: 'PATCH', path: '/{id}', summary: 'Update infographic' })
      .errors(infographicErrors)
      .input(std(Schema.Struct({
        id: InfographicIdSchema,
        title: Schema.optional(Schema.String),
        prompt: Schema.optional(Schema.String),
        infographicType: Schema.optional(InfographicTypeSchema),
        stylePreset: Schema.optional(InfographicStyleSchema),
        format: Schema.optional(InfographicFormatSchema),
        sourceDocumentIds: Schema.optional(Schema.Array(Schema.String)),
      })))
      .output(std(InfographicOutputSchema)),

    delete: oc
      .route({ method: 'DELETE', path: '/{id}', summary: 'Delete infographic' })
      .errors(infographicErrors)
      .input(std(Schema.Struct({ id: InfographicIdSchema })))
      .output(std(Schema.Struct({}))),

    generate: oc
      .route({ method: 'POST', path: '/{id}/generate', summary: 'Generate infographic image' })
      .errors(infographicErrors)
      .input(std(Schema.Struct({ id: InfographicIdSchema })))
      .output(std(InfographicOutputSchema)),

    getVersions: oc
      .route({ method: 'GET', path: '/{id}/versions', summary: 'Get infographic versions' })
      .errors(infographicErrors)
      .input(std(Schema.Struct({ id: InfographicIdSchema })))
      .output(std(Schema.Array(InfographicVersionOutputSchema))),
  });
```

### Router Handlers

Each handler follows this pattern:
```typescript
const infographicRouter = implement(infographicContract)
  .router({
    list: protectedProcedure.handler(({ input, context }) =>
      handleEffectWithProtocol(
        listInfographics({ limit: input.limit, offset: input.offset }).pipe(
          Effect.flatMap(serializeInfographicListEffect),
        ),
        context,
      ),
    ),

    get: protectedProcedure.handler(({ input, context }) =>
      handleEffectWithProtocol(
        getInfographic({ id: input.id }).pipe(
          Effect.flatMap(serializeInfographicEffect),
        ),
        context,
      ),
    ),

    // ... etc for create, update, delete, generate, getVersions
  });
```

**Important:** Use `Effect.flatMap(serializeXxxEffect)` not `Effect.map(serializeXxx)` — Effect-based serializers preserve tracing spans.

### Contract Index

In `packages/api/src/contracts/index.ts`:
```typescript
import infographicContract from './infographics';

export const appContract = oc.router({
  // ... existing
  infographics: infographicContract,
});
```

**Note:** The linter may auto-remove the import if it doesn't detect usage. Verify after editing.

## Verification Log

<!-- Agent writes verification results here -->
