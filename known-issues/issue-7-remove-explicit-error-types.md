# Remove explicit error type declarations from use cases - rely on Effect inference

**Issue:** [#7](https://github.com/brandonbryant12/content-studio/issues/7)
**Author:** brandonbryant12
**Created:** 2026-01-02
**State:** OPEN

## Problem

Currently, use cases explicitly declare error types like:

```typescript
export type CreatePodcastError = DatabaseError | DocumentNotFound;

export const createPodcast = (
  input: CreatePodcastInput,
): Effect.Effect<PodcastFull, CreatePodcastError, PodcastRepo | ScriptVersionRepo | Db> =>
```

This is redundant because Effect automatically tracks errors through its type system. When you `yield*` an effect that can fail, those errors are automatically propagated to the error channel.

## Issues with current approach

1. **Maintenance burden** - Must manually keep error types in sync with implementation
2. **Easy to get out of sync** - Add a new repo call that fails with a new error? Must remember to update the type
3. **Redundant code** - Effect already does this for us

## Proposed solution

Remove explicit error type declarations and let Effect infer them:

```typescript
export const createPodcast = (input: CreatePodcastInput) =>
  Effect.gen(function* () {
    // Effect automatically infers error types from yield* calls
  }).pipe(
    Effect.withSpan('useCase.createPodcast', {
      attributes: { 'user.id': input.userId },
    }),
  );
```

Or if we want to keep explicit return types for the success/dependency channels, just omit the error type:

```typescript
export const createPodcast = (
  input: CreatePodcastInput,
): Effect.Effect<PodcastFull, never, PodcastRepo | ScriptVersionRepo | Db> =>
// Let TypeScript infer E from implementation
```

## Files to update

- `packages/media/src/podcast/use-cases/*.ts`
- `packages/media/src/document/use-cases/*.ts`
- Any other use cases with explicit error types

## Benefits

- Less code to maintain
- Errors stay in sync with implementation automatically
- Follows Effect best practices of leveraging type inference
