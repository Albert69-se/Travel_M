import { discoverGooglePlaces, normalizeGooglePlace } from '../src/core/google-places.js';
import { normalizePhotoName, selectMatchingArticle, plainCredit } from '../src/core/commons-photo.js';
import { requestLocation, watchLocation } from '../src/core/location.js';
/**
 * Automated tests for the core application logic.
 *
 * Run with:  node --test
 * Node's built-in test runner is used, so there is no testing dependency.
 * Only DOM-free modules are imported here.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  createId,
  formatMoney,
  isDateWithinRange,
  isNonNegativeNumber,
  isPositiveNumber,
  isValidDateRange,
  isValidIsoDate,
  listDatesInRange,
  roundMoney,
} from '../src/core/utils.js';

import { findPlaces, getPlaceById, getSavedPlaces, isPlaceSaved, removeSavedPlace, savePlace } from '../src/core/places.js';
import { isImportablePlace, loadThailandPlaces, loadReferencedLegacyPlaces } from '../src/core/thailand.js';
import { POPULAR_THAILAND_PLACES } from '../src/core/featured.js';
import { DEFAULT_PLACES } from '../src/core/data.js';
import { mapsDirectionsUrl, mapsPlaceUrl } from '../src/core/google-maps-links.js';
import * as tripsApi from '../src/core/trips.js';
import * as itineraryApi from '../src/core/itinerary.js';
import * as packingApi from '../src/core/packing.js';
import * as expensesApi from '../src/core/expenses.js';
import * as authApi from '../src/core/auth.js';
import {
  ACTIVE_MAP_MODE,
  MAP_MODES,
  boundsForPlaces,
  describeAvailability,
  describeProvider,
  formatCoordinates,
  getMappablePlaces,
  isUsableCoordinate,
  MIN_ATTRACTION_MARKER_ZOOM,
  ATTRACTION_MARKER_LIMIT,
  clusterMapPlaces,
  selectVisibleMapPlaces,
} from '../src/core/map.js';

const TRIP = {
  id: 'trip-1',
  userId: 'user-demo',
  name: 'Weekend in Chiang Mai',
  destinationLabel: 'Chiang Mai',
  startDate: '2026-11-12',
  endDate: '2026-11-15',
  expectedBudget: 5000,
  currencyCode: 'THB',
};

test('open-photo matching accepts only a nearby matching landmark, never a neighbour', () => {
  const pages = [
    { title: 'Doi Suthep–Pui National Park', dist: 50, pageid: 20 },
    { title: 'Wat Phra That Doi Suthep', dist: 80, pageid: 10 },
    { title: 'Wat Phra That Doi Suthep', dist: 900, pageid: 30 },
  ];
  assert.equal(selectMatchingArticle('Wat Phra That Doi Suthep', pages)?.pageid, 10);
  assert.equal(selectMatchingArticle('Unknown Night Market', pages), null);
  assert.equal(selectMatchingArticle('Doi Suthep', [{ title: 'Doi Suthep–Pui National Park', dist: 100 }]), null);
  assert.equal(normalizePhotoName('Wat Rong Khun (White Temple)'), 'wat rong khun');
  assert.equal(plainCredit('<a href="test">Example Author</a> &amp; Team'), 'Example Author & Team');
});

/* -------------------------------------------------------------- utils ---- */

test('createId produces unique identifiers with a prefix', () => {
  const ids = new Set();
  for (let i = 0; i < 500; i += 1) ids.add(createId('trip'));
  assert.equal(ids.size, 500);
  assert.ok([...ids].every((id) => id.startsWith('trip-')));
});

test('roundMoney avoids binary floating point drift', () => {
  assert.equal(roundMoney(0.1 + 0.2), 0.3);
  assert.equal(roundMoney(19.999), 20);
});

test('formatMoney shows the trip currency and two decimals', () => {
  assert.ok(formatMoney(5000, 'THB').includes('5,000.00'));
  assert.equal(formatMoney(Number.NaN), '-');
});

test('date helpers reject malformed values and enforce the inclusive range', () => {
  assert.equal(isValidIsoDate('2026-11-12'), true);
  assert.equal(isValidIsoDate('12/11/2026'), false);
  assert.equal(isValidIsoDate(''), false);
  assert.equal(isValidDateRange('2026-11-15', '2026-11-12'), false);
  assert.equal(isValidDateRange('2026-11-12', '2026-11-15'), true);
  assert.equal(isDateWithinRange('2026-11-14', '2026-11-12', '2026-11-15'), true);
  assert.equal(isDateWithinRange('2026-11-16', '2026-11-12', '2026-11-15'), false);
  assert.deepEqual(listDatesInRange('2026-11-12', '2026-11-15'), [
    '2026-11-12',
    '2026-11-13',
    '2026-11-14',
    '2026-11-15',
  ]);
});

test('calendar date validation rejects rollover dates and accepts actual leap days', () => {
  assert.equal(isValidIsoDate('2026-02-30'), false);
  assert.equal(isValidIsoDate('2026-02-29'), false);
  assert.equal(isValidIsoDate('2024-02-29'), true);
  assert.equal(isValidIsoDate('2026-04-31'), false);
  assert.equal(isValidIsoDate('0099-12-31'), true);
  assert.deepEqual(listDatesInRange('2026-02-30', '2026-03-01'), []);
});

test('Google Maps links work without an API key', () => {
  const sample = { name: 'Doi Suthep', latitude: 18.8049, longitude: 98.9216 };
  const search = new URL(mapsPlaceUrl(sample));
  const directions = new URL(mapsDirectionsUrl(sample));
  assert.equal(search.host, 'www.google.com');
  assert.equal(search.searchParams.get('query'), '18.8049,98.9216');
  assert.equal(directions.searchParams.get('destination'), '18.8049,98.9216');
  assert.equal(search.searchParams.has('key'), false);
  assert.equal(directions.searchParams.has('key'), false);
});

