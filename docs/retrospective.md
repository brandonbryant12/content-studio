# Effect Patterns Refactoring Retrospective

This document captures the architectural improvements made to adopt idiomatic Effect patterns throughout the codebase.

---

## 1. Shared ManagedRuntime

### Problem

The previous implementation created a new `ManagedRuntime` for every HTTP request:

```typescript
// OLD PATTERN - orpc.ts
export const createAuthenticatedLayers = (config: LayerConfig) => {
  const dbLayer = DbLive(config.db);
  const policyLayer = DatabasePolicyLive.pipe(Layer.provide(dbLayer));
  const queueLayer = QueueLive.pipe(Layer.provide(dbLayer));
  const storageLayer = createStorageLayer(config.storageConfig, dbLayer);
  const ttsLayer = GoogleTTSLive({ apiKey: config.geminiApiKey });
  const llmLayer = GoogleLive({ apiKey: config.geminiApiKey });
  // ... rebuild entire layer graph per request
  return Layer.mergeAll(dbLayer, policyLayer, queueLayer, ...);
};

// Called on EVERY request
const layers = createAuthenticatedLayers(config);
const runtime = ManagedRuntime.make(layers);
await runtime.runPromise(effect);
```

**Issues:**
- Expensive: Layer graph rebuilt on every request
- Defeats resource pooling (DB connections, AI clients)
- No lifecycle management across requests
- Memory pressure from runtime churn

### New Pattern

Single shared runtime created at server startup:

```typescript
// NEW PATTERN - packages/api/src/server/runtime.ts
export type SharedServices =
  | Db
  | Policy
  | Storage
  | Queue
  | TTS
  | LLM
  | Documents
  | PodcastRepo
  | ScriptVersionRepo;

export const createServerRuntime = (config: ServerRuntimeConfig): ServerRuntime => {
  const layers = createSharedLayers(config);  // Built ONCE
  return ManagedRuntime.make(layers);
};

// apps/server/src/index.ts - at startup
const runtime = createServerRuntime({ db, geminiApiKey, storageConfig });

// In request handlers - reuse the shared runtime
await runtime.runPromise(withCurrentUser(user)(effect));
```

**Benefits:**
- Layer graph built once at startup
- Resources properly pooled (connections, clients)
- Proper lifecycle via ManagedRuntime
- Significantly reduced per-request overhead

---

## 2. FiberRef for Request-Scoped User Context

### Problem

User context was passed via `Context.Tag`, requiring layer recomposition per request:

```typescript
// OLD PATTERN - CurrentUser as Context.Tag
export class CurrentUser extends Context.Tag('@repo/auth/CurrentUser')<
  CurrentUser,
  User
>() {}

export const CurrentUserLive = (user: User) => Layer.succeed(CurrentUser, user);

// Every request needed a new layer
const userLayer = CurrentUserLive(sessionUser);
const effect = myEffect.pipe(Effect.provide(userLayer));
```

**Issues:**
- Layer composition required for each user
- Couldn't share runtime across requests with different users
- Complex layer dependency management
- Testing required layer mocking

### New Pattern

User context via `FiberRef` with `Effect.locally` scoping:

```typescript
// NEW PATTERN - packages/auth/src/policy/user.ts
export const CurrentUserRef = FiberRef.unsafeMake<Option.Option<User>>(Option.none());

// Accessor for protected routes
export const getCurrentUser: Effect.Effect<User, UnauthorizedError> =
  FiberRef.get(CurrentUserRef).pipe(
    Effect.flatMap((option) =>
      Option.isSome(option)
        ? Effect.succeed(option.value)
        : Effect.fail(new UnauthorizedError({ message: 'Not authenticated' }))
    ),
  );

// Scoping helper - sets user for a fiber subtree
export const withCurrentUser = <A, E, R>(user: User) =>
  (effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
    Effect.locally(CurrentUserRef, Option.some(user))(effect);

// Usage in request handler
await runtime.runPromise(
  withCurrentUser(sessionUser)(myEffect)  // User scoped to this fiber
);
```

