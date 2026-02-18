# Legacy Workflow Memory (Deprecated)

This file is the legacy markdown memory format.

New workflow memory lives in `docs/workflow-memory/`:

- `docs/workflow-memory/events/YYYY-MM.jsonl` (event source of truth)
- `docs/workflow-memory/index.json` (retrieval index)
- `docs/workflow-memory/summaries/YYYY-MM.md` (monthly compression)
- `docs/workflow-memory/guardrails.md` (durable controls)

## Migration

Run:

```bash
node scripts/workflow-memory/migrate-legacy-memory.mjs
```

Do not add new entries to this file.
