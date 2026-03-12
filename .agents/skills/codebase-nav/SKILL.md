---
name: codebase-nav
description: Repository-specific navigation map for quickly locating domain code, contracts, routes, tests, and common integration points.
---

# Content Studio Codebase Navigation

Use this when you need fast repo orientation before implementing, reviewing, or debugging.

## Domain Map

Domain roots:

- `packages/media/src/source`
- `packages/media/src/podcast`
- `packages/media/src/voiceover`
- `packages/media/src/infographic`
- `packages/media/src/persona`
- `packages/media/src/activity`

Per-domain backend paths:

- DB schemas: `packages/db/src/schemas/{sources|podcasts|voiceovers|infographics|personas|activity-log}.ts`
- Domain errors: `packages/media/src/errors/*-errors.ts`
- Repos: `packages/media/src/{domain}/repos/`
- Use cases: `packages/media/src/{domain}/use-cases/`
- Use case tests: `packages/media/src/{domain}/use-cases/__tests__/`
- API contracts: `packages/api/src/contracts/{sources|podcasts|voiceovers|infographics|personas|activity}.ts`
- API routers: `packages/api/src/server/router/{source|podcast|voiceover|infographic|persona|activity}.ts`
- Router tests: `packages/api/src/server/router/__tests__/`

Frontend paths:

- Features: `apps/web/src/features/{sources|podcasts|voiceovers|infographics|personas|admin}/`
- Protected routes: `apps/web/src/routes/_protected/{sources|podcasts|voiceovers|infographics|personas}/`
- Activity route: `apps/web/src/routes/_protected/admin/activity.tsx`
- Frontend tests: `apps/web/src/features/**/__tests__/`

Cross-cutting paths:

- Query/api clients: `apps/web/src/clients/{apiClient,queryClient}.ts`
- Shared frontend hooks/components: `apps/web/src/shared/`
- API effect runtime: `packages/api/src/server/runtime.ts`
- SSE publisher: `packages/api/src/server/publisher.ts`
- Invariants: `packages/media/src/shared/__tests__/safety-invariants.test.ts`, `packages/api/src/server/__tests__/effect-handler.invariants.test.ts`
- Test factories/context: `packages/testing/src/`, `packages/media/src/test-utils/`

## Quick Lookup

1. Add or change one domain field across stack:
   - schema -> repo -> use case -> contract -> serializer/router -> frontend hooks/components -> tests
2. Add an API endpoint:
   - `packages/api/src/contracts/*.ts` then `packages/api/src/server/router/*.ts` then router integration test
3. Add a use case:
   - `packages/media/src/{domain}/use-cases/{action}.ts` and matching `__tests__/{action}.test.ts`
4. Add frontend data flow:
   - route loader file under `apps/web/src/routes/_protected/...` then feature hooks/components under `apps/web/src/features/...`
5. Fix failing invariant:
   - open invariant test file first, then follow the banned pattern path it reports

## Navigation Flow

1. Identify the changed domain/surface (media, api, web, infra).
2. Open the corresponding layer paths first from the domain map.
3. Confirm test targets before coding (`__tests__` and invariant files).
4. Only then branch into broad `rg` search if ambiguity remains.

## Navigation Commands

Use fast path discovery before broad search:

```bash
rg --files packages/media/src/{source,podcast,voiceover,infographic,persona,activity}
rg --files packages/api/src/{contracts,server/router}
rg --files apps/web/src/{features,routes/_protected}
rg -n "createFileRoute\\(|queryOptions\\(|handleEffectWithProtocol\\(" apps/web/src packages/api/src
```

## Output Contract

1. Paths checked (files/directories)
2. Exact edit/test target files selected
3. Any path ambiguity or missing canonical location

## Memory + Compounding

No standalone memory key for this support skill. Capture navigation findings in the parent core workflow event (`Feature Delivery`, `Architecture + ADR Guard`, `Docs + Knowledge Drift`, or `Periodic Scans`).
