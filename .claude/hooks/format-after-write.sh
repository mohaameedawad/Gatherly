#!/usr/bin/env bash
# PostToolUse hook (Edit|Write|MultiEdit): formats the file that was just written, before it can
# be committed.
#
# Optimized: the original did two separate process spawns per edit — one Node process to parse
# the hook's stdin JSON, then a second via `npx --no-install prettier` which itself re-spawns
# Node and pays npx's package-resolution overhead on every single call. This version does the
# JSON parsing and the formatting in one Node process, calling Prettier's programmatic API
# directly instead of shelling out to its CLI, and skips spawning Node entirely for file types
# Prettier wouldn't touch anyway (e.g. hook firing on a .env or .lock file write).
#
# With many Edit/Write calls per story (developer + tester can easily generate 15-30), cutting
# one process spawn off each adds up — but treat this as a small, safe win, not the main lever.
# The bigger costs are almost certainly upstream of this hook: repo-wide `npm run lint`, full
# test suite runs, and the number/model of sequential agent spawns in the pipeline.

input="$(cat)"

node -e '
let d = "";
process.stdin.on("data", c => d += c).on("end", () => {
  let file = "";
  try {
    const j = JSON.parse(d);
    file = (j.tool_input && j.tool_input.file_path) || (j.tool_response && j.tool_response.filePath) || "";
  } catch (e) {}

  if (!file) process.exit(0);

  const fs = require("fs");
  if (!fs.existsSync(file)) process.exit(0);

  // Skip the Prettier work entirely for extensions it does not format — avoids even trying
  // to resolve the prettier module for files like .env, .lock, images, etc.
  const SUPPORTED = /\.(js|jsx|mjs|cjs|ts|tsx|json|jsonc|css|scss|less|html|vue|md|mdx|yaml|yml|graphql)$/i;
  if (!SUPPORTED.test(file)) process.exit(0);

  let prettier;
  try {
    prettier = require(require.resolve("prettier", { paths: [process.cwd()] }));
  } catch (e) {
    process.exit(0); // prettier not installed/resolvable here — never block the write on this
  }

  Promise.resolve()
    .then(() => prettier.resolveConfig(file))
    .then((config) => {
      const src = fs.readFileSync(file, "utf8");
      return prettier.format(src, Object.assign({}, config, { filepath: file }));
    })
    .then((formatted) => {
      fs.writeFileSync(file, formatted);
    })
    .catch(() => {}); // never fail the hook on a formatting error — the write already succeeded
});
' <<< "$input" >/dev/null 2>&1

exit 0