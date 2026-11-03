/**
 * Itinerary — one day at a time.
 *
 * An activity record carries a single date, with no clock time and no duration,
 * so the screen is a day picker plus a flat list per day. It is deliberately not
 * a timetable: any ordering inside a day is a position in the list, not an hour.
 */
import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  GripVertical,
  Pencil,
  Plus,
  Route,
  Trash2,
} from 'lucide-react';

import {
  Button,
  Card,
  CardHeader,
  Divider,
  EmptyState,
  Field,
  FinePrint,
  IconButton,
  Notice,
  Row,
  Select,
  TextArea,
  TextInput,
} from '../components/ui.jsx';
import { useData } from '../lib/store.jsx';
import { dateRange, dayCountLabel, money, weekdayDate } from '../lib/format.js';
import { getSavedPlaces } from '../../core/places.js';

const EMPTY_FORM = { title: '', date: '', notes: '', estimatedCost: '', placeId: null };

export default function ItineraryView() {
  const { trip, activities, activityGroups, days } = useOutletContext();
  const { user, places, savedPlaces, addActivity, updateActivity, deleteActivity, moveActivity } = useData();

  const [selectedDate, setSelectedDate] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const countsByDate = useMemo(() => {
    const counts = new Map();
    for (const group of activityGroups) counts.set(group.date, group.items.length);
    return counts;
  }, [activityGroups]);

  const savedPlaceOptions = useMemo(
    () => (user ? getSavedPlaces(savedPlaces, places, user.id) : []),
    [savedPlaces, places, user],
  );

  const activeDate = selectedDate && days.includes(selectedDate) ? selectedDate : days[0] || '';
  const activeIndex = days.indexOf(activeDate);

  const dayActivities = useMemo(() => {
    const group = activityGroups.find((entry) => entry.date === activeDate);
    return group ? group.items : [];
  }, [activityGroups, activeDate]);

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const clearForm = (date = activeDate) => {
    setEditingId(null);
    setErrors({});
    setForm({ ...EMPTY_FORM, date });
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setConfirmId(null);
    setErrors({});
    setForm({
      title: item.title,
      date: item.date,
      notes: item.notes || '',
      estimatedCost: String(item.estimatedCost ?? ''),
      placeId: item.placeId || null,
    });
  };

  const handleSavedPlace = (event) => {
    const placeId = event.target.value;
    const place = savedPlaceOptions.find((entry) => entry.id === placeId);
    setForm((current) => (place ? { ...current, placeId: place.id, title: place.name } : { ...current, placeId: null }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const input = {
      title: form.title,
      date: form.date,
      notes: form.notes,
      estimatedCost: form.estimatedCost,
      placeId: form.placeId,
    };
    const result = editingId ? updateActivity(trip, editingId, input) : addActivity(trip, input);
    if (!result.ok) {
      setErrors(result.errors || {});
      return;
    }
    const savedDate = form.date;
    clearForm(savedDate);
    if (days.includes(savedDate)) setSelectedDate(savedDate);
  };

  const handleDelete = (activityId) => {
    deleteActivity(activityId);
    setConfirmId(null);
    if (editingId === activityId) clearForm();
  };

  const placeCaveat = (
    <Notice tone="warning" icon={AlertTriangle}>
      Place records in this prototype are sample data — not verified facts.
    </Notice>
  );

  const totalLabel = activities.length === 1 ? '1 activity planned' : `${activities.length} activities planned`;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-title font-semibold text-ink">Itinerary</h1>
          <p className="mt-0.5 text-body text-ink-secondary">
            {dateRange(trip.startDate, trip.endDate)} · {dayCountLabel(trip)}
          </p>
        </div>
        <p className="text-label text-ink-tertiary tm-numeric">{totalLabel}</p>
      </header>

      {days.length === 0 ? (
        <div className="flex flex-col gap-4">
          <Card>
            <EmptyState
              icon={Route}
              title="This trip has no dated days"
              description="Set a start and end date on the trip first — an activity must fall inside the trip range."
            />
          </Card>
          {placeCaveat}
        </div>
      ) : (
        <>
          <div className="tm-scroll flex gap-2 overflow-x-auto pb-1">
            {days.map((date, index) => {
              const selected = date === activeDate;
              const count = countsByDate.get(date) || 0;
              return (
                <button
                  key={date}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setSelectedDate(date)}
                  className={`tm-focus flex min-w-[138px] shrink-0 flex-col items-start gap-0.5 rounded-card border px-3 py-2 text-left transition-colors ${
                    selected ? 'border-accent bg-tint' : 'border-line bg-surface hover:border-line-strong'
                  }`}
                >
                  <span className={`text-label font-medium ${selected ? 'text-accent' : 'text-ink'}`}>
                    Day {index + 1} · {weekdayDate(date)}
                  </span>
                  <span className="text-micro uppercase text-ink-tertiary tm-numeric">
                    {count === 1 ? '1 activity' : `${count} activities`}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <Card data-fr="FR-7" padded={false} className="overflow-hidden">
              <div className="p-4">
                <CardHeader
                  title={weekdayDate(activeDate)}
                  meta={`Day ${activeIndex + 1} of ${days.length} · ${
                    dayActivities.length === 1 ? '1 activity' : `${dayActivities.length} activities`
                  }`}
                />
              </div>
              <Divider />
              {dayActivities.length === 0 ? (
                <EmptyState
                  icon={Route}
                  title="Nothing planned for this day"
                  description="Use the form beside this list to add the first activity, or pick another day above."
                />
              ) : (
                <div className="tm-scroll max-h-[560px] overflow-y-auto">
                  {dayActivities.map((item, index) => (
                    <Row key={item.id} className="gap-2">
                      <GripVertical
                        size={15}
                        strokeWidth={1.75}
                        aria-hidden="true"
                        className="shrink-0 text-ink-tertiary"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-body font-medium text-ink">{item.title}</p>
                        {item.notes ? (
                          <p className="mt-0.5 truncate text-label text-ink-tertiary">{item.notes}</p>
                        ) : null}
                      </div>
                      <span className="shrink-0 text-body font-medium text-ink tm-numeric">
                        {money(item.estimatedCost)}
                      </span>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <IconButton
                          icon={ArrowUp}
                          label={`Move ${item.title} earlier in the day`}
                          disabled={index === 0}
                          className="disabled:opacity-40"
                          onClick={() => moveActivity(trip.id, item.id, 'up')}
                        />
                        <IconButton
                          icon={ArrowDown}
                          label={`Move ${item.title} later in the day`}
                          disabled={index === dayActivities.length - 1}
                          className="disabled:opacity-40"
                          onClick={() => moveActivity(trip.id, item.id, 'down')}
                        />
                        <IconButton icon={Pencil} label={`Edit ${item.title}`} onClick={() => startEdit(item)} />
                        {confirmId === item.id ? (
                          <>
                            <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)}>
                              Delete
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setConfirmId(null)}>
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <IconButton
                            icon={Trash2}
                            label={`Delete ${item.title}`}
                            onClick={() => setConfirmId(item.id)}
                          />
                        )}
                      </div>
                    </Row>
                  ))}
                </div>
              )}
            </Card>

            <div className="flex flex-col gap-4">
              <Card data-fr="FR-7" className="flex flex-col gap-3">
                <CardHeader
                  title={editingId ? 'Edit activity' : 'Add an activity'}
                  meta={editingId ? 'Saving replaces the stored record.' : 'One date per activity.'}
                />
                <form className="flex flex-col gap-3" onSubmit={handleSubmit} noValidate>
                  {editingId ? null : (
                    <Field
                      label="From a saved place"
                      htmlFor="activity-place"
                      hint={
                        savedPlaceOptions.length > 0
                          ? 'Optional — fills the title with the place name.'
                          : 'Save a place first to add an activity from it.'
                      }
                    >
                      <Select
                        id="activity-place"
                        value={form.placeId || ''}
                        onChange={handleSavedPlace}
                        disabled={savedPlaceOptions.length === 0}
                      >
                        <option value="">No saved place</option>
                        {savedPlaceOptions.map((place) => (
                          <option key={place.id} value={place.id}>
                            {place.name}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  )}

                  <Field label="Title" htmlFor="activity-title" error={errors.title}>
                    <TextInput
                      id="activity-title"
                      value={form.title}
                      onChange={(event) => setField('title', event.target.value)}
                      placeholder="e.g. Old City Gate"
                    />
                  </Field>

                  <Field label="Date" htmlFor="activity-date" error={errors.date}>
                    <TextInput
                      id="activity-date"
                      type="date"
                      min={trip.startDate}
                      max={trip.endDate}
                      value={form.date}
                      onChange={(event) => setField('date', event.target.value)}
                    />
                  </Field>

                  <Field label="Notes" htmlFor="activity-notes" error={errors.notes} hint="Optional.">
                    <TextArea
                      id="activity-notes"
                      rows={2}
                      value={form.notes}
                      onChange={(event) => setField('notes', event.target.value)}
                      placeholder="Anything to remember about this stop"
                    />
                  </Field>

                  <Field
                    label="Estimated cost"
                    htmlFor="activity-cost"
                    error={errors.estimatedCost}
                    hint="Estimate only — sample records are not verified."
                  >
                    <TextInput
                      id="activity-cost"
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={form.estimatedCost}
                      onChange={(event) => setField('estimatedCost', event.target.value)}
                    />
                  </Field>

                  {errors.form ? (
                    <p className="text-label text-danger" role="alert">
                      {errors.form}
                    </p>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="submit" variant="primary" icon={editingId ? Check : Plus}>
                      {editingId ? 'Save changes' : 'Add activity'}
                    </Button>
                    {editingId ? (
                      <Button variant="ghost" onClick={() => clearForm()}>
                        Cancel
                      </Button>
                    ) : null}
                  </div>
                </form>
                <FinePrint>Activities hold one date. This prototype stores no clock times or durations.</FinePrint>
              </Card>

              {placeCaveat}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
