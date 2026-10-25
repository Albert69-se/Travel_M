/**
 * All localStorage access lives here, separate from rendering.
 * Every read is defensive: missing, malformed, or wrong-shaped stored data
 * falls back to a safe default instead of crashing the application.
 */

import {
  DEFAULT_PACKING_NAMES,
  DEFAULT_PLACES,
  SAMPLE_EXPENSES,
  SAMPLE_ITINERARY,
  SAMPLE_TRIP,
} from './data.js';

export const STORAGE_KEYS = {
  places: 'travelm.places',
  trips: 'travelm.trips',
  itinerary: 'travelm.itinerary',
  packing: 'travelm.packing',
  expenses: 'travelm.expenses',
  savedPlaces: 'travelm.savedPlaces',
  users: 'travelm.users',
  session: 'travelm.session',
  seeded: 'travelm.seeded',
};

function storageAvailable() {
  return typeof localStorage !== 'undefined' && localStorage !== null;
}

export function readJson(key, fallback) {
  if (!storageAvailable()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === '') return fallback;
    const parsed = JSON.parse(raw);
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch (error) {
    console.warn(`Ignoring unreadable stored data for "${key}": ${error.message}`);
    return fallback;
  }
}

/** Reads a stored collection, discarding anything that is not a list of objects. */
export function readList(key) {
  const value = readJson(key, []);
  if (!Array.isArray(value)) return [];
  return value.filter((entry) => entry !== null && typeof entry === 'object' && !Array.isArray(entry));
}

export function writeList(key, list) {
  writeJson(key, Array.isArray(list) ? list : []);
}

export function writeJson(key, value) {
  if (!storageAvailable()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Could not save "${key}": ${error.message}`);
  }
}

export function removeKey(key) {
  if (!storageAvailable()) return;
  localStorage.removeItem(key);
}

/**
 * Seeds sample data on first run only. Sample places are re-seeded if the
 * dataset is missing or was corrupted, per the data-persistence requirement.
 */
export function ensureSeedData() {
  if (readList(STORAGE_KEYS.places).length === 0) {
    writeList(STORAGE_KEYS.places, DEFAULT_PLACES);
  }

  if (readJson(STORAGE_KEYS.seeded, false) === true) return;

  writeList(STORAGE_KEYS.trips, [SAMPLE_TRIP]);
  writeList(STORAGE_KEYS.itinerary, SAMPLE_ITINERARY);
  writeList(
    STORAGE_KEYS.packing,
    DEFAULT_PACKING_NAMES.map((name, index) => ({
      id: `packing-seed-${index + 1}`,
      tripId: SAMPLE_TRIP.id,
      name,
      isPacked: false,
    })),
  );
  writeList(STORAGE_KEYS.expenses, SAMPLE_EXPENSES);
  writeJson(STORAGE_KEYS.seeded, true);
}

/** Returns the stored session object. The caller resolves it against the user list. */
export function readSession() {
  const session = readJson(STORAGE_KEYS.session, null);
  if (!session || typeof session !== 'object') return null;
  if (typeof session.userId !== 'string' || session.userId.length === 0) return null;
  return session;
}

export function writeSession(session) {
  writeJson(STORAGE_KEYS.session, session);
}

export function clearSession() {
  removeKey(STORAGE_KEYS.session);
}

/** Wipes all application data. Used by the "reset sample data" control. */
export function resetAllData() {
  for (const key of Object.values(STORAGE_KEYS)) removeKey(key);
  ensureSeedData();
}
