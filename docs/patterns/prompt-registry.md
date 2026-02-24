# Prompt Registry Pattern

## Why This Exists

Prompt text is product logic. It can change behavior, safety posture, and legal/compliance risk.

For Content Studio, prompts must be:

1. Version-controlled
2. Structured with metadata
3. Discoverable from a single registry
4. Reviewed as code changes

## Canonical Location

```text
packages/ai/src/prompt-registry/
  types.ts
  render.ts
  registry.ts
  prompts/
    <prompt-id>.ts   # exactly one prompt definition per file
```

Do not define production prompt literals directly inside use-cases.

## Required Prompt Definition Shape

Every prompt file must export a `definePrompt(...)` object with:

- `id`: stable dotted ID (`domain.feature.role`)
- `version`: integer, increment when behavior changes
- `owner`: accountable team
- `domain`: product domain (`chat`, `podcast`, `voiceover`, etc.)
- `role`: `system` or `user`
- `modelType`: `llm` or `image-gen`
- `riskTier`: `low` | `medium` | `high`
- `status`: `active` or `deprecated`
- `summary`: short functional intent
- `compliance`: review status, user-content classification, prohibited data, retention, notes
- `render(input)`: prompt rendering function

## Compliance Metadata Rules

For legal/compliance traceability, each prompt definition must include:

- `compliance.reviewStatus` (`pending` or `approved`)
- `compliance.userContent` (`none`, `optional`, `required`)
- `compliance.prohibitedData` (non-empty list)
- `compliance.retention` (`transient` or `resource-bound`)
- `compliance.notes` (why risk classification/handling is appropriate)

If a prompt handles user-authored or persisted text, use `riskTier: high` unless there is a documented exception.

## Usage Pattern

Use prompt definitions from the registry with `renderPrompt(...)`:

```ts
import { renderPrompt, podcastScriptSystemPrompt } from '@repo/ai/prompt-registry';

const system = renderPrompt(podcastScriptSystemPrompt, context);
```

Allowed:

- Prompt-specific helper logic colocated in that prompt file
- Wrapper functions in domain modules for compatibility

Disallowed:

- New inline production prompt literals in use-cases/services
- Prompt IDs reused for different semantics

## Change Management

When changing a prompt:

1. Edit the single prompt file
2. Increment `version`
3. Update `summary`/`compliance.notes` if behavior or risk changed
4. Add or adjust tests for impacted behavior

When replacing a prompt semantically, keep the old one as `deprecated` until all callers are migrated.

## Test Guardrail

`packages/ai/src/prompt-registry/__tests__/registry.test.ts` enforces:

- unique prompt IDs
- baseline metadata completeness
- non-empty rendered output for every registered prompt

Any new prompt must be added to `registry.ts` and covered by this test.
