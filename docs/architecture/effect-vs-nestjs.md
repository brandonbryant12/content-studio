# Why This Project Uses Effect TS Over NestJS

## Context

Content Studio uses an experimental technique called **Agent Harnessing**:
AI agents author changes, while specs, docs, tests, and automated gates constrain behavior.

Given that workflow, we optimize backend architecture for:

1. Compile-time safety
2. Explicit dependency wiring
3. Fast, deterministic testing

## Decision

For backend domain logic and runtime composition, this project standardizes on **Effect TS** (with Hono + oRPC) instead of NestJS.

## Why Effect TS Fits Agent Harnessing Better

| Concern | Effect | NestJS | Why It Matters For AI-Driven Development |
|---|---|---|---|
| Type safety of control flow | `Effect<A, E, R>` encodes success, typed errors, and required services | Commonly relies on exceptions and runtime DI resolution | Agents get stronger compile-time feedback and fewer ambiguous runtime failures |
| Dependency wiring | Layers and service tags are explicit values | Decorator metadata + module wiring is often more implicit | Easier to audit, diff, and test dependency boundaries in PRs |
| Error contracts | Typed domain errors are modeled and mapped centrally | Error handling frequently depends on thrown exceptions/filters | Encourages predictable, reviewable error behavior for generated code |
| Testability | Use cases run with lightweight provided layers/mocks | Typical pattern often boots testing modules/containers | Faster tests and smaller fixtures support higher agent iteration velocity |
| Observability consistency | Spans/logs compose directly in effect pipelines | Usually spread across interceptors, filters, and providers | Keeps tracing closer to business logic, reducing drift |

## Concrete Project Alignment

This decision aligns with existing standards in this repo:

1. [`docs/patterns/effect-runtime.md`](../patterns/effect-runtime.md) (layer construction and runtime wiring)
2. [`docs/patterns/error-handling.md`](../patterns/error-handling.md) (typed error protocol mapping)
3. [`docs/testing/use-case-tests.md`](../testing/use-case-tests.md) (typed error assertions and direct use case tests)
4. [`docs/testing/integration-tests.md`](../testing/integration-tests.md) (runtime dependency validation via executed handlers)

## Tradeoffs

Effect is not a universal default. We accept:

1. A steeper learning curve for teams unfamiliar with functional effect systems
2. More up-front type modeling work
3. Smaller hiring pool versus mainstream framework conventions

## Why Not NestJS Here

NestJS is productive for convention-heavy CRUD apps and teams that prefer class/decorator ergonomics.
For this codebase, the priority is reducing agent-authored ambiguity through explicit types, explicit dependencies, and highly testable units, so Effect is the better fit.
