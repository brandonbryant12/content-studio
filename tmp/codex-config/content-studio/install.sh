#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 /absolute/path/to/content-studio [CODEX_HOME]"
  exit 1
fi

REPO_PATH="$1"
CODEX_HOME_PATH="${2:-${CODEX_HOME:-$HOME/.codex}}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATES_DIR="$SCRIPT_DIR/templates"

if [[ "${REPO_PATH:0:1}" != "/" ]]; then
  echo "REPO_PATH must be an absolute path"
  exit 1
fi

mkdir -p "$CODEX_HOME_PATH/automations" "$CODEX_HOME_PATH/rules"

for auto_dir in "$TEMPLATES_DIR"/automations/*; do
  auto_id="$(basename "$auto_dir")"
  target_dir="$CODEX_HOME_PATH/automations/$auto_id"
  mkdir -p "$target_dir"

  sed "s|__CONTENT_STUDIO_PATH__|$REPO_PATH|g" "$auto_dir/automation.toml" > "$target_dir/automation.toml"
  cp "$auto_dir/memory.md" "$target_dir/memory.md"
done

sed "s|__CONTENT_STUDIO_PATH__|$REPO_PATH|g" "$TEMPLATES_DIR/config.content-studio.toml" > "$CODEX_HOME_PATH/config.content-studio.toml"
cp "$TEMPLATES_DIR/rules/default.rules.recommended" "$CODEX_HOME_PATH/rules/default.rules.content-studio"

cat <<MSG
Installed Content Studio Codex automation templates into:
  $CODEX_HOME_PATH/automations/

Generated:
  $CODEX_HOME_PATH/config.content-studio.toml
  $CODEX_HOME_PATH/rules/default.rules.content-studio

Next manual steps:
1. Merge config snippet into $CODEX_HOME_PATH/config.toml
2. Replace or merge rules from $CODEX_HOME_PATH/rules/default.rules.content-studio
3. Restart Codex app so automation changes are reloaded
MSG
