#!/usr/bin/env bash
# ready-for-dev-loop.sh — Continuously runs the ready-for-dev executor
# until no open issues with the `ready-for-dev` label remain.
#
# Usage: ./software-factory/scripts/ready-for-dev-loop.sh [--max-runs N] [--cooldown SECS]
#
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

# ── defaults ────────────────────────────────────────────────────────
MAX_RUNS="${MAX_RUNS:-50}"
COOLDOWN_SECS="${COOLDOWN_SECS:-10}"

# ── arg parsing ─────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --max-runs)  MAX_RUNS="$2"; shift 2 ;;
    --cooldown)  COOLDOWN_SECS="$2"; shift 2 ;;
    -h|--help)
      echo "Usage: $0 [--max-runs N] [--cooldown SECS]"
      echo "  --max-runs   Safety cap on total runs (default: 50)"
      echo "  --cooldown   Seconds to wait between runs (default: 10)"
      exit 0
      ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

# ── signal handling ─────────────────────────────────────────────────
STOP=0
trap 'echo ""; echo "Caught interrupt. Stopping after current run."; STOP=1' INT TERM

# ── helpers ─────────────────────────────────────────────────────────
count_ready_issues() {
  gh issue list --label "ready-for-dev" --state open --limit 1 --json number -q 'length' 2>/dev/null || echo "0"
}

log() {
  echo "[ready-for-dev] $(date '+%H:%M:%S') $*"
}

# ── main loop ───────────────────────────────────────────────────────
RUN=0

log "Starting ready-for-dev executor loop (max-runs=$MAX_RUNS, cooldown=${COOLDOWN_SECS}s)"

while true; do
  if [[ "$STOP" -eq 1 ]]; then
    log "Stopped by user signal."
    break
  fi

  if [[ "$RUN" -ge "$MAX_RUNS" ]]; then
    log "Reached max-runs cap ($MAX_RUNS). Stopping."
    break
  fi

  # Pull latest main so the next run starts fresh
  git fetch origin main --quiet 2>/dev/null || true

  REMAINING=$(count_ready_issues)
  if [[ "$REMAINING" -eq 0 ]]; then
    log "No open ready-for-dev issues remaining. Done!"
    break
  fi

  RUN=$((RUN + 1))
  log "=== Run $RUN (≥$REMAINING issues remaining) ==="

  pnpm software-factory trigger fire ready-for-dev-executor \
  || {
    EXIT_CODE=$?
    log "software-factory trigger fire failed with code $EXIT_CODE"
    # Non-zero exit is not fatal to the loop.
    # Continue to the next iteration which will re-check issues.
  }

  if [[ "$STOP" -eq 1 ]]; then
    log "Stopped by user signal after run $RUN."
    break
  fi

  log "Run $RUN complete. Cooling down for ${COOLDOWN_SECS}s..."
  sleep "$COOLDOWN_SECS"
done

log "Executor loop finished after $RUN run(s)."
