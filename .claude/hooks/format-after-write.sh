#!/usr/bin/env bash
# PostToolUse hook (Edit|Write|MultiEdit): formats the file that was just written, before it can be committed.
input="$(cat)"
file="$(printf '%s' "$input" | node -e '
let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{
  try{
    const j=JSON.parse(d);
    const f=(j.tool_input&&j.tool_input.file_path)||(j.tool_response&&j.tool_response.filePath)||"";
    process.stdout.write(f);
  }catch(e){}
});' 2>/dev/null)"

if [ -z "$file" ] || [ ! -f "$file" ]; then
  exit 0
fi

npx --no-install prettier --write --ignore-unknown -- "$file" >/dev/null 2>&1 || true
exit 0
