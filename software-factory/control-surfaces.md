# Control Surfaces And Enforcement

This page is the operational reference for repository management controls.
It maps each surface to its canonical location, enforcement path, and output evidence.

## Surface Matrix

| Surface | Canonical Location | Enforced By | Produced Evidence |
|---|---|---|---|
| Master behavior spec | [`docs/master-spec.md`](../docs/master-spec.md), `docs/spec/generated/*`, `software-factory/scripts/spec/*` | `pnpm spec:generate`, `pnpm spec:check` | Updated generated snapshots, spec drift pass |
| Architecture/pattern standards | `docs/architecture/*`, `docs/patterns/*` | Type checks, lint, invariant tests, PR review | Rule-conformant code and tests |
| Frontend standards | `docs/frontend/*` | Lint, web tests/build, PR review | Hook/component/route behavior aligned with docs |
| Testing standards | `docs/testing/*` | Test selection and CI gates | Correct test depth by change type |
| Strategy catalog | `software-factory/workflows/registry.json`, `software-factory/workflows/*/README.md` | `pnpm workflows:generate`, docs review | Generated strategy catalog + per-strategy playbooks |
| Operation catalog | `software-factory/operations/registry.json` | `pnpm software-factory operation list` | Runnable operation inventory + argument contracts |
| Skill system | `.agents/skills/*/SKILL.md` | `software-factory/scripts/sync-skills.sh`, `pnpm skills:check:strict` | Valid canonical skills + symlink mirrors |
| Lint rules | `tools/eslint/base.js`, `tools/eslint/custom-rules.js`, package eslint configs | `pnpm lint` | Static rule pass/fail |
| Invariant tests | `packages/media/src/shared/__tests__/safety-invariants.test.ts`, `packages/api/src/server/__tests__/*invariants.test.ts` | `pnpm test:invariants` | Policy invariants pass/fail |
| Workspace quality gates | `package.json` scripts, `turbo.json`, `vitest.config.ts` | `pnpm typecheck`, `pnpm test`, `pnpm build` | Full build and runtime confidence |
| Workflow memory | `software-factory/workflow-memory/*`, `software-factory/scripts/workflow-memory/*.ts` | Add/retrieve/coverage/scenario scripts | Durable event logs + index + summaries |
| Automation wrappers | `automations/*/*.md`, `automations/*/*.toml` | Automation contracts + CLI delegation checks | Automated issue/PR execution trails |
| CI/CD pipelines | `Jenkinsfile`, `jenkins/*.groovy` | Jenkins job gates | Branch/main/nightly/weekly quality reports |

## `enforced-by` Markers In Standards Docs

Many docs rules include `<!-- enforced-by: ... -->` markers. They indicate expected enforcement mode:

| Marker | Practical Meaning | Typical Enforcement Path |
|---|---|---|
| `types` | Compile-time contract | `pnpm typecheck` and type signatures |
| `eslint` / `lint` | Static rule | `pnpm lint` + custom ESLint rules |
| `invariant-test` | Non-negotiable policy check | `pnpm test:invariants` |
| `architecture` | Boundary/runtime structure | Design review + integration tests + docs checks |
| `manual-review` | Human judgment required | PR review skills (`pr-risk-review`, `architecture-adr-guard`) |

`manual-review` rules are intentionally not fully automated; they are review checklists and risk controls.

## Lifecycle Wiring

| Phase | Primary Surfaces | Required Checks |
|---|---|---|
| Intake | Workflow + skills + standards docs | Scope and risk flags from `intake-triage` |
| Design/Spec | Master spec + architecture docs | Spec updates and generated artifacts when behavior changes |
| Implementation | Pattern/frontend docs + skills | Slice-level tests and guardrail compliance |
| Validation | Lint + tests + invariants + build | Full gate ladder before merge |
| Merge/Release | PR risk review + CI/CD | Linkage, gate evidence, deployment policy |
| Learning loop | Workflow memory + periodic scans + self-improvement | Event persistence, coverage checks, guardrail updates |

## Naming Boundaries To Keep Clear

1. Strategy memory keys are not operation IDs and not automation IDs.
Examples:
- Memory key: `Feature Delivery`
- Operation: `ready-for-dev-executor`
- Automation ID: `ready-for-dev-executor`

2. Operations are runnable entrypoints; strategies are process contracts; skills are execution methods.
Examples:
- Operation: `ready-for-dev-executor`
- Strategy: `Feature Delivery`
- Skill: `feature-delivery`

3. Operations can execute multiple strategies/skills and automations can start operations.
Examples:
- Automation wrapper: `ready-for-dev-executor`
- Starts operation: `ready-for-dev-executor`
- Operation executes: `Self-Improvement` strategy and `Feature Delivery` strategy with utility skills such as `debug-fix`

4. Skill source is canonical in `.agents/skills`.
`.agent/skills`, `.claude/skills`, and `.github/skills` are mirrors.

5. [`docs/master-spec.md`](../docs/master-spec.md) has generated and non-generated sections.
Only non-generated sections should be edited directly.

## Practical Start Sequence For New Contributors

1. Read [`software-factory/README.md`](./README.md).
2. Read [`software-factory/workflows/README.md`](./workflows/README.md) and the selected workflow page.
3. Read only the standards docs relevant to the touched surface.
4. Use the matching skills from `.agents/skills`.
5. Run required gates.
6. Persist workflow memory for workflows executed.
