/**
 * Home — the compact dashboard from the Stitch "Travel M - Home Dashboard"
 * screen: a greeting and countdown header, the trip the traveller is planning
 * (with its budget panel), three compact stat cards, then the upcoming plan
 * beside the destination forecast.
 *
 * A guest gets the same frame, but the trip and budget cards are replaced with
 * what a guest can do, what needs an account, the published demo credentials and
 * a strip of sample places.
 *
 * Every figure comes from the records: budget maths is read from `useTripData`,
 * day grouping from `activityGroups`, and the forecast is only ever the shape
 * the weather provider returned — never an invented temperature.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Backpack,
  CalendarDays,
  CloudSun,
  Compass,
  Droplets,
  LogIn,
  MapPin,
  Receipt,
  Route,
  Search,
  Thermometer,
  UserPlus,
} from 'lucide-react';

import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  FinePrint,
  KeyValue,
  Notice,
  ProgressBar,
  Row,
  Stat,
} from '../components/ui.jsx';
import { GoogleAttribution } from '../components/GoogleAttribution.jsx';
import { PlacePhoto } from '../components/PlacePhoto.jsx';
import { useData, useTripData } from '../lib/store.jsx';
import {
  countdownLabel,
  dateRange,
  dayCountLabel,
  daysUntil,
  money,
  shortDate,
  weekdayDate,
} from '../lib/format.js';
import { DEMO_CREDENTIALS } from '../../core/auth.js';
import { getWeatherForPlace, hasTemperature } from '../../core/weather.js';

/* Navigation is a link, not a button, so it keeps middle-click and keyboard
   behaviour. The classes mirror the Button primitive's variants. */
const LINK_PRIMARY =
  'tm-focus inline-flex h-[34px] items-center justify-center gap-1.5 whitespace-nowrap rounded-control bg-accent px-3 text-body font-medium text-white transition-colors hover:bg-accent-hover';
const LINK_SECONDARY =
  'tm-focus inline-flex h-[34px] items-center justify-center gap-1.5 whitespace-nowrap rounded-control border border-line bg-surface px-3 text-body font-medium text-ink transition-colors hover:border-line-strong';
const LINK_QUIET =
  'tm-focus inline-flex items-center gap-1 rounded-control text-label font-medium text-accent hover:underline';


function greetingFor(name) {
  const hour = new Date().getHours();
  const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const first = typeof name === 'string' && name.trim() !== '' ? name.trim().split(/\s+/)[0] : 'traveller';
  return `${part}, ${first}`;
}

function temperatureLabel(value) {
  return hasTemperature(value) ? `${Math.round(value)}°` : 'Not reported';
}

function isNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

/* --------------------------------------------------------------- the header */

function PageHeader({ title, subtitle, children }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-title font-semibold text-ink">{title}</h1>
        <p className="mt-1 text-body text-ink-secondary">{subtitle}</p>
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </header>
  );
}

/* ------------------------------------------------------------------- budget */

const BUDGET_TONE = { over: 'danger', nearing: 'warning', ok: 'accent', unknown: 'accent' };
const BUDGET_BADGE = { over: 'danger', nearing: 'warning', ok: 'success', unknown: 'neutral' };

