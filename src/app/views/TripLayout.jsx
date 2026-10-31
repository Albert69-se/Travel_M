/**
 * The trip workspace: breadcrumb, trip identity, edit and delete actions, and
 * the tab bar. Every trip sub-page reads its data from this layout's outlet
 * context, so trip, itinerary, packing and expense figures are derived once.
 */
import { useEffect, useId, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, Backpack, CalendarDays, CloudSun, Pencil, Receipt, Route, Sparkles, Trash2 } from 'lucide-react';

import {
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
import { useData, useTripData } from '../lib/store.jsx';
import { dateRange, dayCountLabel } from '../lib/format.js';

const BLANK_TRIP = { name: '', destination: '', startDate: '', endDate: '', budget: '' };

const TABS = [
  { segment: '', label: 'Overview', icon: Sparkles, end: true },
  { segment: 'itinerary', label: 'Itinerary', icon: Route, end: false },
  { segment: 'packing', label: 'Packing', icon: Backpack, end: false },
  { segment: 'expenses', label: 'Expenses', icon: Receipt, end: false },
  { segment: 'weather', label: 'Weather', icon: CloudSun, end: false },
];

/** The same five fields the create form uses, so `updateTrip` validates one shape. */
function TripForm({ initial, submitLabel, onSubmit, onCancel }) {
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
          autoComplete="off"
        />
      </Field>

      <Field label="Destination" htmlFor={fieldId('destination')} error={errors.destination}>
        <TextInput
          id={fieldId('destination')}
          name="destination"
          value={values.destination}
          onChange={change('destination')}
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
        hint="Zero or more, in the trip's own currency."
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
        />
      </Field>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" variant="primary">
          {submitLabel}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default function TripLayout() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { user, updateTrip, deleteTrip } = useData();
  const tripData = useTripData(tripId);
  const [editing, setEditing] = useState(false);
  const [actionError, setActionError] = useState('');
  const [armed, setArmed] = useState(false);

  const trip = tripData.trip;
  const owned = trip && user ? trip.userId === user.id : true;

  useEffect(() => {
    if (!armed) return undefined;
    const timer = setTimeout(() => setArmed(false), 6000);
    return () => clearTimeout(timer);
  }, [armed]);

  if (!trip || !owned) {
    return (
      <Card>
        <EmptyState
          icon={CalendarDays}
          title="Trip not found"
          description="No trip with this address exists for the signed-in account. It may have been deleted, or it may belong to another account."
          action={
            <Link to="/trips" className="tm-focus rounded-control text-body font-medium text-accent hover:underline">
              Back to my trips
            </Link>
          }
        />
      </Card>
    );
  }

  const handleUpdate = (values) => {
    setActionError('');
    const result = updateTrip(trip.id, values);
    if (!result.ok) return result;
    setEditing(false);
    return result;
  };

  const handleDelete = () => {
    const result = deleteTrip(trip.id);
    if (!result.ok) {
      setActionError(result.errors.form || 'That trip could not be deleted.');
      return;
    }
    navigate('/trips');
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-label text-ink-tertiary">
            <Link to="/trips" className="tm-focus rounded-[4px] hover:text-ink">
              My trips
            </Link>
            <span aria-hidden="true">/</span>
          </nav>
          <h1 className="mt-1 text-title font-semibold text-ink break-words">{trip.name}</h1>
          <p className="mt-1 text-body text-ink-secondary tm-numeric">
            {dateRange(trip.startDate, trip.endDate)} · {dayCountLabel(trip)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {editing ? (
            <Button variant="secondary" onClick={() => setEditing(false)}>
              Cancel edit
            </Button>
          ) : (
            <Button variant="secondary" icon={Pencil} onClick={() => setEditing(true)}>
              Edit trip
            </Button>
          )}

          {armed ? (
            <span className="flex flex-wrap items-center gap-2" role="group" aria-label="Confirm deleting this trip">
              <span className="text-label text-ink-secondary">Delete this trip and its records?</span>
              <Button
                variant="danger"
                onClick={() => {
                  setArmed(false);
                  handleDelete();
                }}
              >
                Confirm delete
              </Button>
              <Button variant="ghost" onClick={() => setArmed(false)}>
                Keep trip
              </Button>
            </span>
          ) : (
            <Button variant="dangerOutline" icon={Trash2} onClick={() => setArmed(true)}>
              Delete
            </Button>
          )}
        </div>
      </header>

      {actionError ? (
        <div role="alert">
          <Notice tone="danger" icon={AlertCircle}>
            {actionError}
          </Notice>
        </div>
      ) : null}

      {editing ? (
        <Card>
          <CardHeader title="Edit trip" meta="Update your destination, dates or budget." />
          <Divider className="my-3" />
          <TripForm
            initial={{
              name: trip.name,
              destination: trip.destinationLabel,
              startDate: trip.startDate,
              endDate: trip.endDate,
              budget: String(trip.expectedBudget),
            }}
            submitLabel="Save changes"
            onSubmit={handleUpdate}
            onCancel={() => setEditing(false)}
          />
        </Card>
      ) : null}

      <nav aria-label="Trip sections" className="tm-trip-tabs border-b border-line">
        <ul className="tm-scroll -mb-px flex gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <li key={tab.label} className="shrink-0">
              <NavLink
                to={`/trips/${trip.id}${tab.segment ? `/${tab.segment}` : ''}`}
                end={tab.end}
                className={({ isActive }) =>
                  `tm-focus relative inline-flex h-[44px] items-center gap-1.5 whitespace-nowrap px-2.5 text-body font-medium transition-colors ${
                    isActive ? 'text-accent' : 'text-ink-secondary hover:text-ink'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <tab.icon size={15} strokeWidth={1.75} aria-hidden="true" />
                    {tab.label}
                    {isActive ? (
                      <span className="absolute inset-x-0 bottom-0 h-0.5 bg-accent" aria-hidden="true" />
                    ) : null}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <Outlet context={tripData} />

      <FinePrint>Sample data — not verified. Trip records are stored in this browser only.</FinePrint>
    </div>
  );
}
