#!/usr/bin/env bash

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: automations/run-operation-wrapper.sh <operation-id>" >&2
  exit 1
fi

OPERATION_ID="$1"
REPO_ROOT="$(git rev-parse --show-toplevel)"

is_advisory_operation() {
  case "$1" in
    issue-evaluator|best-practice-researcher|software-factory-researcher|product-vision-researcher|product-owner-reviewer)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

if is_advisory_operation "$OPERATION_ID"; then
  echo "[automation-wrapper] advisory profile for $OPERATION_ID: skip workspace-clean/install/doctor; run memory preflight bootstrap only." >&2
  zsh -lic "cd \"$REPO_ROOT\" && pnpm workflow-memory:preflight --bootstrap"
else
  "$REPO_ROOT/scripts/git/check-workspace-clean.sh" --context automation-wrapper
  zsh -lic "cd \"$REPO_ROOT\" && pnpm install --frozen-lockfile --prefer-offline"
  zsh -lic "cd \"$REPO_ROOT\" && pnpm workflow-memory:preflight"

  if ! zsh -lic "cd \"$REPO_ROOT\" && pnpm software-factory doctor"; then
    DOCTOR_EXIT=$?
    echo "[automation-wrapper] warning: pnpm software-factory doctor exited with code $DOCTOR_EXIT; continuing." >&2
  fi
fi

zsh -lic "cd \"$REPO_ROOT\" && pnpm software-factory operation run \"$OPERATION_ID\""
