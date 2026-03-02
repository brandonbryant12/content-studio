# Automations

Automations are external scheduler wrappers. They live at repository root and invoke Software Factory operations.

## Model

```text
automation.toml schedule
      |
      v
run-operation-wrapper.sh <operation-id>
      |
      v
profiled bootstrap + operation run
      |
      v
operation runner + playbook execution
```

Wrapper profiles:
- advisory lanes (`issue-evaluator`, `best-practice-researcher`, `software-factory-researcher`, `product-vision-researcher`, `product-owner-reviewer`):
  - skip workspace-clean check
  - skip unconditional `pnpm install`
  - skip `pnpm software-factory doctor`
  - run `pnpm workflow-memory:preflight --bootstrap`, then operation
- implementation lanes (for example `ready-for-dev-executor`, `sanity-check`):
  - workspace clean check + install + workflow-memory preflight + doctor + operation run

## Rules

1. Wrappers do not implement delivery logic.
2. Wrappers call [`run-operation-wrapper.sh`](./run-operation-wrapper.sh) for deterministic, profile-aware bootstrap before `operation run`.
3. Operation IDs are the automation contract key.
4. Playbooks (`*.md`) are source of truth for behavior.
5. Code-writing lanes should use CI test profile gates in worktrees (`pnpm test:ci`) rather than the interactive local profile.

## Source Of Truth

1. Operation registry: [`software-factory/operations/registry.json`](../software-factory/operations/registry.json)
2. Automation wrappers: [`automations/*/*.toml`](./)
3. Automation playbooks: [`automations/*/*.md`](./)

## Runtime Sync

Push wrapper updates to local Codex runtime:

```bash
pnpm automations:sync:runtime
```

Preview sync actions without writing files:

```bash
pnpm automations:sync:runtime:dry-run
```

This sync script:
1. Copies every `automations/<id>/<id>.toml` wrapper into `~/.codex/automations/content-studio--<id>/automation.toml`
2. Rewrites runtime-only fields (`id`, `name`, `cwds`, `updated_at`)
3. Preserves wrapper contract fields (`prompt`, `status`, `rrule`, `created_at`) from repo source of truth
