# Operations

Operations are the runnable CLI entrypoints for workflow tooling.

Execution model:

```text
Automation lane -> Operation -> Workflow -> Skills -> Outputs
```

- `Operation`: CLI-run entrypoint (`software-factory operation run ...`).
- `Workflow`: documented delivery or maintenance flow selected by the operation.
- `Skill`: reusable method invoked during workflow execution.

The registry field is still named `strategy`; the docs use `workflow`.

Registry source of truth:
- [`software-factory/operations/registry.json`](./registry.json)
- [`software-factory/operations/registry.schema.json`](./registry.schema.json)

## Available Operations

1. `ready-for-dev-executor`
- Purpose: implement `ready-for-dev` issues.
- Workflow: `auto` (routed by issue complexity/surface).
- Runner: native Effect TypeScript two-stage router:
  - codex planner call selects a coherent issue bundle + model/thinking
  - codex execution call implements the selected bundle
- Args: `--issue`, `--dry-run`, `--max-runs`, `--model`, `--thinking`

2. `issue-evaluator`
- Purpose: apply decision labels to open issues.
- Workflow: `periodic-scans`
- Args: `--dry-run`, `--model`, `--thinking`

3. `sanity-check`
- Purpose: periodic scan/fix loop with recurrence guardrails.
- Workflow: `periodic-scans`
- Args: `--dry-run`, `--model`, `--thinking`

4. `best-practice-researcher`
- Purpose: best-practice random-walk research and issue drafting.
- Workflow: `periodic-scans`
- Args: `--dry-run`, `--model`, `--thinking`

5. `software-factory-researcher`
- Purpose: workflow, automation, and documentation/tooling maintenance research.
- Workflow: `self-improvement`
- Args: `--dry-run`, `--model`, `--thinking`

6. `product-vision-researcher`
- Purpose: strategic product opportunity research.
- Workflow: `periodic-scans`
- Args: `--dry-run`, `--model`, `--thinking`

7. `product-owner-reviewer`
- Purpose: tactical UX/journey review and issue drafting.
- Workflow: `periodic-scans`
- Args: `--dry-run`, `--model`, `--thinking`

## Runtime Notes

- Use `pnpm software-factory operation list` for machine-readable discovery (`--json`).
- Use `pnpm software-factory operation explain --operation-id <id>` to inspect runner, defaults, and args.
- `operation run` subcommands are generated from the registry descriptors. Adding/changing args in `registry.json` updates the CLI surface automatically.
- Use `pnpm software-factory operation run <id> --dry-run` to inspect resolved launch commands.
- Use `pnpm software-factory operation run ready-for-dev-executor --max-runs <n>` to allow up to `n` routed executions; it exits early when no `ready-for-dev` issues remain.
