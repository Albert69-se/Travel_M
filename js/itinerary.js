/**
 * Itinerary activities, grouped by trip day.
 * An activity must fall inside the trip's own date range.
 */

import { createId, isNonEmptyString, isNonNegativeNumber, isDateWithinRange, isValidIsoDate, roundMoney, sortByIsoDate } from './utils.js';

export function validateActivity(input, trip) {
  const errors = {};
  const title = isNonEmptyString(input.title) ? input.title.trim() : '';
  const date = isNonEmptyString(input.date) ? input.date.trim() : '';
  const notes = isNonEmptyString(input.notes) ? input.notes.trim() : '';
  const estimatedCost = input.estimatedCost === '' || input.estimatedCost === undefined ? 0 : Number(input.estimatedCost);

  if (!title) errors.title = 'Enter an activity name.';
  if (!isValidIsoDate(date)) {
    errors.date = 'Enter a date for this activity.';
  } else if (trip && !isDateWithinRange(date, trip.startDate, trip.endDate)) {
    errors.date = `Choose a date between ${trip.startDate} and ${trip.endDate}.`;
  }
  if (!isNonNegativeNumber(estimatedCost)) {
    errors.estimatedCost = 'Enter an estimated cost of zero or more.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    values: { title, date, notes, estimatedCost: isNonNegativeNumber(estimatedCost) ? roundMoney(estimatedCost) : 0 },
  };
}

export function addActivity(itinerary, trip, input) {
  const { valid, errors, values } = validateActivity(input, trip);
  if (!valid) return { ok: false, errors };

  const sameDay = listByTrip(itinerary, trip.id).filter((item) => item.date === values.date);
  const item = {
    id: createId('item'),
    tripId: trip.id,
    placeId: input.placeId || null,
    title: values.title,
    date: values.date,
    notes: values.notes,
    estimatedCost: values.estimatedCost,
    orderIndex: sameDay.length,
  };
  return { ok: true, itinerary: [...(Array.isArray(itinerary) ? itinerary : []), item] };
}

export function updateActivity(itinerary, trip, activityId, input) {
  const { valid, errors, values } = validateActivity(input, trip);
  if (!valid) return { ok: false, errors };

  let found = false;
  const next = (Array.isArray(itinerary) ? itinerary : []).map((item) => {
    if (item.id !== activityId) return item;
    found = true;
    return { ...item, title: values.title, date: values.date, notes: values.notes, estimatedCost: values.estimatedCost };
  });
  if (!found) return { ok: false, errors: { form: 'That activity no longer exists.' } };
  return { ok: true, itinerary: next };
}

export function deleteActivity(itinerary, activityId) {
  if (!Array.isArray(itinerary)) return [];
  return itinerary.filter((item) => item.id !== activityId);
}

/** Chronological order, with a stable tie-break inside the same day. */
export function listByTrip(itinerary, tripId) {
  if (!Array.isArray(itinerary)) return [];
  return itinerary
    .filter((item) => item.tripId === tripId)
    .sort((a, b) => sortByIsoDate(a, b) || (a.orderIndex || 0) - (b.orderIndex || 0));
}

/** Moves an activity one position up or down within its own day. */
export function moveActivity(itinerary, tripId, activityId, direction) {
  const dayItems = listByTrip(itinerary, tripId).filter((item) => {
    const target = itinerary.find((entry) => entry.id === activityId);
    return target ? item.date === target.date : false;
  });
  const index = dayItems.findIndex((item) => item.id === activityId);
  const swapWith = direction === 'up' ? index - 1 : index + 1;
  if (index === -1 || swapWith < 0 || swapWith >= dayItems.length) return itinerary;

  const a = dayItems[index];
  const b = dayItems[swapWith];
  return itinerary.map((item) => {
    if (item.id === a.id) return { ...item, orderIndex: b.orderIndex };
    if (item.id === b.id) return { ...item, orderIndex: a.orderIndex };
    return item;
  });
}

/** Groups a trip's activities into day buckets, in date order. */
export function groupByDay(itinerary, tripId) {
  const groups = new Map();
  for (const item of listByTrip(itinerary, tripId)) {
    if (!groups.has(item.date)) groups.set(item.date, []);
    groups.get(item.date).push(item);
  }
  return [...groups.entries()].map(([date, items]) => ({ date, items }));
}

export function countByTrip(itinerary, tripId) {
  return listByTrip(itinerary, tripId).length;
}
