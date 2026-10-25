# TravelM popular Thailand attractions and uncluttered maps — 2026-10-25

## Objective
Replace public discovery of 12,389 OSM-imported points with a compact editorial nationwide attraction list, pull photographs from Google Places on demand when enabled, and suppress pins while the map is zoomed out. Preserve trip, itinerary, and saved-place references.

## Current state
- Mac source is `Travel_M_React` (separate from the vanilla `Travel_M` repo), while VPS `/home/opc/apps/travel-m-react/dist` contains its build.
- `src/core/thailand.js` loads the 6.45 MB public OSM file; Discover renders 60 rows and maps up to 2,000 Leaflet / 200 Google pins.
- PlacePhoto uses sample Wikimedia URLs; Google Maps demo key is configured in browser-build environment, but Places API authorization is not verified.

## Target & acceptance
1. Load only 50–60 hand-selected recognizable Thai attractions as the main catalog; render existing eight sample records for demo continuity without duplicates.
2. Hide markers at country-level zoom; show a capped set within viewport at city-level zoom, updating on pan/zoom in Google Maps and Leaflet.
3. Photos use Google Places JavaScript `Place` photo metadata / `getURI`, honor author attribution, and are lazy-loaded with concurrency controls; no persisted image URLs or photo metadata.
4. On Places API rejection, show explicit fallback without broken images. Keep old imported records accessible only when referenced by saved places or user trip data, not in general discovery.
5. No new npm dependencies, no secrets changed; no claim of exact fees or verified GPS from editorial seed data.
6. Tests, lint, build; treat live deployment separately from source editing and verify rollback mechanism.

## Risks & deployment
- The Google Maps **demo** API key is client-visible and may lack `Places API (New)`; photo calls must fail safely. Enable Places API (New) and set referrer + quota restrictions before production.
- Photos may be absent or require author credit, and incur billing. Browser/network tests require authorized API access.
- Old OSM saved bookmarks should resolve from legacy dataset only when specifically referenced; downloading its archive is a rare fallback.
- The source folder is not Git-versioned. Preserve and test a rollback release before changing the VPS deployment.

## Steps
1. Build curated catalog and change importer; preserve historical reference resolver.
2. Add zoom-aware viewport marker selection in both map adapters.
3. Add demand-loaded Google Places photo adapter in PlacePhoto and detail hero.
4. Update visible source text / tests / README and validate build.
5. Deploy only via safe available transfer mechanism, retaining previous built release.
