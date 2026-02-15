# Harness Engineering Context

This document is shared context for all debate agents. Read it before your role prompt.

## What We're Doing

We are designing a **harness** — the scaffolding that constrains AI agents (Claude Code, Codex) to produce clean, maintainable, testable code in this repository. The docs directory (`docs/`) IS the harness. Every file in it is a constraint that agents read before writing code.

A well-designed harness means:
- Agents produce consistent architecture without human babysitting
- Code drift is caught by mechanical enforcement (tests, linters, types)
- The harness is optimized for agent legibility — not human prose, but machine-parseable rules
- The harness is the single source of truth for how code should be written

## Harness Engineering Principles (from OpenAI)

1. **Repository knowledge as system of record** — the repo itself (not tribal knowledge) teaches agents how to work. CLAUDE.md / AGENTS.md is the table of contents (~100 lines). Standards are the deep docs it points to.

2. **Application legibility** — code must be legible to FUTURE agent runs, not just humans. Patterns should be self-evident from the code structure. If an agent needs to read a 600-line standard to understand a pattern, the pattern is too complex or the standard is too verbose.

3. **Golden principles** — opinionated, mechanical rules that keep the codebase consistent. These must be enforceable: invariant tests, ESLint rules, TypeScript types, or Effect service constraints. If you can't enforce it, it's not a golden principle — it's a suggestion.

4. **Entropy management** — agents introduce drift over time. The harness must include cleanup processes: periodic audits, invariant tests that catch regression, architectural tests that enforce boundaries.

5. **Context efficiency** — every token in the harness is context window cost, paid on EVERY agent interaction. Reduce (compress), offload (reference real code instead of examples), isolate (don't repeat across standards).

## Non-Negotiable Technology Decisions

These are GIVEN. Do not debate them. Build the harness around them:

| Layer | Technology | Role |
|-------|-----------|------|
| Monorepo | **Turborepo** + pnpm workspaces | Build orchestration, caching |
| Backend runtime | **Effect TS** | Typed errors, services, layers, resource management, structured concurrency |
| HTTP framework | **Hono** | Request handling, middleware |
| API layer | **oRPC** | Contract-first API, type-safe client/server |
| Database | **Drizzle ORM** + PostgreSQL | Schema, queries, migrations |
| Frontend framework | **React 19** | UI rendering |
| Frontend routing | **TanStack Router** | File-based routing, type-safe |
| Frontend data | **TanStack Query** | Server state, caching, mutations |
| Frontend forms | **TanStack Form** | Form state, validation |
| Styling | **Tailwind CSS** + **Radix UI** | Utility CSS, accessible primitives |
| Testing | **Vitest** + **MSW** + **Playwright** | Unit/integration/E2E |
| Job queue | **Custom** (Postgres-backed) | Background job processing |
| Storage | **S3-compatible** (MinIO dev) | File storage |

## What the Harness Must Cover (All Layers Together)

The standards are not independent documents — they are a SYSTEM. Each layer connects to others:

```
┌─────────────────────────────────────────────────────────────┐
│                    HARNESS BOUNDARY                          │
│                                                              │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐               │
│  │ Frontend │───▶│ API/oRPC │───▶│ Use Cases│               │
│  │ React 19 │    │ Contracts│    │ Effect   │               │
│  │ TanStack │◀───│ Handlers │◀───│ Services │               │
│  └──────────┘    └──────────┘    └─────┬────┘               │
│                                        │                     │
│                                  ┌─────▼────┐               │
│                                  │   Repos  │               │
│                                  │  Drizzle │               │
│                                  └─────┬────┘               │
│                                        │                     │
│                        ┌───────────────┼───────────────┐     │
│                        │               │               │     │
│                   ┌────▼───┐    ┌──────▼──┐    ┌──────▼──┐  │
│                   │ Queue  │    │ Storage │    │   AI    │  │
│                   │ Jobs   │    │   S3    │    │ LLM/TTS│  │
│                   └────────┘    └─────────┘    └─────────┘  │
│                                                              │
│  Cross-cutting: Auth, Errors, Observability, Testing         │
└─────────────────────────────────────────────────────────────┘
```

The debate should address the harness as THIS WHOLE SYSTEM, not individual files.

## What a Good Harness Standard Looks Like

Each standard should have:
1. **Mermaid diagram** — the pattern at a glance (architecture, flow, or decision tree)
2. **Golden principles** — 3-5 mechanical rules, each with enforcement annotation
3. **Decision tree** — when to use which variant of the pattern
4. **One canonical example** — reference to a real file, not inline code blocks when possible
5. **Access control** — who can do what within this pattern
6. **Enforcement** — how each rule is tested/linted/type-checked

What it should NOT have:
- Walls of prose explaining obvious things
- Multiple examples showing the same concept
- Anti-pattern sections longer than the pattern section
- Rules that can't be enforced mechanically
- Content duplicated across multiple standards

## Deliverable: docs/ Migration

The debate should propose a `docs/` directory structure that the harness will migrate to. Per OpenAI's harness engineering approach, the repository's knowledge base lives in a structured `docs/` directory treated as the system of record, with short root files (CLAUDE.md, AGENTS.md) serving as table of contents pointing to deeper sources.

Each agent MUST propose:

1. **`docs/` directory structure** — where standards, architecture docs, and design docs live
2. **CLAUDE.md** — ~100 lines, table of contents for Claude Code agents. Points to docs/ for deep context. Contains only the golden principles that should be in EVERY agent's context window.
3. **AGENTS.md** — ~100 lines, table of contents for Codex/other agents. Same golden principles, different tool-specific instructions.

The root instruction files (CLAUDE.md / AGENTS.md) should be SHORT because they're loaded into context on every single agent interaction. Everything else lives in docs/ and is loaded on-demand when relevant.

## Current Docs Inventory (3,059 lines across 25 files)

```
docs/
├── setup.md                     (85 lines)
├── architecture/
│   ├── overview.md              (124 lines)
│   ├── access-control.md        (96 lines)
│   └── observability.md         (96 lines)
├── patterns/
│   ├── api-handler.md           (127 lines)
│   ├── use-case.md              (116 lines)
│   ├── repository.md            (120 lines)
│   ├── effect-runtime.md        (114 lines)
│   ├── error-handling.md        (120 lines)
│   ├── enum-constants.md        (69 lines)
│   ├── job-queue.md             (101 lines)
│   └── safety-primitives.md     (59 lines)
├── testing/
│   ├── overview.md              (71 lines)
│   ├── invariants.md            (48 lines)
│   ├── use-case-tests.md        (122 lines)
│   ├── integration-tests.md     (165 lines)
│   ├── job-workflow-tests.md    (125 lines)
│   └── live-tests.md            (68 lines)
└── frontend/
    ├── components.md            (162 lines)
    ├── data-fetching.md         (98 lines)
    ├── mutations.md             (115 lines)
    ├── forms.md                 (137 lines)
    ├── styling.md               (100 lines)
    ├── error-handling.md        (111 lines)
    ├── project-structure.md     (99 lines)
    ├── real-time.md             (124 lines)
    └── testing.md               (205 lines)
```
