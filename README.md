# Travel M — trip planner prototype

A small travel-planning web application for the Software Engineering course project
(Team 04 · Apollo). Built to the Week 3/5 requirement set in `Team04_M2_SRS.pdf`, and
laid out from the low-fidelity wireframes in the Figma file
`tpG5r8u58db4RveTTINIku` ("Travel M — Responsive Low-Fidelity Wireframes").

Plain HTML, CSS, and JavaScript ES modules. There is no framework, no build step,
and no backend. Leaflet is loaded from a version- and integrity-pinned CDN URL.
Google Maps is an optional second map provider for the course demo.

## Running it locally

JavaScript modules do not work over `file://`, so serve the folder:

```bash
cd travel-m            # or wherever you cloned this repository
python3 -m http.server 8199
```

Then open <http://localhost:8199/> in a browser. Any static server works — in VS Code,
the Live Server extension is fine.

## What it does

The application starts in a **guest view**. Guests can browse and search places and
open place details. Planning data belongs to a signed-in traveller, so to see the rest,
click **Log in**. From there you can either **Log in with demo account** — the sample
trip and its records belong to that account — or **Create account** for a fresh,
empty planner of your own.

| Area | Guest | Signed in (demo account) |
|---|---|---|
| Home | overview, sign-in prompt | trip, budget, and weather summary |
| Discover places | list, keyword search, category filter, details | same, plus saving places |
| Saved Places | — | save and remove places, one entry per place |
| My Trips | — | create, edit, view, delete trips |
| Trip Itinerary | — | add, reorder, delete activities by trip day |
| Trip Packing List | — | add, tick off, remove items; packed/total counts |
| Trip Expenses | — | record expenses, totals, remaining budget, warnings |
| Trip Weather | — | loads through a provider adapter, or explains it is unavailable |
| Places map | drawn for the search results, and for a single place on its details page — or the reason it is missing | same |

## Accounts and sign-in

Authentication runs entirely in the browser, with no server. That is enough for the
prototype, and it is enough to demonstrate the two requirements that need accounts:

