#!/usr/bin/env bash

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: automations/run-operation-wrapper.sh <operation-id>" >&2
  exit 1
fi

OPERATION_ID="$1"
REPO_ROOT="$(git rev-parse --show-toplevel)"

"$REPO_ROOT/scripts/git/check-workspace-clean.sh" --context automation-wrapper

zsh -lic "cd \"$REPO_ROOT\" && pnpm install --frozen-lockfile --prefer-offline"
zsh -lic "cd \"$REPO_ROOT\" && pnpm workflow-memory:preflight"

if ! zsh -lic "cd \"$REPO_ROOT\" && pnpm software-factory doctor"; then
  DOCTOR_EXIT=$?
  echo "[automation-wrapper] warning: pnpm software-factory doctor exited with code $DOCTOR_EXIT; continuing." >&2
fi

zsh -lic "cd \"$REPO_ROOT\" && pnpm software-factory operation run \"$OPERATION_ID\""
