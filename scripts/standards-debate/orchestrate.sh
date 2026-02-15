#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# Standards Harness Debate Orchestrator
#
# Spawns 4 agents (2 Claude + 2 Codex) to adversarially review the ENTIRE
# docs directory as a unified harness. Equal model representation.
#
# Harness Engineering: https://openai.com/index/harness-engineering/
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
WORKSPACE="$SCRIPT_DIR/workspace"
DOCS_DIR="$PROJECT_ROOT/docs"
PROMPTS_DIR="$SCRIPT_DIR/prompts"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Agent roster: 3 Claude + 3 Codex (equal representation)
# Claude: product/DX focus — Codex: architecture/backend/Effect focus
# Format: "role:model"
AGENTS=(
  "product:claude"
  "enforcer:claude"
  "reductionist:claude"
  "effect-advocate:codex"
  "architect:codex"
  "backend:codex"
)

usage() {
  cat <<'EOF'
Standards Harness Debate
========================

A multi-agent adversarial review of the docs/ directory as a unified
harness for AI agent code generation. 4 agents (2 Claude, 2 Codex) debate
the entire harness holistically, then a synthesizer merges their findings.

Usage: orchestrate.sh [OPTIONS] <command>

Commands:
  debate              Run the full debate (all 4 agents review entire harness)
  synthesize          Merge debate results into findings + improved harness
  status              Show debate status

Options:
  --rounds <n>        Number of debate rounds (default: 1, max: 3)
  --parallel          Run agents in parallel (default: sequential)
  --claude-only       Only run Claude agents (enforcer + effect-advocate)
  --codex-only        Only run Codex agents (reductionist + architect)
  --dry-run           Show what would run without executing

Agent Roster (3 Claude + 3 Codex):
  Claude #1: Product/DX     — "Does this help me ship a feature in 30 min?"
  Claude #2: Enforcer       — "If you can't test it, delete it"
  Claude #3: Reductionist   — "Every line is context window tax"
  Codex  #1: Effect Advocate — "Make violations type errors"
  Codex  #2: Architect      — "Where's the diagram? Where's the auth?"
  Codex  #3: Backend        — "Are the domain patterns coherent and composable?"

Examples:
  orchestrate.sh debate                          # Full debate, sequential
  orchestrate.sh --parallel debate               # Full debate, parallel
  orchestrate.sh --parallel --rounds 2 debate    # 2-round debate with rebuttals
  orchestrate.sh --claude-only debate            # Only Claude perspectives
  orchestrate.sh synthesize                      # Merge results
  orchestrate.sh --dry-run debate                # Preview

EOF
  exit 0
}

# Defaults
ROUNDS=1
PARALLEL=false
DRY_RUN=false
FILTER=""

# Parse options
while [[ $# -gt 0 ]]; do
  case $1 in
    --rounds)      ROUNDS="$2"; shift 2 ;;
    --parallel)    PARALLEL=true; shift ;;
    --claude-only) FILTER="claude"; shift ;;
    --codex-only)  FILTER="codex"; shift ;;
    --dry-run)     DRY_RUN=true; shift ;;
    -h|--help)     usage ;;
    *)             break ;;
  esac
done

COMMAND="${1:-}"
shift || true

# ============================================================================
# Core functions
# ============================================================================

setup_round_dir() {
  local round="$1"
  local dir="$WORKSPACE/round-$round"
  mkdir -p "$dir"
  echo "$dir"
}

BOLD='\033[1m'
DIM='\033[2m'

model_color() {
  local model="$1"
  if [[ "$model" == "claude" ]]; then
    echo "$MAGENTA"
  else
    echo "$CYAN"
  fi
}

# Background progress monitor — shows log file growth + elapsed time
# Usage: start_monitor <label> <log_file> <output_file> <model>
#        stop_monitor
MONITOR_PID=""

