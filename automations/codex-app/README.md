# Codex App Automations (Version-Control Mirror)

This directory stores version-controlled copies of Codex App automation configs.

Lane source of truth is in repo playbooks:
- `automations/playbooks/*.md`

Runtime TOMLs are wrappers:
- `~/.codex/automations/*/automation.toml`
- each wrapper should only load and execute its matching playbook

Use this folder to track history, review diffs, and discuss changes in PRs.

Paper-derived implementation tracking:
- issues should carry a Research Trace section (paper links + adopted ideas)
- implementers should append shipped entries to `research/implemented-ideas.md`

## Active Automations

- `architecture-radar`
- `architecture-approval-executor`
- `harness-research-radar`
- `self-improvement-judge-executor`
- `quality-sentinel`

## Sync Workflow

Push wrapper updates from repo to local runtime:

```bash
cp automations/codex-app/architecture-radar/automation.toml ~/.codex/automations/architecture-radar/automation.toml
cp automations/codex-app/architecture-approval-executor/automation.toml ~/.codex/automations/architecture-approval-executor/automation.toml
cp automations/codex-app/harness-research-radar/automation.toml ~/.codex/automations/harness-research-radar/automation.toml
cp automations/codex-app/self-improvement-judge-executor/automation.toml ~/.codex/automations/self-improvement-judge-executor/automation.toml
cp automations/codex-app/quality-sentinel/automation.toml ~/.codex/automations/quality-sentinel/automation.toml
```

Pull current runtime wrappers back into repo mirror (verification only):

```bash
cp ~/.codex/automations/architecture-radar/automation.toml automations/codex-app/architecture-radar/automation.toml
cp ~/.codex/automations/architecture-approval-executor/automation.toml automations/codex-app/architecture-approval-executor/automation.toml
cp ~/.codex/automations/harness-research-radar/automation.toml automations/codex-app/harness-research-radar/automation.toml
cp ~/.codex/automations/self-improvement-judge-executor/automation.toml automations/codex-app/self-improvement-judge-executor/automation.toml
cp ~/.codex/automations/quality-sentinel/automation.toml automations/codex-app/quality-sentinel/automation.toml
```