- **NFR-4 (other users' records are inaccessible).** Every record carries a `userId`,
  and the data layer — not just the interface — refuses to read, edit, or delete a
  record that belongs to somebody else. Create a second account and you will see an
  empty planner rather than the demo account's trip.
- **NFR-6 (records survive signing out and back in).** The session is remembered in
  `localStorage`, and trips, expenses, packing lists, and saved places are keyed to the
  account that owns them.

What it does properly: registration validation, case-insensitive unique emails, salted
**PBKDF2-HMAC-SHA256** password hashing (120,000 iterations), constant-time comparison,
and a generic "Email or password is incorrect" message so the form cannot be used to
discover which emails exist. A password is never stored as text.

What it is not: real security. The records live in this browser's `localStorage`, so
anyone with access to the browser profile can read them, and a production system needs
server-side authentication with a slow password hash. The interface says so.

Demo credentials, published in the interface on purpose: `demo@travelm.local` /
`demo-pass-1234`.

## Weather

Weather is **on by default** and needs no API key — the provider is Open-Meteo, and the
sample trip's place (Doi Suthep) carries sample coordinates. New trips can optionally
select a reference place from the local catalog; a trip with no reference place can use
the first place linked to its itinerary. If no place with coordinates is available, the
weather feature reports that it is unavailable instead of inventing a location.
The provider sits behind a
small adapter in `js/weather.js` so it can be swapped without touching anything else.

The three outcomes are handled distinctly, and a failure never affects stored trip data:

- `ok` — current conditions plus the forecast days that fall inside the trip range
- `unavailable` — no coordinates, or the provider deliberately switched off
- `error` — the request failed, shown with the reason

`ACTIVE_WEATHER_MODE` can be set back to `WEATHER_MODES.NONE` to demonstrate the
offline "provider is not connected" state.

One honest detail worth knowing before you demo it: Open-Meteo forecasts roughly
**16 days ahead**, and the sample trip is 12–15 November 2026. Whenever the trip is
further away than that, the screen shows current conditions for the destination plus an
explicit note that no forecast covers those dates. It never displays a guess.

The same adapter also supplies **current conditions for a single place**, on that place's
details page, beside its map pin. Day-by-day forecasts stay on the trip's Weather tab.

## Maps — Google demo key or keyless OpenStreetMap

**Google Maps is configured for the local Mac prototype** through a file excluded
from Git: `js/maps-config.local.json`. In another checkout, create that file with:

```json
{ "apiKey": "YOUR_GOOGLE_MAPS_DEMO_KEY" }
```

When this file exists and contains a key, Travel-M loads the **Google Maps
JavaScript API** on Discover and place-detail maps. It uses only map rendering
and markers; it does not call the paid Places/Routes services in the background.
If the map script fails to load or the key is rejected, the app attempts
**Leaflet + OpenStreetMap** instead. Without the local configuration file,
Leaflet is the default.

**Security:** This config is gitignored to prevent accidentally publishing your
key in source control, but a browser map key is **not secret**: anyone who visits
the hosted site can see it in the request. Restrict the key to the Maps JavaScript
API and the approved HTTP referrers in Google Cloud, including the exact host
used for your local demo. Rotate any publicly shared key before deployment.
Google's Maps Demo Key is for **prototyping, not public production**, and has
daily usage limits. Never place a server API key in this client-side file.

**View on Google Maps** and **Get directions** links on the place-detail page
use Google's official Maps URLs, which require no API key. Link destinations
are based on Travel-M sample coordinates until the place has been verified.

The backup map needs no key: **Leaflet** renders **OpenStreetMap** tiles.
Leaflet is loaded from a pinned CDN URL in `index.html`,
and the interface checks that it arrived before drawing anything.

The map appears in two places, both through the same adapter in `js/map.js`:

- **Discover** — one marker per search result, so a change of filter is visible on the map.
  Clicking a marker opens a popup with the place's coordinates and a control that opens its
  details.
- **Place details** — the place on its own.

Markers are drawn as circles rather than image pins, so there are no icon assets that can go
missing, and popups are built from DOM nodes with `textContent`, never from an HTML string.

Three situations are handled distinctly, and none of them is shown as an empty grey box:

- **the provider is switched off** — `ACTIVE_MAP_MODE = MAP_MODES.NONE`, the offline demo
  state, alongside `WEATHER_MODES.NONE`
- **Leaflet did not load**, for example when the page is offline — said plainly, and the
  places are still listed with their recorded coordinates
- **a record has no usable coordinates** — including a record whose latitude or longitude
  is present but out of range, which is left off the map rather than pinned at 0,0

Two limits worth knowing before a demo: the tiles come from the OpenStreetMap Foundation's
public tile servers, which expect light use and are not a free CDN for a product; and the
pin positions come from this prototype's sample coordinates, so nothing has been
field-verified. Both are stated in the interface as well as here.

## Data sources and licences

| Source | Used for | Licence and terms |
|---|---|---|
| [Leaflet](https://leafletjs.com/) 1.9.4 | map rendering | BSD-2-Clause |
| [OpenStreetMap](https://www.openstreetmap.org/copyright) standard tiles | map imagery | © OpenStreetMap contributors, ODbL, subject to the tile usage policy |
| [Google Maps JavaScript API](https://developers.google.com/maps/documentation/javascript) (optional demo key) | map rendering and markers | Google Maps Platform Terms; demo keys for prototyping only |
| [Open-Meteo](https://open-meteo.com/) | current conditions and forecast | CC BY 4.0, free for non-commercial use, no key |

Map and weather provider credits appear in the interface: OpenStreetMap attribution
on Leaflet, Google's own map attribution on Google Maps, and the provider line
above each forecast.

## Places and provenance

Place records carry `sourceReference`, `lastCheckedAt`, and `contentStatus`. Every
sample record in this prototype is deliberately marked as unverified — the interface
says *"Not supplied"*, *"Not verified"* or *"Estimate only"* rather than presenting a
guess as a fact. This follows FR-3.5/3.6 and NFR-9, which require sourced information
and an explicit last-checked date.

Every place carries `latitude` and `longitude`, so any place can be drawn on a map. The
provider, and what it does when it cannot draw one, is described under **Maps** above.

## Data storage

Everything is stored in the browser's `localStorage` under a few named keys
(`travelm.users`, `travelm.session`, `travelm.trips`, `travelm.expenses`, and so on).
Trip/account records are stored only in the browser; external map tile and weather
requests go to their respective providers, and using the optional Google provider
sends the browser key and map requests to Google. Data survives a page refresh in the same browser, and the
footer has a **Reset sample data** button.

Sample data is seeded on first run: eight places, one trip (Chiang Mai, 12–15 Nov,
THB 5,000), three expenses totalling THB 1,950, and a five-item packing list — the same
figures as the wireframes.

## Tests

```bash
node --test
```

Uses Node's built-in test runner, so there is no testing dependency. The tests cover
trip validation, invalid date ranges, unique id generation, itinerary add/remove/reorder,
packing updates and trip isolation, expense validation, total and remaining-budget
calculations, the 80% nearing-budget threshold, place filtering, empty datasets, map
coordinate validation, the four distinct reasons a map is not drawn, map bounds, coordinate
formatting, registration validation, password hashing and verification, session resolution,
and cross-user access refusal.

Core logic is kept independent of the DOM, including the map adapter's decision logic, so
it can be tested directly.

## Project structure

```
travel-m/
├── index.html            entry point, page structure, and the Leaflet CDN link
├── css/style.css         all styling and responsive rules
├── js/
│   ├── app.js            initialisation, session handling, navigation, rendering
│   ├── auth.js           registration, PBKDF2 hashing, sign-in, sessions
│   ├── storage.js        all localStorage reads and writes
│   ├── data.js           sample places, categories, and seed records
│   ├── places.js         search, filtering, saved-place links, provenance wording
│   ├── map.js            map provider adapter: Leaflet, OpenStreetMap tiles, fallbacks
│   ├── google-maps.js     optional Google Maps demo provider and keyless Maps URLs
│   ├── trips.js          trip validation, create/edit/delete, cascade delete
│   ├── itinerary.js      activities by trip day, ordering, validation
│   ├── packing.js        per-trip checklist and counts
│   ├── expenses.js       expenses, totals, remaining budget, budget status
│   ├── weather.js        weather provider adapter: Open-Meteo
│   └── utils.js          validation, id generation, date and money helpers
├── tests/logic.test.js   tests for the core logic
└── README.md
```

The requirement documents that define this prototype are `Team04_M1_Charter.pdf` and
`Team04_M2_SRS.pdf`, both kept in the repository root. Earlier requirement drafts and the
destination data templates are not part of this repository.

## Known limitations

These are deliberate and should be stated rather than hidden:

1. **No server, and accounts are local to this browser.** Authentication, sessions, and
   per-user isolation are genuinely enforced (NFR-4 and NFR-6 hold within one browser),
   but `localStorage` is readable by anyone with access to the browser profile, and data
   cannot be shared between devices. Real accounts need a server and a slow password
   hash.
2. **No real user accounts beyond this prototype's local records.** Signing in on another
   device will not find them.
3. **Map tiles need the network.** Leaflet and OpenStreetMap need no credentials, but
   tiles are fetched from OpenStreetMap's public servers as the map is viewed. Offline,
   the map is replaced by a labelled explanation. Those servers are not intended for heavy
   or commercial traffic, so a production build would need its own tile source or a paid
   provider.
4. **Place records are samples.** They are not verified facts and must not be presented
   as such.

## Course note

The M2 SRS records the rule that AI assistance must be logged and reviewed by the team,
and that every requirement must be explainable in the oral exam. Any assistance used in
building this application needs an entry in that log before submission.
