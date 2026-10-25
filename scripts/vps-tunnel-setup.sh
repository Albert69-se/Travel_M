#!/usr/bin/env bash
# Runs ON the VPS. Creates the dedicated tunnel for the Travel M (React) site,
# its ingress config, the DNS route and the systemd --user unit.
#
# Mirrors the existing per-site pattern (see ~/.cloudflared/safecampus.yml and
# cloudflared-safecampus.service). Nothing here is sudo: every file is under
# /home/opc and the tunnel is owned by the opc account.
#
# Idempotent: re-running it leaves an existing tunnel, route and unit in place.
set -euo pipefail

CF=/home/opc/bin/cloudflared
NAME=travel-m
HOSTNAME_FQDN=travel-m.xcalibur.space
PORT=8802
UUID_RE='[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'

echo "== tunnel =="
ID=""
if [ -f "$HOME/.cloudflared/$NAME.yml" ]; then
  ID="$(grep -oE "$UUID_RE" "$HOME/.cloudflared/$NAME.yml" | head -1 || true)"
fi

if [ -z "$ID" ]; then
  CREATE_OUT="$("$CF" tunnel create "$NAME" 2>&1 || true)"
  echo "$CREATE_OUT"
  ID="$(printf '%s' "$CREATE_OUT" | grep -oE "$UUID_RE" | head -1 || true)"
fi

if [ -z "$ID" ]; then
  # Already existed (name taken) — look it up instead.
  ID="$("$CF" tunnel list --output json 2>/dev/null | python3 -c "
import json,sys
name = '$NAME'
rows = json.load(sys.stdin)
print(next((t['id'] for t in rows if t.get('name') == name), ''))
" || true)"
fi

if [ -z "$ID" ]; then
  echo "could not determine the tunnel id for $NAME" >&2
  exit 1
fi
echo "tunnel id: $ID"

echo "== ingress config =="
printf 'tunnel: %s\ncredentials-file: /home/opc/.cloudflared/%s.json\n\ningress:\n  - hostname: %s\n    service: http://127.0.0.1:%s\n  - service: http_status:404\n' \
  "$ID" "$ID" "$HOSTNAME_FQDN" "$PORT" > "$HOME/.cloudflared/$NAME.yml"
cat "$HOME/.cloudflared/$NAME.yml"

echo "== dns route =="
"$CF" tunnel route dns "$ID" "$HOSTNAME_FQDN" 2>&1 | tail -3 || echo "(route may already exist — continuing)"

echo "== unit =="
mkdir -p "$HOME/.config/systemd/user"
if [ -f "$HOME/apps/travel-m-react/server/cloudflared-travel-m.service" ]; then
  cp "$HOME/apps/travel-m-react/server/cloudflared-travel-m.service" \
     "$HOME/.config/systemd/user/cloudflared-travel-m.service"
fi
systemctl --user daemon-reload
systemctl --user enable cloudflared-travel-m.service >/dev/null 2>&1 || true

echo "SETUP_OK $ID $HOSTNAME_FQDN -> 127.0.0.1:$PORT"
