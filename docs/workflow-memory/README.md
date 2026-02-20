# Workflow Memory System

This directory is the durable workflow memory system for the repository.

It replaces the single-file memory log in `docs/workflow-memory.md` to avoid context bloat.

## Layout

```text
docs/workflow-memory/
  README.md
  index.json
  guardrails.md
  events/
    YYYY-MM.jsonl
  summaries/
    YYYY-MM.md
```

## Event Record (Source Of Truth)

- Store one JSON object per line in `events/YYYY-MM.jsonl`.
- Keep entries small and factual.
- Required fields:
  - `id`
  - `date` (`YYYY-MM-DD`)
  - `workflow`
  - `title`
  - `trigger`
  - `finding`
  - `evidence`
  - `followUp`
  - `owner`
  - `status`

## Index (Fast Retrieval)

`index.json` is a compact lookup table for retrieval and ranking.

Each index row contains:

- `id`
- `date`
- `month`
- `workflow`
- `title`
- `severity`
- `status`
- `tags`
- `eventFile`

## Summaries (Human Compression)

`summaries/YYYY-MM.md` is the monthly rollup:

- top repeated patterns
- guardrails added
- open risks
- carry-over actions

## Guardrail Ledger

`guardrails.md` stores only durable controls that became standards (test, lint, docs rule, skill rule, automation).

Do not copy every incident here.

## Retrieval Rule For Agents

Read in this order:

1. `guardrails.md`
2. `summaries/<current-month>.md` (or latest available)
3. `index.json` filtered to relevant workflow/tags
4. Top 3-5 matching events from `events/*.jsonl`

Do not load full event history unless explicitly requested.

## Write Protocol

Preferred command:

```bash
node scripts/workflow-memory/add-entry.mjs \
  --workflow "Feature Delivery" \
  --title "Example pattern" \
  --trigger "PR #123 review" \
  --finding "Missing ownership check on mutation path" \
  --evidence "packages/media/src/...:42" \
  --follow-up "add invariant + docs rule" \
  --owner "@team" \
  --status "open" \
  --severity "high" \
  --tags authz,invariants
```

This appends an event to the current month and updates `index.json`.

## Coverage Audit

Use the coverage audit to spot sparse workflow memory before it drifts:

```bash
pnpm workflow-memory:coverage
```

Optional flags:

- `--month YYYY-MM` checks a specific month
- `--min N` requires at least `N` entries per workflow
- `--strict` exits non-zero when any workflow is below threshold

Weekly baseline:

```bash
pnpm workflow-memory:coverage:strict
```

If coverage reports a workflow as missing and that workflow was run, add the missing event immediately with `scripts/workflow-memory/add-entry.mjs`.

## Migration

Run this once to migrate legacy markdown entries:

```bash
node scripts/workflow-memory/migrate-legacy-memory.mjs
```

Legacy source file: `docs/workflow-memory.md`.

## Compaction Policy

- Weekly: dedupe repeated entries and close resolved items.
- Monthly: roll up summary and convert recurring patterns into guardrails.
- Archive closed items older than 90 days if event volume grows significantly.

Compaction helper:

```bash
node scripts/workflow-memory/compact-memory.mjs --archive-closed --days 90
```
