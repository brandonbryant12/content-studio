# Task 99: Final Verification

## Standards Checklist

Review ALL standards referenced across all prior tasks:
- [ ] `standards/patterns/repository.md`
- [ ] `standards/patterns/use-case.md`
- [ ] `standards/patterns/error-handling.md`
- [ ] `standards/patterns/router-handler.md`
- [ ] `standards/patterns/serialization.md`
- [ ] `standards/frontend/components.md`
- [ ] `standards/frontend/data-fetching.md`
- [ ] `standards/frontend/forms.md`
- [ ] `standards/frontend/mutations.md`
- [ ] `standards/frontend/real-time.md`

## Verification Scope

Launch up to 5 subagents to verify:

1. **Effect Patterns**
   - Schema.TaggedError usage correct
   - Context.Tag for repositories
   - Effect.gen for use cases
   - Proper error handling chain

2. **Repository Patterns**
   - Drizzle ORM queries (not raw SQL)
   - Proper Effect wrapping
   - Serialization on output

3. **Frontend Patterns**
   - Container/Presenter split enforced
   - useSuspenseQuery for data fetching
   - Hooks have correct return types
   - Forms use TanStack Form + Effect Schema

4. **API Routes**
   - oRPC contracts defined
   - Error mapping to HTTP status
   - Proper auth checks

5. **Real-time Updates**
   - SSE events emitted on brand updates
   - Frontend handlers invalidate correct queries
   - Brand document refreshes after AI tool calls

## Subagent Results

<!-- Agent writes results from each subagent -->

## Database Migration

```bash
# Run migrations on local postgres
DATABASE_URL="postgres://postgres:postgres@localhost:5432/postgres" pnpm --filter @repo/db db:push
```

## Final Validation Commands

```bash
# Full validation
pnpm typecheck && pnpm build && pnpm test
```

## E2E Browser Verification

Use `/agent-browser` skill to verify on `localhost:8085`

**Login credentials**: `b@b.com` / `12345678`

### 1. Brand List Page
- Navigate to `/brands`
- Verify empty state or list renders
- Click "New Brand" button

### 2. Brand Builder Chat
- Navigate to `/brands/new`
- Verify chat panel and document panel display
- Send message "I want to create a brand for a tech podcast"
- Verify streaming response renders
- Verify skip button works
- Verify brand document updates in real-time

### 3. Brand Detail Page
- Navigate to `/brands/:id` for created brand
- Verify brand guide markdown displays
- Verify personas list shows
- Verify segments list shows
- Test editing brand guide

### 4. Podcast Integration
- Navigate to podcast creation
- Verify brand dropdown appears
- Select brand and verify persona cards appear
- Select persona and verify host voice auto-fills
- Select segment and verify instructions populate

## Final Status

- [ ] All subagents passed
- [ ] No tasks reopened
- [ ] Validation commands pass
- [ ] Database migration successful
- [ ] E2E browser verification complete