start_monitor() {
  local label="$1"
  local log_file="$2"
  local output_file="$3"
  local model="$4"
  local color
  color=$(model_color "$model")
  local start_time=$SECONDS

  (
    local last_size=0
    local dots=0
    while true; do
      sleep 5
      local elapsed=$(( SECONDS - start_time ))
      local mins=$(( elapsed / 60 ))
      local secs=$(( elapsed % 60 ))
      local timestamp
      printf -v timestamp "%dm%02ds" "$mins" "$secs"

      # Check if the output file exists yet (agent started writing)
      if [[ -f "$output_file" ]]; then
        local out_lines
        out_lines=$(wc -l < "$output_file" 2>/dev/null | tr -d ' ')
        echo -e "    ${DIM}${color}[$label]${NC}${DIM} ${timestamp} — writing analysis (${out_lines} lines so far)${NC}"
        last_size=0
      else
        # Show log file growth as a sign of life
        local log_size=0
        if [[ -f "$log_file" ]]; then
          log_size=$(wc -c < "$log_file" 2>/dev/null | tr -d ' ')
        fi
        if [[ "$log_size" -gt "$last_size" ]]; then
          local delta=$(( log_size - last_size ))
          echo -e "    ${DIM}${color}[$label]${NC}${DIM} ${timestamp} — processing (+${delta} bytes log output)${NC}"
          last_size=$log_size
        else
          dots=$(( (dots + 1) % 4 ))
          local spinner=("⠋" "⠙" "⠹" "⠸")
          echo -e "    ${DIM}${color}[$label]${NC}${DIM} ${timestamp} — working ${spinner[$dots]}${NC}"
        fi
      fi
    done
  ) &
  MONITOR_PID=$!
}

stop_monitor() {
  if [[ -n "$MONITOR_PID" ]]; then
    kill "$MONITOR_PID" 2>/dev/null || true
    wait "$MONITOR_PID" 2>/dev/null || true
    MONITOR_PID=""
  fi
}

# Monitor all running agents in parallel mode
# Usage: start_parallel_monitor <output_dir> <agent_list_string>
PARALLEL_MONITOR_PID=""

start_parallel_monitor() {
  local output_dir="$1"
  shift
  local agents=("$@")
  local start_time=$SECONDS

  (
    while true; do
      sleep 8
      local elapsed=$(( SECONDS - start_time ))
      local mins=$(( elapsed / 60 ))
      local secs=$(( elapsed % 60 ))
      local timestamp
      printf -v timestamp "%dm%02ds" "$mins" "$secs"

      echo -e "\n    ${DIM}── Status at ${timestamp} ──${NC}"
      for entry in "${agents[@]}"; do
        local role="${entry%%:*}"
        local model="${entry##*:}"
        local color
        color=$(model_color "$model")
        local analysis="$output_dir/${role}-analysis.md"
        local log="$output_dir/${role}-analysis.md.log"

        if [[ -f "$analysis" ]]; then
          local lines
          lines=$(wc -l < "$analysis" 2>/dev/null | tr -d ' ')
          echo -e "    ${color}[$model/$role]${NC} ${GREEN}writing${NC} (${lines} lines)"
        elif [[ -f "$log" ]] && [[ -s "$log" ]]; then
          local log_size
          log_size=$(wc -c < "$log" 2>/dev/null | tr -d ' ')
          echo -e "    ${color}[$model/$role]${NC} processing (${log_size}b log)"
        else
          echo -e "    ${color}[$model/$role]${NC} ${DIM}starting...${NC}"
        fi
      done
    done
  ) &
  PARALLEL_MONITOR_PID=$!
}

stop_parallel_monitor() {
  if [[ -n "$PARALLEL_MONITOR_PID" ]]; then
    kill "$PARALLEL_MONITOR_PID" 2>/dev/null || true
    wait "$PARALLEL_MONITOR_PID" 2>/dev/null || true
    PARALLEL_MONITOR_PID=""
  fi
}

