## Input

```typescript
import { Effect } from "effect";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { podcasts } from "../schemas/podcasts";
import { requireOwnership } from "../shared/authorization";
import { getCurrentUser } from "../shared/context";

export const deletePodcast = (podcastId: string) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const podcast = yield* Effect.tryPromise(() =>
      db.query.podcasts.findFirst({ where: eq(podcasts.id, podcastId) })
    );

    if (!podcast) {
      return yield* Effect.fail(new PodcastNotFoundError({ podcastId }));
    }

    yield* requireOwnership(podcast.userId, user.id);

    yield* Effect.tryPromise(() =>
      db.delete(podcasts).where(eq(podcasts.id, podcastId))
    );

    return { success: true };
  });
```

## Expected Findings

- No security issues expected
- Handler correctly enforces ownership before delete
- Properly retrieves current user from context
- Uses Drizzle ORM query builder (no raw SQL)

## Context

PR modifying `packages/media/src/podcasts/use-cases/delete-podcast.ts`.
This is a well-structured handler that follows all authorization patterns.
The skill should NOT flag this as a risk — it is a clean pass scenario.
