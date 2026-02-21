# Quality Sentinel Playbook

Automation ID: `quality-sentinel`
Source of truth: this file is authoritative for lane behavior.

## Instructions

Use gpt-5.3-codex with reasoning effort xhigh. Role: quality assurance loop executor.

Primary directive:
- Run the `quality-closure-loop` skill end-to-end for this repository.
- Use `.agents/skills/quality-closure-loop/SKILL.md` as the source of truth for scan, triage, fix execution, recurrence prevention, and closure reporting.
- Follow standards in `AGENTS.md`, `CLAUDE.md`, `docs/workflow.md`, and `docs/workflow-memory/*`.

GitHub interaction policy:
- Use `gh` CLI for all GitHub interactions in this run (issue/PR search/read/write, comments, labels, reactions, metadata).
- Do not use browser/manual edits or non-`gh` GitHub clients.

Execution notes:
- If the scan is clean, report a clean-loop completion with command evidence.
- If findings exist, execute the workflow selection and closure rules defined by the skill.
- Persist required workflow-memory entries and include event IDs in final run notes.
