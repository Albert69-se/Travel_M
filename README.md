# Travel M — trip planner prototype

A small travel-planning web application for the Software Engineering course project
(Team 04 · Apollo). Built to the Week 3/5 requirement set in `Team04_M2_SRS.pdf`, and
laid out from the low-fidelity wireframes in the Figma file
`tpG5r8u58db4RveTTINIku` ("Travel M — Responsive Low-Fidelity Wireframes").

Plain HTML, CSS, and JavaScript ES modules. There is no framework, no build step, and
no backend.

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
sample trip's place (Doi Suthep) carries real coordinates. The provider sits behind a
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

## Places and provenance

Place records carry `sourceReference`, `lastCheckedAt`, and `contentStatus`. Every
sample record in this prototype is deliberately marked as unverified — the interface
says *"Not supplied"*, *"Not verified"* or *"Estimate only"* rather than presenting a
guess as a fact. This follows FR-3.5/3.6 and NFR-9, which require sourced information
and an explicit last-checked date.

There is **no map integration yet**: the interface shows a labelled map placeholder.
The map provider is the one dependency that requires credentials.

## Data storage

Everything is stored in the browser's `localStorage` under a few named keys
(`travelm.users`, `travelm.session`, `travelm.trips`, `travelm.expenses`, and so on).
Nothing is sent anywhere. Data survives a page refresh in the same browser, and the
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
calculations, the 80% nearing-budget threshold, place filtering, empty datasets,
registration validation, password hashing and verification, session resolution, and
cross-user access refusal.

Core logic is kept independent of the DOM so it can be tested directly.

## Project structure

```
travel-m/
├── index.html            entry point and page structure
├── css/style.css         all styling and responsive rules
├── js/
│   ├── app.js            initialisation, session handling, navigation, rendering
│   ├── auth.js           registration, PBKDF2 hashing, sign-in, sessions
│   ├── storage.js        all localStorage reads and writes
│   ├── data.js           sample places, categories, and seed records
│   ├── places.js         search, filtering, saved-place links, provenance wording
│   ├── trips.js          trip validation, create/edit/delete, cascade delete
│   ├── itinerary.js      activities by trip day, ordering, validation
│   ├── packing.js        per-trip checklist and counts
│   ├── expenses.js       expenses, totals, remaining budget, budget status
│   ├── weather.js        optional weather provider adapter
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
3. **No map.** A placeholder is shown where the map belongs.
4. **Place records are samples.** They are not verified facts and must not be presented
   as such.

## Course note

The M2 SRS records the rule that AI assistance must be logged and reviewed by the team,
and that every requirement must be explainable in the oral exam. Any assistance used in
building this application needs an entry in that log before submission.
