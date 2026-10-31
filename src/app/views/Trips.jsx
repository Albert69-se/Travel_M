/**
 * My trips — the signed-in traveller's trips, plus an inline create form.
 *
 * Every rule about a trip lives in `core/trips.js`. This view only renders the
 * messages that module returns, so the wording a traveller reads is the same
 * wording the core logic tests assert on. Input names are the ones
 * `validateTrip`/`createTrip` read: name, destination, startDate, endDate, budget.
 */
import { useEffect, useId, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CalendarDays, MapPin, Plus, Trash2, Wallet } from 'lucide-react';

import {
  Badge,
  Button,
  Card,
  CardHeader,
  Divider,
  EmptyState,
  Field,
  FinePrint,
  Notice,
  TextInput,
} from '../components/ui.jsx';
import { useData } from '../lib/store.jsx';
import { countdownLabel, dateRange, dayCountLabel, money } from '../lib/format.js';

const BLANK_TRIP = { name: '', destination: '', startDate: '', endDate: '', budget: '' };

/**
 * The five fields `validateTrip` reads. Field state is local; the mutation is
 * owned by the caller, which returns `{ ok: false, errors }` for the form to
 * print next to the offending input.
 */
function TripForm({ initial = BLANK_TRIP, submitLabel = 'Save trip', onSubmit, onCancel }) {
  const [values, setValues] = useState(() => ({ ...BLANK_TRIP, ...initial }));
  const [errors, setErrors] = useState({});
  const formId = useId();

  const change = (field) => (event) => {
    const { value } = event.target;
    setValues((previous) => ({ ...previous, [field]: value }));
  };

  const submit = (event) => {
    event.preventDefault();
    const result = onSubmit(values);
    if (result && result.ok === false) setErrors(result.errors || {});
  };

  const fieldId = (field) => `${formId}-${field}`;

  return (
    <form className="flex flex-col gap-3" onSubmit={submit} noValidate>
      {errors.form ? (
        <div role="alert">
          <Notice tone="danger" icon={AlertCircle}>
            {errors.form}
          </Notice>
        </div>
      ) : null}

      <Field label="Trip name" htmlFor={fieldId('name')} error={errors.name}>
        <TextInput
          id={fieldId('name')}
          name="name"
          value={values.name}
          onChange={change('name')}
          placeholder="Weekend in Chiang Mai"
          autoComplete="off"
        />
      </Field>

      <Field
        label="Destination"
        htmlFor={fieldId('destination')}
        error={errors.destination}
        hint="A city or region, such as Chiang Mai."
      >
        <TextInput
          id={fieldId('destination')}
          name="destination"
          value={values.destination}
          onChange={change('destination')}
          placeholder="Chiang Mai"
          autoComplete="off"
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Start date" htmlFor={fieldId('startDate')} error={errors.startDate}>
          <TextInput
            id={fieldId('startDate')}
            name="startDate"
            type="date"
            value={values.startDate}
            onChange={change('startDate')}
          />
        </Field>
        <Field label="End date" htmlFor={fieldId('endDate')} error={errors.endDate}>
          <TextInput
            id={fieldId('endDate')}
            name="endDate"
            type="date"
            value={values.endDate}
            onChange={change('endDate')}
          />
        </Field>
      </div>

      <Field
        label="Expected budget"
        htmlFor={fieldId('budget')}
        error={errors.budget}
        hint="Your total planned spend. You can change this later."
      >
        <TextInput
          id={fieldId('budget')}
          name="budget"
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={values.budget}
          onChange={change('budget')}
          placeholder="5000"
        />
      </Field>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" variant="primary">
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}

/**
 * Deleting a trip also deletes its itinerary, packing list and expenses, so it
 * is confirmed in two steps — never `window.confirm`, which cannot be styled,
 * described or undone.
 */
function ConfirmDelete({ onConfirm }) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return undefined;
    const timer = setTimeout(() => setArmed(false), 6000);
    return () => clearTimeout(timer);
  }, [armed]);

  if (!armed) {
    return (
      <Button variant="dangerOutline" icon={Trash2} onClick={() => setArmed(true)}>
        Delete
      </Button>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-2" role="group" aria-label="Confirm deleting this trip">
      <span className="text-label text-ink-secondary">Delete this trip and its records?</span>
      <Button
        variant="danger"
        onClick={() => {
          setArmed(false);
          onConfirm();
        }}
      >
        Confirm delete
      </Button>
      <Button variant="ghost" onClick={() => setArmed(false)}>
        Keep trip
      </Button>
    </span>
  );
}