test('positive amounts which round to zero cannot become saved expenses', () => {
  const result = expensesApi.validateExpense({
    description: 'Test', amount: '0.001', category: 'Food', date: '2026-11-12',
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.amount);
});

test('numeric guards distinguish positive, non-negative, and invalid input', () => {
  assert.equal(isPositiveNumber(1), true);
  assert.equal(isPositiveNumber(0), false);
  assert.equal(isNonNegativeNumber(0), true);
  assert.equal(isNonNegativeNumber(-1), false);
  assert.equal(isNonNegativeNumber(Number.NaN), false);
});

/* -------------------------------------------------------------- trips ---- */

test('trip validation requires name, destination, dates, and a valid budget', () => {
  const empty = tripsApi.validateTrip({ name: '', destination: '', startDate: '', endDate: '', budget: '' });
  assert.equal(empty.valid, false);
  assert.ok(empty.errors.name);
  assert.ok(empty.errors.destination);
  assert.ok(empty.errors.startDate);
  assert.ok(empty.errors.endDate);
  assert.ok(empty.errors.budget);
});

test('an end date earlier than the start date is rejected', () => {
  const result = tripsApi.validateTrip({
    name: 'Trip',
    destination: 'Chiang Mai',
    startDate: '2026-11-15',
    endDate: '2026-11-12',
    budget: '1000',
  });
  assert.equal(result.valid, false);
  assert.match(result.errors.endDate, /cannot be earlier/);
});

test('a negative budget is rejected and zero is allowed', () => {
  const negative = tripsApi.validateTrip({ name: 'A', destination: 'B', startDate: '2026-11-12', endDate: '2026-11-13', budget: '-5' });
  assert.equal(negative.valid, false);
  assert.ok(negative.errors.budget);

  const zero = tripsApi.validateTrip({ name: 'A', destination: 'B', startDate: '2026-11-12', endDate: '2026-11-13', budget: '0' });
  assert.equal(zero.valid, true);
});

test('created trips get unique ids and the signed-in owner', () => {
  const first = tripsApi.createTrip({ name: 'One', destination: 'Chiang Mai', startDate: '2026-11-12', endDate: '2026-11-13', budget: '100' }, 'user-demo');
  const second = tripsApi.createTrip({ name: 'Two', destination: 'Chiang Mai', startDate: '2026-11-12', endDate: '2026-11-13', budget: '100' }, 'user-demo');
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.notEqual(first.trip.id, second.trip.id);
  assert.equal(first.trip.userId, 'user-demo');
  assert.equal(first.trip.expectedBudget, 100);
});

test('invalid input never produces a trip', () => {
  const result = tripsApi.createTrip({ name: '', destination: '', startDate: '', endDate: '', budget: 'x' }, 'user-demo');
  assert.equal(result.ok, false);
  assert.equal(result.trip, undefined);
});

test('updating a trip keeps the same record and refreshes updatedAt', () => {
  const { trip } = tripsApi.createTrip({ name: 'Old', destination: 'Chiang Mai', startDate: '2026-11-12', endDate: '2026-11-13', budget: '100' }, 'user-demo');
  const result = tripsApi.updateTrip([trip], trip.id, { name: 'New', destination: 'Chiang Rai', startDate: '2026-11-12', endDate: '2026-11-14', budget: '250' }, 'user-demo', '2026-10-20T00:00:00.000Z');
  assert.equal(result.ok, true);
  assert.equal(result.trips.length, 1);
  assert.equal(result.trips[0].id, trip.id);
  assert.equal(result.trips[0].name, 'New');
  assert.equal(result.trips[0].expectedBudget, 250);
});

test('deleting a trip removes its itinerary, packing, and expense records', () => {
  const data = {
    trips: [TRIP, { ...TRIP, id: 'trip-2' }],
    itinerary: [{ id: 'i1', tripId: 'trip-1' }, { id: 'i2', tripId: 'trip-2' }],
    packing: [{ id: 'p1', tripId: 'trip-1' }, { id: 'p2', tripId: 'trip-2' }],
    expenses: [{ id: 'e1', tripId: 'trip-1' }, { id: 'e2', tripId: 'trip-2' }],
  };
  const after = tripsApi.removeTripAndDependents('trip-1', data, 'user-demo');
  assert.deepEqual(after.trips.map((t) => t.id), ['trip-2']);
  assert.deepEqual(after.itinerary.map((i) => i.id), ['i2']);
  assert.deepEqual(after.packing.map((p) => p.id), ['p2']);
  assert.deepEqual(after.expenses.map((e) => e.id), ['e2']);
});

/* ---------------------------------------------------------- itinerary ---- */

test('an activity outside the trip date range is rejected', () => {
  const result = itineraryApi.addActivity([], TRIP, { title: 'Late', date: '2026-12-01', estimatedCost: '0' });
  assert.equal(result.ok, false);
  assert.match(result.errors.date, /between/);
});

test('activities are added, listed chronologically, and ordered within a day', () => {
  let itinerary = [];
  const first = itineraryApi.addActivity(itinerary, TRIP, { title: 'Morning', date: '2026-11-12' });
  itinerary = first.itinerary;
  const second = itineraryApi.addActivity(itinerary, TRIP, { title: 'Afternoon', date: '2026-11-12' });
  itinerary = second.itinerary;
  const third = itineraryApi.addActivity(itinerary, TRIP, { title: 'Later day', date: '2026-11-13' });
  itinerary = third.itinerary;

  assert.deepEqual(itineraryApi.listByTrip(itinerary, TRIP.id).map((item) => item.title), ['Morning', 'Afternoon', 'Later day']);
  assert.equal(itineraryApi.countByTrip(itinerary, TRIP.id), 3);

  const grouped = itineraryApi.groupByDay(itinerary, TRIP.id);
  assert.equal(grouped.length, 2);
  assert.equal(grouped[0].date, '2026-11-12');
  assert.equal(grouped[0].items.length, 2);
});

test('moving an activity changes its order inside the day only', () => {
  let itinerary = [];
  itinerary = itineraryApi.addActivity(itinerary, TRIP, { title: 'A', date: '2026-11-12' }).itinerary;
  itinerary = itineraryApi.addActivity(itinerary, TRIP, { title: 'B', date: '2026-11-12' }).itinerary;
  const target = itinerary.find((item) => item.title === 'B');
  const moved = itineraryApi.moveActivity(itinerary, TRIP.id, target.id, 'up');
  assert.deepEqual(itineraryApi.listByTrip(moved, TRIP.id).map((item) => item.title), ['B', 'A']);
});

test('removing an activity does not touch the other records', () => {
  let itinerary = [];
  itinerary = itineraryApi.addActivity(itinerary, TRIP, { title: 'A', date: '2026-11-12' }).itinerary;
  itinerary = itineraryApi.addActivity(itinerary, TRIP, { title: 'B', date: '2026-11-12' }).itinerary;
  const after = itineraryApi.deleteActivity(itinerary, itinerary[0].id);
  assert.equal(after.length, 1);
  assert.equal(after[0].title, 'B');
});

/* ------------------------------------------------------------ packing ---- */

test('packing items are added, toggled, and counted', () => {
  let packing = packingApi.addPackingItem([], TRIP.id, 'Passport').packing;
  packing = packingApi.addPackingItem(packing, TRIP.id, 'Charger').packing;
  assert.deepEqual(packingApi.packingCounts(packing, TRIP.id), { packed: 0, total: 2, remaining: 2 });

  packing = packingApi.togglePackingItem(packing, packing[0].id);
  assert.deepEqual(packingApi.packingCounts(packing, TRIP.id), { packed: 1, total: 2, remaining: 1 });

  packing = packingApi.deletePackingItem(packing, packing[1].id);
  assert.deepEqual(packingApi.packingCounts(packing, TRIP.id), { packed: 1, total: 1, remaining: 0 });
});

test('one trip never sees another trip packing items', () => {
  let packing = packingApi.addPackingItem([], 'trip-1', 'Passport').packing;
  packing = packingApi.addPackingItem(packing, 'trip-2', 'Towel').packing;
  assert.deepEqual(packingApi.listByTrip(packing, 'trip-1').map((item) => item.name), ['Passport']);
  assert.deepEqual(packingApi.listByTrip(packing, 'trip-2').map((item) => item.name), ['Towel']);
});

test('suggestions are skipped when the item already exists', () => {
  const packing = packingApi.addPackingItem([], TRIP.id, 'Sun protection').packing;
  const suggested = packingApi.suggestPackingItems(packing, TRIP.id, ['Sun protection', 'Rain layer']);
  assert.equal(suggested.length, 2);
  assert.deepEqual(packingApi.listByTrip(suggested, TRIP.id).map((item) => item.name), ['Sun protection', 'Rain layer']);
});

test('an empty packing name is rejected', () => {
  const result = packingApi.addPackingItem([], TRIP.id, '   ');
  assert.equal(result.ok, false);
  assert.ok(result.errors.name);
});

/* ----------------------------------------------------------- expenses ---- */

test('expense validation rejects zero, negative, and non-numeric amounts', () => {
  const base = { description: 'Taxi', category: 'Transport', date: '2026-11-12' };
  assert.ok(expensesApi.validateExpense({ ...base, amount: '0' }).errors.amount);
  assert.ok(expensesApi.validateExpense({ ...base, amount: '-5' }).errors.amount);
  assert.ok(expensesApi.validateExpense({ ...base, amount: 'abc' }).errors.amount);
  assert.ok(expensesApi.validateExpense({ ...base, amount: '10', category: 'Nope' }).errors.category);
  assert.ok(expensesApi.validateExpense({ ...base, amount: '10', date: 'nope' }).errors.date);
  assert.ok(expensesApi.validateExpense({ ...base, amount: '10', description: '' }).errors.description);
  assert.equal(expensesApi.validateExpense({ ...base, amount: '10' }).valid, true);
});

test('total spent, remaining budget, and the worked example from the specification', () => {
  const trip = { ...TRIP, id: 'trip-budget', expectedBudget: 1000 };
  let expenses = [];
  expenses = expensesApi.addExpense(expenses, trip.id, { description: 'A', amount: '235', category: 'Food', date: '2026-11-12' }).expenses;

  assert.equal(expensesApi.totalSpent(expenses, trip.id), 235);
  assert.equal(expensesApi.remainingBudget(expenses, trip), 765);
});

test('overspending keeps a negative remainder instead of clamping to zero', () => {
  const trip = { ...TRIP, id: 'trip-over', expectedBudget: 1000 };
  let expenses = [];
  expenses = expensesApi.addExpense(expenses, trip.id, { description: 'Big', amount: '1200', category: 'Tickets', date: '2026-11-12' }).expenses;
  assert.equal(expensesApi.remainingBudget(expenses, trip), -200);

  const status = expensesApi.budgetStatus(expenses, trip);
  assert.equal(status.level, 'over');
  assert.match(status.message, /over the planned budget/);
});

test('the nearing-budget warning starts at exactly 80 percent', () => {
  const trip = { ...TRIP, id: 'trip-near', expectedBudget: 1000 };
  const build = (amount) => {
    let expenses = [];
    expenses = expensesApi.addExpense(expenses, trip.id, { description: 'x', amount: String(amount), category: 'Food', date: '2026-11-12' }).expenses;
    return expensesApi.budgetStatus(expenses, trip);
  };

  assert.equal(build(799).level, 'ok');
  assert.equal(build(800).level, 'nearing');
  assert.equal(build(999).level, 'nearing');
  assert.equal(build(1000).level, 'nearing');
  assert.equal(build(1001).level, 'over');
});

test('category totals sum back to the same total spent', () => {
  let expenses = [];
  expenses = expensesApi.addExpense(expenses, TRIP.id, { description: 'Transport', amount: '900', category: 'Transport', date: '2026-11-12' }).expenses;
  expenses = expensesApi.addExpense(expenses, TRIP.id, { description: 'Museum', amount: '450', category: 'Tickets', date: '2026-11-12' }).expenses;
  expenses = expensesApi.addExpense(expenses, TRIP.id, { description: 'Meals', amount: '600', category: 'Food', date: '2026-11-13' }).expenses;

  const totals = expensesApi.totalsByCategory(expenses, TRIP.id);
  const summed = totals.reduce((total, entry) => total + entry.amount, 0);
  assert.equal(summed, expensesApi.totalSpent(expenses, TRIP.id));
  assert.equal(summed, 1950);

  const status = expensesApi.budgetStatus(expenses, TRIP);
  assert.equal(status.remaining, 3050);
  assert.equal(status.percentSpent, 39);
});

test('editing and deleting an expense recalculates from the current records', () => {
  let expenses = [];
  expenses = expensesApi.addExpense(expenses, TRIP.id, { description: 'A', amount: '100', category: 'Food', date: '2026-11-12' }).expenses;
  expenses = expensesApi.addExpense(expenses, TRIP.id, { description: 'B', amount: '50', category: 'Food', date: '2026-11-12' }).expenses;

  const edited = expensesApi.updateExpense(expenses, expenses[0].id, { description: 'A', amount: '200', category: 'Food', date: '2026-11-12' });
  assert.equal(edited.ok, true);
  assert.equal(expensesApi.totalSpent(edited.expenses, TRIP.id), 250);

  const deleted = expensesApi.deleteExpense(edited.expenses, expenses[0].id);
  assert.equal(expensesApi.totalSpent(deleted, TRIP.id), 50);
});

test('a rejected expense leaves the stored list unchanged', () => {
  const expenses = expensesApi.addExpense([], TRIP.id, { description: 'Ok', amount: '10', category: 'Food', date: '2026-11-12' }).expenses;
  const result = expensesApi.addExpense(expenses, TRIP.id, { description: 'Bad', amount: '-1', category: 'Food', date: '2026-11-12' });
  assert.equal(result.ok, false);
  assert.equal(result.expenses, undefined);
  assert.equal(expenses.length, 1);
});

/* ------------------------------------------------------------- places ---- */

const PLACES = [
  { id: 'p1', name: 'Doi Suthep', locality: 'Chiang Mai', category: 'Culture', description: 'Temple on a mountain', estimatedCost: 30 },
  { id: 'p2', name: 'Mae Sa Waterfall', locality: 'Mae Rim', category: 'Nature', description: 'Tiered waterfall', estimatedCost: 100 },
  { id: 'p3', name: 'Sunday Market', locality: 'Chiang Mai', category: 'Food', description: 'Street food', estimatedCost: 150 },
];

test('places can be searched by keyword across name, place, and category', () => {
  assert.deepEqual(findPlaces(PLACES, { query: 'water' }).map((p) => p.id), ['p2']);
  assert.deepEqual(findPlaces(PLACES, { query: 'chiang mai' }).map((p) => p.id), ['p1', 'p3']);
  assert.deepEqual(findPlaces(PLACES, { query: 'food' }).map((p) => p.id), ['p3']);
});

test('search and category filters apply together and stay case-insensitive', () => {
  assert.deepEqual(findPlaces(PLACES, { query: 'CHIANG', category: 'Food' }).map((p) => p.id), ['p3']);
  assert.deepEqual(findPlaces(PLACES, { category: 'All' }).length, 3);
  assert.deepEqual(findPlaces(PLACES, { query: 'nothing-matches' }), []);
});

test('empty or malformed datasets do not throw', () => {
  assert.deepEqual(findPlaces([], { query: 'x' }), []);
  assert.deepEqual(findPlaces(null, { query: 'x' }), []);
  assert.equal(getPlaceById(null, 'p1'), null);
  assert.equal(getPlaceById(PLACES, 'missing'), null);
});

test('a place can be saved only once per traveller', () => {
  let saved = savePlace([], 'user-demo', 'p1');
  saved = savePlace(saved, 'user-demo', 'p1');
  assert.equal(saved.length, 1);
  assert.equal(isPlaceSaved(saved, 'user-demo', 'p1'), true);

  const other = savePlace(saved, 'user-other', 'p1');
  assert.equal(other.length, 2);
});

test('saved places are removed for the owning traveller only', () => {
  let saved = savePlace(savePlace([], 'user-demo', 'p1'), 'user-other', 'p1');
  saved = removeSavedPlace(saved, 'user-demo', 'p1');
  assert.equal(isPlaceSaved(saved, 'user-demo', 'p1'), false);
  assert.equal(isPlaceSaved(saved, 'user-other', 'p1'), true);
  assert.deepEqual(getSavedPlaces(saved, PLACES, 'user-other').map((p) => p.id), ['p1']);
  assert.deepEqual(getSavedPlaces([], PLACES, 'user-demo'), []);
});

/* --------------------------------------------------------------- auth ---- */

// Low iteration count keeps the suite fast; production uses PBKDF2_ITERATIONS.
const FAST = 1000;

test('registration rejects missing, malformed, and duplicated input', () => {
  const existing = [{ id: 'u1', name: 'Demo', email: 'demo@travelm.local' }];

  const empty = authApi.validateRegistration({ name: '', email: '', password: '', confirmPassword: '' }, existing);
  assert.equal(empty.valid, false);
  assert.ok(empty.errors.name);
  assert.ok(empty.errors.email);
  assert.ok(empty.errors.password);

  const badEmail = authApi.validateRegistration({ name: 'A', email: 'not-an-email', password: 'longenough', confirmPassword: 'longenough' }, existing);
  assert.equal(badEmail.valid, false);
  assert.ok(badEmail.errors.email);

  const short = authApi.validateRegistration({ name: 'A', email: 'a@b.co', password: 'short', confirmPassword: 'short' }, existing);
  assert.equal(short.valid, false);
  assert.ok(short.errors.password);

  const mismatch = authApi.validateRegistration({ name: 'A', email: 'a@b.co', password: 'longenough', confirmPassword: 'different' }, existing);
  assert.equal(mismatch.valid, false);
  assert.ok(mismatch.errors.confirmPassword);

  // Duplicate detection is case-insensitive and whitespace tolerant.
  const duplicate = authApi.validateRegistration({ name: 'A', email: '  DEMO@TravelM.local ', password: 'longenough', confirmPassword: 'longenough' }, existing);
  assert.equal(duplicate.valid, false);
  assert.ok(duplicate.errors.email);

  const good = authApi.validateRegistration({ name: 'Ada', email: 'Ada@Example.com', password: 'longenough', confirmPassword: 'longenough' }, existing);
  assert.equal(good.valid, true);
  assert.equal(good.values.email, 'ada@example.com');
});

test('passwords are salted, hashed, and never stored in plain text', async () => {
  const saltA = authApi.generateSalt();
  const saltB = authApi.generateSalt();
  assert.notEqual(saltA, saltB);
  assert.equal(saltA.length, 32);

  const hashA = await authApi.deriveHash('correct horse battery', saltA, FAST);
  const hashAgain = await authApi.deriveHash('correct horse battery', saltA, FAST);
  assert.equal(hashA, hashAgain, 'same password and salt must produce the same hash');

  const hashOther = await authApi.deriveHash('correct horse battery', saltB, FAST);
  assert.notEqual(hashA, hashOther, 'different salts must produce different hashes');

  const result = await authApi.registerUser([], { name: 'Ada', email: 'ada@example.com', password: 'correct horse battery', confirmPassword: 'correct horse battery' }, FAST);
  assert.equal(result.ok, true);
  assert.equal(result.user.password, undefined);
  assert.ok(result.user.passwordHash);
  assert.ok(result.user.salt);
  assert.ok(!JSON.stringify(result.user).includes('correct horse battery'), 'the raw password must not appear anywhere in the stored record');
});

test('hashesMatch compares without leaking length differences', () => {
  assert.equal(authApi.hashesMatch('abc', 'abc'), true);
  assert.equal(authApi.hashesMatch('abc', 'abd'), false);
  assert.equal(authApi.hashesMatch('abc', 'abcd'), false);
  assert.equal(authApi.hashesMatch(null, 'abc'), false);
});

test('sign-in accepts the right password and refuses everything else', async () => {
  const registered = await authApi.registerUser([], { name: 'Ada', email: 'ada@example.com', password: 'correct horse battery', confirmPassword: 'correct horse battery' }, FAST);
  const users = registered.users;

  const good = await authApi.authenticate(users, { email: ' ADA@example.com ', password: 'correct horse battery' }, FAST);
  assert.equal(good.ok, true);
  assert.equal(good.user.email, 'ada@example.com');

  const wrongPassword = await authApi.authenticate(users, { email: 'ada@example.com', password: 'wrong password' }, FAST);
  assert.equal(wrongPassword.ok, false);

  const unknownEmail = await authApi.authenticate(users, { email: 'nobody@example.com', password: 'whatever' }, FAST);
  assert.equal(unknownEmail.ok, false);

  // A wrong password and an unknown email must be indistinguishable.
  assert.deepEqual(wrongPassword.errors, unknownEmail.errors);
  assert.match(wrongPassword.errors.form, /incorrect/i);

  const missing = await authApi.authenticate(users, { email: '', password: '' }, FAST);
  assert.equal(missing.ok, false);
});

test('a session resolves to its user and rejects unknown or tampered ids', async () => {
  const registered = await authApi.registerUser([], { name: 'Ada', email: 'ada@example.com', password: 'correct horse battery', confirmPassword: 'correct horse battery' }, FAST);
  const users = registered.users;

  const session = authApi.createSession(registered.user);
  assert.equal(session.userId, registered.user.id);
  assert.equal(authApi.resolveSession(session, users).email, 'ada@example.com');

  assert.equal(authApi.resolveSession({ userId: 'user-does-not-exist' }, users), null);
  assert.equal(authApi.resolveSession(null, users), null);
  assert.equal(authApi.resolveSession(session, null), null);
  assert.equal(authApi.resolveSession({}, users), null);
});

test('the demo account is created once, with the documented id, and can sign in', async () => {
  const once = await authApi.ensureDemoAccount([], FAST);
  assert.equal(once.length, 1);
  assert.equal(once[0].id, 'user-demo');
  assert.equal(once[0].email, 'demo@travelm.local');

  const twice = await authApi.ensureDemoAccount(once, FAST);
  assert.equal(twice.length, 1, 'seeding the demo account must be idempotent');

  const signedIn = await authApi.authenticate(twice, authApi.DEMO_CREDENTIALS, FAST);
  assert.equal(signedIn.ok, true);
  assert.equal(signedIn.user.id, 'user-demo');
});

/* ----------------------------------------------------------- isolation --- */

test('a traveller only ever sees their own trips', () => {
  const trips = [
    { ...TRIP, id: 'trip-a', userId: 'user-a' },
    { ...TRIP, id: 'trip-b', userId: 'user-b' },
  ];
  assert.deepEqual(tripsApi.getTripsForUser(trips, 'user-a').map((t) => t.id), ['trip-a']);
  assert.deepEqual(tripsApi.getTripsForUser(trips, 'user-b').map((t) => t.id), ['trip-b']);
  assert.deepEqual(tripsApi.getTripsForUser(trips, 'user-c'), []);
  assert.deepEqual(tripsApi.getTripsForUser(trips, null), []);

  // Creating a trip attributes it to the signed-in traveller.
  const created = tripsApi.createTrip({ name: 'Mine', destination: 'Chiang Rai', startDate: '2026-12-01', endDate: '2026-12-03', budget: '1000' }, 'user-a');
  assert.equal(created.ok, true);
  assert.equal(created.trip.userId, 'user-a');
  assert.deepEqual(tripsApi.getTripsForUser([created.trip], 'user-b'), []);
});

test('one traveller cannot modify or delete another traveller\'s trip', () => {
  const trips = [{ ...TRIP, id: 'trip-a', userId: 'user-a' }];
  const edit = { name: 'Hijacked', destination: 'Nowhere', startDate: '2026-11-12', endDate: '2026-11-15', budget: '1' };
  const withDependents = {
    trips,
    itinerary: [{ id: 'i1', tripId: 'trip-a' }],
    packing: [{ id: 'p1', tripId: 'trip-a' }],
    expenses: [{ id: 'e1', tripId: 'trip-a' }],
  };

  // A stranger is refused, with a specific reason rather than a silent no-op.
  const asStranger = tripsApi.updateTrip(trips, 'trip-a', edit, 'user-b');
  assert.equal(asStranger.ok, false);
  assert.match(asStranger.errors.form, /your own trips/i);

  const deleteAsStranger = tripsApi.removeTripAndDependents('trip-a', withDependents, 'user-b');
  assert.equal(deleteAsStranger.ok, false);
  assert.match(deleteAsStranger.errors.form, /your own trips/i);

  // The owner can still do it.
  const asOwner = tripsApi.updateTrip(trips, 'trip-a', edit, 'user-a');
  assert.equal(asOwner.ok, true);
  assert.equal(asOwner.trips[0].name, 'Hijacked');

  const deleteAsOwner = tripsApi.removeTripAndDependents('trip-a', withDependents, 'user-a');
  assert.equal(deleteAsOwner.ok, true);
  assert.deepEqual(deleteAsOwner.trips, []);
  assert.deepEqual(deleteAsOwner.itinerary, []);
  assert.deepEqual(deleteAsOwner.packing, []);
  assert.deepEqual(deleteAsOwner.expenses, []);

  // A missing trip is reported as missing, not as a permission failure.
  assert.equal(tripsApi.removeTripAndDependents('nope', withDependents, 'user-a').ok, false);
});

/* ------------------------------------------------------------------- map --- */

const MAPPABLE = [
  { id: 'm1', name: 'Mappable one', latitude: 18.8049, longitude: 98.9216 },
  { id: 'm2', name: 'Mappable two', latitude: 18.7883, longitude: 98.9936 },
];

test('map coordinates are only accepted when they are real positions on the globe', () => {
  assert.equal(isUsableCoordinate(18.8049, 98.9216), true);
  assert.equal(isUsableCoordinate(0, 0), true);
  assert.equal(isUsableCoordinate(-90, -180), true);

  // Out of range on either axis.
  assert.equal(isUsableCoordinate(90.01, 0), false);
  assert.equal(isUsableCoordinate(-90.01, 0), false);
  assert.equal(isUsableCoordinate(0, 180.01), false);

  // Missing, wrong type, or not a number.
  assert.equal(isUsableCoordinate(undefined, 98.9216), false);
  assert.equal(isUsableCoordinate(null, null), false);
  assert.equal(isUsableCoordinate('18.8049', '98.9216'), false);
  assert.equal(isUsableCoordinate(Number.NaN, 98.9216), false);
  assert.equal(isUsableCoordinate(Number.POSITIVE_INFINITY, 0), false);
});

test('places without usable coordinates are dropped rather than mapped at zero,zero', () => {
  const places = [
    ...MAPPABLE,
    { id: 'no-coords', name: 'No coordinates' },
    { id: 'null-coords', name: 'Null coordinates', latitude: null, longitude: null },
    { id: 'broken', name: 'Broken coordinates', latitude: 999, longitude: 'east' },
  ];

  assert.deepEqual(getMappablePlaces(places).map((place) => place.id), ['m1', 'm2']);
  // A malformed dataset is reported as empty, not as an error.
  assert.deepEqual(getMappablePlaces(null), []);
  assert.deepEqual(getMappablePlaces('not a list'), []);
});

test('the four reasons a map is not drawn are kept distinct', () => {
  const off = describeAvailability({ mode: MAP_MODES.NONE, leafletAvailable: true, places: MAPPABLE });
  assert.equal(off.available, false);
  assert.match(off.reason, /switched off/i);

  const noLibrary = describeAvailability({ mode: MAP_MODES.LEAFLET_OSM, leafletAvailable: false, places: MAPPABLE });
  assert.equal(noLibrary.available, false);
  assert.match(noLibrary.reason, /library did not load/i);

  const nothing = describeAvailability({ mode: MAP_MODES.LEAFLET_OSM, leafletAvailable: true, places: [], subject: 'search result' });
  assert.equal(nothing.available, false);
  assert.match(nothing.reason, /no search result to show/i);

  const noCoordinates = describeAvailability({
    mode: MAP_MODES.LEAFLET_OSM,
    leafletAvailable: true,
    places: [{ id: 'x', name: 'No coordinates' }],
    subject: 'place',
  });
  assert.equal(noCoordinates.available, false);
  assert.match(noCoordinates.reason, /no place here has usable coordinates/i);

  const ready = describeAvailability({ mode: MAP_MODES.LEAFLET_OSM, leafletAvailable: true, places: MAPPABLE });
  assert.equal(ready.available, true);
  assert.equal(ready.reason, '');
});

test('the map is drawn with OpenStreetMap tiles and needs no credentials', () => {
  assert.equal(ACTIVE_MAP_MODE, MAP_MODES.LEAFLET_OSM);
  const provider = describeProvider();
  assert.match(provider.provider, /Leaflet/);
  assert.match(provider.provider, /OpenStreetMap/);
  assert.match(provider.licence, /No API key/);
  assert.match(provider.tiles, /OpenStreetMap/);

  const off = describeProvider(MAP_MODES.NONE);
  assert.equal(off.provider, 'Not connected');
  assert.match(off.licence, /No map provider/);
});

test('the map bounds cover every mappable place, and null when none can be mapped', () => {
  assert.deepEqual(boundsForPlaces(MAPPABLE), {
    minLatitude: 18.7883,
    maxLatitude: 18.8049,
    minLongitude: 98.9216,
    maxLongitude: 98.9936,
  });

  const single = boundsForPlaces([MAPPABLE[0]]);
  assert.equal(single.minLatitude, single.maxLatitude);
  assert.equal(single.minLongitude, single.maxLongitude);

  assert.equal(boundsForPlaces([{ id: 'x', name: 'No coordinates' }]), null);
  assert.equal(boundsForPlaces([]), null);
});

test('coordinates are written with hemisphere letters and four decimals', () => {
  assert.equal(formatCoordinates(18.8049, 98.9216), '18.8049° N, 98.9216° E');
  assert.equal(formatCoordinates(-33.8688, 151.2093), '33.8688° S, 151.2093° E');
  assert.equal(formatCoordinates(40.7128, -74.006), '40.7128° N, 74.0060° W');
  assert.equal(formatCoordinates(null, 10), 'Coordinates not recorded');
});

test('a zoomed-out map has no attraction pins, but detail and local map remain usable', () => {
  assert.equal(MIN_ATTRACTION_MARKER_ZOOM, 10);
  assert.equal(ATTRACTION_MARKER_LIMIT, 40);
  assert.deepEqual(selectVisibleMapPlaces(MAPPABLE, { zoom: 4 }), []);
  assert.deepEqual(selectVisibleMapPlaces(MAPPABLE, { zoom: 9 }), []);
  assert.deepEqual(selectVisibleMapPlaces(MAPPABLE, { zoom: 10 }).map((p) => p.id), ['m1', 'm2']);
  assert.deepEqual(selectVisibleMapPlaces(MAPPABLE, { zoom: 10, contains: (p) => p.id === 'm2' }).map((p) => p.id), ['m2']);
  assert.deepEqual(selectVisibleMapPlaces(MAPPABLE, { zoom: 13, limit: 1 }).map((p) => p.id), ['m1']);
  assert.deepEqual(selectVisibleMapPlaces([MAPPABLE[0]], { zoom: 4 }).map((p) => p.id), ['m1']);
  assert.equal(selectVisibleMapPlaces(Array.from({ length: 120 }, (_, i) => ({ ...MAPPABLE[0], id: `p-${i}` })), { zoom: 12 }).length, 40);
});

/* -------------------------------------------------- place photographs ---- */

test('every sample place carries a credited Wikimedia Commons photograph', () => {
  assert.equal(DEFAULT_PLACES.length, 8);

  for (const place of DEFAULT_PLACES) {
    assert.ok(place.image, `${place.id} has no image`);
    const { thumb, large, credit, licence, source } = place.image;

    for (const [field, value] of Object.entries({ thumb, large, credit, licence, source })) {
      assert.equal(typeof value, 'string', `${place.id}.image.${field} is not a string`);
      assert.ok(value.length > 0, `${place.id}.image.${field} is empty`);
    }

    // Hotlinked from the Wikimedia thumbnail CDN — no local file, no proxy.
    assert.ok(thumb.startsWith('https://thumb.wikimedia.org/'), `${place.id} thumb host`);
    assert.ok(large.startsWith('https://thumb.wikimedia.org/'), `${place.id} large host`);
    assert.ok(source.startsWith('https://commons.wikimedia.org/wiki/File:'), `${place.id} source page`);

    // Both sizes must be the same file at two widths, or the credit would not match.
    const nameIn = (url) => url.split('/').pop();
    assert.equal(
      nameIn(thumb).replace('330px-', ''),
      nameIn(large).replace('960px-', ''),
      `${place.id} thumb and large are the same file`,
    );

    // Every photograph is CC BY / CC BY-SA, so the credit must travel with it.
    assert.match(licence, /^CC BY(-SA)? \d/, `${place.id} licence`);
    assert.ok(credit.trim().length > 0, `${place.id} credit`);
  }
});

/* -------------------------------------- Thailand-wide place import ------- */

const DATASET_PATH = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'data', 'thailand-places.json');

