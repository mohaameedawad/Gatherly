#!/usr/bin/env bash
#
# ralph.sh — the "Ralph Wiggum" autonomous loop, playing developer + tester combined.
#
# Each iteration is a FRESH context window; scripts/ralph/PLAN.md is the
# only memory carried between iterations.
#
# Usage:      scripts/ralph/ralph.sh
# Stop early: touch scripts/ralph/STOP
# Configure:  MAX_ITERATIONS / MAX_RUNTIME_MINUTES / MAX_CONSECUTIVE_FAILURES env vars
#
set -euo pipefail

RALPH_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$RALPH_DIR/../.." && pwd)"
PROMPT_FILE="$RALPH_DIR/ralph-prompt.md"
PLAN_FILE="$RALPH_DIR/PLAN.md"
STOP_FILE="$RALPH_DIR/STOP"
LOG_DIR="$RALPH_DIR/logs"

MAX_ITERATIONS="${MAX_ITERATIONS:-50}"
MAX_RUNTIME_MINUTES="${MAX_RUNTIME_MINUTES:-240}"
MAX_CONSECUTIVE_FAILURES="${MAX_CONSECUTIVE_FAILURES:-3}"

mkdir -p "$LOG_DIR"
cd "$REPO_ROOT"

if [ ! -f "$PLAN_FILE" ]; then
  echo "ERROR: $PLAN_FILE not found. Write a plan first (see the ralph-loop skill)." >&2
  exit 1
fi

rm -f "$STOP_FILE"
start_epoch=$(date +%s)
failures=0

echo "Ralph starting: max_iterations=$MAX_ITERATIONS max_runtime_minutes=$MAX_RUNTIME_MINUTES max_consecutive_failures=$MAX_CONSECUTIVE_FAILURES"

for ((i = 1; i <= MAX_ITERATIONS; i++)); do
  # stop conditions, checked before every iteration
  if [ -f "$STOP_FILE" ]; then
    echo "STOP file found — halting after $((i - 1)) iterations."
    rm -f "$STOP_FILE"
    break
  fi
  if grep -q "^RALPH_DONE$" "$PLAN_FILE" 2>/dev/null; then
    echo "PLAN.md marked RALPH_DONE — halting."
    break
  fi
  if (( (($(date +%s) - start_epoch) / 60) >= MAX_RUNTIME_MINUTES )); then
    echo "Runtime budget of ${MAX_RUNTIME_MINUTES}m reached — halting."
    break
  fi
  if (( failures >= MAX_CONSECUTIVE_FAILURES )); then
    echo "$failures consecutive failures — halting to avoid burning budget on a stuck loop." >&2
    echo "See scripts/ralph/logs/ and the ## Blockers section of PLAN.md." >&2
    break
  fi

  log="$LOG_DIR/iter-$(printf '%03d' "$i").log"
  echo "[$i/$MAX_ITERATIONS] running -> $log"

  if claude -p --output-format text --dangerously-skip-permissions < "$PROMPT_FILE" > "$log" 2>&1; then
    failures=0
  else
    failures=$((failures + 1))
    echo "  iteration $i failed (consecutive failures: $failures)" >&2
  fi

  tail -n 20 "$log"
done

echo "Ralph loop finished."
echo "Review before merging: git log --oneline -20"
echo "Then hand off: reviewer -> pr-manager (never merge Ralph's commits unreviewed)."
