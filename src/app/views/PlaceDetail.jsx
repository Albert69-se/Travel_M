/**
 * Place details — one record, its photograph, its provenance and its conditions.
 *
 * Place facts come from a local sourced record; photographs use Google Places
 * when authorized, with contributor attribution beside them, and there are no
 * ratings and no clock times in the model, so none are shown.
 * The provenance block prints the strings `describeProvenance` returns rather
 * than a summary of them, because a sample record must never read as verified.
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  ChevronRight,
  CloudOff,
  Compass,
  Info,
  MapPinOff,
  ShieldAlert,
  TriangleAlert,
} from 'lucide-react';

import { MapPanel } from '../components/MapPanel.jsx';
import { PlacePhoto } from '../components/PlacePhoto.jsx';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Divider,
  EmptyState,
  FinePrint,
  KeyValue,
  Notice,
  Row,
} from '../components/ui.jsx';
import { formatCoordinates } from '../../core/map.js';
import { mapsDirectionsUrl, mapsPlaceUrl } from '../../core/google-maps-links.js';
import { describeProvenance, getPlaceById } from '../../core/places.js';
import { getWeatherForPlace, hasTemperature } from '../../core/weather.js';
import { money } from '../lib/format.js';
import { useData } from '../lib/store.jsx';

/** How many related records the details page lists before deferring to Discover. */
const RELATED_LIMIT = 8;

function DiscoverLink() {
  return (
    <Link
      to="/discover"
      className="tm-focus inline-flex h-[34px] items-center justify-center gap-1.5 rounded-control bg-accent px-3 text-body font-medium whitespace-nowrap text-white transition-colors hover:bg-accent-hover active:bg-accent-active"
    >
      <Compass size={15} strokeWidth={1.75} aria-hidden="true" />
      Discover places
    </Link>
  );
}

/** The Google Places hero photograph, with the contributor attribution. */
function PlaceHero({ place }) {
  return (
    <Card padded={false} className="overflow-hidden">
      <PlacePhoto place={place} hero />
    </Card>
  );
}

/**
 * The place's conditions, requested without trip dates. The adapter answers with
 * one of three shapes — ok, unavailable, error — and each gets its own visible
 * state; nothing is shown when nothing came back.
 */
function usePlaceWeather(place) {
  const placeId = place ? place.id : null;
  const latitude = place ? place.latitude : null;
  const longitude = place ? place.longitude : null;
  const key = placeId ? `${placeId}|${latitude}|${longitude}` : '';
  const [entry, setEntry] = useState({ key: '', result: { status: 'loading' } });

  // The loading state is derived during render rather than set from the effect,
  // so a new place shows "loading" without a second render pass.
  const weather = entry.key === key ? entry.result : { status: key ? 'loading' : 'idle' };

  useEffect(() => {
    if (!key) return undefined;

    let cancelled = false;
    // Coordinates are passed as primitives so a re-read of the stored records
    // (which hands back fresh objects) does not fire a second request.
    getWeatherForPlace({ id: placeId, latitude, longitude }).then((result) => {
      if (!cancelled) setEntry({ key, result });
    });

    return () => {
      cancelled = true;
    };
  }, [key, placeId, latitude, longitude]);

  return weather;
}

function precipitationLabel(value) {
  return Number.isFinite(value) ? `${value} mm` : 'Not reported';
}

