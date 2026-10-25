# Travel M — React build

A trip planner: browse places, save them, plan trips day by day, keep a packing
list, track a budget and read a forecast. This is the **React** build of the
prototype that lives in [`Travel_M`](../Travel_M).

Live: <https://travel-m.xcalibur.space>

## Current source changes — 26 October 2026

Source: https://github.com/Albert69-se/Travel_M_React (student account; separate from the legacy Travel_M repository).

- Redesigned warm-neutral/teal shell, illustrated home page, larger controls and responsive Discover workspace.
- Country maps show numbered regional groups. Selecting a group zooms in; **Show on map** focuses a card; **All results** restores the result bounds. These controls use Google Maps.
- **Use my location** starts a high-accuracy browser position watch on demand. A blue dot and accuracy circle update as the device moves. Recenter and stop controls are available. Permission denial is explained; temporary signal loss clears the stale marker and waits for a new fix. HTTPS (or localhost) and device permission are required. Coordinates stay in memory, are not saved to account records, and the map provider receives the viewport needed to display the area.
- Maps and discovery now use Google only, with explicit unavailable states. Empty search results still allow a map and live GPS. Each map owns its cleanup and stops the location watch when closed.
- `npm test` covers location lifecycle, Google catalog normalization, deduplication and partial/error results alongside the existing app rules. Current work and validation are recorded in `docs/EXECPLAN_GPS_CATALOG.md`.

### Place photos and Google keys

Google's demo key excludes user-submitted photos. In demo-key mode, TravelM
skips inaccessible Google photo requests and lazily attempts a Wikimedia
Commons photo from a nearby, strongly matching Wikipedia article. The Commons
file's artist, licence and source link are shown. Uncertain matches, missing
licences and network failures keep an honest category illustration instead.
Lookup concurrency is limited, and results are cached only in memory. Not
every attraction has a suitable Wikimedia photograph.

For API photos, an authorized standard key can be configured locally as `VITE_GOOGLE_MAPS_API_KEY` with Maps JavaScript API and Places API (New) enabled, appropriate HTTP-referrer/API restrictions and billing. That key takes precedence over `VITE_GOOGLE_MAPS_DEMO_KEY`. No credentials or billing configuration are changed by this release. Existing evaluation deployment safeguards remain in place; ordinary deployment of a standard-key build still requires explicit review of the deploy script's browser-key guard.

With an authorized standard key, exact-ID Google photos take precedence and
include contributor credits; the Commons lookup is the fallback. Google photo
URLs and metadata are not persisted. Existing credited sample images remain
available. Do not commit `.env.local` or any key; Vite browser keys are
visible in deployed bundles by design.

## Stack

| Concern | Choice |
|---|---|
| Build | Vite 8 |
| UI | React 19 + React Router 7 (`BrowserRouter`, real URLs) |
| Styling | Tailwind CSS v4 with the design tokens in `src/styles/index.css` |
| Icons | `lucide-react`, 1.5px stroked |
| Maps | Google Maps JavaScript API; no OpenStreetMap fallback |
| Photographs | Google Places on an authorized standard key; nearby identity-matched Wikipedia/Wikimedia Commons as free, credited fallback; category tile otherwise |
| Place data | Up to 200 distinct live Google Places attractions across Thailand; exact Google IDs for saved references |
| Weather | Open-Meteo, no API key |
| Storage | `localStorage`, no backend |
| Tests | Node's built-in runner (`node --test`) |

## Running it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # -> dist/
npm test         # core-logic tests
npm run preview  # serve the built app locally
```

### Google Maps integration (hosted course evaluation)

The app supports Google's **Maps Demo Key** for development/testing without a
Cloud billing account. Create a gitignored `.env.local` alongside `package.json`:

```text
VITE_GOOGLE_MAPS_DEMO_KEY=your_demo_key_here
```

Run `npm run dev` and open Discover or a place detail. The app loads Google
Maps on demand, shows regional count groups below zoom 10, and renders at most 40
visible markers at city-level zoom. It uses `DEMO_MAP_ID` for advanced markers. If Google is unavailable, the app explains the failure and does not switch providers. Place detail also provides keyless official Google
Maps links for viewing a location and getting directions.

The hosted classroom-evaluation build at
`https://travel-m.xcalibur.space` currently uses Google Maps by default.
Deploy this nonproduction evaluation explicitly with
`bash scripts/deploy.sh --evaluation-google`. Ordinary deployment is still
blocked while a demo key is configured.

