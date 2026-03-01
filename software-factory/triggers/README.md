# Triggers

Triggers are scheduler-facing policies that invoke operations.

Flow:

```text
Scheduler/Event
   |
   v
software-factory trigger fire <trigger-id>
   |
   v
Operation execution
```

Registry source of truth:
- [`software-factory/triggers/registry.json`](./registry.json)

## Rules

1. Triggers do not contain implementation logic.
2. Triggers only select operation + default args.
3. Operations own model/thinking routing and delivery behavior.
4. Strategy + skill selection happens inside operation execution.

## Commands

1. `pnpm software-factory trigger list`
2. `pnpm software-factory trigger fire <trigger-id>`