function BudgetPanel({ trip, spent, remaining, budget }) {
  const spentTone = BUDGET_TONE[budget.level] || 'accent';
  const overBudget = remaining < 0;

  return (
    <div className="flex flex-col gap-3 border-t border-line pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
      <div className="flex items-start justify-between gap-3">
        <p className="text-micro font-semibold uppercase text-ink-tertiary">Budget</p>
        <Badge tone={BUDGET_BADGE[budget.level] || 'neutral'}>{budget.label}</Badge>
      </div>

      <div>
        <p className="text-metric font-semibold tm-numeric text-ink">{money(trip.expectedBudget, trip.currencyCode)}</p>
        <p className="mt-1 text-label text-ink-tertiary tm-numeric">
          {money(spent, trip.currencyCode)} recorded · {budget.percentSpent}% of the planned budget
        </p>
        <ProgressBar
          className="mt-2"
          value={spent}
          max={trip.expectedBudget}
          tone={spentTone}
          label={`Recorded spending ${money(spent, trip.currencyCode)} of a planned ${money(trip.expectedBudget, trip.currencyCode)}`}
        />
      </div>

      <div className="flex items-baseline justify-between gap-3 border-t border-line pt-2.5">
        <span className="text-label text-ink-tertiary">{overBudget ? 'Over budget by' : 'Remaining'}</span>
        <span className={`text-base font-semibold tm-numeric ${overBudget ? 'text-danger' : 'text-success'}`}>
          {money(Math.abs(remaining), trip.currencyCode)}
        </span>
      </div>

      {budget.level === 'over' || budget.level === 'nearing' ? (
        <p className="text-label text-ink-secondary">{budget.message}</p>
      ) : (
        <p className="text-label text-ink-tertiary">
          {budget.level === 'ok'
            ? 'Spending is still inside the planned budget.'
            : 'No planned budget is set for this trip, so only recorded spending is shown.'}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ the plan */

function ActivityRow({ item, currencyCode }) {
  return (
    <Row className="items-start">
      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-chip bg-canvas text-ink-tertiary">
        {item.placeId ? (
          <MapPin size={13} strokeWidth={1.75} aria-hidden="true" />
        ) : (
          <Route size={13} strokeWidth={1.75} aria-hidden="true" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-body font-medium text-ink">{item.title}</p>
        {item.notes ? <p className="mt-0.5 text-label text-ink-secondary">{item.notes}</p> : null}
      </div>
      <span className="shrink-0 text-label tm-numeric text-ink-secondary">{money(item.estimatedCost, currencyCode)}</span>
      {item.placeId ? (
        <Link
          to={`/discover/${item.placeId}`}
          aria-label={`Open the place record for ${item.title}`}
          className="tm-focus shrink-0 rounded-control px-1 py-1 text-label font-medium text-accent hover:underline"
        >
          Place
        </Link>
      ) : (
        <span className="shrink-0 text-micro uppercase text-ink-tertiary">Own note</span>
      )}
    </Row>
  );
}

function PlanCard({ trip, activities, activityGroups }) {
  return (
    <Card padded={false} className="flex flex-col overflow-hidden">
      <div className="p-4 pb-3">
        <CardHeader
          title="Upcoming plan"
          meta={
            activities.length === 0
              ? 'No activities yet'
              : `${activities.length} ${activities.length === 1 ? 'activity' : 'activities'} across ${activityGroups.length} ${
                  activityGroups.length === 1 ? 'day' : 'days'
                }`
          }
          action={
            <Link to={`/trips/${trip.id}/itinerary`} className={LINK_QUIET}>
              Itinerary
              <ArrowRight size={14} strokeWidth={1.75} aria-hidden="true" />
            </Link>
          }
        />
      </div>

      {activityGroups.length === 0 ? (
        <div className="border-t border-line">
          <EmptyState
            icon={Route}
            title="The itinerary is empty"
            description="Activities added to this trip are grouped by day here."
          />
        </div>
      ) : (
        <div className="max-h-[560px] overflow-y-auto tm-scroll border-t border-line">
          {activityGroups.map((group) => (
            <div key={group.date}>
              <div className="flex items-center justify-between gap-3 bg-canvas px-3 py-1.5">
                <p className="text-micro font-semibold uppercase text-ink-tertiary">{weekdayDate(group.date)}</p>
                <p className="text-micro uppercase text-ink-tertiary tm-numeric">{group.items.length} planned</p>
              </div>
              {group.items.map((item) => (
                <ActivityRow key={item.id} item={item} currencyCode={trip.currencyCode} />
              ))}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ---------------------------------------------------------------- the weather */

function ForecastDay({ day }) {
  return (
    <div className="rounded-control border border-line bg-canvas px-2.5 py-2">
      <p className="text-micro uppercase text-ink-tertiary">{shortDate(day.date).replace(/ \d{4}$/, '')}</p>
      <p className="mt-1 text-base font-semibold tm-numeric text-ink">{temperatureLabel(day.maxTemperature)}</p>
      <p className="text-label tm-numeric text-ink-tertiary">
        low {temperatureLabel(day.minTemperature)} · {isNumber(day.precipitation) ? `${day.precipitation} mm` : 'no rainfall figure'}
      </p>
      <p className="mt-1 text-label text-ink-secondary">{day.condition}</p>
    </div>
  );
}

function WeatherCard({ trip, place, weather, pending }) {
  return (
    <Card className="flex flex-col gap-3">
      <CardHeader
        title="Weather"
        meta={place ? `${place.name} · ${place.locality}` : trip ? trip.destinationLabel : undefined}
      />

      {!trip ? (
        <EmptyState
          icon={CloudSun}
          title="No trip to forecast for"
          description="Once a trip has a destination with coordinates, its forecast is requested from the provider."
        />
      ) : !place ? (
        <Notice tone="warning" icon={AlertTriangle}>
          “{trip.destinationLabel}” is not one of the place records, so there are no coordinates to request a
          forecast with.
        </Notice>
      ) : pending ? (
        <p className="text-body text-ink-secondary" role="status" aria-live="polite">
          Requesting the forecast for {place.name}…
        </p>
      ) : weather && weather.status === 'ok' ? (
        <div className="flex flex-col gap-3" aria-live="polite">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-metric font-semibold tm-numeric text-ink">{temperatureLabel(weather.current.temperature)}</p>
              <p className="mt-0.5 text-body text-ink-secondary">{weather.current.condition}</p>
            </div>
            <p className="inline-flex items-center gap-1.5 text-label text-ink-tertiary tm-numeric">
              <Droplets size={14} strokeWidth={1.75} aria-hidden="true" />
              {isNumber(weather.current.precipitation) ? `${weather.current.precipitation} mm now` : 'no rainfall figure'}
            </p>
          </div>

          {weather.days.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {weather.days.slice(0, 4).map((day) => (
                <ForecastDay key={day.date} day={day} />
              ))}
            </div>
          ) : (
            <Notice tone="info" icon={Thermometer}>
              {weather.note || 'The provider has no forecast inside the trip dates yet.'}
            </Notice>
          )}

          {weather.days.length > 0 && weather.note ? (
            <p className="text-label text-ink-tertiary">{weather.note}</p>
          ) : null}

          <FinePrint>
            {weather.provider} · retrieved {shortDate(String(weather.retrievedAt).slice(0, 10))} · valid for{' '}
            {weather.validFor}
          </FinePrint>
        </div>
      ) : weather && weather.status === 'unavailable' ? (
        <Notice tone="warning" icon={CloudSun}>
          {weather.message}
        </Notice>
      ) : weather && weather.status === 'error' ? (
        <Notice tone="danger" icon={AlertTriangle}>
          {weather.message}
        </Notice>
      ) : (
        <p className="text-body text-ink-secondary">No forecast has been requested for this trip yet.</p>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------- the trip */

function Dashboard({ user }) {
  const { trips, places } = useData();

  const myTrips = useMemo(() => trips.filter((trip) => trip.userId === user.id), [trips, user.id]);

  /* The traveller's soonest upcoming trip, otherwise the most recent one. */
  const focusTripId = useMemo(() => {
    if (myTrips.length === 0) return null;
    const upcoming = myTrips
      .filter((trip) => (daysUntil(trip.startDate) === null ? false : daysUntil(trip.startDate) >= 0))
      .sort((a, b) => (a.startDate > b.startDate ? 1 : -1));
    if (upcoming.length > 0) return upcoming[0].id;
    const past = [...myTrips].sort((a, b) => (a.startDate > b.startDate ? -1 : 1));
    return past[0].id;
  }, [myTrips]);

  const tripData = useTripData(focusTripId);
  const { trip, activities, activityGroups, packingCounts, expenses, spent, remaining, budget, days } = tripData;

  const destinationPlace = useMemo(
    () => (trip ? places.find((place) => place.id === trip.destinationId) || null : null),
    [places, trip],
  );

  const [weatherState, setWeatherState] = useState({ key: null, result: null });

  const startDate = trip ? trip.startDate : null;
  const endDate = trip ? trip.endDate : null;
  const weatherKey =
    destinationPlace && startDate && endDate ? `${destinationPlace.id}|${startDate}|${endDate}` : null;

  useEffect(() => {
    if (!weatherKey) return undefined;
    let cancelled = false;
    (async () => {
      const result = await getWeatherForPlace(destinationPlace, startDate, endDate);
      if (cancelled) return;
      setWeatherState({ key: weatherKey, result });
    })();
    return () => {
      cancelled = true;
    };
  }, [weatherKey, destinationPlace, startDate, endDate]);

  /* Derived during render: a stored result only counts for its own request key,
     which is also what makes the "waiting" state honest. */
  const weather = weatherState.key === weatherKey ? weatherState.result : null;
  const weatherPending = weatherKey !== null && weatherState.key !== weatherKey;

  const countdown = trip ? countdownLabel(trip.startDate) : null;
  const underWay = trip ? daysUntil(trip.startDate) < 0 : false;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={greetingFor(user.name)}
        subtitle={trip ? countdown : 'No trip planned yet — create one to start a countdown.'}
      >
        <Link to="/discover" className={LINK_SECONDARY}>
          <Search size={15} strokeWidth={1.75} aria-hidden="true" />
          Discover places
        </Link>
        {trip ? (
          <Link to={`/trips/${trip.id}`} className={LINK_PRIMARY}>
            <CalendarDays size={15} strokeWidth={1.75} aria-hidden="true" />
            Open trip
          </Link>
        ) : (
          <Link to="/trips" className={LINK_PRIMARY}>
            <CalendarDays size={15} strokeWidth={1.75} aria-hidden="true" />
            Plan a trip
          </Link>
        )}
      </PageHeader>

      {!trip ? (
        <Card>
          <EmptyState
            icon={CalendarDays}
            title="Nothing planned yet"
            description="A trip holds the dates, the itinerary, the packing list and the expenses. Create one and this dashboard fills in."
            action={
              <Link to="/trips" className={LINK_PRIMARY}>
                Create a trip
              </Link>
            }
          />
        </Card>
      ) : (
        <>
          <Card padded={false} className="overflow-hidden">
            <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-micro font-semibold uppercase text-ink-tertiary">Current trip</p>
                    <h2 className="mt-0.5 truncate text-section font-semibold text-ink">{trip.name}</h2>
                    <p className="mt-1 text-body text-ink-secondary tm-numeric">
                      {dateRange(trip.startDate, trip.endDate)}
                    </p>
                  </div>
                  <Badge tone={underWay ? 'success' : 'accent'}>{countdown}</Badge>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-label text-ink-secondary">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin size={14} strokeWidth={1.75} aria-hidden="true" />
                    {trip.destinationLabel}
                  </span>
                  <span className="inline-flex items-center gap-1.5 tm-numeric">
                    <CalendarDays size={14} strokeWidth={1.75} aria-hidden="true" />
                    {dayCountLabel(trip)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 tm-numeric">
                    <Route size={14} strokeWidth={1.75} aria-hidden="true" />
                    {activities.length} activities
                  </span>
                  <span className="inline-flex items-center gap-1.5 tm-numeric">
                    <Backpack size={14} strokeWidth={1.75} aria-hidden="true" />
                    {packingCounts.packed}/{packingCounts.total} packed
                  </span>
                  <span className="inline-flex items-center gap-1.5 tm-numeric">
                    <Receipt size={14} strokeWidth={1.75} aria-hidden="true" />
                    {expenses.length} expenses
                  </span>
                </div>

                <div className="mt-auto flex flex-wrap gap-2">
                  <Link to={`/trips/${trip.id}/itinerary`} className={LINK_SECONDARY}>
                    Itinerary
                  </Link>
                  <Link to={`/trips/${trip.id}/packing`} className={LINK_SECONDARY}>
                    Packing
                  </Link>
                  <Link to={`/trips/${trip.id}/expenses`} className={LINK_SECONDARY}>
                    Expenses
                  </Link>
                  <Link to={`/trips/${trip.id}/weather`} className={LINK_SECONDARY}>
                    Weather
                  </Link>
                </div>
              </div>

              <BudgetPanel trip={trip} spent={spent} remaining={remaining} budget={budget} />
            </div>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Stat
              label="Activities planned"
              value={String(activities.length)}
              hint={`${activityGroups.length} ${activityGroups.length === 1 ? 'day' : 'days'} with plans`}
            />
            <Stat
              label="Packing packed"
              value={`${packingCounts.packed}/${packingCounts.total}`}
              hint={`${packingCounts.remaining} still to pack`}
              progress={{
                value: packingCounts.packed,
                max: packingCounts.total,
                tone: 'accent',
                label: 'Packing progress',
              }}
            />
            <Stat label="Trip days" value={String(days.length)} hint={dayCountLabel(trip)} />
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <PlanCard trip={trip} activities={activities} activityGroups={activityGroups} />
            <WeatherCard trip={trip} place={destinationPlace} weather={weather} pending={weatherPending} />
          </div>
        </>
      )}

      <FinePrint>
        Sample data — not verified. Budget, itinerary and packing figures come from the records stored for{' '}
        {user.email} in this browser.
      </FinePrint>
    </div>
  );
}

/* ------------------------------------------------------------------ the guest */

function CredentialPanel() {
  return (
    <div className="rounded-control border border-line bg-sunken px-3 py-2">
      <p className="text-micro font-semibold uppercase text-ink-tertiary">Published demo account</p>
      <div className="mt-1 divide-y divide-line">
        <KeyValue label="Email">{DEMO_CREDENTIALS.email}</KeyValue>
        <KeyValue label="Password">{DEMO_CREDENTIALS.password}</KeyValue>
      </div>
    </div>
  );
}

function GuestHome() {
  const { places } = useData();
  const featured = places.filter(p => !p.archived).slice(0, 4);
  return (
    <div className="flex flex-col gap-4">
      <section className="tm-hero">
        <div className="tm-hero-copy">
          <p className="tm-eyebrow">Less planning. More discovering.</p>
          <h1>Your next adventure,<br />a little closer.</h1>
          <p>From northern mountain trails to streets full of flavour. Find your places, make a plan, and enjoy Thailand at your own pace.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/discover" className={`${LINK_PRIMARY} !h-11 !px-5`}>Explore Thailand <ArrowRight size={16} /></Link>
            <Link to="/signin" className={`${LINK_SECONDARY} !h-11 !px-5`}>Plan a trip</Link>
          </div>
        </div>
        <svg viewBox="0 0 460 360" className="tm-hero-art" role="img" aria-label="Illustration of a mountain journey and a northern Thai temple" preserveAspectRatio="xMidYMid slice">
          <rect width="460" height="360" fill="#e6eee6" />
          <circle cx="315" cy="90" r="46" fill="#e8bc69" />
          <path d="M0 218L90 88L180 204L270 130L410 243L460 190V360H0Z" fill="#bacdb8" />
          <path d="M0 270L140 163L260 260L390 166L460 235V360H0Z" fill="#82a793" />
          <path d="M0 309Q120 228 260 294T460 265V360H0Z" fill="#397e69" />
          <path d="M70 360Q125 295 252 316T397 279" fill="none" stroke="#e9dfb8" strokeWidth="15" />
          <path d="M284 263V222H344V263Z" fill="#f3e6c7" />
          <path d="M270 224L314 191L358 224Z M284 204L314 172L344 204Z M301 181L314 150L327 181Z" fill="#996e44" />
          <path d="M308 263V241Q314 231 320 241V263Z" fill="#4c6b53" />
          <g fill="#246451"><path d="M36 304L58 244L80 304Z"/><path d="M398 315L420 245L442 315Z"/></g>
          <path d="M165 191C165 170 197 170 197 191C197 203 181 218 181 218S165 203 165 191Z" fill="#147d70" stroke="#fff" strokeWidth="3"/><circle cx="181" cy="190" r="5" fill="white"/>
          <path d="M190 235Q217 229 239 245" stroke="white" strokeWidth="2" strokeDasharray="4 5" fill="none"/>
        </svg>
      </section>
      <div>
        <div className="tm-home-section"><div><p className="tm-eyebrow">Start somewhere wonderful</p><h2>A few places to spark a plan</h2></div><Link to="/discover" className={LINK_QUIET}>View all places <ArrowRight size={15} /></Link></div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {featured.map((place, i) => <Card key={place.id} className="tm-feature-card">
            <div className="flex items-center justify-between"><span className="tm-feature-number">0{i + 1} / {place.category}</span><MapPin size={15} className="text-accent" /></div>
            <PlacePhoto place={place} size={90} />
            <GoogleAttribution place={place} />
            <div><h3><Link to={`/discover/${place.id}`} className="tm-focus hover:text-accent">{place.name}</Link></h3><p className="mt-1 text-label text-ink-secondary">{place.locality}</p></div>
          </Card>)}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3 mt-3">
        {[{icon: Compass, title: 'Find your kind of place', text: 'Explore culture, nature and food with a map that keeps you oriented.'}, {icon: Route, title: 'Give each day a direction', text: 'Save your favourites and bring them together in a day-by-day itinerary.'}, {icon: Backpack, title: 'Leave with less on your mind', text: 'Keep your packing, expenses and destination weather beside your plan.'}].map(item => <div key={item.title} className="flex gap-3 p-3"><item.icon size={22} className="shrink-0 text-accent" /><div><h2 className="font-semibold">{item.title}</h2><p className="mt-2 text-body text-ink-secondary">{item.text}</p></div></div>)}
      </div>
      <Card className="tm-demo-banner">
        <div><p className="tm-eyebrow">Take a look around</p><h2 className="text-section font-semibold">A weekend in Chiang Mai, already planned.</h2><p className="mt-2 text-body text-ink-secondary">Try the demo account to explore a sample itinerary, packing list and budget. Your changes stay in this browser.</p><div className="mt-4 flex flex-wrap gap-2"><Link to="/signin" className={LINK_PRIMARY}><LogIn size={15} /> Try the demo</Link><Link to="/register" className={LINK_SECONDARY}><UserPlus size={15} /> Create account</Link></div></div>
        <CredentialPanel />
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------------------- page */

export default function HomeView() {
  const { user } = useData();
  return user ? <Dashboard user={user} /> : <GuestHome />;
}
