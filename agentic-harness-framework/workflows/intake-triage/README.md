# Intake + Triage

- Memory key: `Intake + Triage`
- Primary skill: [`intake-triage`](../../../.agents/skills/intake-triage/SKILL.md)

## What It Does

Converts a request into scoped vertical slices, explicit acceptance criteria, test intent, and risk flags before implementation starts.

## Trigger Skills

- `intake-triage` (primary)
- `codebase-nav` (optional orientation support)

## Automation Entry Points

- [`architecture-approval-executor`](../../automations/architecture-approval-executor/architecture-approval-executor.md): screens and selects actionable `ready-for-dev` issues.
- [`self-improvement-judge-executor`](../../automations/self-improvement-judge-executor/self-improvement-judge-executor.md): intake and scoring stage for self-improvement issues.

## How It Works

1. Classify the request type (feature, bug, refactor, operational).
2. Read only the docs needed for the touched surfaces.
3. Define 1-3 vertical slices with user-visible outcomes.
4. Write acceptance criteria per slice, including error semantics and evidence expectations.
5. Mark out-of-scope items and open questions.
6. Record risk flags (authz, sanitization, queue/streaming, cache invalidation, architecture boundaries).

## Outputs

- Triage artifact with slices, acceptance criteria, and risk flags.
- Memory entry via `add-entry.mjs` with workflow `Intake + Triage`.
