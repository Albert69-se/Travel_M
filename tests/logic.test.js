/**
 * Automated tests for the core application logic.
 *
 * Run with:  node --test
 * Node's built-in test runner is used, so there is no testing dependency.
 * Only DOM-free modules are imported here.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

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
} from '../js/utils.js';

import { findPlaces, getPlaceById, getSavedPlaces, isPlaceSaved, removeSavedPlace, savePlace } from '../js/places.js';
import * as tripsApi from '../js/trips.js';
import * as itineraryApi from '../js/itinerary.js';
import * as packingApi from '../js/packing.js';
import * as expensesApi from '../js/expenses.js';
import * as authApi from '../js/auth.js';

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
