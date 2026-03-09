# Monthly AI Interaction Limits Plan

Status: conditional plan, not current architecture.

This document records the preferred implementation plan if Content Studio later
needs monthly per-user limits for AI interactions. It is future-facing guidance
only and does not describe current implemented behavior.

For the current implemented architecture and coding patterns, use:

- [`docs/architecture/overview.md`](../architecture/overview.md)
- [`docs/architecture/access-control.md`](../architecture/access-control.md)
- [`docs/architecture/observability.md`](../architecture/observability.md)
- [`docs/patterns/use-case.md`](../patterns/use-case.md)
- [`docs/patterns/repository.md`](../patterns/repository.md)
- [`docs/patterns/job-queue.md`](../patterns/job-queue.md)
- [`docs/patterns/safety-primitives.md`](../patterns/safety-primitives.md)
- [`docs/testing/use-case-tests.md`](../testing/use-case-tests.md)
- [`docs/testing/integration-tests.md`](../testing/integration-tests.md)
- [`docs/testing/job-workflow-tests.md`](../testing/job-workflow-tests.md)

## Locked Product Decisions

These decisions are assumed by the rest of this plan:

1. Limits are monthly and apply per user.
2. Limits are consumed when work is admitted, not only when it completes
   successfully.
3. Controls are fine-grained by AI interaction type, not only by top-level
   feature names.
4. The initial modality scope is:
   - `llm`
   - `tts`
   - `deep_research`
5. `image_generation` is out of scope for the first pass.
6. Limits must support:
   - global defaults for all users
   - per-user overrides
7. The plan must be detailed enough that a future agent can implement from it
   without rediscovering the architecture.

## Goals

1. Enforce monthly AI interaction limits at the business-logic boundary.
2. Keep authorization and ownership rules in the media use-case layer.
3. Support both global policy and per-user exceptions without role
   special-casing.
4. Preserve auditability for support, debugging, and future billing or
   entitlement work.
5. Avoid mid-workflow failures caused by discovering quota exhaustion only after
   background work has already started.

## Non-Goals

1. Do not use HTTP middleware rate limiting for this feature. Existing request
   rate limits in `apps/server` are transport protection, not entitlement
   policy.
2. Do not use `ai_usage_event` as the quota source of truth. It is provider
   audit and cost telemetry, not product entitlement state.
3. Do not treat admin users as implicitly unlimited. If admins or service users
   need special treatment, do it through explicit policy rows.
4. Do not attempt image-generation limits in the first pass.
5. Do not introduce custom billing-cycle anchors unless product requirements
   explicitly move from calendar months to subscription-month periods.

## Why A Dedicated Quota System Is Needed

The repository already has two useful ledgers, but neither is sufficient as the
entitlement source of truth:

1. The queue `job` table records background work, but it only covers queued
   flows and does not model direct LLM or TTS endpoints such as chat streaming
   or voice preview.
2. The `ai_usage_event` table records provider-facing usage and costs, but one
   user-visible action can create multiple usage rows, retries, or helper calls.

This is why the future implementation should use three separate concepts:

1. policy: what is allowed
2. counters: what has been consumed this month
3. events: why and where quota was spent or denied

## Current System Inventory

### Existing AI Usage And Scope Plumbing

Current code already propagates useful audit metadata:

- [`packages/db/src/schemas/ai-usage-events.ts`](../../packages/db/src/schemas/ai-usage-events.ts)
- [`packages/ai/src/usage/types.ts`](../../packages/ai/src/usage/types.ts)
- [`packages/media/src/shared/safety-primitives.ts`](../../packages/media/src/shared/safety-primitives.ts)
- [`apps/worker/src/unified-worker.ts`](../../apps/worker/src/unified-worker.ts)

That plumbing should continue to exist, but it remains secondary to the quota
system proposed here.

### Current Admission Points For AI Work

These are the current user-visible entry points that either directly call AI
services or admit background work that will call AI services later.

