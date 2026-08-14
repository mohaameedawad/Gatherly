#!/usr/bin/env bash
# PreToolUse hook (fires once, before the first tool call): warns if the branch is behind its upstream.
git fetch --quiet 2>/dev/null || exit 0
behind="$(git rev-list --count HEAD..@{u} 2>/dev/null)"
if [ -n "$behind" ] && [ "$behind" -gt 0 ] 2>/dev/null; then
  node -e '
    const n = process.argv[1];
    console.log(JSON.stringify({ systemMessage: "Heads up: your branch is " + n + " commit(s) behind its upstream. Consider pulling before starting work." }));
  ' "$behind"
fi
exit 0
