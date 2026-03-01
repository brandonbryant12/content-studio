# Software Factory

Software Factory is the execution control plane for repository automation and agent-driven delivery.

## Canonical Terms

1. `Operation`
- Runnable unit in the CLI.
- Example: `ready-for-dev-executor`, `issue-evaluator`.

2. `Strategy`
- Internal execution contract selected by an operation.
- Source of truth lives in [`software-factory/workflows/`](./workflows/).

3. `Trigger`
- Schedule or event policy that starts an operation.
- Source of truth lives in [`software-factory/triggers/`](./triggers/).

4. `Skill`
- Reusable method used while executing strategy phases.
- Source of truth lives in [`.agents/skills/`](../.agents/skills/).

## System Flow

```text
Trigger (schedule/manual/event)
   |
   v
software-factory trigger fire <id>
   |
   v
Operation Runner
   |
   +--> model/thinking resolution
   +--> issue/scope selection
   +--> strategy selection
   |
   v
Skill Runner
   |
   v
Artifacts (labels, comments, PRs, memory events)
```

## CLI Surfaces

1. `pnpm software-factory operation list`
2. `pnpm software-factory operation run <operation-id> ...`
3. `pnpm software-factory trigger list`
4. `pnpm software-factory trigger fire <trigger-id> ...`
5. `pnpm software-factory doctor`

## Source Of Truth

| Surface | Path |
|---|---|
| Operations registry | [`software-factory/operations/registry.json`](./operations/registry.json) |
| Triggers registry | [`software-factory/triggers/registry.json`](./triggers/registry.json) |
| Strategies catalog | [`software-factory/workflows/registry.json`](./workflows/registry.json) |
| Automation playbooks | [`software-factory/automations/`](./automations/) |
| Workflow memory | [`software-factory/workflow-memory/`](./workflow-memory/) |

## Next Read

1. [`software-factory/operations/README.md`](./operations/README.md)
2. [`software-factory/triggers/README.md`](./triggers/README.md)
3. [`software-factory/workflows/README.md`](./workflows/README.md)
4. [`software-factory/automations/README.md`](./automations/README.md)
5. [`software-factory/workflow-memory/README.md`](./workflow-memory/README.md)
