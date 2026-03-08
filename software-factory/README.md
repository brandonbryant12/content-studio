# Workflow Skills And Automation

This directory documents the repository's workflow tooling: the runnable
operations, the workflow pages behind them, the reusable skills they call, and
the automation lanes that schedule or trigger that work.

Most product changes should start in [`docs/`](../docs/README.md). Use this
folder when you need to answer one of these questions:

- Which workflow fits this task?
- Which skill should I use?
- Which automation lane owns this behavior?
- Which CLI command runs it?

## Terms

- `Operation`: a runnable CLI entrypoint in [`software-factory/operations/`](./operations/).
- `Workflow`: the documented delivery or maintenance flow in [`software-factory/workflows/`](./workflows/).
- `Skill`: reusable execution instructions in [`.agents/skills/`](../.agents/skills/).
- `Automation lane`: a scheduled or event-driven wrapper in [`automations/`](../automations/).

The CLI and some registry fields still use the internal term `strategy`. In the
developer-facing docs, prefer `workflow`.

## Typical Flow

```text
Developer or automation lane -> operation -> workflow -> skill -> code/docs/tests
```

## Start Here

1. Pick a workflow: [`software-factory/workflows/README.md`](./workflows/README.md)
2. Check the runnable entrypoint: [`software-factory/operations/README.md`](./operations/README.md)
3. Read the lane behavior: [`automations/README.md`](../automations/README.md)
4. Open the matching skill in [`.agents/skills/`](../.agents/skills/)

## Useful Commands

1. `pnpm software-factory operation list`
2. `pnpm software-factory operation explain --operation-id <operation-id>`
3. `pnpm software-factory operation run <operation-id> [operation-options]`
4. `pnpm software-factory doctor`

Use `operation explain` before running a lane you do not already know. It shows
the owning workflow, arguments, defaults, and playbook path.

## Source Of Truth

| Surface | Path |
|---|---|
| Operations registry | [`software-factory/operations/registry.json`](./operations/registry.json) |
| Operations schema | [`software-factory/operations/registry.schema.json`](./operations/registry.schema.json) |
| Workflow catalog | [`software-factory/workflows/registry.json`](./workflows/registry.json) |
| Skills | [`.agents/skills/`](../.agents/skills/) |
| Automation lanes | [`automations/`](../automations/) |
| Workflow logging | [`software-factory/workflow-memory/`](./workflow-memory/) |

## Next Read

1. [`software-factory/workflows/README.md`](./workflows/README.md)
2. [`software-factory/operations/README.md`](./operations/README.md)
3. [`automations/README.md`](../automations/README.md)
4. [`software-factory/workflow-memory/README.md`](./workflow-memory/README.md)
