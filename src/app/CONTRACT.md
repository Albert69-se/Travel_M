# Travel M (React) — build contract

Read this before writing any view. Everything described here already exists on disk
and is verified. Do not add dependencies, do not restructure it, do not rewrite files
outside the ones you were asked to write.

## 1. Design system

The October 2026 UX overhaul supersedes the original Stitch visual constraints.
`src/styles/index.css` owns the Tailwind tokens and shared workspace classes. Use
warm paper surfaces, forest-green actions, readable UI text and system-serif
editorial headings. Discover's embedded catalog matches these in
`public/catalog/catalog.css`. Keep both themes consistent when changing tokens.

- Use semantic tokens for surfaces, text, accent and feedback.
- Main controls and form inputs are 44px tall; mobile text inputs are at least 16px.
- Shared primitives in `components/ui.jsx` provide visible focus and associated field errors.
- Preserve real photo attribution and honest placeholders. Do not invent ratings or place facts.
- The home search and destination shortcuts use validated URL filters in
  `public/catalog/catalog-navigation.mjs`.

## 2. Primitives — `src/app/components/ui.jsx`

```jsx
import { Button, IconButton, Card, CardHeader, Divider, Row, Chip, SegmentedControl, Badge,
         ProgressBar, Stat, KeyValue, Field, TextInput, TextArea, Select, Checkbox, Notice,
         EmptyState, FinePrint } from '../components/ui.jsx';
import { PlacePhoto } from '../components/PlacePhoto.jsx';
import { PlaceThumb } from '../components/PlaceThumb.jsx';
import { MapPanel } from '../components/MapPanel.jsx';
```

- `Button({variant:'primary'|'secondary'|'ghost'|'danger'|'dangerOutline', size:'md'|'sm', icon, trailingIcon})`
- `IconButton({icon, label, size})` — icon-only; `label` is required (a11y)
- `Card({padded=true, className})`, `CardHeader({title, meta, action})`, `Divider`, `Row` (dense hairline row)
- `Chip({selected, onClick})`, `SegmentedControl({options:[{value,label,icon}], value, onChange, label})`
- `Badge({tone:'neutral'|'accent'|'success'|'warning'|'danger'})`
- `ProgressBar({value, max, tone, label})`, `Stat({label, value, hint, tone, progress:{value,max,tone,label}})`
- `KeyValue({label})` — label left, value right
- `Field({label, htmlFor, error, hint})` — wraps exactly one control and renders its error
- `TextInput`, `TextArea`, `Select`, `Checkbox({label})` — design-system styled, 34px
- `Notice({tone:'info'|'warning'|'danger'|'accent', icon})` — provenance and limitation text
- `EmptyState({icon, title, description, action})`, `FinePrint` (uppercase micro text)
- `PlacePhoto({place, size})` — the place's photograph, hotlinked from Wikimedia Commons via the
  record's `image` field; falls back to `PlaceThumb` when a record has none or the image fails
- `PlaceThumb({place, size})` — generated category tile, the fallback for records with no photograph
- `MapPanel({places, subject, onOpenPlace, heightClass})` — the only way to render a map

## 3. Data — `src/app/lib/store.jsx`

```jsx
import { useData, useTripData } from '../lib/store.jsx';
```

`useData()` → `{ ready, status, setStatus(message, tone), user, users, places, savedPlaces, trips,
itinerary, packing, expenses, signIn({email,password}), signInAsDemo(), register(input), signOut(),
isPlaceSaved(placeId), toggleSavedPlace(placeId), createTrip(input), updateTrip(tripId,input),
deleteTrip(tripId), addActivity(trip,input), updateActivity(trip,activityId,input),
deleteActivity(activityId), moveActivity(tripId,activityId,'up'|'down'), addPackingItem(tripId,name),
togglePackingItem(itemId), renamePackingItem(itemId,name), deletePackingItem(itemId),
suggestPackingItems(tripId), addExpense(tripId,input), updateExpense(expenseId,input),
deleteExpense(expenseId), resetData() }`

