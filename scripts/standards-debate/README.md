# Standards Harness Debate

A multi-agent adversarial review system that treats the `docs/` directory as a unified **harness** — the scaffolding that constrains AI agents (Claude Code + Codex) to produce clean, maintainable, testable code.

Based on [Harness Engineering](https://openai.com/index/harness-engineering/) — OpenAI's approach to building codebases where AI agents are the primary authors.

## Philosophy

- **The docs are a harness** — they constrain agent behavior, not just document patterns
- **Debate ideals, not current code** — evaluate what SHOULD be, not what IS
- **Equal model representation** — 2 Claude + 2 Codex, no model gets outvoted
- **Every rule must be enforceable** — invariant test, ESLint, types, or delete it
- **Token efficiency** — the harness is context window cost, paid on every agent interaction
- **Holistic review** — all layers together, not file-by-file

## Non-Negotiable Technology

Turborepo, Effect TS, Hono, oRPC, Drizzle, React 19, TanStack Router/Query/Form, Tailwind, Radix UI, Vitest, MSW, Playwright.

## Agent Roster (2 + 2)

| Agent | Model | Thesis |
|-------|-------|--------|
| **Enforcer** | Claude | "If you can't test it, delete it" |
| **Effect Advocate** | Claude | "Make violations type errors, not prose rules" |
| **Reductionist** | Codex | "Every line is context window tax" |
| **Architect** | Codex | "Where's the diagram? Where's the auth?" |

## How to Run

```bash
# Step 1: Run the debate (all 4 agents review the ENTIRE docs directory)
./scripts/standards-debate/orchestrate.sh --parallel debate

# Step 2: Check status
./scripts/standards-debate/orchestrate.sh status

# Step 3: Synthesize findings into improved harness
./scripts/standards-debate/orchestrate.sh synthesize

# Step 4: Review outputs
cat scripts/standards-debate/workspace/synthesis.md          # Debate findings
ls  scripts/standards-debate/workspace/improved/             # Rewritten docs

# Step 5: If approved, sync docs
cp -r scripts/standards-debate/workspace/improved/* docs/
```

## Debate Flow

```
                    Round 1: Independent Analysis
    ┌─────────────────────────────────────────────────────┐
    │                                                     │
    │   CLAUDE                          CODEX             │
    │   ┌────────────┐                  ┌──────────────┐  │
    │   │ Enforcer   │                  │ Reductionist │  │
    │   │ "Test it   │                  │ "Delete it   │  │
    │   │  or cut it"│                  │  or compress" │  │
    │   └────────────┘                  └──────────────┘  │
    │   ┌────────────┐                  ┌──────────────┐  │
    │   │ Effect     │                  │ Architect    │  │
    │   │ "Type-level│                  │ "Diagrams,   │  │
    │   │  enforce"  │                  │  auth, flow" │  │
    │   └────────────┘                  └──────────────┘  │
    │                                                     │
    │   Each reads ALL 26 docs files holistically          │
    │   Each writes one comprehensive analysis             │
    └─────────────────────┬───────────────────────────────┘
                          │
              Round 2: Rebuttal (--rounds 2)
    ┌─────────────────────┴───────────────────────────────┐
    │                                                     │
    │   Each agent reads the other 3 agents' analyses     │
    │   Responds to specific arguments                     │
    │   Rebuts, concedes, or builds upon                   │
    │   Claude gives Codex equal weight and vice versa     │
    │                                                     │
    └─────────────────────┬───────────────────────────────┘
                          │
                    Synthesis
    ┌─────────────────────┴───────────────────────────────┐
    │                                                     │
    │   Reads all debate analyses                          │
    │   Resolves contested points with voting rules:       │
    │   - 4/4 agree → auto-apply                          │
    │   - 3/4 agree (cross-model) → auto-apply            │
    │   - 2 Claude vs 2 Codex → flag for human            │
    │                                                     │
    │   Produces:                                          │
    │   - synthesis.md (findings report)                   │
    │   - improved/ (rewritten docs)                       │
    │   - Proposed CLAUDE.md (~100 lines)                  │
    │   - Proposed AGENTS.md (~100 lines)                  │
    │   - Proposed docs/ structure                         │
    │                                                     │
    └─────────────────────┬───────────────────────────────┘
                          │
                    Human Review
    ┌─────────────────────┴───────────────────────────────┐
    │                                                     │
    │   You review synthesis.md                            │
    │   Approve, reject parts, or request another round    │
    │   Apply approved changes to docs/               │
    │                                                     │
    └─────────────────────────────────────────────────────┘
```

## Output Structure

```
scripts/standards-debate/workspace/
  round-1/
    enforcer-analysis.md        ← Claude: enforcement gaps, invariant tests
    effect-advocate-analysis.md ← Claude: Effect type-level opportunities
    reductionist-analysis.md    ← Codex: compression, deletion, token budget
    architect-analysis.md       ← Codex: diagrams, boundaries, access control
  round-2/                      ← (if --rounds 2) rebuttals
    ...
  synthesis.md                  ← Merged findings, contested points resolved
  improved/                     ← Rewritten docs (mirror original structure)
    patterns/
      use-case.md
      ...
    frontend/
      ...
    architecture.md             ← NEW (if debate identifies as missing)
    access-control.md           ← NEW (if debate identifies as missing)
```

## Each Agent Produces

Every agent reviews the ENTIRE harness and proposes:

1. **Per-doc analysis** — what to keep, cut, compress, rewrite
2. **Cross-cutting concerns** — auth, errors, observability across all layers
3. **docs/ structure** — where architecture and implementation docs should live
4. **CLAUDE.md draft** — ~100 lines, golden principles for Claude Code
5. **AGENTS.md draft** — ~100 lines, golden principles for Codex
6. **Enforcement plan** — how each rule gets tested/linted/type-checked

## Options

```bash
--parallel       # Run all 4 agents simultaneously (faster)
--rounds <n>     # Multi-round debate with rebuttals (default: 1, max: 3)
--claude-only    # Only Claude perspectives (enforcer + effect-advocate)
--codex-only     # Only Codex perspectives (reductionist + architect)
--dry-run        # Show what would run without executing
```

## Prerequisites

- `claude` CLI (with `--dangerously-skip-permissions`)
- `codex` CLI (with `--full-auto`)
- Both tools must have access to the project directory
