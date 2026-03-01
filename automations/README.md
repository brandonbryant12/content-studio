# Automations

Automations are external scheduler wrappers. They live at repository root and invoke Software Factory operations.

## Model

```text
automation.toml schedule
      |
      v
pnpm software-factory operation run --operation-id <id>
      |
      v
operation runner + playbook execution
```

## Rules

1. Wrappers do not implement delivery logic.
2. Wrappers call `operation run` only.
3. Operation IDs are the automation contract key.
4. Playbooks (`*.md`) are source of truth for behavior.

## Source Of Truth

1. Operation registry: [`software-factory/operations/registry.json`](../software-factory/operations/registry.json)
2. Automation wrappers: [`automations/*/*.toml`](./)
3. Automation playbooks: [`automations/*/*.md`](./)

## Runtime Sync

Push wrapper updates to local Codex runtime:

```bash
cp automations/best-practice-researcher/best-practice-researcher.toml ~/.codex/automations/best-practice-researcher/automation.toml
cp automations/ready-for-dev-executor/ready-for-dev-executor.toml ~/.codex/automations/ready-for-dev-executor/automation.toml
cp automations/software-factory-researcher/software-factory-researcher.toml ~/.codex/automations/software-factory-researcher/automation.toml
cp automations/product-vision-researcher/product-vision-researcher.toml ~/.codex/automations/product-vision-researcher/automation.toml
cp automations/product-owner-reviewer/product-owner-reviewer.toml ~/.codex/automations/product-owner-reviewer/automation.toml
cp automations/issue-evaluator/issue-evaluator.toml ~/.codex/automations/issue-evaluator/automation.toml
cp automations/sanity-check/sanity-check.toml ~/.codex/automations/sanity-check/automation.toml
```

Pull runtime wrappers back into repo mirror:

```bash
cp ~/.codex/automations/best-practice-researcher/automation.toml automations/best-practice-researcher/best-practice-researcher.toml
cp ~/.codex/automations/ready-for-dev-executor/automation.toml automations/ready-for-dev-executor/ready-for-dev-executor.toml
cp ~/.codex/automations/software-factory-researcher/automation.toml automations/software-factory-researcher/software-factory-researcher.toml
cp ~/.codex/automations/product-vision-researcher/automation.toml automations/product-vision-researcher/product-vision-researcher.toml
cp ~/.codex/automations/product-owner-reviewer/automation.toml automations/product-owner-reviewer/product-owner-reviewer.toml
cp ~/.codex/automations/issue-evaluator/automation.toml automations/issue-evaluator/issue-evaluator.toml
cp ~/.codex/automations/sanity-check/automation.toml automations/sanity-check/sanity-check.toml
```