run_claude_agent() {
  local role="$1"
  local output_dir="$2"
  local round="$3"
  local output_file="$output_dir/${role}-analysis.md"
  local prompt_file="$PROMPTS_DIR/claude-${role}.md"
  local harness_file="$PROMPTS_DIR/harness-context.md"

  # Build the prompt in a temp file (too large for -p argument)
  local prompt_tmp
  prompt_tmp=$(mktemp)
  trap "rm -f '$prompt_tmp'" RETURN

  cat "$harness_file" >> "$prompt_tmp"
  echo -e "\n\n---\n" >> "$prompt_tmp"
  cat "$prompt_file" >> "$prompt_tmp"
  cat >> "$prompt_tmp" <<PROMPT_EOF

---

## Instructions

1. Read ALL files in: $DOCS_DIR/ (every .md file in every subdirectory)
2. Write your complete analysis to: $output_file
3. This is round $round of the debate.
PROMPT_EOF

  # If round > 1, include previous round for rebuttal
  if [[ "$round" -gt 1 ]]; then
    local prev_dir="$WORKSPACE/round-$((round - 1))"
    cat >> "$prompt_tmp" <<REBUTTAL_EOF

## Previous Round

Read ALL analysis files from the previous round before writing yours:
Directory: $prev_dir/

Respond to specific points raised by the other 3 reviewers. Note their model (Claude or Codex) and role. Rebut, concede, or build upon their arguments. You are debating equals — give Codex arguments the same weight as Claude arguments.
REBUTTAL_EOF
  fi

  if [[ "$DRY_RUN" == "true" ]]; then
    echo -e "  $(model_color claude)[claude/$role]${NC} Would run: claude --dangerously-skip-permissions -p <tmpfile>"
    echo "    Prompt: $prompt_file + harness-context.md ($(wc -c < "$prompt_tmp" | tr -d ' ') bytes)"
    echo "    Output: $output_file"
    return 0
  fi

  local prompt_bytes
  prompt_bytes=$(wc -c < "$prompt_tmp" | tr -d ' ')
  echo -e "  $(model_color claude)[claude/$role]${NC} Reviewing entire harness (round $round) — prompt: ${prompt_bytes} bytes"

  # In sequential mode, start a per-agent progress monitor
  if [[ "$PARALLEL" != "true" ]]; then
    start_monitor "claude/$role" "$output_file.log" "$output_file" "claude"
  fi

  # Write a marker so the monitor knows the process started
  echo "[$(date '+%H:%M:%S')] claude/$role starting — prompt: ${prompt_bytes} bytes" > "$output_file.log"

  # Unset CLAUDECODE to prevent nested-session detection when spawned from within claude
  env -u CLAUDECODE -u CLAUDE_CODE_ENTRYPOINT claude \
    --dangerously-skip-permissions \
    --print \
    --output-format text \
    -p "$(cat "$prompt_tmp")" \
    >> "$output_file.log" 2>&1
  local exit_code=$?
  echo "[$(date '+%H:%M:%S')] claude/$role exited with code $exit_code" >> "$output_file.log"

  if [[ "$PARALLEL" != "true" ]]; then
    stop_monitor
  fi

  if [[ -f "$output_file" ]]; then
    local lines
    lines=$(wc -l < "$output_file" | tr -d ' ')
    echo -e "  ${GREEN}[claude/$role]${NC} Done — $lines lines written"
  else
    echo -e "  ${RED}[claude/$role]${NC} FAILED (exit $exit_code). Log tail:"
    tail -5 "$output_file.log" 2>/dev/null | while IFS= read -r line; do
      echo -e "    ${DIM}${line}${NC}"
    done
  fi
}

