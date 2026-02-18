---
name: content-studio-feature-delivery
description: End-to-end feature delivery workflow for Content Studio. Use when implementing or refactoring a feature from request to merge, including planning, coding, tests, docs updates, and compounding learnings.
---

# Content Studio Feature Delivery

Use this skill for the happy path of shipping features with the repo's docs-first standards.

## Core Loop

Run this sequence every time:

1. Plan
2. Work
3. Review
4. Compound

This is the default loop inspired by compound engineering practices.

## 1) Plan

- Read only the docs needed for the change (`docs/**/*.md`).
- Convert the request into 1-3 vertical slices with user-visible outcomes.
- For frontend slices, define a short design brief before coding:
  - visual direction (typography, palette, spacing, motion)
  - key states (loading, empty, error, success)
  - accessibility expectations (keyboard/focus/contrast)
- Define test intent before coding:
  - use case/integration tests for backend behavior
  - frontend RTL tests for stateful UI
  - workflow/invariant tests when jobs or guardrails are touched

## 2) Work

- Implement one vertical slice at a time.
- Keep contracts and boundaries explicit:
  - API and domain behavior typed at boundaries
  - no hardcoded query keys
  - authorization before mutating existing resources
  - sanitize user-editable structured fields before persistence
- Apply composition-first React APIs:
  - avoid boolean-prop proliferation for behavior toggles
  - prefer compound components/context and explicit variants
  - lift state into shared providers when siblings must coordinate
- Apply React performance guardrails:
  - eliminate waterfalls (parallelize independent async work)
  - keep derived state in render, not in effects
  - use transitions for non-urgent updates
  - avoid accidental bundle growth from broad imports

## 3) Review

- Verify with the smallest meaningful command set first, then widen:
  - targeted package tests
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm test:invariants` for backend changes
- Confirm docs and guardrails match behavior.
- Ensure no redundant tests remain for compile-time guarantees.
- For frontend slices, confirm:
  - design intent is visible in implementation (not generic UI)
  - accessibility baseline holds (keyboard/focus/semantic labeling)
  - component APIs remain composable and scalable

## 4) Compound

After each merged change, capture:

- what worked
- what failed or slowed the cycle
- which guardrail should be added (test, lint rule, docs rule, skill update)
- which repeated step should move into a script or skill reference

Record one structured memory event in `docs/workflow-memory/events/YYYY-MM.jsonl` with `workflow: "Feature Delivery"` (prefer `node scripts/workflow-memory/add-entry.mjs`).

Feed these learnings into `content-studio-self-improvement` and update skills/docs.

## Output Contract

When this skill is used, produce:

1. Short plan with vertical slices
2. Code + tests + docs updates
3. Validation summary
4. Compound notes (2-6 bullets)
5. Memory note entry summary (what was appended to `docs/workflow-memory/events/YYYY-MM.jsonl`)