export default function TripsView() {
  const { trips, user, createTrip, deleteTrip } = useData();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState('');

  const mine = trips.filter((trip) => user && trip.userId === user.id);
  const ordered = [...mine].sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
  const showForm = creating || params.get('new') === '1' || ordered.length === 0;

  const handleCreate = (values) => {
    setActionError('');
    const result = createTrip(values);
    if (!result.ok) return result;
    setCreating(false);
    navigate(`/trips/${result.trip.id}`);
    return result;
  };

  const handleDelete = (tripId) => {
    const result = deleteTrip(tripId);
    setActionError(result.ok ? '' : result.errors.form || 'That trip could not be deleted.');
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-title font-semibold text-ink">My trips</h1>
          <p className="mt-1 text-body text-ink-secondary">
            {ordered.length === 0
              ? 'No trips yet'
              : `${ordered.length} ${ordered.length === 1 ? 'trip' : 'trips'} planned`}
            {user ? ` · ${user.name}` : ''}
          </p>
        </div>
        {ordered.length > 0 ? (
          <Button
            variant="primary"
            icon={Plus}
            aria-expanded={showForm}
            onClick={() => { setCreating(!showForm); setParams({}, { replace: true }); }}
          >
            {showForm ? 'Close form' : 'New trip'}
          </Button>
        ) : null}
      </header>

      {actionError ? (
        <div role="alert">
          <Notice tone="danger" icon={AlertCircle}>
            {actionError}
          </Notice>
        </div>
      ) : null}

      {ordered.length === 0 ? (
        <Card>
          <EmptyState
            icon={CalendarDays}
            title="No trips yet"
            description="A trip holds its own days, itinerary, packing list, expenses and forecast. Create one below and everything else follows from it."
          />
        </Card>
      ) : null}

      {showForm ? (
        <Card>
          <CardHeader title="New trip" meta="Pick a destination and dates. The details can come later." />
          <Divider className="my-3" />
          <TripForm
            submitLabel="Create trip"
            onSubmit={handleCreate}
            onCancel={ordered.length > 0 ? () => { setCreating(false); setParams({}, { replace: true }); } : undefined}
          />
        </Card>
      ) : null}

      {ordered.length > 0 ? (
        <ul className="tm-trips-grid">
          {ordered.map((trip) => (
            <li key={trip.id}>
              <Card className="tm-trip-card flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to={`/trips/${trip.id}`}
                      className="tm-focus rounded-control text-card-title font-semibold text-ink hover:text-accent"
                    >
                      {trip.name}
                    </Link>
                    <Badge tone="neutral">{countdownLabel(trip.startDate)}</Badge>
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-label text-ink-secondary">
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={13} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-ink-tertiary" />
                      {trip.destinationLabel}
                    </span>
                    <span className="inline-flex items-center gap-1 tm-numeric">
                      <CalendarDays size={13} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-ink-tertiary" />
                      {dateRange(trip.startDate, trip.endDate)}
                    </span>
                    <span className="tm-numeric">{dayCountLabel(trip)}</span>
                    <span className="inline-flex items-center gap-1 tm-numeric">
                      <Wallet size={13} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-ink-tertiary" />
                      {money(trip.expectedBudget, trip.currencyCode)}
                    </span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="secondary" onClick={() => navigate(`/trips/${trip.id}`)}>
                    Open trip
                  </Button>
                  <ConfirmDelete onConfirm={() => handleDelete(trip.id)} />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      ) : null}

      <FinePrint>
        Sample data — not verified. Trip records are stored in this browser for {user ? user.name : 'this account'} only.
      </FinePrint>
    </div>
  );
}
