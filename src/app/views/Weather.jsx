/**
 * Weather for a trip's destination.
 *
 * The forecast is matched to the destination's place record (it needs
 * coordinates), and all three shapes the core adapter can return are rendered as
 * their own visible state — an "unavailable" or failed request never becomes an
 * empty box and never becomes an invented temperature.
 */
import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { AlertTriangle, CloudOff, CloudSun, Droplets, Info, MapPin, RefreshCw, Thermometer } from 'lucide-react';

import { Badge, Button, Card, CardHeader, FinePrint, Notice } from '../components/ui.jsx';
import { useData } from '../lib/store.jsx';
import { dateRange, shortDate, weekdayDate } from '../lib/format.js';
import { getWeatherForPlace, hasTemperature } from '../../core/weather.js';

/** The text a place can be recognised by when matching a destination label. */
function labelsOf(place) {
  return [place.name, place.locality]
    .filter((value) => typeof value === 'string' && value.trim() !== '')
    .map((value) => value.trim().toLowerCase());
}

function findPlaceForLabel(places, label) {
  if (typeof label !== 'string' || label.trim() === '') return null;
  const needle = label.trim().toLowerCase();
  return (
    places.find((place) => labelsOf(place).includes(needle)) ||
    places.find((place) => labelsOf(place).some((value) => value.includes(needle) || needle.includes(value))) ||
    null
  );
}

function temperatureLabel(value) {
  return hasTemperature(value) ? `${Math.round(value)} °C` : 'Not reported';
}

function temperatureRangeLabel(max, min) {
  if (!hasTemperature(max) && !hasTemperature(min)) return 'Not reported';
  const high = hasTemperature(max) ? `${Math.round(max)}°` : '–';
  const low = hasTemperature(min) ? `${Math.round(min)}°` : '–';
  return `${high} / ${low}`;
}

function precipitationLabel(value) {
  return hasTemperature(value) ? `${value} mm` : 'Not reported';
}

