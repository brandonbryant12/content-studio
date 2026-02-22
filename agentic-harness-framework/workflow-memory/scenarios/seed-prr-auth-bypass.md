## Input

```typescript
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../schemas/users";

export async function deleteUser(id: string) {
  await db.delete(users).where(eq(users.id, id));
  return { success: true };
}
```

## Expected Findings

- Missing ownership/authorization check before delete
- No role-based access control enforcement
- Handler performs destructive operation without verifying the caller owns the resource

## Context

PR modifying `packages/api/src/server/router/users.ts`.
The skill's "Must-Check Risks" includes authorization enforcement.
[`CLAUDE.md`](../../../CLAUDE.md) guardrail: "All mutating use cases on existing resources must enforce authorization (requireOwnership / role policy) before write/delete."
