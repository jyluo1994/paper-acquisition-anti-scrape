#!/usr/bin/env bash
set -euo pipefail

skill_name="paper-acquisition-anti-scrape"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
skill_dir="$(cd "$script_dir/.." && pwd)"

if [ "$(basename "$skill_dir")" != "$skill_name" ]; then
  printf '[ERROR] Expected skill folder name %s, got %s\n' "$skill_name" "$(basename "$skill_dir")" >&2
  exit 1
fi

if [ "${1:-}" != "" ]; then
  target_root="$1"
elif [ "${OPENCLAW_SKILLS_DIR:-}" != "" ]; then
  target_root="$OPENCLAW_SKILLS_DIR"
elif [ "${CODEX_HOME:-}" != "" ]; then
  target_root="$CODEX_HOME/skills"
elif [ -d "$HOME/.openclaw/workspace/skills" ]; then
  target_root="$HOME/.openclaw/workspace/skills"
else
  target_root="$HOME/.codex/skills"
fi

mkdir -p "$target_root"

target="$target_root/$skill_name"
tmp="$target_root/.$skill_name.installing.$$"
backup="$target.backup.$(date +%Y%m%d-%H%M%S)"

rm -rf "$tmp"
mkdir -p "$tmp"
cp -R "$skill_dir"/. "$tmp"/

if [ -e "$target" ]; then
  mv "$target" "$backup"
  printf '[INFO] Existing skill moved to %s\n' "$backup"
fi

mv "$tmp" "$target"
printf '[OK] Installed %s to %s\n' "$skill_name" "$target"
printf '[NEXT] Restart OpenClaw/Codex if skills are loaded at startup.\n'