Every mutating call returns `{ ok: true }` or `{ ok: false, errors: { field: 'message' } }`. Render the
returned messages; do not write your own validation wording. `user` is `null` for a guest.

`useTripData(tripId)` → `{ trip, activities, activityGroups, packing, packingCounts:{packed,total,remaining},
expenses, spent, remaining, budget:{level:'ok'|'nearing'|'over'|'unknown', label, percentSpent, message},
categoryTotals:[{category,amount}], days:[isoDate] }`

`src/app/lib/format.js` → `money(amount)`, `shortDate(iso)`, `weekdayDate(iso)` ("Wed 12 Nov"),
`dateRange(start,end)`, `dayCountLabel(trip)` ("4 days · 3 nights"), `countdownLabel(startDate)`,
`tripDates(trip)`, `categoryColour(category)` (a `bg-*` class for a category dot),
`percentage(part,whole)`, `titleCase`.

## 4. Routes — `src/App.jsx` already imports these files

Each file must exist and **default-export** the named component:

| File | Default export | Route |
|---|---|---|
| `src/app/views/Home.jsx` | `HomeView` | `/` |
| `src/app/views/Discover.jsx` | `DiscoverView` | `/discover` |
| `src/app/views/PlaceDetail.jsx` | `PlaceDetailView` | `/discover/:placeId` |
| `src/app/views/SavedPlaces.jsx` | `SavedPlacesView` | `/saved` (signed in) |
| `src/app/views/Trips.jsx` | `TripsView` | `/trips` (signed in) |
| `src/app/views/TripLayout.jsx` | `TripLayout` | `/trips/:tripId` (signed in) |
| `src/app/views/TripOverview.jsx` | `TripOverviewView` | `/trips/:tripId` index |
| `src/app/views/Itinerary.jsx` | `ItineraryView` | `/trips/:tripId/itinerary` |
| `src/app/views/Packing.jsx` | `PackingView` | `/trips/:tripId/packing` |
| `src/app/views/Expenses.jsx` | `ExpensesView` | `/trips/:tripId/expenses` |
| `src/app/views/Weather.jsx` | `WeatherView` | `/trips/:tripId/weather` |
| `src/app/views/Account.jsx` | `AccountView` | `/account` |
| `src/app/views/SignIn.jsx` | `SignInView` | `/signin` |
| `src/app/views/Register.jsx` | `RegisterView` | `/register` |
| `src/app/views/NotFound.jsx` | `NotFoundView` | `*` |

Routing imports: `Link`, `NavLink`, `useNavigate`, `useParams`, `useOutletContext`, `useLocation`
from `react-router-dom`.

**Trip sub-pages take their data from the layout's outlet context**, never by re-deriving it:

```jsx
// TripLayout.jsx
const { tripId } = useParams();
const tripData = useTripData(tripId);
if (!tripData.trip) return <EmptyState title="Trip not found" … />;
return (
  <>
    <header>…</header>
    <nav>…tabs…</nav>
    <Outlet context={tripData} />
  </>
);

// Itinerary.jsx / Packing.jsx / Expenses.jsx / Weather.jsx / TripOverview.jsx
const { trip, activities, activityGroups, packing, packingCounts, expenses, spent,
        remaining, budget, categoryTotals, days } = useOutletContext();
```

TripLayout owns the breadcrumb ("My trips /"), the `text-title` trip name, the
`dateRange` + `dayCountLabel` subtitle, the Edit/Delete trip actions, and the tab bar
(Overview, Itinerary, Packing, Expenses, Weather) built from `<NavLink>`s with `end` on the
index tab. Guests never reach these routes.

## 5. Real record fields — never invent any

