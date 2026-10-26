#!/usr/bin/env bash
# Deploy the built Travel M (React) app to the VPS.
#
# Builds locally, ships dist/ + the static server, installs a systemd --user unit
# and restarts it. Idempotent: safe to re-run for every deploy.
#
#   ./scripts/deploy.sh            # build + deploy
#   ./scripts/deploy.sh --no-build # ship the existing dist/
#   ./scripts/deploy.sh --evaluation-google  # PUBLICLY HOSTED COURSE EVALUATION ONLY
set -euo pipefail

VPS="${VPS:-edux-oracle-vps}"
APP_DIR="/home/opc/apps/travel-m-react"
PORT="${PORT:-8802}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$HERE"

EVALUATION_GOOGLE=false
if [[ "${1:-}" == "--evaluation-google" ]]; then
  EVALUATION_GOOGLE=true
  echo "== evaluation mode: Google Maps Demo Key (NOT LICENSED FOR PRODUCTION) =="
elif [[ "${1:-}" != "" && "${1:-}" != "--no-build" ]]; then
  echo "Unknown deploy option. Use --evaluation-google for a hosted school evaluation." >&2
  exit 64
fi

# Maps Demo Keys are restricted to prototyping/evaluation and must not be
# used for production. Explicit hosted evaluation is separately labelled.
if [[ "$EVALUATION_GOOGLE" != true ]] && [[ -f .env.local ]] && grep -Eq '^[[:space:]]*VITE_GOOGLE_MAPS_DEMO_KEY[[:space:]]*=[[:space:]]*[^[:space:]#]+' .env.local; then
  echo "Refusing public deploy: .env.local contains a Google Maps DEMO key." >&2
  echo "Temporarily remove/disable that key and rebuild for public deployment." >&2
  exit 1
fi

if [[ "${1:-}" != "--no-build" ]]; then
  echo "== build =="
  bash "$HERE/scripts/build.sh"
fi

test -f dist/index.html || { echo "dist/index.html missing — run npm run build first" >&2; exit 1; }

# Also stop --no-build from shipping a previously generated demo-key bundle.
# This intentionally blocks any embedded Maps browser key until the public
# deployment is upgraded to a properly licensed/restricted configuration.
if [[ "$EVALUATION_GOOGLE" != true ]] && grep -Eql 'AIza[[:alnum:]_-]{30,}' dist/assets/*.js; then
  echo "Refusing public deploy: built JavaScript contains a Google Maps browser key." >&2
  echo "Build with the demo key unset before deploying the public website." >&2
  exit 1
fi

if [[ "$EVALUATION_GOOGLE" == true ]] && ! grep -Eql 'AIza[[:alnum:]_-]{30,}' dist/assets/*.js; then
  echo "No Google Maps demo key found in the build. Refusing to replace the hosted site with the wrong build." >&2
  exit 1
fi

echo "== preserve current VPS release for rollback =="
ssh "$VPS" "set -e; test -d '$APP_DIR/dist'; stamp=\$(date +%Y%m%d-%H%M%S); cp -a '$APP_DIR/dist' '$APP_DIR/dist.rollback-'\$stamp; cp '$APP_DIR/server/static-server.js' '$APP_DIR/server/static-server.js.rollback-'\$stamp; echo 'VPS snapshot created for rollback'"

echo "== ship =="
ssh "$VPS" "mkdir -p '$APP_DIR/server' '$APP_DIR/dist'"
# Keep older hashed assets for visitors with an already-open tab. Delay file
# replacement until each transfer is complete. Rollback snapshots remain above.
rsync -az --delay-updates dist/ "$VPS:$APP_DIR/dist/"
rsync -az server/static-server.js "$VPS:$APP_DIR/server/static-server.js"
rsync -az server/static-server.test.mjs "$VPS:$APP_DIR/server/static-server.test.mjs"
rsync -az server/travel-m-react.service "$VPS:$APP_DIR/server/travel-m-react.service"

echo "== service =="
ssh "$VPS" bash -s <<REMOTE
set -euo pipefail
mkdir -p /home/opc/.config/systemd/user
cp '$APP_DIR/server/travel-m-react.service' /home/opc/.config/systemd/user/travel-m-react.service
systemctl --user daemon-reload
systemctl --user enable travel-m-react.service >/dev/null 2>&1 || true
systemctl --user restart travel-m-react.service
sleep 1
systemctl --user is-active travel-m-react.service
REMOTE

echo "== verify =="
ssh "$VPS" "curl -sS -o /dev/null -w 'index %{http_code}\n' http://127.0.0.1:$PORT/; curl -sS -o /dev/null -w 'deep-link %{http_code}\n' http://127.0.0.1:$PORT/trips/trip-weekend-chiang-mai/expenses"
echo "deployed to $VPS:$APP_DIR (port $PORT)"
