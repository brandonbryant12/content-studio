---
description: Generate a use case with Effect.gen pattern
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
argument-hint: "<use-case-name> [package-path]"
---

# Generate Use Case

Generate a new Effect-TS use case following the project's Effect.gen pattern.

## Usage

```
/new-use-case open-position packages/competition
```

## Arguments

- `use-case-name`: Kebab-case name of the use case (e.g., open-position, create-invite)
- `package-path` (optional): Target package path

## Instructions

Parse the $ARGUMENTS to extract:
1. Use case name in kebab-case (first argument)
2. Package path (second argument, optional)

Then generate the following file:

### Template: use-cases/{use-case-name}.ts

```typescript
import { Effect } from 'effect';
import { type Db, type DbError } from '@repo/db';
import { CurrentUser } from '@repo/api/context/current-user';
import { ${DomainName}Errors, type ${DomainName}Error } from '../errors';
import * as ${RepoName}Repo from '../repos/${repo-name}-repo';

/**
 * ${UseCaseName}
 *
 * @description Brief description of what this use case does
 * @param input - The input parameters
 * @returns Effect with result or domain error
 */
export const ${functionName} = (
  input: ${InputType},
): Effect.Effect<${OutputType}, DbError | ${DomainName}Error, typeof Db.Identifier | CurrentUser> =>
  Effect.gen(function* () {
    // 1. Get current user from context
    const user = yield* CurrentUser;

    // 2. Validate input and fail fast
    // yield* validateInput(input);

    // 3. Fetch data with ownership check
    const entity = yield* ${RepoName}Repo.getByIdForUser(input.id, user.id);
    if (!entity) {
      // Return NOT_FOUND for both missing and unauthorized (security)
      return yield* Effect.fail(${DomainName}Errors.NotFound());
    }

    // 4. Perform business logic
    // ...

    // 5. Return result (plain value, not Effect-wrapped)
    return { success: true };
  });

// Input/Output types
interface ${InputType} {
  id: string;
  // Add more fields
}

interface ${OutputType} {
  success: boolean;
  // Add more fields
}
```

## Steps

1. Parse arguments
2. Convert kebab-case to camelCase for function name
3. Infer domain name from package path (e.g., packages/competition → Competition)
4. Generate the use case skeleton
5. Write to `{package-path}/src/use-cases/{use-case-name}.ts`
6. Create `{package-path}/src/use-cases/index.ts` if it doesn't exist
7. Add export to use-cases index

## After Generation

Show the user:
1. The generated code
2. How to import it: `import { ${functionName} } from './use-cases/${use-case-name}';`
3. Example controller integration with Effect.catchTags
4. Reminder to implement the business logic
