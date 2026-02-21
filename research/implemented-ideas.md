# Implemented Research Ideas Log

Record each shipped change that adopts an idea from an external paper.

## Entry Template

### YYYY-MM-DD - Short Title
- Issue: <github issue url or #number>
- PR: <github pr url or #number>
- Paper link(s):
  - <url 1>
  - <url 2>
- Adopted idea(s):
  - <idea used from paper>
- Implementation summary:
  - <what changed in this repo>
- Code references:
  - `<path/to/file>`
  - `<path/to/file>`

## Entries

<!-- Add new entries at the top of this section -->
### 2026-02-21 - Workflow Memory Scoring + Retrieval Helper
- Issue: https://github.com/brandonbryant12/content-studio/issues/41
- PR: https://github.com/brandonbryant12/content-studio/pull/50
- Paper link(s):
  - https://arxiv.org/abs/2304.03442
- Adopted idea(s):
  - Prioritize memory retrieval using recency + importance weighting.
- Implementation summary:
  - Added optional scoring fields to workflow memory events/index and a retrieval helper that ranks by weighted score.
- Code references:
  - `docs/workflow-memory/README.md`
  - `scripts/workflow-memory/add-entry.mjs`
  - `scripts/workflow-memory/retrieve.mjs`
