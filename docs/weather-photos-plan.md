# Weather and attraction photos — 26 October 2026

Objective: repair photo coverage and weather handling without losing the VPS's
200-place curated catalog or browser records.

Evidence: local React source rebuilds byte-identically to the deployed
index-Cbkl5O0Y.js. VPS catalog is newer and has no photo renderer. Live demo
weather succeeds; its trip dates exceed the provider's 16-day window.

Plan:
1. Recover VPS catalog into public/ so source builds preserve it.
2. Share the existing licensed Commons lookup between React and catalog;
   retain strict geographic/name matching, attribution, bounded requests and
   an explicit unavailable state. Support known temple aliases.
3. Improve coordinate selection for province destinations, bound weather
   requests, and label current conditions separately from trip forecasts.
4. Run regression tests, lint and build; snapshot VPS release, deploy only
   changed app assets, and verify public catalog/photos/weather.

Relevant files: public/catalog, src/core/weather.js, src/app/views/Weather.jsx,
src/app/components/PlacePhoto.jsx and shared photo helpers.

Constraints: no credential/config changes, paid dependencies, storage resets,
or invented attraction photos. Preserve VPS catalog IDs and attribution.

Success: matching catalog photos load with credit, absent images degrade
honestly, weather cannot hang indefinitely, forecast date limits are clear,
existing trip/catalog/server checks pass, and live routes remain healthy.

Risk: Wikimedia coverage is incomplete and external providers may fail.
Rollback: retain existing VPS assets plus a timestamped release snapshot.

Progress: complete. Local build passed; 85 regression tests passed (local
HTTP tests needed permission to bind a port). Lint has only existing/imported
warnings. VPS catalog/server tests: 15 passed. Public Doi Suthep photo and
credit verified in-browser; service active, catalog and weather routes HTTP 200.
The deployed release keeps all 200 original catalog records and older hashed
assets. Snapshot: dist.rollback-20261026-weather-photos.

Source recovery: copied the VPS catalog, curator and unit tests into the Mac
source repository. Future source builds now retain the curated catalog.
No credentials, systemd configuration or user storage was changed.
