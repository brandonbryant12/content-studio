# API Handler Pattern

> Canonical guidance for routing, serialization, and protocol mapping lives here.

```mermaid
sequenceDiagram
  participant H as oRPC handler
  participant UC as Use case
  participant S as serializeEffect
  participant P as handleEffectWithProtocol

  H->>UC: useCase(input)
  UC-->>H: raw domain data
  H->>S: Effect.flatMap(serializeXxxEffect)
  S-->>H: Serialized payload
  H->>P: errors + requestId + attributes
  P-->>H: Promise<Serialized payload>
```

## Golden Principles

1. **Call exactly one use case per handler** <!-- enforced-by: manual-review -->
2. **Serialize in the handler, not the use case** <!-- enforced-by: invariant-test -->
3. **Pass `requestId` to `handleEffectWithProtocol`** for correlation and trace metadata <!-- enforced-by: manual-review -->
4. **Keep streaming contracts concretely typed** end-to-end <!-- enforced-by: lint -->
5. **Prefer Effect-based serializers** so serialization work is traced consistently <!-- enforced-by: manual-review -->

## Canonical Example

> See `packages/api/src/server/router/source.ts`

```typescript
get: protectedProcedure.sources.get.handler(
  async ({ context, input, errors }) => {
    return handleEffectWithProtocol(
      context.runtime,
      context.user,
      getSource({ id: input.id }).pipe(Effect.flatMap(serializeSourceEffect)),
      errors,
      {
        requestId: context.requestId,
        attributes: { 'source.id': input.id },
      },
    );
  },
),
```

## Handler Pipeline

```
handler -> one use case -> Effect.flatMap(serializeXxxEffect) -> handleEffectWithProtocol(...)
```

Most handlers follow that exact shape. Use custom error overrides only when protocol behavior truly needs to differ from the typed domain error mapping.

## Span Naming <!-- enforced-by: invariant-test -->

| Layer | Format | Example |
|---|---|---|
| Handler | `api.{domain}.{action}` | `api.sources.get` |
| Serializer | `serialize.{entity}` | `serialize.source` |
| Batch serializer | `serialize.{entity}.batch` | `serialize.source.batch` |

## Serializer Variants <!-- enforced-by: manual-review -->

Each entity serializer in `@repo/db/schema` typically exposes:

| Variant | Where to use | Tracing |
|---|---|---|
| `serializeXxxEffect(item)` | Single-item handlers | Yes |
| `serializeXxxsEffect(items)` | List handlers | Yes, parallel |
| `serializeXxx(item)` | Tests or intermediate transforms | No |

Batch serializers are derived from the single-item transform via `Effect.all(..., { concurrency: 'unbounded' })`.

### Serializer Implementation Pattern

Use the serializer factories from `packages/db/src/schemas/serialization.ts`:

```typescript
import { createBatchEffectSerializer, createEffectSerializer } from '@repo/db/schema';

const sourceTransform = (source: Source) => ({
  id: source.id,
  title: source.title,
  createdAt: source.createdAt.toISOString(),
  updatedAt: source.updatedAt.toISOString(),
  source: source.source,
});

export const serializeSourceEffect = createEffectSerializer('source', sourceTransform);
export const serializeSourcesEffect = createBatchEffectSerializer('source', sourceTransform);
export const serializeSource = sourceTransform;
```

## Activity Logging

Handlers can attach best-effort activity logging without blocking the main response:

```typescript
createSource(input).pipe(
  Effect.flatMap(serializeSourceEffect),
  tapLogActivity(context.runtime, context.user, 'created', 'source'),
)
```

## Transformation Rules <!-- enforced-by: manual-review -->

| Field type | Transformation |
|---|---|
| `Date` | `.toISOString()` |
| Optional or nullable | `?? null` |
| Nested entity | Recursive `serializeXxx(...)` or nested transform |
| Internal fields such as `userId` | Omit from serialized output |
| Computed fields | Derive in serializer, not the repo or use case |

## Protocol-Based Errors <!-- enforced-by: invariant-test -->

Use `handleEffectWithProtocol`. Domain errors already carry their protocol mapping; avoid hand-written status mapping unless the behavior is intentionally exceptional.

```typescript
// Correct
return handleEffectWithProtocol(runtime, user, effect, errors, {
  requestId: context.requestId,
});
```

## Streaming Handlers

For chat and SSE-like endpoints:

- Contract output must use concrete chunk types.
- Handler should return the typed stream directly, not `unknown`.
- Client code should not need manual casts to consume stream payloads.
