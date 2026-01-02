---
description: Validate Effect patterns during code review and /ship. Ensures code follows the @repo/invite gold standard patterns.
---

# Effect Pattern Validation

When reviewing or shipping code that uses Effect TS, validate these patterns.

## Mandatory Patterns

### 1. Error Classes
Error classes MUST use `Data.TaggedError`:

```typescript
// CORRECT
export class DomainError extends Data.TaggedError('DomainError')<{
  readonly code: 'ERROR_CODE';
  readonly message: string;
}> {}

// WRONG - plain Error class
export class DomainError extends Error { ... }
```

### 2. Error Factories
Errors MUST have factory functions in `XErrors` object:

```typescript
// CORRECT
export const DomainErrors = {
  NotFound: (message = 'Not found') =>
    new DomainError({ code: 'NOT_FOUND', message }),
} as const;

// WRONG - direct instantiation without factory
throw new DomainError({ code: 'NOT_FOUND', message: 'msg' });
```

### 3. Repository Functions
Repos MUST return `Effect.Effect<T, DbError, typeof Db.Identifier>`:

```typescript
// CORRECT
export const getById = (id: string): Effect.Effect<Item | null, DbError, typeof Db.Identifier> =>
  withDb(async (db) => { ... });

// WRONG - returns Promise
export const getById = async (id: string): Promise<Item | null> => { ... }
```

### 4. Use Cases
Use cases MUST use `Effect.gen(function* () { ... })`:

```typescript
// CORRECT
export const myUseCase = (input: Input) =>
  Effect.gen(function* () {
    const data = yield* MyRepo.getData();
    return data;
  });

// WRONG - deeply nested pipes
export const myUseCase = (input: Input) =>
  pipe(
    getData(),
    Effect.flatMap(x => validate(x)),
    Effect.flatMap(y => transform(y)),
    Effect.flatMap(z => save(z))
  );
```

### 5. Tests
Tests MUST use `it.effect()` with `Effect.provide(DbTestLayer)`:

```typescript
// CORRECT
it.effect('does something', () =>
  Effect.gen(function* () {
    const result = yield* myUseCase();
    expect(result).toBeDefined();
  }).pipe(Effect.provide(DbTestLayer))
);

// WRONG - async/await test
it('does something', async () => {
  const result = await Effect.runPromise(myUseCase());
});
```

### 6. External Services
External HTTP services MUST use `@effect/platform` HttpClient:

```typescript
// CORRECT - @effect/platform HttpClient with typed errors
import { HttpClient, HttpClientRequest, HttpClientResponse } from '@effect/platform';

export class MyServiceError extends Data.TaggedError('MyServiceError')<{
  readonly code: 'NETWORK_ERROR' | 'TIMEOUT' | 'PARSE_ERROR' | 'HTTP_ERROR';
  readonly message: string;
  readonly status?: number;
}> {}

export const MyServiceErrors = {
  NetworkError: (message: string) => new MyServiceError({ code: 'NETWORK_ERROR', message }),
  Timeout: () => new MyServiceError({ code: 'TIMEOUT', message: 'Request timed out' }),
  ParseError: (message: string) => new MyServiceError({ code: 'PARSE_ERROR', message }),
  HttpError: (status: number, message: string) =>
    new MyServiceError({ code: 'HTTP_ERROR', message, status }),
} as const;

export const fetchData = (id: string) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient;
    const response = yield* HttpClientRequest.get(`/api/data/${id}`).pipe(
      client.execute,
      Effect.timeout('10 seconds'),
      Effect.mapError(() => MyServiceErrors.NetworkError('Failed to fetch')),
    );
    return yield* HttpClientResponse.json(response);
  });

// WRONG - direct fetch without Effect integration
const data = await fetch(url).then(r => r.json());
```

### 7. Controller Error Handling
Controllers MUST use typed error mapping:

```typescript
// CORRECT - Effect.catchTags with typed errors
return await context.runMain(
  myUseCase(input).pipe(
    Effect.catchTags({
      DomainError: (e) => { switch(e.code) { ... } },
      DbError: () => throw errors.INTERNAL_ERROR(),
    }),
  ),
);

// WRONG - string matching (extractErrorCode)
const code = extractErrorCode(e);
switch (code) { case 'NOT_FOUND': ... }
```

### 8. User Context
Use cases MUST get user from Effect Context, not parameters:

```typescript
// CORRECT - CurrentUser from context
export const closePosition = (positionId: string) =>
  Effect.gen(function* () {
    const user = yield* CurrentUser;
    const position = yield* PositionsRepo.getByIdForUser(positionId, user.id);
    ...
  });

// WRONG - userId as parameter
export const closePosition = (userId: string, positionId: string) => ...
```

### 9. Ownership Enforcement (Security)
MUST return same error for missing AND unauthorized:

```typescript
// CORRECT - Single NOT_FOUND error (secure)
const position = yield* PositionsRepo.getByIdForUser(positionId, user.id);
if (!position) return yield* Effect.fail(PositionErrors.NotFound());

// WRONG - Leaks resource existence
if (!position) return yield* Effect.fail(PositionErrors.NotFound());
if (position.userId !== user.id) return yield* Effect.fail(PositionErrors.NotOwner()); // INSECURE!
```

## Anti-Patterns to Flag

When reviewing code, flag these violations:

| Anti-Pattern | Correct Pattern |
|--------------|-----------------|
| `new Error()` in Effect code | `Effect.fail(DomainErrors.X())` |
| `throw new Error()` | `yield* Effect.fail(DomainErrors.X())` |
| `db.execute(sql\`...\`)` | `db.query.table.findFirst()` |
| `catch (e) { ... }` | `Effect.catchTags({ ... })` |
| `class X extends Error` | `class X extends Data.TaggedError()` |
| Missing error factory | Add to `XErrors` object |
| `extractErrorCode(e)` string matching | `Effect.catchTags({ DomainError: ... })` |
| Separate NOT_FOUND vs NOT_OWNER errors | Single NOT_FOUND for both |
| userId parameter in use cases | `yield* CurrentUser` from context |
| Direct fetch without DI | `@effect/platform` HttpClient |

## Pre-flight Check Process

When validating before PR/commit:

1. **Scan changed `errors.ts` files**
   - Verify all error classes extend `Data.TaggedError`
   - Verify `code` property exists with string literal union
   - Verify `XErrors` factory object exists

2. **Scan changed repo files**
   - Flag any `db.execute(sql\`...\`)` usage
   - Verify return type is `Effect.Effect<T, DbError, typeof Db.Identifier>`

3. **Scan changed use-case files**
   - Flag any `new Error()` usage
   - Verify `Effect.gen(function* () { ... })` is used

4. **Scan changed test files**
   - Verify `it.effect()` is used (not plain `it()` for Effect code)
   - Verify `Effect.provide(DbTestLayer)` is present

## Reference

- **Gold standard:** `@repo/invite` package (5.0/5 score)
- **Standards:** See `standards/patterns/` directory for authoritative patterns
