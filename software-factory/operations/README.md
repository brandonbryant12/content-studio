# Operations

Operations are the runnable units of the Software Factory CLI.

Execution model:

```text
Trigger -> Operation -> Strategy -> Skills -> Artifacts
```

- `Trigger`: schedule or manual event that starts a run.
- `Operation`: CLI-run entrypoint (`software-factory operation run ...`).
- `Strategy`: internal execution contract selected by the operation.
- `Skill`: reusable method invoked during strategy phases.

Registry source of truth:
- [`software-factory/operations/registry.json`](./registry.json)

## Available Operations

1. `ready-for-dev-executor`
- Purpose: implement `ready-for-dev` issues.
- Strategy: `auto` (routed by issue complexity/surface).
- Runner: native Effect TypeScript router (issue selection + model/thinking routing in CLI).
- Args: `--issue`, `--dry-run`, `--model`, `--thinking`

2. `issue-evaluator`
- Purpose: apply decision labels to open issues.
- Strategy: `periodic-scans`
- Args: `--dry-run`, `--model`, `--thinking`

3. `sanity-check`
- Purpose: periodic scan/fix loop with recurrence guardrails.
- Strategy: `periodic-scans`
- Args: `--dry-run`, `--model`, `--thinking`

4. `best-practice-researcher`
- Purpose: best-practice random-walk research and issue drafting.
- Strategy: `periodic-scans`
- Args: `--dry-run`, `--model`, `--thinking`

5. `software-factory-researcher`
- Purpose: software-factory and self-improvement research.
- Strategy: `self-improvement`
- Args: `--dry-run`, `--model`, `--thinking`

6. `product-vision-researcher`
- Purpose: strategic product opportunity research.
- Strategy: `periodic-scans`
- Args: `--dry-run`, `--model`, `--thinking`

7. `product-owner-reviewer`
- Purpose: tactical UX/journey review and issue drafting.
- Strategy: `periodic-scans`
- Args: `--dry-run`, `--model`, `--thinking`

## Runtime Notes

- Use `pnpm software-factory operation list` for machine-readable discovery (`--json`).
- Use `pnpm software-factory operation run <id> --dry-run` to inspect resolved launch commands.
- Use `pnpm software-factory operation run ready-for-dev-executor` for a single routed execution (no internal loop).
