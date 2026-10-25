# Live location and expanded prototype catalog

## Objective and success criteria
Show the browser's real device position on both map providers, update it while location is enabled, and offer recenter/stop controls. Load 200 distinct Google Places attractions with usable coordinates, exact place-ID photos and honest source attribution. User clarified that all active maps and discovery must use Google, not OpenStreetMap.

## Current behavior and relevant files
`MapPanel.jsx` requests a single position; `location.js` validates it; both map adapters draw a marker and accuracy circle. Empty search results prevent map creation. `featured.js` bundles 61 editorial entries, with eight additional demo records; the existing OSM archive supplies source-backed expansion candidates.

## Constraints and risks
Preserve stable IDs, saved trips and architecture. No dependencies, secrets or production configuration changes. Device location requires permission and HTTPS (or localhost); accuracy depends on hardware. Imported coordinates and availability are not field-verified. Avoid duplicate OSM representations and normalize province names.

## Implementation steps
1. Add cancellable device-location watching, coordinate validation, status and stop/recenter controls; retain position through map reinitialization and allow empty-result maps.
2. Use bounded live Google Places regional searches to obtain 200 distinct attractions. Keep content in memory and stable Google IDs in bookmarks; fetch referenced details when needed. Request photos for the exact place IDs and retain author attribution. Preserve old sample/editorial IDs for existing trips outside Discover.
3. Update counts/docs and regression tests, then run unit tests, lint, build and browser checks with simulated GPS success, movement, denial and cleanup.

## Validation plan
Check catalog uniqueness, coordinate ranges, province normalization, source IDs and archive-free loading. Check watch options, late callbacks, invalid positions and cancellation. Browser-test actual marker movement, recentering, stopping and empty results. Physical GPS precision must be checked on a real device.

## Progress
- Inspected current location, catalog, map adapters, store and tests.
- User clarified Google-only data/maps and matching Google photos; no OSM expansion was added.
- Google live check returned 200 distinct attractions across 29 provinces.
- Browser GPS check verified initial fix, movement, recovery from temporary POSITION_UNAVAILABLE, recenter, stop and an empty-results map. Movement emulation briefly reports unavailable; the watcher now waits for recovery without retaining a stale marker.
- Final validation: all 66 unit tests pass; production build passes; lint has only the two pre-existing Fast Refresh export warnings. `git diff --check` passes.
- Photos are requested by exact Google ID. Live checks for three attractions each returned zero photos with the configured demo key. A standard authorized key is required for full photo delivery; no real image delivery is claimed.
- `scripts/google-catalog-smoke.py` passed: 200 Google attractions; GPS movement, temporary failure recovery, recenter, stop, empty results, remount, mobile width, watcher cleanup and denial; no page errors or OSM requests. Photo-unavailable placeholder verified. Physical GPS accuracy remains device-dependent.
- Visually verified Google map tiles and the blue location marker after loading; removed unused Leaflet CDN assets from the page.
- Production deployment and credentials unchanged.
