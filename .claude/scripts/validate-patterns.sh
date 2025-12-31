#!/bin/bash
set -euo pipefail

# validate-patterns.sh
# Validates Effect patterns on changed files before shipping
# Returns non-zero exit code if violations found

ERRORS=0
WARNINGS=0
VIOLATIONS=()

# Colors for output
RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Get changed files (staged or modified)
get_changed_files() {
  git diff --name-only --cached 2>/dev/null || git diff --name-only HEAD 2>/dev/null || find packages -name "*.ts" -path "*/src/*"
}

# Check 1: Error classes must use Data.TaggedError
check_error_classes() {
  echo "Check 1: Error classes use Data.TaggedError..."

  local errors_files=$(get_changed_files | grep -E "errors\.ts$" || true)

  for file in $errors_files; do
    if [[ -f "$file" ]]; then
      # Look for class extending Error directly (not Data.TaggedError)
      if grep -n "class.*extends Error[^{]*{" "$file" 2>/dev/null | grep -v "TaggedError" | head -5; then
        VIOLATIONS+=("$file: Error class extends Error instead of Data.TaggedError")
        ((ERRORS++))
      fi
    fi
  done
}

# Check 2: No new Error() in Effect code
check_plain_errors() {
  echo "Check 2: No new Error() in Effect code..."

  local effect_files=$(get_changed_files | grep -E "packages/[^/]+/src/.*\.ts$" | grep -vE "\.test\.ts$" || true)

  for file in $effect_files; do
    if [[ -f "$file" ]]; then
      # Skip files that don't use Effect
      if ! grep -q "from ['\"]effect['\"]" "$file" 2>/dev/null; then
        continue
      fi

      # Check for new Error( that's not in a comment
      local violations=$(grep -n "new Error(" "$file" 2>/dev/null | grep -v "^\s*//" | grep -v "eslint-disable" || true)
      if [[ -n "$violations" ]]; then
        while IFS= read -r line; do
          VIOLATIONS+=("$file:$line → Use Effect.fail(DomainErrors.X()) instead")
          ((ERRORS++))
        done <<< "$violations"
      fi

      # Check for throw new Error
      violations=$(grep -n "throw new Error" "$file" 2>/dev/null | grep -v "^\s*//" | grep -v "eslint-disable" || true)
      if [[ -n "$violations" ]]; then
        while IFS= read -r line; do
          VIOLATIONS+=("$file:$line → Use yield* Effect.fail() instead")
          ((ERRORS++))
        done <<< "$violations"
      fi
    fi
  done
}

# Check 3: No raw SQL in repos (unless documented exception)
# This is an ERROR for repo files - raw SQL must use Drizzle query builder
check_raw_sql() {
  echo "Check 3: No raw SQL in repos..."

  # Check ALL repo files, not just changed ones - this is a critical pattern
  while IFS= read -r file; do
    if [[ -f "$file" ]]; then
      # Find db.execute(sql` usage
      while IFS=: read -r line_num _; do
        if [[ -n "$line_num" ]]; then
          # Check if previous line has eslint-disable comment with justification
          local prev_line=$((line_num - 1))
          local prev_content
          prev_content=$(sed -n "${prev_line}p" "$file" 2>/dev/null || true)

          if ! echo "$prev_content" | grep -q "eslint-disable.*--"; then
            VIOLATIONS+=("$file:$line_num → Use Drizzle query builder or add // eslint-disable-next-line effect/no-raw-sql -- <justification>")
            ((ERRORS++)) || true
          fi
        fi
      done < <(grep -n "db\.execute(sql\`" "$file" 2>/dev/null || true)
    fi
  done < <(find packages -path "*/src/repos/*.ts" -not -path "*/dist/*" -not -name "*.test.ts" -not -name "*.d.ts" 2>/dev/null)
}

