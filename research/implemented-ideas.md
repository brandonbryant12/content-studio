# Implemented Research Ideas Log

Record each shipped change that adopts an idea from an external paper.

## Entry Template

### YYYY-MM-DD - Short Title
- Issue: <github issue url or #number>
- PR: <github pr url or #number>
- Paper link(s):
  - <url 1>
  - <url 2>
- Adopted idea(s):
  - <idea used from paper>
- Implementation summary:
  - <what changed in this repo>
- Code references:
  - `<path/to/file>`
  - `<path/to/file>`

## Entries

<!-- Add new entries at the top of this section -->
### 2026-02-25 - Schema-First Contracts for Podcast, Infographic, and Document Generation
- Issue: https://github.com/brandonbryant12/content-studio/issues/141
- PR: https://github.com/brandonbryant12/content-studio/pull/157
- Paper link(s):
  - https://ai.google.dev/gemini-api/docs/structured-output
- Adopted idea(s):
  - Enforce schema-constrained model outputs before persistence/rendering.
  - Treat schema-validation failures as explicit retryable events with bounded retries.
- Implementation summary:
  - Added structured contracts for podcast segments, infographic layout plans, and document research outlines; persisted typed fields to DB-facing schemas and rendered them directly in web surfaces without prompt-text parsing.
  - Added bounded schema retry orchestration and activity-log entries for validation retry/failure outcomes in generation paths.
- Code references:
  - [`packages/media/src/podcast/use-cases/generate-script.ts`](../packages/media/src/podcast/use-cases/generate-script.ts)
  - [`packages/media/src/infographic/use-cases/execute-generation.ts`](../packages/media/src/infographic/use-cases/execute-generation.ts)
  - [`packages/media/src/document/use-cases/process-research.ts`](../packages/media/src/document/use-cases/process-research.ts)
  - [`packages/db/src/schemas/infographics.ts`](../packages/db/src/schemas/infographics.ts)
  - [`packages/db/src/schemas/documents.ts`](../packages/db/src/schemas/documents.ts)
  - [`apps/web/src/features/infographics/components/infographic-workbench-container.tsx`](../apps/web/src/features/infographics/components/infographic-workbench-container.tsx)
  - [`apps/web/src/features/documents/components/document-detail-source-sections.tsx`](../apps/web/src/features/documents/components/document-detail-source-sections.tsx)

### 2026-02-22 - Workflow-Memory Taxonomy Tags + Validation
- Issue: https://github.com/content-studio/issues/66
- PR: https://github.com/content-studio/pull/83
- Paper link(s):
  - https://arxiv.org/abs/2512.13564
  - https://arxiv.org/abs/2308.03688
- Adopted idea(s):
  - Use explicit memory dimensions (form/function/dynamics) to improve memory analysis consistency.
  - Use stable capability and failure classes to make agent-run diagnostics aggregatable.
- Implementation summary:
  - Added a canonical workflow-memory taxonomy and wired it into workflow docs, skill guidance, and `add-entry.mjs` validation so memory and agent-failure tags are structured instead of free-form.
- Code references:
  - [`software-factory/workflow-memory/taxonomy.md`](../software-factory/workflow-memory/taxonomy.md)
  - `software-factory/scripts/workflow-memory/add-entry.ts`
  - [`software-factory/workflow-memory/README.md`](../software-factory/workflow-memory/README.md)
  - [`software-factory/workflows/README.md`](../software-factory/workflows/README.md)
  - [`.agents/skills/periodic-scans/SKILL.md`](../.agents/skills/periodic-scans/SKILL.md)

### 2026-02-21 - Workflow Memory Scoring + Retrieval Helper
- Issue: https://github.com/content-studio/issues/41
- PR: https://github.com/content-studio/pull/50
- Paper link(s):
  - https://arxiv.org/abs/2304.03442
- Adopted idea(s):
  - Prioritize memory retrieval using recency + importance weighting.
- Implementation summary:
  - Added optional scoring fields to workflow memory events/index and a retrieval helper that ranks by weighted score.
- Code references:
  - [`software-factory/workflow-memory/README.md`](../software-factory/workflow-memory/README.md)
  - `software-factory/scripts/workflow-memory/add-entry.ts`
  - `software-factory/scripts/workflow-memory/retrieve.ts`
