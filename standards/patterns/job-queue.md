# Job Queue Pattern

This document defines the default queue architecture for backend jobs.

## Goal

Keep job enqueue and processing simple, durable, and easy to debug.

## Baseline

Use Postgres `job` as the queue of record.

`@repo/queue` enqueue writes directly to `job`:
1. Insert pending row in `job`
2. Worker claims with `FOR UPDATE SKIP LOCKED`
3. Worker updates status (`processing` -> `completed`/`failed`)

## Use-Case Rule

Use-cases should not manually insert job rows.
Always enqueue through queue primitives (`enqueueJob` -> `queue.enqueue`).

## Worker Rule

Workers claim only from `job` (no secondary queue relay/drain step).

## Reliability Guardrails

- Use idempotent start-generation flows (`findActiveJob` before enqueue)
- Use `withTransactionalStateAndEnqueue(...)` for state-change + enqueue flows
- Run `pnpm test:invariants` and job workflow tests for API -> worker alignment
