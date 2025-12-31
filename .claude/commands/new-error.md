---
description: Generate a Data.TaggedError class with factory functions
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
argument-hint: "<ErrorName> <code1,code2,...> [package-path]"
---

# Generate Error Class

Generate a new Effect-TS error class following the project's Data.TaggedError pattern.

## Usage

```
/new-error Position NOT_FOUND,NOT_ENOUGH_CASH,ALREADY_OPEN packages/competition
```

## Arguments

- `ErrorName`: Name of the error (e.g., Position, Invite, Card)
- `codes`: Comma-separated error codes (e.g., NOT_FOUND,INVALID)
- `package-path` (optional): Target package path (defaults to current package)

## Instructions

Parse the $ARGUMENTS to extract:
1. Error name (first argument)
2. Comma-separated codes (second argument)
3. Package path (third argument, optional)

Then generate the following file:

### Template: errors.ts

```typescript
import { Data } from 'effect';

export class ${ErrorName}Error extends Data.TaggedError('${ErrorName}Error')<{
  readonly code: ${codes_union};
  readonly message: string;
}> {}

export const ${ErrorName}Errors = {
  ${factory_functions}
} as const;

export type ${ErrorName}Error = InstanceType<typeof ${ErrorName}Error>;
```

Where:
- `${codes_union}` = `'CODE_1' | 'CODE_2' | ...` from the codes
- `${factory_functions}` = factory function for each code with sensible default message

### Example Output

For `/new-error Position NOT_FOUND,NOT_ENOUGH_CASH,ALREADY_OPEN`:

```typescript
import { Data } from 'effect';

export class PositionError extends Data.TaggedError('PositionError')<{
  readonly code: 'NOT_FOUND' | 'NOT_ENOUGH_CASH' | 'ALREADY_OPEN';
  readonly message: string;
}> {}

export const PositionErrors = {
  NotFound: (message = 'Position not found') =>
    new PositionError({ code: 'NOT_FOUND', message }),
  NotEnoughCash: (have?: number, need?: number) =>
    new PositionError({
      code: 'NOT_ENOUGH_CASH',
      message: have !== undefined ? `Need ${need}, have ${have}` : 'Not enough cash',
    }),
  AlreadyOpen: (message = 'Position already open') =>
    new PositionError({ code: 'ALREADY_OPEN', message }),
} as const;

export type PositionError = InstanceType<typeof PositionError>;
```

## Steps

1. Parse arguments
2. Generate the error class and factories
3. Write to `{package-path}/src/errors.ts` or append if file exists
4. Suggest adding export to `{package-path}/src/index.ts`

## After Generation

Show the user:
1. The generated code
2. How to import it: `import { ${ErrorName}Error, ${ErrorName}Errors } from './errors';`
3. Example usage in a use case
