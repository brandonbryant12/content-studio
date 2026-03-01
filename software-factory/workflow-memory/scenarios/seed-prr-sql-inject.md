## Input

```typescript
import { db } from "../db";

export async function searchUsers(query: string) {
  const results = await db.execute(
    `SELECT * FROM users WHERE name LIKE '%${query}%' OR email LIKE '%${query}%'`
  );
  return results.rows;
}
```

## Expected Findings

- Raw string interpolation in SQL query enables SQL injection
- User input directly concatenated into query string without parameterization
- Must use parameterized queries or Drizzle ORM query builder instead

## Context

PR adding search functionality to user management.
The skill should flag any raw SQL string interpolation as a critical security risk.
OWASP Top 10: Injection attacks.
