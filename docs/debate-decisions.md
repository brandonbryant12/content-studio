# Standards Debate Decisions

This file captures the outcomes adopted from `scripts/standards-debate/workspace/synthesis.md`.

## Resolved Decisions (Adopted)

1. Frontend docs were aggressively compressed.
2. Real-time guidance was rewritten around oRPC iterators (not raw EventSource patterns).
3. `router-handler` and `serialization` guidance was merged into `docs/patterns/api-handler.md`.
4. `suspense` guidance was folded into `docs/frontend/components.md`.
5. Testing docs remained split by test type, with shared guidance in `docs/testing/overview.md`.
6. Error typing guidance was unified:
   - infer Effect error types in implementation
   - export derived aliases for tests/consumers
7. Architecture docs were added:
   - `docs/architecture/overview.md`
   - `docs/architecture/access-control.md`
   - `docs/architecture/observability.md`

## Key Non-Doc Follow-Ups (Not Applied Here)

1. Add proposed invariant tests to raise mechanical enforcement coverage.
2. Make handler span requirements compile-time enforced where possible.
3. Evaluate repository boilerplate reduction (`createCrudRepo` or codegen).
4. Evaluate serializer location boundaries if API/persistence coupling remains high.

## Open Product/Architecture Choices

1. Whether to keep any legacy standards artifacts temporarily or remove them immediately.
2. How strict to be on enforcing import boundaries via lint vs invariant tests vs runtime checks.