function retrievedLabel(iso) {
  if (typeof iso !== 'string' || iso === '') return 'not reported';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${shortDate(date.toISOString().slice(0, 10))} at ${time}`;
}

/**
 * Identity of one forecast request. A response is tagged with this key so the
 * loading state can be derived during render — nothing is set synchronously
 * inside the effect.
 */
function requestKeyFor(placeId, tripId, startDate, endDate, reloadToken) {
  return [placeId, tripId, startDate, endDate, reloadToken].join('|');
}

export default function WeatherView() {
  const { trip, activities, activityGroups, days } = useOutletContext();
  const { places } = useData();
  const [response, setResponse] = useState({ requestKey: '', value: null });
  const [reloadToken, setReloadToken] = useState(0);

  // A forecast needs coordinates, so the destination is resolved to a place
  // record: the linked place first, then a label match, then the first
  // itinerary activity that names a place.
  const place = useMemo(() => {
    const byId = trip.destinationId
      ? places.find((entry) => entry.id === trip.destinationId) || null
      : null;
    if (byId) return byId;

    const byLabel = findPlaceForLabel(places, trip.destinationLabel);
    if (byLabel) return byLabel;

    const activity = activities.find((item) => item.placeId);
    if (activity) return places.find((entry) => entry.id === activity.placeId) || null;

    return null;
  }, [places, trip.destinationId, trip.destinationLabel, activities]);

  const placeId = place ? place.id : 'none';
  // The loading state is derived from the request identity, so no state is set
  // synchronously while the effect runs.
  const requestKey = requestKeyFor(placeId, trip.id, trip.startDate, trip.endDate, reloadToken);
  const result =
    response.requestKey === requestKey && response.value ? response.value : { status: 'loading' };

  useEffect(() => {
    let cancelled = false;
    const key = requestKeyFor(placeId, trip.id, trip.startDate, trip.endDate, reloadToken);

    getWeatherForPlace(place, trip.startDate, trip.endDate)
      .then((next) => {
        if (!cancelled) setResponse({ requestKey: key, value: next });
      })
      .catch((error) => {
        if (!cancelled) {
          setResponse({
            requestKey: key,
            value: { status: 'error', provider: null, message: `Weather request failed: ${error.message}` },
          });
        }
      });

    return () => {
      cancelled = true;
    };
    // Keyed to the resolved place and the trip's dates; `reloadToken` is the refresh button.
  }, [place, placeId, trip.id, trip.startDate, trip.endDate, reloadToken]);

  const current = result.status === 'ok' ? result.current || {} : {};
  const forecastDays = result.status === 'ok' && Array.isArray(result.days) ? result.days : [];
  const placeLabel = place ? `${place.name}${place.locality ? `, ${place.locality}` : ''}` : '';

  const currentMetrics = [
    { key: 'temperature', label: 'Temperature', value: temperatureLabel(current.temperature), icon: Thermometer },
    { key: 'condition', label: 'Condition', value: current.condition || 'Not reported', icon: CloudSun },
    { key: 'precipitation', label: 'Precipitation', value: precipitationLabel(current.precipitation), icon: Droplets },
  ];

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-section font-semibold text-ink">Weather</h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-body text-ink-secondary">
            <span className="inline-flex items-center gap-1">
              <MapPin size={15} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-ink-tertiary" />
              {place ? `Forecast place: ${placeLabel}` : 'No place record matches this destination'}
            </span>
          </p>
          <p className="mt-0.5 text-label text-ink-tertiary tm-numeric">
            {dateRange(trip.startDate, trip.endDate)} · {days.length} {days.length === 1 ? 'day' : 'days'} in the
            trip · {activityGroups.length} {activityGroups.length === 1 ? 'day' : 'days'} with activities
          </p>
        </div>

        <Button
          variant="secondary"
          icon={RefreshCw}
          disabled={result.status === 'loading'}
          onClick={() => setReloadToken((token) => token + 1)}
        >
          Refresh forecast
        </Button>
      </header>

      <div className="flex flex-col gap-4" aria-live="polite">
        {result.status === 'loading' ? (
          <Card>
            <p className="text-body text-ink-secondary" role="status">
              Requesting the forecast…
            </p>
          </Card>
        ) : null}

        {result.status === 'ok' ? (
          <>
            <Card className="flex flex-col gap-3">
              <CardHeader
                title={current.condition || 'Conditions not reported'}
                meta={`Retrieved ${retrievedLabel(result.retrievedAt)} · valid for ${result.validFor}`}
                action={<Badge tone="neutral">{result.provider}</Badge>}
              />

              <div className="grid gap-3 border-t border-line pt-3 sm:grid-cols-3">
                {currentMetrics.map((metric) => (
                  <div key={metric.key} className="flex items-start gap-2">
                    <metric.icon
                      size={15}
                      strokeWidth={1.75}
                      aria-hidden="true"
                      className="mt-0.5 shrink-0 text-ink-tertiary"
                    />
                    <span className="min-w-0">
                      <span className="block text-micro font-semibold uppercase text-ink-tertiary">
                        {metric.label}
                      </span>
                      <span className="block text-base font-medium text-ink tm-numeric break-words">
                        {metric.value}
                      </span>
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-label text-ink-tertiary">
                Provider: {result.provider}
                {placeLabel ? ` · place record: ${placeLabel}` : ''}
              </p>
            </Card>

            {forecastDays.length === 0 ? (
              <Notice tone="info" icon={Info}>
                {result.note}
              </Notice>
            ) : (
              <Card padded={false}>
                <div className="p-4">
                  <CardHeader
                    title="Daily forecast"
                    meta={`${forecastDays.length} ${forecastDays.length === 1 ? 'day' : 'days'} inside the forecast range`}
                  />
                </div>
                <ul className="tm-scroll flex gap-2 overflow-x-auto border-t border-line p-4">
                  {forecastDays.map((day) => (
                    <li
                      key={day.date}
                      className="w-[152px] shrink-0 rounded-card border border-line bg-canvas p-3"
                    >
                      <p className="text-label font-medium text-ink tm-numeric">{weekdayDate(day.date)}</p>
                      <p className="mt-1 text-card-title font-semibold text-ink tm-numeric">
                        {temperatureRangeLabel(day.maxTemperature, day.minTemperature)}
                      </p>
                      <p className="text-micro uppercase text-ink-tertiary">High / low °C</p>
                      <p className="mt-1.5 text-label text-ink-secondary break-words">{day.condition}</p>
                      <p className="mt-1 flex items-center gap-1 text-label text-ink-tertiary tm-numeric">
                        <Droplets size={12} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />
                        {precipitationLabel(day.precipitation)}
                      </p>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </>
        ) : null}

        {result.status === 'unavailable' ? (
          <Notice tone="info" icon={CloudOff}>
            <span className="font-medium">Forecast unavailable.</span> {result.message}
          </Notice>
        ) : null}

        {result.status === 'error' ? (
          <Notice tone="danger" icon={AlertTriangle}>
            <span className="font-medium">Forecast request failed.</span> {result.message}
          </Notice>
        ) : null}
      </div>

      <Notice tone="info" icon={Info}>
        Open-Meteo forecasts roughly 16 days ahead, so dates further out than that show current conditions only and
        no forecast strip. A weather request that fails changes nothing about the trip: the itinerary, packing list,
        expenses and budget are stored with the trip and remain exactly as they were.
      </Notice>

      <FinePrint>
        Sample data — not verified · forecast from Open-Meteo, requested with the destination's place coordinates.
      </FinePrint>
    </div>
  );
}