**Not production licensed:** Google's [Maps Demo Project
terms](https://cloud.google.com/terms/maps-platform/demo-project-terms)
allow evaluation/testing only; production use is prohibited. Any Vite
`VITE_*` value is embedded in the public JavaScript bundle and can be seen
by visitors, even when the source `.env.local` file is gitignored.
Restrict/rotate keys as appropriate. For a production release, obtain a
properly API- and referrer-restricted standard Google Maps key with billing
enabled.

The corrected React code now validates calendar dates strictly and refuses
expenses that would round to zero. Tests: `node --test tests/logic.test.js`.
Browser demo smoke test: `bash scripts/with-playwright.sh google-demo-smoke.py
http://127.0.0.1:5180` while Vite runs on port 5180.

## The design came from Stitch

The interface was generated in Stitch and then built as React components, so the
visual system is a real artifact rather than an ad-hoc theme:

- Project `14201776433585101988` — *Travel M — Modern Trip Planner (React)*
- Design system `assets/99888471b4ff4ab4b9190b071556c735` ("Travel M")
- Screens: Home dashboard, Discover places, Itinerary & Packing, Expenses (desktop)
  plus Home, Discover and Trip (mobile)

The original Stitch exports remain in `design/stitch/` as design history. The refreshed interface uses a warm neutral canvas, white cards, teal accents, larger controls and a map-led discovery layout. `src/styles/index.css` holds the shared tokens and responsive rules.

## Where the logic came from

`src/core/` is the prototype's DOM-free logic:
`utils`, `storage`, `data`, `places`, `trips`, `itinerary`, `packing`, `expenses`,
`weather`, `auth`, `map`. Validation, PBKDF2 password hashing, per-user record
isolation, budget maths, the 80% "nearing budget" threshold, and the map adapter's
"why is there no map" decision function are the same code the prototype's tests
cover. The `province` filter lives in `places.js`; `google-places.js` normalizes API records and runs bounded discovery. Original sample/editorial IDs remain available for existing trips, outside public discovery. The retired OSM loader is no longer called by the application. `tests/logic.test.js` covers these rules.

`src/app/lib/store.jsx` is the only place that touches `localStorage`: it calls a
core function, stores the collection it returns, and re-reads the snapshot, so
React state can never drift from the stored records.

## Places: 200 Google Maps attractions

Discover loads live Google Places API (New) results from regional attraction searches,
deduplicates by place ID, and stops at 200 valid Thai attractions. Each search requests
at most 20 results; the whole run is bounded to 22 regional queries. Partial results,
authorization/network failures and quota errors are visible, with an explicit retry.
Counts reflect actual returned places, with no demo or generated filler. Results and
coordinates can change with Google rankings. Province names come from Google's address
components, not editorial guesses.

Google content stays in memory for the current tab. Saved places and trip destinations
keep stable `google-*` IDs, and details are fetched again if a saved ID is absent from
current discovery. Original sample/editorial records remain available to old trips but
are not counted in Discover. The OSM dataset/import tools remain historical files;
no application route fetches OSM data or tiles. Historical `osm-*` bookmarks are not
automatically converted to Google IDs.

See [Google Text Search](https://developers.google.com/maps/documentation/javascript/place-search)
and [Places attribution and storage rules](https://developers.google.com/maps/documentation/places/web-service/policies).

### Google Places photos and marker visibility

When an authorized key is provided **and Places API (New) is enabled**, list
photos and large detail photos load lazily via the Maps JavaScript Places
library (the attraction's exact place ID, `fetchFields({fields:['photos']})`,
`getURI`). The app only keeps place ID matches in memory, never Google photo
URIs/metadata, and shows required contributor attributions. It limits to two
concurrent lookups to avoid burst requests. Missing photos or rejected Places
API calls use strictly matched, attributed Commons images where available;
otherwise honest category thumbnails (or credited legacy images). Google
Places searches and standard-key photo requests may incur charges and need
appropriately restricted keys; demo-key photos are not available.

At Thailand/regional zoom, **TravelM draws numbered geographic groups**; selecting one fits its places. At zoom 10+
only in-viewport results render, capped at 40 pins, refreshing on pan/zoom for
Google Maps. Single-place detail maps always retain
one pin.

### Historical OSM archive (not part of discovery)

- **Source.** OpenStreetMap, © OpenStreetMap contributors, licensed ODbL. The
  extract is filtered from the [Geofabrik Thailand
  extract](https://download.geofabrik.de/asia/thailand-latest.osm.pbf) with
  `osmium` (a build-time tool only). Every record names its source object in
  `sourceReference` and carries `contentStatus: 'imported'`.
- **What is included.** Named `tourism` (attraction, museum, viewpoint, zoo,
  theme park, gallery), `historic` (monument, ruins, archaeological site, fort,
  castle, city gate), `natural` (waterfall, beach, cave, peak, spring),
  `leisure=park`, `boundary=protected_area` and `amenity=marketplace` features,
  plus `amenity=place_of_worship` records carrying a `wikidata` or `heritage`
  tag — ordinary temples number in the tens of thousands and are not "popular
  places". This dataset is archived for backward compatibility; it no longer
  supplies the public Discover catalog or map.
- **Honesty.** Imported records are never presented as field-verified: the
  Discover header, the record pages and the provenance block all say so. The
  data is unscreened OSM — a coordinate for an area feature is a representative
  point, and each description reads "imported from OpenStreetMap, not verified
  on the ground".
- **Regenerate.** The script has two paths; both write the same file:

```bash
# Geofabrik extract (works when Overpass is saturated)
curl -L -o scripts/cache/thailand-latest.osm.pbf \
  https://download.geofabrik.de/asia/thailand-latest.osm.pbf
node scripts/fetch-thailand-places.mjs --pbf     # filter + export + normalise
node scripts/fetch-thailand-places.mjs --import  # re-normalise an existing export

# Overpass API (when the public instances are healthy)
node scripts/fetch-thailand-places.mjs --fetch
node scripts/fetch-thailand-places.mjs --build
```

Province boundaries for `administrativeArea` come from
[geoBoundaries](https://www.geoboundaries.org/) gbOpen THA ADM1 (boundary
source: OSM via Wambacher, ODbL). Raw downloads and the province cache live in
`scripts/cache/` and are not shipped.

## Structure

```
src/
├── core/                  DOM-free logic (prototype modules, featured.js, thailand.js)
├── styles/index.css       design tokens (@theme) + base + component classes
├── app/
│   ├── CONTRACT.md        the build contract the views were written against
│   ├── components/        ui.jsx (primitives), MapPanel, PlacePhoto, PlaceThumb
│   ├── layout/Shell.jsx   rail / icon rail / bottom tab bar + status toast
│   ├── lib/               store.jsx (data layer), format.js, hooks.js
│   └── views/             one file per route
├── App.jsx                routes
└── main.jsx               entry
server/                    static server + systemd unit + tunnel unit
scripts/build.sh           build, gated on all 15 view files existing
scripts/deploy.sh          build, ship, restart, verify
scripts/smoke.sh           HTTP checks against a running origin
scripts/e2e.py             browser checks (Playwright)
scripts/screenshots.py     screenshots of the live app
scripts/render_design.py   render the exported Stitch design at full size
scripts/with-playwright.sh run the above with a python that has Playwright
scripts/vps-tunnel-setup.sh  one-off tunnel + DNS route creation
scripts/fetch-thailand-places.mjs  build the Thailand dataset (see Places above)
tests/logic.test.js        core-logic suite
design/stitch/             Stitch exports (screen.png is only a 512x410 preview)
design/renders/            full-size renders of those screens
design/screenshots/        screenshots of the live app
public/data/               archived OSM dataset for backward compatibility only
```

## Routes

`/` · `/discover` · `/discover/:placeId` · `/saved` · `/trips` ·
`/trips/:tripId` (Overview) · `/trips/:tripId/itinerary` ·
`/trips/:tripId/packing` · `/trips/:tripId/expenses` · `/trips/:tripId/weather` ·
`/account` · `/signin` · `/register`

Planning data belongs to a signed-in traveller, so `/saved`, `/trips*` and their
sub-routes are guarded; browsing and search stay open to guests. Demo credentials,
published on purpose: `demo@travelm.local` / `demo-pass-1234`.

## Accounts

Authentication runs in the browser. It is real for a prototype — salted
PBKDF2-HMAC-SHA256 (120,000 iterations), constant-time comparison,
case-insensitive unique emails, and a generic "Email or password is incorrect." so
the form cannot be used to discover which addresses exist — and it is not real
security: the records live in this browser's `localStorage`, which anyone with
access to the browser profile can read. A production system needs server-side
accounts with a slow password hash.

Two requirements are genuinely demonstrated: NFR-4 (another account's records are
inaccessible — the data layer refuses them, not just the interface) and NFR-6
(records survive signing out and back in).

## Weather and maps

Weather is on by default and keyless (Open-Meteo), behind the adapter in
`src/core/weather.js`. Three outcomes are handled distinctly and never shown as an
empty box: `ok`, `unavailable` (no coordinates, or the provider deliberately
switched off), and `error` (the request failed, with the reason). Open-Meteo
forecasts roughly 16 days ahead; when the trip is further out, the screen shows
current conditions plus an explicit note that no forecast covers those dates. It
never displays a guess.

Maps use Google Maps in Discover and place details, including when filters return no
attractions. A failed Google connection is shown explicitly. GPS locations are supplied
by browser/device location services and are never saved to account storage.

## Honest differences from the generated design

The design and the data model do not fully agree, and the records win:

1. **Activity times and durations.** The design shows `09:00 – 11:00` and a `2h`
   badge. An itinerary activity has **one date** and no start/end time, so no clock
   time or duration is rendered anywhere. Day grouping is real.
2. **Place photographs.** Google Places photos are requested using each destination's
   exact ID, with contributor attribution. Missing or denied images use a category
   placeholder. The eight historical demo records retain their credited sample images.
3. **Categories.** The design shows six chips; the controlled vocabulary is
   `All, Nature, Culture, Food`, and that is what the filter renders. Expenses use
   the six real categories (`Food, Transport, Accommodation, Tickets, Shopping,
   Other`).
4. **Ratings and status badges.** No rating field exists, so none is shown. The
   provenance wording ("Not supplied", "Last checked: unknown", "needs update")
   comes from the records via `describeProvenance`.

## Hosting

Runs on `edux-oracle-vps` as two systemd **user** units, mirroring the existing
per-site pattern on that host:

| Piece | Value |
|---|---|
| App service | `travel-m-react.service` → `node server/static-server.js 8802 …/dist` on `127.0.0.1:8802` |
| Tunnel | `cloudflared-travel-m.service`, tunnel `c82a6b21-67bc-4022-a6e6-0bb6c5e84bbb` |
| Public URL | <https://travel-m.xcalibur.space> |
| App dir | `/home/opc/apps/travel-m-react` |

`server/static-server.js` is a dependency-free static server whose one job beyond
file serving is the SPA fallback: a request for `/trips/<id>/expenses` returns
`index.html` so the client router answers, instead of a 404. Hashed assets under
`assets/` are cached immutably; `index.html` never is.

Deploy:

```bash
./scripts/deploy.sh --evaluation-google # classroom evaluation only; build, rsync, restart, verify
./scripts/deploy.sh              # requires no embedded Google demo key
```

Verify:

```bash
node --test tests/logic.test.js                  # 59 core-logic tests
./scripts/smoke.sh                               # HTTP: routes, shell, cache headers
bash scripts/with-playwright.sh e2e.py           # browser E2E against the live URL
bash scripts/with-playwright.sh screenshots.py   # refresh design/screenshots/
```

Run the Playwright scripts through `scripts/with-playwright.sh`, not `python3`
directly: an interactive shell on this machine resolves `python3` to
`/usr/bin/python3` (3.9, where Playwright is installed in user-site), but a
detached or background shell puts Homebrew first and resolves it to Python 3.14,
where Playwright is absent — the same command then fails with a confusing
`ModuleNotFoundError`. The wrapper picks whichever interpreter can import
Playwright.

## Course note

The SRS requires AI assistance to be logged and reviewed, and every requirement to
be explainable in the oral exam. This build reuses the same reviewed logic modules
as the prototype; the new material is the presentation layer.