function retrievedLabel(isoTimestamp) {
  if (typeof isoTimestamp !== 'string' || isoTimestamp.trim() === '') return 'Not reported';
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return isoTimestamp;
  return `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

function WeatherStrip({ weather }) {
  if (weather.status === 'loading' || weather.status === 'idle') {
    return <p className="text-body text-ink-secondary">Asking the weather provider for the conditions at these coordinates…</p>;
  }

  if (weather.status === 'unavailable' || weather.status === 'error') {
    const failed = weather.status === 'error';
    return (
      <Notice tone={failed ? 'danger' : 'info'} icon={failed ? TriangleAlert : CloudOff}>
        {weather.message}
      </Notice>
    );
  }

  const current = weather.current || {};

  return (
    <>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="text-metric font-semibold text-ink tm-numeric">
          {hasTemperature(current.temperature) ? `${current.temperature} °C` : 'Temperature not reported'}
        </span>
        <span className="text-body text-ink-secondary">{current.condition || 'Conditions not reported'}</span>
      </div>

      <div className="mt-3">
        <KeyValue label="Precipitation">{precipitationLabel(current.precipitation)}</KeyValue>
        <KeyValue label="Provider">{weather.provider}</KeyValue>
        <KeyValue label="Retrieved">{retrievedLabel(weather.retrievedAt)}</KeyValue>
        <KeyValue label="Valid for">{weather.validFor}</KeyValue>
      </div>

      {weather.note ? <p className="mt-2 text-label text-ink-secondary">{weather.note}</p> : null}
    </>
  );
}

export default function PlaceDetailView() {
  const { placeId } = useParams();
  const navigate = useNavigate();
  const { places, placeImport, user, isPlaceSaved, toggleSavedPlace, setStatus } = useData();

  const place = getPlaceById(places, placeId);
  // Called unconditionally: the "not found" branch below must not change the
  // number of hooks between renders.
  const weather = usePlaceWeather(place);

  const [feedback, setFeedback] = useState('');

  // The editorial records can arrive after the first render; avoid a
  // misleading not-found message while the curated list loads.
  if (!place && placeImport.status === 'loading') {
    return (
      <div>
        <Link
          to="/discover"
          className="tm-focus inline-flex items-center gap-1.5 rounded-control text-label font-medium text-ink-secondary hover:text-ink"
        >
          <ArrowLeft size={14} strokeWidth={1.75} aria-hidden="true" />
          Discover
        </Link>

        <header className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-title font-semibold text-ink">Loading place records…</h1>
            <p className="mt-1 text-body text-ink-secondary">
              The curated places list is still loading. If this destination is in the published shortlist, it will appear shortly.
            </p>
          </div>
        </header>
      </div>
    );
  }

  if (!place) {
    return (
      <div>
        <Link
          to="/discover"
          className="tm-focus inline-flex items-center gap-1.5 rounded-control text-label font-medium text-ink-secondary hover:text-ink"
        >
          <ArrowLeft size={14} strokeWidth={1.75} aria-hidden="true" />
          Discover
        </Link>

        <header className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-title font-semibold text-ink">Place not found</h1>
            <p className="mt-1 text-body text-ink-secondary">
              No place record matches “{placeId}”. Nothing was loaded, so nothing is shown.
            </p>
          </div>
        </header>

        <Card className="mt-4" padded={false}>
          <EmptyState
            icon={MapPinOff}
            title="This place is not in the records"
            description="The place may have been retired from public discovery. Previously saved OSM places can still be opened from Saved Places; new trips use the curated destinations."
            action={<DiscoverLink />}
          />
        </Card>
      </div>
    );
  }

  const provenance = describeProvenance(place);
  const saved = isPlaceSaved(place.id);
  const localityLine = [place.locality, place.administrativeArea, place.countryCode].filter(Boolean).join(' · ');
  const related = places.filter((entry) => entry.category === place.category && entry.id !== place.id);
  const relatedShown = related.slice(0, RELATED_LIMIT);

  const handleToggleSaved = () => {
    const result = toggleSavedPlace(place.id);
    if (result.ok) {
      setFeedback('');
      return;
    }
    const message = result.errors && result.errors.form ? result.errors.form : 'That change could not be saved.';
    setFeedback(message);
    setStatus(message, 'danger');
  };

  return (
    <div>
      <Link
        to="/discover"
        className="tm-focus inline-flex items-center gap-1.5 rounded-control text-label font-medium text-ink-secondary hover:text-ink"
      >
        <ArrowLeft size={14} strokeWidth={1.75} aria-hidden="true" />
        Discover
      </Link>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <PlacePhoto place={place} size={56} />
          <div className="min-w-0">
            <h1 className="text-title font-semibold text-ink">{place.name}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <Badge tone="accent">{place.category}</Badge>
              <span className="text-body text-ink-secondary">{localityLine}</span>
            </div>
          </div>
        </div>

        <Button
          variant={saved ? 'secondary' : 'primary'}
          icon={saved ? BookmarkCheck : Bookmark}
          aria-pressed={saved}
          onClick={handleToggleSaved}
        >
          {saved ? 'Remove from saved' : 'Save place'}
        </Button>
      </header>

      {user ? null : (
        <div className="mt-3">
          <Notice tone="info" icon={Info}>
            Sign in to save places.{' '}
            <Link to="/signin" className="tm-focus rounded-[4px] font-medium text-accent hover:underline">
              Sign in
            </Link>{' '}
            — the rest of this page stays readable as a guest.
          </Notice>
        </div>
      )}

      {feedback ? (
        <div role="alert" className="mt-3">
          <Notice tone="danger" icon={TriangleAlert}>
            {feedback}
          </Notice>
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <PlaceHero place={place} />

          <Card>
            <p className="text-body leading-relaxed text-ink-secondary">{place.description}</p>
          </Card>

          <Card padded={false} className="px-4 py-2">
            <KeyValue label="Estimated cost">
              <span className="block">{money(place.estimatedCost)}</span>
              {place.estimatedCostNote ? (
                <span className="mt-0.5 block text-label font-normal text-ink-tertiary">
                  {place.estimatedCostNote}
                </span>
              ) : null}
            </KeyValue>
            <Divider />
            <KeyValue label="Coordinates">{formatCoordinates(place.latitude, place.longitude)}</KeyValue>
          </Card>

          <div className="flex flex-col gap-1.5">
            <Notice tone="warning" icon={ShieldAlert}>
              <p className="text-body font-medium text-ink">Provenance</p>
              <dl className="mt-1.5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5">
                <dt>Source</dt>
                <dd>{provenance.source}</dd>
                <dt>Checked</dt>
                <dd className="tm-numeric">{provenance.checked}</dd>
                <dt>Status</dt>
                <dd className="font-medium">{provenance.status}</dd>
              </dl>
            </Notice>
            <FinePrint className="px-1">Editorial locations are approximate until checked; archived OSM entries remain unverified.</FinePrint>
          </div>

          <Card padded={false} className="overflow-hidden">
            <CardHeader
              title={`More ${place.category} places`}
              meta={`${related.length} ${related.length === 1 ? 'record' : 'records'}`}
              className="border-b border-line px-4 py-3"
            />
            {related.length === 0 ? (
              <p className="px-4 py-3 text-label text-ink-tertiary">
                No other {place.category} places are held in the records.
              </p>
            ) : (
              <>
                <div className="max-h-[560px] overflow-y-auto tm-scroll">
                  {relatedShown.map((entry) => (
                  <Row key={entry.id} className="py-2.5">
                    <PlacePhoto place={entry} size={28} />
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/discover/${entry.id}`}
                        className="tm-focus block truncate text-body font-medium text-ink hover:text-accent"
                      >
                        {entry.name}
                      </Link>
                      <p className="truncate text-label text-ink-tertiary">{entry.locality}</p>
                    </div>
                    <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-ink-tertiary" />
                  </Row>
                  ))}
                </div>

                {related.length > relatedShown.length ? (
                  <div className="border-t border-line px-4 py-2.5">
                    <FinePrint>
                      Showing first {relatedShown.length} of {related.length} — narrow the list on Discover.
                    </FinePrint>
                  </div>
                ) : null}
              </>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <MapPanel
              places={[place]}
              subject="place"
              onOpenPlace={(id) => navigate(`/discover/${id}`)}
              heightClass="h-[320px] lg:h-[420px]"
            />
            <FinePrint>
              In-app map uses Google Maps in local demo mode, otherwise OpenStreetMap (© contributors). Attraction coordinates are not field-verified.
            </FinePrint>
            <div className="flex flex-wrap gap-3 text-label font-medium text-accent">
              <a className="tm-focus rounded-control underline" href={mapsPlaceUrl(place)} target="_blank" rel="noopener noreferrer">
                View in Google Maps
              </a>
              <a className="tm-focus rounded-control underline" href={mapsDirectionsUrl(place)} target="_blank" rel="noopener noreferrer">
                Get directions
              </a>
            </div>
          </div>

          <Card>
            <CardHeader
              title="Current conditions"
              meta={weather.status === 'ok' ? weather.provider : 'No forecast requested for dates'}
            />
            {/* One persistent live region: the resolved conditions replace the
                request message inside it rather than arriving as new markup. */}
            <div className="mt-3" aria-live="polite">
              <WeatherStrip weather={weather} />
            </div>
            <p className="mt-3 text-label text-ink-tertiary">
              Requested without trip dates, so this is the provider's own forecast window rather than a trip forecast.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
