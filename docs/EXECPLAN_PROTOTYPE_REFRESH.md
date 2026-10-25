# Prototype refresh — 25 October 2026

## Objective and success criteria
Audit and refresh the existing React prototype, make the Discover map useful at every zoom, preserve trip workflows, commit to Albert69-se GitHub, and deploy to the existing VPS through SSH over Tailscale.

## Current state and findings
- The local React source has no Git history; personal GitHub connector must not be used to publish.
- Discover hides all pins below zoom 10, leaving a blank country view. List and map have no selection interaction.
- Map lifecycle globally releases all maps and can attach a late Google request to a reused container.
- Dense 13px UI, tiny controls, repeated implementation warnings, and narrow map allocation obscure the main planning tasks.
- Browser-only accounts and storage are appropriate to this prototype but do not provide production security or cross-device sync.

## Relevant files and target behavior
- src/styles/index.css, layout/Shell.jsx, views/Home.jsx: warm neutral canvas, teal identity, readable type, spacious controls, purposeful landing page and coherent app shell.
- views/Discover.jsx, components/MapPanel.jsx, core/map.js, lib/google-map.js: larger map, regional count markers, city pins, selected-place focus, fit-results control, safe per-instance cleanup and fallback.
- tests/logic.test.js and browser smoke: clustering, map interaction, fallback, mobile layout, existing planning CRUD.
- package.json, README.md, scripts/deploy.sh: working test command, current docs, verified deployment.

## Constraints
No new production dependencies; preserve data schema and existing records. No secret/env edits. Preserve Google evaluation mode for this prototype. Do not overwrite the legacy Travel_M repository. Confirm student identity and repository before pushing.

## Steps
1. Audit source, auth, map behavior and existing hosting. [complete]
2. Implement presentation and map lifecycle/interaction changes. [complete]
3. Run logic, lint, build and browser tests; inspect desktop/mobile screenshots. [complete: 59 logic tests, build, lint, browser checks documented]
4. Initialize Git safely, commit reviewed source, sync student repository. [complete: private Albert69-se/Travel_M_React, main]
5. Back up VPS release; deploy over Tailscale SSH; verify public routes and browser flows. [complete: active service, matching build hash, 25/25 public HTTP checks, live UI verified]

## Risks and validation
External Google/OSM/photo/weather availability remains outside the app; test map fallback deliberately. Google demo key remains evaluation-only. Local storage remains device-bound. GitHub auth may require user intervention. Keep a VPS rollback snapshot before replacement.

## Additional user requirements
- Permission-driven current location on both map providers, with accuracy circle, denied/unavailable/timeout states. Location stays in component memory.
- Google Places photos where supported. Confirmed live GetPlace calls return no photos with the configured demo key. Official documentation (https://developers.google.com/maps/demo-key, updated 2026-10-22) explicitly excludes user photos. Added optional VITE_GOOGLE_MAPS_API_KEY support and disabled futile photo lookups in demo-only mode. No billing or key settings changed.
- Confirmed student account Albert69-se via authenticated gh API. SSH alias edux-oracle-vps resolves to Tailscale address and active service. Existing Travel_M repository is preserved; new private Travel_M_React repository will hold this source.
