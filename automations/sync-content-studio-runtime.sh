#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
AUTOMATIONS_DIR="${REPO_ROOT}/automations"
RUNTIME_ROOT="${HOME}/.codex/automations"
ID_PREFIX="content-studio--"
DRY_RUN=0

usage() {
  cat <<'EOF'
Sync Content Studio automation wrappers into local Codex runtime.

Usage:
  automations/sync-content-studio-runtime.sh [--dry-run] [--runtime-root <path>] [--id-prefix <prefix>]

Options:
  --dry-run              Print planned actions without writing files.
  --runtime-root <path>  Override runtime root (default: ~/.codex/automations).
  --id-prefix <prefix>   Wrapper id prefix (default: content-studio--).
  -h, --help             Show this help.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --runtime-root)
      RUNTIME_ROOT="$2"
      shift 2
      ;;
    --id-prefix)
      ID_PREFIX="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ ! -d "${AUTOMATIONS_DIR}" ]]; then
  echo "Automations directory not found: ${AUTOMATIONS_DIR}" >&2
  exit 1
fi

WRAPPER_FILES=()
while IFS= read -r wrapper_file; do
  WRAPPER_FILES+=("${wrapper_file}")
done < <(find "${AUTOMATIONS_DIR}" -mindepth 2 -maxdepth 2 -type f -name '*.toml' | sort)

if [[ "${#WRAPPER_FILES[@]}" -eq 0 ]]; then
  echo "No automation wrappers found under ${AUTOMATIONS_DIR}" >&2
  exit 1
fi

NOW_MS="$(($(date +%s) * 1000))"
SYNC_COUNT=0

for src in "${WRAPPER_FILES[@]}"; do
  lane_dir="$(basename "$(dirname "${src}")")"
  lane_file="$(basename "${src}" .toml)"

  if [[ "${lane_dir}" != "${lane_file}" ]]; then
    echo "Skipping non-canonical wrapper path: ${src}" >&2
    continue
  fi

  runtime_dir="${RUNTIME_ROOT}/${ID_PREFIX}${lane_dir}"
  runtime_file="${runtime_dir}/automation.toml"

  if [[ "${DRY_RUN}" -eq 1 ]]; then
    echo "[dry-run] ${src} -> ${runtime_file}"
    SYNC_COUNT=$((SYNC_COUNT + 1))
    continue
  fi

  mkdir -p "${runtime_dir}"
  tmp_file="$(mktemp)"

  awk \
    -v lane="${lane_dir}" \
    -v id_prefix="${ID_PREFIX}" \
    -v repo_root="${REPO_ROOT}" \
    -v now_ms="${NOW_MS}" '
      {
        if ($0 ~ /^id = "/) {
          print "id = \"" id_prefix lane "\""
          next
        }
        if ($0 ~ /^name = "/) {
          raw = $0
          sub(/^name = "/, "", raw)
          sub(/"$/, "", raw)
          sub(/ \(content-studio\)$/, "", raw)
          print "name = \"" raw " (content-studio)\""
          next
        }
        if ($0 ~ /^cwds = \[/) {
          print "cwds = [\"" repo_root "\"]"
          next
        }
        if ($0 ~ /^updated_at = /) {
          print "updated_at = " now_ms
          next
        }
        print
      }
    ' "${src}" > "${tmp_file}"

  mv "${tmp_file}" "${runtime_file}"
  SYNC_COUNT=$((SYNC_COUNT + 1))
  echo "Synced ${lane_dir} -> ${runtime_file}"
done

if [[ "${DRY_RUN}" -eq 1 ]]; then
  echo "Dry run complete. ${SYNC_COUNT} wrapper(s) would be synced."
else
  echo "Sync complete. ${SYNC_COUNT} wrapper(s) synced."
fi
