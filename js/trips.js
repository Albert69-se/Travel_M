/**
 * Trip creation, editing, deletion, and validation.
 * Validation is kept separate from rendering so it can be tested directly.
 */

import {
  createId,
  isNonEmptyString,
  isNonNegativeNumber,
  isValidIsoDate,
  isValidDateRange,
  listDatesInRange,
  roundMoney,
} from './utils.js';
import { CURRENCY_CODE } from './data.js';

/**
 * Validates a trip form. Returns the parsed values plus a field -> message map,
 * so the interface can show readable errors next to each input.
 */
export function validateTrip(input) {
  const errors = {};
  const name = isNonEmptyString(input.name) ? input.name.trim() : '';
  const destination = isNonEmptyString(input.destination) ? input.destination.trim() : '';
  const startDate = isNonEmptyString(input.startDate) ? input.startDate.trim() : '';
  const endDate = isNonEmptyString(input.endDate) ? input.endDate.trim() : '';
  // An empty budget field must be an error, not a silent zero.
  const rawBudget = typeof input.budget === 'string' ? input.budget.trim() : input.budget;
  const budget = rawBudget === '' || rawBudget === null || rawBudget === undefined ? Number.NaN : Number(rawBudget);

  if (!name) errors.name = 'Enter a trip name.';
  if (!destination) errors.destination = 'Enter at least one destination.';
  if (!isValidIsoDate(startDate)) errors.startDate = 'Enter a start date.';
  if (!isValidIsoDate(endDate)) errors.endDate = 'Enter an end date.';

  if (!errors.startDate && !errors.endDate && !isValidDateRange(startDate, endDate)) {
    errors.endDate = 'The end date cannot be earlier than the start date.';
  }
  if (!isNonNegativeNumber(budget)) {
    errors.budget = 'Enter a budget of zero or more.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    values: {
      name,
      destination,
      destinationId: isNonEmptyString(input.destinationId) ? input.destinationId.trim() : null,
      startDate,
      endDate,
      expectedBudget: isNonNegativeNumber(budget) ? roundMoney(budget) : 0,
    },
  };
}

export function createTrip(input, userId, now = new Date().toISOString()) {
  const { valid, errors, values } = validateTrip(input);
  if (!valid) return { ok: false, errors };

  const trip = {
    id: createId('trip'),
    userId,
    name: values.name,
    destinationLabel: values.destination,
    destinationId: values.destinationId,
    startDate: values.startDate,
    endDate: values.endDate,
    expectedBudget: values.expectedBudget,
    currencyCode: CURRENCY_CODE,
    createdAt: now,
    updatedAt: now,
  };
  return { ok: true, trip };
}

export function updateTrip(trips, tripId, input, userId, now = new Date().toISOString()) {
  const { valid, errors, values } = validateTrip(input);
  if (!valid) return { ok: false, errors };

  // Ownership is enforced in the data layer, not only in the interface (NFR-4).
  const target = getTripById(trips, tripId);
  if (!target) return { ok: false, errors: { form: 'That trip no longer exists.' } };
  if (target.userId !== userId) return { ok: false, errors: { form: 'You can only edit your own trips.' } };

  const next = (Array.isArray(trips) ? trips : []).map((trip) => {
    if (trip.id !== tripId) return trip;
    return {
      ...trip,
      name: values.name,
      destinationLabel: values.destination,
      destinationId: values.destinationId,
      startDate: values.startDate,
      endDate: values.endDate,
      expectedBudget: values.expectedBudget,
      updatedAt: now,
    };
  });

  return { ok: true, trips: next };
}

export function getTripsForUser(trips, userId) {
  if (!Array.isArray(trips)) return [];
  return trips.filter((trip) => trip.userId === userId);
}

export function getTripById(trips, tripId) {
  if (!Array.isArray(trips)) return null;
  return trips.find((trip) => trip.id === tripId) || null;
}

export function listTripDates(trip) {
  if (!trip) return [];
  return listDatesInRange(trip.startDate, trip.endDate);
}

export function tripDayCount(trip) {
  return listTripDates(trip).length;
}

/**
 * Removes a trip and every record that belongs to it, so no itinerary item,
 * packing item, or expense is left without a parent trip.
 */
export function removeTripAndDependents(tripId, data, userId) {
  const source = data && typeof data === 'object' ? data : {};

  // Ownership is enforced in the data layer, not only in the interface (NFR-4).
  const target = getTripById(source.trips, tripId);
  if (!target) return { ok: false, errors: { form: 'That trip no longer exists.' } };
  if (target.userId !== userId) return { ok: false, errors: { form: 'You can only delete your own trips.' } };

  const keepOther = (items) => (Array.isArray(items) ? items.filter((item) => item.tripId !== tripId) : []);
  return {
    ok: true,
    trips: (Array.isArray(source.trips) ? source.trips : []).filter((trip) => trip.id !== tripId),
    itinerary: keepOther(source.itinerary),
    packing: keepOther(source.packing),
    expenses: keepOther(source.expenses),
  };
}