test('the province filter matches the record province exactly and combines with the other filters', () => {
  const places = [
    { id: 'q1', name: 'Doi Suthep', locality: 'Chiang Mai', administrativeArea: 'Chiang Mai', category: 'Culture', description: 'Temple' },
    { id: 'q2', name: 'Grand Palace', locality: 'Bangkok', administrativeArea: 'Bangkok', category: 'Culture', description: 'Palace' },
    { id: 'q3', name: 'Railay Beach', locality: 'Krabi', administrativeArea: 'Krabi', category: 'Nature', description: 'Beach' },
    { id: 'q4', name: 'Unrecorded area', locality: '', category: 'Nature', description: 'No province recorded' },
  ];

  assert.deepEqual(findPlaces(places, { province: 'Chiang Mai' }).map((p) => p.id), ['q1']);
  assert.deepEqual(findPlaces(places, { province: 'All' }).map((p) => p.id), ['q1', 'q2', 'q3', 'q4']);
  assert.deepEqual(findPlaces(places, {}).map((p) => p.id), ['q1', 'q2', 'q3', 'q4'], 'no province filter is the same as All');
  assert.deepEqual(findPlaces(places, { province: 'Bangkok', category: 'Culture' }).map((p) => p.id), ['q2']);
  assert.deepEqual(findPlaces(places, { province: 'Bangkok', category: 'Nature' }), []);
  assert.deepEqual(findPlaces(places, { query: 'beach', province: 'Krabi' }).map((p) => p.id), ['q3']);

  // Exact match only: no case folding and no partial matches, because the
  // filter's options are built from the values the records actually carry.
  assert.deepEqual(findPlaces(places, { province: 'chiang mai' }), []);
  assert.deepEqual(findPlaces(places, { province: 'Chiang' }), []);

  // A record with no province is never a false match.
  assert.deepEqual(findPlaces(places, { province: 'Krabi' }).map((p) => p.id), ['q3']);
});

