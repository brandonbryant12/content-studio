# Codex App Automations (Version-Control Mirror)

This directory stores version-controlled copies of Codex App automation configs.

Runtime source of truth remains local:
- `~/.codex/automations/*/automation.toml`

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

Pull local runtime config into repo mirror:

```bash
cp ~/.codex/automations/architecture-radar/automation.toml automations/codex-app/architecture-radar/automation.toml
cp ~/.codex/automations/architecture-approval-executor/automation.toml automations/codex-app/architecture-approval-executor/automation.toml
cp ~/.codex/automations/harness-research-radar/automation.toml automations/codex-app/harness-research-radar/automation.toml
cp ~/.codex/automations/self-improvement-judge-executor/automation.toml automations/codex-app/self-improvement-judge-executor/automation.toml
cp ~/.codex/automations/quality-sentinel/automation.toml automations/codex-app/quality-sentinel/automation.toml
```

Push repo mirror updates to local runtime config:

```bash
cp automations/codex-app/architecture-radar/automation.toml ~/.codex/automations/architecture-radar/automation.toml
cp automations/codex-app/architecture-approval-executor/automation.toml ~/.codex/automations/architecture-approval-executor/automation.toml
cp automations/codex-app/harness-research-radar/automation.toml ~/.codex/automations/harness-research-radar/automation.toml
cp automations/codex-app/self-improvement-judge-executor/automation.toml ~/.codex/automations/self-improvement-judge-executor/automation.toml
cp automations/codex-app/quality-sentinel/automation.toml ~/.codex/automations/quality-sentinel/automation.toml
```