**Benefits:**
- No layer recomposition per request
- Shared runtime works with different users
- Simpler mental model (user flows through fiber)
- Easy testing: `withCurrentUser(testUser)(effect)`

### Service Migration

Services that need user context now read from FiberRef:

```typescript
// OLD - services declared CurrentUser dependency
export type DocumentContext = Db | Storage | CurrentUser;

const create = Effect.gen(function* () {
  const user = yield* CurrentUser;  // Context.Tag lookup
  // ...
});

// NEW - services read from FiberRef at runtime
export type DocumentContext = Db | Storage;  // No CurrentUser!

const create = Effect.gen(function* () {
  const user = yield* getCurrentUser;  // FiberRef lookup
  // ...
});
```

---

## 3. Effect-Idiomatic Serialization

### Problem

Serialization was done with plain functions, missing Effect benefits:

```typescript
// OLD PATTERN - manual serializer functions
export const serializeDocument = (doc: Document): DocumentOutput => ({
  id: doc.id,
  title: doc.title,
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt.toISOString(),
  // ...
});

// Usage - no tracing, no error handling
const output = serializeDocument(document);
const outputs = documents.map(serializeDocument);
```

**Issues:**
- No tracing/observability
- Errors throw (not Effect-native)
- No standardized pattern across entities
- Batch operations not optimized

### New Pattern

Serialization utilities with Effect integration:

```typescript
// NEW PATTERN - packages/db/src/schemas/serialization.ts

// Error type for serialization failures
export class SerializationError extends Data.TaggedError('SerializationError')<{
  entity: string;
  message: string;
  cause?: unknown;
}> {}

// Create Effect-based serializer with tracing
export const createEffectSerializer = <DbType, OutputType>(
  entityName: string,
  transform: (entity: DbType) => OutputType,
) => {
  return (entity: DbType): Effect.Effect<OutputType, SerializationError> =>
    Effect.try({
      try: () => transform(entity),
      catch: (cause) =>
        new SerializationError({
          entity: entityName,
          message: `Failed to serialize ${entityName}`,
          cause,
        }),
    }).pipe(
      Effect.withSpan(`serialize.${entityName}`, {
        attributes: { 'serialization.entity': entityName },
      }),
    );
};

// Create batch serializer (parallel execution)
export const createBatchEffectSerializer = <DbType, OutputType>(
  entityName: string,
  transform: (entity: DbType) => OutputType,
) => {
  const serialize = createEffectSerializer(entityName, transform);
  return (entities: readonly DbType[]): Effect.Effect<OutputType[], SerializationError> =>
    Effect.all(entities.map(serialize), { concurrency: 'unbounded' }).pipe(
      Effect.withSpan(`serialize.${entityName}.batch`, {
        attributes: { 'serialization.count': entities.length },
      }),
    );
};

// Sync serializer for simple cases (map callbacks)
export const createSyncSerializer = <DbType, OutputType>(
  transform: (entity: DbType) => OutputType,
): ((entity: DbType) => OutputType) => transform;
```

### Entity Implementation

Each entity defines a pure transform and exports three serializer variants:

```typescript
// packages/db/src/schemas/documents.ts

// 1. Pure transform function (private)
const documentTransform = (doc: Document): DocumentOutput => ({
  id: doc.id,
  title: doc.title,
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt.toISOString(),
  // ...
});

// 2. Effect-based serializer (with tracing)
export const serializeDocumentEffect = createEffectSerializer('document', documentTransform);

// 3. Batch serializer (parallel, with tracing)
export const serializeDocumentsEffect = createBatchEffectSerializer('document', documentTransform);

// 4. Sync serializer (for map callbacks)
export const serializeDocument = createSyncSerializer(documentTransform);
```

### Usage Examples