```
Place     { id, name, locality, administrativeArea, countryCode, category, description,
            estimatedCost, estimatedCostNote, latitude, longitude,
            sourceReference, lastCheckedAt, contentStatus,
            image? { thumb, large, credit, licence, source } }   ← sample records only
Categories PLACE_CATEGORIES = ['All','Nature','Culture','Food']   ← the filter chips, exactly these
Trip      { id, userId, name, destinationId, destinationLabel, startDate, endDate,
            expectedBudget, currencyCode, createdAt, updatedAt }
Activity  { id, tripId, placeId|null, title, date, notes, estimatedCost, orderIndex }
Packing   { id, tripId, name, isPacked }
Expense   { id, tripId, description, amount, category, date, notes }
ExpenseTypes = ['Food','Transport','Accommodation','Tickets','Shopping','Other']
```

Hard rules:

1. **An activity has one date, not a time range.** There is no clock time and no duration in the
   model — never render one. Day grouping comes from `activityGroups` (`[{date, items}]`).
2. **No ratings; photographs are credited.** A place's `image` field carries `thumb` and `large`
   (hotlinks to the Wikimedia Commons thumbnail CDN — nothing is stored or proxied by this project)
   plus the `credit`, `licence` and `source` the licence requires; show the credit wherever the
   photograph appears. Use `PlacePhoto` — which falls back to `PlaceThumb` — for visual identity,
   and the provenance fields for trust. No record has a star score.
3. **Provenance travels with the record.** `describeProvenance(place)` in `src/core/places.js` returns
   `{ source, checked, status }` — show it on place details. Never present a sample record as verified.
4. **Data warnings stay honest**: every screen that shows place records states their standing. Both the
   sample records and the generated OpenStreetMap import are "not field-verified", and an imported
   record must never read as if someone checked it on the ground.
5. Expense category breakdowns may only contain categories that exist in the records.
6. Budget maths comes from `useTripData` — never re-implement it. The `nearing` (≥80%) and `over`
   levels must be stated in text, not signalled by colour alone.
7. Weather: call `getWeatherForPlace(place, startDate, endDate)` from `src/core/weather.js` inside a
   `useEffect`, and handle all three shapes:
   `ok` → `{ provider, retrievedAt, validFor, current:{temperature, precipitation, condition},
   days:[{date, maxTemperature, minTemperature, precipitation, condition}], note }`;
   `unavailable` → `{ message }`; `error` → `{ message }`. Each gets its own visible state. Never show
   an empty box and never invent a temperature.
8. Maps: only via `MapPanel`, using Google Maps with no OSM fallback. Explain Google load failures;
   an empty result set still shows a map for device location. Discovery uses Google Places records
   in memory, with Google attribution and exact-ID photo lookups. Stop GPS watches on unmount.

## 6. Layout and responsiveness

The shared shell uses a 240px desktop sidebar above 1100px, an 80px icon rail
at 768–1100px, and a mobile header with bottom navigation below 768px. Mobile
navigation and notifications account for safe-area insets. Trip sections live
inside the trip workspace; the sidebar offers one contextual trip shortcut.

Views render their own content inside `.tm-main`. Headers use the shared type
scale; landing-page editorial headings may use the system serif stack. Grids
must collapse without horizontal page overflow at 320px. Prefer natural page
scrolling for place collections. Keep horizontal trip tabs accessible on mobile.
Use named controls, explicit field labels and visible focus states.

Discover's mobile detail panel must remain isolated and restore the parent's
browsing scroll position on close. Preserve Map/Satellite controls and actual
Google hybrid map mode. Catalog records currently retain their existing OSM
attribution; do not mislabel these as Google-sourced records.

## 7. Verify before you report

Run `npm run lint`, `npm test`, `npm run build`, and
`node --test server/catalog.test.mjs server/static-server.test.mjs`.
Server tests require permission to bind a local port. Use the browser to inspect
desktop/tablet/mobile layouts and end-to-end flows when browser access is enabled.
If it is disabled, report that limitation explicitly; automated checks are not
proof of visual correctness. See `docs/EXECPLAN_UX_OVERHAUL.md` for the audit.