#### Phase 1 In-Scope Admission Points

| Product Surface | Current code path | Recommended debit profile |
|---|---|---|
| Podcast full generation | [`packages/media/src/podcast/use-cases/start-generation.ts`](../../packages/media/src/podcast/use-cases/start-generation.ts) | `llm.podcast_script` + `tts.podcast_audio` |
| Podcast audio regeneration | [`packages/media/src/podcast/use-cases/save-and-queue-audio.ts`](../../packages/media/src/podcast/use-cases/save-and-queue-audio.ts) | `tts.podcast_audio` |
| Voiceover generation | [`packages/media/src/voiceover/use-cases/start-generation.ts`](../../packages/media/src/voiceover/use-cases/start-generation.ts) | `tts.voiceover_audio` |
| Voice preview | [`packages/ai/src/tts/use-cases/preview-voice.ts`](../../packages/ai/src/tts/use-cases/preview-voice.ts) | `tts.voice_preview` |
| Source from research | [`packages/media/src/source/use-cases/create-from-research.ts`](../../packages/media/src/source/use-cases/create-from-research.ts) | `deep_research.source_research` |

Notes:

1. Full podcast generation should reserve both LLM and TTS quota at admission
   time so the workflow cannot fail later due to TTS quota exhaustion after the
   script step already started.
2. Voiceover generation currently uses a best-effort LLM preprocessing helper in
   [`packages/media/src/voiceover/use-cases/generate-audio.ts`](../../packages/media/src/voiceover/use-cases/generate-audio.ts),
   but because that helper is optional and falls back silently, it should not be
   quota-bearing in the first pass.
3. Research should debit once when the research request is admitted, not once
   per poll loop iteration.

#### Phase 2 Candidate Admission Points

These are valid future extensions if product wants all LLM interactions governed
and not just generation/research admission:

| Product Surface | Current code path | Suggested future key |
|---|---|---|
| Research chat stream | [`packages/ai/src/chat/use-cases/stream-research-chat.ts`](../../packages/ai/src/chat/use-cases/stream-research-chat.ts) | `llm.chat.research_stream` |
| Persona chat stream | [`packages/ai/src/chat/use-cases/stream-persona-chat.ts`](../../packages/ai/src/chat/use-cases/stream-persona-chat.ts) | `llm.chat.persona_stream` |
| Writing assistant stream | [`packages/ai/src/chat/use-cases/stream-writing-assistant-chat.ts`](../../packages/ai/src/chat/use-cases/stream-writing-assistant-chat.ts) | `llm.chat.writing_assistant_stream` |
| Synthesize research query | [`packages/ai/src/chat/use-cases/synthesize-research-query.ts`](../../packages/ai/src/chat/use-cases/synthesize-research-query.ts) | `llm.chat.synthesize_research_query` |
| Synthesize persona | [`packages/ai/src/chat/use-cases/synthesize-persona.ts`](../../packages/ai/src/chat/use-cases/synthesize-persona.ts) | `llm.chat.synthesize_persona` |

These should be added only if product really wants chat and assistant usage
metered alongside generation flows.

#### Out Of Scope For The First Pass

| Surface | Why |
|---|---|
| Persona avatar generation | Uses image generation, which is outside the initial modality scope |
| Infographic image generation | Primary cost is image generation, which is outside the initial modality scope |
| Internal helper LLM calls such as source outlining or voiceover preprocessing | They are not stable user-visible admission units in v1 |

## Proposed Quota Model

### 1. Canonical Quota Keys

Create a shared quota-key registry in a new file such as:

`packages/media/src/limits/quota-keys.ts`

Recommended initial keys:

```typescript
export const AIQuotaKey = {
  LLM_PODCAST_SCRIPT: 'llm.podcast_script',
  TTS_PODCAST_AUDIO: 'tts.podcast_audio',
  TTS_VOICEOVER_AUDIO: 'tts.voiceover_audio',
  TTS_VOICE_PREVIEW: 'tts.voice_preview',
  DEEP_RESEARCH_SOURCE_RESEARCH: 'deep_research.source_research',

  LLM_WILDCARD: 'llm.*',
  TTS_WILDCARD: 'tts.*',
  DEEP_RESEARCH_WILDCARD: 'deep_research.*',
  GLOBAL_WILDCARD: '*',
} as const;
```

Rules:

1. Quota keys are product-controlled constants, not dynamic strings assembled at
   runtime.
2. Do not auto-map quota keys from provider operations like `generateObject` or
   `streamText`.
3. One admitted action may debit multiple quota keys.
4. Internal helper calls only get their own keys if product explicitly wants
   them governed.

### 2. Debit Profiles

A debit profile is the bundle of quota keys consumed by one admitted action.

Examples:

1. `podcasts.generate`
   - `llm.podcast_script: 1`
   - `tts.podcast_audio: 1`
2. `podcasts.saveChanges`
   - `tts.podcast_audio: 1`
3. `voiceovers.generate`
   - `tts.voiceover_audio: 1`
4. `voices.preview`
   - `tts.voice_preview: 1`
5. `sources.fromResearch`
   - `deep_research.source_research: 1`

This registry should live in media-layer code next to the quota keys and be
used by the enforcing service.

### 3. Period Semantics

Use UTC calendar months in v1.

Recommended behavior:

1. `periodStart = first day of current UTC month`
2. `resetAt = first day of next UTC month at 00:00:00Z`
3. Counters are month-scoped rows, not mutable rolling windows

Do not implement a monthly reset cron. New months naturally create new counter
rows.

## Proposed Data Model

This should likely live in one new schema file:

`packages/db/src/schemas/ai-quotas.ts`

### 1. `ai_quota_policy`

Purpose: store global defaults and per-user overrides.

Suggested columns:

- `id`
- `scopeType` enum: `global | user`
- `userId` nullable FK to `user`
- `quotaKey` text
- `monthlyLimit` integer not null, minimum `0`
- `note` nullable text
- `createdBy` nullable FK to admin user
- `updatedBy` nullable FK to admin user
- `createdAt`
- `updatedAt`

Recommended constraints:

1. unique `(scopeType, userId, quotaKey)`
2. check that `scopeType = global` implies `userId IS NULL`
3. check that `scopeType = user` implies `userId IS NOT NULL`
4. `monthlyLimit = 0` means explicitly blocked

Why not a DB enum for `quotaKey`:

1. fine-grained quota keys will evolve more often than status enums
2. wildcard keys make frequent DB-enum migrations noisy
3. application-level validation with a shared key registry is more practical

### 2. `ai_quota_counter`

Purpose: fast, concurrency-safe monthly counters.

Suggested columns:

- `userId`
- `quotaKey`
- `periodStart` date
- `usedCount` integer not null default `0`
- `lastAdmissionAt` timestamptz nullable
- `createdAt`
- `updatedAt`

Recommended constraints and indexes:

1. unique `(userId, quotaKey, periodStart)`
2. index `(userId, periodStart)`
3. index `(quotaKey, periodStart)`

### 3. `ai_quota_event`

Purpose: append-only audit trail for consumed and rejected admissions.

Suggested columns:

- `id`
- `admissionId` text or UUID-like identifier for one user-visible action
- `userId`
- `quotaKey`
- `periodStart`
- `operation` text such as `useCase.startGeneration`
- `resourceType` nullable text
- `resourceId` nullable text
- `requestId` nullable text
- `jobId` nullable text
- `amount` integer not null default `1`
- `result` enum or text:
  - `consumed`
  - `rejected_limit_exceeded`
  - `reused_existing_pending_job`
- `metadata` jsonb nullable
- `createdAt`

Recommended indexes:

1. index `(userId, periodStart, quotaKey, createdAt desc)`
2. index `(admissionId)`
3. index `(requestId)`
4. index `(jobId)`

