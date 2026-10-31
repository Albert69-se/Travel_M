# TravelM UI/UX audit and overhaul

## Objective
Make discovery, saving and trip planning feel like one coherent travel workspace, with a distinct visual identity and usable mobile controls. Preserve existing records and checkpoint all work.

## Audit (source-based, 31 October 2026)
- High: two competing navigation systems expose trip tools globally and inside the trip. Desktop account navigation is missing for signed-in users.
- High: Discover uses an independent visual system; the home hero is promotional while practical discovery requires another step.
- High: controls are often 26–34px, mobile text inputs are below 16px, and the bottom navigation has no safe-area padding.
- Medium: weak hierarchy, many small uppercase labels, repetitive implementation-focused copy and equally weighted cards make the planner hard to scan.
- Medium: new trips leave users in the list rather than opening their new workspace.
- Medium: field errors are visible but not programmatically associated with inputs; route changes do not manage focus.
- Existing data concern: the maintained catalog contains attributed OSM records despite earlier Google-only preferences. This redesign preserves the existing catalog and honest attribution; it does not relabel or migrate the data provider.
- Visual audit limitation: browser automation is disabled in Work settings. Findings above are source evidence, not screenshot observations.

## Relevant files
Shell.jsx, Home.jsx, Trips.jsx, TripLayout.jsx, SignIn.jsx, SavedPlaces.jsx, Account.jsx, components/ui.jsx, styles/index.css, public/catalog/{index.html,catalog.css,catalog-app.mjs}, public/catalog/catalog-navigation.mjs.

## Target and constraints
Warm paper surfaces, forest accent, editorial display typography, generous controls, concise next actions. Keep the shared sidebar, account ownership, data contracts, Google map and satellite controls, truthful photos and mobile detail scroll restoration. No new dependencies, credentials, production configuration or deployments.

## Steps
1. [x] Checkpoint pre-existing work: 45e9d61.
2. [x] Replace shell hierarchy and guest start page; align Discover and shared primitives.
3. [x] Improve discovery handoff, new-trip flow, forms and navigation accessibility.
4. [x] Run lint, build, core/catalog tests and inspect final diff; record browser verification limitation.
5. [x] Commit implementation and document rollback.

## Success criteria and validation
- Home search reaches filtered Discover; destination shortcuts use real filters.
- Account accessible at every breakpoint; trip tools scoped to trip workspace.
- Consistent typography, forms, focus rings, touch controls and mobile safe areas.
- Existing core/catalog tests pass; build/lint pass; query parsing has targeted regression coverage.
- No data migrations, data deletion or dependency additions. Clean commit boundary.
- Browser checklist when enabled: 1440/768/390/320px layouts; keyboard navigation; search/reset; demo login; save to Saved; create/edit trip; packing/expenses; map failures; mobile detail/back scroll.

## Risks
Browser rendering and live map/photo provider behavior cannot be certified without browser access. Source-level responsive work and successful builds do not replace visual QA.

## Progress
Baseline committed before any redesign edits. Preview available at http://127.0.0.1:5173/.

### Implemented
- Rebuilt the navigation hierarchy and home page around search, destination links and planning; retained the TravelM wordmark.
- Unified warm surfaces, editorial headings, readable labels, controls, focus rings and safe-area spacing across React and the embedded catalog.
- Replaced Saved places' narrow scrolling rows with naturally scrolling cards; made trip cards easier to scan.
- Preserved the new-trip intention through sign-in; open the created trip immediately.
- Added desktop Account access, route title/focus management and accessible field error descriptions.
- Simplified account and sign-in copy; placed storage diagnostics behind a disclosure and kept reset consequences explicit.
- Reviewed remaining trip screens: itinerary day tabs, packing confirmation, expense table overflow and weather error states retain their existing behavior and benefit from shared controls/type changes. Their visual layout still needs browser QA.

### Validation
- `npm test`: 72 passed, including URL-filter handoff and invalid-filter regressions.
- `node --test server/catalog.test.mjs`: 8 passed (catalog data, ownership, save and itinerary behavior).
- `node --test server/static-server.test.mjs`: 7 passed with local-port permission after a sandbox bind failure.
- Production build succeeds. Lint has no errors; five pre-existing warnings remain in server/store files outside the overhaul.
- No browser screenshots or end-to-end UI run: the browser tool reports “Local browser use is disabled in Work settings”.

### Rollback
The pre-overhaul checkpoint is `45e9d61`. The implementation is committed separately with subject
`feat: overhaul TravelM workspace and planning UX`. Revert that implementation commit to restore
the checkpoint while keeping Git history. No production deployment or remote push was made.

## VPS deployment follow-up
User requested deployment after the UI commit. Verified `edux-oracle-vps` resolves to the existing Tailscale host and `travel-m-react.service` serves `/home/opc/apps/travel-m-react/dist` on port 8802; the tunnel is active.

Preflight found the server sends `X-Frame-Options: DENY` for the catalog, blocking the existing embedded architecture. Added a SAMEORIGIN exception for only `catalog/index.html`; other routes remain DENY. Regression coverage checks normal/cached catalog responses and executable module MIME. Updated the obsolete smoke assertion that still required Leaflet.

Keep the existing hosted school-evaluation deployment mode; do not change map keys or billing. Snapshot assets/server, deploy the committed build, restart only TravelM, verify artifact hashes, local and public routes, catalog framing and module responses. Browser interaction remains unavailable in Work settings.
