# Prototype refresh audit — 25 October 2026

## Changes
- Rebuilt landing page with an original landscape illustration, destination suggestions and clear demo onboarding.
- Refreshed app-wide typography, palette, navigation, cards and controls; retained the existing React routes and data model.
- Discover now gives more space to the map and connects each card to its location. Nationwide views show regional counts, with fit-results and city-level pins on both providers.
- Fixed global map cleanup and stale asynchronous Google mounts; Leaflet observes container resizing. Empty results clear map counts.
- Added permission-driven location, accuracy circle, and actionable denied/unavailable/timeout errors. No location persistence.
- Diagnosed missing Google photos: demo keys explicitly exclude user content. Added standard-key photo configuration and skip useless demo photo calls. No new dependencies, key edits or billing changes.
- Added the missing npm test script, cluster coverage and location success/error coverage.

## Verification performed
- 59 Node logic tests pass, including existing account ownership, trip, itinerary, packing, expense, date and map checks.
- Vite build succeeds. Lint has no errors and two existing Fast Refresh warnings in store.jsx.
- Browser: demo sign-in, dashboard, packing toggle survives reload and is restored; expense addition updates total from 1950 to 1975, then deleting the temporary test record restores 1950.
- Browser: country groups, city pins, card focus, fit-results, search no-results, clearing filters and Chiang Mai province filtering.
- Forced Google script failure in browser: Leaflet groups and card focus work; network block was cleared afterward.
- Mobile: list-to-map selection works, Google map shows focused Bangkok pins, document width equals viewport width (no horizontal overflow).
- Geolocation success, denied, unavailable, timeout, insecure context and invalid-result paths tested with injected providers in Node. Real device location and native OS consent are not automated by the current browser tool; verify once on the user's device over HTTPS.
- Live Places API returned empty photo data with the demo key. Standard-key photo delivery cannot be verified without an authorized standard key. Source: https://developers.google.com/maps/demo-key.
- Existing standalone Playwright smoke scripts were adjusted for regional groups; they were not rerun in this session. Browser checks above used the in-app browser.

## Remaining prototype boundaries
Browser-only accounts and records have no backend security or cross-device persistence. Destination facts remain approximate/unverified. External maps, photos and weather depend on providers. The deployed demo-key build is for evaluation, not production.

## Publishing
Target: private Albert69-se/Travel_M_React repository; legacy Travel_M remains untouched. Existing VPS app at /home/opc/apps/travel-m-react, reached through SSH alias edux-oracle-vps over Tailscale. Preserve a release snapshot before deployment and verify public routes and the deployed UI.

## Release verification
- Application commit: `38a31a7` on `main`, pushed to the private student repository https://github.com/Albert69-se/Travel_M_React.
- Deployed successfully to https://travel-m.xcalibur.space through Tailscale SSH; `travel-m-react.service` active.
- 25/25 public HTTP smoke checks pass, including deep links, JavaScript/CSS, favicon and cache headers. Live browser confirms refreshed Discover and Google Maps with the location permission control.
- Local and VPS `dist/index.html` SHA-256 match: `3e451485a6be1e48f2eeb367f5f7d2e054b5e973aff1876d7ac4ddf2126ddf04`.
- Rollback snapshot: `/home/opc/apps/travel-m-react/dist.rollback-20261025-210457`; matching server backup is alongside `server/static-server.js`.
- Deploy retains previous hashed assets for already-open tabs and uses rsync delayed replacement. No environment files or credentials are tracked.
