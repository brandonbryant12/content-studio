# Effect-TS Patterns

Effect-TS provides typed errors, dependency injection, and composable operations. This doc covers patterns used throughout the codebase.

## Core Concept

```typescript
Effect<Success, Error, Requirements>
```

- **Success**: The value returned on success
- **Error**: Possible failure types (discriminated union)
- **Requirements**: Services the effect needs to run

TypeScript enforces that all errors are handled and all requirements are provided.

## Database Access

The `withDb` helper wraps database operations, converting exceptions to typed errors:

```typescript
withDb('operation.name', (db) =>
  db.select().from(table).where(...)
)
// Returns: Effect<Result[], DbError, Db>
```

Errors from database operations become `DbError` with context about what failed.

## Service Pattern

Services are defined as interfaces with a Context.Tag for dependency injection:

```typescript
// 1. Define interface
interface FooService {
  create: (data: CreateInput) => Effect<Foo, DbError | ValidationError, never>
  findById: (id: string) => Effect<Foo, FooNotFound | DbError, never>
}

// 2. Create tag for DI
class Foos extends Context.Tag('Foos')<Foos, FooService>() {}

// 3. Implement as Layer
const FoosLive = Layer.effect(
  Foos,
  Effect.gen(function* () {
    const db = yield* Db
    return {
      create: (data) => /* implementation */,
      findById: (id) => /* implementation */,
    }
  })
)
```

Consumers access services via the tag:

```typescript
const program = Effect.gen(function* () {
  const foos = yield* Foos
  const foo = yield* foos.findById(id)
  return foo
})
```

## Layer Composition

Layers provide dependencies. Compose them to build the full context:

```typescript
// Layer with no dependencies
const DbLive = Layer.succeed(Db, { db: connection })

// Layer that depends on Db
const FoosLive = Layer.effect(Foos, /* uses Db */)
  .pipe(Layer.provide(DbLive))

// Combine multiple layers
const AppLive = Layer.mergeAll(DbLive, FoosLive, BarsLive)
```

## Tagged Errors

Errors are tagged for pattern matching:

```typescript
class FooNotFound extends TaggedError('FooNotFound', {
  id: Schema.String,
  message: Schema.optional(Schema.String),
}) {}
```

Match on errors:

```typescript
effect.pipe(
  Effect.catchTag('FooNotFound', (e) => /* handle */),
  Effect.catchTag('DbError', (e) => /* handle */),
)
```

## Error Mapping

At API boundaries, map Effect errors to HTTP responses. TypeScript ensures exhaustive handling:

```typescript
handleEffect(effect, {
  FooNotFound: (e) => notFound(e.message),
  DbError: (e) => serverError(e.message),
  // TypeScript errors if any error type is missing
})
```

## Common Patterns

**Ownership check**:
```typescript
Effect.gen(function* () {
  const user = yield* CurrentUser
  const entity = yield* findById(id)
  if (entity.createdBy !== user.id) {
    return yield* Effect.fail(new ForbiddenError())
  }
  return entity
})
```

**Optional result**:
```typescript
const result = yield* findById(id).pipe(
  Effect.option,  // NotFound becomes None instead of failure
)
if (Option.isNone(result)) { /* handle missing */ }
```

**Sequential operations**:
```typescript
const a = yield* stepOne()
const b = yield* stepTwo(a)  // depends on a
const c = yield* stepThree(b)  // depends on b
```

**Parallel operations**:
```typescript
const [a, b, c] = yield* Effect.all([
  fetchOne(),
  fetchTwo(),
  fetchThree(),
], { concurrency: 'unbounded' })
```

## Tracing

Effects support distributed tracing via spans:

```typescript
effect.pipe(
  Effect.withSpan('operation.name', {
    attributes: { entityId: id }
  })
)
```

Spans propagate through the call tree for observability.

## Testing

Replace real layers with test doubles:

```typescript
const TestFoos = Layer.succeed(Foos, {
  create: () => Effect.succeed(mockFoo),
  findById: () => Effect.succeed(mockFoo),
})

const result = await Effect.runPromise(
  program.pipe(Effect.provide(TestFoos))
)
```
