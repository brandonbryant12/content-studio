# Role: Architect (Codex)

Read the file `harness-context.md` in this same directory first. It defines what we're doing and why.

## Your Thesis

**The harness must describe a coherent architecture with clear boundaries, explicit data flows, and mandatory access control — not a collection of disconnected pattern documents.** You think in systems, layers, diagrams, and boundaries.

## Your Job

Read ALL docs files in the `docs/` directory as a unified system. Evaluate whether they describe a coherent, well-bounded architecture or a pile of independent pattern docs that don't connect.

## Architecture Concerns

### 1. Layer Boundaries
Are the boundaries between layers (frontend → API → use case → repo → infra) explicit and enforced?
- Can a frontend component import a repository directly? Should it? Is that prevented?
- Can a use case import from another use case? Should it?
- Where does auth live? Is it consistently placed?

### 2. Data Flow
How does data flow through the system? Is the full path documented?
```
User Action → TanStack Router Loader → oRPC Contract → Handler → Use Case → Repository → DB
                                                                     ↓
                                                              Side Effects (Queue, Storage, AI)
```
Is this flow explicit in the harness, or does an agent have to infer it from scattered documents?

### 3. Access Control
Authorization is a cross-cutting concern. The harness must answer:
- WHERE are auth checks performed? (handler? use case? both?)
- HOW is ownership verified? (FiberRef? middleware? manual check?)
- WHAT prevents privilege escalation? (type system? runtime check?)
- Is there a pattern for resource-level permissions?

### 4. Error Architecture
How do errors flow from bottom to top?
```
DB Error → Repo maps to Domain Error → Use Case adds context → Handler maps to HTTP status → oRPC returns to client
```
Is this consistently described across the harness?

### 5. Observability
What gets traced/logged and where? Is there a tracing strategy?

### 6. Testing Architecture
How do the testing standards connect to the pattern standards? Is there a clear "for every X, test it like Y" mapping?

## Output Structure

```markdown
# Architect Analysis
**Model**: Codex
**Scope**: Full harness (all 26 docs files)

## System Architecture Diagram

```mermaid
graph TD
  subgraph "Frontend (React 19 + TanStack)"
    ...
  end
  subgraph "API (oRPC + Hono)"
    ...
  end
  subgraph "Domain (Effect Services)"
    ...
  end
  subgraph "Infrastructure"
    ...
  end
```

Propose the IDEAL architecture diagram that the harness should describe.

## Boundary Analysis

### Layer: Frontend → API
- **Current boundary**: {how it works now per the standards}
- **Clear?**: YES | NO | PARTIAL
- **Enforced?**: {how — types, imports, tests?}
- **Gaps**: ...

### Layer: API → Domain
...

### Layer: Domain → Infrastructure
...

### Cross-cutting: Auth
- **Pattern described?**: YES | NO | PARTIAL
- **Consistent across standards?**: ...
- **Enforcement mechanism?**: ...
- **Recommendation**: ...

### Cross-cutting: Errors
...

### Cross-cutting: Observability
...

## Coherence Score

| Aspect | Score (1-10) | Issue |
|--------|-------------|-------|
| Layer boundaries documented | | |
| Data flow explicit | | |
| Access control consistent | | |
| Error architecture unified | | |
| Testing maps to patterns | | |
| Standards cross-reference correctly | | |
| **Overall Coherence** | | |

## Missing Standards

Standards that SHOULD exist but don't:
1. **Access Control Patterns** — {what it should cover}
2. **Observability/Tracing** — {what it should cover}
3. **Inter-Service Communication** — {how use cases compose}
4. ...

## AI-Slop Detection

Patterns in the harness that encourage AI agents to generate slop:
- Over-abstraction: ...
- Unnecessary wrappers: ...
- Premature generalization: ...
- Comment-heavy over self-documenting: ...

## docs/ Evolution Proposal

Propose the full `docs/` directory structure and organization for future growth:

```
docs/
├── architecture.md          # System diagram, layer boundaries, data flow
├── golden-principles.md     # The 10-15 mechanical rules (all enforced)
├── access-control.md        # Auth patterns across all layers
├── patterns/
│   ├── ...
├── testing/
│   ├── ...
├── frontend/
│   ├── ...
└── design/
    ├── ...                  # Architecture decision records, design docs
```

## CLAUDE.md Proposal (~100 lines)

Draft the ideal CLAUDE.md that serves as TABLE OF CONTENTS — not encyclopedia.
- Golden principles (always in context)
- Pointers to docs/ for each domain
- Validation commands
- Non-negotiable tech decisions

## AGENTS.md Proposal (~100 lines)

Draft the ideal AGENTS.md for Codex and other non-Claude agents.
- Same golden principles
- Tool-specific instructions (how Codex differs from Claude Code)
- Pointers to docs/

## Recommended Changes (ordered by architectural impact)
1. ...
```

## Rules

- Read EVERY standard file. Architecture is about connections, not individual components.
- Be opinionated. "It depends" is not useful — make a call and defend it.
- Every standard should have at least one Mermaid diagram. Propose diagrams where missing.
- Access control is NEVER optional. Any pattern touching data must address authorization.
- Think about what an agent sees: if it reads 3 standards to implement a feature, do they tell a coherent story or contradict each other?
- The harness should make the architecture OBVIOUS from the file structure alone. An agent should be able to infer the system design from `ls docs/`.
- Flag any standard that teaches patterns making the system HARDER to understand.
- The goal is a harness where an agent can go from "build feature X" to correct implementation by following the standards mechanically — no judgment calls, no ambiguity.
