/**
 * Discover places — the place browser.
 *
 * The screen owns two filter values and nothing else: search and category
 * matching are the core rule module's job (`findPlaces`), and the map draws one
 * marker per current result, so list and map can never disagree about which
 * records are on screen.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bookmark,
  BookmarkCheck,
  Info,
  List,
  Map as MapIcon,
  MapPinOff,
  MapPin,
  ArrowUpRight,
  RotateCcw,
  Search,
  SlidersHorizontal,
  TriangleAlert,
} from 'lucide-react';

import { MapPanel } from '../components/MapPanel.jsx';
import { PlacePhoto } from '../components/PlacePhoto.jsx';
import {
  Button,
  Card,
  Chip,
  EmptyState,
  FinePrint,
  IconButton,
  Notice,
  Row,
  SegmentedControl,
  Select,
  TextInput,
} from '../components/ui.jsx';
import { PLACE_CATEGORIES } from '../../core/data.js';
import { findPlaces } from '../../core/places.js';
import { useData } from '../lib/store.jsx';

/** The layout breakpoint the workspace grid switches at. */
const WIDE_QUERY = '(min-width: 1024px)';

/** How many result rows render at once; more arrive on request. */
const PAGE_SIZE = 24;

/**
 * From `lg` both panes are shown side by side, so the list and map panes are
 * rendered together; below that only the selected pane is mounted. Mounting a
 * map into a `display: none` container leaves Leaflet with nothing to measure,
 * which is why the choice is made in JavaScript rather than with a hidden class.
 */
function useWideScreen() {
  const [wide, setWide] = useState(() =>
    typeof window === 'undefined' || typeof window.matchMedia !== 'function'
      ? true
      : window.matchMedia(WIDE_QUERY).matches,
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const query = window.matchMedia(WIDE_QUERY);
    const handleChange = (event) => setWide(event.matches);
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);

  return wide;
}

function PlaceRow({ place, saved, onToggleSaved, selected, onSelect }) {
  return (
    <Row className={`tm-place-row ${selected ? 'is-selected' : ''}`}>
      <PlacePhoto place={place} size={76} />

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            to={`/discover/${place.id}`}
            className="tm-focus min-w-0 rounded-[4px] text-card-title font-semibold text-ink hover:text-accent"
          >
            {place.name}
          </Link>

        </div>
        <p className="mt-1 text-label text-ink-secondary">{place.locality || place.administrativeArea} · {place.category}</p>
        <button type="button" className="tm-show-map tm-focus" aria-pressed={selected} onClick={onSelect}><MapPin size={12} /> Show on map <ArrowUpRight size={12} /></button>
      </div>

      <IconButton
        icon={Bookmark}
        label={saved ? `Remove ${place.name} from saved places` : `Save ${place.name}`}
        aria-pressed={saved}
        size={34}
        onClick={onToggleSaved}
        // IconButton's own colour is grey and comes later in the stylesheet, so
        // the saved state colours the glyph itself rather than fighting it.
        className={saved ? '[&>svg]:text-accent [&>svg]:fill-current' : ''}
      />
    </Row>
  );
}

