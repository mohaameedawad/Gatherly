#!/usr/bin/env bash
# PreToolUse hook (fires once, before the first tool call): warns if the branch is behind its upstream.
#
# Optimized:
#   - Short-circuits immediately when there's no upstream configured (the common case for a
#     freshly created feature branch off pr-manager) instead of always paying for a fetch.
#   - Hard 3s timeout on the fetch. A bare `git fetch` has no built-in timeout and can hang on a
#     slow/flaky connection well past what a 5-minute task budget allows — the original
#     `2>/dev/null || exit 0` only catches an immediate error, not a slow success.
#   - Session-level cache: one story can spawn 3-5 subagents (developer, tester, reviewer,
#     pr-manager, plus a second developer/tester when split), and each one's first tool call
#     used to trigger its own separate `git fetch`. This caches the check for 10 minutes via a
#     marker file, so a single story pays for one fetch instead of one per subagent.

CACHE_FILE=".git/.claude-check-latest-cache"
CACHE_TTL=600  # seconds

if [ -f "$CACHE_FILE" ]; then
  now=$(date +%s)
  mtime=$(stat -c %Y "$CACHE_FILE" 2>/dev/null || stat -f %m "$CACHE_FILE" 2>/dev/null)
  if [ -n "$mtime" ] && [ $((now - mtime)) -lt "$CACHE_TTL" ]; then
    exit 0
  fi
fi

git rev-parse --abbrev-ref --symbolic-full-name @{u} >/dev/null 2>&1 || exit 0
timeout 3 git fetch --quiet 2>/dev/null || exit 0
touch "$CACHE_FILE" 2>/dev/null

behind="$(git rev-list --count HEAD..@{u} 2>/dev/null)"
if [ -n "$behind" ] && [ "$behind" -gt 0 ] 2>/dev/null; then
  node -e '
    const n = process.argv[1];
    console.log(JSON.stringify({ systemMessage: "Heads up: your branch is " + n + " commit(s) behind its upstream. Consider pulling before starting work." }));
  ' "$behind"
fi
exit 0