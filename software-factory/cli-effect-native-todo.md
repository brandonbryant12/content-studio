# Software Factory CLI: Effect-Native + Dynamic Command TODO

Status: active  
Owner: `@codex`  
Policy: no backward compatibility, no fallback-heavy behavior

## Goal

Make Software Factory CLI fully Effect-native and `@effect/cli`-native with dynamic command contracts sourced from registries.

## Non-Negotiables

1. Single entrypoint remains `pnpm software-factory ...`.
2. Command execution logic is Effect programs end-to-end (no Promise bridge wrappers in command services).
3. No manual argv-style adapters inside utility/business modules.
4. Dynamic command tree is generated from typed registry/service descriptors.
5. All failures are tagged domain errors mapped to deterministic exit codes.

## Execution Plan

### Phase 1: Foundation (Effect runtime + error contract)

- [ ] Add `software-factory/scripts/factory/cli-errors.ts` with tagged error families:
  - `CliInputError`
  - `RegistryValidationError`
  - `OperationLookupError`
  - `ExternalToolError`
  - `WorkflowMemoryError`
  - `PolicyViolationError`
- [ ] Add centralized exit-code mapping (`_tag -> code`) and remove ad-hoc `process.exitCode` mutation spread.
- [ ] Introduce Effect-native service tags/layers for:
  - filesystem IO
  - process execution
  - clock
  - console
  - cwd/config
- [ ] Ensure root runtime provides all layers exactly once.

Acceptance:

- [ ] No `throw new Error(...)` in `software-factory/scripts/factory/*`.
- [ ] Root CLI exits via tagged error mapping only.

### Phase 2: Operation registry as typed source of truth

- [ ] Add `software-factory/operations/registry.schema.json`.
- [ ] Add validator/loader module returning typed operations and invariant checks.
- [ ] Validate runner contract consistency (`runner.type`, playbook path exists, args contract sane).
- [ ] Replace raw JSON parse/casts in control-plane registry with validated loader service.

Acceptance:

- [ ] Invalid registry shape fails with deterministic tagged error.
- [ ] `operation list/explain/run` all resolve from validated registry service only.

### Phase 3: Dynamic command tree (`@effect/cli`)

- [ ] Build operation run commands dynamically from operation descriptors (no hardcoded operation arg list).
- [ ] Keep `operation list` and `operation explain` as static control commands.
- [ ] Generate run option parsers from operation arg metadata (`string|number|boolean`, required/optional).
- [ ] Remove static operation-run option wiring from root CLI module.

Acceptance:

- [ ] Adding a new operation arg in registry updates CLI surface without manual CLI edits.
- [ ] Unknown operation/arg paths fail with typed errors, not generic runtime exceptions.

### Phase 4: Convert operation execution to full Effect

- [ ] Convert `control-plane-execution.ts` from async Promise functions to Effect programs.
- [ ] Move `runCommand` / `runStreamingCommand` usage behind injected process service.
- [ ] Remove nested `Effect.runPromise(...)` from infra helpers.
- [ ] Keep codex/gh policies as typed domain modules.

Acceptance:

- [ ] `runOperation` returns `Effect.Effect<number, DomainError, Env>`.
- [ ] No `Effect.tryPromise` wrappers around Promise-first execution service in root handler.

### Phase 5: Convert utility command modules to Effect-native APIs

- [ ] Convert each utility module API from Promise-returning runner to Effect-returning service functions:
  - `skills/check-quality`
  - `workflows/generate-readme`
  - `workflow-memory/add-entry`
  - `workflow-memory/preflight`
  - `workflow-memory/retrieve`
  - `workflow-memory/compact`
  - `workflow-memory/check-coverage`
  - `workflow-memory/replay-scenarios`
  - `workflow-memory/sync-git`
  - `scripts/guardrails lint`
  - `spec/generate`
- [ ] Remove CLI-shaped field naming from internal business option types (`follow_up`, etc. -> domain camelCase).
- [ ] Keep CLI arg naming concerns at boundary only.

Acceptance:

- [ ] `utility-command-handlers.ts` dispatches Effect programs directly.
- [ ] No internal utility module depends on argv-style naming/shape.

### Phase 6: Guardrails hardening

- [ ] Extend script guardrails to fail on:
  - Promise-first command services in factory/utility modules
  - `throw new Error(...)` across `software-factory/scripts/**` command logic (except explicitly allowed low-level adapters during migration, then remove allowlist)
  - `Effect.runPromise` usage outside root entry runner
- [ ] Add guardrail for registry/command drift:
  - operation registry args vs generated dynamic options
  - utility command manifest vs command descriptors

Acceptance:

- [ ] `pnpm scripts:lint` fails on any regression from full Effect-native standard.

### Phase 7: Test matrix expansion

- [ ] Add integration tests for:
  - dynamic operation command generation
  - `operation run` success/failure/dry-run routes
  - deterministic exit code mapping for tagged errors
  - invalid registry schema behavior
  - utility command failure tagging
- [ ] Keep existing script guardrail tests and expand with new structural assertions.

Acceptance:

- [ ] `pnpm test:scripts` covers dynamic command surfaces and error contracts.

### Phase 8: Cleanup and cutover completion

- [ ] Remove dead helpers/bridges no longer needed.
- [ ] Update docs (`software-factory/README.md`, `operations/README.md`, `workflows/README.md`) to final dynamic CLI contract.
- [ ] Add workflow-memory entry documenting migration completion and residual risk.

Acceptance:

- [ ] No compatibility wrappers remain.
- [ ] No fallback branches kept solely for legacy behavior.

## Definition of Done

1. `software-factory` command tree is descriptor/registry-driven for dynamic operation commands.
2. Command handlers and services are Effect-native end-to-end.
3. Tagged error model + deterministic exit codes are universal across CLI surfaces.
4. Guardrails enforce Effect-native conventions and prevent drift.
5. `pnpm scripts:lint`, `pnpm test:scripts`, `pnpm typecheck` all pass.

## Tracking

Current Sprint Focus:

- [ ] Phase 1
- [ ] Phase 2
- [ ] Phase 3

