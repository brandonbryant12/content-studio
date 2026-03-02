#!/usr/bin/env bash

set -euo pipefail

if [[ "${SKIP_WORKSPACE_CLEAN_CHECK:-0}" == "1" ]]; then
  echo "[workspace-clean] skipped (SKIP_WORKSPACE_CLEAN_CHECK=1)."
  exit 0
fi

CONTEXT="manual"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --context)
      CONTEXT="$2"
      shift 2
      ;;
    -h|--help)
      cat <<'USAGE'
Usage: scripts/git/check-workspace-clean.sh [--context <name>]

Fails if the current worktree or any nested .codex-worktrees child worktree has tracked changes.
Set SKIP_WORKSPACE_CLEAN_CHECK=1 to bypass once.
USAGE
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

REPO_ROOT="$(git rev-parse --show-toplevel)"
PATHS_FILE="$(mktemp)"
REPORT_FILE="$(mktemp)"
trap 'rm -f "$PATHS_FILE" "$REPORT_FILE"' EXIT

{
  printf '%s\n' "$REPO_ROOT"
  if [[ -d "$REPO_ROOT/.codex-worktrees" ]]; then
    find "$REPO_ROOT/.codex-worktrees" -mindepth 1 -maxdepth 6 \
      \( -type d -name .git -o -type f -name .git \) -print 2>/dev/null | sed 's#/.git$##'
  fi
} | sort -u > "$PATHS_FILE"

DIRTY_COUNT=0

while IFS= read -r WORKTREE_PATH; do
  [[ -z "$WORKTREE_PATH" ]] && continue

  if ! git -C "$WORKTREE_PATH" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    continue
  fi

  STATUS_OUTPUT="$(git -C "$WORKTREE_PATH" status --porcelain --untracked-files=no)"
  if [[ -n "$STATUS_OUTPUT" ]]; then
    DIRTY_COUNT=$((DIRTY_COUNT + 1))
    {
      echo "worktree: $WORKTREE_PATH"
      echo "$STATUS_OUTPUT"
      echo
    } >> "$REPORT_FILE"
  fi
done < "$PATHS_FILE"

if [[ "$DIRTY_COUNT" -gt 0 ]]; then
  echo "[workspace-clean] failed (${CONTEXT}): tracked changes detected in ${DIRTY_COUNT} worktree(s)." >&2
  cat "$REPORT_FILE" >&2
  echo "Remediation: commit/stash/discard those changes, then retry. Use SKIP_WORKSPACE_CLEAN_CHECK=1 to bypass once." >&2
  exit 1
fi

echo "[workspace-clean] passed (${CONTEXT})."
