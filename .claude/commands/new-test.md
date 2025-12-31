---
description: Generate a test file with @effect/vitest patterns
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
argument-hint: "<file-to-test>"
---

# Generate Test File

Generate a new Effect-TS test file following the project's @effect/vitest pattern.

## Usage

```
/new-test packages/competition/src/repos/positions-repo.ts
```

## Arguments

- `file-to-test`: Path to the file to test

## Instructions

Parse the $ARGUMENTS to get the file path, then:

1. Read the source file to understand what needs to be tested
2. Determine the test file path (same location, add `.test.ts` suffix)
3. Generate test file following the pattern

### Template: {file-name}.test.ts

```typescript
import { describe, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import { it } from '@effect/vitest';
import { Effect } from 'effect';
import {
  startTestDb,
  stopTestDb,
  truncateAllTables,
  DbTestLayer,
  createUserFixture,
  resetAllFixtureCounters,
} from '@repo/test-utils';
import * as ${ModuleName} from './${file-name}';

describe('${ModuleName}', () => {
  // Start Testcontainers DB once per file
  beforeAll(async () => {
    await startTestDb();
  });

  afterAll(async () => {
    await stopTestDb();
  });

  // Clean slate for each test
  beforeEach(async () => {
    await truncateAllTables();
    resetAllFixtureCounters();
  });

  describe('${functionName}', () => {
    it.effect('should handle happy path', () =>
      Effect.gen(function* () {
        // Arrange - create fixtures
        const user = yield* Effect.promise(() => createUserFixture());

        // Act - call the function under test
        const result = yield* ${ModuleName}.${functionName}(user.id);

        // Assert
        expect(result).toBeDefined();
      }).pipe(Effect.provide(DbTestLayer))
    );

    it.effect('should return null when not found', () =>
      Effect.gen(function* () {
        // Arrange
        const nonExistentId = 'non-existent-id';

        // Act
        const result = yield* ${ModuleName}.${functionName}(nonExistentId);

        // Assert
        expect(result).toBeNull();
      }).pipe(Effect.provide(DbTestLayer))
    );

    it.effect('should handle error case', () =>
      Effect.gen(function* () {
        // Arrange - setup for error condition

        // Act & Assert - expect failure
        const result = yield* ${ModuleName}.${functionName}('invalid').pipe(
          Effect.either,
        );

        expect(result._tag).toBe('Left');
        if (result._tag === 'Left') {
          expect(result.left._tag).toBe('${DomainName}Error');
        }
      }).pipe(Effect.provide(DbTestLayer))
    );
  });
});
```

## Steps

1. Parse the file path from arguments
2. Read the source file to understand exports and functions
3. Generate test file path (same dir, add `.test.ts`)
4. Generate test skeleton with:
   - Proper imports from @effect/vitest
   - Test setup/teardown for Testcontainers
   - Test cases for each exported function
5. Write the test file
6. Show user the generated test structure

## After Generation

Show the user:
1. The generated test file location
2. How to run the tests: `pnpm --filter {package} test`
3. Available fixtures from @repo/test-utils
4. Reminder to implement actual test logic
