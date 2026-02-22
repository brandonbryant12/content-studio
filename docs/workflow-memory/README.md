# Workflow Memory System

This directory is the durable workflow memory system for the repository.

It replaces the single-file memory log in `docs/workflow-memory.md` to avoid context bloat.

## Layout

```text
docs/workflow-memory/
  README.md
  index.json
  guardrails.md
  taxonomy.md
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
- Optional fields:
  - `reflection` (what went well / what to repeat)
  - `feedback` (what to improve / what to avoid)
  - `importance` (0-1, higher = more critical or reusable)
  - `recency` (0-1, higher = more recent; override computed recency if needed)
  - `confidence` (0-1, higher = more reliable evidence)

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
- `importance` (optional 0-1)
- `recency` (optional 0-1)
- `confidence` (optional 0-1)
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

## Taxonomy

`taxonomy.md` defines canonical tags for:

- memory form/function/dynamics
- agent capability axes and failure modes

Use canonical taxonomy tags whenever the event covers memory behavior or agent
run failures.

Tag standard:

- If tags include `memory` or `workflow-memory`, include at least one of each:
  - `memory-form:*`
  - `memory-function:*`
  - `memory-dynamics:*`
- If any `capability:*` or `failure:*` tags are present, include at least one
  from both groups.

## Retrieval Rule For Agents

Read in this order:

1. `guardrails.md`
2. `taxonomy.md`
3. `summaries/<current-month>.md` (or latest available)
4. `index.json` filtered to relevant workflow/tags
5. Top 3-5 matching events from `events/*.jsonl`

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
  --reflection "Captured authz risk early in review" \
  --feedback "Add checklist item for ownership before merge" \
  --owner "@team" \
  --status "open" \
  --severity "high" \
  --tags authz,invariants \
  --capability instruction-following \
  --failure-mode incorrect-patch \
  --importance 0.8 \
  --recency 0.9 \
  --confidence 0.7
```

This appends an event to the current month and updates `index.json`.

## Scoring + Retrieval

Scoring uses a lightweight weighted sum:

- `score = 0.4 * importance + 0.3 * recency + 0.2 * tagMatch + 0.1 * confidence`
- If `recency` is omitted, retrieval computes a 90-day linear decay from `date`.

Retrieval helper:

```bash
node scripts/workflow-memory/retrieve.mjs \
  --workflow "Self-Improvement" \
  --tags guardrail,docs \
  --limit 5 \
  --min-score 0.35
```

Sample output (truncated):

```json
{
  "query": {
    "workflow": "Self-Improvement",
    "tags": [
      "guardrail",
      "docs"
    ],
    "month": null,
    "minScore": 0.35,
    "limit": 5
  },
  "results": [
    {
      "id": "2026-02-21-self-improvement-workflow-memory-scoring-retrieval-helper",
      "date": "2026-02-21",
      "workflow": "Self-Improvement",
      "title": "Workflow memory scoring + retrieval helper",
      "tags": [
        "guardrail",
        "docs",
        "workflow-memory"
      ],
      "score": 0.86,
      "breakdown": {
        "importance": 0.8,
        "recency": 0.9,
        "tagMatch": 1,
        "confidence": 0.7
      },
      "eventFile": "events/2026-02.jsonl"
    }
  ]
}
```

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
