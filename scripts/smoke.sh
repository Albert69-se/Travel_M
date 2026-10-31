#!/usr/bin/env bash
# Post-deploy smoke test for the live Travel M (React) build.
#
#   ./scripts/smoke.sh                       # tests https://travel-m.xcalibur.space
#   ./scripts/smoke.sh http://127.0.0.1:8802 # tests a local origin
#
# Checks the things that a build can silently get wrong: the app shell loads, the
# client-side routes fall back to it, the hashed bundle is really served, and the
# cache headers are the ones the server claims to send.
set -uo pipefail

BASE="${1:-https://travel-m.xcalibur.space}"
PASS=0
FAIL=0

ok()   { PASS=$((PASS + 1)); printf '  ok   %s\n' "$1"; }
bad()  { FAIL=$((FAIL + 1)); printf '  FAIL %s\n' "$1"; }

status_of() { curl -s -o /dev/null -w '%{http_code}' --max-time 25 "$1"; }
header_of() { curl -s -o /dev/null -D - --max-time 25 "$1" | tr -d '\r' | awk -F': ' -v h="$2" 'tolower($1)==tolower(h){print $2; exit}'; }

echo "smoke testing $BASE"

echo "-- routes (SPA fallback must answer every one with the shell)"
for route in / /discover /discover/place-doi-suthep /saved /trips /trips/trip-weekend-chiang-mai /trips/trip-weekend-chiang-mai/itinerary /trips/trip-weekend-chiang-mai/packing /trips/trip-weekend-chiang-mai/expenses /trips/trip-weekend-chiang-mai/weather /account /signin /register /no-such-route; do
  code="$(status_of "$BASE$route")"
  if [ "$code" = "200" ]; then ok "$route -> 200"; else bad "$route -> $code (expected 200)"; fi
done

echo "-- app shell"
shell="$(curl -s --max-time 25 "$BASE/")"
case "$shell" in
  *'<div id="root">'*) ok "index.html contains the React root" ;;
  *) bad "index.html has no #root mount point" ;;
esac
case "$shell" in
  *Loading*|*'Preparing sample data'*) ok "shell carries app copy" ;;
  *) printf '  note shell copy not matched (fine for a minified shell)\n' ;;
esac
case "$shell" in
  *'leaflet@1.9.4'*) bad "Legacy Leaflet CDN link remains in index.html" ;;
  *) ok "No legacy Leaflet CDN link" ;;
esac
case "$shell" in
  *fonts.googleapis.com*Inter*) ok "Inter webfont link present" ;;
  *) bad "Inter webfont link missing from index.html" ;;
esac

echo "-- built assets"
asset="$(printf '%s' "$shell" | grep -oE '/assets/[A-Za-z0-9._-]+\.js' | head -1)"
if [ -n "$asset" ]; then
  code="$(status_of "$BASE$asset")"
  ctype="$(header_of "$BASE$asset" content-type)"
  cache="$(header_of "$BASE$asset" cache-control)"
  [ "$code" = "200" ] && ok "bundle $asset -> 200" || bad "bundle $asset -> $code"
  case "$ctype" in *javascript*) ok "bundle content-type $ctype" ;; *) bad "bundle content-type $ctype" ;; esac
  case "$cache" in *immutable*) ok "hashed asset cache-control: $cache" ;; *) bad "hashed asset cache-control: $cache (expected immutable)" ;; esac
else
  bad "no /assets/*.js reference found in index.html"
fi

css="$(printf '%s' "$shell" | grep -oE '/assets/[A-Za-z0-9._-]+\.css' | head -1)"
if [ -n "$css" ]; then
  code="$(status_of "$BASE$css")"
  [ "$code" = "200" ] && ok "stylesheet $css -> 200" || bad "stylesheet $css -> $code"
else
  bad "no /assets/*.css reference found in index.html"
fi

index_cache="$(header_of "$BASE/" cache-control)"
case "$index_cache" in *no-cache*) ok "index cache-control: no-cache" ;; *) bad "index cache-control: $index_cache (expected no-cache)" ;; esac

echo "-- static extras"
for path in /favicon.svg; do
  code="$(status_of "$BASE$path")"
  [ "$code" = "200" ] && ok "$path -> 200" || bad "$path -> $code"
done

echo "-- Thailand-wide place dataset"
tmp="$(mktemp)"
if curl -s --max-time 60 "$BASE/data/thailand-places.json" -o "$tmp"; then
  size="$(wc -c < "$tmp" | tr -d ' ')"
  [ "$size" -gt 1000000 ] && ok "dataset payload is the real import ($size bytes)" || bad "dataset payload $size bytes (expected > 1 MB)"
  if grep -q '"places"' "$tmp" && grep -q 'ODbL' "$tmp" && grep -q '"imported"' "$tmp"; then
    ok "dataset carries places, ODbL provenance and imported status"
  else
    bad "dataset is missing its places/provenance content"
  fi
else
  bad "/data/thailand-places.json did not download"
fi
rm -f "$tmp"

echo
echo "passed $PASS, failed $FAIL"
[ "$FAIL" -eq 0 ] || exit 1
