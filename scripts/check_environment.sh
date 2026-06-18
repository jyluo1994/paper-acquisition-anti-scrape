#!/usr/bin/env bash
set -euo pipefail

status=0

say() {
  printf '%s\n' "$*"
}

check_cmd() {
  local name="$1"
  local cmd="$2"
  if command -v "$cmd" >/dev/null 2>&1; then
    say "[OK] $name: $(command -v "$cmd")"
  else
    say "[MISSING] $name: command '$cmd' not found"
    status=1
  fi
}

say "== Core commands =="
check_cmd "python3" python3
check_cmd "node" node
check_cmd "npm" npm

if command -v scansci-pdf >/dev/null 2>&1; then
  say "[OK] scansci-pdf: $(command -v scansci-pdf)"
else
  say "[MISSING] scansci-pdf command not found. Install with: python3 -m pip install -U scansci-pdf"
  status=1
fi

say
say "== Chrome / Chromium =="
if command -v google-chrome >/dev/null 2>&1; then
  say "[OK] google-chrome: $(command -v google-chrome)"
elif command -v chromium >/dev/null 2>&1; then
  say "[OK] chromium: $(command -v chromium)"
elif command -v chromium-browser >/dev/null 2>&1; then
  say "[OK] chromium-browser: $(command -v chromium-browser)"
elif [ -x "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ]; then
  say "[OK] macOS Google Chrome: /Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
else
  say "[MISSING] Chrome/Chromium not found in common locations"
  status=1
fi

say
say "== Browser probe =="
probe_dir="${BROWSER_PROBE_DIR:-$HOME/.openclaw/browser-probe}"
if [ -d "$probe_dir" ]; then
  say "[OK] browser-probe directory: $probe_dir"
  for script in acquire-paper.js fetch-paper-pdf.js fetch-wiley-simple.js elsevier-session-acquire.js test-springer-download-from-doi.js; do
    if [ -f "$probe_dir/$script" ]; then
      say "[OK] $script"
    else
      say "[WARN] missing $probe_dir/$script"
    fi
  done
else
  say "[WARN] browser-probe directory not found: $probe_dir"
fi

say
say "== Chrome DevTools Protocol =="
if command -v curl >/dev/null 2>&1 && curl -fsS --max-time 2 http://127.0.0.1:9222/json/version >/dev/null 2>&1; then
  say "[OK] CDP reachable at http://127.0.0.1:9222/json/version"
else
  say "[WARN] CDP not reachable. Start Chrome with --remote-debugging-port=9222 when browser fallback is needed."
fi

say
if [ "$status" -eq 0 ]; then
  say "Environment check completed: core dependencies look available."
else
  say "Environment check completed: missing core dependencies above."
fi

exit "$status"
