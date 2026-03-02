#!/usr/bin/env bash

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
HOOKS_PATH="$REPO_ROOT/.githooks"

if [[ ! -d "$HOOKS_PATH" ]]; then
  echo "Hooks directory not found: $HOOKS_PATH" >&2
  exit 1
fi

git config core.hooksPath "$HOOKS_PATH"
echo "Installed repo hooks path: $HOOKS_PATH"
