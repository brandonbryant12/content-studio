# Task 99: Final Verification

## Standards Checklist

Review ALL standards referenced across all prior tasks:
- [ ] `standards/patterns/repository.md`
- [ ] `standards/patterns/use-case.md`
- [ ] `standards/patterns/router-handler.md`
- [ ] `standards/patterns/serialization.md`
- [ ] `standards/patterns/error-handling.md`
- [ ] `standards/frontend/components.md`
- [ ] `standards/frontend/data-fetching.md`
- [ ] `standards/frontend/mutations.md`
- [ ] `standards/frontend/forms.md`
- [ ] `standards/testing/integration-tests.md`
- [ ] `standards/frontend/testing.md`

## Verification Scope

Launch up to 5 subagents to verify:

### 1. Backend Patterns Verification
- Effect patterns (Schema.TaggedError, Context.Tag usage)
- Repository patterns (Drizzle queries, no raw SQL)
- Use case patterns (Effect.gen, proper error handling)
- Error handling (HTTP protocol properties on errors)

### 2. API Layer Verification
- Contract definitions follow existing patterns
- Router handlers use handleEffectWithProtocol
- Serializers applied correctly
- Tracing spans added with appropriate attributes

### 3. Worker Verification
- Worker follows podcast-worker pattern
- Job types properly defined
- SSE events emitted correctly
- Error handling and retry logic

### 4. Frontend Patterns Verification
- Container/Presenter pattern followed
- TanStack Query hooks structured correctly
- Optimistic updates implemented
- Loading and error states handled

### 5. Testing Coverage
- API integration tests exist for all endpoints
- Frontend integration tests for key flows
- Mock implementations work correctly

## Verification Checklist

### Backend
- [ ] All errors extend Schema.TaggedError with HTTP metadata
- [ ] All repos use Context.Tag pattern
- [ ] All use cases have Effect.withSpan
- [ ] No raw SQL in repositories
- [ ] Migration generated and applies cleanly

### API
- [ ] All endpoints use protectedProcedure
- [ ] All endpoints have error definitions
- [ ] Serializers used for all responses
- [ ] Router registered in main app

### Worker
- [ ] Job type added to queue types
- [ ] Worker follows polling pattern
- [ ] SSE events match expected format
- [ ] Error handling wraps in JobProcessingError

### Frontend
- [ ] Routes follow existing patterns
- [ ] Navigation updated
- [ ] Query keys structured correctly
- [ ] Mutations have optimistic updates
- [ ] Loading skeletons provided
- [ ] Error states handled

### Full Validation
- [ ] `pnpm typecheck` passes
- [ ] `pnpm build` passes
- [ ] `pnpm test` passes
- [ ] Manual end-to-end test successful

## Subagent Results

<!-- Agent writes results from each subagent here -->

### Backend Patterns Subagent
Status: NOT_RUN
Results:

### API Layer Subagent
Status: NOT_RUN
Results:

### Worker Subagent
Status: NOT_RUN
Results:

### Frontend Patterns Subagent
Status: NOT_RUN
Results:

### Testing Coverage Subagent
Status: NOT_RUN
Results:

## Final Status

- [ ] All subagents passed
- [ ] No tasks reopened
- [ ] Validation commands pass
- [ ] Feature is ready for code review

## Notes

<!-- Any additional notes or issues discovered during verification -->