run_codex_agent() {
  local role="$1"
  local output_dir="$2"
  local round="$3"
  local output_file="$output_dir/${role}-analysis.md"
  local prompt_file="$PROMPTS_DIR/codex-${role}.md"
  local harness_file="$PROMPTS_DIR/harness-context.md"

  local harness_context
  harness_context=$(cat "$harness_file")

  local role_prompt
  role_prompt=$(cat "$prompt_file")

  # Build rebuttal context for round > 1
  local rebuttal_context=""
  if [[ "$round" -gt 1 ]]; then
    local prev_dir="$WORKSPACE/round-$((round - 1))"
    if [[ -d "$prev_dir" ]]; then
      rebuttal_context="

## Previous Round Analyses (respond to these)

Give Claude arguments the same weight as Codex arguments. You are debating equals.
"
      for f in "$prev_dir"/*-analysis.md; do
        if [[ -f "$f" ]]; then
          rebuttal_context+="
### $(basename "$f")
$(cat "$f")

---
"
        fi
      done
    fi
  fi

  if [[ "$DRY_RUN" == "true" ]]; then
    echo -e "  $(model_color codex)[codex/$role]${NC} Would run: codex exec --full-auto -C $PROJECT_ROOT"
    echo "    Prompt: $prompt_file + harness-context.md (piped via stdin)"
    echo "    Output: $output_file"
    return 0
  fi

  echo -e "  $(model_color codex)[codex/$role]${NC} Reviewing entire harness (round $round)..."

  # In sequential mode, start a per-agent progress monitor
  if [[ "$PARALLEL" != "true" ]]; then
    start_monitor "codex/$role" "$output_file.log" "$output_file" "codex"
  fi

  # Pipe the prompt via stdin (using -) since it's too large for a positional arg
  echo "$harness_context

---

$role_prompt

---

## Instructions

1. Read ALL files in: $DOCS_DIR/ (every .md file in every subdirectory)
2. Write your complete analysis to: $output_file
3. This is round $round of the debate.
$rebuttal_context" | codex exec \
    -s danger-full-access \
    -C "$PROJECT_ROOT" \
    - \
    > "$output_file.log" 2>&1 || true
  local exit_code=$?

  if [[ "$PARALLEL" != "true" ]]; then
    stop_monitor
  fi

  if [[ -f "$output_file" ]]; then
    local lines
    lines=$(wc -l < "$output_file" | tr -d ' ')
    echo -e "  ${GREEN}[codex/$role]${NC} Done — $lines lines written"
  else
    echo -e "  ${RED}[codex/$role]${NC} FAILED (exit $exit_code). Log tail:"
    tail -5 "$output_file.log" 2>/dev/null | while IFS= read -r line; do
      echo -e "    ${DIM}${line}${NC}"
    done
  fi
}

run_agent() {
  local role="$1"
  local model="$2"
  local output_dir="$3"
  local round="$4"

  if [[ "$model" == "claude" ]]; then
    run_claude_agent "$role" "$output_dir" "$round"
  else
    run_codex_agent "$role" "$output_dir" "$round"
  fi
}

run_synthesis() {
  local output_file="$WORKSPACE/synthesis.md"
  local improved_dir="$WORKSPACE/improved"
  mkdir -p "$improved_dir"

  echo -e "\n${YELLOW}=== Synthesizing Debate ===${NC}"

  local prompt="You are the SYNTHESIZER. You have access to a multi-round debate about the docs harness.

## Context

Read the harness engineering context: $PROMPTS_DIR/harness-context.md

## Your Job

1. Read the original harness: ALL .md files in $DOCS_DIR/
2. Read ALL debate analyses in $WORKSPACE/ (every round, every agent)
3. For each point of contention, decide who wins and WHY
4. Produce these outputs:

### Output 1: Synthesis Report
Write to: $output_file

Structure:
\`\`\`markdown
# Harness Debate Synthesis

## Model Balance
How did Claude vs Codex perspectives differ? Where did they agree?

## Consensus Points (all 4 agents agree)
- ...

## Contested Points (resolved)
### \"{topic}\"
- **Claude/Enforcer argued**: ...
- **Claude/Effect argued**: ...
- **Codex/Reductionist argued**: ...
- **Codex/Architect argued**: ...
- **Winner**: {who and why}
- **Action**: {what changes}

## Harness Metrics
- Current size: {lines} lines
- Proposed size: {lines} lines ({reduction}%)
- Enforcement coverage: {X}% of rules mechanically enforced
- Missing docs identified: {list}

## Top 10 Changes (ordered by impact)
1. ...
\`\`\`

### Output 2: Improved Standards
Write improved versions of EACH docs file to: $improved_dir/
Mirror the original directory structure:
  $improved_dir/patterns/use-case.md
  $improved_dir/patterns/repository.md
  $improved_dir/frontend/components.md
  etc.

Also create any NEW docs the debate identified as missing:
  $improved_dir/architecture.md
  $improved_dir/access-control.md
  etc.

## Synthesis Rules

- If all 4 agents agree on a change, apply it
- If 3/4 agree and the dissenter is from the same model as an agreeing agent, apply it (cross-model consensus)
- If it's 2 Claude vs 2 Codex (model split), flag for human decision — do NOT auto-resolve
- Enforcer says unenforceable AND no one defends → delete the rule
- Reductionist proposes compression AND no one objects → use compressed version
- Architect says missing diagram → add Mermaid diagram
- Effect Advocate shows type-level enforcement → replace prose rule with type constraint note
- Every rule gets enforcement annotation: <!-- enforced-by: invariant-test | eslint | types | architecture | manual-review -->
- Front-load golden principles in each standard
- Improved docs MUST be shorter than originals (total line count)

## Non-Negotiable Technology (do not change)
Turborepo, Effect TS, Hono, oRPC, Drizzle, React 19, TanStack Router/Query/Form, Tailwind, Radix UI, Vitest, MSW, Playwright"

  if [[ "$DRY_RUN" == "true" ]]; then
    echo -e "  ${CYAN}[DRY RUN]${NC} Would synthesize debate results"
    return 0
  fi

  claude --dangerously-skip-permissions \
    --print \
    --output-format text \
    -p "$prompt" \
    > "$WORKSPACE/synthesis.log" 2>&1

  if [[ -f "$output_file" ]]; then
    local lines
    lines=$(wc -l < "$output_file" | tr -d ' ')
    echo -e "  ${GREEN}[synthesizer]${NC} Synthesis: $lines lines"
    echo -e "  ${GREEN}Report:${NC}   $output_file"
    echo -e "  ${GREEN}Improved:${NC} $improved_dir/"

    # Count improved files
    local improved_count
    improved_count=$(find "$improved_dir" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
    echo -e "  ${GREEN}Files:${NC}    $improved_count improved docs written"
  else
    echo -e "  ${RED}[synthesizer]${NC} WARNING: Missing output. Check $WORKSPACE/synthesis.log"
  fi
}

# ============================================================================
# Commands
# ============================================================================

cmd_debate() {
  # Filter agents if requested
  local active_agents=()
  for entry in "${AGENTS[@]}"; do
    local role="${entry%%:*}"
    local model="${entry##*:}"
    if [[ -z "$FILTER" ]] || [[ "$model" == "$FILTER" ]]; then
      active_agents+=("$entry")
    fi
  done

  local claude_count=0
  local codex_count=0
  for entry in "${active_agents[@]}"; do
    local model="${entry##*:}"
    if [[ "$model" == "claude" ]]; then
      claude_count=$((claude_count + 1))
    else
      codex_count=$((codex_count + 1))
    fi
  done

  echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${YELLOW}║  Standards Harness Debate                                  ║${NC}"
  echo -e "${YELLOW}║  Scope: ALL docs files (holistic review)           ║${NC}"
  echo -e "${YELLOW}║  Agents: ${claude_count} Claude + ${codex_count} Codex | Rounds: $ROUNDS                      ║${NC}"
  echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "  ${MAGENTA}Claude${NC} agents:"
  for entry in "${active_agents[@]}"; do
    local role="${entry%%:*}"
    local model="${entry##*:}"
    [[ "$model" == "claude" ]] && echo -e "    $(model_color claude)[$role]${NC}"
  done
  echo -e "  ${CYAN}Codex${NC} agents:"
  for entry in "${active_agents[@]}"; do
    local role="${entry%%:*}"
    local model="${entry##*:}"
    [[ "$model" == "codex" ]] && echo -e "    $(model_color codex)[$role]${NC}"
  done

  local debate_start=$SECONDS

  for round in $(seq 1 "$ROUNDS"); do
    local round_start=$SECONDS
    echo -e "\n${YELLOW}━━━ Round $round of $ROUNDS ━━━${NC}"
    local output_dir
    output_dir=$(setup_round_dir "$round")

    if [[ "$PARALLEL" == "true" ]]; then
      local pids=()

      for entry in "${active_agents[@]}"; do
        local role="${entry%%:*}"
        local model="${entry##*:}"
        run_agent "$role" "$model" "$output_dir" "$round" &
        pids+=($!)
      done

      # Start a combined progress monitor for all agents
      start_parallel_monitor "$output_dir" "${active_agents[@]}"

      for pid in "${pids[@]}"; do
        wait "$pid" || true
      done

      stop_parallel_monitor
    else
      for entry in "${active_agents[@]}"; do
        local role="${entry%%:*}"
        local model="${entry##*:}"
        run_agent "$role" "$model" "$output_dir" "$round"
      done
    fi

    # Round summary
    local round_elapsed=$(( SECONDS - round_start ))
    local round_mins=$(( round_elapsed / 60 ))
    local round_secs=$(( round_elapsed % 60 ))
    local analyses_written
    analyses_written=$(find "$output_dir" -name "*-analysis.md" 2>/dev/null | wc -l | tr -d ' ')
    local analyses_expected=${#active_agents[@]}
    echo -e "\n  ${DIM}Round $round complete: ${analyses_written}/${analyses_expected} analyses in ${round_mins}m${round_secs}s${NC}"
  done

  local debate_elapsed=$(( SECONDS - debate_start ))
  local debate_mins=$(( debate_elapsed / 60 ))
  local debate_secs=$(( debate_elapsed % 60 ))

  echo -e "\n${GREEN}════════════════════════════════════════${NC}"
  echo -e "${GREEN}Debate complete!${NC} (${debate_mins}m${debate_secs}s total)"
  echo -e "Results: ${CYAN}$WORKSPACE/${NC}"

  # Show per-agent results
  echo ""
  for entry in "${active_agents[@]}"; do
    local role="${entry%%:*}"
    local model="${entry##*:}"
    local color
    color=$(model_color "$model")
    local latest_round="$WORKSPACE/round-$ROUNDS"
    local analysis="$latest_round/${role}-analysis.md"
    if [[ -f "$analysis" ]]; then
      local lines
      lines=$(wc -l < "$analysis" | tr -d ' ')
      echo -e "  ${color}[$model/$role]${NC} ${GREEN}${lines} lines${NC} → $(basename "$analysis")"
    else
      echo -e "  ${color}[$model/$role]${NC} ${RED}no output${NC}"
    fi
  done
  echo ""
  echo -e "Next steps:"
  echo -e "  1. Review: ${CYAN}ls $WORKSPACE/round-*/${NC}"
  echo -e "  2. Synthesize: ${CYAN}$(basename "$0") synthesize${NC}"
}