Why keep events if counters already exist:

1. support needs to answer "why was this blocked?"
2. composite admissions spend multiple keys and need grouping
3. admin tools benefit from recent-event diagnostics
4. future entitlement disputes need an audit trail

## Policy Resolution

For each quota key being evaluated, resolve the effective policy in this order:

1. user exact key
2. user modality wildcard
3. user global wildcard
4. global exact key
5. global modality wildcard
6. global global wildcard
7. no match means unlimited

Example for `tts.podcast_audio`:

1. user `tts.podcast_audio`
2. user `tts.*`
3. user `*`
4. global `tts.podcast_audio`
5. global `tts.*`
6. global `*`
7. unlimited if none exist

Implementation note:

Fetch all candidate policy rows for all keys in one query and resolve in memory.
Do not issue one DB query per key.

## Enforcement Architecture

### Where Enforcement Belongs

Enforcement belongs in the media/use-case layer because it is a business rule.

It should not live in:

1. API handlers
2. worker runtime startup
3. provider adapters
4. generic Hono middleware

### Recommended New Media Module

Create a new module:

`packages/media/src/limits/`

Suggested contents:

- `quota-keys.ts`
- `quota-types.ts`
- `repos/ai-quota-repo.ts`
- `services/ai-quota-gate.ts`
- `use-cases/` only if admin APIs need media-layer operations

### Recommended Service API

Something close to:

```typescript
reserveAIQuotaBundle({
  userId,
  admissionId,
  operation,
  resourceType,
  resourceId,
  requestId,
  jobId,
  debits: [
    { quotaKey: 'llm.podcast_script', amount: 1 },
    { quotaKey: 'tts.podcast_audio', amount: 1 },
  ],
})
```

This service should:

1. resolve effective policies
2. lock or upsert the relevant counter rows
3. verify all requested debits fit
4. increment all counters atomically
5. insert audit events
6. fail with a typed error if any key is exhausted

### Concurrency And Correctness

This part matters. Future implementation must be explicit about race handling.

For one admitted action:

1. resolve debit bundle
2. open one DB transaction
3. fetch relevant counter rows `FOR UPDATE` or use equivalent row-locking
4. compute whether all requested debits fit
5. if any do not fit, insert rejected events and fail the transaction
6. otherwise increment all counters and insert consumed events
7. only then proceed with enqueue or direct provider work

Do not:

1. count by issuing `SELECT count(*)` against events and then insert later
2. resolve quota outside a transaction and hope no concurrent request slips in

### Queue-Backed Flows

For flows that enqueue jobs, reserve quota in the same transaction as:

1. the state transition
2. the enqueue
3. the quota event write

This likely justifies a new shared primitive, similar in spirit to
`withTransactionalStateAndEnqueue(...)`.

Suggested future primitive:

`withQuotaCheckedStateAndEnqueue(...)`

Responsibilities:

1. load or lock the resource
2. check for an existing pending job
3. if a pending job exists, return it and do not spend quota again
4. otherwise reserve the quota bundle
5. perform the state transition
6. enqueue the job

If the future implementation introduces such a primitive, update:

- [`docs/patterns/safety-primitives.md`](../patterns/safety-primitives.md)
- [`docs/testing/invariants.md`](../testing/invariants.md)

and add invariant coverage if the pattern becomes mandatory.

### Current Idempotency Risk

This must be addressed during implementation:

1. podcast and voiceover start flows already look for an existing pending job
2. infographic generation currently does not use the same style of pending-job
   idempotency gate

Before limits are enabled, normalize admission semantics so duplicate submits do
not double-spend quota.

### Direct AI Flows

For non-queued flows like voice preview and chat:

1. reserve quota before the provider call starts
2. record one admission event for the request
3. do not refund on provider failure

For streaming chat:

1. spend once when the stream request is admitted
2. do not count per chunk

### Special Case: Research Auto-Generate Podcast

`processResearch` can auto-start podcast generation after research completes.