test('only records with identity, name, a controlled category, coordinates, and provenance are importable', () => {
  const base = {
    id: 'osm-n1',
    name: 'Wat Example',
    locality: 'Chiang Mai',
    administrativeArea: 'Chiang Mai',
    countryCode: 'TH',
    category: 'Culture',
    description: 'Temple in Chiang Mai, Thailand.',
    estimatedCost: null,
    latitude: 18.8,
    longitude: 98.9,
    sourceReference: 'OpenStreetMap node 1 (ODbL)',
    lastCheckedAt: '2026-10-16',
    contentStatus: 'imported',
  };

  assert.equal(isImportablePlace(base), true);
  assert.equal(isImportablePlace({ ...base, id: '' }), false);
  assert.equal(isImportablePlace({ ...base, name: '' }), false);
  assert.equal(isImportablePlace({ ...base, category: 'Space' }), false);
  assert.equal(isImportablePlace({ ...base, latitude: null }), false);
  assert.equal(isImportablePlace({ ...base, longitude: 'east' }), false);
  assert.equal(isImportablePlace({ ...base, sourceReference: '' }), false);
  assert.equal(isImportablePlace(null), false);
});

test('the editorial Thailand list is compact, sourced as unverified, and loads without 12k-place HTTP fetch', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('Curated list must not require fetching the OSM archive'); };
  try {
    const result = await loadThailandPlaces();
    assert.equal(result.status, 'ok');
    assert.equal(result.places.length, POPULAR_THAILAND_PLACES.length);
    assert.ok(result.places.length >= 50 && result.places.length <= 80);
    assert.match(result.meta.selection, /not an official popularity ranking/i);
    const ids = new Set();
    const provinces = new Set();
    for (const place of result.places) {
      assert.ok(isImportablePlace(place), place.id);
      assert.match(place.id, /^featured-/);
      assert.equal(place.contentStatus, 'needs_update');
      assert.equal(place.estimatedCost, null);
      assert.equal(place.countryCode, 'TH');
      assert.ok(!ids.has(place.id), place.id);
      assert.ok(place.latitude > 5 && place.latitude < 21, place.id);
      assert.ok(place.longitude > 97 && place.longitude < 107, place.id);
      ids.add(place.id);
      provinces.add(place.administrativeArea);
    }
    assert.ok(provinces.size >= 18, 'Nationwide coverage should include a broad selection of provinces');
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('previously bookmarked OSM places remain accessible only as hidden archived records', async () => {
  const legacyA = {
    id: 'osm-n101', name: 'Old saved museum', category: 'Culture', latitude: 18.8,
    longitude: 98.9, sourceReference: 'OpenStreetMap node 101 (ODbL)',
  };
  const legacyB = { ...legacyA, id: 'osm-n102', name: 'Unreferenced monument' };
  let requests = 0;
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    requests += 1;
    return { ok: true, json: async () => ({ places: [legacyA, legacyB] }) };
  };
  try {
    assert.deepEqual(await loadReferencedLegacyPlaces([]), []);
    assert.equal(requests, 0);
    const found = await loadReferencedLegacyPlaces(['osm-n101']);
    assert.equal(requests, 1);
    assert.equal(found.length, 1);
    assert.equal(found[0].archived, true);
    assert.equal(findPlaces(found, {}).length, 0, 'Archived items must not appear in Discover');
    assert.equal(getPlaceById(found, 'osm-n101')?.name, 'Old saved museum');
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('the retired Thailand OSM archive remains available for existing saved bookmarks', () => {
  const dataset = JSON.parse(readFileSync(DATASET_PATH, 'utf8'));
  const places = dataset.places;

  assert.ok(Array.isArray(places), 'places must be an array');
  assert.ok(places.length >= 5000, `the dataset holds only ${places.length} records`);
  assert.match(dataset.meta.licence, /Open Database License|ODbL/);

  const ids = new Set();
  const provinces = new Set();
  const categories = new Set(['Nature', 'Culture', 'Food']);
  for (const place of places) {
    assert.ok(isImportablePlace(place), `unusable record ${place && place.id}`);
    assert.ok(categories.has(place.category), `${place.id} category ${place.category}`);
    assert.equal(place.countryCode, 'TH', `${place.id} countryCode`);
    assert.equal(place.contentStatus, 'imported', `${place.id} must not read as verified`);
    assert.match(place.sourceReference, /^OpenStreetMap (node|way|relation) \d+ \(ODbL\)$/, `${place.id} provenance`);
    assert.ok(place.latitude > 5 && place.latitude < 21, `${place.id} latitude ${place.latitude}`);
    assert.ok(place.longitude > 96 && place.longitude < 107, `${place.id} longitude ${place.longitude}`);
    assert.equal(ids.has(place.id), false, `duplicate id ${place.id}`);
    ids.add(place.id);
    if (place.administrativeArea) provinces.add(place.administrativeArea);
  }
  assert.ok(provinces.size >= 70, `only ${provinces.size} provinces covered`);
});


test('regional clusters represent every valid destination exactly once', () => {
  const places = [
    {id: 'a', latitude: 13.750, longitude: 100.490},
    {id: 'b', latitude: 13.751, longitude: 100.491},
    {id: 'c', latitude: 18.788, longitude: 98.985},
    {id: 'invalid', latitude: null, longitude: 10},
  ];
  const groups = clusterMapPlaces(places, 5);
  assert.deepEqual(groups.flatMap(g => g.places.map(p => p.id)).sort(), ['a', 'b', 'c']);
  assert.equal(groups.length, 2);
  const pair = groups.find(g => g.places.length === 2);
  assert.ok(Math.abs(pair.latitude - 13.7505) < 0.000001);
  assert.ok(Math.abs(pair.longitude - 100.4905) < 0.000001);
  assert.deepEqual(clusterMapPlaces([], 5), []);
});


test('location requests return coordinates and accuracy with a bounded timeout', async () => {
  const point = await requestLocation({getCurrentPosition(success, _error, options) {
    assert.equal(options.timeout, 12000);
    assert.equal(options.enableHighAccuracy, true);
    success({coords: {latitude: 13.75, longitude: 100.49, accuracy: 25}});
  }});
  assert.deepEqual(point, {latitude: 13.75, longitude: 100.49, accuracy: 25});
});

test('location errors distinguish denied, unavailable, timeout and unsupported cases', async () => {
  for (const [code, message] of [[1, /permission denied/], [2, /unavailable/], [3, /too long/]]) {
    await assert.rejects(requestLocation({getCurrentPosition(_success, error) { error({code}); }}), message);
  }
  await assert.rejects(requestLocation(null), /HTTPS/);
  await assert.rejects(requestLocation({}, false), /HTTPS/);
  await assert.rejects(requestLocation({getCurrentPosition(success) { success({coords: {latitude: NaN, longitude: 0, accuracy: 2}}); }}), /unusable/);
});

// Live device location: lifecycle and error paths, independent of physical GPS.
test('live location updates use fresh high-accuracy fixes and ignore callbacks after stop', () => {
  let success;
  const cleared = [];
  const points = [];
  const stop = watchLocation({
    watchPosition(callback, _error, options) {
      success = callback;
      assert.equal(options.enableHighAccuracy, true);
      assert.equal(options.maximumAge, 0);
      assert.equal(options.timeout, 12000);
      return 0;
    },
    clearWatch(id) { cleared.push(id); },
  }, true, point => points.push(point), assert.fail);
  success({ coords: { latitude: 13.75, longitude: 100.49, accuracy: 15 } });
  success({ coords: { latitude: 18.78, longitude: 98.98, accuracy: 20 } });
  assert.equal(points.length, 2);
  stop(); stop();
  success({ coords: { latitude: 0, longitude: 0, accuracy: 0 } });
  assert.equal(points.length, 2);
  assert.deepEqual(cleared, [0]);
});

test('live location stops on denial, invalid coordinates, and unsupported contexts', () => {
  for (const code of [1]) {
    let fail;
    let cleared = 0;
    let errors = 0;
    const stop = watchLocation({
      watchPosition(_success, error) { fail = error; return 7; },
      clearWatch(id) { assert.equal(id, 7); cleared++; },
    }, true, assert.fail, () => errors++);
    fail({ code }); fail({ code }); stop();
    assert.equal(errors, 1);
    assert.equal(cleared, 1);
  }
  const errors = [];
  let cleared = false;
  watchLocation({
    watchPosition(success) { success({ coords: { latitude: 91, longitude: 100, accuracy: 1 } }); return 3; },
    clearWatch() { cleared = true; },
  }, true, assert.fail, error => errors.push(error.message));
  assert.equal(cleared, true);
  assert.match(errors[0], /unusable/);
  watchLocation({}, false, assert.fail, error => assert.match(error.message, /HTTPS/));
});

function googleFixture(id, overrides = {}) {
  return {
    id, displayName: `Attraction ${id}`, location: { lat: () => 13.75, lng: () => 100.49 },
    addressComponents: [
      { types: ['country'], shortText: 'TH', longText: 'Thailand' },
      { types: ['administrative_area_level_1'], longText: 'Chiang Mai Province' },
    ], types: ['tourist_attraction', 'national_park'],
    attributions: [{ provider: 'Example provider', providerURI: 'https://example.com' }],
    ...overrides,
  };
}

test('Google catalog normalizes exact IDs, source attribution, categories and Thai coordinates', () => {
  const record = normalizeGooglePlace(googleFixture('abc'));
  assert.equal(record.id, 'google-abc');
  assert.equal(record.googlePlaceId, 'abc');
  assert.equal(record.administrativeArea, 'Chiang Mai');
  assert.equal(record.category, 'Nature');
  assert.equal(record.estimatedCost, null);
  assert.equal(record.attributions[0].provider, 'Example provider');
  assert.match(record.sourceReference, /Google/);
  assert.equal(normalizeGooglePlace(googleFixture('abc', { businessStatus: 'CLOSED_PERMANENTLY' })), null);
  assert.equal(normalizeGooglePlace(googleFixture('abc', { addressComponents: [] })), null);
  assert.equal(normalizeGooglePlace(googleFixture('abc', { location: { lat: NaN, lng: 100 } })), null);
});

test('Google discovery reaches 200 distinct places with bounded calls and no filler records', async () => {
  let calls = 0;
  const result = await discoverGooglePlaces({ async searchByText(request) {
    assert.equal(request.maxResultCount, 20);
    assert.equal(request.includedType, 'tourist_attraction');
    assert.equal(request.useStrictTypeFiltering, true);
    calls++;
    // One shared ID on every page ensures discovery must continue past 10 calls.
    return { places: [googleFixture('shared'), ...Array.from({ length: 19 }, (_, i) => googleFixture(`${calls}-${i}`))] };
  }});
  assert.equal(result.status, 'ok');
  assert.equal(result.places.length, 200);
  assert.equal(new Set(result.places.map(place => place.id)).size, 200);
  assert.equal(calls, 11);
  assert.ok(result.places.every(place => place.googlePlaceId));
});

test('Google discovery reports partial/failed results honestly and stops after API failure', async () => {
  let calls = 0;
  const partial = await discoverGooglePlaces({ async searchByText() {
    if (++calls === 1) return { places: [googleFixture('one')] };
    throw new Error('quota');
  }});
  assert.equal(partial.status, 'partial');
  assert.equal(partial.places.length, 1);
  assert.match(partial.message, /1\/200/);
  assert.equal(calls, 2);
  const failed = await discoverGooglePlaces({ async searchByText() { throw new Error('denied'); } });
  assert.equal(failed.status, 'error');
  assert.equal(failed.places.length, 0);
  const sparse = await discoverGooglePlaces({ async searchByText() { return { places: [googleFixture('same')] }; } });
  assert.equal(sparse.status, 'partial');
  assert.equal(sparse.places.length, 1);
});

test('Google directions preserve the exact place ID', () => {
  const place = normalizeGooglePlace(googleFixture('exact_id'));
  assert.equal(new URL(mapsPlaceUrl(place)).searchParams.get('query_place_id'), 'exact_id');
  assert.equal(new URL(mapsDirectionsUrl(place)).searchParams.get('destination_place_id'), 'exact_id');
});


test('live location survives transient signal loss and clears only when stopped', () => {
  let success, failure;
  const received = [];
  const errors = [];
  let cleared = 0;
  const stop = watchLocation({
    watchPosition(ok, fail) { success = ok; failure = fail; return 9; },
    clearWatch() { cleared++; },
  }, true, point => received.push(point), (error, recovering) => errors.push({ error, recovering }));
  success({ coords: { latitude: 13, longitude: 100, accuracy: 15 } });
  failure({ code: 2 }); failure({ code: 3 });
  success({ coords: { latitude: 18, longitude: 99, accuracy: 20 } });
  assert.equal(received.length, 2);
  assert.ok(errors.every(error => error.recovering));
  assert.equal(cleared, 0);
  stop();
  assert.equal(cleared, 1);
});
