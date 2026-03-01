#!/usr/bin/env bash
# run-ready-issue.sh
# Resolve model/thinking labels for a ready-for-dev issue, then launch codex with
# matching runtime settings for that issue.
#
# Usage:
#   software-factory/scripts/run-ready-issue.sh [--issue N] [--dry-run]
#
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

ISSUE_NUMBER=""
DRY_RUN=0
MODEL_OVERRIDE=""
THINKING_OVERRIDE=""

usage() {
  cat <<'EOF'
Usage: run-ready-issue.sh [--issue N] [--dry-run]

Options:
  --issue N    Run a specific issue number.
  --model M    Override model for this run.
  --thinking T Override thinking for this run (low|medium|high|xhigh).
  --dry-run    Print resolved routing and command without executing codex.
  -h, --help   Show help.

Behavior:
  - If --issue is omitted, selects the lowest-number open issue labeled ready-for-dev.
  - Reads model/thinking from issue labels:
      model:gpt-5.3-codex | model:gpt-5.3-codex-spark
      thinking:low | thinking:medium | thinking:high | thinking:xhigh
  - If labels are missing, defaults to model=gpt-5.3-codex and thinking=high.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --issue)
      ISSUE_NUMBER="$2"
      shift 2
      ;;
    --model)
      MODEL_OVERRIDE="$2"
      shift 2
      ;;
    --thinking)
      THINKING_OVERRIDE="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ -z "${ISSUE_NUMBER}" ]]; then
  ISSUE_NUMBER="$(
    gh issue list \
      --state open \
      --label ready-for-dev \
      --limit 200 \
      --json number \
      --jq 'sort_by(.number) | .[0].number // empty'
  )"
fi

if [[ -z "${ISSUE_NUMBER}" ]]; then
  echo "No open issues with label ready-for-dev."
  exit 0
fi

ISSUE_JSON="$(
  gh issue view "$ISSUE_NUMBER" \
    --json number,title,url,state,labels
)"

ISSUE_STATE="$(jq -r '.state' <<<"$ISSUE_JSON")"
ISSUE_TITLE="$(jq -r '.title' <<<"$ISSUE_JSON")"
ISSUE_URL="$(jq -r '.url' <<<"$ISSUE_JSON")"

if [[ "$ISSUE_STATE" != "OPEN" ]]; then
  echo "Issue #$ISSUE_NUMBER is not open (state=$ISSUE_STATE)." >&2
  exit 1
fi

MODEL_LABELS_RAW="$(jq -r '.labels[].name | select(startswith("model:"))' <<<"$ISSUE_JSON" | sed '/^$/d')"
THINKING_LABELS_RAW="$(jq -r '.labels[].name | select(startswith("thinking:"))' <<<"$ISSUE_JSON" | sed '/^$/d')"

MODEL_LABEL_COUNT="$(printf '%s\n' "$MODEL_LABELS_RAW" | sed '/^$/d' | wc -l | tr -d ' ')"
THINKING_LABEL_COUNT="$(printf '%s\n' "$THINKING_LABELS_RAW" | sed '/^$/d' | wc -l | tr -d ' ')"

if [[ "$MODEL_LABEL_COUNT" -gt 1 ]]; then
  echo "Issue #$ISSUE_NUMBER has multiple model labels: $(tr '\n' ' ' <<<"$MODEL_LABELS_RAW")" >&2
  exit 1
fi

if [[ "$THINKING_LABEL_COUNT" -gt 1 ]]; then
  echo "Issue #$ISSUE_NUMBER has multiple thinking labels: $(tr '\n' ' ' <<<"$THINKING_LABELS_RAW")" >&2
  exit 1
fi

MODEL="$(printf '%s\n' "$MODEL_LABELS_RAW" | head -n 1)"
THINKING="$(printf '%s\n' "$THINKING_LABELS_RAW" | head -n 1)"

MODEL="${MODEL#model:}"
THINKING="${THINKING#thinking:}"

if [[ -z "$MODEL" ]]; then
  MODEL="gpt-5.3-codex"
fi

if [[ -z "$THINKING" ]]; then
  THINKING="high"
fi

if [[ -n "$MODEL_OVERRIDE" ]]; then
  MODEL="$MODEL_OVERRIDE"
fi

if [[ -n "$THINKING_OVERRIDE" ]]; then
  THINKING="$THINKING_OVERRIDE"
fi

case "$MODEL" in
  gpt-5.3-codex|gpt-5.3-codex-spark) ;;
  *)
    echo "Unsupported model label value: $MODEL" >&2
    exit 1
    ;;
esac

case "$THINKING" in
  low|medium|high|xhigh) ;;
  *)
    echo "Unsupported thinking label value: $THINKING" >&2
    exit 1
    ;;
esac

read -r -d '' PROMPT <<EOF || true
Execute one full \`ready-for-dev-executor\` run for issue #$ISSUE_NUMBER only.

Issue context:
- issue: #$ISSUE_NUMBER
- title: $ISSUE_TITLE
- url: $ISSUE_URL
- model label: model:$MODEL
- thinking label: thinking:$THINKING

Execution contract:
- Read and follow \`software-factory/automations/ready-for-dev-executor/ready-for-dev-executor.md\`.
- Treat #$ISSUE_NUMBER as the only actionable candidate for this run.
- If #$ISSUE_NUMBER is no longer actionable, stop with a concise no-op report.
- Complete implementation + validation + delivery workflow exactly as the playbook requires.
- Keep one PR max for this run.
EOF

echo "Routing issue #$ISSUE_NUMBER"
echo "  model:    $MODEL"
echo "  thinking: $THINKING"
echo "  url:      $ISSUE_URL"

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo
  echo "Dry run command:"
  echo "  codex exec -m $MODEL -c model_reasoning_effort=\\\"$THINKING\\\" -C $REPO_ROOT -"
  exit 0
fi

printf '%s\n' "$PROMPT" | codex exec \
  -m "$MODEL" \
  -c "model_reasoning_effort=\"$THINKING\"" \
  -C "$REPO_ROOT" \
  -
