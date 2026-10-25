# Travel M (React) — build contract

Read this before writing any view. Everything described here already exists on disk
and is verified. Do not add dependencies, do not restructure it, do not rewrite files
outside the ones you were asked to write.

## 1. Design system

Source of truth: `src/styles/index.css` (Tailwind v4 `@theme` tokens), generated from the
Stitch design system "Travel M". Use these Tailwind utilities only — no raw hex values in
class names, no gradients, no emoji, no decorative flourishes.

- Surfaces: `bg-canvas` `bg-surface` `bg-sunken` `border-line` `border-line-strong`
- Text: `text-ink` `text-ink-secondary` `text-ink-tertiary`
- Accent: `bg-accent` `text-accent` `bg-tint` `border-accent`
- Semantic: `text-success` `bg-success-bg` `text-warning` `bg-warning-bg` `text-danger` `bg-danger-bg`
- Type: `text-micro` (11px, uppercase micro-label) `text-label` (12px) `text-body` (13px)
  `text-base` (14px) `text-card-title` (15px) `text-section` (18px) `text-title` (24px)
  `text-metric` (22px, big numbers). Weights: `font-normal` `font-medium` `font-semibold` only — never bold.
- Geometry: `rounded-card` (12px, cards) `rounded-control` (8px, buttons/inputs) `rounded-chip` (pills)
- Elevation: `shadow-card` `shadow-popover` `shadow-modal`; the `.tm-card` class = white surface +
  1px hairline + card radius + micro shadow
- Money and counts: add `tm-numeric` (tabular figures)
- Focus: controls carry `.tm-focus`; icons are `lucide-react` at `size={15..18} strokeWidth={1.75}`

Density: list/table rows ≈44px, chips 26px, badges 20px, buttons and inputs 34px, card padding
`p-4`, spacing from an 8px grid (`gap-2`=8, `gap-3`=12, `gap-4`=16, `gap-6`=24).

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

The shell (`src/app/layout/Shell.jsx`) is built: a 228px rail on `lg`, a 64px icon rail on `md`, a 52px
bottom tab bar on phones, page content inside a `max-w-[1120px]` column, and a status toast. A view only
renders its own content.

- Every view starts with a page header: `text-title font-semibold text-ink` plus a
  `text-body text-ink-secondary` subtitle, actions right-aligned via
  `flex flex-wrap items-start justify-between gap-3`.
- Multi-column workspaces: `grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]`, collapsing to one
  column below `lg`. Nothing may overflow horizontally at 390px wide.
- Interactive targets ≥34px tall (rows 44px); real `<button>`/`<label>` elements; `aria-label` on
  icon-only controls; `role="alert"` on error text; `aria-live="polite"` on async results.
- Long lists scroll inside their card (`max-h-[560px] overflow-y-auto tm-scroll`), never the page.

## 7. Verify before you report

From `/Users/Xcalibur/Documents/GitHub/Travel_M_React` run
`npx oxlint src/app/views/<your-file>.jsx` and fix what it reports about your own files.
Do not run a production build — the parent runs it. Report only what you actually wrote and verified.
