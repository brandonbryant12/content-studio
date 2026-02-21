# Automation Playbooks

This folder is the source of truth for automation lane behavior.

Rules:
- Each lane has one playbook file named by lane id.
- `automations/codex-app/*/automation.toml` prompts must only load and execute the matching playbook.
- If wrapper TOML text and playbook instructions conflict, the playbook wins.
- Sync wrapper TOMLs to runtime with commands in `automations/codex-app/README.md`.
