#!/usr/bin/env bash
# Run one of the Playwright scripts (e2e.py, screenshots.py, render_design.py) with
# an interpreter that actually has Playwright installed.
#
# Why this exists: PATH differs between an interactive shell and a detached one on
# this Mac. Background processes put /opt/homebrew/bin first, so `python3` resolves
# to Homebrew Python 3.14 (no Playwright), while the interactive shell resolves to
# /usr/bin/python3 (3.9) where Playwright lives in user-site. Running a script via
# plain `python3` therefore works interactively and fails with ModuleNotFoundError
# when backgrounded. Resolve the interpreter deliberately instead of by luck.
#
#   bash scripts/with-playwright.sh e2e.py https://travel-m.xcalibur.space
#   bash scripts/with-playwright.sh screenshots.py
#   bash scripts/with-playwright.sh render_design.py
#
# Override the interpreter with TM_PYTHON=/path/to/python3
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ "$#" -lt 1 ]; then
  echo "usage: bash scripts/with-playwright.sh <script.py> [args...]" >&2
  exit 64
fi

target="$1"
shift
if [ ! -f "$target" ] && [ -f "$HERE/$target" ]; then
  target="$HERE/$target"
fi
[ -f "$target" ] || { echo "no such script: $target" >&2; exit 66; }

candidates=()
[ -n "${TM_PYTHON:-}" ] && candidates+=("${TM_PYTHON}")
if resolved="$(command -v python3 2>/dev/null)"; then candidates+=("$resolved"); fi
candidates+=("/usr/bin/python3")

tried=()
for py in "${candidates[@]}"; do
  [ -x "$py" ] || continue
  tried+=("$py")
  if "$py" -c 'import playwright' >/dev/null 2>&1; then
    echo "[with-playwright] $target via $py ($("$py" -V 2>&1))" >&2
    exec "$py" "$target" "$@"
  fi
done

echo "[with-playwright] no interpreter with playwright; tried: ${tried[*]}" >&2
echo "[with-playwright] install with: /usr/bin/python3 -m pip install --user playwright" >&2
exit 69