```typescript
// In Effect.gen handlers (recommended)
const handler = Effect.gen(function* () {
  const doc = yield* getDocument(id);
  return yield* serializeDocumentEffect(doc);  // Traced!
});

// Batch serialization (parallel)
const outputs = yield* serializeDocumentsEffect(documents);

// In simple map callbacks (no tracing)
const outputs = documents.map(serializeDocument);
```

**Benefits:**
- Automatic tracing via `Effect.withSpan`
- Standardized error type (`SerializationError`)
- Batch operations run in parallel
- Consistent pattern across all entities
- Choice of Effect or sync based on use case

---

## 4. Handler Pattern Updates

### Problem

Handlers mixed paradigms and required explicit layer provision:

```typescript
// OLD PATTERN
return handleEffect(
  Effect.gen(function* () {
    // ... business logic
  }).pipe(Effect.provide(context.layers)),  // Manual layer provision
  {
    DatabaseError: () => { throw new ORPCError('INTERNAL_SERVER_ERROR'); },
    // ... error mapping
  },
);
```

### New Pattern

Handlers receive shared runtime, user scoped via FiberRef:

```typescript
// NEW PATTERN
return handleEffect(
  context.runtime,
  context.user,
  Effect.gen(function* () {
    // ... business logic (no Effect.provide needed!)
  }),
  {
    DatabaseError: () => new ORPCError('INTERNAL_SERVER_ERROR'),
    // ... error mapping (returns errors, doesn't throw)
  },
);
```

---

## Summary of Files Changed

| Area | Files | Change |
|------|-------|--------|
| **FiberRef Infrastructure** | `packages/auth/src/policy/user.ts` | `CurrentUserRef`, `getCurrentUser`, `withCurrentUser` |
| **Policy Updates** | `packages/auth/src/policy/policies.ts` | Use `getCurrentUser` instead of `CurrentUser` tag |
| **Service Updates** | `packages/media/src/document/live.ts` | Read user from FiberRef |
| **Shared Runtime** | `packages/api/src/server/runtime.ts` | `createServerRuntime`, `SharedServices` |
| **Context Simplification** | `packages/api/src/server/orpc.ts` | Simplified `ORPCContext`, removed layer factories |
| **Handler Updates** | `packages/api/src/server/router/*.ts` | New `handleEffect` signature |
| **Worker Updates** | `apps/server/src/workers/podcast-worker.ts` | Shared runtime + `withCurrentUser` |
| **Serialization** | `packages/db/src/schemas/serialization.ts` | `createEffectSerializer`, `createBatchEffectSerializer` |
| **Entity Serializers** | `packages/db/src/schemas/{documents,podcasts,jobs}.ts` | Effect-based serializers |
| **Testing** | `packages/testing/src/setup/layers.ts` | `withTestUser` helper |

---

## Performance Impact

1. **Startup**: Slightly longer (layer graph built once)
2. **Per-request**: Significantly faster (no layer/runtime creation)
3. **Memory**: Reduced churn (single runtime instance)
4. **Observability**: Better (serialization spans, consistent tracing)

---

## Migration Guide

### For New Handlers

```typescript
// 1. Use shared runtime from context
const { runtime, user } = context;

// 2. Write pure Effect logic (no Effect.provide)
const effect = Effect.gen(function* () {
  const doc = yield* documents.get(id);
  return yield* serializeDocumentEffect(doc);
});

// 3. Call handleEffect with runtime and user
return handleEffect(runtime, user, effect, errorMapping);
```

### For New Services

```typescript
// 1. Don't include CurrentUser in service dependencies
export type MyServiceContext = Db | Storage;  // Not CurrentUser!

// 2. Read user from FiberRef when needed
const myMethod = Effect.gen(function* () {
  const user = yield* getCurrentUser;
  // ...
});
```

### For Tests

```typescript
// Use withTestUser helper
const result = await Effect.runPromise(
  withTestUser(testUser)(myEffect)
);
```
