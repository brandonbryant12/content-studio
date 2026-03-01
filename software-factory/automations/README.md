# Automations

Automations are trigger wrappers. They do not contain execution logic.

## Terminology

1. `Trigger`
- Scheduler-facing wrapper (toml + schedule).
- Calls the Software Factory CLI.

2. `Operation`
- Runnable unit selected by a trigger.
- Executed by `software-factory operation run ...`.

3. `Strategy`
- Internal execution contract used by an operation.
- Documented in [`software-factory/workflows/`](../workflows/).

4. `Skill`
- Reusable method invoked during strategy phases.
- Documented in [`.agents/skills/`](../../.agents/skills/).

## Architecture

```text
automation.toml schedule
      |
      v
software-factory trigger fire <trigger-id>
      |
      v
software-factory operation run <operation-id>
      |
      v
strategy + skill execution (playbook source of truth)
```

## Trigger Policy

Every trigger wrapper must:

1. Call the common CLI entrypoint.
2. Avoid re-implementing operation logic in the wrapper prompt.
3. Keep wrapper output concise (success/no-op/failure summary).
4. Defer behavior details to operation playbooks and registries.

## Active Trigger Set

1. `best-practice-researcher`
2. `software-factory-researcher`
3. `product-vision-researcher`
4. `product-owner-reviewer`
5. `issue-evaluator`
6. `ready-for-dev-executor`
7. `sanity-check`

## Source Of Truth

1. Trigger registry: [`software-factory/triggers/registry.json`](../triggers/registry.json)
2. Operation registry: [`software-factory/operations/registry.json`](../operations/registry.json)
3. Playbooks: [`software-factory/automations/*/*.md`](./)
4. Wrapper mirrors: [`software-factory/automations/*/*.toml`](./)

## Runtime Sync Commands

Push wrapper updates from repo mirror to local runtime:

```bash
cp software-factory/automations/best-practice-researcher/best-practice-researcher.toml ~/.codex/automations/best-practice-researcher/automation.toml
cp software-factory/automations/ready-for-dev-executor/ready-for-dev-executor.toml ~/.codex/automations/ready-for-dev-executor/automation.toml
cp software-factory/automations/software-factory-researcher/software-factory-researcher.toml ~/.codex/automations/software-factory-researcher/automation.toml
cp software-factory/automations/product-vision-researcher/product-vision-researcher.toml ~/.codex/automations/product-vision-researcher/automation.toml
cp software-factory/automations/product-owner-reviewer/product-owner-reviewer.toml ~/.codex/automations/product-owner-reviewer/automation.toml
cp software-factory/automations/issue-evaluator/issue-evaluator.toml ~/.codex/automations/issue-evaluator/automation.toml
cp software-factory/automations/sanity-check/sanity-check.toml ~/.codex/automations/sanity-check/automation.toml
```

Pull runtime wrappers back into repo mirror (verification only):

```bash
cp ~/.codex/automations/best-practice-researcher/automation.toml software-factory/automations/best-practice-researcher/best-practice-researcher.toml
cp ~/.codex/automations/ready-for-dev-executor/automation.toml software-factory/automations/ready-for-dev-executor/ready-for-dev-executor.toml
cp ~/.codex/automations/software-factory-researcher/automation.toml software-factory/automations/software-factory-researcher/software-factory-researcher.toml
cp ~/.codex/automations/product-vision-researcher/automation.toml software-factory/automations/product-vision-researcher/product-vision-researcher.toml
cp ~/.codex/automations/product-owner-reviewer/automation.toml software-factory/automations/product-owner-reviewer/product-owner-reviewer.toml
cp ~/.codex/automations/issue-evaluator/automation.toml software-factory/automations/issue-evaluator/issue-evaluator.toml
cp ~/.codex/automations/sanity-check/automation.toml software-factory/automations/sanity-check/sanity-check.toml
```