# Check 4: No as any or bare any types
check_any_types() {
  echo "Check 4: No 'any' types..."

  local ts_files=$(get_changed_files | grep -E "packages/[^/]+/src/.*\.ts$" | grep -vE "\.test\.ts$" || true)

  for file in $ts_files; do
    if [[ -f "$file" ]]; then
      # Check for as any
      local violations=$(grep -n "as any" "$file" 2>/dev/null | grep -v "eslint-disable" || true)
      if [[ -n "$violations" ]]; then
        while IFS= read -r line; do
          VIOLATIONS+=("$file:$line → Remove 'as any' cast, use proper type")
          ((ERRORS++))
        done <<< "$violations"
      fi

      # Check for : any type annotation
      violations=$(grep -n ": any[,\)]" "$file" 2>/dev/null | grep -v "eslint-disable" || true)
      if [[ -n "$violations" ]]; then
        while IFS= read -r line; do
          VIOLATIONS+=("$file:$line → Remove 'any' type, use proper type")
          ((ERRORS++))
        done <<< "$violations"
      fi
    fi
  done
}

# Check 5: Tests use it.effect() and DbTestLayer
check_test_patterns() {
  echo "Check 5: Tests use it.effect() and DbTestLayer..."

  local test_files=$(get_changed_files | grep -E "\.test\.ts$" || true)

  for file in $test_files; do
    if [[ -f "$file" ]]; then
      # Check if file uses Effect imports
      if grep -q "from ['\"]effect['\"]" "$file" 2>/dev/null; then
        # Should use it.effect, not plain it
        if grep -q "it('" "$file" 2>/dev/null && ! grep -q "it\.effect(" "$file" 2>/dev/null; then
          VIOLATIONS+=("$file: Uses Effect but missing it.effect() - use @effect/vitest")
          ((WARNINGS++))
        fi

        # Should provide DbTestLayer
        if grep -q "Effect\.gen" "$file" 2>/dev/null && ! grep -q "DbTestLayer" "$file" 2>/dev/null; then
          VIOLATIONS+=("$file: Effect tests should provide DbTestLayer")
          ((WARNINGS++))
        fi
      fi
    fi
  done
}

# Check 6: No extractErrorCode pattern in routers
check_controller_patterns() {
  echo "Check 6: No extractErrorCode in routers..."

  local router_files=$(get_changed_files | grep -E "packages/api/src/server/router/.*\.ts$" || true)

  for file in $router_files; do
    if [[ -f "$file" ]]; then
      if grep -qn "extractErrorCode" "$file" 2>/dev/null; then
        local violations=$(grep -n "extractErrorCode" "$file" 2>/dev/null || true)
        while IFS= read -r line; do
          VIOLATIONS+=("$file:$line → Use Effect.catchTags() instead of extractErrorCode")
          ((ERRORS++))
        done <<< "$violations"
      fi
    fi
  done
}

# Main execution
main() {
  echo ""
  echo "=========================================="
  echo "  Effect Pattern Validation"
  echo "=========================================="
  echo ""

  check_error_classes
  check_plain_errors
  check_raw_sql
  check_any_types
  check_test_patterns
  check_controller_patterns

  echo ""
  echo "=========================================="

  if [[ ${#VIOLATIONS[@]} -eq 0 ]]; then
    echo -e "${GREEN}✓ All pattern checks passed${NC}"
    echo "=========================================="
    exit 0
  else
    echo -e "${RED}Found $ERRORS error(s) and $WARNINGS warning(s)${NC}"
    echo "=========================================="
    echo ""
    echo "Violations:"
    for v in "${VIOLATIONS[@]}"; do
      if [[ "$v" == *"→ Use Effect.fail"* ]] || [[ "$v" == *"→ Remove 'any'"* ]] || [[ "$v" == *"→ Use Effect.catchTags"* ]] || [[ "$v" == *"extends Error instead"* ]]; then
        echo -e "${RED}  ✗ $v${NC}"
      else
        echo -e "${YELLOW}  ⚠ $v${NC}"
      fi
    done
    echo ""

    if [[ $ERRORS -gt 0 ]]; then
      echo "Fix errors before shipping."
      exit 1
    else
      echo "Warnings found but can proceed."
      exit 0
    fi
  fi
}

main "$@"