cmd_synthesize() {
  if [[ ! -d "$WORKSPACE/round-1" ]]; then
    echo -e "${RED}No debate results found. Run: $(basename "$0") debate${NC}"
    exit 1
  fi
  run_synthesis
}

cmd_status() {
  echo -e "${YELLOW}=== Harness Debate Status ===${NC}\n"

  if [[ ! -d "$WORKSPACE" ]] || [[ -z "$(ls -A "$WORKSPACE" 2>/dev/null)" ]]; then
    echo "No debates found. Run: $(basename "$0") debate"
    return 0
  fi

  for round_dir in "$WORKSPACE"/round-*/; do
    if [[ -d "$round_dir" ]]; then
      local round_name
      round_name=$(basename "$round_dir")
      echo -e "  ${CYAN}$round_name${NC}"

      for f in "$round_dir"/*-analysis.md; do
        if [[ -f "$f" ]]; then
          local name lines
          name=$(basename "$f" .md)
          lines=$(wc -l < "$f" | tr -d ' ')
          # Determine model from filename
          local model="?"
          case "$name" in
            product*|enforcer*|reductionist*) model="claude" ;;
            effect-advocate*|architect*|backend*) model="codex" ;;
          esac
          echo -e "    $(model_color "$model")[$model]${NC} $name: $lines lines"
        fi
      done
      echo ""
    fi
  done

  if [[ -f "$WORKSPACE/synthesis.md" ]]; then
    local synth_lines
    synth_lines=$(wc -l < "$WORKSPACE/synthesis.md" | tr -d ' ')
    echo -e "  ${GREEN}Synthesis:${NC} $synth_lines lines"
  else
    echo -e "  ${YELLOW}Synthesis:${NC} not yet run"
  fi

  if [[ -d "$WORKSPACE/improved" ]]; then
    local improved_count
    improved_count=$(find "$WORKSPACE/improved" -name "*.md" | wc -l | tr -d ' ')
    echo -e "  ${GREEN}Improved docs:${NC} $improved_count files"
  else
    echo -e "  ${YELLOW}Improved docs:${NC} not yet generated"
  fi
}

# ============================================================================
# Main
# ============================================================================

case "${COMMAND}" in
  debate)     cmd_debate ;;
  synthesize) cmd_synthesize ;;
  status)     cmd_status ;;
  *)          usage ;;
esac
