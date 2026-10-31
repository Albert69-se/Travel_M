# Discover UI implementation plan

## Mobile details and map follow-up
Objective: open details without losing the user's place in the results and provide a Google map with satellite imagery. The catalog iframe is promoted to a viewport panel on mobile while the parent preserves its scroll position; the embedded catalog retains its list and existing place photos. Replace the catalog's Leaflet map with Google Maps using the existing browser-key configuration, add clear map/satellite controls and an unavailable state. Validate list restoration, the map and satellite switch, build, lint, and existing tests. Existing catalog records and their source disclosures are preserved.

## Objective
Overhaul the active `/catalog/index.html` Discover experience and prevent photo overflow.

## Relevant files and current behavior
`index.html` redirects Discover through `public/catalog/discover-bridge.mjs`. The active catalog uses `catalog-app.mjs`, `catalog.css`, and `catalog-photos.mjs`. Existing uncommitted catalog/weather work is preserved. Photos rely on percentage sizing in flexible containers; mobile details sit after the entire list.

## Target behavior / success criteria
Responsive photo cards with strictly contained images; readable filters and counts; deliberate selection with a return-to-results control; filtered selections never show stale details; usable empty/loading states; map/save/trip actions retained.

## Constraints and risks
No dependencies, data-source migration, credentials, deployment, or unrelated changes. Current catalog differs from older Google-only project notes; preserve current implementation and truthful attribution. Validate large loaded images as well as missing images. External map/photo availability is independent of layout.

## Steps
1. Rework card layout, photo containment, toolbar and detail presentation.
2. Add selection/back behavior, filter reset and result announcements.
3. Run build, lint, existing tests and desktop/mobile browser checks.

## Validation
Check 390px, 768px and 1440px widths; oversized loaded photos; search/filter/empty/reset, pagination, selection/back, save guest state and map mode. Inspect screenshots and final diff.

## Progress
- Inspection complete; active catalog identified.
- User clarified: use the main app sidebar and carry over the complete TravelM wordmark font/weight/spacing/colors.
- Removed outbound Discover redirect. React now hosts the maintained catalog in an auto-sized same-origin frame, preserving catalog actions and shared local storage without duplicating the catalog implementation. Standalone catalog URLs redirect into the app. The catalog's duplicate navigation is hidden when embedded.
- Added storage-event refresh in the app provider so catalog saves/trip additions are immediately visible in app state.
- Build passed; 70 core tests and 8 catalog tests passed. Lint passed with five existing warnings.
- Browser checks passed at 1440, 768 and 390px: oversized image containment, no horizontal overflow, selection/back, empty/reset, province/category filtering, pagination, guest save messaging. Desktop/mobile screenshots inspected.
- Final browser checks passed: signed-in catalog saves appear under Saved places without reloading; the live map initializes inside the app shell and returns to browsing. `git diff --check` passed. Changes are local, not deployed.
