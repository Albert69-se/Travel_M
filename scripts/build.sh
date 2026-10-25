#!/usr/bin/env bash
# Build the Travel M (React) app, but only once every route component exists —
# Vite would otherwise fail on a missing import and bury the real problem in a
# rollup stack trace.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

VIEWS=(Home SignIn Register Account NotFound Discover PlaceDetail SavedPlaces
       Trips TripLayout TripOverview Itinerary Packing Expenses Weather)

missing=()
for view in "${VIEWS[@]}"; do
  [ -f "src/app/views/${view}.jsx" ] || missing+=("src/app/views/${view}.jsx")
done

if [ "${#missing[@]}" -gt 0 ]; then
  printf 'cannot build — missing %d view file(s):\n' "${#missing[@]}"
  printf '  %s\n' "${missing[@]}"
  exit 2
fi

echo "all ${#VIEWS[@]} views present"
exec node_modules/.bin/vite build "$@"
