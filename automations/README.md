# Automation Lanes

Automation lanes are the scheduled or event-driven wrappers around
`pnpm software-factory operation run <operation-id>`.

Use this folder when you need to understand:

- what runs automatically
- which operation a lane invokes
- what bootstrap and safety checks happen before the run
- which playbook is authoritative for lane behavior

## Runtime Model

```text
automation .toml -> run-operation-wrapper.sh -> bootstrap profile -> operation run -> playbook
```

## Lane Profiles

- Advisory lanes (`issue-evaluator`, `best-practice-researcher`, `software-factory-researcher`, `product-vision-researcher`, `product-owner-reviewer`)
  - inspect, research, and open follow-up issues
  - skip workspace-clean checks and full install/test bootstrap
  - run `pnpm workflow-memory:preflight --bootstrap` before lane work
- Implementation lanes (`ready-for-dev-executor`, `sanity-check`)
  - can change code or docs
  - require a fuller bootstrap path before execution
  - should use the CI test profile in worktrees (`pnpm test:ci`) rather than the interactive local profile

## Rules

1. Lanes do not own delivery logic; the playbook and operation do.
2. Lanes call [`run-operation-wrapper.sh`](./run-operation-wrapper.sh) for deterministic bootstrap.
3. The operation ID is the contract key between the lane and the CLI.
4. The playbook (`automations/<lane>/<lane>.md`) is the source of truth for behavior.

## Source Of Truth

1. Operation registry: [`software-factory/operations/registry.json`](../software-factory/operations/registry.json)
2. Automation wrappers: [`automations/*/*.toml`](./)
3. Automation playbooks: [`automations/*/*.md`](./)
