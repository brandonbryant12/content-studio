# Content Studio Codex Config Export

This folder is a portable export of Codex settings relevant to the Content Studio repository.

## Contents

- `templates/config.content-studio.toml`: model + reasoning + project trust snippet
- `templates/rules/default.rules.current`: exact current rules snapshot from source machine
- `templates/rules/default.rules.recommended`: recommended rules for automation workflows (includes `gh issue`/`gh pr`)
- `templates/automations/*`: exported automations and memory files with `__CONTENT_STUDIO_PATH__` placeholder
- `install.sh`: installs templates into a target `~/.codex` without overwriting global config automatically

## Install On New Machine

```bash
cd /path/to/content-studio/tmp/codex-config/content-studio
./install.sh /absolute/path/to/content-studio
```

## After Install

1. Merge `~/.codex/config.content-studio.toml` into `~/.codex/config.toml`
2. Merge or replace `~/.codex/rules/default.rules` with `~/.codex/rules/default.rules.content-studio`
3. Restart Codex app
4. Verify automations are visible and active in the app

## Notes

- This export intentionally excludes auth tokens and secret files (`auth.json`, history, sqlite DB, etc.).
- Automation memory files are included so workflow context carries over.
