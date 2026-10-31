import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildCatalog } from './curated-catalog.mjs';
import {
  KEYS, validateCatalog, searchCatalog, mergeKnownPlace,
  toggleSave, addToItinerary, ownedTrips, currentUser
} from '../dist/catalog/catalog-core.mjs';

const load = file => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const orig = load('../dist/data/thailand-places.json');
const cm = load('../dist/data/chiang-mai-curated.json');
const cr = load('../dist/data/chiang-rai-curated.json');
const places = validateCatalog([cm, cr]);

function store(initial = {}) {
  const records = new Map(Object.entries(initial).map(([key, value]) => [key, JSON.stringify(value)]));
  return { getItem: key => records.get(key) ?? null, setItem: (key, value) => records.set(key, value) };
}
const user = { id: 'user-demo', name: 'Traveler', email: 'demo@example.com' };
const trip = { id: 'trip-abc', userId: user.id, name: 'Northern loop', startDate: '2026-12-10', endDate: '2026-12-15' };
const fixture = () => store({
  [KEYS.users]: [user], [KEYS.session]: { userId: user.id },
  [KEYS.trips]: [trip], [KEYS.places]: [{ id: 'featured-legacy', name: 'Existing record' }],
  [KEYS.saved]: [{ id: 'saved-old', userId: user.id, placeId: 'featured-legacy' }],
  [KEYS.itinerary]: [{ id: 'item-old', tripId: trip.id, date: trip.startDate, title: 'Existing activity', orderIndex: 0 }]
});

test('FR-1: Exactly 100 sourced attractions per province and unique durable IDs', () => {
  assert.equal(places.length, 200);
  for (const name of ['Chiang Mai Province', 'Chiang Rai Province']) {
    assert.equal(places.filter(p => p.administrativeArea === name).length, 100);
  }
  assert.equal(new Set(places.map(p => p.id)).size, 200);
  assert.equal(new Set(places.map(p => p.administrativeArea + p.name.toLowerCase())).size, 200);
});
test('FR-3/NFR-9: Every catalog record retains valid coordinate and provenance; no unverified fees', () => {
  for (const p of places) {
    assert.match(p.sourceReference, /OpenStreetMap/);
    assert.match(p.lastCheckedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(p.contentStatus, 'imported');
    assert.equal(p.verificationStatus, 'unverified');
    assert.equal(p.estimatedCost, null);
    assert.equal(p.openingHours, null);
    assert.ok(Number.isFinite(p.latitude) && Number.isFinite(p.longitude));
  }
});
test('Curator regenerates the same IDs from archived OSM source', () => {
  const built = buildCatalog(orig);
  assert.deepEqual(built.places.map(p => p.id), places.map(p => p.id));
});
test('FR-2: Search, province and category filters intersect correctly', () => {
  assert.ok(searchCatalog(places, { query: 'wat' }).length > 0);
  assert.equal(searchCatalog(places, { province: 'Chiang Rai Province' }).length, 100);
  assert.ok(searchCatalog(places, { category: 'Nature', province: 'Chiang Mai Province' }).every(p =>
    p.category === 'Nature' && p.administrativeArea === 'Chiang Mai Province'));
  assert.equal(searchCatalog(places, { query: 'XXXXXXXXXXXXXXXX' }).length, 0);
});
test('Existing browser trips, itinerary, expenses, and user places survive merges and save operations', () => {
  const s = fixture(), old = s.getItem(KEYS.trips), oldItinerary = JSON.parse(s.getItem(KEYS.itinerary));
  const expenses = JSON.stringify([{ id: 'old-expense', tripId: trip.id, amount: 500 }]);
  s.setItem('travelm.expenses', expenses);
  assert.equal(mergeKnownPlace(s, places[0]), true);
  assert.equal(mergeKnownPlace(s, places[0]), false);
  assert.equal(toggleSave(s, places[0]).saved, true);
  assert.ok(s.getItem(KEYS.saved).includes('featured-legacy'));
  assert.equal(toggleSave(s, places[0]).saved, false);
  assert.equal(s.getItem(KEYS.trips), old);
  assert.equal(s.getItem('travelm.expenses'), expenses);
  assert.deepEqual(JSON.parse(s.getItem(KEYS.itinerary)), oldItinerary);
  assert.ok(s.getItem(KEYS.places).includes('featured-legacy'));
});
test('Trip itinerary adds one place on a valid day and preserves previous entries', () => {
  const s = fixture();
  assert.equal(currentUser(s).id, user.id);
  assert.equal(ownedTrips(s).length, 1);
  assert.equal(addToItinerary(s, { place: places[0], tripId: trip.id, date: '2026-12-12' }).ok, true);
  const items = JSON.parse(s.getItem(KEYS.itinerary));
  assert.equal(items.length, 2);
  assert.equal(items[0].id, 'item-old');
  assert.equal(items[1].placeId, places[0].id);
  assert.equal(items[1].estimatedCost, 0);
  assert.equal(addToItinerary(s, { place: places[0], tripId: trip.id, date: '2026-12-12' }).ok, false);
  assert.equal(addToItinerary(s, { place: places[1], tripId: trip.id, date: '2026-12-09' }).ok, false);
  assert.equal(addToItinerary(s, { place: places[1], tripId: 'other-trip', date: '2026-12-12' }).ok, false);
});
test('Guests can browse but cannot save or write itinerary', () => {
  const s = store({ [KEYS.users]: [user], [KEYS.trips]: [trip] });
  assert.equal(toggleSave(s, places[0]).ok, false);
  assert.equal(addToItinerary(s, { place: places[0], tripId: trip.id, date: '2026-12-12' }).ok, false);
  assert.equal(s.getItem(KEYS.saved), null);
});
test('Browser catalog payload stays below 120 kB total', () => {
  assert.ok(Buffer.byteLength(JSON.stringify(cm)) + Buffer.byteLength(JSON.stringify(cr)) < 120 * 1024);
});
