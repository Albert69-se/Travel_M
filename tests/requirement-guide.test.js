import test from 'node:test';
import assert from 'node:assert/strict';
import { requirementsForPath } from '../src/app/lib/requirement-guide.js';

test('guide maps trip screens and discover details to the M2 SRS IDs', () => {
  const ids = path => requirementsForPath(path).map(item => item.id);
  assert.deepEqual(ids('/discover'), [1, 2]);
  assert.deepEqual(ids('/discover/place-1'), [3, 4]);
  assert.deepEqual(ids('/trips/trip-1/itinerary'), [5, 6, 7]);
  assert.deepEqual(ids('/trips/trip-1/packing/'), [5, 6, 8]);
  assert.deepEqual(ids('/trips/trip-1/expenses'), [5, 6, 9, 10]);
  assert.deepEqual(ids('/trips/trip-1/weather'), [4, 5, 6]);
  assert.deepEqual(ids('/trips/trip-1'), [5, 6, 7, 8, 9, 10]);
  assert.deepEqual(ids('/account'), []);
});
