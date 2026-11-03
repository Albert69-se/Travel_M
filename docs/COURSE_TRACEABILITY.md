# TravelM course traceability — working audit

This is a working map, not a declaration that every acceptance criterion passes. It uses the user-supplied `Team04_M2_SRS.pdf` (v2.0, 24 September 2026) and Team 04 Apollo charter. The charter uses five broader FRs with different numbers; this table uses the ten M2 SRS IDs. Verify the link in the class sheet and preserve the submitted documents. The React repository was renamed to `Albert69-se/Travel_M` on 3 November 2026.

The SRS describes FR-1–FR-10 as the MVP but does not present an explicit MoSCoW table. Confirm priorities with the team and lecturer rather than silently relabeling them. The table below links the problem to relevant design/implementation and tests. A code or unit-test reference is not proof of a complete browser flow.

| ID and problem | Screen / design and implementation | Evidence and open checks |
| --- | --- | --- |
| FR-1: attractions scattered across sources | Discover `/discover`, `src/app/views/Discover.jsx`, catalog in `public/catalog/` | Catalog normalization and bounded Google discovery: `tests/logic.test.js`. Verify live list, map and selection; network/key dependent. |
| FR-2: too many places to narrow down | Discover search, province and category controls | Core filter and catalog navigation tests. Verify all actual catalog controls and empty state in browser. |
| FR-3: incomplete destination information | Place detail `/discover/:placeId`, `PlaceDetail.jsx` | Google link, coordinates and matching-photo tests. Hours, fees, history and tips depend on available data; do not present absent facts as supplied. |
| FR-4: packing without weather information | Place detail and trip `/weather`, `Weather.jsx`, `src/core/weather.js` | `tests/weather-photos.test.js` covers beyond-forecast and provider failure. Verify current and trip-date screens with a working provider. Forecast coverage is limited; storm incidents are not established. |
| FR-5: trip details spread across notes | `/trips` and trip overview; `Trips.jsx`, `TripLayout.jsx`, `src/core/trips.js` | Create, edit and confirmed delete; validation and ownership tests. Edit date changes reject activities left outside the range. Verify the existing edit screen in browser and reconcile SRS wording about activities at creation. |
| FR-6: budget detached from trip | Trip form, overview and expenses | Core trip validation and expense calculation tests. Verify editing budget and immediately updated totals in browser. |
| FR-7: saved places do not form a daily plan | `/trips/:tripId/itinerary`, `Itinerary.jsx` | Activity date, ordering, move and removal tests. Verify adding a saved place, reordering and removal without deleting the place. |
| FR-8: packing is disconnected from planning | `/trips/:tripId/packing`, `Packing.jsx` | Add, toggle, rename, reorder, delete and standard suggestions; core tests cover several paths. A reordered sample item persisted after browser reload on 3 November 2026. Context-based suggestions are not implemented; the SRS says they *may* be drafted. |
| FR-9: expenses require manual calculation | `/trips/:tripId/expenses`, `Expenses.jsx` | Core positive amount, add/edit/delete and recalculation tests. Verify each control and rejected zero in browser. |
| FR-10: spending status is hard to see | Trip overview and expenses summary | Core tests cover category totals, 1,000 − 235 = 765, 80% threshold and overspending. No scheduled reminder is provided; clarify the title's reminder wording with the team. |

## Demo and validation checklist

1. On the intended laptop, run `npm install`, `npm run dev`, and open the displayed local URL. Sign in with **Try the demo**. The app requires a running Vite server locally; the hosted build also requires network access. Verify whether this meets the lecturer's browser/no-server expectation; a separately openable offline prototype is not currently established.
2. Walk each FR above, show its screen and explain the problem it addresses. Try an invalid trip date and a zero expense. Record the actual outcome, tester, date and environment, including any failure.
3. Confirm the rubric's complete charter, SRS, design document, at least two diagrams, data model, report, slides and AI statement exist in the correct team repository. Do not infer completion from this checklist.
4. Record honest AI assistance, human review, tests actually run and what was changed. Each team member should practice explaining every Must FR and their own work.

## Material limitations

- Accounts and data use browser localStorage. Application-level ownership checks are not server-side security; anyone with access to the browser profile can inspect or alter data. No cross-device persistence is established.
- Live places, map, photographs and weather depend on external services and configuration. A failure message is not an offline happy path. Avoid claiming tested availability, 50-user performance or a 99% uptime target without measured evidence.
- The local SRS mentions booking references in some NFRs while excluding booking transactions. No booking-reference flow was established in this audit; clarify the intended requirement.
- The rubric checklist describes a 2–3 page report, but its worked example describes 6–10 pages. Ask the lecturer which expectation applies.

## Suggested genuine team work

Each teammate can own a small, reviewable piece: Discover/place testing; trip/itinerary testing; packing/weather testing; expenses/accessibility testing and demo documentation. Record actual steps, environment, expected and observed results, and issue links. Each person should submit or review their own real work using their own account. Non-code work matters; do not manufacture attribution or historical evidence.
