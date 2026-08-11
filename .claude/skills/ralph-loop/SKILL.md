---
name: ralph-loop
description: Prepares and launches the Ralph autonomous loop (scripts/ralph/ralph.sh), which plays both the developer and tester roles combined across many unattended iterations. Only use when the user explicitly asks for autonomous/looped/overnight execution — never invoke this proactively.
---

# Ralph Loop skill

## When to use

Only on explicit request ("use ralph", "run autonomously", "let it loop
overnight", "work through the backlog unattended"). Never self-trigger.

## Steps

1. Confirm with the user, and don't guess silently:
   - Goal / backlog item(s) in scope.
   - `MAX_ITERATIONS` (default 5 if they don't care).
   - `MAX_RUNTIME_MINUTES` (default 5 mins).
   - `MAX_CONSECUTIVE_FAILURES` before auto-halt (default 3).
   - Guardrails: files/dirs it must not touch, whether migrations need
     human review.
2. Write `scripts/ralph/PLAN.md`: goal, guardrails, and a checklist of
   concrete subtasks.
3. `chmod +x scripts/ralph/ralph.sh`.
4. Launch in the background with the confirmed budgets as env vars, e.g.:
   ```
   MAX_ITERATIONS=5 MAX_RUNTIME_MINUTES=5 MAX_CONSECUTIVE_FAILURES=3 \
     nohup scripts/ralph/ralph.sh > scripts/ralph/logs/run-$(date +%Y%m%d-%H%M%S).log 2>&1 &
   ```
5. Tell the user: how to tail the current log, how to read `PLAN.md`
   progress, and how to stop it (`touch scripts/ralph/STOP`).
6. On halt (for any reason), hand off to `reviewer` → `pr-manager` — do not
   let Ralph's own commits become a PR unreviewed.