Recommended behavior:

1. research admission spends research quota only
2. if auto-generate podcast is enabled, the later `startGeneration(...)` call
   must perform its own quota admission for podcast-related keys
3. if podcast quota is unavailable, the source research should still finish
   successfully
4. the system should log or record that auto-podcast creation was skipped due to
   quota policy

This avoids corrupting the meaning of the research quota and prevents a finished
research result from being turned into a user-visible failure due to a later
follow-up action.

## Error Semantics

Create a tagged error owned by `@repo/media`, for example:

`AIQuotaExceeded`

Recommended protocol:

- `httpStatus = 429`
- `httpCode = 'AI_QUOTA_EXCEEDED'`
- `logLevel = 'warn'`

Recommended error payload:

```typescript
{
  operation: 'useCase.startGeneration',
  blockingKeys: [
    {
      quotaKey: 'tts.podcast_audio',
      limit: 20,
      used: 20,
      remaining: 0,
      resetAt: '2026-04-01T00:00:00.000Z',
      policySource: 'global',
    },
  ],
}
```

Rules:

1. For composite admissions, return all blocking keys, not just the first one.
2. Include `resetAt` so UI can tell the user when quota returns.
3. Include `policySource` so admin tools can explain whether the block came from
   a user override or a global default.

## Admin API And UI Plan

### Backend

Add new admin use cases under `packages/media/src/admin/` and wire them through:

- `packages/api/src/contracts/admin.ts`
- `packages/api/src/server/router/admin.ts`

Suggested read operations:

1. list global policies
2. list user overrides for one user
3. get current-month usage summary by quota key for one user
4. list recent quota events for one user

Suggested write operations:

1. upsert global policy row
2. delete global policy row
3. upsert user override row
4. delete user override row

### Frontend

Suggested new surfaces:

1. global admin route:
   - `apps/web/src/routes/_protected/admin/ai-limits.tsx`
2. supporting feature module:
   - `apps/web/src/features/admin/ai-limits/`
3. extend existing user detail view:
   - `apps/web/src/features/admin/components/admin-user-detail-page.tsx`

Recommended UI behavior:

1. global page manages default policies by quota key
2. user detail page shows:
   - effective policy
   - current-month used and remaining counts
   - recent quota events
   - per-user override editor
3. deletion of a user override falls back to global policy

### Self-Service User Visibility

Optional but recommended if product wants transparency:

1. add a current-user endpoint that returns remaining monthly quota by key
2. show it in generation surfaces only if product wants proactive usage display
3. otherwise rely on 429 error messaging for the first pass

## Observability

Quota data and provider usage data serve different purposes and should both
exist.

### Keep `ai_usage_event`

Do not remove or overload `ai_usage_event`.

It remains responsible for:

1. provider usage
2. estimated cost
3. request and job tracing context
4. debugging provider behavior

### Add Quota-Specific Signals

Recommended span/log attributes:

- `ai.quota.operation`
- `ai.quota.keys`
- `ai.quota.blocked`
- `ai.quota.blockingKeyCount`
- `ai.quota.scope`

Recommended log events:

1. quota admitted
2. quota blocked
3. quota reused-existing-job

## Test Plan

### Media Use-Case Tests

Add tests for:

1. exact key beats wildcard
2. user override beats global policy
3. no policy means unlimited
4. zero limit blocks immediately
5. composite debit bundle is all-or-nothing
6. accepted request increments counters
7. existing pending job does not increment counters again
8. blocked request records rejection event
9. research auto-podcast follow-up handles later quota exhaustion cleanly

### API Integration Tests

Add integration tests for:

1. 429 mapping on blocked admissions
2. serialized error payload shape
3. admin-only policy CRUD routes
4. admin user detail usage and recent quota event payloads
5. cross-user concealment for any user-scoped reads

### Workflow Tests

Add or extend workflow tests for queued flows:

1. first request admits and spends quota
2. duplicate request returns existing job and does not spend again
3. state transitions still work end-to-end after quota enforcement is added

Relevant existing workflow suites:

- [`packages/api/src/server/router/__tests__/podcast-workflow.test.ts`](../../packages/api/src/server/router/__tests__/podcast-workflow.test.ts)
- [`packages/api/src/server/router/__tests__/voiceover-workflow.test.ts`](../../packages/api/src/server/router/__tests__/voiceover-workflow.test.ts)

### Invariant Tests

If a new shared quota primitive becomes mandatory for queued generation flows,
add invariant coverage to prevent future bypasses.

Potential invariant targets:

1. podcast start-generation must use the quota primitive
2. podcast save-and-queue-audio must use the quota primitive
3. voiceover start-generation must use the quota primitive
4. source create-from-research must use the quota primitive

## Suggested File Targets

This is the most likely implementation footprint.

### Database

- `packages/db/src/schemas/ai-quotas.ts`
- `packages/db/src/schema.ts`
- `packages/db/drizzle/*` generated migration artifacts

### Media

- `packages/media/src/limits/quota-keys.ts`
- `packages/media/src/limits/quota-types.ts`
- `packages/media/src/limits/repos/ai-quota-repo.ts`
- `packages/media/src/limits/services/ai-quota-gate.ts`
- `packages/media/src/shared/safety-primitives.ts`
- `packages/media/src/podcast/use-cases/start-generation.ts`
- `packages/media/src/podcast/use-cases/save-and-queue-audio.ts`
- `packages/media/src/voiceover/use-cases/start-generation.ts`
- `packages/media/src/source/use-cases/create-from-research.ts`
- `packages/media/src/admin/*` new quota policy and usage use cases

### API

- `packages/api/src/contracts/admin.ts`
- `packages/api/src/server/router/admin.ts`
- possibly contracts for current-user quota visibility if added later

### Web

- `apps/web/src/routes/_protected/admin/ai-limits.tsx`
- `apps/web/src/features/admin/ai-limits/*`
- `apps/web/src/features/admin/components/admin-user-detail-page.tsx`

### Docs To Update If This Plan Is Implemented

- `docs/architecture/observability.md`
- `docs/patterns/use-case.md`
- `docs/patterns/safety-primitives.md`
- `docs/testing/use-case-tests.md`
- `docs/testing/integration-tests.md`
- `docs/testing/job-workflow-tests.md`
- `docs/testing/invariants.md`
- `docs/master-spec.md`

## Recommended Execution Order For A Future Agent

1. Implement schema and repo/service layer first with no active policy rows.
2. Add admin read surfaces for policies, counters, and events.
3. Add write surfaces for global and user policy rows.
4. Integrate quota enforcement into queued admission paths.
5. Integrate direct-flow enforcement for preview and any in-scope chat paths.
6. Add tests before inserting any real blocking policy rows.
7. Enable behavior operationally by adding policy rows, not by shipping a code
   flag.

This order matters because shipping the code with no policy rows should produce
no user-visible behavior change, which makes staging verification much easier.

## Open Questions

These are not blockers for writing code, but they should be answered before
production rollout:

1. Are all chat and synthesis endpoints in scope, or only generation/research
   endpoints?
2. Should voiceover LLM preprocessing ever become quota-bearing, or remain an
   internal helper forever?
3. Does product want a self-service remaining-quota UI, or is server-side error
   feedback enough for v1?
4. Are one-off support grants or resets required? If yes, prefer explicit
   adjustment events over direct counter edits.
5. If a user is blocked on one key in a composite bundle, should the UI mention
   only the first blocker or every blocker? This plan recommends every blocker.

## Decision Summary

If this feature becomes a requirement, the preferred implementation is:

1. quota keys grouped by modality
2. global policy plus per-user overrides
3. admission-time spending
4. counter plus event persistence
5. media-layer enforcement
6. queue-safe atomicity for queued flows
7. optional later expansion to chat and image-generation scopes
