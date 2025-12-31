---
description: Analyze technical debt across all packages using parallel sub-agents
allowed-tools: Bash, Read, Glob, Grep, Task, AskUserQuestion
argument-hint: "[package-name] or 'all'"
---

# Tech Debt Analyzer

Analyze technical debt in Effect-TS packages against best practices and clean architecture principles.

## Usage

- `/tech-debt` or `/tech-debt all` - Analyze all packages in parallel
- `/tech-debt @repo/invite` - Analyze a specific package

## Instructions

ultrathink

### Step 1: Determine Scope

If no argument or "all" specified, analyze these packages in parallel:
- packages/db
- packages/invite
- packages/competition
- packages/card
- packages/api
- packages/auth

If a specific package is provided, analyze only that package.

### Step 2: Spawn Parallel Agents

For each package, spawn a Task agent with subagent_type='general-purpose' to analyze it.
Launch ALL agents in a SINGLE message for true parallelism.

Each agent should receive this prompt (customize PACKAGE_NAME and PACKAGE_PATH):

```
Analyze technical debt for PACKAGE_NAME at PACKAGE_PATH.

## Scoring Criteria (1-5 scale)

### 1. Architecture and Layering (20%)
- Use Cases: Business logic lives here, not in controllers or repos
- Repos: Pure data access layer - no business logic, just CRUD returning Effects
- Controllers/Routers: Thin orchestration only
- Services: Stateless, injectable via Context.Tag

### 2. Error Handling (20%)
- All errors use Data.TaggedError with discriminated unions
- Error channels are fully typed (never unknown error type)
- Effect.catchTags used for granular error recovery
- No untyped throw or Promise.reject

### 3. Dependency Injection (20%)
- Services use Context.GenericTag properly
- Layers are composable (Layer.provide, Layer.merge)
- No implicit dependencies or globals
- Test doubles can be substituted via Layers

### 4. Effect Idioms and Type Safety (20%)
- Effect.gen with generator functions preferred
- Effect.promise wraps all async code
- Proper use of Effect.succeed, Effect.fail, Effect.sync
- Schema validation at system boundaries
- No unsafe type casts or any types

### 5. Testing Quality (20%)
- Uses @effect/vitest with it.effect()
- Tests provide Layers via Effect.provide(TestLayer)
- Error paths tested explicitly
- Behavior assertions are declarative

## Output Format

Return a JSON object with this structure:
{
  "package": "PACKAGE_NAME",
  "overall_score": 4.2,
  "scores": {
    "architecture": { "score": 4, "issues": ["issue1", "issue2"] },
    "error_handling": { "score": 5, "issues": [] },
    "dependency_injection": { "score": 4, "issues": ["issue1"] },
    "effect_idioms": { "score": 4, "issues": ["issue1"] },
    "testing": { "score": 4, "issues": ["issue1"] }
  },
  "critical_issues": ["Most important issues to fix"],
  "recommendations": ["Top 3 actionable recommendations"]
}

Read ALL .ts files in the package's src/ directory to perform the analysis.
```

### Step 3: Collect and Display Results

After all agents complete, consolidate results and display a summary table:

```
╔══════════════════════════════════════════════════════════════════════════╗
║                        TECH DEBT ANALYSIS SUMMARY                         ║
╠══════════════════════════════════════════════════════════════════════════╣
║ Package          │ Arch │ Errors │ DI   │ Effect │ Tests │ Overall       ║
╠══════════════════════════════════════════════════════════════════════════╣
║ @repo/db         │ 4/5  │ 3/5    │ 4/5  │ 3/5    │ 2/5   │ 3.2/5        ║
║ @repo/invite     │ 5/5  │ 5/5    │ 5/5  │ 5/5    │ 5/5   │ 5.0/5 ⭐     ║
║ ...              │      │        │      │        │       │              ║
╚══════════════════════════════════════════════════════════════════════════╝
```

Then for each package, display:

```
## @repo/package-name (X.X/5)

### Critical Issues
- Issue 1
- Issue 2

### Recommendations
1. Recommendation 1
2. Recommendation 2
3. Recommendation 3

### Category Breakdown
- Architecture: X/5 - [issues if any]
- Error Handling: X/5 - [issues if any]
- Dependency Injection: X/5 - [issues if any]
- Effect Idioms: X/5 - [issues if any]
- Testing: X/5 - [issues if any]
```

### Step 4: Cross-Cutting Analysis

After individual package analysis, identify:
1. Patterns that vary across packages (should be standardized)
2. Common issues appearing in multiple packages
3. Packages that could serve as reference implementations

Output these as a final "Cross-Cutting Concerns" section.
