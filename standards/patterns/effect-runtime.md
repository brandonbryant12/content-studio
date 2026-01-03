# Effect Runtime Patterns

This document defines Effect-TS runtime patterns for Content Studio.

## Overview

Content Studio uses [Effect](https://effect.website) for type-safe, composable error handling and dependency injection. Key patterns:

1. **Shared ManagedRuntime** - Single runtime shared across all requests
2. **FiberRef for user context** - User passed via fiber, not context
3. **Service dependencies** - No CurrentUser in service types

## Shared ManagedRuntime

A single `ManagedRuntime` is created at server startup and shared across all requests:

```typescript
// packages/api/src/server/runtime.ts
const runtime = createServerRuntime({ db, geminiApiKey, storageConfig });

// Reused for all requests
await runtime.runPromise(effect);
```

### Why Shared Runtime?

- **Resource efficiency** - Connection pools, caches created once
- **Startup cost** - Layer construction happens once at boot
- **Consistency** - All requests use same configured services

### Anti-Pattern: Runtime Per Request

```typescript
// WRONG - creates new runtime for each request
app.use(async (c, next) => {
  const runtime = createServerRuntime(config);  // Don't do this!
  c.set('runtime', runtime);
  await next();
});

// CORRECT - use shared runtime
const runtime = createServerRuntime(config);

app.use(async (c, next) => {
  c.set('runtime', runtime);  // Reuse same runtime
  await next();
});
```

## FiberRef for User Context

User context is passed via `FiberRef`, not `Context.Tag`:

```typescript
// Get current user (fails if not authenticated)
const user = yield* getCurrentUser;

// Scope user to a fiber subtree
yield* withCurrentUser(user)(myEffect);
```

### Why FiberRef?

- **Request-scoped** - User context is request-specific, not service-specific
- **No layer rebuilding** - Adding user doesn't require new layer
- **Cleaner types** - Services don't need `CurrentUser` in their type

### Implementation

```typescript
// packages/auth/src/policy/user.ts
import { FiberRef, Effect } from 'effect';

const CurrentUserRef = FiberRef.unsafeMake<User | null>(null);

export const getCurrentUser = Effect.gen(function* () {
  const user = yield* FiberRef.get(CurrentUserRef);
  if (!user) {
    return yield* Effect.fail(new Unauthorized());
  }
  return user;
});

export const withCurrentUser = (user: User) =>
  <A, E, R>(effect: Effect.Effect<A, E, R>) =>
    Effect.locally(CurrentUserRef, user)(effect);
```

### Anti-Pattern: CurrentUser Layer

```typescript
// WRONG - CurrentUser as a layer
const CurrentUserLive = Layer.succeed(CurrentUser, user);
const program = myEffect.pipe(Effect.provide(CurrentUserLive));

// CORRECT - FiberRef scoping
const program = withCurrentUser(user)(myEffect);
```

## Service Dependencies

Services declare dependencies **without** `CurrentUser`:

```typescript
// CORRECT - no CurrentUser in type
export type DocumentContext = Db | Storage;

export const createDocument = (input: CreateInput) =>
  Effect.gen(function* () {
    const db = yield* Db;
    const storage = yield* Storage;

    // Read user from FiberRef inside the effect
    const user = yield* getCurrentUser;

    // Business logic...
  });
```

### Why No CurrentUser in Service Deps?

- **Services are singletons** - They live in the shared runtime
- **User is request-scoped** - Different for each request
- **Simpler layers** - No need to provide user when building layers

### Anti-Pattern: CurrentUser in Type

```typescript
// WRONG - CurrentUser in service dependencies
export type DocumentContext = Db | Storage | CurrentUser;

export const createDocument = (input: CreateInput) =>
  Effect.gen(function* () {
    const user = yield* CurrentUser;  // Don't do this!
    // ...
  });
```

## Handler Integration

Handlers use the shared runtime with user context:

```typescript
// In router handler
return handleEffectWithProtocol(
  context.runtime,      // Shared runtime
  context.user,         // User from auth middleware
  createDocument(input),
  errors,
  { span: 'api.documents.create' },
);
```

The `handleEffectWithProtocol` function internally calls `withCurrentUser`:

```typescript
// packages/api/src/server/handle-effect.ts
export const handleEffectWithProtocol = (
  runtime: ManagedRuntime,
  user: User | null,
  effect: Effect.Effect<A, E, R>,
  // ...
) => {
  const scopedEffect = user
    ? withCurrentUser(user)(effect)
    : effect;

  return runtime.runPromise(scopedEffect);
};
```

## Type-Safe Service Requirements

Effect's power comes from compile-time verification that all service requirements are satisfied. Never bypass this safety.

### Adding New Services

When adding a new service (repo, provider, etc.):

1. Define the Context.Tag and Layer in the appropriate package
2. Add the type to the bundled type (e.g., `Media = DocumentRepo | PodcastRepo | NewRepo`)
3. Add the Layer to the bundled layer (e.g., `MediaLive = Layer.mergeAll(..., NewRepoLive)`)
4. Run `pnpm typecheck` to verify all use cases compile

```typescript
// packages/media/src/index.ts

// 1. Export the service type
export type Media = DocumentRepo | PodcastRepo | CollaboratorRepo;  // Add here

// 2. Merge into the combined layer
export const MediaLive = Layer.mergeAll(
  DocumentRepoLive,
  PodcastRepoLive,
  CollaboratorRepoLive,  // Add here
);
```

### Anti-Pattern: Casting Away Requirements

**CRITICAL**: Never use `unknown` for the requirements type parameter.

```typescript
// WRONG - loses compile-time safety, errors only at runtime
export const handleEffect = <A>(
  effect: Effect.Effect<A, unknown, unknown>,  // Don't do this!
) => {
  const typedEffect = effect as Effect.Effect<A, Error, SharedServices>;
  // ...
};

// CORRECT - enforces requirements at compile time
export const handleEffect = <A, E extends { _tag: string }>(
  effect: Effect.Effect<A, E, SharedServices>,
) => {
  // If a use case requires a service not in SharedServices,
  // TypeScript will error HERE, not at runtime
};
```

This anti-pattern caused a production bug where `CollaboratorRepo` was missing from `MediaLive` but the code compiled because the handler accepted `Effect.Effect<A, unknown, unknown>` and cast away the type information.

## Summary

| Pattern | Do | Don't |
|---------|-----|-------|
| Runtime | Share across requests | Create per request |
| User context | Use FiberRef | Use Context.Tag/Layer |
| Service deps | Exclude CurrentUser | Include CurrentUser |
| Read user | `yield* getCurrentUser` | `yield* CurrentUser` |
| Scope user | `withCurrentUser(user)(effect)` | Provide layer |
| Effect requirements | Type as `SharedServices` | Cast to `unknown` |
| New services | Add to type AND layer | Add to just one |