export default function DiscoverView() {
  const navigate = useNavigate();
  const { places, placeImport, user, isPlaceSaved, toggleSavedPlace, setStatus } = useData();

  const [selectedPlace, setSelectedPlace] = useState(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [province, setProvince] = useState('All');
  const [view, setView] = useState('list');
  const [showFilters, setShowFilters] = useState(true);
  const [saveMessage, setSaveMessage] = useState('');
  // Limit rendered rows even for the small curated catalog.
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const wide = useWideScreen();
  const publicPlaces = useMemo(() => places.filter((place) => !place.archived), [places]);
  const results = useMemo(
    () => findPlaces(publicPlaces, { query, category, province }),
    [publicPlaces, query, category, province],
  );
  const visibleResults = results.slice(0, visibleCount);

  // The filter offers only the provinces the records actually carry, so a
  // selection can never be empty by construction.
  const provinces = useMemo(
    () =>
      [...new Set(publicPlaces.map((place) => place.administrativeArea).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [publicPlaces],
  );


  // What the header says about where the records came from, honestly per
  // import state — never presented as if the samples were everything.
  const sampleCount = publicPlaces.length - placeImport.places.length;
  const importLabel = placeImport.status === 'ok'
    ? `${placeImport.places.length} editorial picks + ${sampleCount} demo places`
    : placeImport.status === 'loading'
      ? 'Loading curated places'
      : 'Curated places unavailable; demo places shown';

  const showList = wide || view === 'list';
  const showMap = wide || view === 'map';

  const handleToggleSaved = (placeId) => {
    const result = toggleSavedPlace(placeId);
    if (result.ok) {
      setSaveMessage('');
      return;
    }
    // The data layer owns this wording; a guest is told plainly that saving
    // needs an account, and the screen stays usable either way.
    const message = result.errors && result.errors.form ? result.errors.form : 'That change could not be saved.';
    setSaveMessage(message);
    setStatus(message, 'danger');
  };

  const handleSavedAction = () => {
    if (!user) {
      const message = 'Sign in to save places.';
      setSaveMessage(message);
      setStatus(message, 'danger');
      return;
    }
    navigate('/saved');
  };

  const clearFilters = () => {
    setQuery('');
    setCategory('All');
    setProvince('All');
    setVisibleCount(PAGE_SIZE);
  };

  return (
    <div className="tm-discover">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="tm-eyebrow">A little curiosity goes a long way</p>
          <h1 className="text-title font-semibold text-ink">Discover places</h1>
          <p className="mt-1 text-body text-ink-secondary">
            <span className="tm-numeric">{publicPlaces.length}</span>{' '}
            {publicPlaces.length === 1 ? 'place' : 'places'} across Thailand. Find somewhere worth the journey.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="lg:hidden"><SegmentedControl
            label="List or map view"
            value={view}
            onChange={setView}
            options={[
              { value: 'list', label: 'List', icon: List },
              { value: 'map', label: 'Map', icon: MapIcon },
            ]}
          />
          </div>
          <Button variant="secondary" icon={user ? BookmarkCheck : Bookmark} onClick={handleSavedAction}>
            Saved places
          </Button>
        </div>
      </header>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search
            size={15}
            strokeWidth={1.75}
            aria-hidden="true"
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-tertiary"
          />
          <TextInput
            id="discover-search"
            type="search"
            value={query}
            onChange={(event) => { setQuery(event.target.value); setVisibleCount(PAGE_SIZE); }}
            placeholder="Search by name, locality or category"
            aria-label="Search places"
            style={{ height: 48, paddingLeft: 38 }}
          />
        </div>

        <Button
          variant="secondary"
          icon={SlidersHorizontal}
          aria-expanded={showFilters}
          aria-controls="discover-filters"
          onClick={() => setShowFilters((open) => !open)}
        >
          Filters
        </Button>
      </div>

      {showFilters ? (
        <div id="discover-filters" className="mt-3 flex flex-wrap items-center gap-2">
          {PLACE_CATEGORIES.map((option) => (
            <Chip key={option} selected={option === category} onClick={() => { setCategory(option); setVisibleCount(PAGE_SIZE); }}>
              {option}
            </Chip>
          ))}

          {/* The import spans the whole country, so the province filter is the
              fastest way to narrow thousands of records. */}
          {provinces.length > 1 ? (
            <Select
              className="w-[210px]"
              value={province}
              onChange={(event) => { setProvince(event.target.value); setVisibleCount(PAGE_SIZE); }}
              aria-label="Filter by province"
            >
              <option value="All">All provinces</option>
              {provinces.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
          ) : null}
        </div>
      ) : null}

      {user ? null : (
        <div className="mt-3">
          <Notice tone="info" icon={Info}>
            Sign in to save places.{' '}
            <Link to="/signin" className="tm-focus rounded-[4px] font-medium text-accent hover:underline">
              Sign in
            </Link>{' '}
            — browsing stays open to guests.
          </Notice>
        </div>
      )}

      {saveMessage ? (
        <div role="alert" className="mt-3">
          <Notice tone="danger" icon={TriangleAlert}>
            {saveMessage}
          </Notice>
        </div>
      ) : null}

      {placeImport.status === 'error' ? (
        <div className="mt-3">
          <Notice tone="warning" icon={TriangleAlert}>
            {placeImport.message} Existing demo places and saved trips are unaffected.
          </Notice>
        </div>
      ) : null}

      <div className="tm-discover-workspace">
        {showList ? (
          <Card padded={false} className="tm-discover-list overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
              <p className="text-label font-medium text-ink">Places</p>
              <p className="text-label text-ink-tertiary tm-numeric" aria-live="polite">
                Showing {Math.min(visibleCount, results.length)} of {results.length} results
              </p>
            </div>

            {results.length === 0 ? (
              <EmptyState
                icon={MapPinOff}
                title="No places match these filters"
                description="Nothing in the records matches the current search, category and province. Clear the filters to see every place again."
                action={
                  <Button variant="secondary" icon={RotateCcw} onClick={clearFilters}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <>
                <div className="tm-results-scroll overflow-y-auto tm-scroll">
                  {visibleResults.map((place) => (
                    <PlaceRow
                      key={place.id}
                      place={place}
                      selected={selectedPlace?.id === place.id}
                      onSelect={() => { setSelectedPlace({...place}); setView('map'); }}
                      saved={isPlaceSaved(place.id)}
                      onToggleSaved={() => handleToggleSaved(place.id)}
                    />
                  ))}
                </div>

                {results.length > visibleCount ? (
                  <div className="border-t border-line px-4 py-3">
                    <Button variant="secondary" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
                      Show {Math.min(PAGE_SIZE, results.length - visibleCount)} more of {results.length} results
                    </Button>
                  </div>
                ) : null}
              </>
            )}

            <div className="border-t border-line px-4 py-2.5">
              <FinePrint>
                {importLabel}. Coordinates and fees are approximate; check before visiting.
              </FinePrint>
            </div>
          </Card>
        ) : null}

        {showMap ? (
          <div className="tm-discover-map flex flex-col gap-2">
            <MapPanel
              places={results}
              selectedPlace={results.find(p => p.id === selectedPlace?.id)}
              subject="place"
              onOpenPlace={(id) => navigate(`/discover/${id}`)}
              heightClass="h-[480px] lg:h-[600px]"
            />
            <FinePrint>
              Select a numbered group to explore nearby places, or use “Show on map” on any card.
            </FinePrint>
          </div>
        ) : null}
      </div>
    </div>
  );
}
