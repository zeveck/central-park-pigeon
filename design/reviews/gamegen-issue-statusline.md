Long gamegen runs last hours or days. What the user most wants to see at a glance is the model, how full the context is (so they know when to `/compact`), how close they are to the 5-hour and 7-day usage limits, and which project the session is in (several gamegen sessions are often open at once).

**Suggestion:** a `--statusline` flag (also usable alone, like `--help`) that installs a status line showing:

`Model | ctx ████░░░░░░ 42% | 5h ██████░░░░ 61% | 7d ██░░░░░░░░ 20% | ~/path/to/project`

- 10-cell bars: green under 50%, yellow from 50%, red from 80%.
- The 5h and 7d parts appear only when Claude Code reports them (plans without those limits, and API keys, leave them out).
- The cwd sits on the far right, with `$HOME` shortened to `~`.
- jq is needed; without it the script prints a one-line note instead.

What the flag would do:
1. Write the script to `~/.claude/statusline.sh`, or to the project's `.claude/` if the user prefers per-project. If a different script is already there, show the diff and ask before replacing it, unless `--no-confirm`.
2. Set `statusLine` in `~/.claude/settings.json` to `{"type": "command", "command": "bash ~/.claude/statusline.sh"}`, keeping other settings intact.
3. Test it with a sample JSON payload and show the output.

The script used in this run:

```bash
#!/bin/bash
# devcontainer-plus status line: model | context | 5-hour limit | 7-day limit
# (each limit only when your plan has it).
# Setup copies this to ~/.claude/statusline.sh on each build, unless that copy
# has been changed since (setup keeps a fingerprint of what it installed).
export LC_ALL=C
input=$(cat)

if ! command -v jq >/dev/null 2>&1; then
  echo "statusline: jq not installed"
  exit 0
fi

IFS='|' read -r model ctx five week cwd < <(
  printf '%s' "$input" | jq -r '[
    (.model.display_name // "Claude"),
    (.context_window.used_percentage // ""),
    (.rate_limits.five_hour.used_percentage // ""),
    (.rate_limits.seven_day.used_percentage // ""),
    (.workspace.current_dir // .cwd // "")
  ] | map(tostring) | join("|")' 2>/dev/null
)
# Abbreviate $HOME as ~
[ -n "$cwd" ] && [ -n "$HOME" ] && case "$cwd" in "$HOME"|"$HOME"/*) cwd="~${cwd#"$HOME"}";; esac

# bar LABEL PERCENT -> 10-cell colored bar + percentage, or "LABEL --"
bar() {
  local label=$1 p=$2
  if [ -z "$p" ]; then
    printf '%s --' "$label"
    return
  fi
  local n
  n=$(printf '%.0f' "$p" 2>/dev/null) || { printf '%s --' "$label"; return; }
  [ "$n" -gt 100 ] && n=100
  [ "$n" -lt 0 ] && n=0
  local filled=$(( (n * 10 + 50) / 100 )) color i full="" empty=""
  if [ "$n" -ge 80 ]; then color=31
  elif [ "$n" -ge 50 ]; then color=33
  else color=32; fi
  for ((i = 0; i < filled; i++)); do full+="█"; done
  for ((i = filled; i < 10; i++)); do empty+="░"; done
  printf '%s \033[%sm%s\033[2m%s\033[0m %d%%' "$label" "$color" "$full" "$empty" "$n"
}

# A limit shows only while Claude Code reports it: plans without a 5-hour
# window (and API keys, which have no plan limits) leave it out.
line="${model:-Claude} | $(bar ctx "$ctx")"
[ -n "$five" ] && line+=" | $(bar 5h "$five")"
[ -n "$week" ] && line+=" | $(bar 7d "$week")"
[ -n "$cwd" ] && line+=" | $cwd"
printf '%s\n' "$line"
```

(The base script came from a devcontainer setup; this run moved the cwd to the far right.)
